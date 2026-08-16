import unittest
import tempfile
import shutil
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

from system.game_scanner import GameScanner


class TestGameScannerDynamic(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.scanner = GameScanner()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_dummy_exe(self, path: Path, size_mb: float = 2.0):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            f.seek(int(size_mb * 1024 * 1024) - 1)
            f.write(b"\0")

    def test_resolve_game_root_cyberpunk_bin_x64(self):
        """Verify that bin/x64/Cyberpunk2077.exe resolves to Cyberpunk 2077 root."""
        cp_root = Path(self.temp_dir) / "Games" / "Cyberpunk 2077"
        exe_path = cp_root / "bin" / "x64" / "Cyberpunk2077.exe"
        self._create_dummy_exe(exe_path, size_mb=60.0)

        resolved = self.scanner._resolve_game_root(exe_path)
        self.assertEqual(resolved.resolve(), cp_root.resolve())

    def test_resolve_game_root_cyberpunk_redmod_bin(self):
        """Verify that redmod/bin/redMod.exe resolves to Cyberpunk 2077 root."""
        cp_root = Path(self.temp_dir) / "Games" / "Cyberpunk 2077"
        redmod_exe = cp_root / "redmod" / "bin" / "redMod.exe"
        self._create_dummy_exe(redmod_exe, size_mb=2.0)

        resolved = self.scanner._resolve_game_root(redmod_exe)
        self.assertEqual(resolved.resolve(), cp_root.resolve())

    def test_resolve_game_root_unreal_engine_shipping(self):
        """Verify that Game/Binaries/Win64/Game-Win64-Shipping.exe resolves to Game root."""
        ue_root = Path(self.temp_dir) / "Games" / "BlackMythWukong"
        shipping_exe = ue_root / "b1" / "Binaries" / "Win64" / "b1-Win64-Shipping.exe"
        self._create_dummy_exe(shipping_exe, size_mb=100.0)

        resolved = self.scanner._resolve_game_root(shipping_exe)
        self.assertEqual(resolved.resolve(), ue_root.resolve())

    def test_resolve_game_root_deep_nested_source2(self):
        """Verify that 3+ levels deep game/bin/win64/cs2.exe resolves to Counter-Strike 2 root."""
        cs_root = Path(self.temp_dir) / "Games" / "Counter-Strike 2"
        cs_exe = cs_root / "game" / "bin" / "win64" / "cs2.exe"
        self._create_dummy_exe(cs_exe, size_mb=80.0)

        resolved = self.scanner._resolve_game_root(cs_exe)
        self.assertEqual(resolved.resolve(), cs_root.resolve())

    def test_select_best_exe_cyberpunk_vs_redmod_and_prelauncher(self):
        """Verify that Cyberpunk2077.exe is chosen over redMod.exe and REDprelauncher.exe."""
        cp_root = Path(self.temp_dir) / "Games" / "Cyberpunk 2077"
        cp_exe = cp_root / "bin" / "x64" / "Cyberpunk2077.exe"
        redmod_exe = cp_root / "redmod" / "bin" / "redMod.exe"
        launcher_exe = cp_root / "REDprelauncher.exe"

        self._create_dummy_exe(cp_exe, size_mb=60.0)
        self._create_dummy_exe(redmod_exe, size_mb=2.0)
        self._create_dummy_exe(launcher_exe, size_mb=1.5)

        exes = [launcher_exe, redmod_exe, cp_exe]
        best = self.scanner._select_best_exe(exes, "Cyberpunk 2077")
        self.assertEqual(Path(best).resolve(), cp_exe.resolve())

    def test_select_best_exe_unreal_vs_crash_reporter(self):
        """Verify that Shipping binary is preferred over Engine CrashReportClient.exe."""
        ue_root = Path(self.temp_dir) / "Games" / "BlackMythWukong"
        shipping_exe = ue_root / "b1" / "Binaries" / "Win64" / "b1-Win64-Shipping.exe"
        crash_exe = ue_root / "Engine" / "Binaries" / "Win64" / "CrashReportClient.exe"

        self._create_dummy_exe(shipping_exe, size_mb=100.0)
        self._create_dummy_exe(crash_exe, size_mb=15.0)

        exes = [crash_exe, shipping_exe]
        best = self.scanner._select_best_exe(exes, "BlackMythWukong")
        self.assertEqual(Path(best).resolve(), shipping_exe.resolve())

    def test_select_best_exe_unity_vs_crash_handler(self):
        """Verify that main Unity game executable is preferred over UnityCrashHandler64.exe."""
        unity_root = Path(self.temp_dir) / "Games" / "HollowKnight"
        game_exe = unity_root / "Hollow Knight.exe"
        crash_exe = unity_root / "UnityCrashHandler64.exe"

        self._create_dummy_exe(game_exe, size_mb=30.0)
        self._create_dummy_exe(crash_exe, size_mb=1.5)

        exes = [crash_exe, game_exe]
        best = self.scanner._select_best_exe(exes, "Hollow Knight")
        self.assertEqual(Path(best).resolve(), game_exe.resolve())

    def test_cyberpunk_library_scan_produces_single_entry(self):
        """Simulate deep scan of Cyberpunk 2077 directory structure and verify exactly ONE game is added."""
        library_dir = Path(self.temp_dir) / "Games"
        cp_root = library_dir / "Cyberpunk 2077"
        cp_exe = cp_root / "bin" / "x64" / "Cyberpunk2077.exe"
        redmod_exe = cp_root / "redmod" / "bin" / "redMod.exe"
        launcher_exe = cp_root / "REDprelauncher.exe"

        self._create_dummy_exe(cp_exe, size_mb=60.0)
        self._create_dummy_exe(redmod_exe, size_mb=2.0)
        self._create_dummy_exe(launcher_exe, size_mb=1.5)

        scanner = GameScanner(config={"scanner": {"custom_scan_dirs": [str(library_dir)]}})
        scanner._scan_custom_paths()

        # Check scanned games
        self.assertEqual(len(scanner.games), 1, f"Expected 1 game, found: {[g['name'] for g in scanner.games]}")
        game = scanner.games[0]
        self.assertEqual(game["name"], "Cyberpunk 2077")
        self.assertEqual(Path(game["install_path"]).resolve(), cp_root.resolve())
        self.assertEqual(Path(game["exe_path"]).resolve(), cp_exe.resolve())

    def test_deep_scan_aggregation_cyberpunk_structure(self):
        """Verify that _deep_scan_folder aggregates multiple subfolder executables into the single game root."""
        cp_root = Path(self.temp_dir) / "Cyberpunk 2077"
        cp_exe = cp_root / "bin" / "x64" / "Cyberpunk2077.exe"
        redmod_exe = cp_root / "redmod" / "bin" / "redMod.exe"

        self._create_dummy_exe(cp_exe, size_mb=60.0)
        self._create_dummy_exe(redmod_exe, size_mb=2.0)

        scanned_roots = {}
        self.scanner._deep_scan_folder_count = 0
        self.scanner._deep_scan_max_folders = 100
        self.scanner._deep_scan_folder(cp_root, max_depth=5, current_depth=0, skip_folders=set(), scanned_game_roots=scanned_roots)

        # Scanned roots must contain only the top-level cp_root
        self.assertEqual(len(scanned_roots), 1)
        root_key = list(scanned_roots.keys())[0]
        self.assertEqual(root_key.resolve(), cp_root.resolve())
        # All valid exes gathered
        self.assertEqual(len(scanned_roots[root_key]), 2)


if __name__ == "__main__":
    unittest.main()
