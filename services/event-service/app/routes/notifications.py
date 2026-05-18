from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models.notification import Notification

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/my", methods=["GET"])
@jwt_required()
def my_notifications():
    user_id = int(get_jwt_identity())
    notes = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(Notification.sent_at.desc())
        .limit(50)
        .all()
    )
    unread = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({"notifications": [n.to_dict() for n in notes], "unread_count": unread}), 200


@notifications_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@jwt_required()
def mark_read(notification_id):
    user_id = int(get_jwt_identity())
    note = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not note:
        return jsonify({"error": "Not found"}), 404
    note.is_read = True
    db.session.commit()
    return jsonify({"ok": True}), 200


@notifications_bp.route("/mark-all-read", methods=["POST"])
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"ok": True}), 200
