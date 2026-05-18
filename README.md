# Eventra

Centralized university event management platform built with Flask microservices and React. Helps students, organizers, and admins publish, discover, and manage campus events in one place.

## Tech Stack

**Backend:** Flask 3.x, SQLAlchemy 2.x, Flask-JWT-Extended, PostgreSQL
**Frontend:** React 19, Vite 7, Tailwind CSS 4, React Query, React Router 7
**Infrastructure:** Docker Compose, API Gateway pattern, Resend (email)

## Architecture

```
┌─────────────┐     ┌──────────┐     ┌────────────────┐
│   Frontend   │────▶│ Gateway  │────▶│  auth-service   │
│  React SPA   │     │ (proxy)  │     │  event-service  │
│  port 5055   │     │ port 5050│     │  reg-service    │
└─────────────┘     └──────────┘     │  admin-service  │
                                      └───────┬────────┘
                                              │
                                      ┌───────▼────────┐
                                      │  PostgreSQL 16  │
                                      │   port 5432     │
                                      └────────────────┘
```

| Service | Port (host) | Port (internal) | Description |
|---------|------------|-----------------|-------------|
| Frontend | 5055 | 5173 | React SPA |
| Gateway | 5050 | 5000 | API proxy, JWT verification, rate limiting |
| Auth | 5051 | 5001 | Registration, login, OAuth, password management |
| Event | 5052 | 5002 | Event CRUD, search/filter, materials upload |
| Registration | 5053 | 5003 | Registration, waitlist, check-in, feedback |
| Admin | 5054 | 5004 | User management, event validation, reports |
| PostgreSQL | 5432 | 5432 | Database |

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/aydgnme/Eventra.git
cd Eventra

# 2. Create .env from example and fill in your values
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Open the app
open http://localhost:5055
```

`docker-compose.override.yml` is loaded automatically for local development. It exposes
service ports on `localhost`, mounts source folders, and uses development Docker targets.

## Online Deployment (Cloud Docker + Vercel)

For the backend, run the production compose stack on the cloud host. It publishes the
gateway as the public API and keeps the microservices, PostgreSQL, and Redis on the
Docker network:

```bash
cp .env.example .env
# Fill strong secrets and your real domain values in .env
docker compose -f docker-compose.yml up -d --build \
  db redis auth-service event-service registration-service admin-service gateway
```

Required online URL values:

```bash
CORS_ORIGINS=https://your-vercel-project.vercel.app,https://yourdomain.com
OAUTH_FRONTEND_URL=https://your-vercel-project.vercel.app
OAUTH_GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/oauth/google/callback
GATEWAY_PORT=5000
CLOUDFLARE_ONLY=true
```

For HTTPS, put the gateway behind a reverse proxy such as Caddy, Traefik, Nginx, or
Cloudflare Tunnel and point it to the published gateway port. If Vercel calls the API
domain directly without Cloudflare, set `CLOUDFLARE_ONLY=false`.

For Vercel, deploy the `frontend/` directory and set:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_OAUTH_BASE=https://api.yourdomain.com
```

The frontend still defaults to `/api` for local Docker/Nginx deployments.

## Continuous Deployment

The `CD` workflow runs after `CI` succeeds on `main`.

Backend CD publishes production backend images to GitHub Container Registry:

```bash
ghcr.io/aydgnme/eventra-gateway
ghcr.io/aydgnme/eventra-auth-service
ghcr.io/aydgnme/eventra-event-service
ghcr.io/aydgnme/eventra-registration-service
ghcr.io/aydgnme/eventra-admin-service
```

If these GitHub repository secrets are present, the workflow also deploys the backend
stack over SSH:

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Cloud server hostname or IP |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private SSH key for deployment |
| `DEPLOY_PATH` | Absolute repo path on the server |
| `DEPLOY_PORT` | Optional SSH port, defaults to `22` |
| `DEPLOY_KNOWN_HOSTS` | Optional pinned SSH known_hosts entry |
| `GHCR_READ_TOKEN` | Optional token with `read:packages` if GHCR images are private |

The server must have Docker, Docker Compose, Git, this repository checked out at
`DEPLOY_PATH`, and a production `.env` file in that directory.

Frontend CD is handled by Vercel's GitHub integration. Configure the Vercel project
with root directory `frontend`, build command `npm run build`, and output directory
`dist`.

## Environment Variables

Copy `.env.example` to `.env` in the project root and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | Yes | Strong random JWT signing secret |
| `POSTGRES_USER` | Yes | PostgreSQL application user |
| `POSTGRES_PASSWORD` | Yes | Strong PostgreSQL password |
| `OAUTH_GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `OAUTH_GOOGLE_REDIRECT_URI` | Yes | Google callback URL, e.g. `https://yourdomain.com/api/auth/oauth/google/callback` |
| `OAUTH_FRONTEND_URL` | Yes | Public frontend origin, e.g. `https://yourdomain.com` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins |
| `RESEND_API_KEY` | Yes | Resend API key for email notifications |
| `MAIL_FROM` | No | Sender email (default: `Eventra <noreply@eventra.app>`) |
| `FRONTEND_PORT` | No | Published frontend port for production compose, default `80` |

## Local Development

### Backend (any service)

```bash
cd services/auth-service   # or event-service, registration-service, etc.
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests (per service)
cd services/auth-service
source venv/bin/activate
python -m pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

## Project Structure

```
Eventra/
├── docker-compose.yml          # Dev environment orchestration
├── .env.example                # Required environment variables
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # Auth, Theme, Toast contexts
│   │   ├── hooks/              # React Query custom hooks
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client modules
│   │   └── tests/              # Vitest unit tests
│   └── package.json
├── services/
│   ├── gateway/                # API gateway (proxy + auth)
│   ├── auth-service/           # Authentication & authorization
│   ├── event-service/          # Event management
│   ├── registration-service/   # Registration & feedback
│   └── admin-service/          # Admin panel backend
└── docs/                       # ERD, Postman collection
```

## User Roles

| Role | Access |
|------|--------|
| **Student** | Browse events, register, leave feedback (via Google OAuth @student.usv.ro) |
| **Organizer** | Create/manage events, upload materials, view participants |
| **Admin** | Manage users, validate events, view reports |

## API Documentation

Import `docs/eventra-alpha.postman_collection.json` into Postman for the full API reference.

## Static Analysis

SonarQube local setup and scan instructions are documented in [`docs/SONARQUBE.md`](docs/SONARQUBE.md).

## Validation

The project verification and validation report is documented in [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md).

The B2-level English Lab 5 version is available in [`docs/LAB5_VALIDATION_ANALYSIS_B2.md`](docs/LAB5_VALIDATION_ANALYSIS_B2.md).

## License

[MIT](LICENSE)
