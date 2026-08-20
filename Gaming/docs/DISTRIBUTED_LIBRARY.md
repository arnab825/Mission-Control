# 🌐 Mission Control — Distributed Game Library

Mission Control extends its capabilities with a **distributed game-library architecture** that allows multiple computers (Library Nodes) to contribute their locally installed game libraries and drive storage capacities into **one unified catalog**, centralized in Supabase and served to all clients.

---

## 🎯 Architecture Overview

```text
                       Mission Control Frontends
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
       [Manage Nodes Panel]            [Discover from Web/Launchers]
                 │                                 │
                 └────────────────┬────────────────┘
                                  ▼
                      Distributed Server (:8800)
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
  [Library Nodes]         [Web & Launchers]         [AI Model Engine]
  • Storage calculations  • Steam Store & SteamSpy  • Multi-tier LLM
  • Scan & Sync           • Epic Games Store         (Gemini 3.6 Flash /
  • Auto-online/offline   • GOG Galaxy Catalog        Llama-3.3-70B)
                          • RAWG.io & DuckDuckGo    • Refines store tags
                                  │
                                  ▼
                         Supabase PostgreSQL
                ┌───────────────────────────────────┐
                │ • canonical_games (Master Catalog)│
                │ • library_nodes (Registries)      │
                │ • game_installations (Junction)   │
                └───────────────────────────────────┘
```

The system is designed with a **100% stateless server model**. All libraries, active node heartbeats, and canonical data are stored in a central PostgreSQL database. This allows multiple local servers, developers, or nodes to co-operate seamlessly under a single source of truth.

---

## 🛠️ Components

### 1. Central FastAPI Server (`Gaming/distributed_server`)
* **Endpoint Port**: `8800`
* **Features**:
  * Node registration (`POST /api/nodes/register`) and storage heartbeat updates every 15 seconds.
  * Synchronized catalog lookups (`GET /api/games`) and live search across nodes.
  * Auto-online/offline watchdog: Automatically flags nodes as `offline` and their games as `unavailable` if they miss heartbeats for more than 45 seconds.
  * Progressive AI Classification: Uses **Gemini 3.6 Flash** (with fallback to Llama 3.3 70B via OpenRouter/NVIDIA NIM) to clean up raw, noisy store tags and establish a canonical taxonomy.

### 2. Node Sync Daemon (`Gaming/distributed_node`)
* **Execution**: Run continuously on any machine contributing library space or folders.
* **Storage Calculation**:
  * Physical drive capacity is measured directly via `shutil.disk_usage` (never randomized).
  * Ingests Steam `.acf`, Epic `.item`, and GOG `.info` manifests to retrieve exact byte sizes instantly. Falls back to fast, recursive directory traversing (`os.scandir`).
* **Game Detection**: Interacts with the backend `GameScanner` to register executables and launchers.

### 3. Web & Launcher Catalog Seeder (`seed_catalog.py`)
* **Seeder script**: [`seed_catalog.py`](file:///C:/GitHub/Mission-Control/Gaming/distributed_server/seed_catalog.py)
* **Dataset**: Seeds the catalog with the top 1,000 PC games of all time sourced directly from SteamSpy and the Steam Store APIs.
* **Process**:
  1. Ingests all 1,000 games into the `canonical_games` catalog with cover imagery and developers.
  2. Flags them as `ai_classified = FALSE`.
  3. The server's background thread progressively refines these games over time to resolve accurate genres and curated tags.

---

## 🐳 Production Deployment (Docker)

To run the central server persistently in production via Docker:

1. Ensure your PostgreSQL connection and API keys are specified in `Gaming/distributed_server/.env`.
2. *(Windows Docker Desktop users)* Ensure IPv6 is enabled in Docker Engine settings (`"ipv6": true, "ip6tables": true`) so the container can connect to Supabase.
3. Build and boot the stack in detached mode:
   ```bash
   cd Gaming/distributed_server
   docker compose up -d --build
   ```
4. Verify the container and check logs:
   ```bash
   docker logs -f mc-distributed-library-server
   ```
5. Check health:
   ```bash
   curl http://localhost:8800/health
   ```

For detailed documentation, endpoints, and troubleshooting, see [`Gaming/distributed_server/README.md`](../distributed_server/README.md).

---

## 🎮 Node Installation & Testing

To launch a node daemon and link your folder library:
```bash
cd Gaming/distributed_node
python run_node.py --server http://<server-ip>:8800 --scan "D:\SteamLibrary" "C:\GOG Games"
```
The machine will register, transmit its storage usage, list installations, and appear on the web HUD!
