FROM python:3.12-slim AS base

RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ── Development ──
FROM base AS dev
EXPOSE 5001
CMD ["python", "run.py"]

# ── Production ──
FROM base AS prod
RUN chmod +x entrypoint.sh
RUN chown -R app:app /app
USER app
EXPOSE 5001
ENTRYPOINT ["./entrypoint.sh"]
