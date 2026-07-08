import unittest
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from system.process_watcher import ProcessWatcher

class TestProcessWatcher(unittest.TestCase):
    def setUp(self):
        # Mock GetForegroundWindow to prevent real window detection during tests
        self.fg_patcher = patch("win32gui.GetForegroundWindow", return_value=0)
        self.fg_patcher.start()
        
        self.registry = [
            {
                "name": "Elden Ring",
                "exe_path": "C:\\Games\\SteamLibrary\\steamapps\\common\\Elden Ring\\Game\\eldenring.exe",
                "install_path": "C:\\Games\\SteamLibrary\\steamapps\\common\\Elden Ring"
            },
            {
                "name": "Valorant",
                "exe_path": "C:\\Riot Games\\VALORANT\\live\\VALORANT.exe",
                "install_path": "C:\\Riot Games\\VALORANT"
            }
        ]

    def tearDown(self):
        self.fg_patcher.stop()

    @patch("psutil.process_iter")
    def test_detect_running_game_registry_match(self, mock_iter):
        # Mock running processes list
        # Simulate that eldenring.exe is running
        mock_proc = MagicMock()
        mock_proc.info = {'name': 'eldenring.exe'}
        mock_proc.pid = 9999
        mock_iter.return_value = [mock_proc]

        watcher = ProcessWatcher(game_registry=self.registry)
        game_info = watcher._detect_running_game()
        
        self.assertIsNotNone(game_info)
        self.assertEqual(game_info["name"], "Elden Ring")
        self.assertEqual(game_info["pid"], 9999)
        self.assertEqual(game_info["source"], "registry")

    @patch("psutil.process_iter")
    def test_detect_running_game_path_match(self, mock_iter):
        # Test matching by sub-folder path (e.g. process starts with install_path)
        mock_proc = MagicMock()
        mock_proc.info = {'name': 'somegame.exe'}
        mock_proc.exe.return_value = "C:\\Games\\SteamLibrary\\steamapps\\common\\Elden Ring\\bin\\somegame.exe"
        mock_proc.pid = 8888
        mock_iter.return_value = [mock_proc]

        watcher = ProcessWatcher(game_registry=self.registry)
        game_info = watcher._detect_running_game()
        
        self.assertIsNotNone(game_info)
        self.assertEqual(game_info["name"], "Elden Ring")
        self.assertEqual(game_info["pid"], 8888)
        self.assertEqual(game_info["source"], "registry_path")

    @patch("psutil.process_iter")
    def test_ignore_browsers_and_launchers(self, mock_iter):
        # Chrome.exe and steam.exe are running, but should be ignored
        proc_chrome = MagicMock()
        proc_chrome.info = {'name': 'chrome.exe'}
        proc_chrome.pid = 1111
        
        proc_steam = MagicMock()
        proc_steam.info = {'name': 'steam.exe'}
        proc_steam.pid = 2222
        
        mock_iter.return_value = [proc_chrome, proc_steam]

        watcher = ProcessWatcher(game_registry=self.registry)
        game_info = watcher._detect_running_game()
        
        self.assertIsNone(game_info)

    @patch("psutil.process_iter")
    def test_detect_running_game_heuristic(self, mock_iter):
        mock_iter.return_value = [] # No registry matches
        
        watcher = ProcessWatcher(game_registry=self.registry)
        
        # Mock the GPUMonitor heuristic detection
        mock_gpu_monitor = MagicMock()
        mock_gpu_monitor.is_available = True
        mock_gpu_monitor.get_active_graphics_processes.return_value = [
            {"name": "cyberpunk2077.exe", "pid": 1234, "memory_mb": 1500}
        ]
        watcher._gpu_monitor = mock_gpu_monitor
        
        # Mock window minimized check
        with patch.object(watcher, "_is_window_minimized", return_value=False):
            game_info = watcher._detect_running_game()
            
            self.assertIsNotNone(game_info)
            self.assertEqual(game_info["name"], "Cyberpunk2077")
            self.assertEqual(game_info["pid"], 1234)
            self.assertEqual(game_info["source"], "nvidia_neural")

    def test_callbacks_start_stop(self):
        watcher = ProcessWatcher(poll_interval=0.1, game_registry=self.registry)
        self.assertFalse(watcher._running)
        
        # Start and stop loop
        watcher.start()
        self.assertTrue(watcher._running)
        self.assertIsNotNone(watcher._thread)
        self.assertTrue(watcher._thread.is_alive())
        
        watcher.stop()
        self.assertFalse(watcher._running)

if __name__ == "__main__":
    unittest.main()
