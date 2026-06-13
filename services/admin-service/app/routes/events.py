from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func

from app import db
from app.models.event import Event, EventCategory
from app.models.event_review import EventReview, ReviewStatus
from app.models.user import User
from app.routes.audit import log_action
from app.utils.email_client import send_event_validated_email, send_event_rejected_email

events_bp = Blueprint("admin_events", __name__)

MSG_EVENT_NOT_FOUND = "Event not found"


def _apply_search_filters(query, search: str, category: str):
    """Apply common search and category filters to an event query."""
    if search:
        query = query.filter(Event.title.ilike(f"%{search}%"))
    if category:
        try:
            cat_enum = EventCategory(category)
            query = query.filter(Event.category == cat_enum)
        except ValueError:
            return None, (jsonify({"error": f"Invalid category: {category}"}), 400)
    return query, None


def _enrich_events_with_review(events, include_rejection=False):
    """Add review status and organizer info to a list of events."""
    event_ids = [e.id for e in events]
    reviews = {
        r.event_id: r
        for r in EventReview.query.filter(EventReview.event_id.in_(event_ids)).all()
    } if event_ids else {}

    organizer_ids = list({e.organizer_id for e in events})
    organizers = {
        u.id: u for u in User.query.filter(User.id.in_(organizer_ids)).all()
    } if organizer_ids else {}

    result = []
    for event in events:
        data = event.to_dict()
        review = reviews.get(event.id)
        data["review_status"] = review.status if review else ReviewStatus.PENDING
        if include_rejection:
            data["rejection_reason"] = review.rejection_reason if review else None
            data["reviewed_at"] = review.reviewed_at.isoformat() if review and review.reviewed_at else None
        org = organizers.get(event.organizer_id)
        data["organizer_name"] = org.full_name if org else None
        data["organizer_email"] = org.email if org else None
        result.append(data)
    return result


def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


def _get_or_create_review(event_id: int) -> EventReview:
    review = EventReview.query.filter_by(event_id=event_id).first()
    if not review:
        review = EventReview(event_id=event_id, status=ReviewStatus.PENDING)
        db.session.add(review)
    return review


# ---------------------------------------------------------------------------
# GET /admin/events/pending  — events awaiting review
# ---------------------------------------------------------------------------

@events_bp.route("/pending", methods=["GET"])
@jwt_required()
def pending_events():
    err = _admin_required()
    if err:
        return err

    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    organizer_search = request.args.get("organizer", "").strip()

    rejected_ids = [
        r.event_id
        for r in EventReview.query.filter_by(status=ReviewStatus.REJECTED).all()
    ]

    query = Event.query.filter_by(is_published=False)
    if rejected_ids:
        query = query.filter(Event.id.notin_(rejected_ids))

    query, filter_err = _apply_search_filters(query, search, category)
    if filter_err:
        return filter_err

    if organizer_search:
        matching_organizer_ids = [
            u.id for u in User.query.filter(
                User.full_name.ilike(f"%{organizer_search}%")
            ).all()
        ]
        if not matching_organizer_ids:
            return jsonify({"events": [], "total": 0}), 200
        query = query.filter(Event.organizer_id.in_(matching_organizer_ids))

    events = query.order_by(Event.created_at.asc()).all()
    result = _enrich_events_with_review(events)

    return jsonify({"events": result, "total": len(result)}), 200


# ---------------------------------------------------------------------------
# GET /admin/events/stats  — counts for dashboard cards
# ---------------------------------------------------------------------------

@events_bp.route("/stats", methods=["GET"])
@jwt_required()
def event_stats():
    err = _admin_required()
    if err:
        return err

    today = datetime.now(timezone.utc).date()

    rejected_ids = [
        r.event_id for r in EventReview.query.filter_by(status=ReviewStatus.REJECTED).all()
    ]
    pending_count = Event.query.filter_by(is_published=False).filter(
        Event.id.notin_(rejected_ids) if rejected_ids else True
    ).count()

    approved_today = EventReview.query.filter_by(status=ReviewStatus.APPROVED).filter(
        func.date(EventReview.reviewed_at) == today
    ).count()

    rejected_today = EventReview.query.filter_by(status=ReviewStatus.REJECTED).filter(
        func.date(EventReview.reviewed_at) == today
    ).count()

    total_approved = EventReview.query.filter_by(status=ReviewStatus.APPROVED).count()
    total_rejected = EventReview.query.filter_by(status=ReviewStatus.REJECTED).count()

    return jsonify({
        "pending_count": pending_count,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "total_approved": total_approved,
        "total_rejected": total_rejected,
    }), 200


# ---------------------------------------------------------------------------
# GET /admin/events/all  — all events filterable by review status
# ---------------------------------------------------------------------------

