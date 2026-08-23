"""
Mission Control — Distributed Game Library
catalog_service.py: Microservice dedicated to Web & Launcher Discovery, Seeding, Search, and AI Classification.

Run standalone or in a multi-instance pool:
    python catalog_service.py --port 8811 --worker
    python catalog_service.py --port 8812
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import threading
import time
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        break

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import LibraryDB
from models import (
    ClassifyRequest, ClassifyResponse, DiscoverItem, DiscoverResponse,
    SeedRequest, SeedResponse,
)
from normalizer import normalize_title, title_to_slug, deduplicate_tags
from ai_classifier import classify_game, classify_batch
from game_harvester import (
    search_launcher_and_web_games,
    harvest_top_games_from_launchers,
    enrich_game_from_web,
    SteamHarvester,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("catalog-service")

db = LibraryDB()

# ── Background Workers ────────────────────────────────────────────────────────
_CLASSIFY_INTERVAL = int(os.getenv("AI_CLASSIFY_INTERVAL", "20"))
_ENRICH_INTERVAL = 20
_RUN_BACKGROUND_WORKERS = os.getenv("ENABLE_CATALOG_WORKERS", "true").lower() == "true"


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


def _enrichment_worker():
    """Background thread: periodically fills in missing release dates, summaries, and features from Steam & web."""
    import re
    while True:
        try:
            if db.available:
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
                        time.sleep(1.2)
        except Exception as exc:
            logger.error("Enrichment Worker error: %s", exc)
        time.sleep(_ENRICH_INTERVAL)


def _seed_catalog_if_empty():
    """Seed the canonical games catalog on startup if empty."""
    time.sleep(3)
    if not db.available:
        return
    try:
        count_row = db.execute("SELECT COUNT(*) AS cnt FROM canonical_games", fetch="one")
        if count_row and count_row.get("cnt", 0) < 15:
            logger.info("Catalog is empty. Harvesting initial games from launchers...")
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
                        "platforms":        ["Windows"],
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
                    logger.debug("Initial seed error for %s: %s", g.get("title"), exc)
            logger.info("Initial seeding complete: Ingested %d games.", inserted)
    except Exception as exc:
        logger.error("Initial seeding error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if _RUN_BACKGROUND_WORKERS:
        threading.Thread(target=_classification_worker, daemon=True, name="AIClassifier").start()
        threading.Thread(target=_enrichment_worker, daemon=True, name="EnrichmentWorker").start()
        threading.Thread(target=_seed_catalog_if_empty, daemon=True, name="InitialSeeder").start()
        logger.info("Catalog Service: Background AI & Enrichment workers active.")
    else:
        logger.info("Catalog Service: Background workers disabled (running in worker-replica mode).")
    yield


app = FastAPI(
    title="Mission Control — Catalog & Web Discovery Service",
    description="Dedicated microservice for Web Search, Crawler Ingestion, and AI Classification.",
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


@app.get("/health")
async def health():
    return {
        "service": "catalog_discovery",
        "status": "ok",
        "db": db.available,
        "pid": os.getpid(),
    }


# ── Web Discovery & Ingestion ────────────────────────────────────────────────
@app.get("/api/games/discover", response_model=DiscoverResponse)
async def discover_games(
    q: str = Query(..., min_length=1, description="Game title or keyword to find on renowned launchers / web"),
    limit: int = Query(15, ge=1, le=50),
):
    _require_db()
    raw_results = search_launcher_and_web_games(q, limit=limit)
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

        if not in_catalog:
            try:
                raw_tags = deduplicate_tags(item.get("raw_tags", []))
                game_data = {
                    "id":               slug,
                    "title":            title,
                    "normalized_title": norm,
                    "developer":        item.get("developer"),
                    "publisher":        item.get("publisher"),
                    "release_date":     item.get("release_date"),
                    "primary_genre":    item.get("genres", [None])[0] if item.get("genres") else None,
                    "genres":           item.get("genres", []),
                    "tags":             raw_tags,
                    "features":         [],
                    "platforms":        ["Windows"],
                    "cover_url":        item.get("cover_url"),
                    "banner_url":       item.get("banner_url"),
                    "summary":          item.get("summary"),
                    "ai_classified":    False,
                    "ai_confidence":    0.0,
                    "raw_tags":         raw_tags,
                    "metadata":         json.dumps({
                        "source": item.get("store", "web"),
                        "launchers": item.get("launchers", []),
                        "appid": item.get("store_app_id"),
                    }),
                }
                db.upsert_game(game_data)
                in_catalog = True
                newly_ingested += 1
                existing_map[norm] = {"id": slug, "normalized_title": norm, "primary_genre": game_data["primary_genre"], "ai_classified": False}
            except Exception as exc:
                logger.error("Auto-ingest error for '%s': %s", title, exc)

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
            installations=[],
        ))

    return DiscoverResponse(
        query=q,
        results=discover_items,
        total=len(discover_items),
        newly_ingested=newly_ingested,
    )


@app.post("/api/games/seed", response_model=SeedResponse)
async def seed_games(req: SeedRequest):
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
            "platforms":        ["Windows"],
            "cover_url":        g.get("cover_url"),
            "banner_url":       g.get("banner_url"),
            "summary":          g.get("summary"),
            "ai_classified":    False,
            "ai_confidence":    0.0,
            "raw_tags":         raw_tags,
            "metadata":         json.dumps({
                "source": g.get("store", "web"),
                "launchers": g.get("launchers", []),
                "appid": g.get("store_app_id"),
            }),
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
        logger.info("Running immediate AI classification on %d games...", len(to_classify[:15]))
        classified_count = classify_batch(to_classify[:15], db=db, delay_between=0.4)

    return SeedResponse(
        harvested=len(top_games),
        inserted=inserted,
        skipped_existing=skipped,
        classified=classified_count,
    )


@app.post("/api/games/classify", response_model=ClassifyResponse)
async def classify_game_endpoint(req: ClassifyRequest):
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
            release_date=result.get("release_date"),
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


_CACHE_TTL = 600  # 10 minutes
redis_client = None

# 1. Upstash REST
_upstash_url = os.getenv("UPSTASH_REDIS_REST_URL")
_upstash_token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
if _upstash_url and _upstash_token:
    try:
        _client = UpstashRestClient(_upstash_url, _upstash_token)
        if _client.ping():
            redis_client = _client
            logger.info("Catalog Service: Connected to Upstash Redis via REST API.")
    except Exception as exc:
        logger.warning("Catalog Service: Upstash REST init failed: %s", exc)

# 2. Redis TCP
if not redis_client and os.getenv("REDIS_URL"):
    try:
        import redis
        redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)
        redis_client.ping()
        logger.info("Catalog Service: Connected to Redis via TCP socket URL.")
    except Exception as exc:
        logger.warning("Catalog Service: Redis TCP connection failed (%s). Continuing without cache.", exc)
        redis_client = None

@app.get("/api/search")
async def search_games(q: str = Query(..., min_length=1)):
    _require_db()
    rows = db.get_catalog(search=q, limit=20, page=1)
    results = []
    for row in rows:
        results.append({
            "id":           row["id"],
            "title":        row["title"],
            "primaryGenre": row.get("primary_genre"),
            "coverUrl":     row.get("cover_url"),
            "releaseDate":  row.get("release_date"),
            "installations": [],
        })
    return {"query": q, "results": results, "total": len(results)}


@app.get("/api/games")
async def get_games(
    page: int = Query(1, ge=1),
    limit: int = Query(48, ge=1, le=200),
    cursor: Optional[str] = Query(None, description="Last seen ID for cursor pagination"),
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    node_id: Optional[str] = Query(None),
    clerk_id: Optional[str] = Query(None),
    store: Optional[str] = Query(None),
    installed_only: bool = Query(False),
    availability: Optional[str] = Query(None),
):
    _require_db()
    if installed_only and not clerk_id and not node_id:
        return {"games": [], "total": 0, "page": page, "limit": limit, "pages": 1, "nextCursor": None}

    cache_key = f"mc:catalog:{cursor}:{page}:{limit}:{search}:{genre}:{node_id}:{clerk_id}:{store}:{installed_only}"
    
    if redis_client:
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
        last_seen_id=cursor,
        page=page,
        limit=limit,
    )

    games = []
    for row in rows:
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
            "installations": row.get("installations") or [],
        })

    # Only count total if it's the first page (no cursor), else we estimate or return existing total logic
    total = 0
    if not cursor and not search:
        count_row = db.execute("SELECT COUNT(*) AS cnt FROM canonical_games", fetch="one")
        total = count_row["cnt"] if count_row else len(games)
    else:
        total = len(games)  # Simplified for cursor requests

    next_cursor = games[-1]["id"] if len(games) == limit else None

    response_data = {
        "games": games,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, -(-total // limit)),
        "nextCursor": next_cursor,
    }

    if not search and not genre and not clerk_id and not node_id:
        # Cache general hot queries (e.g. top games)
        if redis_client:
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


def main():
    parser = argparse.ArgumentParser(description="Catalog & Web Discovery Microservice")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8811)
    parser.add_argument("--worker", action="store_true", help="Enable background AI & enrichment workers on this instance")
    args = parser.parse_args()

    global _RUN_BACKGROUND_WORKERS
    if args.worker:
        _RUN_BACKGROUND_WORKERS = True

    try:
        import uvicorn
    except ImportError:
        print("ERROR: uvicorn not installed.")
        sys.exit(1)

    print(f"\n[CATALOG SERVICE] Listening: http://{args.host}:{args.port} (Workers: {_RUN_BACKGROUND_WORKERS})\n")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
