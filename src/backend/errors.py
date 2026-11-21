"""API error types and helpers shared by the backend blueprints."""

from __future__ import annotations

from typing import Any

from flask import jsonify


class ApiError(Exception):
    """An error that can be rendered as a consistent JSON response."""

    def __init__(
        self,
        status_code: int,
        message: str,
        code: str = "api_error",
        fields: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.code = code
        self.fields = fields or {}

    def to_response(self) -> tuple[Any, int]:
        error: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.fields:
            error["fields"] = self.fields
        return jsonify(error=error), self.status_code


def validation_error(
    fields: dict[str, str],
    message: str = "Please correct the highlighted fields.",
) -> ApiError:
    return ApiError(400, message, "validation_error", fields)
