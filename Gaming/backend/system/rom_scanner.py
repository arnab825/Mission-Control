"""
Mission Control — ROM Library Scanner & Multi-Disc Merger
Discovers ROM files across configured directories, groups multi-disc titles,
resolves cover artwork, and pairs with installed emulators for seamless 1-click launch.
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

try:
    from system.emulator_scanner import EmulatorScanner, SUPPORTED_EMULATORS
except ImportError:
    try:
        from .emulator_scanner import EmulatorScanner, SUPPORTED_EMULATORS
    except ImportError:
        from emulator_scanner import EmulatorScanner, SUPPORTED_EMULATORS

logger = logging.getLogger(__name__)

# Standard folder naming convention for console folders
CONSOLE_DIR_MAPPINGS: Dict[str, Dict[str, Any]] = {
    "ps3": {
        "name": "PlayStation 3",
        "slug": "ps3",
        "primary_emulator": "rpcs3",
        "extensions": {".pkg", ".iso", "eboot.bin"},
        "color": "#003791",
    },
    "ps2": {
        "name": "PlayStation 2",
        "slug": "ps2",
        "primary_emulator": "pcsx2",
        "extensions": {".iso", ".chd", ".bin", ".cue", ".gz", ".m3u"},
        "color": "#002060",
    },
    "psx": {
        "name": "PlayStation",
        "slug": "psx",
        "primary_emulator": "duckstation",
        "fallback_emulator": "retroarch",
        "extensions": {".chd", ".iso", ".cue", ".pbp", ".bin", ".m3u"},
        "color": "#b33939",
    },
    "ps1": {
        "name": "PlayStation",
        "slug": "psx",
        "primary_emulator": "duckstation",
        "fallback_emulator": "retroarch",
        "extensions": {".chd", ".iso", ".cue", ".pbp", ".bin", ".m3u"},
        "color": "#b33939",
    },
    "switch": {
        "name": "Nintendo Switch",
        "slug": "switch",
        "primary_emulator": "ryujinx",
        "extensions": {".nsp", ".xci"},
        "color": "#e84118",
    },
    "gamecube": {
        "name": "Nintendo GameCube",
        "slug": "gamecube",
        "primary_emulator": "dolphin",
        "extensions": {".rvz", ".iso", ".gcm", ".m3u"},
        "color": "#0084ff",
    },
    "gc": {
        "name": "Nintendo GameCube",
        "slug": "gamecube",
        "primary_emulator": "dolphin",
        "extensions": {".rvz", ".iso", ".gcm", ".m3u"},
        "color": "#0084ff",
    },
    "wii": {
        "name": "Nintendo Wii",
        "slug": "wii",
        "primary_emulator": "dolphin",
        "extensions": {".rvz", ".iso", ".wbfs", ".wad", ".elf"},
        "color": "#00a8ff",
    },
    "wiiu": {
        "name": "Nintendo Wii U",
        "slug": "wiiu",
        "primary_emulator": "cemu",
        "extensions": {".wua", ".rpx", ".wud", ".wux"},
        "color": "#00a8ff",
    },
    "3ds": {
        "name": "Nintendo 3DS",
        "slug": "3ds",
        "primary_emulator": "citra",
        "extensions": {".3ds", ".cia", ".cxi", ".app"},
        "color": "#e15f41",
    },
    "nds": {
        "name": "Nintendo DS",
        "slug": "nds",
        "primary_emulator": "melonds",
        "fallback_emulator": "retroarch",
        "extensions": {".nds", ".zip"},
        "color": "#303952",
    },
    "psp": {
        "name": "PlayStation Portable",
        "slug": "psp",
        "primary_emulator": "ppsspp",
        "extensions": {".iso", ".cso", ".chd", ".pbp"},
        "color": "#218c74",
    },
    "vita": {
        "name": "PlayStation Vita",
        "slug": "vita",
        "primary_emulator": "vita3k",
        "extensions": {".pkg", ".vpk", ".zip"},
        "color": "#3dc1d3",
    },
    "xbox360": {
        "name": "Xbox 360",
        "slug": "xbox360",
        "primary_emulator": "xenia",
        "extensions": {".iso", ".xex"},
        "color": "#107c10",
    },
    "x360": {
        "name": "Xbox 360",
        "slug": "xbox360",
        "primary_emulator": "xenia",
        "extensions": {".iso", ".xex"},
        "color": "#107c10",
    },
    "xbox": {
        "name": "Xbox",
        "slug": "xbox",
        "primary_emulator": "xemu",
        "extensions": {".iso"},
        "color": "#218c74",
    },
    "dreamcast": {
        "name": "Sega Dreamcast",
        "slug": "dreamcast",
        "primary_emulator": "flycast",
        "extensions": {".chd", ".cdi", ".gdi", ".cue"},
        "color": "#ea8685",
    },
    "dc": {
        "name": "Sega Dreamcast",
        "slug": "dreamcast",
        "primary_emulator": "flycast",
        "extensions": {".chd", ".cdi", ".gdi", ".cue"},
        "color": "#ea8685",
    },
    "gba": {
        "name": "Game Boy Advance",
        "slug": "gba",
        "primary_emulator": "mgba",
        "fallback_emulator": "retroarch",
        "extensions": {".gba", ".zip", ".7z"},
        "color": "#574b90",
    },
    "gbc": {
        "name": "Game Boy Color",
        "slug": "gbc",
        "primary_emulator": "mgba",
        "fallback_emulator": "retroarch",
        "extensions": {".gbc", ".zip", ".7z"},
        "color": "#574b90",
    },
    "gb": {
        "name": "Game Boy",
        "slug": "gb",
        "primary_emulator": "mgba",
        "fallback_emulator": "retroarch",
        "extensions": {".gb", ".zip", ".7z"},
        "color": "#574b90",
    },
    "snes": {
        "name": "Super Nintendo",
        "slug": "snes",
        "primary_emulator": "snes9x",
        "fallback_emulator": "retroarch",
        "extensions": {".sfc", ".smc", ".zip"},
        "color": "#596275",
    },
    "n64": {
        "name": "Nintendo 64",
        "slug": "n64",
        "primary_emulator": "mupen64plus",
        "fallback_emulator": "retroarch",
        "extensions": {".n64", ".z64", ".v64", ".zip"},
        "color": "#cf6a87",
    },
    "genesis": {
        "name": "Sega Genesis",
        "slug": "genesis",
        "primary_emulator": "retroarch",
        "extensions": {".gen", ".md", ".bin", ".zip"},
        "color": "#2c3e50",
    },
    "megadrive": {
        "name": "Sega Genesis",
        "slug": "genesis",
        "primary_emulator": "retroarch",
        "extensions": {".gen", ".md", ".bin", ".zip"},
        "color": "#2c3e50",
    },
}

MULTI_DISC_PATTERN = re.compile(
    r"^(.*?)\s*[\(\[\_]?(?:(?:disc|cd|part)\s*(\d+)|(\d+)\s*of\s*\d+)[\)\]]?(\.[a-zA-Z0-9]+)$",
    re.IGNORECASE,
)

TAGS_PATTERN = re.compile(r"(\([^\)]*\)|\[[^\]]*\])")


class ROMScanner:
    """Manages configured ROM search directories, disc aggregation, and library sync."""

    def __init__(self, config_dir: Optional[Path] = None):
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path(__file__).resolve().parent.parent / "config"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.paths_file = self.config_dir / "rom_paths.json"
        self.emulator_scanner = EmulatorScanner(config_dir=self.config_dir)
        self.rom_paths = self._load_rom_paths()

    def _load_rom_paths(self) -> List[str]:
        if self.paths_file.exists():
            try:
                with open(self.paths_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return [p for p in data if os.path.exists(p)]
            except Exception as e:
                logger.warning("Could not read rom_paths.json: %s", e)

        # Default paths to check
        defaults = [
            os.path.expanduser("~/Emulation/roms"),
            os.path.expanduser("~/Games/ROMs"),
            r"C:\Emulation\roms",
            r"D:\Emulation\roms",
            r"C:\ROMs",
            r"D:\ROMs",
        ]
        valid_defaults = [p for p in defaults if os.path.isdir(p)]
        return valid_defaults

    def save_rom_paths(self, paths: List[str]) -> List[str]:
        clean_paths = []
        for p in paths:
            if p and os.path.isdir(p):
                clean_paths.append(str(Path(p).resolve()))
        clean_paths = sorted(list(set(clean_paths)))
        try:
            with open(self.paths_file, "w", encoding="utf-8") as f:
                json.dump(clean_paths, f, indent=2)
            self.rom_paths = clean_paths
        except Exception as e:
            logger.error("Failed to save rom_paths: %s", e)
        return clean_paths

    def add_rom_path(self, path: str) -> List[str]:
        if path and os.path.isdir(path):
            current = set(self.rom_paths)
            current.add(str(Path(path).resolve()))
            return self.save_rom_paths(list(current))
        return self.rom_paths

    def remove_rom_path(self, path: str) -> List[str]:
        norm = str(Path(path).resolve())
        updated = [p for p in self.rom_paths if str(Path(p).resolve()) != norm]
        return self.save_rom_paths(updated)

    def clean_title(self, raw_name: str) -> str:
        """Strip region tags like (USA), (Europe), [!], etc."""
        cleaned = TAGS_PATTERN.sub("", raw_name).strip(" -_")
        return " ".join(cleaned.split())

    def scan_all_roms(self) -> List[Dict[str, Any]]:
        """Scans all configured ROM paths, merges multi-discs, and resolves matching emulators."""
        emulators = {e["id"]: e for e in self.emulator_scanner.scan_emulators()}
        emulated_games: List[Dict[str, Any]] = []

        for root_dir_str in self.rom_paths:
            root_path = Path(root_dir_str)
            if not root_path.is_dir():
                continue

            try:
                # Traverse subfolders (e.g. ps2, ps3, switch) or top-level files
                for entry in root_path.iterdir():
                    if entry.is_dir():
                        console_key = entry.name.lower().strip()
                        if console_key in CONSOLE_DIR_MAPPINGS:
                            cfg = CONSOLE_DIR_MAPPINGS[console_key]
                            games = self._scan_console_folder(entry, cfg, emulators)
                            emulated_games.extend(games)
                        else:
                            # Subfolder might contain console subfolders or rom files directly
                            for sub_entry in entry.iterdir():
                                if sub_entry.is_dir() and sub_entry.name.lower().strip() in CONSOLE_DIR_MAPPINGS:
                                    sub_cfg = CONSOLE_DIR_MAPPINGS[sub_entry.name.lower().strip()]
                                    games = self._scan_console_folder(sub_entry, sub_cfg, emulators)
                                    emulated_games.extend(games)
            except Exception as e:
                logger.error("Error scanning ROM root %s: %s", root_dir_str, e)

        return emulated_games

    def _scan_console_folder(
        self, folder: Path, console_cfg: Dict[str, Any], emulators: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Scans a dedicated console directory, grouping multi-disc titles."""
        valid_exts = console_cfg["extensions"]
        console_name = console_cfg["name"]
        primary_emu_id = console_cfg.get("primary_emulator", "")
        fallback_emu_id = console_cfg.get("fallback_emulator", "")

        # Select best available emulator
        active_emu = emulators.get(primary_emu_id)
        if not (active_emu and active_emu.get("is_installed")) and fallback_emu_id:
            active_emu = emulators.get(fallback_emu_id)

        # 1. Collect all candidates
        rom_files = []
        try:
            for item in folder.rglob("*"):
                if item.is_file():
                    ext = item.suffix.lower()
                    if ext in valid_exts or item.name.lower() == "eboot.bin":
                        rom_files.append(item)
        except Exception as e:
            logger.warning("Error reading files in %s: %s", folder, e)
            return []

        # 2. Disc aggregation grouping
        # Map: base_key -> {"files": [], "m3u": None, "base_name": "..."}
        groups: Dict[str, Dict[str, Any]] = {}

        for rom_file in rom_files:
            file_stem = rom_file.stem
            file_ext = rom_file.suffix.lower()

            # Handle .m3u playlists directly
            if file_ext == ".m3u":
                m3u_key = self.clean_title(file_stem).lower()
                if m3u_key not in groups:
                    groups[m3u_key] = {"files": [], "m3u": rom_file, "base_name": self.clean_title(file_stem)}
                else:
                    groups[m3u_key]["m3u"] = rom_file
                continue

            match = MULTI_DISC_PATTERN.match(rom_file.name)
            if match:
                raw_base = match.group(1)
                disc_num = int(match.group(2) or match.group(3) or 1)
                clean_base = self.clean_title(raw_base)
                group_key = clean_base.lower()
                if group_key not in groups:
                    groups[group_key] = {"files": [], "m3u": None, "base_name": clean_base}
                groups[group_key]["files"].append({"disc": disc_num, "path": rom_file})
            else:
                clean_base = self.clean_title(file_stem)
                group_key = clean_base.lower()
                if group_key not in groups:
                    groups[group_key] = {"files": [], "m3u": None, "base_name": clean_base}
                groups[group_key]["files"].append({"disc": 1, "path": rom_file})

        # 3. Build game cards
        games = []
        for group_key, grp in groups.items():
            files = sorted(grp["files"], key=lambda x: x["disc"])
            m3u_file = grp.get("m3u")
            base_name = grp["base_name"]

            if not files and not m3u_file:
                continue

            # Primary launch file: prefer .m3u if present, else Disc 1
            if m3u_file:
                primary_path = str(m3u_file)
            elif files:
                primary_path = str(files[0]["path"])
            else:
                continue

            # Build disc payload
            disc_payload = []
            if len(files) > 1:
                for f in files:
                    disc_payload.append({
                        "disc": f["disc"],
                        "label": f"Disc {f['disc']}",
                        "path": str(f["path"]),
                    })

            # Check cover art
            cover_url = self._find_cover_art(folder, base_name, primary_path)

            # Generate unique ID
            safe_slug = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{console_cfg['slug']}_{base_name}").lower()
            game_id = f"emulated_{safe_slug}"

            # Emulator launch arguments
            exe_path = active_emu.get("exe_path", "") if active_emu else ""
            launch_args = []
            if active_emu and exe_path:
                try:
                    launch_args = self.emulator_scanner.build_launch_command(
                        active_emu["id"], primary_path
                    )[1:]
                except Exception:
                    launch_args = [primary_path]

            game_entry = {
                "id": game_id,
                "name": base_name,
                "platform": console_name,
                "store": "emulation",
                "is_emulated": True,
                "console_slug": console_cfg["slug"],
                "color": console_cfg.get("color", "#66c0f4"),
                "install_path": str(Path(primary_path).parent),
                "exe_path": exe_path,
                "launch_args": launch_args,
                "rom_path": primary_path,
                "discs": disc_payload,
                "active_disc": 1,
                "total_discs": len(disc_payload) if disc_payload else 1,
                "emulator_id": active_emu["id"] if active_emu else primary_emu_id,
                "emulator_name": active_emu["name"] if active_emu else SUPPORTED_EMULATORS.get(primary_emu_id, {}).get("name", "Emulator"),
                "emulator_installed": bool(active_emu and active_emu.get("is_installed")),
                "type": "EMULATED",
                "genre": console_name,
                "features": ["Emulated", console_name, (active_emu["name"] if active_emu else "Emulator")],
                "cover_url": cover_url,
            }
            games.append(game_entry)

        return games

    def _find_cover_art(self, folder: Path, base_name: str, primary_rom_path: str) -> Optional[str]:
        """Search adjacent directories for local cover artwork."""
        p_rom = Path(primary_rom_path)
        stem = p_rom.stem
        candidates = [
            folder / f"{stem}.png",
            folder / f"{stem}.jpg",
            folder / f"{stem}-cover.jpg",
            folder / f"{stem}-boxart.png",
            folder / f"{base_name}.png",
            folder / f"{base_name}.jpg",
            folder / "media" / "boxart" / f"{stem}.png",
            folder / "covers" / f"{stem}.jpg",
            folder / "covers" / f"{stem}.png",
        ]
        for c in candidates:
            if c.is_file():
                return str(c.resolve())
        return None


# Alias and singleton instance
RomScanner = ROMScanner
rom_scanner = ROMScanner()

