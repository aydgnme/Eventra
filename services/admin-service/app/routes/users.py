from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.event import Event
from app.models.user import User
from app.routes.audit import log_action

users_bp = Blueprint("users", __name__)

VALID_ROLES = ("student", "organizer", "admin")
MSG_USER_NOT_FOUND = "User not found"


def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


# ---------------------------------------------------------------------------
# GET /admin/users  — paginated list
# ---------------------------------------------------------------------------

@users_bp.route("/", methods=["GET"], strict_slashes=False)
@jwt_required()
def list_users():
    err = _admin_required()
    if err:
        return err

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    role = request.args.get("role")
    is_active = request.args.get("is_active")
    search = request.args.get("search", "").strip()

    query = User.query
    if role:
        query = query.filter_by(role=role)
    if is_active is not None:
        query = query.filter_by(is_active=is_active.lower() == "true")
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
        return jsonify({"error": MSG_USER_NOT_FOUND}), 404

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
        return jsonify({"error": MSG_USER_NOT_FOUND}), 404

    user.is_active = True
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    log_action(int(get_jwt_identity()), "activate_user", "user", user_id)
    return jsonify({"message": "User activated successfully", "user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# PATCH /admin/users/<id>/deactivate
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
def deactivate_user(user_id):
    err = _admin_required()
    if err:
        return err

    current_admin_id = int(get_jwt_identity())

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": MSG_USER_NOT_FOUND}), 404

    if user.id == current_admin_id:
        return jsonify({"error": "Cannot deactivate your own account"}), 400

    if user.role == "admin":
        return jsonify({"error": "Cannot deactivate an admin account"}), 400

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    log_action(current_admin_id, "deactivate_user", "user", user_id)
    return jsonify({"message": "User deactivated successfully", "user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# PATCH /admin/users/<id>/role
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>/role", methods=["PATCH"])
@jwt_required()
def update_role(user_id):
    err = _admin_required()
    if err:
        return err

    current_admin_id = int(get_jwt_identity())

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    role = data.get("role")
    if role not in VALID_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": MSG_USER_NOT_FOUND}), 404

    if user.id == current_admin_id:
        return jsonify({"error": "Cannot change your own role"}), 400

    if user.role == "admin":
        return jsonify({"error": "Cannot change role of an admin account"}), 400

    old_role = user.role
    user.role = role
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    log_action(current_admin_id, "update_role", "user", user_id, f"{old_role} -> {role}")
    return jsonify({"message": "User role updated successfully", "user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# DELETE /admin/users/<id>
# ---------------------------------------------------------------------------

@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    err = _admin_required()
    if err:
        return err

    current_admin_id = int(get_jwt_identity())

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": MSG_USER_NOT_FOUND}), 404

    if user.id == current_admin_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    if user.role == "admin":
        return jsonify({"error": "Cannot delete an admin account"}), 400

    # Cascade: delete organizer's events (and their reviews) before deleting the user
    if user.role == "organizer":
        organizer_events = Event.query.filter_by(organizer_id=user.id).all()
        for event in organizer_events:
            db.session.delete(event)

    db.session.delete(user)
    db.session.commit()

    log_action(current_admin_id, "delete_user", "user", user_id)
    return jsonify({"message": "User deleted successfully"}), 200
