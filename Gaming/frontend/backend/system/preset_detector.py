import os
import re
import json
import logging
from pathlib import Path
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

_CANDIDATE_ROOTS = [
    os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\User"), "Documents", "My Games"),
    os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\User"), "Documents"),
    os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\User"), "Saved Games"),
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Packages"),
    os.path.join(os.environ.get("LOCALAPPDATA", "")),
    os.path.join(os.environ.get("APPDATA", "")),
]

def _build_candidate_roots(install_path: str = "", exe_path: str = "") -> list:
    """
    Build the full list of directories to search for game config files.
    Mirrors the library scanner: start with the game's own install/exe directory
    (wherever it may be on any drive), then fall back to the standard OS paths.
    """
    roots = list(_CANDIDATE_ROOTS)  # always include standard OS paths

    # Add the game's actual install directory so games on non-standard drives
    # (e.g. D:/Games, E:/SteamLibrary, ...) are also searched.
    if install_path:
        install_p = Path(install_path)
        if install_p.exists():
            # The install dir itself may contain a "Saved" / "Config" sub-folder
            roots.insert(0, str(install_p))
            # Some engines (Unreal, Unity) place user data one level up
            parent = install_p.parent
            if parent.exists():
                roots.insert(0, str(parent))

    if exe_path:
        exe_dir = Path(exe_path).parent
        if exe_dir.exists() and str(exe_dir) not in roots:
            roots.insert(0, str(exe_dir))

    return roots

_CONFIG_EXTENSIONS = {".xml", ".json", ".ini", ".cfg", ".config", ".txt"}
_GRAPHICS_HINTS = {"graphics", "video", "settings", "user", "display", "config"}

# Semantic Mapping Engine Replaces Legacy Rules
from .presets.semantic_mapper import SemanticMapper
from .presets.schema import GamePresetState

def _is_name_match(game_name: str, dir_name: str) -> bool:
    game_clean = re.sub(r"[^a-z0-9]", "", game_name.lower())
    dir_clean = re.sub(r"[^a-z0-9]", "", dir_name.lower())
    if not game_clean or not dir_clean:
        return False
    if game_clean == dir_clean or game_clean in dir_clean or dir_clean in game_clean:
        return True
    
    game_words = set(re.sub(r"[^a-z0-9 ]", " ", game_name.lower()).split())
    dir_words = set(re.sub(r"[^a-z0-9 ]", " ", dir_name.lower()).split())
    ignored = {"the", "of", "and", "for", "game", "edition", "play", "setup"}
    game_words = {w for w in game_words if len(w) > 2 and w not in ignored}
    dir_words = {w for w in dir_words if len(w) > 2 and w not in ignored}
    
    if game_words and dir_words:
        if game_words & dir_words:
            return True
    return False


