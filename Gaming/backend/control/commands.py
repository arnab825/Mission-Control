import logging
import re
from nvidia.perf_advisor import PerformanceAdvisor
from nvidia.capabilities import GPUCapabilities
from nvidia.gpu_monitor import GPUMonitor

logger = logging.getLogger(__name__)

class CommandHandler:
    """
    Handles voice and text commands for the AI assistant.
    """
    def __init__(self, main_window=None):
        self.main_window = main_window
        self.gpu_monitor = GPUMonitor()
        self.gpu_caps = GPUCapabilities()
        self.advisor = PerformanceAdvisor(capabilities=self.gpu_caps)

    def handle_command(self, text):
        """Process a natural language command."""
        text = text.lower()
        logger.info(f"Processing command: {text}")

        # 1. Streaming Mode
        if "enable streaming mode" in text or "start streaming mode" in text:
            return self._enable_streaming_mode()

        # 3. Record Highlights
        if "record" in text and "highlight" in text:
            return self._record_highlight()

        # 4. Status Check
        if "status" in text or "how is my gpu" in text:
            metrics = self.gpu_monitor.poll_once()
            return f"GPU is at {metrics['gpu_util']}% utilization and {metrics['temperature']} degrees."

        # 5. Voice Macro Listing
        if any(phrase in text for phrase in ["list macros", "macro list", "available macros", "show macros", "what macros"]):
            return self._list_macros()

        return "I'm sorry, I don't recognize that command."

    def _list_macros(self):
        """List all available voice macros."""
        try:
            from voice.voice_macros import VoiceMacroEngine
            engine = VoiceMacroEngine()
            macros = engine.list_macros()
            if not macros:
                return "No voice macros are configured."
            lines = ["**Available Voice Macros:**"]
            for trigger, keys in sorted(macros.items()):
                key_str = " + ".join(keys)
                lines.append(f"  • \"{trigger}\" → [{key_str}]")
            return "\n".join(lines)
        except Exception as e:
            return f"Could not load macros: {e}"

    def _enable_streaming_mode(self):
        # Mock action: set NVENC to high quality, disable background tasks
        msg = "Streaming mode enabled. NVENC prioritized for AV1 encoding (if supported). High-performance capture active."
        if self.main_window:
            self.main_window.append_log(f"AI: {msg}")
        return msg

    def _record_highlight(self):
        # Mock action: trigger ShadowPlay shortcut
        msg = "Recording gameplay highlight via NVIDIA ShadowPlay."
        if self.main_window:
            self.main_window.append_log(f"AI: {msg}")
        return msg
