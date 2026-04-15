"""
Shared pytest fixtures for admin-service tests.
Each bind uses its own in-memory SQLite database.
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["AUTH_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["EVENT_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["REGISTRATION_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-32-bytes-long!!!"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32-bytes!!!!"

import pytest
from sqlalchemy.pool import StaticPool
from flask_jwt_extended import create_access_token

from app import create_app, db as _db

TEST_CONFIG = {
    "TESTING": True,
    "SECRET_KEY": "test-secret-key-32-bytes-long!!!",
    "JWT_SECRET_KEY": "test-jwt-secret-key-32-bytes!!!!",
    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    "SQLALCHEMY_BINDS": {
        "auth": "sqlite:///:memory:",
        "event": "sqlite:///:memory:",
        "registration": "sqlite:///:memory:",
    },
    "SQLALCHEMY_ENGINE_OPTIONS": {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    },
}


# ---------------------------------------------------------------------------
# App & DB
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


def _truncate_all():
    """Delete all rows from every table in every bind."""
    for bind_key, engine in _db.engines.items():
        metadata = _db.metadatas.get(bind_key)
        if metadata is None:
            continue
        with engine.begin() as conn:
            for table in reversed(metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture(autouse=True)
def clean_db(app):
    with app.app_context():
        _truncate_all()
    yield
    with app.app_context():
        _db.session.rollback()
        _truncate_all()


# ---------------------------------------------------------------------------
# JWT fixtures  (admin=1, organizer=2, student=3)
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_token(app):
    with app.app_context():
        return create_access_token(
            identity="1", additional_claims={"role": "admin", "email": "admin@test.com"}
        )


@pytest.fixture
def organizer_token(app):
    with app.app_context():
        return create_access_token(
            identity="2", additional_claims={"role": "organizer", "email": "org@test.com"}
        )


@pytest.fixture
def student_token(app):
    with app.app_context():
        return create_access_token(
            identity="3", additional_claims={"role": "student", "email": "stu@test.com"}
        )


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def organizer_headers(organizer_token):
    return {"Authorization": f"Bearer {organizer_token}"}


@pytest.fixture
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_user(app):
    from app.models.user import User
    with app.app_context():
        user = User(
            email="sample@student.usv.ro",
            full_name="Sample User",
            role="student",
            is_active=True,
        )
        _db.session.add(user)
        _db.session.commit()
        return user.to_dict()


@pytest.fixture
def sample_event(app):
    from app.models.event import Event
    from datetime import datetime, timezone, timedelta
    with app.app_context():
        event = Event(
            title="Test Event",
            description="A test event",
            start_datetime=datetime.now(timezone.utc) + timedelta(days=7),
            end_datetime=datetime.now(timezone.utc) + timedelta(days=7, hours=2),
            organizer_id=2,
            is_published=False,
        )
        _db.session.add(event)
        _db.session.commit()
        return event.to_dict()


@pytest.fixture
def published_event(app):
    from app.models.event import Event
    from datetime import datetime, timezone, timedelta
    with app.app_context():
        event = Event(
            title="Published Event",
            start_datetime=datetime.now(timezone.utc) + timedelta(days=3),
            end_datetime=datetime.now(timezone.utc) + timedelta(days=3, hours=2),
            organizer_id=2,
            is_published=True,
        )
        _db.session.add(event)
        _db.session.commit()
        return event.to_dict()


@pytest.fixture
def sample_registration(app, sample_event):
    from app.models.registration import Registration, RegistrationStatus
    with app.app_context():
        reg = Registration(
            user_id=3,
            event_id=sample_event["id"],
            status=RegistrationStatus.REGISTERED,
            user_email="stu@test.com",
        )
        _db.session.add(reg)
        _db.session.commit()
        return reg.to_dict()
