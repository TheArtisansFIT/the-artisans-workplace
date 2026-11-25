from datetime import timezone
from typing import Any

import pymongo

from backend.store import MongoUserStore


class FakeCollection:
    def __init__(self) -> None:
        self.documents: dict[str, dict[str, Any]] = {}
        self.indexes: list[tuple[str, bool]] = []
        self.updates: list[dict[str, Any]] = []

    def create_index(self, field: str, unique: bool = False) -> None:
        self.indexes.append((field, unique))

    def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        key = query.get("_id")
        if key is not None:
            document = self.documents.get(key)
            return dict(document) if document else None

        email = query.get("email")
        return next(
            (
                dict(document)
                for document in self.documents.values()
                if document["email"] == email
            ),
            None,
        )

    def insert_one(self, document: dict[str, Any]) -> None:
        if any(existing["email"] == document["email"] for existing in self.documents.values()):
            raise pymongo.errors.DuplicateKeyError("duplicate email")
        self.documents[document["_id"]] = dict(document)

    def find_one_and_update(
        self,
        query: dict[str, Any],
        update: dict[str, Any],
        return_document: Any,
    ) -> dict[str, Any] | None:
        self.updates.append(update)
        document = self.documents.get(query["_id"])
        if document is None:
            return None

        document.update(update.get("$set", {}))
        for field in update.get("$unset", {}):
            document.pop(field, None)
        return dict(document)


class FakeDatabase:
    def __init__(self, collection: FakeCollection) -> None:
        self.collection = collection

    def __getitem__(self, name: str) -> FakeCollection:
        assert name == "users"
        return self.collection


class FakeAdmin:
    def __init__(self) -> None:
        self.commands: list[str] = []

    def command(self, name: str) -> dict[str, int]:
        self.commands.append(name)
        return {"ok": 1}


class FakeMongoClient:
    def __init__(self, collection: FakeCollection) -> None:
        self.admin = FakeAdmin()
        self.database = FakeDatabase(collection)

    def __getitem__(self, name: str) -> FakeDatabase:
        assert name == "splitnest"
        return self.database

    def close(self) -> None:
        pass


def test_mongo_user_store_persists_users_and_normalizes_email(
    monkeypatch,
) -> None:
    collection = FakeCollection()
    client = FakeMongoClient(collection)
    monkeypatch.setattr(pymongo, "MongoClient", lambda *args, **kwargs: client)

    first_store = MongoUserStore("mongodb://localhost", "splitnest")
    user = {
        "id": "usr_123",
        "displayName": "Minh",
        "email": "Minh@Example.com",
        "passwordHash": "secure-hash",
        "memberSince": "2026-11-21",
        "bankDetails": None,
        "sessionVersion": 0,
    }
    first_store.create_user(user)

    stored = collection.documents["usr_123"]
    restarted_store = MongoUserStore("mongodb://localhost", "splitnest")
    loaded = restarted_store.find_by_email("MINH@example.com")

    assert stored["display_name"] == "Minh"
    assert stored["hashed_password"] == "secure-hash"
    assert stored["created_at"].tzinfo == timezone.utc
    assert "displayName" not in stored
    assert "sessionVersion" not in stored
    assert "session_version" not in stored
    assert loaded is not None
    assert loaded["id"] == "usr_123"
    assert loaded["displayName"] == "Minh"
    assert loaded["email"] == "minh@example.com"
    assert loaded["passwordHash"] == "secure-hash"
    assert client.admin.commands == ["ping", "ping"]
    assert collection.indexes == [("email", True), ("email", True)]


def test_mongo_store_maps_profile_updates_without_persisting_session_version(
    monkeypatch,
) -> None:
    collection = FakeCollection()

    class FakeClientConstructor(FakeMongoClient):
        def __init__(self, *args, **kwargs) -> None:
            super().__init__(collection)

    monkeypatch.setattr(pymongo, "MongoClient", FakeClientConstructor)
    store = MongoUserStore("mongodb://localhost", "splitnest")
    store.create_user(
        {
            "id": "usr_profile",
            "displayName": "Minh",
            "email": "minh@example.com",
            "passwordHash": "secure-hash",
            "memberSince": "2026-11-21",
            "bankDetails": None,
            "sessionVersion": 0,
        }
    )

    updated = store.update_user(
        "usr_profile",
        {
            "bankDetails": {
                "bankName": "Vietcombank",
                "accountNumber": "12345678",
                "accountHolder": "MINH LE",
            },
            "sessionVersion": 1,
        },
    )

    assert updated is not None
    assert updated["bankDetails"]["accountNumber"] == "12345678"
    assert "sessionVersion" not in collection.documents["usr_profile"]
    assert "session_version" not in collection.documents["usr_profile"]
    assert collection.documents["usr_profile"]["bank_details"] == {
        "bank_name": "Vietcombank",
        "account_number": "12345678",
        "account_holder": "MINH LE",
    }
    assert len(collection.updates) == 1

    store.update_user("usr_profile", {"bankDetails": None})
    assert "bank_details" not in collection.documents["usr_profile"]
    assert len(collection.updates) == 2


def test_mongo_store_skips_database_write_for_runtime_only_changes(monkeypatch) -> None:
    collection = FakeCollection()

    class FakeClientConstructor(FakeMongoClient):
        def __init__(self, *args, **kwargs) -> None:
            super().__init__(collection)

    monkeypatch.setattr(pymongo, "MongoClient", FakeClientConstructor)
    store = MongoUserStore("mongodb://localhost", "splitnest")
    store.create_user(
        {
            "id": "usr_runtime",
            "displayName": "Minh",
            "email": "minh@example.com",
            "passwordHash": "secure-hash",
            "memberSince": "2026-11-21",
            "bankDetails": None,
            "sessionVersion": 0,
        }
    )

    user = store.update_user("usr_runtime", {"sessionVersion": 1})

    assert user is not None
    assert user["id"] == "usr_runtime"
    assert collection.updates == []
    assert "sessionVersion" not in collection.documents["usr_runtime"]
    assert "session_version" not in collection.documents["usr_runtime"]
