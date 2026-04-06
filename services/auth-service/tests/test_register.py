"""
Tests for POST /auth/register
"""
import pytest


STUDENT_PAYLOAD = {
    "email": "newstudent@student.usv.ro",
    "password": "securepassword",
    "full_name": "New Student",
    "role": "student",
}

ORGANIZER_PAYLOAD = {
    "email": "neworganizer@company.com",
    "password": "securepassword",
    "full_name": "New Organizer",
    "role": "organizer",
}


class TestRegisterSuccess:
    def test_student_registration_returns_201(self, client):
        resp = client.post("/auth/register", json=STUDENT_PAYLOAD)
        assert resp.status_code == 201

    def test_student_registration_response_body(self, client):
        resp = client.post("/auth/register", json=STUDENT_PAYLOAD)
        data = resp.get_json()
        assert data["message"] == "User registered"
        assert data["user"]["email"] == STUDENT_PAYLOAD["email"]
        assert data["user"]["role"] == "student"
        assert data["user"]["full_name"] == STUDENT_PAYLOAD["full_name"]
        assert data["user"]["is_active"] is True

    def test_organizer_registration_returns_201(self, client):
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        assert resp.status_code == 201

    def test_organizer_registration_role(self, client):
        resp = client.post("/auth/register", json=ORGANIZER_PAYLOAD)
        assert resp.get_json()["user"]["role"] == "organizer"

    def test_password_not_in_response(self, client):
        resp = client.post("/auth/register", json=STUDENT_PAYLOAD)
        user = resp.get_json()["user"]
        assert "password" not in user
        assert "password_hash" not in user

    def test_default_role_is_student(self, client):
        """If role is omitted for a student email, default should be student."""
        payload = {
            "email": "another@student.usv.ro",
            "password": "securepassword",
            "full_name": "Another Student",
        }
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 201
        assert resp.get_json()["user"]["role"] == "student"

    def test_response_includes_timestamps(self, client):
        resp = client.post("/auth/register", json=STUDENT_PAYLOAD)
        user = resp.get_json()["user"]
        assert "created_at" in user
        assert "updated_at" in user


class TestRegisterValidation:
    def test_missing_email(self, client):
        resp = client.post(
            "/auth/register",
            json={"password": "securepassword", "full_name": "Test"},
        )
        assert resp.status_code == 400

    def test_missing_password(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "test@student.usv.ro", "full_name": "Test"},
        )
        assert resp.status_code == 400

    def test_missing_full_name(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "test@student.usv.ro", "password": "securepassword"},
        )
        assert resp.status_code == 400

    def test_no_body(self, client):
        # Flask 3.x returns 415 (no Content-Type) before the view runs;
        # older versions return 400 ("No data provided"). Both are correct.
        resp = client.post("/auth/register")
        assert resp.status_code in (400, 415)

    def test_empty_json_body(self, client):
        resp = client.post("/auth/register", json={})
        assert resp.status_code == 400

    def test_empty_email(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "", "password": "securepassword", "full_name": "Test"},
        )
        assert resp.status_code == 400

    def test_empty_password(self, client):
        resp = client.post(
            "/auth/register",
            json={"email": "test@student.usv.ro", "password": "", "full_name": "Test"},
        )
        assert resp.status_code == 400

    def test_password_too_short(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@student.usv.ro",
                "password": "short",
                "full_name": "Test",
                "role": "student",
            },
        )
        assert resp.status_code == 400
        assert "8 characters" in resp.get_json()["error"]

    def test_password_exactly_7_chars_rejected(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@student.usv.ro",
                "password": "1234567",
                "full_name": "Test",
                "role": "student",
            },
        )
        assert resp.status_code == 400

    def test_password_exactly_8_chars_accepted(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@student.usv.ro",
                "password": "12345678",
                "full_name": "Test",
                "role": "student",
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
                "password": "securepassword",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 400

    def test_invalid_role(self, client):
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@student.usv.ro",
                "password": "securepassword",
                "full_name": "Test",
                "role": "admin",
            },
        )
        assert resp.status_code == 400
        assert "Invalid role" in resp.get_json()["error"]

    def test_student_email_with_organizer_role(self, client):
        """University email cannot register as organizer."""
        resp = client.post(
            "/auth/register",
            json={
                "email": "test@student.usv.ro",
                "password": "securepassword",
                "full_name": "Test",
                "role": "organizer",
            },
        )
        assert resp.status_code == 400
        assert "University emails" in resp.get_json()["error"]

    def test_non_student_email_with_student_role(self, client):
        """Non-university email cannot register as student."""
        resp = client.post(
            "/auth/register",
            json={
                "email": "person@gmail.com",
                "password": "securepassword",
                "full_name": "Test",
                "role": "student",
            },
        )
        assert resp.status_code == 400
        assert "@student.usv.ro" in resp.get_json()["error"]


class TestRegisterDuplicates:
    def test_duplicate_email_returns_409(self, client, student_user):
        resp = client.post(
            "/auth/register",
            json={
                "email": student_user["email"],
                "password": "anotherpassword",
                "full_name": "Duplicate",
                "role": "student",
            },
        )
        assert resp.status_code == 409

    def test_duplicate_email_error_message(self, client, student_user):
        resp = client.post(
            "/auth/register",
            json={
                "email": student_user["email"],
                "password": "anotherpassword",
                "full_name": "Duplicate",
                "role": "student",
            },
        )
        assert "already registered" in resp.get_json()["error"].lower()
