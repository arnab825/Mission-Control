# Mission Control — Major Upgrades, Architecture & Infrastructure Reference

This document summarizes the **major architectural transformations, resilience engineering, cloud deployments, multi-tier database failovers, and backup systems** implemented in the **Mission Control Distributed Ecosystem**.

---

## 1. Executive System Architecture

```mermaid
flowchart TD
    subgraph Clients [" 1. User & Client Applications"]
        W[" Next.js Website\n(SSR, Dynamic Catalog & Library)"]
        D[" Electron Desktop App\n(React UI, Vite, DirectX HUD)"]
    end

    subgraph Monitoring [" 2. High-Availability & Keep-Alive"]
        UR[" UptimeRobot Monitoring\n(5-minute ping to prevent sleep)"]
    end

    subgraph LoadBalancer [" 3. API Gateway & Load Balancer (:8800)"]
        LB["Asynchronous Reverse Proxy & Fast Failover\n(Dynamic Pool Routing, < 100ms Latency)"]
    end

    subgraph MicroservicePools [" 4. Upstream Microservice Tier"]
        P1[" Catalog Discovery Pool (:8811, :8812)\n• Sub-100ms Game Search & Instant Tags\n• Dynamic Live Store Harvesting"]
        P2[" User Library & Node Sync Pool (:8821, :8822)\n• Local Hardware Detection & Storage Stats\n• Game Executables & Installations"]
        P3[" AI Metadata Enricher Service (:8831)\n• Gameplay Features & Rich Summaries\n• Autonomous Release Date Healer"]
        P4[" Multi-Launcher Enricher Service (:8841)\n• Cross-Store Multi-Launcher Sync\n• Exclusivity Detection Engine"]
        P5[" Infinite Harvester & Crawler Service (:8851)\n• 6 Parallel 24/7 Streaming Threads\n• Continuous AI Classification Loop"]
    end

    subgraph DatabaseTier [" 5. Multi-Tier High-Availability Database & Backup Engine"]
        T1[(" Tier 1: Supabase PostgreSQL (Primary)\n(db.vekqkwwzzamwhitjodld.supabase.co:5432)\n8,150+ Games & 93.5% AI Classified")]
        T2[(" Tier 2: Secondary Cloud PostgreSQL (Fallback)\n(Neon Serverless / Cloud Postgres Standby)")]
        T3[(" Tier 3: Local SQLite Backup Replica\n(data/catalog_fallback.db)\nAutonomous Offline Snapshot & Zero-Downtime Engine")]
        R[" Upstash Redis Cache Layer\n(Sub-millisecond In-Memory Query Cache)"]
    end

    W & D -->|User Requests /api/*| LB
    UR -->|GET or HEAD /health| LB
    LB -->|/api/search, /api/games| P1
    LB -->|/api/nodes, /api/library| P2
    LB -->|/api/enrich| P3
    LB -->|/api/launchers| P4
    LB -->|/api/crawler| P5
    P1 & P2 & P3 & P4 & P5 --> T1
    T1 -.->|Auto Failover if Cloud Down| T2
    T2 -.->|Auto Fallback if Network Outage| T3
    T1 -.->|Query Cache| R
```

---

## 2. The 11 Major Architectural Upgrades

### 🚀 1. Quad-Storefront Ingestion Engine
- **Before:** Single-store indexing (Steam only).
- **Now:** Integrated live autonomous harvesters across **Steam, Epic Games Store, GOG Galaxy (DRM-Free), and Xbox & PC Game Pass**.
- **Impact:** Canonical game catalog surged from **`2,066`** to **`8,150+` production titles** and continues to grow 24/7.

---

