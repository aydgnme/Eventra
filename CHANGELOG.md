# Changelog

All notable changes to the Eventra project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-30

### Added
- **Event Service**: QR code generation endpoint (`GET /events/:id/qr`) with `qrcode` library
- **Event Service**: ICS calendar export endpoint (`GET /events/:id/ics`) with `icalendar` library
- **Admin Service**: Audit log model, routes (`GET /admin/audit`), and Alembic migration
- **Admin Service**: CSV export endpoint for event reports (`GET /admin/reports/export/csv`)
- **Frontend**: Footer component, SkeletonCard loading component, useDebounce hook
- **Documentation**: Service-level README files for all microservices

## [1.0.0] - 2026-04-29

### Added
- **Auth Service**: User registration, login, JWT authentication, Google OAuth (@student.usv.ro), password reset flow
- **Event Service**: Full CRUD for events, search & filter (text, category, date range, mode), pagination, materials upload/download, sponsors model
- **Registration Service**: Event registration with capacity check, waitlist with FIFO auto-promotion, check-in/check-out, feedback & ratings (1-5), email notifications via Resend API, participant CSV export
- **Admin Service**: User management (activate/deactivate/role change), event validation workflow (approve/reject/publish), reports (summary, events-per-month, top-organizers), PDF export
- **API Gateway**: Centralized routing, JWT verification, role-based access control, rate limiting, Cloudflare enforcement, health check aggregation
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4, role-based routing (student/organizer/admin), dark/light theme, event browsing with filters, QR code display, ICS calendar export, admin dashboard
- **DevOps**: Multi-stage Dockerfiles (dev/prod), docker-compose with health checks, GitHub Actions CI, Nginx production config, Alembic migrations for all services
- **Documentation**: README with architecture diagram, ERD diagram, Postman collection, Sphinx API docs

## [0.1.0] - 2026-03-12

### Added
- Initial project scaffolding
- Flask microservices skeleton
- React frontend bootstrap
- Docker Compose development environment
- PostgreSQL 16 database setup
