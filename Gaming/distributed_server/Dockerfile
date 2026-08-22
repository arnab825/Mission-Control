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

# Expose standard cloud & cluster ports (8080 for Fly.io, 8000 for standard cloud, 8800+ for cluster)
EXPOSE 8080 8000 8800 8811 8812 8821 8822

# Set environment defaults
ENV PYTHONUNBUFFERED=1
ENV LIBRARY_SERVER_HOST=0.0.0.0
ENV LIBRARY_SERVER_PORT=8800

# Default command: launch the full cluster orchestrator
CMD ["python", "run_cluster.py"]

