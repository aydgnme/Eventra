"""
Tests for Event CRUD endpoints:
  POST   /events/
  GET    /events/<id>
  PUT    /events/<id>
  DELETE /events/<id>
  GET    /events/mine
"""
from .conftest import BASE_EVENT, future_dt


class TestCreateEvent:
    def test_organizer_can_create_event(self, client, organizer_headers):
        resp = client.post("/events/", json=BASE_EVENT, headers=organizer_headers)
        assert resp.status_code == 201

    def test_response_contains_event(self, client, organizer_headers):
        resp = client.post("/events/", json=BASE_EVENT, headers=organizer_headers)
        data = resp.get_json()
        assert "event" in data
        assert data["event"]["title"] == BASE_EVENT["title"]
        assert data["event"]["category"] == "academic"

    def test_organizer_id_set_from_jwt(self, client, organizer_headers):
        resp = client.post("/events/", json=BASE_EVENT, headers=organizer_headers)
        assert resp.get_json()["event"]["organizer_id"] == 1

    def test_is_published_defaults_to_false(self, client, organizer_headers):
        payload = {**BASE_EVENT}
        payload.pop("is_published")
        resp = client.post("/events/", json=payload, headers=organizer_headers)
        assert resp.status_code == 201
        assert resp.get_json()["event"]["is_published"] is False

    def test_admin_can_create_event(self, client, admin_headers):
        resp = client.post("/events/", json=BASE_EVENT, headers=admin_headers)
        assert resp.status_code == 201

    def test_student_cannot_create_event(self, client, student_headers):
        resp = client.post("/events/", json=BASE_EVENT, headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_create_event(self, client):
        resp = client.post("/events/", json=BASE_EVENT)
        assert resp.status_code == 401

    def test_missing_title_returns_400(self, client, organizer_headers):
        payload = {**BASE_EVENT}
        payload.pop("title")
        resp = client.post("/events/", json=payload, headers=organizer_headers)
        assert resp.status_code == 400

    def test_missing_start_datetime_returns_400(self, client, organizer_headers):
        payload = {**BASE_EVENT}
        payload.pop("start_datetime")
        resp = client.post("/events/", json=payload, headers=organizer_headers)
        assert resp.status_code == 400

    def test_missing_end_datetime_returns_400(self, client, organizer_headers):
        payload = {**BASE_EVENT}
        payload.pop("end_datetime")
        resp = client.post("/events/", json=payload, headers=organizer_headers)
        assert resp.status_code == 400

    def test_end_before_start_returns_400(self, client, organizer_headers):
        resp = client.post(
            "/events/",
            json={**BASE_EVENT, "start_datetime": future_dt(10), "end_datetime": future_dt(9)},
            headers=organizer_headers,
        )
        assert resp.status_code == 400
        assert "end_datetime" in resp.get_json()["error"]

    def test_end_equal_start_returns_400(self, client, organizer_headers):
        dt = future_dt(10)
        resp = client.post(
            "/events/",
            json={**BASE_EVENT, "start_datetime": dt, "end_datetime": dt},
            headers=organizer_headers,
        )
        assert resp.status_code == 400

    def test_invalid_datetime_format_returns_400(self, client, organizer_headers):
        resp = client.post(
            "/events/",
            json={**BASE_EVENT, "start_datetime": "not-a-date"},
            headers=organizer_headers,
        )
        assert resp.status_code == 400
        assert "ISO 8601" in resp.get_json()["error"]

    def test_invalid_category_returns_400(self, client, organizer_headers):
        resp = client.post(
            "/events/",
            json={**BASE_EVENT, "category": "invalid_cat"},
            headers=organizer_headers,
        )
        assert resp.status_code == 400
        assert "category" in resp.get_json()["error"].lower()

    def test_invalid_participation_mode_returns_400(self, client, organizer_headers):
        resp = client.post(
            "/events/",
            json={**BASE_EVENT, "participation_mode": "in_space"},
            headers=organizer_headers,
        )
        assert resp.status_code == 400

    def test_no_body_returns_4xx(self, client, organizer_headers):
        resp = client.post("/events/", headers=organizer_headers)
        assert resp.status_code in (400, 415)

    def test_optional_fields_are_nullable(self, client, organizer_headers):
        minimal = {
            "title": "Minimal Event",
            "start_datetime": future_dt(5),
            "end_datetime": future_dt(5, hours=2),
        }
        resp = client.post("/events/", json=minimal, headers=organizer_headers)
        assert resp.status_code == 201
        event = resp.get_json()["event"]
        assert event["description"] is None
        assert event["location"] is None
        assert event["category"] is None


class TestGetEvent:
    def test_get_published_event_unauthenticated(self, client, published_event):
        resp = client.get(f"/events/{published_event['id']}")
        assert resp.status_code == 200
        assert resp.get_json()["event"]["id"] == published_event["id"]

    def test_get_published_event_as_student(self, client, published_event, student_headers):
        resp = client.get(f"/events/{published_event['id']}", headers=student_headers)
        assert resp.status_code == 200

    def test_get_unpublished_event_as_owner(self, client, unpublished_event, organizer_headers):
        resp = client.get(f"/events/{unpublished_event['id']}", headers=organizer_headers)
        assert resp.status_code == 200

    def test_get_unpublished_event_as_admin(self, client, unpublished_event, admin_headers):
        resp = client.get(f"/events/{unpublished_event['id']}", headers=admin_headers)
        assert resp.status_code == 200

    def test_get_unpublished_event_as_other_organizer(self, client, unpublished_event, another_organizer_headers):
        resp = client.get(f"/events/{unpublished_event['id']}", headers=another_organizer_headers)
        assert resp.status_code == 404

    def test_get_unpublished_event_unauthenticated(self, client, unpublished_event):
        resp = client.get(f"/events/{unpublished_event['id']}")
        assert resp.status_code == 404

    def test_get_nonexistent_event_returns_404(self, client):
        resp = client.get("/events/99999")
        assert resp.status_code == 404
        assert "not found" in resp.get_json()["error"].lower()


class TestUpdateEvent:
    def test_organizer_can_update_own_event(self, client, published_event, organizer_headers):
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"title": "Updated Title"},
            headers=organizer_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["event"]["title"] == "Updated Title"

    def test_admin_can_update_any_event(self, client, published_event, admin_headers):
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"title": "Admin Updated"},
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_other_organizer_cannot_update(self, client, published_event, another_organizer_headers):
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"title": "Hijacked"},
            headers=another_organizer_headers,
        )
        assert resp.status_code == 403

    def test_student_cannot_update(self, client, published_event, student_headers):
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"title": "Hijacked"},
            headers=student_headers,
        )
        assert resp.status_code == 403

    def test_unauthenticated_cannot_update(self, client, published_event):
        resp = client.put(f"/events/{published_event['id']}", json={"title": "X"})
        assert resp.status_code == 401

    def test_update_nonexistent_event_returns_404(self, client, organizer_headers):
        resp = client.put("/events/99999", json={"title": "X"}, headers=organizer_headers)
        assert resp.status_code == 404

    def test_partial_update_only_changes_given_fields(self, client, published_event, organizer_headers):
        original_location = published_event["location"]
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"title": "New Title Only"},
            headers=organizer_headers,
        )
        assert resp.status_code == 200
        updated = resp.get_json()["event"]
        assert updated["title"] == "New Title Only"
        assert updated["location"] == original_location

    def test_update_end_before_new_start_returns_400(self, client, published_event, organizer_headers):
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"start_datetime": future_dt(20), "end_datetime": future_dt(15)},
            headers=organizer_headers,
        )
        assert resp.status_code == 400
        assert "end_datetime" in resp.get_json()["error"]

    def test_update_invalid_category_returns_400(self, client, published_event, organizer_headers):
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"category": "not_a_category"},
            headers=organizer_headers,
        )
        assert resp.status_code == 400

    def test_update_invalid_datetime_returns_400(self, client, published_event, organizer_headers):
        resp = client.put(
            f"/events/{published_event['id']}",
            json={"start_datetime": "bad-format"},
            headers=organizer_headers,
        )
        assert resp.status_code == 400
        assert "ISO 8601" in resp.get_json()["error"]

    def test_no_body_returns_400(self, client, published_event, organizer_headers):
        resp = client.put(f"/events/{published_event['id']}", headers=organizer_headers)
        assert resp.status_code in (400, 415)


