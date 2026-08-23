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

from dotenv import load_dotenv

# Load local environment if available (without overriding production cloud variables)
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)

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
                "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
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

        # Platforms (Windows & Linux / Steam Deck only)
        raw_plat = d.get("platforms", {})
        platforms = []
        if raw_plat.get("windows"):
            platforms.append("Windows")
        if raw_plat.get("linux"):
            platforms.append("Linux")
        if not platforms:
            platforms = ["Windows"]

        return {
            "title": d.get("name"),
            "slug": _slugify(d.get("name", "")),
            "developer": (d.get("developers") or [None])[0],
            "publisher": (d.get("publishers") or [None])[0],
            "release_date": d.get("release_date", {}).get("date"),
            "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
            "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
            "summary": _clean_text(d.get("short_description", "")),
            "genres": genres,
            "raw_tags": raw_tags,
            "features": categories,
            "platforms": platforms,
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
                "cover_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                "banner_url": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
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
    def search(query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """Search Epic Games Store for games by title / keyword (includes Epic exclusives)."""
        params = urllib.parse.urlencode({
            "locale": "en-US",
            "country": "US",
            "allowCountries": "US",
            "keywords": query,
            "count": limit,
        })
        url = f"https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?{params}"
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
                if "thumbnail" in img_type or "card" in img_type or "dieselstorefrontwide" in img_type or "offerimage" in img_type:
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
    def search(query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """Search GOG catalog by query."""
        encoded_query = urllib.parse.quote(query)
        url = f"https://catalog.gog.com/v1/catalog?limit={limit}&order=desc:score&query=like:{encoded_query}"
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
            raw_os = [str(x).lower() for x in p.get("operatingSystems", [])]
            platforms = []
            if "windows" in raw_os: platforms.append("Windows")
            if "linux" in raw_os: platforms.append("Linux")
            if not platforms: platforms = ["Windows"]

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
                "platforms": platforms,
                "summary": _clean_text(p.get("description", "")),
                "store": "gog",
                "store_app_id": str(p.get("id", "")),
                "launchers": ["GOG Galaxy"],
            })
        return results

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
            raw_os = [str(x).lower() for x in p.get("operatingSystems", [])]
            platforms = []
            if "windows" in raw_os: platforms.append("Windows")
            if "linux" in raw_os: platforms.append("Linux")
            if not platforms: platforms = ["Windows"]

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
                "platforms": platforms,
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
            raw_plat = [str(pl.get("platform", {}).get("name", "")).lower() for pl in g.get("platforms", []) if pl.get("platform")]
            platforms = []
            if any("pc" in x or "windows" in x for x in raw_plat): platforms.append("Windows")
            if any("linux" in x for x in raw_plat): platforms.append("Linux")
            if not platforms: platforms = ["Windows"]

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
                "platforms": platforms,
                "summary": f"{name} (Released: {g.get('released', 'Unknown')})",
                "store": "manual",
                "store_app_id": str(g.get("id", "")),
                "launchers": ["Web"],
            })
        return results


# ── 5. Xbox & Microsoft Store Harvester ──────────────────────────────────────

