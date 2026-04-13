Admin Service
=============

User management, event validation and report generation for administrators.

.. note::

   Admin Service runs in a separate Python environment.
   Run ``sphinx-apidoc`` from ``services/admin-service/`` for full autodoc.

Access Control
--------------

All ``/admin`` routes are protected at the gateway level.
Only users with ``role: admin`` can reach these endpoints.
