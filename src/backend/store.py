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
            from pymongo import MongoClient
            from pymongo.errors import DuplicateKeyError
        except ImportError as exc:  # pragma: no cover - depends on deployment setup
            raise RuntimeError(
                "MONGO_URI is set but pymongo is not installed. "
                "Run 'pip install -r src/backend/requirements.txt'."
            ) from exc

        self._duplicate_key_error = DuplicateKeyError
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
    field_names = { "bankDetails": "bank_details",}

    mongo_changes: dict[str, Any] = {}
    unset_fields: dict[str, str] = {}

    for key, value in changes.items():
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

    if update:
        self._users.update_one({"_id": user_id}, update)

    return self.find_by_id(user_id)



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


class GroupStore(Protocol):
    def create_group(
        self,
        group: dict[str, Any],
        membership: dict[str, Any],
        invitation: dict[str, Any],
    ) -> None: ...

    def find_group(self, group_id: str) -> dict[str, Any] | None: ...

    def find_membership(
        self, group_id: str, user_id: str
    ) -> dict[str, Any] | None: ...

    def find_invitation_for_group(self, group_id: str) -> dict[str, Any] | None: ...


class MemoryGroupStore:
    """Thread-safe group store used for local development and tests."""

    def __init__(self) -> None:
        self._groups: dict[str, dict[str, Any]] = {}
        self._memberships: dict[str, dict[str, Any]] = {}
        self._invitations: dict[str, dict[str, Any]] = {}
        self._lock = threading.RLock()

    def create_group(
        self,
        group: dict[str, Any],
        membership: dict[str, Any],
        invitation: dict[str, Any],
    ) -> None:
        with self._lock:
            self._groups[group["id"]] = dict(group)
            self._memberships[membership["id"]] = dict(membership)
            self._invitations[invitation["joinCode"]] = dict(invitation)

    def find_group(self, group_id: str) -> dict[str, Any] | None:
        with self._lock:
            group = self._groups.get(group_id)
            return dict(group) if group else None

    def find_membership(
        self, group_id: str, user_id: str
    ) -> dict[str, Any] | None:
        with self._lock:
            for membership in self._memberships.values():
                if (
                    membership["groupId"] == group_id
                    and membership["userId"] == user_id
                ):
                    return dict(membership)
        return None

    def find_invitation_for_group(self, group_id: str) -> dict[str, Any] | None:
        with self._lock:
            for invitation in self._invitations.values():
                if invitation["groupId"] == group_id:
                    return dict(invitation)
        return None


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _iso_timestamp(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value or "")


