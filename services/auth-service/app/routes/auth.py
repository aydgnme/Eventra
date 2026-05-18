import re
import smtplib
from email.mime.text import MIMEText

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from werkzeug.security import generate_password_hash

from app import db
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.utils.helpers import is_valid_email

auth_bp = Blueprint("auth", __name__)

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


def _validate_password(password: str) -> bool:
    return bool(PASSWORD_PATTERN.match(password))


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided", "status": 400}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "").strip()

    if not email or not password or not full_name:
        return (
            jsonify(
                {"error": "email, password and full_name are required", "status": 400}
            ),
            400,
        )

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format", "status": 400}), 400

    if role not in ("organizer", "admin"):
        return (
            jsonify(
                {
                    "error": "Invalid role. Students must use Google OAuth",
                    "status": 400,
                }
            ),
            400,
        )

    if not _validate_password(password):
        return (
            jsonify(
                {
                    "error": "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 digit",
                    "status": 400,
                }
            ),
            400,
        )

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered", "status": 409}), 409

    user = User(
        email=email,
        full_name=full_name,
        role=role,
        oauth_provider="local",
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered", "user": user.to_dict()}), 201


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided", "status": 400}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return (
            jsonify({"error": "email and password are required", "status": 400}),
            400,
        )

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "Invalid credentials", "status": 401}), 401

    if user.oauth_provider == "google":
        return (
            jsonify(
                {
                    "error": "This account uses Google OAuth. Please sign in with Google.",
                    "status": 403,
                }
            ),
            403,
        )

    if not user.check_password(password):
        return jsonify({"error": "Invalid credentials", "status": 401}), 401

    if not user.is_active:
        return jsonify({"error": "Account is disabled", "status": 403}), 403

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )

    return jsonify({"access_token": access_token, "user": user.to_dict()}), 200


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out successfully"}), 200


# ---------------------------------------------------------------------------
# Profile — GET & PUT /auth/me
# ---------------------------------------------------------------------------


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided", "status": 400}), 400

    full_name = data.get("full_name")
    if full_name is not None:
        full_name = full_name.strip()
        if len(full_name) < 2 or len(full_name) > 255:
            return (
                jsonify(
                    {
                        "error": "full_name must be between 2 and 255 characters",
                        "status": 400,
                    }
                ),
                400,
            )
        user.full_name = full_name

    db.session.commit()

    return (
        jsonify({"message": "Profile updated successfully", "user": user.to_dict()}),
        200,
    )


# ---------------------------------------------------------------------------
# Token Management — refresh & verify
# ---------------------------------------------------------------------------


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required()
def refresh():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user or not user.is_active:
        return jsonify({"error": "User not found or inactive", "status": 401}), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )

    expires_seconds = int(
        current_app.config["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds()
    )

    return jsonify({"access_token": access_token, "expires_in": expires_seconds}), 200


@auth_bp.route("/verify", methods=["POST"])
def verify():
    data = request.get_json()
    if not data or not data.get("token"):
        return jsonify({"valid": False, "error": "Token is required"}), 400

    try:
        decoded = decode_token(data["token"])
        user_id = decoded["sub"]
        user = db.session.get(User, int(user_id))

        if not user or not user.is_active:
            return jsonify({"valid": False, "error": "User not found or inactive"}), 401

        return (
            jsonify(
                {
                    "valid": True,
                    "user_id": user.id,
                    "role": user.role,
                    "email": user.email,
                }
            ),
            200,
        )
    except Exception:
        return jsonify({"valid": False, "error": "Token has expired"}), 401


# ---------------------------------------------------------------------------
# Google OAuth — credential-based (POST /auth/google) & client-id
# ---------------------------------------------------------------------------


@auth_bp.route("/google", methods=["POST"])
def google_auth():
    data = request.get_json()
    if not data or not data.get("credential"):
        return (
            jsonify({"error": "Credential token is required", "status": 400}),
            400,
        )

    credential = data["credential"]

    try:
        idinfo = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            current_app.config["GOOGLE_CLIENT_ID"],
        )
    except ValueError:
        return jsonify({"error": "Invalid Google token", "status": 401}), 401

    email = idinfo.get("email", "")
    name = idinfo.get("name", "")
    google_sub = idinfo.get("sub", "")
    picture = idinfo.get("picture", "")

    if not email.endswith("@student.usv.ro"):
        return (
            jsonify(
                {"error": "Only @student.usv.ro emails are allowed", "status": 403}
            ),
            403,
        )

    user = User.query.filter_by(oauth_id=google_sub).first()
    is_new_user = False

    if user:
        if name and user.full_name != name:
            user.full_name = name
            db.session.commit()
    else:
        user = User.query.filter_by(email=email).first()
        if user:
            user.oauth_provider = "google"
            user.oauth_id = google_sub
            if name and user.full_name != name:
                user.full_name = name
            db.session.commit()
        else:
            is_new_user = True
            user = User(
                email=email,
                full_name=name or email.split("@")[0],
                role="student",
                oauth_provider="google",
                oauth_id=google_sub,
            )
            db.session.add(user)
            db.session.commit()

    if not user.is_active:
        return (
            jsonify(
                {
                    "error": "Account is disabled. Contact administrator.",
                    "status": 403,
                }
            ),
            403,
        )

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )

    return (
        jsonify(
            {
                "access_token": access_token,
                "user": user.to_dict(),
                "is_new_user": is_new_user,
            }
        ),
        200,
    )


