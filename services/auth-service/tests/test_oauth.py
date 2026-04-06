"""
Tests for OAuth routes:
  GET  /auth/oauth/google
  GET  /auth/oauth/google/callback
"""
import time
import hashlib
import hmac
from unittest.mock import MagicMock, patch

import pytest

from app import db
from app.models.user import User


def _make_valid_state(app):
    """Helper: generate a valid HMAC state using the test secret key."""
    ts = str(int(time.time()))
    secret = app.config["SECRET_KEY"]
    sig = hmac.new(secret.encode(), ts.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{ts}:{sig}"


def _make_expired_state(app):
    """Helper: generate an HMAC state that is 400 seconds old (expired)."""
    ts = str(int(time.time()) - 400)
    secret = app.config["SECRET_KEY"]
    sig = hmac.new(secret.encode(), ts.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{ts}:{sig}"


class TestGoogleLogin:
    def test_redirects_to_google(self, client):
        resp = client.get("/auth/oauth/google")
        assert resp.status_code == 302
        assert "accounts.google.com" in resp.headers["Location"]

    def test_redirect_contains_client_id(self, client, app):
        resp = client.get("/auth/oauth/google")
        assert app.config["GOOGLE_CLIENT_ID"] in resp.headers["Location"]

    def test_redirect_contains_required_params(self, client):
        resp = client.get("/auth/oauth/google")
        loc = resp.headers["Location"]
        assert "response_type=code" in loc
        assert "scope=" in loc
        assert "state=" in loc
        assert "redirect_uri=" in loc


class TestGoogleCallback:
    # ------------------------------------------------------------------
    # Error / guard cases
    # ------------------------------------------------------------------

    def test_error_param_redirects_to_login(self, client):
        resp = client.get("/auth/oauth/google/callback?error=access_denied")
        assert resp.status_code == 302
        assert "login" in resp.headers["Location"]
        assert "oauth_error" in resp.headers["Location"]

    def test_missing_state_redirects_with_error(self, client):
        resp = client.get("/auth/oauth/google/callback?code=some_code")
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    def test_invalid_state_redirects_with_error(self, client):
        resp = client.get(
            "/auth/oauth/google/callback?code=abc&state=invalid:state"
        )
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    def test_expired_state_redirects_with_error(self, client, app):
        expired = _make_expired_state(app)
        resp = client.get(
            f"/auth/oauth/google/callback?code=abc&state={expired}"
        )
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    def test_missing_code_redirects_with_error(self, client, app):
        valid_state = _make_valid_state(app)
        resp = client.get(
            f"/auth/oauth/google/callback?state={valid_state}"
        )
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    # ------------------------------------------------------------------
    # Token exchange failure
    # ------------------------------------------------------------------

    def test_google_token_exchange_failure_redirects_with_error(self, client, app):
        valid_state = _make_valid_state(app)
        mock_resp = MagicMock()
        mock_resp.ok = False

        with patch("app.routes.oauth.http_requests.post", return_value=mock_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=bad_code&state={valid_state}"
            )
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    def test_google_token_missing_access_token_field(self, client, app):
        valid_state = _make_valid_state(app)
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {}  # no access_token field

        with patch("app.routes.oauth.http_requests.post", return_value=mock_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    # ------------------------------------------------------------------
    # User info failure
    # ------------------------------------------------------------------

    def test_google_userinfo_failure_redirects_with_error(self, client, app):
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = False

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    # ------------------------------------------------------------------
    # Domain validation
    # ------------------------------------------------------------------

    def test_non_allowed_email_domain_redirects_with_error(self, client, app):
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = True
        mock_info_resp.json.return_value = {
            "email": "student@gmail.com",
            "name": "Gmail User",
            "sub": "google-sub-001",
        }

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )
        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]

    def test_professor_email_domain_is_allowed(self, client, app):
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = True
        mock_info_resp.json.return_value = {
            "email": "profesor@usv.ro",
            "name": "Profesor USV",
            "sub": "google-sub-prof",
        }

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )
        assert resp.status_code == 302
        assert "token=" in resp.headers["Location"]

    # ------------------------------------------------------------------
    # Happy path — new user creation
    # ------------------------------------------------------------------

    def test_new_user_created_and_redirected(self, client, app):
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-access-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = True
        mock_info_resp.json.return_value = {
            "email": "newstudent@student.usv.ro",
            "name": "New Student",
            "sub": "google-sub-999",
        }

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )

        assert resp.status_code == 302
        loc = resp.headers["Location"]
        assert "/oauth/callback" in loc
        assert "token=" in loc
        assert "oauth_error" not in loc

    def test_new_oauth_user_stored_in_db(self, client, app):
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-access-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = True
        mock_info_resp.json.return_value = {
            "email": "dbtest@student.usv.ro",
            "name": "DB Test",
            "sub": "google-sub-db",
        }

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )

        with app.app_context():
            user = User.query.filter_by(email="dbtest@student.usv.ro").first()
            assert user is not None
            assert user.role == "student"
            assert user.oauth_provider == "google"
            assert user.oauth_id == "google-sub-db"

    def test_new_professor_oauth_user_stored_as_organizer(self, client, app):
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-access-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = True
        mock_info_resp.json.return_value = {
            "email": "cadru.didactic@eed.usv.ro",
            "name": "Cadru Didactic",
            "sub": "google-sub-staff",
        }

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )

        with app.app_context():
            user = User.query.filter_by(email="cadru.didactic@eed.usv.ro").first()
            assert user is not None
            assert user.role == "organizer"
            assert user.oauth_provider == "google"
            assert user.oauth_id == "google-sub-staff"

    # ------------------------------------------------------------------
    # Happy path — existing user login
    # ------------------------------------------------------------------

    def test_existing_user_gets_jwt_not_duplicate(self, client, app, student_user):
        """Existing student email via OAuth should not create a second record."""
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-access-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = True
        mock_info_resp.json.return_value = {
            "email": "student@student.usv.ro",
            "name": "Test Student",
            "sub": "google-sub-existing",
        }

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )

        assert resp.status_code == 302
        assert "token=" in resp.headers["Location"]

        with app.app_context():
            count = User.query.filter_by(email="student@student.usv.ro").count()
            assert count == 1

    # ------------------------------------------------------------------
    # Disabled account
    # ------------------------------------------------------------------

    def test_disabled_oauth_account_redirects_with_error(self, client, app, disabled_user):
        valid_state = _make_valid_state(app)

        mock_token_resp = MagicMock()
        mock_token_resp.ok = True
        mock_token_resp.json.return_value = {"access_token": "fake-access-token"}

        mock_info_resp = MagicMock()
        mock_info_resp.ok = True
        mock_info_resp.json.return_value = {
            "email": "disabled@student.usv.ro",
            "name": "Disabled User",
            "sub": "google-sub-disabled",
        }

        with patch("app.routes.oauth.http_requests.post", return_value=mock_token_resp), \
             patch("app.routes.oauth.http_requests.get", return_value=mock_info_resp):
            resp = client.get(
                f"/auth/oauth/google/callback?code=abc&state={valid_state}"
            )

        assert resp.status_code == 302
        assert "oauth_error" in resp.headers["Location"]
