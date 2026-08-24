"""
Mission Control — Distributed Game Library Server
server.py: FastAPI REST API for the central library server.

Endpoints:
  Node Management:   POST /api/nodes/register, GET /api/nodes, GET|PATCH|DELETE /api/nodes/{id}
  Node Sync:         POST /api/nodes/{id}/heartbeat, POST /api/nodes/{id}/sync, POST /api/nodes/{id}/scan
  Catalog:           GET /api/games, GET /api/games/{id}, GET /api/games/{id}/installations
  Web Discovery:     GET /api/games/discover?q=, POST /api/games/seed
  Search:            GET /api/search?q=
  AI Classification: POST /api/games/classify
  Stats:             GET /api/library/stats
"""

import asyncio
import hashlib
import json
import logging
import os
import secrets
import threading
import time
import urllib.request
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

# Load .env from multiple potential locations (override=False to preserve cloud env vars)
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        break

from fastapi import FastAPI, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import LibraryDB
from models import (
    CanonicalGameResponse, CatalogResponse, ClassifyRequest, ClassifyResponse,
    DiscoverItem, DiscoverResponse, GameInstallationInfo, LibraryStatsResponse,
    NodeHeartbeatRequest, NodeHeartbeatResponse, NodeRegisterRequest,
    NodeRegisterResponse, NodeResponse, NodeStatEntry, RawInstallationPayload,
    SearchResponse, SearchResult, SeedRequest, SeedResponse, SyncRequest,
    SyncResponse, hash_token, generate_token,
)
from normalizer import match_game, normalize_title, title_to_slug, deduplicate_tags
from ai_classifier import classify_game, classify_batch
from game_harvester import (
    search_launcher_and_web_games,
    harvest_top_games_from_launchers,
    enrich_game_from_web,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("library-server")

# ── Database singleton ───────────────────────────────────────────────────────
db = LibraryDB()

# ── Offline Watchdog ──────────────────────────────────────────────────────────
_HEARTBEAT_TIMEOUT_SECONDS = int(os.getenv("HEARTBEAT_TIMEOUT", "45"))

def _offline_watchdog():
    """Background thread: marks nodes offline if they miss heartbeats."""
    while True:
        try:
            if db.available:
                stale = db.get_stale_nodes(_HEARTBEAT_TIMEOUT_SECONDS)
                for row in stale:
                    node_id = row["node_id"]
                    db.mark_offline(node_id)
                    logger.warning("Watchdog: Node %s marked OFFLINE (heartbeat timeout).", node_id)
        except Exception as exc:
            logger.error("Watchdog error: %s", exc)
        time.sleep(10)

# ── AI Classification Background Worker ──────────────────────────────────────
_CLASSIFY_INTERVAL = int(os.getenv("AI_CLASSIFY_INTERVAL", "20"))  # seconds

def _classification_worker():
    """Background thread: periodically refines genres for unclassified games."""
    while True:
        try:
            if db.available:
                batch = db.get_unclassified_games(limit=10)
                if batch:
                    logger.info("AI Classifier Worker: Refining genres for %d unclassified games.", len(batch))
                    classify_batch(batch, db=db, delay_between=0.5)
        except Exception as exc:
            logger.error("AI Classifier Worker error: %s", exc)
        time.sleep(_CLASSIFY_INTERVAL)

# ── Metadata Enrichment Background Worker ────────────────────────────────────
_ENRICH_INTERVAL = 20  # seconds

def _enrichment_worker():
    """Background thread: periodically fills in missing release dates, summaries, and features from Steam & web."""
    import re
    while True:
        try:
            if db.available:
                # Find games missing release date, features, or with placeholder summary
                sql = """
                    SELECT id, title, cover_url, banner_url, metadata, summary, features
                    FROM canonical_games
                    WHERE release_date IS NULL
                       OR release_date = ''
                       OR LEFT(summary, 28) = 'An acclaimed game developed by'
                       OR summary IS NULL
                       OR features = '{}'
                    LIMIT 10
                """
                games_to_enrich = db.execute(sql, fetch="all")
                if games_to_enrich:
                    logger.info("Enrichment Worker: Processing metadata for %d games...", len(games_to_enrich))
                    from game_harvester import SteamHarvester
                    for g in games_to_enrich:
                        game_id = g["id"]
                        meta = g.get("metadata") or {}
                        if isinstance(meta, str):
                            try:
                                meta = json.loads(meta)
                            except Exception:
                                meta = {}

                        appid = meta.get("appid")
                        if not appid:
                            for u in [g.get("cover_url") or "", g.get("banner_url") or ""]:
                                m = re.search(r"apps/(\d+)", u)
                                if m:
                                    appid = m.group(1)
                                    meta["appid"] = appid
                                    break

                        if appid:
                            details = SteamHarvester.get_details(appid)
                            if details:
                                rd = details.get("release_date") or "Unknown"
                                summary = details.get("summary") or g.get("summary")
                                features = details.get("features") or []
                                platforms = details.get("platforms") or ["Windows"]
                                db.enrich_game_metadata(
                                    game_id=game_id,
                                    summary=summary,
                                    features=features,
                                    platforms=platforms,
                                    release_date=rd,
                                    metadata=meta,
                                )
                                logger.info("Enrichment Worker: Enriched metadata (platforms=%s) for '%s'", platforms, g.get("title"))
                            else:
                                db.execute(
                                    "UPDATE canonical_games SET release_date = COALESCE(NULLIF(release_date, ''), 'Unknown'), updated_at = NOW() WHERE id = %(id)s",
                                    {"id": game_id}
                                )
                        else:
                            db.execute(
                                "UPDATE canonical_games SET release_date = COALESCE(NULLIF(release_date, ''), 'Unknown'), updated_at = NOW() WHERE id = %(id)s",
                                {"id": game_id}
                            )
                        time.sleep(1.2) # Avoid Steam rate limits
        except Exception as exc:
            logger.error("Enrichment Worker error: %s", exc)
        time.sleep(_ENRICH_INTERVAL)



# ── Initial Seeding Worker ───────────────────────────────────────────────────
def _seed_catalog_if_empty():
    """Seed the canonical games catalog on startup if empty."""
    time.sleep(3)
    if not db.available:
        return
    try:
        count_row = db.execute("SELECT COUNT(*) AS cnt FROM canonical_games", fetch="one")
        if count_row and count_row.get("cnt", 0) < 15:
            logger.info("Master catalog has few or no games. Harvesting initial top games from renowned game launchers...")
            top_games = harvest_top_games_from_launchers(limit_per_launcher=25)
            inserted = 0
            for g in top_games:
                try:
                    game_id = title_to_slug(g["title"])
                    norm = normalize_title(g["title"])
                    raw_tags = deduplicate_tags(g.get("raw_tags", []))
                    game_data = {
                        "id":               game_id,
                        "title":            g["title"],
                        "normalized_title": norm,
                        "developer":        g.get("developer"),
                        "publisher":        g.get("publisher"),
                        "release_date":     g.get("release_date"),
                        "primary_genre":    g.get("genres", [None])[0] if g.get("genres") else None,
                        "genres":           g.get("genres", []),
                        "tags":             raw_tags,
                        "features":         [],
                        "platforms":        ["Windows", "Linux"],
                        "cover_url":        g.get("cover_url"),
                        "banner_url":       g.get("banner_url"),
                        "summary":          g.get("summary"),
                        "ai_classified":    False,
                        "ai_confidence":    0.0,
                        "raw_tags":         raw_tags,
                        "metadata":         json.dumps({"source": g.get("store", "web"), "launchers": g.get("launchers", [])}),
                    }
                    db.upsert_game(game_data)
                    inserted += 1
                except Exception as exc:
                    logger.debug("Initial seed insert error for %s: %s", g.get("title"), exc)
            logger.info("Initial seeding complete: Ingested %d games from renowned launchers.", inserted)
    except Exception as exc:
        logger.error("Initial seeding error: %s", exc)

# ── App Lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=_offline_watchdog, daemon=True, name="OfflineWatchdog").start()
    threading.Thread(target=_classification_worker, daemon=True, name="AIClassifier").start()
    threading.Thread(target=_enrichment_worker, daemon=True, name="EnrichmentWorker").start()
    threading.Thread(target=_seed_catalog_if_empty, daemon=True, name="InitialSeeder").start()
    logger.info("Mission Control Distributed Library Server started.")
    if not db.available:
        logger.warning("DATABASE_URL not configured — running in degraded mode.")
    yield
    logger.info("Library Server shutting down.")

app = FastAPI(
    title="Mission Control Distributed Library Server",
    description="Central API for the multi-node distributed game library & launcher discovery engine.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth Helpers ──────────────────────────────────────────────────────────────

def _require_node_auth(node_id: str, x_node_token: Optional[str]) -> None:
    if not x_node_token:
        raise HTTPException(status_code=401, detail="X-Node-Token header required.")
    if not db.verify_node_token(node_id, x_node_token):
        raise HTTPException(status_code=401, detail="Invalid node token.")

def _require_db() -> None:
    if not db.available:
        # Attempt a lazy reconnect — handles cases where the startup retry loop
        # exhausted without success (e.g. Supabase was briefly unavailable on boot)
        db._ensure_connected()
    if not db.available:
        raise HTTPException(status_code=503, detail="Database not available.")

# ── Redis Cache Initialization (Upstash REST / Redis TCP) ───────────────────
class UpstashRestClient:
    """Lightweight REST client for Upstash Redis (zero dependencies)."""
    def __init__(self, url: str, token: str):
        self.url = url.rstrip("/")
        self.token = token
        self.headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def ping(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.url}/ping", headers=self.headers)
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode())
                return data.get("result") in ["PONG", "OK"] or "result" in data
        except Exception:
            return False

    def get(self, key: str) -> Optional[str]:
        try:
            cmd = ["GET", key]
            req = urllib.request.Request(f"{self.url}/", data=json.dumps(cmd).encode("utf-8"), headers=self.headers, method="POST")
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode())
                return data.get("result")
        except Exception:
            return None

    def setex(self, key: str, seconds: int, value: str) -> bool:
        try:
            cmd = ["SET", key, str(value), "EX", int(seconds)]
            req = urllib.request.Request(f"{self.url}/", data=json.dumps(cmd).encode("utf-8"), headers=self.headers, method="POST")
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode())
                return data.get("result") == "OK"
        except Exception:
            return False


