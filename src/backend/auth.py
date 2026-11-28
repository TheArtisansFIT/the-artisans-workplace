"""Registration, sign-in, sign-out and session endpoints (UC-01, UC-02, UC-03)."""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, TypeVar

from flask import Blueprint, Flask, current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash

from .errors import ApiError, validation_error
from database.connection import db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

users = db["users"]

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

F = TypeVar("F", bound=Callable[..., Any])


def _serializer(app: Flask | None = None) -> URLSafeTimedSerializer:
    flask_app = app or current_app
    return URLSafeTimedSerializer(
        flask_app.config["SECRET_KEY"],
        salt="splitnest-session"
    )


def issue_token(app: Flask, user: dict[str, Any]) -> str:
    return _serializer(app).dumps({
        "uid": user["_id"]
    })


def _json_object() -> dict[str, Any]:
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise ApiError(
            400,
            "Send a JSON object in the request body.",
            "invalid_request"
        )

    return data


def _text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    return value.strip() if isinstance(value, str) else ""


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    bank_details = None

    if user.get("bank_name") or user.get("account_number") or user.get("account_holder"):
        bank_details = {
            "bankName": user.get("bank_name"),
            "accountNumber": user.get("account_number"),
            "accountHolder": user.get("account_holder")
        }

    created_at = user["created_at"]

    return {
        "id": user["_id"],
        "displayName": user["display_name"],
        "email": user["email"],
        "memberSince": created_at.date().isoformat(),
        "bankDetails": bank_details
    }


def get_current_user() -> dict[str, Any]:
    """Return the authenticated user, or raise a 401 API error."""

    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise ApiError(401, "Sign in to continue.", "unauthorized")

    try:
        payload = _serializer().loads(
            token,
            max_age=int(current_app.config["SESSION_MAX_AGE_SECONDS"])
        )
    except (BadSignature, SignatureExpired):
        raise ApiError(
            401,
            "Your session has expired. Please sign in again.",
            "unauthorized"
        )

    user_id = payload.get("uid")

    if not isinstance(user_id, str):
        raise ApiError(401, "Invalid session.", "unauthorized")

    user = users.find_one({"_id": user_id})

    if user is None:
        raise ApiError(
            401,
            "Your session has ended. Please sign in again.",
            "unauthorized"
        )

    g.current_user = user
    return user


def login_required(view: F) -> F:
    @wraps(view)
    def wrapped(*args: Any, **kwargs: Any):
        get_current_user()
        return view(*args, **kwargs)

    return wrapped  # type: ignore[return-value]


@auth_bp.post("/register")
def register():
    data = _json_object()

    display_name = _text(data, "displayName")
    email = _text(data, "email").lower()
    password = data.get("password") if isinstance(data.get("password"), str) else ""

    fields: dict[str, str] = {}

    if len(display_name) < 2:
        fields["displayName"] = "Enter a display name with at least 2 characters."
    elif len(display_name) > 80:
        fields["displayName"] = "Use 80 characters or fewer for the display name."

    if not email:
        fields["email"] = "Enter your email address."
    elif len(email) > 254 or not EMAIL_PATTERN.match(email):
        fields["email"] = "Enter a valid email address."

    if not password:
        fields["password"] = "Create a password."
    elif len(password) < 6:
        fields["password"] = "Use at least 6 characters."
    elif len(password) > 128:
        fields["password"] = "Use 128 characters or fewer."

    if fields:
        raise validation_error(fields)

    user = {
        "_id": f"usr_{secrets.token_hex(8)}",
        "display_name": display_name,
        "email": email,
        "hashed_password": generate_password_hash(password),
        "created_at": datetime.now(timezone.utc)
    }

    try:
        users.insert_one(user)
    except DuplicateKeyError:
        raise ApiError(
            409,
            "An account with this email already exists. Please sign in instead.",
            "email_taken",
            {"email": "This email is already registered."}
        )

    return jsonify(
        token=issue_token(current_app, user),
        user=public_user(user)
    ), 201


@auth_bp.post("/login")
def login():
    data = _json_object()

    email = (_text(data, "email") or _text(data, "identifier")).lower()
    password = data.get("password") if isinstance(data.get("password"), str) else ""

    fields: dict[str, str] = {}

    if not email:
        fields["email"] = "Enter your email address."
    elif not EMAIL_PATTERN.match(email):
        fields["email"] = "Enter a valid email address."

    if not password:
        fields["password"] = "Enter your password."

    if fields:
        raise validation_error(fields)

    user = users.find_one({"email": email})

    if user is None or not check_password_hash(
        user["hashed_password"],
        password
    ):
        raise ApiError(
            401,
            "Email or password is incorrect. Please try again.",
            "invalid_credentials"
        )

    return jsonify(
        token=issue_token(current_app, user),
        user=public_user(user)
    )


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(user=public_user(g.current_user))


@auth_bp.post("/logout")
@login_required
def logout():
    # Stateless token: the client must discard its token after logout.
    return jsonify(status="ok")
