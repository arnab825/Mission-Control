# 🌐 Mission Control — Distributed Game Library Server

The **Distributed Game Library Server** is the central REST API & synchronization engine for Mission Control. It aggregates game installations and storage capacities across multiple client machines (Nodes) into a single unified catalog in PostgreSQL (Supabase), enriched by multi-tier AI genre classification and web game discovery.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Step-by-Step: Running with Docker](#-step-by-step-running-with-docker)
3. [Step-by-Step: Running Natively with Python](#-step-by-step-running-natively-with-python)
4. [Environment Configuration (`.env`)](#-environment-configuration-env)
5. [Seeding the Master Catalog](#-seeding-the-master-catalog)
6. [API Endpoints Overview](#-api-endpoints-overview)
7. [Troubleshooting & Gotchas](#-troubleshooting--gotchas)

---

## ⚙️ Prerequisites

- **Docker & Docker Desktop** (if deploying via containers) or **Python 3.10+** (if running locally)
- A Supabase PostgreSQL Database (`DATABASE_URL`)
- AI API Keys (optional for AI classification):
  - Google Gemini API Key (`GEMINI_API_KEY`)
  - NVIDIA NIM API Key (`NVIDIA_API_KEY`)
  - Groq API Key (`GROQ_API_KEY`)
  - OpenRouter API Key (`OPENROUTER_API_KEY`)

---

## 🐳 Step-by-Step: Running with Docker

### Step 1: Configure `.env`
Navigate to `Gaming/distributed_server` and ensure your `.env` file exists:
```bash
cd Gaming/distributed_server
# Copy example if not present:
copy .env.example .env
```
Ensure your `DATABASE_URL` and API keys are populated.

### Step 2: (Windows Docker Desktop Users) Enable IPv6 Support
Supabase direct endpoints use IPv6 addresses. To enable IPv6 in Docker Desktop:
1. Open **Docker Desktop Settings** (⚙️).
2. Click **Docker Engine** on the left.
3. Add the following to your JSON configuration:
   ```json
   {
     "builder": {
       "gc": {
         "defaultKeepStorage": "20GB",
         "enabled": true
       }
     },
     "experimental": true,
     "ipv6": true,
     "ip6tables": true,
     "fixed-cidr-v6": "2001:db8:1::/64"
   }
   ```
4. Click **Apply & restart**.

### Step 3: Build and Start Container
Run docker compose to build the image and start the container in detached mode:
```bash
docker compose up -d --build
```

### Step 4: Verify Container Status & Logs
```bash
# Check if container is running:
docker ps

# Stream server logs:
docker logs -f mc-distributed-library-server
```

You should see:
```text
[INFO] Starting gunicorn 26.1.0
[INFO] Listening at: http://0.0.0.0:8800 (1)
[INFO] Using worker: uvicorn.workers.UvicornWorker
[library-server] INFO: Connected to Supabase PostgreSQL.
[library-server] INFO: Mission Control Distributed Library Server started.
```

### Step 5: Test Server Health
```bash
curl http://localhost:8800/health
```
Response:
```json
{"status":"ok","db":true}
```

### Step 6: Stop the Docker Container
```bash
docker compose down
# or
docker stop mc-distributed-library-server
```

---

## 🐍 Step-by-Step: Running Natively with Python

If you prefer running directly on Windows/Linux without Docker:

### Step 1: Install Dependencies
```bash
cd Gaming/distributed_server
pip install -r requirements.txt
```

### Step 2: Start the Server
```bash
# Production mode:
python run_server.py

# Development mode (Hot-reload enabled):
python run_server.py --reload --port 8800
```

---

## 🔑 Environment Configuration (`.env`)

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Supabase/PostgreSQL connection string | `postgresql://...` |
| `GEMINI_API_KEY` | Optional | Google Gemini Flash for AI taxonomy | `""` |
| `NVIDIA_API_KEY` | Optional | NVIDIA NIM Meta-Llama 3.3 failover | `""` |
| `GROQ_API_KEY` | Optional | Groq Llama 3.3 70B failover | `""` |
| `OPENROUTER_API_KEY` | Optional | OpenRouter Free tier failover | `""` |
| `RAWG_API_KEY` | Optional | RAWG video game metadata enrichment | `""` |
| `TAVILY_API_KEY` | Optional | Tavily Web Search API | `""` |
| `LIBRARY_SERVER_PORT`| Optional | Port to bind server to | `8800` |
| `HEARTBEAT_TIMEOUT` | Optional | Seconds before marking a Node offline | `45` |
| `AI_CLASSIFY_INTERVAL`| Optional| Background AI classification interval (seconds) | `30` |

---

## 🌱 Seeding the Master Catalog

To populate the canonical games catalog with the top 1,000 PC games (from SteamSpy and Steam APIs):

```bash
python seed_catalog.py
```

This ingests games, downloads high-resolution banner/cover URLs, and queues them for progressive AI background genre tagging.

---

## 📡 API Endpoints Overview

Interactive Swagger API documentation is available at:
👉 **`http://localhost:8800/docs`**

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server and Database connectivity healthcheck |
| `GET` | `/api/games` | Query unified library (`?installed_only=true`, `?genre=Action`, `?q=search`) |
| `GET` | `/api/games/{id}` | Retrieve individual game metadata & installation nodes |
| `POST`| `/api/nodes/register` | Register a new distributed node machine |
| `POST`| `/api/nodes/{id}/heartbeat`| Send storage stats (`total`, `used`, `free`) & refresh online status |
| `POST`| `/api/nodes/{id}/sync` | Transmit discovered local games from a node |
| `GET` | `/api/nodes` | List all registered nodes and their online/offline state |
| `GET` | `/api/library/stats` | Aggregate storage size, node count, and game metrics |

---

## 🔧 Troubleshooting & Gotchas

### 1. `{"detail":"Database not available."}`
- **Cause**: The server failed to connect to PostgreSQL at startup.
- **Fix**: Check `docker logs mc-distributed-library-server`. If you see `Network is unreachable`, Docker on Windows is failing to route to Supabase's IPv6 host. Ensure IPv6 is enabled in Docker Desktop daemon settings or run directly via `python run_server.py`.

### 2. Port `8800` Already In Use
- **Fix**: Check for running containers with `docker ps` and stop any conflicting process with `docker stop mc-distributed-library-server` or pass `--port 8801` to `run_server.py`.
