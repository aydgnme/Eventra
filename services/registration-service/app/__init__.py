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

    from app.routes.registrations import registrations_bp

    app.register_blueprint(registrations_bp, url_prefix='/registrations')

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "registration-service"}

    return app
