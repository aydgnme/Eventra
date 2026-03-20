import os

import requests
from flask import Flask, jsonify, request, Response

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:5001")
EVENT_SERVICE_URL = os.getenv("EVENT_SERVICE_URL", "http://localhost:5002")
REGISTRATION_SERVICE_URL = os.getenv("REGISTRATION_SERVICE_URL", "http://localhost:5003")
ADMIN_SERVICE_URL = os.getenv("ADMIN_SERVICE_URL", "http://localhost:5004")

ROUTES = {
    "/auth": AUTH_SERVICE_URL,
    "/events": EVENT_SERVICE_URL,
    "/registrations": REGISTRATION_SERVICE_URL,
    "/admin": ADMIN_SERVICE_URL,
}

FORWARDED_HEADERS = {"Content-Type", "Authorization", "Accept", "X-Request-ID"}


def _proxy(target_url: str) -> Response:
    headers = {
        k: v for k, v in request.headers if k in FORWARDED_HEADERS
    }
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
        return Response(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "application/json"),
        )
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Service unavailable"}), 503
    except requests.exceptions.Timeout:
        return jsonify({"error": "Service timed out"}), 504


def create_app():
    app = Flask(__name__)

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "gateway"}

    for prefix, base_url in ROUTES.items():
        _register_proxy(app, prefix, base_url)

    return app


def _register_proxy(app: Flask, prefix: str, base_url: str) -> None:
    rule = f"{prefix}/<path:subpath>"
    endpoint = f"proxy_{prefix.lstrip('/')}"

    def handler(subpath, _base=base_url, _prefix=prefix):
        target = f"{_base}{_prefix}/{subpath}"
        return _proxy(target)

    handler.__name__ = endpoint
    app.add_url_rule(rule, endpoint=endpoint, view_func=handler, methods=["GET", "POST", "PUT", "DELETE", "PATCH"])

    # root of prefix (e.g. POST /events/)
    root_endpoint = f"proxy_{prefix.lstrip('/')}_root"

    def root_handler(_base=base_url, _prefix=prefix):
        target = f"{_base}{_prefix}/"
        return _proxy(target)

    root_handler.__name__ = root_endpoint
    app.add_url_rule(f"{prefix}/", endpoint=root_endpoint, view_func=root_handler, methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
