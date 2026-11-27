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


def add_membership(
    app: Flask,
    group_id: str,
    user_id: str,
    membership_id: str,
    *,
    role: str = "Member",
    status: str = "Active",
    created_at: str = "2026-11-01T10:00:00+00:00",
) -> None:
    app.extensions["group_store"].create_membership(
        {
            "id": membership_id,
            "groupId": group_id,
            "userId": user_id,
            "role": role,
            "status": status,
            "createdAt": created_at,
        }
    )


def test_get_group_members_requires_authentication(client: FlaskClient) -> None:
    response = client.get("/api/groups/grp_missing/members")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_organizer_can_list_members_with_profile_fields(
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
        f"/api/groups/{group['id']}/members",
        headers=auth_header(owner["token"]),
    )

    assert response.status_code == 200
    members = response.get_json()["members"]
    assert len(members) == 1
    member = members[0]
    assert set(member) == {
        "membershipId",
        "userId",
        "displayName",
        "email",
        "role",
        "status",
        "joinedAt",
    }
    assert member["membershipId"].startswith("mem_")
    assert member["userId"] == owner_id
    assert member["displayName"] == "Minh"
    assert member["email"] == "minh@example.com"
    assert member["role"] == "Organizer"
    assert member["status"] == "Active"
    assert "bankDetails" not in response.get_data(as_text=True)
    assert "passwordHash" not in response.get_data(as_text=True)
    assert "0123456789" not in response.get_data(as_text=True)


def test_active_member_can_list_members(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    member = register_user(email="member@example.com")
    group = create_group(client, owner["token"])
    joined = client.post(
        f"/api/invitations/{group['invitation']['joinCode']}/join",
        headers=auth_header(member["token"]),
    )
    assert joined.status_code == 201

    response = client.get(
        f"/api/groups/{group['id']}/members",
        headers=auth_header(member["token"]),
    )

    assert response.status_code == 200
    user_ids = [item["userId"] for item in response.get_json()["members"]]
    assert user_ids == [owner["user"]["id"], member["user"]["id"]]


def test_members_are_ordered_organizer_first_then_joined_at(
    app: Flask, client: FlaskClient, register_user
) -> None:
    owner = register_user()
    early = register_user(email="early@example.com")
    late = register_user(email="late@example.com")
    group = create_group(client, owner["token"])
    add_membership(
        app,
        group["id"],
        early["user"]["id"],
        "mem_early",
        created_at="2026-11-01T10:00:00+00:00",
    )
    add_membership(
        app,
        group["id"],
        late["user"]["id"],
        "mem_late",
        created_at="2026-11-02T10:00:00+00:00",
    )
    store = app.extensions["group_store"]
    organizer = store.find_membership(group["id"], owner["user"]["id"])
    assert organizer is not None
    store._memberships[organizer["id"]]["createdAt"] = (
        "2026-12-01T10:00:00+00:00"
    )

    response = client.get(
        f"/api/groups/{group['id']}/members",
        headers=auth_header(owner["token"]),
    )

    assert response.status_code == 200
    membership_ids = [
        item["membershipId"] for item in response.get_json()["members"]
    ]
    assert membership_ids == [organizer["id"], "mem_early", "mem_late"]


def test_members_exclude_non_active_memberships(
    app: Flask, client: FlaskClient, register_user
) -> None:
    owner = register_user()
    former = register_user(email="former@example.com")
    group = create_group(client, owner["token"])
    add_membership(
        app,
        group["id"],
        former["user"]["id"],
        "mem_former",
        status="Left",
    )

    response = client.get(
        f"/api/groups/{group['id']}/members",
        headers=auth_header(owner["token"]),
    )

    assert response.status_code == 200
    members = response.get_json()["members"]
    user_ids = [item["userId"] for item in members]
    assert user_ids == [owner["user"]["id"]]
    assert "mem_former" not in response.get_data(as_text=True)


def test_non_member_cannot_list_members(
    client: FlaskClient, register_user
) -> None:
    owner = register_user()
    outsider = register_user(email="outsider@example.com")
    group = create_group(client, owner["token"])

    response = client.get(
        f"/api/groups/{group['id']}/members",
        headers=auth_header(outsider["token"]),
    )

    assert response.status_code == 403
    data = response.get_json()
    assert data["error"]["code"] == "forbidden"
    assert "members" not in data


def test_former_member_cannot_list_members(
    app: Flask, client: FlaskClient, register_user
) -> None:
    owner = register_user()
    former = register_user(email="former@example.com")
    group = create_group(client, owner["token"])
    joined = client.post(
        f"/api/invitations/{group['invitation']['joinCode']}/join",
        headers=auth_header(former["token"]),
    )
    assert joined.status_code == 201
    membership_id = joined.get_json()["membership"]["id"]
    app.extensions["group_store"]._memberships[membership_id]["status"] = "Left"

    response = client.get(
        f"/api/groups/{group['id']}/members",
        headers=auth_header(former["token"]),
    )

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "forbidden"


def test_unknown_group_members_returns_not_found(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = client.get(
        "/api/groups/grp_missing/members", headers=auth_header(token)
    )

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
