"""
Tests for event validation endpoints:
  GET   /admin/events/pending
  GET   /admin/events/all
  POST  /admin/events/<id>/validate
  POST  /admin/events/<id>/reject
  POST  /admin/events/<id>/publish
"""


class TestPendingEvents:
    def test_admin_can_list_pending(self, client, admin_headers, sample_event):
        resp = client.get("/admin/events/pending", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "events" in data
        assert "total" in data

    def test_pending_contains_unpublished_event(self, client, admin_headers, sample_event):
        resp = client.get("/admin/events/pending", headers=admin_headers)
        ids = [e["id"] for e in resp.get_json()["events"]]
        assert sample_event["id"] in ids

    def test_published_event_not_in_pending(self, client, admin_headers, published_event):
        resp = client.get("/admin/events/pending", headers=admin_headers)
        ids = [e["id"] for e in resp.get_json()["events"]]
        assert published_event["id"] not in ids

    def test_rejected_event_not_in_pending(self, client, admin_headers, sample_event):
        client.post(
            f"/admin/events/{sample_event['id']}/reject",
            json={"reason": "Inappropriate content"},
            headers=admin_headers,
        )
        resp = client.get("/admin/events/pending", headers=admin_headers)
        ids = [e["id"] for e in resp.get_json()["events"]]
        assert sample_event["id"] not in ids

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/events/pending", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/events/pending")
        assert resp.status_code == 401


class TestAllEvents:
    def test_admin_can_list_all_events(self, client, admin_headers, sample_event, published_event):
        resp = client.get("/admin/events/all", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "events" in data
        assert "total" in data
        ids = [e["id"] for e in data["events"]]
        assert sample_event["id"] in ids
        assert published_event["id"] in ids

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/events/all", headers=student_headers)
        assert resp.status_code == 403


class TestValidateEvent:
    def test_admin_can_validate_event(self, client, admin_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/validate", headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["event"]["is_published"] is True

    def test_validated_event_is_published(self, client, admin_headers, sample_event):
        client.post(f"/admin/events/{sample_event['id']}/validate", headers=admin_headers)
        resp = client.get("/admin/events/pending", headers=admin_headers)
        ids = [e["id"] for e in resp.get_json()["events"]]
        assert sample_event["id"] not in ids

    def test_validate_nonexistent_returns_404(self, client, admin_headers):
        resp = client.post("/admin/events/99999/validate", headers=admin_headers)
        assert resp.status_code == 404

    def test_non_admin_cannot_validate(self, client, student_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/validate", headers=student_headers
        )
        assert resp.status_code == 403


class TestRejectEvent:
    def test_admin_can_reject_event(self, client, admin_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/reject",
            json={"reason": "Content does not meet guidelines"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["rejection_reason"] == "Content does not meet guidelines"

    def test_reject_without_reason_returns_400(self, client, admin_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/reject",
            json={},
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "reason" in resp.get_json()["error"].lower()

    def test_reject_with_empty_reason_returns_400(self, client, admin_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/reject",
            json={"reason": "   "},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_rejected_event_stays_unpublished(self, client, admin_headers, sample_event):
        client.post(
            f"/admin/events/{sample_event['id']}/reject",
            json={"reason": "Invalid"},
            headers=admin_headers,
        )
        resp = client.post(
            f"/admin/events/{sample_event['id']}/validate", headers=admin_headers
        )
        # Can still be validated after rejection (admin decision can change)
        assert resp.status_code == 200

    def test_reject_nonexistent_returns_404(self, client, admin_headers):
        resp = client.post(
            "/admin/events/99999/reject",
            json={"reason": "Not found"},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_non_admin_cannot_reject(self, client, student_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/reject",
            json={"reason": "Reason"},
            headers=student_headers,
        )
        assert resp.status_code == 403


class TestPublishEvent:
    def test_admin_can_publish_event(self, client, admin_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/publish", headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["event"]["is_published"] is True

    def test_publish_nonexistent_returns_404(self, client, admin_headers):
        resp = client.post("/admin/events/99999/publish", headers=admin_headers)
        assert resp.status_code == 404

    def test_non_admin_cannot_publish(self, client, organizer_headers, sample_event):
        resp = client.post(
            f"/admin/events/{sample_event['id']}/publish", headers=organizer_headers
        )
        assert resp.status_code == 403
