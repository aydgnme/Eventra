import base64
import csv
import io
from datetime import datetime, timezone

import qrcode
from flask import Blueprint, Response, current_app, jsonify, request
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


def _event_title(event_id: int) -> str:
    """Fetch event title; falls back to 'Event #<id>' if service is unavailable."""
    try:
        return get_event(event_id).get("title", f"Event #{event_id}")
    except Exception:
        return f"Event #{event_id}"


registrations_bp = Blueprint("registrations", __name__)

MSG_EVENT_NOT_FOUND = "Event not found"
MSG_ALREADY_WAITLISTED = "You are already on the waitlist"
MSG_ALREADY_REGISTERED = "You are already registered for this event"
MSG_REGISTRATION_NOT_FOUND = "Registration not found"
MSG_ORGANIZERS_ONLY = "Organizers and admins only"
_UTC_SUFFIX = "+00:00"


def _make_qr_png(token: str) -> bytes:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(f"eventra:checkin:{token}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _fmt_dt(raw: str | None) -> str:
    if not raw:
        return ""
    try:
        dt = datetime.fromisoformat(raw.replace("Z", _UTC_SUFFIX))
        return dt.strftime("%A, %B %d %Y at %H:%M")
    except (ValueError, TypeError):
        return raw

def _check_duplicate(user_id: int, event_id: int):
    """Check if user already has an active registration. Returns (existing_reg, error_response)."""
    existing = Registration.query.filter_by(user_id=user_id, event_id=event_id).first()
    if existing and existing.status not in (RegistrationStatus.CANCELLED,):
        if existing.status == RegistrationStatus.WAITLISTED:
            return existing, (jsonify({"error": MSG_ALREADY_WAITLISTED, "status": 400}), 400)
        return existing, (jsonify({"error": MSG_ALREADY_REGISTERED, "status": 400}), 400)
    return existing, None


def _enrich_with_event(event_id: int) -> dict:
    """Fetch event info for a registration. Returns minimal dict on failure."""
    try:
        event = get_event(event_id)
        return {
            "id": event.get("id"),
            "title": event.get("title"),
            "start_datetime": event.get("start_datetime"),
            "end_datetime": event.get("end_datetime"),
            "location": event.get("location"),
            "category": event.get("category"),
            "status": event.get("status"),
        }
    except Exception:
        return {"id": event_id}


def _is_upcoming_event(event_info: dict) -> bool:
    """Check if event start_datetime is in the future."""
    start_dt = event_info.get("start_datetime")
    if not start_dt:
        return True
    try:
        start = datetime.fromisoformat(start_dt.replace("Z", _UTC_SUFFIX))
        return start >= datetime.now(timezone.utc)
    except (ValueError, TypeError):
        return True


def _require_organizer_role():
    """Returns error response if caller is not organizer or admin, else None."""
    claims = get_jwt()
    role = claims.get("role", "")
    if role not in ("organizer", "admin"):
        return jsonify({"error": "Organizer or admin role required"}), 403
    return None


_ACTIVE_STATUSES = (
    RegistrationStatus.REGISTERED,
    RegistrationStatus.WAITLISTED,
    RegistrationStatus.ATTENDED,
)


def _active_count(event_id: int) -> int:
    """Number of non-cancelled registrations for an event."""
    return Registration.query.filter(
        Registration.event_id == event_id,
        Registration.status.in_(_ACTIVE_STATUSES),
    ).count()


def _registered_count(event_id: int, lock: bool = False) -> int:
    """Number of REGISTERED + ATTENDED (confirmed) spots taken for an event.

    When ``lock=True`` a SELECT ... FOR UPDATE is used so that concurrent
    transactions block until this one commits, preventing over-capacity
    race conditions.
    """
    query = Registration.query.filter(
        Registration.event_id == event_id,
        Registration.status.in_((RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED)),
    )
    if lock:
        return len(query.with_for_update().all())
    return query.count()


def _validate_event_for_registration(event):
    """Check business rules: published, not ended, not past deadline. Returns error tuple or None."""
    # Event must be published
    status = event.get("status", "")
    if status != "published" and not event.get("is_published"):
        return {"error": "Event is not open for registration", "status": 400}, 400

    # Event must not have ended
    end_dt = event.get("end_datetime")
    if end_dt:
        try:
            end = datetime.fromisoformat(end_dt.replace("Z", _UTC_SUFFIX))
            if end < datetime.now(timezone.utc):
                return {"error": "Event has already ended", "status": 400}, 400
        except (ValueError, TypeError):
            pass

    # Registration deadline check
    deadline = event.get("registration_deadline")
    if deadline:
        try:
            dl = datetime.fromisoformat(deadline.replace("Z", _UTC_SUFFIX))
            if dl < datetime.now(timezone.utc):
                return {"error": "Registration deadline has passed", "status": 400}, 400
        except (ValueError, TypeError):
            pass

    return None


# ---------------------------------------------------------------------------
# Register  (POST /registrations/)
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
        return jsonify({"error": MSG_EVENT_NOT_FOUND, "status": 404}), 404
    except EventServiceUnavailable as exc:
        return jsonify({"error": str(exc)}), 503

    # Business rule validations
    validation_error = _validate_event_for_registration(event)
    if validation_error:
        return jsonify(validation_error[0]), validation_error[1]

    # Duplicate check
    existing, dup_err = _check_duplicate(user_id, event_id)
    if dup_err:
        return dup_err

    # Capacity check with row-level locking to prevent race conditions
    capacity = event.get("capacity")
    if capacity is not None and _registered_count(event_id, lock=True) >= capacity:
        return jsonify({
            "error": "Event is at full capacity. You can join the waitlist.",
            "status": 400,
            "can_waitlist": True,
        }), 400

    # Create or reuse cancelled registration row
    if existing:
        reg = existing
    else:
        reg = Registration(user_id=user_id, event_id=event_id)
        db.session.add(reg)

    reg.status = RegistrationStatus.REGISTERED
    reg.user_email = user_email
    reg.cancelled_at = None
    reg.checked_in = False
    reg.checked_in_at = None
    reg.registered_at = datetime.now(timezone.utc)
    reg.ensure_qr_token()

    db.session.commit()

    registered_count = _registered_count(event_id)
    available_spots = (capacity - registered_count) if capacity is not None else None

    email_sent = False
    try:
        if user_email:
            qr_bytes = _make_qr_png(reg.qr_token)
            send_registration_email(
                user_email,
                event.get("title", f"Event #{event_id}"),
                _fmt_dt(event.get("start_datetime")),
                event.get("location", ""),
                qr_bytes,
            )
            email_sent = True
    except Exception:
        pass

    return jsonify({
        "message": "Successfully registered for event",
        "registration": reg.to_dict(),
        "event": {
            "title": event.get("title"),
            "registered_count": registered_count,
            "available_spots": available_spots,
        },
        "email_sent": email_sent,
    }), 201


# ---------------------------------------------------------------------------
# Register via path param  (POST /registrations/<event_id>/register)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/register", methods=["POST"])
@jwt_required()
def register_for_event_by_path(event_id):
    """Doc-compliant path-param register endpoint."""
    user_id = int(get_jwt_identity())
    user_email = get_jwt().get("email", "")

    try:
        event = get_event(event_id)
    except EventNotFound:
        return jsonify({"error": MSG_EVENT_NOT_FOUND, "status": 404}), 404
    except EventServiceUnavailable as exc:
        return jsonify({"error": str(exc)}), 503

    validation_error = _validate_event_for_registration(event)
    if validation_error:
        return jsonify(validation_error[0]), validation_error[1]

    existing, dup_err = _check_duplicate(user_id, event_id)
    if dup_err:
        return dup_err

    # Capacity check with row-level locking to prevent race conditions
    capacity = event.get("capacity")
    if capacity is not None and _registered_count(event_id, lock=True) >= capacity:
        return jsonify({
            "error": "Event is at full capacity. You can join the waitlist.",
            "status": 400,
            "can_waitlist": True,
        }), 400

    if existing:
        reg = existing
    else:
        reg = Registration(user_id=user_id, event_id=event_id)
        db.session.add(reg)

    reg.status = RegistrationStatus.REGISTERED
    reg.user_email = user_email
    reg.cancelled_at = None
    reg.checked_in = False
    reg.checked_in_at = None
    reg.registered_at = datetime.now(timezone.utc)
    reg.ensure_qr_token()

    db.session.commit()

    registered_count = _registered_count(event_id)
    available_spots = (capacity - registered_count) if capacity is not None else None

    email_sent = False
    try:
        if user_email:
            qr_bytes = _make_qr_png(reg.qr_token)
            send_registration_email(
                user_email,
                event.get("title", f"Event #{event_id}"),
                _fmt_dt(event.get("start_datetime")),
                event.get("location", ""),
                qr_bytes,
            )
            email_sent = True
    except Exception:
        pass

    return jsonify({
        "message": "Successfully registered for event",
        "registration": reg.to_dict(),
        "event": {
            "title": event.get("title"),
            "registered_count": registered_count,
            "available_spots": available_spots,
        },
        "email_sent": email_sent,
    }), 201


# ---------------------------------------------------------------------------
# Cancel via path param  (DELETE /registrations/<event_id>/register)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/register", methods=["DELETE"])
@jwt_required()
def cancel_registration_by_event(event_id):
    """Doc-compliant cancel endpoint using event_id path param."""
    user_id = int(get_jwt_identity())

    reg = Registration.query.filter_by(user_id=user_id, event_id=event_id).first()
    if not reg:
        return jsonify({"error": "You are not registered for this event", "status": 400}), 400

    if reg.status == RegistrationStatus.CANCELLED:
        return jsonify({"error": "Cannot cancel \u2014 registration is already cancelled", "status": 400}), 400

    was_registered = reg.status in (RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED)
    event_title = _event_title(event_id)

    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)
    reg.checked_in = False
    reg.checked_in_at = None

    promotion_info = {"promoted": False}

    if was_registered:
        next_in_line = (
            Registration.query
            .filter_by(event_id=event_id, status=RegistrationStatus.WAITLISTED)
            .order_by(Registration.registered_at.asc())
            .first()
        )
        if next_in_line:
            next_in_line.status = RegistrationStatus.REGISTERED
            promotion_info = {
                "promoted": True,
                "promoted_user_id": next_in_line.user_id,
            }
            try:
                if next_in_line.user_email:
                    send_promotion_email(next_in_line.user_email, event_title)
            except Exception:
                pass

    db.session.commit()

    try:
        user_email = get_jwt().get("email", "")
        if user_email:
            send_cancellation_email(user_email, event_title)
    except Exception:
        pass

    return jsonify({
        "message": "Registration cancelled successfully",
        "registration": reg.to_dict(),
        "waitlist_promotion": promotion_info,
    }), 200


