#!/bin/sh
set -e

echo "Running database migrations..."
python -m alembic upgrade head

echo "Starting auth-service..."
exec gunicorn "run:app" \
  --bind 0.0.0.0:5001 \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
