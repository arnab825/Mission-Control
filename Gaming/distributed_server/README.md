# 🌐 Mission Control — Distributed Game Library & Load-Balanced Cluster

The **Distributed Game Library Cluster** is the central REST API, load balancer, and multi-node synchronization engine for Mission Control. It aggregates game installations and drive storage capacities across multiple client machines (Nodes) into a single unified catalog in PostgreSQL (Supabase), enriched by multi-tier AI genre classification and web game discovery.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Step-by-Step: Running with Docker Compose](#-step-by-step-running-with-docker-compose)
3. [Windows Docker Desktop IPv6 Configuration (Important!)](#-windows-docker-desktop-ipv6-configuration-important)
4. [Step-by-Step: Running Locally with Python](#-step-by-step-running-locally-with-python)
5. [Simulating Multiple Nodes & Populating `game_installations`](#-simulating-multiple-nodes--populating-game_installations)
6. [Environment Configuration (`.env`)](#-environment-configuration-env)
7. [Deploying to Render](#-deploying-to-render-100-free--no-credit-card-required)
8. [Cluster Architecture & API Endpoints](#-cluster-architecture--api-endpoints)
9. [Troubleshooting & Gotchas](#-troubleshooting--gotchas)

---

## ⚙️ Prerequisites

- **Docker & Docker Desktop** (if deploying via container cluster) or **Python 3.10+** (if running locally)
- A Supabase PostgreSQL Database (`DATABASE_URL`)
- AI API Keys (for progressive AI classification & release date recovery):
  - Google Gemini API Key (`GEMINI_API_KEY`)
  - NVIDIA NIM API Key (`NVIDIA_API_KEY`)
  - Groq API Key (`GROQ_API_KEY`)
  - OpenRouter API Key (`OPENROUTER_API_KEY`)

---

## 🐳 Step-by-Step: Running with Docker Compose

The Docker stack automatically boots the full production-grade microservices cluster with persistent storage and health monitoring:
- **`mc-load-balancer`**: High-throughput reverse proxy & API Gateway on Port `8800`.
- **`mc-catalog-service-1` & `mc-catalog-service-2`**: Discovery & Search Pool (Ports `8811`, `8812`).
- **`mc-node-service-1` & `mc-node-service-2`**: Hardware Node & Installation Pool (Ports `8821`, `8822`).
- **`mc-ai-enricher`**: Dedicated AI Gameplay Feature & Metadata Enricher (`:8831`).
- **`mc-launcher-enricher`**: Multi-Launcher & Store Exclusivity Healer (`:8841`).
- **`mc-crawler-service`**: 24/7 Autonomous Harvester & Quad-Store Ingestion (`:8851`).
- **`mc-redis`**: High-performance in-memory cache layer (`:6379`).
- **`mc-library-tunnel`**: Secure Cloudflare edge tunnel.
- **`catalog-data`**: Named persistent volume ensuring local SQLite fallback replica survives rebuilds.

### Step 1: Configure `.env`
Navigate to `Gaming/distributed_server` and ensure your `.env` file exists:
```bash
cd Gaming/distributed_server
# Copy example if not present:
copy .env.example .env
```
Ensure your `DATABASE_URL` (and optional `FALLBACK_DATABASE_URL`) and API keys are populated.

### Step 2: Build and Launch Cluster
```bash
docker compose up -d --build
```

### Step 3: Verify All Containers
```bash
docker compose ps
```
You will see 8 healthy containers running.

### Step 4: Stream Logs
```bash
# Combined cluster logs:
docker compose logs -f

# Or monitor specific services:
docker compose logs -f load_balancer
docker compose logs -f catalog_service_1
docker compose logs -f node_service_1
```

### Step 5: Check Cluster Health & HUD
```bash
# Aggregated Health:
curl http://localhost:8800/health

# Cluster Live Routing Status & Request Distribution:
curl http://localhost:8800/cluster/status
```

### Step 6: Stop or Restart the Cluster
```bash
# Stop all containers:
docker compose down

# Restart:
docker compose restart
```

---

## 🌐 Windows Docker Desktop IPv6 Configuration (Important!)

> [!IMPORTANT]
> **Why this is required:** Supabase direct database connection pools frequently resolve over IPv6. On Windows, Docker Desktop containers by default disable IPv6 routing, which causes `psycopg2` connection timeouts (`Network is unreachable` or `Connection refused`).

To enable native IPv6 support in Docker Desktop:

1. Open **Docker Desktop Settings** (⚙️).
2. Click **Docker Engine** on the left navigation bar.
3. Merge or replace your configuration with the following JSON:
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
5. Once Docker Desktop restarts, run `docker compose up -d --build` to boot the stack with full Supabase connectivity.

---

## 🐍 Step-by-Step: Running Locally with Python

If you prefer running directly on Windows/Linux without Docker, use the single-command orchestrator:

### Step 1: Install Dependencies
```bash
cd Gaming/distributed_server
pip install -r requirements.txt
```

### Step 2: Launch the Full Cluster
```bash
# Starts 2x Catalog Services (:8811, :8812), 2x Node Services (:8821, :8822), and Load Balancer (:8800):
python run_cluster.py --catalog-instances 2 --node-instances 2
```
All services stream color-coded logs to your terminal with unified Ctrl+C graceful shutdown.

---

## 🎮 Simulating Multiple Nodes & Populating `game_installations`

### Why is `game_installations` empty at first?
- `canonical_games` is the **Master Global Catalog** (stores metadata for all ~700+ known games).
- `game_installations` stores **Physical Disk Locations per Machine** (which machine has which game installed on which hard drive).
- `game_installations` will remain empty until a **Library Node Daemon** connects and scans a folder!

### How to Simulate a Node and Sync Games:

Open a new terminal and run the node daemon pointing to any folder containing games (Steam, Epic, GOG, or custom games):

```bash
cd Gaming/distributed_node

# Scan your local Steam and GOG folders:
python run_node.py --server http://localhost:8800 --name "Gaming-Rig-1" --scan "C:\Program Files (x86)\Steam\steamapps\common" "D:\Games"
```

To simulate a **second computer** on the same machine:
```bash
# In another terminal:
python run_node.py --server http://localhost:8800 --name "Living-Room-HTPC" --scan "E:\EpicGames"
```

The node daemons will:
1. Authenticate with the Load Balancer (`POST /api/nodes/register`).
2. Transmit real disk space metrics (`shutil.disk_usage`).
3. Ingest manifests (`.acf`, `.item`, `.info`) and sync installations to Supabase (`POST /api/nodes/{id}/sync`).
4. Instantly populate the `game_installations`, `library_nodes`, and `node_scan_paths` tables!

---

## 🔑 Environment Configuration (`.env`)

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Primary Supabase/PostgreSQL connection string (Tier 1) | `postgresql://...` |
| `FALLBACK_DATABASE_URL`| Optional | Secondary Hot Standby Postgres connection string (Tier 2 - Neon, Aiven) | `""` |
| `GEMINI_API_KEY` | Optional | Google Gemini Flash for AI taxonomy | `""` |
| `NVIDIA_API_KEY` | Optional | NVIDIA NIM Meta-Llama 3.3 failover | `""` |
| `GROQ_API_KEY` | Optional | Groq Llama 3.3 70B failover | `""` |
| `OPENROUTER_API_KEY` | Optional | OpenRouter Free tier failover | `""` |
| `RAWG_API_KEY` | Optional | RAWG video game metadata enrichment | `""` |
| `TAVILY_API_KEY` | Optional | Tavily Web Search API | `""` |
| `LIBRARY_SERVER_PORT`| Optional | Port to bind Load Balancer to | `8800` |
| `CATALOG_SERVERS` | Optional | Comma-separated Catalog pool URLs | `http://127.0.0.1:8811,http://127.0.0.1:8812` |
| `NODE_SERVERS` | Optional | Comma-separated Node pool URLs | `http://127.0.0.1:8821,http://127.0.0.1:8822` |
| `HEARTBEAT_TIMEOUT` | Optional | Seconds before marking a Node offline | `45` |
| `AI_CLASSIFY_INTERVAL`| Optional| Background AI classification interval (seconds) | `20` |


---

## 🚀 Deploying to Render (100% Free & No Credit Card Required)

Deploy the central library server as a free Python Web Service on Render:

> [!TIP]
> **No 30-Day PostgreSQL Limit:** Render's 30-day limit **only** applies if you create a database on Render. Because Mission Control uses **Supabase** (`DATABASE_URL`), your database is permanent, persistent, and never deleted.

### Step-by-Step Render Deployment:
1. Log into [Render Dashboard](https://dashboard.render.com/) (No credit card needed).
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository: `Mission-Control`.
4. Configure the service settings:
   - **Name**: `mission-control-server`
   - **Region**: Closest to you (e.g. Frankfurt, Singapore, Oregon)
   - **Root Directory**: `Gaming/distributed_server`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python run_server.py`
   - **Instance Type**: `Free`
5. Expand **Advanced** -> Add **Environment Variables**:
   - `DATABASE_URL`: `postgresql://postgres:YOUR_PASSWORD@db.vekqkwwzzamwhitjodld.supabase.co:5432/postgres` (or pooler)
   - `UPSTASH_REDIS_REST_URL`: `https://funny-meerkat-131712.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN`: `YOUR_UPSTASH_TOKEN`
   - `GEMINI_API_KEY`: `YOUR_GEMINI_KEY`
   - `NVIDIA_API_KEY`: `nvapi-YOUR_KEY`
   - `GROQ_API_KEY` / `OPENROUTER_API_KEY` *(Optional)*
   - `RAWG_API_KEY` / `TAVILY_API_KEY` *(Optional)*
6. Set **Health Check Path**: `/health`
7. Click **Create Web Service**.

Render will deploy your server and provide a public HTTPS URL (e.g. `https://mission-control-server.onrender.com`).

---

### ⏱️ Keep-Alive Setup (Prevent Render Sleep with UptimeRobot)

Render free instances spin down after 15 minutes of inactivity. Keep your API warm 24/7 with zero cold starts:

1. Create a free account on [UptimeRobot](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. Configure the monitor:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Mission Control Server`
   - **URL (or IP)**: `https://<your-service-name>.onrender.com/health`
   - **Monitoring Interval**: `5 minutes`
4. Click **Create Monitor**.

Your server will now stay active continuously with zero cold starts!

---

## 📡 Cluster Architecture & API Endpoints

Interactive Swagger API documentation is available at:
👉 **`http://localhost:8800/docs`**

```text
Incoming Request -> Load Balancer (:8800)
   ├── /api/nodes/*                     ──> Node Service Pool (:8821, :8822)
   ├── /api/nodes/{id}/sync             ──> Node Service Pool (:8821, :8822)
   ├── /api/nodes/{id}/heartbeat        ──> Node Service Pool (:8821, :8822)
   ├── /api/library/stats               ──> Node Service Pool (:8821, :8822)
   ├── /api/games/{id}/installations    ──> Node Service Pool (:8821, :8822)
   ├── /api/games?installed_only=true   ──> Node Service Pool (:8821, :8822)
   ├── /api/games/discover              ──> Catalog Service Pool (:8811, :8812)
   ├── /api/games/seed                  ──> Catalog Service Pool (:8811, :8812)
   ├── /api/games/classify              ──> Catalog Service Pool (:8811, :8812)
   ├── /api/search                      ──> Catalog Service Pool (:8811, :8812)
   └── /api/games (global catalog)      ──> Catalog Service Pool (:8811, :8812)
```

---

## 🔧 Troubleshooting & Gotchas

### 1. `{"detail":"Database not available."}` in Docker
- **Cause**: Windows Docker Desktop container cannot route to Supabase's IPv6 database server.
- **Fix**: Follow the [IPv6 Configuration steps](#-windows-docker-desktop-ipv6-configuration-important) above and restart Docker Desktop.

### 2. `game_installations` is empty in Supabase
- **Cause**: No client node has synced installed games from disk yet.
- **Fix**: Run `python Gaming/distributed_node/run_node.py --server http://localhost:8800 --scan "C:\Program Files (x86)\Steam\steamapps\common"`.

### 3. Port `8800` Already In Use
- **Fix**: Run `docker compose down` or terminate any existing background `python run_cluster.py` processes.
