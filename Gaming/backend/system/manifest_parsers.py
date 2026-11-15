"""
Mission Control - Manifest Parsers
Unified, high-performance parsers for gaming platform manifests:
- Steam (appmanifest_*.acf, libraryfolders.vdf)
- Epic Games (*.item JSON manifests)
- GOG Galaxy (goggame-*.info)
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# Precompiled regex patterns for Steam ACF and VDF files
_RE_ACF_NAME = re.compile(r'"name"\s+"([^"]+)"')
_RE_ACF_APPID = re.compile(r'"appid"\s+"([^"]+)"')
_RE_ACF_INSTALLDIR = re.compile(r'"installdir"\s+"([^"]+)"')
_RE_ACF_SIZE = re.compile(r'"SizeOnDisk"\s+"(\d+)"')
_RE_ACF_FLAGS = re.compile(r'"StateFlags"\s+"([^"]+)"')
_RE_ACF_BUILDID = re.compile(r'"buildid"\s+"([^"]+)"')
_RE_VDF_PATHS = re.compile(r'"path"\s+"([^"]+)"')

# Unwanted symbols to clean from titles
_TRADEMARK_SYMBOLS = ["™", "®", "\u2122", "\u00ae", "\x99"]


def clean_manifest_name(raw_name: str) -> str:
    """Strip trademark and copyright symbols and normalize whitespace."""
    if not raw_name:
        return ""
    clean = raw_name
    for sym in _TRADEMARK_SYMBOLS:
        clean = clean.replace(sym, "")
    return " ".join(clean.split())


def parse_steam_acf(source: Union[str, Path]) -> Optional[Dict[str, Any]]:
    """
    Parse a Steam appmanifest_<appid>.acf file.
    Accepts a filepath or raw text content.
    Returns normalized dictionary or None on parse failure.
    """
    try:
        if isinstance(source, Path) or (isinstance(source, str) and "\n" not in source and os.path.exists(source)):
            p = Path(source)
            if not p.is_file():
                return None
            content = p.read_text(encoding="utf-8", errors="ignore")
        else:
            content = str(source)

        name_match = _RE_ACF_NAME.search(content)
        id_match = _RE_ACF_APPID.search(content)
        dir_match = _RE_ACF_INSTALLDIR.search(content)

        if not (name_match and id_match and dir_match):
            return None

        size_match = _RE_ACF_SIZE.search(content)
        flags_match = _RE_ACF_FLAGS.search(content)
        build_match = _RE_ACF_BUILDID.search(content)

        return {
            "appid": id_match.group(1).strip(),
            "name": clean_manifest_name(name_match.group(1)),
            "raw_name": name_match.group(1).strip(),
            "installdir": dir_match.group(1).strip(),
            "size_bytes": int(size_match.group(1)) if size_match else 0,
            "state_flags": flags_match.group(1).strip() if flags_match else "0",
            "buildid": build_match.group(1).strip() if build_match else None,
        }
    except Exception as exc:
        logger.debug(f"[ManifestParsers] Error parsing Steam ACF: {exc}")
        return None


def parse_steam_vdf_libraries(vdf_path_or_content: Union[str, Path]) -> List[Path]:
    """
    Parse libraryfolders.vdf and extract all Steam library paths.
    """
    libraries: List[Path] = []
    try:
        if isinstance(vdf_path_or_content, Path) or (
            isinstance(vdf_path_or_content, str)
            and "\n" not in vdf_path_or_content
            and os.path.exists(vdf_path_or_content)
        ):
            content = Path(vdf_path_or_content).read_text(encoding="utf-8", errors="ignore")
        else:
            content = str(vdf_path_or_content)

        for raw_path in _RE_VDF_PATHS.findall(content):
            norm = Path(raw_path.replace("\\\\", "\\").replace("/", "\\"))
            if norm.exists() and norm not in libraries:
                libraries.append(norm)
    except Exception as exc:
        logger.debug(f"[ManifestParsers] Error parsing libraryfolders.vdf: {exc}")
    return libraries


def parse_epic_item(item_path: Union[str, Path]) -> Optional[Dict[str, Any]]:
    """
    Parse an Epic Games .item JSON manifest.
    Returns normalized dictionary with app name, install location, and exe.
    """
    try:
        p = Path(item_path)
        if not p.is_file():
            return None
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)

        display_name = data.get("DisplayName") or ""
        app_name = data.get("AppName") or p.stem
        install_loc = data.get("InstallLocation") or ""
        launch_exe = data.get("LaunchExecutable") or ""

        # Compute or extract size
        size_bytes = 0
        if "InstallSize" in data and isinstance(data["InstallSize"], (int, float)):
            size_bytes = int(data["InstallSize"])

        return {
            "app_name": app_name,
            "display_name": clean_manifest_name(display_name),
            "raw_name": display_name,
            "install_location": install_loc,
            "launch_executable": launch_exe,
            "size_bytes": size_bytes,
            "catalog_item_id": data.get("CatalogItemId"),
            "app_version": data.get("AppVersionString"),
        }
    except Exception as exc:
        logger.debug(f"[ManifestParsers] Error parsing Epic manifest {item_path}: {exc}")
        return None


def parse_gog_info(directory_or_file: Union[str, Path]) -> Optional[Dict[str, Any]]:
    """
    Parse a GOG Galaxy goggame-*.info manifest in the game's install folder.
    """
    try:
        target = Path(directory_or_file)
        if target.is_dir():
            candidates = list(target.glob("goggame-*.info"))
            if not candidates:
                return None
            info_file = candidates[0]
        else:
            info_file = target

        if not info_file.is_file():
            return None

        with open(info_file, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)

        return {
            "game_id": data.get("gameId"),
            "root_game_id": data.get("rootGameId"),
            "name": clean_manifest_name(data.get("name") or ""),
            "raw_name": data.get("name") or "",
            "install_path": str(info_file.parent),
            "build_id": data.get("buildId"),
            "version": data.get("version"),
        }
    except Exception as exc:
        logger.debug(f"[ManifestParsers] Error parsing GOG info file {directory_or_file}: {exc}")
        return None
