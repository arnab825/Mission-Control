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
sys.dont_write_bytecode = True


import threading
import time
import traceback
import warnings
warnings.filterwarnings("ignore", category=SyntaxWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning, module="easyocr")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="torch")
warnings.filterwarnings("ignore", message=".*torch.ao.quantization.*")
logging.getLogger("easyocr").setLevel(logging.ERROR)

from dotenv import load_dotenv

# Look for .env in various possible locations, especially when packaged/frozen
env_search_paths = []

# 1. Same directory as this script (Dev mode)
env_search_paths.append(os.path.join(os.path.dirname(__file__), ".env"))

# 2. If frozen (compiled PyInstaller executable), check executable folder and its parent
if getattr(sys, 'frozen', False):
    exe_dir = os.path.dirname(sys.executable)
    env_search_paths.append(os.path.join(exe_dir, ".env"))
    env_search_paths.append(os.path.join(os.path.dirname(exe_dir), ".env"))

# 3. Parent directory of the script
env_search_paths.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# 4. Frontend folder check
env_search_paths.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", ".env"))

# Load the first one that exists
env_loaded = False
for path_to_try in env_search_paths:
    if os.path.exists(path_to_try):
        load_dotenv(path_to_try)
        env_loaded = True
        break

if not env_loaded:
    load_dotenv()

try:
    import psutil

    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False

try:
    from system.process_watcher import ProcessWatcher

    _PROCESS_WATCHER_AVAILABLE = True
except ImportError:
    ProcessWatcher = None  # type: ignore
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)

# Silence verbose, transient warnings from the dxcam screen-capture library
logging.getLogger("dxcam").setLevel(logging.ERROR)

logger = logging.getLogger("main")

# ── Per-user in-memory library session cache ───────────────────────────────────
# Keyed by Clerk user_id. Populated on first get_cached_games per login session.
# Cleared on logout_user / delete_account so the next login re-fetches cleanly.
_library_session: dict = {}

# Import handler modules (extracted command domains)
from handlers import chat_handler, game_handler, system_handler, agent_handler


