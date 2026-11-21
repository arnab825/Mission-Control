"""
Unit tests for BorderlessManager and Benchmark Session Lifecycle.
"""
import unittest
import sys
import os
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from capture.borderless_manager import BorderlessManager
from core.command_schemas import validate_bridge_command


class TestBorderlessManager(unittest.TestCase):
    def setUp(self):
        self.mgr = BorderlessManager()

    def test_manager_instantiation(self):
        self.assertIsNotNone(self.mgr)

    @patch("win32gui.IsWindow", return_value=True)
    @patch("win32gui.GetWindowLong")
    def test_is_borderless_detection(self, mock_get_long, mock_is_win):
        # WS_CAPTION = 0x00C00000, WS_THICKFRAME = 0x00040000
        # Normal window with caption:
        mock_get_long.return_value = 0x00C00000 | 0x00040000
        self.assertFalse(self.mgr.is_borderless(12345))

        # Borderless window without caption or thickframe:
        mock_get_long.return_value = 0x80000000 # WS_POPUP
        self.assertTrue(self.mgr.is_borderless(12345))

    @patch("win32gui.IsWindow", return_value=True)
    @patch("win32gui.GetWindowLong")
    @patch("win32gui.GetWindowRect", return_value=(100, 100, 900, 700))
    @patch("win32api.MonitorFromWindow", return_value=1)
    @patch("win32api.GetMonitorInfo", return_value={"Monitor": (0, 0, 1920, 1080)})
    @patch("win32gui.SetWindowLong")
    @patch("win32gui.SetWindowPos")
    def test_coerce_and_restore(self, mock_set_pos, mock_set_long, mock_mon_info, mock_mon_win, mock_rect, mock_get_long, mock_is_win):
        # Return normal bordered window style (has WS_CAPTION = 0x00C00000)
        mock_get_long.return_value = 0x00C40000
        hwnd = 0xABCD
        success = self.mgr.coerce_to_borderless(hwnd)
        self.assertTrue(success)
        mock_set_pos.assert_called_once()

        # Verify restore
        restore_success = self.mgr.restore_window(hwnd)
        self.assertTrue(restore_success)


class TestBenchmarkCommandValidation(unittest.TestCase):
    def test_borderless_and_benchmark_commands(self):
        valid, payload, err = validate_bridge_command("coerce_borderless", {})
        self.assertTrue(valid, f"coerce_borderless validation error: {err}")

        valid, payload, err = validate_bridge_command("restore_borderless", {})
        self.assertTrue(valid, f"restore_borderless validation error: {err}")

        valid, payload, err = validate_bridge_command("start_benchmark_session", {})
        self.assertTrue(valid, f"start_benchmark_session validation error: {err}")

        valid, payload, err = validate_bridge_command("stop_benchmark_session", {})
        self.assertTrue(valid, f"stop_benchmark_session validation error: {err}")


if __name__ == "__main__":
    unittest.main()
