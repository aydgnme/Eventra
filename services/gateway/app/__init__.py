import os
import re
import uuid

import requests
from flask import Flask, Response, g, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter

from config import config as config_map

# Routes that do not require a JWT token
PUBLIC_ROUTES = {
    ("POST", "/auth/register"),
    ("POST", "/auth/login"),
    ("POST", "/auth/google"),
    ("POST", "/auth/forgot-password"),
    ("POST", "/auth/reset-password"),
    ("GET", "/auth/google/client-id"),
    ("GET", "/health"),
    ("GET", "/health/services"),
}

# Prefixes where only admin role is allowed (after JWT verification)
ADMIN_ONLY_PREFIXES = ["/admin"]

# Role-restricted routes — gateway enforces these as defense in depth.
# Each downstream service also checks roles independently.
ROLE_RULES = [
    ("POST",   re.compile(r"^/events/?$"),                       {"organizer"}),
    ("PUT",    re.compile(r"^/events/\d+$"),                     {"organizer"}),
    ("GET",    re.compile(r"^/events/mine$"),                    {"organizer"}),
    ("POST",   re.compile(r"^/events/\d+/submit$"),              {"organizer"}),
    ("POST",   re.compile(r"^/events/\d+/materials/?$"),         {"organizer"}),
    ("POST",   re.compile(r"^/events/\d+/sponsors/?$"),          {"organizer"}),
    ("DELETE", re.compile(r"^/events/\d+$"),                     {"organizer", "admin"}),
    ("POST",   re.compile(r"^/events/\d+/cancel$"),              {"organizer", "admin"}),
    ("GET",    re.compile(r"^/registrations/\d+/participants"),   {"organizer", "admin"}),
    ("POST",   re.compile(r"^/registrations/\d+/checkin/\d+$"),  {"organizer", "admin"}),
    ("POST",   re.compile(r"^/registrations/\d+/reject/\d+$"),  {"organizer", "admin"}),
]

FORWARDED_HEADERS = {"Content-Type", "Authorization", "Accept", "X-Request-ID"}

# Response headers to pass back from downstream services
PASSTHROUGH_RESPONSE_HEADERS = {"Content-Disposition"}


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
    # Event listing: GET /events or GET /events/
    if request.method == "GET" and request.path.rstrip("/") == "/events":
        return True
    # Event detail & sub-resources: GET /events/<numeric_id>/...
    # Excludes named routes like /events/mine which require auth
    if request.method == "GET" and request.path.startswith("/events/"):
        parts = request.path.split("/")
        if len(parts) >= 3 and parts[2].isdigit():
            return True
    # Registration counts — public (no personal data, needed for event listing/detail)
    if request.method == "GET" and request.path == "/registrations/counts":
        return True
    if request.method == "GET" and request.path.startswith("/registrations/event/") and request.path.endswith("/count"):
        return True
    # Google OAuth flow: no JWT at this point, browser-driven redirect
    if request.method == "GET" and request.path.startswith("/auth/oauth/"):
        return True
    return False


def _check_role_restriction():
    """Check if the current request requires a specific role.
    Returns an error response tuple if forbidden, or None if allowed."""
    for method, pattern, allowed_roles in ROLE_RULES:
        if request.method == method and pattern.match(request.path):
            if g.user_role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
    return None


def _proxy(target_url: str) -> Response:
    headers = {k: v for k, v in request.headers if k in FORWARDED_HEADERS}

    # Generate or forward X-Request-ID for tracing
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    headers["X-Request-ID"] = request_id

    # Forward client IP
    headers["X-Forwarded-For"] = _get_real_ip()

    # Pass verified user context to downstream services
    if hasattr(g, "user_id"):
        headers["X-User-ID"] = str(g.user_id)
    if hasattr(g, "user_role"):
        headers["X-User-Role"] = g.user_role
    if hasattr(g, "user_email"):
        headers["X-User-Email"] = g.user_email

    try:
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            params=request.args,
            timeout=30,
            allow_redirects=False,
        )
        response = Response(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "application/json"),
        )
        # Forward specific response headers (e.g. Content-Disposition for CSV exports)
        for h in PASSTHROUGH_RESPONSE_HEADERS:
            if h in resp.headers:
                response.headers[h] = resp.headers[h]
        if "Location" in resp.headers:
            response.headers["Location"] = resp.headers["Location"]
        return response
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Service unavailable", "status": 502}), 502
    except requests.exceptions.Timeout:
        return jsonify({"error": "Service timed out", "status": 504}), 504


