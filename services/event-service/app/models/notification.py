import enum
from datetime import datetime, timezone

from app import db


class NotificationType(enum.Enum):
    REMINDER = "reminder"
    CONFIRMATION = "confirmation"
    CANCELLATION = "cancellation"


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=True, index=True)
    type = db.Column(db.Enum(NotificationType), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    sent_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "type": self.type.value,
            "message": self.message,
            "is_read": self.is_read,
            "sent_at": self.sent_at.isoformat(),
        }

    def __repr__(self):
        return f"<Notification user={self.user_id} type={self.type.value}>"