class XboxHarvester:
    @staticmethod
    def search(query: str, limit: int = 6) -> List[Dict[str, Any]]:
        """Search Xbox / PC Game Pass catalog for titles (including Xbox exclusives)."""
        results = []
        rawg_key = os.getenv("RAWG_API_KEY", "").strip()
        if rawg_key:
            # Query RAWG with Xbox One (1) & Xbox Series X (186) platform filters
            params = urllib.parse.urlencode({
                "key": rawg_key,
                "search": query,
                "parent_platforms": "3",  # 3 is Xbox parent platform in RAWG
                "page_size": limit,
            })
            url = f"https://api.rawg.io/api/games?{params}"
            data = _urlopen_json(url, timeout=5)
            if data and isinstance(data, dict):
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
                        "publisher": "Xbox Game Studios",
                        "release_date": g.get("released"),
                        "raw_tags": ["Xbox", "PC Game Pass"] + (tags[:6] if tags else genres),
                        "genres": genres or ["Action"],
                        "platforms": ["Windows", "Linux", "Xbox"],
                        "store": "xbox",
                        "store_app_id": str(g.get("id", "")),
                        "launchers": ["Xbox", "Xbox App"],
                    })
        return results

    @staticmethod
    def get_gamepass_popular(limit: int = 40) -> List[Dict[str, Any]]:
        """Fetch popular PC Game Pass games from Xbox catalog sigls."""
        # PC Game Pass All Games SIGL ID
        url = "https://catalog.gamepass.com/sigls/v2?id=29a81209-bb6f-49fd-B528-4000f5707e5a&language=en-us&market=US"
        data = _urlopen_json(url, timeout=8)
        if not data or not isinstance(data, list):
            return []

        # List of product IDs
        product_ids = [item.get("id") for item in data if isinstance(item, dict) and item.get("id")][:limit]
        if not product_ids:
            return []

        # Fetch product summaries via display catalog
        ids_str = ",".join(product_ids[:20])
        cat_url = f"https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds={ids_str}&market=US&languages=en-us"
        cat_data = _urlopen_json(cat_url, timeout=8)
        if not cat_data or not isinstance(cat_data, dict):
            return []

        products = cat_data.get("Products", [])
        results = []
        for p in products:
            localized = (p.get("LocalizedProperties") or [{}])[0]
            title = localized.get("ProductTitle")
            if not title:
                continue

            images = localized.get("Images", [])
            cover = None
            for img in images:
                if img.get("ImagePurpose", "").lower() in ["poster", "boxart", "tile"]:
                    cover = img.get("Uri")
                    break
            if not cover and images:
                cover = images[0].get("Uri")
            if cover and not cover.startswith("http"):
                cover = "https:" + cover

            results.append({
                "title": title,
                "slug": _slugify(title),
                "cover_url": cover,
                "banner_url": cover,
                "developer": localized.get("DeveloperName"),
                "publisher": localized.get("PublisherName"),
                "release_date": p.get("MarketProperties", [{}])[0].get("OriginalReleaseDate", "")[:10] if p.get("MarketProperties") else None,
                "raw_tags": ["Xbox", "PC Game Pass"],
                "genres": ["Action"],
                "summary": _clean_text(localized.get("ProductDescription", ""))[:300],
                "store": "xbox",
                "store_app_id": p.get("ProductId"),
                "launchers": ["Xbox", "PC Game Pass"],
            })
        return results


def _detect_release_status(release_date: Optional[str], raw_tags: List[str]) -> str:
    """Detect whether a game is RELEASED, COMING_SOON, ANNOUNCED, or EARLY_ACCESS."""
    if any("early access" in str(t).lower() for t in raw_tags):
        return "EARLY_ACCESS"
    if not release_date:
        return "ANNOUNCED"
    
    r_str = str(release_date).lower().strip()
    if any(kw in r_str for kw in ["tba", "coming soon", "announced", "to be announced", "2026", "2027", "2028"]):
        return "COMING_SOON"
    
    try:
        if len(r_str) >= 4 and r_str[:4].isdigit():
            year = int(r_str[:4])
            if year > 2026:
                return "COMING_SOON"
    except Exception:
        pass

    return "RELEASED"


def _build_store_url(store: str, store_app_id: Optional[str], slug: str) -> Optional[str]:
    """Generate direct store purchase/details link."""
    st = (store or "").lower()
    if st == "steam" and store_app_id:
        return f"https://store.steampowered.com/app/{store_app_id}/"
    elif st == "gog":
        return f"https://www.gog.com/game/{slug}"
    elif st == "epic":
        return f"https://store.epicgames.com/"
    elif st == "xbox":
        return f"https://www.xbox.com/games/store/{slug}/{store_app_id}" if store_app_id else "https://www.xbox.com/games/pc-games"
    return None


# ── 6. Unified Web & Launcher Search with Cross-Store Availability ───────────

