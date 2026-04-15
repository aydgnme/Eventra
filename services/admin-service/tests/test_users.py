"""
Tests for user management endpoints:
  GET    /admin/users/
  GET    /admin/users/<id>
  PATCH  /admin/users/<id>/activate
  PATCH  /admin/users/<id>/deactivate
  PATCH  /admin/users/<id>/role
  DELETE /admin/users/<id>
"""


class TestListUsers:
    def test_admin_can_list_users(self, client, admin_headers, sample_user):
        resp = client.get("/admin/users/", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "users" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/users/", headers=student_headers)
        assert resp.status_code == 403

    def test_organizer_forbidden(self, client, organizer_headers):
        resp = client.get("/admin/users/", headers=organizer_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/users/")
        assert resp.status_code == 401

    def test_pagination_fields_present(self, client, admin_headers):
        resp = client.get("/admin/users/", headers=admin_headers)
        data = resp.get_json()
        assert "page" in data
        assert "pages" in data
        assert "per_page" in data

    def test_filter_by_role(self, client, admin_headers, sample_user):
        resp = client.get("/admin/users/?role=student", headers=admin_headers)
        assert resp.status_code == 200
        users = resp.get_json()["users"]
        assert all(u["role"] == "student" for u in users)

    def test_search_by_email(self, client, admin_headers, sample_user):
        resp = client.get("/admin/users/?search=sample", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.get_json()["total"] >= 1


class TestGetUser:
    def test_admin_can_get_user(self, client, admin_headers, sample_user):
        resp = client.get(f"/admin/users/{sample_user['id']}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.get_json()["user"]["id"] == sample_user["id"]

    def test_nonexistent_returns_404(self, client, admin_headers):
        resp = client.get("/admin/users/99999", headers=admin_headers)
        assert resp.status_code == 404

    def test_non_admin_forbidden(self, client, student_headers, sample_user):
        resp = client.get(f"/admin/users/{sample_user['id']}", headers=student_headers)
        assert resp.status_code == 403


class TestActivateDeactivate:
    def test_deactivate_user(self, client, admin_headers, sample_user):
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/deactivate", headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["is_active"] is False

    def test_activate_user(self, client, admin_headers, sample_user):
        client.patch(f"/admin/users/{sample_user['id']}/deactivate", headers=admin_headers)
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/activate", headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["is_active"] is True

    def test_activate_nonexistent_returns_404(self, client, admin_headers):
        resp = client.patch("/admin/users/99999/activate", headers=admin_headers)
        assert resp.status_code == 404

    def test_deactivate_nonexistent_returns_404(self, client, admin_headers):
        resp = client.patch("/admin/users/99999/deactivate", headers=admin_headers)
        assert resp.status_code == 404

    def test_non_admin_cannot_deactivate(self, client, student_headers, sample_user):
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/deactivate", headers=student_headers
        )
        assert resp.status_code == 403


class TestUpdateRole:
    def test_update_role_to_organizer(self, client, admin_headers, sample_user):
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/role",
            json={"role": "organizer"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["role"] == "organizer"

    def test_update_role_to_admin(self, client, admin_headers, sample_user):
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/role",
            json={"role": "admin"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["role"] == "admin"

    def test_invalid_role_returns_400(self, client, admin_headers, sample_user):
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/role",
            json={"role": "superuser"},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_missing_role_returns_400(self, client, admin_headers, sample_user):
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/role",
            json={},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_nonexistent_user_returns_404(self, client, admin_headers):
        resp = client.patch(
            "/admin/users/99999/role",
            json={"role": "organizer"},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_non_admin_forbidden(self, client, student_headers, sample_user):
        resp = client.patch(
            f"/admin/users/{sample_user['id']}/role",
            json={"role": "organizer"},
            headers=student_headers,
        )
        assert resp.status_code == 403


class TestDeleteUser:
    def test_admin_can_delete_user(self, client, admin_headers, sample_user):
        resp = client.delete(
            f"/admin/users/{sample_user['id']}", headers=admin_headers
        )
        assert resp.status_code == 200
        assert "deleted" in resp.get_json()["message"].lower()

    def test_deleted_user_not_found(self, client, admin_headers, sample_user):
        client.delete(f"/admin/users/{sample_user['id']}", headers=admin_headers)
        resp = client.get(f"/admin/users/{sample_user['id']}", headers=admin_headers)
        assert resp.status_code == 404

    def test_delete_nonexistent_returns_404(self, client, admin_headers):
        resp = client.delete("/admin/users/99999", headers=admin_headers)
        assert resp.status_code == 404

    def test_non_admin_cannot_delete(self, client, student_headers, sample_user):
        resp = client.delete(
            f"/admin/users/{sample_user['id']}", headers=student_headers
        )
        assert resp.status_code == 403
