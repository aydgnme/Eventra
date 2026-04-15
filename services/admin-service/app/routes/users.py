from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from app import db
from app.models.user import User

users_bp = Blueprint("users", __name__)

VALID_ROLES = ("student", "organizer", "admin")


def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


# ---------------------------------------------------------------------------
# GET /admin/users  — paginated list
# ---------------------------------------------------------------------------

@users_bp.route("/", methods=["GET"])
@jwt_required()
def list_users():
    err = _admin_required()
    if err:
        return err

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    role = request.args.get("role")
    search = request.args.get("search", "").strip()

    query = User.query
    if role:
        query = query.filter_by(role=role)
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) | (User.full_name.ilike(f"%{search}%"))
        )

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "users": [u.to_dict() for u in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
        "per_page": per_page,
    }), 200


# ---------------------------------------------------------------------------
# GET /admin/users/<id>
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    err = _admin_required()
    if err:
        return err

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# PATCH /admin/users/<id>/activate
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>/activate", methods=["PATCH"])
@jwt_required()
def activate_user(user_id):
    err = _admin_required()
    if err:
        return err

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.is_active = True
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "User activated", "user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# PATCH /admin/users/<id>/deactivate
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
def deactivate_user(user_id):
    err = _admin_required()
    if err:
        return err

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "User deactivated", "user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# PATCH /admin/users/<id>/role
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>/role", methods=["PATCH"])
@jwt_required()
def update_role(user_id):
    err = _admin_required()
    if err:
        return err

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    role = data.get("role")
    if role not in VALID_ROLES:
        return jsonify({"error": f"Invalid role. Valid roles: {list(VALID_ROLES)}"}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.role = role
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Role updated", "user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# DELETE /admin/users/<id>
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    err = _admin_required()
    if err:
        return err

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted"}), 200
