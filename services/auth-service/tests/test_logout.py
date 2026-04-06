"""
Tests for POST /auth/logout
"""


class TestLogout:
    def test_logout_with_valid_token_returns_200(self, client, student_token):
        resp = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200

    def test_logout_response_message(self, client, student_token):
        resp = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        data = resp.get_json()
        assert "message" in data
        assert "logged out" in data["message"].lower()

    def test_logout_without_token_returns_401(self, client):
        resp = client.post("/auth/logout")
        assert resp.status_code == 401

    def test_logout_with_invalid_token_returns_422(self, client):
        resp = client.post(
            "/auth/logout",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 422

    def test_organizer_can_logout(self, client, organizer_token):
        resp = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {organizer_token}"},
        )
        assert resp.status_code == 200

    def test_token_still_valid_after_logout(self, client, student_token):
        """Service is stateless — token remains usable until expiry after logout."""
        client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        # Stateless logout: token is still technically valid
        assert resp.status_code == 200
