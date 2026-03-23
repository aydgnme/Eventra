from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app import db
from app.models.event import Event, EventCategory, ParticipationMode

events_bp = Blueprint("events", __name__)


def _parse_dt(value, field_name):
    try:
        return datetime.fromisoformat(value), None
    except (ValueError, TypeError):
        return None, jsonify({"error": f"Invalid {field_name} format (use ISO 8601)"}), 400


@events_bp.route("/", methods=["GET"])
def list_events():
    events = Event.query.filter_by(is_published=True).all()
    return jsonify({"events": [e.to_dict() for e in events]}), 200


@events_bp.route("/<int:event_id>", methods=["GET"])
def get_event(event_id):
    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404
    return jsonify({"event": event.to_dict()}), 200


@events_bp.route("/", methods=["POST"])
@jwt_required()
def create_event():
    claims = get_jwt()
    if claims.get("role") not in ("organizer", "admin"):
        return jsonify({"error": "Organizers and admins only"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    title = data.get("title", "").strip()
    start_raw = data.get("start_datetime")
    end_raw = data.get("end_datetime")

    if not title or not start_raw or not end_raw:
        return jsonify({"error": "title, start_datetime and end_datetime are required"}), 400

    result = _parse_dt(start_raw, "start_datetime")
    if result[1]:
        return result[1], result[2]
    start_datetime = result[0]

    result = _parse_dt(end_raw, "end_datetime")
    if result[1]:
        return result[1], result[2]
    end_datetime = result[0]

    category = None
    if data.get("category"):
        try:
            category = EventCategory(data["category"])
        except ValueError:
            return jsonify({"error": f"Invalid category. Valid: {[c.value for c in EventCategory]}"}), 400

    participation_mode = None
    if data.get("participation_mode"):
        try:
            participation_mode = ParticipationMode(data["participation_mode"])
        except ValueError:
            return jsonify({"error": f"Invalid participation_mode. Valid: {[m.value for m in ParticipationMode]}"}), 400

    event = Event(
        title=title,
        description=data.get("description"),
        location=data.get("location"),
        category=category,
        participation_mode=participation_mode,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        capacity=data.get("capacity"),
        qr_code=data.get("qr_code"),
        link_registration=data.get("link_registration"),
        organizer_id=int(get_jwt_identity()),
        is_published=data.get("is_published", False),
    )
    db.session.add(event)
    db.session.commit()

    return jsonify({"message": "Event created", "event": event.to_dict()}), 201


@events_bp.route("/<int:event_id>", methods=["PUT"])
@jwt_required()
def update_event(event_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    if event.organizer_id != user_id and claims.get("role") != "admin":
        return jsonify({"error": "Not authorized"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    simple_fields = ["title", "description", "location", "capacity", "is_published", "qr_code", "link_registration"]
    for field in simple_fields:
        if field in data:
            setattr(event, field, data[field].strip() if isinstance(data[field], str) else data[field])

    for field in ("start_datetime", "end_datetime"):
        if field in data:
            result = _parse_dt(data[field], field)
            if result[1]:
                return result[1], result[2]
            setattr(event, field, result[0])

    if "category" in data:
        try:
            event.category = EventCategory(data["category"])
        except ValueError:
            return jsonify({"error": f"Invalid category"}), 400

    if "participation_mode" in data:
        try:
            event.participation_mode = ParticipationMode(data["participation_mode"])
        except ValueError:
            return jsonify({"error": "Invalid participation_mode"}), 400

    db.session.commit()
    return jsonify({"message": "Event updated", "event": event.to_dict()}), 200


@events_bp.route("/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    if event.organizer_id != user_id and claims.get("role") != "admin":
        return jsonify({"error": "Not authorized"}), 403

    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted"}), 200
