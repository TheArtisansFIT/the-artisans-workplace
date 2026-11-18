import pytest
from flask.testing import FlaskClient

from backend.app import create_app


@pytest.fixture
def client() -> FlaskClient:
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def test_get_health_returns_json_status(client: FlaskClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.is_json
    assert response.get_json() == {"status": "ok"}


def test_post_health_returns_method_not_allowed(client: FlaskClient) -> None:
    response = client.post("/health")

    assert response.status_code == 405


def test_unknown_route_returns_not_found(client: FlaskClient) -> None:
    response = client.get("/unknown")

    assert response.status_code == 404
