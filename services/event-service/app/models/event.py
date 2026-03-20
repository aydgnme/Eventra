import enum
from datetime import datetime, timezone

from app import db


class EventCategory(enum.Enum):
    ACADEMIC = "academic"
    SPORT = "sport"
    CAREER = "career"
    VOLUNTEER = "volunteer"
    CULTURAL = "cultural"


class ParticipationMode(enum.Enum):
    PHYSICAL = "physical"
    ONLINE = "online"
    HYBRID = "hybrid"


class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_datetime = db.Column(db.DateTime(timezone=True), nullable=False)
    end_datetime = db.Column(db.DateTime(timezone=True), nullable=False)
    location = db.Column(db.String(255), nullable=True)
    category = db.Column(db.Enum(EventCategory), nullable=True)
    participation_mode = db.Column(db.Enum(ParticipationMode), nullable=True)
    capacity = db.Column(db.Integer, nullable=True)
    qr_code = db.Column(db.String(500), nullable=True)
    link_registration = db.Column(db.String(500), nullable=True)
    is_published = db.Column(db.Boolean, default=False, nullable=False)
    organizer_id = db.Column(db.Integer, nullable=False, index=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    materials = db.relationship('Material', backref='event', lazy=True, cascade='all, delete-orphan')
    sponsors = db.relationship('Sponsor', backref='event', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "start_datetime": self.start_datetime.isoformat() if self.start_datetime else None,
            "end_datetime": self.end_datetime.isoformat() if self.end_datetime else None,
            "location": self.location,
            "category": self.category.value if self.category else None,
            "participation_mode": self.participation_mode.value if self.participation_mode else None,
            "capacity": self.capacity,
            "qr_code": self.qr_code,
            "link_registration": self.link_registration,
            "is_published": self.is_published,
            "organizer_id": self.organizer_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Event {self.title}>"
