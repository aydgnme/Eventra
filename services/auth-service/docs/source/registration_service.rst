Registration Service
====================

Handles event registrations, waitlisting, capacity checks and feedback.

.. note::

   Registration Service runs in a separate Python environment.
   Run ``sphinx-apidoc`` from ``services/registration-service/`` for full autodoc.

Models
------

**Registration** — status: ``pending``, ``confirmed``, ``waitlisted``, ``cancelled``

**Feedback** — user feedback attached to registrations after event completion.
