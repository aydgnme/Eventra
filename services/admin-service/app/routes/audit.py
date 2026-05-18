from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from app import db
from app.models.audit_log import AuditLog

audit_bp = Blueprint("audit", __name__)


def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


def log_action(admin_id, action, target_type, target_id=None, detail=None):
    entry = AuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
    )
    db.session.add(entry)
    db.session.commit()


@audit_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
def list_logs():
    err = _admin_required()
    if err:
        return err

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)

    pagination = AuditLog.query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "logs": [log.to_dict() for log in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    }), 200
