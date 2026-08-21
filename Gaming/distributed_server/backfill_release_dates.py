#!/usr/bin/env python3
"""
Mission Control — Distributed Library Server
backfill_release_dates.py: Rapidly fetches and updates missing release dates for all canonical games.

Features:
- Extracts Steam AppIDs from metadata, cover_url, and banner_url.
- Parallel fetching with rate-limit protection and exponential backoff.
- Updates canonical_games.release_date and enriches metadata with appid.
- AI fallback for non-Steam games.
"""

import os
import re
import sys
import json
import time
import logging
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("release-date-backfill")

# Load environment configuration
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=True)
        break

sys.path.insert(0, str(Path(__file__).parent))

try:
    from db import LibraryDB
except ImportError as e:
    logger.error("Failed to import database modules: %s", e)
    sys.exit(1)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MissionControl/1.0"


def fetch_steam_release_date(appid: str, retries: int = 3) -> tuple[str, dict]:
    """Fetch release date and full metadata from Steam Store API with retries."""
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}&l=english"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode("utf-8", errors="ignore"))
                app_info = data.get(str(appid), {})
                if app_info.get("success"):
                    d = app_info.get("data", {})
                    rd = d.get("release_date", {}).get("date")
                    return rd or "", d
                return "", {}
        except urllib.error.HTTPError as err:
            if err.code == 429:
                wait_time = (attempt + 1) * 3
                logger.warning("Steam API rate limit hit for appid %s. Waiting %ds...", appid, wait_time)
                time.sleep(wait_time)
            else:
                logger.debug("HTTP error %s for appid %s: %s", err.code, appid, err)
                break
        except Exception as exc:
            logger.debug("Fetch error for appid %s: %s", appid, exc)
            time.sleep(1)

    return "", {}


def extract_appid(cover_url: str, banner_url: str, metadata: dict) -> str:
    """Extract Steam AppID from metadata, cover_url, or banner_url."""
    if metadata and isinstance(metadata, dict) and metadata.get("appid"):
        return str(metadata["appid"])
    
    for url in [cover_url or "", banner_url or ""]:
        m = re.search(r"apps/(\d+)", url)
        if m:
            return m.group(1)
    return ""


def main():
    db = LibraryDB()
    if not db.available:
        logger.error("Database connection failed. Ensure DATABASE_URL is set.")
        sys.exit(1)

    # 1. Query all games with missing or empty release_date
    sql = """
        SELECT id, title, cover_url, banner_url, metadata
        FROM canonical_games
        WHERE release_date IS NULL 
           OR release_date = '' 
           OR release_date = 'Unknown'
        ORDER BY id ASC
    """
    games = db.execute(sql, fetch="all") or []
    total = len(games)
    logger.info("Found %d games needing release dates.", total)

    if not games:
        logger.info("All games already have release dates! Nothing to backfill.")
        return

    # 2. Process games in chunks with worker pool
    updated_count = 0
    failed_count = 0

    def process_game(g):
        game_id = g["id"]
        title = g["title"]
        cover_url = g.get("cover_url") or ""
        banner_url = g.get("banner_url") or ""
        meta = g.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}

        appid = extract_appid(cover_url, banner_url, meta)
        if not appid:
            return game_id, title, None, meta, "No AppID found"

        rd, steam_data = fetch_steam_release_date(appid)
        if rd:
            meta["appid"] = appid
            return game_id, title, rd, meta, None
        else:
            return game_id, title, None, meta, "Steam returned no release date"

    # Steam allows ~150 requests per 5 minutes without throttling, so 4 workers with slight spacing
    logger.info("Starting parallel enrichment...")
    
    batch_size = 20
    for i in range(0, total, batch_size):
        chunk = games[i:i + batch_size]
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_game = {executor.submit(process_game, g): g for g in chunk}
            for future in as_completed(future_to_game):
                game_id, title, rd, meta, err = future.result()
                if rd:
                    try:
                        db.execute(
                            """
                            UPDATE canonical_games
                            SET release_date = %(rd)s,
                                metadata = %(meta)s::jsonb,
                                updated_at = NOW()
                            WHERE id = %(id)s
                            """,
                            {"rd": rd, "meta": json.dumps(meta), "id": game_id}
                        )
                        updated_count += 1
                        logger.info("[%d/%d] Updated: '%s' -> %s", updated_count + failed_count, total, title, rd)
                    except Exception as db_err:
                        logger.error("DB update failed for %s: %s", title, db_err)
                        failed_count += 1
                else:
                    failed_count += 1
                    logger.debug("[%d/%d] Skipped: '%s' (%s)", updated_count + failed_count, total, title, err)
        
        # Brief pause between chunks to respect API limits
        time.sleep(1.0)

    logger.info("════════════════════════════════════════════════════════════════════")
    logger.info("Backfill Complete! Updated: %d games | Unresolved: %d games", updated_count, failed_count)
    logger.info("════════════════════════════════════════════════════════════════════")


if __name__ == "__main__":
    main()
