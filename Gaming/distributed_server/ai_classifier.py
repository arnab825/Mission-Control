"""
Mission Control — Distributed Game Library Server
ai_classifier.py: AI-driven genre and tag classification engine.

Problem: Raw web searches and store scraping return noisy, misplaced, or
contradictory tags. This module uses the existing LLM provider stack
(Gemini → NVIDIA NIM → Groq → OpenRouter) with auto-failover to produce
accurate, standardized primary genres, sub-genres, curated tags, and
hardware features.

Classified metadata is cached permanently in Supabase.
"""

import json
import logging
import os
import re
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

# Load .env from backend / distributed_server (override=False to preserve cloud env vars)
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        break

logger = logging.getLogger(__name__)

# ── Provider Configuration (mirrors existing ai_providers.py pattern) ──────────
_PROVIDERS = [
    {
        "name": "gemini",
        "label": "Google Gemini Flash",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY",
        "models": ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-lite-latest", "gemini-flash-latest"],
    },
    {
        "name": "nvidia",
        "label": "NVIDIA NIM",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "env_key": "NVIDIA_API_KEY",
        "models": ["nvidia/nemotron-3-ultra", "meta/llama-3.3-70b-instruct"],
    },
    {
        "name": "groq",
        "label": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
        "models": ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"],
    },
    {
        "name": "openrouter",
        "label": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "models": ["nvidia/nemotron-3-ultra", "meta-llama/llama-3.3-70b-instruct"],
    },
]

_provider_lock = threading.Lock()
_provider_counter = 0


def _get_active_providers_ordered() -> List[Dict[str, Any]]:
    """
    Return available providers rotated in round-robin order.
    Ensures load is balanced across Gemini, NVIDIA NIM, Groq, and OpenRouter,
    while still providing immediate fallback if the chosen provider fails.
    """
    global _provider_counter
    # Select providers whose API keys are configured
    active = [p for p in _PROVIDERS if os.getenv(p["env_key"], "").strip()]
    if not active:
        active = _PROVIDERS

    with _provider_lock:
        start_idx = _provider_counter % len(active)
        _provider_counter += 1

    # Rotate order so start_idx is tried first, then subsequent providers
    return [active[(start_idx + i) % len(active)] for i in range(len(active))]

# ── Canonical genre taxonomy ──────────────────────────────────────────────────
# The LLM is constrained to choose from this list for primary_genre.
GENRE_TAXONOMY = [
    "Action", "Action RPG", "Action-Adventure", "Adventure",
    "Battle Royale", "Card Game", "City Builder", "Dungeon Crawler",
    "Fighting", "First-Person Shooter", "Grand Strategy", "Horror",
    "Metroidvania", "MMO", "MOBA", "Narrative", "Open World",
    "Party Game", "Platformer", "Puzzle", "Racing", "Real-Time Strategy",
    "Rhythm", "Roguelike", "Roguelite", "Role-Playing Game", "Sandbox",
    "Simulation", "Souls-like", "Sports", "Stealth", "Strategy", "Survival",
    "Survival Horror", "Third-Person Shooter", "Tower Defense",
    "Turn-Based Strategy", "Turn-Based Tactics", "Visual Novel",
    "Walking Simulator", "LAUNCHER", "OTHER",
]

GENRE_SYNONYMS = {
    "strategy": "Strategy",
    "rts": "Real-Time Strategy",
    "tbs": "Turn-Based Strategy",
    "fps": "First-Person Shooter",
    "tps": "Third-Person Shooter",
    "rpg": "Role-Playing Game",
    "arpg": "Action RPG",
    "shooter": "First-Person Shooter",
    "tactics": "Turn-Based Tactics",
    "tactical": "Turn-Based Tactics",
    "tower defence": "Tower Defense",
    "driving": "Racing",
}


def _clean_and_normalize_genre(raw_genre: Optional[str]) -> str:
    if not raw_genre:
        return "OTHER"
    raw_clean = raw_genre.strip()
    # 1. Exact match
    for g in GENRE_TAXONOMY:
        if raw_clean.lower() == g.lower():
            return g
    # 2. Synonym match
    if raw_clean.lower() in GENRE_SYNONYMS:
        return GENRE_SYNONYMS[raw_clean.lower()]
    # 3. Substring match
    for g in GENRE_TAXONOMY:
        if g.lower() in raw_clean.lower() or raw_clean.lower() in g.lower():
            return g
    return "OTHER"

