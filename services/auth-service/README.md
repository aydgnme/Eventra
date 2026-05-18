# Auth Service

Authentication and authorization microservice for Eventra.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | - | Register (organizer/admin) |
| POST | /auth/login | - | Login with email/password |
| POST | /auth/logout | JWT | Logout |
| POST | /auth/refresh | JWT | Refresh access token |
| GET | /auth/me | JWT | Get current user profile |
| PUT | /auth/me | JWT | Update profile |
| POST | /auth/verify | - | Verify JWT token (internal) |
| POST | /auth/google | - | Google ID token login |
| GET | /auth/oauth/google | - | Google OAuth redirect |
| GET | /auth/oauth/google/callback | - | OAuth callback |
| POST | /auth/forgot-password | - | Send password reset email |
| POST | /auth/reset-password | - | Reset password with token |

## Stack

- Flask 3.1 + Flask-JWT-Extended
- SQLAlchemy 2.0 + Alembic
- PostgreSQL 16 / SQLite (dev)
- Google OAuth 2.0 (@student.usv.ro)

## Run Tests

```bash
python -m pytest tests/ -v
```
