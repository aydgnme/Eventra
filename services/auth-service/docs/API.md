# Auth Service — API Reference

> **Base URL (direct):** `http://localhost:5051`  
> **Base URL (via gateway):** `http://localhost:5050/auth`  
> **Version:** 1.0  
> **Last updated:** 2026-04-02

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [JWT Token Structure](#3-jwt-token-structure)
4. [Rate Limiting](#4-rate-limiting)
5. [Endpoints](#5-endpoints)
   - [GET /health](#51-get-health)
   - [POST /auth/register](#52-post-authregister)
   - [POST /auth/login](#53-post-authlogin)
   - [GET /auth/me](#54-get-authme)
   - [POST /auth/logout](#55-post-authlogout)
   - [GET /auth/oauth/google](#56-get-authoauthgoogle)
   - [GET /auth/oauth/google/callback](#57-get-authoauthgooglecallback)
6. [Business Rules](#6-business-rules)
7. [Error Reference](#7-error-reference)
8. [Google OAuth Flow](#8-google-oauth-flow)

---

## 1. Overview

The `auth-service` handles all authentication and identity concerns for the Eventra platform:

- **Email/password registration and login** with role-based access (`student` / `organizer`)
- **JWT issuance** — tokens are verified by the gateway on every protected request; downstream services receive `X-User-ID` and `X-User-Role` headers
- **Google OAuth 2.0** — authorization code flow for official USV student and staff Google accounts
- **Stateless logout** — no server-side session; token validity is controlled solely by the JWT expiry (`60 minutes`)

All responses use `Content-Type: application/json`.

---

## 2. Authentication

Protected endpoints require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are issued by `POST /auth/login` and `GET /auth/oauth/google/callback`.  
Token lifetime: **60 minutes** (configured via `JWT_ACCESS_TOKEN_EXPIRES_MINUTES`).  
Algorithm: **HS256**.

---

## 3. JWT Token Structure

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload
```json
{
  "sub":   "1",                          // User ID (string)
  "role":  "student",                    // "student" | "organizer" | "admin"
  "email": "ion.popescu@student.usv.ro", // User email
  "iat":   1775137360,                   // Issued at (Unix timestamp)
  "exp":   1775140960,                   // Expires at (iat + 3600s)
  "nbf":   1775137360,                   // Not before
  "fresh": false,
  "type":  "access",
  "jti":   "a81ba39e-3016-4497-b07d-..."  // Unique token ID
}
```

The gateway decodes this token locally (shared `JWT_SECRET_KEY`) and forwards:
- `X-User-ID` → `sub`
- `X-User-Role` → `role`

---

## 4. Rate Limiting

Rate limits are enforced at the **gateway** level (per IP):

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 10 requests / minute |
| `POST /auth/register` | 5 requests / minute |
| All other routes | 200 requests / minute |

Exceeding a limit returns `429 Too Many Requests`.

---

## 5. Endpoints

---

### 5.1 GET /health

Health check. No authentication required.

**Request**
```
GET /health
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "service": "auth-service"
}
```

---

### 5.2 POST /auth/register

Create a new user account. No authentication required.

**Request**
```
POST /auth/register
Content-Type: application/json
```

**Body**
```json
{
  "email":     "ion.popescu@student.usv.ro",  // required
  "password":  "parola123",                   // required, min 8 characters
  "full_name": "Ion Popescu",                 // required
  "role":      "student"                      // optional — "student" | "organizer"
                                              // defaults to "student"
}
```

**Role / Domain Rules**

| Email domain | Allowed role | Notes |
|---|---|---|
| `@student.usv.ro` | `student` only | Registering as `organizer` → `400` |
| Any other domain | `organizer` only | Registering as `student` → `400` |
| Any domain | `admin` | Never allowed via self-registration → `400` |

If `role` is omitted, the domain is used to determine the correct role automatically.

---

**Response — 201 Created**
```json
{
  "message": "User registered",
  "user": {
    "id":         1,
    "email":      "ion.popescu@student.usv.ro",
    "full_name":  "Ion Popescu",
    "role":       "student",
    "is_active":  true,
    "created_at": "2026-04-02T13:42:17.960100",
    "updated_at": "2026-04-02T13:42:17.960105"
  }
}
```

> `password` and `password_hash` are **never** included in any response.

**Error Responses**

| Status | Condition | `error` field |
|---|---|---|
| `400` | Missing `email`, `password`, or `full_name` | `"email, password and full_name are required"` |
| `400` | Empty body or no `Content-Type` | `"No data provided"` |
| `400` | Password shorter than 8 characters | `"Password must be at least 8 characters"` |
| `400` | Invalid email format | `"Invalid email format"` |
| `400` | Invalid role value | `"Invalid role"` |
| `400` | `@student.usv.ro` email with `role=organizer` | `"University emails can only register as student"` |
| `400` | Non-university email with `role=student` | `"Student role requires a @student.usv.ro email"` |
| `409` | Email already registered | `"Email already registered"` |

**Example error**
```json
{
  "error": "Password must be at least 8 characters"
}
```

---

### 5.3 POST /auth/login

Authenticate with email and password. Returns a JWT access token.  
No authentication required.

**Request**
```
POST /auth/login
Content-Type: application/json
```

**Body**
```json
{
  "email":    "ion.popescu@student.usv.ro",  // required
  "password": "parola123"                    // required
}
```

**Response — 200 OK**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id":         1,
    "email":      "ion.popescu@student.usv.ro",
    "full_name":  "Ion Popescu",
    "role":       "student",
    "is_active":  true,
    "created_at": "2026-04-02T13:42:17.960100",
    "updated_at": "2026-04-02T13:42:17.960105"
  }
}
```

**Error Responses**

| Status | Condition | `error` field |
|---|---|---|
| `400` | Missing `email` or `password` | `"email and password are required"` |
| `400` | Empty body | `"No data provided"` |
| `401` | Wrong password | `"Invalid credentials"` |
| `401` | Email not found | `"Invalid credentials"` *(same message — no user enumeration)* |
| `401` | User has no password (OAuth-only account) | `"Invalid credentials"` |
| `403` | Account is disabled | `"Account is disabled"` |

> Wrong password and non-existent email return **identical** error messages to prevent user enumeration.

---

### 5.4 GET /auth/me

Return the profile of the currently authenticated user.  
**Authentication required.**

**Request**
```
GET /auth/me
Authorization: Bearer <access_token>
```

**Response — 200 OK**
```json
{
  "user": {
    "id":         1,
    "email":      "ion.popescu@student.usv.ro",
    "full_name":  "Ion Popescu",
    "role":       "student",
    "is_active":  true,
    "created_at": "2026-04-02T13:42:17.960100",
    "updated_at": "2026-04-02T13:42:17.960105"
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `401` | `Authorization` header missing |
| `401` | Header present but not `Bearer <token>` format |
| `404` | User ID from token not found in database |
| `422` | Token is malformed, has invalid signature, or is expired |

---

### 5.5 POST /auth/logout

Signal client logout. The server returns `200` but does **not** invalidate the token (stateless).  
**Authentication required.**

**Request**
```
POST /auth/logout
Authorization: Bearer <access_token>
```

**Response — 200 OK**
```json
{
  "message": "Logged out successfully"
}
```

> **Important:** This endpoint is stateless. The token remains cryptographically valid until its `exp` claim. The client is responsible for discarding the token locally (e.g., removing it from `localStorage`). A server-side token blacklist is not implemented.

**Error Responses**

| Status | Condition |
|---|---|
| `401` | `Authorization` header missing |
| `422` | Token is malformed or has an invalid signature |

---

### 5.6 GET /auth/oauth/google

Initiate the Google OAuth 2.0 authorization code flow.  
No authentication required. **Browser redirect only** — not suitable for direct API calls.

**Request**
```
GET /auth/oauth/google
```

**Response — 302 Found**

Redirects the browser to Google's authorization endpoint:

```
Location: https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=<GOOGLE_CLIENT_ID>
  &redirect_uri=http://localhost:5050/auth/oauth/google/callback
  &response_type=code
  &scope=openid+email+profile
  &state=<timestamp>:<hmac-sig>
  &access_type=offline
  &prompt=select_account
```

**CSRF State Parameter**

The `state` value is `{unix_timestamp}:{HMAC-SHA256[:16]}`, signed with `SECRET_KEY`.  
The callback verifies the state within a **300-second** window. States with timestamps more than 300 seconds in the past **or** future are rejected.

---

### 5.7 GET /auth/oauth/google/callback

Handle the Google OAuth callback. Exchanges the authorization code for a user token, creates or finds the user, and issues a JWT.  
**Browser redirect only.**

**Request**
```
GET /auth/oauth/google/callback?code=<auth_code>&state=<state>
```

| Query param | Description |
|---|---|
| `code` | Authorization code from Google |
| `state` | CSRF state token generated in step 5.6 |
| `error` | Set by Google when the user denies access (e.g. `access_denied`) |

---

**Success — 302 Found**

Redirects the browser to the frontend OAuth callback page with the JWT:

```
Location: http://localhost:5055/oauth/callback?token=<jwt>
```

The frontend reads `?token=`, stores it, and navigates to the dashboard.

---

**Error — 302 Found (redirect to login with error)**

All error cases redirect to:
```
Location: http://localhost:5055/login?oauth_error=<url-encoded-message>
```

| Condition | `oauth_error` message |
|---|---|
| `?error=` param from Google | `"Google sign-in was cancelled or failed."` |
| Missing or empty `state` | `"Invalid state parameter. Please try again."` |
| Tampered CSRF state | `"Invalid state parameter. Please try again."` |
| Expired state (>300s old or future) | `"Invalid state parameter. Please try again."` |
| Missing `code` param | `"Authorization code missing."` |
| Google token exchange fails | `"Failed to obtain access token from Google."` |
| Token response has no `access_token` | `"Failed to parse token response from Google."` |
| Google userinfo request fails | `"Failed to retrieve profile info from Google."` |
| Email not from an official USV student or staff domain | `"Only official USV student and staff Google accounts are allowed."` |
| Account is disabled | `"Your account has been disabled. Contact support."` |

---

**Database side effects on success**

| Scenario | Action |
|---|---|
| Student email not in database | New `User` created with `role=student`, `oauth_provider=google`, `oauth_id=<sub>` |
| Staff email not in database | New `User` created with `role=organizer`, `oauth_provider=google`, `oauth_id=<sub>` |
| Email already registered (password user) | `oauth_provider` and `oauth_id` back-filled on existing record; role is synced from the email domain |
| Email already registered (OAuth user) | No change — JWT issued for existing record |

> **Domain restriction:** Google OAuth accepts `@student.usv.ro` student accounts and official USV staff domains such as `@usv.ro` or `@*.usv.ro`.

---

## 6. Business Rules

### Role Assignment

```
Email ends with @student.usv.ro  →  role must be "student"
Email is any other domain        →  role must be "organizer"
role = "admin"                   →  never allowed via API (400)
```

### Password Policy

- Minimum **8 characters**
- No maximum length
- No complexity requirements (uppercase, digits, symbols not enforced)

### Account States

| `is_active` | Login (password) | Login (OAuth) |
|---|---|---|
| `true` | Allowed | Allowed |
| `false` | `403 Forbidden` | `302 → oauth_error` |

### OAuth-only Accounts

Users created via Google OAuth have `password_hash = NULL`. Attempting to authenticate with a password returns `401 Invalid credentials`.

---

## 7. Error Reference

All error responses follow this structure:

```json
{
  "error": "Human-readable error message"
}
```

Flask-JWT-Extended errors (token validation failures) use:

```json
{
  "msg": "Missing Authorization Header"
}
```

### HTTP Status Code Summary

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created (registration success) |
| `302` | Redirect (OAuth flow) |
| `400` | Bad Request — invalid input or missing fields |
| `401` | Unauthorized — missing or invalid credentials / token |
| `403` | Forbidden — valid credentials but access denied (disabled account, wrong role) |
| `404` | Not Found — authenticated but user record missing |
| `409` | Conflict — duplicate email |
| `422` | Unprocessable — JWT present but malformed / wrong signature / expired |
| `429` | Too Many Requests — rate limit exceeded (gateway) |
| `503` | Service Unavailable — downstream service unreachable (gateway) |
| `504` | Gateway Timeout — downstream service timed out (gateway) |

---

## 8. Google OAuth Flow

```
Browser                    Frontend               Gateway            auth-service          Google
   |                          |                      |                    |                   |
   |  Click "Sign in Google"  |                      |                    |                   |
   |------------------------->|                      |                    |                   |
   |                          |  GET /auth/oauth/google                   |                   |
   |                          |------------------------------------------>|                   |
   |                          |                      |          302 → accounts.google.com     |
   |<--------------------------------------------------------------------------redirect--------|
   |                          |                      |                    |                   |
   |  User selects account / grants permission        |                    |                   |
   |----------------------------------------------------------------------->                   |
   |                          |                      |                    |                   |
   |   GET /auth/oauth/google/callback?code=...&state=...                 |                   |
   |--------------------------------------------->(via gateway)--------->|                   |
   |                          |                      |    POST token exchange                 |
   |                          |                      |                    |------------------>|
   |                          |                      |                    |  {access_token}   |
   |                          |                      |                    |<------------------|
   |                          |                      |                    |  GET userinfo     |
   |                          |                      |                    |------------------>|
   |                          |                      |                    |  {email, name}    |
   |                          |                      |                    |<------------------|
   |                          |                      |          Find or create User           |
   |                          |                      |                    |  Issue JWT        |
   |                          |  302 /oauth/callback?token=<jwt>          |                   |
   |<-------------------------|<-----------------------------------------|                   |
   |                          |                      |                    |                   |
   |  loginWithToken(token)   |                      |                    |                   |
   |------------------------->|                      |                    |                   |
   |                          |  Store JWT, navigate to /dashboard        |                   |
```

### State / CSRF Protection

The `state` parameter prevents CSRF attacks on the OAuth callback:

```
state = "{unix_timestamp}:{HMAC-SHA256(timestamp, SECRET_KEY)[:16]}"
```

Verification rejects states where:
- The HMAC signature does not match (tampered)
- `abs(now - timestamp) > 300` seconds (expired or future-dated)
- The format is invalid (missing `:`, non-numeric timestamp)

---

## Appendix — Quick Reference

```bash
BASE="http://localhost:5051"

# Health
curl "$BASE/health"

# Register student
curl -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@student.usv.ro","password":"parola123","full_name":"Ion Popescu","role":"student"}'

# Register organizer
curl -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@company.ro","password":"parola456!","full_name":"Maria Ionescu","role":"organizer"}'

# Login
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@student.usv.ro","password":"parola123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get current user
curl "$BASE/auth/me" -H "Authorization: Bearer $TOKEN"

# Logout
curl -X POST "$BASE/auth/logout" -H "Authorization: Bearer $TOKEN"

# Start Google OAuth (open in browser)
open "$BASE/auth/oauth/google"
```
