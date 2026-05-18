"""
Tests for the API Gateway:
  - Health endpoints
  - JWT authentication via auth-service /auth/verify & public route bypass
  - Header forwarding (X-User-ID, X-User-Role, X-User-Email, X-Request-ID, X-Forwarded-For)
  - Admin-only prefix guard
  - Role-restricted routes (organizer, organizer/admin)
  - Proxy error handling (502, 504)
  - Content-Disposition passthrough
"""
from unittest.mock import patch, MagicMock

import requests as real_requests


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"
        assert data["service"] == "gateway"
        assert data["version"] == "1.0"

    def test_health_services_returns_aggregate(self, client):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200

        with patch("app.requests.get", return_value=mock_resp) as mock_get:
            resp = client.get("/health/services")
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["gateway"] == "ok"
            assert data["auth-service"] == "ok"
            assert data["event-service"] == "ok"
            assert data["registration-service"] == "ok"
            assert data["admin-service"] == "ok"

    def test_health_services_partial_failure(self, client):
        def side_effect(url, **kwargs):
            if "reg-mock" in url:
                raise real_requests.ConnectionError("down")
            mock = MagicMock()
            mock.ok = True
            return mock

        with patch("app.requests.get", side_effect=side_effect):
            resp = client.get("/health/services")
            data = resp.get_json()
            assert data["gateway"] == "ok"
            assert data["registration-service"] == "error"
            assert data["auth-service"] == "ok"


# ---------------------------------------------------------------------------
# Public routes — no JWT required
# ---------------------------------------------------------------------------

class TestPublicRoutes:
    def test_health_is_public(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_services_is_public(self, client):
        with patch("app.requests.get", side_effect=real_requests.ConnectionError):
            resp = client.get("/health/services")
            assert resp.status_code == 200

    @patch("app.requests.request")
    def test_auth_login_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"token":"x"}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/auth/login", json={"email": "a", "password": "b"})
        assert resp.status_code == 200

    @patch("app.requests.request")
    def test_auth_register_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"ok":true}', status_code=201,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/auth/register", json={"email": "a"})
        assert resp.status_code == 201

    @patch("app.requests.request")
    def test_auth_google_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"ok":true}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/auth/google", json={"token": "x"})
        assert resp.status_code == 200

    @patch("app.requests.request")
    def test_auth_forgot_password_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"ok":true}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/auth/forgot-password", json={"email": "a"})
        assert resp.status_code == 200

    @patch("app.requests.request")
    def test_auth_reset_password_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"ok":true}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/auth/reset-password", json={"token": "x"})
        assert resp.status_code == 200

    @patch("app.requests.request")
    def test_get_events_listing_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"events":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/events/")
        assert resp.status_code == 200

    @patch("app.requests.request")
    def test_get_event_detail_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"event":{}}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/events/42")
        assert resp.status_code == 200

    @patch("app.requests.request")
    def test_registration_counts_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"counts":{}}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/registrations/counts")
        assert resp.status_code != 401

    @patch("app.requests.request")
    def test_event_count_is_public(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"registered":0}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/registrations/event/1/count")
        assert resp.status_code != 401

    def test_events_mine_is_not_public(self, client):
        """GET /events/mine requires auth (organizer), must NOT be public."""
        resp = client.get("/events/mine")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Authentication — JWT verified via Auth Service
# ---------------------------------------------------------------------------