# ---------------------------------------------------------------------------
# Registration status  (GET /registrations/<event_id>/status)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/status", methods=["GET"])
@jwt_required()
def registration_status(event_id):
    user_id = int(get_jwt_identity())

    reg = Registration.query.filter_by(user_id=user_id, event_id=event_id).first()

    if not reg or reg.status == RegistrationStatus.CANCELLED:
        # Not registered — return event availability info
        try:
            event = get_event(event_id)
        except EventNotFound:
            return jsonify({"error": MSG_EVENT_NOT_FOUND, "status": 404}), 404
        except EventServiceUnavailable as exc:
            return jsonify({"error": str(exc)}), 503

        capacity = event.get("capacity")
        registered = _registered_count(event_id)
        is_full = capacity is not None and registered >= capacity

        return jsonify({
            "is_registered": False,
            "status": None,
            "event": {
                "available_spots": (capacity - registered) if capacity is not None else None,
                "is_full": is_full,
                "can_register": not is_full,
                "can_waitlist": is_full,
            },
        }), 200

    if reg.status == RegistrationStatus.WAITLISTED:
        position = (
            Registration.query
            .filter(
                Registration.event_id == event_id,
                Registration.status == RegistrationStatus.WAITLISTED,
                Registration.registered_at <= reg.registered_at,
            )
            .count()
        )
        return jsonify({
            "is_registered": False,
            "status": "waitlisted",
            "registered_at": reg.registered_at.isoformat() + "Z",
            "waitlist_position": position,
            "registration_id": reg.id,
        }), 200

    return jsonify({
        "is_registered": True,
        "status": reg.status.value,
        "registered_at": reg.registered_at.isoformat() + "Z",
        "registration_id": reg.id,
    }), 200


