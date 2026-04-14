from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.registration import Registration, RegistrationStatus
from app.utils.email_client import (
    send_cancellation_email,
    send_promotion_email,
    send_registration_email,
    send_waitlist_email,
)
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
    user_email = get_jwt().get("email", "")
    data = request.get_json()

    if data is None:
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
    if existing and existing.status != RegistrationStatus.CANCELLED:
        return jsonify({"error": "Already registered for this event"}), 409

    # Capacity check (before any session.add to avoid autoflush skewing the count)
    capacity = event.get("capacity")
    is_full = capacity is not None and _registered_count(event_id) >= capacity

    # Create or reuse cancelled registration row
    if existing:
        reg = existing
    else:
        reg = Registration(user_id=user_id, event_id=event_id)
        db.session.add(reg)

    if is_full:
        reg.status = RegistrationStatus.WAITLISTED
        message = "Event is full. Added to waitlist."
    else:
        reg.status = RegistrationStatus.REGISTERED
        message = "Registered successfully"

    reg.user_email = user_email
    reg.cancelled_at = None
    reg.registered_at = datetime.now(timezone.utc)

    db.session.commit()

    # Fire-and-forget email (failures must never block registration)
    try:
        if user_email:
            event_title = event.get("title", f"Event #{event_id}")
            if reg.status == RegistrationStatus.WAITLISTED:
                send_waitlist_email(user_email, event_title)
            else:
                send_registration_email(user_email, event_title)
    except Exception:
        pass

    return jsonify({
        "message": message,
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

    was_registered = reg.status == RegistrationStatus.REGISTERED
    event_title = f"Event #{reg.event_id}"

    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)

    promoted_email = None

    # Auto-promote oldest waitlisted user (FIFO) when a confirmed spot opens
    if was_registered:
        next_in_line = (
            Registration.query
            .filter_by(event_id=reg.event_id, status=RegistrationStatus.WAITLISTED)
            .order_by(Registration.registered_at.asc())
            .first()
        )
        if next_in_line:
            next_in_line.status = RegistrationStatus.REGISTERED
            promoted_email = next_in_line.user_email

    db.session.commit()

    # Fire-and-forget emails
    try:
        canceller_email = claims.get("email", "")
        if canceller_email:
            send_cancellation_email(canceller_email, event_title)
        if promoted_email:
            send_promotion_email(promoted_email, event_title)
    except Exception:
        pass

    return jsonify({
        "message": "Registration cancelled",
        "registration": reg.to_dict(),
    }), 200
