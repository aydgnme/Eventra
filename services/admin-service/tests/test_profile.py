"""
Tests for admin profile endpoints:
  GET   /admin/profile/
  PATCH /admin/profile/
"""


class TestGetProfile:
    def test_admin_can_get_own_profile(self, client, admin_headers, admin_user):
        resp = client.get("/admin/profile/", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "profile" in data
        profile = data["profile"]
        assert profile["id"] == admin_user["id"]
        assert profile["email"] == admin_user["email"]
        assert profile["role"] == "admin"

    def test_profile_fields_present(self, client, admin_headers, admin_user):
        resp = client.get("/admin/profile/", headers=admin_headers)
        profile = resp.get_json()["profile"]
        assert "id" in profile
        assert "email" in profile
        assert "full_name" in profile
        assert "role" in profile
        assert "is_active" in profile

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/profile/", headers=student_headers)
        assert resp.status_code == 403

    def test_organizer_forbidden(self, client, organizer_headers):
        resp = client.get("/admin/profile/", headers=organizer_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/profile/")
        assert resp.status_code == 401

    def test_returns_404_when_user_not_in_db(self, client, admin_headers):
        # admin_user fixture not used — no DB record for identity=99
        resp = client.get("/admin/profile/", headers=admin_headers)
        assert resp.status_code == 404


class TestUpdateProfile:
    def test_admin_can_update_full_name(self, client, admin_headers, admin_user):
        resp = client.patch(
            "/admin/profile/",
            json={"full_name": "Updated Admin Name"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["profile"]["full_name"] == "Updated Admin Name"

    def test_update_persists(self, client, admin_headers, admin_user):
        client.patch(
            "/admin/profile/",
            json={"full_name": "Persistent Name"},
            headers=admin_headers,
        )
        resp = client.get("/admin/profile/", headers=admin_headers)
        assert resp.get_json()["profile"]["full_name"] == "Persistent Name"

    def test_empty_full_name_returns_400(self, client, admin_headers, admin_user):
        resp = client.patch(
            "/admin/profile/",
            json={"full_name": ""},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_missing_full_name_returns_400(self, client, admin_headers, admin_user):
        resp = client.patch(
            "/admin/profile/",
            json={},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.patch(
            "/admin/profile/",
            json={"full_name": "Hacker"},
            headers=student_headers,
        )
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.patch("/admin/profile/", json={"full_name": "X"})
        assert resp.status_code == 401