# ---------------------------------------------------------------------------
# Get single registration  (GET /registrations/<id>)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:registration_id>", methods=["GET"])
@jwt_required()
def get_registration(registration_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()

    reg = db.session.get(Registration, registration_id)
    if not reg:
        return jsonify({"error": MSG_REGISTRATION_NOT_FOUND}), 404

    if reg.user_id != user_id and claims.get("role") not in ("organizer", "admin"):
        return jsonify({"error": "Not authorized"}), 403

    return jsonify({"registration": reg.to_dict()}), 200


# ---------------------------------------------------------------------------
# User's own registrations  (GET /registrations/my)
# ---------------------------------------------------------------------------

@registrations_bp.route("/my", methods=["GET"])
@jwt_required()
def my_registrations():
    user_id = int(get_jwt_identity())

    query = Registration.query.filter_by(user_id=user_id)

    # Filter by status
    status_filter = request.args.get("status")
    if status_filter:
        try:
            status_enum = RegistrationStatus(status_filter)
            query = query.filter_by(status=status_enum)
        except ValueError:
            return jsonify({"error": f"Invalid status: {status_filter}"}), 400

    query = query.order_by(Registration.registered_at.desc())

    # Pagination
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    upcoming_only = (request.args.get("upcoming") or "").lower() == "true"
    result = []
    for r in pagination.items:
        data = r.to_dict()
        event_info = _enrich_with_event(r.event_id)
        data["event"] = event_info
        if upcoming_only and not _is_upcoming_event(event_info):
            continue
        result.append(data)

    return jsonify({
        "registrations": result,
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }), 200


# ---------------------------------------------------------------------------
# Waitlist — Join  (POST /registrations/<event_id>/waitlist)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/waitlist", methods=["POST"])
@jwt_required()
def join_waitlist(event_id):
    user_id = int(get_jwt_identity())
    user_email = get_jwt().get("email", "")

    try:
        event = get_event(event_id)
    except EventNotFound:
        return jsonify({"error": MSG_EVENT_NOT_FOUND, "status": 404}), 404
    except EventServiceUnavailable as exc:
        return jsonify({"error": str(exc)}), 503

    validation_error = _validate_event_for_registration(event)
    if validation_error:
        return jsonify(validation_error[0]), validation_error[1]

    # Must be at full capacity to waitlist
    capacity = event.get("capacity")
    if capacity is None or _registered_count(event_id, lock=True) < capacity:
        return jsonify({
            "error": "Event is not at full capacity. You can register directly.",
            "status": 400,
        }), 400

    existing, dup_err = _check_duplicate(user_id, event_id)
    if dup_err:
        return dup_err

    if existing:
        reg = existing
    else:
        reg = Registration(user_id=user_id, event_id=event_id)
        db.session.add(reg)

    reg.status = RegistrationStatus.WAITLISTED
    reg.user_email = user_email
    reg.cancelled_at = None
    reg.checked_in = False
    reg.checked_in_at = None
    reg.registered_at = datetime.now(timezone.utc)

    db.session.commit()

    # Calculate waitlist position
    position = (
        Registration.query
        .filter(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.WAITLISTED,
            Registration.registered_at <= reg.registered_at,
        )
        .count()
    )

    email_sent = False
    try:
        if user_email:
            send_waitlist_email(user_email, event.get("title", f"Event #{event_id}"))
            email_sent = True
    except Exception:
        pass

    return jsonify({
        "message": "Added to waitlist",
        "registration": reg.to_dict(),
        "waitlist_position": position,
        "email_sent": email_sent,
    }), 201


# ---------------------------------------------------------------------------
# Waitlist — Leave  (DELETE /registrations/<event_id>/waitlist)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/waitlist", methods=["DELETE"])
@jwt_required()
def leave_waitlist(event_id):
    user_id = int(get_jwt_identity())

    reg = Registration.query.filter_by(
        user_id=user_id, event_id=event_id
    ).first()

    if not reg or reg.status != RegistrationStatus.WAITLISTED:
        return jsonify({"error": "You are not on the waitlist for this event", "status": 400}), 400

    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({
        "message": "Removed from waitlist",
        "registration": reg.to_dict(),
    }), 200


# ---------------------------------------------------------------------------
# Waitlist — View  (GET /registrations/<event_id>/waitlist)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/waitlist", methods=["GET"])
@jwt_required()
def view_waitlist(event_id):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

    waitlisted = (
        Registration.query
        .filter_by(event_id=event_id, status=RegistrationStatus.WAITLISTED)
        .order_by(Registration.registered_at.asc())
        .all()
    )

    result = []
    for i, reg in enumerate(waitlisted, 1):
        result.append({
            "position": i,
            "user": {
                "id": reg.user_id,
                "email": reg.user_email,
            },
            "registered_at": reg.registered_at.isoformat() + "Z",
        })

    return jsonify({
        "waitlist": result,
        "total": len(result),
    }), 200


# ---------------------------------------------------------------------------
# Participants  (GET /registrations/<event_id>/participants)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/participants", methods=["GET"])
@jwt_required()
def list_participants(event_id):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

    query = Registration.query.filter_by(event_id=event_id)

    # Filter by status
    status_filter = request.args.get("status")
    if status_filter:
        try:
            status_enum = RegistrationStatus(status_filter)
            query = query.filter_by(status=status_enum)
        except ValueError:
            return jsonify({"error": f"Invalid status: {status_filter}"}), 400

    # Search by email
    search = request.args.get("search")
    if search:
        query = query.filter(Registration.user_email.ilike(f"%{search}%"))

    query = query.order_by(Registration.registered_at.asc())

    # Pagination
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    per_page = min(per_page, 100)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    participants = []
    for reg in pagination.items:
        participants.append({
            "registration_id": reg.id,
            "user": {
                "id": reg.user_id,
                "email": reg.user_email,
            },
            "status": reg.status.value,
            "checked_in": reg.checked_in,
            "checked_in_at": reg.checked_in_at.isoformat() + "Z" if reg.checked_in_at else None,
            "registered_at": reg.registered_at.isoformat() + "Z",
        })

    # Summary counts (unfiltered)
    total_registered = Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.REGISTERED
    ).count()
    total_waitlisted = Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.WAITLISTED
    ).count()
    total_cancelled = Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.CANCELLED
    ).count()
    total_attended = Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.ATTENDED
    ).count()

    # Try to get capacity from event service
    try:
        event = get_event(event_id)
        capacity = event.get("capacity")
    except Exception:
        capacity = None

    confirmed = total_registered + total_attended
    occupancy = round((confirmed / capacity) * 100) if capacity else 0

    return jsonify({
        "participants": participants,
        "summary": {
            "total_registered": total_registered,
            "total_waitlisted": total_waitlisted,
            "total_cancelled": total_cancelled,
            "total_attended": total_attended,
            "capacity": capacity,
            "occupancy_percent": occupancy,
        },
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }), 200


