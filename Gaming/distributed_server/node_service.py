"""
Mission Control — Distributed Game Library
node_service.py: Microservice dedicated to User Library Management, Node Registration,
Heartbeats, Syncing, and Storage Hardware Metrics.

Run standalone or in a multi-instance pool:
    python node_service.py --port 8821 --watchdog
    python node_service.py --port 8822
"""

import argparse
import asyncio
import hashlib
import json
import logging
import os
import secrets
import sys
import threading
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=True)
        break

from fastapi import FastAPI, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import LibraryDB
from models import (
    GameInstallationInfo, LibraryStatsResponse, NodeHeartbeatRequest,
    NodeHeartbeatResponse, NodeRegisterRequest, NodeRegisterResponse,
    NodeResponse, NodeStatEntry, SyncRequest, SyncResponse,
    hash_token, generate_token,
)
from normalizer import match_game, normalize_title, title_to_slug, deduplicate_tags
from ai_classifier import classify_game
from game_harvester import enrich_game_from_web

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("node-service")

db = LibraryDB()

# ── Offline Watchdog ──────────────────────────────────────────────────────────
_HEARTBEAT_TIMEOUT_SECONDS = int(os.getenv("HEARTBEAT_TIMEOUT", "45"))
_RUN_WATCHDOG = os.getenv("ENABLE_NODE_WATCHDOG", "true").lower() == "true"


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    if _RUN_WATCHDOG:
        threading.Thread(target=_offline_watchdog, daemon=True, name="OfflineWatchdog").start()
        logger.info("Node Service: Offline Watchdog active.")
    else:
        logger.info("Node Service: Watchdog disabled (running in worker-replica mode).")
    yield


app = FastAPI(
    title="Mission Control — User Library & Node Sync Service",
    description="Dedicated microservice for Local Machine Registrations, Disk Syncs, and Realtime Storage.",
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


def _require_db():
    if not db.available:
        raise HTTPException(status_code=503, detail="Database not available.")


def _require_node_auth(node_id: str, x_node_token: Optional[str]) -> None:
    if not x_node_token:
        raise HTTPException(status_code=401, detail="X-Node-Token header required.")
    if not db.verify_node_token(node_id, x_node_token):
        raise HTTPException(status_code=401, detail="Invalid node token.")


def _node_row_to_response(row: Dict[str, Any]) -> NodeResponse:
    scan_paths = row.get("scan_paths") or []
    if isinstance(scan_paths, str):
        try:
            scan_paths = json.loads(scan_paths)
        except Exception:
            scan_paths = []

    meta = row.get("metadata") or {}
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}

    return NodeResponse(
        node_id=row["node_id"],
        clerk_id=row.get("clerk_id"),
        auth_provider=row.get("auth_provider"),
        name=row["name"],
        hostname=row["hostname"],
        ip=row["ip"],
        platform=row.get("platform", "windows"),
        status=row.get("status", "offline"),
        storage={
            "total": row.get("storage_total", 0),
            "used": row.get("storage_used", 0),
            "free": row.get("storage_free", 0),
        },
        scan_paths=scan_paths,
        last_heartbeat=row.get("last_heartbeat"),
        last_sync=row.get("last_sync"),
        version=row.get("version", "1.0.0"),
        metadata=meta,
    )


def _parse_installations(inst_data: Any) -> List[GameInstallationInfo]:
    if isinstance(inst_data, str):
        try:
            inst_data = json.loads(inst_data)
        except Exception:
            inst_data = []
    if not isinstance(inst_data, list):
        return []

    result = []
    for item in inst_data:
        if not item or not isinstance(item, dict) or not item.get("nodeId"):
            continue
        result.append(GameInstallationInfo(
            node_id=item.get("nodeId", ""),
            node_name=item.get("nodeName", ""),
            node_status=item.get("nodeStatus", "offline"),
            store=item.get("store", "manual"),
            store_app_id=item.get("storeAppId"),
            install_path=item.get("installPath", ""),
            exe_path=item.get("exePath"),
            version=item.get("version"),
            size_bytes=item.get("sizeBytes", 0),
            status=item.get("status", "available"),
        ))
    return result


@app.get("/health")
async def health():
    return {
        "service": "node_sync_library",
        "status": "ok",
        "db": db.available,
        "pid": os.getpid(),
    }


