"""
Tests for POST /auth/register
"""
import pytest


ORGANIZER_PAYLOAD = {
    "email": "neworganizer@company.com",
    "password": "SecurePass123",
    "full_name": "New Organizer",
    "role": "organizer",
}

ADMIN_PAYLOAD = {
    "email": "newadmin@company.com",
    "password": "AdminPass456",
    "full_name": "New Admin",
    "role": "admin",
}


class TestRegisterSuccess:
    def test_organizer_registration_returns_201(self, client):
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        assert resp.status_code == 201

    def test_organizer_registration_response_body(self, client):
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        data = resp.get_json()
        assert data["message"] == "User registered"
        assert data["user"]["email"] == ORGANIZER_PAYLOAD["email"]
        assert data["user"]["role"] == "organizer"
        assert data["user"]["full_name"] == ORGANIZER_PAYLOAD["full_name"]
        assert data["user"]["is_active"] is True

    def test_admin_registration_returns_201(self, client):
        resp = client.post("/auth/register", json=ADMIN_PAYLOAD)
        assert resp.status_code == 201

    def test_admin_registration_role(self, client):
        resp = client.post("/auth/register", json=ADMIN_PAYLOAD)
        assert resp.get_json()["user"]["role"] == "admin"

    def test_oauth_provider_is_local(self, client):
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        assert resp.get_json()["user"]["oauth_provider"] == "local"

    def test_password_not_in_response(self, client):
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        user = resp.get_json()["user"]
        assert "password" not in user
        assert "password_hash" not in user

    def test_response_includes_timestamps(self, client):
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        user = resp.get_json()["user"]
        assert "created_at" in user
        assert "updated_at" in user


class TestRegisterValidation:
    def test_missing_email(self, client):
        resp = client.post(
            "/auth/register",
            json={"password": "SecurePass123", "full_name": "Test", "role": "organizer"},
        )
        assert resp.status_code == 400

    def test_missing_password(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "test@company.com", "full_name": "Test", "role": "organizer"},
        )
        assert resp.status_code == 400

    def test_missing_full_name(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "test@company.com", "password": "SecurePass123", "role": "organizer"},
        )
        assert resp.status_code == 400

    def test_no_body(self, client):
        resp = client.post("/auth/register")
        assert resp.status_code in (400, 415)

    def test_empty_json_body(self, client):
        resp = client.post("/auth/register", json={})
        assert resp.status_code == 400

    def test_empty_email(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "", "password": "SecurePass123", "full_name": "Test", "role": "organizer"},
        )
        assert resp.status_code == 400

    def test_empty_password(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "test@company.com", "password": "", "full_name": "Test", "role": "organizer"},
        )
        assert resp.status_code == 400

    def test_password_too_short(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@company.com",
                "password": "Short1A",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 400
        assert "8 characters" in resp.get_json()["error"]

    def test_password_missing_uppercase(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@company.com",
                "password": "alllowercase1",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 400
        assert "uppercase" in resp.get_json()["error"].lower()

    def test_password_missing_lowercase(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@company.com",
                "password": "ALLUPPERCASE1",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 400
        assert "lowercase" in resp.get_json()["error"].lower()

    def test_password_missing_digit(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@company.com",
                "password": "NoDigitsHere",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 400
        assert "digit" in resp.get_json()["error"].lower()

    def test_password_valid_exactly_8_chars(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@company.com",
                "password": "Abcdef1x",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize(
        "bad_email",
        [
            "not-an-email",
            "missing@",
            "@nodomain.com",
            "spaces in@email.com",
            "double@@domain.com",
            "nodot@domain",
        ],
    )
    def test_invalid_email_format(self, client, bad_email):
        resp = client.post(
            "/auth/register",
            json={
                "email": bad_email,
                "password": "SecurePass123",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 400

    def test_student_role_rejected(self, client):
        """Students must use Google OAuth, not local registration."""
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@student.usv.ro",
                "password": "SecurePass123",
                "full_name": "Test",
                "role": "student",
            },
        )
        assert resp.status_code == 400
        assert "Students must use Google OAuth" in resp.get_json()["error"]

    def test_invalid_role(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@company.com",
                "password": "SecurePass123",
                "full_name": "Test",
                "role": "superuser",
            },
        )
        assert resp.status_code == 400
        assert "Invalid role" in resp.get_json()["error"]

    def test_missing_role_rejected(self, client):
        """Role is required and must be organizer or admin."""
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@company.com",
                "password": "SecurePass123",
                "full_name": "Test",
            },
        )
        assert resp.status_code == 400


class TestRegisterDuplicates:
    def test_duplicate_email_returns_409(self, client):
        client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        assert resp.status_code == 409

    def test_duplicate_email_error_message(self, client):
        client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        assert "already registered" in resp.get_json()["error"].lower()
