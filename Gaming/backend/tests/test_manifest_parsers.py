import pytest
from pathlib import Path
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

def test_clean_manifest_name():
    assert clean_manifest_name("The Witcher 3®: Wild Hunt™") == "The Witcher 3: Wild Hunt"
    assert clean_manifest_name("  Doom   Eternal  ") == "Doom Eternal"

def test_parse_steam_acf(tmp_path: Path):
    acf_file = tmp_path / "appmanifest_1091500.acf"
    acf_file.write_text(SAMPLE_ACF, encoding="utf-8")

    parsed = parse_steam_acf(acf_file)
    assert parsed is not None
    assert parsed["appid"] == "1091500"
    assert parsed["name"] == "Cyberpunk 2077"
    assert parsed["installdir"] == "Cyberpunk 2077"
    assert parsed["size_bytes"] == 73400320000
    assert parsed["state_flags"] == "4"
    assert parsed["buildid"] == "12345678"

def test_parse_steam_acf_raw_string():
    parsed = parse_steam_acf(SAMPLE_ACF)
    assert parsed is not None
    assert parsed["appid"] == "1091500"
    assert parsed["name"] == "Cyberpunk 2077"

def test_parse_steam_vdf_libraries(tmp_path: Path):
    # Create fake directory for path matching
    d_steam = tmp_path / "SteamLibrary"
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
    vdf_file = tmp_path / "libraryfolders.vdf"
    vdf_file.write_text(vdf_content, encoding="utf-8")

    libs = parse_steam_vdf_libraries(vdf_file)
    assert len(libs) == 1
    assert libs[0] == d_steam

def test_parse_epic_item(tmp_path: Path):
    item_file = tmp_path / "Fortnite.item"
    item_file.write_text('''{
        "FormatVersion": 0,
        "AppName": "Fortnite",
        "DisplayName": "Fortnite®",
        "InstallLocation": "C:\\\\Games\\\\Fortnite",
        "LaunchExecutable": "FortniteLauncher.exe",
        "InstallSize": 52428800000
    }''', encoding="utf-8")

    parsed = parse_epic_item(item_file)
    assert parsed is not None
    assert parsed["app_name"] == "Fortnite"
    assert parsed["display_name"] == "Fortnite"
    assert parsed["install_location"] == "C:\\Games\\Fortnite"
    assert parsed["launch_executable"] == "FortniteLauncher.exe"
    assert parsed["size_bytes"] == 52428800000

def test_parse_gog_info(tmp_path: Path):
    info_file = tmp_path / "goggame-123456.info"
    info_file.write_text('''{
        "gameId": "123456",
        "rootGameId": "123456",
        "name": "Hollow Knight™",
        "buildId": "100"
    }''', encoding="utf-8")

    parsed = parse_gog_info(tmp_path)
    assert parsed is not None
    assert parsed["game_id"] == "123456"
    assert parsed["name"] == "Hollow Knight"
