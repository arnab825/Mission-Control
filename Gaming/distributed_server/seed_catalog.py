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

# Load environment configuration
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=True)
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
except ImportError as e:
    logger.error("Failed to import database modules: %s. Ensure you are running this from the distributed_server directory.", e)
    sys.exit(1)


def fetch_top_games(page: int = 1) -> dict:
    """Fetch the top 1,000 games by popularity/owners from SteamSpy."""
    url = f"https://steamspy.com/api.php?request=all&page={page}"
    logger.info("Fetching top games from SteamSpy (page %d)...", page)
    
    req = urllib.request.Request(
        url, 
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            return json.loads(response.read().decode("utf-8", errors="ignore"))
    except Exception as exc:
        logger.error("Failed to fetch games list: %s", exc)
        return {}


def main():
    # 1. Connect to Database
    db = LibraryDB()
    if not db.available:
        logger.error("Database connection failed. Ensure DATABASE_URL is set in your .env file.")
        sys.exit(1)

    # 2. Fetch the top 1,000 games dataset
    games_dict = fetch_top_games(page=1)
    if not games_dict:
        logger.error("No games retrieved. Seeding cancelled.")
        sys.exit(1)

    logger.info("Retrieved %d games. Loading existing catalog to prevent duplicates...", len(games_dict))

    # 3. Load existing game titles/ids for deduplication
    try:
        existing_rows = db.execute("SELECT id, normalized_title FROM canonical_games", fetch="all") or []
        existing_set = {r["normalized_title"] for r in existing_rows} | {r["id"] for r in existing_rows}
    except Exception as exc:
        logger.error("Failed to load existing catalog: %s", exc)
        sys.exit(1)

    logger.info("Found %d existing games in database.", len(existing_set))

    # 4. Ingest new games
    inserted = 0
    skipped = 0

    for appid_str, g in games_dict.items():
        title = g.get("name", "").strip()
        if not title:
            continue

        slug = title_to_slug(title)
        norm = normalize_title(title)

        # Skip if already in catalog
        if slug in existing_set or norm in existing_set:
            skipped += 1
            continue

        # Build official Steam asset links
        cover_url = f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid_str}/header.jpg"
        banner_url = f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid_str}/library_hero.jpg"

        game_data = {
            "id":               slug,
            "title":            title,
            "normalized_title": norm,
            "developer":        g.get("developer"),
            "publisher":        g.get("publisher"),
            "release_date":     None,  # Will be enriched/classified later
            "primary_genre":    "Action",  # Temporary fallback primary genre
            "genres":           ["Action"],
            "tags":             ["Steam"],
            "features":         [],
            "platforms":        ["Windows"],
            "cover_url":        cover_url,
            "banner_url":       banner_url,
            "summary":          f"An acclaimed game developed by {g.get('developer', 'Unknown')} and published by {g.get('publisher', 'Unknown')}.",
            "ai_classified":    False,  # Enriched progressively by server background worker
            "ai_confidence":    0.0,
            "raw_tags":         ["Steam"],
            "metadata":         json.dumps({
                "appid": appid_str,
                "source": "steamspy",
                "launchers": ["Steam"]
            })
        }

        try:
            db.upsert_game(game_data)
            inserted += 1
            existing_set.add(norm)
            existing_set.add(slug)
            
            if inserted % 100 == 0:
                logger.info("Ingested %d games...", inserted)
        except Exception as exc:
            logger.debug("Failed to upsert %s: %s", title, exc)

    logger.info("Seeding complete: Ingested %d new games. Skipped %d existing games.", inserted, skipped)
    logger.info("The server's background worker will progressively refine genres and tags for these games using Gemini Flash.")


if __name__ == "__main__":
    main()
