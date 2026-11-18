from flask import Flask, Response, jsonify
from dotenv import load_dotenv

from database.connection import ping_server

load_dotenv()

def create_app() -> Flask:
    app = Flask(__name__)

    ping_server()

    @app.get("/health")
    def health() -> Response:
        return jsonify(status="ok")

    return app