redis_client = None
_CACHE_TTL = 60

# 1. Prefer Upstash REST if configured (fastest & most reliable across serverless/cloud)
_upstash_url = os.getenv("UPSTASH_REDIS_REST_URL")
_upstash_token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
if _upstash_url and _upstash_token:
    try:
        _client = UpstashRestClient(_upstash_url, _upstash_token)
        if _client.ping():
            redis_client = _client
            logger.info("Library Server: Connected to Upstash Redis via REST API.")
    except Exception as exc:
        logger.warning("Library Server: Upstash REST init failed: %s", exc)

# 2. Fallback to standard REDIS_URL via redis-py if REST is not set
if not redis_client and os.getenv("REDIS_URL"):
    try:
        import redis
        redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
        redis_client.ping()
        logger.info("Library Server: Connected to Redis via TCP socket URL.")
    except Exception as exc:
        logger.warning("Library Server: Redis TCP connection failed (%s). Continuing without cache.", exc)
        redis_client = None


def ping_redis() -> Optional[bool]:
    if not redis_client:
        return None
    try:
        return bool(redis_client.ping())
    except Exception:
        return False


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
@app.head("/health")
async def health():
    """
    Health check endpoint:
    Actively pings Supabase (SELECT 1) and Redis (PING) to keep both services awake,
    preventing Supabase free tier inactivity pause and keeping cloud containers warm.
    """
    db_alive = db.ping()
    redis_alive = ping_redis()
    status = "ok" if db_alive else "degraded"
    
    return {
        "status": status,
        "db": db_alive,
        "redis": redis_alive if redis_client else "disabled",
        "timestamp": int(time.time()),
    }

