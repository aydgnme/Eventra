"""
Shared pytest fixtures for auth-service tests.

Uses an in-memory SQLite database so tests are isolated and fast.
The app fixture is session-scoped; DB cleanup runs per function.
"""
import os

# Set env vars BEFORE any app imports so Flask-SQLAlchemy picks them up.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-32-bytes-long!!!"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32-bytes!!!!"
os.environ["OAUTH_GOOGLE_CLIENT_ID"] = "test-google-client-id"
os.environ["OAUTH_GOOGLE_CLIENT_SECRET"] = "test-google-client-secret"
os.environ["OAUTH_FRONTEND_URL"] = "http://localhost:5055"

import pytest

from app import create_app
from app import db as _db
from app.models.user import User


# ---------------------------------------------------------------------------
# Test configuration overrides (belt-and-suspenders, env vars already set)
# ---------------------------------------------------------------------------

TEST_CONFIG = {
    "TESTING": True,
    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    "SECRET_KEY": "test-secret-key-32-bytes-long!!!",
    "JWT_SECRET_KEY": "test-jwt-secret-key-32-bytes!!!!",
    "GOOGLE_CLIENT_ID": "test-google-client-id",
    "GOOGLE_CLIENT_SECRET": "test-google-client-secret",
    "GOOGLE_REDIRECT_URI": "http://localhost:5051/auth/oauth/google/callback",
    "FRONTEND_URL": "http://localhost:5055",
    "WTF_CSRF_ENABLED": False,
}


# ---------------------------------------------------------------------------
# App & DB fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def app():
    """Create application with test config (session-scoped)."""
    flask_app = create_app()
    flask_app.config.update(TEST_CONFIG)

    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()


@pytest.fixture
def client(app):
    """Flask test client (function-scoped)."""
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Wipe all rows between every test function."""
    yield
    with app.app_context():
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def student_user(app):
    """Active student user with password."""
    with app.app_context():
        user = User(
            email="student@student.usv.ro",
            full_name="Test Student",
            role="student",
        )
        user.set_password("password123")
        _db.session.add(user)
        _db.session.commit()
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
        }


@pytest.fixture
def organizer_user(app):
    """Active organizer user with password."""
    with app.app_context():
        user = User(
            email="organizer@example.com",
            full_name="Test Organizer",
            role="organizer",
        )
        user.set_password("organizer_pass!")
        _db.session.add(user)
        _db.session.commit()
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
        }


@pytest.fixture
def disabled_user(app):
    """Deactivated student account."""
    with app.app_context():
        user = User(
            email="disabled@student.usv.ro",
            full_name="Disabled User",
            role="student",
            is_active=False,
        )
        user.set_password("password123")
        _db.session.add(user)
        _db.session.commit()
        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }


@pytest.fixture
def oauth_user(app):
    """User created via Google OAuth (no password_hash)."""
    with app.app_context():
        user = User(
            email="oauth@student.usv.ro",
            full_name="OAuth Student",
            role="student",
            oauth_provider="google",
            oauth_id="google-sub-12345",
        )
        _db.session.add(user)
        _db.session.commit()
        return {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "oauth_provider": user.oauth_provider,
        }


# ---------------------------------------------------------------------------
# Token fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def student_token(client, student_user):
    """Valid JWT for the student_user fixture."""
    resp = client.post(
        "/auth/login",
        json={"email": "student@student.usv.ro", "password": "password123"},
    )
    data = resp.get_json()
    assert "access_token" in data, f"Login failed: {data}"
    return data["access_token"]


@pytest.fixture
def organizer_token(client, organizer_user):
    """Valid JWT for the organizer_user fixture."""
    resp = client.post(
        "/auth/login",
        json={"email": "organizer@example.com", "password": "organizer_pass!"},
    )
    data = resp.get_json()
    assert "access_token" in data, f"Login failed: {data}"
    return data["access_token"]


@pytest.fixture
def auth_header(student_token):
    """Authorization header dict for student token."""
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture
def organizer_auth_header(organizer_token):
    """Authorization header dict for organizer token."""
    return {"Authorization": f"Bearer {organizer_token}"}
