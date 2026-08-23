#!/usr/bin/env python3
"""
Mission Control — Distributed Library Server
seed_catalog.py: Seeds the canonical games catalog with a high-quality dataset
of the top 1,000 video games of all time sourced from renowned launchers.
"""

import os
import sys
import json
import logging
import urllib.request
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv

# Load environment configuration (override=False to preserve cloud env vars)
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        break

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("catalog-seeder")

# Add parent directory to sys.path to resolve db, normalizer etc.
sys.path.insert(0, str(Path(__file__).parent))

try:
    from db import LibraryDB
    from normalizer import normalize_title, title_to_slug, deduplicate_tags
    from game_harvester import harvest_top_games_from_launchers
except ImportError as e:
    logger.error("Failed to import database modules: %s. Ensure you are running this from the distributed_server directory.", e)
    sys.exit(1)


def main():
    # 1. Connect to Database
    db = LibraryDB()
    if not db.available:
        logger.error("Database connection failed. Ensure DATABASE_URL is set in your .env file.")
        sys.exit(1)

    # 2. Harvest top games across Steam, Epic Games, Xbox Game Pass, and GOG Galaxy
    logger.info("Harvesting top games across Steam, Epic Games Store, Xbox Game Pass, and GOG Galaxy...")
    games_list = harvest_top_games_from_launchers(limit_per_launcher=100)
    if not games_list:
        logger.error("No games retrieved. Seeding cancelled.")
        sys.exit(1)

    logger.info("Retrieved %d unique games from launchers. Loading existing catalog to prevent duplicates...", len(games_list))

    # 3. Load existing game titles/ids for deduplication
    try:
        existing_rows = db.execute("SELECT id, normalized_title FROM canonical_games", fetch="all") or []
        existing_set = {r["normalized_title"] for r in existing_rows} | {r["id"] for r in existing_rows}
    except Exception as exc:
        logger.error("Failed to load existing catalog: %s", exc)
        sys.exit(1)

    logger.info("Found %d existing games in database.", len(existing_set))

    # 4. Ingest new games from all platforms
    inserted = 0
    skipped = 0

    for g in games_list:
        title = g.get("title", "").strip()
        if not title:
            continue

        slug = g.get("slug") or title_to_slug(title)
        norm = normalize_title(title)

        # Skip if already in catalog
        if slug in existing_set or norm in existing_set:
            skipped += 1
            continue

        game_data = {
            "id":               slug,
            "title":            title,
            "normalized_title": norm,
            "developer":        g.get("developer"),
            "publisher":        g.get("publisher"),
            "release_date":     g.get("release_date"),
            "primary_genre":    (g.get("genres") or ["Action"])[0],
            "genres":           g.get("genres") or ["Action"],
            "tags":             g.get("raw_tags") or [g.get("store", "Steam").capitalize()],
            "features":         g.get("features") or [],
            "platforms":        ["Windows"],
            "cover_url":        g.get("cover_url"),
            "banner_url":       g.get("banner_url") or g.get("cover_url"),
            "summary":          g.get("summary") or f"{title} available on PC.",
            "ai_classified":    False,  # Enriched progressively by server background worker
            "ai_confidence":    0.0,
            "raw_tags":         g.get("raw_tags") or [g.get("store", "Steam").capitalize()],
            "metadata":         json.dumps({
                "source": g.get("store", "multi"),
                "storeAppId": g.get("store_app_id"),
                "launchers": g.get("launchers", [g.get("store", "Steam").capitalize()]),
            })
        }

        try:
            db.upsert_game(game_data)
            inserted += 1
            existing_set.add(norm)
            existing_set.add(slug)
            
            if inserted % 20 == 0:
                logger.info("Ingested %d games...", inserted)
        except Exception as exc:
            logger.debug("Failed to upsert %s: %s", title, exc)

    logger.info("Seeding complete: Ingested %d new games. Skipped %d existing games.", inserted, skipped)
    logger.info("The server's background workers will refine genres and tags using balanced multi-model AI.")


if __name__ == "__main__":
    main()