_SYSTEM_PROMPT = f"""You are a precise video game taxonomy expert.
Given a game title, developer, publisher, raw tags, and summary, classify the game into accurate genres and tags, extract technical/gameplay features, determine the publisher (or self-published developer name), provide an engaging 1-2 sentence summary, and determine its release date.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation). Use this exact schema:
{{
  "primary_genre": "<one from the allowed list>",
  "genres": ["<genre1>", "<genre2>"],
  "tags": ["<tag1>", "<tag2>", ...],
  "features": ["<feature1>", "<feature2>", ...],
  "publisher": "<publisher name, or the developer name if self-published/indie>",
  "summary": "<1-2 sentence engaging summary of the premise and core gameplay loop>",
  "release_date": "<e.g. 'Oct 24, 2023' or '2023' or null if unknown>",
  "confidence": <float 0.0–1.0>
}}

Allowed primary_genre values (pick EXACTLY one):
{", ".join(GENRE_TAXONOMY)}

Rules:
- primary_genre must be EXACTLY one value from the allowed list above.
- genres may include 1–4 values, including primary_genre.
- tags should be 4–12 concise gameplay/thematic descriptors (e.g. "Open World", "Dark Fantasy", "Stealth", "Co-op", "Singleplayer", "Rich Story", "Cyberpunk", "Post-Apocalyptic").
- features should include gameplay & technical capabilities (e.g. "Single-player", "Multi-player", "Co-op", "Full controller support", "Cloud Saves", "Ray Tracing", "DLSS", "DirectX 12", "HDR", "VR Support", "Steam Achievements").
- publisher: the publishing company or entity. If the game is self-published or an indie game with no separate publisher, return the developer's name. NEVER leave empty.
- summary: an authentic, engaging 1-2 sentence synopsis of what the game is about (avoid generic template text).
- release_date: the known release date or release year (e.g., "Nov 10, 2020" or "2020"), or null if completely unknown.
- confidence: your certainty that this classification is correct (0.0 = unsure, 1.0 = certain).
- If the game is a launcher (Steam, Epic, Xbox), set primary_genre to "LAUNCHER".
- NEVER use vague tags like "Game", "Video Game", "PC", "Software".
"""


def _build_user_prompt(
    title: str,
    developer: Optional[str],
    publisher: Optional[str],
    raw_tags: List[str],
    summary: Optional[str],
) -> str:
    parts = [f'Game Title: "{title}"']
    if developer:
        parts.append(f"Developer: {developer}")
    if publisher:
        parts.append(f"Publisher: {publisher}")
    if raw_tags:
        parts.append(f"Raw Tags (may be noisy/incorrect): {', '.join(raw_tags[:20])}")
    if summary:
        parts.append(f"Summary: {summary[:500]}")
    return "\n".join(parts)


def _call_provider(
    provider: Dict[str, Any],
    user_prompt: str,
) -> Tuple[Optional[Dict], float, str]:
    """Call one AI provider trying its list of models. Returns (parsed JSON result, latency_ms, successful_model) or (None, 0, '')."""
    api_key = os.getenv(provider["env_key"], "").strip()
    if not api_key:
        logger.debug("AI Classifier: %s key not set, skipping.", provider["name"])
        return None, 0.0, ""

    try:
        from openai import OpenAI
    except ImportError:
        logger.error("AI Classifier: openai package not installed.")
        return None, 0.0, ""

    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    client = OpenAI(api_key=api_key, base_url=provider["base_url"], max_retries=0)
    models = provider.get("models") or [provider.get("model", "gemini-3.8-flash")]

    for model in models:
        t0 = time.time()
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=512,
                timeout=12,
            )
            latency_ms = int((time.time() - t0) * 1000)
            content = response.choices[0].message.content.strip()

            # Extract JSON block using robust regex
            match = re.search(r"\{.*\}", content, re.DOTALL)
            json_str = match.group(0) if match else content

            data = json.loads(json_str)
            return data, latency_ms, model

        except Exception as exc:
            latency_ms = int((time.time() - t0) * 1000)
            logger.debug(
                "AI Classifier: %s (model: %s) failed (%.0fms): %s",
                provider["name"], model, latency_ms, exc
            )

    return None, 0.0, ""


