"""
gaming_news.py — Zero-dependency live gaming news aggregator for Mission Control.
Fetches, parses, normalizes, and caches real-time RSS feeds from top PC gaming outlets:
PC Gamer, Eurogamer, Kotaku, Polygon, Rock Paper Shotgun, GameSpot, and Tom's Hardware.
"""
from __future__ import annotations

import html
import json
import logging
import re
import threading
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 15 * 60  # 15 minutes
CACHE_FILE = Path(__file__).parent.parent / "rag_data" / "gaming_news_cache.json"

FEEDS = [
    {"url": "https://www.pcgamer.com/rss/", "source": "PC Gamer", "category": "PC Gaming"},
    {"url": "https://www.eurogamer.net/?format=rss", "source": "Eurogamer", "category": "Gaming"},
    {"url": "https://kotaku.com/rss", "source": "Kotaku", "category": "Gaming"},
    {"url": "https://www.polygon.com/rss/index.xml", "source": "Polygon", "category": "Gaming"},
    {"url": "https://www.rockpapershotgun.com/feed", "source": "Rock Paper Shotgun", "category": "PC Gaming"},
    {"url": "https://www.gamespot.com/feeds/news/", "source": "GameSpot", "category": "Gaming"},
    {"url": "https://www.tomshardware.com/feeds/all", "source": "Tom's Hardware", "category": "Hardware"},
]

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MissionControl/3.4"

_lock = threading.Lock()
_memory_cache: List[Dict[str, Any]] = []
_last_fetch_time: float = 0.0


def _clean_text(raw: Optional[str]) -> str:
    if not raw:
        return ""
    text = html.unescape(raw)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_image_url(item_xml: str) -> Optional[str]:
    m = re.search(r'<enclosure[^>]+url=["\']([^"\']+)["\']', item_xml, re.IGNORECASE)
    if m:
        return m.group(1)
    m = re.search(r'<media:content[^>]+url=["\']([^"\']+)["\']', item_xml, re.IGNORECASE)
    if m:
        return m.group(1)
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', item_xml, re.IGNORECASE)
    if m:
        return m.group(1)
    return None


def _fetch_single_feed(feed_info: Dict[str, str], max_items: int = 10) -> List[Dict[str, Any]]:
    articles: List[Dict[str, Any]] = []
    url = feed_info["url"]
    source = feed_info["source"]
    category = feed_info["category"]

    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=6.5) as resp:
            content_bytes = resp.read()

        xml_str = content_bytes.decode("utf-8", errors="replace")
        item_matches = re.findall(r"<item[\s>]([\s\S]*?)</item>", xml_str, re.IGNORECASE)

        for block in item_matches[:max_items]:
            title_m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", block, re.IGNORECASE | re.DOTALL)
            link_m = re.search(r"<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</link>", block, re.IGNORECASE | re.DOTALL)
            desc_m = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", block, re.IGNORECASE | re.DOTALL)
            date_m = re.search(r"<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</pubDate>", block, re.IGNORECASE | re.DOTALL)

            title = _clean_text(title_m.group(1) if title_m else "")
            link = (link_m.group(1) if link_m else "").strip()
            desc = _clean_text(desc_m.group(1) if desc_m else "")
            pub_date = (date_m.group(1) if date_m else "").strip()
            img_url = _extract_image_url(block)

            if len(desc) > 220:
                desc = desc[:217] + "..."

            if title and link:
                articles.append({
                    "id": link,
                    "title": title,
                    "link": link,
                    "description": desc,
                    "source": source,
                    "category": category,
                    "pubDate": pub_date,
                    "imageUrl": img_url,
                })
    except Exception as exc:
        logger.debug("[GamingNews] Error querying %s feed: %s", source, exc)

    return articles


def _load_disk_cache() -> List[Dict[str, Any]]:
    try:
        if CACHE_FILE.exists():
            data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict) and "items" in data and isinstance(data["items"], list):
                return data["items"]
    except Exception as exc:
        logger.debug("[GamingNews] Error loading disk cache: %s", exc)
    return []


def _save_disk_cache(items: List[Dict[str, Any]]) -> None:
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "timestamp": time.time(),
            "items": items,
            "count": len(items),
        }
        CACHE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.debug("[GamingNews] Error saving disk cache: %s", exc)


def get_gaming_news(force_refresh: bool = False, max_per_feed: int = 10) -> List[Dict[str, Any]]:
    """
    Returns aggregated PC gaming news dispatches from active RSS feeds.
    Uses in-memory cache with 15-minute TTL, falling back to disk cache.
    """
    global _memory_cache, _last_fetch_time

    now = time.time()
    with _lock:
        if not force_refresh and _memory_cache and (now - _last_fetch_time < CACHE_TTL_SECONDS):
            return list(_memory_cache)

    # Multi-threaded concurrent fetch across all feeds
    results: List[Dict[str, Any]] = []
    threads: List[threading.Thread] = []
    feed_results: List[List[Dict[str, Any]]] = [[] for _ in FEEDS]

    def _worker(idx: int, feed_dict: Dict[str, str]):
        feed_results[idx] = _fetch_single_feed(feed_dict, max_items=max_per_feed)

    for i, feed in enumerate(FEEDS):
        t = threading.Thread(target=_worker, args=(i, feed), daemon=True)
        threads.append(t)
        t.start()

    for t in threads:
        t.join(timeout=8.0)

    seen_links = set()
    for flist in feed_results:
        for item in flist:
            l = item.get("link", "")
            if l and l not in seen_links:
                seen_links.add(l)
                results.append(item)

    # Sort descending by pubDate
    def _parse_time(item: Dict[str, Any]) -> float:
        try:
            pd = item.get("pubDate")
            if pd:
                import email.utils
                parsed = email.utils.parsedate_to_datetime(pd)
                return parsed.timestamp()
        except Exception:
            pass
        return 0.0

    results.sort(key=_parse_time, reverse=True)

    with _lock:
        if results:
            _memory_cache = results
            _last_fetch_time = now
            _save_disk_cache(results)
            return list(_memory_cache)

        # Fallback to disk cache if remote fetches failed
        disk_items = _load_disk_cache()
        if disk_items:
            _memory_cache = disk_items
            return list(_memory_cache)

        return list(_memory_cache)