class GamePresetDetector:
    """
    Dynamically discovers and parses game configuration files for graphics settings.
    """

    def __init__(self, config=None):
        self.config = config or {}

    def get_structured_settings(self, game_entry: dict) -> dict:
        """
        Parse in-game graphics config files using the game library entry.

        Discovery order (all driven by game_entry fields — no hardcoded paths):
          1. Install-adjacent: search install_path up to 3 levels deep
          2. Exe-adjacent: directory containing the main executable
          3. Save-directory: OS standard locations matched by game name
          4. Platform hints: Steam / Epic specific sub-paths

        :param game_entry: Full game object from library:
            { name, install_path, exe_path, platform, features, ... }
        :returns: Dict of canonical feature names → values, e.g.
            {"dlss": "on", "ray_tracing": "off", "hdr": "on"}
            Returns {} if no config files could be located or parsed.
        """
        if not game_entry:
            return {}

        game_name    = game_entry.get("name", "")
        install_path = game_entry.get("install_path", "")
        exe_path     = game_entry.get("exe_path", "")
        platform     = game_entry.get("platform", "")

        candidate_files: list[str] = []

        # ── 1. Install-adjacent config ────────────────────────────────────────
        if install_path and Path(install_path).exists():
            candidate_files.extend(
                self._scan_dir_for_config(install_path, max_depth=3)
            )

        # ── 2. Exe-adjacent config ────────────────────────────────────────────
        if exe_path:
            exe_dir = str(Path(exe_path).parent)
            if exe_dir != install_path and Path(exe_dir).exists():
                candidate_files.extend(
                    self._scan_dir_for_config(exe_dir, max_depth=1)
                )

        # ── 3. Save-directory search by game name ─────────────────────────────
        if game_name:
            candidate_files.extend(self._discover_config_files(game_name))

        # ── 4. Platform-aware additional paths ────────────────────────────────
        if platform:
            plat = platform.lower()
            if "steam" in plat and install_path:
                # Some Steam games write user data next to the install
                userdata = Path(install_path).parent / "userdata"
                if userdata.exists():
                    candidate_files.extend(
                        self._scan_dir_for_config(str(userdata), max_depth=3)
                    )
            elif "epic" in plat:
                epic_saved = Path(os.environ.get("LOCALAPPDATA", "")) / "EpicGamesLauncher" / "Saved"
                if epic_saved.exists():
                    candidate_files.extend(
                        self._scan_dir_for_config(str(epic_saved), max_depth=2)
                    )

        # Deduplicate while preserving order
        seen: set = set()
        unique_files = []
        for f in candidate_files:
            if f not in seen:
                seen.add(f)
                unique_files.append(f)

        # Parse and merge all found config files
        raw_data: dict = {}
        
        if game_name:
            registry_data = self._scan_registry_for_config(game_name)
            if registry_data:
                raw_data.update(registry_data)
        for file_path in unique_files[:6]:   # cap at 6 to keep it fast
            try:
                data = self._parse_file(file_path)
                if data:
                    raw_data.update(data)
            except Exception as exc:
                logger.debug("[PresetDetector] Parse error %s: %s", file_path, exc)

        if not raw_data:
            logger.debug("[PresetDetector] No config files or registry keys found for '%s'", game_name)
            return {}

        # Use the Zero-Config Semantic Mapper to process the raw config dict
        mapper = SemanticMapper(use_llm_fallback=True)
        game_state_schema = mapper.map_config(raw_data)
        structured = game_state_schema.to_dict()

        logger.info(
            "[PresetDetector] '%s' → %d raw keys → %d semantic features found",
            game_name, len(raw_data), len(structured),
        )
        return structured

    def _scan_registry_for_config(self, game_name: str) -> dict:
        """
        Scan HKCU\\Software for subkeys matching the game name.
        Many Unity games and PlayStation PC ports (Spider-Man, etc.)
        store their graphics settings in the Windows Registry.
        """
        parsed = {}
        if os.name != 'nt' or not game_name:
            return parsed
            
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software") as sw_key:
                publisher_count = winreg.QueryInfoKey(sw_key)[0]
                for i in range(publisher_count):
                    try:
                        pub_name = winreg.EnumKey(sw_key, i)
                        # Skip huge tech trees
                        if pub_name.lower() in ["microsoft", "google", "intel", "nvidia corporation", "amd", "policies", "classes"]:
                            continue
                            
                        # If the publisher is exactly the game name (rare)
                        if _is_name_match(game_name, pub_name):
                            parsed.update(self._read_registry_values(sw_key, pub_name))
                            
                        # Otherwise check sub-folders (the actual games)
                        with winreg.OpenKey(sw_key, pub_name) as pub_key:
                            game_count = winreg.QueryInfoKey(pub_key)[0]
                            for j in range(game_count):
                                try:
                                    g_name = winreg.EnumKey(pub_key, j)
                                    if _is_name_match(game_name, g_name):
                                        parsed.update(self._read_registry_values(pub_key, g_name))
                                except Exception:
                                    pass
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"[PresetDetector] Registry scan error: {e}")
            
        return self._filter_graphics_keys(parsed)

    def _read_registry_values(self, parent_key, subkey_name) -> dict:
        import winreg
        result = {}
        try:
            with winreg.OpenKey(parent_key, subkey_name) as key:
                val_count = winreg.QueryInfoKey(key)[1]
                for i in range(val_count):
                    try:
                        name, value, _ = winreg.EnumValue(key, i)
                        clean_name = name.split('_h')[0] if '_h' in name else name
                        result[clean_name] = str(value)
                    except Exception:
                        pass
        except Exception:
            pass
        return result

    def _scan_dir_for_config(self, root_dir: str, max_depth: int = 3) -> list[str]:
        """Walk root_dir up to max_depth levels deep, collecting graphics config files."""
        found = []
        root = Path(root_dir)
        if not root.exists():
            return found
        try:
            for entry in root.rglob("*"):
                # Respect depth limit
                try:
                    depth = len(entry.relative_to(root).parts)
                except ValueError:
                    continue
                if depth > max_depth:
                    continue
                if entry.suffix.lower() not in _CONFIG_EXTENSIONS:
                    continue
                stem_lower = entry.stem.lower()
                if any(hint in stem_lower for hint in _GRAPHICS_HINTS):
                    found.append(str(entry))
        except (PermissionError, OSError):
            pass
        return found



    def detect_presets(self, game_title: str, game_entry: dict | None = None) -> str:
        """
        Detects graphics presets for the given game.
        Returns a formatted string like 'Preset: High, RT: Off, DLSS: Auto'

        :param game_title:  Name of the game (used for folder name matching).
        :param game_entry:  Optional full game object from the library
            ({ name, install_path, exe_path, ... }).  When provided, the
            game's actual installation directory is searched first — mirroring
            how the library scanner finds games on any drive, not just the
            standard Documents / Saved Games / AppData folders.
        """
        if not game_title:
            return "No game detected."

        install_path = (game_entry or {}).get("install_path", "")
        exe_path     = (game_entry or {}).get("exe_path", "")
        candidates = self._discover_config_files(game_title,
                                                 install_path=install_path,
                                                 exe_path=exe_path)
        if not candidates:
            return "No config files found for this game."

        parsed_data = {}
        for file_path in candidates[:3]:
            try:
                data = self._parse_file(file_path)
                if data:
                    parsed_data.update(data)
            except Exception as e:
                logger.debug(f"Failed to parse {file_path}: {e}")

        if not parsed_data:
            return "Failed to parse graphics settings."

        # Format into a clean string
        parts = []
        for key, val in parsed_data.items():
            parts.append(f"{key}: {val}")

        return ", ".join(parts[:15])  # Cap at 15 settings to keep prompt clean

    def _discover_config_files(
        self,
        game_name: str,
        install_path: str = "",
        exe_path: str = "",
    ) -> list[str]:
        """
        Find graphics-config files for *game_name* across all candidate roots.

        The search order mirrors the library scanner:
          1. Game's actual install directory (any drive/folder).
          2. Parent of the install directory (catches per-publisher sub-folders).
          3. Exe directory.
          4. Standard OS save paths (Documents/My Games, Saved Games, AppData …).

        Within each root the function looks for a sub-directory whose name
        fuzzy-matches the game title, then collects graphics config files up to
        3 levels deep.
        """
        found = []
        candidate_roots = _build_candidate_roots(install_path, exe_path)

        for root in candidate_roots:
            root_path = Path(root)
            if not root_path.exists():
                continue
            try:
                # If the root itself looks like the game dir, scan it directly
                # (handles cases where install_path == game folder)
                if _is_name_match(game_name, root_path.name):
                    for cfg_file in root_path.rglob("*"):
                        try:
                            depth = len(cfg_file.relative_to(root_path).parts)
                        except ValueError:
                            continue
                        if depth > 3:
                            continue
                        if cfg_file.suffix.lower() not in _CONFIG_EXTENSIONS:
                            continue
                        if any(hint in cfg_file.stem.lower() for hint in _GRAPHICS_HINTS):
                            found.append(str(cfg_file))

                # Helper: collect config files from a matched game directory
                def _collect_from(game_dir: Path):
                    for cfg_file in game_dir.rglob("*"):
                        try:
                            depth = len(cfg_file.relative_to(game_dir).parts)
                        except ValueError:
                            continue
                        if depth > 3:
                            continue
                        if cfg_file.suffix.lower() not in _CONFIG_EXTENSIONS:
                            continue
                        if any(hint in cfg_file.stem.lower() for hint in _GRAPHICS_HINTS):
                            found.append(str(cfg_file))

                # Also search sub-directories whose name matches the game
                for subdir in root_path.iterdir():
                    if not subdir.is_dir():
                        continue
                    if _is_name_match(game_name, subdir.name):
                        # Direct match (e.g. "Documents/GTA V Enhanced/")
                        _collect_from(subdir)
                    else:
                        # No match — check ONE level deeper for publisher/game nesting
                        # (e.g. "Documents/Rockstar Games/GTA V/settings.xml")
                        try:
                            for sub_subdir in subdir.iterdir():
                                if sub_subdir.is_dir() and _is_name_match(game_name, sub_subdir.name):
                                    _collect_from(sub_subdir)
                        except PermissionError:
                            pass
            except PermissionError:
                continue
            except Exception as e:
                logger.debug(f"Discovery error in {root}: {e}")

        # Deduplicate while preserving insertion order (install-dir hits first)
        seen: set = set()
        unique: list = []
        for f in found:
            if f not in seen:
                seen.add(f)
                unique.append(f)
        return unique

    def _parse_file(self, path: str) -> dict:
        ext = Path(path).suffix.lower()
        content = Path(path).read_text(encoding="utf-8", errors="ignore")
        
        parsed = {}
        if ext == ".json":
            parsed = self._parse_json(content)
        elif ext in (".ini", ".cfg", ".config", ".txt"):
            parsed = self._parse_ini(content)
        elif ext == ".xml":
            parsed = self._parse_xml(content)
            
        return self._filter_graphics_keys(parsed)

    def _parse_json(self, content: str) -> dict:
        try:
            data = json.loads(content)
            return self._flatten_dict(data)
        except json.JSONDecodeError:
            return {}

    def _parse_ini(self, content: str) -> dict:
        result = {}
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith(("#", ";", "//", "[")):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                result[k.strip()] = v.strip()
            elif ":" in line:
                k, v = line.split(":", 1)
                result[k.strip()] = v.strip()
        return result

    def _parse_xml(self, content: str) -> dict:
        try:
            root = ET.fromstring(content)
            result = {}
            for elem in root.iter():
                key = elem.get("name") or elem.get("id") or elem.tag
                val = elem.get("value") or elem.text
                if key and val and len(str(val)) < 50:
                    result[key.strip()] = str(val).strip()
            return result
        except ET.ParseError:
            return {}

    def _flatten_dict(self, d, parent_key='', sep='_'):
        items = []
        if isinstance(d, dict):
            for k, v in d.items():
                new_key = f"{parent_key}{sep}{k}" if parent_key else k
                if isinstance(v, dict):
                    items.extend(self._flatten_dict(v, new_key, sep=sep).items())
                elif isinstance(v, list):
                    pass # Skip lists for simple key-value config
                else:
                    items.append((new_key, v))
        return dict(items)

    def _filter_graphics_keys(self, data: dict) -> dict:
        # Pass everything through for SemanticMapper
        return data
