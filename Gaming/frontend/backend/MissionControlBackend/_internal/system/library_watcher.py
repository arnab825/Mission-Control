import os
import time
import logging
import threading
from pathlib import Path
from typing import Optional, List, Dict, Tuple

logger = logging.getLogger(__name__)

class LibraryWatcher:
    """
    Background worker that monitors game installation paths and registry keys
    for additions or deletions of games. When a change is detected, it runs
    a quiet background scan to sync the game library and process watcher registry.
    """
    def __init__(self, pipeline, bridge, config: dict, library_session: dict):
        self.pipeline = pipeline
        self.bridge = bridge
        self.config = config
        self.library_session = library_session
        
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._last_state: Optional[Dict] = None
        self._lock = threading.Lock()

    def start(self):
        """Start the background library watcher thread."""
        with self._lock:
            if self._running:
                return
            self._running = True
            self._thread = threading.Thread(
                target=self._watch_loop,
                name="LibraryWatcher",
                daemon=True
            )
            self._thread.start()
            logger.info("[LibraryWatcher] Background library watcher started.")

    def stop(self):
        """Stop the background library watcher thread."""
        with self._lock:
            self._running = False
        logger.info("[LibraryWatcher] Library watcher stopped.")

    def _get_steam_manifests(self) -> List[Tuple[str, float]]:
        manifests = []
        try:
            import winreg
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
                steam_path, _ = winreg.QueryValueEx(key, "SteamPath")
                winreg.CloseKey(key)
            except OSError:
                return manifests

            steam_path = Path(steam_path.replace("/", os.sep))
            library_vdf = steam_path / "steamapps" / "libraryfolders.vdf"
            
            if library_vdf.exists():
                manifests.append((str(library_vdf), os.path.getmtime(library_vdf)))
                try:
                    with open(library_vdf, "r", encoding="utf-8") as f:
                        content = f.read()
                    import re
                    paths = re.findall(r'"path"\s+"([^"]+)"', content)
                    for lib_path in paths:
                        lib_path = Path(lib_path.replace("\\\\", "\\"))
                        apps_path = lib_path / "steamapps"
                        if apps_path.exists():
                            for acf in apps_path.glob("appmanifest_*.acf"):
                                try:
                                    manifests.append((str(acf), os.path.getmtime(acf)))
                                except OSError:
                                    pass
                except Exception as e:
                    logger.debug(f"[LibraryWatcher] Error reading libraryfolders.vdf: {e}")
        except Exception as e:
            logger.debug(f"[LibraryWatcher] Error gathering Steam manifests: {e}")
        return manifests

    def _get_epic_manifests(self) -> List[Tuple[str, float]]:
        manifests = []
        try:
            manifest_path = Path(os.environ.get("ProgramData", "C:\\ProgramData")) / "Epic" / "EpicGamesLauncher" / "Data" / "Manifests"
            if manifest_path.exists():
                for item in manifest_path.glob("*.item"):
                    try:
                        manifests.append((str(item), os.path.getmtime(item)))
                    except OSError:
                        pass
        except Exception as e:
            logger.debug(f"[LibraryWatcher] Error gathering Epic manifests: {e}")
        return manifests

    def _get_custom_dirs_state(self) -> List[Tuple[str, float]]:
        custom_states = []
        try:
            custom_dirs = self.config.get("scanner", {}).get("custom_scan_dirs", [])
            for dir_str in custom_dirs:
                if not dir_str:
                    continue
                root_path = Path(dir_str)
                if root_path.exists():
                    try:
                        custom_states.append((str(root_path), os.path.getmtime(root_path)))
                        if root_path.is_dir():
                            for child in root_path.iterdir():
                                try:
                                    # Add subdirectories and executable files
                                    if child.is_dir() and not child.name.startswith((".", "$")):
                                        custom_states.append((str(child), os.path.getmtime(child)))
                                    elif child.is_file() and child.name.lower().endswith(".exe"):
                                        custom_states.append((str(child), os.path.getmtime(child)))
                                except Exception:
                                    pass
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"[LibraryWatcher] Error gathering custom directories state: {e}")
        return custom_states

    def _get_registry_keys_state(self) -> List[str]:
        keys_state = []
        try:
            import winreg
            # Ubisoft Connect Installs
            for root_key_path in [r"SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs", r"SOFTWARE\Ubisoft\Launcher\Installs"]:
                try:
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, root_key_path) as key:
                        i = 0
                        while True:
                            try:
                                subkey_name = winreg.EnumKey(key, i)
                                keys_state.append(f"ubisoft_{subkey_name}")
                                i += 1
                            except OSError:
                                break
                except Exception:
                    pass
            # GOG Games
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\GOG.com\Games") as key:
                    i = 0
                    while True:
                        try:
                            game_id = winreg.EnumKey(key, i)
                            keys_state.append(f"gog_{game_id}")
                            i += 1
                        except OSError:
                            break
            except Exception:
                pass
        except Exception as e:
            logger.debug(f"[LibraryWatcher] Error gathering registry state: {e}")
        return keys_state

    def _get_library_state(self) -> Dict:
        return {
            "steam": sorted(self._get_steam_manifests()),
            "epic": sorted(self._get_epic_manifests()),
            "custom_dirs": sorted(self._get_custom_dirs_state()),
            "registry": sorted(self._get_registry_keys_state())
        }

    def _watch_loop(self):
        # Initial stagger delay to let the server startup stabilize
        time.sleep(5)
        self._last_state = self._get_library_state()
        
        while self._running:
            time.sleep(10)
            if not self._running:
                break
            try:
                current_state = self._get_library_state()
                if current_state != self._last_state:
                    logger.info("[LibraryWatcher] Library/settings changes detected! Auto-scanning...")
                    self._last_state = current_state
                    self._trigger_sync()
            except Exception as e:
                logger.error(f"[LibraryWatcher] Error in watch loop: {e}", exc_info=True)

    def _trigger_sync(self):
        """Spawns a thread to run the quiet background game library scan."""
        threading.Thread(
            target=self._run_background_scan,
            name="LibraryWatcherSync",
            daemon=True
        ).start()

    def _run_background_scan(self):
        try:
            from system.game_scanner import GameScanner
            user_id = getattr(self.pipeline, "active_user_id", None)
            user_id_str = str(user_id) if user_id else None
            
            logger.info(f"[LibraryWatcher] Initiating background scan sync for user: {user_id_str}")
            sc = GameScanner(config=self.config, user_id=user_id_str)
            games = sc.scan_all()
            
            logger.info(f"[LibraryWatcher] Background scan sync complete. Found {len(games)} games.")
            
            # Update main in-memory cache
            if user_id_str:
                self.library_session[user_id_str] = games
            
            # Sync running process watcher registry
            if self.pipeline and hasattr(self.pipeline, "process_watcher") and self.pipeline.process_watcher:
                self.pipeline.process_watcher.update_game_registry(games)
                logger.debug("[LibraryWatcher] Updated process watcher game registry.")

            # Broadcast changes to WebSocket clients
            self.bridge.update_state({
                "game_library": games
            })
            logger.info("[LibraryWatcher] Broadcasted updated library state to UI.")
            
        except Exception as e:
            logger.error(f"[LibraryWatcher] Background scan sync failed: {e}", exc_info=True)
