import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")

    # Admin service's own DB (for event review records)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///admin.db")

    # Direct connections to other services' databases
    SQLALCHEMY_BINDS = {
        "auth": os.getenv("AUTH_DATABASE_URL", "sqlite:///../auth-service/instance/auth.db"),
        "event": os.getenv("EVENT_DATABASE_URL", "sqlite:///../event-service/instance/event.db"),
        "registration": os.getenv(
            "REGISTRATION_DATABASE_URL",
            "sqlite:///../registration-service/instance/registration.db",
        ),
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
