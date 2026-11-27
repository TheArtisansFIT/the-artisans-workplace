import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_PATH)

from flask import Flask, Response, jsonify, request
from pymongo.errors import PyMongoError
from werkzeug.exceptions import HTTPException

from .auth import auth_bp
from .errors import ApiError
from .expenses import expenses_bp
from .groups import groups_bp
from .store import build_expense_store, build_group_store, build_user_store
from .users import users_bp
from database.connection import db, ping_server


def _split_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "splitnest-local-development-secret"),
        SESSION_MAX_AGE_SECONDS=int(
            os.environ.get("SESSION_MAX_AGE_SECONDS", str(60 * 60 * 24 * 7))
        ),
        MONGO_URI=(
            os.environ.get("MONGODB_URI")
            or os.environ.get("MONGO_URI")
        ),
        MONGO_DB_NAME=os.environ.get("MONGO_DB_NAME", "splitnest"),
        GROUP_INVITATION_DURATION_DAYS=int(
            os.environ.get("GROUP_INVITATION_DURATION_DAYS", "7")
        ),
        GROUP_MAX_MEMBER=int(os.environ.get("GROUP_MAX_MEMBER", "50")),
        USER_STORE=os.environ.get("USER_STORE", "").strip().lower(),
        SEED_DEMO_USER=os.environ.get("SEED_DEMO_USER", "true").lower()
        in {"1", "true", "yes"},
        CORS_ORIGINS=_split_origins(
            os.environ.get(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        ),
    )
    if test_config:
        app.config.update(test_config)
    print("MONGO_URI loaded:", bool(app.config.get("MONGO_URI")))
    print("MONGO_DB_NAME:", app.config.get("MONGO_DB_NAME"))
    print("USER_STORE:", app.config.get("USER_STORE"))

    print("Actual database:", db.name)
    if app.config.get("MONGO_URI"):
        ping_server()
    store = build_user_store(app)
    app.extensions["user_store"] = store

    group_store = build_group_store(app)
    app.extensions["group_store"] = group_store

    expense_store = build_expense_store(app)
    app.extensions["expense_store"] = expense_store

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(groups_bp)
    app.register_blueprint(expenses_bp)

    @app.get("/health")
    def health() -> Response:
        store_type = "mongodb" if app.config.get("MONGO_URI") else "memory"
        return jsonify(status="ok", storage=store_type)

    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return error.to_response()

    @app.errorhandler(PyMongoError)
    def handle_database_error(error: PyMongoError):
        app.logger.exception("MongoDB request failed")
        return (
            jsonify(
                error={
                    "code": "database_unavailable",
                    "message": "The database is temporarily unavailable. Please try again.",
                }
            ),
            503,
        )

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        if request.path.startswith("/api/"):
            return (
                jsonify(
                    error={
                        "code": error.name.lower().replace(" ", "_"),
                        "message": error.description,
                    }
                ),
                error.code,
            )
        return error

    @app.after_request
    def add_cors_headers(response: Response) -> Response:
        origin = request.headers.get("Origin")
        if origin and origin in app.config["CORS_ORIGINS"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response.headers["Access-Control-Max-Age"] = "600"
        return response

    return app
