"""
HTTP client for fetching event data from event-service.
Abstracted into a module so tests can mock it cleanly.
"""
import requests
from flask import current_app


class EventNotFound(Exception):
    pass


class EventServiceUnavailable(Exception):
    pass


def get_event(event_id: int) -> dict:
    """
    Fetch event details from the event-service.

    Returns the event dict on success.
    Raises EventNotFound if the event doesn't exist or isn't published.
    Raises EventServiceUnavailable on connection/timeout errors.
    """
    base_url = current_app.config["EVENT_SERVICE_URL"]
    try:
        resp = requests.get(f"{base_url}/events/{event_id}", timeout=5)
    except (requests.ConnectionError, requests.Timeout) as exc:
        raise EventServiceUnavailable("Event service is unavailable") from exc

    if resp.status_code == 404:
        raise EventNotFound(f"Event {event_id} not found or not published")

    if not resp.ok:
        raise EventServiceUnavailable(f"Event service returned {resp.status_code}")

    return resp.json()["event"]
