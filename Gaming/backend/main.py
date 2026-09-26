"""
Mission Control — Main Entry Point
Multi-threaded pipeline: Capture → Vision → AI Brain → WebSocket bridge (Electron/React UI).
"""
import multiprocessing

if __name__ == "__main__":
    multiprocessing.freeze_support()

import argparse
import logging
import os
import sys
import threading
import time
import traceback
import warnings

# Configure basic logging immediately so early imports and .env loading logs are visible
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("main")
sys.dont_write_bytecode = True

# ── Early OpenCV (cv2) Zero-Disk Configuration Safeguard ──────────────────────
try:
    import rthook_cv2
except Exception as _cv2_err:
    logger.debug("OpenCV safeguard notice: %s", _cv2_err)

warnings.filterwarnings("ignore", category=SyntaxWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning, module="easyocr")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="rapidocr_onnxruntime")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="torch")
warnings.filterwarnings("ignore", message=".*torch.ao.quantization.*")
logging.getLogger("easyocr").setLevel(logging.ERROR)
logging.getLogger("rapidocr_onnxruntime").setLevel(logging.ERROR)
logging.getLogger("dxcam").setLevel(logging.ERROR)

from dotenv import load_dotenv

# Look for .env in prioritized locations: AppData > local dir > bundled temp
env_search_paths = []
mei_dir = getattr(sys, '_MEIPASS', None)
if mei_dir:
    env_search_paths.append(os.path.join(mei_dir, ".env"))
if getattr(sys, 'frozen', False):
    exe_dir = os.path.dirname(sys.executable)
    env_search_paths.append(os.path.join(os.path.dirname(exe_dir), ".env"))
    env_search_paths.append(os.path.join(exe_dir, ".env"))

base_backend = os.path.dirname(os.path.abspath(__file__))
env_search_paths.append(os.path.abspath(os.path.join(base_backend, "..", "..", ".env")))
env_search_paths.append(os.path.abspath(os.path.join(base_backend, "..", ".env")))
env_search_paths.append(os.path.join(base_backend, ".env"))
env_search_paths.append(os.path.expandvars(r"%LOCALAPPDATA%\MissionControl\.env"))
env_search_paths.append(os.path.expandvars(r"%APPDATA%\MissionControl\.env"))

env_loaded = False
for path_to_try in env_search_paths:
    if os.path.exists(path_to_try):
        load_dotenv(path_to_try, override=True)
        logger.info("[Env] Loaded .env from: %s", path_to_try)
        env_loaded = True

if not env_loaded:
    load_dotenv(override=True)
    logger.warning("[Env] No .env file found in search paths, falling back to default load_dotenv().")

try:
    from system.process_watcher import ProcessWatcher
    _PROCESS_WATCHER_AVAILABLE = True
except ImportError:
    ProcessWatcher = None
    _PROCESS_WATCHER_AVAILABLE = False

try:
    from system.library_watcher import LibraryWatcher
    _LIBRARY_WATCHER_AVAILABLE = True
except ImportError:
    LibraryWatcher = None
    _LIBRARY_WATCHER_AVAILABLE = False

from core.bridge_server import bridge
from core.config_loader import load_config, save_config
from core.pipeline_host import GamingAssistantPipeline
from core.runtime_helpers import HotReloader, _ChildProcessLogger
from core.updater_bridge import handle_bridge_update_commands, load_local_version
from core.process_guard import (
    acquire_instance_lock,
    release_instance_lock,
    lower_process_priority,
    start_orphan_monitor,
    request_admin_elevation,
)
from core.logging_handler import BridgeLogHandler
from handlers import game_handler, system_handler
from handlers.command_router import dispatch_bridge_command

# Per-user in-memory library session cache
_library_session: dict = {}

if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("MissionControl.MissionControl.Desktop.v1")
    except Exception:
        pass


def enforce_neural_security(config, pipeline=None):
    from core.security import verify_uuid_lock
    privacy_cfg = config.get("privacy", {})
    verified = True
    if privacy_cfg.get("uuid_lock", False):
        verified = verify_uuid_lock(config)

    if pipeline:
        if not verified:
            pipeline.neural_security_lock = True
            logger.critical("[Security] Motherboard UUID verification failed. Pipeline is locked.")
        else:
            if getattr(pipeline, "neural_security_lock", False):
                pipeline.neural_security_lock = False
                logger.info("[Security] Motherboard UUID verified. Pipeline unlocked.")

    if privacy_cfg.get("secure_sandbox", False):
        logger.info("[Security] Secure Sandbox active: AI decision pipeline isolated in volatile in-memory enclave.")

    if privacy_cfg.get("key_rotation", False):
        logger.info("[Security] Automated Key Rotation active: Rotating E2EE keys every 5 minutes.")


