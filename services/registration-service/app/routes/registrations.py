from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.registration import Registration, RegistrationStatus

registrations_bp = Blueprint("registrations", __name__)


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

    existing = Registration.query.filter_by(
        user_id=user_id, event_id=event_id
    ).first()
    if existing:
        return jsonify({"error": "Already registered for this event"}), 409

    registration = Registration(
        user_id=user_id,
        event_id=event_id,
        status=RegistrationStatus.REGISTERED,
    )
    db.session.add(registration)
    db.session.commit()

    return jsonify({
        "message": "Registered successfully",
        "registration": registration.to_dict(),
    }), 201


@registrations_bp.route("/my", methods=["GET"])
@jwt_required()
def my_registrations():
    user_id = int(get_jwt_identity())
    regs = Registration.query.filter_by(user_id=user_id).all()
    return jsonify({"registrations": [r.to_dict() for r in regs]}), 200


@registrations_bp.route("/event/<int:event_id>", methods=["GET"])
@jwt_required()
def event_registrations(event_id):
    regs = Registration.query.filter_by(event_id=event_id).all()
    return jsonify({"registrations": [r.to_dict() for r in regs]}), 200


@registrations_bp.route("/<int:registration_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_registration(registration_id):
    user_id = int(get_jwt_identity())

    reg = Registration.query.get(registration_id)
    if not reg:
        return jsonify({"error": "Registration not found"}), 404

    if reg.user_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    if reg.status == RegistrationStatus.CANCELLED:
        return jsonify({"error": "Already cancelled"}), 400

    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Registration cancelled", "registration": reg.to_dict()}), 200
