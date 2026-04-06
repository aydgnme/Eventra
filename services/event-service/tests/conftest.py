"""
Shared pytest fixtures for event-service tests.

Uses an in-memory SQLite database so tests are isolated and fast.
"""
import os
from datetime import datetime, timedelta, timezone

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-32-bytes-long!!!"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32-bytes!!!!"

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app import db as _db

TEST_CONFIG = {
    "TESTING": True,
    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    "SECRET_KEY": "test-secret-key-32-bytes-long!!!",
    "JWT_SECRET_KEY": "test-jwt-secret-key-32-bytes!!!!",
}

# ---------------------------------------------------------------------------
# Shared datetime helpers
# ---------------------------------------------------------------------------

def future_dt(days=10, hours=0):
    dt = datetime.now(timezone.utc) + timedelta(days=days, hours=hours)
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


FUTURE_START = future_dt(days=10)
FUTURE_END = future_dt(days=10, hours=3)

BASE_EVENT = {
    "title": "Tech Talk 2026",
    "start_datetime": FUTURE_START,
    "end_datetime": FUTURE_END,
    "description": "An annual technology conference at USV.",
    "location": "USV Campus",
    "category": "academic",
    "participation_mode": "physical",
    "capacity": 100,
    "is_published": True,
}


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
def clean_db(app):
    yield
    with app.app_context():
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


# ---------------------------------------------------------------------------
# Token / header fixtures  (organizer_id=1, another=2, admin=99, student=10)
# ---------------------------------------------------------------------------

@pytest.fixture
def organizer_token(app):
    with app.app_context():
        return create_access_token(
            identity="1",
            additional_claims={"role": "organizer", "email": "organizer@example.com"},
        )


@pytest.fixture
def another_organizer_token(app):
    with app.app_context():
        return create_access_token(
            identity="2",
            additional_claims={"role": "organizer", "email": "org2@example.com"},
        )


@pytest.fixture
def admin_token(app):
    with app.app_context():
        return create_access_token(
            identity="99",
            additional_claims={"role": "admin", "email": "admin@example.com"},
        )


@pytest.fixture
def student_token(app):
    with app.app_context():
        return create_access_token(
            identity="10",
            additional_claims={"role": "student", "email": "student@student.usv.ro"},
        )


@pytest.fixture
def organizer_headers(organizer_token):
    return {"Authorization": f"Bearer {organizer_token}"}


@pytest.fixture
def another_organizer_headers(another_organizer_token):
    return {"Authorization": f"Bearer {another_organizer_token}"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}


# ---------------------------------------------------------------------------
# Event fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def published_event(client, organizer_headers):
    resp = client.post("/events/", json={**BASE_EVENT, "is_published": True}, headers=organizer_headers)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["event"]


@pytest.fixture
def unpublished_event(client, organizer_headers):
    resp = client.post(
        "/events/",
        json={**BASE_EVENT, "title": "Draft Event", "is_published": False},
        headers=organizer_headers,
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["event"]
