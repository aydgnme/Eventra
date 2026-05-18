"""
Mirror of auth-service User model.
Uses 'auth' bind to query the auth-service database directly.
"""
from datetime import datetime, timezone

from app import db


class User(db.Model):
    __bind_key__ = "auth"
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    full_name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="student")
    oauth_provider = db.Column(db.String(50), nullable=True)
    oauth_id = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
