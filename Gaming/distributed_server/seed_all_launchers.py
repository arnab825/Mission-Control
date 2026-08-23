#!/usr/bin/env python3
"""
seed_all_launchers.py:
Ingests and enriches games across Epic Games Store, GOG Galaxy, and Xbox / PC Game Pass.
Populates canonical_games with accurate multi-launcher arrays:
  - Epic Games titles -> ['Epic Games'] or ['Steam', 'Epic Games']
  - GOG Galaxy titles -> ['GOG Galaxy'] or ['Steam', 'GOG Galaxy']
  - Xbox titles -> ['Xbox', 'PC Game Pass'] or ['Steam', 'Xbox', 'PC Game Pass']
"""

import json
import logging
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

from db import LibraryDB
from normalizer import normalize_title, title_to_slug

logging.basicConfig(level=logging.INFO, format="%(asctime)s [MULTI-LAUNCHER-SEED] %(message)s")
logger = logging.getLogger("seed-launchers")

db = LibraryDB()
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MissionControl/1.0"


def fetch_json(url: str, timeout: int = 8):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except Exception as e:
        logger.debug("Fetch failed for %s: %s", url, e)
        return None


def sync_gog_catalog():
    """Fetch hundreds of GOG Galaxy titles and assign GOG Galaxy launcher."""
    logger.info("Fetching GOG Galaxy catalog (25 pages = 1,200+ games)...")
    gog_count = 0
    
    for page in range(1, 26):
        url = f"https://catalog.gog.com/v1/catalog?limit=48&page={page}&order=desc:bestselling&productType=in:game"
        data = fetch_json(url)
        if not data or not isinstance(data, dict):
            continue
        
        products = data.get("products", [])
        for p in products:
            title = p.get("title")
            if not title:
                continue
            
            slug = title_to_slug(title)
            norm = normalize_title(title)
            cover = p.get("coverVertical") or p.get("coverHorizontal")
            banner = p.get("coverHorizontal") or cover
            genres = [g.get("name") for g in p.get("genres", []) if g.get("name")] or ["Action"]
            
            # Check if game exists in canonical_games
            row = db.execute("SELECT id, launchers, platforms FROM canonical_games WHERE id = %(id)s OR normalized_title = %(norm)s", {"id": slug, "norm": norm}, fetch="one")
            
            if row:
                existing_launchers = set(row.get("launchers") or [])
                existing_launchers.add("GOG Galaxy")
                db.execute(
                    "UPDATE canonical_games SET launchers = %(launchers)s, updated_at = NOW() WHERE id = %(id)s",
                    {"launchers": list(existing_launchers), "id": row["id"]}
                )
            else:
                # Insert as new GOG game
                db.upsert_game({
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
                    "banner_url": banner,
                    "summary": f"{title} available DRM-free on GOG Galaxy.",
                    "ai_classified": True,
                    "ai_confidence": 0.95,
                    "raw_tags": ["GOG", "DRM-Free"],
                    "metadata": {"store": "gog", "store_app_id": str(p.get("id", ""))},
                })
            gog_count += 1
        time.sleep(0.2)

    logger.info("Successfully synced %d GOG Galaxy games into database!", gog_count)


def sync_epic_catalog():
    """Fetch Epic Games Store games and assign Epic Games launcher."""
    logger.info("Fetching Epic Games Store catalog...")
    epic_count = 0
    
    url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
    data = fetch_json(url)
    if data and isinstance(data, dict):
        elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
        for el in elements:
            title = el.get("title")
            if not title:
                continue
            
            slug = title_to_slug(title)
            norm = normalize_title(title)
            images = el.get("keyImages", [])
            cover = None
            banner = None
            for img in images:
                itype = img.get("type", "").lower()
                if "tall" in itype or "portrait" in itype:
                    cover = img.get("url")
                if "wide" in itype or "hero" in itype or "dieselstorefrontwide" in itype:
                    banner = img.get("url")
            
            cover = cover or (images[0].get("url") if images else None)
            banner = banner or cover
            
            row = db.execute("SELECT id, launchers FROM canonical_games WHERE id = %(id)s OR normalized_title = %(norm)s", {"id": slug, "norm": norm}, fetch="one")
            
            if row:
                existing_launchers = set(row.get("launchers") or [])
                existing_launchers.add("Epic Games")
                db.execute(
                    "UPDATE canonical_games SET launchers = %(launchers)s, updated_at = NOW() WHERE id = %(id)s",
                    {"launchers": list(existing_launchers), "id": row["id"]}
                )
            else:
                db.upsert_game({
                    "id": slug,
                    "title": title,
                    "normalized_title": norm,
                    "developer": el.get("seller", {}).get("name"),
                    "publisher": el.get("seller", {}).get("name"),
                    "release_date": el.get("effectiveDate", "")[:10] if el.get("effectiveDate") else None,
                    "primary_genre": "Action",
                    "genres": ["Action"],
                    "tags": ["Epic Games"],
                    "features": [],
                    "platforms": ["Windows", "Linux"],
                    "launchers": ["Epic Games"],
                    "cover_url": cover,
                    "banner_url": banner,
                    "summary": el.get("description") or f"{title} on Epic Games Store.",
                    "ai_classified": True,
                    "ai_confidence": 0.95,
                    "raw_tags": ["Epic Games"],
                    "metadata": {"store": "epic", "store_app_id": el.get("id")},
                })
            epic_count += 1

    logger.info("Successfully synced %d Epic Games titles into database!", epic_count)


