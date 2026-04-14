"""
Tests for registration endpoints:
  POST   /registrations/
  GET    /registrations/<id>
  GET    /registrations/my
  GET    /registrations/event/<id>
  GET    /registrations/event/<id>/count
  POST   /registrations/<id>/cancel
"""
from unittest.mock import patch

from .conftest import BASE_EVENT, UNLIMITED_EVENT


# ---------------------------------------------------------------------------
# POST /registrations/  — register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_user_can_register(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.status_code == 201

    def test_response_contains_registration(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        data = resp.get_json()
        assert "registration" in data
        assert data["registration"]["event_id"] == 1
        assert data["registration"]["user_id"] == 1
        assert data["registration"]["status"] == "registered"

    def test_unauthenticated_cannot_register(self, client, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1})
        assert resp.status_code == 401

    def test_missing_event_id_returns_400(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={}, headers=user_headers)
        assert resp.status_code == 400
        assert "event_id" in resp.get_json()["error"]

    def test_no_body_returns_400(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", headers=user_headers)
        assert resp.status_code in (400, 415)

    def test_event_not_found_returns_404(self, client, user_headers, mock_event_not_found):
        resp = client.post("/registrations/", json={"event_id": 999}, headers=user_headers)
        assert resp.status_code == 404
        assert "not found" in resp.get_json()["error"].lower()

    def test_event_service_down_returns_503(self, client, user_headers, mock_event_service_down):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.status_code == 503

    def test_duplicate_registration_returns_409(self, client, user_headers, mock_event, registration):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.status_code == 409
        assert "already registered" in resp.get_json()["error"].lower()

    def test_different_users_can_register_same_event(
        self, client, user_headers, another_user_headers, mock_event
    ):
        r1 = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        r2 = client.post("/registrations/", json={"event_id": 1}, headers=another_user_headers)
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_same_user_can_register_different_events(self, client, user_headers, app):
        with patch("app.routes.registrations.get_event", return_value={**BASE_EVENT, "id": 1}):
            r1 = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        with patch("app.routes.registrations.get_event", return_value={**BASE_EVENT, "id": 2}):
            r2 = client.post("/registrations/", json={"event_id": 2}, headers=user_headers)
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_registered_at_is_set(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.get_json()["registration"]["registered_at"] is not None

    def test_cancelled_at_is_null_on_register(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.get_json()["registration"]["cancelled_at"] is None


# ---------------------------------------------------------------------------
# Capacity check
# ---------------------------------------------------------------------------

class TestCapacityCheck:
    def test_register_within_capacity(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.status_code == 201

    def test_full_event_places_user_on_waitlist(
        self, client, user_headers, another_user_headers, app
    ):
        """Capacity=1: first user registers (REGISTERED), second gets waitlisted (201 WAITLISTED)."""
        full_event = {**BASE_EVENT, "id": 5, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            r1 = client.post("/registrations/", json={"event_id": 5}, headers=user_headers)
            assert r1.status_code == 201
            assert r1.get_json()["registration"]["status"] == "registered"
            r2 = client.post("/registrations/", json={"event_id": 5}, headers=another_user_headers)
            assert r2.status_code == 201
            assert r2.get_json()["registration"]["status"] == "waitlisted"

    def test_cancel_promotes_first_waitlisted_user(
        self, client, user_headers, another_user_headers, app
    ):
        """user1 registers, user2 waitlisted, user1 cancels → user2 becomes REGISTERED."""
        full_event = {**BASE_EVENT, "id": 20, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            r1 = client.post("/registrations/", json={"event_id": 20}, headers=user_headers)
            reg1_id = r1.get_json()["registration"]["id"]
            r2 = client.post("/registrations/", json={"event_id": 20}, headers=another_user_headers)
            reg2_id = r2.get_json()["registration"]["id"]
            assert r2.get_json()["registration"]["status"] == "waitlisted"
            client.post(f"/registrations/{reg1_id}/cancel", headers=user_headers)
            promoted = client.get(f"/registrations/{reg2_id}", headers=another_user_headers)
            assert promoted.get_json()["registration"]["status"] == "registered"

    def test_waitlist_is_fifo(
        self, client, user_headers, another_user_headers, organizer_headers, app
    ):
        """user1 registers, user2+user3 join waitlist in order — user1 cancels → only user2 promoted."""
        full_event = {**BASE_EVENT, "id": 21, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            r1 = client.post("/registrations/", json={"event_id": 21}, headers=user_headers)
            reg1_id = r1.get_json()["registration"]["id"]
            r2 = client.post("/registrations/", json={"event_id": 21}, headers=another_user_headers)
            reg2_id = r2.get_json()["registration"]["id"]
            r3 = client.post("/registrations/", json={"event_id": 21}, headers=organizer_headers)
            reg3_id = r3.get_json()["registration"]["id"]
            client.post(f"/registrations/{reg1_id}/cancel", headers=user_headers)
            promoted = client.get(f"/registrations/{reg2_id}", headers=another_user_headers)
            assert promoted.get_json()["registration"]["status"] == "registered"
            still_waiting = client.get(f"/registrations/{reg3_id}", headers=organizer_headers)
            assert still_waiting.get_json()["registration"]["status"] == "waitlisted"

    def test_cancel_with_no_waitlist_just_cancels(self, client, user_headers, app):
        """Cancelling when no waitlist entries exist simply cancels — no errors."""
        event = {**BASE_EVENT, "id": 22, "capacity": 5}
        with patch("app.routes.registrations.get_event", return_value=event):
            r1 = client.post("/registrations/", json={"event_id": 22}, headers=user_headers)
            reg_id = r1.get_json()["registration"]["id"]
            cancel_resp = client.post(f"/registrations/{reg_id}/cancel", headers=user_headers)
            assert cancel_resp.status_code == 200
            assert cancel_resp.get_json()["registration"]["status"] == "cancelled"

    def test_unlimited_event_always_accepts(self, client, user_headers, mock_unlimited_event):
        resp = client.post(
            "/registrations/", json={"event_id": UNLIMITED_EVENT["id"]}, headers=user_headers
        )
        assert resp.status_code == 201

    def test_cancelled_spot_frees_capacity(self, client, user_headers, another_user_headers, app):
        """User cancels → slot frees → another user can register."""
        full_event = {**BASE_EVENT, "id": 6, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            r1 = client.post("/registrations/", json={"event_id": 6}, headers=user_headers)
            reg_id = r1.get_json()["registration"]["id"]
            client.post(f"/registrations/{reg_id}/cancel", headers=user_headers)
            r2 = client.post(
                "/registrations/", json={"event_id": 6}, headers=another_user_headers
            )
            assert r2.status_code == 201

    def test_re_register_after_cancel_within_capacity(self, client, user_headers, app):
        """Cancelled user can re-register if capacity allows."""
        event = {**BASE_EVENT, "id": 7, "capacity": 5}
        with patch("app.routes.registrations.get_event", return_value=event):
            r1 = client.post("/registrations/", json={"event_id": 7}, headers=user_headers)
            reg_id = r1.get_json()["registration"]["id"]
            client.post(f"/registrations/{reg_id}/cancel", headers=user_headers)
            r2 = client.post("/registrations/", json={"event_id": 7}, headers=user_headers)
            assert r2.status_code == 201
            assert r2.get_json()["registration"]["status"] == "registered"


# ---------------------------------------------------------------------------
# GET /registrations/<id>
# ---------------------------------------------------------------------------

class TestGetRegistration:
    def test_user_can_get_own_registration(self, client, user_headers, registration):
        resp = client.get(f"/registrations/{registration['id']}", headers=user_headers)
        assert resp.status_code == 200
        assert resp.get_json()["registration"]["id"] == registration["id"]

    def test_other_user_cannot_get_registration(
        self, client, another_user_headers, registration
    ):
        resp = client.get(f"/registrations/{registration['id']}", headers=another_user_headers)
        assert resp.status_code == 403

    def test_organizer_can_get_any_registration(
        self, client, organizer_headers, registration
    ):
        resp = client.get(f"/registrations/{registration['id']}", headers=organizer_headers)
        assert resp.status_code == 200

    def test_admin_can_get_any_registration(self, client, admin_headers, registration):
        resp = client.get(f"/registrations/{registration['id']}", headers=admin_headers)
        assert resp.status_code == 200

    def test_unauthenticated_returns_401(self, client, registration):
        resp = client.get(f"/registrations/{registration['id']}")
        assert resp.status_code == 401

    def test_nonexistent_returns_404(self, client, user_headers):
        resp = client.get("/registrations/99999", headers=user_headers)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /registrations/my
# ---------------------------------------------------------------------------

class TestMyRegistrations:
    def test_returns_own_registrations(self, client, user_headers, registration):
        resp = client.get("/registrations/my", headers=user_headers)
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.get_json()["registrations"]]
        assert registration["id"] in ids

    def test_returns_empty_for_new_user(self, client, another_user_headers):
        resp = client.get("/registrations/my", headers=another_user_headers)
        assert resp.status_code == 200
        assert resp.get_json()["registrations"] == []

    def test_does_not_include_other_users_registrations(
        self, client, another_user_headers, registration
    ):
        resp = client.get("/registrations/my", headers=another_user_headers)
        ids = [r["id"] for r in resp.get_json()["registrations"]]
        assert registration["id"] not in ids

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/registrations/my")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /registrations/event/<id>
# ---------------------------------------------------------------------------

class TestEventRegistrations:
    def test_organizer_can_list_event_registrations(
        self, client, organizer_headers, registration
    ):
        resp = client.get(
            f"/registrations/event/{registration['event_id']}", headers=organizer_headers
        )
        assert resp.status_code == 200
        assert "registrations" in resp.get_json()
        assert "total" in resp.get_json()

    def test_admin_can_list_event_registrations(
        self, client, admin_headers, registration
    ):
        resp = client.get(
            f"/registrations/event/{registration['event_id']}", headers=admin_headers
        )
        assert resp.status_code == 200

    def test_student_cannot_list_event_registrations(
        self, client, user_headers, registration
    ):
        resp = client.get(
            f"/registrations/event/{registration['event_id']}", headers=user_headers
        )
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client, registration):
        resp = client.get(f"/registrations/event/{registration['event_id']}")
        assert resp.status_code == 401

    def test_total_reflects_registrations(
        self, client, organizer_headers, user_headers, another_user_headers, app
    ):
        event = {**BASE_EVENT, "id": 10, "capacity": 5}
        with patch("app.routes.registrations.get_event", return_value=event):
            client.post("/registrations/", json={"event_id": 10}, headers=user_headers)
            client.post("/registrations/", json={"event_id": 10}, headers=another_user_headers)
        resp = client.get("/registrations/event/10", headers=organizer_headers)
        assert resp.get_json()["total"] == 2


# ---------------------------------------------------------------------------
# GET /registrations/event/<id>/count
# ---------------------------------------------------------------------------

class TestEventCount:
    def test_count_returns_zeros_for_empty_event(self, client, user_headers):
        resp = client.get("/registrations/event/999/count", headers=user_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["registered"] == 0
        assert data["waitlisted"] == 0
        assert data["total_active"] == 0

    def test_count_reflects_registrations(self, client, user_headers, registration):
        resp = client.get(
            f"/registrations/event/{registration['event_id']}/count",
            headers=user_headers,
        )
        assert resp.get_json()["registered"] == 1

    def test_cancelled_not_counted(self, client, user_headers, registration):
        client.post(f"/registrations/{registration['id']}/cancel", headers=user_headers)
        resp = client.get(
            f"/registrations/event/{registration['event_id']}/count",
            headers=user_headers,
        )
        assert resp.get_json()["registered"] == 0
        assert resp.get_json()["total_active"] == 0

    def test_unauthenticated_returns_401(self, client, registration):
        resp = client.get(f"/registrations/event/{registration['event_id']}/count")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /registrations/<id>/cancel
# ---------------------------------------------------------------------------

class TestCancelRegistration:
    def test_user_can_cancel_own_registration(self, client, user_headers, registration):
        resp = client.post(
            f"/registrations/{registration['id']}/cancel", headers=user_headers
        )
        assert resp.status_code == 200
        assert "cancelled" in resp.get_json()["message"].lower()

    def test_status_becomes_cancelled(self, client, user_headers, registration):
        client.post(f"/registrations/{registration['id']}/cancel", headers=user_headers)
        resp = client.get(f"/registrations/{registration['id']}", headers=user_headers)
        assert resp.get_json()["registration"]["status"] == "cancelled"

    def test_cancelled_at_is_set(self, client, user_headers, registration):
        client.post(f"/registrations/{registration['id']}/cancel", headers=user_headers)
        resp = client.get(f"/registrations/{registration['id']}", headers=user_headers)
        assert resp.get_json()["registration"]["cancelled_at"] is not None

    def test_admin_can_cancel_any_registration(self, client, admin_headers, registration):
        resp = client.post(
            f"/registrations/{registration['id']}/cancel", headers=admin_headers
        )
        assert resp.status_code == 200

    def test_other_user_cannot_cancel(
        self, client, another_user_headers, registration
    ):
        resp = client.post(
            f"/registrations/{registration['id']}/cancel", headers=another_user_headers
        )
        assert resp.status_code == 403

    def test_double_cancel_returns_400(self, client, user_headers, registration):
        client.post(f"/registrations/{registration['id']}/cancel", headers=user_headers)
        resp = client.post(
            f"/registrations/{registration['id']}/cancel", headers=user_headers
        )
        assert resp.status_code == 400
        assert "already cancelled" in resp.get_json()["error"].lower()

    def test_unauthenticated_cannot_cancel(self, client, registration):
        resp = client.post(f"/registrations/{registration['id']}/cancel")
        assert resp.status_code == 401

    def test_cancel_nonexistent_returns_404(self, client, user_headers):
        resp = client.post("/registrations/99999/cancel", headers=user_headers)
        assert resp.status_code == 404
