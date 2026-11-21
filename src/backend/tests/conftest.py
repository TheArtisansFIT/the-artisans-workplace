import pytest
from flask import Flask
from flask.testing import FlaskClient

from backend.app import create_app


@pytest.fixture
def app() -> Flask:
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "SEED_DEMO_USER": False,
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
