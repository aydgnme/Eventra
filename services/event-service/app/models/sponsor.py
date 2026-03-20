from app import db


class Sponsor(db.Model):
    __tablename__ = 'sponsors'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    logo_url = db.Column(db.String(500), nullable=True)
    website_url = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "name": self.name,
            "logo_url": self.logo_url,
            "website_url": self.website_url,
        }

    def __repr__(self):
        return f"<Sponsor {self.name}>"
