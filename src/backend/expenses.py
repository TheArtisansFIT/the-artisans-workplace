"""Expense endpoints (UC-09, UC-10, UC-11).

UC-09 Record shared expense        -> POST /api/groups/<group_id>/expenses
UC-10 View expense details         -> GET  /api/groups/<group_id>/expenses/<expense_id>
UC-11 Edit / Delete expense        -> PUT  /api/groups/<group_id>/expenses/<expense_id>
                                    -> DELETE /api/groups/<group_id>/expenses/<expense_id>
"""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request

from .auth import login_required
from .errors import ApiError, validation_error
from .store import (
    ExpenseStore,
    GroupStore,
    build_expense_store,
    _build_obligations,
    _split_shares,
)

expenses_bp = Blueprint("expenses", __name__, url_prefix="/api/groups")

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def get_expense_store() -> ExpenseStore:
    return current_app.extensions["expense_store"]


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


def _member_ids(data: dict[str, Any], key: str) -> list[str]:
    value = data.get(key)
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _validate_membership(
    group_id: str, user_id: str
) -> tuple[dict[str, Any], list[str]]:
    group = get_group_store().find_group(group_id)
    if group is None:
        raise ApiError(404, "Group not found.", "not_found")
    if get_group_store().find_membership(group_id, user_id) is None:
        raise ApiError(403, "You are not a member of this group.", "forbidden")
    member_ids = list(group.get("memberIds", []))
    return group, member_ids


def _validate_expense_input(
    data: dict[str, Any], member_ids: list[str], partial: bool = False
) -> dict[str, Any]:
    fields: dict[str, str] = {}

    description = _text(data, "description")
    if partial and "description" not in data:
        description = None
    if not description:
        if not partial:
            fields["description"] = "Add a short description."
    elif len(description) > 120:
        fields["description"] = "Use 120 characters or fewer."

    amount = data.get("amount")
    if partial and "amount" not in data:
        amount = None
    if amount is None:
        if not partial:
            fields["amount"] = "Enter an amount."
    elif not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0:
        fields["amount"] = "Enter whole đồng only, greater than 0."

    date = _text(data, "date")
    if partial and "date" not in data:
        date = None
    if date is None:
        if not partial:
            fields["date"] = "Choose a date."
    elif not DATE_PATTERN.match(date):
        fields["date"] = "Use a valid date (YYYY-MM-DD)."

    paid_by = _text(data, "paidBy")
    if partial and "paidBy" not in data:
        paid_by = None
    if paid_by is None:
        if not partial:
            fields["paidBy"] = "Choose who paid."
    elif paid_by not in member_ids:
        fields["paidBy"] = "The payer must be a group member."

    participant_ids = _member_ids(data, "participantIds")
    if partial and "participantIds" not in data:
        participant_ids = None
    if participant_ids is None:
        if not partial:
            fields["participantIds"] = "Select at least one participant."
    else:
        if len(participant_ids) == 0:
            fields["participantIds"] = "Select at least one participant."
        for member_id in participant_ids:
            if member_id not in member_ids:
                fields["participantIds"] = "All participants must be group members."
                break

    if fields:
        raise validation_error(fields)

    return {
        "description": description,
        "amount": amount,
        "date": date,
        "paidBy": paid_by,
        "participantIds": participant_ids,
    }


