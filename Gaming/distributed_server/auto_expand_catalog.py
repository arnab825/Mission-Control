#!/usr/bin/env python3
"""
Mission Control — Automated Comprehensive Catalog Harvester
auto_expand_catalog.py: Automatically harvests top 2,000+ PC games across genres and stores
and runs continuous AI classification until all games are fully classified.
"""
import os
import sys
import time
import json
import logging
import urllib.request
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv

# Load environment
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        break

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("auto-catalog-expander")

sys.path.insert(0, str(Path(__file__).parent))

from db import LibraryDB
from normalizer import normalize_title, title_to_slug
from ai_classifier import classify_batch

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def fetch_json(url: str, timeout: int = 10):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except Exception as e:
        logger.debug("Fetch failed for %s: %s", url, e)
        return None


def harvest_steam_popular():
    """Fetch top 1000 popular games from SteamSpy."""
    logger.info("Harvesting top games from SteamSpy...")
    games = []
    # SteamSpy top 100 forever & top 100 in 2 weeks
    for request_type in ["top100forever", "top100in2weeks", "all"]:
        url = f"https://steamspy.com/api.php?request={request_type}"
        data = fetch_json(url, timeout=12)
        if data and isinstance(data, dict):
            for appid, item in data.items():
                name = item.get("name", "")
                if not name or name == "None":
                    continue
                dev = item.get("developer", "")
                pub = item.get("publisher", "")
                games.append({
                    "title": name,
                    "developer": dev if dev != "None" else None,
                    "publisher": pub if pub != "None" else None,
                    "store_app_id": str(appid),
                    "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                    "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
                    "raw_tags": ["Steam", "PC"],
                    "store": "steam"
                })
        if request_type != "all":
            time.sleep(1)
        else:
            break
    logger.info("Harvested %d games from Steam sources.", len(games))
    return games


def harvest_dynamic_live_apis():
    """Dynamically harvest thousands of games across SteamSpy genres, Steam Store categories, GOG, and Epic Games."""
    all_games = []
    
    # 1. SteamSpy Top Charts & Genre Feeds
    logger.info("Dynamically querying SteamSpy live charts & genres...")
    genres_and_charts = [
        "top100forever", "top100in2weeks",
        "genre&genre=Action", "genre&genre=RPG", "genre&genre=Strategy",
        "genre&genre=Adventure", "genre&genre=Simulation", "genre&genre=Indie",
        "genre&genre=Massively+Multiplayer", "genre&genre=Racing", "genre&genre=Sports"
    ]
    for req in genres_and_charts:
        url = f"https://steamspy.com/api.php?request={req}"
        data = fetch_json(url, timeout=12)
        if data and isinstance(data, dict):
            for appid, item in data.items():
                name = item.get("name", "")
                if not name or name == "None":
                    continue
                all_games.append({
                    "title": name,
                    "developer": item.get("developer") if item.get("developer") != "None" else None,
                    "publisher": item.get("publisher") if item.get("publisher") != "None" else None,
                    "store_app_id": str(appid),
                    "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                    "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
                    "raw_tags": ["Steam", "PC"],
                    "store": "steam"
                })
        time.sleep(0.4)

    # 2. Steam Store Featured Categories (Top Sellers, New Releases, Specials, Coming Soon)
    logger.info("Dynamically querying Steam Store live featured categories...")
    steam_feat = fetch_json("https://store.steampowered.com/api/featuredcategories/?l=english&cc=US", timeout=10)
    if steam_feat and isinstance(steam_feat, dict):
        for cat_key in ["top_sellers", "new_releases", "specials", "coming_soon"]:
            items = steam_feat.get(cat_key, {}).get("items", [])
            for it in items:
                appid = it.get("id")
                name = it.get("name", "")
                if name and appid:
                    all_games.append({
                        "title": name,
                        "developer": None,
                        "publisher": None,
                        "store_app_id": str(appid),
                        "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                        "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
                        "raw_tags": ["Steam", cat_key.replace("_", " ").title()],
                        "store": "steam"
                    })

    # 3. GOG Galaxy Deep Live Catalog (Pages 1 to 15 = 720+ Games)
    logger.info("Dynamically querying GOG Galaxy live catalog (15 pages)...")
    for page in range(1, 16):
        gog_url = f"https://catalog.gog.com/v1/catalog?limit=48&page={page}&order=desc:bestselling&productType=in:game"
        gog_data = fetch_json(gog_url, timeout=10)
        if gog_data and isinstance(gog_data, dict):
            products = gog_data.get("products", [])
            for p in products:
                title = p.get("title", "")
                cover = p.get("coverVertical") or p.get("coverHorizontal")
                banner = p.get("coverHorizontal") or cover
                if title:
                    all_games.append({
                        "title": title,
                        "developer": p.get("developers", [None])[0] if p.get("developers") else None,
                        "publisher": p.get("publishers", [None])[0] if p.get("publishers") else None,
                        "release_date": p.get("releaseDate"),
                        "store_app_id": str(p.get("id", "")),
                        "cover_url": cover,
                        "banner_url": banner,
                        "raw_tags": [g.get("name", "") for g in p.get("genres", []) if g.get("name")] or ["GOG"],
                        "store": "gog"
                    })
        time.sleep(0.3)

    # 4. Epic Games Store Live Promos & Catalog
    logger.info("Dynamically querying Epic Games Store live catalog...")
    epic_data = fetch_json("https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US", timeout=10)
    if epic_data and isinstance(epic_data, dict):
        elements = epic_data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
        for el in elements:
            title = el.get("title")
            if not title:
                continue
            images = el.get("keyImages", [])
            cover = None
            banner = None
            for img in images:
                itype = img.get("type", "").lower()
                if "tall" in itype or "portrait" in itype or "offerimagetall" in itype:
                    cover = img.get("url")
                if "wide" in itype or "hero" in itype or "dieselstorefrontwide" in itype:
                    banner = img.get("url")
            all_games.append({
                "title": title,
                "developer": el.get("seller", {}).get("name"),
                "publisher": el.get("seller", {}).get("name"),
                "release_date": el.get("effectiveDate", "")[:10] if el.get("effectiveDate") else None,
                "store_app_id": el.get("id"),
                "cover_url": cover or (images[0].get("url") if images else None),
                "banner_url": banner or (images[0].get("url") if images else None),
                "raw_tags": ["Epic Games"],
                "store": "epic"
            })

    logger.info("Dynamic harvest completed: %d total games fetched live across store APIs.", len(all_games))
    return all_games


