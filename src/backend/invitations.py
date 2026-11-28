"""Invitation preview and join endpoints (UC-07)."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from flask import Blueprint, current_app, g, jsonify

from .auth import login_required
from .errors import ApiError
from .groups import _group_summary, _invitation_expires_at, _is_expired
from .store import DuplicateMembershipError, GroupStore

invitations_bp = Blueprint("invitations", __name__, url_prefix="/api/invitations")


def get_group_store() -> GroupStore:
    return current_app.extensions["group_store"]


def _public_membership(membership: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": membership["id"],
        "groupId": membership["groupId"],
        "userId": membership["userId"],
        "role": membership["role"],
        "status": membership["status"],
        "joinedAt": membership["createdAt"],
    }


def _find_valid_invitation(join_code: str) -> dict[str, Any]:
    invitation = get_group_store().find_invitation_by_join_code(join_code)
    if invitation is None or _is_expired(invitation):
        raise ApiError(
            404,
            "Invitation not found or has expired.",
            "not_found",
        )
    return invitation


def _group_for_invitation(invitation: dict[str, Any]) -> dict[str, Any]:
    group = get_group_store().find_group(invitation["groupId"])
    if group is None:
        raise ApiError(
            404,
            "Invitation not found or has expired.",
            "not_found",
        )
    return group


@invitations_bp.get("/<join_code>")
@login_required
def preview_invitation(join_code: str):
    invitation = _find_valid_invitation(join_code)
    store = get_group_store()
    group = _group_for_invitation(invitation)
    memberships = store.list_active_memberships(group["id"])
    user_id = g.current_user["id"]
    membership = next(
        (item for item in memberships if item["userId"] == user_id), None
    )

    return jsonify(
        invitation={
            "joinCode": invitation["joinCode"],
            "groupId": invitation["groupId"],
            "createdAt": invitation["createdAt"],
            "expiresAt": _invitation_expires_at(invitation).isoformat(),
        },
        group=_group_summary(group, len(memberships)),
        alreadyMember=membership is not None,
        myRole=membership["role"] if membership else None,
    )


@invitations_bp.post("/<join_code>/join")
@login_required
def join_invitation(join_code: str):
    invitation = _find_valid_invitation(join_code)
    store = get_group_store()
    group = _group_for_invitation(invitation)
    user_id = g.current_user["id"]

    existing = store.find_membership(group["id"], user_id)
    if existing is not None:
        return (
            jsonify(
                group=_group_summary(
                    group, len(store.list_active_memberships(group["id"]))
                ),
                membership=_public_membership(existing),
                alreadyMember=True,
            ),
            200,
        )

    membership = {
        "id": f"mem_{secrets.token_hex(8)}",
        "groupId": group["id"],
        "userId": user_id,
        "role": "Member",
        "status": "Active",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    try:
        store.create_membership(membership)
    except DuplicateMembershipError:
        existing = store.find_membership(group["id"], user_id)
        if existing is None:
            raise ApiError(409, "Membership already exists.", "conflict")
        return (
            jsonify(
                group=_group_summary(
                    group, len(store.list_active_memberships(group["id"]))
                ),
                membership=_public_membership(existing),
                alreadyMember=True,
            ),
            200,
        )

    return (
        jsonify(
            group=_group_summary(
                group, len(store.list_active_memberships(group["id"]))
            ),
            membership=_public_membership(membership),
            alreadyMember=False,
        ),
        201,
    )
