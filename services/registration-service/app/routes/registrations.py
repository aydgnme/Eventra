from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.registration import Registration, RegistrationStatus
from app.utils.event_client import EventNotFound, EventServiceUnavailable, get_event

registrations_bp = Blueprint("registrations", __name__)

_ACTIVE_STATUSES = (RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED)


def _active_count(event_id: int) -> int:
    """Number of non-cancelled registrations for an event."""
    return Registration.query.filter(
        Registration.event_id == event_id,
        Registration.status.in_(_ACTIVE_STATUSES),
    ).count()


def _registered_count(event_id: int) -> int:
    """Number of REGISTERED (confirmed) spots taken for an event."""
    return Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.REGISTERED
    ).count()


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@registrations_bp.route("/", methods=["POST"])
@jwt_required()
def register_for_event():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    event_id = data.get("event_id")
    if not event_id:
        return jsonify({"error": "event_id is required"}), 400

    # Verify event exists and is published
    try:
        event = get_event(event_id)
    except EventNotFound:
        return jsonify({"error": "Event not found or not published"}), 404
    except EventServiceUnavailable as exc:
        return jsonify({"error": str(exc)}), 503

    # Duplicate check
    existing = Registration.query.filter_by(
        user_id=user_id, event_id=event_id
    ).first()
    if existing:
        if existing.status != RegistrationStatus.CANCELLED:
            return jsonify({"error": "Already registered for this event"}), 409
        # Re-registration after cancel: reuse the row
        reg = existing
    else:
        reg = Registration(user_id=user_id, event_id=event_id)
        db.session.add(reg)

    # Capacity check
    capacity = event.get("capacity")
    if capacity:
        taken = _registered_count(event_id)
        # Exclude the current row if it's a re-registration
        if existing and existing.status == RegistrationStatus.CANCELLED:
            taken = taken  # cancelled row is not counted, no adjustment needed
        if taken >= capacity:
            return jsonify({
                "error": "Event is full",
                "capacity": capacity,
                "registered": taken,
            }), 409

    reg.status = RegistrationStatus.REGISTERED
    reg.cancelled_at = None
    reg.registered_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({
        "message": "Registered successfully",
        "registration": reg.to_dict(),
    }), 201


# ---------------------------------------------------------------------------
# Get single registration
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:registration_id>", methods=["GET"])
@jwt_required()
def get_registration(registration_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()

    reg = db.session.get(Registration, registration_id)
    if not reg:
        return jsonify({"error": "Registration not found"}), 404

    if reg.user_id != user_id and claims.get("role") not in ("organizer", "admin"):
        return jsonify({"error": "Not authorized"}), 403

    return jsonify({"registration": reg.to_dict()}), 200


# ---------------------------------------------------------------------------
# User's own registrations
# ---------------------------------------------------------------------------

@registrations_bp.route("/my", methods=["GET"])
@jwt_required()
def my_registrations():
    user_id = int(get_jwt_identity())
    regs = (
        Registration.query
        .filter_by(user_id=user_id)
        .order_by(Registration.registered_at.desc())
        .all()
    )
    return jsonify({"registrations": [r.to_dict() for r in regs]}), 200


# ---------------------------------------------------------------------------
# Event's registrations (organizer / admin)
# ---------------------------------------------------------------------------

@registrations_bp.route("/event/<int:event_id>", methods=["GET"])
@jwt_required()
def event_registrations(event_id):
    claims = get_jwt()
    if claims.get("role") not in ("organizer", "admin"):
        return jsonify({"error": "Organizers and admins only"}), 403

    regs = (
        Registration.query
        .filter_by(event_id=event_id)
        .order_by(Registration.registered_at.asc())
        .all()
    )
    return jsonify({
        "registrations": [r.to_dict() for r in regs],
        "total": len(regs),
    }), 200


# ---------------------------------------------------------------------------
# Capacity summary for an event
# ---------------------------------------------------------------------------

@registrations_bp.route("/event/<int:event_id>/count", methods=["GET"])
@jwt_required()
def event_registration_count(event_id):
    registered = _registered_count(event_id)
    waitlisted = Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.WAITLISTED
    ).count()
    return jsonify({
        "event_id": event_id,
        "registered": registered,
        "waitlisted": waitlisted,
        "total_active": registered + waitlisted,
    }), 200


# ---------------------------------------------------------------------------
# Cancel registration
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:registration_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_registration(registration_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()

    reg = db.session.get(Registration, registration_id)
    if not reg:
        return jsonify({"error": "Registration not found"}), 404

    if reg.user_id != user_id and claims.get("role") != "admin":
        return jsonify({"error": "Not authorized"}), 403

    if reg.status == RegistrationStatus.CANCELLED:
        return jsonify({"error": "Already cancelled"}), 400

    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "message": "Registration cancelled",
        "registration": reg.to_dict(),
    }), 200
