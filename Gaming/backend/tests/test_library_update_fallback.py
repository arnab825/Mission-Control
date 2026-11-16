import unittest
import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from system.game_scanner import GameScanner, _run_hidden_powershell
from handlers.game_handler import handle_get_cached_games


class TestLibraryUpdateFallback(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.app_data_config = Path(self.temp_dir) / "config"
        self.app_data_config.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_run_hidden_powershell_no_name_error(self):
        """Verifies _run_hidden_powershell does not raise NameError for sys on Windows."""
        res = _run_hidden_powershell("Write-Output 'MissionControlOk'", timeout=5.0)
        self.assertEqual(res.returncode, 0)
        self.assertIn("MissionControlOk", res.stdout)

    def test_persistent_cache_migration_from_legacy(self):
        """Verifies that legacy games_db*.json files are automatically migrated to persistent storage."""
        # Setup mock legacy dir
        legacy_dir = Path(self.temp_dir) / "legacy_backend" / "config"
        legacy_dir.mkdir(parents=True, exist_ok=True)
        sample_games = [
            {"name": "Hades II", "platform": "Steam", "type": "GAME", "genre": "ACTION", "id": "1145320", "install_path": "C:\\Games\\Hades"}
        ]
        with open(legacy_dir / "games_db_testuser.json", "w", encoding="utf-8") as f:
            json.dump(sample_games, f)

        mock_module_file = str(legacy_dir.parent / "system" / "game_scanner.py")
        import system.game_scanner as gs_mod
        with patch("system.game_scanner.get_persistent_config_dir", return_value=str(self.app_data_config)):
            with patch.object(gs_mod, "__file__", mock_module_file):
                scanner = GameScanner(config={"system": {"app_data_path": str(self.app_data_config)}}, user_id="testuser")
                
                # Verify migration happened
                dest_file = self.app_data_config / "games_db_testuser.json"
                self.assertTrue(dest_file.exists(), "Target user cache should be migrated to persistent AppData")
                with open(dest_file, "r", encoding="utf-8") as df:
                    loaded = json.load(df)
                self.assertEqual(len(loaded), 1)
                self.assertEqual(loaded[0]["name"], "Hades II")

    def test_steam_scan_appends_games_when_installed(self):
        """Verifies that _scan_steam actually discovers games when manifest and common dir exist."""
        steam_mock_dir = Path(self.temp_dir) / "Steam"
        steamapps_dir = steam_mock_dir / "steamapps"
        common_dir = steamapps_dir / "common" / "Hollow Knight"
        common_dir.mkdir(parents=True, exist_ok=True)
        dummy_exe = common_dir / "hollow_knight.exe"
        dummy_exe.write_text("dummy")

        # Mock libraryfolders.vdf
        vdf_content = f'''"libraryfolders"
{{
    "0"
    {{
        "path"    "{str(steam_mock_dir).replace('\\', '\\\\')}"
    }}
}}'''
        vdf_file = steamapps_dir / "libraryfolders.vdf"
        vdf_file.write_text(vdf_content, encoding="utf-8")

        # Mock appmanifest_367520.acf
        acf_content = f'''"AppState"
{{
    "appid"    "367520"
    "name"     "Hollow Knight"
    "installdir"    "Hollow Knight"
}}'''
        (steamapps_dir / "appmanifest_367520.acf").write_text(acf_content, encoding="utf-8")

        scanner = GameScanner(config={"system": {"app_data_path": str(self.app_data_config)}})

        mock_key = MagicMock()
        mock_key.__enter__.return_value = mock_key
        mock_key.__exit__.return_value = None

        with patch("winreg.OpenKey", return_value=mock_key):
            with patch("winreg.QueryValueEx", return_value=(str(steam_mock_dir), 1)):
                scanner._scan_steam()
                found_titles = [g.get("name") for g in scanner.games]
                self.assertIn("Hollow Knight", found_titles)

    def test_auto_scan_triggers_when_cache_only_has_launchers(self):
        """Verifies handle_get_cached_games detects 0 real games and fires background auto-scan."""
        bridge_mock = MagicMock()
        pipeline_mock = MagicMock()
        library_session = {}

        # Cached only has fallback launchers (like the user screenshot: 3 launchers, 0 games)
        cached_launchers_only = [
            {"name": "Ubisoft Connect", "platform": "Ubisoft Connect", "type": "LAUNCHER", "genre": "PLATFORM"},
            {"name": "Epic Games", "platform": "Epic Games", "type": "LAUNCHER", "genre": "PLATFORM"},
            {"name": "Xbox", "platform": "Xbox", "type": "LAUNCHER", "genre": "PLATFORM"},
        ]

        with patch("system.game_scanner.GameScanner.load_cached_games", return_value=cached_launchers_only):
            with patch("system.game_scanner.GameScanner.scan_all", return_value=cached_launchers_only + [
                {"name": "Cyberpunk 2077", "platform": "Steam", "type": "GAME", "genre": "RPG", "features": ["DLSS"]}
            ]) as mock_scan_all:
                handle_get_cached_games(
                    payload={"userId": "user_test_fallback"},
                    pipeline=pipeline_mock,
                    bridge=bridge_mock,
                    config={"system": {"app_data_path": str(self.app_data_config)}},
                    library_session=library_session
                )

                # Bridge state should update with initial launchers and is_running=True scan_state
                first_update = bridge_mock.update_state.call_args_list[0][0][0]
                self.assertIn("scan_state", first_update)
                self.assertTrue(first_update["scan_state"]["is_running"], "Scan state should indicate running when 0 real games exist")
                self.assertEqual(len(first_update["game_library"]), 3)

    def test_deep_scan_resilience_to_permission_error(self):
        """Verifies _scan_deep_recursive handles permission denied on directories without crashing."""
        scanner = GameScanner(config={"system": {"app_data_path": str(self.app_data_config)}})
        
        with patch("pathlib.Path.exists", side_effect=PermissionError("[WinError 5] Access is denied: 'C:\\Users\\Public\\Games'")):
            # Should not raise exception
            try:
                scanner._scan_deep_recursive(max_depth=1)
            except Exception as e:
                self.fail(f"_scan_deep_recursive raised an unexpected exception: {e}")


if __name__ == "__main__":
    unittest.main()
