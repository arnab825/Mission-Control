"""
Mission Control — Distributed Library Server
game_harvester.py: Web search and renowned game launcher catalog crawler.

Purpose:
  Finds and extracts canonical game metadata across renowned game launchers
  (Steam, Epic Games Store, GOG Galaxy) and gaming web search engines
  (SteamSpy, RAWG.io, DuckDuckGo, Wikipedia).

  Allows Mission Control to maintain a massive global dataset of canonical games
  independent of local installations, enriching raw web data with AI classification
  to correct messy or misplaced store tags.
"""

import json
import logging
import os
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MissionControl/1.0"


def _urlopen_json(url: str, timeout: float = 6.0) -> Optional[Any]:
    """Fetch URL and parse JSON safely."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8", errors="ignore"))
    except Exception as exc:
        logger.debug("game_harvester: Request failed for %s: %s", url, exc)
        return None


def _clean_text(s: Optional[str]) -> str:
    if not s:
        return ""
    # Strip HTML tags
    clean = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", clean).strip()


def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


# ── 1. Steam Store & SteamSpy Harvester ──────────────────────────────────────

class SteamHarvester:
    @staticmethod
    def search(query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """Search Steam Store for games by title."""
        params = urllib.parse.urlencode({
            "term": query,
            "l": "english",
            "cc": "US",
            "category1": 998,  # Games only
        })
        url = f"https://store.steampowered.com/api/storesearch/?{params}"
        data = _urlopen_json(url, timeout=5)
        if not data or not isinstance(data, dict):
            return []

        items = data.get("items", [])[:limit]
        results = []
        for item in items:
            appid = item.get("id")
            name = item.get("name", "")
            if not name or not appid:
                continue

            results.append({
                "title": name,
                "slug": _slugify(name),
                "cover_url": item.get("tiny_image") or f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg",
                "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg",
                "developer": None,
                "publisher": None,
                "release_date": None,
                "raw_tags": ["Steam"],
                "genres": [],
                "summary": None,
                "store": "steam",
                "store_app_id": str(appid),
                "launchers": ["Steam"],
            })
        return results

    @staticmethod
    def get_details(appid: str) -> Optional[Dict[str, Any]]:
        """Fetch full Steam app details (developer, publisher, genres, description, header)."""
        url = f"https://store.steampowered.com/api/appdetails?appids={appid}&l=english"
        data = _urlopen_json(url, timeout=6)
        if not data or not isinstance(data, dict):
            return None

        app_info = data.get(str(appid), {})
        if not app_info.get("success"):
            return None

        d = app_info.get("data", {})
        genres = [g.get("description") for g in d.get("genres", []) if g.get("description")]
        categories = [c.get("description") for c in d.get("categories", []) if c.get("description")]

        # Collect raw tags from categories & genres
        raw_tags = list(set(genres + categories))

        return {
            "title": d.get("name"),
            "slug": _slugify(d.get("name", "")),
            "developer": (d.get("developers") or [None])[0],
            "publisher": (d.get("publishers") or [None])[0],
            "release_date": d.get("release_date", {}).get("date"),
            "cover_url": d.get("header_image"),
            "banner_url": d.get("header_image"),
            "summary": _clean_text(d.get("short_description", "")),
            "genres": genres,
            "raw_tags": raw_tags,
            "features": categories,
            "store": "steam",
            "store_app_id": str(appid),
            "launchers": ["Steam"],
        }

    @staticmethod
    def get_top_games(limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch top games from SteamSpy (popular / top 100 in 2 weeks)."""
        url = "https://steamspy.com/api.php?request=top100in2weeks"
        data = _urlopen_json(url, timeout=8)
        if not data or not isinstance(data, dict):
            return []

        results = []
        for appid, item in list(data.items())[:limit]:
            name = item.get("name")
            if not name:
                continue
            tags = list(item.get("tags", {}).keys()) if isinstance(item.get("tags"), dict) else []
            results.append({
                "title": name,
                "slug": _slugify(name),
                "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg",
                "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg",
                "developer": item.get("developer"),
                "publisher": item.get("publisher"),
                "release_date": None,
                "raw_tags": tags or ["Steam"],
                "genres": tags[:2] if tags else ["Action"],
                "summary": f"{name} by {item.get('developer', 'Unknown')}",
                "store": "steam",
                "store_app_id": str(appid),
                "launchers": ["Steam"],
            })
        return results


