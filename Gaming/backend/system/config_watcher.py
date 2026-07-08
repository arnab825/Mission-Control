"""
Game Config File Watcher — Mission Control
Monitors known game configuration directories for keybinding changes.

How it works:
  1. When a game is detected, we build a list of candidate config file paths
     (e.g. Documents\\My Games\\<GameName>\\...xml / .json / .ini).
  2. A background polling thread checks mtime on those paths every N seconds.
  3. On change: we parse the file with the LLM and call
     GameKnowledgeBase.update_dynamic_profile() to hot-swap the keybinds.
  4. VoiceMacroEngine.refresh_game_macros() picks up the new keybinds the
     next time a voice command is processed — zero restarts required.

Design principles:
  - Zero user configuration.  The watcher discovers config files automatically.
  - Non-blocking.  All heavy work (LLM parse) runs on daemon threads.
  - Resilient.  Any exception in watcher threads is caught and logged only.
"""
from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Known game config search paths
# Each entry is a tuple of (relative_glob_pattern, description).
# The watcher expands %USERPROFILE%, %APPDATA%, %LOCALAPPDATA%, and
# %DOCUMENTS% automatically.
# ─────────────────────────────────────────────────────────────────────────────

_CANDIDATE_ROOTS = [
    # Windows user profile locations
    os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\User"), "Documents", "My Games"),
    os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\User"), "Documents"),
    os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\User"), "Saved Games"),
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Packages"),
    os.path.join(os.environ.get("APPDATA", ""), ".."),   # Roaming → Local sibling
]

_CONFIG_EXTENSIONS = {".xml", ".json", ".ini", ".cfg", ".config"}
_KEYBIND_FILENAME_HINTS = {
    "action", "input", "keybind", "keyboard", "control", "binding", "settings", "config",
}

# Max files to watch per game (avoid runaway file-system polling)
_MAX_WATCHED_FILES = 4
# Poll interval in seconds
_POLL_INTERVAL = 5.0
# Debounce: wait this many seconds after a file change before parsing
_DEBOUNCE = 2.0


