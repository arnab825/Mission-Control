"""
Mission Control — Dynamic Game Mode & Catalog Resolver
core/game_mode_resolver.py

Responsibilities:
1. Dynamic Database Retrieval: Fetches and indexes game records from Supabase / PostgreSQL,
   local scanned libraries (GameScanner / games_db.json), and platform registries.
2. High-Performance Token & Keyword Search: Strips process names (e.g. 'Cyberpunk2077.exe',
   'Valorant-Win64-Shipping.exe'), computes token similarity / Jaccard overlap, and resolves
   canonical game records without bloated code.
3. Automated Mode & Persona Derivation: Maps database genres/tags to assistant modes
   ('competitive', 'story', 'hybrid') and personas ('tactical', 'immersive', 'friendly').
4. Discover Games & Intel Hub Feed: Formats and serves dynamic discoverable game records
   for the frontend Hub catalog.
"""

import difflib
import json
import logging
import os
import re
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Noise tokens commonly found in Windows process names and game executables
_EXE_NOISE_REGEX = re.compile(
    r"(\.exe$|\.bat$|-(win64|shipping|dx12|dx11|vulkan|d3d11)|_(shipping|x64|x86|dx12|dx11|vulkan)|v\d+(\.\d+)*|build\d+|patch\d+)",
    re.IGNORECASE,
)

# Common words to filter out during keyword token scoring
_STOP_WORDS = {"the", "of", "and", "a", "an", "for", "in", "on", "edition", "game", "setup", "launcher"}

# Genre & Keyword to Mode & Persona mapping rules
_COMPETITIVE_KEYWORDS = {
    "fps", "shooter", "moba", "battle royale", "multiplayer", "racing",
    "fighting", "sports", "tactical", "arena", "pvp", "esports", "competitive",
    "valorant", "counter strike", "csgo", "cs2", "apex", "overwatch", "fortnite",
    "cod", "call of duty", "warzone", "dota", "league of legends", "rocket league",
    "rainbow six", "r6", "pubg", "halo", "battlefield", "forza", "need for speed",
    "nfs", "fifa", "nba", "street fighter", "tekken"
}

_STORY_KEYWORDS = {
    "rpg", "adventure", "open world", "narrative", "lore", "jrpg",
    "action rpg", "story rich", "singleplayer", "story", "soulslike", "horror",
    "cyberpunk", "witcher", "elden ring", "dark souls", "baldurs gate", "bg3",
    "skyrim", "fallout", "starfield", "god of war", "last of us", "horizon",
    "red dead", "rdr", "gta", "grand theft auto", "assassins creed", "final fantasy",
    "persona", "mass effect", "dragon age", "zelda", "genshin", "resident evil", "silent hill"
}

_HYBRID_KEYWORDS = {
    "strategy", "simulation", "sandbox", "survival", "indie", "building",
    "management", "puzzle", "crafting", "hybrid", "platformer", "casual",
    "simcity", "cities skylines", "civilization", "stellaris", "minecraft",
    "terraria", "factorio", "rimworld", "palworld", "valheim", "stardew"
}


@dataclass(frozen=True)
class ResolvedGameContext:
    title: str
    genre: str
    mode: str          # "competitive" | "story" | "hybrid"
    persona: str       # "tactical" | "immersive" | "friendly"
    matched_from: str  # "database" | "scanner" | "taxonomy" | "fallback"
    raw_entry: Dict[str, Any] = field(default_factory=dict)


def normalize_title(raw_text: str) -> str:
    """Strip executable noise, version strings, engine suffixes and normalize spacing."""
    if not raw_text:
        return ""
    text = str(raw_text).strip()
    text = _EXE_NOISE_REGEX.sub("", text)
    # Split alphanumeric boundaries (e.g. Cyberpunk2077 -> Cyberpunk 2077)
    text = re.sub(r"([a-zA-Z])(\d+)", r"\1 \2", text)
    text = re.sub(r"(\d+)([a-zA-Z])", r"\1 \2", text)
    # Remove bracketed metadata like [DX12] or (x64)
    text = re.sub(r"\[.*?\]|\(.*?\)", " ", text)
    # Normalize punctuation to spaces
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    return " ".join(text.lower().split())


