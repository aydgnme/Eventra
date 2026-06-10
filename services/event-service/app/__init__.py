from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    jwt.init_app(app)

    from app.models import event, material, sponsor, notification, event_review  # noqa: F401
    from app.routes.events import events_bp
    from app.routes.materials import materials_bp
    from app.routes.notifications import notifications_bp

    app.register_blueprint(events_bp, url_prefix='/events')
    app.register_blueprint(materials_bp, url_prefix='/events')
    app.register_blueprint(notifications_bp, url_prefix='/notifications')

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "event-service"}

    return app
