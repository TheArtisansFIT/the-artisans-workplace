from flask import Flask
from flask.testing import FlaskClient


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_group(client: FlaskClient, token: str, **overrides):
    payload = {"name": "Da Lat trip 2026", "description": "A long weekend", **overrides}
    return client.post("/api/groups", json=payload, headers=auth_header(token))


def test_create_group_requires_authentication(client: FlaskClient) -> None:
    response = client.post("/api/groups", json={"name": "Da Lat trip 2026"})

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_create_group_rejects_missing_name(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = client.post("/api/groups", json={}, headers=auth_header(token))

    assert response.status_code == 400
    fields = response.get_json()["error"]["fields"]
    assert fields == {"name": "Enter a group name."}


def test_create_group_rejects_short_name(client: FlaskClient, register_user) -> None:
    token = register_user()["token"]

    response = create_group(client, token, name="A")

    assert response.status_code == 400
    assert "name" in response.get_json()["error"]["fields"]


def test_create_group_rejects_long_name_and_description(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = create_group(client, token, name="x" * 101, description="y" * 201)

    assert response.status_code == 400
    assert set(response.get_json()["error"]["fields"]) == {"name", "description"}


def test_create_group_accepts_name_only(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = client.post(
        "/api/groups",
        json={"name": "Name only"},
        headers=auth_header(token),
    )

    assert response.status_code == 201
    assert response.get_json()["group"]["description"] == ""


def test_create_group_records_creator_membership_and_invitation(
    app: Flask, client: FlaskClient, register_user
) -> None:
    session = register_user()
    token = session["token"]
    user_id = session["user"]["id"]

    response = create_group(client, token)

    assert response.status_code == 201
    group = response.get_json()["group"]
    assert group["id"].startswith("grp_")
    assert group["name"] == "Da Lat trip 2026"
    assert group["description"] == "A long weekend"
    assert group["creatorId"] == user_id
    assert group["memberIds"] == [user_id]
    assert group["maxMember"] == 50
    assert group["invitation"]["joinCode"]
    assert len(group["invitation"]["joinCode"]) <= 15
    assert group["invitation"]["durationDays"] == 7
    assert group["invitation"]["expiresAt"] > group["invitation"]["createdAt"]

    store = app.extensions["group_store"]
    stored_group = store.find_group(group["id"])
    membership = store.find_membership(group["id"], user_id)
    invitation = store.find_invitation_for_group(group["id"])

    assert stored_group is not None
    assert stored_group["name"] == "Da Lat trip 2026"
    assert membership is not None
    assert membership["role"] == "Organizer"
    assert membership["status"] == "Active"
    assert invitation is not None
    assert invitation["joinCode"] == group["invitation"]["joinCode"]


def test_create_group_generates_unique_ids_and_join_codes(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    first = create_group(client, token, name="First group").get_json()["group"]
    second = create_group(client, token, name="Second group").get_json()["group"]

    assert first["id"] != second["id"]
    assert first["invitation"]["joinCode"] != second["invitation"]["joinCode"]


def test_group_response_excludes_bank_details(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]
    client.put(
        "/api/users/me/bank-details",
        json={
            "bankName": "Vietcombank",
            "accountNumber": "0123456789",
            "accountHolder": "LE QUANG MINH",
        },
        headers=auth_header(token),
    )

    response = create_group(client, token)

    assert response.status_code == 201
    assert "bankDetails" not in response.get_data(as_text=True)