# ── 2. Epic Games Store Harvester ───────────────────────────────────────────

class EpicHarvester:
    @staticmethod
    def get_catalog(limit: int = 40) -> List[Dict[str, Any]]:
        """Fetch popular / free promotions catalog from Epic Games Store API."""
        url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US"
        data = _urlopen_json(url, timeout=7)
        if not data or not isinstance(data, dict):
            return []

        elements = data.get("data", {}).get("Catalog", {}).get("searchStore", {}).get("elements", [])
        results = []
        for el in elements[:limit]:
            title = el.get("title")
            if not title:
                continue

            images = el.get("keyImages", [])
            cover = None
            banner = None
            for img in images:
                img_type = img.get("type", "").lower()
                if "thumbnail" in img_type or "card" in img_type or "dieselstorefrontwide" in img_type:
                    cover = img.get("url")
                if "tall" in img_type or "portrait" in img_type:
                    banner = img.get("url")

            if not cover and images:
                cover = images[0].get("url")

            tags = [t.get("name") for t in el.get("tags", []) if t.get("name")]
            categories = [c.get("path") for c in el.get("categories", []) if c.get("path")]

            results.append({
                "title": title,
                "slug": _slugify(title),
                "cover_url": cover,
                "banner_url": banner or cover,
                "developer": el.get("seller", {}).get("name"),
                "publisher": el.get("seller", {}).get("name"),
                "release_date": el.get("effectiveDate", "")[:10] if el.get("effectiveDate") else None,
                "raw_tags": tags or categories or ["Epic Games"],
                "genres": tags[:2] if tags else ["Action"],
                "summary": _clean_text(el.get("description", "")),
                "store": "epic",
                "store_app_id": el.get("id"),
                "launchers": ["Epic Games"],
            })
        return results


# ── 3. GOG Galaxy Harvester ──────────────────────────────────────────────────

class GOGHarvester:
    @staticmethod
    def get_bestsellers(limit: int = 40) -> List[Dict[str, Any]]:
        """Fetch bestselling titles from GOG catalog API."""
        url = f"https://catalog.gog.com/v1/catalog?limit={limit}&order=desc:bestselling"
        data = _urlopen_json(url, timeout=7)
        if not data or not isinstance(data, dict):
            return []

        products = data.get("products", [])
        results = []
        for p in products[:limit]:
            title = p.get("title")
            if not title:
                continue

            cover = p.get("coverHorizontal") or p.get("coverVertical")
            genres = [g.get("name") for g in p.get("genres", []) if g.get("name")]
            tags = [t.get("name") for t in p.get("tags", []) if t.get("name")]

            results.append({
                "title": title,
                "slug": _slugify(title),
                "cover_url": cover,
                "banner_url": cover,
                "developer": (p.get("developers") or [None])[0],
                "publisher": (p.get("publishers") or [None])[0],
                "release_date": p.get("releaseDate"),
                "raw_tags": tags or genres or ["GOG"],
                "genres": genres,
                "summary": _clean_text(p.get("description", "")),
                "store": "gog",
                "store_app_id": str(p.get("id", "")),
                "launchers": ["GOG Galaxy"],
            })
        return results


# ── 4. RAWG & DuckDuckGo Fallback Harvester ──────────────────────────────────