class GameConfigWatcher:
    """
    Background file watcher that monitors game keybind config files and
    automatically updates the GameKnowledgeBase when they change.
    """

    def __init__(self, config: dict = None):
        self.config = config or {}
        self._running = False
        self._lock = threading.Lock()
        # game_key → {file_path: last_mtime}
        self._watched: Dict[str, Dict[str, float]] = {}
        # game_key → last change timestamp (for debounce)
        self._pending: Dict[str, float] = {}
        self._thread: Optional[threading.Thread] = None
        # Injected NIM client (shared with GameKnowledgeBase)
        self._nim_client = None
        self._nim_model: Optional[str] = None

    # ── Public API ────────────────────────────────────────────────────────────

    def start(self):
        """Start the background watcher thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._watch_loop,
            daemon=True,
            name="GameConfigWatcher",
        )
        self._thread.start()
        logger.info("[ConfigWatcher] Background watcher started.")

    def stop(self):
        """Stop the background watcher thread."""
        self._running = False
        logger.info("[ConfigWatcher] Watcher stopped.")

    def watch_game(self, game_name: str, game_key: str):
        """
        Register a game for config-file watching.
        Discovers candidate config files on disk under known paths.
        """
        candidates = self._discover_config_files(game_name)
        if not candidates:
            logger.debug(f"[ConfigWatcher] No config files found for '{game_name}'.")
            return

        with self._lock:
            if game_key not in self._watched:
                self._watched[game_key] = {}
            for path in candidates[:_MAX_WATCHED_FILES]:
                if path not in self._watched[game_key]:
                    try:
                        mtime = os.path.getmtime(path)
                    except OSError:
                        mtime = 0.0
                    self._watched[game_key][path] = mtime
                    logger.info(f"[ConfigWatcher] Watching '{path}' for game '{game_name}'.")

    # ── Discovery ─────────────────────────────────────────────────────────────

    def _discover_config_files(self, game_name: str) -> List[str]:
        """
        Search common Windows paths for config files that likely belong to
        `game_name` and contain keybinding data.
        """
        found: List[str] = []
        name_lower = game_name.lower()
        name_words = set(re.sub(r"[^a-z0-9 ]", " ", name_lower).split())

        for root in _CANDIDATE_ROOTS:
            root_path = Path(root)
            if not root_path.exists():
                continue
            try:
                for subdir in root_path.iterdir():
                    if not subdir.is_dir():
                        continue
                    dir_lower = subdir.name.lower()
                    # Match if any word of the game name appears in the dir name
                    if not any(word in dir_lower for word in name_words if len(word) > 2):
                        continue
                    # Walk up to 3 levels deep looking for config files
                    for depth in range(3):
                        for cfg_file in subdir.rglob("*"):
                            if cfg_file.suffix.lower() not in _CONFIG_EXTENSIONS:
                                continue
                            stem_lower = cfg_file.stem.lower()
                            if any(hint in stem_lower for hint in _KEYBIND_FILENAME_HINTS):
                                found.append(str(cfg_file))
                        break  # only look at top level for now to keep it fast
            except PermissionError:
                continue
            except Exception as e:
                logger.debug(f"[ConfigWatcher] Discovery error in '{root}': {e}")

        return found

    # ── Watcher Loop ──────────────────────────────────────────────────────────

    def _watch_loop(self):
        """Poll watched files for mtime changes."""
        while self._running:
            try:
                self._check_files()
                self._flush_pending()
            except Exception as e:
                logger.debug(f"[ConfigWatcher] Watch loop error: {e}")
            time.sleep(_POLL_INTERVAL)

    def _check_files(self):
        """Check mtimes and mark games with changed files as pending."""
        with self._lock:
            snapshot = {k: dict(v) for k, v in self._watched.items()}

        for game_key, files in snapshot.items():
            for path, last_mtime in files.items():
                try:
                    mtime = os.path.getmtime(path)
                except OSError:
                    continue
                if mtime != last_mtime:
                    logger.info(f"[ConfigWatcher] Change detected: '{path}' (game='{game_key}')")
                    with self._lock:
                        self._watched[game_key][path] = mtime
                        self._pending[game_key] = time.time()

    def _flush_pending(self):
        """Process any debounced pending games."""
        now = time.time()
        with self._lock:
            to_process = [
                gk for gk, ts in self._pending.items()
                if (now - ts) >= _DEBOUNCE
            ]
            for gk in to_process:
                del self._pending[gk]

        for game_key in to_process:
            threading.Thread(
                target=self._parse_and_update,
                args=(game_key,),
                daemon=True,
                name=f"ConfigParse-{game_key}",
            ).start()

    # ── Parsing ───────────────────────────────────────────────────────────────

    def _parse_and_update(self, game_key: str):
        """
        Read the changed config files, extract keybinds (rule-based first,
        LLM-assisted as fallback), and push the update to GameKnowledgeBase.
        """
        with self._lock:
            files = list(self._watched.get(game_key, {}).keys())

        if not files:
            return

        # Try rule-based parse first (fast, offline)
        keybinds = {}
        for path in files:
            try:
                parsed = self._rule_based_parse(path)
                if parsed:
                    for cat, binds in parsed.items():
                        keybinds.setdefault(cat, {}).update(binds)
            except Exception as e:
                logger.debug(f"[ConfigWatcher] Rule-based parse failed for '{path}': {e}")

        # Fallback: LLM-assisted parse for complex/unknown formats
        if not keybinds:
            for path in files[:1]:   # only first file to limit tokens
                try:
                    parsed = self._llm_parse_file(path, game_key)
                    if parsed:
                        keybinds = parsed
                        break
                except Exception as e:
                    logger.debug(f"[ConfigWatcher] LLM parse failed for '{path}': {e}")

        if keybinds:
            try:
                from ai_brain.game_knowledge import get_knowledge_base
                kb = get_knowledge_base()
                kb.update_dynamic_profile(
                    game_key=game_key,
                    keybinds=keybinds,
                    source="config_file",
                    config_path=files[0] if files else None,
                )
                logger.info(
                    f"[ConfigWatcher] Updated keybinds for '{game_key}' from config file "
                    f"({sum(len(v) for v in keybinds.values() if isinstance(v, dict))} bindings)."
                )
            except Exception as e:
                logger.error(f"[ConfigWatcher] Failed to update knowledge base: {e}")

    def _rule_based_parse(self, path: str) -> Optional[Dict]:
        """
        Attempt to extract keybindings from a config file using simple heuristics.
        Supports XML, JSON, and INI formats.
        Returns a category-grouped dict or None.
        """
        ext = Path(path).suffix.lower()
        content = Path(path).read_text(encoding="utf-8", errors="ignore")

        if ext == ".xml":
            return self._parse_xml_keybinds(content)
        elif ext == ".json":
            return self._parse_json_keybinds(content)
        elif ext in (".ini", ".cfg", ".config"):
            return self._parse_ini_keybinds(content)
        return None

    def _parse_xml_keybinds(self, content: str) -> Optional[Dict]:
        """Parse XML config for action→key pairs."""
        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return None

        keybinds = {"controls": {}}
        # Look for common XML patterns used by games
        for elem in root.iter():
            # Pattern 1: <action name="Sprint" key="LeftShift"/>
            name = elem.get("name") or elem.get("action") or elem.get("id") or ""
            key = elem.get("key") or elem.get("value") or elem.get("binding") or elem.text or ""
            if name and key and len(key) < 30:
                key = key.strip()
                name = name.strip()
                # Filter obvious non-key values
                if re.match(r"^[a-zA-Z0-9_\+\- ]+$", key):
                    keybinds["controls"][name] = key

        return keybinds if keybinds["controls"] else None

    def _parse_json_keybinds(self, content: str) -> Optional[Dict]:
        """Parse JSON config for keybinding data."""
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return None

        keybinds = {"controls": {}}
        self._extract_json_keybinds(data, keybinds["controls"], depth=0)
        return keybinds if keybinds["controls"] else None

    def _extract_json_keybinds(self, obj, out: dict, depth: int):
        """Recursively walk JSON looking for action→key mappings."""
        if depth > 5:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                k_lower = k.lower()
                # If value is a short string it might be a key name
                if isinstance(v, str) and len(v) < 25:
                    if any(hint in k_lower for hint in _KEYBIND_FILENAME_HINTS - {"config", "settings"}):
                        out[k] = v
                elif isinstance(v, (dict, list)):
                    self._extract_json_keybinds(v, out, depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                self._extract_json_keybinds(item, out, depth + 1)

    def _parse_ini_keybinds(self, content: str) -> Optional[Dict]:
        """Parse INI/CFG config for keybinding data."""
        keybinds: Dict[str, Dict] = {}
        current_section = "controls"
        key_pattern = re.compile(
            r"^([a-zA-Z_][a-zA-Z0-9_\s]*)[\s=:]+([a-zA-Z0-9_\+\-\[\] ]+)\s*$"
        )
        for line in content.splitlines():
            line = line.strip()
            # Section header
            m_sec = re.match(r"^\[(.+)\]$", line)
            if m_sec:
                current_section = m_sec.group(1).lower()
                continue
            # Skip comments
            if line.startswith(("#", "//", ";")):
                continue
            m = key_pattern.match(line)
            if m:
                action, key = m.group(1).strip(), m.group(2).strip()
                # Only store if it looks like a keyboard key
                if len(key) < 20 and re.search(r"[a-zA-Z0-9]", key):
                    keybinds.setdefault(current_section, {})[action] = key

        # Filter sections that look keybinding-related
        result = {
            sec: binds
            for sec, binds in keybinds.items()
            if any(hint in sec for hint in _KEYBIND_FILENAME_HINTS | {"control", "input"})
        }
        return result if result else (keybinds if keybinds else None)

    def _llm_parse_file(self, path: str, game_key: str) -> Optional[Dict]:
        """
        Ask the LLM to extract keybindings from a raw config file snippet.
        Used as fallback when rule-based parsing yields nothing.
        """
        self._ensure_nim_client()
        if not self._nim_client:
            return None

        try:
            content = Path(path).read_text(encoding="utf-8", errors="ignore")
            # Limit to first 3000 chars to stay within token budget
            snippet = content[:3000]
        except Exception:
            return None

        prompt = (
            f"Extract all keyboard/mouse keybindings from this game config file snippet. "
            f"Return ONLY a valid JSON object — no markdown, no explanation.\n\n"
            f"Required format:\n"
            f"{{\"controls\": {{\"ActionName\": \"Key\", ...}}}}\n\n"
            f"Config file content:\n{snippet}\n\n"
            f"JSON output:"
        )

        try:
            response = self._nim_client.chat.completions.create(
                model=self._nim_model or "meta/llama-3.3-70b-instruct",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=800,
                timeout=12.0,
            )
            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-z]*\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw.strip())
            return json.loads(raw)
        except Exception as e:
            logger.debug(f"[ConfigWatcher] LLM parse error for '{path}': {e}")
            return None

    def _ensure_nim_client(self):
        """Lazily acquire the NVIDIA NIM client from config."""
        if self._nim_client:
            return
        try:
            from openai import OpenAI
            agent_cfg = self.config.get("ai_agent", {})
            api_key = (
                agent_cfg.get("nvidia_api_key")
                or os.environ.get("NVIDIA_API_KEY")
                or os.environ.get("AI_GAMING_ASSISTANT_NVIDIA_API_KEY")
            )
            base_url = agent_cfg.get("endpoint_url") or os.environ.get(
                "NVIDIA_ENDPOINT_URL", "https://integrate.api.nvidia.com/v1"
            )
            invalid = {"YOUR_NVIDIA_API_KEY_HERE", "your_nvidia_api_key_here", "", None}
            if api_key and api_key.strip() not in invalid:
                self._nim_client = OpenAI(base_url=base_url, api_key=api_key)
                self._nim_model = agent_cfg.get("model_id") or "meta/llama-3.3-70b-instruct"
        except Exception as e:
            logger.debug(f"[ConfigWatcher] NIM client init failed: {e}")


# Module-level singleton
_watcher_instance: Optional[GameConfigWatcher] = None


def get_config_watcher(config: dict = None) -> GameConfigWatcher:
    """Return the global GameConfigWatcher singleton."""
    global _watcher_instance
    if _watcher_instance is None:
        _watcher_instance = GameConfigWatcher(config=config or {})
    return _watcher_instance
