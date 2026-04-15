"""
Tests for report endpoints:
  GET /admin/reports/summary
  GET /admin/reports/events
  GET /admin/reports/export
"""


class TestSummary:
    def test_admin_can_get_summary(self, client, admin_headers):
        resp = client.get("/admin/reports/summary", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "total_users" in data
        assert "total_events" in data
        assert "published_events" in data
        assert "pending_events" in data
        assert "total_registrations" in data
        assert "total_waitlisted" in data
        assert "total_cancelled" in data

    def test_summary_reflects_data(self, client, admin_headers, sample_user, published_event, sample_registration):
        resp = client.get("/admin/reports/summary", headers=admin_headers)
        data = resp.get_json()
        assert data["total_users"] >= 1
        assert data["published_events"] >= 1
        assert data["total_registrations"] >= 1

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/reports/summary", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/reports/summary")
        assert resp.status_code == 401

    def test_all_counts_are_integers(self, client, admin_headers):
        resp = client.get("/admin/reports/summary", headers=admin_headers)
        data = resp.get_json()
        for key, value in data.items():
            assert isinstance(value, int), f"{key} should be int, got {type(value)}"


class TestEventsReport:
    def test_admin_can_get_events_report(self, client, admin_headers, sample_event):
        resp = client.get("/admin/reports/events", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "events" in data
        assert "total" in data
        assert "filters" in data

    def test_events_include_registration_counts(self, client, admin_headers, sample_event, sample_registration):
        resp = client.get("/admin/reports/events", headers=admin_headers)
        events = resp.get_json()["events"]
        event = next((e for e in events if e["id"] == sample_event["id"]), None)
        assert event is not None
        assert "registered_count" in event
        assert "waitlisted_count" in event

    def test_filter_by_year(self, client, admin_headers, sample_event):
        resp = client.get("/admin/reports/events?year=2026", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["filters"]["year"] == 2026

    def test_filter_by_month_and_year(self, client, admin_headers, sample_event):
        resp = client.get("/admin/reports/events?month=4&year=2026", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["filters"]["month"] == 4
        assert data["filters"]["year"] == 2026

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/reports/events", headers=student_headers)
        assert resp.status_code == 403


class TestExportPDF:
    def test_admin_can_export_pdf(self, client, admin_headers):
        resp = client.get("/admin/reports/export", headers=admin_headers)
        # Either success (200) or 501 if reportlab not installed
        assert resp.status_code in (200, 501)

    def test_pdf_content_type_when_available(self, client, admin_headers):
        resp = client.get("/admin/reports/export", headers=admin_headers)
        if resp.status_code == 200:
            assert "application/pdf" in resp.content_type

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/reports/export", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/reports/export")
        assert resp.status_code == 401
