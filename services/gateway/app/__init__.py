import os

import jwt as pyjwt
import requests
from flask import Flask, Response, g, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter

from config import config as config_map

# Routes that do not require a JWT token
PUBLIC_ROUTES = {
    ("POST", "/auth/register"),
    ("POST", "/auth/login"),
    ("GET", "/health"),
}

# Prefixes where only admin role is allowed (after JWT verification)
ADMIN_ONLY_PREFIXES = ["/admin"]

FORWARDED_HEADERS = {"Content-Type", "Authorization", "Accept", "X-Request-ID"}


def _get_real_ip() -> str:
    """Return the real client IP, preferring Cloudflare's CF-Connecting-IP header."""
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr


# storage_uri and default_limits are read from Flask app config
# (RATELIMIT_STORAGE_URI, RATELIMIT_DEFAULT) when limiter.init_app(app) is called
limiter = Limiter(key_func=_get_real_ip)


def _is_public() -> bool:
    if (request.method, request.path) in PUBLIC_ROUTES:
        return True
    # Read-only event listing and detail are public
    if request.method == "GET" and request.path.startswith("/events/"):
        return True
    # Google OAuth flow: no JWT at this point, browser-driven redirect
    if request.method == "GET" and request.path.startswith("/auth/oauth/"):
        return True
    return False


def _proxy(target_url: str) -> Response:
    headers = {k: v for k, v in request.headers if k in FORWARDED_HEADERS}

    # Pass verified user context to downstream services
    if hasattr(g, "user_id"):
        headers["X-User-ID"] = str(g.user_id)
    if hasattr(g, "user_role"):
        headers["X-User-Role"] = g.user_role

    try:
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            params=request.args,
            timeout=10,
            allow_redirects=False,
        )
        response = Response(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "application/json"),
        )
        if "Location" in resp.headers:
            response.headers["Location"] = resp.headers["Location"]
        return response
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Service unavailable"}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "Service timed out"}), 504


def create_app(config_name: str = None) -> Flask:
    env = config_name or os.getenv("FLASK_ENV", "development")
    cfg = config_map.get(env, config_map["default"])

    app = Flask(__name__)
    app.config.from_object(cfg)

    CORS(app, origins=cfg.CORS_ORIGINS)
    limiter.init_app(app)

    jwt_secret = app.config["JWT_SECRET_KEY"]
    auth_url = app.config["AUTH_SERVICE_URL"]

    routes = {
        "/auth": auth_url,
        "/events": app.config["EVENT_SERVICE_URL"],
        "/registrations": app.config["REGISTRATION_SERVICE_URL"],
        "/feedback": app.config["REGISTRATION_SERVICE_URL"],
        "/admin": app.config["ADMIN_SERVICE_URL"],
    }

    @app.before_request
    def enforce_cloudflare():
        """In production, block requests that didn't pass through Cloudflare."""
        if request.path == "/health":
            return
        if app.config.get("CLOUDFLARE_ONLY") and not request.headers.get("CF-Ray"):
            return jsonify({"error": "Direct access not allowed"}), 403

    @app.before_request
    def authenticate():
        if _is_public():
            return

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization required"}), 401

        token = auth_header[7:]
        try:
            payload = pyjwt.decode(token, jwt_secret, algorithms=["HS256"])
            g.user_id = payload.get("sub")
            g.user_role = payload.get("role")
        except pyjwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except pyjwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        # Admin-only prefix guard
        if any(request.path.startswith(p) for p in ADMIN_ONLY_PREFIXES):
            if g.user_role != "admin":
                return jsonify({"error": "Admin access required"}), 403

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "gateway"})

    # Auth endpoints with stricter rate limits (registered before the catch-all proxy)
    @app.route("/auth/login", methods=["POST"])
    @limiter.limit(cfg.RATELIMIT_AUTH_LOGIN)
    def auth_login():
        return _proxy(f"{auth_url}/auth/login")

    @app.route("/auth/register", methods=["POST"])
    @limiter.limit(cfg.RATELIMIT_AUTH_REGISTER)
    def auth_register():
        return _proxy(f"{auth_url}/auth/register")

    for prefix, base_url in routes.items():
        _register_proxy(app, prefix, base_url)

    return app


def _register_proxy(app: Flask, prefix: str, base_url: str) -> None:
    endpoint = f"proxy_{prefix.lstrip('/')}"

    def handler(subpath, _base=base_url, _prefix=prefix):
        return _proxy(f"{_base}{_prefix}/{subpath}")

    handler.__name__ = endpoint
    app.add_url_rule(
        f"{prefix}/<path:subpath>",
        endpoint=endpoint,
        view_func=handler,
        methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    )

    root_endpoint = f"proxy_{prefix.lstrip('/')}_root"

    def root_handler(_base=base_url, _prefix=prefix):
        return _proxy(f"{_base}{_prefix}/")

    root_handler.__name__ = root_endpoint
    app.add_url_rule(
        f"{prefix}/",
        endpoint=root_endpoint,
        view_func=root_handler,
        methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    )
