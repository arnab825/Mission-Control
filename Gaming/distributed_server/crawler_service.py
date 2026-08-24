#!/usr/bin/env python3
"""
Mission Control — Dedicated Infinite Harvester & AI Crawler Microservice
crawler_service.py: High-availability autonomous background microservice running on port :8851:
  1. Supervises 6 independent concurrent worker threads (Steam, GOG, Epic, Xbox, AI Classifier, Healer).
  2. Built-in self-healing watchdog automatically revives any failed thread with 0 downtime.
  3. Integrated with Load Balancer Gateway (:8800) with full health checks and live telemetry.
"""

import argparse
import json
import logging
import os
import sys
import threading
import time
import urllib.parse
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from dotenv import load_dotenv

# Load environment
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import LibraryDB
from normalizer import normalize_title, title_to_slug
from ai_classifier import classify_batch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("crawler-service")

db = LibraryDB()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MissionControl/1.0"

_LOCK = threading.Lock()
_EXISTING_CACHE: Set[str] = set()
_RUNNING = True

# Real-time Telemetry & Metrics
_METRICS = {
    "steam_inserted": 0,
    "gog_inserted": 0,
    "epic_inserted": 0,
    "xbox_inserted": 0,
    "ai_classified": 0,
    "release_dates_healed": 0,
    "worker_restarts": 0,
    "start_time": time.time(),
}

_WORKER_STATUS = {
    "steam": {"alive": False, "last_heartbeat": None, "restarts": 0},
    "gog": {"alive": False, "last_heartbeat": None, "restarts": 0},
    "epic": {"alive": False, "last_heartbeat": None, "restarts": 0},
    "xbox": {"alive": False, "last_heartbeat": None, "restarts": 0},
    "ai_classifier": {"alive": False, "last_heartbeat": None, "restarts": 0},
    "healer": {"alive": False, "last_heartbeat": None, "restarts": 0},
}


def _get_existing_cache() -> Set[str]:
    global _EXISTING_CACHE
    with _LOCK:
        if not _EXISTING_CACHE:
            rows = db.execute("SELECT id, normalized_title FROM canonical_games;", fetch="all") or []
            _EXISTING_CACHE = {r["normalized_title"] for r in rows} | {r["id"] for r in rows}
        return set(_EXISTING_CACHE)


def _add_to_cache(slug: str, norm: str):
    global _EXISTING_CACHE
    with _LOCK:
        _EXISTING_CACHE.add(slug)
        _EXISTING_CACHE.add(norm)


def fetch_json(url: str, timeout: int = 12):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except Exception as e:
        logger.debug("Fetch error for %s: %s", url, e)
        return None


def _bulk_insert_games(games: List[Dict[str, Any]], store_name: str):
    inserted = 0
    for g in games:
        try:
            db.upsert_game(g)
            _add_to_cache(g["id"], g["normalized_title"])
            inserted += 1
        except Exception as e:
            logger.debug("Insert error: %s", e)
    if inserted > 0:
        key = f"{store_name.lower()}_inserted"
        if key in _METRICS:
            _METRICS[key] += inserted
        logger.info("[%s] Successfully inserted %d new games!", store_name, inserted)


