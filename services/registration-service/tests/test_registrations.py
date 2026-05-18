"""
Tests for registration endpoints:
  POST   /registrations/
  POST   /registrations/<event_id>/register
  DELETE /registrations/<event_id>/register
  GET    /registrations/<id>
  GET    /registrations/my
  GET    /registrations/<event_id>/status
  POST   /registrations/<event_id>/waitlist
  DELETE /registrations/<event_id>/waitlist
  GET    /registrations/<event_id>/waitlist
  GET    /registrations/<event_id>/participants
  GET    /registrations/<event_id>/participants/export
  POST   /registrations/<event_id>/checkin/<user_id>
  DELETE /registrations/<event_id>/checkin/<user_id>
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

    def test_response_contains_event_info(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        data = resp.get_json()
        assert "event" in data
        assert data["event"]["title"] == "Tech Talk 2026"
        assert "registered_count" in data["event"]
        assert "available_spots" in data["event"]
        assert "email_sent" in data

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

    def test_duplicate_registration_returns_400(self, client, user_headers, mock_event, registration):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.status_code == 400
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

    def test_full_event_returns_400_with_waitlist_hint(self, client, user_headers, another_user_headers, app):
        full_event = {**BASE_EVENT, "id": 5, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/", json={"event_id": 5}, headers=user_headers)
            r2 = client.post("/registrations/", json={"event_id": 5}, headers=another_user_headers)
            assert r2.status_code == 400
            data = r2.get_json()
            assert "full capacity" in data["error"].lower()
            assert data["can_waitlist"] is True

    def test_event_ended_returns_400(self, client, user_headers, app):
        ended_event = {**BASE_EVENT, "id": 30, "end_datetime": "2020-01-01T00:00:00Z"}
        with patch("app.routes.registrations.get_event", return_value=ended_event):
            resp = client.post("/registrations/", json={"event_id": 30}, headers=user_headers)
            assert resp.status_code == 400
            assert "ended" in resp.get_json()["error"].lower()

    def test_deadline_passed_returns_400(self, client, user_headers, app):
        dl_event = {**BASE_EVENT, "id": 31, "registration_deadline": "2020-01-01T00:00:00Z"}
        with patch("app.routes.registrations.get_event", return_value=dl_event):
            resp = client.post("/registrations/", json={"event_id": 31}, headers=user_headers)
            assert resp.status_code == 400
            assert "deadline" in resp.get_json()["error"].lower()


# ---------------------------------------------------------------------------
# POST /registrations/<event_id>/register — path-param register
# ---------------------------------------------------------------------------

class TestRegisterByPath:
    def test_register_via_path(self, client, user_headers, mock_event):
        resp = client.post("/registrations/1/register", headers=user_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["registration"]["event_id"] == 1
        assert data["registration"]["status"] == "registered"

    def test_duplicate_returns_400(self, client, user_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.post("/registrations/1/register", headers=user_headers)
        assert resp.status_code == 400

    def test_event_not_found_returns_404(self, client, user_headers, mock_event_not_found):
        resp = client.post("/registrations/999/register", headers=user_headers)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /registrations/<event_id>/register — cancel by event
# ---------------------------------------------------------------------------

class TestCancelByEvent:
    def test_cancel_via_event_path(self, client, user_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.delete("/registrations/1/register", headers=user_headers)
        assert resp.status_code == 200
        assert resp.get_json()["registration"]["status"] == "cancelled"
        assert "waitlist_promotion" in resp.get_json()

    def test_cancel_not_registered_returns_400(self, client, user_headers, mock_event):
        resp = client.delete("/registrations/1/register", headers=user_headers)
        assert resp.status_code == 400

    def test_cancel_promotes_waitlisted(self, client, user_headers, another_user_headers, app):
        full_event = {**BASE_EVENT, "id": 40, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/40/register", headers=user_headers)
            client.post("/registrations/40/waitlist", headers=another_user_headers)
            resp = client.delete("/registrations/40/register", headers=user_headers)
            assert resp.status_code == 200
            promo = resp.get_json()["waitlist_promotion"]
            assert promo["promoted"] is True
            assert promo["promoted_user_id"] == 2

    def test_double_cancel_returns_400(self, client, user_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        client.delete("/registrations/1/register", headers=user_headers)
        resp = client.delete("/registrations/1/register", headers=user_headers)
        assert resp.status_code == 400
        assert "already cancelled" in resp.get_json()["error"].lower()


# ---------------------------------------------------------------------------
# GET /registrations/<event_id>/status
# ---------------------------------------------------------------------------

class TestRegistrationStatus:
    def test_status_when_registered(self, client, user_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/status", headers=user_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_registered"] is True
        assert data["status"] == "registered"
        assert "registration_id" in data

    def test_status_when_not_registered(self, client, user_headers, mock_event):
        resp = client.get("/registrations/1/status", headers=user_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_registered"] is False
        assert data["status"] is None
        assert "event" in data
        assert "can_register" in data["event"]

    def test_status_when_waitlisted(self, client, user_headers, another_user_headers, app):
        full_event = {**BASE_EVENT, "id": 50, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/50/register", headers=user_headers)
            client.post("/registrations/50/waitlist", headers=another_user_headers)
            resp = client.get("/registrations/50/status", headers=another_user_headers)
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["is_registered"] is False
            assert data["status"] == "waitlisted"
            assert data["waitlist_position"] == 1

    def test_status_when_cancelled(self, client, user_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        client.delete("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/status", headers=user_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["is_registered"] is False
        assert data["status"] is None

    def test_status_unauthenticated_returns_401(self, client):
        resp = client.get("/registrations/1/status")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Capacity check
# ---------------------------------------------------------------------------

class TestCapacityCheck:
    def test_register_within_capacity(self, client, user_headers, mock_event):
        resp = client.post("/registrations/", json={"event_id": 1}, headers=user_headers)
        assert resp.status_code == 201

    def test_cancel_promotes_first_waitlisted_user(
        self, client, user_headers, another_user_headers, app
    ):
        full_event = {**BASE_EVENT, "id": 20, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            r1 = client.post("/registrations/", json={"event_id": 20}, headers=user_headers)
            reg1_id = r1.get_json()["registration"]["id"]
            client.post("/registrations/20/waitlist", headers=another_user_headers)
            client.post(f"/registrations/{reg1_id}/cancel", headers=user_headers)
            status = client.get("/registrations/20/status", headers=another_user_headers)
            assert status.get_json()["status"] == "registered"

    def test_waitlist_is_fifo(
        self, client, user_headers, another_user_headers, organizer_headers, app
    ):
        full_event = {**BASE_EVENT, "id": 21, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            r1 = client.post("/registrations/", json={"event_id": 21}, headers=user_headers)
            reg1_id = r1.get_json()["registration"]["id"]
            client.post("/registrations/21/waitlist", headers=another_user_headers)
            client.post("/registrations/21/waitlist", headers=organizer_headers)
            client.post(f"/registrations/{reg1_id}/cancel", headers=user_headers)
            # user2 (another_user) should be promoted
            status2 = client.get("/registrations/21/status", headers=another_user_headers)
            assert status2.get_json()["status"] == "registered"
            # user3 (organizer) should still be waitlisted
            status3 = client.get("/registrations/21/status", headers=organizer_headers)
            assert status3.get_json()["status"] == "waitlisted"

    def test_cancel_with_no_waitlist_just_cancels(self, client, user_headers, app):
        event = {**BASE_EVENT, "id": 22, "capacity": 5}
        with patch("app.routes.registrations.get_event", return_value=event):
            r1 = client.post("/registrations/", json={"event_id": 22}, headers=user_headers)
            reg_id = r1.get_json()["registration"]["id"]
            cancel_resp = client.post(f"/registrations/{reg_id}/cancel", headers=user_headers)
            assert cancel_resp.status_code == 200
            assert cancel_resp.get_json()["registration"]["status"] == "cancelled"
            assert cancel_resp.get_json()["waitlist_promotion"]["promoted"] is False

    def test_unlimited_event_always_accepts(self, client, user_headers, mock_unlimited_event):
        resp = client.post(
            "/registrations/", json={"event_id": UNLIMITED_EVENT["id"]}, headers=user_headers
        )
        assert resp.status_code == 201

    def test_cancelled_spot_frees_capacity(self, client, user_headers, another_user_headers, app):
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

    def test_pagination_fields(self, client, user_headers, registration):
        resp = client.get("/registrations/my", headers=user_headers)
        data = resp.get_json()
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        assert "pages" in data

    def test_status_filter(self, client, user_headers, mock_event, registration):
        # Cancel the registration
        client.post(f"/registrations/{registration['id']}/cancel", headers=user_headers)
        # Filter by cancelled
        resp = client.get("/registrations/my?status=cancelled", headers=user_headers)
        regs = resp.get_json()["registrations"]
        assert len(regs) == 1
        assert regs[0]["status"] == "cancelled"
        # Filter by registered should be empty
        resp2 = client.get("/registrations/my?status=registered", headers=user_headers)
        assert len(resp2.get_json()["registrations"]) == 0

    def test_invalid_status_filter_returns_400(self, client, user_headers):
        resp = client.get("/registrations/my?status=invalid", headers=user_headers)
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Waitlist endpoints
# ---------------------------------------------------------------------------

class TestWaitlist:
    def test_join_waitlist_when_full(self, client, user_headers, another_user_headers, app):
        full_event = {**BASE_EVENT, "id": 60, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/60/register", headers=user_headers)
            resp = client.post("/registrations/60/waitlist", headers=another_user_headers)
            assert resp.status_code == 201
            data = resp.get_json()
            assert data["registration"]["status"] == "waitlisted"
            assert data["waitlist_position"] == 1
            assert "email_sent" in data

    def test_cannot_waitlist_when_not_full(self, client, user_headers, mock_event):
        resp = client.post("/registrations/1/waitlist", headers=user_headers)
        assert resp.status_code == 400
        assert "not at full capacity" in resp.get_json()["error"].lower()

    def test_cannot_waitlist_twice(self, client, user_headers, another_user_headers, app):
        full_event = {**BASE_EVENT, "id": 61, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/61/register", headers=user_headers)
            client.post("/registrations/61/waitlist", headers=another_user_headers)
            resp = client.post("/registrations/61/waitlist", headers=another_user_headers)
            assert resp.status_code == 400
            assert "already on the waitlist" in resp.get_json()["error"].lower()

    def test_cannot_waitlist_if_registered(self, client, user_headers, app):
        full_event = {**BASE_EVENT, "id": 62, "capacity": 10}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/62/register", headers=user_headers)
        full_event2 = {**BASE_EVENT, "id": 62, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event2):
            resp = client.post("/registrations/62/waitlist", headers=user_headers)
            assert resp.status_code == 400
            assert "already registered" in resp.get_json()["error"].lower()

    def test_leave_waitlist(self, client, user_headers, another_user_headers, app):
        full_event = {**BASE_EVENT, "id": 63, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/63/register", headers=user_headers)
            client.post("/registrations/63/waitlist", headers=another_user_headers)
            resp = client.delete("/registrations/63/waitlist", headers=another_user_headers)
            assert resp.status_code == 200
            assert resp.get_json()["registration"]["status"] == "cancelled"

    def test_leave_waitlist_not_on_waitlist_returns_400(self, client, user_headers):
        resp = client.delete("/registrations/999/waitlist", headers=user_headers)
        assert resp.status_code == 400

    def test_view_waitlist_organizer(self, client, user_headers, another_user_headers, organizer_headers, app):
        full_event = {**BASE_EVENT, "id": 64, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/64/register", headers=user_headers)
            client.post("/registrations/64/waitlist", headers=another_user_headers)
            resp = client.get("/registrations/64/waitlist", headers=organizer_headers)
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["total"] == 1
            assert data["waitlist"][0]["position"] == 1
            assert data["waitlist"][0]["user"]["id"] == 2

    def test_view_waitlist_student_forbidden(self, client, user_headers):
        resp = client.get("/registrations/1/waitlist", headers=user_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Participants endpoints
# ---------------------------------------------------------------------------

class TestParticipants:
    def test_list_participants(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/participants", headers=organizer_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "participants" in data
        assert "summary" in data
        assert data["summary"]["total_registered"] == 1
        assert "total" in data
        assert "page" in data

    def test_participants_summary_counts(self, client, user_headers, another_user_headers, organizer_headers, app):
        event = {**BASE_EVENT, "id": 70, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=event):
            client.post("/registrations/70/register", headers=user_headers)
            client.post("/registrations/70/waitlist", headers=another_user_headers)
            resp = client.get("/registrations/70/participants", headers=organizer_headers)
            summary = resp.get_json()["summary"]
            assert summary["total_registered"] == 1
            assert summary["total_waitlisted"] == 1
            assert summary["capacity"] == 1

    def test_participants_status_filter(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/participants?status=waitlisted", headers=organizer_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["participants"]) == 0

    def test_participants_search_filter(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/participants?search=user@test", headers=organizer_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["participants"]) == 1

    def test_participants_student_forbidden(self, client, user_headers, mock_event):
        resp = client.get("/registrations/1/participants", headers=user_headers)
        assert resp.status_code == 403

    def test_participants_admin_allowed(self, client, user_headers, admin_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/participants", headers=admin_headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Participants export
# ---------------------------------------------------------------------------

class TestParticipantsExport:
    def test_export_csv(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/participants/export", headers=organizer_headers)
        assert resp.status_code == 200
        assert "text/csv" in resp.content_type
        csv_text = resp.data.decode("utf-8")
        assert "Email" in csv_text
        assert "Status" in csv_text
        assert "user@test.com" in csv_text

    def test_export_csv_filename(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/participants/export", headers=organizer_headers)
        assert "attachment" in resp.headers.get("Content-Disposition", "")
        assert "participants.csv" in resp.headers.get("Content-Disposition", "")

    def test_export_student_forbidden(self, client, user_headers):
        resp = client.get("/registrations/1/participants/export", headers=user_headers)
        assert resp.status_code == 403

    def test_export_with_status_filter(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.get("/registrations/1/participants/export?status=waitlisted", headers=organizer_headers)
        assert resp.status_code == 200
        lines = resp.data.decode("utf-8").strip().split("\n")
        assert len(lines) == 1  # Only header, no data rows


# ---------------------------------------------------------------------------
# Check-in endpoints
# ---------------------------------------------------------------------------

class TestCheckin:
    def test_checkin_participant(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.post("/registrations/1/checkin/1", headers=organizer_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["registration"]["status"] == "attended"
        assert data["registration"]["checked_in"] is True
        assert data["registration"]["checked_in_at"] is not None

    def test_checkin_not_registered_returns_400(self, client, organizer_headers):
        resp = client.post("/registrations/1/checkin/999", headers=organizer_headers)
        assert resp.status_code == 400

    def test_double_checkin_returns_400(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        client.post("/registrations/1/checkin/1", headers=organizer_headers)
        resp = client.post("/registrations/1/checkin/1", headers=organizer_headers)
        assert resp.status_code == 400
        assert "already checked in" in resp.get_json()["error"].lower()

    def test_checkin_student_forbidden(self, client, user_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.post("/registrations/1/checkin/1", headers=user_headers)
        assert resp.status_code == 403

    def test_admin_can_checkin(self, client, user_headers, admin_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.post("/registrations/1/checkin/1", headers=admin_headers)
        assert resp.status_code == 200

    def test_undo_checkin(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        client.post("/registrations/1/checkin/1", headers=organizer_headers)
        resp = client.delete("/registrations/1/checkin/1", headers=organizer_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["registration"]["status"] == "registered"
        assert data["registration"]["checked_in"] is False

    def test_undo_checkin_not_attended_returns_400(self, client, user_headers, organizer_headers, mock_event):
        client.post("/registrations/1/register", headers=user_headers)
        resp = client.delete("/registrations/1/checkin/1", headers=organizer_headers)
        assert resp.status_code == 400

    def test_undo_checkin_student_forbidden(self, client, user_headers, mock_event):
        resp = client.delete("/registrations/1/checkin/1", headers=user_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /registrations/event/<id>  (legacy)
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


# ---------------------------------------------------------------------------
# POST /registrations/<id>/cancel  (legacy)
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

    def test_cancel_response_includes_waitlist_promotion(self, client, user_headers, registration):
        resp = client.post(
            f"/registrations/{registration['id']}/cancel", headers=user_headers
        )
        data = resp.get_json()
        assert "waitlist_promotion" in data
        assert data["waitlist_promotion"]["promoted"] is False


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_returns_full_info(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"
        assert data["service"] == "registration-service"
        assert data["version"] == "1.0"
        assert data["database"] == "connected"
