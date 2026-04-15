from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.event import Event
from app.models.event_review import EventReview, ReviewStatus

events_bp = Blueprint("admin_events", __name__)


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

    # Pending = not yet published and not explicitly rejected
    rejected_ids = [
        r.event_id
        for r in EventReview.query.filter_by(status=ReviewStatus.REJECTED).all()
    ]

    query = Event.query.filter_by(is_published=False)
    if rejected_ids:
        query = query.filter(Event.id.notin_(rejected_ids))

    events = query.order_by(Event.created_at.asc()).all()

    result = []
    for event in events:
        data = event.to_dict()
        review = EventReview.query.filter_by(event_id=event.id).first()
        data["review_status"] = review.status if review else ReviewStatus.PENDING
        result.append(data)

    return jsonify({"events": result, "total": len(result)}), 200


# ---------------------------------------------------------------------------
# GET /admin/events/all  — all events (published + pending + rejected)
# ---------------------------------------------------------------------------

@events_bp.route("/all", methods=["GET"])
@jwt_required()
def all_events():
    err = _admin_required()
    if err:
        return err

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    pagination = Event.query.order_by(Event.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    reviews = {
        r.event_id: r
        for r in EventReview.query.filter(
            EventReview.event_id.in_([e.id for e in pagination.items])
        ).all()
    }

    result = []
    for event in pagination.items:
        data = event.to_dict()
        review = reviews.get(event.id)
        data["review_status"] = review.status if review else ReviewStatus.PENDING
        data["rejection_reason"] = review.rejection_reason if review else None
        result.append(data)

    return jsonify({
        "events": result,
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
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
        return jsonify({"error": "Event not found"}), 404

    admin_id = int(get_jwt_identity())
    review = _get_or_create_review(event_id)
    review.status = ReviewStatus.APPROVED
    review.rejection_reason = None
    review.reviewed_by = admin_id
    review.reviewed_at = datetime.now(timezone.utc)

    event.is_published = True
    db.session.commit()

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
        return jsonify({"error": "Event not found"}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "rejection reason is required"}), 400

    admin_id = int(get_jwt_identity())
    review = _get_or_create_review(event_id)
    review.status = ReviewStatus.REJECTED
    review.rejection_reason = reason
    review.reviewed_by = admin_id
    review.reviewed_at = datetime.now(timezone.utc)

    event.is_published = False
    db.session.commit()

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
        return jsonify({"error": "Event not found"}), 404

    admin_id = int(get_jwt_identity())
    review = _get_or_create_review(event_id)
    review.status = ReviewStatus.APPROVED
    review.rejection_reason = None
    review.reviewed_by = admin_id
    review.reviewed_at = datetime.now(timezone.utc)

    event.is_published = True
    db.session.commit()

    return jsonify({
        "message": "Event published",
        "event": event.to_dict(),
    }), 200
