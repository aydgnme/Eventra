Event Service
=============

Manages event lifecycle — create, edit, delete, search, filter.
Also handles file materials upload (PDF, images, PPTX).

.. note::

   Event Service runs in a separate Python environment.
   Run ``sphinx-apidoc`` from ``services/event-service/`` for full autodoc.

Endpoints
---------

**Public**

- ``GET /events/`` — List published events (search, filter, pagination)
- ``GET /events/<id>`` — Get event detail

**Organizer / Admin** *(JWT required)*

- ``POST /events/`` — Create event
- ``PUT /events/<id>`` — Update event
- ``DELETE /events/<id>`` — Delete event
- ``GET /events/mine`` — List own events (including drafts)

**Materials** *(JWT required for write)*

- ``GET /events/<id>/materials`` — List materials
- ``POST /events/<id>/materials`` — Upload file (PDF, PNG, JPG, PPTX — max 16 MB)
- ``DELETE /events/<id>/materials/<mid>`` — Delete material
- ``GET /events/<id>/materials/<mid>/download`` — Download file

Models
------

**Event fields:** ``title``, ``description``, ``start_datetime``, ``end_datetime``,
``location``, ``category`` (academic/sport/career/volunteer/cultural),
``participation_mode`` (physical/online/hybrid), ``capacity``, ``qr_code``,
``link_registration``, ``is_published``, ``organizer_id``

**Material fields:** ``file_name``, ``file_path``, ``file_type`` (pdf/image/presentation),
``file_size``, ``uploaded_at``