@auth_bp.route("/google/client-id", methods=["GET"])
def google_client_id():
    client_id = current_app.config.get("GOOGLE_CLIENT_ID")
    return jsonify({"client_id": client_id}), 200


# ---------------------------------------------------------------------------
# Password Management
# ---------------------------------------------------------------------------


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    if user.oauth_provider == "google":
        return (
            jsonify(
                {
                    "error": "Google OAuth users cannot change password",
                    "status": 400,
                }
            ),
            400,
        )

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided", "status": 400}), 400

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return (
            jsonify(
                {
                    "error": "current_password and new_password are required",
                    "status": 400,
                }
            ),
            400,
        )

    if not user.check_password(current_password):
        return (
            jsonify({"error": "Current password is incorrect", "status": 401}),
            401,
        )

    if user.check_password(new_password):
        return (
            jsonify(
                {
                    "error": "New password must be different from current password",
                    "status": 400,
                }
            ),
            400,
        )

    if not _validate_password(new_password):
        return (
            jsonify(
                {
                    "error": "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 digit",
                    "status": 400,
                }
            ),
            400,
        )

    user.set_password(new_password)
    db.session.commit()

    return jsonify({"message": "Password changed successfully"}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    generic_msg = "If this email is registered, a reset link has been sent"

    if not data or not data.get("email"):
        return jsonify({"message": generic_msg}), 200

    email = data["email"].strip()
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": generic_msg}), 200

    if user.oauth_provider == "google":
        return jsonify({"message": generic_msg}), 200

    reset_token = PasswordResetToken(user_id=user.id)
    db.session.add(reset_token)
    db.session.commit()

    reset_link = f"{current_app.config.get('FRONTEND_RESET_PASSWORD_URL')}?token={reset_token.token}"

    smtp_host = current_app.config.get("SMTP_HOST")
    smtp_port = int(current_app.config.get("SMTP_PORT") or 587)
    smtp_user = current_app.config.get("SMTP_USER")
    smtp_password = current_app.config.get("SMTP_PASSWORD")
    mail_from = current_app.config.get("SMTP_MAIL_FROM") or smtp_user

    if smtp_user and smtp_password:
        try:
            msg = MIMEText(
                f"Hesabınızın şifresini sıfırlamak için lütfen aşağıdaki bağlantıya tıklayın:\n\n"
                f"{reset_link}\n\n"
                f"Bu bağlantı güvenlik nedeniyle 1 saat içinde geçerliliğini yitirecektir.\n\n"
                f"Eğer bu isteği siz yapmadıysanız, bu e-postayı dikkate almayabilirsiniz."
            )
            msg["Subject"] = "Eventra — Şifre Sıfırlama İsteği"
            msg["From"] = f"Eventra <{mail_from}>"
            msg["To"] = email

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        except Exception as e:
            current_app.logger.error(f"Failed to send reset email to {email}: {str(e)}")

    return jsonify({"message": generic_msg}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    if not data:
        return (
            jsonify({"error": "No data provided", "status": 400}),
            400,
        )

    token_str = data.get("token", "").strip()
    new_password = data.get("new_password", "").strip()

    if not token_str or not new_password:
        return (
            jsonify(
                {"error": "token and new_password are required", "status": 400}
            ),
            400,
        )

    reset_token = PasswordResetToken.query.filter_by(token=token_str).first()

    if not reset_token or not reset_token.is_valid:
        return (
            jsonify(
                {"error": "Reset token is invalid or expired", "status": 400}
            ),
            400,
        )

    if not _validate_password(new_password):
        return (
            jsonify(
                {
                    "error": "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 digit",
                    "status": 400,
                }
            ),
            400,
        )

    user = db.session.get(User, reset_token.user_id)
    if not user:
        return (
            jsonify({"error": "Reset token is invalid or expired", "status": 400}),
            400,
        )

    user.set_password(new_password)
    reset_token.used = True
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Password reset successfully. Please log in with your new password."
            }
        ),
        200,
    )
