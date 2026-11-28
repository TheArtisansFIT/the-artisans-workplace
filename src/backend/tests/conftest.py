"""Pytest fixtures for the SplitNest backend test suite.

The auth layer reads users straight from ``db["users"]`` (MongoDB). To keep the
suite running without a MongoDB server we monkeypatch ``backend.auth.users``
with an in-memory fake collection that resolves users by id.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from backend.app import create_app
import backend.auth as auth_module


class FakeUsers:
    def __init__(self, *users):
        self.users = {user.get("_id", user.get("id")): dict(user) for user in users}

    def find_one(self, filter):
        if not isinstance(filter, dict):
            return None
        key = filter.get("_id") or filter.get("id")
        user = self.users.get(key)
        return dict(user) if user else None


TEST_USER = {
    "_id": "usr_test",
    "display_name": "Tester",
    "email": "tester@example.com",
    "hashed_password": "x",
    "created_at": datetime(2026, 10, 20, tzinfo=timezone.utc),
}

OTHER_USER = {
    "_id": "usr_other",
    "display_name": "Other",
    "email": "other@example.com",
    "hashed_password": "x",
    "created_at": datetime(2026, 10, 20, tzinfo=timezone.utc),
}


@pytest.fixture
def app():
    app = create_app(
        {
            "TESTING": True,
            "USER_STORE": "memory",
            "MONGO_URI": "",
            "SECRET_KEY": "test-secret-key",
        }
    )
    auth_module.users = FakeUsers(TEST_USER, OTHER_USER)

    group_store = app.extensions["group_store"]
    now = datetime.now(timezone.utc).isoformat()
    group_store.create_group(
        {
            "id": "grp_test",
            "name": "Test Group",
            "description": "A group for tests.",
            "creatorId": TEST_USER["_id"],
            "memberIds": [TEST_USER["_id"], OTHER_USER["_id"]],
            "maxMember": 50,
            "createdAt": now,
        },
        {
            "id": "mem_test",
            "groupId": "grp_test",
            "userId": TEST_USER["_id"],
            "role": "Organizer",
            "status": "Active",
            "createdAt": now,
        },
        {
            "joinCode": "code1",
            "groupId": "grp_test",
            "durationDays": 7,
            "createdAt": now,
        },
    )
    group_store._memberships["mem_other"] = {
        "id": "mem_other",
        "groupId": "grp_test",
        "userId": OTHER_USER["_id"],
        "role": "Member",
        "status": "Active",
        "createdAt": now,
    }
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def token(app):
    with app.app_context():
        from backend.auth import issue_token

        return issue_token(app, TEST_USER)


@pytest.fixture
def other_token(app):
    with app.app_context():
        from backend.auth import issue_token

        return issue_token(app, OTHER_USER)


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers(other_token):
    return {"Authorization": f"Bearer {other_token}"}


@pytest.fixture
def expense_payload():
    return {
        "description": "Dinner at B\u00e1nh X\u1ecfo 46A",
        "amount": 150000,
        "date": "2026-10-25",
        "paidBy": "usr_test",
        "participantIds": ["usr_test", "usr_other"],
    }


def create_expense(client, payload, headers):
    return client.post(
        "/api/groups/grp_test/expenses", json=payload, headers=headers
    )
