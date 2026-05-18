import os
from datetime import timedelta
from sqlalchemy.engine import URL


def database_url(default):
    if os.getenv("DATABASE_URL"):
        return os.environ["DATABASE_URL"]

    password = os.getenv("POSTGRES_PASSWORD")
    if not password:
        return default

    return URL.create(
        "postgresql",
        username=os.getenv("POSTGRES_USER", "eventra_user"),
        password=password,
        host=os.getenv("POSTGRES_HOST", "db"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=os.getenv("POSTGRES_DB", "eventra"),
    )


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    )
    SQLALCHEMY_DATABASE_URI = database_url("sqlite:///auth.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_CLIENT_ID = os.getenv("OAUTH_GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("OAUTH_GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI = os.getenv(
        "OAUTH_GOOGLE_REDIRECT_URI", "http://localhost:5051/auth/oauth/google/callback"
    )
    FRONTEND_URL = os.getenv("OAUTH_FRONTEND_URL", "http://localhost:5055")
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_MAIL_FROM = os.getenv("SMTP_MAIL_FROM", "mert@aydgn.me")
    FRONTEND_RESET_PASSWORD_URL = os.getenv(
        "FRONTEND_RESET_PASSWORD_URL", "http://localhost:5055/reset-password"
    )


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
