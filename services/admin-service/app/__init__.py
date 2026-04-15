import os

from flask import Flask
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)
    jwt.init_app(app)

    from app.routes.users import users_bp
    from app.routes.events import events_bp
    from app.routes.reports import reports_bp

    app.register_blueprint(users_bp, url_prefix="/admin/users")
    app.register_blueprint(events_bp, url_prefix="/admin/events")
    app.register_blueprint(reports_bp, url_prefix="/admin/reports")

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "admin-service"}

    return app
