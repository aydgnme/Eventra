from datetime import datetime, timezone

from app import db


class Feedback(db.Model):
    __tablename__ = 'feedback'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    event_id = db.Column(db.Integer, nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint('user_id', 'event_id', name='uq_feedback_user_event'),
        db.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_rating_range'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Feedback user={self.user_id} event={self.event_id} rating={self.rating}>"
