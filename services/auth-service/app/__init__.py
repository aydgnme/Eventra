import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

from config import Config

db = SQLAlchemy()
jwt = JWTManager()

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    jwt.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.oauth import oauth_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(oauth_bp, url_prefix='/auth/oauth')

    @app.route("/health")
    def health():
        db_status = "connected"
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            db_status = "disconnected"

        return {
            "status": "ok",
            "service": "auth-service",
            "version": "1.0",
            "database": db_status,
        }

    return app