# ---------------------------------------------------------------------------
# Participants Export  (GET /registrations/<event_id>/participants/export)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/participants/export", methods=["GET"])
@jwt_required()
def export_participants(event_id):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

    query = Registration.query.filter_by(event_id=event_id)

    status_filter = request.args.get("status")
    if status_filter:
        try:
            status_enum = RegistrationStatus(status_filter)
            query = query.filter_by(status=status_enum)
        except ValueError:
            return jsonify({"error": f"Invalid status: {status_filter}"}), 400

    regs = query.order_by(Registration.registered_at.asc()).all()

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Email", "Status", "Checked In", "Registration Date"])

    for reg in regs:
        writer.writerow([
            reg.user_email or "",
            reg.status.value,
            "Yes" if reg.checked_in else "No",
            reg.registered_at.isoformat() + "Z",
        ])

    # Get event title for filename
    try:
        event = get_event(event_id)
        title_slug = event.get("title", f"event-{event_id}").lower().replace(" ", "-")
    except Exception:
        title_slug = f"event-{event_id}"

    csv_content = output.getvalue()
    return Response(
        csv_content,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{title_slug}-participants.csv"',
        },
    )


# ---------------------------------------------------------------------------
# Check-in  (POST /registrations/<event_id>/checkin/<user_id>)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/checkin/<int:user_id>", methods=["POST"])
@jwt_required()
def checkin_participant(event_id, user_id):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

    reg = Registration.query.filter_by(
        user_id=user_id, event_id=event_id
    ).first()

    if not reg or reg.status not in (RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED):
        return jsonify({"error": "User is not registered for this event", "status": 400}), 400

    if reg.checked_in or reg.status == RegistrationStatus.ATTENDED:
        return jsonify({"error": "User is already checked in", "status": 400}), 400

    reg.status = RegistrationStatus.ATTENDED
    reg.checked_in = True
    reg.checked_in_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({
        "message": "Check-in successful",
        "registration": {
            "registration_id": reg.id,
            "user_id": reg.user_id,
            "status": reg.status.value,
            "checked_in": reg.checked_in,
            "checked_in_at": reg.checked_in_at.isoformat() + "Z",
        },
    }), 200


