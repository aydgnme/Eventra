from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    jwt.init_app(app)

    from app.models import event, material, sponsor, notification  # noqa: F401
    from app.routes.events import events_bp

    app.register_blueprint(events_bp, url_prefix='/events')

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "event-service"}

    return app
