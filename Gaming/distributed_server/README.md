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
7. [Cluster Architecture & API Endpoints](#-cluster-architecture--api-endpoints)
8. [Troubleshooting & Gotchas](#-troubleshooting--gotchas)

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

The Docker stack automatically boots the full load-balanced multi-service cluster:
- **`mc-load-balancer`**: Public API Gateway listening on Port `8800`.
- **`mc-catalog-service-1` & `mc-catalog-service-2`**: Web & Launcher Discovery Pool (Ports `8811`, `8812`).
- **`mc-node-service-1` & `mc-node-service-2`**: User Library & Node Sync Pool (Ports `8821`, `8822`).
- **`mc-library-tunnel`**: Built-in Cloudflare Tunnel for secure remote access without port forwarding.

### Step 1: Configure `.env`
Navigate to `Gaming/distributed_server` and ensure your `.env` file exists:
```bash
cd Gaming/distributed_server
# Copy example if not present:
copy .env.example .env
```
Ensure your `DATABASE_URL` and API keys are populated.

### Step 2: Build and Launch Cluster
```bash
docker compose up -d --build
```

### Step 3: Verify All Containers
```bash
docker compose ps
```
You will see 6 healthy containers running.

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
| `DATABASE_URL` | **Yes** | Supabase/PostgreSQL connection string | `postgresql://...` |
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
