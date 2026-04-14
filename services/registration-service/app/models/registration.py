import enum
from datetime import datetime, timezone

from app import db


class RegistrationStatus(enum.Enum):
    REGISTERED = "registered"
    WAITLISTED = "waitlisted"
    CANCELLED = "cancelled"


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
    registered_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )
    cancelled_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'event_id', name='uq_user_event'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "status": self.status.value,
            "registered_at": self.registered_at.isoformat(),
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
        }

    def __repr__(self):
        return f"<Registration user={self.user_id} event={self.event_id} status={self.status.value}>"
