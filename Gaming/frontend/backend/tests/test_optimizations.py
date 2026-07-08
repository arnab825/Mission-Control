import unittest
import sys
import os
import time
import threading
import asyncio
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.pipeline_host import GamingAssistantPipeline
from core.bridge_server import BridgeServer

class TestOptimizations(unittest.TestCase):
    def setUp(self):
        # Create a mock config
        self.config = {
            "game_mode": "competitive",
            "capture": {"region": None, "backend": "auto", "focus_mode": "Primary Only"},
            "vision": {"ocr": {"enabled": False}},
            "memory": {"enabled": False},
            "headless": True
        }
        
    @patch("core.pipeline_host.ScreenCapture")
    @patch("core.pipeline_host.GameBrain")
    def test_active_window_caching(self, mock_brain, mock_capture):
        pipeline = GamingAssistantPipeline(self.config)
        pipeline._game_state = {"game_info": {"pid": 1234, "name": "Elden Ring"}, "game_minimized": False}
        
        # Mock sys.platform as win32
        with patch("sys.platform", "win32"), \
             patch("win32gui.GetForegroundWindow", return_value=11111) as mock_fg, \
             patch("win32gui.GetWindowText", return_value="Elden Ring") as mock_text, \
             patch("win32process.GetWindowThreadProcessId", return_value=(0, 1234)) as mock_pid, \
             patch("psutil.Process") as mock_proc:
            
            # Mock the process name
            mock_proc_instance = MagicMock()
            mock_proc_instance.name.return_value = "eldenring.exe"
            mock_proc.return_value = mock_proc_instance
            
            # First call
            is_active, is_focused, title = pipeline._is_game_active()
            self.assertTrue(is_active)
            self.assertEqual(title, "Elden Ring")
            
            # Second call (same PID) - should cache it and not call psutil.Process again
            is_active, is_focused, title = pipeline._is_game_active()
            self.assertTrue(is_active)
            
            # Assert psutil.Process was only called once
            mock_proc.assert_called_once_with(1234)

    @patch("core.pipeline_host.ScreenCapture")
    @patch("core.pipeline_host.GameBrain")
    @patch("core.pipeline_host.GamingAssistantPipeline._capture_loop")
    @patch("core.pipeline_host.GamingAssistantPipeline._vision_loop")
    @patch("core.pipeline_host.GamingAssistantPipeline._brain_loop")
    @patch("core.pipeline_host.GamingAssistantPipeline._display_loop")
    def test_non_blocking_start_and_watchdog(self, mock_display, mock_brain_loop, mock_vision_loop, mock_capture_loop, mock_brain, mock_capture):
        pipeline = GamingAssistantPipeline(self.config)
        pipeline.enable_threading = True
        pipeline.running = True
        
        # Call start threaded
        pipeline._start_threaded()
        
        # Verify threads are created and started
        self.assertIsNotNone(pipeline._capture_thread)
        self.assertIsNotNone(pipeline._vision_thread)
        self.assertIsNotNone(pipeline._brain_thread)
        self.assertIsNotNone(pipeline._display_thread)
        self.assertIsNotNone(pipeline._watchdog_thread)
        
        # Simulate display thread dying
        pipeline._display_thread = MagicMock()
        pipeline._display_thread.is_alive.return_value = False
        
        # Run watchdog check manually once (normally runs in watchdog loop)
        with patch("threading.Thread") as mock_thread_class:
            mock_new_thread = MagicMock()
            mock_thread_class.return_value = mock_new_thread
            
            # Perform a manual iteration of watchdog check
            if pipeline.enable_threading and not pipeline._display_thread.is_alive():
                pipeline._display_thread = threading.Thread(target=pipeline._display_loop, name="Display", daemon=True)
                pipeline._display_thread.start()
                
            self.assertEqual(pipeline._display_thread, mock_new_thread)
            mock_new_thread.start.assert_called_once()
            
        pipeline.running = False

    @patch("asyncio.run_coroutine_threadsafe")
    def test_bridge_delayed_flusher(self, mock_run_coroutine):
        # Create a bridge server
        bridge = BridgeServer(host="localhost", port=18765)
        bridge.loop = asyncio.new_event_loop()
        
        # Mock _schedule_delayed_flush to do nothing during update_state
        bridge._schedule_delayed_flush = MagicMock()
        
        # Mock client connection
        mock_client = MagicMock()
        async def mock_send(msg):
            mock_client.sent_messages.append(msg)
        mock_client.send = mock_send
        mock_client.sent_messages = []
        bridge.clients.add(mock_client)
        
        # State contains active game mode
        bridge._state["is_game_active"] = True
        
        # Set pending time and dict so the first call is throttled
        import time
        bridge._game_pending = {}
        bridge._game_pending_time = time.monotonic()
        
        # Trigger update_state (non-bypass key "some_telemetry_key")
        # Since it is throttled, it should not send immediately but schedule a delayed flush
        bridge.update_state({"some_telemetry_key": "val1"})
        
        # Verify it has not been broadcasted immediately
        self.assertEqual(len(mock_client.sent_messages), 0)
        self.assertTrue(getattr(bridge, "_flush_scheduled"))
        self.assertIn("some_telemetry_key", bridge._game_pending)
        
        # Run delayed flush coroutine manually on bridge's event loop
        async def run_test():
            await bridge._delayed_flush()
            
        bridge.loop.run_until_complete(run_test())
        
        # Verify it has been broadcasted after the flush
        self.assertEqual(len(mock_client.sent_messages), 1)
        self.assertFalse(getattr(bridge, "_flush_scheduled"))
        self.assertEqual(bridge._game_pending, {})
        
        bridge.loop.close()

    @patch("core.pipeline_host.ScreenCapture")
    @patch("core.pipeline_host.GameBrain")
    def test_is_game_active_exclusions_and_zero_width_space(self, mock_brain, mock_capture):
        pipeline = GamingAssistantPipeline(self.config)
        pipeline._game_state = {"game_info": None, "game_minimized": False}
        
        # Test Case 1: Browser (Edge) focused at startup (is_running = False) with zero-width space in title
        with patch("sys.platform", "win32"), \
             patch("win32gui.GetForegroundWindow", return_value=11111), \
             patch("win32gui.GetWindowText", return_value="Meet - wji-adwz-djo - Personal - Microsoft\u200b Edge") as mock_text, \
             patch("win32process.GetWindowThreadProcessId", return_value=(0, 5678)) as mock_pid, \
             patch("psutil.Process") as mock_proc:
             
            mock_proc_instance = MagicMock()
            mock_proc_instance.name.return_value = "msedge.exe"
            mock_proc.return_value = mock_proc_instance
            
            is_active, is_focused, reason = pipeline._is_game_active()
            self.assertFalse(is_active)
            self.assertFalse(is_focused)
            self.assertIn("Excluded process", reason)

        # Test Case 2: Game is running (is_running = True) but user Alt+Tabs to Edge (with zero-width space)
        pipeline._game_state = {"game_info": {"pid": 1234, "name": "Elden Ring"}, "game_minimized": False}
        with patch("sys.platform", "win32"), \
             patch("win32gui.GetForegroundWindow", return_value=11111), \
             patch("win32gui.GetWindowText", return_value="Meet - wji-adwz-djo - Personal - Microsoft\u200b Edge") as mock_text, \
             patch("win32process.GetWindowThreadProcessId", return_value=(0, 5678)) as mock_pid, \
             patch("psutil.Process") as mock_proc:
             
            mock_proc_instance = MagicMock()
            mock_proc_instance.name.return_value = "msedge.exe"
            mock_proc.return_value = mock_proc_instance
            
            is_active, is_focused, title = pipeline._is_game_active()
            # Game is still running in background
            self.assertTrue(is_active)
            # Edge is not focused game
            self.assertFalse(is_focused)
            # Title should still be original game name (not Edge)
            self.assertEqual(title, "Elden Ring")

    def test_estimate_cpu_max_freq(self):
        from core.runtime_helpers import estimate_cpu_max_freq
        
        # Test Case 1: Specific Intel 13th Gen CPU in database (user's CPU)
        self.assertEqual(estimate_cpu_max_freq("13th Gen Intel(R) Core(TM) i7-13620H", 2400), 4900)
        
        # Test Case 2: Intel 14th Gen i9 (exact match)
        self.assertEqual(estimate_cpu_max_freq("Intel(R) Core(TM) i9-14900KF CPU @ 3.20GHz", 3200), 6000)
        
        # Test Case 3: Intel 12th Gen i7 (heuristic fallback)
        self.assertEqual(estimate_cpu_max_freq("12th Gen Intel(R) Core(TM) i7-12700H", 2300), 4700)
        
        # Test Case 4: AMD Ryzen 7 7800X3D (exact match)
        self.assertEqual(estimate_cpu_max_freq("AMD Ryzen 7 7800X3D 8-Core Processor", 4200), 5000)
        
        # Test Case 5: AMD Ryzen 5 5600X (exact match)
        self.assertEqual(estimate_cpu_max_freq("AMD Ryzen 5 5600X 6-Core Processor", 3700), 4600)
        
        # Test Case 6: Unknown CPU (no match) -> fallback to base frequency if base frequency > 2400, else 2400
        self.assertEqual(estimate_cpu_max_freq("Unknown Processor Model", 3600), 3600)
        self.assertEqual(estimate_cpu_max_freq("Unknown Processor Model", 1800), 2400)

if __name__ == "__main__":
    unittest.main()
