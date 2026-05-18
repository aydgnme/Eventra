# API Gateway

Central API gateway for Eventra microservices.

## Features

- JWT verification via auth-service
- Role-based route protection (student/organizer/admin)
- Rate limiting (Flask-Limiter, Redis in production)
- Cloudflare enforcement (production)
- Request ID tracing (X-Request-ID)
- Health check aggregation

## Routes

| Prefix | Target |
|--------|--------|
| /auth/* | auth-service:5001 |
| /events/* | event-service:5002 |
| /registrations/* | registration-service:5003 |
| /feedback/* | registration-service:5003 |
| /admin/* | admin-service:5004 |

## Rate Limits

- Default: 100/min
- Login/Register: 20/min
- Production: Redis-backed

## Stack

- Flask 3.1 + Flask-CORS + Flask-Limiter
- Gunicorn (production)

## Run Tests

```bash
python -m pytest tests/ -v
```