# ── Node Management Endpoints ────────────────────────────────────────────────

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
        "clerk_id":        req.clerk_id,
        "auth_provider":   req.auth_provider,
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
async def list_nodes(clerk_id: Optional[str] = None):
    _require_db()
    rows = db.get_all_nodes(clerk_id=clerk_id)
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
        try:
            scan_paths = json.loads(scan_paths)
        except Exception:
            scan_paths = []

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
    Ingest a batch of game installations from a node directly into Supabase.
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
                logger.info("New game discovered on node '%s': '%s'. Enriching...", node_id, payload.title)
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

                ai_res = classify_game(
                    title=title,
                    developer=dev,
                    publisher=pub,
                    raw_tags=raw_tags,
                    summary=summary,
                )
                classified_genre = ai_res["primary_genre"] if ai_res else (payload.genres[0] if payload.genres else "Action")
                classified_tags = ai_res["tags"] if ai_res else raw_tags
                confidence = ai_res["confidence"] if ai_res else 0.0

                game_data = {
                    "id":               game_id,
                    "title":            title,
                    "normalized_title": normalize_title(title),
                    "developer":        dev,
                    "publisher":        pub,
                    "release_date":     rel or (ai_res.get("release_date") if ai_res else None),
                    "primary_genre":    classified_genre,
                    "genres":           ai_res["genres"] if ai_res else payload.genres,
                    "tags":             classified_tags,
                    "features":         ai_res["features"] if ai_res else payload.features,
                    "platforms":        ["Windows"],
                    "cover_url":        cover,
                    "banner_url":       banner,
                    "summary":          summary,
                    "ai_classified":    bool(ai_res),
                    "ai_confidence":    confidence,
                    "raw_tags":         raw_tags,
                    "metadata":         json.dumps({
                        "source": payload.store,
                        "launchers": web_meta.get("launchers", [payload.store]) if web_meta else [payload.store],
                        "appid": payload.store_app_id,
                    }),
                }
                db.upsert_game(game_data)
                existing_index.append((normalize_title(title), game_id))
                stats["new_games"] += 1
                if not ai_res:
                    stats["ai_queued"] += 1

            # Upsert into game_installations
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


@app.get("/api/games/{game_id}/installations")
async def get_game_installations(game_id: str, clerk_id: Optional[str] = None):
    _require_db()
    rows = db.get_installations_for_game(game_id, clerk_id=clerk_id)
    return {"game_id": game_id, "installations": rows}


@app.get("/api/games")
async def get_installed_games(
    page: int = Query(1, ge=1),
    limit: int = Query(48, ge=1, le=200),
    q: Optional[str] = None,
    genre: Optional[str] = None,
    node_id: Optional[str] = None,
    clerk_id: Optional[str] = None,
    store: Optional[str] = None,
    installed_only: bool = False,
    availability: Optional[str] = None,
):
    _require_db()
    # Isolation: If querying installed games only and no clerk_id/node_id is specified, return empty
    if installed_only and not clerk_id and not node_id:
        return {"games": [], "total": 0, "page": page, "limit": limit, "pages": 1}

    rows = db.get_catalog(
        search=q,
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
            "platforms":    row.get("platforms") or ["Windows"],
            "coverUrl":     row.get("cover_url"),
            "bannerUrl":    row.get("banner_url"),
            "summary":      row.get("summary"),
            "aiClassified": row.get("ai_classified", False),
            "installations": [i.model_dump() for i in installations],
        })

    count_row = db.execute("SELECT COUNT(*) AS cnt FROM canonical_games", fetch="one")
    total = count_row["cnt"] if count_row else len(games)

    return {
        "games": games,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, -(-total // limit)),
    }


@app.get("/api/library/stats")
async def library_stats(clerk_id: Optional[str] = None):
    _require_db()
    raw = db.get_stats(clerk_id=clerk_id)
    nodes_raw = raw.get("nodes") or []
    if isinstance(nodes_raw, str):
        try:
            nodes_raw = json.loads(nodes_raw)
        except Exception:
            nodes_raw = []

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
        try:
            store_dist = json.loads(store_dist)
        except Exception:
            store_dist = {}

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



def main():
    parser = argparse.ArgumentParser(description="User Library & Node Sync Microservice")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8821)
    parser.add_argument("--watchdog", action="store_true", help="Enable offline node watchdog thread on this instance")
    args = parser.parse_args()

    global _RUN_WATCHDOG
    if args.watchdog:
        _RUN_WATCHDOG = True

    try:
        import uvicorn
    except ImportError:
        print("ERROR: uvicorn not installed.")
        sys.exit(1)

    print(f"\n[NODE SERVICE] Listening: http://{args.host}:{args.port} (Watchdog: {_RUN_WATCHDOG})\n")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
