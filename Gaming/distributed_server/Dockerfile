# ── Mission Control — Distributed Library Server Dockerfile ────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for PostgreSQL client and networking tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Create persistent fallback data directory
RUN mkdir -p /app/data

# Copy application files
COPY queries/ ./queries/
COPY *.py .

# Expose standard cloud & cluster ports
EXPOSE 8080 8000 8800 8811 8812 8821 8822 8831 8841 8851

# Set environment defaults
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8
ENV MALLOC_ARENA_MAX=2
ENV LIBRARY_SERVER_HOST=0.0.0.0
ENV LIBRARY_SERVER_PORT=8800

# Default command: launch the lightweight single-process ASGI server
CMD ["python", "run_server.py"]