### 🛡️ 2. Multi-Tier Database Architecture & Built-in Backup Replica
- **Before:** Single Supabase cloud dependency. If Supabase went down or paused, the application would crash.
- **Now:** Built a resilient 3-Tier Multi-Database Engine in [`db.py`](file:///e:/AiAssistant/Gaming/distributed_server/db.py):
  1. **Tier 1 (Primary Cloud):** Supabase PostgreSQL (`db.vekqkwwzzamwhitjodld.supabase.co:5432`).
  2. **Tier 2 (Secondary Standby Cloud):** Hot standby via `FALLBACK_DATABASE_URL` (e.g. Neon Serverless Postgres).
  3. **Tier 3 (Local SQLite Backup Replica):** Embedded persistent replica (`data/catalog_fallback.db`). Auto-syncs on every write and seamlessly serves read/search queries offline with **zero network dependency**.
  4. **Redis Cache:** Upstash REST client for sub-millisecond in-memory caching.

---

### 🏪 3. Dedicated `launchers TEXT[]` Column & Exclusivity Detection
- **Before:** Store availability was buried in raw JSON metadata.
- **Now:** Added a first-class `launchers TEXT[]` array column to PostgreSQL:
  - **Epic Exclusives:** *Alan Wake 2*, *Fortnite* $\rightarrow$ `['Epic Games']`
  - **Xbox / PC Game Pass:** *Halo Infinite*, *Forza Horizon 5*, *Avowed* $\rightarrow$ `['Steam', 'Xbox', 'PC Game Pass']`
  - **Multi-Store PC Releases:** *Cyberpunk 2077*, *The Witcher 3*, *Control* $\rightarrow$ `['Steam', 'Epic Games', 'GOG Galaxy']`

---

### ⚡ 4. Non-Blocking Sub-100ms Search Optimization
- **Before:** Live searches ran synchronous LLM calls (Gemini/OpenRouter), causing 5–15 second latency and timeouts.
- **Now:** Decoupled synchronous LLM calls from search handlers. Live store search returns in **< 100ms** using instant store tags, while deep AI metadata enrichment runs in background worker threads.

---

### ⚖️ 5. Multi-Pool Load Balancer Gateway (`:8800`)
- **Before:** Direct, single-process connections susceptible to traffic overload.
- **Now:** Built [`load_balancer.py`](file:///e:/AiAssistant/Gaming/distributed_server/load_balancer.py) with round-robin balancing across 5 microservice pools, sub-1.5s health probing, automatic upstream failover, and strict isolation of crawler workloads from user traffic.

---

### 🔄 6. 24/7 6-Thread Parallel Infinite Crawler & Auto-Revive Watchdog
- **File:** [`crawler_service.py`](file:///e:/AiAssistant/Gaming/distributed_server/crawler_service.py) on Port **`:8851`**
- **Now:** 6 independent, non-blocking parallel worker threads:
  1. `SteamCrawlerThread` (unlimited page-by-page streaming)
  2. `GOGCrawlerThread` (DRM-Free catalog indexing)
  3. `EpicCrawlerThread` (promotions & releases sync)
  4. `XboxCrawlerThread` (Xbox Game Studios & Game Pass live web search)
  5. `AIClassifierThread` (3-tier LLM cascade: Gemini, NVIDIA NIM, Groq, OpenRouter)
  6. `HealerThread` (auto-heals release dates and launcher tags)
  7. `SupervisorThread` (watchdog that auto-revives crashed threads within 5 seconds)

---

### 📅 7. Autonomous Release Date Healer
- **File:** [`heal_release_dates.py`](file:///e:/AiAssistant/Gaming/distributed_server/heal_release_dates.py)
- **Now:** Continuously resolves `NULL` release dates by querying official Steam Store APIs and RAWG. Over **`2,690+` dates healed**.

---

### 🖼️ 8. HD Portrait Box Art vs. Landscape Hero Banners
- **Before:** Square or landscape thumbnails were used for vertical library grid cards.
- **Now:** Vertical High-Definition Portrait Box Art (`library_600x900_2x.jpg`) is separated from wide Landscape Hero Banners (`library_hero.jpg`), with automatic fallback to high-resolution photorealistic artwork.

---

### 🐧 9. Full Linux & Steam Deck Support
- **Now:** Default platform arrays across all database rows, models, and harvesters include `["Windows", "Linux"]` (and `["Windows", "Linux", "Xbox"]` for cross-play).

---

### 🛡️ 10. Autonomous Server Watchdog & Self-Healing Agent
- **File:** [`server_watchdog_agent.py`](file:///e:/AiAssistant/Gaming/distributed_server/server_watchdog_agent.py)
- **Now:** Standalone monitoring daemon checking all cluster ports with `/api/agent/diagnostics` for automated health telemetry and self-healing restarts.

---

### 🌐 11. UptimeRobot Keep-Alive Integration (Zero Sleep / Zero Pause)
- **Endpoints:** `GET /` and `GET /health` on `https://mission-control-server-okj7.onrender.com`
- **Now:** Handles both `GET` and `HEAD` probes. Every 5-minute ping prevents Render free-tier containers from going to sleep while actively executing `SELECT 1` SQL queries on Supabase to prevent the 7-day inactivity pause.

---

## 3. Microservice Port Matrix

| Service | Port | Description |
| :--- | :---: | :--- |
| **Load Balancer Gateway** | **`:8800`** | Unified reverse proxy with instant failover and pool routing. |
| **Catalog Discovery Service** | **`:8811` / `:8812`** | Sub-100ms search, catalog discovery, and game seeding pool. |
| **User Library & Node Sync** | **`:8821` / `:8822`** | Local hardware node detection and storage metrics pool. |
| **AI Metadata Enricher** | **`:8831`** | Dedicated LLM feature & summary generator. |
| **Multi-Launcher Store Healer** | **`:8841`** | Cross-store exclusivity & multi-launcher array sync. |
| **Infinite Crawler & AI Harvester**| **`:8851`** | 24/7 6-thread quad-store ingestion & classifier daemon. |

---

## 4. Production Database Metrics

| Metric | Before | Current Live Production |
| :--- | :---: | :---: |
| **Total Ingested Games** | `2,066` | **`8,150+` Titles** |
| **AI Classified Titles** | `1,497` | **`7,617+` (93.5%)** |
| **Integrated Storefronts** | Steam | **Steam, Epic Games, GOG Galaxy, Xbox / PC Game Pass** |
| **Platform Compatibility** | Windows | **Windows, Linux, Steam Deck, Xbox** |
| **Search Response Latency** | ~5,000ms | **< 100ms** |
| **Database Resilience** | Single Supabase Host | **3-Tier Engine (Supabase + Cloud Fallback + Local SQLite Replica)** |
| **High-Availability Uptime** | Single Process | **5-Tier Microservices + Load Balancer + UptimeRobot Keep-Alive** |
