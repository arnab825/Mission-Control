import unittest
import sys
import os
import re
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from control.commands import CommandHandler
from voice.voice_manager import VoiceManager
from ai_brain.decision_maker import GameBrain


class TestVoiceAgentCommands(unittest.TestCase):
    def setUp(self):
        self.command_handler = CommandHandler()

    def test_optimize_command_not_hijacked_by_legacy_mock(self):
        """Ensure 'optimize' is NOT hijacked by the legacy mock returning hardcoded DLSS text."""
        response = self.command_handler.handle_command("optimize cyberpunk")
        self.assertIn("don't recognize", response.lower())
        self.assertNotIn("dlss", response.lower())
        self.assertNotIn("borderless", response.lower())

        response2 = self.command_handler.handle_command("optimize settings")
        self.assertIn("don't recognize", response2.lower())
        self.assertNotIn("dlss", response2.lower())

    def test_legacy_streaming_mode_preserved(self):
        """Check that streaming mode command still operates."""
        response = self.command_handler.handle_command("enable streaming mode")
        self.assertIn("streaming mode enabled", response.lower())

    def test_voice_manager_speech_sanitization(self):
        """Check that VoiceManager.speak removes bracket tags, URLs, and markdown formatting."""
        vm = VoiceManager(config={"voice": {"enabled": True}})
        # Ensure TTS loop doesn't actually play audio in headless test
        vm._tts_loop = MagicMock()

        test_cases = [
            (
                "[SYSTEM_COMMAND:optimize_system] System optimization complete!",
                "System optimization complete!"
            ),
            (
                "[LAUNCH_COMMAND:cyberpunk] Launching **Cyberpunk 2077** now!",
                "Launching Cyberpunk 2077 now!"
            ),
            (
                "Check out [Mission Control Docs](https://github.com/mission-control) for details!",
                "Check out Mission Control Docs for details!"
            ),
            (
                "⚡ **Neural Pulse**: High performance activated! `fast_mode=1`",
                "Neural Pulse: High performance activated! fast mode=1"
            ),
            (
                "[WebSearchTrigger:nvidia dlss 4] Searching web...",
                "Searching web..."
            ),
        ]

        for input_text, expected_substr in test_cases:
            # Drain queue
            while not vm.speech_queue.empty():
                vm.speech_queue.get_nowait()

            vm.speak(input_text, force=True)
            self.assertFalse(vm.speech_queue.empty(), f"Expected item queued for: {input_text}")
            queued_text = vm.speech_queue.get_nowait()
            self.assertNotIn("[SYSTEM_COMMAND", queued_text)
            self.assertNotIn("[LAUNCH_COMMAND", queued_text)
            self.assertNotIn("[WebSearchTrigger", queued_text)
            self.assertNotIn("https://", queued_text)
            self.assertNotIn("**", queued_text)
            self.assertIn(expected_substr, queued_text)

    def test_voice_manager_empty_or_tag_only_not_enqueued(self):
        """Verify that pure tag string or empty string does not produce audible speech."""
        vm = VoiceManager(config={"voice": {"enabled": True}})
        vm._tts_loop = MagicMock()

        while not vm.speech_queue.empty():
            vm.speech_queue.get_nowait()

        vm.speak("[SYSTEM_COMMAND:set_cooling_mode:performance]", force=True)
        self.assertTrue(vm.speech_queue.empty())

        vm.speak("", force=True)
        self.assertTrue(vm.speech_queue.empty())

        vm.speak("   ", force=True)
        self.assertTrue(vm.speech_queue.empty())

    def test_decision_maker_telemetry_exclusion(self):
        """Verify that internal keys like nvidia_tip and perf_advisor_analysis do not leak into custom_telemetry."""
        self.assertIn("nvidia_tip", GameBrain.STANDARD_KEYS)
        self.assertIn("perf_advisor_analysis", GameBrain.STANDARD_KEYS)
        self.assertIn("perf_score", GameBrain.STANDARD_KEYS)
        self.assertIn("fps", GameBrain.STANDARD_KEYS)
        self.assertIn("cooling_mode", GameBrain.STANDARD_KEYS)

        # Create mock GameBrain
        with patch("system.hw_checker.check_internet", return_value=False):
            brain = GameBrain(config={})

        game_state = {
            "health": 100,
            "current_game": "Cyberpunk 2077",
            "nvidia_tip": "💡 DLSS Super Resolution: ENABLE",
            "perf_advisor_analysis": "GPU is thermally constrained",
            "perf_score": 85,
            "custom_stat": "Level 45"
        }

        # Filter state using brain.STANDARD_KEYS as done in decide() and reply_to_prompt()
        custom_telemetry = {}
        for k, v in game_state.items():
            if k not in brain.STANDARD_KEYS and not k.startswith("_") and v is not None:
                custom_telemetry[k] = v

        self.assertNotIn("nvidia_tip", custom_telemetry)
        self.assertNotIn("perf_advisor_analysis", custom_telemetry)
        self.assertNotIn("perf_score", custom_telemetry)
        self.assertIn("custom_stat", custom_telemetry)


if __name__ == "__main__":
    unittest.main()