# ══════════════════════════════════════════════════════════════════════════════
# NODE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/nodes/register", response_model=NodeRegisterResponse)
async def register_node(req: NodeRegisterRequest):
    _require_db()
    node_id = req.node_id or f"NODE-{secrets.token_hex(3).upper()}"
    token = generate_token()
    token_hash = hash_token(token)

    node_data = {
        "node_id":         node_id,
        "name":            req.name,
        "hostname":        req.hostname,
        "ip":              req.ip,
        "platform":        req.platform,
        "status":          "online",
        "auth_token_hash": token_hash,
        "storage_total":   req.storage.total,
        "storage_used":    req.storage.used,
        "storage_free":    req.storage.free,
        "scan_paths":      json.dumps(req.scan_paths),
        "version":         req.version,
        "metadata":        json.dumps(req.metadata),
    }
    db.upsert_node(node_data)
    logger.info("Node registered: %s (%s @ %s)", node_id, req.name, req.ip)
    return NodeRegisterResponse(node_id=node_id, token=token)


@app.get("/api/nodes", response_model=List[NodeResponse])
async def list_nodes():
    _require_db()
    rows = db.get_all_nodes()
    return [_node_row_to_response(r) for r in rows]


@app.get("/api/nodes/{node_id}", response_model=NodeResponse)
async def get_node(node_id: str):
    _require_db()
    row = db.get_node(node_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found.")
    return _node_row_to_response(row)


@app.patch("/api/nodes/{node_id}")
async def update_node(
    node_id: str,
    body: Dict[str, Any],
    x_node_token: Optional[str] = Header(default=None),
):
    _require_db()
    _require_node_auth(node_id, x_node_token)
    allowed = {"name", "scan_paths"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    if "scan_paths" in updates:
        db.execute(
            "UPDATE library_nodes SET scan_paths = %(sp)s::jsonb, updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id, "sp": json.dumps(updates["scan_paths"])}
        )
    if "name" in updates:
        db.execute(
            "UPDATE library_nodes SET name = %(name)s, updated_at = NOW() WHERE node_id = %(id)s",
            {"id": node_id, "name": updates["name"]}
        )
    return {"updated": True}


@app.delete("/api/nodes/{node_id}")
async def delete_node(
    node_id: str,
    x_node_token: Optional[str] = Header(default=None),
):
    _require_db()
    _require_node_auth(node_id, x_node_token)
    db.delete_node(node_id)
    logger.info("Node deregistered: %s", node_id)
    return {"deleted": True}


@app.post("/api/nodes/{node_id}/heartbeat", response_model=NodeHeartbeatResponse)
async def node_heartbeat(
    node_id: str,
    req: NodeHeartbeatRequest,
    x_node_token: Optional[str] = Header(default=None),
):
    _require_db()
    _require_node_auth(node_id, x_node_token)
    db.heartbeat(
        node_id=node_id,
        storage_total=req.storage.total,
        storage_used=req.storage.used,
        storage_free=req.storage.free,
        ip=req.ip,
    )
    return NodeHeartbeatResponse(received=True)


@app.get("/api/nodes/{node_id}/config")
async def get_node_config(
    node_id: str,
    x_node_token: Optional[str] = Header(default=None),
):
    _require_db()
    _require_node_auth(node_id, x_node_token)
    row = db.get_node(node_id)
    if not row:
        raise HTTPException(status_code=404, detail="Node not found.")

    scan_paths = row.get("scan_paths") or []
    if isinstance(scan_paths, str):
        scan_paths = json.loads(scan_paths)

    return {
        "node_id":   node_id,
        "scan_paths": scan_paths,
        "sync_interval_seconds": int(os.getenv("NODE_SYNC_INTERVAL", "300")),
        "heartbeat_interval_seconds": 15,
    }


@app.post("/api/nodes/{node_id}/sync", response_model=SyncResponse)
async def sync_node(
    node_id: str,
    req: SyncRequest,
    x_node_token: Optional[str] = Header(default=None),
):
    """
    Ingest a batch of game installations from a node.

    For each installation:
    1. Check if canonical game exists via exact title & fuzzy matching.
    2. If NOT found: Run web search across renowned launchers (Steam/Epic/GOG)
       to fetch official cover art, developer, publisher, release date, and summary.
    3. Run AI classification to clean up messy/misplaced tags.
    4. Upsert the canonical game & node installation record.
    """
    _require_db()
    _require_node_auth(node_id, x_node_token)

    existing_rows = db.execute(
        "SELECT normalized_title, id FROM canonical_games",
        fetch="all"
    ) or []
    existing_index = [(r["normalized_title"], r["id"]) for r in existing_rows]

    stats = {"synced": 0, "new_games": 0, "updated_games": 0, "ai_queued": 0, "errors": 0}

    for payload in req.installations:
        try:
            norm = normalize_title(payload.title)
            matched_id = match_game(payload.title, existing_index)

            if matched_id:
                game_id = matched_id
                stats["updated_games"] += 1
            else:
                # Web search & launcher enrichment for unknown games
                logger.info("New game discovered on node '%s': '%s'. Enriching via web & launchers...", node_id, payload.title)
                web_meta = enrich_game_from_web(payload.title)

                title = web_meta.get("title") if web_meta else payload.title
                game_id = title_to_slug(title)
                dev = (web_meta.get("developer") if web_meta else None) or payload.developer
                pub = (web_meta.get("publisher") if web_meta else None) or payload.publisher
                rel = (web_meta.get("release_date") if web_meta else None) or payload.release_date
                cover = (web_meta.get("cover_url") if web_meta else None) or payload.cover_url
                banner = (web_meta.get("banner_url") if web_meta else None) or payload.banner_url
                summary = (web_meta.get("summary") if web_meta else None) or payload.summary
                raw_tags = deduplicate_tags(
                    (web_meta.get("raw_tags", []) if web_meta else []) + payload.tags
                )

                # Classify via AI model
                classified_genre = None
                classified_tags = raw_tags
                ai_done = False
                confidence = 0.0

                ai_res = classify_game(
                    title=title,
                    developer=dev,
                    publisher=pub,
                    raw_tags=raw_tags,
                    summary=summary,
                )
                if ai_res:
                    classified_genre = ai_res["primary_genre"]
                    classified_tags = ai_res["tags"]
                    confidence = ai_res["confidence"]
                    ai_done = True

                game_data = {
                    "id":               game_id,
                    "title":            title,
                    "normalized_title": normalize_title(title),
                    "developer":        dev,
                    "publisher":        pub,
                    "release_date":     rel,
                    "primary_genre":    classified_genre or (payload.genres[0] if payload.genres else "Action"),
                    "genres":           ai_res["genres"] if ai_res else payload.genres,
                    "tags":             classified_tags,
                    "features":         ai_res["features"] if ai_res else payload.features,
                    "platforms":        ["Windows", "Linux"],
                    "cover_url":        cover,
                    "banner_url":       banner,
                    "summary":          summary,
                    "ai_classified":    ai_done,
                    "ai_confidence":    confidence,
                    "raw_tags":         raw_tags,
                    "metadata":         json.dumps({
                        "source": payload.store,
                        "launchers": web_meta.get("launchers", [payload.store]) if web_meta else [payload.store],
                    }),
                }
                db.upsert_game(game_data)
                existing_index.append((normalize_title(title), game_id))
                stats["new_games"] += 1
                if not ai_done:
                    stats["ai_queued"] += 1

            # Upsert installation record
            install_id = f"{node_id}:{game_id}:{payload.store}"
            install_data = {
                "id":            install_id,
                "game_id":       game_id,
                "node_id":       node_id,
                "store":         payload.store,
                "store_app_id":  payload.store_app_id or None,
                "install_path":  payload.install_path,
                "exe_path":      payload.exe_path or None,
                "version":       payload.version or None,
                "size_bytes":    payload.size_bytes,
                "status":        "available",
            }
            db.upsert_installation(install_data)
            stats["synced"] += 1

        except Exception as exc:
            logger.error("Sync error for '%s': %s", payload.title, exc)
            stats["errors"] += 1

    db.execute(
        "UPDATE library_nodes SET last_sync = NOW(), updated_at = NOW() WHERE node_id = %(id)s",
        {"id": node_id}
    )
    return SyncResponse(**stats)


@app.post("/api/nodes/{node_id}/scan")
async def trigger_scan(node_id: str):
    _require_db()
    db.execute(
        "UPDATE library_nodes SET metadata = metadata || '{\"pending_command\": \"scan\"}'::jsonb WHERE node_id = %(id)s",
        {"id": node_id}
    )
    return {"queued": True, "node_id": node_id, "command": "scan"}


# ══════════════════════════════════════════════════════════════════════════════
# WEB DISCOVERY & SEEDING ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/games/discover", response_model=DiscoverResponse)
async def discover_games(
    q: str = Query(..., min_length=1, description="Game title or keyword to find on renowned launchers / web"),
    limit: int = Query(15, ge=1, le=50),
):
    """
    Find games via live web search & renowned game launchers (Steam, Epic, GOG, RAWG).
    Automatically saves newly discovered games to canonical_games and triggers AI classification.
    """
    _require_db()

    # 1. Search across renowned launchers in parallel
    raw_results = search_launcher_and_web_games(q, limit=limit)

    # 2. Check which ones exist in canonical_games already
    existing_rows = db.execute("SELECT id, normalized_title, primary_genre, ai_classified FROM canonical_games", fetch="all") or []
    existing_map = {r["normalized_title"]: r for r in existing_rows}
    existing_ids = {r["id"]: r for r in existing_rows}

    discover_items: List[DiscoverItem] = []
    newly_ingested = 0

    for item in raw_results:
        title = item.get("title", "")
        if not title:
            continue
        norm = normalize_title(title)
        slug = item.get("slug") or title_to_slug(title)

        existing = existing_map.get(norm) or existing_ids.get(slug)
        in_catalog = existing is not None
        ai_classified = existing.get("ai_classified", False) if existing else False
        primary_genre = existing.get("primary_genre") if existing else None

        # If not in catalog, auto-ingest into canonical_games with immediate top priority AI classification
        if not in_catalog:
            try:
                raw_tags = deduplicate_tags(item.get("raw_tags", []))
                
                ai_res = classify_game(
                    title=title,
                    developer=item.get("developer"),
                    publisher=item.get("publisher"),
                    raw_tags=raw_tags,
                    summary=item.get("summary"),
                )
                classified_genre = ai_res["primary_genre"] if ai_res else (item.get("genres", [None])[0] if item.get("genres") else "Action")
                confidence = ai_res["confidence"] if ai_res else 0.0
                is_classified = bool(ai_res)

                game_data = {
                    "id":               slug,
                    "title":            title,
                    "normalized_title": norm,
                    "developer":        item.get("developer"),
                    "publisher":        item.get("publisher"),
                    "release_date":     item.get("release_date"),
                    "primary_genre":    classified_genre,
                    "genres":           ai_res["genres"] if ai_res else (item.get("genres") or ["Action"]),
                    "tags":             ai_res["tags"] if ai_res else raw_tags,
                    "features":         ai_res["features"] if ai_res else [],
                    "platforms":        ["Windows", "Linux"],
                    "cover_url":        item.get("cover_url"),
                    "banner_url":       item.get("banner_url"),
                    "summary":          item.get("summary"),
                    "ai_classified":    is_classified,
                    "ai_confidence":    confidence,
                    "raw_tags":         raw_tags,
                    "metadata":         json.dumps({"source": item.get("store", "web"), "launchers": item.get("launchers", [])}),
                }
                db.upsert_game(game_data)

                if ai_res:
                    db.log_ai_classification({
                        "game_id":      slug,
                        "provider":     ai_res["provider"],
                        "model":        ai_res["model"],
                        "input_tags":   raw_tags,
                        "output_genre": ai_res["primary_genre"],
                        "output_tags":  ai_res["tags"],
                        "confidence":   ai_res["confidence"],
                        "latency_ms":   ai_res.get("latency_ms", 0),
                    })

                in_catalog = True
                newly_ingested += 1
                ai_classified = is_classified
                primary_genre = classified_genre
                existing_map[norm] = {"id": slug, "normalized_title": norm, "primary_genre": classified_genre, "ai_classified": is_classified}
            except Exception as exc:
                logger.error("Auto-ingest error for '%s': %s", title, exc)

        # Fetch any local installations for this game
        installations_raw = db.get_installations_for_game(slug) if in_catalog else []
        inst_list = []
        for ir in installations_raw:
            inst_list.append(GameInstallationInfo(
                node_id=ir.get("node_id", ""),
                node_name=ir.get("node_name", ""),
                node_status=ir.get("node_status", "offline"),
                store=ir.get("store", "manual"),
                store_app_id=ir.get("store_app_id"),
                install_path=ir.get("install_path", ""),
                exe_path=ir.get("exe_path"),
                version=ir.get("version"),
                size_bytes=ir.get("size_bytes", 0),
                status=ir.get("status", "available"),
            ))

        discover_items.append(DiscoverItem(
            id=slug,
            title=title,
            developer=item.get("developer"),
            publisher=item.get("publisher"),
            release_date=item.get("release_date"),
            primary_genre=primary_genre or (item.get("genres", [None])[0] if item.get("genres") else None),
            genres=item.get("genres", []),
            tags=item.get("raw_tags", []),
            cover_url=item.get("cover_url"),
            banner_url=item.get("banner_url"),
            summary=item.get("summary"),
            store=item.get("store", "steam"),
            store_app_id=item.get("store_app_id"),
            launchers=item.get("launchers", ["Steam"]),
            in_catalog=in_catalog,
            ai_classified=ai_classified,
            installations=inst_list,
        ))

    return DiscoverResponse(
        query=q,
        results=discover_items,
        total=len(discover_items),
        newly_ingested=newly_ingested,
    )


@app.post("/api/games/seed", response_model=SeedResponse)
async def seed_games(req: SeedRequest):
    """
    Harvest top / bestselling games across renowned game launchers (Steam, Epic, GOG)
    and seed them into canonical_games.
    """
    _require_db()

    top_games = harvest_top_games_from_launchers(limit_per_launcher=req.limit_per_launcher)
    existing_rows = db.execute("SELECT id, normalized_title FROM canonical_games", fetch="all") or []
    existing_set = {r["normalized_title"] for r in existing_rows} | {r["id"] for r in existing_rows}

    inserted = 0
    skipped = 0
    to_classify = []

    for g in top_games:
        title = g.get("title", "")
        slug = g.get("slug") or title_to_slug(title)
        norm = normalize_title(title)

        if norm in existing_set or slug in existing_set:
            skipped += 1
            continue

        raw_tags = deduplicate_tags(g.get("raw_tags", []))
        game_data = {
            "id":               slug,
            "title":            title,
            "normalized_title": norm,
            "developer":        g.get("developer"),
            "publisher":        g.get("publisher"),
            "release_date":     g.get("release_date"),
            "primary_genre":    g.get("genres", [None])[0] if g.get("genres") else None,
            "genres":           g.get("genres", []),
            "tags":             raw_tags,
            "features":         [],
            "platforms":        ["Windows", "Linux"],
            "cover_url":        g.get("cover_url"),
            "banner_url":       g.get("banner_url"),
            "summary":          g.get("summary"),
            "ai_classified":    False,
            "ai_confidence":    0.0,
            "raw_tags":         raw_tags,
            "metadata":         json.dumps({"source": g.get("store", "web"), "launchers": g.get("launchers", [])}),
        }
        try:
            db.upsert_game(game_data)
            inserted += 1
            existing_set.add(norm)
            to_classify.append(game_data)
        except Exception as exc:
            logger.error("Seed error for %s: %s", title, exc)

    classified_count = 0
    if req.classify_immediately and to_classify:
        # Run classification on a subset immediately
        logger.info("Running immediate AI classification on %d newly seeded games...", len(to_classify[:15]))
        classified_count = classify_batch(to_classify[:15], db=db, delay_between=0.4)

    return SeedResponse(
        harvested=len(top_games),
        inserted=inserted,
        skipped_existing=skipped,
        classified=classified_count,
    )


# ══════════════════════════════════════════════════════════════════════════════
# CATALOG & SEARCH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/games")
async def get_games(
    page: int = Query(1, ge=1),
    limit: int = Query(48, ge=1, le=200),
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    node_id: Optional[str] = Query(None),
    clerk_id: Optional[str] = Query(None),
    store: Optional[str] = Query(None),
    installed_only: bool = Query(False),
    availability: Optional[str] = Query(None),
):
    """
    Paginated canonical game catalog with cross-node installation aggregation.
    """
    _require_db()

    if installed_only and not clerk_id and not node_id:
        return {"games": [], "total": 0, "page": page, "limit": limit, "pages": 1}

    cache_key = f"mc:catalog:{page}:{limit}:{search}:{genre}:{node_id}:{clerk_id}:{store}:{installed_only}:{availability}"
    if redis_client and not installed_only:
        try:
            cached_val = redis_client.get(cache_key)
            if cached_val:
                return json.loads(cached_val)
        except Exception as exc:
            logger.warning("Redis get failed: %s", exc)

    rows = db.get_catalog(
        search=search,
        genre=genre,
        node_id=node_id,
        clerk_id=clerk_id,
        store=store,
        installed_only=installed_only,
        page=page,
        limit=limit,
    )

    games = []
    for row in rows:
        installations = _parse_installations(row.get("installations") or [])
        if availability == "available":
            installations = [i for i in installations if i.status == "available"]
        elif availability == "offline":
            installations = [i for i in installations if i.status == "unavailable"]

        games.append({
            "id":           row["id"],
            "title":        row["title"],
            "developer":    row.get("developer"),
            "publisher":    row.get("publisher"),
            "releaseDate":  row.get("release_date"),
            "primaryGenre": row.get("primary_genre"),
            "genres":       row.get("genres") or [],
            "tags":         row.get("tags") or [],
            "features":     row.get("features") or [],
            "platforms":    row.get("platforms") or ["Windows", "Linux"],
            "coverUrl":     row.get("cover_url"),
            "bannerUrl":    row.get("banner_url"),
            "summary":      row.get("summary"),
            "aiClassified": row.get("ai_classified", False),
            "installations": [i.model_dump() for i in installations],
        })

    count_row = db.execute(
        "SELECT COUNT(*) AS cnt FROM canonical_games", fetch="one"
    )
    total = count_row["cnt"] if count_row else len(games)

    response_data = {
        "games": games,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, -(-total // limit)),
    }

    if redis_client and not installed_only:
        try:
            redis_client.setex(cache_key, _CACHE_TTL, json.dumps(response_data))
        except Exception as exc:
            logger.warning("Redis set failed: %s", exc)

    return response_data


@app.get("/api/games/{game_id}")
async def get_game(game_id: str):
    _require_db()
    row = db.get_game(game_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found.")
    return row


@app.get("/api/games/{game_id}/installations")
async def get_game_installations(game_id: str, clerk_id: Optional[str] = None):
    _require_db()
    rows = db.get_installations_for_game(game_id, clerk_id=clerk_id)
    return {"game_id": game_id, "installations": rows}


@app.get("/api/search")
async def search_games(q: str = Query(..., min_length=1)):
    """Fast cross-node search against canonical game catalog with dynamic live store discovery fallback."""
    _require_db()
    rows = db.get_catalog(search=q, limit=20, page=1)
    results = []
    for row in rows:
        installations = _parse_installations(row.get("installations") or [])
        results.append({
            "id":           row["id"],
            "title":        row["title"],
            "primaryGenre": row.get("primary_genre"),
            "coverUrl":     row.get("cover_url"),
            "installations": [i.model_dump() for i in installations],
        })
    
    # If not found or few matches, dynamically query global store APIs (Steam, Epic, GOG)
    if len(results) < 3:
        try:
            live_items = search_launcher_and_web_games(q, limit=6)
            for item in live_items:
                title = item.get("title", "")
                if not title:
                    continue
                slug = item.get("slug") or title_to_slug(title)
                norm = normalize_title(title)
                
                if any(r["id"] == slug for r in results):
                    continue

                raw_tags = deduplicate_tags(item.get("raw_tags", []))
                ai_res = classify_game(
                    title=title,
                    developer=item.get("developer"),
                    publisher=item.get("publisher"),
                    raw_tags=raw_tags,
                    summary=item.get("summary"),
                )
                classified_genre = ai_res["primary_genre"] if ai_res else (item.get("genres", [None])[0] if item.get("genres") else "Action")
                confidence = ai_res["confidence"] if ai_res else 0.0

                game_data = {
                    "id":               slug,
                    "title":            title,
                    "normalized_title": norm,
                    "developer":        item.get("developer"),
                    "publisher":        item.get("publisher"),
                    "release_date":     item.get("release_date"),
                    "primary_genre":    classified_genre,
                    "genres":           ai_res["genres"] if ai_res else (item.get("genres") or ["Action"]),
                    "tags":             ai_res["tags"] if ai_res else raw_tags,
                    "features":         ai_res["features"] if ai_res else [],
                    "platforms":        ["Windows", "Linux"],
                    "cover_url":        item.get("cover_url"),
                    "banner_url":       item.get("banner_url"),
                    "summary":          item.get("summary"),
                    "ai_classified":    bool(ai_res),
                    "ai_confidence":    confidence,
                    "raw_tags":         raw_tags,
                    "metadata":         json.dumps({"source": item.get("store", "web"), "appid": item.get("store_app_id")}),
                }
                db.upsert_game(game_data)

                if ai_res:
                    db.log_ai_classification({
                        "game_id":      slug,
                        "provider":     ai_res["provider"],
                        "model":        ai_res["model"],
                        "input_tags":   raw_tags,
                        "output_genre": ai_res["primary_genre"],
                        "output_tags":  ai_res["tags"],
                        "confidence":   ai_res["confidence"],
                        "latency_ms":   ai_res.get("latency_ms", 0),
                    })

                results.append({
                    "id":           slug,
                    "title":        title,
                    "primaryGenre": classified_genre,
                    "coverUrl":     item.get("cover_url"),
                    "installations": [],
                })
        except Exception as exc:
            logger.warning("Dynamic search fallback error: %s", exc)

    return {"query": q, "results": results, "total": len(results)}


@app.post("/api/games/classify", response_model=ClassifyResponse)
async def classify_game_endpoint(req: ClassifyRequest):
    """Manually trigger AI classification for a specific game."""
    result = classify_game(
        title=req.title,
        developer=req.developer,
        publisher=req.publisher,
        raw_tags=req.raw_tags,
        summary=req.summary,
    )
    if not result:
        raise HTTPException(status_code=503, detail="All AI providers failed. Check API keys.")

    if req.game_id and db.available:
        db.mark_game_classified(
            game_id=req.game_id,
            primary_genre=result["primary_genre"],
            genres=result["genres"],
            tags=result["tags"],
            confidence=result["confidence"],
        )
        db.log_ai_classification({
            "game_id":      req.game_id,
            "provider":     result["provider"],
            "model":        result["model"],
            "input_tags":   req.raw_tags,
            "output_genre": result["primary_genre"],
            "output_tags":  result["tags"],
            "confidence":   result["confidence"],
            "latency_ms":   result.get("latency_ms", 0),
        })

    return ClassifyResponse(
        game_id=req.game_id,
        title=req.title,
        primary_genre=result["primary_genre"],
        genres=result["genres"],
        tags=result["tags"],
        features=result["features"],
        confidence=result["confidence"],
        provider=result["provider"],
        model=result["model"],
    )


@app.get("/api/agent/diagnostics")
async def get_agent_diagnostics():
    """Real-time cluster health diagnostics and self-healing report from the Server Watchdog Agent."""
    from server_watchdog_agent import watchdog_agent
    return watchdog_agent.run_diagnostics()


@app.get("/api/library/stats")
async def library_stats(clerk_id: Optional[str] = None):
    """Aggregated metrics: total games, total real storage, node breakdown."""
    _require_db()
    raw = db.get_stats(clerk_id=clerk_id)
    nodes_raw = raw.get("nodes") or []
    if isinstance(nodes_raw, str):
        nodes_raw = json.loads(nodes_raw)

    node_entries = []
    for n in nodes_raw:
        node_entries.append(NodeStatEntry(
            node_id=n.get("node_id", ""),
            name=n.get("name", ""),
            hostname=n.get("hostname", ""),
            ip=n.get("ip", ""),
            status=n.get("status", "offline"),
            storage_total=n.get("storage_total", 0),
            storage_used=n.get("storage_used", 0),
            storage_free=n.get("storage_free", 0),
            last_heartbeat=str(n["last_heartbeat"]) if n.get("last_heartbeat") else None,
            game_count=n.get("game_count", 0),
        ))

    store_dist = raw.get("store_distribution") or {}
    if isinstance(store_dist, str):
        store_dist = json.loads(store_dist)

    return LibraryStatsResponse(
        total_master_games=raw.get("total_master_games", 0),
        total_installed_games=raw.get("total_installed_games", 0),
        total_nodes=raw.get("total_nodes", 0),
        online_nodes=raw.get("online_nodes", 0),
        total_storage_bytes=raw.get("total_storage_bytes", 0),
        used_storage_bytes=raw.get("used_storage_bytes", 0),
        free_storage_bytes=raw.get("free_storage_bytes", 0),
        nodes=node_entries,
        store_distribution=store_dist,
    )


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _parse_installations(raw: Any) -> List[GameInstallationInfo]:
    if not raw:
        return []
    if isinstance(raw, str):
        raw = json.loads(raw)
    result = []
    for item in raw:
        if not item:
            continue
        try:
            result.append(GameInstallationInfo(
                node_id=item.get("nodeId", item.get("node_id", "")),
                node_name=item.get("nodeName", item.get("node_name", "")),
                node_status=item.get("nodeStatus", item.get("node_status", "offline")),
                store=item.get("store", "manual"),
                store_app_id=item.get("storeAppId", item.get("store_app_id")),
                install_path=item.get("installPath", item.get("install_path", "")),
                exe_path=item.get("exePath", item.get("exe_path")),
                version=item.get("version"),
                size_bytes=item.get("sizeBytes", item.get("size_bytes", 0)),
                status=item.get("status", "available"),
            ))
        except Exception:
            pass
    return result


def _node_row_to_response(row: Dict) -> NodeResponse:
    scan_paths = row.get("scan_paths") or []
    if isinstance(scan_paths, str):
        scan_paths = json.loads(scan_paths)
    metadata = row.get("metadata") or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    return NodeResponse(
        node_id=row["node_id"],
        name=row["name"],
        hostname=row["hostname"],
        ip=row["ip"],
        platform=row.get("platform", "windows"),
        status=row.get("status", "offline"),
        storage_total=row.get("storage_total", 0),
        storage_used=row.get("storage_used", 0),
        storage_free=row.get("storage_free", 0),
        scan_paths=scan_paths if isinstance(scan_paths, list) else [],
        last_heartbeat=str(row["last_heartbeat"]) if row.get("last_heartbeat") else None,
        last_sync=str(row["last_sync"]) if row.get("last_sync") else None,
        version=row.get("version", "1.0.0"),
        metadata=metadata if isinstance(metadata, dict) else {},
    )