# ---------------------------------------------------------------------------
# Undo Check-in  (DELETE /registrations/<event_id>/checkin/<user_id>)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/checkin/<int:user_id>", methods=["DELETE"])
@jwt_required()
def undo_checkin(event_id, user_id):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

    reg = Registration.query.filter_by(
        user_id=user_id, event_id=event_id
    ).first()

    if not reg or reg.status != RegistrationStatus.ATTENDED:
        return jsonify({"error": "User is not checked in for this event", "status": 400}), 400

    reg.status = RegistrationStatus.REGISTERED
    reg.checked_in = False
    reg.checked_in_at = None

    db.session.commit()

    return jsonify({
        "message": "Check-in reversed",
        "registration": {
            "registration_id": reg.id,
            "user_id": reg.user_id,
            "status": reg.status.value,
            "checked_in": reg.checked_in,
        },
    }), 200


# ---------------------------------------------------------------------------
# Reject participant (POST /registrations/<event_id>/reject/<user_id>)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/reject/<int:user_id>", methods=["POST"])
@jwt_required()
def reject_participant(event_id, user_id):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

    reg = Registration.query.filter_by(user_id=user_id, event_id=event_id).first()
    if not reg:
        return jsonify({"error": MSG_REGISTRATION_NOT_FOUND}), 404

    if reg.status == RegistrationStatus.CANCELLED:
        return jsonify({"error": "Already cancelled"}), 400

    was_registered = reg.status in (RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED)

    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)
    reg.checked_in = False
    reg.checked_in_at = None

    if was_registered:
        next_in_line = (
            Registration.query
            .filter_by(event_id=event_id, status=RegistrationStatus.WAITLISTED)
            .order_by(Registration.registered_at.asc())
            .first()
        )
        if next_in_line:
            next_in_line.status = RegistrationStatus.REGISTERED
            next_in_line.ensure_qr_token()
            db.session.commit()
            try:
                event_data = get_event(event_id)
                qr_png = _make_qr_png(next_in_line.qr_token)
                send_registration_email(
                    to_email=next_in_line.user_email,
                    event_title=event_data.get("title", ""),
                    event_date=_fmt_dt(event_data.get("start_datetime")),
                    event_location=event_data.get("location", ""),
                    qr_bytes=qr_png,
                )
            except Exception:
                pass

    db.session.commit()
    return jsonify({"message": "Participant removed from event"}), 200


