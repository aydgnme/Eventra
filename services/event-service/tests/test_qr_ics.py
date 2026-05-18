"""Tests for QR code generation and ICS calendar export endpoints."""
import pytest


class TestQRCode:
    """GET /events/<id>/qr"""

    def test_qr_returns_png_for_published_event(self, client, published_event):
        resp = client.get(f"/events/{published_event['id']}/qr")
        assert resp.status_code == 200
        assert resp.content_type == "image/png"
        # PNG magic bytes
        assert resp.data[:4] == b"\x89PNG"

    def test_qr_returns_404_for_nonexistent_event(self, client):
        resp = client.get("/events/9999/qr")
        assert resp.status_code == 404

    def test_qr_returns_404_for_unpublished_event(self, client, unpublished_event):
        resp = client.get(f"/events/{unpublished_event['id']}/qr")
        assert resp.status_code == 404


class TestICS:
    """GET /events/<id>/ics"""

    def test_ics_returns_calendar_file_for_published_event(self, client, published_event):
        resp = client.get(f"/events/{published_event['id']}/ics")
        assert resp.status_code == 200
        assert "text/calendar" in resp.content_type

        body = resp.data.decode("utf-8")
        assert "BEGIN:VCALENDAR" in body
        assert "BEGIN:VEVENT" in body
        assert "END:VEVENT" in body
        assert "END:VCALENDAR" in body

    def test_ics_contains_event_details(self, client, published_event):
        resp = client.get(f"/events/{published_event['id']}/ics")
        body = resp.data.decode("utf-8")
        assert published_event["title"] in body

    def test_ics_contains_location_and_description(self, client, published_event):
        resp = client.get(f"/events/{published_event['id']}/ics")
        body = resp.data.decode("utf-8")
        assert "USV Campus" in body
        assert "annual technology conference" in body

    def test_ics_contains_unique_uid(self, client, published_event):
        resp = client.get(f"/events/{published_event['id']}/ics")
        body = resp.data.decode("utf-8")
        assert f"event-{published_event['id']}@eventra" in body

    def test_ics_returns_404_for_nonexistent_event(self, client):
        resp = client.get("/events/9999/ics")
        assert resp.status_code == 404

    def test_ics_returns_404_for_unpublished_event(self, client, unpublished_event):
        resp = client.get(f"/events/{unpublished_event['id']}/ics")
        assert resp.status_code == 404

    def test_ics_sets_attachment_header(self, client, published_event):
        resp = client.get(f"/events/{published_event['id']}/ics")
        content_disp = resp.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp
        assert ".ics" in content_disp
