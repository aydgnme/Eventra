# Admin Service

Administration panel microservice for Eventra.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /admin/users | admin | List users (paginated) |
| GET | /admin/users/:id | admin | Get user details |
| PATCH | /admin/users/:id/role | admin | Update user role |
| PATCH | /admin/users/:id/activate | admin | Activate user |
| PATCH | /admin/users/:id/deactivate | admin | Deactivate user |
| DELETE | /admin/users/:id | admin | Delete user |
| GET | /admin/events/pending | admin | Pending events |
| GET | /admin/events/all | admin | All events |
| POST | /admin/events/:id/validate | admin | Approve event |
| POST | /admin/events/:id/reject | admin | Reject with reason |
| POST | /admin/events/:id/publish | admin | Publish event |
| POST | /admin/events/:id/unpublish | admin | Unpublish event |
| GET | /admin/reports/summary | admin | Dashboard summary |
| GET | /admin/reports/events | admin | Events per month |
| GET | /admin/reports/organizers | admin | Top organizers |
| GET | /admin/reports/export | admin | PDF export |
| GET | /admin/reports/export/csv | admin | CSV export |

## Stack

- Flask 3.1 + Flask-JWT-Extended
- SQLAlchemy 2.0 + Alembic (event_reviews table)
- SQLALCHEMY_BINDS for cross-service DB access
- ReportLab (PDF export)
- PostgreSQL 16 / SQLite (dev)

## Run Tests

```bash
python -m pytest tests/ -v
```