class RAWGHarvester:
    @staticmethod
    def search(query: str, rawg_key: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Query RAWG.io for game information."""
        key = rawg_key or os.getenv("RAWG_API_KEY", "")
        if not key:
            return []

        params = urllib.parse.urlencode({
            "key": key,
            "search": query,
            "page_size": limit,
            "ordering": "-relevance",
        })
        url = f"https://api.rawg.io/api/games?{params}"
        data = _urlopen_json(url, timeout=6)
        if not data or not isinstance(data, dict):
            return []

        results = []
        for g in data.get("results", []):
            name = g.get("name")
            if not name:
                continue
            genres = [gr.get("name") for gr in g.get("genres", []) if gr.get("name")]
            tags = [t.get("name") for t in g.get("tags", []) if t.get("name")]

            results.append({
                "title": name,
                "slug": _slugify(name),
                "cover_url": g.get("background_image"),
                "banner_url": g.get("background_image"),
                "developer": None,
                "publisher": None,
                "release_date": g.get("released"),
                "raw_tags": tags[:10] if tags else genres,
                "genres": genres,
                "summary": f"{name} (Released: {g.get('released', 'Unknown')})",
                "store": "manual",
                "store_app_id": str(g.get("id", "")),
                "launchers": ["Web"],
            })
        return results


# ── 5. Unified Web & Launcher Search ─────────────────────────────────────────

def search_launcher_and_web_games(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Search across renowned game launchers (Steam, GOG, Epic) and RAWG/Web in parallel.
    Deduplicates results by normalized title / slug.
    """
    results: List[Dict[str, Any]] = []
    seen_slugs = set()

    with ThreadPoolExecutor(max_workers=4) as executor:
        steam_future = executor.submit(SteamHarvester.search, query, limit=limit)
        rawg_future = executor.submit(RAWGHarvester.search, query, limit=limit)

        for future in (steam_future, rawg_future):
            try:
                items = future.result() or []
                for item in items:
                    slug = item.get("slug")
                    if slug and slug not in seen_slugs:
                        seen_slugs.add(slug)
                        results.append(item)
            except Exception as exc:
                logger.debug("game_harvester: Search task error: %s", exc)

    # For Steam items, enrich with detailed info (developer, publisher, short description) in background
    enriched: List[Dict[str, Any]] = []
    for item in results[:limit]:
        if item.get("store") == "steam" and item.get("store_app_id"):
            details = SteamHarvester.get_details(item["store_app_id"])
            if details:
                # Merge details
                item.update({
                    "developer": details.get("developer") or item.get("developer"),
                    "publisher": details.get("publisher") or item.get("publisher"),
                    "release_date": details.get("release_date") or item.get("release_date"),
                    "cover_url": details.get("cover_url") or item.get("cover_url"),
                    "summary": details.get("summary") or item.get("summary"),
                    "genres": details.get("genres") or item.get("genres"),
                    "raw_tags": list(set(item.get("raw_tags", []) + details.get("raw_tags", []))),
                })
        enriched.append(item)

    return enriched


def enrich_game_from_web(title: str) -> Optional[Dict[str, Any]]:
    """
    Given any raw game title or executable name, query renowned launchers and web search
    to retrieve the official canonical game metadata.
    """
    items = search_launcher_and_web_games(title, limit=3)
    if items:
        return items[0]
    return None


def harvest_top_games_from_launchers(limit_per_launcher: int = 50) -> List[Dict[str, Any]]:
    """
    Harvest top / bestselling / renowned games from Steam, GOG, and Epic Games Store.
    Used for seeding and populating the master canonical dataset.
    """
    results: List[Dict[str, Any]] = []
    seen_slugs = set()

    with ThreadPoolExecutor(max_workers=3) as executor:
        steam_future = executor.submit(SteamHarvester.get_top_games, limit_per_launcher)
        epic_future = executor.submit(EpicHarvester.get_catalog, limit_per_launcher)
        gog_future = executor.submit(GOGHarvester.get_bestsellers, limit_per_launcher)

        for future in (steam_future, epic_future, gog_future):
            try:
                items = future.result() or []
                for item in items:
                    slug = item.get("slug")
                    if slug and slug not in seen_slugs:
                        seen_slugs.add(slug)
                        results.append(item)
            except Exception as exc:
                logger.error("game_harvester: Launcher catalog harvesting failed: %s", exc)

    logger.info("game_harvester: Harvested %d total unique games from launchers.", len(results))
    return results
