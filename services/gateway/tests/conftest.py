"""
Shared pytest fixtures for gateway tests.

- JWT verification is delegated to auth-service POST /auth/verify (mocked here)
- All downstream service calls are mocked via unittest.mock
"""
import os

os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
os.environ["AUTH_SERVICE_URL"] = "http://auth-mock:5001"
os.environ["EVENT_SERVICE_URL"] = "http://event-mock:5002"
os.environ["REGISTRATION_SERVICE_URL"] = "http://reg-mock:5003"
os.environ["ADMIN_SERVICE_URL"] = "http://admin-mock:5004"

from unittest.mock import MagicMock, patch

import pytest

from app import create_app


@pytest.fixture(scope="session")
def app():
    flask_app = create_app("development")
    flask_app.config["TESTING"] = True
    yield flask_app


@pytest.fixture
def client(app):
    return app.test_client()


# ---------------------------------------------------------------------------
# Auth-service /auth/verify mock
# ---------------------------------------------------------------------------

def _make_verify_response(valid, user_id=None, role=None, email=""):
    """Create a mock response for POST /auth/verify."""
    if valid:
        return MagicMock(
            status_code=200,
            json=lambda: {
                "valid": True,
                "user_id": user_id,
                "role": role,
                "email": email,
            },
        )
    return MagicMock(
        status_code=401,
        json=lambda: {"valid": False, "error": "Token has expired"},
    )


_TOKEN_MAP = {
    "student-token": _make_verify_response(True, 1, "student", "student@test.com"),
    "organizer-token": _make_verify_response(True, 10, "organizer", "organizer@test.com"),
    "admin-token": _make_verify_response(True, 99, "admin", "admin@test.com"),
}

_INVALID_RESPONSE = _make_verify_response(False)


@pytest.fixture(autouse=True)
def mock_auth_verify():
    """Auto-mock auth-service /auth/verify for every test.

    Known tokens:
      - "student-token"   → role=student,   user_id=1
      - "organizer-token" → role=organizer, user_id=10
      - "admin-token"     → role=admin,     user_id=99

    Any other token returns {"valid": false}.
    """

    def _side_effect(url, **kwargs):
        if "/auth/verify" in url:
            token = kwargs.get("json", {}).get("token", "")
            return _TOKEN_MAP.get(token, _INVALID_RESPONSE)
        return MagicMock(
            status_code=200,
            content=b"{}",
            headers={"Content-Type": "application/json"},
        )

    with patch("app.requests.post", side_effect=_side_effect):
        yield


# ---------------------------------------------------------------------------
# Convenience header fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def student_headers():
    return {"Authorization": "Bearer student-token"}


@pytest.fixture
def organizer_headers():
    return {"Authorization": "Bearer organizer-token"}


@pytest.fixture
def admin_headers():
    return {"Authorization": "Bearer admin-token"}
