#!/usr/bin/env python3
"""
heal_release_dates.py:
High-speed autonomous healer for NULL/missing release_date fields in canonical_games.
Fetches official release dates across:
  1. Steam Store API (https://store.steampowered.com/api/appdetails?appids={appid}&filters=release_date)
  2. GOG Galaxy Catalog API
  3. RAWG / Web fallback
"""

import json
import logging
import os
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

from db import LibraryDB

logging.basicConfig(level=logging.INFO, format="%(asctime)s [RELEASE-DATE-HEALER] %(message)s")
logger = logging.getLogger("release-date-healer")

db = LibraryDB()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MissionControl/1.0"


def fetch_json(url: str, timeout: int = 6):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except Exception:
        return None


def fetch_steam_release_date(appid: str) -> Optional[str]:
    """Fetch official release date from Steam store API."""
    if not appid or not str(appid).isdigit():
        return None
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}&filters=release_date&l=english"
    data = fetch_json(url, timeout=5)
    if data and isinstance(data, dict) and data.get(str(appid), {}).get("success"):
        r_info = data[str(appid)].get("data", {}).get("release_date", {})
        date_str = r_info.get("date")
        if date_str and str(date_str).strip() and str(date_str).strip() != "None":
            return str(date_str).strip()
    return None


def fetch_rawg_release_date(title: str) -> Optional[str]:
    """Fetch official release date from RAWG."""
    key = os.getenv("RAWG_API_KEY", "").strip()
    if not key:
        return None
    params = urllib.parse.urlencode({"key": key, "search": title, "page_size": 1})
    url = f"https://api.rawg.io/api/games?{params}"
    data = fetch_json(url, timeout=4)
    if data and isinstance(data, dict) and data.get("results"):
        rel = data["results"][0].get("released")
        if rel and str(rel).strip() != "None":
            return str(rel).strip()
    return None


def heal_single_game(game: Dict[str, Any]) -> Tuple[str, Optional[str]]:
    game_id = game["id"]
    title = game.get("title", "")
    metadata = game.get("metadata") or {}
    if isinstance(metadata, str):
        try: metadata = json.loads(metadata)
        except Exception: metadata = {}
    
    appid = metadata.get("store_app_id")
    
    # 1. Try Steam first if appid exists
    rel_date = None
    if appid:
        rel_date = fetch_steam_release_date(str(appid))
    
    # 2. Fallback to RAWG
    if not rel_date:
        rel_date = fetch_rawg_release_date(title)

    return game_id, rel_date


def main():
    if not db.available:
        logger.error("Database connection unavailable.")
        sys.exit(1)

    logger.info("Starting automated Release Date Healing across canonical_games...")
    
    # Fetch all games with missing release_date
    null_rows = db.execute(
        """
        SELECT id, title, metadata
        FROM canonical_games
        WHERE release_date IS NULL OR release_date = '' OR release_date = 'None' OR release_date = 'Unknown'
        ORDER BY created_at DESC;
        """,
        fetch="all"
    ) or []

    logger.info("Found %d games needing release date healing.", len(null_rows))
    if not null_rows:
        logger.info("All games have complete release dates! 100%% healthy.")
        return

    healed_count = 0
    chunk_size = 30

    for i in range(0, len(null_rows), chunk_size):
        chunk = null_rows[i:i + chunk_size]
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_game = {executor.submit(heal_single_game, g): g for g in chunk}
            for future in as_completed(future_to_game):
                try:
                    game_id, rel_date = future.result()
                    if rel_date:
                        db.execute(
                            "UPDATE canonical_games SET release_date = %(rel)s, updated_at = NOW() WHERE id = %(id)s;",
                            {"rel": rel_date, "id": game_id}
                        )
                        healed_count += 1
                except Exception as e:
                    logger.debug("Error healing game: %s", e)

        if healed_count % 100 == 0 or i + chunk_size >= len(null_rows):
            logger.info("Progress: Healed %d / %d missing release dates...", healed_count, len(null_rows))
        time.sleep(0.3)

    logger.info("Release Date Healing finished! Total %d games healed.", healed_count)


if __name__ == "__main__":
    main()
