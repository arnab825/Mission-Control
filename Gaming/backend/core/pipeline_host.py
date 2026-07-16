"""Multi-threaded capture to vision to brain pipeline (Electron/React UI)."""
from __future__ import annotations

import base64
import logging
import random
import sys
import threading
import time
from typing import Any, Dict, List, Optional

import cv2  # type: ignore[reportMissingImports]
import numpy as np
from pynput import keyboard  # type: ignore[reportMissingModuleSource]

try:
    import psutil  # type: ignore[reportMissingImports]
except ImportError:
    psutil = None

from ai_brain.decision_maker import GameBrain
from ai_brain.memory import GameMemory
from ai_brain.story_analyzer import StoryAnalyzer
from core.bridge_server import bridge
from capture.frame_buffer import FrameBuffer
from capture.screen import ScreenCapture
from control.commands import CommandHandler
from control.input_manager import InputManager
from core.runtime_helpers import TelemetryThread
from core.state_models import GENRE_MODE_MAP, TITLE_GENRE_MAP, TelemetryState
from system.hw_checker import HardwareChecker
from vision.scene_classifier import SceneClassifier
from vision.simple_rules import SimpleDetector

try:
    from fps_counter.fps_counter_dx import fps_counter as _fps_counter_dx
    _FPS_COUNTER_AVAILABLE = True
except Exception:
    _fps_counter_dx = None
    _FPS_COUNTER_AVAILABLE = False

logger = logging.getLogger(__name__)

try:
    from vision.yolo_detector import YOLODetector
    _YOLO_AVAILABLE = True
except ImportError:
    _YOLO_AVAILABLE = False

try:
    from vision.ocr_reader import OCRReader
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False

try:
    from nvidia.capabilities import GPUCapabilities
    from nvidia.gpu_monitor import GPUMonitor
    from nvidia.perf_advisor import PerformanceAdvisor
    _NVIDIA_MONITOR_AVAILABLE = True
except ImportError:
    _NVIDIA_MONITOR_AVAILABLE = False

try:
    from voice.voice_manager import VoiceManager
    _VOICE_AVAILABLE = True
except ImportError:
    _VOICE_AVAILABLE = False

try:
    from capture.window_detector import WindowDetector
    _WINDOW_DETECTOR_AVAILABLE = True
except ImportError:
    _WINDOW_DETECTOR_AVAILABLE = False


class _LoopFPS:
    """Simple FPS counter for a processing loop."""

    def __init__(self, window=30):
        self._times = []
        self._window = window

    def tick(self):
        self._times.append(time.perf_counter())
        if len(self._times) > self._window:
            self._times.pop(0)

    @property
    def fps(self):
        if len(self._times) < 2:
            return 0.0
        elapsed = self._times[-1] - self._times[0]
        return (len(self._times) - 1) / elapsed if elapsed > 0 else 0.0


