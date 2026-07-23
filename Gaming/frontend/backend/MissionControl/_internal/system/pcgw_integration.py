"""
pcgw_integration.py — PCGamingWiki hardware feature fetcher for Mission Control.

Queries the PCGamingWiki MediaWiki parse API to extract verified hardware
feature support (DLSS, Frame Gen, Ray Tracing, Path Tracing, NVIDIA Reflex)
for game titles.

Design goals:
  - Zero external dependencies (uses stdlib urllib only).
  - In-memory + persistent (SQLite) result cache to avoid hammering PCGW.
  - Graceful degradation: returns [] on any network/parse error.
  - Rate-limited to respect PCGW (0.5 req/s between game lookups).
"""
from __future__ import annotations

import logging
import re
import sqlite3
import time
import urllib.parse
import urllib.request
import ssl
import json
import threading
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

PCGW_API = "https://www.pcgamingwiki.com/w/api.php"
UA = "MissionControl/1.0 (game feature enrichment; github.com/arnab825) python-urllib"
MIN_REQUEST_GAP = 0.5   # seconds between API calls (rate limiting)
CACHE_DB_PATH   = Path(__file__).parent.parent / "rag_data" / "pcgw_features.db"

# Features that PCGW tracks and how we map them to Mission Control feature strings
_FEATURE_FLAGS = {
    "DLSS":         "DLSS",
    "FRAME_GEN":    "FRAME_GEN",
    "RAY_TRACING":  "RAY_TRACING",
    "PATH_TRACING": "PATH_TRACING",
    "REFLEX":       "REFLEX",
    "HDR":          "HDR",
}


# ── Cache ─────────────────────────────────────────────────────────────────────

