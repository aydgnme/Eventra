"""
Tests for POST /auth/login
"""
import pytest
import jwt as pyjwt


class TestLoginSuccess:
    def test_valid_credentials_returns_200(self, client, student_user):
        resp = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "password123"},
        )
        assert resp.status_code == 200

    def test_response_contains_access_token(self, client, student_user):
        resp = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "password123"},
        )
        data = resp.get_json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0

    def test_response_contains_user_object(self, client, student_user):
        resp = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "password123"},
        )
        data = resp.get_json()
        assert "user" in data
        assert data["user"]["email"] == "student@student.usv.ro"
        assert data["user"]["role"] == "student"

    def test_jwt_contains_correct_claims(self, client, app, student_user):
        resp = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "password123"},
        )
        token = resp.get_json()["access_token"]
        secret = app.config["JWT_SECRET_KEY"]
        decoded = pyjwt.decode(token, secret, algorithms=["HS256"])

        assert decoded["sub"] == str(student_user["id"])
        assert decoded["role"] == "student"
        assert decoded["email"] == "student@student.usv.ro"

    def test_organizer_login_returns_correct_role(self, client, organizer_user):
        resp = client.post(
            "/auth/login",
            json={"email": "organizer@example.com", "password": "organizer_pass!"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["role"] == "organizer"

    def test_password_not_in_response(self, client, student_user):
        resp = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "password123"},
        )
        user = resp.get_json()["user"]
        assert "password" not in user
        assert "password_hash" not in user

    def test_oauth_user_cannot_login_with_password(self, client, oauth_user):
        """OAuth-only user has no password_hash — login must fail."""
        resp = client.post(
            "/auth/login",
            json={"email": "oauth@student.usv.ro", "password": "anypassword"},
        )
        assert resp.status_code == 401


class TestLoginFailure:
    def test_wrong_password_returns_401(self, client, student_user):
        resp = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "wrongpassword"},
        )
        assert resp.status_code == 401

    def test_wrong_password_error_message(self, client, student_user):
        resp = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "wrongpassword"},
        )
        assert "credentials" in resp.get_json()["error"].lower()

    def test_nonexistent_email_returns_401(self, client):
        resp = client.post(
            "/auth/login",
            json={"email": "nobody@student.usv.ro", "password": "password123"},
        )
        assert resp.status_code == 401

    def test_nonexistent_email_does_not_leak_user_existence(self, client, student_user):
        """Error messages should be identical for wrong password vs. missing user."""
        wrong_pass = client.post(
            "/auth/login",
            json={"email": "student@student.usv.ro", "password": "wrongpassword"},
        )
        no_user = client.post(
            "/auth/login",
            json={"email": "nobody@student.usv.ro", "password": "password123"},
        )
        assert wrong_pass.get_json()["error"] == no_user.get_json()["error"]

    def test_disabled_account_returns_403(self, client, disabled_user):
        resp = client.post(
            "/auth/login",
            json={"email": "disabled@student.usv.ro", "password": "password123"},
        )
        assert resp.status_code == 403

    def test_disabled_account_error_message(self, client, disabled_user):
        resp = client.post(
            "/auth/login",
            json={"email": "disabled@student.usv.ro", "password": "password123"},
        )
        assert "disabled" in resp.get_json()["error"].lower()

    def test_missing_email_returns_400(self, client):
        resp = client.post("/auth/login", json={"password": "password123"})
        assert resp.status_code == 400

    def test_missing_password_returns_400(self, client):
        resp = client.post(
            "/auth/login", json={"email": "student@student.usv.ro"}
        )
        assert resp.status_code == 400

    def test_no_body_returns_4xx(self, client):
        # Flask 3.x returns 415 (no Content-Type) before the view runs;
        # older versions return 400 ("No data provided"). Both are correct.
        resp = client.post("/auth/login")
        assert resp.status_code in (400, 415)

    def test_empty_body_returns_400(self, client):
        resp = client.post("/auth/login", json={})
        assert resp.status_code == 400

    @pytest.mark.parametrize("email,password", [
        ("", "password123"),
        ("student@student.usv.ro", ""),
        ("", ""),
    ])
    def test_empty_credentials_return_400(self, client, email, password):
        resp = client.post("/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 400