class TestDeleteEvent:
    def test_organizer_can_delete_own_event(self, client, published_event, organizer_headers):
        resp = client.delete(f"/events/{published_event['id']}", headers=organizer_headers)
        assert resp.status_code == 200
        assert "deleted" in resp.get_json()["message"].lower()

    def test_event_no_longer_accessible_after_delete(self, client, published_event, organizer_headers):
        client.delete(f"/events/{published_event['id']}", headers=organizer_headers)
        resp = client.get(f"/events/{published_event['id']}")
        assert resp.status_code == 404

    def test_admin_can_delete_any_event(self, client, published_event, admin_headers):
        resp = client.delete(f"/events/{published_event['id']}", headers=admin_headers)
        assert resp.status_code == 200

    def test_other_organizer_cannot_delete(self, client, published_event, another_organizer_headers):
        resp = client.delete(f"/events/{published_event['id']}", headers=another_organizer_headers)
        assert resp.status_code == 403

    def test_student_cannot_delete(self, client, published_event, student_headers):
        resp = client.delete(f"/events/{published_event['id']}", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_delete(self, client, published_event):
        resp = client.delete(f"/events/{published_event['id']}")
        assert resp.status_code == 401

    def test_delete_nonexistent_event_returns_404(self, client, organizer_headers):
        resp = client.delete("/events/99999", headers=organizer_headers)
        assert resp.status_code == 404


class TestMyEvents:
    def test_organizer_gets_own_events(self, client, published_event, organizer_headers):
        resp = client.get("/events/mine", headers=organizer_headers)
        assert resp.status_code == 200
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["id"] == published_event["id"]

    def test_includes_unpublished_events(self, client, published_event, unpublished_event, organizer_headers):
        resp = client.get("/events/mine", headers=organizer_headers)
        ids = {e["id"] for e in resp.get_json()["events"]}
        assert published_event["id"] in ids
        assert unpublished_event["id"] in ids

    def test_other_organizer_events_not_included(self, client, published_event, another_organizer_headers):
        resp = client.get("/events/mine", headers=another_organizer_headers)
        assert resp.status_code == 200
        assert resp.get_json()["events"] == []

    def test_student_cannot_access_mine(self, client, student_headers):
        resp = client.get("/events/mine", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_mine(self, client):
        resp = client.get("/events/mine")
        assert resp.status_code == 401
