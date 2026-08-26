#!/usr/bin/env python3
"""
Mission Control — Dedicated Multi-Launcher Enrichment & Store Healer Microservice
launcher_enricher_service.py: Autonomous background service dedicated to cross-referencing,
enriching, and updating launcher availability (Steam, Epic Games, GOG Galaxy, Xbox / PC Game Pass)
across all games in canonical_games:
  1. Identifies games with single-store tags and cross-references them against Epic, GOG, and Xbox.
  2. Detects store exclusives (e.g. Alan Wake 2 -> Epic Games Store).
  3. Tags multi-store PC games (e.g. Cyberpunk, Witcher, Control -> Steam + Epic + GOG).
  4. Runs independently on port :8841 without blocking catalog search.
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

# Load local environment if available (without overriding production cloud variables)
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import LibraryDB
from normalizer import normalize_title, title_to_slug

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [LAUNCHER-ENRICHER] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("launcher-enricher")

db = LibraryDB()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MissionControl/1.0"

_RUNNING = True
_PROCESSED_GAME_IDS: Set[str] = set()
_STATS = {
    "total_checked": 0,
    "total_updated": 0,
    "gog_added": 0,
    "epic_added": 0,
    "xbox_added": 0,
    "last_cycle_time": None,
}

# In-Memory Cache for fast O(1) multi-store matching
_GOG_TITLES_CACHE: Set[str] = set()
_EPIC_TITLES_CACHE: Set[str] = set()
_XBOX_TITLES_CACHE: Set[str] = set()


def _fetch_json(url: str, timeout: int = 8):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except Exception as e:
        logger.debug("Fetch error for %s: %s", url, e)
        return None


def _load_store_catalogs_into_memory():
    """Load latest popular catalogs from GOG, Epic, and Xbox for rapid cross-referencing."""
    global _GOG_TITLES_CACHE, _EPIC_TITLES_CACHE, _XBOX_TITLES_CACHE
    logger.info("Building in-memory store matching index from GOG, Epic, and Xbox...")

    # 1. GOG Index (Top 500+ Games)
    for page in range(1, 12):
        gog_url = f"https://catalog.gog.com/v1/catalog?limit=48&page={page}&order=desc:bestselling&productType=in:game"
        data = _fetch_json(gog_url)
        if data and isinstance(data, dict):
            for p in data.get("products", []):
                t = p.get("title")
                if t:
                    _GOG_TITLES_CACHE.add(normalize_title(t))
                    _GOG_TITLES_CACHE.add(title_to_slug(t))
        time.sleep(0.1)
    logger.info("Indexed %d GOG Galaxy titles.", len(_GOG_TITLES_CACHE))

    # 2. Epic Index
    epic_url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
    data = _fetch_json(epic_url)
    if data and isinstance(data, dict):
        elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
        for el in elements:
            t = el.get("title")
            if t:
                _EPIC_TITLES_CACHE.add(normalize_title(t))
                _EPIC_TITLES_CACHE.add(title_to_slug(t))
    logger.info("Indexed %d Epic Games Store titles.", len(_EPIC_TITLES_CACHE))

    # 3. Famous Xbox / Game Pass titles
    famous_xbox = [
        "halo infinite", "halo the master chief collection", "forza horizon 5", "forza horizon 4",
        "forza motorsport", "gears 5", "sea of thieves", "starfield", "avowed",
        "senua s saga hellblade ii", "grounded", "hi fi rush", "pentiment", "psychonauts 2",
        "microsoft flight simulator", "age of empires iv", "fable", "state of decay 2"
    ]
    for fx in famous_xbox:
        _XBOX_TITLES_CACHE.add(normalize_title(fx))
        _XBOX_TITLES_CACHE.add(title_to_slug(fx))
    logger.info("Indexed %d Xbox titles.", len(_XBOX_TITLES_CACHE))


def query_rawg_stores_for_game(title: str) -> List[str]:
    """Query RAWG for official distribution stores of a title."""
    rawg_key = os.getenv("RAWG_API_KEY", "").strip()
    if not rawg_key:
        return []

    try:
        params = urllib.parse.urlencode({"key": rawg_key, "search": title, "page_size": 1})
        url = f"https://api.rawg.io/api/games?{params}"
        data = _fetch_json(url, timeout=4)
        if data and isinstance(data, dict) and data.get("results"):
            g = data["results"][0]
            stores = [st.get("store", {}).get("name", "") for st in g.get("stores", []) if st.get("store")]
            launchers = []
            for s in stores:
                s_low = s.lower()
                if "steam" in s_low: launchers.append("Steam")
                elif "epic" in s_low: launchers.append("Epic Games")
                elif "gog" in s_low: launchers.append("GOG Galaxy")
                elif "xbox" in s_low or "microsoft" in s_low: launchers.append("Xbox")
            return launchers
    except Exception as e:
        logger.debug("RAWG store query error: %s", e)
    return []


def enrich_game_launchers(game: Dict[str, Any]) -> Optional[List[str]]:
    """Determine complete launchers array for a game."""
    title = game.get("title", "")
    norm = game.get("normalized_title") or normalize_title(title)
    slug = game.get("id") or title_to_slug(title)
    meta = game.get("metadata") or {}
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}
    existing_launchers = set(meta.get("launchers") or game.get("launchers") or ["Steam"])
    original_set = set(existing_launchers)

    # 1. Check GOG index
    if norm in _GOG_TITLES_CACHE or slug in _GOG_TITLES_CACHE:
        existing_launchers.add("GOG Galaxy")
        _STATS["gog_added"] += 1

    # 2. Check Epic index
    if norm in _EPIC_TITLES_CACHE or slug in _EPIC_TITLES_CACHE:
        existing_launchers.add("Epic Games")
        _STATS["epic_added"] += 1

    # 3. Check Xbox index
    if norm in _XBOX_TITLES_CACHE or slug in _XBOX_TITLES_CACHE:
        existing_launchers.add("Xbox")
        existing_launchers.add("PC Game Pass")
        _STATS["xbox_added"] += 1

    # 4. Handle Known Exclusives
    if "alan wake 2" in norm or "fortnite" in norm or "fall guys" in norm:
        existing_launchers = {"Epic Games"}
    elif "half life alyx" in norm or "portal 2" in norm:
        existing_launchers = {"Steam"}

    if existing_launchers != original_set:
        return sorted(list(existing_launchers))
    return None



def _launcher_healer_loop():
    """Background loop that continuously checks and heals launcher tags."""
    global _RUNNING
    logger.info("Launcher Enricher background loop started.")
    _load_store_catalogs_into_memory()

    idle_sleep = 5

    while _RUNNING:
        try:
            if not db.available:
                time.sleep(5)
                continue

            # Fetch batch of games to inspect and enrich launcher tags
            rows = db.execute(
                """
                SELECT id, title, normalized_title, metadata, raw_tags, tags
                FROM canonical_games
                ORDER BY updated_at ASC
                LIMIT 30;
                """,
                fetch="all"
            ) or []

            unprocessed_rows = [r for r in rows if r["id"] not in _PROCESSED_GAME_IDS]

            if not unprocessed_rows:
                logger.info("All games have verified launcher tags. Idle sleep %ds...", idle_sleep)
                time.sleep(idle_sleep)
                idle_sleep = min(idle_sleep * 2, 60)
                continue

            idle_sleep = 5
            batch_updated = 0

            for game in unprocessed_rows:
                _PROCESSED_GAME_IDS.add(game["id"])
                _STATS["total_checked"] += 1

                new_launchers = enrich_game_launchers(game)
                if new_launchers:
                    db.execute(
                        """
                        UPDATE canonical_games
                        SET metadata = metadata || %(patch)s::jsonb,
                            updated_at = NOW()
                        WHERE id = %(id)s;
                        """,
                        {
                            "patch": json.dumps({"launchers": new_launchers}),
                            "id": game["id"],
                        }
                    )
                    batch_updated += 1
                    _STATS["total_updated"] += 1
                    logger.info("Enriched %s -> Launchers: %s", game["title"], new_launchers)

            _STATS["last_cycle_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            time.sleep(1)

        except Exception as exc:
            logger.error("Launcher healer loop error: %s", exc)
            time.sleep(5)


# ── FastAPI App Lifecycle ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=_launcher_healer_loop, daemon=True, name="LauncherHealerThread")
    t.start()
    yield
    global _RUNNING
    _RUNNING = False


app = FastAPI(
    title="Mission Control — Multi-Launcher Enricher Service",
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
    return {
        "status": "online",
        "service": "launcher_enricher",
        "port": 8841,
        "db_connected": db.available,
        "stats": _STATS,
    }


@app.get("/api/launchers/stats")
async def get_launcher_stats():
    """Returns database-wide distribution of launchers."""
    if not db.available:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    rows = db.execute("SELECT metadata->'launchers' AS launchers, COUNT(*) FROM canonical_games GROUP BY metadata->'launchers' ORDER BY count DESC LIMIT 50;", fetch="all") or []
    total = sum(r["count"] for r in rows)
    return {
        "total_canonical_games": total,
        "launcher_distribution": [{"launchers": r["launchers"], "count": r["count"]} for r in rows],
        "healer_stats": _STATS,
    }


def main():
    parser = argparse.ArgumentParser(description="Launcher Enricher Service")
    parser.add_argument("--port", type=int, default=8841, help="Port to run launcher enricher service on")
    args = parser.parse_args()

    import uvicorn
    uvicorn.run("launcher_enricher_service:app", host="0.0.0.0", port=args.port, reload=False)


if __name__ == "__main__":
    main()
