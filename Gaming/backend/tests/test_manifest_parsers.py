import unittest
import tempfile
import shutil
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from system.manifest_parsers import (
    parse_steam_acf,
    parse_steam_vdf_libraries,
    parse_epic_item,
    parse_gog_info,
    clean_manifest_name,
)

SAMPLE_ACF = '''
"AppState"
{
    "appid"        "1091500"
    "Universe"        "1"
    "name"        "Cyberpunk 2077™"
    "StateFlags"        "4"
    "installdir"        "Cyberpunk 2077"
    "LastUpdated"        "1700000000"
    "SizeOnDisk"        "73400320000"
    "buildid"        "12345678"
}
'''

SAMPLE_VDF = '''
"libraryfolders"
{
    "0"
    {
        "path"        "C:\\\\Program Files (x86)\\\\Steam"
        "label"        ""
    }
    "1"
    {
        "path"        "D:\\\\SteamLibrary"
        "label"        "FastNVMe"
    }
}
'''

class TestManifestParsers(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.tmp_path = Path(self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_clean_manifest_name(self):
        self.assertEqual(clean_manifest_name("The Witcher 3®: Wild Hunt™"), "The Witcher 3: Wild Hunt")
        self.assertEqual(clean_manifest_name("  Doom   Eternal  "), "Doom Eternal")

    def test_parse_steam_acf(self):
        acf_file = self.tmp_path / "appmanifest_1091500.acf"
        acf_file.write_text(SAMPLE_ACF, encoding="utf-8")

        parsed = parse_steam_acf(acf_file)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["appid"], "1091500")
        self.assertEqual(parsed["name"], "Cyberpunk 2077")
        self.assertEqual(parsed["installdir"], "Cyberpunk 2077")
        self.assertEqual(parsed["size_bytes"], 73400320000)
        self.assertEqual(parsed["state_flags"], "4")
        self.assertEqual(parsed["buildid"], "12345678")

    def test_parse_steam_acf_raw_string(self):
        parsed = parse_steam_acf(SAMPLE_ACF)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["appid"], "1091500")
        self.assertEqual(parsed["name"], "Cyberpunk 2077")

    def test_parse_steam_vdf_libraries(self):
        d_steam = self.tmp_path / "SteamLibrary"
        d_steam.mkdir()

        vdf_content = f'''
"libraryfolders"
{{
    "0"
    {{
        "path"    "{str(d_steam).replace("\\", "\\\\")}"
    }}
}}
'''
        vdf_file = self.tmp_path / "libraryfolders.vdf"
        vdf_file.write_text(vdf_content, encoding="utf-8")

        libs = parse_steam_vdf_libraries(vdf_file)
        self.assertEqual(len(libs), 1)
        self.assertEqual(libs[0], d_steam)

    def test_parse_epic_item(self):
        item_file = self.tmp_path / "Fortnite.item"
        item_file.write_text('''{
            "FormatVersion": 0,
            "AppName": "Fortnite",
            "DisplayName": "Fortnite®",
            "InstallLocation": "C:\\\\Games\\\\Fortnite",
            "LaunchExecutable": "FortniteLauncher.exe",
            "InstallSize": 52428800000
        }''', encoding="utf-8")

        parsed = parse_epic_item(item_file)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["app_name"], "Fortnite")
        self.assertEqual(parsed["display_name"], "Fortnite")
        self.assertEqual(parsed["install_location"], "C:\\Games\\Fortnite")
        self.assertEqual(parsed["launch_executable"], "FortniteLauncher.exe")
        self.assertEqual(parsed["size_bytes"], 52428800000)

    def test_parse_gog_info(self):
        info_file = self.tmp_path / "goggame-123456.info"
        info_file.write_text('''{
            "gameId": "123456",
            "rootGameId": "123456",
            "name": "Hollow Knight™",
            "buildId": "100"
        }''', encoding="utf-8")

        parsed = parse_gog_info(self.tmp_path)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["game_id"], "123456")
        self.assertEqual(parsed["name"], "Hollow Knight")

if __name__ == "__main__":
    unittest.main()