def _compute_match_score(query_norm: str, candidate_title: str) -> float:
    """Calculate token-level and substring match confidence between 0.0 and 1.0."""
    if not query_norm or not candidate_title:
        return 0.0
    cand_norm = normalize_title(candidate_title)
    if not cand_norm:
        return 0.0

    if query_norm == cand_norm:
        return 1.0
    if query_norm in cand_norm or cand_norm in query_norm:
        return 0.9

    q_tokens = {t for t in query_norm.split() if t not in _STOP_WORDS}
    c_tokens = {t for t in cand_norm.split() if t not in _STOP_WORDS}

    if not q_tokens or not c_tokens:
        return 0.0

    # Jaccard token overlap
    intersection = len(q_tokens & c_tokens)
    union = len(q_tokens | c_tokens)
    jaccard = intersection / union if union > 0 else 0.0

    if jaccard >= 0.5:
        return 0.8 + (jaccard * 0.2)

    # String similarity fallback
    seq_ratio = difflib.SequenceMatcher(None, query_norm, cand_norm).ratio()
    return seq_ratio if seq_ratio > 0.65 else 0.0


def derive_mode_and_persona(genre: str, tags: Optional[List[str]] = None) -> Tuple[str, str]:
    """Derive optimal assistant mode and personality persona from genre and tags."""
    g_lower = (genre or "").lower().strip()
    combined_tokens = set(g_lower.replace("/", " ").replace("-", " ").split())
    if tags:
        for t in tags:
            combined_tokens.update(str(t).lower().replace("/", " ").replace("-", " ").split())

    combined_text = " ".join(combined_tokens)

    # 1. Check Competitive
    if combined_tokens & _COMPETITIVE_KEYWORDS or any(k in g_lower or k in combined_text for k in _COMPETITIVE_KEYWORDS):
        return "competitive", "tactical"

    # 2. Check Story / RPG
    if combined_tokens & _STORY_KEYWORDS or any(k in g_lower or k in combined_text for k in _STORY_KEYWORDS):
        return "story", "immersive"

    # 3. Check Hybrid / Strategy
    if combined_tokens & _HYBRID_KEYWORDS or any(k in g_lower or k in combined_text for k in _HYBRID_KEYWORDS):
        return "hybrid", "friendly"

    return "hybrid", "friendly"