# ---------------------------------------------------------------------------
# Event's registrations — legacy (GET /registrations/event/<id>)
# ---------------------------------------------------------------------------

@registrations_bp.route("/event/<int:event_id>", methods=["GET"])
@jwt_required()
def event_registrations(event_id):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

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
# Batch capacity counts — public (no personal data)
# GET /registrations/counts?event_ids=1,2,3
# ---------------------------------------------------------------------------

@registrations_bp.route("/counts", methods=["GET"])
def event_registration_counts():
    raw = request.args.get("event_ids", "").strip()
    if not raw:
        return jsonify({"counts": {}}), 200

    try:
        event_ids = [int(x) for x in raw.split(",") if x.strip()]
    except ValueError:
        return jsonify({"error": "Invalid event_ids parameter"}), 400

    result = {}
    for eid in event_ids:
        registered = Registration.query.filter_by(
            event_id=eid, status=RegistrationStatus.REGISTERED
        ).count()
        waitlisted = Registration.query.filter_by(
            event_id=eid, status=RegistrationStatus.WAITLISTED
        ).count()
        result[str(eid)] = {"registered": registered, "waitlisted": waitlisted}

    return jsonify({"counts": result}), 200


# ---------------------------------------------------------------------------
# Capacity summary for an event  (GET /registrations/event/<id>/count)
# ---------------------------------------------------------------------------

@registrations_bp.route("/event/<int:event_id>/count", methods=["GET"])
def event_registration_count(event_id):
    registered = _registered_count(event_id)
    waitlisted = Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.WAITLISTED
    ).count()
    attended = Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.ATTENDED
    ).count()
    return jsonify({
        "event_id": event_id,
        "registered": registered,
        "waitlisted": waitlisted,
        "attended": attended,
        "total_active": registered + waitlisted + attended,
    }), 200


