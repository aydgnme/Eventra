"""
Tests for feedback endpoints:
  POST   /feedback/
  GET    /feedback/event/<id>
  GET    /feedback/my
  DELETE /feedback/<id>
"""
from unittest.mock import patch

from .conftest import BASE_EVENT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(client, headers, event_id=BASE_EVENT["id"]):
    """Register the user for an event and return the registration dict."""
    with patch("app.routes.registrations.get_event", return_value={**BASE_EVENT, "id": event_id}):
        resp = client.post(
            "/registrations/",
            json={"event_id": event_id},
            headers=headers,
        )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["registration"]


def _feedback(client, headers, event_id=BASE_EVENT["id"], rating=4, comment="Great event"):
    """Submit feedback and return the feedback dict."""
    resp = client.post(
        "/feedback/",
        json={"event_id": event_id, "rating": rating, "comment": comment},
        headers=headers,
    )
    return resp


# ---------------------------------------------------------------------------
# POST /feedback/
# ---------------------------------------------------------------------------

class TestSubmitFeedback:
    def test_registered_user_can_submit(self, client, user_headers):
        _register(client, user_headers)
        resp = _feedback(client, user_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert "feedback" in data
        assert data["feedback"]["rating"] == 4
        assert data["feedback"]["user_id"] == 1
        assert data["feedback"]["event_id"] == BASE_EVENT["id"]

    def test_comment_is_optional(self, client, user_headers):
        _register(client, user_headers)
        resp = client.post(
            "/feedback/",
            json={"event_id": BASE_EVENT["id"], "rating": 3},
            headers=user_headers,
        )
        assert resp.status_code == 201
        assert resp.get_json()["feedback"]["comment"] is None

    def test_unregistered_user_cannot_submit(self, client, user_headers):
        resp = _feedback(client, user_headers)
        assert resp.status_code == 403
        assert "registered" in resp.get_json()["error"].lower()

    def test_waitlisted_user_cannot_submit(self, client, user_headers, another_user_headers, app):
        """Waitlisted user (not confirmed) cannot submit feedback."""
        full_event = {**BASE_EVENT, "id": 30, "capacity": 1}
        with patch("app.routes.registrations.get_event", return_value=full_event):
            client.post("/registrations/", json={"event_id": 30}, headers=user_headers)
            client.post("/registrations/", json={"event_id": 30}, headers=another_user_headers)
        resp = client.post(
            "/feedback/",
            json={"event_id": 30, "rating": 5},
            headers=another_user_headers,
        )
        assert resp.status_code == 403

    def test_duplicate_feedback_returns_409(self, client, user_headers):
        _register(client, user_headers)
        _feedback(client, user_headers)
        resp = _feedback(client, user_headers)
        assert resp.status_code == 409
        assert "already" in resp.get_json()["error"].lower()

    def test_missing_event_id_returns_400(self, client, user_headers):
        resp = client.post("/feedback/", json={"rating": 4}, headers=user_headers)
        assert resp.status_code == 400
        assert "event_id" in resp.get_json()["error"]

    def test_missing_rating_returns_400(self, client, user_headers):
        resp = client.post(
            "/feedback/", json={"event_id": BASE_EVENT["id"]}, headers=user_headers
        )
        assert resp.status_code == 400
        assert "rating" in resp.get_json()["error"]

    def test_rating_below_1_returns_400(self, client, user_headers):
        _register(client, user_headers)
        resp = client.post(
            "/feedback/",
            json={"event_id": BASE_EVENT["id"], "rating": 0},
            headers=user_headers,
        )
        assert resp.status_code == 400

    def test_rating_above_5_returns_400(self, client, user_headers):
        _register(client, user_headers)
        resp = client.post(
            "/feedback/",
            json={"event_id": BASE_EVENT["id"], "rating": 6},
            headers=user_headers,
        )
        assert resp.status_code == 400

    def test_rating_float_returns_400(self, client, user_headers):
        _register(client, user_headers)
        resp = client.post(
            "/feedback/",
            json={"event_id": BASE_EVENT["id"], "rating": 4.5},
            headers=user_headers,
        )
        assert resp.status_code == 400

    def test_no_body_returns_400(self, client, user_headers):
        resp = client.post("/feedback/", headers=user_headers)
        assert resp.status_code in (400, 415)

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/feedback/", json={"event_id": 1, "rating": 4})
        assert resp.status_code == 401

    def test_cancelled_registration_cannot_submit(self, client, user_headers):
        reg = _register(client, user_headers)
        client.post(f"/registrations/{reg['id']}/cancel", headers=user_headers)
        resp = _feedback(client, user_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /feedback/event/<id>
# ---------------------------------------------------------------------------

class TestEventFeedback:
    def test_returns_empty_for_event_with_no_feedback(self, client):
        resp = client.get("/feedback/event/999")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["feedback"] == []
        assert data["count"] == 0
        assert data["average_rating"] is None

    def test_returns_submitted_feedback(self, client, user_headers):
        _register(client, user_headers)
        _feedback(client, user_headers, rating=5)
        resp = client.get(f"/feedback/event/{BASE_EVENT['id']}")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["count"] == 1
        assert data["feedback"][0]["rating"] == 5

    def test_average_rating_is_correct(self, client, user_headers, another_user_headers, app):
        event = {**BASE_EVENT, "id": 31, "capacity": 10}
        with patch("app.routes.registrations.get_event", return_value=event):
            client.post("/registrations/", json={"event_id": 31}, headers=user_headers)
            client.post("/registrations/", json={"event_id": 31}, headers=another_user_headers)
        client.post("/feedback/", json={"event_id": 31, "rating": 4}, headers=user_headers)
        client.post("/feedback/", json={"event_id": 31, "rating": 2}, headers=another_user_headers)
        resp = client.get("/feedback/event/31")
        assert resp.get_json()["average_rating"] == 3.0
        assert resp.get_json()["count"] == 2

    def test_no_auth_required(self, client, user_headers):
        _register(client, user_headers)
        _feedback(client, user_headers)
        resp = client.get(f"/feedback/event/{BASE_EVENT['id']}")
        assert resp.status_code == 200

    def test_includes_event_id(self, client):
        resp = client.get("/feedback/event/42")
        assert resp.get_json()["event_id"] == 42


# ---------------------------------------------------------------------------
# GET /feedback/my
# ---------------------------------------------------------------------------

class TestMyFeedback:
    def test_returns_own_feedback(self, client, user_headers):
        _register(client, user_headers)
        _feedback(client, user_headers)
        resp = client.get("/feedback/my", headers=user_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["feedback"]) == 1

    def test_returns_empty_for_new_user(self, client, another_user_headers):
        resp = client.get("/feedback/my", headers=another_user_headers)
        assert resp.status_code == 200
        assert resp.get_json()["feedback"] == []

    def test_does_not_include_other_users_feedback(self, client, user_headers, another_user_headers, app):
        event = {**BASE_EVENT, "id": 32, "capacity": 10}
        with patch("app.routes.registrations.get_event", return_value=event):
            client.post("/registrations/", json={"event_id": 32}, headers=user_headers)
        client.post("/feedback/", json={"event_id": 32, "rating": 4}, headers=user_headers)
        resp = client.get("/feedback/my", headers=another_user_headers)
        assert resp.get_json()["feedback"] == []

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/feedback/my")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /feedback/<id>
# ---------------------------------------------------------------------------

class TestDeleteFeedback:
    def test_user_can_delete_own_feedback(self, client, user_headers):
        _register(client, user_headers)
        fb = _feedback(client, user_headers).get_json()["feedback"]
        resp = client.delete(f"/feedback/{fb['id']}", headers=user_headers)
        assert resp.status_code == 200
        assert "deleted" in resp.get_json()["message"].lower()

    def test_deleted_feedback_no_longer_appears(self, client, user_headers):
        _register(client, user_headers)
        fb = _feedback(client, user_headers).get_json()["feedback"]
        client.delete(f"/feedback/{fb['id']}", headers=user_headers)
        resp = client.get("/feedback/my", headers=user_headers)
        assert resp.get_json()["feedback"] == []

    def test_other_user_cannot_delete(self, client, user_headers, another_user_headers):
        _register(client, user_headers)
        fb = _feedback(client, user_headers).get_json()["feedback"]
        resp = client.delete(f"/feedback/{fb['id']}", headers=another_user_headers)
        assert resp.status_code == 403

    def test_nonexistent_returns_404(self, client, user_headers):
        resp = client.delete("/feedback/99999", headers=user_headers)
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        resp = client.delete("/feedback/1")
        assert resp.status_code == 401

    def test_can_resubmit_after_delete(self, client, user_headers):
        """After deleting feedback, user can submit a new one."""
        _register(client, user_headers)
        fb = _feedback(client, user_headers).get_json()["feedback"]
        client.delete(f"/feedback/{fb['id']}", headers=user_headers)
        resp = _feedback(client, user_headers, rating=2)
        assert resp.status_code == 201
        assert resp.get_json()["feedback"]["rating"] == 2
