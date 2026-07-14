import unittest
import sys
import os
import tempfile
import json
from unittest.mock import patch, MagicMock

# Ensure correct import resolution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import core.updater_bridge as updater_bridge
from core.updater_bridge import (
    _find_git_root,
    load_local_version,
    handle_bridge_update_commands
)

class MockBridge:
    def __init__(self):
        self.state_history = []

    def update_state(self, new_state):
        self.state_history.append(new_state)

class TestUpdaterBridge(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_version_file = os.path.join(self.temp_dir.name, "version.json")
        
        # Write dummy version.json schema
        self.mock_version_data = {
            "version": "1.3.0",
            "release_date": "2026-05-24",
            "update_check_url": "http://mock-update-server.local/version.json",
            "changelog": [
                {
                    "version": "1.3.0",
                    "date": "2026-05-24",
                    "title": "Minor polish",
                    "highlights": ["Polish close action"]
                }
            ]
        }
        with open(self.temp_version_file, "w", encoding="utf-8") as f:
            json.dump(self.mock_version_data, f)
            
        # Patch VERSION_FILE path inside updater_bridge module
        self.path_patcher = patch("core.updater_bridge.VERSION_FILE", self.temp_version_file)
        self.path_patcher.start()

        # Patch PROJECT_ROOT path inside updater_bridge module to prevent git remote version calls
        self.root_patcher = patch("core.updater_bridge.PROJECT_ROOT", self.temp_dir.name)
        self.root_patcher.start()

    def tearDown(self):
        self.path_patcher.stop()
        self.root_patcher.stop()
        self.temp_dir.cleanup()

    def test_find_git_root(self):
        # Create a deep directory hierarchy to simulate climbing
        root = self.temp_dir.name
        git_dir = os.path.join(root, ".git")
        os.makedirs(git_dir, exist_ok=True)
        
        subfolder = os.path.join(root, "level1", "level2", "level3")
        os.makedirs(subfolder, exist_ok=True)
        
        found_root = _find_git_root(subfolder)
        self.assertEqual(os.path.normpath(found_root), os.path.normpath(root))

    def test_load_local_version(self):
        ver = load_local_version()
        self.assertEqual(ver.get("version"), "1.3.0")
        self.assertEqual(ver.get("release_date"), "2026-05-24")

    def test_handle_get_changelogs_command(self):
        bridge = MockBridge()
        handled = handle_bridge_update_commands("get_changelogs", {}, bridge)
        
        self.assertTrue(handled)
        self.assertEqual(len(bridge.state_history), 1)
        self.assertEqual(bridge.state_history[0].get("changelogs", {}).get("version"), "1.3.0")

    @patch("urllib.request.urlopen")
    def test_handle_check_updates_no_update_available(self, mock_urlopen):
        # Set up mock HTTP response for version check (return same version: 1.3.0)
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "version": "1.3.0",
            "changelog": []
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        bridge = MockBridge()
        handled = handle_bridge_update_commands("check_updates", {}, bridge)
        
        self.assertTrue(handled)
        
        # Since it runs in a thread, we join or wait until checking completes.
        # But wait, checking runs asynchronously. Let's wait a split second for the thread to update the status.
        import time
        for _ in range(20):
            if len(bridge.state_history) >= 2:
                break
            time.sleep(0.05)
            
        # Check output state history
        # First state update: {"update_state": {"status": "checking"}}
        # Second state update: {"update_state": {"status": "up_to_date", "current_version": "1.3.0"}}
        self.assertEqual(len(bridge.state_history), 2)
        self.assertEqual(bridge.state_history[0]["update_state"]["status"], "checking")
        self.assertEqual(bridge.state_history[1]["update_state"]["status"], "up_to_date")
        self.assertEqual(bridge.state_history[1]["update_state"]["current_version"], "1.3.0")

    @patch("urllib.request.urlopen")
    def test_handle_check_updates_new_update_available(self, mock_urlopen):
        # Set up mock HTTP response for version check (return newer version: 1.4.0)
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "version": "1.4.0",
            "changelog": [
                {
                    "version": "1.4.0",
                    "date": "2026-06-01",
                    "title": "Version 1.4.0",
                    "highlights": ["New features"]
                }
            ]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        bridge = MockBridge()
        handled = handle_bridge_update_commands("check_updates", {}, bridge)
        self.assertTrue(handled)
        
        import time
        for _ in range(20):
            if len(bridge.state_history) >= 2:
                break
            time.sleep(0.05)
            
        # First state update: {"update_state": {"status": "checking"}}
        # Second state update: {"update_state": {"status": "available", "current_version": "1.3.0", "latest_version": "1.4.0"}}
        self.assertEqual(len(bridge.state_history), 2)
        self.assertEqual(bridge.state_history[1]["update_state"]["status"], "available")
        self.assertEqual(bridge.state_history[1]["update_state"]["latest_version"], "1.4.0")

    def test_handle_invalid_command(self):
        bridge = MockBridge()
        handled = handle_bridge_update_commands("invalid_command", {}, bridge)
        self.assertFalse(handled)
        self.assertEqual(len(bridge.state_history), 0)

    @patch("urllib.request.urlopen")
    def test_handle_check_patches_fallback(self, mock_urlopen):
        # Force API request failure to trigger fallback
        mock_urlopen.side_effect = Exception("Connection refused")

        bridge = MockBridge()
        # Set PROJECT_ROOT inside module to temp dir to control path
        with patch("core.updater_bridge.PROJECT_ROOT", self.temp_dir.name):
            # Create dummy local issues file in the expected path format: Gaming/website/data/issues.json
            mock_issues_dir = os.path.join(self.temp_dir.name, "Gaming", "website", "data")
            os.makedirs(mock_issues_dir, exist_ok=True)
            mock_issues = [
                {
                    "id": "mock_001",
                    "title": "Mock Issue",
                    "description": "Mock Description",
                    "category": "performance",
                    "votes": 10,
                    "game": "Test Game",
                    "specs": {"os": "windows", "gpu": ""}
                }
            ]
            with open(os.path.join(mock_issues_dir, "issues.json"), "w", encoding="utf-8") as f:
                json.dump(mock_issues, f)

            # Mock platform.system and GPUMonitor to get matching telemetry specs
            with patch("platform.system", return_value="Windows"):
                handled = handle_bridge_update_commands("check_patches", {}, bridge)
                self.assertTrue(handled)

                import time
                for _ in range(40):
                    if len(bridge.state_history) >= 2:
                        break
                    time.sleep(0.05)

                # Expect: Checking state then Success status state
                self.assertEqual(len(bridge.state_history), 2)
                self.assertEqual(bridge.state_history[0]["patches_sync"]["status"], "checking")
                
                success_state = bridge.state_history[1]["patches_sync"]
                self.assertEqual(success_state["status"], "success")
                self.assertEqual(len(success_state["matched_issues"]), 1)
                self.assertEqual(success_state["matched_issues"][0]["id"], "mock_001")

if __name__ == "__main__":
    unittest.main()
