API Gateway
===========

Central entry point for all client requests.
Handles JWT validation, rate limiting, and proxying to downstream services.

.. note::

   Gateway runs in a separate Python environment.
   Run ``sphinx-apidoc`` from ``services/gateway/`` for full autodoc.

Routing Table
-------------

.. list-table::
   :header-rows: 1

   * - Prefix
     - Target Service
   * - ``/auth``
     - auth-service
   * - ``/events``
     - event-service
   * - ``/registrations``
     - registration-service
   * - ``/admin``
     - admin-service

Public Routes (no JWT required)
---------------------------------

- ``POST /auth/register``
- ``POST /auth/login``
- ``GET /events/*`` (read-only event listing and detail)
- ``GET /auth/oauth/*``
- ``GET /health``

Rate Limits
-----------

- Login: configurable via ``RATELIMIT_AUTH_LOGIN``
- Register: configurable via ``RATELIMIT_AUTH_REGISTER``

Cloudflare Protection
---------------------

In production (``CLOUDFLARE_ONLY=true``), requests without a ``CF-Ray`` header are rejected.
