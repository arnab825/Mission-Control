import unittest
import threading
import time
from unittest.mock import MagicMock, patch
from system.game_scanner import GameScanner
from handlers.game_handler import handle_set_scan_background, handle_scan_games, _scan_is_background


class TestScanConcurrencyAndBackground(unittest.TestCase):
    def setUp(self):
        # Reset GameScanner singleton state
        GameScanner._is_scanning_now = False
        GameScanner._current_progress = 0
        GameScanner._current_status = "Ready"
        GameScanner._progress_listeners = []
        GameScanner._scan_completed_event.set()
        GameScanner._last_scanned_games = []

    def test_multiplexed_listeners_during_active_scan(self):
        """Verify that concurrent scan_all calls multiplex listeners instead of hardcoded 50% stuck state."""
        progress_updates_1 = []
        progress_updates_2 = []

        scanner = GameScanner()

        # Mock _execute_scan to simulate a multi-step scan
        def fake_execute_scan(progress_cb):
            for pct, status in [(10, "Steam"), (30, "Epic"), (70, "Custom"), (100, "Complete")]:
                if progress_cb:
                    progress_cb(pct, status)
                time.sleep(0.05)
            return [{"name": "Mock Game", "platform": "Steam"}]

        with patch.object(scanner, "_execute_scan", side_effect=fake_execute_scan):
            def run_scan_1():
                scanner.scan_all(progress_callback=lambda p, s: progress_updates_1.append((p, s)))

            def run_scan_2():
                # Start shortly after scan 1
                time.sleep(0.02)
                scanner.scan_all(progress_callback=lambda p, s: progress_updates_2.append((p, s)))

            t1 = threading.Thread(target=run_scan_1)
            t2 = threading.Thread(target=run_scan_2)
            t1.start()
            t2.start()
            t1.join(timeout=5)
            t2.join(timeout=5)

            # Both threads should have completed cleanly
            self.assertFalse(t1.is_alive())
            self.assertFalse(t2.is_alive())

            # Progress updates in thread 1 should reflect scan steps
            self.assertTrue(len(progress_updates_1) >= 4)
            # Progress updates in thread 2 should have received real progress, NOT stuck 50%
            self.assertTrue(len(progress_updates_2) > 0)
            percentages_2 = [p[0] for p in progress_updates_2]
            self.assertIn(100, percentages_2)
            # Verify it did not emit the legacy hardcoded 50% "Syncing with active scan..."
            statuses_2 = [p[1] for p in progress_updates_2]
            self.assertNotIn("Syncing with active scan...", statuses_2)

    def test_set_scan_background_command(self):
        """Verify set_scan_background updates backend state and bridge telemetry."""
        bridge_mock = MagicMock()
        handle_set_scan_background({"is_background": True}, bridge_mock)

        # Bridge should have received scan_state with is_background: True
        bridge_mock.update_state.assert_called_once()
        call_arg = bridge_mock.update_state.call_args[0][0]
        self.assertIn("scan_state", call_arg)
        self.assertTrue(call_arg["scan_state"]["is_background"])


if __name__ == "__main__":
    unittest.main()