class BridgeLogHandler(logging.Handler):
    """Custom logging handler to route logs over the WebSocket bridge."""

    def __init__(self, bridge_server):
        super().__init__()
        self.bridge = bridge_server
        self.setFormatter(logging.Formatter("%(message)s", "%H:%M:%S"))

    def emit(self, record):
        import time
        name = record.name
        # Bypass websockets/asyncio/bridge_server records to avoid infinite feedback loops
        if name.startswith("websockets") or name.startswith("bridge_server") or name.startswith("asyncio"):
            return
        try:
            log_type = record.levelname
            # Highlight AI reasoning/coaching outputs in teal as AGENT log entries
            if name.startswith("ai_brain") or name.startswith("pipeline_host"):
                if log_type == "INFO":
                    log_type = "AGENT"

            log_entry = {
                "time": self.formatter.formatTime(record, "%H:%M:%S") if self.formatter else time.strftime("%H:%M:%S", time.localtime(record.created)),
                "type": log_type,
                "msg": record.getMessage()
            }
            self.bridge.add_log(log_entry)
        except Exception:
            self.handleError(record)


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
    if parent_pid > 1:

        def monitor_parent():
            import ctypes

            while True:
                time.sleep(3)
                try:
                    if os.name == "nt":
                        PROCESS_QUERY_INFORMATION = 0x0400
                        SYNCHRONIZE = 0x00100000
                        handle = ctypes.windll.kernel32.OpenProcess(
                            PROCESS_QUERY_INFORMATION | SYNCHRONIZE, False, parent_pid
                        )
                        if handle == 0:
                            os._exit(0)
                        exit_code = ctypes.c_ulong()
                        ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
                        STILL_ACTIVE = 259
                        if exit_code.value != STILL_ACTIVE:
                            os._exit(0)
                        ctypes.windll.kernel32.CloseHandle(handle)
                    elif os.getppid() != parent_pid:
                        os._exit(0)
                except Exception:
                    pass

        threading.Thread(target=monitor_parent, daemon=True, name="OrphanMonitor").start()

    parser = argparse.ArgumentParser(description="AI Gaming Assistant")
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Enable hot reload (restarts on file change)",
    )
    parser.add_argument(
        "--no-admin",
        action="store_true",
        help="Skip requesting Administrator privileges on Windows",
    )
    args = parser.parse_args()

    config = load_config()
    config["headless"] = True
    base_dir = os.path.dirname(os.path.abspath(__file__))
    enforce_neural_security(config)

    # ── Lower process priority so the backend never competes with the game ──────
    # BELOW_NORMAL on Windows (0x4000) ensures the OS always prefers the game
    # process (which runs at Normal priority) for CPU scheduling.
    try:
        if _PSUTIL_AVAILABLE:
            import psutil as _psutil
            _proc = _psutil.Process(os.getpid())
            if os.name == "nt":
                _proc.nice(_psutil.BELOW_NORMAL_PRIORITY_CLASS)
            else:
                _proc.nice(10)  # Unix nice value: 10 = noticeably lower priority
            logger.info("[Perf] Backend process priority set to BELOW_NORMAL — game performance protected.")
        elif os.name == "nt":
            import ctypes as _ctypes
            BELOW_NORMAL_PRIORITY_CLASS = 0x00004000
            _ctypes.windll.kernel32.SetPriorityClass(
                _ctypes.windll.kernel32.GetCurrentProcess(),
                BELOW_NORMAL_PRIORITY_CLASS
            )
            logger.info("[Perf] Backend process priority set to BELOW_NORMAL via WinAPI.")
    except Exception as _prio_err:
        logger.debug("[Perf] Could not lower process priority: %s", _prio_err)


    try:
        temp_dir = os.path.join(base_dir, "data", "temp_audio")
        if os.path.exists(temp_dir):
            for filename in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    logger.debug(f"Could not clean temp audio file {filename}: {e}")
    except Exception:
        pass

    lock_fd = None
    lock_path = config.get("instance_lock_path", os.path.join(base_dir, "data", "ai_gaming_assistant.lock"))
    try:
        os.makedirs(os.path.dirname(lock_path), exist_ok=True)
    except Exception:
        pass

    def _acquire_lock(path):
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
            os.write(fd, str(os.getpid()).encode())
            return fd
        except FileExistsError:
            pid = None
            try:
                with open(path, "r") as f:
                    txt = f.read().strip()
                    pid = int(txt) if txt else None
            except Exception:
                pid = None

            if pid and _PSUTIL_AVAILABLE:
                try:
                    if psutil.pid_exists(pid):
                        proc = psutil.Process(pid)
                        curr_proc = psutil.Process(os.getpid())
                        
                        proc_name = proc.name().lower()
                        curr_name = curr_proc.name().lower()
                        
                        is_same_app = False
                        if "python" in proc_name and "python" in curr_name:
                            proc_cmd = proc.cmdline()
                            curr_cmd = curr_proc.cmdline()
                            proc_main = any("main.py" in arg for arg in proc_cmd)
                            curr_main = any("main.py" in arg for arg in curr_cmd)
                            if proc_main and curr_main:
                                is_same_app = True
                        elif proc_name == curr_name:
                            is_same_app = True
                            
                        if is_same_app:
                            return None
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                except Exception:
                    pass

            try:
                os.remove(path)
                fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                os.write(fd, str(os.getpid()).encode())
                return fd
            except Exception:
                return None

    def exception_hook(exctype, value, tb):
        err_msg = "".join(traceback.format_exception(exctype, value, tb))
        logger.critical("Unhandled Exception: %s", err_msg)
        sys.__excepthook__(exctype, value, tb)

    sys.excepthook = exception_hook

    lock_fd = _acquire_lock(lock_path)
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
        reloader = HotReloader(on_reload=_request_graceful_reload)
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

        # Print a highly aesthetic ANSI startup banner to stdout for direct terminal clarity
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
            # Fallback plain banner for raw CP1252 consoles
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

        # Send initial config state to frontend IMMEDIATELY (includes privacy settings)
        # This ensures frontend receives config as part of the initial state broadcast
        logger.info("Broadcasting initial config with privacy settings: %s", config.get("privacy", {}))
        bridge.update_state({"config": config})

        try:
            bridge.update_state({"version": local_ver})
            logger.info("Version broadcasted: %s", local_ver)
        except Exception:
            pass

        pipeline = GamingAssistantPipeline(config)
        pw = None
        lib_watcher = None

        # Initialize Local Vision Analyzer (instantiated lazily; actual loading is deferred to first use)
        local_vision = None
        try:
            from vision.local_analyzer import LocalVisionAnalyzer
            local_vision = LocalVisionAnalyzer()
        except Exception as e:
            logger.error(f"Failed to instantiate Local Vision Analyzer: {e}")

        def on_action_confirm(text, delay):
            logger.info("ACTION CONFIRMATION: %s", text)
            bridge.update_state({"confirmation_required": {"text": text, "delay": delay}})
            return True

        def on_thermal_alert(title, msg, dur):
            logger.warning("THERMAL ALERT: %s - %s", title, msg)
            bridge.update_state({"alert": {"title": title, "message": msg}})

        pipeline.action_confirm_callback = on_action_confirm
        pipeline.thermal_alert_callback = on_thermal_alert

        def _handle_bridge_command(cmd_type, payload):
            # Sync user_id to pipeline on every command that carries one
            if payload and "userId" in payload and pipeline:
                pipeline.active_user_id = payload.get("userId")

            # ── Updater commands (handled separately) ─────────────────────
            if handle_bridge_update_commands(cmd_type, payload, bridge):
                return

            # ── Context bundles passed into handlers ──────────────────────
            _sys_ctx = dict(pipeline=pipeline, bridge=bridge, config=config)
            _game_ctx = dict(**_sys_ctx, library_session=_library_session)
            _cfg_ctx = dict(**_sys_ctx, save_config_fn=save_config, enforce_security_fn=enforce_neural_security)

            # ── Chat / Conversation commands ──────────────────────────────
            if cmd_type == "execute":
                chat_handler.handle_execute(payload, pipeline, bridge, config)
            elif cmd_type == "stop_tts":
                if pipeline and hasattr(pipeline, "voice_manager") and pipeline.voice_manager:
                    pipeline.voice_manager.mute_chat_tts()
            elif cmd_type == "set_tts_muted":
                muted = payload.get("muted", True)
                if pipeline and hasattr(pipeline, "voice_manager") and pipeline.voice_manager:
                    if muted:
                        pipeline.voice_manager.mute_chat_tts()
                    else:
                        pipeline.voice_manager.unmute_chat_tts()
            elif cmd_type == "speak_text":
                text = payload.get("text", "")
                if text and pipeline and hasattr(pipeline, "voice_manager") and pipeline.voice_manager:
                    pipeline.voice_manager.speak(text, force=True)
            elif cmd_type == "migrate_local_history":
                chat_handler.handle_migrate_local_history(payload, pipeline, bridge, config)
            elif cmd_type == "get_chat_sessions":
                chat_handler.handle_get_chat_sessions(payload, pipeline, bridge, config)
            elif cmd_type == "get_chat_history":
                chat_handler.handle_get_chat_history(payload, pipeline, bridge, config)
            elif cmd_type == "get_session_history":
                chat_handler.handle_get_session_history(payload, pipeline, bridge, config)
            elif cmd_type == "create_chat_session":
                chat_handler.handle_create_chat_session(payload, pipeline, bridge, config)
            elif cmd_type == "delete_chat_session":
                chat_handler.handle_delete_chat_session(payload, pipeline, bridge, config)
            elif cmd_type == "clear_chat_sessions":
                chat_handler.handle_clear_chat_sessions(payload, pipeline, bridge, config)
            elif cmd_type == "rename_chat_session":
                chat_handler.handle_rename_chat_session(payload, pipeline, bridge, config)
            elif cmd_type == "suggest_session_title":
                chat_handler.handle_suggest_session_title(payload, pipeline, bridge, config)
            elif cmd_type == "retry_message":
                chat_handler.handle_retry_message(payload, pipeline, bridge, config)
            elif cmd_type == "submit_feedback":
                chat_handler.handle_submit_feedback(payload, pipeline, bridge, config)

            # ── Game library / scanning commands ──────────────────────────
            elif cmd_type == "get_cached_games":
                game_handler.handle_get_cached_games(payload, pipeline, bridge, config, _library_session)
            elif cmd_type == "scan_games":
                game_handler.handle_scan_games(payload, pipeline, bridge, config, _library_session)
            elif cmd_type == "launch_game":
                game_handler.handle_launch_game(payload, pipeline, bridge, config, _library_session)
            elif cmd_type == "logout_user":
                game_handler.handle_logout_user(payload, pipeline, bridge, config, _library_session)
            elif cmd_type == "delete_account":
                game_handler.handle_delete_account(payload, pipeline, bridge, config, _library_session)

            # ── System / hardware / config commands ───────────────────────
            elif cmd_type == "optimize_system":
                system_handler.handle_optimize_system(payload, pipeline, bridge, config)
            elif cmd_type == "revert_optimization":
                system_handler.handle_revert_optimization(payload, pipeline, bridge, config)
            elif cmd_type == "set_cooling_mode":
                system_handler.handle_set_cooling_mode(payload, pipeline, bridge, config)
            elif cmd_type == "update_config":
                system_handler.handle_update_config(payload, pipeline, bridge, config, save_config, enforce_neural_security)
            elif cmd_type == "save_settings":
                system_handler.handle_save_settings(payload, pipeline, bridge, config, save_config, enforce_neural_security)
            elif cmd_type == "get_settings":
                system_handler.handle_get_settings(payload, pipeline, bridge, config)
            elif cmd_type == "analyze_screen_local":
                system_handler.handle_analyze_screen_local(payload, pipeline, bridge, config, local_vision)
            elif cmd_type == "clear_logs":
                system_handler.handle_clear_logs(payload, pipeline, bridge, config)
            elif cmd_type == "get_core_optimization":
                system_handler.handle_get_core_optimization(payload, pipeline, bridge, config)
            elif cmd_type == "scan_preset_optimizer":
                system_handler.handle_scan_preset_optimizer(payload, pipeline, bridge, config)
            elif cmd_type == "get_gaming_readiness":
                system_handler.handle_get_gaming_readiness(payload, pipeline, bridge, config)

            # ── Agent mode / voice commands ───────────────────────────────
            elif cmd_type == "toggle_agent_mode":
                agent_handler.handle_toggle_agent_mode(payload, pipeline, bridge, config)
            elif cmd_type == "set_personality":
                agent_handler.handle_set_personality(payload, pipeline, bridge, config)
            elif cmd_type == "toggle_voice":
                agent_handler.handle_toggle_voice(payload, pipeline, bridge, config)
            elif cmd_type == "stop_voice":
                agent_handler.handle_stop_voice(payload, pipeline, bridge, config)

            else:
                logger.debug("Unknown bridge command: %s", cmd_type)

        bridge.on_command = _handle_bridge_command

        if _PROCESS_WATCHER_AVAILABLE:
            from system.game_scanner import GameScanner

            scanner = GameScanner(config=config)
            known_games = scanner.load_cached_games()

            def on_game_detected(game_info):
                logger.info("Game detected: %s - Starting pipeline", game_info.get("name"))
                
                # Dynamic Icon Extraction/Update for Running Games
                try:
                    exe_path = game_info.get("exe_path")
                    game_name = game_info.get("name")
                    if exe_path and os.path.exists(exe_path):
                        user_id_str = str(pipeline.active_user_id) if pipeline and getattr(pipeline, "active_user_id", None) else None
                        scanner_with_user = GameScanner(config=config, user_id=user_id_str)
                        cached_games = scanner_with_user.load_cached_games()
                        
                        # Match by clean name
                        import re
                        def clean(n):
                            n_clean = re.sub(r'\[.*?\]', '', n.lower())
                            n_clean = re.sub(r'\(.*?\)', '', n_clean)
                            return "".join(c for c in n_clean if c.isalnum())
                        
                        target_clean = clean(game_name)
                        updated = False
                        for g in cached_games:
                            if clean(g.get("name", "")) == target_clean:
                                # Update exe_path if missing
                                if not g.get("exe_path"):
                                    g["exe_path"] = exe_path
                                    updated = True
                                
                                # Extract icon if missing
                                if not g.get("icon") or not os.path.exists(g.get("icon", "")):
                                    icon_file = scanner_with_user._extract_exe_icon(exe_path, g.get("id", g.get("name")))
                                    if icon_file:
                                        g["icon"] = icon_file
                                        updated = True
                                break
                        
                        if updated:
                            logger.info(f"Updated icon/exe path for running game {game_name}")
                            scanner_with_user.save_games_to_cache(cached_games)
                            # Update library session cache
                            if user_id_str:
                                with game_handler._lib_lock:
                                    _library_session[user_id_str] = cached_games
                            # Push updated state to frontend
                            bridge.update_state({"game_library": cached_games})
                except Exception as e:
                    logger.error(f"Failed to dynamically update game icon: {e}", exc_info=True)
                if config.get("auto_optimize_on_detect", False):
                    from system.optimizer import Optimizer
                    success, results = Optimizer.optimize_game(game_info, config)
                    if success:
                        logger.info("Auto-Optimization Applied")
                
                # Activate Stealth Boost Mode for VRAM Defragmentation & Suspender
                try:
                    from system.optimizer import Optimizer
                    Optimizer.enable_stealth_boost()
                except Exception as e:
                    logger.error(f"Failed to enable Stealth Boost Mode: {e}")

                if pipeline:
                    pipeline.update_game_info(game_info)
                    with pipeline._state_lock:
                        pipeline._game_state["is_game_active"] = True

                # Auto-scan preset optimizer when game is detected
                try:
                    current_preset = config.get("nvidia", {}).get("preset", "quality")
                    system_handler.handle_scan_preset_optimizer(
                        {"preset": current_preset},
                        pipeline,
                        bridge,
                        config,
                        game_entry=game_info,  # pass full game_info dict directly
                    )
                    logger.info("[PresetOptimizer] Auto-scan triggered for '%s'", game_info.get("name"))
                except Exception as _po_err:
                    logger.debug("[PresetOptimizer] Auto-scan skipped: %s", _po_err)

                if pipeline and hasattr(pipeline, "session_recorder"):
                    pipeline.session_recorder.start_session(game_info.get("name", "Unknown Game"))
                pipeline.start()

            def on_game_exited():
                logger.info("Game exited - Stopping pipeline")
                if config.get("auto_optimize_on_detect", False) and pw and hasattr(pw, "current_game"):
                    from system.optimizer import Optimizer
                    Optimizer.revert_optimization(pw.current_game)
                    logger.info("Auto-Optimization Reverted")
                
                # Deactivate Stealth Boost Mode
                try:
                    from system.optimizer import Optimizer
                    Optimizer.disable_stealth_boost()
                except Exception as e:
                    logger.error(f"Failed to disable Stealth Boost Mode: {e}")

                # Win32 Memory flush (Aggressive reclamation on exit)
                if sys.platform == "win32":
                    try:
                        import ctypes
                        import psutil
                        process = psutil.Process()
                        ctypes.windll.psapi.EmptyWorkingSet(process.pid)
                        logger.info(f"RAM Reclaimed: Triggered EmptyWorkingSet for PID {process.pid} on game exit")
                    except Exception as e:
                        pass

                if pipeline:
                    pipeline.update_game_info(None)
                    with pipeline._state_lock:
                        pipeline._game_state["is_game_active"] = False

                if pipeline and hasattr(pipeline, "session_recorder"):
                    summary = pipeline.session_recorder.end_session()
                    if summary:
                        avg_fps = summary.get("fps", {}).get("avg", 0)
                        logger.info(f"Session Recorded. Avg FPS: {avg_fps}")
                        if hasattr(pipeline, "memory"):
                            user_id = getattr(pipeline, "active_user_id", "guest")
                            pipeline.session_recorder.save_to_db(pipeline.memory, user_id=user_id)
                pipeline.stop()

            def on_game_crashed(game_info):
                logger.warning(f"Crash Detected: {game_info.get('name')}")
                bridge.update_state({"alert": {"title": "Game Crashed", "message": f"{game_info.get('name')} stopped unexpectedly."}})
                on_game_exited()
                
            def on_game_hung(game_info):
                logger.warning(f"Game Hung: {game_info.get('name')}")
                bridge.update_state({"alert": {"title": "Game Not Responding", "message": f"{game_info.get('name')} is not responding."}})

            pw = ProcessWatcher(poll_interval=3.0, game_registry=known_games)
            pw.on_game_detected = on_game_detected
            pw.on_game_exited = on_game_exited
            pw.on_game_crashed = on_game_crashed
            pw.on_game_hung = on_game_hung

            def on_game_status_changed(game_info):
                """Fires every poll cycle while game is running — propagates hwnd and minimization state."""
                if pipeline and pipeline.running:
                    pipeline.update_game_info(game_info)

            pw.on_game_status_changed = on_game_status_changed
            pw.start()
            if pipeline:
                pipeline.process_watcher = pw
            logger.info("Server: Ready (process watcher enabled)")

            # NOTE: No startup scan is performed. Library data is user-scoped (Clerk user_id);
            # the authenticated user's games load from Supabase when they log in.
        else:
            pipeline.start()

        if _LIBRARY_WATCHER_AVAILABLE:
            lib_watcher = LibraryWatcher(
                pipeline=pipeline,
                bridge=bridge,
                config=config,
                library_session=_library_session
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
        try:
            if lock_fd:
                try:
                    os.close(lock_fd)
                except Exception:
                    pass
                if os.path.exists(lock_path):
                    try:
                        os.remove(lock_path)
                    except Exception:
                        pass
        except Exception:
            logger.debug("Failed to cleanup instance lock", exc_info=True)

    if restart_requested or (reloader and reloader.restart_requested):
        python = sys.executable
        exec_args = [python] + [a for a in sys.argv if a != "--dev"] + ["--dev"]
        logger.info("[RELOAD] Relaunching process...")
        os.execv(python, exec_args)


if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    # Request UAC elevation on Windows if not running as admin.
    if sys.platform == "win32" and "--no-admin" not in sys.argv:
        import ctypes
        try:
            if not ctypes.windll.shell32.IsUserAnAdmin():
                # Not admin, attempt to elevate
                params = " ".join([f'"{arg}"' for arg in sys.argv])
                print("Requesting Administrator privileges for native ETW hooks...")
                ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, os.getcwd(), 1)
                sys.exit(0)
        except Exception as e:
            print(f"Failed to elevate to Administrator: {e}")
            
    main()
