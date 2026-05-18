import os
from sqlalchemy.engine import URL


def database_url(env_name, default):
    if os.getenv(env_name):
        return os.environ[env_name]

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

    # Admin service's own DB (for event review records)
    SQLALCHEMY_DATABASE_URI = database_url("DATABASE_URL", "sqlite:///admin.db")

    # Direct connections to other services' databases
    SQLALCHEMY_BINDS = {
        "auth": database_url("AUTH_DATABASE_URL", "sqlite:///../auth-service/instance/auth.db"),
        "event": database_url("EVENT_DATABASE_URL", "sqlite:///../event-service/instance/event.db"),
        "registration": database_url(
            "REGISTRATION_DATABASE_URL",
            "sqlite:///../registration-service/instance/registration.db",
        ),
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    MAIL_FROM = os.getenv("MAIL_FROM", "Eventra <noreply@eventra.app>")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