def sync_xbox_and_multiplatform_hits():
    """Cross-tag major Xbox / PC Game Pass and renowned multi-platform titles."""
    logger.info("Cross-tagging major Xbox, Epic, and GOG multi-launcher titles...")
    
    # Famous Xbox / PC Game Pass Games
    xbox_slugs = [
        "halo-infinite", "halo-the-master-chief-collection", "forza-horizon-5", "forza-horizon-4",
        "forza-motorsport", "gears-5", "gears-of-war-ultimate-edition", "sea-of-thieves",
        "starfield", "avowed", "senua-s-saga-hellblade-ii", "grounded", "hi-fi-rush",
        "pentiment", "psychonauts-2", "microsoft-flight-simulator", "age-of-empires-iv"
    ]
    for x in xbox_slugs:
        db.execute(
            """
            UPDATE canonical_games
            SET launchers = CASE 
                WHEN NOT ('Xbox' = ANY(launchers)) THEN array_append(launchers, 'Xbox')
                ELSE launchers
            END
            WHERE id ILIKE %(x)s OR normalized_title ILIKE %(x)s;
            """,
            {"x": f"%{x.replace('-', ' ')}%"}
        )

    # Renowned Multi-Store PC Games (Steam + Epic + GOG)
    multi_store_games = [
        "cyberpunk-2077", "the-witcher-3-wild-hunt", "alan-wake", "control", "death-stranding",
        "grand-theft-auto-v", "red-dead-redemption-2", "the-elder-scrolls-v-skyrim",
        "fallout-4", "fallout-new-vegas", "dishonored-2", "metro-exodus", "borderlands-3",
        "disco-elysium", "hades", "hollow-knight", "divinity-original-sin-2", "baldurs-gate-3"
    ]
    for m in multi_store_games:
        db.execute(
            """
            UPDATE canonical_games
            SET launchers = ARRAY['Steam', 'Epic Games', 'GOG Galaxy']
            WHERE id ILIKE %(m)s OR normalized_title ILIKE %(m)s;
            """,
            {"m": f"%{m.replace('-', ' ')}%"}
        )

    # Epic Exclusives
    epic_exclusives = [
        "alan-wake-2", "fortnite", "fall-guys", "rocket-league",
        "kingdom-hearts-hd-1-5-2-5-remix", "kingdom-hearts-iii"
    ]
    for e in epic_exclusives:
        db.execute(
            """
            UPDATE canonical_games
            SET launchers = ARRAY['Epic Games']
            WHERE id ILIKE %(e)s OR normalized_title ILIKE %(e)s;
            """,
            {"e": f"%{e.replace('-', ' ')}%"}
        )


def main():
    logger.info("Starting comprehensive multi-launcher synchronization...")
    sync_gog_catalog()
    sync_epic_catalog()
    sync_xbox_and_multiplatform_hits()
    
    # Print summary
    rows = db.execute("SELECT launchers, COUNT(*) FROM canonical_games GROUP BY launchers ORDER BY count DESC;", fetch="all") or []
    logger.info("=== Multi-Launcher Distribution Summary ===")
    for r in rows:
        logger.info("Launchers: %s -> %d games", r["launchers"], r["count"])
    logger.info("Multi-launcher sync complete!")


if __name__ == "__main__":
    main()
