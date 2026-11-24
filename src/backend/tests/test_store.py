from datetime import timezone
from typing import Any

import pymongo
import pytest
from flask import Flask

from backend.store import MongoGroupStore, MongoUserStore, build_group_store


class FakeCollection:
    def __init__(self) -> None:
        self.documents: dict[str, dict[str, Any]] = {}
        self.indexes: list[tuple[str, bool]] = []

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

    def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> None:
        document = self.documents.get(query["_id"])
        if document:
            document.update(update.get("$set", {}))
            for field in update.get("$unset", {}):
                document.pop(field, None)


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


class FakeGroupCollection:
    def __init__(self, indexes: dict[str, dict[str, Any]] | None = None) -> None:
        self.documents: dict[str, dict[str, Any]] = {}
        self.indexes = indexes or {"_id_": {"key": [("_id", 1)]}}

    def index_information(self) -> dict[str, dict[str, Any]]:
        return {name: dict(spec) for name, spec in self.indexes.items()}

    def create_index(
        self, keys: Any, name: str | None = None, **options: Any
    ) -> str:
        normalized_keys = keys if isinstance(keys, list) else [(keys, 1)]
        index_name = name or "_".join(
            f"{field}_{direction}" for field, direction in normalized_keys
        )
        existing = self.indexes.get(index_name)
        if existing is not None:
            if existing.get("key") != normalized_keys or any(
                existing.get(option) != value for option, value in options.items()
            ):
                raise pymongo.errors.OperationFailure(
                    f"Index with name: {index_name} already exists with different options",
                    code=85,
                )
            return index_name

        self.indexes[index_name] = {"key": normalized_keys, **options}
        return index_name

    def drop_index(self, name: str) -> None:
        if name not in self.indexes:
            raise pymongo.errors.OperationFailure("index not found", code=27)
        del self.indexes[name]

    def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        return next(
            (
                dict(document)
                for document in self.documents.values()
                if all(document.get(field) == value for field, value in query.items())
            ),
            None,
        )


class FakeGroupDatabase:
    def __init__(self, collections: dict[str, FakeGroupCollection]) -> None:
        self.collections = collections

    def __getitem__(self, name: str) -> FakeGroupCollection:
        return self.collections[name]


class FakeGroupMongoClient:
    def __init__(self, database: FakeGroupDatabase) -> None:
        self.admin = FakeAdmin()
        self.database = database

    def __getitem__(self, name: str) -> FakeGroupDatabase:
        assert name == "splitnest"
        return self.database

    def close(self) -> None:
        pass


def make_group_client(
    memberships: FakeGroupCollection | None = None,
) -> tuple[FakeGroupMongoClient, dict[str, FakeGroupCollection]]:
    collections = {
        "groups": FakeGroupCollection(),
        "group_memberships": memberships or FakeGroupCollection(),
        "group_invitations": FakeGroupCollection(),
    }
    return FakeGroupMongoClient(FakeGroupDatabase(collections)), collections


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


def test_mongo_group_store_replaces_legacy_membership_index(monkeypatch) -> None:
    legacy_memberships = FakeGroupCollection(
        {
            "_id_": {"key": [("_id", 1)]},
            "group_id_1_user_id_1": {
                "key": [("group_id", 1), ("user_id", 1)],
                "unique": True,
            },
        }
    )
    client, collections = make_group_client(legacy_memberships)
    monkeypatch.setattr(pymongo, "MongoClient", lambda *args, **kwargs: client)

    MongoGroupStore("mongodb://localhost", "splitnest")

    indexes = collections["group_memberships"].indexes
    assert "group_id_1_user_id_1" not in indexes
    assert indexes["uniq_active_membership"] == {
        "key": [("group_id", 1), ("user_id", 1)],
        "unique": True,
        "partialFilterExpression": {"status": "Active"},
    }


def test_mongo_group_store_finds_rejoined_active_membership(monkeypatch) -> None:
    memberships = FakeGroupCollection()
    memberships.documents.update(
        {
            "mem_old": {
                "_id": "mem_old",
                "group_id": "grp_1",
                "user_id": "usr_1",
                "role": "Member",
                "status": "Left",
                "created_at": "2026-11-20T10:00:00+00:00",
            },
            "mem_new": {
                "_id": "mem_new",
                "group_id": "grp_1",
                "user_id": "usr_1",
                "role": "Member",
                "status": "Active",
                "created_at": "2026-11-24T10:00:00+00:00",
            },
        }
    )
    client, _ = make_group_client(memberships)
    monkeypatch.setattr(pymongo, "MongoClient", lambda *args, **kwargs: client)

    store = MongoGroupStore("mongodb://localhost", "splitnest")
    active_membership = store.find_membership("grp_1", "usr_1")

    assert active_membership is not None
    assert active_membership["id"] == "mem_new"
    assert active_membership["status"] == "Active"
    assert "mem_old" in memberships.documents


def test_build_group_store_wraps_unexpected_initialization_error(monkeypatch) -> None:
    def fail_initialization(*args, **kwargs):
        raise ValueError("unexpected failure")

    monkeypatch.setattr("backend.store.MongoGroupStore", fail_initialization)
    app = Flask(__name__)
    app.config["MONGO_URI"] = "mongodb://localhost"

    with pytest.raises(RuntimeError, match="MongoDB group store") as exc_info:
        build_group_store(app)

    assert isinstance(exc_info.value.__cause__, ValueError)


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

    store.update_user("usr_profile", {"bankDetails": None})
    assert "bank_details" not in collection.documents["usr_profile"]
