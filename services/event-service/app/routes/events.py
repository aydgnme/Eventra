from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.event import Event, EventCategory, ParticipationMode

events_bp = Blueprint("events", __name__)

_VALID_CATEGORIES = [c.value for c in EventCategory]
_VALID_MODES = [m.value for m in ParticipationMode]


def _parse_dt(value, field_name):
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid {field_name} format (use ISO 8601)")


def _get_event_or_404(event_id):
    event = db.session.get(Event, event_id)
    if not event:
        return None, (jsonify({"error": "Event not found"}), 404)
    return event, None


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@events_bp.route("/", methods=["GET"])
def list_events():
    """List published events with optional search and filtering."""
    query = Event.query.filter_by(is_published=True)

    # Text search (title + description)
    q = request.args.get("q", "").strip()
    if q:
        query = query.filter(
            db.or_(
                Event.title.ilike(f"%{q}%"),
                Event.description.ilike(f"%{q}%"),
            )
        )

    # Category filter
    category_val = request.args.get("category", "").strip()
    if category_val:
        try:
            query = query.filter(Event.category == EventCategory(category_val))
        except ValueError:
            return jsonify({"error": f"Invalid category. Valid: {_VALID_CATEGORIES}"}), 400

    # Participation mode filter
    mode_val = request.args.get("mode", "").strip()
    if mode_val:
        try:
            query = query.filter(Event.participation_mode == ParticipationMode(mode_val))
        except ValueError:
            return jsonify({"error": f"Invalid mode. Valid: {_VALID_MODES}"}), 400

    # Date range filters
    from_val = request.args.get("from", "").strip()
    if from_val:
        try:
            query = query.filter(Event.start_datetime >= datetime.fromisoformat(from_val))
        except ValueError:
            return jsonify({"error": "Invalid 'from' date (use ISO 8601)"}), 400

    to_val = request.args.get("to", "").strip()
    if to_val:
        try:
            query = query.filter(Event.start_datetime <= datetime.fromisoformat(to_val))
        except ValueError:
            return jsonify({"error": "Invalid 'to' date (use ISO 8601)"}), 400

    # Pagination
    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    except ValueError:
        return jsonify({"error": "page and per_page must be integers"}), 400

    pagination = (
        query.order_by(Event.start_datetime.asc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify({
        "events": [e.to_dict() for e in pagination.items],
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
    }), 200


@events_bp.route("/<int:event_id>", methods=["GET"])
@jwt_required(optional=True)
def get_event(event_id):
    """Get a single event. Unpublished events are only visible to their organizer or an admin."""
    event, err = _get_event_or_404(event_id)
    if err:
        return err

    if not event.is_published:
        user_id = get_jwt_identity()
        claims = get_jwt()
        if not user_id or (int(user_id) != event.organizer_id and claims.get("role") != "admin"):
            return jsonify({"error": "Event not found"}), 404

    return jsonify({"event": event.to_dict()}), 200


# ---------------------------------------------------------------------------
# Organizer endpoints
# ---------------------------------------------------------------------------

@events_bp.route("/mine", methods=["GET"])
@jwt_required()
def my_events():
    """Return all events (including drafts) created by the authenticated organizer."""
    claims = get_jwt()
    if claims.get("role") not in ("organizer", "admin"):
        return jsonify({"error": "Organizers only"}), 403

    user_id = int(get_jwt_identity())
    events = (
        Event.query.filter_by(organizer_id=user_id)
        .order_by(Event.created_at.desc())
        .all()
    )
    return jsonify({"events": [e.to_dict() for e in events]}), 200


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

    try:
        start_datetime = _parse_dt(start_raw, "start_datetime")
        end_datetime = _parse_dt(end_raw, "end_datetime")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if end_datetime <= start_datetime:
        return jsonify({"error": "end_datetime must be after start_datetime"}), 400

    category = None
    if data.get("category"):
        try:
            category = EventCategory(data["category"])
        except ValueError:
            return jsonify({"error": f"Invalid category. Valid: {_VALID_CATEGORIES}"}), 400

    participation_mode = None
    if data.get("participation_mode"):
        try:
            participation_mode = ParticipationMode(data["participation_mode"])
        except ValueError:
            return jsonify({"error": f"Invalid participation_mode. Valid: {_VALID_MODES}"}), 400

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

    event, err = _get_event_or_404(event_id)
    if err:
        return err

    if event.organizer_id != user_id and claims.get("role") != "admin":
        return jsonify({"error": "Not authorized"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Parse datetimes first (before applying to model) so we can validate
    new_start = event.start_datetime
    new_end = event.end_datetime

    if "start_datetime" in data:
        try:
            new_start = _parse_dt(data["start_datetime"], "start_datetime")
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if "end_datetime" in data:
        try:
            new_end = _parse_dt(data["end_datetime"], "end_datetime")
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if new_end <= new_start:
        return jsonify({"error": "end_datetime must be after start_datetime"}), 400

    event.start_datetime = new_start
    event.end_datetime = new_end

    simple_fields = ["title", "description", "location", "capacity", "is_published", "qr_code", "link_registration"]
    for field in simple_fields:
        if field in data:
            value = data[field]
            setattr(event, field, value.strip() if isinstance(value, str) else value)

    if "category" in data:
        try:
            event.category = EventCategory(data["category"])
        except ValueError:
            return jsonify({"error": f"Invalid category. Valid: {_VALID_CATEGORIES}"}), 400

    if "participation_mode" in data:
        try:
            event.participation_mode = ParticipationMode(data["participation_mode"])
        except ValueError:
            return jsonify({"error": f"Invalid participation_mode. Valid: {_VALID_MODES}"}), 400

    db.session.commit()
    return jsonify({"message": "Event updated", "event": event.to_dict()}), 200


@events_bp.route("/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    event, err = _get_event_or_404(event_id)
    if err:
        return err

    if event.organizer_id != user_id and claims.get("role") != "admin":
        return jsonify({"error": "Not authorized"}), 403

    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted"}), 200
