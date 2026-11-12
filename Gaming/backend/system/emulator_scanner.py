"""
Mission Control — Emulation Engine Scanner
Discovers standalone emulators, RetroArch, and installed cores across Windows and Linux.
Supports 17+ emulators with customizable executable paths and launch argument builders.
"""

import os
import sys
import json
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

SUPPORTED_EMULATORS: Dict[str, Dict[str, Any]] = {
    "rpcs3": {
        "id": "rpcs3",
        "name": "RPCS3",
        "console": "PlayStation 3",
        "console_slug": "ps3",
        "color": "#003791",
        "binaries_win": ["rpcs3.exe"],
        "binaries_linux": ["rpcs3", "net.rpcs3.RPCS3"],
        "common_paths_win": [
            r"C:\RPCS3\rpcs3.exe",
            r"D:\RPCS3\rpcs3.exe",
            r"C:\Emulation\RPCS3\rpcs3.exe",
            r"D:\Emulation\RPCS3\rpcs3.exe",
            r"{LOCALAPPDATA}\RPCS3\rpcs3.exe",
            r"{PROGRAMFILES}\RPCS3\rpcs3.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/rpcs3",
            "/usr/local/bin/rpcs3",
            "~/.var/app/net.rpcs3.RPCS3/data/rpcs3/rpcs3",
            "~/Applications/RPCS3.AppImage",
        ],
        "extensions": [".pkg", ".iso", "EBOOT.BIN"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://rpcs3.net",
    },
    "pcsx2": {
        "id": "pcsx2",
        "name": "PCSX2",
        "console": "PlayStation 2",
        "console_slug": "ps2",
        "color": "#002060",
        "binaries_win": ["pcsx2-qtx64.exe", "pcsx2.exe", "pcsx2-qt.exe"],
        "binaries_linux": ["pcsx2-qt", "pcsx2", "net.pcsx2.PCSX2"],
        "common_paths_win": [
            r"C:\PCSX2\pcsx2-qtx64.exe",
            r"C:\PCSX2\pcsx2.exe",
            r"D:\PCSX2\pcsx2-qtx64.exe",
            r"{PROGRAMFILES}\PCSX2\pcsx2-qtx64.exe",
            r"{PROGRAMFILES}\PCSX2\pcsx2.exe",
            r"{LOCALAPPDATA}\Programs\PCSX2\pcsx2-qtx64.exe",
            r"{LOCALAPPDATA}\PCSX2\pcsx2-qtx64.exe",
            r"C:\Emulation\PCSX2\pcsx2-qtx64.exe",
            r"D:\Emulation\PCSX2\pcsx2-qtx64.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/pcsx2-qt",
            "/usr/bin/pcsx2",
            "~/.var/app/net.pcsx2.PCSX2/data/pcsx2",
            "~/Applications/PCSX2.AppImage",
        ],
        "extensions": [".iso", ".chd", ".bin", ".cue", ".gz", ".m3u"],
        "launch_args_template": ["-batch", "-fullscreen", "{rom_path}"],
        "website": "https://pcsx2.net",
    },
    "duckstation": {
        "id": "duckstation",
        "name": "DuckStation",
        "console": "PlayStation",
        "console_slug": "psx",
        "color": "#b33939",
        "binaries_win": ["duckstation-qt-x64-ReleaseLTCG.exe", "duckstation-qt.exe", "duckstation-nogui.exe"],
        "binaries_linux": ["duckstation-qt", "org.duckstation.DuckStation"],
        "common_paths_win": [
            r"C:\DuckStation\duckstation-qt-x64-ReleaseLTCG.exe",
            r"C:\DuckStation\duckstation-qt.exe",
            r"D:\DuckStation\duckstation-qt-x64-ReleaseLTCG.exe",
            r"{PROGRAMFILES}\DuckStation\duckstation-qt.exe",
            r"{LOCALAPPDATA}\DuckStation\duckstation-qt-x64-ReleaseLTCG.exe",
            r"{LOCALAPPDATA}\DuckStation\duckstation-qt.exe",
            r"C:\Emulation\DuckStation\duckstation-qt.exe",
            r"D:\Emulation\DuckStation\duckstation-qt.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/duckstation-qt",
            "~/.var/app/org.duckstation.DuckStation",
            "~/Applications/DuckStation.AppImage",
        ],
        "extensions": [".chd", ".iso", ".cue", ".pbp", ".bin", ".m3u"],
        "launch_args_template": ["-batch", "-fullscreen", "{rom_path}"],
        "website": "https://www.duckstation.org",
    },
    "dolphin": {
        "id": "dolphin",
        "name": "Dolphin",
        "console": "GameCube & Wii",
        "console_slug": "gamecube",
        "color": "#0084ff",
        "binaries_win": ["Dolphin.exe", "dolphin.exe"],
        "binaries_linux": ["dolphin-emu", "org.DolphinEmu.dolphin-emu"],
        "common_paths_win": [
            r"C:\Dolphin\Dolphin.exe",
            r"D:\Dolphin\Dolphin.exe",
            r"{PROGRAMFILES}\Dolphin\Dolphin.exe",
            r"{APPDATA}\Dolphin Emulator\Dolphin.exe",
            r"C:\Emulation\Dolphin\Dolphin.exe",
            r"D:\Emulation\Dolphin\Dolphin.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/dolphin-emu",
            "~/.var/app/org.DolphinEmu.dolphin-emu",
            "~/Applications/Dolphin.AppImage",
        ],
        "extensions": [".rvz", ".iso", ".gcm", ".wad", ".wbfs", ".elf"],
        "launch_args_template": ["-b", "-e", "{rom_path}"],
        "website": "https://dolphin-emu.org",
    },
    "cemu": {
        "id": "cemu",
        "name": "Cemu",
        "console": "Nintendo Wii U",
        "console_slug": "wiiu",
        "color": "#00a8ff",
        "binaries_win": ["Cemu.exe", "cemu.exe"],
        "binaries_linux": ["cemu", "info.cemu.Cemu"],
        "common_paths_win": [
            r"C:\Cemu\Cemu.exe",
            r"D:\Cemu\Cemu.exe",
            r"{LOCALAPPDATA}\Cemu\Cemu.exe",
            r"{PROGRAMFILES}\Cemu\Cemu.exe",
            r"C:\Emulation\Cemu\Cemu.exe",
            r"D:\Emulation\Cemu\Cemu.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/cemu",
            "~/.var/app/info.cemu.Cemu",
            "~/Applications/Cemu.AppImage",
        ],
        "extensions": [".wua", ".rpx", ".wud", ".wux"],
        "launch_args_template": ["-f", "-g", "{rom_path}"],
        "website": "https://cemu.info",
    },
    "ryujinx": {
        "id": "ryujinx",
        "name": "Ryujinx",
        "console": "Nintendo Switch",
        "console_slug": "switch",
        "color": "#e84118",
        "binaries_win": ["Ryujinx.exe", "Ryujinx.Ava.exe"],
        "binaries_linux": ["ryujinx", "org.ryujinx.Ryujinx"],
        "common_paths_win": [
            r"C:\Ryujinx\Ryujinx.exe",
            r"C:\Ryujinx\Ryujinx.Ava.exe",
            r"D:\Ryujinx\Ryujinx.exe",
            r"{LOCALAPPDATA}\Ryujinx\Ryujinx.exe",
            r"{PROGRAMFILES}\Ryujinx\Ryujinx.exe",
            r"C:\Emulation\Ryujinx\Ryujinx.exe",
            r"D:\Emulation\Ryujinx\Ryujinx.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/ryujinx",
            "~/.var/app/org.ryujinx.Ryujinx",
            "~/Applications/Ryujinx.AppImage",
        ],
        "extensions": [".nsp", ".xci"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://ryujinx.org",
    },
    "citra": {
        "id": "citra",
        "name": "Citra / Lime3DS",
        "console": "Nintendo 3DS",
        "console_slug": "3ds",
        "color": "#e15f41",
        "binaries_win": ["lime3ds.exe", "citra-qt.exe", "citra.exe"],
        "binaries_linux": ["lime3ds", "citra-qt", "io.github.lime3ds.Lime3DS"],
        "common_paths_win": [
            r"C:\Lime3DS\lime3ds.exe",
            r"C:\Citra\citra-qt.exe",
            r"D:\Lime3DS\lime3ds.exe",
            r"{LOCALAPPDATA}\Lime3DS\lime3ds.exe",
            r"{LOCALAPPDATA}\Citra\citra-qt.exe",
            r"C:\Emulation\Citra\citra-qt.exe",
            r"D:\Emulation\Citra\citra-qt.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/citra-qt",
            "/usr/bin/lime3ds",
            "~/.var/app/io.github.lime3ds.Lime3DS",
            "~/Applications/Lime3DS.AppImage",
        ],
        "extensions": [".3ds", ".cia", ".cxi", ".app"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://lime3ds.github.io",
    },
    "ppsspp": {
        "id": "ppsspp",
        "name": "PPSSPP",
        "console": "PlayStation Portable",
        "console_slug": "psp",
        "color": "#218c74",
        "binaries_win": ["PPSSPPWindows64.exe", "PPSSPPWindows.exe"],
        "binaries_linux": ["PPSSPPSDL", "org.ppsspp.PPSSPP"],
        "common_paths_win": [
            r"C:\PPSSPP\PPSSPPWindows64.exe",
            r"D:\PPSSPP\PPSSPPWindows64.exe",
            r"{PROGRAMFILES}\PPSSPP\PPSSPPWindows64.exe",
            r"{APPDATA}\PPSSPP\PPSSPPWindows64.exe",
            r"C:\Emulation\PPSSPP\PPSSPPWindows64.exe",
            r"D:\Emulation\PPSSPP\PPSSPPWindows64.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/PPSSPPSDL",
            "/usr/bin/ppsspp",
            "~/.var/app/org.ppsspp.PPSSPP",
        ],
        "extensions": [".iso", ".cso", ".chd", ".pbp"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://www.ppsspp.org",
    },
    "xenia": {
        "id": "xenia",
        "name": "Xenia",
        "console": "Xbox 360",
        "console_slug": "xbox360",
        "color": "#107c10",
        "binaries_win": ["xenia_canary.exe", "xenia.exe"],
        "binaries_linux": ["xenia"],
        "common_paths_win": [
            r"C:\Xenia\xenia_canary.exe",
            r"C:\Xenia\xenia.exe",
            r"D:\Xenia\xenia_canary.exe",
            r"{LOCALAPPDATA}\Xenia\xenia_canary.exe",
            r"{LOCALAPPDATA}\Xenia\xenia.exe",
            r"C:\Emulation\Xenia\xenia_canary.exe",
            r"D:\Emulation\Xenia\xenia_canary.exe",
        ],
        "common_paths_linux": [],
        "extensions": [".iso", ".xex"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://xenia.jp",
    },
    "xemu": {
        "id": "xemu",
        "name": "Xemu",
        "console": "Xbox",
        "console_slug": "xbox",
        "color": "#218c74",
        "binaries_win": ["xemu.exe"],
        "binaries_linux": ["xemu", "app.xemu.xemu"],
        "common_paths_win": [
            r"C:\xemu\xemu.exe",
            r"D:\xemu\xemu.exe",
            r"{PROGRAMFILES}\xemu\xemu.exe",
            r"{LOCALAPPDATA}\xemu\xemu.exe",
            r"C:\Emulation\xemu\xemu.exe",
            r"D:\Emulation\xemu\xemu.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/xemu",
            "~/.var/app/app.xemu.xemu",
            "~/Applications/xemu.AppImage",
        ],
        "extensions": [".iso"],
        "launch_args_template": ["-dvd_path", "{rom_path}"],
        "website": "https://xemu.app",
    },
    "retroarch": {
        "id": "retroarch",
        "name": "RetroArch",
        "console": "Multi-System",
        "console_slug": "retroarch",
        "color": "#333333",
        "binaries_win": ["retroarch.exe"],
        "binaries_linux": ["retroarch", "org.libretro.RetroArch"],
        "common_paths_win": [
            r"C:\RetroArch-Win64\retroarch.exe",
            r"C:\RetroArch\retroarch.exe",
            r"D:\RetroArch-Win64\retroarch.exe",
            r"{APPDATA}\RetroArch\retroarch.exe",
            r"{PROGRAMFILES}\RetroArch\retroarch.exe",
            r"C:\Emulation\RetroArch\retroarch.exe",
            r"D:\Emulation\RetroArch\retroarch.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/retroarch",
            "~/.var/app/org.libretro.RetroArch",
        ],
        "extensions": [".zip", ".7z", ".nes", ".sfc", ".smc", ".gba", ".gbc", ".gb", ".gen", ".md", ".n64", ".z64", ".nds"],
        "launch_args_template": ["-L", "{core_path}", "{rom_path}"],
        "website": "https://www.retroarch.com",
    },
    "mgba": {
        "id": "mgba",
        "name": "mGBA",
        "console": "Game Boy Advance",
        "console_slug": "gba",
        "color": "#574b90",
        "binaries_win": ["mGBA.exe", "mgba.exe"],
        "binaries_linux": ["mgba", "io.mgba.mGBA"],
        "common_paths_win": [
            r"C:\mGBA\mGBA.exe",
            r"{PROGRAMFILES}\mGBA\mGBA.exe",
            r"{LOCALAPPDATA}\mGBA\mGBA.exe",
            r"C:\Emulation\mGBA\mGBA.exe",
            r"D:\Emulation\mGBA\mGBA.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/mgba",
            "~/.var/app/io.mgba.mGBA",
        ],
        "extensions": [".gba", ".gbc", ".gb", ".zip", ".7z"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://mgba.io",
    },
    "snes9x": {
        "id": "snes9x",
        "name": "Snes9x",
        "console": "Super Nintendo",
        "console_slug": "snes",
        "color": "#596275",
        "binaries_win": ["snes9x-x64.exe", "snes9x.exe"],
        "binaries_linux": ["snes9x", "snes9x-gtk", "com.snes9x.Snes9x"],
        "common_paths_win": [
            r"C:\Snes9x\snes9x-x64.exe",
            r"C:\Snes9x\snes9x.exe",
            r"{PROGRAMFILES}\Snes9x\snes9x-x64.exe",
            r"C:\Emulation\Snes9x\snes9x-x64.exe",
            r"D:\Emulation\Snes9x\snes9x-x64.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/snes9x-gtk",
            "/usr/bin/snes9x",
            "~/.var/app/com.snes9x.Snes9x",
        ],
        "extensions": [".sfc", ".smc", ".zip"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://www.snes9x.com",
    },
    "melonds": {
        "id": "melonds",
        "name": "melonDS",
        "console": "Nintendo DS",
        "console_slug": "nds",
        "color": "#303952",
        "binaries_win": ["melonDS.exe", "melonds.exe"],
        "binaries_linux": ["melonDS", "melonds", "net.kuribo64.melonDS"],
        "common_paths_win": [
            r"C:\melonDS\melonDS.exe",
            r"{PROGRAMFILES}\melonDS\melonDS.exe",
            r"{LOCALAPPDATA}\melonDS\melonDS.exe",
            r"C:\Emulation\melonDS\melonDS.exe",
            r"D:\Emulation\melonDS\melonDS.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/melonDS",
            "~/.var/app/net.kuribo64.melonDS",
        ],
        "extensions": [".nds", ".zip"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://melonds.kuribo64.net",
    },
    "flycast": {
        "id": "flycast",
        "name": "Flycast",
        "console": "Sega Dreamcast",
        "console_slug": "dreamcast",
        "color": "#ea8685",
        "binaries_win": ["flycast.exe"],
        "binaries_linux": ["flycast", "org.flycast.Flycast"],
        "common_paths_win": [
            r"C:\Flycast\flycast.exe",
            r"{PROGRAMFILES}\Flycast\flycast.exe",
            r"{LOCALAPPDATA}\Flycast\flycast.exe",
            r"C:\Emulation\Flycast\flycast.exe",
            r"D:\Emulation\Flycast\flycast.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/flycast",
            "~/.var/app/org.flycast.Flycast",
        ],
        "extensions": [".chd", ".cdi", ".gdi", ".cue"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://github.com/flyinghead/flycast",
    },
    "vita3k": {
        "id": "vita3k",
        "name": "Vita3K",
        "console": "PlayStation Vita",
        "console_slug": "vita",
        "color": "#3dc1d3",
        "binaries_win": ["Vita3K.exe", "vita3k.exe"],
        "binaries_linux": ["vita3k", "org.vita3k.Vita3K"],
        "common_paths_win": [
            r"C:\Vita3K\Vita3K.exe",
            r"{PROGRAMFILES}\Vita3K\Vita3K.exe",
            r"{LOCALAPPDATA}\Vita3K\Vita3K.exe",
            r"C:\Emulation\Vita3K\Vita3K.exe",
            r"D:\Emulation\Vita3K\Vita3K.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/vita3k",
            "~/.var/app/org.vita3k.Vita3K",
            "~/Applications/Vita3K.AppImage",
        ],
        "extensions": [".pkg", ".vpk", ".zip"],
        "launch_args_template": ["-r", "{rom_path}"],
        "website": "https://vita3k.org",
    },
    "mupen64plus": {
        "id": "mupen64plus",
        "name": "Mupen64Plus",
        "console": "Nintendo 64",
        "console_slug": "n64",
        "color": "#cf6a87",
        "binaries_win": ["mupen64plus-ui-console.exe", "mupen64plus.exe"],
        "binaries_linux": ["mupen64plus"],
        "common_paths_win": [
            r"C:\Mupen64Plus\mupen64plus.exe",
            r"{PROGRAMFILES}\Mupen64Plus\mupen64plus.exe",
            r"C:\Emulation\Mupen64Plus\mupen64plus.exe",
            r"D:\Emulation\Mupen64Plus\mupen64plus.exe",
        ],
        "common_paths_linux": [
            "/usr/bin/mupen64plus",
        ],
        "extensions": [".n64", ".z64", ".v64", ".zip"],
        "launch_args_template": ["{rom_path}"],
        "website": "https://mupen64plus.org",
    },
}


class EmulatorScanner:
    """Discovers installed emulators, RetroArch cores, and handles launch arguments."""

    def __init__(self, config_dir: Optional[Path] = None):
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            self.config_dir = Path(__file__).resolve().parent.parent / "config"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.overrides_file = self.config_dir / "emulator_overrides.json"
        self.overrides = self._load_overrides()

    def _load_overrides(self) -> Dict[str, Any]:
        if self.overrides_file.exists():
            try:
                with open(self.overrides_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning("Could not read emulator overrides: %s", e)
        return {}

    def save_override(self, emu_id: str, exe_path: Optional[str] = None, enabled: Optional[bool] = None) -> None:
        if emu_id not in self.overrides:
            self.overrides[emu_id] = {}
        if exe_path is not None:
            self.overrides[emu_id]["custom_exe_path"] = exe_path
        if enabled is not None:
            self.overrides[emu_id]["enabled"] = enabled
        try:
            with open(self.overrides_file, "w", encoding="utf-8") as f:
                json.dump(self.overrides, f, indent=2)
        except Exception as e:
            logger.error("Failed to save emulator overrides: %s", e)

    def get_supported_emulators(self) -> Dict[str, Dict[str, Any]]:
        """Returns the dictionary of all 17+ supported emulator definitions."""
        return SUPPORTED_EMULATORS

    def scan_emulators(self) -> List[Dict[str, Any]]:
        """Scans the system for all 17 supported emulators and returns their status."""
        results = []
        is_windows = sys.platform == "win32"
        env_map = {
            "LOCALAPPDATA": os.environ.get("LOCALAPPDATA", ""),
            "APPDATA": os.environ.get("APPDATA", ""),
            "PROGRAMFILES": os.environ.get("ProgramFiles", ""),
            "PROGRAMFILES(X86)": os.environ.get("ProgramFiles(x86)", ""),
            "USERPROFILE": os.environ.get("USERPROFILE", ""),
            "HOME": str(Path.home()),
        }

        for emu_id, defn in SUPPORTED_EMULATORS.items():
            override = self.overrides.get(emu_id, {})
            custom_exe = override.get("custom_exe_path")
            enabled = override.get("enabled", True)

            found_path = None
            if custom_exe:
                cleaned_custom = custom_exe.strip('\'" \t')
                if os.path.isfile(cleaned_custom):
                    found_path = str(Path(cleaned_custom).resolve())
                elif os.path.isdir(cleaned_custom):
                    binaries = defn.get("binaries_win", []) if is_windows else defn.get("binaries_linux", [])
                    for b in binaries:
                        cand = Path(cleaned_custom) / b
                        if cand.is_file():
                            found_path = str(cand.resolve())
                            break

            if not found_path:
                # 1. Check common standard directories
                candidate_paths = list(defn.get("common_paths_win", []) if is_windows else defn.get("common_paths_linux", []))
                
                # Expand search across drives C:, D:, E: for Emulators / Games
                if is_windows:
                    for drive in ["C:", "D:", "E:", "F:", "G:"]:
                        for bin_name in defn.get("binaries_win", []):
                            candidate_paths.extend([
                                rf"{drive}\Emulators\{defn['name']}\{bin_name}",
                                rf"{drive}\Emulation\{defn['name']}\{bin_name}",
                                rf"{drive}\Games\Emulators\{defn['name']}\{bin_name}",
                                rf"{drive}\Games\Emulation\{defn['name']}\{bin_name}",
                                rf"{drive}\{defn['name']}\{bin_name}",
                            ])

                for raw_path in candidate_paths:
                    expanded = raw_path
                    for var, val in env_map.items():
                        if val:
                            expanded = expanded.replace(f"{{{var}}}", val)
                    if expanded.startswith("~"):
                        expanded = str(Path(expanded).expanduser())
                    if os.path.isfile(expanded):
                        found_path = str(Path(expanded).resolve())
                        break

                # 2. Check system PATH via shutil.which
                if not found_path:
                    binaries = defn.get("binaries_win", []) if is_windows else defn.get("binaries_linux", [])
                    for b in binaries:
                        w = shutil.which(b)
                        if w and os.path.isfile(w):
                            found_path = str(Path(w).resolve())
                            break

            is_installed = bool(found_path and os.path.isfile(found_path))
            
            # RetroArch special scan: inspect installed cores if RetroArch is installed
            cores_found = []
            if emu_id == "retroarch" and is_installed and found_path:
                cores_found = self._scan_retroarch_cores(Path(found_path).parent)

            results.append({
                "id": emu_id,
                "name": defn["name"],
                "console": defn["console"],
                "console_slug": defn["console_slug"],
                "color": defn.get("color", "#666666"),
                "is_installed": is_installed,
                "exe_path": found_path or "",
                "custom_exe_path": custom_exe or "",
                "enabled": enabled,
                "extensions": defn.get("extensions", []),
                "launch_args_template": defn.get("launch_args_template", []),
                "website": defn.get("website", ""),
                "cores": cores_found,
            })

        return results

    def _scan_retroarch_cores(self, ra_dir: Path) -> List[str]:
        """Detect installed libretro cores."""
        cores = []
        possible_cores_dirs = [
            ra_dir / "cores",
            Path(os.environ.get("APPDATA", "")) / "RetroArch" / "cores",
            Path.home() / ".config" / "retroarch" / "cores",
            Path.home() / ".var" / "app" / "org.libretro.RetroArch" / "config" / "retroarch" / "cores",
        ]
        ext = ".dll" if sys.platform == "win32" else ".so"
        for cd in possible_cores_dirs:
            if cd.is_dir():
                try:
                    for f in cd.glob(f"*{ext}"):
                        cores.append(f.stem.replace("_libretro", ""))
                except Exception:
                    pass
        return sorted(list(set(cores)))

    def build_launch_command(self, emu_id: str, rom_path: str, core_name: Optional[str] = None) -> List[str]:
        """Constructs the launch argument list for the specified emulator and ROM."""
        scanned = {e["id"]: e for e in self.scan_emulators()}
        emu = scanned.get(emu_id)
        if not emu or not emu.get("exe_path"):
            raise FileNotFoundError(f"Emulator '{emu_id}' is not installed or executable path is missing.")

        exe = emu["exe_path"]
        template = emu.get("launch_args_template", ["{rom_path}"])

        cmd = [exe]
        for arg in template:
            if arg == "{rom_path}":
                cmd.append(rom_path)
            elif arg == "{core_path}":
                if core_name:
                    cmd.append(core_name)
            else:
                cmd.append(arg)

        return cmd


# Singleton instance
emulator_scanner = EmulatorScanner()

