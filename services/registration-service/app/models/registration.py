import enum
import uuid
from datetime import datetime, timezone

from app import db


class RegistrationStatus(enum.Enum):
    REGISTERED = "registered"
    WAITLISTED = "waitlisted"
    CANCELLED = "cancelled"
    ATTENDED = "attended"


class Registration(db.Model):
    __tablename__ = 'registrations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    event_id = db.Column(db.Integer, nullable=False, index=True)
    status = db.Column(
        db.Enum(RegistrationStatus),
        nullable=False,
        default=RegistrationStatus.REGISTERED,
    )
    user_email = db.Column(db.String(255), nullable=True)
    checked_in = db.Column(db.Boolean, default=False, nullable=False)
    checked_in_at = db.Column(db.DateTime, nullable=True)
    registered_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )
    cancelled_at = db.Column(db.DateTime, nullable=True)

    # QR & confirmation
    qr_token = db.Column(db.String(64), unique=True, nullable=True, index=True)
    confirmation_sent_at = db.Column(db.DateTime, nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'event_id', name='uq_user_event'),
    )

    def ensure_qr_token(self):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "status": self.status.value,
            "user_email": self.user_email,
            "checked_in": self.checked_in,
            "checked_in_at": self.checked_in_at.isoformat() if self.checked_in_at else None,
            "registered_at": self.registered_at.isoformat(),
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "qr_token": self.qr_token,
            "confirmation_sent_at": self.confirmation_sent_at.isoformat() if self.confirmation_sent_at else None,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
        }

    def __repr__(self):
        return f"<Registration user={self.user_id} event={self.event_id} status={self.status.value}>"