def main():
    db = LibraryDB()
    if not db.available:
        logger.error("Database connection unavailable. Check DATABASE_URL.")
        sys.exit(1)

    # 1. Harvest games dynamically from live store and chart APIs
    all_harvested = harvest_dynamic_live_apis()

    logger.info("Total dynamically harvested items to process: %d", len(all_harvested))

    # 2. Check existing catalog
    existing_rows = db.execute("SELECT id, normalized_title FROM canonical_games", fetch="all") or []
    existing_set = {r["normalized_title"] for r in existing_rows} | {r["id"] for r in existing_rows}
    logger.info("Found %d already existing games in database.", len(existing_set))

    # 3. Ingest new unclassified games
    new_games_inserted = 0
    for g in all_harvested:
        title = g.get("title", "").strip()
        if not title:
            continue
        slug = title_to_slug(title)
        norm = normalize_title(title)
        if slug in existing_set or norm in existing_set:
            continue

        game_data = {
            "id":               slug,
            "title":            title,
            "normalized_title": norm,
            "developer":        g.get("developer"),
            "publisher":        g.get("publisher"),
            "release_date":     g.get("release_date"),
            "primary_genre":    g.get("primary_genre") or "Action",
            "genres":           g.get("genres") or ["Action"],
            "tags":             g.get("raw_tags") or ["PC"],
            "features":         [],
            "platforms":        ["Windows"],
            "cover_url":        g.get("cover_url"),
            "banner_url":       g.get("banner_url"),
            "summary":          None,
            "ai_classified":    False,
            "metadata":         {"store": g.get("store", "steam"), "store_app_id": g.get("store_app_id")},
        }
        try:
            db.upsert_game(game_data)
            existing_set.add(slug)
            existing_set.add(norm)
            new_games_inserted += 1
        except Exception as e:
            logger.warning("Could not insert %s: %s", title, e)

    logger.info("Ingested %d NEW games into canonical_games!", new_games_inserted)

    # 4. Continuous AI Classification Loop until 0 unclassified remain
    logger.info("Starting automated AI classification until complete...")
    while True:
        unclassified = db.get_unclassified_games(limit=15)
        if not unclassified:
            logger.info("All games in the database have been 100%% classified by AI! Process complete.")
            break

        logger.info("AI Classifier: Classifying batch of %d unclassified games...", len(unclassified))
        classify_batch(unclassified, db=db, delay_between=0.4)
        time.sleep(1)

    logger.info("All done! Total games in database: %d", db.get_catalog_count() if hasattr(db, "get_catalog_count") else len(existing_set))


if __name__ == "__main__":
    main()
