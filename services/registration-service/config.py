import os
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


def _require_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


class Config:
    SECRET_KEY = _require_env("SECRET_KEY", None)
    JWT_SECRET_KEY = _require_env("JWT_SECRET_KEY", None)
    SQLALCHEMY_DATABASE_URI = database_url("sqlite:///registration.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    EVENT_SERVICE_URL = os.getenv("EVENT_SERVICE_URL", "http://localhost:5002")
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    MAIL_FROM = os.getenv("MAIL_FROM", "Eventra <noreply@eventra.app>")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class DevelopmentConfig(Config):
    DEBUG = True
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-DO-NOT-USE-IN-PROD")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-DO-NOT-USE-IN-PROD")


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
