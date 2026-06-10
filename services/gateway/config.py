import os


def _require_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


class Config:
    SECRET_KEY = _require_env("SECRET_KEY", None)
    AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:5001")
    EVENT_SERVICE_URL = os.getenv("EVENT_SERVICE_URL", "http://localhost:5002")
    REGISTRATION_SERVICE_URL = os.getenv("REGISTRATION_SERVICE_URL", "http://localhost:5003")
    ADMIN_SERVICE_URL = os.getenv("ADMIN_SERVICE_URL", "http://localhost:5004")
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:5055,https://eventra.usv.ro",
    ).split(",")

    # Rate limiting
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(16 * 1024 * 1024)))  # 16 MB
    RATELIMIT_DEFAULT = "100 per minute"
    RATELIMIT_AUTH_LOGIN = "20 per minute"
    RATELIMIT_AUTH_REGISTER = "20 per minute"

    # Cloudflare: in production only allow traffic that passed through CF
    CLOUDFLARE_ONLY = False


class DevelopmentConfig(Config):
    DEBUG = True
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-DO-NOT-USE-IN-PROD")


class ProductionConfig(Config):
    DEBUG = False
    CLOUDFLARE_ONLY = os.getenv("CLOUDFLARE_ONLY", "true").lower() == "true"
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "redis://localhost:6379/0")


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
