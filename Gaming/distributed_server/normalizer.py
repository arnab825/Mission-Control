"""
Mission Control — Distributed Game Library Server
normalizer.py: Canonical game title normalization and matching engine.

Purpose: Map raw game folder names / store titles (which may differ by
edition, casing, year, punctuation, etc.) to a single canonical game ID.

Examples:
  "Cyberpunk 2077 GOTY"    → cyberpunk-2077
  "Cyberpunk2077"          → cyberpunk-2077
  "Grand Theft Auto V"     → grand-theft-auto-v
  "GTA V"                  → grand-theft-auto-v (via alias table)
  "Witcher 3 Wild Hunt"    → the-witcher-3-wild-hunt
"""

import re
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple

# ── Known aliases / short-form → canonical slug mappings ─────────────────────
# Extend this table as needed; it never hardcodes paths or IPs.
TITLE_ALIASES: Dict[str, str] = {
    "gta v":                          "grand-theft-auto-v",
    "gta 5":                          "grand-theft-auto-v",
    "gtav":                           "grand-theft-auto-v",
    "gta vi":                         "grand-theft-auto-vi",
    "gta6":                           "grand-theft-auto-vi",
    "rdr2":                           "red-dead-redemption-2",
    "rdr 2":                          "red-dead-redemption-2",
    "red dead 2":                     "red-dead-redemption-2",
    "witcher 3":                      "the-witcher-3-wild-hunt",
    "witcher3":                       "the-witcher-3-wild-hunt",
    "the witcher 3":                  "the-witcher-3-wild-hunt",
    "cp2077":                         "cyberpunk-2077",
    "cyberpunk2077":                  "cyberpunk-2077",
    "elden ring":                     "elden-ring",
    "dark souls 3":                   "dark-souls-iii",
    "dark souls iii":                 "dark-souls-iii",
    "sekiro":                         "sekiro-shadows-die-twice",
    "hzd":                            "horizon-zero-dawn",
    "horizon zero dawn":              "horizon-zero-dawn",
    "horizon forbidden west":         "horizon-forbidden-west",
    "spider-man remastered":          "marvels-spider-man-remastered",
    "spiderman remastered":           "marvels-spider-man-remastered",
    "ghost of tsushima":              "ghost-of-tsushima-directors-cut",
    "gots":                           "ghost-of-tsushima-directors-cut",
    "hogwarts legacy":                "hogwarts-legacy",
    "baldurs gate 3":                 "baldurs-gate-3",
    "bg3":                            "baldurs-gate-3",
    "baldur's gate 3":                "baldurs-gate-3",
}

# ── Edition / suffix noise words to strip ─────────────────────────────────────
EDITION_NOISE = [
    r"\bgoty\b", r"\bgame of the year\b", r"\bdeluxe\b", r"\bpremium\b",
    r"\bultimate\b", r"\bcomplete\b", r"\bremastered\b", r"\bremake\b",
    r"\bdefinitive\b", r"\banniversary\b", r"\bengine\b", r"\bedition\b",
    r"\bbeta\b", r"\bdemo\b", r"\btrial\b", r"\benhanced\b",
    r"\bdirector'?s cut\b", r"\bseasonal\b", r"\bspecial\b",
]

# ── Roman numeral mapping for consistency ─────────────────────────────────────
ROMAN_NUMERALS: Dict[str, str] = {
    " ii": " 2", " iii": " 3", " iv": " 4", " vi": " 6",
    " vii": " 7", " viii": " 8", " ix": " 9", " xi": " 11",
}


def slugify(text: str) -> str:
    """Produce a URL/DB-safe slug from any string."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def _normalize_raw(title: str) -> str:
    """
    Return a stripped, lowercase, punctuation-free version of a title for
    matching purposes. Does NOT produce a slug — retains spaces.
    """
    s = title.lower().strip()
    # Strip edition noise
    for pat in EDITION_NOISE:
        s = re.sub(pat, " ", s, flags=re.IGNORECASE)
    # Replace common roman numerals
    for roman, arabic in ROMAN_NUMERALS.items():
        s = s.replace(roman, arabic)
    # Remove remaining punctuation (apostrophes, colons, etc.)
    s = re.sub(r"[^\w\s]", " ", s)
    # Collapse whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_title(title: str) -> str:
    """Public normalizer: returns a lowercase stripped string for DB storage."""
    return _normalize_raw(title)


def title_to_slug(title: str) -> str:
    """Produce the canonical slug for a game title."""
    normalized = _normalize_raw(title)
    # Check alias table first
    if normalized in TITLE_ALIASES:
        return TITLE_ALIASES[normalized]
    return slugify(normalized)


def match_game(
    raw_title: str,
    existing_normalized_titles: List[Tuple[str, str]],  # [(normalized_title, game_id), ...]
    threshold: float = 0.82,
) -> Optional[str]:
    """
    Attempt to match a raw game title against existing canonical games in the DB.

    Returns the matched game_id if similarity exceeds threshold, else None
    (meaning a new canonical record should be created).

    Algorithm:
    1. Exact normalized title match.
    2. Alias table lookup.
    3. Fuzzy similarity using SequenceMatcher (avoids heavy NLP deps).
    """
    norm = _normalize_raw(raw_title)

    # 1. Exact match
    for (db_norm, game_id) in existing_normalized_titles:
        if db_norm == norm:
            return game_id

    # 2. Alias lookup
    alias_slug = TITLE_ALIASES.get(norm)
    if alias_slug:
        for (db_norm, game_id) in existing_normalized_titles:
            if game_id == alias_slug or db_norm == alias_slug.replace("-", " "):
                return game_id

    # 3. Fuzzy matching — efficient enough for catalogs up to ~10k titles
    best_ratio = 0.0
    best_id = None
    for (db_norm, game_id) in existing_normalized_titles:
        ratio = SequenceMatcher(None, norm, db_norm).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_id = game_id

    if best_ratio >= threshold:
        return best_id

    return None


def deduplicate_tags(raw_tags: List[str]) -> List[str]:
    """Deduplicate and clean a list of raw tags."""
    seen = set()
    result = []
    for tag in raw_tags:
        clean = tag.strip().title()
        if clean and clean.lower() not in seen:
            seen.add(clean.lower())
            result.append(clean)
    return result
