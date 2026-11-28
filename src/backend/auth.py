"""Registration, sign-in, sign-out and session endpoints (UC-01, UC-02, UC-03)."""

from __future__ import annotations

import re
import secrets
from datetime import date
from functools import wraps
from typing import Any, Callable, TypeVar

from flask import Blueprint, Flask, current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from .errors import ApiError, validation_error
from .store import DuplicateEmailError, UserStore

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
DEMO_EMAIL = "minh.le@example.com"
DEMO_PASSWORD = "password123"

F = TypeVar("F", bound=Callable[..., Any])


def get_store() -> UserStore:
    return current_app.extensions["user_store"]


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "displayName": user["displayName"],
        "email": user["email"],
        "memberSince": user["memberSince"],
        "bankDetails": user.get("bankDetails"),
    }


def _serializer(app: Flask | None = None) -> URLSafeTimedSerializer:
    flask_app = app or current_app
    return URLSafeTimedSerializer(flask_app.config["SECRET_KEY"], salt="splitnest-session")


def issue_token(app: Flask, user: dict[str, Any]) -> str:
    return _serializer(app).dumps(
        {"uid": user["id"], "sv": int(user.get("sessionVersion", 0))}
    )


def _json_object() -> dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "Send a JSON object in the request body.", "invalid_request")
    return data


def _text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    return value.strip() if isinstance(value, str) else ""


def get_current_user() -> dict[str, Any]:
    """Return the authenticated user, or raise a 401 API error."""

    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise ApiError(401, "Sign in to continue.", "unauthorized")

    try:
        payload = _serializer().loads(
            token,
            max_age=int(current_app.config["SESSION_MAX_AGE_SECONDS"]),
        )
    except (BadSignature, SignatureExpired):
        raise ApiError(401, "Your session has expired. Please sign in again.", "unauthorized")

    user = get_store().find_by_id(str(payload.get("uid", "")))
    if user is None or int(user.get("sessionVersion", 0)) != int(payload.get("sv", -1)):
        raise ApiError(401, "Your session has ended. Please sign in again.", "unauthorized")

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
        fields["email"] = "Enter a valid email address, for example minh@example.com."

    if not password:
        fields["password"] = "Create a password."
    elif len(password) < 6:
        fields["password"] = "Use at least 6 characters."
    elif len(password) > 128:
        fields["password"] = "Use 128 characters or fewer."

    if fields:
        raise validation_error(fields)

    user = {
        "id": f"usr_{secrets.token_hex(8)}",
        "displayName": display_name,
        "email": email,
        "passwordHash": generate_password_hash(password),
        "memberSince": date.today().isoformat(),
        "bankDetails": None,
        "sessionVersion": 0,
    }

    try:
        stored = get_store().create_user(user)
    except DuplicateEmailError:
        raise ApiError(
            409,
            "An account with this email already exists. Please sign in instead.",
            "email_taken",
            {"email": "This email is already registered."},
        )

    return (
        jsonify(token=issue_token(current_app, stored), user=public_user(stored)),
        201,
    )


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

    user = get_store().find_by_email(email)
    if user is None or not check_password_hash(user["passwordHash"], password):
        raise ApiError(
            401,
            "Email or password is incorrect. Please try again.",
            "invalid_credentials",
        )

    return jsonify(token=issue_token(current_app, user), user=public_user(user))


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(user=public_user(g.current_user))


@auth_bp.post("/logout")
@login_required
def logout():
    user = g.current_user
    get_store().update_user(
        user["id"],
        {"sessionVersion": int(user.get("sessionVersion", 0)) + 1},
    )
    return jsonify(status="ok")


def seed_demo_user(store: UserStore) -> None:
    """Create the sample account used by the frontend when the store is empty."""

    if store.find_by_email(DEMO_EMAIL) is not None:
        return
    store.create_user(
        {
            "id": "minh",
            "displayName": "Minh",
            "email": DEMO_EMAIL,
            "passwordHash": generate_password_hash(DEMO_PASSWORD),
            "memberSince": "2026-10-20",
            "bankDetails": {
                "bankName": "Vietcombank",
                "accountNumber": "0123456789",
                "accountHolder": "LE QUANG MINH",
            },
            "sessionVersion": 0,
        }
    )
