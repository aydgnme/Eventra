import enum
from datetime import datetime, timezone

from app import db


class FileType(enum.Enum):
    PDF = "pdf"
    IMAGE = "image"
    PRESENTATION = "presentation"


class Material(db.Model):
    __tablename__ = 'materials'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False, index=True)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.Enum(FileType), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    uploaded_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_type": self.file_type.value if self.file_type else None,
            "file_size": self.file_size,
            "uploaded_at": self.uploaded_at.isoformat(),
        }

    def __repr__(self):
        return f"<Material {self.file_name}>"
