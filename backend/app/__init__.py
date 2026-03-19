from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///eventra.db"
    app.config["SECRET_KEY"] = "dev-secret-key"
    
    db.init_app(app)
    
    @app.route("/")
    def index():
        return {"message": "Eventra API is running 🎉"}
    
    return app