def _get_cache_conn() -> Optional[sqlite3.Connection]:
    """Return a SQLite connection to the PCGW features cache."""
    try:
        CACHE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(CACHE_DB_PATH), check_same_thread=False)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pcgw_features (
                name_lower TEXT PRIMARY KEY,
                features   TEXT NOT NULL,
                fetched_at REAL NOT NULL
            )
        """)
        conn.commit()
        return conn
    except Exception as exc:
        logger.warning("pcgw_features cache unavailable: %s", exc)
        return None


# Module-level single cache connection (thread-safe via WAL)
_cache_conn: Optional[sqlite3.Connection] = None
_cache_lock = threading.Lock()
_last_request_time: float = 0.0
_req_lock = threading.Lock()


def _get_conn() -> Optional[sqlite3.Connection]:
    global _cache_conn
    with _cache_lock:
        if _cache_conn is None:
            _cache_conn = _get_cache_conn()
        return _cache_conn


def _cache_get(name_lower: str) -> Optional[List[str]]:
    conn = _get_conn()
    if not conn:
        return None
    try:
        cur = conn.execute(
            "SELECT features, fetched_at FROM pcgw_features WHERE name_lower = ?",
            (name_lower,)
        )
        row = cur.fetchone()
        if row:
            # Cache valid for 30 days
            if time.time() - row[1] < 30 * 86400:
                return json.loads(row[0])
    except Exception as exc:
        logger.debug("pcgw_features cache read error: %s", exc)
    return None


def _cache_set(name_lower: str, features: List[str]) -> None:
    conn = _get_conn()
    if not conn:
        return
    try:
        conn.execute(
            "INSERT OR REPLACE INTO pcgw_features (name_lower, features, fetched_at) VALUES (?, ?, ?)",
            (name_lower, json.dumps(features), time.time())
        )
        conn.commit()
    except Exception as exc:
        logger.debug("pcgw_features cache write error: %s", exc)


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _make_ssl_ctx():
    """Create a lenient SSL context."""
    try:
        return ssl._create_unverified_context()
    except AttributeError:
        return None


def _http_get(params: dict, timeout: float = 8.0) -> Optional[dict]:
    """Throttled HTTP GET to the PCGW MediaWiki API."""
    global _last_request_time

    with _req_lock:
        now = time.monotonic()
        gap = MIN_REQUEST_GAP - (now - _last_request_time)
        if gap > 0:
            time.sleep(gap)
        _last_request_time = time.monotonic()

    params["format"] = "json"
    url = PCGW_API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    ctx = _make_ssl_ctx()
    try:
        r = urllib.request.urlopen(req, timeout=timeout, context=ctx) if ctx \
            else urllib.request.urlopen(req, timeout=timeout)
        return json.loads(r.read().decode("utf-8", errors="replace"))
    except Exception as exc:
        logger.debug("PCGW HTTP error for %s: %s", url, exc)
        return None


# ── Page name resolution ──────────────────────────────────────────────────────

def _resolve_pcgw_page(game_name: str) -> Optional[str]:
    """
    Try to find the PCGW page title for a game name via opensearch.
    Returns the best-match page title or None.
    """
    # Clean up common suffixes / DLC indicators
    clean = re.sub(r"\s*[\[\(].*?[\]\)]", "", game_name).strip()
    clean = re.sub(r"\s*(Enhanced|Remastered|Definitive|Complete|GOTY|Edition|Deluxe|Ultimate|™|®).*",
                   "", clean, flags=re.IGNORECASE).strip()

    data = _http_get({
        "action": "opensearch",
        "search": clean,
        "limit": "5",
        "redirects": "resolve",
    })
    if not data or not isinstance(data, list) or len(data) < 4:
        return None

    titles = data[1] if isinstance(data[1], list) else []
    if not titles:
        return None

    # Prefer exact or close match
    clean_lower = clean.lower()
    for t in titles:
        if t.lower().startswith(clean_lower):
            return t
    return titles[0] if titles else None


# ── Feature extraction from wikitext ─────────────────────────────────────────

def _parse_template_field(wikitext: str, field: str) -> str:
    """Extract the raw value of a template field like |upscaling = value."""
    pattern = rf"\|\s*{re.escape(field)}\s*=\s*([^\n|}}]*)"
    m = re.search(pattern, wikitext, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return ""


def _extract_features_from_wikitext(wikitext: str) -> List[str]:
    """
    Parse PCGW page wikitext and return a list of confirmed feature strings.

    PCGW Video template key fields:
      |upscaling tech = "DLSS 4, FSR 2, ..."  → DLSS
      |framegen = true / false                → FRAME_GEN
      |framegen tech = "DLSS FG, ..."         → FRAME_GEN
      |ray tracing = true / false / limited   → RAY_TRACING
      |ray tracing notes = "...Path Tracing..." → PATH_TRACING
      |hdr = true / limited                   → HDR
    NVIDIA Reflex: appears as plain text "Nvidia Reflex" or "NVIDIA Reflex"
    """
    features: set[str] = set()

    # ── DLSS ─────────────────────────────────────────────────────────────────
    upscaling_tech = _parse_template_field(wikitext, "upscaling tech")
    if re.search(r"\bDLSS\b", upscaling_tech, re.IGNORECASE):
        features.add("DLSS")

    # Also detect DLSS mentioned anywhere in upscaling-related lines
    if re.search(r"\|\s*upscaling\s*=\s*true", wikitext, re.IGNORECASE):
        if re.search(r"\bDLSS\b", wikitext, re.IGNORECASE):
            features.add("DLSS")

    # ── Frame Generation ─────────────────────────────────────────────────────
    framegen_val = _parse_template_field(wikitext, "framegen")
    framegen_tech = _parse_template_field(wikitext, "framegen tech")
    if framegen_val.lower() in ("true", "1"):
        features.add("FRAME_GEN")
    elif re.search(r"\bDLSS\s*(?:FG|MFG|Frame\s*Gen(?:eration)?)\b", framegen_tech, re.IGNORECASE):
        features.add("FRAME_GEN")
    # If framegen tech mentions DLSS FG anywhere in text
    if re.search(r"\bDLSS\s*(?:FG|MFG|Multi[- ]?Frame)\b", wikitext, re.IGNORECASE):
        features.add("FRAME_GEN")

    # ── Ray Tracing ──────────────────────────────────────────────────────────
    rt_val = _parse_template_field(wikitext, "ray tracing")
    if rt_val.lower() in ("true", "limited", "hackable"):
        features.add("RAY_TRACING")

    # ── Path Tracing ─────────────────────────────────────────────────────────
    # Path tracing is usually mentioned in ray tracing notes
    rt_notes = _parse_template_field(wikitext, "ray tracing notes")
    if re.search(r"\bpath\s*trac", rt_notes, re.IGNORECASE):
        features.add("PATH_TRACING")
        # Path tracing implies ray tracing
        features.add("RAY_TRACING")
    # Also search broadly in page
    if re.search(r"\bpath\s*trac", wikitext, re.IGNORECASE):
        features.add("PATH_TRACING")

    # ── NVIDIA Reflex ────────────────────────────────────────────────────────
    # PCGW doesn't have a dedicated template field; detect from plain text
    if re.search(r"nvidia\s+reflex|reflex\s+low\s+latency", wikitext, re.IGNORECASE):
        features.add("REFLEX")

    # ── HDR ──────────────────────────────────────────────────────────────────
    hdr_val = _parse_template_field(wikitext, "hdr")
    if hdr_val.lower() in ("true", "limited", "hackable"):
        features.add("HDR")

    return sorted(features)


# ── Public API ────────────────────────────────────────────────────────────────

def fetch_pcgw_features(game_name: str) -> List[str]:
    """
    Return a list of confirmed hardware feature strings for the given game.

    Possible values in returned list:
      'DLSS', 'FRAME_GEN', 'RAY_TRACING', 'PATH_TRACING', 'REFLEX', 'HDR'

    Results are cached in SQLite for 30 days.
    Returns [] on any failure (network error, game not found, parse error).
    """
    name_lower = game_name.strip().lower()
    if not name_lower:
        return []

    # Check cache first
    cached = _cache_get(name_lower)
    if cached is not None:
        logger.debug("PCGW cache hit for '%s': %s", game_name, cached)
        return cached

    logger.debug("PCGW lookup for '%s'", game_name)

    # Resolve page name
    page_title = _resolve_pcgw_page(game_name)
    if not page_title:
        logger.debug("PCGW: no page found for '%s'", game_name)
        _cache_set(name_lower, [])
        return []

    # Fetch full page wikitext
    data = _http_get({
        "action": "parse",
        "page": page_title,
        "prop": "wikitext",
    })
    if not data or "error" in data:
        logger.debug("PCGW: parse failed for '%s' (page='%s'): %s", game_name, page_title, data)
        _cache_set(name_lower, [])
        return []

    wikitext = data.get("parse", {}).get("wikitext", {}).get("*", "")
    if not wikitext:
        _cache_set(name_lower, [])
        return []

    features = _extract_features_from_wikitext(wikitext)
    logger.info("PCGW features for '%s' (page='%s'): %s", game_name, page_title, features)
    _cache_set(name_lower, features)
    return features


if __name__ == "__main__":
    # Quick smoke test
    logging.basicConfig(level=logging.DEBUG)
    test_games = ["Cyberpunk 2077", "Fortnite", "Valorant", "Far Cry 4", "Minecraft"]
    for g in test_games:
        feats = fetch_pcgw_features(g)
        print(f"  {g}: {feats}")
