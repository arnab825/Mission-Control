import unittest
import sys
import os
import tempfile
from unittest.mock import patch

# Ensure correct import resolution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.config_loader import load_config, save_config

class TestConfigLoader(unittest.TestCase):
    def setUp(self):
        # Create a temporary file to use as our settings file
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_config_path = os.path.join(self.temp_dir.name, "settings.yaml")
        
        # Write dummy valid YAML content
        self.dummy_yaml = (
            "game_mode: story\n"
            "scanner:\n"
            "  custom_scan_dirs:\n"
            "    - C:\\Games\n"
            "ai_agent:\n"
            "  model_id: meta/llama-3.1-8b-instruct\n"
        )
        with open(self.temp_config_path, "w", encoding="utf-8") as f:
            f.write(self.dummy_yaml)

    def tearDown(self):
        # Clean up temporary directory
        self.temp_dir.cleanup()

    def test_load_config_basic(self):
        # Test loading config with no NVIDIA API key in environment
        with patch.dict(os.environ, {}, clear=True):
            config = load_config(self.temp_config_path)
            
            self.assertEqual(config.get("game_mode"), "story")
            self.assertEqual(config.get("scanner", {}).get("custom_scan_dirs"), ["C:\\Games"])
            
            # Checks that default ai_agent dictionary gets setup
            self.assertIn("ai_agent", config)
            self.assertEqual(config["ai_agent"].get("model_id"), "meta/llama-3.1-8b-instruct")
            # Should be None if not in environment
            self.assertIsNone(config["ai_agent"].get("nvidia_api_key"))

    def test_load_config_with_env_api_key(self):
        # Test that environmental API keys overwrite config settings
        mock_env = {
            "NVIDIA_API_KEY": "nvapi-test-api-key-12345"
        }
        with patch.dict(os.environ, mock_env):
            config = load_config(self.temp_config_path)
            
            self.assertEqual(config["ai_agent"].get("nvidia_api_key"), "nvapi-test-api-key-12345")

    def test_load_config_ignores_placeholder_api_key(self):
        # Test that placeholder API keys are ignored
        mock_env = {
            "NVIDIA_API_KEY": "your_nvidia_api_key_here"
        }
        with patch.dict(os.environ, mock_env):
            config = load_config(self.temp_config_path)
            
            self.assertIsNone(config["ai_agent"].get("nvidia_api_key"))

    def test_save_config_success(self):
        config_data = {
            "game_mode": "competitive",
            "scanner": {
                "custom_scan_dirs": ["D:\\SteamLibrary"]
            },
            "ai_agent": {
                "model_id": "custom"
            }
        }
        
        # Save to temporary path
        success = save_config(config_data, self.temp_config_path)
        self.assertTrue(success)
        
        # Verify it loads back correctly
        loaded_config = load_config(self.temp_config_path)
        self.assertEqual(loaded_config.get("game_mode"), "competitive")
        self.assertEqual(loaded_config.get("scanner", {}).get("custom_scan_dirs"), ["D:\\SteamLibrary"])
        self.assertEqual(loaded_config.get("ai_agent", {}).get("model_id"), "custom")

    def test_save_config_failure(self):
        # Attempt to save to an invalid system path (should fail and return False instead of crashing)
        invalid_path = "/nonexistent_folder/subfolder/settings.yaml"
        if sys.platform == "win32":
            invalid_path = "Z:\\nonexistent_folder\\subfolder\\settings.yaml"
            
        success = save_config({"key": "val"}, invalid_path)
        self.assertFalse(success)

if __name__ == "__main__":
    unittest.main()