# ── WORKER 1: STEAM INFINITE ENGINE ──────────────────────────────────────────
def _worker_steam():
    logger.info("Steam worker thread active.")
    while _RUNNING:
        try:
            _WORKER_STATUS["steam"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
            page = 0
            consecutive_empty = 0
            new_games = []

            while _RUNNING:
                _WORKER_STATUS["steam"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
                existing_set = _get_existing_cache()
                url = f"https://steamspy.com/api.php?request=all&page={page}"
                data = fetch_json(url, timeout=15)

                if not data or not isinstance(data, dict) or len(data) == 0:
                    consecutive_empty += 1
                    if consecutive_empty >= 3:
                        break
                    page += 1
                    time.sleep(1.0)
                    continue

                consecutive_empty = 0
                for appid, item in data.items():
                    name = item.get("name", "").strip()
                    if not name or name == "None":
                        continue

                    slug = title_to_slug(name)
                    norm = normalize_title(name)
                    if slug in existing_set or norm in existing_set:
                        continue

                    _add_to_cache(slug, norm)
                    new_games.append({
                        "id": slug,
                        "title": name,
                        "normalized_title": norm,
                        "developer": item.get("developer") if item.get("developer") != "None" else None,
                        "publisher": item.get("publisher") if item.get("publisher") != "None" else None,
                        "release_date": None,
                        "primary_genre": "Action",
                        "genres": ["Action"],
                        "tags": ["Steam", "PC"],
                        "features": [],
                        "platforms": ["Windows", "Linux"],
                        "launchers": ["Steam"],
                        "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                        "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
                        "summary": None,
                        "ai_classified": False,
                        "ai_confidence": 0.0,
                        "raw_tags": ["Steam", "PC"],
                        "metadata": json.dumps({"store": "steam", "store_app_id": str(appid)}),
                    })

                if len(new_games) >= 40:
                    _bulk_insert_games(new_games, "Steam")
                    new_games = []

                page += 1
                time.sleep(0.8)

            if new_games:
                _bulk_insert_games(new_games, "Steam")

            time.sleep(180)
        except Exception as exc:
            logger.error("Steam worker error: %s", exc)
            time.sleep(15)


# ── WORKER 2: GOG GALAXY INFINITE ENGINE ──────────────────────────────────────
def _worker_gog():
    logger.info("GOG worker thread active.")
    while _RUNNING:
        try:
            _WORKER_STATUS["gog"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
            page = 1
            new_games = []

            while _RUNNING:
                _WORKER_STATUS["gog"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
                existing_set = _get_existing_cache()
                url = f"https://catalog.gog.com/v1/catalog?limit=48&page={page}&order=desc:bestselling&productType=in:game"
                data = fetch_json(url, timeout=10)
                if not data or not isinstance(data, dict):
                    break

                products = data.get("products", [])
                if not products:
                    break

                for p in products:
                    title = p.get("title", "").strip()
                    if not title:
                        continue

                    slug = title_to_slug(title)
                    norm = normalize_title(title)
                    if slug in existing_set or norm in existing_set:
                        continue

                    _add_to_cache(slug, norm)
                    cover = p.get("coverVertical") or p.get("coverHorizontal")
                    genres = [g.get("name") for g in p.get("genres", []) if g.get("name")] or ["Action"]

                    new_games.append({
                        "id": slug,
                        "title": title,
                        "normalized_title": norm,
                        "developer": p.get("developers", [None])[0] if p.get("developers") else None,
                        "publisher": p.get("publishers", [None])[0] if p.get("publishers") else None,
                        "release_date": p.get("releaseDate"),
                        "primary_genre": genres[0],
                        "genres": genres,
                        "tags": ["GOG", "DRM-Free"] + genres,
                        "features": [],
                        "platforms": ["Windows", "Linux"],
                        "launchers": ["GOG Galaxy"],
                        "cover_url": cover,
                        "banner_url": p.get("coverHorizontal") or cover,
                        "summary": f"{title} available DRM-free on GOG Galaxy.",
                        "ai_classified": True,
                        "ai_confidence": 0.95,
                        "raw_tags": ["GOG", "DRM-Free"],
                        "metadata": json.dumps({"store": "gog", "store_app_id": str(p.get("id", ""))}),
                    })

                if len(new_games) >= 40:
                    _bulk_insert_games(new_games, "GOG")
                    new_games = []

                page += 1
                time.sleep(0.3)

            if new_games:
                _bulk_insert_games(new_games, "GOG")

            time.sleep(180)
        except Exception as exc:
            logger.error("GOG worker error: %s", exc)
            time.sleep(15)


# ── WORKER 3: EPIC GAMES INFINITE ENGINE ──────────────────────────────────────
def _worker_epic():
    logger.info("Epic Games worker thread active.")
    while _RUNNING:
        try:
            _WORKER_STATUS["epic"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
            existing_set = _get_existing_cache()
            epic_url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
            data = fetch_json(epic_url, timeout=12)
            new_games = []

            if data and isinstance(data, dict):
                elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
                for el in elements:
                    title = el.get("title", "").strip()
                    if not title:
                        continue

                    slug = title_to_slug(title)
                    norm = normalize_title(title)

                    if slug in existing_set or norm in existing_set:
                        db.execute(
                            """
                            UPDATE canonical_games
                            SET launchers = CASE 
                                WHEN NOT ('Epic Games' = ANY(launchers)) THEN array_append(launchers, 'Epic Games')
                                ELSE launchers
                            END,
                            updated_at = NOW()
                            WHERE id = %(id)s OR normalized_title = %(norm)s;
                            """,
                            {"id": slug, "norm": norm}
                        )
                        continue

                    _add_to_cache(slug, norm)
                    images = el.get("keyImages", [])
                    cover = None
                    for img in images:
                        if "tall" in img.get("type", "").lower() or "portrait" in img.get("type", "").lower():
                            cover = img.get("url")

                    cover = cover or (images[0].get("url") if images else None)

                    new_games.append({
                        "id": slug,
                        "title": title,
                        "normalized_title": norm,
                        "developer": el.get("seller", {}).get("name"),
                        "publisher": el.get("seller", {}).get("name"),
                        "release_date": el.get("effectiveDate", "")[:10] if el.get("effectiveDate") else None,
                        "primary_genre": "Action",
                        "genres": ["Action"],
                        "tags": ["Epic Games", "PC"],
                        "features": [],
                        "platforms": ["Windows", "Linux"],
                        "launchers": ["Epic Games"],
                        "cover_url": cover,
                        "banner_url": cover,
                        "summary": el.get("description") or f"{title} on Epic Games Store.",
                        "ai_classified": True,
                        "ai_confidence": 0.95,
                        "raw_tags": ["Epic Games"],
                        "metadata": json.dumps({"store": "epic", "store_app_id": el.get("id")}),
                    })

            if new_games:
                _bulk_insert_games(new_games, "Epic")

            time.sleep(120)
        except Exception as exc:
            logger.error("Epic worker error: %s", exc)
            time.sleep(15)


# ── WORKER 4: XBOX & GAME PASS INFINITE ENGINE ────────────────────────────────
def _worker_xbox():
    logger.info("Xbox worker thread active.")
    rawg_key = os.getenv("RAWG_API_KEY", "").strip()
    while _RUNNING:
        try:
            _WORKER_STATUS["xbox"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
            if not rawg_key:
                time.sleep(60)
                continue

            publishers = ["xbox-game-studios", "microsoft-studios", "bethesda-softworks"]
            new_games = []

            for pub in publishers:
                for page in range(1, 6):
                    existing_set = _get_existing_cache()
                    url = f"https://api.rawg.io/api/games?key={rawg_key}&publishers={pub}&page={page}&page_size=40"
                    data = fetch_json(url, timeout=10)
                    if not data or not isinstance(data, dict):
                        continue

                    for g in data.get("results", []):
                        title = g.get("name", "").strip()
                        if not title:
                            continue

                        slug = title_to_slug(title)
                        norm = normalize_title(title)

                        if slug in existing_set or norm in existing_set:
                            db.execute(
                                """
                                UPDATE canonical_games
                                SET launchers = CASE 
                                    WHEN NOT ('Xbox' = ANY(launchers)) THEN array_append(launchers, 'Xbox')
                                    ELSE launchers
                                END,
                                platforms = ARRAY['Windows', 'Linux', 'Xbox'],
                                updated_at = NOW()
                                WHERE id = %(id)s OR normalized_title = %(norm)s;
                                """,
                                {"id": slug, "norm": norm}
                            )
                            continue

                        _add_to_cache(slug, norm)
                        bg = g.get("background_image")
                        genres = [gen.get("name") for gen in g.get("genres", []) if gen.get("name")] or ["Action"]

                        new_games.append({
                            "id": slug,
                            "title": title,
                            "normalized_title": norm,
                            "developer": pub.replace("-", " ").title(),
                            "publisher": pub.replace("-", " ").title(),
                            "release_date": g.get("released"),
                            "primary_genre": genres[0],
                            "genres": genres,
                            "tags": ["Xbox", "PC Game Pass"] + genres,
                            "features": [],
                            "platforms": ["Windows", "Linux", "Xbox"],
                            "launchers": ["Xbox", "PC Game Pass"],
                            "cover_url": bg,
                            "banner_url": bg,
                            "summary": f"{title} available on Xbox & PC Game Pass.",
                            "ai_classified": True,
                            "ai_confidence": 0.95,
                            "raw_tags": ["Xbox", "PC Game Pass"],
                            "metadata": json.dumps({"store": "xbox", "store_app_id": str(g.get("id", ""))}),
                        })
                    time.sleep(0.3)

            if new_games:
                _bulk_insert_games(new_games, "Xbox")

            time.sleep(180)
        except Exception as exc:
            logger.error("Xbox worker error: %s", exc)
            time.sleep(15)


# ── WORKER 5: CONTINUOUS AI CLASSIFIER ENGINE ────────────────────────────────
def _worker_ai_classifier():
    logger.info("AI Classifier worker thread active.")
    while _RUNNING:
        try:
            _WORKER_STATUS["ai_classifier"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
            unclassified = db.get_unclassified_games(limit=20)
            if unclassified:
                logger.info("AI Classifier: Classifying batch of %d games...", len(unclassified))
                classify_batch(unclassified, db=db, delay_between=0.2)
                _METRICS["ai_classified"] += len(unclassified)
                time.sleep(0.5)
            else:
                time.sleep(10)
        except Exception as exc:
            logger.error("AI Classifier error: %s", exc)
            time.sleep(10)


# ── WORKER 6: AUTONOMOUS HEALER ENGINE ───────────────────────────────────────
def _worker_healer():
    logger.info("Autonomous Healer worker thread active.")
    while _RUNNING:
        try:
            _WORKER_STATUS["healer"]["last_heartbeat"] = time.strftime("%Y-%m-%d %H:%M:%S")
            null_dates = db.execute(
                """
                SELECT id, title, metadata
                FROM canonical_games
                WHERE release_date IS NULL OR release_date = '' OR release_date = 'None'
                LIMIT 15;
                """,
                fetch="all"
            ) or []

            for row in null_dates:
                meta = row.get("metadata") or {}
                if isinstance(meta, str):
                    try: meta = json.loads(meta)
                    except Exception: meta = {}
                
                appid = meta.get("store_app_id") or meta.get("appid")
                if appid and str(appid).isdigit():
                    s_url = f"https://store.steampowered.com/api/appdetails?appids={appid}&filters=release_date&l=english"
                    s_data = fetch_json(s_url, timeout=5)
                    if s_data and s_data.get(str(appid), {}).get("success"):
                        r_date = s_data[str(appid)].get("data", {}).get("release_date", {}).get("date")
                        if r_date and str(r_date).strip() and str(r_date).strip() != "None":
                            db.execute(
                                "UPDATE canonical_games SET release_date = %(rel)s, updated_at = NOW() WHERE id = %(id)s;",
                                {"rel": str(r_date).strip(), "id": row["id"]}
                            )
                            _METRICS["release_dates_healed"] += 1
                time.sleep(0.3)

            time.sleep(15)
        except Exception as exc:
            logger.error("Healer error: %s", exc)
            time.sleep(15)


# ── WATCHDOG & SUPERVISOR (Auto-Revives Any Failed Worker) ───────────────────
_WORKER_TARGETS = {
    "steam": _worker_steam,
    "gog": _worker_gog,
    "epic": _worker_epic,
    "xbox": _worker_xbox,
    "ai_classifier": _worker_ai_classifier,
    "healer": _worker_healer,
}
_ACTIVE_THREADS: Dict[str, threading.Thread] = {}


def _supervisor_loop():
    logger.info("Supervisor Watchdog active. Monitoring 6 worker threads...")
    while _RUNNING:
        for name, target_fn in _WORKER_TARGETS.items():
            t = _ACTIVE_THREADS.get(name)
            if t is None or not t.is_alive():
                logger.warning("Supervisor: Worker '%s' is dead or not started. Reviving now...", name)
                new_t = threading.Thread(target=target_fn, name=f"{name.title()}WorkerThread", daemon=True)
                new_t.start()
                _ACTIVE_THREADS[name] = new_t
                _WORKER_STATUS[name]["alive"] = True
                _WORKER_STATUS[name]["restarts"] += 1
                _METRICS["worker_restarts"] += 1
            else:
                _WORKER_STATUS[name]["alive"] = True
        time.sleep(5)


# ── FastAPI App Lifecycle ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Supervisor thread
    sup_thread = threading.Thread(target=_supervisor_loop, name="SupervisorThread", daemon=True)
    sup_thread.start()
    yield
    global _RUNNING
    _RUNNING = False


app = FastAPI(
    title="Mission Control — High-Availability Crawler Microservice",
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


@app.get("/health")
async def health():
    uptime_sec = round(time.time() - _METRICS["start_time"], 1)
    all_alive = all(s["alive"] for s in _WORKER_STATUS.values())
    return {
        "status": "healthy" if all_alive else "degraded",
        "service": "crawler_service",
        "port": 8851,
        "uptime_seconds": uptime_sec,
        "db_connected": db.available,
        "workers": _WORKER_STATUS,
        "metrics": _METRICS,
    }


@app.get("/api/crawler/stats")
async def get_crawler_stats():
    if not db.available:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    rows = db.execute("SELECT launchers, COUNT(*) FROM canonical_games GROUP BY launchers ORDER BY count DESC;", fetch="all") or []
    total = sum(r["count"] for r in rows)
    return {
        "total_canonical_games": total,
        "launcher_distribution": [{"launchers": r["launchers"], "count": r["count"]} for r in rows],
        "metrics": _METRICS,
        "worker_health": _WORKER_STATUS,
    }


@app.post("/api/crawler/restart-worker/{worker_name}")
async def restart_worker(worker_name: str):
    if worker_name not in _WORKER_TARGETS:
        raise HTTPException(status_code=400, detail=f"Invalid worker name. Choose from {list(_WORKER_TARGETS.keys())}")
    
    target_fn = _WORKER_TARGETS[worker_name]
    new_t = threading.Thread(target=target_fn, name=f"{worker_name.title()}WorkerThread", daemon=True)
    new_t.start()
    _ACTIVE_THREADS[worker_name] = new_t
    _WORKER_STATUS[worker_name]["alive"] = True
    _WORKER_STATUS[worker_name]["restarts"] += 1
    return {"status": "restarted", "worker": worker_name}


def main():
    parser = argparse.ArgumentParser(description="Crawler Microservice")
    parser.add_argument("--port", type=int, default=8851, help="Port to run crawler service on")
    args = parser.parse_args()

    import uvicorn
    uvicorn.run("crawler_service:app", host="0.0.0.0", port=args.port, reload=False)


if __name__ == "__main__":
    main()
