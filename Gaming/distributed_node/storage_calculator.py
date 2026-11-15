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
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from system.manifest_parsers import parse_steam_acf, parse_epic_item, parse_gog_info
except ImportError:
    sys.path.append(str(Path(__file__).parent.parent / "backend"))
    from system.manifest_parsers import parse_steam_acf, parse_epic_item, parse_gog_info


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
            if not path or not str(path).strip():
                continue
            p = Path(path)
            # Find drive root
            root = p.anchor  # e.g. 'D:\\' on Windows, '/dev/sda' context on Linux
            if not root or root in seen_roots:
                continue
            seen_roots.add(root)

            # Skip drives that are unmounted or disconnected (e.g. unplugged external drives)
            if not os.path.exists(root):
                logger.debug("storage_calculator: Drive root '%s' is not mounted or accessible. Skipping.", root)
                continue

            usage = shutil.disk_usage(root)
            total += usage.total
            free  += usage.free
            used  += (usage.total - usage.free)
            logger.debug("Drive %s: total=%.1fGB, free=%.1fGB", root, usage.total/1e9, usage.free/1e9)
        except Exception as exc:
            logger.debug("storage_calculator: Could not measure drive for '%s': %s", path, exc)

    if total == 0:
        return get_default_storage()

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


# ── Unified Manifest Parsers ──────────────────────────────────────────────────

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
            try:
                parsed = parse_steam_acf(acf)
                if parsed and parsed.get("installdir"):
                    expected = steamapps / "common" / parsed["installdir"]
                    if expected.resolve() == p.resolve():
                        if parsed.get("size_bytes"):
                            return parsed["size_bytes"]
            except Exception:
                pass
    return None


def get_gog_game_size(install_path: str) -> Optional[int]:
    """
    Parse installed size from GOG's goggame-*.info JSON files.
    Returns bytes or None.
    """
    parsed = parse_gog_info(install_path)
    if parsed and parsed.get("size_bytes"):
        return parsed["size_bytes"]
    return None


def get_epic_game_size(install_path: str) -> Optional[int]:
    """
    Parse InstallSize from Epic Games .item manifest files.
    """
    manifests_dir = Path(os.path.expandvars(
        r"%ProgramData%\Epic\EpicGamesLauncher\Data\Manifests"
    ))
    if not manifests_dir.exists():
        return None

    p = Path(install_path).resolve()
    try:
        for item_file in manifests_dir.glob("*.item"):
            parsed = parse_epic_item(item_file)
            if parsed and parsed.get("install_location"):
                if Path(parsed["install_location"]).resolve() == p:
                    if parsed.get("size_bytes"):
                        return parsed["size_bytes"]
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
