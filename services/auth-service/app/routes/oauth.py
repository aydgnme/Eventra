from urllib.parse import quote, urlencode

import requests as http_requests
from flask import Blueprint, current_app, redirect, request
from flask_jwt_extended import create_access_token

from app import db
from app.models.user import User
from app.utils.helpers import _full_name_from_email, _make_state, _verify_state

oauth_bp = Blueprint("oauth", __name__)

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo"

ALLOWED_DOMAIN = "student.usv.ro"


def _redirect_error(message: str):
    frontend_url = current_app.config["FRONTEND_URL"]
    return redirect(f"{frontend_url}/login?oauth_error={quote(message)}")


@oauth_bp.route("/google")
def google_login():
    params = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
        "response_type": "code",
        "scope": "openid email profile",
        "state": _make_state(),
        "access_type": "offline",
        "prompt": "select_account",
    }
    return redirect(f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}")


@oauth_bp.route("/google/callback")
def google_callback():
    # 1. Check for error from Google (user denied, etc.)
    error = request.args.get("error")
    if error:
        return _redirect_error("Google sign-in was cancelled or failed.")

    # 2. Verify state (CSRF protection)
    state = request.args.get("state", "")
    if not _verify_state(state):
        return _redirect_error("Invalid state parameter. Please try again.")

    # 3. Exchange code for token
    code = request.args.get("code")
    if not code:
        return _redirect_error("Authorization code missing.")

    token_resp = http_requests.post(
        GOOGLE_TOKEN_ENDPOINT,
        data={
            "code": code,
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
            "grant_type": "authorization_code",
        },
    )
    if not token_resp.ok:
        return _redirect_error("Failed to obtain access token from Google.")

    # 4. Get user info
    google_token = token_resp.json().get("access_token")
    if not google_token:
        return _redirect_error("Failed to parse token response from Google.")

    info_resp = http_requests.get(
        GOOGLE_USERINFO_ENDPOINT,
        headers={"Authorization": f"Bearer {google_token}"},
    )
    if not info_resp.ok:
        return _redirect_error("Failed to retrieve profile info from Google.")

    profile = info_resp.json()
    email = profile.get("email", "")
    if not email:
        return _redirect_error("Email not provided by Google.")

    full_name = profile.get("name", "") or _full_name_from_email(email)

    # 5. Verify email domain
    if not email.endswith(f"@{ALLOWED_DOMAIN}"):
        return _redirect_error(f"Only @{ALLOWED_DOMAIN} accounts are allowed.")

    # 6. Find or create user
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            role="student",
            oauth_provider="google",
            oauth_id=profile.get("sub"),
        )
        db.session.add(user)
        db.session.commit()
    elif not user.oauth_provider:
        user.oauth_provider = "google"
        user.oauth_id = profile.get("sub")
        db.session.commit()

    if not user.is_active:
        return _redirect_error("Your account has been disabled. Contact support.")

    # 7. Create JWT token
    jwt_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )
    frontend_url = current_app.config["FRONTEND_URL"]
    return redirect(f"{frontend_url}/oauth/callback?token={jwt_token}")
