"""
Tests for GET /auth/me
"""


class TestMe:
    def test_returns_200_with_valid_token(self, client, student_token):
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200

    def test_returns_user_object(self, client, student_token, student_user):
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        data = resp.get_json()
        assert "user" in data
        assert data["user"]["email"] == student_user["email"]
        assert data["user"]["role"] == student_user["role"]
        assert data["user"]["full_name"] == student_user["full_name"]

    def test_password_not_in_response(self, client, student_token):
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        user = resp.get_json()["user"]
        assert "password" not in user
        assert "password_hash" not in user

    def test_organizer_can_access_me(self, client, organizer_token, organizer_user):
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {organizer_token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["role"] == "organizer"

    def test_no_token_returns_401(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_invalid_token_returns_422(self, client):
        resp = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
        )
        assert resp.status_code == 422

    def test_malformed_authorization_header_returns_401(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "NotBearer token"})
        assert resp.status_code == 401

    def test_empty_bearer_token_returns_422(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer "})
        assert resp.status_code == 422

    def test_wrong_algorithm_token_rejected(self, client, app):
        """Token signed with a different key should be rejected."""
        import jwt as pyjwt
        bad_token = pyjwt.encode(
            {"sub": "1", "role": "student", "email": "x@student.usv.ro"},
            "wrong-secret-key",
            algorithm="HS256",
        )
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {bad_token}"},
        )
        assert resp.status_code == 422

    def test_user_id_matches_token_subject(self, client, student_token, student_user):
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.get_json()["user"]["id"] == student_user["id"]