class TestAuthentication:
    def test_protected_route_without_token_returns_401(self, client):
        resp = client.get("/registrations/my")
        assert resp.status_code == 401
        assert "authorization" in resp.get_json()["error"].lower() or "token" in resp.get_json()["error"].lower()

    def test_protected_route_with_invalid_token_returns_401(self, client):
        resp = client.get(
            "/registrations/my",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401

    def test_protected_route_with_expired_token_returns_401(self, client):
        resp = client.get(
            "/registrations/my",
            headers={"Authorization": "Bearer expired-token"},
        )
        assert resp.status_code == 401

    @patch("app.requests.request")
    def test_protected_route_with_valid_token_proxies(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{"registrations":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/registrations/my", headers=student_headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Admin-only guard
# ---------------------------------------------------------------------------

class TestAdminGuard:
    def test_admin_route_with_student_returns_403(self, client, student_headers):
        resp = client.get("/admin/users", headers=student_headers)
        assert resp.status_code == 403
        assert "permissions" in resp.get_json()["error"].lower() or "admin" in resp.get_json()["error"].lower()

    def test_admin_route_with_organizer_returns_403(self, client, organizer_headers):
        resp = client.get("/admin/users", headers=organizer_headers)
        assert resp.status_code == 403

    @patch("app.requests.request")
    def test_admin_route_with_admin_proxies(self, mock_req, client, admin_headers):
        mock_req.return_value = MagicMock(
            content=b'{"users":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/admin/users", headers=admin_headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Role-restricted routes
# ---------------------------------------------------------------------------

class TestRoleRestriction:
    # --- Organizer-only routes ---

    @patch("app.requests.request")
    def test_organizer_can_create_event(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b'{"event":{}}', status_code=201,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/events/", json={"title": "x"}, headers=organizer_headers)
        assert resp.status_code == 201

    def test_student_cannot_create_event(self, client, student_headers):
        resp = client.post("/events/", json={"title": "x"}, headers=student_headers)
        assert resp.status_code == 403

    @patch("app.requests.request")
    def test_organizer_can_update_event(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b'{"event":{}}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.put("/events/1", json={"title": "y"}, headers=organizer_headers)
        assert resp.status_code == 200

    def test_student_cannot_update_event(self, client, student_headers):
        resp = client.put("/events/1", json={"title": "y"}, headers=student_headers)
        assert resp.status_code == 403

    @patch("app.requests.request")
    def test_organizer_can_access_events_mine(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b'{"events":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/events/mine", headers=organizer_headers)
        assert resp.status_code == 200

    def test_student_cannot_access_events_mine(self, client, student_headers):
        resp = client.get("/events/mine", headers=student_headers)
        assert resp.status_code == 403

    @patch("app.requests.request")
    def test_organizer_can_submit_event(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/events/1/submit", headers=organizer_headers)
        assert resp.status_code == 200

    def test_student_cannot_submit_event(self, client, student_headers):
        resp = client.post("/events/1/submit", headers=student_headers)
        assert resp.status_code == 403

    # --- Organizer or Admin routes ---

    @patch("app.requests.request")
    def test_organizer_can_delete_event(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.delete("/events/1", headers=organizer_headers)
        assert resp.status_code == 200

    @patch("app.requests.request")
    def test_admin_can_delete_event(self, mock_req, client, admin_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.delete("/events/1", headers=admin_headers)
        assert resp.status_code == 200

    def test_student_cannot_delete_event(self, client, student_headers):
        resp = client.delete("/events/1", headers=student_headers)
        assert resp.status_code == 403

    @patch("app.requests.request")
    def test_organizer_can_list_participants(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b'{"participants":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.get("/registrations/1/participants", headers=organizer_headers)
        assert resp.status_code == 200

    def test_student_cannot_list_participants(self, client, student_headers):
        resp = client.get("/registrations/1/participants", headers=student_headers)
        assert resp.status_code == 403

    @patch("app.requests.request")
    def test_organizer_can_checkin(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b'{"message":"ok"}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        resp = client.post("/registrations/1/checkin/5", headers=organizer_headers)
        assert resp.status_code == 200

    def test_student_cannot_checkin(self, client, student_headers):
        resp = client.post("/registrations/1/checkin/5", headers=student_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Header forwarding
# ---------------------------------------------------------------------------

class TestHeaderForwarding:
    @patch("app.requests.request")
    def test_forwards_user_id_and_role(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/registrations/my", headers=student_headers)
        call_kwargs = mock_req.call_args
        forwarded = call_kwargs.kwargs["headers"] if "headers" in call_kwargs.kwargs else call_kwargs[1].get("headers", {})
        assert forwarded.get("X-User-ID") == "1"
        assert forwarded.get("X-User-Role") == "student"

    @patch("app.requests.request")
    def test_forwards_user_email(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/registrations/my", headers=student_headers)
        call_kwargs = mock_req.call_args
        forwarded = call_kwargs.kwargs["headers"] if "headers" in call_kwargs.kwargs else call_kwargs[1].get("headers", {})
        assert forwarded.get("X-User-Email") == "student@test.com"

    @patch("app.requests.request")
    def test_generates_request_id(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/registrations/my", headers=student_headers)
        call_kwargs = mock_req.call_args
        forwarded = call_kwargs.kwargs["headers"] if "headers" in call_kwargs.kwargs else call_kwargs[1].get("headers", {})
        assert "X-Request-ID" in forwarded
        assert len(forwarded["X-Request-ID"]) > 0

    @patch("app.requests.request")
    def test_forwards_existing_request_id(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        headers = {**student_headers, "X-Request-ID": "my-trace-id-123"}
        client.get("/registrations/my", headers=headers)
        call_kwargs = mock_req.call_args
        forwarded = call_kwargs.kwargs["headers"] if "headers" in call_kwargs.kwargs else call_kwargs[1].get("headers", {})
        assert forwarded["X-Request-ID"] == "my-trace-id-123"

    @patch("app.requests.request")
    def test_forwards_x_forwarded_for(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/registrations/my", headers=student_headers)
        call_kwargs = mock_req.call_args
        forwarded = call_kwargs.kwargs["headers"] if "headers" in call_kwargs.kwargs else call_kwargs[1].get("headers", {})
        assert "X-Forwarded-For" in forwarded


# ---------------------------------------------------------------------------
# Proxy error handling
# ---------------------------------------------------------------------------

class TestProxyErrors:
    @patch("app.requests.request", side_effect=real_requests.ConnectionError("down"))
    def test_connection_error_returns_502(self, mock_req, client, student_headers):
        resp = client.get("/registrations/my", headers=student_headers)
        assert resp.status_code == 502
        assert "unavailable" in resp.get_json()["error"].lower()

    @patch("app.requests.request", side_effect=real_requests.Timeout("slow"))
    def test_timeout_returns_504(self, mock_req, client, student_headers):
        resp = client.get("/registrations/my", headers=student_headers)
        assert resp.status_code == 504
        assert "timed out" in resp.get_json()["error"].lower()


# ---------------------------------------------------------------------------
# Content-Disposition passthrough (CSV export)
# ---------------------------------------------------------------------------

class TestContentDisposition:
    @patch("app.requests.request")
    def test_content_disposition_forwarded(self, mock_req, client, organizer_headers):
        mock_req.return_value = MagicMock(
            content=b"Name,Email\nJohn,john@test.com",
            status_code=200,
            headers={
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="participants.csv"',
            },
        )
        resp = client.get("/registrations/1/participants/export", headers=organizer_headers)
        assert resp.status_code == 200
        assert "Content-Disposition" in resp.headers
        assert "participants.csv" in resp.headers["Content-Disposition"]


# ---------------------------------------------------------------------------
# Route proxying
# ---------------------------------------------------------------------------

class TestRouteProxying:
    @patch("app.requests.request")
    def test_events_proxy_to_event_service(self, mock_req, client):
        mock_req.return_value = MagicMock(
            content=b'{"events":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/events/")
        call_args = mock_req.call_args
        assert "event-mock:5002" in call_args.kwargs.get("url", call_args[1].get("url", ""))

    @patch("app.requests.request")
    def test_registrations_proxy_to_reg_service(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{"registrations":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/registrations/my", headers=student_headers)
        call_args = mock_req.call_args
        assert "reg-mock:5003" in call_args.kwargs.get("url", call_args[1].get("url", ""))

    @patch("app.requests.request")
    def test_admin_proxy_to_admin_service(self, mock_req, client, admin_headers):
        mock_req.return_value = MagicMock(
            content=b'{"users":[]}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/admin/users", headers=admin_headers)
        call_args = mock_req.call_args
        assert "admin-mock:5004" in call_args.kwargs.get("url", call_args[1].get("url", ""))

    @patch("app.requests.request")
    def test_auth_proxy_to_auth_service(self, mock_req, client, student_headers):
        mock_req.return_value = MagicMock(
            content=b'{"user":{}}', status_code=200,
            headers={"Content-Type": "application/json"},
        )
        client.get("/auth/me", headers=student_headers)
        call_args = mock_req.call_args
        assert "auth-mock:5001" in call_args.kwargs.get("url", call_args[1].get("url", ""))
