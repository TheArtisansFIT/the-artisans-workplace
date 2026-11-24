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


def _public_group(
    group: dict[str, Any],
    membership: dict[str, Any],
    invitation: dict[str, Any],
) -> dict[str, Any]:
    expires_at = (
        datetime.fromisoformat(group["createdAt"])
        + timedelta(days=invitation["durationDays"])
    ).isoformat()
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
        "joinCode": secrets.token_hex(5),
        "groupId": group_id,
        "durationDays": duration_days,
        "createdAt": created_at,
    }

    get_group_store().create_group(group, membership, invitation)

    return jsonify(group=_public_group(group, membership, invitation)), 201
