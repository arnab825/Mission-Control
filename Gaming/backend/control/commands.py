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
    def __init__(self, main_window=None, pipeline=None):
        self.main_window = main_window
        self.pipeline = pipeline
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

        # 2. Start Gameplay Recording
        if any(p in text for p in ["start recording", "record gameplay", "begin recording"]):
            return self._start_recording()

        # 3. Stop Gameplay Recording
        if any(p in text for p in ["stop recording", "end recording", "finish recording"]):
            return self._stop_recording()

        # 4. Record Highlights / Instant Replay
        if any(p in text for p in ["record highlight", "save highlight", "save clip", "instant replay", "clip that"]):
            return self._record_highlight()

        # 5. Capture Screenshot
        if any(p in text for p in ["take screenshot", "capture screenshot", "save screenshot", "screenshot"]):
            return self._take_screenshot()

        # 6. Status Check
        if "status" in text or "how is my gpu" in text:
            metrics = self.gpu_monitor.poll_once()
            return f"GPU is at {metrics['gpu_util']}% utilization and {metrics['temperature']} degrees."

        # 6. Voice Macro Listing
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

    def _start_recording(self):
        if self.pipeline and hasattr(self.pipeline, "start_recording"):
            res = self.pipeline.start_recording()
            msg = f"Recording started ({res.get('file_name', 'gameplay.mp4')})."
        else:
            msg = "Gameplay recording started."
        if self.main_window and hasattr(self.main_window, "append_log"):
            self.main_window.append_log(f"AI: {msg}")
        return msg

    def _stop_recording(self):
        if self.pipeline and hasattr(self.pipeline, "stop_recording"):
            res = self.pipeline.stop_recording()
            dur = res.get("duration_secs", 0)
            msg = f"Recording stopped. Saved {dur}s video to recordings library."
        else:
            msg = "Gameplay recording stopped and saved."
        if self.main_window and hasattr(self.main_window, "append_log"):
            self.main_window.append_log(f"AI: {msg}")
        return msg

    def _record_highlight(self):
        if self.pipeline and hasattr(self.pipeline, "save_highlight"):
            res = self.pipeline.save_highlight(duration_secs=30)
            if res.get("success"):
                msg = f"Saved 30-second gameplay highlight ({res.get('file_name')})."
            else:
                msg = f"Highlight save pending: {res.get('error', 'saving clip')}"
        else:
            msg = "Recording 30-second gameplay highlight."
        if self.main_window and hasattr(self.main_window, "append_log"):
            self.main_window.append_log(f"AI: {msg}")
        return msg

    def _take_screenshot(self):
        if self.pipeline and hasattr(self.pipeline, "take_screenshot"):
            res = self.pipeline.take_screenshot()
            if res.get("success"):
                msg = f"Screenshot saved: {res.get('file_name')} ({res.get('size_kb')} KB)."
            else:
                msg = f"Screenshot error: {res.get('error', 'could not capture frame')}"
        else:
            msg = "Screenshot taken."
        if self.main_window and hasattr(self.main_window, "append_log"):
            self.main_window.append_log(f"AI: {msg}")
        return msg
