"""
Mission Control — Library Node
node_service.py: Autonomous node daemon.

Responsibilities:
  1. Register with the central library server on startup.
  2. Send periodic heartbeats with real disk metrics.
  3. Scan configured directories for installed games using the existing GameScanner.
  4. Report discovered installations with exact file sizes to the server.
  5. Receive and execute server-side commands (e.g. trigger scan).
"""

import json
import logging
import os
import socket
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

# ── Load environment ──────────────────────────────────────────────────────────
for _env_path in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]:
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=True)
        break

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [node] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("node")

# Add backend to sys.path so we can import the existing GameScanner
_backend_dir = Path(__file__).parent.parent / "backend"
if _backend_dir.exists():
    sys.path.insert(0, str(_backend_dir))

from storage_calculator import get_drive_storage, get_game_size, get_default_storage

# ── Node Configuration ────────────────────────────────────────────────────────

class NodeConfig:
    def __init__(self, config_path: Optional[str] = None):
        cfg_file = config_path or os.path.join(os.path.dirname(__file__), "node_config.json")
        self._cfg: Dict[str, Any] = {}
        if os.path.exists(cfg_file):
            with open(cfg_file, encoding="utf-8") as f:
                self._cfg = json.load(f)

        self.server_url: str = (
            self._cfg.get("serverUrl")
            or os.getenv("LIBRARY_SERVER_URL", "http://localhost:8800")
        ).rstrip("/")
        self.node_id: str = self._cfg.get("nodeId") or os.getenv("NODE_ID", "")
        self.node_name: str = (
            self._cfg.get("name") or os.getenv("NODE_NAME", socket.gethostname())
        )
        self.token: str = self._cfg.get("token") or os.getenv("NODE_TOKEN", "")
        self.clerk_id: str = self._cfg.get("clerkId") or os.getenv("CLERK_ID", "")
        self.auth_provider: str = self._cfg.get("authProvider") or os.getenv("AUTH_PROVIDER", "")
        self.scan_paths: List[str] = self._cfg.get("scanPaths", [])
        self.heartbeat_interval: int = int(self._cfg.get("heartbeatInterval", 15))
        self.sync_interval: int = int(self._cfg.get("syncInterval", 300))

    def save(self, config_path: Optional[str] = None):
        cfg_file = config_path or os.path.join(os.path.dirname(__file__), "node_config.json")
        with open(cfg_file, "w", encoding="utf-8") as f:
            json.dump({
                "nodeId":    self.node_id,
                "name":      self.node_name,
                "serverUrl": self.server_url,
                "token":     self.token,
                "clerkId":   self.clerk_id,
                "authProvider": self.auth_provider,
                "scanPaths": self.scan_paths,
                "heartbeatInterval": self.heartbeat_interval,
                "syncInterval":      self.sync_interval,
            }, f, indent=2)


# ── HTTP Helpers ──────────────────────────────────────────────────────────────

def _headers(token: str) -> Dict[str, str]:
    return {"X-Node-Token": token, "Content-Type": "application/json"}


