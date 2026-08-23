#!/usr/bin/env python3
"""
Mission Control — Dedicated AI Metadata Enrichment & Healer Microservice
ai_enricher_service.py: Autonomous background AI service dedicated to fixing,
enriching, and healing incomplete game records in canonical_games:
  1. Detects empty features: [] and generates technical gameplay & hardware features.
  2. Detects empty or placeholder summaries and writes rich, authentic descriptions.
  3. Fills in missing release dates and platform details from Steam / web APIs.
  4. Runs independently so live search and discovery servers remain blazing fast.
"""

import argparse
import json
import logging
import os
import sys
import threading
import time
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
from normalizer import deduplicate_tags, normalize_title
from ai_classifier import classify_game
from game_harvester import SteamHarvester

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ai-enricher] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ai-enricher")

db = LibraryDB()

# ── AI Summary & Feature Generator ───────────────────────────────────────────

def generate_ai_features_and_summary(
    title: str,
    developer: Optional[str] = None,
    publisher: Optional[str] = None,
    primary_genre: Optional[str] = None,
    tags: Optional[List[str]] = None,
    existing_summary: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Calls the robust multi-provider AI engine (Gemini -> NVIDIA NIM -> Groq -> OpenRouter)
    to generate rich features, engaging technical summaries, and release dates.
    """
    res = classify_game(
        title=title,
        developer=developer,
        publisher=publisher,
        raw_tags=tags or [primary_genre or "Action"],
        summary=existing_summary if existing_summary and existing_summary != "EMPTY" else None,
    )
    if res:
        return {
            "summary": res.get("summary"),
            "features": res.get("features", []),
            "release_date": res.get("release_date"),
            "primary_genre": res.get("primary_genre"),
            "genres": res.get("genres", []),
            "tags": res.get("tags", []),
            "confidence": res.get("confidence", 0.9),
            "provider": res.get("provider", "gemini"),
            "model": res.get("model", "gemini-flash-lite-latest"),
        }
    return None


# ── Continuous Healer Background Worker ──────────────────────────────────────

_HEALER_INTERVAL = 15  # seconds
_RUN_HEALER = True

def _autonomous_healer_loop():
    """
    Dedicated background worker that heals and completes all games in canonical_games.
    """
    time.sleep(3)
    logger.info("AI Healer Service: Active and monitoring canonical_games...")
    
    while _RUN_HEALER:
        try:
            if db.available:
                # Find games with empty features, missing/placeholder summary, or empty release_date
                sql = """
                    SELECT id, title, developer, publisher, primary_genre, tags, summary, features, release_date, metadata
                    FROM canonical_games
                    WHERE features = '{}'
                       OR features IS NULL
                       OR summary IS NULL
                       OR summary = ''
                       OR summary = 'EMPTY'
                       OR summary LIKE 'An acclaimed game developed by%%'
                       OR release_date IS NULL
                       OR release_date = ''
                    ORDER BY updated_at ASC
                    LIMIT 8;
                """
                batch = db.execute(sql, fetch="all") or []
                if batch:
                    logger.info("AI Healer: Found %d games needing metadata repair. Enriching...", len(batch))
                    for g in batch:
                        game_id = g["id"]
                        title = g["title"]
                        dev = g.get("developer")
                        genre = g.get("primary_genre")
                        tags = g.get("tags") or []
                        
                        # 1. Try store details first if steam appid is present
                        meta = g.get("metadata") or {}
                        if isinstance(meta, str):
                            try:
                                meta = json.loads(meta)
                            except Exception:
                                meta = {}
                        
                        steam_appid = meta.get("appid") or meta.get("store_app_id")
                        steam_details = SteamHarvester.get_details(str(steam_appid)) if steam_appid else None
                        
                        # 2. Call AI LLM for rich features and authentic technical summary
                        ai_data = generate_ai_features_and_summary(
                            title=title,
                            developer=dev or (steam_details.get("developer") if steam_details else None),
                            primary_genre=genre,
                            tags=tags,
                            existing_summary=g.get("summary"),
                        )
                        
                        features = (ai_data.get("features") if ai_data else None) or (steam_details.get("genres") if steam_details else None) or [genre or "Action", "Singleplayer", "Controller Support"]
                        summary = (ai_data.get("summary") if ai_data else None) or (steam_details.get("summary") if steam_details else None)
                        release_date = (ai_data.get("release_date") if ai_data else None) or (steam_details.get("release_date") if steam_details else None)
                        
                        # Save repaired record
                        db.enrich_game_metadata(
                            game_id=game_id,
                            summary=summary,
                            features=features,
                            release_date=release_date,
                        )
                        logger.info("AI Healer: Successfully enriched & fixed '%s' (%s)", title, game_id)
                        time.sleep(0.5)
        except Exception as exc:
            logger.error("AI Healer loop error: %s", exc)
        
        time.sleep(_HEALER_INTERVAL)


# ── FastAPI Endpoints ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=_autonomous_healer_loop, daemon=True, name="AutonomousAIHealer").start()
    yield

app = FastAPI(
    title="Mission Control — Dedicated AI Metadata Enrichment & Healer Service",
    description="Autonomous microservice for deep game analysis, feature extraction, and metadata healing.",
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
        "service": "ai_enricher_healer",
        "status": "online",
        "db": db.available,
        "pid": os.getpid(),
    }

@app.post("/api/enrich/repair-batch")
async def repair_batch(limit: int = Query(10, ge=1, le=50)):
    """Manually trigger an immediate high-priority repair batch."""
    if not db.available:
        raise HTTPException(status_code=503, detail="Database not available.")
    
    sql = """
        SELECT id, title, developer, primary_genre, tags, summary, features, release_date, metadata
        FROM canonical_games
        WHERE features = '{}'
           OR summary IS NULL
           OR summary = 'EMPTY'
           OR summary LIKE 'An acclaimed game developed by%%'
        LIMIT %(limit)s;
    """
    games = db.execute(sql, {"limit": limit}, fetch="all") or []
    fixed = []
    
    for g in games:
        ai_data = generate_ai_features_and_summary(
            title=g["title"],
            developer=g.get("developer"),
            primary_genre=g.get("primary_genre"),
            tags=g.get("tags") or [],
        )
        if ai_data:
            db.enrich_game_metadata(
                game_id=g["id"],
                summary=ai_data.get("summary"),
                features=ai_data.get("features"),
                release_date=ai_data.get("release_date"),
            )
            fixed.append({"id": g["id"], "title": g["title"], "features": ai_data.get("features")})
    
    return {"repaired_count": len(fixed), "games": fixed}


def main():
    parser = argparse.ArgumentParser(description="Mission Control Dedicated AI Healer Service")
    parser.add_argument("--port", type=int, default=8831, help="Port to run on")
    args = parser.parse_args()
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")


if __name__ == "__main__":
    main()
