from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app import db
from app.models.event import Event

events_bp = Blueprint("events", __name__)


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
    start_time_raw = data.get("start_time")

    if not title or not start_time_raw:
        return jsonify({"error": "title and start_time are required"}), 400

    try:
        from datetime import datetime
        start_time = datetime.fromisoformat(start_time_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid start_time format (use ISO 8601)"}), 400

    end_time = None
    if data.get("end_time"):
        try:
            from datetime import datetime
            end_time = datetime.fromisoformat(data["end_time"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid end_time format (use ISO 8601)"}), 400

    organizer_id = int(get_jwt_identity())

    event = Event(
        title=title,
        description=data.get("description"),
        location=data.get("location"),
        start_time=start_time,
        end_time=end_time,
        capacity=data.get("capacity"),
        organizer_id=organizer_id,
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

    if "title" in data:
        event.title = data["title"].strip()
    if "description" in data:
        event.description = data["description"]
    if "location" in data:
        event.location = data["location"]
    if "capacity" in data:
        event.capacity = data["capacity"]
    if "is_published" in data:
        event.is_published = data["is_published"]
    if "start_time" in data:
        try:
            from datetime import datetime
            event.start_time = datetime.fromisoformat(data["start_time"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid start_time format"}), 400
    if "end_time" in data:
        try:
            from datetime import datetime
            event.end_time = datetime.fromisoformat(data["end_time"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid end_time format"}), 400

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
