# 🌐 Mission Control — Distributed Game Library & Multi-Service Cluster

Mission Control extends its capabilities with a **distributed, load-balanced game-library architecture** that decouples heavy web scraping, game launcher crawling, and AI classification from real-time client node synchronization and user library queries.

Multiple computers (Library Nodes) contribute their locally installed games and hard drive storage capacities into **one unified catalog**, centralized in Supabase and served to all clients.

---

## 🎯 Architecture & Load Balancing Overview

```text
                                  Mission Control Frontends
                           (Desktop App / Web HUD / Node Daemons)
                                             │
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │    Multi-Pool API Gateway & Load Balancer     │
                     │                 Port: 8800                    │
                     │  • Asynchronous Path & Query Routing          │
                     │  • Active 5s Health Probing & Failover        │
                     │  • Round-Robin Pool Load Balancing            │
                     └───────┬───────────────────────────────┬───────┘
                             │                               │
            ┌────────────────┴──────────────┐ ┌──────────────┴──────────────┐
            ▼                               ▼ ▼                             ▼
 ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
 │  Catalog Discovery  │ │  Catalog Discovery  │ │ User Library & Node │ │ User Library & Node │
 │   Service (:8811)   │ │   Service (:8812)   │ │  Sync Serv. (:8821) │ │  Sync Serv. (:8822) │
 └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
            │                       │                       │                       │
            ├───────────────────────┴───────────────────────┼───────────────────────┘
            ▼                                               ▼
  [Web Discovery & Crawling]                      [Local Node Synchronization]
  • Steam Store & SteamSpy                        • Storage Hardware Calculations (shutil)
  • Epic Games Store Catalog                      • 15-second Realtime Node Heartbeats
  • GOG Galaxy & RAWG API                         • Ingests .acf, .item, .info Manifests
  • Multi-Tier LLM AI Classifier                  • Auto-online / offline Watchdog
  • Metadata & Release Date Workers               • User Library Queries (installed_only)
                                          │
                                          ▼
                                 Supabase PostgreSQL
                  ┌───────────────────────────────────────────────┐
                  │ 1. canonical_games    (Global Master Catalog) │
                  │ 2. library_nodes      (Machine Registry)      │
                  │ 3. game_installations (Junction per Machine)  │
                  │ 4. node_scan_paths    (Scanned Directories)   │
                  │ 5. ai_classification_log (LLM Audit Log)     │
                  └───────────────────────────────────────────────┘
```

---

## 📊 Database Schema & Table Lifecycle

Understanding why tables start empty and how they populate:

| Table Name | Role | When Does It Populate? |
| :--- | :--- | :--- |
| `canonical_games` | **Master Global Catalog** (all known PC games) | Populates via `seed_catalog.py`, web discovery (`/api/games/discover`), or launcher harvesting. |
| `library_nodes` | **Connected Hardware Machines** | Populates when a local machine/node runs `distributed_node` and calls `POST /api/nodes/register`. |
| `game_installations` | **Installed Game Locations on Disk** | **Empty by default!** Populates ONLY when a registered node scans its local drives and calls `POST /api/nodes/{id}/sync`. |
| `node_scan_paths` | **Configured Scan Directories** | Populates when scan paths are assigned to a node (e.g. `D:\SteamLibrary`, `C:\GOG Games`). |
| `ai_classification_log` | **AI Taxonomy Audit Trail** | Populates whenever Gemini / Llama classifies genres and tags for a game. |

