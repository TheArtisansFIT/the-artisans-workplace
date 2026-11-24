import os

from flask import Flask, Response, jsonify, request
from pymongo.errors import PyMongoError
from werkzeug.exceptions import HTTPException

from .auth import auth_bp, seed_demo_user
from .errors import ApiError
from .store import build_user_store
from .users import users_bp


def _split_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "splitnest-local-development-secret"),
        SESSION_MAX_AGE_SECONDS=int(
            os.environ.get("SESSION_MAX_AGE_SECONDS", str(60 * 60 * 24 * 7))
        ),
        MONGO_URI=os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI"),
        MONGO_DB_NAME=os.environ.get("MONGO_DB_NAME", "splitnest"),
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

    store = build_user_store(app)
    app.extensions["user_store"] = store
    if app.config.get("SEED_DEMO_USER"):
        seed_demo_user(store)

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)

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
