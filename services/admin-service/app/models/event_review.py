"""
Admin-service's own table to track event review decisions.
Stored in the admin service's own database (no bind key = default DB).
"""
from datetime import datetime, timezone

from app import db


class ReviewStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EventReview(db.Model):
    __tablename__ = "event_reviews"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, nullable=False, unique=True, index=True)
    status = db.Column(db.String(20), nullable=False, default=ReviewStatus.PENDING)
    rejection_reason = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, nullable=True)  # admin user_id
    reviewed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "event_id": self.event_id,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }
