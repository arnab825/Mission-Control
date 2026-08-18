# ── Mission Control — Distributed Library Server Dockerfile ────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 if compiling from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application files
COPY queries/ ./queries/
COPY *.py .

# Expose port
EXPOSE 8800

# Set environment defaults
ENV PYTHONUNBUFFERED=1
ENV LIBRARY_SERVER_HOST=0.0.0.0
ENV LIBRARY_SERVER_PORT=8800

# Start server with Gunicorn (Uvicorn workers) for production scaling
CMD ["gunicorn", "server:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8800"]
