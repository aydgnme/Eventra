"""
Tests for GET /events/ — search and filter functionality.
"""
import pytest

from .conftest import BASE_EVENT, future_dt


def _create(client, headers, overrides=None):
    """Helper to create an event and return its dict."""
    payload = {**BASE_EVENT, **(overrides or {})}
    resp = client.post("/events/", json=payload, headers=headers)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["event"]


class TestListEventsBasic:
    def test_empty_list_returns_200(self, client):
        resp = client.get("/events/")
        assert resp.status_code == 200
        assert resp.get_json()["events"] == []

    def test_response_has_pagination_metadata(self, client):
        resp = client.get("/events/")
        data = resp.get_json()
        for key in ("events", "total", "page", "per_page", "pages"):
            assert key in data

    def test_returns_only_published_events(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Published", "is_published": True})
        _create(client, organizer_headers, {"title": "Draft", "is_published": False})

        resp = client.get("/events/")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "Published"

    def test_total_reflects_published_only(self, client, organizer_headers):
        _create(client, organizer_headers, {"is_published": True})
        _create(client, organizer_headers, {"is_published": False})

        assert client.get("/events/").get_json()["total"] == 1

    def test_events_ordered_by_start_datetime_ascending(self, client, organizer_headers):
        _create(client, organizer_headers, {
            "title": "Later Event",
            "start_datetime": future_dt(20),
            "end_datetime": future_dt(20, hours=2),
            "is_published": True,
        })
        _create(client, organizer_headers, {
            "title": "Earlier Event",
            "start_datetime": future_dt(5),
            "end_datetime": future_dt(5, hours=2),
            "is_published": True,
        })

        events = client.get("/events/").get_json()["events"]
        assert events[0]["title"] == "Earlier Event"
        assert events[1]["title"] == "Later Event"


class TestTextSearch:
    def test_search_by_title(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Flask Workshop", "is_published": True})
        _create(client, organizer_headers, {"title": "React Summit", "is_published": True})

        resp = client.get("/events/?q=Flask")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "Flask Workshop"

    def test_search_by_description(self, client, organizer_headers):
        _create(client, organizer_headers, {
            "title": "Event A",
            "description": "Blockchain technology deep dive",
            "is_published": True,
        })
        _create(client, organizer_headers, {
            "title": "Event B",
            "description": "Cloud computing overview",
            "is_published": True,
        })

        resp = client.get("/events/?q=blockchain")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "Event A"

    def test_search_is_case_insensitive(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Python Bootcamp", "is_published": True})

        assert len(client.get("/events/?q=python").get_json()["events"]) == 1
        assert len(client.get("/events/?q=PYTHON").get_json()["events"]) == 1
        assert len(client.get("/events/?q=PyThOn").get_json()["events"]) == 1

    def test_search_no_match_returns_empty(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Music Festival", "is_published": True})

        resp = client.get("/events/?q=kubernetes")
        assert resp.get_json()["events"] == []
        assert resp.get_json()["total"] == 0

    def test_empty_q_returns_all(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Event 1", "is_published": True})
        _create(client, organizer_headers, {"title": "Event 2", "is_published": True})

        assert client.get("/events/?q=").get_json()["total"] == 2


class TestCategoryFilter:
    def test_filter_by_category(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Hackathon", "category": "academic", "is_published": True})
        _create(client, organizer_headers, {"title": "Football Cup", "category": "sport", "is_published": True})

        resp = client.get("/events/?category=academic")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["category"] == "academic"

    def test_filter_returns_only_matching_category(self, client, organizer_headers):
        for cat in ("academic", "career", "cultural"):
            _create(client, organizer_headers, {"category": cat, "is_published": True})

        assert client.get("/events/?category=career").get_json()["total"] == 1

    def test_invalid_category_returns_400(self, client):
        resp = client.get("/events/?category=invalid")
        assert resp.status_code == 400
        assert "category" in resp.get_json()["error"].lower()

    @pytest.mark.parametrize("cat", ["academic", "sport", "career", "volunteer", "cultural"])
    def test_all_valid_categories_accepted(self, client, organizer_headers, cat):
        _create(client, organizer_headers, {"category": cat, "is_published": True})
        resp = client.get(f"/events/?category={cat}")
        assert resp.status_code == 200


class TestModeFilter:
    def test_filter_by_participation_mode(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Online Talk", "participation_mode": "online", "is_published": True})
        _create(client, organizer_headers, {"title": "On-site Workshop", "participation_mode": "physical", "is_published": True})

        resp = client.get("/events/?mode=online")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "Online Talk"

    def test_invalid_mode_returns_400(self, client):
        resp = client.get("/events/?mode=in_orbit")
        assert resp.status_code == 400
        assert "mode" in resp.get_json()["error"].lower()

    @pytest.mark.parametrize("mode", ["physical", "online", "hybrid"])
    def test_all_valid_modes_accepted(self, client, organizer_headers, mode):
        _create(client, organizer_headers, {"participation_mode": mode, "is_published": True})
        resp = client.get(f"/events/?mode={mode}")
        assert resp.status_code == 200


class TestDateRangeFilter:
    def test_filter_from_excludes_earlier_events(self, client, organizer_headers):
        _create(client, organizer_headers, {
            "title": "Past-ish Event",
            "start_datetime": future_dt(2),
            "end_datetime": future_dt(2, hours=2),
            "is_published": True,
        })
        _create(client, organizer_headers, {
            "title": "Far Future Event",
            "start_datetime": future_dt(30),
            "end_datetime": future_dt(30, hours=2),
            "is_published": True,
        })

        from_date = future_dt(days=15)
        resp = client.get(f"/events/?from={from_date}")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "Far Future Event"

    def test_filter_to_excludes_later_events(self, client, organizer_headers):
        _create(client, organizer_headers, {
            "title": "Near Event",
            "start_datetime": future_dt(3),
            "end_datetime": future_dt(3, hours=2),
            "is_published": True,
        })
        _create(client, organizer_headers, {
            "title": "Far Event",
            "start_datetime": future_dt(30),
            "end_datetime": future_dt(30, hours=2),
            "is_published": True,
        })

        to_date = future_dt(days=15)
        resp = client.get(f"/events/?to={to_date}")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "Near Event"

    def test_filter_from_and_to_combined(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Too Early", "start_datetime": future_dt(2), "end_datetime": future_dt(2, hours=1), "is_published": True})
        _create(client, organizer_headers, {"title": "In Range", "start_datetime": future_dt(10), "end_datetime": future_dt(10, hours=1), "is_published": True})
        _create(client, organizer_headers, {"title": "Too Late", "start_datetime": future_dt(30), "end_datetime": future_dt(30, hours=1), "is_published": True})

        from_date = future_dt(days=5)
        to_date = future_dt(days=20)
        resp = client.get(f"/events/?from={from_date}&to={to_date}")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "In Range"

    def test_invalid_from_date_returns_400(self, client):
        resp = client.get("/events/?from=not-a-date")
        assert resp.status_code == 400
        assert "from" in resp.get_json()["error"].lower()

    def test_invalid_to_date_returns_400(self, client):
        resp = client.get("/events/?to=not-a-date")
        assert resp.status_code == 400
        assert "to" in resp.get_json()["error"].lower()


class TestCombinedFilters:
    def test_category_and_mode_combined(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Match", "category": "academic", "participation_mode": "online", "is_published": True})
        _create(client, organizer_headers, {"title": "Wrong Mode", "category": "academic", "participation_mode": "physical", "is_published": True})
        _create(client, organizer_headers, {"title": "Wrong Cat", "category": "sport", "participation_mode": "online", "is_published": True})

        resp = client.get("/events/?category=academic&mode=online")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["title"] == "Match"

    def test_search_and_category_combined(self, client, organizer_headers):
        _create(client, organizer_headers, {"title": "Python academic", "category": "academic", "is_published": True})
        _create(client, organizer_headers, {"title": "Python sport", "category": "sport", "is_published": True})

        resp = client.get("/events/?q=Python&category=academic")
        events = resp.get_json()["events"]
        assert len(events) == 1
        assert events[0]["category"] == "academic"


class TestPagination:
    def _create_n_events(self, client, headers, n):
        for i in range(n):
            _create(client, headers, {
                "title": f"Event {i:02d}",
                "start_datetime": future_dt(days=i + 1),
                "end_datetime": future_dt(days=i + 1, hours=1),
                "is_published": True,
            })

    def test_default_page_is_1(self, client, organizer_headers):
        self._create_n_events(client, organizer_headers, 3)
        data = client.get("/events/").get_json()
        assert data["page"] == 1

    def test_default_per_page_is_20(self, client, organizer_headers):
        self._create_n_events(client, organizer_headers, 3)
        data = client.get("/events/").get_json()
        assert data["per_page"] == 20

    def test_per_page_limits_results(self, client, organizer_headers):
        self._create_n_events(client, organizer_headers, 5)
        data = client.get("/events/?per_page=2").get_json()
        assert len(data["events"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

    def test_page_2_returns_next_batch(self, client, organizer_headers):
        self._create_n_events(client, organizer_headers, 5)
        page1 = client.get("/events/?per_page=3&page=1").get_json()
        page2 = client.get("/events/?per_page=3&page=2").get_json()
        ids_p1 = {e["id"] for e in page1["events"]}
        ids_p2 = {e["id"] for e in page2["events"]}
        assert ids_p1.isdisjoint(ids_p2)
        assert len(page2["events"]) == 2

    def test_per_page_capped_at_100(self, client, organizer_headers):
        self._create_n_events(client, organizer_headers, 3)
        data = client.get("/events/?per_page=999").get_json()
        assert data["per_page"] == 100

    def test_invalid_page_returns_400(self, client):
        resp = client.get("/events/?page=abc")
        assert resp.status_code == 400

    def test_invalid_per_page_returns_400(self, client):
        resp = client.get("/events/?per_page=abc")
        assert resp.status_code == 400

    def test_beyond_last_page_returns_empty(self, client, organizer_headers):
        self._create_n_events(client, organizer_headers, 2)
        data = client.get("/events/?page=99").get_json()
        assert data["events"] == []
        assert data["total"] == 2
