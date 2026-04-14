"""
Shared pytest fixtures for registration-service tests.

- In-memory SQLite database for isolation
- get_event is mocked — no real HTTP calls to event-service
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-32-bytes-long!!!"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32-bytes!!!!"
os.environ["EVENT_SERVICE_URL"] = "http://event-service-mock"

import pytest
from unittest.mock import patch
from flask_jwt_extended import create_access_token
from sqlalchemy.pool import StaticPool

from app import create_app, db as _db
from app.utils.event_client import EventNotFound, EventServiceUnavailable

TEST_CONFIG = {
    "TESTING": True,
    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    "SECRET_KEY": "test-secret-key-32-bytes-long!!!",
    "JWT_SECRET_KEY": "test-jwt-secret-key-32-bytes!!!!",
    "EVENT_SERVICE_URL": "http://event-service-mock",
    # StaticPool: all connections share the same in-memory DB
    "SQLALCHEMY_ENGINE_OPTIONS": {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    },
}

# ---------------------------------------------------------------------------
# Default mock event returned by get_event
# ---------------------------------------------------------------------------

BASE_EVENT = {
    "id": 1,
    "title": "Tech Talk 2026",
    "capacity": 10,
    "is_published": True,
}

UNLIMITED_EVENT = {**BASE_EVENT, "id": 2, "capacity": None}
FULL_EVENT = {**BASE_EVENT, "id": 3, "capacity": 1}


# ---------------------------------------------------------------------------
# App & DB fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def app():
    flask_app = create_app()
    flask_app.config.update(TEST_CONFIG)
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def mock_smtp(app):
    """Prevent real SMTP connections in all tests."""
    with patch("app.utils.email_client._send") as m:
        yield m


@pytest.fixture(autouse=True)
def clean_db(app):
    with app.app_context():
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
    yield
    with app.app_context():
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


# ---------------------------------------------------------------------------
# Mock for get_event — prevents real HTTP calls
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_event(app):
    """Patch get_event to return BASE_EVENT by default."""
    with patch("app.routes.registrations.get_event", return_value=BASE_EVENT) as m:
        yield m


@pytest.fixture
def mock_unlimited_event(app):
    with patch("app.routes.registrations.get_event", return_value=UNLIMITED_EVENT) as m:
        yield m


@pytest.fixture
def mock_event_not_found(app):
    with patch(
        "app.routes.registrations.get_event", side_effect=EventNotFound("not found")
    ) as m:
        yield m


@pytest.fixture
def mock_event_service_down(app):
    with patch(
        "app.routes.registrations.get_event",
        side_effect=EventServiceUnavailable("unavailable"),
    ) as m:
        yield m


# ---------------------------------------------------------------------------
# JWT token fixtures  (user_id=1, another=2, admin=99, organizer=10)
# ---------------------------------------------------------------------------

@pytest.fixture
def user_token(app):
    with app.app_context():
        return create_access_token(
            identity="1", additional_claims={"role": "student", "email": "user@test.com"}
        )


@pytest.fixture
def another_user_token(app):
    with app.app_context():
        return create_access_token(
            identity="2", additional_claims={"role": "student", "email": "another@test.com"}
        )


@pytest.fixture
def organizer_token(app):
    with app.app_context():
        return create_access_token(
            identity="10", additional_claims={"role": "organizer", "email": "organizer@test.com"}
        )


@pytest.fixture
def admin_token(app):
    with app.app_context():
        return create_access_token(
            identity="99", additional_claims={"role": "admin", "email": "admin@test.com"}
        )


@pytest.fixture
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def another_user_headers(another_user_token):
    return {"Authorization": f"Bearer {another_user_token}"}


@pytest.fixture
def organizer_headers(organizer_token):
    return {"Authorization": f"Bearer {organizer_token}"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------------------------------------------------------------------------
# Registration fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def registration(client, user_headers, mock_event):
    resp = client.post(
        "/registrations/",
        json={"event_id": BASE_EVENT["id"]},
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["registration"]
