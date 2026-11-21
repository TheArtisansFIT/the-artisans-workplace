from flask import Flask
from flask.testing import FlaskClient

from backend.app import create_app


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_creates_account_and_returns_session(client: FlaskClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "displayName": "Minh",
            "email": "Minh@Example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 201
    body = response.get_json()
    assert body["token"]
    assert body["user"]["displayName"] == "Minh"
    assert body["user"]["email"] == "minh@example.com"
    assert body["user"]["bankDetails"] is None
    assert "passwordHash" not in body["user"]
    assert "sessionVersion" not in body["user"]


def test_register_rejects_duplicate_email(
    client: FlaskClient, register_user
) -> None:
    register_user(email="minh@example.com")

    response = client.post(
        "/api/auth/register",
        json={
            "displayName": "Another Minh",
            "email": "MINH@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "email_taken"


def test_register_validates_required_fields(client: FlaskClient) -> None:
    response = client.post("/api/auth/register", json={})

    assert response.status_code == 400
    fields = response.get_json()["error"]["fields"]
    assert set(fields) == {"displayName", "email", "password"}


def test_register_rejects_short_password(client: FlaskClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"displayName": "Minh", "email": "minh@example.com", "password": "123"},
    )

    assert response.status_code == 400
    assert "password" in response.get_json()["error"]["fields"]


def test_passwords_are_hashed(app: Flask, client: FlaskClient) -> None:
    client.post(
        "/api/auth/register",
        json={"displayName": "Minh", "email": "minh@example.com", "password": "password123"},
    )

    stored = app.extensions["user_store"].find_by_email("minh@example.com")
    assert stored is not None
    assert stored["passwordHash"] != "password123"
    assert "password123" not in stored["passwordHash"]


def test_login_returns_session_for_valid_credentials(
    client: FlaskClient, register_user
) -> None:
    register_user(email="minh@example.com", password="password123")

    response = client.post(
        "/api/auth/login",
        json={"email": "MINH@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["token"]
    assert body["user"]["email"] == "minh@example.com"


def test_login_rejects_wrong_password(client: FlaskClient, register_user) -> None:
    register_user()

    response = client.post(
        "/api/auth/login",
        json={"email": "minh@example.com", "password": "wrongpass"},
    )

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "invalid_credentials"


def test_login_rejects_unknown_email(client: FlaskClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
    )

    assert response.status_code == 401


def test_me_requires_a_bearer_token(client: FlaskClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_me_returns_the_signed_in_user(
    client: FlaskClient, register_user
) -> None:
    session = register_user()

    response = client.get("/api/auth/me", headers=auth_header(session["token"]))

    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "minh@example.com"


def test_logout_ends_the_existing_session(
    client: FlaskClient, register_user
) -> None:
    session = register_user()

    logout = client.post("/api/auth/logout", headers=auth_header(session["token"]))
    assert logout.status_code == 200
    assert logout.get_json() == {"status": "ok"}

    response = client.get("/api/auth/me", headers=auth_header(session["token"]))
    assert response.status_code == 401


def test_user_can_sign_in_again_after_logout(
    client: FlaskClient, register_user
) -> None:
    first = register_user()
    client.post("/api/auth/logout", headers=auth_header(first["token"]))

    response = client.post(
        "/api/auth/login",
        json={"email": "minh@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    assert client.get(
        "/api/auth/me", headers=auth_header(response.get_json()["token"])
    ).status_code == 200


def test_demo_account_is_seeded_for_the_frontend() -> None:
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "SEED_DEMO_USER": True,
            "MONGO_URI": None,
        }
    )
    client = app.test_client()

    response = client.post(
        "/api/auth/login",
        json={"email": "minh.le@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.get_json()["user"]["bankDetails"]["bankName"] == "Vietcombank"


def test_api_404_is_json(client: FlaskClient) -> None:
    response = client.get("/api/missing")

    assert response.status_code == 404
    assert response.is_json
