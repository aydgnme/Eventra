# Event Service

Event management microservice for Eventra.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /events | - | List events (search, filter, paginate) |
| GET | /events/:id | - | Event detail |
| POST | /events | organizer | Create event |
| PUT | /events/:id | organizer | Update event |
| DELETE | /events/:id | organizer/admin | Delete event |
| GET | /events/mine | organizer | My events |
| POST | /events/:id/submit | organizer | Submit for review |
| POST | /events/:id/cancel | organizer/admin | Cancel event |
| POST | /events/:id/materials | organizer | Upload material |
| GET | /events/:id/materials | - | List materials |
| DELETE | /events/:id/materials/:mid | organizer | Delete material |
| GET | /events/:id/materials/:mid/download | - | Download material |

## Search & Filter

Query params: `q`, `category`, `mode`, `from`, `to`, `page`, `per_page`

## Stack

- Flask 3.1 + Flask-JWT-Extended
- SQLAlchemy 2.0 + Alembic
- PostgreSQL 16 / SQLite (dev)

## Run Tests

```bash
python -m pytest tests/ -v
```
