"""Profile and bank-details endpoints (UC-04 / FR-05, FR-06)."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, g, jsonify, request

from .auth import get_store, login_required, public_user
from .errors import ApiError, validation_error

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


def _json_object() -> dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "Send a JSON object in the request body.", "invalid_request")
    return data


def _text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    return value.strip() if isinstance(value, str) else ""


@users_bp.get("/me")
@login_required
def get_me():
    return jsonify(user=public_user(g.current_user))


@users_bp.route("/me/bank-details", methods=["PUT", "PATCH"])
@login_required
def save_bank_details():
    data = _json_object()
    bank_name = _text(data, "bankName")
    account_number = _text(data, "accountNumber")
    account_holder = _text(data, "accountHolder")

    fields: dict[str, str] = {}
    if not bank_name:
        fields["bankName"] = "Enter the bank name."
    elif len(bank_name) > 100:
        fields["bankName"] = "Use 100 characters or fewer."

    if not account_number:
        fields["accountNumber"] = "Enter the account number."
    elif len(account_number) < 4 or len(account_number) > 40:
        fields["accountNumber"] = "Use between 4 and 40 characters."

    if not account_holder:
        fields["accountHolder"] = "Enter the account holder name."
    elif len(account_holder) < 2 or len(account_holder) > 100:
        fields["accountHolder"] = "Use between 2 and 100 characters."

    if fields:
        raise validation_error(fields)

    changes = {
        "bankDetails": {
            "bankName": bank_name,
            "accountNumber": account_number,
            "accountHolder": account_holder,
        }
    }
    user = get_store().update_user(g.current_user["id"], changes)
    if user is None:
        raise ApiError(404, "Account not found.", "not_found")

    return jsonify(user=public_user(user))


@users_bp.delete("/me/bank-details")
@login_required
def remove_bank_details():
    user = get_store().update_user(g.current_user["id"], {"bankDetails": None})
    if user is None:
        raise ApiError(404, "Account not found.", "not_found")

    return jsonify(user=public_user(user))
