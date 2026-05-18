FROM python:3.12-slim AS base

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
EXPOSE 5001
ENTRYPOINT ["./entrypoint.sh"]