def _validate_result(data: Dict[str, Any]) -> bool:
    """Sanity-check the LLM JSON output and normalize genre taxonomy."""
    if not isinstance(data, dict):
        return False

    # Normalize primary genre
    raw_genre = data.get("primary_genre")
    norm_genre = _clean_and_normalize_genre(raw_genre)
    data["primary_genre"] = norm_genre

    if not isinstance(data.get("genres"), list):
        data["genres"] = [norm_genre]
    if not isinstance(data.get("tags"), list):
        data["tags"] = []
    if not isinstance(data.get("features"), list):
        data["features"] = []
    return True


def classify_game(
    title: str,
    developer: Optional[str] = None,
    publisher: Optional[str] = None,
    raw_tags: Optional[List[str]] = None,
    summary: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Run genre & tag classification for a game using multi-tier LLM failover.

    Returns a dict with keys:
        primary_genre, genres, tags, features, confidence, provider, model
    Returns None if all providers fail.
    """
    user_prompt = _build_user_prompt(title, developer, publisher, raw_tags or [], summary)

    ordered_providers = _get_active_providers_ordered()
    for provider in ordered_providers:
        result, latency_ms, successful_model = _call_provider(provider, user_prompt)
        if result and _validate_result(result):
            logger.info(
                "AI Classifier: '%s' -> genre='%s' (%.0fms via %s [%s], confidence=%.2f)",
                title, result.get("primary_genre"), latency_ms,
                provider["name"], successful_model, result.get("confidence", 0)
            )
            return {
                "primary_genre":  result.get("primary_genre", "OTHER"),
                "genres":         result.get("genres", []),
                "tags":           result.get("tags", []),
                "features":       result.get("features", []),
                "publisher":      result.get("publisher"),
                "summary":        result.get("summary"),
                "release_date":   result.get("release_date"),
                "confidence":     float(result.get("confidence", 0.5)),
                "provider":       provider["name"],
                "model":          successful_model or (provider.get("models") or [""])[0],
                "latency_ms":     latency_ms,
            }
        logger.debug(
            "AI Classifier: %s returned unusable result for '%s', trying next provider.",
            provider["name"], title
        )

    logger.warning("AI Classifier: All providers failed for '%s', using fallback.", title)
    return None


def classify_batch(
    games: List[Dict[str, Any]],
    db=None,
    delay_between: float = 0.3,
) -> int:
    """
    Classify a batch of unclassified games and update Supabase.
    Returns the number of successfully classified games.
    """
    classified = 0
    for game in games:
        game_id = game.get("id")
        title = game.get("title", "")
        if not title:
            continue

        result = classify_game(
            title=title,
            developer=game.get("developer"),
            publisher=game.get("publisher"),
            raw_tags=game.get("raw_tags", []),
            summary=game.get("summary"),
        )
        pub_to_set = (result.get("publisher") if result else None) or game.get("publisher") or game.get("developer")
        if result and db:
            try:
                db.mark_game_classified(
                    game_id=game_id,
                    primary_genre=result["primary_genre"],
                    genres=result["genres"],
                    tags=result["tags"],
                    confidence=result["confidence"],
                    features=result.get("features", []),
                    publisher=pub_to_set,
                    summary=result.get("summary"),
                    release_date=result.get("release_date"),
                )
                db.log_ai_classification({
                    "game_id":      game_id,
                    "provider":     result["provider"],
                    "model":        result["model"],
                    "input_tags":   game.get("raw_tags", []),
                    "output_genre": result["primary_genre"],
                    "output_tags":  result["tags"],
                    "confidence":   result["confidence"],
                    "latency_ms":   result.get("latency_ms", 0),
                })
                classified += 1
            except Exception as exc:
                logger.error("AI Classifier: DB update failed for %s: %s", game_id, exc)
        elif not result and db:
            # Fallback so the worker does not get stuck in a loop on this game
            try:
                db.mark_game_classified(
                    game_id=game_id,
                    primary_genre="Action",
                    genres=["Action"],
                    tags=game.get("raw_tags", []) or ["Action"],
                    confidence=0.3,
                    features=[],
                    publisher=pub_to_set,
                    summary=game.get("summary"),
                    release_date=None,
                )
                classified += 1
            except Exception as exc:
                logger.error("AI Classifier: Fallback mark failed for %s: %s", game_id, exc)

        if delay_between > 0:
            time.sleep(delay_between)

    logger.info("AI Classifier: Classified %d / %d games.", classified, len(games))
    return classified

