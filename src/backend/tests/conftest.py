from datetime import datetime, timezone

import pytest
from flask import Flask
from flask.testing import FlaskClient
from werkzeug.security import generate_password_hash

from backend.app import create_app
from backend.auth import issue_token


@pytest.fixture
def app() -> Flask:
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "SEED_DEMO_USER": False,
            "MONGO_URI": None,
        }
    )


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    return app.test_client()


@pytest.fixture
def register_user(client: FlaskClient):
    def _register(
        display_name: str = "Minh",
        email: str = "minh@example.com",
        password: str = "password123",
    ) -> dict:
        response = client.post(
            "/api/auth/register",
            json={"displayName": display_name, "email": email, "password": password},
        )
        assert response.status_code == 201, response.get_json()
        return response.get_json()

    return _register


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Expense fixtures: a group "grp_test" with two active members, usr_test
# (organizer) and usr_other (member), seeded directly into the memory stores.
# ---------------------------------------------------------------------------

TEST_USER_ID = "usr_test"
OTHER_USER_ID = "usr_other"
TEST_GROUP_ID = "grp_test"


def _seed_user(app: Flask, user_id: str, name: str, email: str) -> None:
    app.extensions["user_store"].create_user(
        {
            "id": user_id,
            "displayName": name,
            "email": email,
            "passwordHash": generate_password_hash("password123"),
            "memberSince": "2026-10-20",
            "bankDetails": None,
            "sessionVersion": 0,
        }
    )


@pytest.fixture
def seeded_app(app: Flask) -> Flask:
    _seed_user(app, TEST_USER_ID, "Tester", "tester@example.com")
    _seed_user(app, OTHER_USER_ID, "Other", "other@example.com")

    now = datetime.now(timezone.utc).isoformat()
    group_store = app.extensions["group_store"]
    group_store.create_group(
        {
            "id": TEST_GROUP_ID,
            "name": "Test Group",
            "description": "A group for tests.",
            "creatorId": TEST_USER_ID,
            "maxMember": 50,
            "createdAt": now,
        },
        {
            "id": "mem_test",
            "groupId": TEST_GROUP_ID,
            "userId": TEST_USER_ID,
            "role": "Organizer",
            "status": "Active",
            "createdAt": now,
        },
        {
            "id": "inv_test",
            "joinCode": "code1",
            "groupId": TEST_GROUP_ID,
            "durationDays": 7,
            "createdAt": now,
        },
    )
    group_store.create_membership(
        {
            "id": "mem_other",
            "groupId": TEST_GROUP_ID,
            "userId": OTHER_USER_ID,
            "role": "Member",
            "status": "Active",
            "createdAt": now,
        }
    )
    return app


def _token_for(app: Flask, user_id: str) -> str:
    with app.app_context():
        user = app.extensions["user_store"].find_by_id(user_id)
        return issue_token(app, user)


@pytest.fixture
def token(seeded_app: Flask) -> str:
    return _token_for(seeded_app, TEST_USER_ID)


@pytest.fixture
def other_token(seeded_app: Flask) -> str:
    return _token_for(seeded_app, OTHER_USER_ID)


@pytest.fixture
def auth_headers(token: str) -> dict[str, str]:
    return auth_header(token)


@pytest.fixture
def other_auth_headers(other_token: str) -> dict[str, str]:
    return auth_header(other_token)


@pytest.fixture
def expense_payload() -> dict:
    return {
        "description": "Dinner at B\u00e1nh X\u1ecfo 46A",
        "amount": 150000,
        "date": "2026-10-25",
        "paidBy": TEST_USER_ID,
        "participantIds": [TEST_USER_ID, OTHER_USER_ID],
    }