> [!IMPORTANT]
> `game_installations` will remain empty until you run a **Library Node Daemon** on a machine with games installed. See [Running a Node Daemon](#-running-a-library-node-daemon) below.

---

## 🛠️ Microservices Cluster Components

### 1. Multi-Pool Load Balancer & API Gateway ([`load_balancer.py`](../distributed_server/load_balancer.py))
* **Port**: `8800` (Public cluster gateway)
* **Features**:
  * **Routing Rules**:
    * `/api/nodes/*`, `/api/nodes/{id}/sync`, `/api/library/stats`, `/api/games/{id}/installations` $\rightarrow$ Dispatched to **Node Service Pool**.
    * `/api/games?installed_only=true` $\rightarrow$ Dispatched to **Node Service Pool**.
    * `/api/games/discover`, `/api/games/seed`, `/api/games/classify`, `/api/search`, global `/api/games` $\rightarrow$ Dispatched to **Catalog Discovery Pool**.
  * **Health Probes**: Probes `/health` on all upstream nodes every 5 seconds. If an instance drops, traffic routes around it instantly.
  * **Status HUD**: Access `http://localhost:8800/cluster/status` for real-time load distribution, latency, and pool health.

### 2. Catalog & Web Discovery Service Pool ([`catalog_service.py`](../distributed_server/catalog_service.py))
* **Default Ports**: `8811`, `8812`
* **Features**:
  * Scrapes Steam, Epic, GOG, and RAWG APIs in parallel without blocking local users.
  * Runs background workers for multi-tier LLM classification (Gemini Flash, Llama 3.3 70B).
  * Automatically backfills Steam release dates, high-res covers, and developers.

### 3. User Library & Node Sync Service Pool ([`node_service.py`](../distributed_server/node_service.py))
* **Default Ports**: `8821`, `8822`
* **Features**:
  * Low-latency node registration, authentication token verification, and 15s heartbeats.
  * Ingests local game installations and links them to the master `canonical_games` dataset.
  * Runs the Offline Watchdog: marks nodes offline and games unavailable if heartbeats lapse $>45\text{s}$.

---

## 🚀 How to Run the Cluster

### Option A: Local Development Cluster (One Command)
Launch the entire multi-instance cluster with unified colored log streaming:
```bash
cd Gaming/distributed_server
python run_cluster.py --catalog-instances 2 --node-instances 2
```

### Option B: Production Containerized (Docker Compose)

> [!IMPORTANT]
> **Windows Docker Desktop IPv6 Requirement**: Supabase direct database connection pools frequently resolve over IPv6. On Windows, Docker Desktop containers by default disable IPv6 routing, causing database connection failures. 
> To enable IPv6 in Docker Desktop: Open **Settings (⚙️) -> Docker Engine**, add `"ipv6": true, "ip6tables": true, "fixed-cidr-v6": "2001:db8:1::/64"`, and click **Apply & restart**.

#### 1. Build and Boot Cluster
```bash
cd Gaming/distributed_server
docker compose up -d --build
```

#### 2. Check Running Containers
```bash
docker compose ps
```
You will see 6 containers running:
- `mc-load-balancer` (Gateway on `0.0.0.0:8800->8800/tcp`)
- `mc-catalog-service-1` (Web & Catalog worker)
- `mc-catalog-service-2` (Web & Catalog replica)
- `mc-node-service-1` (Node Sync & Storage watchdog)
- `mc-node-service-2` (Node Sync replica)
- `mc-library-tunnel` (Cloudflare Tunnel for remote access)

#### 3. Monitor Live Logs
```bash
# Combined cluster logs:
docker compose logs -f

# Inspect specific service logs:
docker compose logs -f load_balancer
docker compose logs -f catalog_service_1
docker compose logs -f node_service_1
```

#### 4. Test Health & Live Cluster HUD
```bash
# Cluster Health:
curl http://localhost:8800/health

# Cluster Live Routing Status & Real-Time Pool Stats:
curl http://localhost:8800/cluster/status
```

#### 5. Stop or Restart Cluster
```bash
# Restart cluster:
docker compose restart

# Stop and tear down all containers cleanly:
docker compose down
```


---

## 🎮 Running & Simulating Library Node Daemons

To connect your local PC and populate `game_installations`:

1. Ensure the server cluster is running on port `8800` (via `docker compose` or `python run_cluster.py`).
2. Launch the node daemon pointing to your game directories:
   ```bash
   cd Gaming/distributed_node
   python run_node.py --server http://localhost:8800 --name "Primary-Gaming-PC" --scan "C:\Program Files (x86)\Steam\steamapps\common" "D:\Games"
   ```
3. To **simulate a multi-computer setup** on the same machine, open a second terminal:
   ```bash
   python run_node.py --server http://localhost:8800 --name "Secondary-Laptop" --scan "E:\EpicGames"
   ```
4. The daemons will:
   * Register with `POST /api/nodes/register` (generates an auth token saved in `node_config.json`).
   * Transmit real disk space usage (total, used, free).
   * Scan your game folders and send installed manifests to `POST /api/nodes/{id}/sync`.
   * Populate the `game_installations`, `library_nodes`, and `node_scan_paths` tables in Supabase in real-time!