def _build_status_query(status_filter: str):
    """Build base query filtered by review status."""
    if status_filter == ReviewStatus.APPROVED:
        ids = [r.event_id for r in EventReview.query.filter_by(status=ReviewStatus.APPROVED).all()]
        return Event.query.filter(Event.id.in_(ids)) if ids else Event.query.filter(False)
    if status_filter == ReviewStatus.REJECTED:
        ids = [r.event_id for r in EventReview.query.filter_by(status=ReviewStatus.REJECTED).all()]
        return Event.query.filter(Event.id.in_(ids)) if ids else Event.query.filter(False)
    if status_filter == ReviewStatus.PENDING:
        rejected_ids = [r.event_id for r in EventReview.query.filter_by(status=ReviewStatus.REJECTED).all()]
        query = Event.query.filter_by(is_published=False)
        return query.filter(Event.id.notin_(rejected_ids)) if rejected_ids else query
    return Event.query


@events_bp.route("/all", methods=["GET"])
@jwt_required()
def all_events():
    err = _admin_required()
    if err:
        return err

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()

    query = _build_status_query(request.args.get("status", "").strip())

    query, filter_err = _apply_search_filters(query, search, category)
    if filter_err:
        return filter_err

    pagination = query.order_by(Event.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    result = _enrich_events_with_review(pagination.items, include_rejection=True)

    return jsonify({
        "events": result,
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
        "per_page": per_page,
    }), 200


# ---------------------------------------------------------------------------
# POST /admin/events/<id>/validate  — approve & publish event
# ---------------------------------------------------------------------------

@events_bp.route("/<int:event_id>/validate", methods=["POST"])
@jwt_required()
def validate_event(event_id):
    err = _admin_required()
    if err:
        return err

    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": MSG_EVENT_NOT_FOUND}), 404

    admin_id = int(get_jwt_identity())
    review = _get_or_create_review(event_id)
    review.status = ReviewStatus.APPROVED
    review.rejection_reason = None
    review.reviewed_by = admin_id
    review.reviewed_at = datetime.now(timezone.utc)

    event.is_published = True
    db.session.commit()

    log_action(admin_id, "validate_event", "event", event_id)

    organizer = db.session.get(User, event.organizer_id)
    if organizer and organizer.email:
        send_event_validated_email(organizer.email, event.title)

    return jsonify({
        "message": "Event validated and published",
        "event": event.to_dict(),
    }), 200


# ---------------------------------------------------------------------------
# POST /admin/events/<id>/reject
# ---------------------------------------------------------------------------

@events_bp.route("/<int:event_id>/reject", methods=["POST"])
@jwt_required()
def reject_event(event_id):
    err = _admin_required()
    if err:
        return err

    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": MSG_EVENT_NOT_FOUND}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "rejection reason is required"}), 400
    if len(reason) < 20:
        return jsonify({"error": "rejection reason must be at least 20 characters"}), 400

    admin_id = int(get_jwt_identity())
    review = _get_or_create_review(event_id)
    review.status = ReviewStatus.REJECTED
    review.rejection_reason = reason
    review.reviewed_by = admin_id
    review.reviewed_at = datetime.now(timezone.utc)

    event.is_published = False
    db.session.commit()

    log_action(admin_id, "reject_event", "event", event_id, reason)

    organizer = db.session.get(User, event.organizer_id)
    if organizer and organizer.email:
        send_event_rejected_email(organizer.email, event.title, reason)

    return jsonify({
        "message": "Event rejected",
        "event": event.to_dict(),
        "rejection_reason": reason,
    }), 200


# ---------------------------------------------------------------------------
# POST /admin/events/<id>/publish  — directly publish without validation flow
# ---------------------------------------------------------------------------

@events_bp.route("/<int:event_id>/publish", methods=["POST"])
@jwt_required()
def publish_event(event_id):
    err = _admin_required()
    if err:
        return err

    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": MSG_EVENT_NOT_FOUND}), 404

    admin_id = int(get_jwt_identity())
    review = _get_or_create_review(event_id)
    review.status = ReviewStatus.APPROVED
    review.rejection_reason = None
    review.reviewed_by = admin_id
    review.reviewed_at = datetime.now(timezone.utc)

    event.is_published = True
    db.session.commit()

    log_action(admin_id, "publish_event", "event", event_id)
    return jsonify({
        "message": "Event published successfully",
        "event": event.to_dict(),
    }), 200


# ---------------------------------------------------------------------------
# POST /admin/events/<id>/unpublish
# ---------------------------------------------------------------------------

@events_bp.route("/<int:event_id>/unpublish", methods=["POST"])
@jwt_required()
def unpublish_event(event_id):
    err = _admin_required()
    if err:
        return err

    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"error": MSG_EVENT_NOT_FOUND}), 404

    if not event.is_published:
        return jsonify({"error": "Event is not published"}), 400

    event.is_published = False
    db.session.commit()

    log_action(int(get_jwt_identity()), "unpublish_event", "event", event_id)
    return jsonify({
        "message": "Event unpublished successfully",
        "event": event.to_dict(),
    }), 200