def _public_expense(
    expense: dict[str, Any],
    obligations: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    public: dict[str, Any] = {
        "id": expense["id"],
        "groupId": expense["groupId"],
        "description": expense["description"],
        "amount": expense["amount"],
        "date": expense["date"],
        "paidBy": expense["paidBy"],
        "participantIds": list(expense["participantIds"]),
        "createdBy": expense["createdBy"],
        "createdAt": expense["createdAt"],
        "locked": bool(expense.get("locked", False)),
    }
    if obligations is not None:
        public["obligations"] = [
            {
                "id": obligation["id"],
                "expenseId": obligation["expenseId"],
                "debtorId": obligation["debtorId"],
                "creditorId": obligation["creditorId"],
                "amount": obligation["amount"],
                "status": obligation["status"],
                "createdAt": obligation["createdAt"],
            }
            for obligation in obligations
        ]
    return public


@expenses_bp.post("/<group_id>/expenses")
@login_required
def create_expense(group_id: str):
    """UC-09: Record a shared expense."""
    user = g.current_user
    group, member_ids = _validate_membership(group_id, user["id"])

    data = _json_object()
    values = _validate_expense_input(data, member_ids, partial=False)

    now = datetime.now(timezone.utc)
    created_at = now.isoformat()
    expense_id = f"exp_{secrets.token_hex(8)}"

    expense = {
        "id": expense_id,
        "groupId": group_id,
        "description": values["description"],
        "amount": int(values["amount"]),
        "date": values["date"],
        "paidBy": values["paidBy"],
        "participantIds": list(values["participantIds"]),
        "createdBy": user["id"],
        "createdAt": created_at,
        "locked": False,
    }

    shares = _split_shares(expense["amount"], list(expense["participantIds"]))
    obligations = _build_obligations(expense, shares, created_at)

    get_expense_store().create_expense(expense, obligations)

    return jsonify(expense=_public_expense(expense, obligations)), 201


@expenses_bp.get("/<group_id>/expenses")
@login_required
def list_expenses(group_id: str):
    """List a group's expenses (supports UC-09 / UC-10 reading)."""
    user = g.current_user
    _validate_membership(group_id, user["id"])

    expenses = get_expense_store().list_expenses(group_id)
    return jsonify(expenses=[_public_expense(expense) for expense in expenses])


@expenses_bp.get("/<group_id>/expenses/<expense_id>")
@login_required
def get_expense(group_id: str, expense_id: str):
    """UC-10: View expense details."""
    user = g.current_user
    _validate_membership(group_id, user["id"])

    expense = get_expense_store().find_expense(expense_id)
    if expense is None or expense["groupId"] != group_id:
        raise ApiError(404, "Expense not found.", "not_found")

    obligations = get_expense_store().list_obligations_for_expense(expense_id)
    return jsonify(expense=_public_expense(expense, obligations))


@expenses_bp.put("/<group_id>/expenses/<expense_id>")
@login_required
def update_expense(group_id: str, expense_id: str):
    """UC-11: Edit an expense."""
    user = g.current_user
    group, member_ids = _validate_membership(group_id, user["id"])

    expense = get_expense_store().find_expense(expense_id)
    if expense is None or expense["groupId"] != group_id:
        raise ApiError(404, "Expense not found.", "not_found")

    if expense["createdBy"] != user["id"]:
        raise ApiError(403, "Only the expense creator can edit it.", "forbidden")
    if expense.get("locked"):
        raise ApiError(409, "This expense is locked and cannot be edited.", "conflict")

    data = _json_object()

    values = _validate_expense_input(data, member_ids, partial=True)

    changes: dict[str, Any] = {}
    if "description" in data:
        changes["description"] = values["description"]
    if "amount" in data:
        changes["amount"] = int(values["amount"])
    if "date" in data:
        changes["date"] = values["date"]
    if "paidBy" in data:
        changes["paidBy"] = values["paidBy"]
    if "participantIds" in data:
        changes["participantIds"] = list(values["participantIds"])

    updated = get_expense_store().update_expense(expense_id, changes)
    obligations = get_expense_store().list_obligations_for_expense(expense_id)
    return jsonify(expense=_public_expense(updated, obligations))


@expenses_bp.delete("/<group_id>/expenses/<expense_id>")
@login_required
def delete_expense(group_id: str, expense_id: str):
    """UC-11: Delete an expense."""
    user = g.current_user
    _validate_membership(group_id, user["id"])

    expense = get_expense_store().find_expense(expense_id)
    if expense is None or expense["groupId"] != group_id:
        raise ApiError(404, "Expense not found.", "not_found")

    if expense["createdBy"] != user["id"]:
        raise ApiError(403, "Only the expense creator can delete it.", "forbidden")
    if expense.get("locked"):
        raise ApiError(409, "This expense is locked and cannot be deleted.", "conflict")

    get_expense_store().delete_expense(expense_id)
    return "", 204

