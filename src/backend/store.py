"""User persistence for the SplitNest API.

The development and test default is an in-memory store so the backend can run
without external services. Set ``MONGO_URI`` (or ``MONGODB_URI``) to use the
MongoDB Atlas collection prepared for the project.
"""

from __future__ import annotations

import threading
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
        self._client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        self._users = self._client[database_name]["users"]
        self._users.create_index("email", unique=True)

    @staticmethod
    def _to_user(document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None
        user = dict(document)
        user["id"] = str(user.pop("_id"))
        return user

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        return self._to_user(self._users.find_one({"email": email.strip().lower()}))

    def find_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._to_user(self._users.find_one({"_id": user_id}))

    def create_user(self, user: dict[str, Any]) -> dict[str, Any]:
        document = {**user, "email": user["email"].strip().lower(), "_id": user["id"]}
        document.pop("id")
        try:
            self._users.insert_one(document)
        except self._duplicate_key_error as exc:
            raise DuplicateEmailError from exc
        return {**user, "email": document["email"]}

    def update_user(self, user_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        self._users.update_one({"_id": user_id}, {"$set": changes})
        return self.find_by_id(user_id)


def build_user_store(app: Flask) -> UserStore:
    uri = app.config.get("MONGO_URI")
    if uri:
        return MongoUserStore(uri, app.config.get("MONGO_DB_NAME", "splitnest"))
    return MemoryUserStore()
