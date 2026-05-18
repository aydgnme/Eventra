#!/bin/sh
set -e

echo "Starting gateway..."
exec gunicorn "run:app" \
  --bind 0.0.0.0:5000 \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