# ---------------------------------------------------------------------------
# Cancel registration — legacy  (POST /registrations/<id>/cancel)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:registration_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_registration(registration_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()

    reg = db.session.get(Registration, registration_id)
    if not reg:
        return jsonify({"error": MSG_REGISTRATION_NOT_FOUND}), 404

    if reg.user_id != user_id and claims.get("role") != "admin":
        return jsonify({"error": "Not authorized"}), 403

    if reg.status == RegistrationStatus.CANCELLED:
        return jsonify({"error": "Already cancelled"}), 400

    was_registered = reg.status in (RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED)
    event_title = _event_title(reg.event_id)

    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)
    reg.checked_in = False
    reg.checked_in_at = None

    promotion_info = {"promoted": False}

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
            promotion_info = {
                "promoted": True,
                "promoted_user_id": next_in_line.user_id,
            }
            try:
                if next_in_line.user_email:
                    send_promotion_email(next_in_line.user_email, event_title)
            except Exception:
                pass

    db.session.commit()

    # Fire-and-forget emails
    try:
        canceller_email = claims.get("email", "")
        if canceller_email:
            send_cancellation_email(canceller_email, event_title)
    except Exception:
        pass

    return jsonify({
        "message": "Registration cancelled",
        "registration": reg.to_dict(),
        "waitlist_promotion": promotion_info,
    }), 200


# ---------------------------------------------------------------------------
# QR Ticket  (GET /registrations/<event_id>/ticket)
# Returns participant's QR code as base64 PNG
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/ticket", methods=["GET"])
@jwt_required()
def get_ticket(event_id):
    user_id = int(get_jwt_identity())

    reg = Registration.query.filter_by(user_id=user_id, event_id=event_id).first()
    if not reg or reg.status not in (RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED):
        return jsonify({"error": "No active registration found for this event"}), 404

    reg.ensure_qr_token()
    db.session.commit()

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(f"eventra:checkin:{reg.qr_token}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    try:
        event = get_event(event_id)
    except Exception:
        event = {"id": event_id, "title": f"Event #{event_id}"}

    return jsonify({
        "registration": reg.to_dict(),
        "qr_code": f"data:image/png;base64,{qr_b64}",
        "event": event,
    }), 200


# ---------------------------------------------------------------------------
# QR Check-in  (POST /registrations/checkin/qr/<token>)
# Organizer scans QR → checks in participant
# ---------------------------------------------------------------------------

@registrations_bp.route("/checkin/qr/<token>", methods=["POST"])
@jwt_required()
def checkin_by_qr(token):
    role_err = _require_organizer_role()
    if role_err:
        return role_err

    reg = Registration.query.filter_by(qr_token=token).first()
    if not reg:
        return jsonify({"error": "Invalid or unrecognised QR code"}), 404

    if reg.status == RegistrationStatus.CANCELLED:
        return jsonify({"error": "Registration has been cancelled"}), 400

    if reg.status == RegistrationStatus.WAITLISTED:
        return jsonify({"error": "Participant is on the waitlist, not confirmed"}), 400

    if reg.checked_in:
        return jsonify({
            "message": "Already checked in",
            "registration": reg.to_dict(),
            "already_checked_in": True,
        }), 200

    reg.status = RegistrationStatus.ATTENDED
    reg.checked_in = True
    reg.checked_in_at = datetime.now(timezone.utc)
    reg.confirmed_at = reg.checked_in_at
    db.session.commit()

    return jsonify({
        "message": "Check-in successful",
        "registration": reg.to_dict(),
        "already_checked_in": False,
    }), 200


# ---------------------------------------------------------------------------
# Confirm Attendance  (POST /registrations/<event_id>/confirm)
# Participant confirms they will attend (after receiving reminder email)
# ---------------------------------------------------------------------------

@registrations_bp.route("/<int:event_id>/confirm", methods=["POST"])
@jwt_required()
def confirm_attendance(event_id):
    user_id = int(get_jwt_identity())

    reg = Registration.query.filter_by(user_id=user_id, event_id=event_id).first()
    if not reg or reg.status != RegistrationStatus.REGISTERED:
        return jsonify({"error": "No pending registration found"}), 404

    reg.confirmed_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "message": "Attendance confirmed",
        "registration": reg.to_dict(),
    }), 200
