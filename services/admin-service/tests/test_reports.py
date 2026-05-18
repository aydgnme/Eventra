"""
Tests for report endpoints:
  GET /admin/reports/summary
  GET /admin/reports/events
  GET /admin/reports/organizers
  GET /admin/reports/export
"""


class TestSummary:
    def test_admin_can_get_summary(self, client, admin_headers):
        resp = client.get("/admin/reports/summary", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "total_events" in data
        assert "total_registrations" in data
        assert "active_organizers" in data
        assert "trends" in data

    def test_summary_reflects_data(self, client, admin_headers, sample_user, published_event, sample_registration):
        resp = client.get("/admin/reports/summary", headers=admin_headers)
        data = resp.get_json()
        assert data["total_events"] >= 1
        assert data["total_registrations"] >= 1
        assert isinstance(data["active_organizers"], int)

    def test_trends_shape(self, client, admin_headers):
        resp = client.get("/admin/reports/summary", headers=admin_headers)
        trends = resp.get_json()["trends"]
        assert "events_vs_last_month" in trends
        assert "registrations_vs_last_month" in trends
        assert "organizers_vs_last_month" in trends

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/reports/summary", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/reports/summary")
        assert resp.status_code == 401

    def test_integer_counts(self, client, admin_headers):
        resp = client.get("/admin/reports/summary", headers=admin_headers)
        data = resp.get_json()
        assert isinstance(data["total_events"], int)
        assert isinstance(data["total_registrations"], int)
        assert isinstance(data["active_organizers"], int)


class TestEventsReport:
    def test_admin_can_get_events_report(self, client, admin_headers, sample_event):
        resp = client.get("/admin/reports/events", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "events" in data
        assert "totals" in data
        assert "filters" in data
        assert "period" in data

    def test_events_include_registration_counts(self, client, admin_headers, sample_event, sample_registration):
        resp = client.get("/admin/reports/events", headers=admin_headers)
        events = resp.get_json()["events"]
        event = next((e for e in events if e["id"] == sample_event["id"]), None)
        assert event is not None
        assert "registrations" in event

    def test_events_include_organizer_name(self, client, admin_headers, sample_event):
        resp = client.get("/admin/reports/events", headers=admin_headers)
        events = resp.get_json()["events"]
        event = next((e for e in events if e["id"] == sample_event["id"]), None)
        assert event is not None
        assert "organizer_name" in event

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


class TestOrganizersReport:
    def test_admin_can_get_organizers(self, client, admin_headers):
        resp = client.get("/admin/reports/organizers", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "organizers" in data
        assert "total" in data

    def test_organizers_report_shape(self, client, admin_headers, sample_event):
        resp = client.get("/admin/reports/organizers", headers=admin_headers)
        assert resp.status_code == 200

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/reports/organizers", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/reports/organizers")
        assert resp.status_code == 401


class TestExportPDF:
    def test_admin_can_export_pdf(self, client, admin_headers):
        resp = client.get("/admin/reports/export", headers=admin_headers)
        # Either success (200) or 501 if reportlab not installed
        assert resp.status_code in (200, 501)

    def test_pdf_content_type_when_available(self, client, admin_headers):
        resp = client.get("/admin/reports/export", headers=admin_headers)
        if resp.status_code == 200:
            assert "application/pdf" in resp.content_type

    def test_filter_by_month_year(self, client, admin_headers):
        resp = client.get("/admin/reports/export?month=4&year=2026", headers=admin_headers)
        assert resp.status_code in (200, 501)

    def test_non_admin_forbidden(self, client, student_headers):
        resp = client.get("/admin/reports/export", headers=student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/admin/reports/export")
        assert resp.status_code == 401