def search_launcher_and_web_games(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Search across renowned game launchers (Steam, Epic Games Store, Xbox, GOG) and RAWG in parallel.
    Aggregates cross-store existence (e.g. if a game is available on Steam, Epic, and Xbox simultaneously)
    and computes release/launch status (RELEASED vs COMING_SOON vs EARLY_ACCESS).
    """
    raw_results_by_slug: Dict[str, Dict[str, Any]] = {}

    with ThreadPoolExecutor(max_workers=6) as executor:
        steam_future = executor.submit(SteamHarvester.search, query, limit=limit)
        epic_future = executor.submit(EpicHarvester.search, query, limit=limit)
        xbox_future = executor.submit(XboxHarvester.search, query, limit=limit)
        gog_future = executor.submit(GOGHarvester.search, query, limit=limit)
        rawg_future = executor.submit(RAWGHarvester.search, query, limit=limit)

        for future in (steam_future, epic_future, xbox_future, gog_future, rawg_future):
            try:
                items = future.result() or []
                for item in items:
                    slug = item.get("slug")
                    if not slug:
                        continue
                    
                    if slug not in raw_results_by_slug:
                        raw_results_by_slug[slug] = {
                            "title": item.get("title"),
                            "slug": slug,
                            "cover_url": item.get("cover_url"),
                            "banner_url": item.get("banner_url"),
                            "developer": item.get("developer"),
                            "publisher": item.get("publisher"),
                            "release_date": item.get("release_date"),
                            "raw_tags": list(item.get("raw_tags") or []),
                            "genres": list(item.get("genres") or []),
                            "platforms": list(item.get("platforms") or ["Windows", "Linux"]),
                            "summary": item.get("summary"),
                            "store": item.get("store"),
                            "store_app_id": item.get("store_app_id"),
                            "launchers": list(item.get("launchers") or [item.get("store", "Steam").title()]),
                            "store_availability": {},
                        }
                    
                    entry = raw_results_by_slug[slug]
                    # Merge launchers and availability
                    curr_store = item.get("store", "steam")
                    store_url = _build_store_url(curr_store, item.get("store_app_id"), slug)
                    entry["store_availability"][curr_store] = {
                        "store": curr_store,
                        "store_app_id": item.get("store_app_id"),
                        "url": store_url,
                        "available": True,
                    }
                    
                    for l in item.get("launchers", []):
                        if l not in entry["launchers"]:
                            entry["launchers"].append(l)
                    for p in item.get("platforms", []):
                        if p not in entry["platforms"]:
                            entry["platforms"].append(p)
                    for t in item.get("raw_tags", []):
                        if t not in entry["raw_tags"]:
                            entry["raw_tags"].append(t)
                    
                    # Fill missing artwork or details
                    if not entry.get("cover_url") and item.get("cover_url"):
                        entry["cover_url"] = item["cover_url"]
                    if not entry.get("developer") and item.get("developer"):
                        entry["developer"] = item["developer"]
                    if not entry.get("publisher") and item.get("publisher"):
                        entry["publisher"] = item["publisher"]
                    if not entry.get("release_date") and item.get("release_date"):
                        entry["release_date"] = item["release_date"]

            except Exception as exc:
                logger.debug("game_harvester: Search task error: %s", exc)

    results = list(raw_results_by_slug.values())

    # For Steam items, enrich with detailed info (developer, publisher, short description)
    enriched: List[Dict[str, Any]] = []
    for item in results[:limit]:
        if item.get("store") == "steam" and item.get("store_app_id"):
            details = SteamHarvester.get_details(item["store_app_id"])
            if details:
                item.update({
                    "developer": details.get("developer") or item.get("developer"),
                    "publisher": details.get("publisher") or item.get("publisher"),
                    "release_date": details.get("release_date") or item.get("release_date"),
                    "summary": details.get("summary") or item.get("summary"),
                    "genres": details.get("genres") or item.get("genres"),
                    "raw_tags": list(set(item.get("raw_tags", []) + details.get("raw_tags", []))),
                })
        
        # Compute release launch status
        item["release_status"] = _detect_release_status(item.get("release_date"), item.get("raw_tags", []))
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
    Harvest top / bestselling / renowned games from Steam, Xbox Game Pass, Epic Games Store, and GOG.
    Used for seeding and populating the master canonical dataset.
    """
    results: List[Dict[str, Any]] = []
    seen_slugs = set()

    with ThreadPoolExecutor(max_workers=4) as executor:
        steam_future = executor.submit(SteamHarvester.get_top_games, limit_per_launcher)
        epic_future = executor.submit(EpicHarvester.get_catalog, limit_per_launcher)
        xbox_future = executor.submit(XboxHarvester.get_gamepass_popular, limit_per_launcher)
        gog_future = executor.submit(GOGHarvester.get_bestsellers, limit_per_launcher)

        for future in (steam_future, epic_future, xbox_future, gog_future):
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