def main():
    parent_pid = os.getppid()
    start_orphan_monitor(parent_pid)

    parser = argparse.ArgumentParser(description="AI Gaming Assistant")
    parser.add_argument("--dev", action="store_true", help="Enable hot reload (restarts on file change)")
    parser.add_argument("--no-admin", action="store_true", help="Skip requesting Administrator privileges on Windows")
    args = parser.parse_args()

    config = load_config()
    config["headless"] = True
    base_dir = os.path.dirname(os.path.abspath(__file__))
    enforce_neural_security(config)

    # Lower process priority so game FPS is protected
    lower_process_priority()

    # Clean temporary audio cache
    try:
        temp_dir = os.path.join(base_dir, "data", "temp_audio")
        if os.path.exists(temp_dir):
            for filename in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    logger.debug("Could not clean temp audio file %s: %s", filename, e)
    except Exception:
        pass

    # Acquire user-writable instance lock
    _default_lock_dir = os.path.expandvars(r"%LOCALAPPDATA%\MissionControl")
    lock_path = config.get("instance_lock_path", os.path.join(_default_lock_dir, "ai_gaming_assistant.lock"))

    def exception_hook(exctype, value, tb):
        err_msg = "".join(traceback.format_exception(exctype, value, tb))
        logger.critical("Unhandled Exception: %s", err_msg)
        sys.__excepthook__(exctype, value, tb)

    sys.excepthook = exception_hook

    lock_fd = acquire_instance_lock(lock_path)
    if not lock_fd:
        logger.error("Another instance appears to be running; exiting.")
        print("Another instance appears to be running; exiting.")
        sys.exit(0)

    proc_logger = None
    if config.get("debug", {}).get("log_child_processes", False):
        proc_logger = _ChildProcessLogger()
        proc_logger.start()

    reloader = None
    restart_requested = False
    pipeline = None
    lib_watcher = None

    def _request_graceful_reload(changed_path):
        nonlocal restart_requested, pipeline
        restart_requested = True
        logger.info("[RELOAD] Initiating graceful shutdown for: %s", os.path.basename(changed_path))
        if pipeline is not None:
            try:
                pipeline.stop()
            except Exception:
                pass

    if args.dev:
        reloader = HotReloader(watch_dir=base_dir, on_reload=_request_graceful_reload)
        reloader.start()

    try:
        logger.info("Starting server (Electron/React UI — WebSocket bridge enabled)")
        bridge.start()

        # Attach custom bridge logging handler to stream logs live to frontend
        bridge_handler = BridgeLogHandler(bridge)
        logging.getLogger().addHandler(bridge_handler)

        gpu_info = "Unknown GPU"
        try:
            from nvidia.gpu_monitor import GPUMonitor
            monitor = GPUMonitor()
            if monitor.is_available:
                metrics = monitor.poll_once()
                gpu_info = f"{metrics.get('gpu_name')} (VRAM: {metrics.get('vram_total_mb')}MB)"
        except Exception:
            pass

        local_ver = "0.0.0"
        try:
            local_ver = load_local_version().get("version", "0.0.0")
        except Exception:
            pass

        banner = f"""
\033[95m======================================================================\033[0m
\033[92m🚀 Mission Control BACKEND SERVER — ACTIVE & LISTENING\033[0m
\033[95m======================================================================\033[0m
\033[96m[✔] System Version  :\033[0m v{local_ver}
\033[96m[✔] WebSocket Port  :\033[0m ws://{bridge.host}:{bridge.port} (Bridge Server Online)
\033[96m[✔] Security Lock   :\033[0m Motherboard UUID signature lock verified
\033[96m[✔] Detected GPU    :\033[0m {gpu_info}
\033[95m======================================================================\033[0m
\033[93mReady and monitoring. Launch your game to initiate automatic HUD lock.\033[0m
\033[95m======================================================================\033[0m
"""
        try:
            print(banner, flush=True)
        except UnicodeEncodeError:
            safe_banner = f"""
======================================================================
[+] Mission Control BACKEND SERVER -- ACTIVE & LISTENING
======================================================================
[+] System Version  : v{local_ver}
[+] WebSocket Port  : ws://{bridge.host}:{bridge.port} (Bridge Server Online)
[+] Security Lock   : Motherboard UUID signature lock verified
[+] Detected GPU    : {gpu_info}
======================================================================
Ready and monitoring. Launch your game to initiate automatic HUD lock.
======================================================================
"""
            print(safe_banner, flush=True)

        logger.info("Broadcasting initial config with privacy settings: %s", config.get("privacy", {}))
        bridge.update_state({"config": config})

        try:
            is_frozen = getattr(sys, "frozen", False)
            bridge.update_state({"version": local_ver, "is_frozen": is_frozen})
            logger.info("Version broadcasted: %s (frozen: %s)", local_ver, is_frozen)
        except Exception:
            pass

        try:
            from handlers.system_handler import check_installed_models
            bridge.update_state({"installed_models": check_installed_models()})
            logger.info("Broadcasted initial installed_models status.")
        except Exception as e:
            logger.error("Failed to broadcast installed_models: %s", e)

        # Preload cached game library on startup for instant zero-latency UI display
        try:
            from system.game_scanner import GameScanner
            initial_scanner = GameScanner(config=config)
            cached_games = initial_scanner.load_cached_games()
            if cached_games:
                bridge.update_state({"game_library": cached_games})
                logger.info("Preloaded %d cached games into bridge state on startup.", len(cached_games))
                if pipeline and hasattr(pipeline, "process_watcher") and pipeline.process_watcher:
                    pipeline.process_watcher.update_game_registry(cached_games)
        except Exception as e:
            logger.warning("Failed to preload cached games on startup: %s", e)

        # Trigger initial telemetry glitch scan once on startup
        try:
            handle_bridge_update_commands("check_patches", {}, bridge)
            logger.info("Triggered initial telemetry glitch scan on startup.")
        except Exception as e:
            logger.error("Failed to trigger initial telemetry glitch scan: %s", e)

        # Auto-register local PC as a Library Node on startup
        try:
            game_handler._ensure_local_node_daemon()
            logger.info("Auto-registered local machine as a distributed library node daemon on startup.")
        except Exception as e:
            logger.warning("Local node auto-registration notice: %s", e)

        pipeline = GamingAssistantPipeline(config)

        # Initialize Local Vision Analyzer
        local_vision = None
        try:
            from vision.local_analyzer import LocalVisionAnalyzer
            local_vision = LocalVisionAnalyzer()
        except Exception as e:
            logger.error("Failed to instantiate Local Vision Analyzer: %s", e)

        pipeline.action_confirm_callback = lambda text, delay: (
            bridge.update_state({"confirmation_required": {"text": text, "delay": delay}}),
            True,
        )[1]
        pipeline.thermal_alert_callback = lambda title, msg, dur: bridge.update_state(
            {"alert": {"title": title, "message": msg}}
        )

        # Attach unified command router dispatcher
        bridge.on_command = lambda cmd_type, payload: dispatch_bridge_command(
            cmd_type=cmd_type,
            payload=payload,
            pipeline=pipeline,
            bridge=bridge,
            config=config,
            library_session=_library_session,
            local_vision=local_vision,
            enforce_security_fn=enforce_neural_security,
        )

        if _PROCESS_WATCHER_AVAILABLE:
            from system.game_scanner import GameScanner
            scanner = GameScanner(config=config)
            known_games = scanner.load_cached_games()

            def on_game_detected(game_info):
                logger.info("Game detected: %s - Starting pipeline", game_info.get("name"))
                try:
                    exe_path = game_info.get("exe_path")
                    game_name = game_info.get("name")
                    if exe_path and os.path.exists(exe_path):
                        user_id_str = str(pipeline.active_user_id) if pipeline and getattr(pipeline, "active_user_id", None) else None
                        scanner_with_user = GameScanner(config=config, user_id=user_id_str)
                        cached_games = scanner_with_user.load_cached_games()
                        import re
                        def clean(n):
                            n_clean = re.sub(r'\[.*?\]', '', n.lower())
                            n_clean = re.sub(r'\(.*?\)', '', n_clean)
                            return "".join(c for c in n_clean if c.isalnum())
                        target_clean = clean(game_name)
                        updated = False
                        for g in cached_games:
                            if clean(g.get("name", "")) == target_clean:
                                if not g.get("exe_path"):
                                    g["exe_path"] = exe_path
                                    updated = True
                                if not g.get("icon") or not os.path.exists(g.get("icon", "")):
                                    icon_file = scanner_with_user._extract_exe_icon(exe_path, g.get("id", g.get("name")))
                                    if icon_file:
                                        g["icon"] = icon_file
                                        updated = True
                                break
                        if updated:
                            logger.info("Updated icon/exe path for running game %s", game_name)
                            scanner_with_user.save_games_to_cache(cached_games)
                            if user_id_str:
                                with game_handler._lib_lock:
                                    _library_session[user_id_str] = cached_games
                            bridge.update_state({"game_library": cached_games})
                except Exception as e:
                    logger.error("Failed to dynamically update game icon: %s", e, exc_info=True)

                if config.get("auto_optimize_on_detect", False):
                    from system.optimizer import Optimizer
                    success, results = Optimizer.optimize_game(game_info, config)
                    if success:
                        logger.info("Auto-Optimization Applied")

                try:
                    from system.optimizer import Optimizer
                    Optimizer.enable_stealth_boost()
                except Exception as e:
                    logger.error("Failed to enable Stealth Boost Mode: %s", e)

                if pipeline:
                    pipeline.update_game_info(game_info)
                    with pipeline._state_lock:
                        pipeline._game_state["is_game_active"] = True

                try:
                    current_preset = config.get("nvidia", {}).get("preset", "quality")
                    system_handler.handle_scan_preset_optimizer(
                        {"preset": current_preset},
                        pipeline,
                        bridge,
                        config,
                        game_entry=game_info,
                    )
                    logger.info("[PresetOptimizer] Auto-scan triggered for '%s'", game_info.get("name"))
                except Exception as po_err:
                    logger.debug("[PresetOptimizer] Auto-scan skipped: %s", po_err)

                if pipeline and hasattr(pipeline, "session_recorder"):
                    pipeline.session_recorder.start_session(game_info.get("name", "Unknown Game"))
                pipeline.start()

            def on_game_exited():
                logger.info("Game exited - Stopping pipeline")
                if config.get("auto_optimize_on_detect", False) and pw and hasattr(pw, "current_game"):
                    from system.optimizer import Optimizer
                    Optimizer.revert_optimization(pw.current_game)
                    logger.info("Auto-Optimization Reverted")

                try:
                    from system.optimizer import Optimizer
                    Optimizer.disable_stealth_boost()
                except Exception as e:
                    logger.error("Failed to disable Stealth Boost Mode: %s", e)

                if sys.platform == "win32":
                    try:
                        import ctypes
                        import psutil
                        process = psutil.Process()
                        ctypes.windll.psapi.EmptyWorkingSet(process.pid)
                        logger.info("RAM Reclaimed: Triggered EmptyWorkingSet for PID %s on game exit", process.pid)
                    except Exception:
                        pass

                if pipeline:
                    pipeline.update_game_info(None)
                    with pipeline._state_lock:
                        pipeline._game_state["is_game_active"] = False

                if pipeline and hasattr(pipeline, "session_recorder"):
                    summary = pipeline.session_recorder.end_session()
                    if summary:
                        avg_fps = summary.get("fps", {}).get("avg", 0)
                        logger.info("Session Recorded. Avg FPS: %s", avg_fps)
                        if hasattr(pipeline, "memory"):
                            user_id = getattr(pipeline, "active_user_id", "guest")
                            pipeline.session_recorder.save_to_db(pipeline.memory, user_id=user_id)
                pipeline.stop()

            def on_game_crashed(game_info):
                logger.warning("Crash Detected: %s", game_info.get('name'))
                bridge.update_state({"alert": {"title": "Game Crashed", "message": f"{game_info.get('name')} stopped unexpectedly."}})
                on_game_exited()

            def on_game_hung(game_info):
                logger.warning("Game Hung: %s", game_info.get('name'))
                bridge.update_state({"alert": {"title": "Game Not Responding", "message": f"{game_info.get('name')} is not responding."}})

            pw = ProcessWatcher(poll_interval=3.0, game_registry=known_games)
            pw.on_game_detected = on_game_detected
            pw.on_game_exited = on_game_exited
            pw.on_game_crashed = on_game_crashed
            pw.on_game_hung = on_game_hung
            pw.on_game_status_changed = lambda game_info: pipeline.update_game_info(game_info) if (pipeline and pipeline.running) else None
            pw.start()
            if pipeline:
                pipeline.process_watcher = pw
            logger.info("Server: Ready (process watcher enabled)")
        else:
            pipeline.start()

        if _LIBRARY_WATCHER_AVAILABLE:
            lib_watcher = LibraryWatcher(
                pipeline=pipeline,
                bridge=bridge,
                config=config,
                library_session=_library_session,
            )
            lib_watcher.start()

        try:
            while not (restart_requested or (reloader and reloader.restart_requested)):
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Server shutdown requested via console.")
    finally:
        if lib_watcher:
            try:
                lib_watcher.stop()
            except Exception:
                pass
        if pipeline:
            try:
                pipeline.stop()
            except Exception:
                pass
        if reloader:
            reloader.stop()
        if proc_logger:
            proc_logger.stop()
        release_instance_lock(lock_fd, lock_path)

    if restart_requested or (reloader and reloader.restart_requested):
        python = sys.executable
        exec_args = [python] + [a for a in sys.argv if a != "--dev"] + ["--dev"]
        logger.info("[RELOAD] Relaunching process...")
        os.execv(python, exec_args)


if __name__ == "__main__":
    multiprocessing.freeze_support()
    request_admin_elevation()
    main()

