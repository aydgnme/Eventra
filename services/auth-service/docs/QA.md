# Auth Service — QA Test Documentation

> **Service:** `auth-service` (port 5051)  
> **Base path (via gateway):** `http://localhost:5050/auth`  
> **Last updated:** 2026-04-02  
> **Test runner:** pytest  
> **Test directory:** `services/auth-service/tests/`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Environment Setup](#2-test-environment-setup)
3. [Test Coverage Summary](#3-test-coverage-summary)
4. [Endpoint Test Cases](#4-endpoint-test-cases)
   - [POST /auth/register](#41-post-authregister)
   - [POST /auth/login](#42-post-authlogin)
   - [GET /auth/me](#43-get-authme)
   - [POST /auth/logout](#44-post-authlogout)
   - [GET /auth/oauth/google](#45-get-authoauthgoogle)
   - [GET /auth/oauth/google/callback](#46-get-authoauthgooglecallback)
5. [Helper Function Test Cases](#5-helper-function-test-cases)
6. [Security Test Cases](#6-security-test-cases)
7. [Known Limitations](#7-known-limitations)
8. [Running the Tests](#8-running-the-tests)

---

## 1. Overview

The `auth-service` handles all authentication and user identity concerns for the Eventra platform. It provides:

- **Email/password registration and login** with role-based access (`student` / `organizer`)
- **JWT token issuance** consumed by the API gateway for downstream request authorization
- **Google OAuth 2.0 flow** for official USV student and staff accounts
- **Stateless logout** (no server-side session or token blacklist)

All tests use an **in-memory SQLite database** and **mocked external HTTP calls** (Google OAuth API). No network access is required to run the suite.

---

## 2. Test Environment Setup

### Prerequisites

```bash
cd services/auth-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pytest pytest-cov
```

### Environment Variables (test overrides in conftest.py)

| Variable | Test Value |
|---|---|
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///:memory:` |
| `SECRET_KEY` | `test-secret-key-32-bytes-long!!!` |
| `JWT_SECRET_KEY` | `test-jwt-secret-key-32-bytes!!!` |
| `GOOGLE_CLIENT_ID` | `test-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | `test-google-client-secret` |
| `FRONTEND_URL` | `http://localhost:5055` |

> No `.env` file is required to run tests. The `conftest.py` overrides all config values before the test database is created.

### Fixture Hierarchy

```
app (session)
└── client (function)
    ├── student_user (function)  →  student_token  →  auth_header
    ├── organizer_user (function) → organizer_token → organizer_auth_header
    ├── disabled_user (function)
    └── oauth_user (function)
clean_db (autouse, function) — wipes all rows after each test
```

---

## 3. Test Coverage Summary

| Module | File | Test Cases | Notes |
|---|---|---|---|
| POST /auth/register | `test_register.py` | 28 | Validation, duplicates, role/domain rules |
| POST /auth/login | `test_login.py` | 20 | Credentials, disabled accounts, JWT claims |
| GET /auth/me | `test_me.py` | 10 | Token validation, claim verification |
| POST /auth/logout | `test_logout.py` | 6 | Auth guard, stateless note |
| OAuth Google | `test_oauth.py` | 18 | Mocked Google API, state CSRF, DB side effects |
| Helpers | `test_helpers.py` | 43 | Pure functions, no DB needed |
| **Total** | | **125** | |

---

## 4. Endpoint Test Cases

---

### 4.1 POST /auth/register

**Purpose:** Create a new user account.  
**File:** `tests/test_register.py`

#### Request Schema
```json
{
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "full_name": "string (required)",
  "role": "student | organizer (optional, default: student)"
}
```

#### Success Cases

| TC-REG-01 | Student registration |
|---|---|
| Input | `email=new@student.usv.ro`, `password=securepassword`, `full_name=New Student`, `role=student` |
| Expected Status | `201 Created` |
| Expected Body | `{ "message": "User registered", "user": { "email": ..., "role": "student", "is_active": true } }` |

| TC-REG-02 | Organizer registration |
|---|---|
| Input | `email=new@company.com`, `password=securepassword`, `full_name=New Organizer`, `role=organizer` |
| Expected Status | `201 Created` |
| Expected Body | `{ "user": { "role": "organizer" } }` |

| TC-REG-03 | Default role for student email |
|---|---|
| Input | `email=test@student.usv.ro`, no `role` field |
| Expected Status | `201 Created` |
| Expected Body | `user.role == "student"` |

| TC-REG-04 | Password not exposed in response |
|---|---|
| Expected | `password` and `password_hash` keys absent from response body |

| TC-REG-05 | Timestamps in response |
|---|---|
| Expected | `created_at` and `updated_at` keys present in user object |

#### Validation Failure Cases (all return `400 Bad Request`)

| TC-REG-06 | Missing `email` | `{ "password": "...", "full_name": "..." }` |
|---|---|---|
| TC-REG-07 | Missing `password` | `{ "email": "...", "full_name": "..." }` |
| TC-REG-08 | Missing `full_name` | `{ "email": "...", "password": "..." }` |
| TC-REG-09 | No body | `POST /auth/register` with no JSON |
| TC-REG-10 | Empty JSON `{}` | No fields provided |
| TC-REG-11 | Empty string email | `email: ""` |
| TC-REG-12 | Empty string password | `password: ""` |
| TC-REG-13 | Password 7 chars | `password: "1234567"` → error includes "8 characters" |
| TC-REG-14 | Password exactly 8 chars | `password: "12345678"` → **`201`** (boundary pass) |
| TC-REG-15 | Invalid email formats | `not-an-email`, `@nodomain`, `spaces in@email.com`, etc. |
| TC-REG-16 | Invalid role | `role: "admin"` → error includes "Invalid role" |

#### Business Rule Failures (all return `400 Bad Request`)

| TC-REG-17 | Student email + organizer role |
|---|---|
| Input | `email=test@student.usv.ro`, `role=organizer` |
| Expected Error | "University emails can only register as student" |

| TC-REG-18 | Non-student email + student role |
|---|---|
| Input | `email=person@gmail.com`, `role=student` |
| Expected Error | message contains "@student.usv.ro" |

#### Conflict Cases

| TC-REG-19 | Duplicate email |
|---|---|
| Input | Register same email twice |
| Expected Status | `409 Conflict` |
| Expected Error | message contains "already registered" |

---

### 4.2 POST /auth/login

**Purpose:** Authenticate a user and return a JWT access token.  
**File:** `tests/test_login.py`

#### Request Schema
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

#### Success Cases

| TC-LOG-01 | Valid student credentials |
|---|---|
| Expected Status | `200 OK` |
| Expected Body | `{ "access_token": "...", "user": { ... } }` |

| TC-LOG-02 | JWT contains correct claims |
|---|---|
| Decoded JWT | `sub == user.id (string)`, `role == "student"`, `email == user email` |

| TC-LOG-03 | Organizer login returns correct role |
|---|---|
| Expected | `user.role == "organizer"` |

| TC-LOG-04 | Password not in response |
|---|---|
| Expected | `password` and `password_hash` absent from `user` object |

| TC-LOG-05 | OAuth-only user cannot login with password |
|---|---|
| Context | User has no `password_hash` (created via OAuth) |
| Expected Status | `401 Unauthorized` |

#### Failure Cases

| TC-LOG-06 | Wrong password | `401` — "Invalid credentials" |
|---|---|---|
| TC-LOG-07 | Non-existent email | `401` — same "Invalid credentials" message (no user enumeration) |
| TC-LOG-08 | Error messages identical (user enumeration) | `wrong_pass.error == no_user.error` |
| TC-LOG-09 | Disabled account | `403 Forbidden` — "Account is disabled" |
| TC-LOG-10 | Missing email | `400 Bad Request` |
| TC-LOG-11 | Missing password | `400 Bad Request` |
| TC-LOG-12 | No body | `400 Bad Request` |
| TC-LOG-13 | Empty JSON | `400 Bad Request` |
| TC-LOG-14 | Empty email string | `400 Bad Request` |
| TC-LOG-15 | Empty password string | `400 Bad Request` |

---

### 4.3 GET /auth/me

**Purpose:** Return the currently authenticated user's profile.  
**File:** `tests/test_me.py`  
**Auth required:** Bearer JWT

#### Success Cases

| TC-ME-01 | Valid token returns user |
|---|---|
| Expected Status | `200 OK` |
| Expected Body | `{ "user": { "email": "...", "role": "...", ... } }` |

| TC-ME-02 | User ID matches JWT subject |
|---|---|
| Expected | `user.id == int(jwt.sub)` |

| TC-ME-03 | Password not in response |
|---|---|
| Expected | `password` and `password_hash` absent |

| TC-ME-04 | Organizer can access /me |
|---|---|
| Expected Status | `200 OK`, `user.role == "organizer"` |

#### Failure Cases

| TC-ME-05 | No Authorization header | `401 Unauthorized` |
|---|---|---|
| TC-ME-06 | Invalid JWT string | `422 Unprocessable Entity` |
| TC-ME-07 | Malformed Authorization header (not "Bearer") | `401 Unauthorized` |
| TC-ME-08 | Empty Bearer token | `422 Unprocessable Entity` |
| TC-ME-09 | Token signed with wrong secret | `422 Unprocessable Entity` |

---

### 4.4 POST /auth/logout

**Purpose:** Signal client logout (stateless — no token blacklist).  
**File:** `tests/test_logout.py`  
**Auth required:** Bearer JWT

| TC-OUT-01 | Valid token → success |
|---|---|
| Expected Status | `200 OK` |
| Expected Body | `{ "message": "Logged out successfully" }` |

| TC-OUT-02 | No token | `401 Unauthorized` |
|---|---|---|
| TC-OUT-03 | Invalid token | `422 Unprocessable Entity` |
| TC-OUT-04 | Organizer can logout | `200 OK` |
| TC-OUT-05 | Token still usable after logout (stateless) | `GET /auth/me` returns `200` after logout |

> **Note:** The service does not implement a token blacklist. After calling `/logout`, the token remains cryptographically valid until its expiry. This is a documented design limitation — see [Section 7](#7-known-limitations).

---

### 4.5 GET /auth/oauth/google

**Purpose:** Initiate Google OAuth 2.0 authorization code flow.  
**File:** `tests/test_oauth.py`

| TC-OAU-01 | Redirects to Google |
|---|---|
| Expected Status | `302 Found` |
| Expected Location | contains `accounts.google.com` |

| TC-OAU-02 | Redirect contains required OAuth params |
|---|---|
| Expected | `response_type=code`, `scope=`, `state=`, `redirect_uri=` present in URL |

| TC-OAU-03 | Client ID in redirect URL |
|---|---|
| Expected | `GOOGLE_CLIENT_ID` value present in Location header |

---

### 4.6 GET /auth/oauth/google/callback

**Purpose:** Handle Google OAuth callback, create/find user, issue JWT.  
**File:** `tests/test_oauth.py`  
**External calls mocked:** `http_requests.post` (token exchange), `http_requests.get` (userinfo)

#### Guard / Error Cases (all return `302` redirect to `/login?oauth_error=...`)

| TC-CB-01 | `error` param from Google | e.g. `?error=access_denied` → redirect with `oauth_error` |
|---|---|---|
| TC-CB-02 | Missing `state` param | no state → invalid state error |
| TC-CB-03 | Invalid/tampered state | wrong HMAC signature |
| TC-CB-04 | Expired state (>300s) | timestamp too old |
| TC-CB-05 | Missing `code` param | valid state, no code |
| TC-CB-06 | Google token exchange failure | Google returns non-2xx |
| TC-CB-07 | Token response missing `access_token` | empty JSON `{}` from Google |
| TC-CB-08 | Google userinfo request failure | non-2xx on userinfo endpoint |
| TC-CB-09 | Non-USV email | `gmail.com` → domain not allowed |
| TC-CB-10 | Professor/staff email | `@usv.ro` or `@*.usv.ro` → accepted as organizer |
| TC-CB-11 | Disabled user via OAuth | existing disabled account → error redirect |

#### Success Cases

| TC-CB-12 | New user created and redirected |
|---|---|
| Expected | `302` to `/oauth/callback?token=<jwt>`, no `oauth_error` |

| TC-CB-13 | New student user persisted to database |
|---|---|
| Expected | `User` record with `role=student`, `oauth_provider=google`, `oauth_id` set |

| TC-CB-14 | New staff user persisted to database |
|---|---|
| Expected | `User` record with `role=organizer`, `oauth_provider=google`, `oauth_id` set |

| TC-CB-15 | Existing user: no duplicate created |
|---|---|
| Context | Student already registered with same email |
| Expected | Still exactly 1 row in `users` table, JWT returned |

---

## 5. Helper Function Test Cases

**File:** `tests/test_helpers.py`  
**Module:** `app/utils/helpers.py`

### `is_valid_email(email)`

| TC-HLP-01 | Valid email formats accepted | `user@example.com`, `user+tag@domain.co`, etc. |
|---|---|---|
| TC-HLP-02 | Invalid formats rejected | `not-an-email`, `@nodomain`, `double@@`, spaces, no TLD |

### `is_student_email(email)`

| TC-HLP-03 | `@student.usv.ro` emails accepted | |
|---|---|---|
| TC-HLP-04 | Other domains rejected | `@usv.ro`, `@gmail.com` |
| TC-HLP-05 | Case-sensitive check | `@STUDENT.USV.RO` rejected |
| TC-HLP-06 | Subdomain spoofing rejected | `@student.usv.ro.evil.com` rejected |

### `is_university_staff_email(email)`

| TC-HLP-07 | `@usv.ro` emails accepted | |
|---|---|---|
| TC-HLP-08 | Official USV subdomains accepted | `@eed.usv.ro`, `@atlas.usv.ro` |
| TC-HLP-09 | Student domain excluded | `@student.usv.ro` rejected here |
| TC-HLP-10 | Spoofed domains rejected | `@usv.ro.evil.com` rejected |

### `_full_name_from_email(email)`

| TC-HLP-11 | `john.doe@...` → `"John Doe"` | |
|---|---|---|
| TC-HLP-12 | `ion.popescu123@...` → `"Ion Popescu"` | trailing digits stripped |
| TC-HLP-13 | Single-part email → single name | |
| TC-HLP-14 | Empty local part → empty string | |

### `_make_state()` / `_verify_state(state)`

| TC-HLP-15 | `_make_state()` returns `timestamp:sig` format | |
|---|---|---|
| TC-HLP-16 | Signature is 16 hex characters | |
| TC-HLP-17 | Fresh state verifies successfully | |
| TC-HLP-18 | Tampered signature rejected | |
| TC-HLP-19 | State older than 300s rejected | |
| TC-HLP-20 | Garbage/empty strings rejected | |

---

## 6. Security Test Cases

These test cases verify that the service meets basic security requirements.

| SC-001 | Password not returned in any API response |
|---|---|
| Endpoints | `/register`, `/login`, `/me` |
| Check | `password` and `password_hash` absent from all `user` objects |

| SC-002 | User enumeration prevented |
|---|---|
| Endpoint | `POST /auth/login` |
| Check | Error message identical for wrong password vs. non-existent user |

| SC-003 | JWT signed with correct secret only |
|---|---|
| Check | Token signed with wrong key returns `422` on `/auth/me` |

| SC-004 | CSRF protection on OAuth state |
|---|---|
| Check | Tampered, expired, and missing state params all redirect with error |

| SC-005 | OAuth restricted to university domain |
|---|---|
| Check | `@gmail.com` rejected; `@student.usv.ro`, `@usv.ro`, and official `@*.usv.ro` staff domains accepted |

| SC-006 | Disabled accounts blocked at all auth paths |
|---|---|
| Check | `POST /auth/login` → `403`; OAuth callback → redirect with error |

| SC-007 | OAuth-only users cannot authenticate with password |
|---|---|
| Check | User with `password_hash=NULL` → `401` on login |

---

## 7. Known Limitations

| # | Limitation | Risk | Mitigation |
|---|---|---|---|
| L-001 | **No token blacklist** — logout is stateless | Stolen tokens remain valid until expiry | Implement Redis-based token denylist; use short JWT TTL |
| L-002 | **No password reset** endpoint | User cannot recover account if password is lost | Add email-based password reset flow |
| L-003 | **No password complexity requirements** | Weak passwords (e.g., `aaaaaaaa`) accepted | Add complexity validation in registration |
| ~~L-004~~ | ~~JWT expiry not explicitly set~~ | **Fixed** — `JWT_ACCESS_TOKEN_EXPIRES` set to 60 min via `config.py` | — |
| ~~L-005~~ | ~~Future-timestamp OAuth state passes~~ | **Fixed** — `_verify_state` now uses `abs()` for the age check | — |
| L-006 | **No rate limiting on `/auth/me`** | Unrestricted profile lookups | Add per-IP rate limit in gateway config |
| L-007 | **SQLite used in development** | No concurrent write guarantees | Use PostgreSQL in all non-test environments |
| L-008 | **Dev secrets in `.env`** | Credentials committed to repo | Rotate secrets; ensure `.env` is gitignored |

---

## 8. Running the Tests

### Run the full suite

```bash
cd services/auth-service
source venv/bin/activate
pytest
```

### Run with coverage report

```bash
pytest --cov=app --cov-report=term-missing
```

### Run a specific test file

```bash
pytest tests/test_register.py -v
```

### Run a specific test class or function

```bash
pytest tests/test_login.py::TestLoginFailure::test_disabled_account_returns_403 -v
```

### Run only fast tests (skip slow/integration marked tests)

```bash
pytest -m "not slow and not integration"
```

### Expected output (clean run)

```
tests/test_helpers.py     ........................................... [ 43 passed ]
tests/test_login.py       .................... [ 20 passed ]
tests/test_logout.py      ...... [  6 passed ]
tests/test_me.py          .......... [ 10 passed ]
tests/test_oauth.py       .................. [ 18 passed ]
tests/test_register.py    ............................ [ 28 passed ]
========== 125 passed in X.XXs ==========
```
