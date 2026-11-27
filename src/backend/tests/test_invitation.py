from flask import Flask
from flask.testing import FlaskClient


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_group(client: FlaskClient, token: str, **overrides):
    payload = {
        "name": "Da Lat trip 2026",
        "description": "A long weekend",
        **overrides,
    }
    response = client.post(
        "/api/groups", json=payload, headers=auth_header(token)
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["group"]


def test_get_invitation_requires_authentication(client: FlaskClient) -> None:
    response = client.get("/api/groups/grp_missing/invitation")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_get_invitation_returns_join_link_for_organizer(
    client: FlaskClient, register_user
) -> None:
    session = register_user()
    token = session["token"]
    client.put(
        "/api/users/me/bank-details",
        json={
            "bankName": "Vietcombank",
            "accountNumber": "0123456789",
            "accountHolder": "LE QUANG MINH",
        },
        headers=auth_header(token),
    )
    group = create_group(client, token)

    response = client.get(
        f"/api/groups/{group['id']}/invitation", headers=auth_header(token)
    )

    assert response.status_code == 200
    invitation = response.get_json()["invitation"]
    assert invitation["groupId"] == group["id"]
    assert invitation["joinCode"] == group["invitation"]["joinCode"]
    assert (
        invitation["joinLink"]
        == f"http://localhost:5173/join/{group['invitation']['joinCode']}"
    )
    assert invitation["durationDays"] == 7
    assert invitation["expiresAt"] > invitation["createdAt"]
    assert invitation["isExpired"] is False
    assert "bankDetails" not in response.get_data(as_text=True)


def test_get_invitation_rejects_non_member(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    group = create_group(client, owner["token"])

    response = client.get(
        f"/api/groups/{group['id']}/invitation",
        headers=auth_header(outsider["token"]),
    )

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "forbidden"


def test_get_invitation_rejects_active_non_organizer(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    member = register_user(email="member@example.com")
    group = create_group(client, owner["token"])
    join = client.post(
        f"/api/invitations/{group['invitation']['joinCode']}/join",
        headers=auth_header(member["token"]),
    )
    assert join.status_code == 201

    response = client.get(
        f"/api/groups/{group['id']}/invitation",
        headers=auth_header(member["token"]),
    )

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "forbidden"


def test_get_invitation_unknown_group_returns_not_found(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = client.get(
        "/api/groups/grp_missing/invitation", headers=auth_header(token)
    )

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"


def test_get_invitation_reports_expired(
    app: Flask, client: FlaskClient, register_user
) -> None:
    app.config["GROUP_INVITATION_DURATION_DAYS"] = 0
    token = register_user()["token"]
    group = create_group(client, token)

    response = client.get(
        f"/api/groups/{group['id']}/invitation", headers=auth_header(token)
    )

    assert response.status_code == 200
    invitation = response.get_json()["invitation"]
    assert invitation["isExpired"] is True
    assert invitation["expiresAt"] == invitation["createdAt"]


def test_preview_invitation_requires_authentication(client: FlaskClient) -> None:
    response = client.get("/api/invitations/unknown-code")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_preview_invitation_returns_limited_group_info(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    group = create_group(client, owner["token"])

    response = client.get(
        f"/api/invitations/{group['invitation']['joinCode']}",
        headers=auth_header(outsider["token"]),
    )

    assert response.status_code == 200
    data = response.get_json()
    assert set(data["invitation"]) == {
        "joinCode",
        "groupId",
        "createdAt",
        "expiresAt",
    }
    assert data["invitation"]["joinCode"] == group["invitation"]["joinCode"]
    assert set(data["group"]) == {
        "id",
        "name",
        "description",
        "creatorId",
        "memberCount",
    }
    assert data["group"]["id"] == group["id"]
    assert data["group"]["memberCount"] == 1
    assert data["alreadyMember"] is False
    assert data["myRole"] is None
    assert "members" not in data
    assert "email" not in response.get_data(as_text=True)


def test_preview_invitation_reports_current_member(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    group = create_group(client, owner["token"])

    response = client.get(
        f"/api/invitations/{group['invitation']['joinCode']}",
        headers=auth_header(owner["token"]),
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["alreadyMember"] is True
    assert data["myRole"] == "Organizer"


def test_preview_invitation_rejects_unknown_code(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = client.get(
        "/api/invitations/unknown-code", headers=auth_header(token)
    )

    assert response.status_code == 404
    data = response.get_json()
    assert data["error"]["code"] == "not_found"
    assert "group" not in data


def test_preview_invitation_rejects_expired_code(
    app: Flask, client: FlaskClient, register_user
) -> None:
    app.config["GROUP_INVITATION_DURATION_DAYS"] = 0
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    group = create_group(client, owner["token"])

    response = client.get(
        f"/api/invitations/{group['invitation']['joinCode']}",
        headers=auth_header(outsider["token"]),
    )

    assert response.status_code == 404
    data = response.get_json()
    assert data["error"]["code"] == "not_found"
    assert "group" not in data


def test_preview_invitation_excludes_bank_details(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    owner_id = owner["user"]["id"]
    client.put(
        "/api/users/me/bank-details",
        json={
            "bankName": "Vietcombank",
            "accountNumber": "0123456789",
            "accountHolder": "LE QUANG MINH",
        },
        headers=auth_header(owner["token"]),
    )
    group = create_group(client, owner["token"])

    response = client.get(
        f"/api/invitations/{group['invitation']['joinCode']}",
        headers=auth_header(owner["token"]),
    )

    assert response.status_code == 200
    assert owner_id in response.get_data(as_text=True)
    assert "bankDetails" not in response.get_data(as_text=True)
    assert "0123456789" not in response.get_data(as_text=True)


def test_join_invitation_requires_authentication(client: FlaskClient) -> None:
    response = client.post("/api/invitations/unknown-code/join")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_join_invitation_creates_active_membership(
    app: Flask, client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    group = create_group(client, owner["token"])

    response = client.post(
        f"/api/invitations/{group['invitation']['joinCode']}/join",
        headers=auth_header(outsider["token"]),
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["alreadyMember"] is False
    assert data["group"]["memberCount"] == 2
    membership = data["membership"]
    assert membership["id"].startswith("mem_")
    assert membership["groupId"] == group["id"]
    assert membership["userId"] == outsider["user"]["id"]
    assert membership["role"] == "Member"
    assert membership["status"] == "Active"
    assert membership["joinedAt"]

    store = app.extensions["group_store"]
    stored = store.find_membership(group["id"], outsider["user"]["id"])
    assert stored is not None
    assert stored["id"] == membership["id"]


def test_join_invitation_is_idempotent(
    app: Flask, client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    group = create_group(client, owner["token"])
    url = f"/api/invitations/{group['invitation']['joinCode']}/join"

    first = client.post(url, headers=auth_header(outsider["token"]))
    second = client.post(url, headers=auth_header(outsider["token"]))

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.get_json()["alreadyMember"] is True
    assert (
        second.get_json()["membership"]["id"]
        == first.get_json()["membership"]["id"]
    )
    assert second.get_json()["group"]["memberCount"] == 2
    store = app.extensions["group_store"]
    assert len(store.list_active_memberships(group["id"])) == 2


def test_join_invitation_invalid_or_expired_returns_404_without_write(
    app: Flask, client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")

    unknown = client.post(
        "/api/invitations/unknown-code/join",
        headers=auth_header(outsider["token"]),
    )
    assert unknown.status_code == 404
    assert unknown.get_json()["error"]["code"] == "not_found"

    app.config["GROUP_INVITATION_DURATION_DAYS"] = 0
    group = create_group(client, owner["token"])
    expired = client.post(
        f"/api/invitations/{group['invitation']['joinCode']}/join",
        headers=auth_header(outsider["token"]),
    )

    assert expired.status_code == 404
    assert expired.get_json()["error"]["code"] == "not_found"
    store = app.extensions["group_store"]
    assert len(store.list_active_memberships(group["id"])) == 1


def test_join_invitation_former_member_rejoins_with_new_membership(
    app: Flask, client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    group = create_group(client, owner["token"])
    url = f"/api/invitations/{group['invitation']['joinCode']}/join"

    joined = client.post(url, headers=auth_header(outsider["token"]))
    assert joined.status_code == 201
    old_id = joined.get_json()["membership"]["id"]

    store = app.extensions["group_store"]
    store._memberships[old_id]["status"] = "Left"
    assert store.find_membership(group["id"], outsider["user"]["id"]) is None

    rejoined = client.post(url, headers=auth_header(outsider["token"]))

    assert rejoined.status_code == 201
    new_id = rejoined.get_json()["membership"]["id"]
    assert new_id != old_id
    assert store._memberships[old_id]["status"] == "Left"
    stored = store.find_membership(group["id"], outsider["user"]["id"])
    assert stored is not None
    assert stored["id"] == new_id


def test_join_invitation_excludes_bank_details(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    client.put(
        "/api/users/me/bank-details",
        json={
            "bankName": "Vietcombank",
            "accountNumber": "0123456789",
            "accountHolder": "LE QUANG MINH",
        },
        headers=auth_header(outsider["token"]),
    )
    group = create_group(client, owner["token"])

    response = client.post(
        f"/api/invitations/{group['invitation']['joinCode']}/join",
        headers=auth_header(outsider["token"]),
    )

    assert response.status_code == 201
    assert "bankDetails" not in response.get_data(as_text=True)
    assert "0123456789" not in response.get_data(as_text=True)
