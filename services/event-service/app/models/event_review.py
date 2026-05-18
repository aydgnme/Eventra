from app import db


class EventReview(db.Model):
    """Read-only mirror of the admin-service event_reviews table."""
    __tablename__ = 'event_reviews'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, nullable=False, unique=True, index=True)
    status = db.Column(db.String(20), nullable=False, default='pending')
    rejection_reason = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