def _post(url: str, data: Any, token: str, timeout: int = 10) -> Optional[Dict]:
    try:
        r = requests.post(url, json=data, headers=_headers(token), timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        logger.error("POST %s failed: %s", url, exc)
        return None


def _get(url: str, token: str, timeout: int = 10) -> Optional[Dict]:
    try:
        r = requests.get(url, headers=_headers(token), timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        logger.error("GET %s failed: %s", url, exc)
        return None


# ── Node Service ──────────────────────────────────────────────────────────────

class LibraryNodeService:
    def __init__(self, config: NodeConfig):
        self.cfg = config
        self._running = False
        self._scan_lock = threading.Lock()
        self._last_scan: float = 0.0

    # ── Registration ──────────────────────────────────────────────────────────

    def register(self) -> bool:
        """Register with the central library server."""
        storage = (
            get_drive_storage(self.cfg.scan_paths)
            if self.cfg.scan_paths
            else get_default_storage()
        )

        payload = {
            "nodeId":    self.cfg.node_id or None,
            "name":      self.cfg.node_name,
            "hostname":  socket.gethostname(),
            "ip":        _get_local_ip(),
            "clerk_id":  self.cfg.clerk_id,
            "auth_provider": self.cfg.auth_provider,
            "platform":  sys.platform,
            "version":   "1.0.0",
            "storage":   storage,
            "scanPaths": self.cfg.scan_paths,
            "metadata": {
                "cpu": _get_cpu_info(),
                "platform": sys.platform,
            },
        }

        result = _post(
            f"{self.cfg.server_url}/api/nodes/register",
            payload,
            self.cfg.token,  # may be empty on first registration
            timeout=15,
        )
        if not result:
            logger.error("Registration failed — server unreachable or rejected request.")
            return False

        # Persist assigned node_id and token
        self.cfg.node_id = result.get("nodeId") or self.cfg.node_id
        token = result.get("token")
        if token:
            self.cfg.token = token
            self.cfg.save()
            logger.info("Token received and saved.")

        logger.info("Registered as %s (%s)", self.cfg.node_id, self.cfg.node_name)
        return True

    # ── Heartbeat ─────────────────────────────────────────────────────────────

    def _send_heartbeat(self):
        if not (self.cfg.node_id and self.cfg.token):
            return
        storage = (
            get_drive_storage(self.cfg.scan_paths)
            if self.cfg.scan_paths
            else get_default_storage()
        )
        result = _post(
            f"{self.cfg.server_url}/api/nodes/{self.cfg.node_id}/heartbeat",
            {"ip": _get_local_ip(), "storage": storage, "status": "online"},
            self.cfg.token,
        )
        if result:
            command = result.get("command")
            if command == "scan":
                logger.info("Server requested immediate scan.")
                threading.Thread(target=self._run_scan, daemon=True).start()

    def _heartbeat_loop(self):
        while self._running:
            try:
                self._send_heartbeat()
            except Exception as exc:
                logger.error("Heartbeat error: %s", exc)
            time.sleep(self.cfg.heartbeat_interval)

    # ── Scanning & Sync ───────────────────────────────────────────────────────

    def _run_scan(self):
        if not self._scan_lock.acquire(blocking=False):
            logger.info("Scan already in progress, skipping.")
            return
        try:
            logger.info("Starting game scan across %d paths...", len(self.cfg.scan_paths))
            installations = self._collect_installations()
            if installations:
                self._sync_to_server(installations)
            self._last_scan = time.time()
        finally:
            self._scan_lock.release()

    def _collect_installations(self) -> List[Dict]:
        """
        Use the existing Mission Control GameScanner (from backend/system/game_scanner.py)
        to discover installed games, then augment each with real size data.
        """
        installations = []
        try:
            from system.game_scanner import GameScanner
            scanner = GameScanner(config={})

            # Override scan paths if configured
            if self.cfg.scan_paths:
                scanner.config = {"additional_library_paths": self.cfg.scan_paths}

            games = scanner.scan_all()
            logger.info("GameScanner found %d games.", len(games))

            for game in games:
                install_path = game.get("install_path", "")
                store = _map_platform_to_store(game.get("platform", "manual"))
                size_bytes = get_game_size(install_path, store)

                installations.append({
                    "title":       game.get("name", ""),
                    "store":       store,
                    "storeAppId":  game.get("id") if game.get("id") != game.get("name") else None,
                    "installPath": install_path,
                    "exePath":     game.get("exe_path"),
                    "version":     None,
                    "sizeBytes":   size_bytes,
                    "developer":   None,
                    "publisher":   None,
                    "releaseDate": None,
                    "genres":      [game.get("genre")] if game.get("genre") else [],
                    "tags":        game.get("tags") or [],
                    "features":    game.get("features") or [],
                    "coverUrl":    game.get("local_banner") or None,
                    "bannerUrl":   None,
                    "summary":     None,
                    "metadata":    {"source": store},
                })
        except ImportError:
            logger.warning("GameScanner not available — scanning configured paths directly.")
            for scan_path in self.cfg.scan_paths:
                installations.extend(self._scan_directory(scan_path))

        return installations

    def _scan_directory(self, path: str) -> List[Dict]:
        """
        Minimal fallback scanner: treat each top-level subdirectory as a game.
        Only used if GameScanner is unavailable.
        """
        results = []
        try:
            with os.scandir(path) as it:
                for entry in it:
                    if entry.is_dir(follow_symlinks=False):
                        size = get_game_size(entry.path, "manual")
                        results.append({
                            "title":       entry.name,
                            "store":       "manual",
                            "storeAppId":  None,
                            "installPath": entry.path,
                            "exePath":     None,
                            "version":     None,
                            "sizeBytes":   size,
                            "developer":   None,
                            "publisher":   None,
                            "releaseDate": None,
                            "genres":      [],
                            "tags":        [],
                            "features":    [],
                            "coverUrl":    None,
                            "bannerUrl":   None,
                            "summary":     None,
                            "metadata":    {"source": "manual"},
                        })
        except (PermissionError, OSError) as exc:
            logger.warning("Cannot scan directory '%s': %s", path, exc)
        return results

    def _sync_to_server(self, installations: List[Dict]):
        """POST all discovered installations to the central server."""
        if not (self.cfg.node_id and self.cfg.token):
            logger.warning("Cannot sync — not registered.")
            return

        payload = {"installations": installations}
        result = _post(
            f"{self.cfg.server_url}/api/nodes/{self.cfg.node_id}/sync",
            payload,
            self.cfg.token,
            timeout=60,
        )
        if result:
            logger.info(
                "Sync complete: %d synced, %d new games, %d AI-queued, %d errors.",
                result.get("synced", 0), result.get("new_games", 0),
                result.get("ai_queued", 0), result.get("errors", 0)
            )

    def _sync_loop(self):
        """Periodic sync loop."""
        while self._running:
            time.sleep(self.cfg.sync_interval)
            try:
                self._run_scan()
            except Exception as exc:
                logger.error("Sync loop error: %s", exc)

    # ── Run ───────────────────────────────────────────────────────────────────

    def run(self):
        """Start the node service."""
        logger.info("Starting Library Node: %s", self.cfg.node_name)

        if not self.register():
            logger.error("Could not register with server at %s. Exiting.", self.cfg.server_url)
            sys.exit(1)

        self._running = True

        # Initial scan on startup
        threading.Thread(target=self._run_scan, daemon=True, name="InitialScan").start()

        # Heartbeat loop
        threading.Thread(target=self._heartbeat_loop, daemon=True, name="HeartbeatLoop").start()

        # Periodic sync loop
        threading.Thread(target=self._sync_loop, daemon=True, name="SyncLoop").start()

        logger.info(
            "Node running. Heartbeat: %ds | Sync: %ds | Server: %s",
            self.cfg.heartbeat_interval, self.cfg.sync_interval, self.cfg.server_url
        )

        try:
            while self._running:
                time.sleep(1)
        except KeyboardInterrupt:
            self._running = False
            logger.info("Node service stopped.")


# ── Utility ───────────────────────────────────────────────────────────────────

def _get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def _get_cpu_info() -> str:
    try:
        import platform
        return platform.processor() or platform.machine()
    except Exception:
        return "Unknown"


def _map_platform_to_store(platform: str) -> str:
    """Map Mission Control platform labels to library server store identifiers."""
    mapping = {
        "Steam":         "steam",
        "Epic Games":    "epic",
        "Epic":          "epic",
        "GOG Galaxy":    "gog",
        "GOG":           "gog",
        "Ubisoft Connect": "ubisoft",
        "Ubisoft":       "ubisoft",
        "EA Desktop":    "ea",
        "Origin":        "ea",
        "EA":            "ea",
        "Rockstar Games": "rockstar",
        "Rockstar":      "rockstar",
        "Xbox":          "xbox",
        "Xbox App":      "xbox",
        "Battle.net":    "battlenet",
        "Amazon Games":  "amazon",
        "Itch.io":       "itch",
        "Humble Bundle": "humble",
    }
    return mapping.get(platform, "manual")
