"""User persistence for the SplitNest API."""

from __future__ import annotations

import threading
from datetime import date, datetime, time, timezone
from typing import Any, Protocol

from flask import Flask


class DuplicateEmailError(Exception):
    """Raised when a registration uses an email address that already exists."""


class UserStore(Protocol):
    def find_by_email(self, email: str) -> dict[str, Any] | None: ...

    def find_by_id(self, user_id: str) -> dict[str, Any] | None: ...

    def create_user(self, user: dict[str, Any]) -> dict[str, Any]: ...

    def update_user(self, user_id: str, changes: dict[str, Any]) -> dict[str, Any] | None: ...


class MemoryUserStore:
    """Thread-safe user store used for local development and tests."""

    def __init__(self) -> None:
        self._users: dict[str, dict[str, Any]] = {}
        self._lock = threading.RLock()

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        normalized = email.strip().lower()
        with self._lock:
            for user in self._users.values():
                if user["email"] == normalized:
                    return dict(user)
        return None

    def find_by_id(self, user_id: str) -> dict[str, Any] | None:
        with self._lock:
            user = self._users.get(user_id)
            return dict(user) if user else None

    def create_user(self, user: dict[str, Any]) -> dict[str, Any]:
        email = user["email"].strip().lower()
        with self._lock:
            if any(existing["email"] == email for existing in self._users.values()):
                raise DuplicateEmailError
            stored = {**user, "email": email}
            self._users[stored["id"]] = stored
            return dict(stored)

    def update_user(self, user_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            user = self._users.get(user_id)
            if user is None:
                return None
            user.update(changes)
            return dict(user)


class MongoUserStore:
    """MongoDB-backed user store for the deployed application."""

    def __init__(self, uri: str, database_name: str = "splitnest") -> None:
        try:
            from pymongo import MongoClient, ReturnDocument
            from pymongo.errors import DuplicateKeyError
        except ImportError as exc:  # pragma: no cover - depends on deployment setup
            raise RuntimeError(
                "MONGO_URI is set but pymongo is not installed. "
                "Run 'pip install -r src/backend/requirements.txt'."
            ) from exc

        self._duplicate_key_error = DuplicateKeyError
        self._return_document_after = ReturnDocument.AFTER
        try:
            self._client = MongoClient(
                uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            self._client.admin.command("ping")
            self._users = self._client[database_name]["users"]
            self._users.create_index("email", unique=True)
        except Exception as exc:
            if hasattr(self, "_client"):
                self._client.close()
            raise RuntimeError(
                "Could not connect to MongoDB or prepare the users collection. "
                "Check MONGO_URI, network access, and database credentials."
            ) from exc

    @staticmethod
    def _to_user(document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None
        user = dict(document)
        created_at = user.get("created_at", user.get("memberSince"))
        if isinstance(created_at, datetime):
            member_since = created_at.date().isoformat()
        elif created_at:
            member_since = str(created_at)[:10]
        else:
            member_since = ""

        bank_details = user.get("bank_details", user.get("bankDetails"))
        if bank_details:
            bank_details = {
                "bankName": bank_details.get("bank_name", bank_details.get("bankName", "")),
                "accountNumber": bank_details.get(
                    "account_number", bank_details.get("accountNumber", "")
                ),
                "accountHolder": bank_details.get(
                    "account_holder", bank_details.get("accountHolder", "")
                ),
            }

        return {
            "id": str(user["_id"]),
            "displayName": user.get("display_name", user.get("displayName", "")),
            "email": user["email"],
            "passwordHash": user.get("hashed_password", user.get("passwordHash", "")),
            "memberSince": member_since,
            "bankDetails": bank_details,
        }

    @staticmethod
    def _to_document(user: dict[str, Any]) -> dict[str, Any]:
        member_since = date.fromisoformat(user["memberSince"])
        document: dict[str, Any] = {
            "_id": user["id"],
            "display_name": user["displayName"],
            "email": user["email"].strip().lower(),
            "hashed_password": user["passwordHash"],
            "created_at": datetime.combine(
                member_since, time.min, tzinfo=timezone.utc
            ),
        }
        bank_details = user.get("bankDetails")
        if bank_details:
            document["bank_details"] = {
                "bank_name": bank_details["bankName"],
                "account_number": bank_details["accountNumber"],
                "account_holder": bank_details["accountHolder"],
            }
        return document

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        return self._to_user(self._users.find_one({"email": email.strip().lower()}))

    def find_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._to_user(self._users.find_one({"_id": user_id}))

    def create_user(self, user: dict[str, Any]) -> dict[str, Any]:
        document = self._to_document(user)
        try:
            self._users.insert_one(document)
        except self._duplicate_key_error as exc:
            raise DuplicateEmailError from exc
        return {**user, "email": document["email"]}

    def update_user(self, user_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        field_names = {
            "bankDetails": "bank_details",
        }
        mongo_changes: dict[str, Any] = {}
        unset_fields: dict[str, str] = {}
        for key, value in changes.items():
            if key in {"sessionVersion", "session_version"}:
                # Session versions are runtime auth state, not user data stored in MongoDB.
                continue
            mongo_key = field_names.get(key, key)
            if key == "bankDetails" and not value:
                unset_fields[mongo_key] = ""
                continue
            if key == "bankDetails" and value:
                value = {
                    "bank_name": value["bankName"],
                    "account_number": value["accountNumber"],
                    "account_holder": value["accountHolder"],
                }
            mongo_changes[mongo_key] = value
        update: dict[str, Any] = {}
        if mongo_changes:
            update["$set"] = mongo_changes
        if unset_fields:
            update["$unset"] = unset_fields
        if not update:
            return self.find_by_id(user_id)

        document = self._users.find_one_and_update(
            {"_id": user_id},
            update,
            return_document=self._return_document_after,
        )
        return self._to_user(document)


def build_user_store(app: Flask) -> UserStore:
    uri = (app.config.get("MONGO_URI") or "").strip()
    if uri:
        return MongoUserStore(uri, app.config.get("MONGO_DB_NAME", "splitnest"))
    if app.testing or app.config.get("USER_STORE") == "memory":
        return MemoryUserStore()
    raise RuntimeError(
        "MongoDB is not configured. Set MONGO_URI (or MONGODB_URI) to persist "
        "accounts, or explicitly set USER_STORE=memory for temporary local data."
    )