class GamingAssistantPipeline:
    """
    Multi-threaded gaming assistant pipeline.
    
    Architecture:
      Capture Thread (60-120hz) → FrameBuffer → Vision Thread (30-60hz)
      → AI Brain Thread (10-30hz) → Overlay/Display
    """

    def __init__(self, config):
        self.config = config
        self.running = False
        self.game_mode = config.get("game_mode", "competitive")

        # Neural Security Locks
        self.neural_security_lock = False
        from core.security import verify_uuid_lock
        if not verify_uuid_lock(config):
            self.neural_security_lock = True
            logger.critical("[Security] Motherboard UUID verification failed at startup. Pipeline locked.")

        self.action_confirm_callback = config.get("action_confirm_callback")
        agentic_cfg = config.get("agentic", {})
        self.agentic_confirmation_delay = int(agentic_cfg.get("confirmation_delay", 2))
        
        # ── Core Components ───────────────────────────────────────
        capture_cfg = config.get("capture", {})
        capture_backend = capture_cfg.get("backend", "auto")
        if capture_backend == "dxgi":
            capture_backend = "dxcam"
        elif capture_backend == "bitblt":
            capture_backend = "mss"
        self._last_capture_backend = capture_backend

        self.capture = ScreenCapture(
            region=capture_cfg.get("region"),
            backend=capture_backend,
            target_fps=capture_cfg.get("fps_cap_limit", 60) if capture_cfg.get("cap_fps", False) else 0,
            # Pin to primary GPU output — critical when CUDA creates extra virtual
            # display adapters that can cause dxcam to iterate all of them.
            device_index=capture_cfg.get("device_index", 0),
            output_index=capture_cfg.get("output_index", 0),
        )
        self.frame_buffer = FrameBuffer()
        
        # Vision
        vision_cfg = config.get("vision", {})
        self.simple_detector = SimpleDetector(config=vision_cfg)
        self.scene_classifier = SceneClassifier(
            config=vision_cfg.get("scene_detection", {})
        )
        
        # YOLO detector (optional)
        self.yolo_detector = None
        if vision_cfg.get("detector") in ("yolo", "trt", "cuda") and _YOLO_AVAILABLE:
            yolo_model = vision_cfg.get("yolo_model", "yolov8n.pt")
            import os
            engine_path = os.path.join("models", "yolov8n.engine")
            pt_path = os.path.join("models", "yolov8n.pt")
            if yolo_model == "yolov8n.pt":
                if os.path.exists(engine_path):
                    yolo_model = engine_path
                    logger.info("Auto-upgraded YOLO model to TensorRT engine")
                elif os.path.exists(pt_path):
                    yolo_model = pt_path
            self.yolo_detector = YOLODetector(
                model_path=yolo_model
            )
            logger.info("YOLO detector enabled")
        
        # OCR reader (optional, for story mode)
        self.ocr_reader = None
        ocr_cfg = vision_cfg.get("ocr", {})
        ocr_enabled = ocr_cfg.get("enabled", True) and ocr_cfg.get("backend", "auto") != "none"
        if ocr_enabled and _OCR_AVAILABLE:
            self.ocr_reader = OCRReader(config=ocr_cfg)
            logger.info("OCR reader enabled")
        
        # Memory (Initialize FIRST so brain can use it)
        mem_cfg = config.get("memory", {})
        self.memory = None
        if mem_cfg.get("enabled", True) or config.get("game_mode") == "agent":
            self.memory = GameMemory(save_path=mem_cfg.get("save_path"), config=config)
            logger.info("Game memory enabled")

        # Session Recorder (Feature 4)
        from system.session_recorder import SessionRecorder
        self.session_recorder = SessionRecorder()

        # AI Brain
        self.brain = GameBrain(mode=self.game_mode, config=config, memory=self.memory)
        
        # Story analyzer (for story/hybrid modes)
        self.story_analyzer = None
        if self.game_mode in ("story", "hybrid"):
            self.story_analyzer = StoryAnalyzer()
            logger.info("Story analyzer enabled")
        
        # Input manager (keyboard+mouse & controller support)
        input_cfg = config.get("input", {})
        self.input_manager = InputManager(config=input_cfg)
        self.hw_checker = HardwareChecker(config=config)
        logger.info(f"Input device: {self.input_manager.active_device_name}")
        if self.input_manager.connected_controllers:
            for c in self.input_manager.connected_controllers:
                logger.info(f"  Controller: {c['name']} [{c['type']}]")

        # AWCC Detection (Task 9) — run in a daemon background thread so startup
        # isn't delayed.  The result is stored in _game_state once detection
        # finishes (always after __init__ completes because registry/process I/O
        # takes >50 ms) and propagates to the frontend via the telemetry cycle.
        _pipeline_ref = self  # capture reference; avoid closure over mutable 'self' var

        def _run_awcc_detection():
            try:
                from system.awcc_detector import get_awcc_status
                status = get_awcc_status()
                # _state_lock is always initialised by this point (line ~306 of __init__
                # runs synchronously; the detection I/O takes >50 ms).
                with _pipeline_ref._state_lock:
                    _pipeline_ref._game_state["awcc_status"] = status.to_dict()
                if status.detected:
                    logger.warning(
                        "[AWCC] Alienware Command Center detected (%s). "
                        "Restricted features: %s",
                        status.detection_method, status.restricted_features,
                    )
            except Exception as e:
                logger.debug("[AWCC] Detection error (non-fatal): %s", e)

        awcc_thread = threading.Thread(target=_run_awcc_detection, daemon=True, name="awcc-detect")
        awcc_thread.start()

        # NVIDIA GPU monitor & performance advisor
        self.gpu_monitor = None
        self.gpu_capabilities = None
        self.perf_advisor = None
        nvidia_cfg = config.get("nvidia", {})
        gpu_mon_cfg = nvidia_cfg.get("gpu_monitoring", {})
        if gpu_mon_cfg.get("enabled", True) and _NVIDIA_MONITOR_AVAILABLE:
            self.gpu_capabilities = GPUCapabilities(
                device_index=gpu_mon_cfg.get("device_index")
            )
            self.gpu_monitor = GPUMonitor(
                device_index=gpu_mon_cfg.get("device_index"),
                poll_interval=gpu_mon_cfg.get("poll_interval", 2.0)
            )
            if self.gpu_monitor.is_available:
                logger.info(f"GPU Monitor: {self.gpu_capabilities.gpu_name} "
                           f"[{self.gpu_capabilities.architecture}]")
                logger.info(f"  Supported: {', '.join(self.gpu_capabilities.get_supported_list())}")
            
            adv_cfg = nvidia_cfg.get("performance_advisor", {})
            if adv_cfg.get("enabled", False):
                self.perf_advisor = PerformanceAdvisor(
                    capabilities=self.gpu_capabilities, config=adv_cfg
                )
                logger.info("NVIDIA Performance Advisor enabled")
        
        # System AI Performance Advisor
        try:
            from system.advisor import PerformanceAdvisor as SystemAdvisor
            self.system_advisor = SystemAdvisor()
            logger.info("System AI Performance Advisor enabled")
        except Exception as e:
            logger.error(f"Failed to initialize System AI Performance Advisor: {e}")
            self.system_advisor = None
        
        # Voice Manager & Command Handler
        self.command_handler = CommandHandler()
        self.voice_manager = None
        self._voice_command_in_progress = False
        voice_cfg = config.get("voice", {})
        if _VOICE_AVAILABLE:
            self.voice_manager = VoiceManager(config=config)
            self.voice_manager.on_command_received = self._handle_voice_command
            logger.info("Voice Manager initialized (STT disabled by default — toggle in Agent UI)")

        self.active_chat_session_id = "default"
        self.active_user_id = None

        # Agentic Mode Toggle
        self.agentic_mode_active = False
        self.agent_mode_changed_callback = None
        self.action_confirm_callback = None
        self.thermal_alert_callback = None
        self._last_thermal_alert = {"cpu": 0.0, "gpu": 0.0}

        # ── Config File Watcher (dynamic keybind sync) ──────────────────────
        try:
            from system.config_watcher import get_config_watcher
            self._config_watcher = get_config_watcher(config=config)
            self._config_watcher.start()
            logger.info("[Pipeline] Config file watcher started (dynamic keybind sync enabled).")
        except Exception as e:
            self._config_watcher = None
            logger.warning(f"[Pipeline] Config file watcher unavailable: {e}")
        
        # ── Pipeline State ────────────────────────────────────────
        pipeline_cfg = config.get("pipeline", {})
        capture_cfg = config.get("capture", {})
        # Capture rate / FPS Cap (0 means uncapped)
        self.capture_hz = capture_cfg.get("fps_cap_limit", 60) if capture_cfg.get("cap_fps", False) else 0
        self.vision_hz = pipeline_cfg.get("vision_hz", 30)
        self.brain_hz = pipeline_cfg.get("brain_hz", 10)
        self.vlm_hz = pipeline_cfg.get("vlm_hz", 0.1) # Once every 10s by default
        self.enable_threading = pipeline_cfg.get("enable_threading", True)

        self.ocr_every_n = ocr_cfg.get("run_every_n_frames", 5)
        
        # New mode flag: if run via UI, we shouldn't draw blocking cv2 windows
        self.headless = config.get("headless", False)
        
        # Shared state (Pydantic model for performance)
        self._state_lock = threading.Lock()
        self._game_state = TelemetryState().model_dump()
        self._hw_cache = {} 
        self._last_active_title = ""
        self._vision_frame_count = 0
        self._last_ocr_results = {}
        self._last_detections = []
        self._last_vision_profiling = {"pre": 0, "inference": 0, "post": 0}
        self._last_vlm_query = 0
        self._vlm_description = ""
        self._last_action_time = 0
        self._action_cooldown = 1.5 # seconds between autonomous actions
        self._last_game_active_time = time.time()



        # ── Overlay stub (Electron/React owns the in-game HUD) ────────────
        class _MockOverlay:
            def update_data(self, state):
                pass

            def toggle(self):
                pass

            def update_font_size(self, delta):
                pass

            def set_absolute_font_size(self, fs):
                pass

            def set_locked(self, locked):
                pass

            def isVisible(self):
                return False

        self.overlay = _MockOverlay()
        
        # ── Window Detector (for Alt+Tab handling) ─────────────────
        self.window_detector = None
        if _WINDOW_DETECTOR_AVAILABLE:
            self.window_detector = WindowDetector(poll_interval=1.0)
            self.window_detector.on_focus_lost = self._on_focus_lost
            self.window_detector.on_focus_gained = self._on_focus_gained
            logger.info("Window detector initialized for Alt+Tab handling")
            
        # Initialize CPU usage counter
        if psutil is not None:
            psutil.cpu_percent(interval=None)
        
        self._last_tactical_latency = 0.0
        self._last_strategic_latency = 0.0
        self._setup_hotkeys()

        # Telemetry provides critical OS data. In headless mode, we want it running immediately
        # even if a game is not active so the React Dashboard works!
        if self.headless:
            self.telemetry_thread = TelemetryThread(self)
            self.telemetry_thread.start()
        else:
            self.telemetry_thread = None

        # Pre-warm configuration
        self.prewarm_models_enabled = vision_cfg.get("prewarm_models", True)
        self.unload_models_on_stop = vision_cfg.get("unload_models_on_stop", True)
        
        if self.prewarm_models_enabled:
            threading.Thread(target=self._prewarm_models, name="ModelPrewarmer", daemon=True).start()

    def _prewarm_models(self):
        """Pre-warm YOLO detector and OCR reader during application idle startup."""
        logger.info("Starting model pre-warming in background...")
        if self.yolo_detector:
            try:
                t0 = time.perf_counter()
                logger.info("Pre-warming YOLO detector model...")
                self.yolo_detector._ensure_model()
                logger.info(f"YOLO detector model pre-warmed in {time.perf_counter() - t0:.2f}s")
            except Exception as e:
                logger.error(f"Error pre-warming YOLO detector: {e}")
                
        if self.ocr_reader:
            try:
                t0 = time.perf_counter()
                logger.info("Pre-warming OCR reader model...")
                self.ocr_reader._ensure_rapidocr_reader()
                logger.info(f"OCR reader model pre-warmed in {time.perf_counter() - t0:.2f}s")
            except Exception as e:
                logger.error(f"Error pre-warming OCR reader: {e}")
        logger.info("Model pre-warming background task completed.")

    def _has_vram_headroom(self, required_mb=500, max_util_pct=93.0) -> bool:
        """Check if the GPU has enough VRAM headroom to load/run models."""
        if not self.gpu_monitor or not self.gpu_monitor.is_available:
            return True # If monitoring is not active, proceed
            
        with self._state_lock:
            gpu_metrics = self._game_state.get("gpu_metrics")
            
        if not gpu_metrics:
            return True
            
        vram_total = gpu_metrics.get("vram_total_mb", 0)
        vram_used = gpu_metrics.get("vram_used_mb", 0)
        vram_pct = gpu_metrics.get("vram_percent", 0.0)
        
        if vram_total > 0:
            free_vram = vram_total - vram_used
            if free_vram < required_mb:
                logger.warning(f"Low VRAM headroom: only {free_vram}MB free (required {required_mb}MB)")
                return False
                
        if vram_pct > max_util_pct:
            logger.warning(f"High VRAM usage: {vram_pct:.1f}% exceeds max allowed threshold {max_util_pct}%")
            return False
            
        return True

    def update_config(self, new_config):
        """Update runtime configuration and refresh modules."""
        self.config = new_config
        
        # Update AI Brain
        if hasattr(self, "brain") and self.brain:
            self.brain.apply_config(new_config)
            
        # Update Game Mode dynamically
        new_mode = new_config.get("game_mode", self.game_mode)
        if new_mode != self.game_mode:
            logger.info(f"Game mode changed dynamically from {self.game_mode} to {new_mode}")
            self.game_mode = new_mode
            if hasattr(self, "brain") and self.brain:
                self.brain.mode = new_mode
            
            # Re-initialize StoryAnalyzer if needed
            if new_mode in ("story", "hybrid"):
                if not hasattr(self, "story_analyzer") or not self.story_analyzer:
                    from ai_brain.story_analyzer import StoryAnalyzer
                    self.story_analyzer = StoryAnalyzer()
                    logger.info("Story analyzer dynamically enabled")
            else:
                self.story_analyzer = None
                logger.info("Story analyzer dynamically disabled")
            
        # Update YOLO Detector (if model changed)
        vision_cfg = new_config.get("vision", {})
        if vision_cfg.get("detector") in ("yolo", "trt", "cuda") and _YOLO_AVAILABLE:
            new_model = vision_cfg.get("yolo_model", "yolov8n.pt")
            import os
            engine_path = os.path.join("models", "yolov8n.engine")
            pt_path = os.path.join("models", "yolov8n.pt")
            if new_model == "yolov8n.pt":
                if os.path.exists(engine_path):
                    new_model = engine_path
                elif os.path.exists(pt_path):
                    new_model = pt_path
            if not self.yolo_detector or self.yolo_detector.model_path != new_model:
                if self.yolo_detector:
                    logger.info("Unloading previous YOLO model before reloading...")
                    try:
                        self.yolo_detector.unload_model()
                    except Exception as e:
                        logger.error(f"Error unloading old YOLO model: {e}")
                logger.info(f"Reloading YOLO detector with model: {new_model}")
                from vision.yolo_detector import YOLODetector
                self.yolo_detector = YOLODetector(model_path=new_model)
        elif self.yolo_detector:
            logger.info("YOLO detector disabled in config. Unloading model...")
            try:
                self.yolo_detector.unload_model()
            except Exception as e:
                logger.error(f"Error unloading YOLO model on config disable: {e}")
            self.yolo_detector = None

        # Update OCR Reader (if enabled/disabled or configuration changed)
        ocr_cfg = vision_cfg.get("ocr", {})
        ocr_enabled = ocr_cfg.get("enabled", True) and ocr_cfg.get("backend", "auto") != "none"
        if ocr_enabled and _OCR_AVAILABLE:
            if not self.ocr_reader:
                logger.info("OCR reader enabled in config. Loading...")
                from vision.ocr_reader import OCRReader
                self.ocr_reader = OCRReader(config=ocr_cfg)
            else:
                self.ocr_reader.config = ocr_cfg
        elif self.ocr_reader:
            logger.info("OCR reader disabled in config. Unloading...")
            try:
                self.ocr_reader.unload_model()
            except Exception as e:
                logger.error(f"Error unloading OCR reader on config disable: {e}")
            self.ocr_reader = None
        
        # Update Memory Path
        mem_cfg = new_config.get("memory", {})
        if hasattr(self, "memory") and self.memory:
            new_mem_path = mem_cfg.get("save_path")
            if new_mem_path:
                self.memory.set_save_path(new_mem_path)

        # Update Capture rate / FPS Cap (0 means uncapped)
        capture_cfg = new_config.get("capture", {})
        capture_backend = capture_cfg.get("backend", "auto")
        if capture_backend == "dxgi":
            capture_backend = "dxcam"
        elif capture_backend == "bitblt":
            capture_backend = "mss"

        self.capture_hz = capture_cfg.get("fps_cap_limit", 60) if capture_cfg.get("cap_fps", False) else 0
        if hasattr(self, "capture") and self.capture:
            self.capture.target_fps = self.capture_hz
            # If backend changed, re-initialize capture
            if not hasattr(self, "_last_capture_backend") or self._last_capture_backend != capture_backend:
                logger.info(f"Re-initializing screen capture with backend: {capture_backend}")
                self._last_capture_backend = capture_backend
                try:
                    self.capture.__init__(
                        region=self.capture.region,
                        backend=capture_backend,
                        target_fps=self.capture_hz,
                        device_index=getattr(self.capture, "_device_index", 0),
                        output_index=getattr(self.capture, "_output_index", 0),
                        hwnd=getattr(self.capture, "_hwnd", None)
                    )
                except Exception as e:
                    logger.error(f"Failed to re-initialize capture backend: {e}")

        # Update Voice Manager
        if self.voice_manager:
            self.voice_manager.apply_config(new_config)
            
        # Update Overlay settings
        overlay_cfg = new_config.get("overlay", {})
        if hasattr(self, "overlay"):
            self.set_overlay_lock(overlay_cfg.get("lock_position", False))
            current_fs = overlay_cfg.get("font_size", 11)
            try:
                self.overlay.set_absolute_font_size(current_fs)
            except Exception:
                pass

        # Re-setup hotkeys
        if hasattr(self, "hotkey_listener") and self.hotkey_listener:
            self.hotkey_listener.stop()
        self._setup_hotkeys()
        
        logger.info("Pipeline configuration updated and modules refreshed.")

    def _play_hook_sound(self):
        """Play a futuristic ascending sci-fi chime natively using winsound."""
        try:
            import winsound
            import threading
            
            def _beep():
                # Ascent: A5 (880 Hz, 85ms) -> E6 (1318 Hz, 125ms)
                winsound.Beep(880, 85)
                winsound.Beep(1318, 125)
                
            threading.Thread(target=_beep, daemon=True).start()
        except Exception:
            pass

    def _play_unhook_sound(self):
        """Play an elegant descending unhook chime natively using winsound."""
        try:
            import winsound
            import threading
            
            def _beep():
                # Descent: E6 (1318 Hz, 85ms) -> A5 (880 Hz, 125ms)
                winsound.Beep(1318, 85)
                winsound.Beep(880, 125)
                
            threading.Thread(target=_beep, daemon=True).start()
        except Exception:
            pass

    def _on_focus_lost(self):
        """Called when game window loses focus (Alt+Tab)."""
        logger.info("Focus lost - pausing vision processing")
        with self._state_lock:
            self._game_state["is_game_active"] = False
            self._game_state["brain_advice"] = {"priority": "low", "advice": "Game not focused (Alt+Tab)"}
        self._play_unhook_sound()
            
    def _on_focus_gained(self):
        """Called when game window regains focus."""
        logger.info("Focus gained - resuming vision processing")
        with self._state_lock:
            self._game_state["is_game_active"] = True
        self._play_hook_sound()

    def _setup_hotkeys(self):
        """Register global hotkeys for toggling and scaling HUD."""
        hotkey_cfg = self.config.get("hotkeys", {})
        
        def on_toggle():
            import time
            logger.info("Hotkey fallback: toggle_hud triggered from backend")
            bridge.update_state({"hud_toggle_trigger": time.time()})

        def on_toggle_agentic():
            self.set_agentic_mode(not self.agentic_mode_active)

        def on_inc_font():
            try:
                self.overlay.update_font_size(1)
            except Exception:
                pass

        def on_dec_font():
            try:
                self.overlay.update_font_size(-1)
            except Exception:
                pass

        def on_toggle_mic():
            if not self.voice_manager: return
            is_active = not self.voice_manager.is_listening
            if is_active:
                self.voice_manager.start()
                self._play_hook_sound() # Use existing chime
            else:
                self.voice_manager.stop_listening()
                self._play_unhook_sound()
            
            logger.info(f"Microphone toggled: {'ON' if is_active else 'OFF'}")
            bridge.update_state({"mic_active": is_active})
            
            # Sync to local state so the 3-frame bridge pusher includes it
            with self._state_lock:
                self._game_state["mic_active"] = is_active

        # Build map from config with 300ms debounce to prevent double-triggering on Windows
        last_trigger_times = {}
        def debounced_callback(name, callback):
            def wrapper(*args, **kwargs):
                now = time.time()
                last_time = last_trigger_times.get(name, 0)
                if now - last_time < 0.3:
                    return
                last_trigger_times[name] = now
                return callback(*args, **kwargs)
            return wrapper

        bindings = {}
        bindings[hotkey_cfg.get("toggle_hud", "<ctrl>+<alt>+o")] = debounced_callback("toggle_hud", on_toggle)
        bindings[hotkey_cfg.get("toggle_agentic", "<ctrl>+<alt>+a")] = debounced_callback("toggle_agentic", on_toggle_agentic)
        bindings[hotkey_cfg.get("toggle_mic", "<ctrl>+<alt>+v")] = debounced_callback("toggle_mic", on_toggle_mic)
        bindings[hotkey_cfg.get("inc_font", "<ctrl>+<alt>+=")] = debounced_callback("inc_font", on_inc_font)
        bindings[hotkey_cfg.get("dec_font", "<ctrl>+<alt>+-")] = debounced_callback("dec_font", on_dec_font)
        
        # Clean up empty or duplicate keys
        clean_bindings = {k: v for k, v in bindings.items() if k}

        # ── Global Hotkeys (with Robust Polling Fallback) ──
        self.hotkey_listener = keyboard.GlobalHotKeys(clean_bindings)
        self.hotkey_listener.start()
        
        if sys.platform == "win32":
            threading.Thread(target=self._win32_hotkey_fallback, args=(clean_bindings,), daemon=True).start()

    def _win32_hotkey_fallback(self, bindings):
        """Ultimate fallback using GetAsyncKeyState for games that block hooks."""
        import ctypes
        VK_CODE = {
            'ctrl': 0x11, 'alt': 0x12, 'shift': 0x10,
            '=': 0xBB, '-': 0xBD,
            'f10': 0x79, 'f1': 0x70
        }
        # Dynamically register a-z Virtual Key Codes
        for i in range(26):
            VK_CODE[chr(97 + i)] = 0x41 + i
        
        # Simple parser for <ctrl>+<alt>+o style
        parsed = []
        for combo, callback in bindings.items():
            keys = combo.lower().replace('<', '').replace('>', '').split('+')
            vks = [VK_CODE.get(k) for k in keys if VK_CODE.get(k)]
            if vks: parsed.append((vks, callback))
            
        last_state = {tuple(vks): False for vks, _ in parsed}
        
        while self.running:
            for vks, callback in parsed:
                pressed = all(ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000 for vk in vks)
                if pressed and not last_state[tuple(vks)]:
                    logger.debug(f"Fallback Hotkey Triggered: {vks}")
                    callback()
                last_state[tuple(vks)] = pressed
            time.sleep(0.05) # 20Hz polling is enough for hotkeys

    def start(self):
        """Start the assistant pipeline."""
        self.running = True
        logger.info(f"Starting Mission Control")
        logger.info(f"  Mode: {self.game_mode}")
        logger.info(f"  Capture: {self.capture.backend_name} @ {self.capture_hz}hz")
        logger.info(f"  Vision: {self.vision_hz}hz | Brain: {self.brain_hz}hz")
        logger.info(f"  Input: {self.input_manager.active_device_name}")
        logger.info(f"  Threading: {self.enable_threading} | Headless: {self.headless}")
        
        # Start background services
        self.input_manager.start_polling()
        # GPU Monitor polling is handled manually by TelemetryThread at 1Hz 
        # to prevent concurrent NVML calls which can cause driver crashes.
        # if self.gpu_monitor and self.gpu_monitor.is_available:
        #    self.gpu_monitor.start()
        if self.voice_manager:
            # Only start TTS engine loop (not microphone/STT).
            # STT is started explicitly via toggle_voice from the frontend UI.
            self.voice_manager._running = True
            import threading as _threading
            if not (self.voice_manager._tts_thread and self.voice_manager._tts_thread.is_alive()):
                self.voice_manager._tts_thread = _threading.Thread(
                    target=self.voice_manager._tts_loop, daemon=True, name="VoiceTTS"
                )
                self.voice_manager._tts_thread.start()
        if self.window_detector:
            self.window_detector.start()
            
        # Start Telemetry thread if not already running
        if getattr(self, "telemetry_thread", None) is None or not self.telemetry_thread.is_alive() or not getattr(self.telemetry_thread, "running", False):
            if getattr(self, "telemetry_thread", None) is not None and self.telemetry_thread.is_alive():
                try:
                    self.telemetry_thread.join(timeout=1.0)
                except Exception:
                    pass
            self.telemetry_thread = TelemetryThread(self)
            self.telemetry_thread.start()
        
        # Start Key Rotation Loop
        self._key_rotation_thread = threading.Thread(target=self._key_rotation_loop, name="KeyRotation", daemon=True)
        self._key_rotation_thread.start()

        if self.enable_threading:
            self._start_threaded()
        else:
            self._start_sequential()

    def _start_threaded(self):
        """Multi-threaded pipeline for maximum FPS."""
        self._capture_thread = threading.Thread(target=self._capture_loop, name="Capture", daemon=True)
        self._vision_thread = threading.Thread(target=self._vision_loop, name="Vision", daemon=True)
        self._brain_thread = threading.Thread(target=self._brain_loop, name="Brain", daemon=True)
        self._display_thread = threading.Thread(target=self._display_loop, name="Display", daemon=True)
        
        self._capture_thread.start()
        time.sleep(0.1)  # Stagger thread start to reduce CPU/GPU startup peak load
        self._vision_thread.start()
        time.sleep(0.1)
        self._brain_thread.start()
        time.sleep(0.1)
        self._display_thread.start()
        
        # Start watchdog thread to monitor thread health
        self._watchdog_thread = threading.Thread(target=self._watchdog_loop, name="Watchdog", daemon=True)
        self._watchdog_thread.start()

    def _watchdog_loop(self):
        """Monitors and automatically recovers crashed pipeline threads."""
        logger.info("Watchdog thread started.")
        while self.running:
            time.sleep(5.0)
            if not self.running:
                break
                
            # Verify and recover capture thread
            if self.enable_threading and (not hasattr(self, "_capture_thread") or not self._capture_thread.is_alive()):
                logger.warning("Watchdog: Capture thread is dead! Restarting...")
                self._capture_thread = threading.Thread(target=self._capture_loop, name="Capture", daemon=True)
                self._capture_thread.start()
                
            # Verify and recover vision thread
            if self.enable_threading and (not hasattr(self, "_vision_thread") or not self._vision_thread.is_alive()):
                logger.warning("Watchdog: Vision thread is dead! Restarting...")
                self._vision_thread = threading.Thread(target=self._vision_loop, name="Vision", daemon=True)
                self._vision_thread.start()
                
            # Verify and recover brain thread
            if self.enable_threading and (not hasattr(self, "_brain_thread") or not self._brain_thread.is_alive()):
                logger.warning("Watchdog: Brain thread is dead! Restarting...")
                self._brain_thread = threading.Thread(target=self._brain_loop, name="Brain", daemon=True)
                self._brain_thread.start()
                
            # Verify and recover display thread
            if self.enable_threading and (not hasattr(self, "_display_thread") or not self._display_thread.is_alive()):
                logger.warning("Watchdog: Display thread is dead! Restarting...")
                self._display_thread = threading.Thread(target=self._display_loop, name="Display", daemon=True)
                self._display_thread.start()

    def _start_sequential(self):
        """Single-threaded pipeline (simpler, for debugging)."""
        capture_cfg = self.config.get("capture", {})
        cap_fps = capture_cfg.get("cap_fps", False)
        target_fps = capture_cfg.get("fps_cap_limit", 60) if cap_fps else 0
        frame_time = 1.0 / target_fps if target_fps > 0 else 0.0
        
        logger.info("Running in sequential mode. Press 'q' to quit.")
        try:
            while self.running:
                start = time.perf_counter()
                
                frame = self.capture.get_frame()
                
                is_active, is_focused, title = self._is_game_active()
                if is_active:
                    if not hasattr(self, "_last_is_focused"):
                        self._last_is_focused = None
                    if is_focused != self._last_is_focused:
                        self._last_is_focused = is_focused
                        if is_focused:
                            logger.info("Game focused: switching capture backend to fast DXGI (dxcam/mss) mode")
                            try:
                                self.capture.set_hwnd(None)
                            except Exception as e:
                                logger.error(f"Failed to switch capture to DXGI mode: {e}")
                        else:
                            # Keep capture in fast DXGI/Desktop mode to avoid PrintWindow hangs when game loses focus
                            logger.info("Game unfocused: keeping fast DXGI/Desktop capture mode")
                            try:
                                self.capture.set_hwnd(None)
                            except Exception as e:
                                logger.error(f"Failed to switch capture to DXGI mode on unfocus: {e}")

                    self._process_vision(frame)
                    with self._state_lock:
                        self._game_state["is_game_active"] = True
                        self._game_state["is_game_focused"] = is_focused
                    self._process_brain()
                else:
                    if not hasattr(self, "_last_is_focused"):
                        self._last_is_focused = None
                    self._last_is_focused = None
                    with self._state_lock:
                        self._game_state["is_game_active"] = False
                        self._game_state["is_game_focused"] = False
                        self._game_state["health"] = 100.0
                        self._game_state["is_low_health"] = False
                        self._game_state["detections_count"] = 0
                        self._game_state["detections"] = []
                        self._game_state["scene_type"] = "waiting"
                        self._game_state["scene_confidence"] = 1.0
                        self._game_state["brain_advice"] = {"priority": "low", "advice": f"Waiting for game... (Active: {title})"}
                
                if not self.headless:
                    self._render_preview(frame)
                
                # Maintain FPS
                elapsed = time.perf_counter() - start
                if frame_time > 0:
                    remaining = frame_time - elapsed
                    if remaining > 0.001:
                        time.sleep(remaining)
                else:
                    time.sleep(0.0001)  # Minimal yield
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()

    def _is_game_active(self):
        """Check if a game window is currently active or minimized. Returns (is_active, is_focused, title)."""
        if self._game_state.get("game_mode_manual", False):
            return True, True, "Manual Optimization Mode"
        is_running = self._game_state.get("game_info") is not None
        is_minimized = self._game_state.get("game_minimized", False)
        
        # Get active window title and process name
        active_title = ""
        active_proc_name = ""
        if sys.platform == "win32":
            try:
                import ctypes
                import win32process  # type: ignore[reportMissingModuleSource]
                import win32gui  # type: ignore[reportMissingModuleSource]
                
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    active_title = win32gui.GetWindowText(hwnd)
                    
                    _, fg_pid = win32process.GetWindowThreadProcessId(hwnd)
                    if fg_pid and psutil is not None:
                        if getattr(self, "_last_fg_pid", None) == fg_pid:
                            active_proc_name = self._last_fg_proc_name
                        else:
                            try:
                                active_proc_name = psutil.Process(fg_pid).name().lower()
                                self._last_fg_pid = fg_pid
                                self._last_fg_proc_name = active_proc_name
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                active_proc_name = ""
            except Exception:
                pass
                
        if active_title:
            for char in ['\u200b', '\u200c', '\u200d', '\ufeff', '\u200e', '\u200f']:
                active_title = active_title.replace(char, '')
        title_lower = active_title.lower() if active_title else ""
        
        # 1. ABSOLUTE EXCLUSIONS (Processes and Window Titles that are NEVER games)
        excluded_procs = [
            "explorer.exe", "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe",
            "opera.exe", "vivaldi.exe", "code.exe", "devenv.exe", "pycharm64.exe",
            "epicgameslauncher.exe", "steam.exe", "discord.exe", "spotify.exe",
            "taskmgr.exe", "cmd.exe", "powershell.exe", "conhost.exe", "aero-ai.exe",
            "electron.exe", "xbox.exe", "xboxapp.exe", "xboxpcapp.exe", "xboxgamingapp.exe",
            "microsoft.gamingapp.exe", "ea.exe", "eaapp.exe", "goggalaxy.exe",
            "battlenet.exe", "ubisoftconnect.exe", "applicationframehost.exe", "settings.exe",
            "node.exe", "python.exe", "py.exe", "wscript.exe", "cscript.exe", "git.exe",
            "hp.omen.omencommandcenter.exe", "lghub.exe", "razer synapse.exe", "rzcommon.exe",
            "rzcortex.exe", "armourywebhelper.exe", "armourycontrol.exe", "armourycrate.exe",
            "msicenter.exe", "awcc.exe", "icue.exe", "sgaminghub.exe", "nzxtcam.exe",
            "nvidia share.exe", "nvsphelper64.exe"
        ]
        
        excluded_titles = [
            "visual studio", "vscode", "pycharm", "cursor", "windows terminal", 
            "powershell", "cmd", "idle", "task manager", "system settings", 
            "calculator", "notepad", "sublime", "atom", "terminal",
            "Mission Control", "aero-ai", "nvidia", "amd", "radeon", "intel", "geforce",
            "microsoft store", "epic games launcher", "steam", "origin", "ubisoft connect",
            "battle.net", "galaxy", "gog", "discord", "spotify", "chrome", "firefox", "edge",
            "brave", "opera", "vivaldi", "xbox", "xbox app", "ea app", "ea desktop",
            "omen gaming hub", "logitech g hub", "razer synapse", "razer cortex",
            "armoury crate", "msi center", "alienware command center", "icue",
            "nzxt cam", "nvidia geforce experience", "geforce experience"
        ]
        
        # Enforce exclusions constantly (both when running or not)
        _gi = self._game_state.get("game_info") or {}
        our_procs = {"electron.exe", "aero-ai.exe", "python.exe", "py.exe"}
        if active_proc_name in our_procs and is_running:
            was_focused = self._game_state.get("is_game_focused", True)
            return True, was_focused, _gi.get("name", active_title)

        if active_proc_name in excluded_procs:
            if is_running:
                return True, False, _gi.get("name", active_title)
            return False, False, f"Excluded process: {active_proc_name}"
            
        if any(ext in title_lower for ext in excluded_titles):
            if is_running:
                return True, False, _gi.get("name", active_title)
            return False, False, f"Excluded title match: {active_title}"
            
        # 3. Match foreground process with our monitored game process
        if _gi.get("pid"):
            target_pid = _gi["pid"]
            try:
                import win32process  # type: ignore[reportMissingModuleSource]
                import win32gui  # type: ignore[reportMissingModuleSource]
                fg_hwnd = win32gui.GetForegroundWindow()
                _, fg_pid = win32process.GetWindowThreadProcessId(fg_hwnd)
                if fg_pid == target_pid:
                    return True, True, active_title # Game is focused
            except Exception:
                pass

        # 4. Fallback to title matching from our monitored game process info
        game_name = _gi.get("name", "").lower()
        if game_name and game_name in title_lower:
            return True, True, active_title

        # 4.5 Fallback to Library cache matching (ONLY if not already tracking a game)
        if not is_running:
            import time
            now = time.time()
            if not hasattr(self, "_last_lib_scan") or now - self._last_lib_scan > 5.0:
                self._last_lib_scan = now
                try:
                    from system.game_scanner import GameScanner
                    scanner = GameScanner()
                    self._cached_library_games = scanner.load_cached_games()
                except Exception:
                    self._cached_library_games = []
            
            import re as _re
            for g in getattr(self, "_cached_library_games", []):
                g_name = g.get("name", "")
                _g_lower = g_name.lower()
                # Whole-word match — prevents music player titles containing game-name words
                # (e.g. "Spider-Man OST", "Grand Audio Player") from activating vision scanning.
                _pattern = r'\b' + _re.escape(_g_lower) + r'\b'
                if g_name and _re.search(_pattern, title_lower):
                    if "id" not in g:
                        g["id"] = g_name.lower().replace(" ", "-")
                    
                    if sys.platform == "win32" and getattr(self, "_last_fg_pid", None):
                        g["pid"] = self._last_fg_pid
                        
                    with self._state_lock:
                        self._game_state["game_info"] = g
                    return True, True, active_title

        # 4.6 Fallback to dynamic game registry title matching
        if not is_running:
            try:
                from ai_brain.game_knowledge import get_knowledge_base
                _kb = get_knowledge_base()
                _detected_key = _kb.identify_game(active_title, config=self.config)
                if _detected_key:
                    g = {"name": active_title, "id": active_title.lower().replace(" ", "-")}
                    if sys.platform == "win32" and getattr(self, "_last_fg_pid", None):
                        g["pid"] = self._last_fg_pid
                    with self._state_lock:
                        self._game_state["game_info"] = g
                    # Register with config watcher for live keybind sync
                    try:
                        if self._config_watcher:
                            self._config_watcher.watch_game(
                                game_name=active_title,
                                game_key=_detected_key,
                            )
                    except Exception:
                        pass
                    return True, True, active_title
            except Exception:
                pass

        # 5. Exclusion-based fallback removed for accuracy.
        # Foreground window must explicitly match our active/monitored game target or known game keywords.

        # 6. If a game is registered as running but doesn't have active foreground window
        if is_running:
            # Game is tracked but not focused. 
            # We return True so the Vision pipeline keeps analyzing the screen (crucial for Borderless/Multi-Monitor!)
            return True, False, _gi.get("name", active_title)
            
        return False, False, "No game detected"

    def _get_monitor_of_window(self):
        """Find the index of the monitor containing the active window."""
        if sys.platform != "win32":
            return 0
            
        try:
            import ctypes
            user32 = ctypes.windll.user32
            hwnd = user32.GetForegroundWindow()
            if not hwnd: return 0
            
            # 1. Get monitor handle for window
            # MONITOR_DEFAULTTONEAREST = 2
            hmon = user32.MonitorFromWindow(hwnd, 2)
            
            # 2. Map handle to index
            monitors = []
            def _enum_proc(h, dc, rect, data):
                monitors.append(h)
                return True
            
            # Prototype: BOOL EnumDisplayMonitors(HDC hdc, LPCRECT lprcClip, MONITORENUMPROC lpfnEnum, LPARAM dwData)
            CMPPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p)
            user32.EnumDisplayMonitors(None, None, CMPPROC(_enum_proc), None)
            
            if hmon in monitors:
                return monitors.index(hmon)
        except Exception:
            pass
        return 0

    def _key_rotation_loop(self):
        """Background loop to periodically rotate transient session keys."""
        import hashlib
        import os
        logger.info("[Security] Automated Key Rotation daemon loop started.")
        while self.running:
            privacy_cfg = self.config.get("privacy", {})
            if privacy_cfg.get("key_rotation", False) and not getattr(self, "neural_security_lock", False):
                new_key = os.urandom(32)
                if hasattr(self, "brain") and self.brain and getattr(self.brain, "sandbox", None):
                    try:
                        self.brain.sandbox.rotate_key(new_key)
                        logger.info("[Security] Automated Key Rotation: Sandbox storage key rotated.")
                    except Exception as e:
                        logger.error(f"[Security] Failed to rotate Sandbox key: {e}")
                
                key_hash = hashlib.sha256(new_key).hexdigest()[:16]
                logger.info(f"[Security] Automated Key Rotation: Rotated key. Active hash: {key_hash}")
                
                try:
                    from core.bridge_server import bridge
                    bridge.update_state({
                        "key_rotation_active": True,
                        "last_key_rotation": time.strftime("%H:%M:%S"),
                        "active_key_hash": key_hash
                    })
                except Exception:
                    pass
            time.sleep(300)

    # ── Threaded Loops ────────────────────────────────────────────

    def _capture_loop(self):
        """Capture thread: grabs frames as fast as possible."""
        logger.info(f"Capture thread started ({self.capture_hz}hz)")
        
        while self.running:
            if getattr(self, "neural_security_lock", False):
                time.sleep(1.0)
                continue
            start = time.perf_counter()
            
            # Throttle capture loop when game is inactive to save CPU/GPU resources
            with self._state_lock:
                is_active = self._game_state.get("is_game_active", False)
                
            if is_active:
                current_hz = self.capture_hz
                interval = 1.0 / current_hz if current_hz > 0 else 0.0
            else:
                current_hz = 10.0
                interval = 0.1
            
            try:
                frame = self.capture.get_frame()
                # None means no new frame (dxcam between vsync, window backend failed, etc.)
                # Never push None — it would propagate stale data downstream.
                if frame is not None:
                    self.frame_buffer.push(frame)
                else:
                    # Sleep slightly longer on no-new-frame to prevent high CPU polling overhead
                    time.sleep(0.004 if is_active else 0.05)
                    continue
            except Exception as e:
                logger.error(f"Error in capture loop: {e}", exc_info=True)
                time.sleep(0.1)
            
            elapsed = time.perf_counter() - start
            if interval > 0.0:
                remaining = interval - elapsed
                if remaining > 0.0005:
                    time.sleep(remaining)
                else:
                    time.sleep(0.001)  # Minimal yield to prevent CPU thread starvation
            else:
                time.sleep(0.0)  # Yield timeslice to other threads

    def _vision_loop(self):
        """Vision thread: processes frames for detection & classification."""
        interval = 1.0 / self.vision_hz if self.vision_hz > 0 else 0
        logger.info(f"Vision thread started ({self.vision_hz}hz)")
        fps_counter = _LoopFPS()
        
        while self.running:
            if getattr(self, "neural_security_lock", False):
                time.sleep(1.0)
                continue
            start = time.perf_counter()
            try:
                frame, fid, is_new = self.frame_buffer.get(timeout=0.1)
                if frame is None or not is_new:
                    continue
                
                is_active, is_focused, title = self._is_game_active()
                is_minimized = self._game_state.get("game_minimized", False)
                
                with self._state_lock:
                    self._game_state["is_game_active"] = is_active
                    self._game_state["is_game_focused"] = is_focused

                if is_active:
                    if not hasattr(self, "_last_is_focused"):
                        self._last_is_focused = None
                    if is_focused != self._last_is_focused:
                        self._last_is_focused = is_focused
                        if is_focused:
                            logger.info("Game focused: switching capture backend to fast DXGI (dxcam/mss) mode")
                            try:
                                self.capture.set_hwnd(None)
                            except Exception as e:
                                logger.error(f"Failed to switch capture to DXGI mode: {e}")
                        else:
                            # Keep capture in fast DXGI/Desktop mode to avoid PrintWindow hangs when game loses focus
                            logger.info("Game unfocused: keeping fast DXGI/Desktop capture mode")
                            try:
                                self.capture.set_hwnd(None)
                            except Exception as e:
                                logger.error(f"Failed to switch capture to DXGI mode on unfocus: {e}")
                
                # ADAPTIVE THROTTLING: 
                # 2. GPU Load Throttling (>90%)
                # 3. Thermal Throttling (>82C)
                # 4. Idle Throttling (If no game is active)
                
                if not is_active:
                    v_hz = min(2, self.vision_hz)
                elif is_minimized:
                    v_hz = 2 # Heavy throttle only when explicitly minimized
                else:
                    v_hz = self.vision_hz
                    
                # Further dynamic throttling based on load
                with self._state_lock:
                    gpu_load = self._game_state.get("gpu_metrics", {}).get("gpu_load", 0)
                    gpu_temp = self._game_state.get("gpu_metrics", {}).get("temperature", 0)
                    cpu_temp = self._game_state.get("cpu_temp", 0)
                
                throttle_needed = gpu_load > 92 or gpu_temp > 82 or cpu_temp > 85
                
                if is_active:
                    self._last_game_active_time = time.time()
                    # If system is hot or overloaded, skip processing on every other frame
                    if throttle_needed and self._vision_frame_count % 2 != 0:
                        self._optimize_own_memory()
                        time.sleep(0.1) # Give system a breather
                    else:
                        # Intelligent Monitor Focus (Only switch if game is actually focused!)
                        focus_mode = self.config.get("capture", {}).get("focus_mode", "Primary Only")
                        if focus_mode in ("Auto-Follow", "Auto-Follow Game") and is_focused:
                            target_out = self._get_monitor_of_window()
                            if target_out != self.capture._output_index:
                                logger.info(f"Auto-Follow: Switching focus to Monitor {target_out}")
                                self.capture.change_output(target_out)
                        
                        self._process_vision(frame)
                        fps_counter.tick()
                    
                    with self._state_lock:
                        self._game_state["is_game_active"] = True
                        self._game_state["is_game_focused"] = is_focused
                else:
                    if not hasattr(self, "_last_is_focused"):
                        self._last_is_focused = None
                    self._last_is_focused = None
                    fps_counter._times = [] # Clear times to prevent stale FPS calculations
                    # Reset the C++ QPC counter for a fresh session on next game launch
                    if _FPS_COUNTER_AVAILABLE and _fps_counter_dx is not None:
                        try:
                            _fps_counter_dx.reset()
                        except Exception:
                            pass
                    with self._state_lock:
                        self._game_state["is_game_active"] = False
                        self._game_state["is_game_focused"] = False
                        self._game_state["health"] = 100.0
                        self._game_state["is_low_health"] = False
                        self._game_state["detections_count"] = 0
                        self._game_state["detections"] = []
                        self._game_state["scene_type"] = "waiting"
                        self._game_state["scene_confidence"] = 1.0
                        self._game_state["brain_advice"] = {"priority": "low", "advice": f"Waiting for game... (Active: {title})"}
                    
                    # Check for game inactivity timeout (> 30 seconds) to unload heavy models
                    if time.time() - self._last_game_active_time > 30.0:
                        if self.yolo_detector and getattr(self.yolo_detector, '_initialized', False):
                            logger.info("Game inactive for > 30 seconds. Dynamically unloading YOLO detector model to free RAM/VRAM.")
                            self.yolo_detector.unload_model()
                        if self.ocr_reader and getattr(self.ocr_reader, '_reader', None) is not None:
                            logger.info("Game inactive for > 30 seconds. Dynamically unloading RapidOCR reader model to free RAM/VRAM.")
                            self.ocr_reader.unload_model()
                
                with self._state_lock:
                    self._game_state["capture_fps"] = self.frame_buffer.capture_fps if is_active else 0.0
                    self._game_state["vision_fps"] = fps_counter.fps if is_active else 0.0
                    if is_active:
                        avg_fps = self.frame_buffer.average_fps
                        # Removed capture_fps fallback: if ETW is 0.0, we report 0.0 so HUD shows N/A rather than a misleadingly low capture FPS.
                        self._game_state["game_fps"] = avg_fps
                        f_count = self.frame_buffer.frame_count
                        if f_count == 0:
                            f_count = self.frame_buffer.capture_frame_count
                        self._game_state["game_loading"] = f_count < 30 or avg_fps == 0.0
                        self._game_state["min_avg_fps"] = self.frame_buffer.min_avg_fps
                        self._game_state["max_avg_fps"] = self.frame_buffer.max_avg_fps
                        self._game_state["min_fps"] = self.frame_buffer.min_fps
                        self._game_state["max_fps"] = self.frame_buffer.max_fps
                        self._game_state["one_percent_low"] = self.frame_buffer.one_percent_low
                        self._game_state["frametimes"] = self.frame_buffer.frametimes
                    else:
                        self._game_state["game_fps"] = 0.0
                        self._game_state["game_loading"] = False
                        self._game_state["min_avg_fps"] = 0.0
                        self._game_state["max_avg_fps"] = 0.0
                        self._game_state["min_fps"] = 0.0
                        self._game_state["max_fps"] = 0.0
                        self._game_state["one_percent_low"] = 0.0
                        self._game_state["frametimes"] = []
                
                v_hz_active = v_hz
            except Exception as e:
                logger.error(f"Error in vision processing loop: {e}", exc_info=True)
                v_hz_active = 2 # Slower retry rate on crash
                time.sleep(0.1)
            
            # Dynamic interval for background optimization
            v_interval = 1.0 / v_hz_active if v_hz_active > 0 else 0
            elapsed = time.perf_counter() - start
            if v_interval > 0:
                remaining = v_interval - elapsed
                if remaining > 0.0005:
                    time.sleep(remaining)

    def _brain_loop(self):
        """AI Brain thread: runs reasoning at lower frequency."""
        interval = 1.0 / self.brain_hz if self.brain_hz > 0 else 0
        logger.info(f"Brain thread started ({self.brain_hz}hz)")
        
        while self.running:
            if getattr(self, "neural_security_lock", False):
                with self._state_lock:
                    self._game_state["brain_advice"] = {
                        "priority": "high",
                        "advice": "[CRITICAL LOCK] Motherboard UUID verification failed. Neural Link terminated."
                    }
                try:
                    from core.bridge_server import bridge
                    bridge.update_state({"neural_security_lock": True, "brain_advice": self._game_state["brain_advice"]})
                except Exception:
                    pass
                time.sleep(1.0)
                continue
            start = time.perf_counter()
            gpu_load = 0
            is_active = True
            is_minimized = False
            try:
                # ADAPTIVE OPTIMIZATION: Throttle brain if GPU is struggling
                with self._state_lock:
                    is_active = self._game_state.get("is_game_active", True)
                    is_minimized = self._game_state.get("game_minimized", False)
                    gpu_load = self._game_state.get("gpu_metrics", {}).get("gpu_load", 0)
                    
                if is_active or is_minimized or self._game_state.get("game_info"):
                    self._process_brain()
            except Exception as e:
                logger.error(f"Error in brain processing loop: {e}", exc_info=True)
                time.sleep(0.1)
            
            # Dynamic interval: throttle more if GPU is maxed
            current_interval = interval
            if gpu_load > 95:
                current_interval *= 3.0 # Massive throttle (3x interval) when GPU is maxed
            elif gpu_load > 85:
                current_interval *= 1.5 # Moderate throttle
            elif not is_active:
                current_interval = 2.0  # Slow poll when alt-tabbed
            elif is_minimized:
                current_interval = 5.0 # Very slow when minimized
                
            elapsed = time.perf_counter() - start
            if current_interval > 0:
                remaining = current_interval - elapsed
                if remaining > 0.001:
                    time.sleep(remaining)


    def _display_loop(self):
        """Display loop: renders preview on main thread."""
        logger.info("Display loop started. Press 'q' to quit.")
        show_preview = self.config.get("overlay", {}).get("show_preview", True)
        
        # Throttled display rate for efficiency (preview/UI doesn't need 60fps)
        display_hz = self.config.get("pipeline", {}).get("display_hz", 15.0)
        display_interval = 1.0 / display_hz
        
        while self.running:
            start_time = time.perf_counter()
            
            with self._state_lock:
                is_active = self._game_state.get("is_game_active", False)
            
            # 1. Manage the native OpenCV window (Disable when gaming to save resources)
            if not self.headless and show_preview:
                if is_active:
                    # Automatically close debug window when game is focused to free GPU/CPU
                    try:
                        for win_name in ["Mission Control", "AI Gaming Assistant"]:
                            if cv2.getWindowProperty(win_name, cv2.WND_PROP_VISIBLE) >= 1:
                                cv2.destroyWindow(win_name)
                                logger.info(f"Closing debug preview window ({win_name}) during active gameplay to save resources.")
                    except Exception: pass
                else:
                    # Show preview only when on desktop/alt-tabbed
                    try:
                        if cv2.getWindowProperty("Mission Control", cv2.WND_PROP_VISIBLE) < 1:
                            cv2.namedWindow("Mission Control", cv2.WINDOW_NORMAL)
                    except Exception:
                        cv2.namedWindow("Mission Control", cv2.WINDOW_NORMAL)

            # 2. Grab frame and render (including callback to UI)
            # Use get_latest_copy but if headless/non-preview, we can be more efficient
            frame, fid, is_new = self.frame_buffer.get_latest_copy(timeout=0.05)
            if frame is not None:
                # _render_preview handles the frame_callback to the Desktop App UI
                self._render_preview(frame)
            
            # 3. Handle Exit Key
            if not self.headless:
                # waitKey is required for CV2 window but also for keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    logger.info("Exit signal received. Shutting down...")
                    self.running = False
                    break
            
            # 4. Adaptive Display Frequency: Slow down display when inactive
            elapsed = time.perf_counter() - start_time
            if not is_active:
                display_interval = 0.5 # 2fps when alt-tabbed/idle
                
            if display_interval > elapsed:
                time.sleep(display_interval - elapsed)


    # ── Processing ────────────────────────────────────────────────

    def _process_vision(self, frame):
        """Run all vision processing on a frame."""
        t_start = time.perf_counter()

        # Privacy Shield Safeguard: If the game is not focused and we are using a desktop-level capture backend,
        # we black out the frame and skip heavy AI vision processing to protect user privacy.
        is_focused = False
        with self._state_lock:
            is_focused = self._game_state.get("is_game_focused", False)

        capture_backend = getattr(self.capture, "backend_name", "dxcam")
        is_desktop_capture = capture_backend in ("dxcam", "mss")

        privacy_enabled = self.config.get("privacy", {}).get("enabled", True)
        privacy_shield_active = privacy_enabled and not is_focused and is_desktop_capture

        self._vision_frame_count += 1

        # 1. Health detection (Disabled dummy heuristic)
        health_pct, is_low = 100.0, False

        # Initialize default values
        detections = []
        vision_profiling = {"pre": 0, "inference": 0, "post": 0}
        ocr_results = {}
        scene_result = {"scene": "waiting", "confidence": 1.0}
        story_advice = ""

        if privacy_shield_active:
            # Black out the frame with privacy warning
            if frame is not None:
                h_frame, w_frame = frame.shape[:2]
                frame.fill(0)  # Modify the frame in-place to black it out completely
                cv2.putText(frame, "PRIVACY SHIELD ACTIVE", (50, h_frame // 2 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                cv2.putText(frame, "Game is unfocused. Scanning suspended.", (50, h_frame // 2 + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        else:
            # 2. Dynamic Object Detection (YOLO)
            detections = getattr(self, "_last_detections", [])
            vision_profiling = getattr(self, "_last_vision_profiling", {"pre": 0, "inference": 0, "post": 0})

            yolo_every = self.config.get("vision", {}).get("yolo_run_every_n_frames", 3)

            if self.yolo_detector:
                # Check VRAM headroom before triggering loading if not initialized
                if not self.yolo_detector._initialized and not self._has_vram_headroom(required_mb=500):
                    # VRAM pressure too high, skip loading
                    run_yolo = False
                else:
                    current_scene = self._game_state.get("scene_type", "unknown")
                    is_scene_menu = current_scene in ("menu", "loading", "waiting")
                    run_yolo = False
                    if is_scene_menu:
                        if self._vision_frame_count % 30 == 0:
                            run_yolo = True
                    else:
                        if self._vision_frame_count % yolo_every == 0:
                            run_yolo = True

                if run_yolo:
                    detections, vision_profiling = self.yolo_detector.detect(frame)
                    self._last_detections = detections
                    self._last_vision_profiling = vision_profiling

            # 3. OCR (every N frames, only in story/hybrid mode)
            ocr_results = self._last_ocr_results

            run_ocr = False
            if (self.ocr_reader and
                self.game_mode in ("story", "hybrid") and
                self._vision_frame_count % self.ocr_every_n == 0):
                # Check VRAM headroom before loading RapidOCR
                if self.ocr_reader._reader is not None or self._has_vram_headroom(required_mb=500):
                    run_ocr = True
                else:
                    logger.warning("VRAM headroom too low to load OCR reader. Skipping loading/inference.")

            if run_ocr:
                ocr_results = self.ocr_reader.read_all_regions(frame)
                self._last_ocr_results = ocr_results

            # 4. Scene classification
            scene_result = self.scene_classifier.classify(
                frame, detections=detections, ocr_results=ocr_results
            )

            # 5. Story analysis
            story_advice = ""
            if self.story_analyzer and self.game_mode in ("story", "hybrid"):
                story_advice = self.story_analyzer.update(
                    scene_result["scene"], ocr_results, detections
                )
        
        # ── Visual Bounding Box & Diagnostic Stream ──
        if self._vision_frame_count % 3 == 0:  # Stream around ~10-15 FPS to avoid saturating Websocket
            try:
                import base64
                
                # Copy frame for annotation
                annotated = frame.copy()
                if detections:
                    for d in detections:
                        box = d.get("box")
                        if box and len(box) == 4:
                            x1, y1, x2, y2 = box
                            label = d.get("label", "target")
                            conf = d.get("conf", 0.0)
                            
                            # Elegant cyan bounding box (B=255, G=255, R=0)
                            cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 255, 0), 2)
                            
                            # Gorgeous high-contrast text overlay
                            text = f"{label.upper()} {conf:.2f}"
                            cv2.putText(annotated, text, (x1, max(15, y1 - 5)),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1, cv2.LINE_AA)
                
                # Resize to beautiful 800x450 (16:9) for premium high-quality visual clarity
                small_frame = cv2.resize(annotated, (800, 450), interpolation=cv2.INTER_AREA)
                _, buffer = cv2.imencode('.jpg', small_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                img_b64 = base64.b64encode(buffer).decode('utf-8')
                
                with self._state_lock:
                    self._game_state["annotated_frame"] = img_b64
            except Exception as e:
                logger.error(f"Failed to render vision frame: {e}")

        # 6. Update shared state
        with self._state_lock:
            self._game_state["health"] = health_pct
            self._game_state["is_low_health"] = is_low
            self._game_state["detections_count"] = len(detections)
            self._game_state["detections"] = detections
            self._game_state["vision_profiling"] = vision_profiling
            self._game_state["scene_type"] = scene_result["scene"]
            self._game_state["scene_confidence"] = scene_result["confidence"]
            self._game_state["story_advice"] = story_advice
            if ocr_results:
                # Extract dialogue text (include dynamic regions if enabled)
                dialogue_parts = []
                # Core regions
                for r in ["subtitle", "dialogue"]:
                    for t in ocr_results.get(r, []):
                        if t.get("confidence", 0) > 0.6:
                            dialogue_parts.append(t.get("text", ""))
                
                self._game_state["dialogue_text"] = " ".join(dialogue_parts)
                quest_parts = [t.get("text", "") for t in ocr_results.get("quest", []) if t.get("confidence", 0) > 0.6]
                self._game_state["quest_texts"] = quest_parts
                # Store full results for rendering
                self._game_state["ocr_results"] = ocr_results
        
        # 7. Memory
        if self.memory:
            self.memory.record_scene(scene_result["scene"], scene_result["confidence"])
        
        # 8. Model Metadata (Task Assignment)
        with self._state_lock:
            self._game_state["strategic_model"] = self.brain.task_models.get("strategic", "Nemotron-4")
            self._game_state["tactical_model"] = self.brain.task_models.get("tactical", "Nemotron-70B")
            self._game_state["vision_model"] = self.brain.task_models.get("vision", "Nemotron-Nano")

        # Push the vision frame and all updated stats immediately to the bridge
        # (every 3rd frame, ~10 FPS) to bypass the slow brain loop throttling
        if self._vision_frame_count % 3 == 0:
            with self._state_lock:
                bridge.update_state({
                    "annotated_frame": self._game_state.get("annotated_frame"),
                    "health": self._game_state.get("health", 100.0),
                    "is_low_health": self._game_state.get("is_low_health", False),
                    "detections_count": self._game_state.get("detections_count", 0),
                    "detections": self._game_state.get("detections", []),
                    "vision_profiling": self._game_state.get("vision_profiling"),
                    "scene_type": self._game_state.get("scene_type", "unknown"),
                    "scene_confidence": self._game_state.get("scene_confidence", 1.0),
                    "story_advice": self._game_state.get("story_advice", ""),
                    "dialogue_text": self._game_state.get("dialogue_text", ""),
                    "quest_texts": self._game_state.get("quest_texts", []),
                    "ocr_results": self._game_state.get("ocr_results", {}),
                    "vision_fps": self._game_state.get("vision_fps", 0.0),
                    "capture_fps": self._game_state.get("capture_fps", 0.0),
                    "min_avg_fps": self._game_state.get("min_avg_fps", 0.0),
                    "max_avg_fps": self._game_state.get("max_avg_fps", 0.0),
                    "min_fps": self._game_state.get("min_fps", 0.0),
                    "max_fps": self._game_state.get("max_fps", 0.0),
                    "one_percent_low": self._game_state.get("one_percent_low", 0.0),
                    "frametimes": self._game_state.get("frametimes", []),
                    "cpu_power_w": self._game_state.get("cpu_power_w", 0.0),
                    "mic_active": self._game_state.get("mic_active", False),
                })
        self._last_tactical_latency = (time.perf_counter() - t_start) * 1000.0

    def _process_brain(self):
        """Run AI reasoning on current game state."""
        with self._state_lock:
            state_snapshot = dict(self._game_state)

        # Privacy Shield Safeguard: If game is unfocused and capture is desktop-based, skip VLM query
        capture_backend = getattr(self.capture, "backend_name", "dxcam")
        is_desktop_capture = capture_backend in ("dxcam", "mss")
        privacy_enabled = self.config.get("privacy", {}).get("enabled", True)
        privacy_shield_active = privacy_enabled and not state_snapshot.get("is_game_focused", False) and is_desktop_capture

        # ── Multi-modal Vision Refinement (Phase 17) ──
        now = time.time()
        if (self.game_mode == "agent" and not privacy_shield_active and
            (now - self._last_vlm_query) > (1.0 / self.vlm_hz if self.vlm_hz > 0 else 99999)):
            
            frame, _, _ = self.frame_buffer.get_latest_copy()
            if frame is not None:
                try:
                    import base64
                    # Resize for VLM to reduce bandwidth/latency
                    small_frame = cv2.resize(frame, (640, 360))
                    _, buffer = cv2.imencode('.jpg', small_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    img_b64 = base64.b64encode(buffer).decode('utf-8')
                    
                    description = self.brain._query_vision_nim(img_b64)
                    if description:
                        self._vlm_description = description
                        self._last_vlm_query = now
                        logger.info(f"[VISION] VLM Refinement: {description[:100]}...")
                except Exception as e:
                    logger.debug(f"VLM Refinement failed: {e}")

        # ── Visual Game Detection Fallback ──
        if not state_snapshot.get("game_info") and self._vision_frame_count % 300 == 0: # Every 300 frames
            try:
                guess = self.brain.classify_game_title(f"Visual Analysis of Screen: {self._vlm_description}")
                if guess.get("type") == "GAME":
                    logger.info(f"[VISION] Identified game via screen: {guess.get('title')}")
                    self._auto_switch_mode(guess.get("genre", "Action"), guess.get("title", ""))
            except Exception:
                pass

        # Reset search triggered flag on search engine before running analyze_state
        if hasattr(self.brain, "_web_search"):
            self.brain._web_search.was_search_triggered_this_tick = False

        t_start = time.perf_counter()
        result = self.brain.analyze_state(state_snapshot)
        self._last_strategic_latency = (time.perf_counter() - t_start) * 1000.0

        # ── Proximity & Vision Analytics ──
        proximity_data = []
        detections = state_snapshot.get("detections", [])
        for det in detections:
            box = det.get("box", [0,0,0,0])
            area = (box[2] - box[0]) * (box[3] - box[1])
            dist = 1.0 - min(1.0, area / (1920 * 1080 * 0.1))
            proximity_data.append({
                "label": det.get("label"),
                "distance": round(dist, 2),
                "threat": "high" if dist < 0.3 else "low"
            })

        # ── Neural Status ──
        neural_status = {
            "tactical_latency": f"{self._last_tactical_latency:.1f}ms",
            "strategic_latency": f"{self._last_strategic_latency:.1f}ms",
            "vlm_status": "active" if (now - self._last_vlm_query) < 20 else "standby",
            "model_active": self.brain.task_models.get("strategic", "N/A")
        }

        # ── AI Analytic ──
        # Detect if a search is actually happening (either via prompt or auto-trigger)
        has_search_tag = any(tag in result.get("advice", "") for tag in ["[WebSearchTrigger]", "[Live Web Context]", "[Web Result]"])
        search_active = False
        if hasattr(self.brain, "_web_search") and self.brain._web_search.was_search_triggered_this_tick:
            search_active = True

        advice_text = result.get("advice", "")
        actual_tokens = int(len(advice_text.split()) * 1.33) if advice_text else 0
        ai_analytic = {
            "reasoning_tokens": actual_tokens if actual_tokens > 0 else 0,
            "context_depth": "8k",
            "search_active": search_active,
            "mode": self.brain.mode.upper()
        }

        # Update input device
        current_device = self.input_manager.active_device_name
        
        # NVIDIA / FSR advisor
        nvidia_tip = ""
        perf_score = 100
        perf_advisor_analysis = {}
        if self.gpu_monitor and self.gpu_monitor.is_available:
            gpu_metrics = state_snapshot.get("gpu_metrics", {})
            if self.perf_advisor:
                cap_fps = state_snapshot.get("capture_fps", 0)
                perf_advisor_analysis = self.perf_advisor.get_full_analysis(gpu_metrics, game_fps=cap_fps)
                nvidia_tip = self.perf_advisor.get_quick_tip(gpu_metrics, game_fps=cap_fps)
                perf_score = perf_advisor_analysis.get("performance_score", 100)

        # Record session snapshot (Feature 4)
        if hasattr(self, 'session_recorder') and self.session_recorder.is_active:
            self.session_recorder.record_snapshot(state_snapshot)
        
        with self._state_lock:
            self._game_state["brain_advice"] = result
            self._game_state["input_device"] = current_device
            self._game_state["nvidia_tip"] = nvidia_tip
            self._game_state["perf_advisor_analysis"] = perf_advisor_analysis
            self._game_state["perf_score"] = perf_score
            self._game_state["proximity_data"] = proximity_data
            self._game_state["neural_status"] = neural_status
            self._game_state["ai_analytic"] = ai_analytic
            self._game_state["tilt_detected"] = state_snapshot.get("tilt_detected", False)
            self._game_state["active_mode_info"] = {
                "mode": self.brain.mode,
                "display": self.brain.mode.replace("_", " ").title()
            }
            
            # Record advice to memory
            if self.memory:
                self.memory.record_advice(
                    result.get("advice", ""),
                    result.get("priority", "low"),
                    result.get("category", "agent")
                )
            actions = list(result.get("actions", []))

        # Execute autonomous actions if agentic mode is active (Phase 20 Validation)
        if self.agentic_mode_active and actions:
            # 1. Tilt-Override Validation
            if state_snapshot.get("tilt_detected", False):
                logger.warning("[AGENT] Safety Alert: User tilt detected by Context Engine! Disabling Agentic Mode for safety.")
                self.set_agentic_mode(False)
                bridge.update_state({"agent_intent": "observing"})
                return

            # 2. User-Override Validation
            if self.input_manager.is_user_active(threshold=2.5):
                logger.warning("[AGENT] Manual input detected. Pausing autonomous actions (User-Override).")
                return

            # 3. Action Cooldown Validation
            now = time.time()
            if (now - self._last_action_time) < self._action_cooldown:
                return

            logger.info(f"[AGENT] VALIDATED: Executing autonomous actions: {actions}")

            for action_name in actions:
                try:
                    from control.input_manager import GameAction
                    try:
                        # Try standard abstract action
                        action = GameAction(action_name)
                        if callable(self.action_confirm_callback):
                            self.action_confirm_callback(
                                f"{action_name.replace('_', ' ').title()}",
                                self.agentic_confirmation_delay,
                            )
                        # Safety Delay & Abort verification
                        if self.agentic_confirmation_delay > 0:
                            logger.info(f"[AGENT] Safety Confirmation delay active: waiting {self.agentic_confirmation_delay}s. Press ESC to cancel.")
                            if self._check_abort_and_sleep(self.agentic_confirmation_delay):
                                return

                        # Verify once more right before executing key presses
                        if not self.agentic_mode_active:
                            return
                        if self.input_manager.is_user_active(threshold=1.5):
                            logger.warning("[AGENT] Aborted: User manual override detected.")
                            return

                        self.input_manager.execute_action(action, mode="click")
                        with self._state_lock:
                            self._game_state["agent_action"] = action_name
                        time.sleep(0.1) # Small gap
                    except ValueError:
                        # Standard action lookup failed. Try raw key fallback!
                        key_to_press = action_name
                        # Clean prefix if exists (e.g., "press_q" -> "q", "key_space" -> "space")
                        prefixes = ["press_", "key_", "click_"]
                        for prefix in prefixes:
                            if key_to_press.lower().startswith(prefix):
                                key_to_press = key_to_press[len(prefix):]
                                break
                        
                        if key_to_press:
                            # Reformat underscores to spaces for special keys like caps_lock
                            key_to_press = key_to_press.replace("_", " ")
                            logger.info(f"[AGENT] Action '{action_name}' not in GameAction. Falling back to executing raw key: '{key_to_press}'")
                            if callable(self.action_confirm_callback):
                                self.action_confirm_callback(
                                    f"Press Key: {key_to_press.upper()}",
                                    self.agentic_confirmation_delay,
                                )
                            # Safety Delay & Abort verification
                            if self.agentic_confirmation_delay > 0:
                                logger.info(f"[AGENT] Safety Confirmation delay active: waiting {self.agentic_confirmation_delay}s. Press ESC to cancel.")
                                if self._check_abort_and_sleep(self.agentic_confirmation_delay):
                                    return

                            # Verify once more right before executing key presses
                            if not self.agentic_mode_active:
                                return
                            if self.input_manager.is_user_active(threshold=1.5):
                                logger.warning("[AGENT] Aborted: User manual override detected.")
                                return

                            self.input_manager.execute_key(key_to_press, mode="click")
                            with self._state_lock:
                                self._game_state["agent_action"] = action_name
                            time.sleep(0.1) # Small gap
                        else:
                            logger.warning(f"Extracted key for {action_name} is empty.")
                except Exception as e:
                    logger.warning(f"Failed to execute agent action {action_name}: {e}")

            self._last_action_time = now
            logger.info("[AGENT] Validation Success: Action pipeline stable.")
            
        # Push telemetry and reasoning state to the React frontend bridge
        with self._state_lock:
            bridge.update_state(dict(self._game_state))

        self._check_thermal_alerts(state_snapshot)



        
        # ── Voice Guide: Deep In-Game Narration ────────────────────────────
        # Cooldown rules:
        #   critical  → speak immediately (bypass cooldown)
        #   high      → speak if 8s have passed or advice changed
        #   medium    → speak if 20s have passed (proactive mission narration)
        #   low       → only speak for new dialogue/cutscene events
        advice_text = result.get("advice", "")
        priority = result.get("priority", "low")
        is_game_active = state_snapshot.get("is_game_active", False)
        scene_now = state_snapshot.get("scene_type", "unknown")
        dialogue_now = state_snapshot.get("dialogue_text", "")

        with self._state_lock:
            last_advice = self._game_state.get("last_voiced_advice", "")
            last_time = self._game_state.get("last_voiced_time", 0.0)
            last_dialogue = self._game_state.get("last_voiced_dialogue", "")

        # Sync game title into knowledge base every cycle
        if is_game_active:
            try:
                from ai_brain.game_knowledge import get_knowledge_base
                _kb = get_knowledge_base()
                _gi = state_snapshot.get("game_info") or {}
                _title = _gi.get("name", "") or state_snapshot.get("current_game", "")
                if _title:
                    _detected_key = _kb.identify_game(_title, config=self.config)
                    # Also register with config watcher for live sync
                    if _detected_key:
                        try:
                            if self._config_watcher:
                                self._config_watcher.watch_game(
                                    game_name=_title,
                                    game_key=_detected_key,
                                )
                        except Exception:
                            pass
            except Exception:
                pass

        if is_game_active and advice_text:
            should_speak = False
            cooldown = 99999.0  # default: never

            if priority == "critical":
                cooldown = 5.0   # speak almost immediately for critical
                should_speak = True
            elif priority == "high":
                cooldown = 8.0
                should_speak = advice_text != last_advice or (now - last_time) > cooldown
            elif priority == "medium":
                cooldown = 20.0  # proactive: narrate mission every 20s
                should_speak = advice_text != last_advice and (now - last_time) > cooldown
            elif priority == "low" and scene_now in ("dialogue", "cutscene") and dialogue_now:
                # Speak new dialogue immediately, but not the same line twice
                should_speak = dialogue_now[:60] != last_dialogue[:60]
                if should_speak:
                    with self._state_lock:
                        self._game_state["last_voiced_dialogue"] = dialogue_now
                cooldown = 3.0

            if should_speak:
                logger.info(f"[VOICE/{priority.upper()}] {advice_text[:100]}")
                if self.voice_manager:
                    self.voice_manager.speak(advice_text)
                with self._state_lock:
                    self._game_state["last_voiced_advice"] = advice_text
                    self._game_state["last_voiced_time"] = now
                
                # Push the dynamic co-pilot spoken advice to the frontend UI
                try:
                    ts = f"\u200b{time.time()}"
                    bridge.update_state({
                        "voice_prompt": "Co-pilot Voice Guide" + ts,
                        "agent_response": advice_text + ts
                    })
                except Exception as e:
                    logger.debug(f"Failed to push voice state update: {e}")
        
        with self._state_lock:
            state_copy = dict(self._game_state)
        try:
            self.overlay.update_data(state_copy)
        except Exception:
            pass

    def _handle_voice_command(self, text):
        """Handle voice commands from the user, enriched with game context."""
        # Stop listening automatically since we successfully captured a command
        self.toggle_voice(False)

        active_sid = getattr(self, "active_chat_session_id", "default")
        user_id = getattr(self, "active_user_id", "guest")
        if self.memory:
            self.memory.add_chat_message(active_sid, "user", f"🎙️ {text}", user_id=user_id)

        # Voice Macro Engine Check (Feature 3)
        if self.voice_manager and hasattr(self.voice_manager, 'macro_engine') and self.voice_manager.macro_engine:
            macro = self.voice_manager.macro_engine.match_macro(text)
            if macro:
                if self.agentic_mode_active:
                    success = self.voice_manager.macro_engine.execute_macro(macro, self.input_manager)
                    response = f"Executing macro: {macro}" if success else f"Failed to execute macro: {macro}"
                    try:
                        ts = f"\u200b{time.time()}"
                        bridge.update_state({"voice_prompt": text + ts, "agent_response": response + ts})
                    except Exception: pass
                    if self.voice_manager:
                        self.voice_manager.speak("Executed")
                    return
                else:
                    response = f"Agentic mode must be enabled to execute macro: {macro}"
                    if self.voice_manager:
                        self.voice_manager.speak(response)
                    return

        response = self.command_handler.handle_command(text)
        if "don't recognize" in response or "sorry" in response:
            if self.brain:
                self._voice_command_in_progress = True
                try:
                    ts = f"\u200b{time.time()}"
                    bridge.update_state({"voice_prompt": text + ts, "agent_response": "Processing..." + ts})
                except Exception:
                    pass
                def _process_voice():
                    try:
                        # Pull the active game name and character for contextual replies
                        from ai_brain.game_knowledge import get_knowledge_base
                        _kb = get_knowledge_base()
                        _is_game_active = False
                        _state_snapshot = {}
                        with self._state_lock:
                            _gi = self._game_state.get("game_info") or {}
                            _dialogue = self._game_state.get("dialogue_text", "")
                            _quests = self._game_state.get("quest_texts", [])
                            _is_game_active = self._game_state.get("is_game_active", False)
                            _state_snapshot = dict(self._game_state)
                        _game_name = _gi.get("name", "") or self._game_state.get("current_game", "")
                        if _game_name:
                            _kb.identify_game(_game_name)
                        if _dialogue or _quests:
                            _kb.detect_character_from_ocr(_dialogue, " ".join(_quests))
                            _kb.detect_mission_from_ocr(_quests, _dialogue)
                        _ctx = _kb.build_context_block(include_keybinds=True)
                        # Prepend context to prompt for richer reply only if context exists
                        enriched_prompt = f"[Game context: {_ctx[:4000]}]\nUser question: {text}" if _ctx.strip() else text
                        generator = self.brain.reply_to_prompt_stream(
                            enriched_prompt, 
                            game_name=_game_name, 
                            is_game_active=_is_game_active, 
                            game_state=_state_snapshot,
                            is_voice=True,
                            user_id=user_id,
                            session_id=active_sid,
                            agentic_mode_active=self.agentic_mode_active
                        )
                        final_response = ""
                        for chunk in generator:
                            final_response += chunk
                            if not self._voice_command_in_progress:
                                logger.info("Voice response discarded because stop_voice was called.")
                                return
                            try:
                                new_ts = f"\u200b{time.time()}"
                                bridge.update_state({"voice_prompt": text + new_ts, "agent_response": final_response + new_ts})
                            except Exception:
                                pass
                    except Exception:
                        generator = self.brain.reply_to_prompt_stream(text, is_voice=True, user_id=user_id, session_id=active_sid, agentic_mode_active=self.agentic_mode_active)
                        final_response = ""
                        for chunk in generator:
                            final_response += chunk
                            if not self._voice_command_in_progress: return
                            try:
                                new_ts = f"\u200b{time.time()}"
                                bridge.update_state({"voice_prompt": text + new_ts, "agent_response": final_response + new_ts})
                            except Exception:
                                pass

                    if self.memory:
                        self.memory.add_chat_message(active_sid, "agent", final_response, user_id=user_id)

                    if self.voice_manager:
                        self.voice_manager.speak(final_response, force=True)

                threading.Thread(target=_process_voice, daemon=True).start()
                return

        if self.memory:
            self.memory.add_chat_message(active_sid, "agent", response)

        if self.voice_manager:
            self.voice_manager.speak(response, force=True)
        # ── Push voice transcript + reply to the frontend chat UI ──────────────
        # Mirror the exact same bridge pattern used by handle_directive so that
        # voice commands appear in the chat window just like typed commands.
        try:
            ts = f"\u200b{time.time()}"
            bridge.update_state({"voice_prompt": text + ts, "agent_response": response + ts})
        except Exception as e:
            logger.debug(f"Failed to push voice state update: {e}")

    def _render_preview(self, frame):
        """Render the preview window with overlays."""
        preview = frame
        overlay_cfg = self.config.get("overlay", {})
        
        with self._state_lock:
            state = dict(self._game_state)
        
        # Safeguard: If no game is active, don't show the live capture to avoid 
        # the "Hall of Mirrors" effect where the app captures its own preview.
        if not state.get("is_game_active", False):
            # Create a clear, dimmed background instead of a blurred one
            preview = cv2.addWeighted(frame, 0.4, np.zeros(frame.shape, frame.dtype), 0, 0)
            
            # Center "AWAITING GAME LAUNCH" text (Static)
            h, w = preview.shape[:2]
            cv2.putText(preview, "AWAITING GAME LAUNCH", (w // 2 - 220, h // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 240, 255), 3)
            
            brain_advice = state.get('brain_advice', {}) or {}
            active_text = "Ready for deployment"
            if isinstance(brain_advice, dict) and brain_advice.get('advice'):
                active_text = str(brain_advice.get('advice'))
            
            cv2.putText(preview, f"STATUS: {active_text[:40]}", 
                        (w // 2 - 220, h // 2 + 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 240, 255), 1)

        
        # Dynamic object bounding boxes from YOLO/CV
        detections = state.get("detections", [])
        if getattr(self, "yolo_detector", None) and detections:
            # Handle cases where detections might accidentally be the raw tuple
            if isinstance(detections, tuple) and len(detections) > 0:
                detections = detections[0]
            
            if isinstance(detections, list):
                for det in detections:
                    if not isinstance(det, dict):
                        continue
                    box = det.get("box", [])
                    conf = det.get("conf", 0)
                    label = det.get("label", "obj")
                        
                    if len(box) == 4:
                        x1, y1, x2, y2 = [int(v) for v in box]
                        cv2.rectangle(preview, (x1, y1), (x2, y2), (255, 100, 0), 2)
                        cv2.putText(preview, f"{label} {conf:.0%}", (x1, y1-8),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 100, 0), 1)

        # OCR text bounding boxes
        ocr_results = state.get("ocr_results")
        if ocr_results and isinstance(ocr_results, dict):
            for region, texts in ocr_results.items():
                if not isinstance(texts, list):
                    continue
                is_dynamic = region.startswith("dynamic_")
                color = (0, 255, 255) if is_dynamic else (255, 255, 0) # Yellow for dynamic, Cyan for preset
                for t in texts:
                    if not isinstance(t, dict):
                        continue
                    bbox = t.get("bbox", [])
                    if len(bbox) == 4:
                        x1, y1, x2, y2 = bbox
                        cv2.rectangle(preview, (x1, y1), (x2, y2), color, 1)
                        if is_dynamic:
                            cv2.putText(preview, t.get("text", "")[:20], (x1, y2+15),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

        # Scene type (only show if it's not the dummy default)
        if overlay_cfg.get("show_scene_type", True):
            scene = state.get("scene_type", "unknown")
            if scene != "waiting":
                scene_conf = state.get("scene_confidence", 0.0)
                cv2.putText(preview, f"Scene: {scene} ({scene_conf:.0%})", (20, 110),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 200, 0), 1)

        
        # FPS counter
        h_frame = preview.shape[0]
        w_frame = preview.shape[1]
        if overlay_cfg.get("show_fps", True):
            cap_fps = state.get("capture_fps", 0)
            vis_fps = state.get("vision_fps", 0)
            cv2.putText(preview, f"Cap: {cap_fps:.0f} fps | Vis: {vis_fps:.0f} fps",
                        (20, h_frame - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        # Input device badge
        if overlay_cfg.get("show_input_device", True):
            device_name = state.get("input_device", "")
            cv2.putText(preview, f"Input: {device_name}", (20, h_frame - 45),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)
        
        # GPU stats
        gpu = state.get("gpu_metrics", {})
        if overlay_cfg.get("show_gpu_stats", True) and gpu:
            gpu_text = (f"GPU: {gpu.get('gpu_util', 0)}% | "
                       f"VRAM: {gpu.get('vram_used_mb', 0)}/{gpu.get('vram_total_mb', 0)}MB | "
                       f"Temp: {gpu.get('temperature', 0)}C")
            # Color code temperature
            temp = gpu.get("temperature", 0)
            if temp > 85:
                gpu_color = (0, 0, 255)  # Red
            elif temp > 75:
                gpu_color = (0, 165, 255)  # Orange
            else:
                gpu_color = (180, 180, 180)  # Gray
            cv2.putText(preview, gpu_text, (20, h_frame - 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, gpu_color, 1)
        
        # NVIDIA performance tip
        nvidia_tip = state.get("nvidia_tip", "")
        if overlay_cfg.get("show_nvidia_tips", True) and nvidia_tip:
            cv2.putText(preview, nvidia_tip[:90], (20, h_frame - 95),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 200), 1)
        
        # Brain advice
        advice = state.get("brain_advice", {})
        if isinstance(advice, dict):
            priority = advice.get("priority", "low")
            text = advice.get("advice", "")
        else:
            priority = "low"
            text = advice

        priority = str(priority or "low")
        text = str(text or "")

        if text:
            colors = {
                "critical": (0, 0, 255),
                "high": (0, 100, 255),
                "medium": (0, 200, 255),
                "low": (0, 255, 0),
            }
            color = colors.get(priority, (200, 200, 200))
            # Word-wrap long advice
            max_chars = 80
            y_pos = 145
            while text:
                line = text[:max_chars]
                text = text[max_chars:]
                cv2.putText(preview, line, (20, y_pos),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1)
                y_pos += 25
        
        # Game mode badge (top-right)
        mode_colors = {
            "competitive": (0, 150, 255),
            "story": (255, 150, 0),
            "hybrid": (200, 0, 255),
        }
        mode_color = mode_colors.get(self.game_mode, (200, 200, 200))
        cv2.putText(preview, f"[{self.game_mode.upper()}]", (w_frame - 200, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, mode_color, 2)
        
        # Performance score badge (top-right, below mode)
        perf = state.get("perf_score", 100)
        if perf < 50:
            perf_color = (0, 0, 255)
        elif perf < 80:
            perf_color = (0, 165, 255)
        else:
            perf_color = (0, 255, 0)
        cv2.putText(preview, f"Perf: {perf}/100", (w_frame - 200, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, perf_color, 1)
        
        if getattr(self, 'frame_callback', None):
            self.frame_callback(preview)
            
        if not self.headless and overlay_cfg.get("show_preview", True) and not state.get("is_game_active", False):
            cv2.imshow("Mission Control", preview)

    def _check_abort_and_sleep(self, seconds: float) -> bool:
        """Sleep for a duration in small increments while checking for user overrides or deactivation.
        Returns True if execution should be aborted, False otherwise.
        """
        start = time.time()
        while time.time() - start < seconds:
            if not self.agentic_mode_active:
                logger.info("[AGENT] Aborted: Agentic mode deactivated during safety window.")
                return True
            if self.input_manager.is_user_active(threshold=1.5):
                logger.warning("[AGENT] Aborted: User manual override detected.")
                return True
            if sys.platform == "win32":
                try:
                    import ctypes
                    # VK_ESCAPE = 0x1B
                    if ctypes.windll.user32.GetAsyncKeyState(0x1B) & 0x8000:
                        logger.warning("[AGENT] Aborted: Emergency Kill Switch (ESCAPE) pressed.")
                        self.set_agentic_mode(False)
                        self._play_unhook_sound()
                        return True
                except Exception as e:
                    logger.debug(f"Failed to check GetAsyncKeyState: {e}")
            time.sleep(0.05)
        return False

    def set_agentic_mode(self, active):
        """Enable or disable autonomous co-pilot actions and device hooks."""
        self.agentic_mode_active = active
        with self._state_lock:
            self._game_state["agent_intent"] = "autonomous" if active else "observing"
        
        # Synchronize input manager (hooks, polling, etc)
        if self.input_manager:
            if active:
                self.input_manager.start_polling()
                logger.info("Agent: Device hooks & Controller polling ACTIVATED")
            else:
                self.input_manager.stop_polling()
                logger.info("Agent: Device hooks STANDBY")

        # Reset context engine session state on toggle
        if hasattr(self, "brain") and self.brain and hasattr(self.brain, "context_engine") and self.brain.context_engine:
            self.brain.context_engine.reset()

        logger.info(f"Agentic Mode: {'ENABLED' if active else 'DISABLED'}")

        if active and getattr(self, "memory", None):
            session_id = f"session_{int(time.time() * 1000)}"
            self.active_chat_session_id = session_id
            
            user_id = getattr(self, "active_user_id", None) or "guest"
            try:
                self.memory.create_chat_session(session_id, "New Chat", user_id=user_id)
            except Exception as e:
                logger.error("Failed to create chat session: %s", e)

            games_str = ""
            try:
                from system.game_scanner import GameScanner
                sc = GameScanner(config=getattr(self, "config", {}))
                games = sc.load_cached_games()
                game_names = [g.get("name") for g in games[:3]] if games else []
                if game_names:
                    games_str = " (for example: " + ", ".join(game_names) + ")"
            except Exception:
                pass

            welcome_msg = (
                f"🤖 **Agentic Mode Activated**. Direct device and system control is online.\n\n"
                f"I can now access your system to launch games, control hardware, and optimize resources. "
                f"**Do you need my Agentic Voice to guide you through your game?**\n\n"
                f"If yes, I will provide real-time strategic predictions and logic-based walkthroughs using live intelligence. "
                f"What would you like me to do{games_str}?"
            )
            
            try:
                self.memory.add_chat_message(session_id, "agent", welcome_msg)
                history = self.memory.get_chat_history(session_id)
                sessions = self.memory.get_chat_sessions(user_id=user_id)
                
                bridge.update_state({
                    "active_chat_session_id": session_id,
                    "chat_sessions": sessions,
                    "chat_history": {"sessionId": session_id, "messages": history}
                })
            except Exception as e:
                logger.error("Failed to populate and broadcast new agentic chat session: %s", e)

    def set_agent_personality(self, personality):
        """Change the AI agent's personality profile."""
        if self.brain:
            self.brain.config.setdefault("ai_agent", {})["personality"] = personality
            logger.info(f"Agent Personality set to: {personality.upper()}")

    def update_game_info(self, game_info):
        """Update the pipeline with information about the currently detected game.
        
        Propagates minimization status and switches the capture backend to per-window
        mode (PrintWindow) ONLY when configured explicitly, so the game can be captured
        even when running in the background (not minimized to taskbar).
        """
        with self._state_lock:
            self._game_state["game_info"] = game_info
            if game_info:
                self._game_state["game_minimized"] = game_info.get("is_minimized", False)
            else:
                self._game_state["game_minimized"] = False

        # Switch capture backend to per-window capture ONLY if explicitly configured
        capture_backend = self.config.get("capture", {}).get("backend", "auto")
        if capture_backend == "window":
            hwnd = game_info.get("hwnd") if game_info else None
        else:
            hwnd = None

        if hasattr(self, "capture") and self.capture:
            try:
                self.capture.set_hwnd(hwnd)
            except Exception as e:
                logger.debug(f"update_game_info: set_hwnd failed: {e}")
                
        # Set target PID for hardware ETW FPS tracker
        if _FPS_COUNTER_AVAILABLE and _fps_counter_dx is not None:
            pid = game_info.get("pid", 0) if game_info else 0
            old_pid = getattr(self, "_last_tracked_pid", 0)
            try:
                _fps_counter_dx.set_target_pid(pid)
                # If the PID actually changed, flush all stale FPS data
                if pid != old_pid:
                    _fps_counter_dx.reset()
                    if hasattr(self, "frame_buffer"):
                        self.frame_buffer.reset()
                    logger.info(
                        "[FPSCounter] Game PID changed %d → %d — ETW target updated, counters reset",
                        old_pid, pid,
                    )
                self._last_tracked_pid = pid
            except Exception as e:
                logger.error(f"Failed to set target PID for FPS counter: {e}")

    def toggle_voice(self, active):
        """Enable or disable active voice listening."""
        if self.voice_manager:
            if active:
                # Must call start() — not start_listening() — so that:
                # 1. self._running is set to True (required by _stt_loop's while condition)
                # 2. The TTS thread is started so voice_manager.speak() drains the queue
                self.voice_manager.start()
            else:
                self.voice_manager.stop_listening()

    def stop_voice(self):
        """Stop active text-to-speech playback."""
        self._voice_command_in_progress = False
        if self.voice_manager:
            self.voice_manager.stop_speaking()

    def _auto_switch_mode(self, genre: str, title: str):
        """Intelligently switch assistant mode and persona based on game genre."""
        mode = GENRE_MODE_MAP.get(genre, "hybrid")
        
        # Map modes to Personas
        mode_to_persona = {
            "competitive": "tactical",
            "story": "immersive",
            "hybrid": "friendly"
        }
        persona = mode_to_persona.get(mode, "tactical")
        
        if self.brain.mode != mode or self.config.get("ai_agent", {}).get("personality") != persona:
            logger.info(f"[AUTO-MODE] Switching Mode to '{mode}' and Persona to '{persona}' for {title} ({genre})")
            if hasattr(self.brain, 'set_mode'):
                self.brain.set_mode(mode)
            
            # Sync back to config for persistence
            if "ai_agent" not in self.config: self.config["ai_agent"] = {}
            self.config["ai_agent"]["assistant_mode"] = mode
            self.config["ai_agent"]["personality"] = persona
            
            # Update GameBrain config dynamically
            if hasattr(self.brain, 'config'):
                self.brain.config = self.config
            
            # Notify UI if in headless mode
            if self.headless:
                bridge.update_state({"assistant_mode": mode, "personality": persona})

    def set_overlay_lock(self, locked: bool):
        """Overlay lock is applied in Electron; keep hook for API compatibility."""
        try:
            self.overlay.set_locked(locked)
        except Exception:
            pass
        logger.info("Overlay %s for positioning", "locked" if locked else "unlocked")

    def handle_directive(self, text, user_id=None):
        """Process a direct command from the chat interface."""
        if not self.brain:
            return "Neural engine offline. Check API key."
            
        # Immediate sync to OSD to show search is starting
        with self._state_lock:
            if "ai_analytic" not in self._game_state:
                self._game_state["ai_analytic"] = {"reasoning_tokens": 0, "context_depth": "8k", "mode": self.brain.mode.upper()}
            self._game_state["ai_analytic"]["search_active"] = True
            
        try:
            game_name = ""
            is_game_active = False
            state_snapshot = {}
            with self._state_lock:
                if self._game_state.get("game_info"):
                    game_name = self._game_state["game_info"].get("name", "")
                is_game_active = self._game_state.get("is_game_active", False)
                state_snapshot = dict(self._game_state)
            
            response = self.brain.reply_to_prompt(
                text, 
                game_name=game_name, 
                is_game_active=is_game_active, 
                game_state=state_snapshot,
                user_id=user_id,
                session_id=self.active_chat_session_id,
                agentic_mode_active=self.agentic_mode_active
            )
            # Append search status metadata if web search was triggered
            if hasattr(self.brain, "_web_search") and self.brain._web_search.was_search_triggered_this_tick:
                status = getattr(self.brain._web_search, "last_search_status", None)
                if status:
                    response = f"{response}\u200bsearch_status:{status}"
            return response
        except Exception as e:
            logger.error(f"Failed to process directive: {e}")
            return f"Neural failure: {str(e)}"
        finally:
            with self._state_lock:
                self._game_state["ai_analytic"]["search_active"] = False

    def handle_directive_stream(self, text, user_id=None):
        """Process a direct command from the chat interface and stream the response."""
        if getattr(self, "neural_security_lock", False):
            yield "[CRITICAL LOCK] Motherboard UUID verification failed. Neural Link terminated."
            return

        if not self.brain:
            yield "Neural engine offline. Check API key."
            return
            
        with self._state_lock:
            if "ai_analytic" not in self._game_state:
                self._game_state["ai_analytic"] = {"reasoning_tokens": 0, "context_depth": "8k", "mode": self.brain.mode.upper()}
            self._game_state["ai_analytic"]["search_active"] = True
            
        try:
            game_name = ""
            is_game_active = False
            state_snapshot = {}
            with self._state_lock:
                if self._game_state.get("game_info"):
                    game_name = self._game_state["game_info"].get("name", "")
                is_game_active = self._game_state.get("is_game_active", False)
                state_snapshot = dict(self._game_state)
            
            generator = self.brain.reply_to_prompt_stream(
                text, 
                game_name=game_name, 
                is_game_active=is_game_active, 
                game_state=state_snapshot,
                user_id=user_id,
                session_id=self.active_chat_session_id,
                agentic_mode_active=self.agentic_mode_active
            )
            for chunk in generator:
                yield chunk
                
            if hasattr(self.brain, "_web_search") and self.brain._web_search.was_search_triggered_this_tick:
                status = getattr(self.brain._web_search, "last_search_status", None)
                if status:
                    yield f"\u200bsearch_status:{status}"
        except Exception as e:
            logger.error(f"Failed to process directive stream: {e}")
            yield f"Neural failure: {str(e)}"
        finally:
            with self._state_lock:
                self._game_state["ai_analytic"]["search_active"] = False

    def _check_thermal_alerts(self, state_snapshot):
        if not callable(self.thermal_alert_callback):
            return

        nvidia_cfg = self.config.get("nvidia", {})
        perf_cfg = nvidia_cfg.get("performance_advisor", {})
        thermal_cfg = self.config.get("thermal", {})

        gpu_warn = int(thermal_cfg.get("gpu_warning", perf_cfg.get("temp_warning", 90)))
        gpu_crit = int(thermal_cfg.get("gpu_critical", perf_cfg.get("temp_critical", 100)))
        cpu_warn = int(thermal_cfg.get("cpu_warning", gpu_warn))
        cpu_crit = int(thermal_cfg.get("cpu_critical", gpu_crit + 5))

        now = time.time()
        gpu_metrics = state_snapshot.get("gpu_metrics", {}) or {}
        gpu_temp = int(gpu_metrics.get("temperature", 0) or 0)
        cpu_temp = float(state_snapshot.get("cpu_temp", 0) or 0)

        alerts = []
        if gpu_temp >= gpu_crit:
            alerts.append(("GPU Thermal Alert", f"GPU temperature is {gpu_temp}°C, above the critical limit of {gpu_crit}°C. Lower resolution or close background apps.", "gpu", gpu_temp, 45))
        elif gpu_temp >= gpu_warn:
            alerts.append(("GPU Thermal Warning", f"GPU temperature is {gpu_temp}°C, above the warning limit of {gpu_warn}°C.", "gpu", gpu_temp, 30))

        if cpu_temp >= cpu_crit:
            alerts.append(("CPU Thermal Alert", f"CPU temperature is {cpu_temp:.0f}°C, above the critical limit of {cpu_crit}°C. Consider lowering load or closing background tasks.", "cpu", cpu_temp, 45))
        elif cpu_temp >= cpu_warn:
            alerts.append(("CPU Thermal Warning", f"CPU temperature is {cpu_temp:.0f}°C, above the warning limit of {cpu_warn}°C.", "cpu", cpu_temp, 30))

        for title, message, key, temp, duration in alerts:
            last = self._last_thermal_alert.get(key, 0.0)
            if (now - last) < 60.0:
                continue
            self._last_thermal_alert[key] = now
            try:
                self.thermal_alert_callback(title, message, duration * 100)
            except Exception:
                pass


    def toggle_hud(self):
        """Toggle stub overlay; Electron HUD is toggled separately."""
        if not self.overlay:
            return
        with self._state_lock:
            state_copy = dict(self._game_state)
        try:
            self.overlay.update_data(state_copy)
            self.overlay.toggle()
        except Exception:
            pass

    def set_hud_lock(self, locked):
        """Toggle HUD click-through vs draggable (stub)."""
        if not self.overlay:
            return
        try:
            self.overlay.set_locked(locked)
        except Exception:
            pass

    def _optimize_own_memory(self):
        """Aggressively flushes working set memory (RAM reclamation)."""
        import sys
        if sys.platform == "win32":
            try:
                import ctypes
                import psutil
                process = psutil.Process()
                # 0xFFFFFFFF means we're asking the OS to empty the working set 
                ctypes.windll.psapi.EmptyWorkingSet(process.pid)
                logger.info(f"RAM Reclaimed: Triggered EmptyWorkingSet for PID {process.pid}")
            except Exception as e:
                logger.debug(f"Failed to optimize memory: {e}")

    def stop(self):
        """Gracefully shut down the pipeline."""
        self.running = False
        # Do not stop telemetry thread in headless mode, as the React Dashboard
        # needs live telemetry between game sessions. Daemon thread handles clean exit.
        if hasattr(self, "telemetry_thread") and self.telemetry_thread and not self.headless:
            try:
                self.telemetry_thread.stop()
            except Exception:
                pass
        self.input_manager.stop_polling()
        if self.gpu_monitor:
            self.gpu_monitor.shutdown()
        if self.voice_manager:
            self.voice_manager.stop()
        if self.window_detector:
            self.window_detector.stop()
        if self.memory:
            self.memory.save()
            logger.info("Game memory saved.")
        cv2.destroyAllWindows()

        # Aggressively unload vision models on stop to release RAM/VRAM if configured
        if self.unload_models_on_stop:
            if self.yolo_detector:
                try:
                    self.yolo_detector.unload_model()
                except Exception as e:
                    logger.error(f"Error unloading YOLO model on shutdown: {e}")
            if self.ocr_reader:
                try:
                    self.ocr_reader.unload_model()
                except Exception as e:
                    logger.error(f"Error unloading OCR reader on shutdown: {e}")

        logger.info("AI Gaming Assistant stopped.")

    @property
    def current_game(self) -> Optional[dict]:
        with self._state_lock:
            return self._game_state.get("game_info")