def create_app(config_name: str = None) -> Flask:
    env = config_name or os.getenv("FLASK_ENV", "development")
    cfg = config_map.get(env, config_map["default"])

    app = Flask(__name__)
    app.config.from_object(cfg)

    CORS(
        app,
        origins=cfg.CORS_ORIGINS,
        max_age=3600,
    )
    limiter.init_app(app)

    auth_url = app.config["AUTH_SERVICE_URL"]

    routes = {
        "/auth": auth_url,
        "/events": app.config["EVENT_SERVICE_URL"],
        "/notifications": app.config["EVENT_SERVICE_URL"],
        "/registrations": app.config["REGISTRATION_SERVICE_URL"],
        "/feedback": app.config["REGISTRATION_SERVICE_URL"],
        "/admin": app.config["ADMIN_SERVICE_URL"],
    }

    @app.before_request
    def enforce_cloudflare():
        """In production, block requests that didn't pass through Cloudflare."""
        if request.path in ("/health", "/health/services"):
            return
        if app.config.get("CLOUDFLARE_ONLY") and not request.headers.get("CF-Ray"):
            return jsonify({"error": "Direct access not allowed"}), 403

    @app.before_request
    def authenticate():
        if _is_public():
            return

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing authorization token"}), 401

        token = auth_header[7:]

        # Verify token with Auth Service
        try:
            resp = requests.post(
                f"{auth_url}/auth/verify",
                json={"token": token},
                timeout=5,
            )
            data = resp.json()

            if not data.get("valid"):
                return jsonify({"error": "Invalid or expired token"}), 401

            g.user_id = data.get("user_id")
            g.user_role = data.get("role")
            g.user_email = data.get("email", "")
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401

        # Admin-only prefix guard
        if any(request.path.startswith(p) for p in ADMIN_ONLY_PREFIXES):
            if g.user_role != "admin":
                return jsonify({"error": "Insufficient permissions"}), 403

        # Role-restricted route check
        role_error = _check_role_restriction()
        if role_error:
            return role_error

    @app.route("/health")
    def health():
        return jsonify({
            "status": "ok",
            "service": "gateway",
            "version": "1.0",
        })

    @app.route("/health/services")
    def health_services():
        service_urls = {
            "auth-service": app.config["AUTH_SERVICE_URL"],
            "event-service": app.config["EVENT_SERVICE_URL"],
            "registration-service": app.config["REGISTRATION_SERVICE_URL"],
            "admin-service": app.config["ADMIN_SERVICE_URL"],
        }
        result = {"gateway": "ok"}
        for name, url in service_urls.items():
            try:
                resp = requests.get(f"{url}/health", timeout=5)
                if resp.ok:
                    result[name] = "ok"
                else:
                    result[name] = "error"
            except Exception:
                result[name] = "error"
        return jsonify(result)

    # Auth endpoints with stricter rate limits (registered before the catch-all proxy)
    @app.route("/auth/login", methods=["POST"])
    @limiter.limit(cfg.RATELIMIT_AUTH_LOGIN)
    def auth_login():
        return _proxy(f"{auth_url}/auth/login")

    @app.route("/auth/register", methods=["POST"])
    @limiter.limit(cfg.RATELIMIT_AUTH_REGISTER)
    def auth_register():
        return _proxy(f"{auth_url}/auth/register")

    @app.route("/auth/forgot-password", methods=["POST"])
    @limiter.limit(cfg.RATELIMIT_AUTH_LOGIN)
    def auth_forgot_password():
        return _proxy(f"{auth_url}/auth/forgot-password")

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
