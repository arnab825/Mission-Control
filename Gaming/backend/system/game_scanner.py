import os
import winreg
import json
import logging
import subprocess
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger(__name__)

try:
    from system.db_manager import get_db
    _DB_MANAGER_AVAILABLE = True
except ImportError:
    try:
        from .db_manager import get_db
        _DB_MANAGER_AVAILABLE = True
    except ImportError:
        try:
            # Fallback for direct script execution
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from system.db_manager import get_db
            _DB_MANAGER_AVAILABLE = True
        except Exception:
            _DB_MANAGER_AVAILABLE = False

class GameScanner:
    """
    Scans and detects installed games from various platforms.
    """
    def __init__(self, config=None, user_id=None):
        self.config = config or {}
        self.games = []
        self.user_id = str(user_id) if user_id else None
        # Local JSON fallback cache (used when Supabase is unavailable)
        if user_id:
            safe_user_id = "".join(c for c in str(user_id) if c.isalnum() or c in ("-", "_"))
            filename = f"games_db_{safe_user_id}.json" if safe_user_id else "games_db.json"
        else:
            filename = "games_db.json"
        app_data_path = self.config.get("system", {}).get("app_data_path")
        if app_data_path:
            base_dir = Path(app_data_path)
        else:
            base_dir = Path(__file__).parent.parent
            
        self.cache_file = base_dir / "config" / filename
        self._ensure_cache_dir()
        
        self.crack_groups = {
            "flt", "rune", "codex", "ali213", "tenoke", "goldberg", 
            "epicfiles", "steamfiles", "onlinefix", "online fix", 
            "crack", "skidrow", "reloaded", "fitgirl", "dodi", 
            "update", "updates", "razor1911", "emp", "empress", 
            "crackfix", "nodvd", "no-dvd", "gog",
            # spaced variants (for folder names like "Epic Files", "Steam Files")
            "epic files", "steam files", "online fix", "no dvd",
        }

        # Subdirectories commonly found inside game folders that are NOT the game root
        self.generic_subfolders = {
            "bin", "binaries", "x64", "x86", "win64", "win32", "win_x64", "win_x86",
            "retail", "shipping", "release", "debug", "client", "game", "gamedata",
            "engine", "redmod", "r6", "tools", "data", "content",
            "build", "plugins", "mods", "support", "redist", "commonredist",
            "installers", "_installer", "_commonredist", "thirdparty", "directx",
            "easyanticheat", "battleye", "crashreporter", "crashpad", "dotnet",
            "vcredist", "dxredist", "prerequisites", "temp", "tmp", "x64_dx12"
        }

        # Parent directory names that represent top-level library / system folders (boundaries for game root detection)
        self.library_root_names = {
            "games", "my games", "steamlibrary", "steamapps", "common", 
            "epic games", "epicgames", "ubisoft", "ubisoft games", "ubisoft game launcher", 
            "origin games", "ea games", "electronic arts", "riot games", "riotgames", 
            "battle.net", "blizzard", "activision", "gog games", "gog.com", "xboxgames", 
            "microsoft games", "amazon games", "amazongames", "itch.io", "itch", 
            "humble bundle", "humblebundle", "rockstar games", "rockstargames", 
            "bethesda", "bethesda.net", "square enix", "squareenix", "2k games", "2kgames", 
            "capcom", "sega", "bandai namco", "konami", "koei tecmo", "sony", 
            "playstation studios", "program files", "program files (x86)", 
            "programdata", "users", "public", "appdata", "local", "roaming", "desktop", "downloads"
        }
        
        # Keywords for auxiliary executables to exclude or heavily down-rank
        self.auxiliary_exe_keywords = [
            "unins", "uninstall", "crash", "report", "helper", "setup", "install", 
            "config", "patch", "trial", "demo", "benchmark", "redmod", "creationkit", 
            "modorganizer", "editor", "sdk", "support", "redist", "vcredist", "dxsetup", 
            "oalinst", "physx", "easyanticheat", "battleye", "crashpad", "werfault", 
            "unitycrashhandler", "crashreportclient", "redcrashreporter", "cleanup", 
            "diagnostics", "launcher_helper", "register", "repair", "eula"
        ]
        
        # Extended list of keywords to filter out non-game applications
        self.junk_keywords = [
            "redistributable", "microsoft visual c++", "directx", "vulkan rt",
            "steamworks common", "steamworks", "steam works", "steamapps", "steamlibrary",
            "identityprovider", "tcui", "gamingoverlay",
            "speechtotext", "callableui", "gamebar", "system", "mongodb",
            "eclipse", "sdk", "jdk", "uninstaller", "driver", "setup", "update",
            "error reporter", "crash reporter", "disk cleanup", "usb recovery", 
            "remote desktop", "feedback hub", "voice access", "troubleshoot", 
            "manual", "documentation", "eula", "redist", "support tool", 
            "diagnostic", "telemetry", "license", "read me", "help", "about",
            "unwise", "install", "config", "tool", "editor", "benchmark",
            "dedicated server", "dedicated_server", "server_launcher",
            "battleye", "easyanticheat", "punkbuster", "guardian", "vanguard", "eac",
            "social club", "socialclub", "rockstar games social club", "rockstar launcher",
            # Developer & Scripting tools
            "idle (python", "idle", "python 3", "python 2", "python.exe", "pythonw.exe", "powershell",
            "visual studio", "vscode", "pycharm", "intellij", "clion", "webstorm", "node.js",
            "github desktop", "git bash", "docker desktop", "postman", "anaconda", "miniconda",
            # Media players & Windows UWP system tools
            "zunevideo", "zunemusic", "zune", "movies & tv", "films & tv", "windows media player",
            "groove music", "calculator", "camera", "paint", "notepad", "vlc media player",
            "obs studio", "streamlabs", "discord", "spotify", "google chrome", "mozilla firefox",
            "microsoft edge", "brave", "blender", "unity hub", "unreal engine",
            # Hardware & Tuning utilities
            "msi afterburner", "rivatuner", "geforce experience", "nvidia app",
            "armoury crate", "alienware command center", "awcc", "logitech g hub", "razer synapse"
        ]
        
        self.launcher_whitelist = [
            "steam", "epic games launcher", "epic games", "ea", "ea app", 
            "origin", "ubisoft connect", "ubisoft", "connect", 
            "battle.net", "riot games", "rockstar games", "rockstar", 
            "xbox", "xbox app", "gog galaxy", "amazon games", "itch.io", "humble"
        ]

    def _is_game_valid_and_installed(self, g: dict) -> bool:
        """Verify that a game entry is a valid game and actually exists on disk (not uninstalled/corrupted)."""
        if not isinstance(g, dict) or not g.get("name"):
            return False
            
        name = g.get("name", "").strip()
        name_lower = name.lower()
        platform = g.get("platform", "")
        
        # 0. Container and system directories are NEVER games
        if name_lower in ["steamapps", "steamlibrary", "common", "my games", "games"]:
            return False

        # 1. Allow Whitelisted Platform Launchers (e.g. Steam, Epic, Xbox)
        is_launcher = (g.get("type") == "LAUNCHER") or any(wl == name_lower for wl in self.launcher_whitelist) or (name == platform)
        if is_launcher:
            exe = g.get("exe_path")
            if exe and not exe.startswith("shell:") and not exe.endswith(":") and not os.path.exists(exe):
                return False
            return True

        # Check against library root folder names (e.g. "epic games", "ubisoft games", "program files")
        if name_lower in self.library_root_names:
            return False

        # 2. Check Universal Non-Game & Junk Filter
        if any(junk in name_lower for junk in self.junk_keywords):
            return False

        # 3. Handle UWP / Xbox games
        if platform == "Xbox":
            if any(x in name_lower for x in ["zune", "media", "calculator", "camera", "maps", "weather", "phone", "terminal"]):
                return False
            install_path = g.get("install_path")
            if install_path and not os.path.exists(install_path):
                return False
            return True

        # 4. Verify Local / Steam / Epic / Ubisoft / EA / GOG / Rockstar installation on disk
        install_path = g.get("install_path")
        exe_path = g.get("exe_path")

        if install_path and install_path != "Shortcut":
            if not os.path.exists(install_path):
                return False  # Install directory deleted -> Uninstalled!

            # Check if directory is empty or has zero executable binaries
            try:
                p = Path(install_path)
                if p.is_dir():
                    has_exe = False
                    if exe_path and os.path.exists(exe_path):
                        has_exe = True
                    else:
                        for entry in p.glob("*.exe"):
                            has_exe = True
                            break
                        if not has_exe:
                            for entry in p.glob("*/*.exe"):
                                has_exe = True
                                break
                    if not has_exe:
                        return False  # Empty directory without executables -> Uninstalled remnant!
            except Exception:
                pass

        if exe_path and not exe_path.startswith("shell:") and not exe_path.endswith(":"):
            if not os.path.exists(exe_path):
                if not install_path or not os.path.exists(install_path):
                    return False

        return True

    def _get_exe_product_name(self, exe_path: str) -> Optional[str]:
        """Extract official game title dynamically from Windows executable PE resource metadata.
        Works universally for 100,000+ titles without needing any hardcoded lists.
        """
        if not exe_path or not os.path.exists(exe_path):
            return None
        try:
            import ctypes
            from ctypes import wintypes

            version_dll = ctypes.windll.version
            size = version_dll.GetFileVersionInfoSizeW(str(exe_path), None)
            if not size:
                return None

            res = ctypes.create_string_buffer(size)
            if not version_dll.GetFileVersionInfoW(str(exe_path), 0, size, res):
                return None

            # Look up translation table or common English language code
            translations = ["\\StringFileInfo\\040904b0\\", "\\StringFileInfo\\000004b0\\", "\\StringFileInfo\\040904e4\\"]
            for trans in translations:
                for prop in ["FileDescription", "ProductName"]:
                    sub_block = f"{trans}{prop}"
                    ptr = wintypes.LPVOID()
                    val_len = wintypes.UINT()
                    if version_dll.VerQueryValueW(res, sub_block, ctypes.byref(ptr), ctypes.byref(val_len)) and val_len.value > 1:
                        val = ctypes.wstring_at(ptr)
                        if val and val.strip():
                            clean = val.strip()
                            # Ensure it's not a generic engine wrapper string
                            if clean.lower() not in ["game", "launcher", "application", "setup", "bootstrapper", "win64"]:
                                return clean
        except Exception:
            pass
        return None

    def _resolve_game_root(self, path: Path) -> Path:
        """
        Dynamically ascends the directory hierarchy to resolve the true canonical Game Root.
        Works across any game engine (REDengine, Unreal Engine, Unity, Decima, Source 2, Frostbite)
        by walking up past any architecture, engine, binary, or tool subfolders (e.g. bin/x64,
        redmod/bin, Engine/Binaries/Win64, Project/Binaries/Win64) without crossing library boundaries.
        """
        if not path:
            return path
        
        # If passed a file, start from its directory
        curr = path if path.is_dir() else path.parent
        
        # Walk up while current folder name is a known generic/internal subfolder or crack group
        while curr.parent != curr:
            curr_name_lower = curr.name.lower().strip()
            parent_name_lower = curr.parent.name.lower().strip()
            
            # Stop if current folder is a library root or parent is drive root
            if curr_name_lower in self.library_root_names or curr.parent.parent == curr:
                break
                
            # If parent is a library root, stop ascending unless current is an obvious generic/architecture folder
            if parent_name_lower in self.library_root_names:
                if curr_name_lower not in ["bin", "binaries", "x64", "win64", "win32", "x86", "release", "shipping", "retail", "redmod", "game", "tools"]:
                    break

            # 1. Direct generic subfolder or crack group match
            is_subfolder = (
                curr_name_lower in self.generic_subfolders
                or curr_name_lower in self.crack_groups
                or any(curr_name_lower == g for g in self.generic_subfolders)
                or curr_name_lower.startswith("bin")
                or curr_name_lower.startswith("redmod")
                or (curr_name_lower.startswith("_") and curr_name_lower not in ["_games"])
            )
            
            # 2. Unreal Engine Project / Engine module detection (e.g. <GameRoot>/b1/Binaries or <GameRoot>/Engine/Binaries)
            if not is_subfolder:
                has_engine_sibling = (curr.parent / "Engine").is_dir() or (curr.parent / "engine").is_dir()
                has_binaries_child = (curr / "Binaries").is_dir() or (curr / "binaries").is_dir()
                if (has_engine_sibling or has_binaries_child) and parent_name_lower not in self.library_root_names:
                    is_subfolder = True

            if is_subfolder:
                curr = curr.parent
            else:
                break
                
        return curr

    def _collect_game_executables(self, folder: Path, max_depth: int = 4) -> list[Path]:
        """
        Recursively discover all launchable game executables within a directory tree up to max_depth.
        Skips crack folders, installers, crash tools, and known non-game directories.
        """
        if not folder or not folder.exists() or not folder.is_dir():
            return []

        exes = []
        skip_folder_names = set(self.crack_groups)
        skip_folder_names.update({
            "node_modules", ".git", ".vscode", "temp", "tmp", "logs", 
            "shadercache", "directx", "vcredist", "_commonredist", "support", 
            "installers", "$recycle.bin", "system volume information"
        })

        def walk(curr_dir: Path, depth: int):
            if depth > max_depth:
                return
            try:
                for entry in os.scandir(curr_dir):
                    if entry.is_dir(follow_symlinks=False):
                        entry_lower = entry.name.lower()
                        if entry_lower not in skip_folder_names and not entry.name.startswith(("$", ".")):
                            walk(Path(entry.path), depth + 1)
                    elif entry.is_file(follow_symlinks=False):
                        if entry.name.lower().endswith(".exe"):
                            try:
                                if entry.stat().st_size >= 1024 * 1024:  # 1MB threshold
                                    exes.append(Path(entry.path))
                            except (OSError, IOError):
                                pass
            except (PermissionError, OSError):
                pass

        walk(folder, 0)
        return exes

    def _select_best_exe(self, exes, game_name=""):
        """Select the best executable for starting the game, preferring main game binaries over tools/launchers."""
        if not exes:
            return None
        
        exes_paths = [Path(e) for e in exes if e and Path(e).exists()]
        if not exes_paths:
            return None

        game_name_lower = game_name.lower().strip()
        
        # 1. SPECIAL CASE OVERRIDES:
        if "grand theft auto" in game_name_lower or "gta" in game_name_lower:
            for p in exes_paths:
                if p.name.lower() == "playgtav.exe":
                    return str(p)
        elif "need for speed" in game_name_lower or "nfs" in game_name_lower or "heat" in game_name_lower:
            for p in exes_paths:
                p_name = p.name.lower()
                if p_name in ["nfsheat.exe", "nfs.exe", "needforspeed.exe"] or (p_name.startswith("nfs") and "trial" not in p_name and "demo" not in p_name):
                    return str(p)

        # 2. Filter out crack group executables, trial wrappers, and pure auxiliary binaries
        filtered_exes = []
        for p in exes_paths:
            name_no_ext = p.stem.lower()
            if name_no_ext in self.crack_groups or name_no_ext.startswith("steam_api") or name_no_ext.startswith("steamclient"):
                continue
            in_crack_dir = any(part.lower() in self.crack_groups for part in p.parts[:-1])
            if in_crack_dir:
                continue
            filtered_exes.append(p)
            
        if not filtered_exes:
            filtered_exes = exes_paths
            
        # 3. Dynamic Scoring of Executables
        clean_game_name = "".join(filter(str.isalnum, game_name_lower))
        
        def score_exe(p: Path) -> float:
            score = 0.0
            p_name_lower = p.name.lower()
            p_stem_lower = p.stem.lower()
            p_parts_lower = [part.lower() for part in p.parts[:-1]]
            
            # Check auxiliary penalty in name or any parent directory
            is_auxiliary = any(k in p_name_lower for k in self.auxiliary_exe_keywords)
            in_aux_dir = any(any(k in part for k in ["redmod", "crashreport", "tools", "support", "redist", "easyanticheat", "battleye", "engine", "plugins"]) for part in p_parts_lower)
            
            if is_auxiliary:
                score -= 150.0
            if in_aux_dir:
                score -= 60.0
                
            # Check size
            try:
                size_mb = p.stat().st_size / (1024 * 1024)
            except Exception:
                size_mb = 0
                
            if size_mb < 1.0:
                score -= 50.0  # Under 1MB is likely a small utility or helper
            else:
                score += min(size_mb, 50.0)  # Up to 50 points for larger binary size
                
            # Unreal Engine Shipping binaries
            if "shipping" in p_stem_lower:
                score += 45.0
                
            # Name matching
            clean_stem = "".join(filter(str.isalnum, p_stem_lower))
            if clean_game_name and (clean_stem == clean_game_name or clean_stem in clean_game_name or clean_game_name in clean_stem):
                score += 60.0
                
            # PE Product Name match
            try:
                pe_name = self._get_exe_product_name(str(p))
                if pe_name:
                    clean_pe = "".join(filter(str.isalnum, pe_name.lower()))
                    if clean_game_name and (clean_pe == clean_game_name or clean_pe in clean_game_name or clean_game_name in clean_pe):
                        score += 80.0
            except Exception:
                pass
                
            # Launcher keywords (positive for wrapper/play executables unless penalized by auxiliary)
            if any(k in p_name_lower for k in ["play", "launch", "start"]):
                if not is_auxiliary and not in_aux_dir:
                    score += 20.0
                    
            return score

        scored_exes = sorted(filtered_exes, key=score_exe, reverse=True)
        return str(scored_exes[0])

    def _ensure_cache_dir(self):
        """Ensure the config directory exists."""
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)

    def load_cached_games(self):
        """Return cached results for instant startup.

        Priority order:
        1. Supabase cloud DB (if configured and user_id is known)
        2. Local SQLite DB (E2EE/encrypted if Privacy Shield active)
        3. Local JSON file fallback
        """
        games = []
        # --- 1. Try Supabase ---
        if _DB_MANAGER_AVAILABLE and self.user_id:
            try:
                db = get_db()
                if db.available:
                    res = db.load_games(self.user_id)
                    if res:
                        logger.info(
                            "Loaded %d games from Supabase for user %s",
                            len(res), self.user_id
                        )
                        games = res
            except Exception as exc:
                logger.warning("Supabase load failed, falling back to SQLite: %s", exc)

        # --- 1b. Try Distributed Library Server ---
        if not games and self.user_id:
            library_server_url = os.getenv("LIBRARY_SERVER_URL", "https://mission-control-server-okj7.onrender.com").rstrip("/")
            if library_server_url:
                try:
                    import urllib.request
                    import urllib.parse
                    url = f"{library_server_url}/api/games?installed_only=true&clerk_id={urllib.parse.quote(self.user_id)}"
                    req = urllib.request.Request(url, headers={"User-Agent": "MissionControl-Backend/1.0"})
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        if data and "games" in data:
                            mapped_games = []
                            for g in data["games"]:
                                primary_inst = g.get("installations", [{}])[0] if g.get("installations") else {}
                                mapped_games.append({
                                    "id": g["id"],
                                    "name": g["title"],
                                    "platform": primary_inst.get("store", "PC").upper(),
                                    "install_path": primary_inst.get("install_path", ""),
                                    "exe_path": primary_inst.get("exe_path", ""),
                                    "icon": g.get("coverUrl", ""),
                                    "features": g.get("features", []),
                                    "type": "GAME" if primary_inst.get("store") else "JUNK",
                                    "genre": g.get("primaryGenre", "Action"),
                                    "tags": g.get("tags", []),
                                    "source": primary_inst.get("store", "manual"),
                                    "local_banner": g.get("bannerUrl", "")
                                })
                            if mapped_games:
                                logger.info(
                                    "Loaded %d games from Distributed Library Server for user %s",
                                    len(mapped_games), self.user_id
                                )
                                games = mapped_games
                except Exception as exc:
                    logger.warning("Distributed library server load failed: %s", exc)

        # --- 2. Try Local SQLite cache (with E2EE capability) ---
        if not games:
            try:
                from ai_brain.memory import GameMemory
                mem = GameMemory(config=self.config)
                res = mem.load_local_games(self.user_id)
                if res:
                    logger.info(
                        "Loaded %d games from local SQLite cache for user %s",
                        len(res), self.user_id
                    )
                    games = res
            except Exception as exc:
                logger.warning("Local SQLite load failed, falling back to JSON: %s", exc)

        # --- 3. Local JSON fallback ---
        if not games and self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    games = json.load(f)
            except Exception:
                pass

        # Clean trademark symbols, spaces, normalize names, and purge uninstalled/junk games
        if games:
            cleaned_games = []
            for g in games:
                if not isinstance(g, dict) or not g.get("name"):
                    continue
                name = g["name"]
                for symbol in ["™", "®", "\u2122", "\u00ae"]:
                    name = name.replace(symbol, "")
                name = " ".join(name.split())
                
                # Dynamically resolve official commercial title from executable binary metadata
                if len(name) < 6 or name.lower() in ["game", "play", "launcher", "shipping", "ue4", "sp23", "cod23", "start"]:
                    exe_meta = self._get_exe_product_name(g.get("exe_path"))
                    if exe_meta:
                        name = exe_meta
                g["name"] = name

                # Validate whether game is still installed and is not software junk
                if self._is_game_valid_and_installed(g):
                    cleaned_games.append(g)

            games = cleaned_games

        return games

    def save_games_to_cache(self, games):
        """Persist results to Supabase (primary), local SQLite (backup/E2EE), and JSON (legacy fallback)."""
        # --- 1. Save to Supabase ---
        if _DB_MANAGER_AVAILABLE and self.user_id:
            try:
                db = get_db()
                if db.available:
                    db.save_games(games, self.user_id)
            except Exception as exc:
                logger.warning("Supabase save failed, continuing with SQLite fallback: %s", exc)

        # --- 2. Always write to local SQLite cache (with E2EE capability) ---
        try:
            from ai_brain.memory import GameMemory
            mem = GameMemory(config=self.config)
            mem.save_local_games(self.user_id, games)
        except Exception as exc:
            logger.warning("Local SQLite save failed: %s", exc)

        # --- 3. Write legacy JSON only if Privacy Shield is disabled.
        # Otherwise, delete it to prevent unencrypted leakage.
        if self.config.get("privacy", {}).get("enabled", False):
            try:
                if self.cache_file.exists():
                    self.cache_file.unlink()
                    logger.info("Deleted legacy plaintext JSON cache to protect privacy under E2EE.")
            except Exception as exc:
                logger.warning("Failed to delete plaintext JSON cache: %s", exc)
        else:
            try:
                with open(self.cache_file, "w", encoding="utf-8") as f:
                    json.dump(games, f, indent=2)
            except Exception:
                pass

    def _detect_features(self, game_path):
        """Check for NVIDIA technologies and HDR in the game files."""
        features = []
        try:
            path = Path(game_path)
            if not path.exists(): return features

            dlss_found = False
            fg_found = False
            pt_found = False
            reflex_found = False
            rt_found = False
            physx_found = False
            ansel_found = False
            hdr_files_found = False
            is_frostbite = False
            exes_to_scan = []

            # We limit traversal depth to prevent scanning deep data subfolders (e.g. assets)
            # Increased max_depth to 5 to reach Engine/Binaries/ThirdParty/NVIDIA/ folders
            max_depth = 5
            
            def scan_dir(dir_path, depth):
                nonlocal dlss_found, fg_found, pt_found, reflex_found, rt_found, physx_found, ansel_found, hdr_files_found, is_frostbite
                if depth > max_depth:
                    return
                try:
                    for entry in os.scandir(dir_path):
                        if entry.is_dir(follow_symlinks=False):
                            name_lower = entry.name.lower()
                            # Skip common asset/resource folders to speed up traversal (removed 'engine')
                            if name_lower not in ["assets", "content", "media", "sound", "textures", "resources", "data"]:
                                scan_dir(entry.path, depth + 1)
                        elif entry.is_file(follow_symlinks=False):
                            name_lower = entry.name.lower()
                            
                            # Frostbite Engine detection (EA games natively support HDR)
                            if name_lower.endswith(".cas") or name_lower.endswith(".sb") or name_lower == "initfs_win32":
                                is_frostbite = True
                                
                            # 1. DLSS & Frame Gen & Path Tracing
                            if name_lower == "nvngx_dlss.dll":
                                dlss_found = True
                            elif name_lower == "nvngx_dlssg.dll":
                                dlss_found = True
                                fg_found = True
                            elif name_lower == "nvngx_dlssrr.dll":
                                dlss_found = True
                                rt_found = True
                                pt_found = True
                            # 2. Reflex
                            elif name_lower == "nvlowlatency.dll" or name_lower == "sl.interposer.dll":
                                reflex_found = True
                            # 3. Ray Tracing / RTX
                            elif (name_lower.startswith("d3d12raytracing") or (name_lower.startswith("rtx_") and name_lower.endswith(".dll")) or ("dxr" in name_lower and not any(x in name_lower for x in ["redist", "setup", "install", "dist"]))) and name_lower.endswith(".dll"):
                                rt_found = True
                            # 4. PhysX
                            elif name_lower.startswith("physx"):
                                physx_found = True
                            # 5. Ansel
                            elif name_lower.startswith("anselsdk"):
                                ansel_found = True
                            # 6. HDR asset fallback check
                            elif "hdr" in name_lower and not any(x in name_lower for x in ["crash", "report", "unins"]):
                                hdr_files_found = True
                            # 7. Exes
                            elif name_lower.endswith(".exe"):
                                try:
                                    if entry.stat().st_size > 1024 * 1024:
                                        exes_to_scan.append(entry.path)
                                except Exception:
                                    pass
                except Exception:
                    pass

            scan_dir(game_path, 0)

            if dlss_found: features.append("DLSS")
            if fg_found: features.append("FRAME_GEN")
            if pt_found: features.append("PATH_TRACING")
            if reflex_found: features.append("REFLEX")
            if rt_found: features.append("RTX")
            if physx_found: features.append("PHYSX")
            if ansel_found: features.append("ANSEL")
            
            # Legacy technology is Reflex, PhysX, or Ansel in games without DLSS/RTX
            if (reflex_found or physx_found or ansel_found) and not (dlss_found or rt_found):
                features.append("LEGACY")

            # 6. Dynamic HDR Support Check
            hdr_supported = False
            if hdr_files_found or is_frostbite:
                hdr_supported = True
            else:
                hdr_signatures = [
                    "CheckColorSpaceSupport",
                    "SetColorSpace1",
                    "DXGI_COLOR_SPACE_RGB_",
                    "DXGI_COLOR_SPACE_YCBCR_",
                    "HDR10",
                    "scRGB",
                    "SetHDRMetaData",
                    "ST2084",
                    "VK_COLOR_SPACE_HDR10_",
                    "VK_COLOR_SPACE_EXTENDED_SRGB_LINEAR_EXT",
                    "VK_COLOR_SPACE_HDR10_ST2084_EXT",
                    "VK_EXT_hdr_metadata"
                ]

                # MSVC encodes wide character strings as UTF-16 (little-endian)
                # Compile both UTF-8 and UTF-16LE versions to guarantee matching
                byte_signatures = []
                for sig in hdr_signatures:
                    byte_signatures.append(sig.encode('utf-8'))
                    byte_signatures.append(sig.encode('utf-16le'))
                    byte_signatures.append(sig.lower().encode('utf-8'))
                    byte_signatures.append(sig.lower().encode('utf-16le'))

                # Sort exes by size so we scan the main binaries first
                try:
                    exes_to_scan.sort(key=lambda p: os.path.getsize(p), reverse=True)
                except Exception:
                    pass

                for exe_path in exes_to_scan[:3]: # Scan up to 3 largest executables
                    try:
                        with open(exe_path, "rb") as f:
                            # Read first 15MB (modern EXEs like Frostbite can be 100MB+ with imports deeper in the file)
                            data = f.read(15 * 1024 * 1024)
                            if any(sig in data for sig in byte_signatures):
                                hdr_supported = True
                                break
                    except Exception:
                        pass

            if hdr_supported:
                features.append("HDR")
        except Exception: pass
        return features

    def _is_large_exe(self, exe_path, min_bytes=1024*1024):
        """Check if an executable is a real binary (not a 0-byte stub or icon helper).
        Threshold set to 1MB to fully support lightweight indie games, pixel-art titles, 
        GameMaker/Godot/Love2D projects, and retro games.
        """
        try:
            if exe_path and Path(exe_path).exists():
                size = Path(exe_path).stat().st_size
                return size >= min_bytes
        except Exception:
            pass
        return False

    def _is_in_common_game_dir(self, install_path):
        """Check if the install path resides in a known game directory."""
        if not install_path:
            return False
        path_lower = str(install_path).lower()
        common_markers = [
            "steamapps", "steamlibrary", "epic games", 
            "program files\\steam", "program files (x86)\\steam",
            "program files\\epic games", "program files (x86)\\epic games",
            "ubisoft", "battle.net", "battlenet", "ea desktop",
            "origin", "rockstar games", "amazon games",
            "\\games\\", "\\gog games\\", "\\itch\\", "\\humble games\\"
        ]
        return any(marker in path_lower for marker in common_markers)

    def scan_all(self, progress_callback: Optional[Callable[[int, str], None]] = None):
        """Perform a full scan of all supported platforms."""
        self.games = []
        scan_steps = [
            ("Steam", self._scan_steam),
            ("Epic Games", self._scan_epic),
            ("Ubisoft", self._scan_ubisoft),
            ("Riot", self._scan_riot),
            ("GOG", self._scan_gog),
            ("Xbox", self._scan_xbox),
            ("Battle.net", self._scan_battlenet),
            ("EA Desktop", self._scan_ea_desktop),
            ("Rockstar", self._scan_rockstar),
            ("Amazon", self._scan_amazon),
            ("Itch.io", self._scan_itch),
            ("Humble Bundle", self._scan_humble),
            ("Start Menu", self._scan_start_menu),
            ("Launcher Fallbacks", self._scan_launchers_fallback),
            ("Uninstall Registry", self._scan_uninstall_registry),
            ("Desktop shortcuts", self._scan_desktop),
            ("Common game folders", self._scan_common_paths),
            ("Drive libraries", self._scan_drives),
            ("Custom directories", self._scan_custom_paths),
            ("Deep recursive scan", lambda: self._scan_deep_recursive(max_depth=5)),
        ]

        total_steps = len(scan_steps) + 1
        for index, (label, step) in enumerate(scan_steps):
            if callable(progress_callback):
                progress_callback(int((index / total_steps) * 100), f"Scanning {label}...")
            step()

        # Post-process: Detect features & Filter Junk
        if callable(progress_callback):
            progress_callback(95, "Filtering duplicates and detecting features...")

        unique_games = {}
        for g in self.games:
            if "name" in g and g["name"]:
                name = g["name"]
                for symbol in ["™", "®", "\u2122", "\u00ae", "\x99"]:
                    name = name.replace(symbol, "")
                g["name"] = " ".join(name.split())

                name_lower_clean = g["name"].lower().strip()
                is_generic = (
                    len(name_lower_clean) < 6
                    or name_lower_clean in self.generic_subfolders
                    or name_lower_clean in self.crack_groups
                    or any(name_lower_clean == sub for sub in self.generic_subfolders)
                    or name_lower_clean in ["game", "play", "launcher", "shipping", "ue4", "ue5", "sp23", "cod23", "start", "client", "main", "windows"]
                )
                
                # Dynamically resolve official commercial title from executable binary metadata (works for 100k+ games automatically)
                if is_generic:
                    exe_meta = self._get_exe_product_name(g.get("exe_path"))
                    if exe_meta:
                        g["name"] = exe_meta
                        name_lower_clean = g["name"].lower().strip()

                # Regex to strip crack groups from the end of a game name (e.g., "Ghost of Tsushima - FLT" -> "Ghost of Tsushima")
                import re
                crack_pattern = re.compile(r'[\s\-_]+(?:' + '|'.join(self.crack_groups) + r')\b', re.IGNORECASE)
                cleaned_name = crack_pattern.sub('', g["name"]).strip(' -_()[]')
                if cleaned_name:
                    g["name"] = cleaned_name
                
                name_lower = g["name"].lower()
                name_nospace = name_lower.replace(" ", "")
                
                # If the name is STILL generic (e.g. "bin", "redmod", "x64") or a crack group name, rescue it via _resolve_game_root
                if name_lower in self.crack_groups or name_nospace in self.crack_groups or name_lower in self.generic_subfolders:
                    target_path = Path(g.get("install_path") or g.get("exe_path") or "")
                    if target_path.exists():
                        resolved_root = self._resolve_game_root(target_path)
                        if resolved_root and resolved_root.name and resolved_root.name.lower() not in self.library_root_names:
                            g["name"] = resolved_root.name
                            g["install_path"] = str(resolved_root)
                            name_lower = g["name"].lower()
                        else:
                            continue # Could not rescue
                    else:
                        continue # Drop it

            # Strict installation and non-game validity verification
            if not self._is_game_valid_and_installed(g):
                continue
            
            # If the platform is "Local", try to detect if it actually belongs to a launcher based on its path
            if g.get("platform") == "Local":
                path_to_check = str(g.get("install_path") or g.get("exe_path") or "").lower()
                if path_to_check:
                    if "steamapps" in path_to_check or "steamlibrary" in path_to_check or "program files\\steam" in path_to_check or "program files (x86)\\steam" in path_to_check:
                        g["platform"] = "Steam"
                    elif "epic games" in path_to_check or "program files\\epic games" in path_to_check or "program files (x86)\\epic games" in path_to_check:
                        g["platform"] = "Epic Games"
                    elif "ubisoft" in path_to_check:
                        g["platform"] = "Ubisoft Connect"
                    elif "battle.net" in path_to_check or "battlenet" in path_to_check:
                        g["platform"] = "Battle.net"
                    elif "ea desktop" in path_to_check or "origin" in path_to_check:
                        g["platform"] = "EA Desktop"
                    elif "rockstar games" in path_to_check:
                        g["platform"] = "Rockstar Games"
                    elif "amazon games" in path_to_check:
                        g["platform"] = "Amazon Games"
                    elif "gog games" in path_to_check:
                        g["platform"] = "GOG Galaxy"
                    elif "itch" in path_to_check:
                        g["platform"] = "Itch.io"
                    elif "humble games" in path_to_check:
                        g["platform"] = "Humble Bundle"

            # Feature Detection - do this early for Local entries
            if "install_path" in g and g["install_path"]:
                g["features"] = self._detect_features(g["install_path"])
            else:
                g["features"] = []

            # Local/Desktop entry filtering: accept if evidence of being a game
            # NOTE: NVIDIA features (DLSS/RTX/Reflex) are NOT required — this
            #       allows retro / pre-DLSS titles (e.g. Far Cry 4, 2014) to appear.
            if g["platform"] == "Local":
                has_large_exe = self._is_large_exe(g.get("exe_path"))  # >=20MB
                in_game_dir = self._is_in_common_game_dir(g.get("install_path"))
                # Filter out "HDR" from features check for local/desktop apps because non-game desktop applications commonly support HDR
                gaming_features = [f for f in g.get("features", []) if f != "HDR"]
                has_features = len(gaming_features) > 0

                # Accept if: large exe in a known game directory, OR has NVIDIA features,
                # OR was found via manual scan methods (trusted sources).
                is_game = (has_large_exe and in_game_dir) or has_features or g.get("source") in ["deep_scan", "common_paths", "drive_scan", "custom_path"]

                if not is_game:
                    continue
            
            # Name Cleanup (e.g. "Arnab - Chrome" -> "Chrome")
            if " - " in g["name"] and g["platform"] == "Local":
                parts = g["name"].split(" - ")
                if len(parts) > 1:
                    g["name"] = parts[-1] # Take the app name part
            
            # Advanced Name Normalization for Duplicate Detection
            # This handles cases like "Epic Games" vs "Epic Games Launcher" vs "EpicGames"
            import re
            name_lower = g.get("name", "").lower().strip()
            is_whitelisted = any(wl == name_lower for wl in self.launcher_whitelist)
            
            # Whitelisted launcher entries bypass word-stripping normalization initially to prevent
            # "Ubisoft Connect" / "GOG Galaxy" / "EA Desktop" from colliding with each other
            # (all would reduce to "ubisoft", "gog", "ea" respectively and overwrite one another).
            # However, we perform a controlled strip on launcher-specific keywords to ensure variations like
            # "Epic Games" vs "Epic Games Launcher" deduplicate cleanly.
            if is_whitelisted:
                clean_name = "".join(filter(str.isalnum, name_lower)).lower()
                clean_name = clean_name.replace("launcher", "").replace("app", "").replace("desktop", "").replace("connect", "").replace("games", "")
            else:
                norm_name = re.sub(r'\[.*?\]', '', name_lower)
                norm_name = re.sub(r'\(.*?\)', '', norm_name)
                # Alias normalization: resolve common title acronyms to canonical full names
                norm_name = re.sub(r'\bgtav\b|\bgta\s*v\b|\bgta\s*5\b', 'grand theft auto v', norm_name)
                norm_name = re.sub(r'\bgtaiv\b|\bgta\s*iv\b|\bgta\s*4\b', 'grand theft auto iv', norm_name)
                norm_name = re.sub(r'\brdr2\b|\bred\s*dead\s*2\b', 'red dead redemption 2', norm_name)
                norm_name = re.sub(r'\bnfs\b', 'need for speed', norm_name)
                norm_name = norm_name.replace("launcher", "").replace("app", "").replace("desktop", "").replace("connect", "").replace("games", "").strip()
                clean_name = "".join(filter(str.isalnum, norm_name)).lower()

            
            # If the name becomes empty after normalization (unlikely for real games), use full clean name
            if not clean_name:
                clean_name = "".join(filter(str.isalnum, g["name"])).lower()

            if clean_name not in unique_games:
                unique_games[clean_name] = g
            else:
                # Prefer launcher-derived entries over Local duplicates
                existing = unique_games[clean_name]
                
                # Merge missing metadata keys between duplicate entries (preserve paths, banners, icons)
                for key in ["exe_path", "install_path", "icon", "local_banner"]:
                    if not existing.get(key) and g.get(key):
                        existing[key] = g[key]
                    elif not g.get(key) and existing.get(key):
                        g[key] = existing[key]

                platforms_to_prefer = (
                    "Steam", "Epic Games", "GOG Galaxy", 
                    "Battle.net", "Ubisoft Connect", "Riot Games",
                    "EA Desktop", "Origin", "Rockstar Games", "Xbox"
                )
                if g["platform"] in platforms_to_prefer and existing["platform"] == "Local":
                    unique_games[clean_name] = g
                elif g["platform"] == "Steam" and existing["platform"] != "Steam":
                    unique_games[clean_name] = g
                elif g.get("exe_path") and not existing.get("exe_path"):
                    unique_games[clean_name] = g
                elif len(g["name"]) > len(existing["name"]) and not (existing.get("exe_path") and not g.get("exe_path")):
                    # Prefer standard full title (e.g. "Grand Theft Auto V Enhanced" over "GTAV Enhanced")
                    unique_games[clean_name] = g
                elif g["platform"] == "Local" and existing["platform"] == "Local":
                    # Prefer the entry with a shorter name to drop verbose suffixes like [FitGirl Repack]
                    if len(g["name"]) < len(existing["name"]):
                        unique_games[clean_name] = g
        
        self.games = list(unique_games.values())
        
        # Post-scan enrichment: Classify games using AI if possible
        if callable(progress_callback):
            progress_callback(95, "Enriching library with AI classification...")
        self.enrich_with_ai()

        # Filter out non-gaming software classified by AI
        self.games = [g for g in self.games if g.get("type") != "SOFTWARE"]

        # Final pass: Ensure strictly ONE launcher entry per platform
        launcher_platforms = ["Steam", "Epic Games", "EA Desktop", "Origin", "Ubisoft Connect", "Battle.net", "GOG Galaxy", "Rockstar Games", "Xbox"]
        seen_launchers = set()
        final_games = []
        
        # Sort games to prefer entries with "Launcher" or exact platform name
        sorted_games = sorted(self.games, key=lambda g: ("Launcher" not in (g.get("name") or "") and g.get("name") != g.get("platform"), len(g.get("name") or "")))
        for g in sorted_games:
            name_lower = g.get("name", "").lower().strip()
            is_launcher = (g.get("type") == "LAUNCHER") or any(wl == name_lower for wl in self.launcher_whitelist) or (g.get("name") == g.get("platform"))
            
            if is_launcher and g.get("platform") in launcher_platforms:
                if g["platform"] not in seen_launchers:
                    seen_launchers.add(g["platform"])
                    # Standardize display name to platform name
                    g["name"] = g["platform"]
                    final_games.append(g)
            else:
                final_games.append(g)
        self.games = final_games
        # Enrich game features from PCGamingWiki (web-sourced, authoritative)
        if callable(progress_callback):
            progress_callback(96, "Fetching hardware features from PCGamingWiki...")
        self._enrich_with_pcgw()
        
        # Post-scan banner search and icon extraction for local / non-steam games
        if callable(progress_callback):
            progress_callback(97, "Searching artwork and extracting icons...")
            
        # 1. Concurrent Steam banner searches
        banner_targets = []
        for g in self.games:
            is_launcher = g.get("type") == "LAUNCHER"
            has_valid_banner = False
            if g.get("local_banner") or (g.get("platform") == "Steam" and not is_launcher):
                has_valid_banner = True
            if not has_valid_banner and not is_launcher:
                banner_targets.append(g)

        if banner_targets:
            import concurrent.futures
            # Limit workers to 8 to avoid rate limits
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                future_to_game = {
                    executor.submit(self._search_steam_banner, g["name"]): g
                    for g in banner_targets
                }
                for future in concurrent.futures.as_completed(future_to_game):
                    g = future_to_game[future]
                    try:
                        banner_url = future.result()
                        if banner_url:
                            g["local_banner"] = banner_url
                    except Exception as e:
                        logger.error(f"Failed concurrent banner search for {g['name']}: {e}")

        # 2. Batch local icon extraction
        icons_to_extract = []
        for g in self.games:
            has_valid_icon = False
            if g.get("icon"):
                try:
                    if g["icon"].startswith("http"):
                        has_valid_icon = True
                    else:
                        icon_path = Path(g["icon"])
                        if icon_path.exists() and icon_path.suffix.lower() in [".png", ".jpg", ".jpeg", ".ico", ".svg"]:
                            has_valid_icon = True
                except Exception:
                    pass
            if not has_valid_icon and g.get("exe_path"):
                icons_to_extract.append(g)

        if icons_to_extract:
            self._extract_exe_icons_batch(icons_to_extract)

        self.save_games_to_cache(self.games)
        if callable(progress_callback):
            progress_callback(100, f"Found {len(self.games)} games")
        return self.games

    def _search_steam_banner(self, name: str) -> Optional[str]:
        """Search Steam Store API for a game's banner/header URL by its name."""
        import requests
        import re
        
        try:
            # Clean name for search (remove common suffixes and tags)
            clean_name = name
            clean_name = re.sub(r'\[.*?\]', '', clean_name)
            clean_name = re.sub(r' (DC|Director\'s Cut|Director|Enhanced|Remastered|Edition|GOTY|Complete|Collection|Digital|Version|Repack|Build|NoDVD).*', '', clean_name, flags=re.IGNORECASE)
            clean_name = re.sub(r'[™®©]', '', clean_name)
            clean_name = re.sub(r'\(.*\)', '', clean_name).strip()
            
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
            
            appid = None
            for query in [clean_name, name]:
                if not query:
                    continue
                search_url = f"https://store.steampowered.com/api/storesearch/?term={requests.utils.quote(query)}&l=english&cc=US"
                resp = requests.get(search_url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("total", 0) > 0:
                        appid = data["items"][0]["id"]
                        break
            
            if appid:
                header_url = f"https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg"
                img_resp = requests.head(header_url, headers=headers, timeout=3)
                if img_resp.status_code == 200:
                    return header_url
        except Exception as e:
            logger.error(f"Failed to search Steam banner for {name}: {e}")
            
        return None

    def _extract_exe_icon(self, exe_path: str, game_id: str) -> Optional[str]:
        """Extract the icon from an executable and save it as a PNG file."""
        if not exe_path or not os.path.exists(exe_path):
            return None
            
        try:
            icons_dir = Path(__file__).parent.parent / "data" / "icons"
            icons_dir.mkdir(parents=True, exist_ok=True)
            
            safe_id = "".join(c for c in game_id if c.isalnum() or c in ("_", "-")).rstrip()
            if not safe_id:
                safe_id = "unknown"
            
            icon_file = icons_dir / f"{safe_id}.png"
            
            # Overwrite legacy low-resolution icons (typically < 10KB)
            if icon_file.exists() and icon_file.stat().st_size > 10240:
                return str(icon_file)
                
            exe_posix = Path(exe_path).as_posix()
            icon_posix = Path(icon_file).as_posix()
            
            ps_cmd = f'''
            Add-Type -AssemblyName System.Drawing
            $Win32Code = @"
            using System;
            using System.Runtime.InteropServices;
            public class Win32Icon {{
                [DllImport("user32.dll", CharSet = CharSet.Unicode)]
                public static extern uint PrivateExtractIcons(
                    string lpszFile,
                    int nIconIndex,
                    int cxIcon,
                    int cyIcon,
                    IntPtr[] phicon,
                    int[] piconid,
                    uint nIcons,
                    uint flags
                );
                [DllImport("user32.dll")]
                public static extern int DestroyIcon(IntPtr hIcon);
            }}
"@
            if (-not ("Win32Icon" -as [type])) {{
                Add-Type -TypeDefinition $Win32Code
            }}
            try {{
                $phicon = New-Object IntPtr[] 1
                $piconid = New-Object int[] 1
                $extracted = [Win32Icon]::PrivateExtractIcons("{exe_posix}", 0, 256, 256, $phicon, $piconid, 1, 0)
                if ($extracted -ne 0 -and $phicon[0] -ne [IntPtr]::Zero) {{
                    $icon = [System.Drawing.Icon]::FromHandle($phicon[0])
                    $bitmap = $icon.ToBitmap()
                    $bitmap.Save("{icon_posix}", [System.Drawing.Imaging.ImageFormat]::Png)
                    $bitmap.Dispose()
                    $icon.Dispose()
                    [Win32Icon]::DestroyIcon($phicon[0]) | Out-Null
                    Write-Output "SUCCESS"
                }} else {{
                    # Fallback to standard ExtractAssociatedIcon
                    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon("{exe_posix}")
                    $bitmap = $icon.ToBitmap()
                    $bitmap.Save("{icon_posix}", [System.Drawing.Imaging.ImageFormat]::Png)
                    $bitmap.Dispose()
                    $icon.Dispose()
                    Write-Output "SUCCESS"
                }}
            }} catch {{
                Write-Output "ERROR: $_"
            }}
            '''
            
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            res = subprocess.run(
                ["powershell", "-Command", ps_cmd],
                capture_output=True,
                text=True,
                startupinfo=si,
                close_fds=True
            )
            
            if res.returncode == 0 and "SUCCESS" in res.stdout:
                return str(icon_file)
        except Exception as e:
            logger.error(f"Failed to extract icon for {exe_path}: {e}")
            
        return None

    def _extract_exe_icons_batch(self, games_to_extract) -> None:
        """Extract icons for multiple games in a single PowerShell process to avoid startup overhead."""
        if not games_to_extract:
            return

        try:
            icons_dir = Path(__file__).parent.parent / "data" / "icons"
            icons_dir.mkdir(parents=True, exist_ok=True)

            extractions = []
            for g in games_to_extract:
                exe_path = g.get("exe_path")
                game_id = g.get("id")
                if not exe_path or not os.path.exists(exe_path):
                    continue
                    
                safe_id = "".join(c for c in game_id if c.isalnum() or c in ("_", "-")).rstrip()
                if not safe_id:
                    safe_id = "unknown"
                    
                icon_file = icons_dir / f"{safe_id}.png"
                # Overwrite legacy low-resolution icons (typically < 10KB)
                if icon_file.exists() and icon_file.stat().st_size > 10240:
                    g["icon"] = str(icon_file)
                    continue
                    
                extractions.append({
                    "game": g,
                    "exe_posix": Path(exe_path).as_posix(),
                    "icon_posix": Path(icon_file).as_posix(),
                    "icon_file_str": str(icon_file)
                })

            if not extractions:
                return

            logger.info(f"Extracting {len(extractions)} icons in a single PowerShell batch...")

            inputs = []
            for ext in extractions:
                inputs.append(f'$inputs += ,@("{ext["exe_posix"]}", "{ext["icon_posix"]}")')
                
            inputs_str = "\n".join(inputs)
            
            ps_cmd = f'''
            Add-Type -AssemblyName System.Drawing
            $Win32Code = @"
            using System;
            using System.Runtime.InteropServices;
            public class Win32Icon {{
                [DllImport("user32.dll", CharSet = CharSet.Unicode)]
                public static extern uint PrivateExtractIcons(
                    string lpszFile,
                    int nIconIndex,
                    int cxIcon,
                    int cyIcon,
                    IntPtr[] phicon,
                    int[] piconid,
                    uint nIcons,
                    uint flags
                );
                [DllImport("user32.dll")]
                public static extern int DestroyIcon(IntPtr hIcon);
            }}
"@
            if (-not ("Win32Icon" -as [type])) {{
                Add-Type -TypeDefinition $Win32Code
            }}
            $inputs = @()
            {inputs_str}
            foreach ($item in $inputs) {{
                $exe = $item[0]
                $icon_file = $item[1]
                try {{
                    if (Test-Path $exe) {{
                        $phicon = New-Object IntPtr[] 1
                        $piconid = New-Object int[] 1
                        $extracted = [Win32Icon]::PrivateExtractIcons($exe, 0, 256, 256, $phicon, $piconid, 1, 0)
                        if ($extracted -ne 0 -and $phicon[0] -ne [IntPtr]::Zero) {{
                            $icon = [System.Drawing.Icon]::FromHandle($phicon[0])
                            $bitmap = $icon.ToBitmap()
                            $bitmap.Save($icon_file, [System.Drawing.Imaging.ImageFormat]::Png)
                            $bitmap.Dispose()
                            $icon.Dispose()
                            [Win32Icon]::DestroyIcon($phicon[0]) | Out-Null
                            Write-Output "SUCCESS|$icon_file"
                        }} else {{
                            # Fallback
                            $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
                            $bitmap = $icon.ToBitmap()
                            $bitmap.Save($icon_file, [System.Drawing.Imaging.ImageFormat]::Png)
                            $bitmap.Dispose()
                            $icon.Dispose()
                            Write-Output "SUCCESS|$icon_file"
                        }}
                    }}
                }} catch {{
                    Write-Output "ERROR|$icon_file|$_"
                }}
            }}
            '''
            
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            res = subprocess.run(
                ["powershell", "-Command", ps_cmd],
                capture_output=True,
                text=True,
                startupinfo=si,
                close_fds=True,
                timeout=30
            )
            
            successful_paths = set()
            if res.returncode == 0:
                for line in res.stdout.strip().split("\n"):
                    if line.startswith("SUCCESS|"):
                        parts = line.split("|", 1)
                        if len(parts) > 1:
                            successful_paths.add(parts[1].strip().lower())
                            
            for ext in extractions:
                if ext["icon_posix"].lower() in successful_paths:
                    ext["game"]["icon"] = ext["icon_file_str"]
                elif Path(ext["icon_file_str"]).exists():
                    ext["game"]["icon"] = ext["icon_file_str"]
        except Exception as e:
            logger.error(f"Batch icon extraction failed: {e}", exc_info=True)

    def enrich_with_ai(self):
        """Use GameBrain to classify and tag discovered games."""
        try:
            from ai_brain.decision_maker import GameBrain
            # We initialize a temporary brain for classification
            brain = GameBrain(config=self.config)
            
            # Load cache to avoid redundant AI queries
            cached_games = self.load_cached_games()
            cache_lookup = {}
            for cg in cached_games:
                if cg.get("name") and cg.get("type"):
                    name_lower = cg["name"].strip().lower()
                    cg_type = cg.get("type")
                    
                    # Bypass cached LAUNCHER classification if the name is not in the launcher whitelist (re-classify false-positives)
                    if cg_type == "LAUNCHER" and not any(wl == name_lower for wl in self.launcher_whitelist):
                        continue
                        
                    # Re-classify games that contain old graphics hardware features or have too many tags to align with the new tag policy
                    cg_tags = cg.get("tags", [])
                    forbidden_tags = {
                        "DLSS", "FRAME_GEN", "FRAME GEN", "REFLEX", "RAY_TRACING", "RAY TRACING",
                        "PATH_TRACING", "PATH TRACING", "PHYSX", "ANSEL", "HDR"
                    }
                    if len(cg_tags) > 3 or any(t.upper() in forbidden_tags for t in cg_tags) or (cg_type == "GAME" and not cg_tags):
                        continue
                        
                    cache_lookup[name_lower] = {
                        "type": cg_type,
                        "genre": cg.get("genre"),
                        "tags": cg_tags
                    }

            # Filter games that need classification
            uncategorized_games = []
            for game in self.games:
                name_lower = game["name"].strip().lower()
                if name_lower in cache_lookup:
                    game["type"] = cache_lookup[name_lower]["type"]
                    game["genre"] = cache_lookup[name_lower]["genre"]
                    game["tags"] = cache_lookup[name_lower]["tags"]
                else:
                    uncategorized_games.append(game)
            
            if uncategorized_games:
                logger.info(f"Enriching {len(uncategorized_games)} new games with AI classification...")
                import concurrent.futures
                
                # Classify uncategorized games in parallel (up to 8 threads)
                with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                    future_to_game = {
                        executor.submit(brain.classify_game_title, game["name"]): game
                        for game in uncategorized_games
                    }
                    for future in concurrent.futures.as_completed(future_to_game):
                        game = future_to_game[future]
                        try:
                            classification = future.result()
                            if classification:
                                game["type"] = classification.get("type", "GAME")
                                game["genre"] = classification.get("genre", "CLASSIC")
                                game["tags"] = classification.get("tags", [])
                            else:
                                raise ValueError("Invalid classification result")
                        except Exception as e:
                            logger.error(f"Failed to classify {game['name']}: {e}")
                            # Fallback on classification error
                            game["type"] = "GAME"
                            game["genre"] = "CLASSIC"
                            game["tags"] = []

            # Local Asset Search: Look for banners/backgrounds in install dir
            for game in self.games:
                if game.get("install_path"):
                    try:
                        p = Path(game["install_path"])
                        if p.exists():
                            # Common naming patterns for local game artwork
                            banner_cands = ["banner.jpg", "banner.png", "background.jpg", "background.png", "header.jpg", "logo.png"]
                            for cand in banner_cands:
                                cp = p / cand
                                if cp.exists():
                                    game["local_banner"] = str(cp)
                                    break
                    except Exception: pass
                
        except Exception as e:
            logger.error(f"AI enrichment failed: {e}. Using smart local fallback.")
            # Smart local fallback if AI fails
            import re
            launchers = ["launcher", "steam", "epic", "ea", "origin", "ubisoft", "connect", "battle.net", "riot", "rockstar", "xbox"]
            software_keywords = [
                "visual studio", "mysql", "workbench", "chrome", "firefox", "word", 
                "excel", "photoshop", "zoom", "slack", "teams", "discord", "spotify", 
                "vscode", "devenv", "docker", "postman", "git", "nodejs", "python",
                "intellij", "android studio", "acrobat", "office", "powerpoint", "outlook"
            ]
            software_pattern = r"\b(" + "|".join(re.escape(s) for s in software_keywords) + r")\b"
            launcher_pattern = r"\b(" + "|".join(re.escape(l) for l in launchers) + r")\b"
            
            for game in self.games:
                name_lower = game["name"].lower()
                if "type" not in game or game["type"] == "GAME":
                    if re.search(software_pattern, name_lower):
                        game["type"] = "SOFTWARE"
                        game["genre"] = "PRODUCTIVITY"
                        game["tags"] = []
                    elif name_lower in self.launcher_whitelist or name_lower in ["ea desktop", "epic games launcher", "epic games", "battle.net launcher", "ubisoft connect launcher", "rockstar games launcher"]:
                        game["type"] = "LAUNCHER"
                        game["genre"] = "PLATFORM"
                        game["tags"] = ["SYSTEM"]
                    else:
                        game["type"] = "GAME"
                        game["genre"] = "CLASSIC"
                        game["tags"] = []
                if "genre" not in game:
                    game["genre"] = "CLASSIC"

    def _enrich_with_pcgw(self):
        """Merge PCGamingWiki-sourced hardware features into each game's feature list.

        Queries PCGW for confirmed support of DLSS, Frame Gen, Ray Tracing,
        Path Tracing, NVIDIA Reflex, and HDR. Results are cached for 30 days
        so subsequent scans are instant. Runs in a ThreadPoolExecutor capped
        at 4 workers to respect PCGW's rate limits.
        """
        try:
            from system.pcgw_integration import fetch_pcgw_features
        except ImportError:
            try:
                from pcgw_integration import fetch_pcgw_features
            except ImportError:
                logger.warning("pcgw_integration module not found, skipping PCGW enrichment.")
                return

        import concurrent.futures

        # Only enrich actual games, not launchers or software
        game_targets = [
            g for g in self.games
            if g.get("type", "GAME") == "GAME"
        ]

        if not game_targets:
            return

        logger.info("Enriching %d games with PCGamingWiki hardware features...", len(game_targets))

        def _fetch_and_merge(game: dict):
            try:
                pcgw_features = fetch_pcgw_features(game["name"])
                if pcgw_features:
                    # Merge with locally-detected features (union, deduplicated)
                    existing = set(game.get("features") or [])
                    merged = sorted(existing | set(pcgw_features))
                    game["features"] = merged
            except Exception as e:
                logger.debug("PCGW enrichment failed for '%s': %s", game.get("name"), e)

        # Use 4 workers max — PCGW has a 0.5 req/s rate limit enforced in the module
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(_fetch_and_merge, g) for g in game_targets]
            concurrent.futures.wait(futures)

        logger.info("PCGamingWiki enrichment complete.")

    def _scan_custom_paths(self):
        """Scan custom directories specified by the user in settings."""
        custom_dirs = self.config.get("scanner", {}).get("custom_scan_dirs", [])
        if not custom_dirs:
            return

        for dir_str in custom_dirs:
            if not dir_str:
                continue
            root_path = Path(dir_str)
            if not root_path.exists() or not root_path.is_dir():
                continue

            try:
                is_library_container = (
                    root_path.name.lower() in self.library_root_names
                    or any(sub.is_dir() and not sub.name.startswith(("$", ".")) for sub in root_path.iterdir() if sub.name.lower() not in self.generic_subfolders)
                )
                
                # Check if root_path itself is a single game
                has_direct_exe = any(
                    e.is_file() and e.name.lower().endswith(".exe") 
                    for e in os.scandir(root_path)
                )
                has_direct_game_sub = any(
                    (root_path / s).is_dir() for s in ["bin", "binaries", "r6"]
                )

                if (has_direct_exe or has_direct_game_sub) and root_path.name.lower() not in self.library_root_names:
                    # Single game directory
                    direct_exes = self._collect_game_executables(root_path, max_depth=3)
                    if direct_exes:
                        game_root = self._resolve_game_root(root_path)
                        best_exe = self._select_best_exe(direct_exes, game_root.name)
                        title = self._get_exe_product_name(best_exe) or game_root.name
                        self.games.append({
                            "name": title,
                            "platform": "Local",
                            "id": f"custom_{game_root.name}",
                            "install_path": str(game_root),
                            "exe_path": best_exe,
                            "source": "custom_path"
                        })
                else:
                    # Library container containing subdirectories
                    for game_dir in root_path.iterdir():
                        if game_dir.is_dir():
                            if game_dir.name.startswith(("$", ".")) or game_dir.name.lower() in self.crack_groups:
                                continue
                            sub_exes = self._collect_game_executables(game_dir, max_depth=3)
                            if sub_exes:
                                game_root = self._resolve_game_root(game_dir)
                                best_exe = self._select_best_exe(sub_exes, game_root.name)
                                title = self._get_exe_product_name(best_exe) or game_root.name
                                self.games.append({
                                    "name": title,
                                    "platform": "Local",
                                    "id": f"custom_{game_root.name}",
                                    "install_path": str(game_root),
                                    "exe_path": best_exe,
                                    "source": "custom_path"
                                })
            except Exception as e:
                logger.error(f"Error scanning custom path {dir_str}: {e}")

    def _scan_drives(self):
        """Scan all local fixed drives for 'Games' or 'SteamLibrary' folders."""
        import psutil
        try:
            drives = [p.mountpoint for p in psutil.disk_partitions() if 'fixed' in p.opts or 'cdrom' not in p.opts]
        except Exception:
            drives = [f"{d}:\\" for d in "CDEFG" if os.path.exists(f"{d}:\\")]
        common_dirs = ["Games", "SteamLibrary", "Epic Games", "Ubisoft Game Launcher"]
        
        for drive in drives:
            for d in common_dirs:
                path = Path(drive) / d
                if path.exists() and path.is_dir():
                    for sub in path.iterdir():
                        if sub.is_dir():
                            if sub.name.startswith(("$", ".")) or sub.name.lower() in self.crack_groups:
                                continue
                            # If sub is "steamapps", drill down into "steamapps/common" to find actual games
                            if sub.name.lower() == "steamapps":
                                common_sub = sub / "common"
                                if common_sub.exists() and common_sub.is_dir():
                                    for steam_game_dir in common_sub.iterdir():
                                        if steam_game_dir.is_dir() and not steam_game_dir.name.startswith(("$", ".")) and steam_game_dir.name.lower() not in self.library_root_names:
                                            exes = self._collect_game_executables(steam_game_dir, max_depth=3)
                                            if exes:
                                                game_root = self._resolve_game_root(steam_game_dir)
                                                if game_root.name.lower() in self.library_root_names:
                                                    continue
                                                best_exe = self._select_best_exe(exes, game_root.name)
                                                title = self._get_exe_product_name(best_exe) or game_root.name
                                                self.games.append({
                                                    "name": title,
                                                    "platform": "Steam",
                                                    "id": f"{drive}_{game_root.name}",
                                                    "install_path": str(game_root),
                                                    "exe_path": best_exe,
                                                    "source": "drive_scan"
                                                })
                                continue
                            if sub.name.lower() in self.library_root_names:
                                continue

                            exes = self._collect_game_executables(sub, max_depth=3)
                            if exes:
                                game_root = self._resolve_game_root(sub)
                                if game_root.name.lower() in self.library_root_names:
                                    continue
                                best_exe = self._select_best_exe(exes, game_root.name)
                                title = self._get_exe_product_name(best_exe) or game_root.name
                                self.games.append({
                                    "name": title,
                                    "platform": "Local",
                                    "id": f"{drive}_{game_root.name}",
                                    "install_path": str(game_root),
                                    "exe_path": best_exe,
                                    "source": "drive_scan"
                                })

    def _scan_steam(self):
        """Scan for Steam games."""
        try:
            # Get Steam install path from registry
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
            steam_path, _ = winreg.QueryValueEx(key, "SteamPath")
            winreg.CloseKey(key)
            
            steam_path = Path(steam_path.replace("/", os.sep))
            library_vdf = steam_path / "steamapps" / "libraryfolders.vdf"
            
            if not library_vdf.exists():
                return

            # Simple VDF parser for library folders
            with open(library_vdf, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Find all "path" entries
            import re
            paths = re.findall(r'"path"\s+"([^"]+)"', content)
            
            for lib_path in paths:
                lib_path = Path(lib_path.replace("\\\\", "\\"))
                apps_path = lib_path / "steamapps"
                if not apps_path.exists():
                    continue
                
                # Scan .acf files
                for acf in apps_path.glob("appmanifest_*.acf"):
                    try:
                        with open(acf, "r", encoding="utf-8", errors="ignore") as f:
                            acf_content = f.read()
                        
                        name_match = re.search(r'"name"\s+"([^"]+)"', acf_content)
                        id_match = re.search(r'"appid"\s+"([^"]+)"', acf_content)
                        install_dir_match = re.search(r'"installdir"\s+"([^"]+)"', acf_content)
                        flags_match = re.search(r'"StateFlags"\s+"([^"]+)"', acf_content)
                        
                        if name_match and id_match and install_dir_match:
                            game_name = name_match.group(1)
                            for symbol in ["™", "®", "\u2122", "\u00ae", "\x99"]:
                                game_name = game_name.replace(symbol, "")
                            game_name = " ".join(game_name.split())

                            # Normalize internal project codenames
                            if game_name.lower() in ["sp23", "cod23", "cod 2023"]:
                                game_name = "Call of Duty: Modern Warfare III"
                            elif game_name.lower() in ["sp22", "cod22", "cod 2022"]:
                                game_name = "Call of Duty: Modern Warfare II"
                            elif game_name.lower() in ["sp24", "cod24", "cod 2024"]:
                                game_name = "Call of Duty: Black Ops 6"

                            app_id = id_match.group(1)
                            install_dir = install_dir_match.group(1)
                            install_path = apps_path / "common" / install_dir

                            # VERIFICATION: If directory does not exist on disk, game is uninstalled!
                            if not install_path.exists():
                                continue
                            
                            # Try to find the primary .exe for icon extraction
                            resolved_exe = None
                            try:
                                exes = list(install_path.glob("*.exe"))
                                if not exes:
                                    # Recursive glob but exclude known crack/nodvd subdirs
                                    all_exes = list(install_path.glob("**/*.exe"))
                                    exes = [
                                        e for e in all_exes
                                        if not any(part.lower() in self.crack_groups for part in e.relative_to(install_path).parts[:-1])
                                    ] or all_exes
                                if exes:
                                    resolved_exe = self._select_best_exe(exes, game_name)
                            except Exception: pass

                            # If no executable exists in install folder, it's an uninstalled remnant
                            if not resolved_exe and not list(install_path.glob("*.exe")) and not list(install_path.glob("*/*.exe")):
                                continue

                            self.games.append({
                                "name": game_name,
                                "platform": "Steam",
                                "id": app_id,
                                "install_path": str(install_path),
                                "exe_path": resolved_exe,
                                "icon": str(steam_path / "appcache" / "librarycache" / f"{app_id}_icon.jpg")
                            })
                    except Exception as e:
                        logger.error(f"Error parsing Steam acf {acf}: {e}")
                        
        except Exception as e:
            logger.error(f"Steam scan failed: {e}")
        
        # Add Steam Launcher itself if not present
        if not any(g["name"] == "Steam" for g in self.games):
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
                steam_exe, _ = winreg.QueryValueEx(key, "SteamExe")
                winreg.CloseKey(key)
                if steam_exe and os.path.exists(steam_exe):
                    self.games.append({
                        "name": "Steam",
                        "platform": "Steam",
                        "id": "steam_launcher",
                        "install_path": str(Path(steam_exe).parent),
                        "exe_path": str(steam_exe)
                    })
            except Exception: pass

    def _scan_epic(self):
        """Scan for Epic Games."""
        manifest_path = Path(os.environ.get("ProgramData", "C:\\ProgramData")) / "Epic" / "EpicGamesLauncher" / "Data" / "Manifests"
        if not manifest_path.exists():
            return

        for item in manifest_path.glob("*.item"):
            try:
                with open(item, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                self.games.append({
                    "name": data.get("DisplayName"),
                    "platform": "Epic Games",
                    "id": data.get("AppName"),
                    "install_path": data.get("InstallLocation"),
                    "exe_path": data.get("LaunchExecutable"),
                })
            except Exception as e:
                logger.error(f"Error parsing Epic manifest {item}: {e}")
        
        # Add Epic Games Launcher itself if not present
        if not any(g["name"] == "Epic Games Launcher" for g in self.games):
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\EpicGames\Unreal Engine")
                install_root, _ = winreg.QueryValueEx(key, "INSTALLATIONMSIDIR")
                winreg.CloseKey(key)
                if install_root:
                    launcher_exe = Path(install_root) / "Launcher" / "Portal" / "Binaries" / "Win64" / "EpicGamesLauncher.exe"
                    if launcher_exe.exists():
                        self.games.append({
                            "name": "Epic Games Launcher",
                            "platform": "Epic Games",
                            "id": "epic_launcher",
                            "install_path": str(launcher_exe.parent),
                            "exe_path": str(launcher_exe)
                        })
            except Exception: pass

    def _scan_ubisoft(self):
        """Scan for Ubisoft Connect games."""
        paths = [
            r"SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs",
            r"SOFTWARE\Ubisoft\Launcher\Installs"
        ]
        
        for key_path in paths:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                    i = 0
                    while True:
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, subkey_name) as subkey:
                                try:
                                    install_dir, _ = winreg.QueryValueEx(subkey, "InstallDir")
                                    if install_dir and os.path.exists(install_dir):
                                        # Attempt to find game name in registry or folder name
                                        game_name = f"Ubisoft Game {subkey_name}"
                                        try:
                                            # Some games have a 'name' or 'gameName' value
                                            game_name, _ = winreg.QueryValueEx(subkey, "Name")
                                        except Exception:
                                            game_name = Path(install_dir).name
                                        
                                        # Try to find the primary .exe for feature detection and icon extraction
                                        resolved_exe = None
                                        try:
                                            # Common subfolders for Ubisoft games
                                            subs = ["", "bin", "binaries", "binaries/Win64"]
                                            found_exes = []
                                            for sub in subs:
                                                p = Path(install_dir) / sub
                                                if p.exists():
                                                    found_exes.extend(list(p.glob("*.exe")))
                                            
                                            if found_exes:
                                                resolved_exe = self._select_best_exe(found_exes, game_name)
                                        except Exception: pass

                                        self.games.append({
                                            "name": game_name,
                                            "platform": "Ubisoft Connect",
                                            "id": subkey_name,
                                            "install_path": install_dir,
                                            "exe_path": resolved_exe
                                        })
                                except Exception: pass
                            i += 1
                        except OSError: break
            except Exception: continue
            
        # Add Ubisoft Connect Launcher itself
        try:
            for key_path in [r"SOFTWARE\WOW6432Node\Ubisoft\Launcher", r"SOFTWARE\Ubisoft\Launcher"]:
                try:
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                        install_dir, _ = winreg.QueryValueEx(key, "InstallDir")
                        launcher_exe = Path(install_dir) / "UbisoftConnect.exe"
                        if launcher_exe.exists():
                            self.games.append({
                                "name": "Ubisoft Connect",
                                "platform": "Ubisoft Connect",
                                "id": "ubisoft_launcher",
                                "install_path": str(install_dir),
                                "exe_path": str(launcher_exe)
                            })
                            break
                except Exception: continue
        except Exception: pass

    def _scan_riot(self):
        """Scan for Riot Games."""
        riot_path = Path(os.environ.get("ProgramData", "C:\\ProgramData")) / "Riot Games" / "Metadata"
        if not riot_path.exists():
            return

        for product in riot_path.iterdir():
            if product.is_dir():
                for version in product.iterdir():
                    if version.is_dir():
                        manifest = version / f"{product.name}.riotmetadata.json"
                        if manifest.exists():
                            try:
                                with open(manifest, "r", encoding="utf-8") as f:
                                    data = json.load(f)
                                
                                self.games.append({
                                    "name": data.get("product_name", product.name),
                                    "platform": "Riot Games",
                                    "id": product.name,
                                    "install_path": data.get("install_location")
                                })
                            except Exception:
                                pass

    def _scan_gog(self):
        """Scan for GOG Galaxy games."""
        try:
            key_path = r"SOFTWARE\WOW6432Node\GOG.com\Games"
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                i = 0
                while True:
                    try:
                        game_id = winreg.EnumKey(key, i)
                        with winreg.OpenKey(key, game_id) as subkey:
                            try:
                                name, _ = winreg.QueryValueEx(subkey, "gameName")
                                path, _ = winreg.QueryValueEx(subkey, "path")
                                self.games.append({
                                    "name": name,
                                    "platform": "GOG Galaxy",
                                    "id": game_id,
                                    "install_path": path
                                })
                            except Exception:
                                pass
                        i += 1
                    except OSError:
                        break
        except Exception:
            pass
            
        # Add GOG Galaxy Launcher itself
        if not any(g["name"] == "GOG Galaxy" for g in self.games):
            try:
                key_path = r"SOFTWARE\WOW6432Node\GOG.com\GalaxyClient\paths"
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                    client_dir, _ = winreg.QueryValueEx(key, "client")
                    launcher_exe = Path(client_dir) / "GalaxyClient.exe"
                    if launcher_exe.exists():
                        self.games.append({
                            "name": "GOG Galaxy",
                            "platform": "GOG Galaxy",
                            "id": "gog_launcher",
                            "install_path": str(client_dir),
                            "exe_path": str(launcher_exe)
                        })
            except Exception: pass

    def _scan_xbox(self):
        """Scan for Xbox / Microsoft Store games."""
        try:
            # Use PowerShell to get AppxPackages that are actually games or the Xbox app
            cmd = 'Get-AppxPackage | Where-Object {($_.SignatureKind -eq "Store") -and ($_.Name -match "Xbox|Game|GamingApp") -and ($_.Name -notmatch "Zune|Media|Music|Video|Calculator|Camera|Maps|Weather|Cortana|Phone|Feedback|GetHelp|Paint|Terminal|Speech|TCUI|Provider|Overlay|CallableUI")} | Select-Object Name, PackageFamilyName, InstallLocation | ConvertTo-Json'
            
            # Hide the powershell window
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            result = subprocess.run(
                ["powershell", "-Command", cmd], 
                capture_output=True, 
                text=True,
                startupinfo=si,
                close_fds=True
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                if not data: return
                if isinstance(data, dict):
                    data = [data]
                
                for pkg in data:
                    name = pkg.get("Name")
                    family = pkg.get("PackageFamilyName")
                    path = pkg.get("InstallLocation")
                    if path and os.path.exists(path):
                        # Filter out common non-game system components
                        system_apps = [
                            "XboxSpeechToText", "XboxTCUI", "XboxIdentityProvider", "XboxGamingOverlay",
                            "XboxGameCallableUI", "XboxGameOverlay", "ZuneVideo", "ZuneMusic", "WindowsTerminal"
                        ]
                        if any(sys_app.lower() in name.lower() for sys_app in system_apps):
                            continue
                            
                        # Clean up name: Microsoft.GamingApp_8wekyb3d8bbwe -> Xbox App
                        display_name = name
                        icon_path = None
                        if "GamingApp" in name or "XboxApp" in name: 
                            display_name = "Xbox App"
                            try:
                                possible_icons = list(Path(path).glob("**/Xbox_SysTrayLogo.ico"))
                                if possible_icons:
                                    icon_path = str(possible_icons[0])
                            except Exception: pass
                        elif name.startswith("Microsoft."):
                            display_name = name.split(".")[-1]
                            if "_" in display_name: display_name = display_name.split("_")[0]
                            
                        if not self._is_game_valid_and_installed({"name": display_name, "platform": "Xbox", "install_path": path}):
                            continue

                        # Resolve launchable executable path or protocol for UWP
                        exe_path = None
                        if display_name == "Xbox App":
                            exe_path = "xbox:"
                        elif family:
                            import xml.etree.ElementTree as ET
                            manifest_path = os.path.join(path, "AppxManifest.xml")
                            if os.path.exists(manifest_path):
                                try:
                                    tree = ET.parse(manifest_path)
                                    root = tree.getroot()
                                    ns = {"ns": root.tag.split("}")[0].strip("{")} if "}" in root.tag else {}
                                    app_elements = root.findall(".//ns:Application", ns) if ns else root.findall(".//Application")
                                    if app_elements:
                                        app_id = app_elements[0].get("Id")
                                        exe_path = f"shell:AppsFolder\\{family}!{app_id}"
                                except Exception:
                                    pass
                            if not exe_path:
                                exe_path = f"shell:AppsFolder\\{family}!App"
                                
                        self.games.append({
                            "name": display_name,
                            "platform": "Xbox",
                            "id": name,
                            "install_path": path,
                            "icon": icon_path,
                            "exe_path": exe_path,
                            "type": "LAUNCHER" if display_name == "Xbox App" else "GAME"
                        })
        except Exception:
            pass
    def _scan_battlenet(self):
        """Scan for Battle.net games."""
        try:
            key_path = r"SOFTWARE\WOW6432Node\Blizzard Entertainment\Battle.net\Installed"
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                i = 0
                while True:
                    try:
                        game_id = winreg.EnumKey(key, i)
                        with winreg.OpenKey(key, game_id) as subkey:
                            try:
                                path, _ = winreg.QueryValueEx(subkey, "InstallLocation")
                                # Map internal IDs to names if possible, or just use ID
                                names = {"Hero": "Heroes of the Storm", "Pro": "Overwatch", "S1": "StarCraft", "S2": "StarCraft II", "WTCG": "Hearthstone", "WoW": "World of Warcraft"}
                                self.games.append({
                                    "name": names.get(game_id, f"Blizzard Game {game_id}"),
                                    "platform": "Battle.net",
                                    "id": game_id,
                                    "install_path": path
                                })
                            except Exception:
                                pass
                        i += 1
                    except OSError:
                        break
        except Exception:
            pass
            
        # Add Battle.net Launcher itself
        if not any(g["name"] == "Battle.net" for g in self.games):
            try:
                key_path = r"Software\Blizzard Entertainment\Battle.net\Launcher"
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path) as key:
                    launcher_exe, _ = winreg.QueryValueEx(key, "Executable")
                    if os.path.exists(launcher_exe):
                        self.games.append({
                            "name": "Battle.net",
                            "platform": "Battle.net",
                            "id": "battlenet_launcher",
                            "install_path": str(Path(launcher_exe).parent),
                            "exe_path": str(launcher_exe)
                        })
            except Exception: pass

    def _scan_ea_desktop(self):
        """Scan for EA Desktop and legacy Origin games."""
        paths_to_check = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Electronic Arts\EA Desktop\InstalledGames"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Origin\Installed Games"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Electronic Arts\EA Core\Installed Games"),
            (winreg.HKEY_CURRENT_USER, r"Software\Electronic Arts\EA Desktop\InstalledGames")
        ]
        
        for hkey, key_path in paths_to_check:
            try:
                with winreg.OpenKey(hkey, key_path) as key:
                    i = 0
                    while True:
                        try:
                            game_id = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, game_id) as subkey:
                                try:
                                    # Try various possible value names for install path
                                    install_path = None
                                    for val_name in ["InstallLocation", "InstallFolder", "path"]:
                                        try:
                                            install_path, _ = winreg.QueryValueEx(subkey, val_name)
                                            if install_path: break
                                        except Exception: continue
                                    
                                    if install_path and os.path.exists(install_path):
                                        # Clean up ID for name if possible
                                        display_name = game_id.split('.')[-1] if '.' in game_id else game_id
                                        display_name = display_name.replace("OFR:", "").replace("Origin.", "")
                                        
                                        # Try to find the primary .exe in likely locations
                                        resolved_exe = None
                                        try:
                                            potential_paths = [
                                                Path(install_path),
                                                Path(install_path) / "bin",
                                                Path(install_path) / "Game",
                                                Path(install_path) / "Core",
                                                Path(install_path) / "Game" / "Bin64",
                                                Path(install_path) / "binaries" / "Win64"
                                            ]
                                            
                                            found_exes = []
                                            for p in potential_paths:
                                                if p.exists():
                                                    found_exes.extend(list(p.glob("*.exe")))
                                            
                                            if found_exes:
                                                resolved_exe = self._select_best_exe(found_exes, display_name)
                                        except Exception: pass

                                        self.games.append({
                                            "name": display_name,
                                            "platform": "EA Desktop",
                                            "id": game_id,
                                            "install_path": install_path,
                                            "exe_path": resolved_exe
                                        })
                                except Exception: pass
                            i += 1
                        except OSError: break
            except Exception: continue

        # Add EA Desktop Launcher itself
        try:
            key_path = r"SOFTWARE\Electronic Arts\EA Desktop"
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                install_dir, _ = winreg.QueryValueEx(key, "InstallDir")
                launcher_exe = Path(install_dir) / "EADesktop.exe"
                if launcher_exe.exists():
                    self.games.append({
                        "name": "EA Desktop",
                        "platform": "EA Desktop",
                        "id": "ea_launcher",
                        "install_path": str(install_dir),
                        "exe_path": str(launcher_exe)
                    })
        except Exception: pass

    def _scan_rockstar(self):
        """Scan for Rockstar Games installed via the Rockstar Games Launcher."""
        # Primary registry path (older launcher versions)
        registry_paths = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Rockstar Games\Launcher\InstalledGames"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Rockstar Games"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Rockstar Games"),
        ]

        for hkey, key_path in registry_paths:
            try:
                with winreg.OpenKey(hkey, key_path) as key:
                    i = 0
                    while True:
                        try:
                            game_id = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, game_id) as subkey:
                                try:
                                    path = None
                                    for val_name in ["InstallFolder", "InstallLocation", "GameFolder"]:
                                        try:
                                            path, _ = winreg.QueryValueEx(subkey, val_name)
                                            if path:
                                                break
                                        except Exception:
                                            continue

                                    if not path:
                                        i += 1
                                        continue

                                    # Only add if the install directory actually exists on disk
                                    if not os.path.isdir(path):
                                        logger.debug("Rockstar: skipping '%s' — path does not exist: %s", game_id, path)
                                        i += 1
                                        continue

                                    name = game_id.replace("_", " ").strip()
                                    # Standardize abbreviation names like GTAV Enhanced -> Grand Theft Auto V Enhanced
                                    if name.lower().startswith("gtav"):
                                        name = name.replace("GTAV", "Grand Theft Auto V").replace("gtav", "Grand Theft Auto V")

                                    # Skip launcher and service helper components
                                    if any(x in name.lower() for x in ["launcher", "social club", "socialclub", "service", "sdk"]):
                                        i += 1
                                        continue

                                    # Try to find the best exe
                                    resolved_exe = None
                                    try:
                                        exes = list(Path(path).glob("*.exe"))
                                        if exes:
                                            resolved_exe = self._select_best_exe(exes, name)
                                    except Exception:
                                        pass

                                    self.games.append({
                                        "name": name,
                                        "platform": "Rockstar Games",
                                        "id": game_id,
                                        "install_path": path,
                                        "exe_path": resolved_exe
                                    })
                                except Exception:
                                    pass
                            i += 1
                        except OSError:
                            break
            except Exception:
                pass

        # Also scan the Rockstar Games default install directory directly
        for program_files in [os.environ.get("ProgramFiles", ""), os.environ.get("ProgramFiles(x86)", "")]:
            if not program_files:
                continue
            rockstar_dir = Path(program_files) / "Rockstar Games"
            if rockstar_dir.is_dir():
                for game_dir in rockstar_dir.iterdir():
                    if not game_dir.is_dir():
                        continue
                    name = game_dir.name.strip()
                    if name.lower().startswith("gtav"):
                        name = name.replace("GTAV", "Grand Theft Auto V").replace("gtav", "Grand Theft Auto V")

                    if any(x in name.lower() for x in ["launcher", "social club", "socialclub", "service", "sdk"]):
                        continue
                    exes = list(game_dir.glob("*.exe"))
                    resolved_exe = self._select_best_exe(exes, name) if exes else None
                    self.games.append({
                        "name": name,
                        "platform": "Rockstar Games",
                        "id": f"rockstar_{name}",
                        "install_path": str(game_dir),
                        "exe_path": resolved_exe,
                        "source": "rockstar_dir_scan"
                    })

    def _scan_amazon(self):
        """Scan for Amazon Games."""
        try:
            local_appdata = os.environ.get("LOCALAPPDATA")
            if not local_appdata:
                return
            amazon_data = Path(local_appdata) / "Amazon Games" / "Data" / "Games"
            if amazon_data.exists():
                for game_dir in amazon_data.iterdir():
                    if game_dir.is_dir():
                        self.games.append({
                            "name": game_dir.name,
                            "platform": "Amazon Games",
                            "id": game_dir.name,
                            "install_path": str(game_dir)
                        })
        except Exception:
            pass
    def _scan_itch(self):
        """Scan for Itch.io games."""
        try:
            appdata = os.environ.get("APPDATA")
            if not appdata:
                return
            itch_apps = Path(appdata) / "itch" / "apps"
            if itch_apps.exists():
                for game_dir in itch_apps.iterdir():
                    if game_dir.is_dir():
                        self.games.append({
                            "name": game_dir.name,
                            "platform": "Itch.io",
                            "id": game_dir.name,
                            "install_path": str(game_dir)
                        })
        except Exception:
            pass
    def _scan_humble(self):
        """Scan for Humble Bundle games."""
        try:
            local_appdata = os.environ.get("LOCALAPPDATA")
            if not local_appdata:
                return
            humble_path = Path(local_appdata) / "HumbleApp" / "Games"
            if humble_path.exists():
                for game_dir in humble_path.iterdir():
                    if game_dir.is_dir():
                        self.games.append({
                            "name": game_dir.name,
                            "platform": "Humble Bundle",
                            "id": game_dir.name,
                            "install_path": str(game_dir)
                        })
        except Exception:
            pass

    def _scan_start_menu(self):
        """Scan Start Menu for games and launchers using a high-performance batched PowerShell query."""
        try:
            start_menu_paths = [
                Path(os.environ["ProgramData"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs",
                Path(os.environ["USERPROFILE"]) / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs"
            ]
            
            target_keywords = [
                "steam", "epic games", "ubisoft", "connect", "battle.net", 
                "riot games", "rockstar", "ea app", "origin", "gog galaxy", "xbox", "game"
            ]
            
            all_lnks = []
            for base_path in start_menu_paths:
                if not base_path.exists(): continue
                for lnk in base_path.rglob("*.lnk"):
                    name_lower = lnk.stem.lower()
                    if any(kw in name_lower for kw in target_keywords):
                        if not any(jk in name_lower for jk in self.junk_keywords):
                            all_lnks.append(str(lnk))
            
            if not all_lnks: return

            paths_json = json.dumps(all_lnks)
            ps_script = f'''
            $shell = New-Object -ComObject WScript.Shell
            $results = {paths_json} | ForEach-Object {{
                try {{
                    $s = $shell.CreateShortcut($_)
                    [PSCustomObject]@{{
                        LinkPath = $_
                        TargetPath = $s.TargetPath
                        Name = [System.IO.Path]::GetFileNameWithoutExtension($_)
                    }}
                }} catch {{}}
            }}
            $results | ConvertTo-Json
            '''
            
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            res = subprocess.run(
                ["powershell", "-Command", ps_script], 
                capture_output=True, 
                text=True,
                startupinfo=si,
                close_fds=True
            )
            if res.returncode == 0 and res.stdout.strip():
                data = json.loads(res.stdout)
                if isinstance(data, dict): data = [data]
                
                for item in data:
                    target = item.get("TargetPath", "").strip()
                    name = item.get("Name", "").strip()
                    if not name or not target: continue
                    
                    name_lower = name.lower()
                    target_lower = target.lower()
                    
                    if target_lower.endswith(".exe"):
                        if any(junk in name_lower or junk in target_lower for junk in self.junk_keywords):
                            continue

                        platform = None
                        if "steam" in name_lower: platform = "Steam"
                        elif "epic games" in name_lower: platform = "Epic Games"
                        elif "ea app" in name_lower or "origin" in name_lower or "ea desktop" in name_lower: 
                            platform = "EA Desktop"
                        elif "xbox" == name_lower or "xbox app" in name_lower: platform = "Xbox"
                        elif "ubisoft" in name_lower or "connect" in name_lower: platform = "Ubisoft Connect"
                        elif "riot" in name_lower: platform = "Riot Games"
                        elif "battle.net" in name_lower: platform = "Battle.net"
                        
                        entry = {
                            "name": name,
                            "platform": platform or "Local",
                            "id": name,
                            "install_path": str(Path(target).parent),
                            "exe_path": target
                        }
                        if self._is_game_valid_and_installed(entry):
                            self.games.append(entry)
        except Exception: pass

    def _scan_uninstall_registry(self):
        """Scan Windows 'Uninstall' registry keys for games from various publishers."""
        paths = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall")
        ]
        
        publishers_to_watch = {
            "Electronic Arts", "Ubisoft", "Blizzard", "Activision", "Rockstar", 
            "Bethesda", "Square Enix", "Capcom", "Bandai Namco", "SEGA", 
            "Paradox", "CD PROJEKT", "Riot Games", "NVIDIA"
        }

        for hkey, reg_path in paths:
            try:
                with winreg.OpenKey(hkey, reg_path) as key:
                    i = 0
                    while True:
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, subkey_name) as subkey:
                                try:
                                    name, _ = winreg.QueryValueEx(subkey, "DisplayName")
                                    publisher, _ = winreg.QueryValueEx(subkey, "Publisher")
                                    install_path, _ = winreg.QueryValueEx(subkey, "InstallLocation")
                                    
                                    if not install_path or not os.path.exists(install_path):
                                        i += 1
                                        continue

                                    if any(pub in publisher for pub in publishers_to_watch):
                                        name_lower = name.lower()
                                        if any(kw in name_lower for kw in ["launcher", "connect", "redistributable", "runtime", "service"]):
                                            i += 1
                                            continue
                                        
                                        entry = {
                                            "name": name,
                                            "platform": "Rockstar Games" if any(p in publisher for p in ["Rockstar"]) else "Local",
                                            "id": subkey_name,
                                            "install_path": install_path,
                                            "exe_path": None
                                        }
                                        if self._is_game_valid_and_installed(entry):
                                            self.games.append(entry)
                                except Exception:
                                    pass
                            i += 1
                        except OSError:
                            break
            except Exception:
                pass

    def _scan_desktop(self):
        """Scan for game shortcuts on the desktop."""
        try:
            desktop = Path(os.environ["USERPROFILE"]) / "Desktop"
            public_desktop = Path(os.environ.get("PUBLIC", "C:\\Users\\Public")) / "Desktop"
            
            for dt_path in [desktop, public_desktop]:
                if not dt_path.exists(): continue
                # Handle .lnk files
                for lnk in dt_path.glob("*.lnk"):
                    try:
                        name_lower = lnk.stem.lower()
                        if any(junk in name_lower for junk in self.junk_keywords):
                            continue

                        si = subprocess.STARTUPINFO()
                        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                        
                        cmd = f'$s = (New-Object -ComObject WScript.Shell).CreateShortcut("{lnk}"); $s.TargetPath; $s.IconLocation'
                        res = subprocess.run(
                            ["powershell", "-Command", cmd], 
                            capture_output=True, 
                            text=True,
                            startupinfo=si,
                            close_fds=True
                        )
                        lines = res.stdout.strip().split("\n")
                        target = lines[0] if len(lines) > 0 else ""
                        icon_loc = lines[1] if len(lines) > 1 else ""
                        
                        if target and target.lower().endswith(".exe") and os.path.exists(target):
                            target_lower = target.lower()
                            if any(junk in target_lower for junk in self.junk_keywords):
                                continue
                                
                            game_entry = {
                                "name": lnk.stem,
                                "platform": "Local",
                                "id": lnk.stem,
                                "install_path": str(Path(target).parent),
                                "exe_path": target
                            }
                            
                            if icon_loc and "," in icon_loc:
                                icon_path = icon_loc.split(",")[0].strip()
                                if os.path.exists(icon_path):
                                    game_entry["icon"] = icon_path
                            
                            if self._is_game_valid_and_installed(game_entry):
                                self.games.append(game_entry)
                    except Exception: pass
                
                # Handle .url files (Steam/Epic web shortcuts)
                for url_file in dt_path.glob("*.url"):
                    try:
                        with open(url_file, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        
                        raw_stem = url_file.stem
                        for symbol in ["™", "®", "\u2122", "\u00ae", "\x99"]:
                            raw_stem = raw_stem.replace(symbol, "")
                        clean_stem = " ".join(raw_stem.split())
                        
                        if any(junk in clean_stem.lower() for junk in self.junk_keywords):
                            continue

                        import re
                        steam_match = re.search(r"steam://rungameid/(\d+)", content)
                        if steam_match:
                            appid = steam_match.group(1)
                            # Only add if game is already confirmed installed in Steam
                            if any(g.get("id") == appid for g in self.games):
                                continue
                            continue
                            
                        epic_match = re.search(r"com\.epicgames\.launcher://apps/([^?]+)", content)
                        if epic_match:
                            appid = epic_match.group(1)
                            if any(g.get("id") == appid for g in self.games):
                                continue
                            continue
                    except Exception:
                        pass
        except Exception:
            pass
        except Exception:
            pass

    def _scan_launchers_fallback(self):
        """Hardcoded fallback scan for primary launchers in common install locations."""
        fallbacks = [
            ("EA Desktop", r"C:\Program Files\Electronic Arts\EA Desktop\EA Desktop\EADesktop.exe"),
            ("EA Desktop", r"C:\Program Files\Electronic Arts\EA Desktop\EA Desktop\EA Launcher.exe"),
            ("Ubisoft Connect", r"C:\Program Files (x86)\Ubisoft\Ubisoft Game Launcher\UbisoftConnect.exe"),
            ("Steam", r"C:\Program Files (x86)\Steam\steam.exe"),
            ("Epic Games", r"C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe"),
            ("Epic Games", r"C:\Program Files\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe"),
            ("Battle.net", r"C:\Program Files (x86)\Battle.net\Battle.net.exe"),
            ("GOG Galaxy", r"C:\Program Files (x86)\GOG Galaxy\GalaxyClient.exe"),
            ("Rockstar Games", r"C:\Program Files\Rockstar Games\Launcher\Launcher.exe")
        ]
        
        for name, path_str in fallbacks:
            path = Path(path_str)
            if path.exists():
                # Avoid duplicates
                if not any(g["name"] == name or g.get("exe_path") == str(path) for g in self.games):
                    self.games.append({
                        "name": name,
                        "platform": name,
                        "id": f"fallback_{name.lower().replace(' ', '_')}",
                        "install_path": str(path.parent),
                        "exe_path": str(path)
                    })

    def _scan_common_paths(self):
        """Deep scan all available drives for game libraries."""
        import psutil
        try:
            drives = [p.mountpoint for p in psutil.disk_partitions() if 'fixed' in p.opts or 'cdrom' not in p.opts]
        except Exception:
            drives = ["C:\\", "D:\\", "E:\\", "F:\\"]

        common_subfolders = [
            "Games", "SteamLibrary", "Epic Games", "Ubisoft Game Launcher", 
            "Origin Games", "EA Games", "Riot Games", "Battle.net", 
            "Program Files\\Games", "Program Files (x86)\\Games",
            "Program Files\\EA Games", "Program Files (x86)\\Origin Games",
            "XboxGames"
        ]
        
        for drive in drives:
            for sub in common_subfolders:
                root_path = Path(drive) / sub
                if not root_path.exists() or not root_path.is_dir():
                    continue
                
                try:
                    for game_dir in root_path.iterdir():
                        if game_dir.is_dir():
                            if game_dir.name.startswith(("$", ".")) or game_dir.name.lower() in self.crack_groups:
                                continue
                            
                            # If game_dir is "steamapps", drill down into "steamapps/common"
                            if game_dir.name.lower() == "steamapps":
                                common_dir = game_dir / "common"
                                if common_dir.exists() and common_dir.is_dir():
                                    for actual_game_dir in common_dir.iterdir():
                                        if actual_game_dir.is_dir() and not actual_game_dir.name.startswith(("$", ".")) and actual_game_dir.name.lower() not in self.library_root_names:
                                            exes = self._collect_game_executables(actual_game_dir, max_depth=3)
                                            if exes:
                                                game_root = self._resolve_game_root(actual_game_dir)
                                                if game_root.name.lower() in self.library_root_names:
                                                    continue
                                                best_exe = self._select_best_exe(exes, game_root.name)
                                                title = self._get_exe_product_name(best_exe) or game_root.name
                                                self.games.append({
                                                    "name": title,
                                                    "platform": "Steam",
                                                    "id": f"{drive}_{game_root.name}",
                                                    "install_path": str(game_root),
                                                    "exe_path": best_exe,
                                                    "source": "common_paths"
                                                })
                                continue

                            if game_dir.name.lower() in self.library_root_names or game_dir.name.lower() in ["common", "steamlibrary"]:
                                continue
                                
                            exes = self._collect_game_executables(game_dir, max_depth=3)
                            if exes:
                                game_root = self._resolve_game_root(game_dir)
                                if game_root.name.lower() in self.library_root_names:
                                    continue
                                best_exe = self._select_best_exe(exes, game_root.name)
                                title = self._get_exe_product_name(best_exe) or game_root.name
                                
                                # Detect platform from directory name or path
                                platform = "Local"
                                dir_name_lower = game_root.name.lower()
                                sub_lower = sub.lower()
                                if "steam" in dir_name_lower or "steam" in sub_lower: platform = "Steam"
                                elif "epic" in dir_name_lower or "epic" in sub_lower: platform = "Epic Games"
                                elif "ubisoft" in dir_name_lower or "ubisoft" in sub_lower: platform = "Ubisoft Connect"
                                elif "ea games" in dir_name_lower or "origin" in dir_name_lower or "ea" in sub_lower or "origin" in sub_lower: platform = "EA Desktop"
                                elif "riot" in dir_name_lower or "riot" in sub_lower: platform = "Riot Games"
                                elif "battle.net" in dir_name_lower or "battle.net" in sub_lower: platform = "Battle.net"
                                elif "xbox" in dir_name_lower or "xbox" in sub_lower: platform = "Xbox"
                                
                                self.games.append({
                                    "name": title,
                                    "platform": platform,
                                    "id": f"{drive}_{game_root.name}",
                                    "install_path": str(game_root),
                                    "exe_path": best_exe,
                                    "source": "common_paths"
                                })
                except Exception:
                    continue

    def _scan_deep_recursive(self, max_depth=5):
        """
        Deep recursive scan of common game directories.
        This finds games buried deep in folder structures like:
        D:\\Games\\Ubisoft\\Far Cry 4\\bin\\FarCry4.exe
        D:\\Games\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe
        """
        import psutil
        
        skip_folders = {
            "windows", "program files", "program files (x86)", "programdata",
            "users", "$recycle.bin", "system volume information",
            "common files", "internet explorer", "windowsapps",
            "microsoft", "intel", "nvidia", "amd", "appdata",
            "documents and settings", "recovery", "msocache",
            "onlinefix", "online fix", "nodvd", "crack", "update", "updates", "skidrow"
        }
        skip_folders.update(self.crack_groups)
        
        try:
            drives = [p.mountpoint for p in psutil.disk_partitions() 
                     if 'fixed' in p.opts or 'cdrom' not in p.opts]
        except Exception:
            drives = ["C:\\", "D:\\", "E:\\", "F:\\", "G:\\"]
        
        root_scan_targets = []
        for drive in drives:
            drive_path = Path(drive)
            if not drive_path.exists():
                continue
                
            targets = [
                "Games", "Game", "My Games", 
                "SteamLibrary", "Steam Games",
                "Epic Games", "EpicGames",
                "Ubisoft", "Ubisoft Games",
                "Origin Games", "EA Games", "Electronic Arts",
                "Battle.net", "Blizzard", "Activision",
                "Riot Games", "RiotGames",
                "GOG Games", "GOG.com",
                "XboxGames", "Microsoft Games",
                "Amazon Games", "AmazonGames",
                "itch.io", "Itch",
                "Humble Bundle", "HumbleBundle",
                "Rockstar Games", "RockstarGames",
                "Bethesda", "Bethesda.net",
                "Square Enix", "SquareEnix",
                "2K Games", "2KGames",
                "Capcom", "Sega", "Bandai Namco",
                "Konami", "Koei Tecmo",
                "Program Files\\Games",
                "Program Files (x86)\\Games",
            ]
            
            for target in targets:
                full_path = drive_path / target
                if full_path.exists():
                    root_scan_targets.append(full_path)
            
            public_games = Path("C:\\Users\\Public\\Games")
            if public_games.exists() and public_games not in root_scan_targets:
                root_scan_targets.append(public_games)
            
            publishers = ["Sony", "PlayStation Studios", "Ubisoft", "Electronic Arts", "Activision", "Bethesda"]
            for pub in publishers:
                pub_path = drive_path / pub
                if pub_path.exists() and pub_path not in root_scan_targets:
                    root_scan_targets.append(pub_path)
        
        for drive in drives:
            try:
                for item in Path(drive).iterdir():
                    if item.is_dir() and "game" in item.name.lower():
                        if item not in root_scan_targets:
                            root_scan_targets.append(item)
            except (PermissionError, OSError):
                continue
        
        # Aggregate executables by resolved canonical game root
        scanned_game_roots: dict[Path, list[Path]] = {}
        self._deep_scan_folder_count = 0
        self._deep_scan_max_folders = 5000

        for root_path in root_scan_targets:
            if not root_path.exists():
                continue
            if self._deep_scan_folder_count >= self._deep_scan_max_folders:
                logger.info(f"Deep scan folder cap reached ({self._deep_scan_max_folders}). Stopping.")
                break
            try:
                self._deep_scan_folder(root_path, max_depth, 0, skip_folders, scanned_game_roots)
            except (PermissionError, OSError):
                continue
                
        # Emit exactly one game entry per resolved game root
        for game_root, exes in scanned_game_roots.items():
            if not exes or game_root.name.lower() in self.library_root_names or game_root.name.lower() in ["steamapps", "steamlibrary", "common", "games", "my games"]:
                continue
            best_exe = self._select_best_exe(exes, game_root.name)
            title = self._get_exe_product_name(best_exe) or game_root.name
            
            self.games.append({
                "name": title,
                "platform": "Local",
                "id": f"deep_{game_root.name}",
                "install_path": str(game_root),
                "exe_path": best_exe,
                "features": [],
                "source": "deep_scan"
            })
            logger.debug(f"Deep scan resolved game: {title} at {game_root} ({best_exe})")

    def _deep_scan_folder(self, folder: Path, max_depth: int, current_depth: int, 
                          skip_folders: set, scanned_game_roots: dict[Path, list[Path]]):
        """Recursively scan a folder and aggregate executables by their resolved game root."""
        if current_depth >= max_depth:
            return
        if self._deep_scan_folder_count >= self._deep_scan_max_folders:
            return
        self._deep_scan_folder_count += 1
            
        folder_lower = folder.name.lower()
        if folder_lower in skip_folders or folder.name.startswith(("$", ".")):
            return
            
        try:
            exes = list(folder.glob("*.exe"))
            valid_exes = []
            for exe in exes:
                try:
                    if exe.stat().st_size >= 1024 * 1024:  # 1MB minimum
                        valid_exes.append(exe)
                except (OSError, IOError):
                    continue
            
            if valid_exes:
                game_root = self._resolve_game_root(folder)
                if game_root and game_root.name.lower() not in self.library_root_names:
                    scanned_game_roots.setdefault(game_root, []).extend(valid_exes)
                    
            if current_depth < max_depth - 1:
                for subfolder in folder.iterdir():
                    if subfolder.is_dir():
                        self._deep_scan_folder(
                            subfolder, max_depth, current_depth + 1,
                            skip_folders, scanned_game_roots
                        )
        except (PermissionError, OSError):
            return


if __name__ == "__main__":
    scanner = GameScanner()
    games = scanner.scan_all()
    for g in games:
        print(f"[{g['platform']}] {g['name']} -> {g['install_path']}")
