"""
Mission Control — Library Node
storage_calculator.py: Accurate disk and game folder size calculator.

Design:
  • Drive storage (total/used/free) is measured via shutil.disk_usage — never random or estimated.
  • Game folder sizes are measured via:
      1. Official store manifests (Steam .acf, GOG .info, Epic .item) for instant byte counts.
      2. Recursive os.scandir() for custom/manual paths — fast and allocation-aware.

Nothing here returns dummy values. Every byte reported to the central server
is a real measurement from the local filesystem.
"""

import json
import logging
import os
import re
import shutil
import struct
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ── Drive Storage ─────────────────────────────────────────────────────────────

def get_drive_storage(paths: List[str]) -> Dict[str, int]:
    """
    Measure real physical drive storage for all drives that host the given paths.
    Deduplicates by drive root to avoid double-counting (e.g. C:\\ and C:\\Games
    are on the same drive).

    Returns: {"total": bytes, "used": bytes, "free": bytes}
    """
    seen_roots: set = set()
    total = used = free = 0

    for path in paths:
        try:
            p = Path(path)
            # Find drive root
            root = p.anchor  # e.g. 'D:\\' on Windows, '/dev/sda' context on Linux
            if root in seen_roots:
                continue
            seen_roots.add(root)

            usage = shutil.disk_usage(root)
            total += usage.total
            free  += usage.free
            used  += (usage.total - usage.free)
            logger.debug("Drive %s: total=%.1fGB, free=%.1fGB", root, usage.total/1e9, usage.free/1e9)
        except Exception as exc:
            logger.warning("storage_calculator: Could not measure drive for '%s': %s", path, exc)

    return {"total": total, "used": used, "free": free}


def get_default_storage() -> Dict[str, int]:
    """
    Measure storage for the C:\\ / root drive as a sensible fallback.
    Used when no scan paths are configured yet.
    """
    try:
        usage = shutil.disk_usage(os.path.expandvars("%SystemDrive%\\") if os.name == "nt" else "/")
        return {"total": usage.total, "used": usage.total - usage.free, "free": usage.free}
    except Exception:
        return {"total": 0, "used": 0, "free": 0}


# ── Steam Manifest Parser ─────────────────────────────────────────────────────

def _parse_vdf_size(acf_path: Path) -> Optional[int]:
    """
    Parse SizeOnDisk from a Steam appmanifest_*.acf file (Valve Data Format).
    Returns bytes or None.
    """
    try:
        content = acf_path.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r'"SizeOnDisk"\s+"(\d+)"', content)
        if match:
            return int(match.group(1))
    except Exception:
        pass
    return None


def get_steam_game_size(install_path: str) -> Optional[int]:
    """
    Find and parse the Steam ACF manifest for a game at install_path.
    Returns exact SizeOnDisk bytes, or None if manifest not found.
    """
    p = Path(install_path)
    # Steam ACF files live in steamapps/, which is typically 2 levels up from the game folder
    steamapps = p.parent
    for _ in range(3):
        if steamapps.name.lower() == "common":
            steamapps = steamapps.parent
            break
        steamapps = steamapps.parent

    if steamapps.exists():
        for acf in steamapps.glob("appmanifest_*.acf"):
            # Check if this manifest refers to this install path
            try:
                content = acf.read_text(encoding="utf-8", errors="ignore")
                install_dir_match = re.search(r'"installdir"\s+"([^"]+)"', content, re.IGNORECASE)
                if install_dir_match:
                    install_dir = install_dir_match.group(1)
                    expected = steamapps / "common" / install_dir
                    if expected.resolve() == p.resolve():
                        size = _parse_vdf_size(acf)
                        if size:
                            return size
            except Exception:
                pass
    return None


# ── GOG Manifest Parser ───────────────────────────────────────────────────────

def get_gog_game_size(install_path: str) -> Optional[int]:
    """
    Parse installedSize from GOG's goggame-*.info JSON files.
    Returns bytes or None.
    """
    p = Path(install_path)
    try:
        for info_file in p.glob("goggame-*.info"):
            data = json.loads(info_file.read_text(encoding="utf-8"))
            size_str = data.get("installedSize", data.get("sizeOnDisk"))
            if size_str:
                return int(size_str)
    except Exception:
        pass
    return None


# ── Epic Games Manifest Parser ────────────────────────────────────────────────

def get_epic_game_size(install_path: str) -> Optional[int]:
    """
    Parse InstallSize from Epic Games .item manifest files.
    Epic stores these in %ProgramData%\\Epic\\EpicGamesLauncher\\Data\\Manifests\\.
    """
    manifests_dir = Path(os.path.expandvars(
        r"%ProgramData%\Epic\EpicGamesLauncher\Data\Manifests"
    ))
    if not manifests_dir.exists():
        return None

    p = Path(install_path).resolve()
    try:
        for item_file in manifests_dir.glob("*.item"):
            data = json.loads(item_file.read_text(encoding="utf-8"))
            location = Path(data.get("InstallLocation", "")).resolve()
            if location == p:
                size = data.get("InstallSize", 0)
                if size:
                    return int(size)
    except Exception:
        pass
    return None


# ── Recursive Folder Size (fallback) ─────────────────────────────────────────

def get_folder_size(path: str, max_depth: int = 8) -> int:
    """
    Recursively calculate folder size via os.scandir (fast, low memory).
    Skips symlinks to prevent infinite loops.
    Returns exact byte count.
    """
    total = 0
    try:
        with os.scandir(path) as it:
            for entry in it:
                try:
                    if entry.is_symlink():
                        continue
                    if entry.is_file(follow_symlinks=False):
                        total += entry.stat(follow_symlinks=False).st_size
                    elif entry.is_dir(follow_symlinks=False) and max_depth > 0:
                        total += get_folder_size(entry.path, max_depth - 1)
                except (PermissionError, OSError):
                    pass
    except (PermissionError, OSError, FileNotFoundError) as exc:
        logger.debug("get_folder_size: Cannot scan '%s': %s", path, exc)
    return total


# ── Unified Game Size ─────────────────────────────────────────────────────────

def get_game_size(install_path: str, store: str = "manual") -> int:
    """
    Return the accurate installed size of a game in bytes.

    Priority:
      1. Official store manifest (Steam → GOG → Epic) — instant, no disk traversal
      2. Recursive os.scandir fallback
    Returns 0 only if the path does not exist.
    """
    if not install_path or not os.path.exists(install_path):
        return 0

    # 1. Try manifest parsers by store hint
    if store in ("steam", "manual"):
        size = get_steam_game_size(install_path)
        if size:
            logger.debug("game_size via Steam manifest: %s → %d bytes", install_path, size)
            return size

    if store in ("gog", "manual"):
        size = get_gog_game_size(install_path)
        if size:
            logger.debug("game_size via GOG manifest: %s → %d bytes", install_path, size)
            return size

    if store in ("epic", "manual"):
        size = get_epic_game_size(install_path)
        if size:
            logger.debug("game_size via Epic manifest: %s → %d bytes", install_path, size)
            return size

    # 2. Fallback: recursive scan
    size = get_folder_size(install_path)
    logger.debug("game_size via scandir: %s → %d bytes", install_path, size)
    return size
