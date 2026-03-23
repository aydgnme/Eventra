import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from config import Config

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=["http://localhost:5173", "http://localhost:5055"])

    from app.routes.auth import auth_bp
    from app.routes.oauth import oauth_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(oauth_bp, url_prefix='/auth/oauth')

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "auth-service"}

    return app