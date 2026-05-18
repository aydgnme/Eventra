import uuid
from datetime import datetime, timedelta, timezone

from app import db


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token = db.Column(
        db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4())
    )
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User", backref="reset_tokens")

    def __init__(self, **kwargs):
        if "expires_at" not in kwargs:
            kwargs["expires_at"] = datetime.now(timezone.utc) + timedelta(hours=1)
        if "token" not in kwargs:
            kwargs["token"] = str(uuid.uuid4())
        super().__init__(**kwargs)

    @property
    def is_expired(self):
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def is_valid(self):
        return not self.used and not self.is_expired
