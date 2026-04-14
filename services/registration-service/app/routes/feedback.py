from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.feedback import Feedback
from app.models.registration import Registration, RegistrationStatus

feedback_bp = Blueprint("feedback", __name__)


# ---------------------------------------------------------------------------
# Submit feedback
# ---------------------------------------------------------------------------

@feedback_bp.route("/", methods=["POST"])
@jwt_required()
def submit_feedback():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if data is None:
        return jsonify({"error": "No data provided"}), 400

    event_id = data.get("event_id")
    rating = data.get("rating")

    if not event_id:
        return jsonify({"error": "event_id is required"}), 400
    if rating is None:
        return jsonify({"error": "rating is required"}), 400
    if not isinstance(rating, int) or not (1 <= rating <= 5):
        return jsonify({"error": "rating must be an integer between 1 and 5"}), 400

    # Must have an active REGISTERED status (not waitlisted / cancelled)
    reg = Registration.query.filter_by(
        user_id=user_id,
        event_id=event_id,
        status=RegistrationStatus.REGISTERED,
    ).first()
    if not reg:
        return jsonify({"error": "You must be registered for this event to leave feedback"}), 403

    fb = Feedback(
        user_id=user_id,
        event_id=event_id,
        rating=rating,
        comment=data.get("comment"),
    )
    db.session.add(fb)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "You have already submitted feedback for this event"}), 409

    return jsonify({"message": "Feedback submitted", "feedback": fb.to_dict()}), 201


# ---------------------------------------------------------------------------
# List feedback for an event  (public — no JWT required)
# ---------------------------------------------------------------------------

@feedback_bp.route("/event/<int:event_id>", methods=["GET"])
def event_feedback(event_id):
    items = (
        Feedback.query
        .filter_by(event_id=event_id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    avg = round(sum(f.rating for f in items) / len(items), 2) if items else None
    return jsonify({
        "event_id": event_id,
        "feedback": [f.to_dict() for f in items],
        "count": len(items),
        "average_rating": avg,
    }), 200


# ---------------------------------------------------------------------------
# User's own feedback
# ---------------------------------------------------------------------------

@feedback_bp.route("/my", methods=["GET"])
@jwt_required()
def my_feedback():
    user_id = int(get_jwt_identity())
    items = (
        Feedback.query
        .filter_by(user_id=user_id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    return jsonify({"feedback": [f.to_dict() for f in items]}), 200


# ---------------------------------------------------------------------------
# Delete own feedback
# ---------------------------------------------------------------------------

@feedback_bp.route("/<int:feedback_id>", methods=["DELETE"])
@jwt_required()
def delete_feedback(feedback_id):
    user_id = int(get_jwt_identity())

    fb = db.session.get(Feedback, feedback_id)
    if not fb:
        return jsonify({"error": "Feedback not found"}), 404
    if fb.user_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    db.session.delete(fb)
    db.session.commit()
    return jsonify({"message": "Feedback deleted"}), 200
