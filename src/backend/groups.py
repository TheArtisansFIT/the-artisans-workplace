"""Group creation endpoints (UC-05 / FR-09, FR-10)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request

from .auth import login_required
from .errors import ApiError, validation_error
from .store import GroupStore

groups_bp = Blueprint("groups", __name__, url_prefix="/api/groups")


def get_group_store() -> GroupStore:
    return current_app.extensions["group_store"]


def _json_object() -> dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "Send a JSON object in the request body.", "invalid_request")
    return data


def _text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    return value.strip() if isinstance(value, str) else ""


def _as_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _invitation_expires_at(invitation: dict[str, Any]) -> datetime:
    return _as_datetime(invitation["createdAt"]) + timedelta(
        days=invitation["durationDays"]
    )


def _is_expired(invitation: dict[str, Any]) -> bool:
    return datetime.now(timezone.utc) >= _invitation_expires_at(invitation)


def _require_group(group_id: str) -> dict[str, Any]:
    group = get_group_store().find_group(group_id)
    if group is None:
        raise ApiError(404, "Group not found.", "not_found")
    return group


def _require_active_membership(
    group_id: str, user_id: str
) -> dict[str, Any]:
    membership = get_group_store().find_membership(group_id, user_id)
    if membership is None or membership["status"] != "Active":
        raise ApiError(
            403,
            "You are not an active member of this group.",
            "forbidden",
        )
    return membership


def _require_organizer(group_id: str, user_id: str) -> dict[str, Any]:
    membership = _require_active_membership(group_id, user_id)
    if membership["role"] != "Organizer":
        raise ApiError(
            403,
            "Only the group organizer can do this.",
            "forbidden",
        )
    return membership


def _group_summary(group: dict[str, Any], member_count: int) -> dict[str, Any]:
    return {
        "id": group["id"],
        "name": group["name"],
        "description": group["description"],
        "creatorId": group["creatorId"],
        "memberCount": member_count,
    }


def _public_group(
    group: dict[str, Any],
    membership: dict[str, Any],
    invitation: dict[str, Any],
) -> dict[str, Any]:
    expires_at = _invitation_expires_at(invitation).isoformat()
    return {
        "id": group["id"],
        "name": group["name"],
        "description": group["description"],
        "creatorId": group["creatorId"],
        "maxMember": group["maxMember"],
        "createdAt": group["createdAt"],
        "memberIds": [membership["userId"]],
        "invitation": {
            "joinCode": invitation["joinCode"],
            "durationDays": invitation["durationDays"],
            "createdAt": invitation["createdAt"],
            "expiresAt": expires_at,
        },
    }


@groups_bp.post("")
@login_required
def create_group():
    data = _json_object()
    name = _text(data, "name")
    description = _text(data, "description")

    fields: dict[str, str] = {}
    if not name:
        fields["name"] = "Enter a group name."
    elif len(name) < 2:
        fields["name"] = "Use at least 2 characters."
    elif len(name) > 100:
        fields["name"] = "Use 100 characters or fewer."

    if len(description) > 200:
        fields["description"] = "Use 200 characters or fewer."

    if fields:
        raise validation_error(fields)

    user = g.current_user
    now = datetime.now(timezone.utc)
    created_at = now.isoformat()
    group_id = f"grp_{secrets.token_hex(8)}"
    duration_days = int(current_app.config["GROUP_INVITATION_DURATION_DAYS"])

    group = {
        "id": group_id,
        "name": name,
        "description": description,
        "creatorId": user["id"],
        "maxMember": int(current_app.config["GROUP_MAX_MEMBER"]),
        "createdAt": created_at,
    }
    membership = {
        "id": f"mem_{secrets.token_hex(8)}",
        "groupId": group_id,
        "userId": user["id"],
        "role": "Organizer",
        "status": "Active",
        "createdAt": created_at,
    }
    invitation = {
        "id": f"inv_{secrets.token_hex(8)}",
        "joinCode": secrets.token_hex(5),
        "groupId": group_id,
        "durationDays": duration_days,
        "createdAt": created_at,
    }

    get_group_store().create_group(group, membership, invitation)

    return jsonify(group=_public_group(group, membership, invitation)), 201


@groups_bp.get("/<group_id>/invitation")
@login_required
def get_group_invitation(group_id: str):
    group = _require_group(group_id)
    _require_organizer(group["id"], g.current_user["id"])

    invitation = get_group_store().find_invitation_for_group(group["id"])
    if invitation is None:
        raise ApiError(404, "Invitation not found.", "not_found")

    base_url = str(current_app.config["PUBLIC_APP_URL"]).rstrip("/")
    join_code = invitation["joinCode"]
    return jsonify(
        invitation={
            "groupId": group["id"],
            "joinCode": join_code,
            "joinLink": f"{base_url}/join/{join_code}",
            "durationDays": invitation["durationDays"],
            "createdAt": invitation["createdAt"],
            "expiresAt": _invitation_expires_at(invitation).isoformat(),
            "isExpired": _is_expired(invitation),
        }
    )


@groups_bp.get("/<group_id>/members")
@login_required
def get_group_members(group_id: str):
    group = _require_group(group_id)
    _require_active_membership(group["id"], g.current_user["id"])

    user_store = current_app.extensions["user_store"]
    members = []
    for membership in get_group_store().list_active_memberships(group["id"]):
        user = user_store.find_by_id(membership["userId"])
        members.append(
            {
                "membershipId": membership["id"],
                "userId": membership["userId"],
                "displayName": user["displayName"] if user else "",
                "email": user["email"] if user else "",
                "role": membership["role"],
                "status": membership["status"],
                "joinedAt": membership["createdAt"],
            }
        )

    return jsonify(members=members)