class MongoGroupStore:
    """MongoDB-backed group store for the deployed application."""

    def __init__(self, uri: str, database_name: str = "splitnest") -> None:
        try:
            from pymongo import MongoClient
            from pymongo.errors import OperationFailure
        except ImportError as exc:  # pragma: no cover - depends on deployment setup
            raise RuntimeError(
                "MONGO_URI is set but pymongo is not installed. "
                "Run 'pip install -r src/backend/requirements.txt'."
            ) from exc

        try:
            self._client = MongoClient(
                uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            self._client.admin.command("ping")
            database = self._client[database_name]
            self._groups = database["groups"]
            self._memberships = database["group_memberships"]
            self._invitations = database["group_invitations"]

            self._groups.create_index("creator_id")
            self._ensure_index(
                self._memberships,
                [("group_id", 1), ("user_id", 1)],
                name="uniq_active_membership",
                error_type=OperationFailure,
                unique=True,
                partialFilterExpression={"status": "Active"},
            )
            self._memberships.create_index("user_id")
            self._invitations.create_index("join_code", unique=True)
            self._invitations.create_index("group_id", unique=True)
        except Exception as exc:
            if hasattr(self, "_client"):
                self._client.close()
            raise RuntimeError(
                "Could not connect to MongoDB or prepare the group collections. "
                "Check MONGO_URI, network access, and database credentials."
            ) from exc

    @staticmethod
    def _ensure_index(
        collection: Any,
        keys: Any,
        *,
        name: str,
        error_type: type[Exception],
        **options: Any,
    ) -> None:
        """Create an index, replacing legacy same-key indexes with other options."""
        wanted = keys if isinstance(keys, list) else [(keys, 1)]
        for existing_name, spec in collection.index_information().items():
            if existing_name in {"_id_", name}:
                continue
            if spec.get("key") == wanted:
                collection.drop_index(existing_name)
        try:
            collection.create_index(keys, name=name, **options)
        except error_type as exc:
            if getattr(exc, "code", None) not in {85, 86}:
                raise
            collection.drop_index(name)
            collection.create_index(keys, name=name, **options)

    @staticmethod
    def _to_group(document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None
        return {
            "id": str(document["_id"]),
            "name": document.get("display_name", ""),
            "description": document.get("description", ""),
            "creatorId": str(document.get("creator_id", "")),
            "maxMember": int(document.get("max_member", 0)),
            "createdAt": _iso_timestamp(document.get("created_at")),
        }

    @staticmethod
    def _to_membership(document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None
        return {
            "id": str(document["_id"]),
            "groupId": str(document.get("group_id", "")),
            "userId": str(document.get("user_id", "")),
            "role": document.get("role", "Organizer"),
            "status": document.get("status", "Active"),
            "createdAt": _iso_timestamp(document.get("created_at")),
        }

    @staticmethod
    def _to_invitation(document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None
        return {
            "joinCode": document.get("join_code", ""),
            "groupId": str(document.get("group_id", "")),
            "durationDays": int(document.get("duration", 0)),
            "createdAt": _iso_timestamp(document.get("created_at")),
        }

    @staticmethod
    def _to_group_document(group: dict[str, Any]) -> dict[str, Any]:
        return {
            "_id": group["id"],
            "creator_id": group["creatorId"],
            "display_name": group["name"],
            "description": group.get("description", ""),
            "max_member": int(group["maxMember"]),
            "created_at": _parse_timestamp(group["createdAt"]),
        }

    @staticmethod
    def _to_membership_document(membership: dict[str, Any]) -> dict[str, Any]:
        return {
            "_id": membership["id"],
            "group_id": membership["groupId"],
            "user_id": membership["userId"],
            "role": membership["role"],
            "status": membership["status"],
            "created_at": _parse_timestamp(membership["createdAt"]),
        }

    @staticmethod
    def _to_invitation_document(invitation: dict[str, Any]) -> dict[str, Any]:
        return {
            "join_code": invitation["joinCode"],
            "group_id": invitation["groupId"],
            "duration": int(invitation["durationDays"]),
            "created_at": _parse_timestamp(invitation["createdAt"]),
        }

    def create_group(
        self,
        group: dict[str, Any],
        membership: dict[str, Any],
        invitation: dict[str, Any],
    ) -> None:
        with self._client.start_session() as session:
            with session.start_transaction():
                self._groups.insert_one(
                    self._to_group_document(group), session=session
                )
                self._memberships.insert_one(
                    self._to_membership_document(membership), session=session
                )
                self._invitations.insert_one(
                    self._to_invitation_document(invitation), session=session
                )

    def find_group(self, group_id: str) -> dict[str, Any] | None:
        return self._to_group(self._groups.find_one({"_id": group_id}))

    def find_membership(
        self, group_id: str, user_id: str
    ) -> dict[str, Any] | None:
        return self._to_membership(
            self._memberships.find_one(
                {"group_id": group_id, "user_id": user_id, "status": "Active"}
            )
        )

    def find_invitation_for_group(self, group_id: str) -> dict[str, Any] | None:
        return self._to_invitation(
            self._invitations.find_one({"group_id": group_id})
        )


def build_group_store(app: Flask) -> GroupStore:
    uri = (app.config.get("MONGO_URI") or "").strip()
    if uri:
        try:
            return MongoGroupStore(uri, app.config.get("MONGO_DB_NAME", "splitnest"))
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(
                "Could not initialize the MongoDB group store. "
                "Check MONGO_URI, network access, and database credentials."
            ) from exc
    if app.testing or app.config.get("USER_STORE") == "memory":
        return MemoryGroupStore()
    raise RuntimeError(
        "MongoDB is not configured. Set MONGO_URI (or MONGODB_URI) to persist "
        "groups, or explicitly set USER_STORE=memory for temporary local data."
    )
