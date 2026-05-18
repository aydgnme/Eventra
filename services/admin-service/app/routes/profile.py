from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.user import User

profile_bp = Blueprint("admin_profile", __name__)


def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


# ---------------------------------------------------------------------------
# GET /admin/profile  — current admin's own profile
# ---------------------------------------------------------------------------

@profile_bp.route("/", methods=["GET"])
@jwt_required()
def get_profile():
    err = _admin_required()
    if err:
        return err

    admin_id = int(get_jwt_identity())
    user = db.session.get(User, admin_id)
    if not user:
        return jsonify({"error": "Admin profile not found"}), 404

    return jsonify({"profile": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# PATCH /admin/profile  — update own display name
# ---------------------------------------------------------------------------

@profile_bp.route("/", methods=["PATCH"])
@jwt_required()
def update_profile():
    err = _admin_required()
    if err:
        return err

    admin_id = int(get_jwt_identity())
    user = db.session.get(User, admin_id)
    if not user:
        return jsonify({"error": "Admin profile not found"}), 404

    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    if not full_name:
        return jsonify({"error": "full_name is required"}), 400

    user.full_name = full_name
    db.session.commit()

    return jsonify({"message": "Profile updated", "profile": user.to_dict()}), 200
