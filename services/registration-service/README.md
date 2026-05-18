# Registration Service

Event registration, waitlist, check-in, and feedback microservice for Eventra.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /registrations/:eid/register | JWT | Register for event |
| DELETE | /registrations/:eid/register | JWT | Cancel registration |
| GET | /registrations/:eid/status | JWT | Check registration status |
| GET | /registrations/my | JWT | My registrations |
| POST | /registrations/:eid/waitlist | JWT | Join waitlist |
| DELETE | /registrations/:eid/waitlist | JWT | Leave waitlist |
| GET | /registrations/:eid/waitlist | organizer | View waitlist |
| GET | /registrations/:eid/participants | organizer | List participants |
| GET | /registrations/:eid/participants/export | organizer | Export CSV |
| POST | /registrations/:eid/checkin/:uid | organizer | Check in user |
| DELETE | /registrations/:eid/checkin/:uid | organizer | Undo check-in |
| POST | /feedback | JWT | Submit feedback (1-5 rating) |
| GET | /feedback/event/:eid | - | Event feedback |
| GET | /feedback/my | JWT | My feedback |

## Stack

- Flask 3.1 + Flask-JWT-Extended
- SQLAlchemy 2.0 + Alembic
- Resend API (email notifications)
- PostgreSQL 16 / SQLite (dev)

## Run Tests

```bash
python -m pytest tests/ -v
```
