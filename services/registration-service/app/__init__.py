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

    from app.routes.registrations import registrations_bp
    from app.routes.feedback import feedback_bp

    app.register_blueprint(registrations_bp, url_prefix='/registrations')
    app.register_blueprint(feedback_bp, url_prefix='/feedback')

    @app.route("/health")
    def health():
        db_status = "connected"
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            db_status = "disconnected"
        return {
            "status": "ok",
            "service": "registration-service",
            "version": "1.0",
            "database": db_status,
        }

    from app.scheduler import start_scheduler
    start_scheduler(app)

    return app
