import unittest
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from system.optimizer import Optimizer

class TestOptimizer(unittest.TestCase):
    def setUp(self):
        self.get_brightness_patch = patch("system.optimizer.Optimizer.get_brightness", return_value=None)
        self.set_brightness_patch = patch("system.optimizer.Optimizer.set_brightness", return_value=True)
        self.flush_working_sets_patch = patch("system.optimizer.Optimizer.flush_working_sets", return_value=True)
        self.get_brightness_patch.start()
        self.set_brightness_patch.start()
        self.flush_working_sets_patch.start()

    def tearDown(self):
        self.get_brightness_patch.stop()
        self.set_brightness_patch.stop()
        self.flush_working_sets_patch.stop()

    @patch("subprocess.run")
    def test_optimize_game(self, mock_run):
        # Set up mock response for powercfg setactive
        mock_response = MagicMock()
        mock_response.returncode = 0
        mock_response.stdout = "Power Scheme GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  (High performance)"
        mock_run.return_value = mock_response

        # We will mock os.name as 'nt' (Windows) so the plan activation logic runs
        with patch("os.name", "nt"):
            game_data = {"exe_path": "C:\\Games\\eldenring.exe"}
            success, results = Optimizer.optimize_game(game_data)
            
            self.assertTrue(success)
            self.assertTrue(any("Power plan:" in r for r in results))
            self.assertTrue(any("Flushed RAM Working Sets" in r for r in results))
            self.assertTrue(any("GPU Priority locked" in r for r in results))

    @patch("subprocess.run")
    def test_revert_optimization(self, mock_run):
        mock_response = MagicMock()
        mock_response.returncode = 0
        mock_run.return_value = mock_response

        with patch("os.name", "nt"):
            game_data = {"exe_path": "C:\\Games\\eldenring.exe"}
            success, results = Optimizer.revert_optimization(game_data)
            
            self.assertTrue(success)
            self.assertTrue(any("Power plan:" in r for r in results))
            self.assertTrue(any("Reset priority" in r for r in results))

    @patch("subprocess.run")
    def test_set_priority(self, mock_run):
        mock_response = MagicMock()
        mock_response.returncode = 0
        mock_run.return_value = mock_response
        
        success = Optimizer.set_priority("eldenring.exe", "High")
        self.assertTrue(success)
        
        # Verify it runs a powershell command
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertIn("powershell", args)
        self.assertIn("eldenring", args[-1])

    @patch("psutil.process_iter")
    @patch("subprocess.run")
    def test_set_priority_native(self, mock_run, mock_process_iter):
        mock_process = MagicMock()
        mock_process.info = {'name': 'eldenring.exe'}
        mock_process_iter.return_value = [mock_process]
        
        with patch("psutil.HIGH_PRIORITY_CLASS", 128, create=True):
            success = Optimizer.set_priority("eldenring.exe", "High")
            self.assertTrue(success)
            mock_process.nice.assert_called_with(128)
            mock_run.assert_not_called()

    @patch("subprocess.run")
    def test_set_gpu_preference_native(self, mock_run):
        winreg_mock = MagicMock()
        winreg_mock.REG_SZ = 1
        with patch.dict("sys.modules", {"winreg": winreg_mock}):
            with patch("os.name", "nt"):
                # Test enable=True
                success = Optimizer.set_gpu_preference("C:\\Games\\eldenring.exe", enable=True)
                self.assertTrue(success)
                winreg_mock.OpenKey.assert_called()
                winreg_mock.SetValueEx.assert_called_with(winreg_mock.OpenKey.return_value, "C:\\Games\\eldenring.exe", 0, 1, "GpuPreference=2;")
                mock_run.assert_not_called()
                
                # Test enable=False
                winreg_mock.reset_mock()
                success = Optimizer.set_gpu_preference("C:\\Games\\eldenring.exe", enable=False)
                self.assertTrue(success)
                winreg_mock.DeleteValue.assert_called_with(winreg_mock.OpenKey.return_value, "C:\\Games\\eldenring.exe")
                mock_run.assert_not_called()

    @patch("subprocess.run")
    def test_set_gpu_preference_fallback(self, mock_run):
        winreg_mock = MagicMock()
        winreg_mock.OpenKey.side_effect = Exception("Registry access denied")
        with patch.dict("sys.modules", {"winreg": winreg_mock}):
            with patch("os.name", "nt"):
                mock_response = MagicMock()
                mock_response.returncode = 0
                mock_run.return_value = mock_response

                # Test enable=True fallback
                success = Optimizer.set_gpu_preference("C:\\Games\\eldenring.exe", enable=True)
                self.assertTrue(success)
                mock_run.assert_called()
                args = mock_run.call_args[0][0]
                self.assertIn("reg add", args[-1])
                self.assertIn("GpuPreference=2", args[-1])
                
                # Test enable=False fallback
                mock_run.reset_mock()
                success = Optimizer.set_gpu_preference("C:\\Games\\eldenring.exe", enable=False)
                self.assertTrue(success)
                mock_run.assert_called()
                args = mock_run.call_args[0][0]
                self.assertIn("reg delete", args[-1])

    @patch("subprocess.run")
    def test_set_power_plan_not_windows(self, mock_run):
        with patch("os.name", "posix"):
            success, msg = Optimizer.set_power_plan("max")
            self.assertFalse(success)
            self.assertEqual(msg, "Not supported on this OS.")
            mock_run.assert_not_called()

    @patch("subprocess.run")
    def test_set_power_plan_existing_match(self, mock_run):
        # Simulate powercfg listing existing schemes
        mock_list = MagicMock()
        mock_list.returncode = 0
        mock_list.stdout = (
            "Existing Power Schemes: (* Active)\n"
            "----------------------------------\n"
            "Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced) *\n"
            "Power Scheme GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  (High performance)\n"
        )
        
        mock_set = MagicMock()
        mock_set.returncode = 0
        
        mock_run.side_effect = [mock_list, mock_set]

        with patch("os.name", "nt"):
            success, msg = Optimizer.set_power_plan("max")
            self.assertTrue(success, f"Failed setting power plan: {msg}")
            self.assertIn("Successfully activated existing plan", msg)
            
            # Check powercfg setactive was called with the High Performance GUID
            setactive_call = mock_run.call_args_list[1][0][0]
            self.assertIn("/setactive", setactive_call)
            self.assertIn("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c", setactive_call)

if __name__ == "__main__":
    unittest.main()