class GameModeResolver:
    """
    Unified high-speed database resolver and catalog search engine.
    Indexed dynamically from local scanner, JSON databases, and Supabase.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._cached_catalog: List[Dict[str, Any]] = []
        self._last_loaded: float = 0.0
        self._user_id: Optional[str] = None

    def _load_all_records(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load and merge game records across all local and cloud sources."""
        records: List[Dict[str, Any]] = []
        seen_titles = set()

        def add_record(item: Dict[str, Any], source_label: str):
            if not isinstance(item, dict):
                return
            title = item.get("name") or item.get("title")
            if not title or not str(title).strip():
                return
            norm = normalize_title(str(title))
            if norm in seen_titles:
                return
            seen_titles.add(norm)
            clean_item = dict(item)
            clean_item["_source"] = source_label
            clean_item["title"] = str(title).strip()
            clean_item["name"] = str(title).strip()
            records.append(clean_item)

        # 1. Supabase / PostgreSQL cloud database
        try:
            from system.db_manager import get_db
            db = get_db()
            if db and db.available:
                cloud_games = db.get_games(user_id) if user_id else db.get_games()
                if cloud_games:
                    for g in cloud_games:
                        add_record(g, "supabase")
        except Exception as exc:
            logger.debug("[GameModeResolver] Supabase query notice: %s", exc)

        # 2. Local Scanned Game Library Cache
        try:
            from system.game_scanner import GameScanner
            scanner = GameScanner(config={}, user_id=user_id)
            scanned_games = scanner.load_cached_games() or []
            for g in scanned_games:
                add_record(g, "scanner")
        except Exception as exc:
            logger.debug("[GameModeResolver] Local scanner query notice: %s", exc)

        # 3. Local JSON database fallback
        try:
            base_dir = Path(__file__).resolve().parent.parent
            json_paths = [
                base_dir / "config" / "games_db.json",
                base_dir / "config" / f"games_db_{user_id}.json" if user_id else None,
            ]
            for jp in json_paths:
                if jp and jp.exists():
                    with open(jp, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            for g in data:
                                add_record(g, "json_db")
        except Exception as exc:
            logger.debug("[GameModeResolver] JSON database load notice: %s", exc)

        return records

    def _ensure_catalog(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            if not self._cached_catalog or self._user_id != user_id:
                self._cached_catalog = self._load_all_records(user_id)
                self._user_id = user_id
            return self._cached_catalog

    def refresh(self, user_id: Optional[str] = None):
        """Force a fresh re-index of game catalog across all data layers."""
        with self._lock:
            self._cached_catalog = self._load_all_records(user_id)
            self._user_id = user_id

    def resolve(
        self,
        raw_title_or_process: str,
        explicit_genre: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> ResolvedGameContext:
        """
        Dynamically resolves game metadata from the database and derives
        the canonical title, genre, mode, and persona.
        """
        raw_text = str(raw_title_or_process or "").strip()
        norm_query = normalize_title(raw_text)

        catalog = self._ensure_catalog(user_id)
        best_match: Optional[Dict[str, Any]] = None
        best_score = 0.0

        for item in catalog:
            title = item.get("name") or item.get("title", "")
            score = _compute_match_score(norm_query, title)
            if score > best_score:
                best_score = score
                best_match = item
                if score >= 0.99:
                    break

        if best_match and best_score >= 0.5:
            canonical_title = best_match.get("name") or best_match.get("title") or raw_text
            genre = explicit_genre or best_match.get("genre") or best_match.get("primary_genre") or "Action"
            tags = best_match.get("tags") or best_match.get("genres") or []
            mode, persona = derive_mode_and_persona(genre, tags)
            return ResolvedGameContext(
                title=canonical_title,
                genre=genre,
                mode=mode,
                persona=persona,
                matched_from=best_match.get("_source", "database"),
                raw_entry=best_match,
            )

        # Fallback when not found in database: derive from explicit genre or text keywords
        effective_genre = explicit_genre or ("RPG" if any(k in norm_query for k in _STORY_KEYWORDS) else ("FPS" if any(k in norm_query for k in _COMPETITIVE_KEYWORDS) else "Action"))
        mode, persona = derive_mode_and_persona(effective_genre, [norm_query])
        clean_fallback_title = normalize_title(raw_text).title() if raw_text else "Active Game"

        return ResolvedGameContext(
            title=clean_fallback_title,
            genre=effective_genre,
            mode=mode,
            persona=persona,
            matched_from="fallback",
            raw_entry={},
        )

    def get_discoverable_games(
        self,
        query: Optional[str] = None,
        limit: int = 50,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch dynamically formatted discover items for the frontend Discover Games & Intel Hub.
        - Browse Mode (no query): displays curated, high-quality games without mandatory bloat.
        - Search Mode (with query): searches across ALL database records and launchers if it exists.
        """
        catalog = self._ensure_catalog(user_id)
        results: List[Dict[str, Any]] = []

        norm_q = normalize_title(query) if query else ""
        is_search_mode = bool(norm_q)

        for item in catalog:
            # In default browse mode, omit pure system launcher processes to keep hub curated
            if not is_search_mode and (item.get("type") == "LAUNCHER" or item.get("genre") == "PLATFORM"):
                continue

            title = item.get("name") or item.get("title", "")
            if is_search_mode:
                score = _compute_match_score(norm_q, title)
                # Also check aliases, developer, publisher, and genre in search mode
                if score < 0.3:
                    item_text = f"{title} {item.get('genre', '')} {item.get('developer', '')} {item.get('platform', '')}".lower()
                    if norm_q not in item_text:
                        continue

            game_id = item.get("id") or normalize_title(title).replace(" ", "-")
            genre = item.get("genre") or item.get("primary_genre") or "Action"
            genres_list = item.get("genres") or [genre]
            tags_list = item.get("tags") or ["Verified"]
            cover_url = item.get("cover_url") or item.get("coverUrl") or item.get("icon")
            banner_url = item.get("banner_url") or item.get("bannerUrl") or cover_url
            
            # Detect multi-launcher availability
            platform_str = str(item.get("platform") or item.get("store") or "").lower()
            install_str = str(item.get("install_path") or item.get("exe_path") or "").lower()
            detected_launchers = set(item.get("launchers") or [])

            if "steam" in platform_str or "steam" in install_str:
                detected_launchers.add("Steam")
            if "epic" in platform_str or "epic" in install_str:
                detected_launchers.add("Epic Games")
            if "gog" in platform_str or "gog" in install_str:
                detected_launchers.add("GOG Galaxy")
            if "xbox" in platform_str or "xbox" in install_str or "gamepass" in install_str:
                detected_launchers.add("Xbox Game Pass")
            if "ea" in platform_str or "origin" in platform_str or "ea desktop" in install_str or "electronic arts" in install_str:
                detected_launchers.add("EA App")
            if "ubisoft" in platform_str or "uplay" in platform_str or "ubisoft game launcher" in install_str:
                detected_launchers.add("Ubisoft Connect")
            if "playstation" in platform_str or "sony" in platform_str or "ps pc" in platform_str:
                detected_launchers.add("PlayStation")
            if "rockstar" in platform_str or "social club" in install_str or "rockstar games" in install_str:
                detected_launchers.add("Rockstar Games")
            if "battle.net" in platform_str or "battlenet" in platform_str or "blizzard" in install_str:
                detected_launchers.add("Battle.net")

            if not detected_launchers:
                detected_launchers.add("Steam")

            primary_store = list(detected_launchers)[0]

            results.append({
                "id": str(game_id),
                "title": title,
                "developer": item.get("developer") or "Official Partner",
                "publisher": item.get("publisher") or "Game Publisher",
                "release_date": item.get("release_date") or item.get("releaseDate") or "Recent",
                "primary_genre": genre,
                "genres": genres_list,
                "tags": tags_list,
                "cover_url": cover_url,
                "banner_url": banner_url,
                "summary": item.get("summary") or item.get("description") or f"Dynamic database record for {title}.",
                "store": primary_store,
                "store_app_id": item.get("store_app_id") or str(game_id),
                "launchers": sorted(list(detected_launchers)),
                "in_catalog": True,
                "ai_classified": True,
                "installations": item.get("installations") or [],
            })

            if len(results) >= limit:
                break

        return results

    def resolve_from_texts(
        self,
        texts: List[str],
        user_id: Optional[str] = None,
    ) -> Optional[ResolvedGameContext]:
        """
        Scans a sequence of texts (e.g. chat messages in reverse chronological order)
        and extracts the first matching game title from the database catalog.
        """
        if not texts:
            return None

        catalog = self._ensure_catalog(user_id)
        if not catalog:
            return None

        for text in texts:
            if not text or not str(text).strip():
                continue
            text_lower = str(text).lower()

            for item in catalog:
                title = item.get("name") or item.get("title", "")
                if not title:
                    continue
                title_clean = normalize_title(title)
                if not title_clean:
                    continue

                # Exact word-boundary match or high-confidence substring match
                pattern = r'\b' + re.escape(title_clean) + r'\b'
                if re.search(pattern, text_lower) or title_clean in text_lower:
                    genre = item.get("genre") or item.get("primary_genre") or "Action"
                    tags = item.get("tags") or item.get("genres") or []
                    mode, persona = derive_mode_and_persona(genre, tags)
                    return ResolvedGameContext(
                        title=title,
                        genre=genre,
                        mode=mode,
                        persona=persona,
                        matched_from=item.get("_source", "database"),
                        raw_entry=item,
                    )

        return None


# Global singleton instance
game_mode_resolver = GameModeResolver()


# ── Standalone Wrapper Functions & Decorators ──────────────────────────────────

def auto_switch_mode(
    target: Any,
    raw_title_or_process: str,
    explicit_genre: Optional[str] = None,
    user_id: Optional[str] = None,
) -> ResolvedGameContext:
    """
    Universal wrapper function that resolves game records from the database
    and dynamically applies the mode & persona to a PipelineHost, GameBrain, or state dict.
    """
    ctx = game_mode_resolver.resolve(raw_title_or_process, explicit_genre=explicit_genre, user_id=user_id)
    
    # 1. If target is PipelineHost
    if hasattr(target, "_apply_mode_and_persona"):
        target._apply_mode_and_persona(ctx.mode, ctx.persona, ctx.title, ctx.genre)
    elif hasattr(target, "brain") and hasattr(target.brain, "set_mode"):
        target.brain.set_mode(ctx.mode)
        if hasattr(target, "config") and isinstance(target.config, dict):
            if "ai_agent" not in target.config:
                target.config["ai_agent"] = {}
            target.config["ai_agent"]["assistant_mode"] = ctx.mode
            target.config["ai_agent"]["personality"] = ctx.persona

    # 2. If target is GameBrain directly
    elif hasattr(target, "set_mode"):
        target.set_mode(ctx.mode)
        if hasattr(target, "config") and isinstance(target.config, dict):
            if "ai_agent" not in target.config:
                target.config["ai_agent"] = {}
            target.config["ai_agent"]["assistant_mode"] = ctx.mode
            target.config["ai_agent"]["personality"] = ctx.persona

    return ctx


def with_game_context(fn):
    """
    Decorator that intercepts function calls with a game name or prompt,
    dynamically resolves the database-backed game context, and injects it.
    """
    import functools

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        game_hint = kwargs.get("game_name") or kwargs.get("title") or kwargs.get("game_title")
        if not game_hint and args and len(args) > 1 and isinstance(args[1], str):
            game_hint = args[1]

        user_id = kwargs.get("user_id")
        ctx = game_mode_resolver.resolve(game_hint or "", user_id=user_id) if game_hint else None
        if ctx:
            kwargs["resolved_game_context"] = ctx
        return fn(*args, **kwargs)

    return wrapper

