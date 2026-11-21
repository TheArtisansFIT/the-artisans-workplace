import pytest
from flask.testing import FlaskClient

from backend.app import create_app


@pytest.fixture
def client() -> FlaskClient:
    app = create_app(
        {"TESTING": True, "SEED_DEMO_USER": False, "MONGO_URI": None}
    )
    return app.test_client()


def test_get_health_returns_json_status(client: FlaskClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.is_json
    assert response.get_json() == {"status": "ok", "storage": "memory"}


def test_post_health_returns_method_not_allowed(client: FlaskClient) -> None:
    response = client.post("/health")

    assert response.status_code == 405


def test_unknown_route_returns_not_found(client: FlaskClient) -> None:
    response = client.get("/unknown")

    assert response.status_code == 404


def test_non_test_app_requires_database_or_explicit_memory_store() -> None:
    with pytest.raises(RuntimeError, match="MongoDB is not configured"):
        create_app(
            {
                "MONGO_URI": None,
                "USER_STORE": "",
                "SEED_DEMO_USER": False,
            }
        )


def test_memory_store_must_be_explicit_outside_tests() -> None:
    app = create_app(
        {
            "MONGO_URI": None,
            "USER_STORE": "memory",
            "SEED_DEMO_USER": False,
        }
    )

    assert app.test_client().get("/health").get_json()["storage"] == "memory"
