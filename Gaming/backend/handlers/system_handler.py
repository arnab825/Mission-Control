"""
System / hardware / configuration handlers.
Commands: optimize_system, revert_optimization, set_cooling_mode, update_config,
          save_settings, get_settings, analyze_screen_local, clear_logs,
          get_core_optimization, scan_preset_optimizer, get_gaming_readiness
"""
import logging
import threading

logger = logging.getLogger(__name__)


def handle_optimize_system(payload: dict, pipeline, bridge, config) -> None:
    logger.info("One-Click Boost Mode Activation initiated")
    
    def _do_optimize():
        try:
            from system.optimizer import Optimizer

            active_game = _get_active_game(pipeline)
            game_data = _game_data_from(active_game)

            success, results = Optimizer.optimize_game(game_data, config)
            logger.info("System optimization completed: success=%s, results=%s", success, results)

            if pipeline and hasattr(pipeline, "_game_state"):
                with pipeline._state_lock:
                    pipeline._game_state["game_mode_manual"] = True
                    pipeline._game_state["cooling_mode"] = "max"
                    pipeline._game_state["cooling_applied"] = True

            bridge.update_state({
                "optimization_status": {"success": success, "results": results, "active": True},
                "cooling_mode": "max",
                "cooling_applied": True,
            })
        except Exception as e:
            logger.error("System optimization failed: %s", e, exc_info=True)
            bridge.update_state({"optimization_status": {"success": False, "error": str(e), "active": False}})

    threading.Thread(target=_do_optimize, name="BoostModeActivate", daemon=True).start()


def handle_revert_optimization(payload: dict, pipeline, bridge, config) -> None:
    logger.info("One-Click Boost Mode Revert initiated")
    
    def _do_revert():
        try:
            from system.optimizer import Optimizer

            active_game = _get_active_game(pipeline)
            game_data = _game_data_from(active_game)

            success, results = Optimizer.revert_optimization(game_data)
            logger.info("System optimization revert completed: success=%s, results=%s", success, results)

            if pipeline and hasattr(pipeline, "_game_state"):
                with pipeline._state_lock:
                    pipeline._game_state["game_mode_manual"] = False
                    pipeline._game_state["cooling_mode"] = "balanced"
                    pipeline._game_state["cooling_applied"] = True

            bridge.update_state({
                "optimization_status": {"success": success, "results": results, "active": False},
                "cooling_mode": "balanced",
                "cooling_applied": True,
            })
        except Exception as e:
            logger.error("System optimization revert failed: %s", e, exc_info=True)

    threading.Thread(target=_do_revert, name="BoostModeRevert", daemon=True).start()


def handle_set_cooling_mode(payload: dict, pipeline, bridge, config) -> None:
    mode = payload.get("mode", "balanced")
    logger.info("Cooling mode change requested: %s", mode)
    try:
        from system.optimizer import Optimizer

        pw_success, pw_msg = Optimizer.set_power_plan(mode)
        logger.info(
            "Power plan application for thermal mode '%s': success=%s, msg=%s",
            mode, pw_success, pw_msg,
        )

        gpu_applied = False
        if pipeline and hasattr(pipeline, "gpu_monitor") and pipeline.gpu_monitor:
            gm = pipeline.gpu_monitor
            if gm.is_available and gm._initialized and gm._handle:
                try:
                    import pynvml, subprocess
                    try:
                        _min_lim, max_lim = pynvml.nvmlDeviceGetPowerManagementLimitConstraints(gm._handle)
                    except Exception:
                        max_lim = pynvml.nvmlDeviceGetPowerManagementDefaultLimit(gm._handle)

                    if mode == "silent":
                        new_limit = int(max_lim * 0.60)
                    elif mode == "max":
                        new_limit = max_lim
                    else:
                        new_limit = int(max_lim * 0.85)

                    try:
                        pynvml.nvmlDeviceSetPowerManagementLimit(gm._handle, new_limit)
                        gpu_applied = True
                    except Exception:
                        try:
                            watts = new_limit // 1000
                            subprocess.run(["nvidia-smi", "-i", "0", "-pl", str(watts)], capture_output=True, timeout=5, creationflags=0x08000000 if os.name == "nt" else 0)
                            gpu_applied = True
                        except Exception:
                            pass
                    logger.info("Cooling mode '%s' GPU limit applied: %dW", mode, new_limit // 1000)
                except Exception as nvml_err:
                    logger.warning("Could not apply GPU power limit via NVML: %s", nvml_err)

        if pipeline and hasattr(pipeline, "_game_state"):
            with pipeline._state_lock:
                pipeline._game_state["cooling_mode"] = mode
                pipeline._game_state["cooling_applied"] = pw_success or gpu_applied

        bridge.update_state({
            "cooling_mode": mode,
            "cooling_applied": pw_success or gpu_applied,
        })
    except Exception as e:
        logger.error("Cooling mode change failed: %s", e, exc_info=True)


def handle_update_config(payload: dict, pipeline, bridge, config, save_config_fn, enforce_security_fn) -> None:
    new_cfg = payload or {}
    for k, v in new_cfg.items():
        if isinstance(v, dict) and k in config and isinstance(config[k], dict):
            config[k].update(v)
        else:
            config[k] = v
    save_config_fn(config)
    enforce_security_fn(config, pipeline)
    logger.info("Configuration updated via update_config bridge command")
    if pipeline:
        pipeline.update_config(config)
    bridge.update_state({"config": config})


def handle_save_settings(payload: dict, pipeline, bridge, config, save_config_fn, enforce_security_fn) -> None:
    new_settings = payload.get("config", {})
    if not new_settings:
        return
    for k, v in new_settings.items():
        if isinstance(v, dict) and k in config and isinstance(config[k], dict):
            config[k].update(v)
        else:
            config[k] = v
    save_config_fn(config)
    enforce_security_fn(config, pipeline)
    logger.info("Configuration saved via save_settings bridge command")
    if pipeline:
        pipeline.update_config(config)

    # ── Apply Real Hardware Controls ──────────────────────────────────────────
    nvidia_cfg = config.get("nvidia", {})
    _apply_hardware_controls(nvidia_cfg)

    bridge.update_state({"config": config})


def _apply_hardware_controls(nvidia_cfg: dict) -> None:
    """Apply real hardware settings that can be controlled externally."""
    import threading
    threading.Thread(target=_apply_hardware_controls_bg, args=(nvidia_cfg,), daemon=True).start()


def _apply_hardware_controls_bg(nvidia_cfg: dict) -> None:
    import os, subprocess, logging
    hw_logger = logging.getLogger(__name__)

    # 1. GPU Power Limit via NVML
    power_limit_pct = nvidia_cfg.get("power_limit_percent", None)
    if power_limit_pct is not None:
        try:
            import pynvml, subprocess
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            try:
                _min_lim, max_lim = pynvml.nvmlDeviceGetPowerManagementLimitConstraints(handle)
            except Exception:
                max_lim = pynvml.nvmlDeviceGetPowerManagementDefaultLimit(handle)
            new_limit = int(max_lim * (power_limit_pct / 100.0))
            try:
                pynvml.nvmlDeviceSetPowerManagementLimit(handle, new_limit)
            except Exception:
                try:
                    watts = new_limit // 1000
                    subprocess.run(["nvidia-smi", "-i", "0", "-pl", str(watts)], capture_output=True, timeout=5, creationflags=0x08000000 if os.name == "nt" else 0)
                except Exception:
                    pass
            hw_logger.info("GPU power limit set to %d%% (%dW)", power_limit_pct, new_limit // 1000)
            pynvml.nvmlShutdown()
        except Exception as e:
            hw_logger.debug("Could not apply GPU power limit: %s", e)

    if os.name != "nt":
        return  # Registry tweaks are Windows-only

    try:
        import winreg
    except ImportError:
        return

    # 2. Low Latency Mode (Ultra) via NVIDIA NVCP registry
    low_latency = nvidia_cfg.get("low_latency_mode", None)
    if low_latency is not None:
        _set_nvcp_registry("00ICFEValue0025", "0x00000001" if low_latency else "0x00000000", hw_logger)

    # 3. Power Management Mode via NVIDIA NVCP registry
    # 0x00000001 = Adaptive, 0x00000008 = Prefer Max Performance, 0x00000000 = Optimal
    pw_mode = nvidia_cfg.get("power_management_mode", None)
    if pw_mode is not None:
        mode_map = {"adaptive": "0x00000001", "max_performance": "0x00000008", "optimal": "0x00000000"}
        val = mode_map.get(pw_mode, "0x00000001")
        _set_nvcp_registry("00ICFEValue0009", val, hw_logger)

    # 4. Shader Cache Size via NVIDIA registry
    shader_cache_gb = nvidia_cfg.get("shader_cache_gb", None)
    if shader_cache_gb is not None:
        try:
            import winreg
            key_path = r"SOFTWARE\NVIDIA Corporation\Global\NVTweak"
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
            except FileNotFoundError:
                key = winreg.CreateKeyEx(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
            with key:
                # Value is in MB
                winreg.SetValueEx(key, "ShaderCacheSize", 0, winreg.REG_DWORD, shader_cache_gb * 1024)
            hw_logger.info("Shader cache set to %d GB", shader_cache_gb)
        except Exception as e:
            hw_logger.debug("Could not set shader cache size: %s", e)


def _set_nvcp_registry(value_name: str, value_data: str, hw_logger) -> None:
    """Write a value to the NVIDIA Control Panel global profile registry key."""
    try:
        import winreg
        key_path = r"SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\NVTweak"
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
        except FileNotFoundError:
            key = winreg.CreateKeyEx(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
        with key:
            winreg.SetValueEx(key, value_name, 0, winreg.REG_SZ, value_data)
        hw_logger.info("NVCP registry '%s' set to %s", value_name, value_data)
    except Exception as e:
        hw_logger.debug("Could not write NVCP registry key '%s': %s", value_name, e)


def handle_get_settings(payload: dict, pipeline, bridge, config) -> None:
    bridge.update_state({"config": config})


def handle_analyze_screen_local(payload: dict, pipeline, bridge, config, local_vision) -> None:
    if not local_vision:
        bridge.update_state({"vision_overlay": {"error": "Local Vision not available"}})
        return

    if not local_vision.enabled:
        if not getattr(local_vision, "_initializing", False):
            local_vision._initializing = True
            def _init_bg():
                try:
                    local_vision.initialize()
                finally:
                    local_vision._initializing = False
            threading.Thread(target=_init_bg, name="VisionInitBg", daemon=True).start()
            bridge.update_state({"vision_overlay": {"error": "Initializing local vision engine... Please wait 5-10 seconds and try again."}})
        else:
            bridge.update_state({"vision_overlay": {"error": "Local vision engine is still initializing... please wait."}})
        return

    def _do_analyze():
        try:
            import mss
            import numpy as np
            with mss.mss() as sct:
                monitor = sct.monitors[1]
                sct_img = sct.grab(monitor)
                img = np.array(sct_img)[..., :3]
            res = local_vision.analyze_frame(img)
            bridge.update_state({"vision_overlay": res})
        except Exception as e:
            logger.error("Local vision error: %s", e, exc_info=True)
            bridge.update_state({"vision_overlay": {"error": str(e)}})

    threading.Thread(target=_do_analyze, name="VisionAnalyze", daemon=True).start()


def handle_clear_logs(payload: dict, pipeline, bridge, config) -> None:
    logger.info("Clearing active logs from bridge state")
    bridge.clear_logs()


def handle_get_core_optimization(payload: dict, pipeline, bridge, config) -> None:
    game_title = payload.get("game", "")
    # Accept an optional full game entry so detect_presets can search the
    # game's actual install directory (mirrors the library scanner behaviour).
    game_entry = payload.get("game_entry") or {}
    logger.info(f"Core Optimization requested for game: {game_title}")

    def _do_optimization():
        try:
            from system.hw_checker import HardwareChecker
            from system.preset_detector import GamePresetDetector
            from ai_brain.core_optimization_engine import CoreOptimizationEngine

            # 1. Get Hardware
            hw_checker = HardwareChecker()
            specs = hw_checker.get_system_specs()
            hw_str = f"CPU: {specs['hardware']['cpu']}, GPU: {specs['hardware']['gpu']} ({specs['vram_gb']}GB VRAM), RAM: {specs['hardware']['ram']}"
            if specs['displays']:
                hw_str += f", Display: {specs['displays'][0]['resolution']} {specs['displays'][0]['refresh']}"

            # 2. Try to resolve the game entry from the active pipeline game state
            #    so we always have install_path/exe_path available.
            resolved_entry = dict(game_entry)  # start with whatever was passed in
            if pipeline and hasattr(pipeline, "_game_state"):
                try:
                    with pipeline._state_lock:
                        active = pipeline._game_state.get("game_info") or {}
                    if active.get("name", "").lower() == game_title.lower():
                        resolved_entry = {**active, **resolved_entry}  # payload fields take precedence
                except Exception:
                    pass

            # 2b. Get Presets — now passes install/exe paths so the detector
            #     searches the game's real folder, not just standard OS paths.
            preset_detector = GamePresetDetector(config)
            presets_str = preset_detector.detect_presets(game_title, game_entry=resolved_entry or None)

            # 3. Call LLM
            engine = CoreOptimizationEngine(config)
            advice = engine.get_optimization_advice(hw_str, game_title, presets_str)

            bridge.update_state({
                "core_optimization_result": advice
            })
            logger.info("Core optimization completed successfully.")
        except Exception as e:
            logger.error(f"Core optimization failed: {e}", exc_info=True)
            bridge.update_state({
                "core_optimization_result": f"Error: {str(e)}"
            })

    threading.Thread(target=_do_optimization, name="CoreOptBg", daemon=True).start()


def handle_scan_preset_optimizer(
    payload: dict, pipeline, bridge, config,
    game_entry: dict | None = None,
) -> None:
    """
    Scan the running game's config files and compare them against the
    selected preset. Pushes 'preset_optimizer' state to the frontend.

    :param game_entry: If provided directly (e.g. from on_game_detected),
        skips reading from payload. Otherwise reads from payload['game_entry'].
    """
    import time as _time

    entry  = game_entry or payload.get("game_entry", {})
    preset = payload.get("preset", config.get("nvidia", {}).get("preset", "quality"))

    if not entry:
        bridge.update_state({
            "preset_optimizer": {
                "game_title": "",
                "preset": preset,
                "scan_time": _time.time(),
                "status": "no_game",
                "items": [],
            }
        })
        return

    def _do_scan():
        try:
            from system.preset_detector import GamePresetDetector
            from system.preset_comparator import PresetComparator

            detector   = GamePresetDetector(config)
            scanned    = detector.get_structured_settings(entry)

            comparator = PresetComparator()
            items      = comparator.compare(
                preset,
                scanned,
                entry.get("features", []),
                game_title=entry.get("name", ""),
            )

            match_count    = sum(1 for i in items if i["status"] == "match")
            mismatch_count = sum(1 for i in items if i["status"] == "mismatch")
            total_required = sum(1 for i in items if i["required"])

            bridge.update_state({
                "preset_optimizer": {
                    "game_title":    entry.get("name", ""),
                    "preset":        preset,
                    "scan_time":     _time.time(),
                    "status":        "ok" if scanned else "no_config_found",
                    "match_count":   match_count,
                    "mismatch_count": mismatch_count,
                    "total_required": total_required,
                    "items":         items,
                }
            })
            logger.info(
                "[PresetOptimizer] '%s' preset='%s': %d/%d required settings match",
                entry.get("name", "?"), preset, match_count, total_required,
            )
        except Exception as exc:
            logger.error("[PresetOptimizer] Scan failed: %s", exc, exc_info=True)
            bridge.update_state({
                "preset_optimizer": {
                    "game_title": entry.get("name", ""),
                    "preset":     preset,
                    "scan_time":  _time.time(),
                    "status":     "error",
                    "error":      str(exc),
                    "items":      [],
                }
            })

    threading.Thread(target=_do_scan, name="PresetOptimizerScan", daemon=True).start()


def handle_get_gaming_readiness(payload: dict, pipeline, bridge, config) -> None:
    logger.info("Gaming Readiness Evaluation requested")
    force_refresh = payload.get("forceRefresh", False) if payload else False
    def _do_evaluate():
        try:
            from system.hardware_readiness import GamingReadinessEngine
            engine = GamingReadinessEngine(config)
            result = engine.evaluate_readiness(force_refresh=force_refresh)
            bridge.update_state({"gaming_readiness": result})
            logger.info("Gaming Readiness Evaluation completed")
        except Exception as e:
            logger.error("Gaming Readiness Evaluation failed: %s", e, exc_info=True)
            bridge.update_state({"gaming_readiness": {"error": str(e)}})
            
    threading.Thread(target=_do_evaluate, name="GamingReadiness", daemon=True).start()


def handle_install_yolo_deps(payload: dict, pipeline, bridge, config) -> None:
    logger.info("YOLO dependencies installation requested by user")
    def _do_install():
        try:
            import sys, subprocess
            bridge.update_state({"yolo_install_status": {"status": "installing", "message": "Downloading & installing PyTorch & Ultralytics packages..."}})
            
            cmd = [sys.executable, "-m", "pip", "install", "ultralytics", "torch", "torchvision"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if res.returncode == 0:
                logger.info("YOLO dependencies installed successfully.")
                if pipeline and hasattr(pipeline, "_game_state"):
                    with pipeline._state_lock:
                        pipeline._game_state["yolo_supported"] = True
                bridge.update_state({
                    "yolo_supported": True,
                    "yolo_install_status": {"status": "success", "message": "YOLO AI Engine installed successfully!"}
                })
            else:
                err_msg = res.stderr[-300:] if res.stderr else "Installation failed with non-zero exit code."
                logger.error(f"YOLO dependencies install failed: {err_msg}")
                bridge.update_state({"yolo_install_status": {"status": "error", "message": err_msg}})
        except Exception as e:
            logger.error("YOLO dependencies install exception: %s", e, exc_info=True)
            bridge.update_state({"yolo_install_status": {"status": "error", "message": str(e)}})

    threading.Thread(target=_do_install, name="YOLOInstaller", daemon=True).start()


# ── Private helpers ───────────────────────────────────────────────────────────

def _get_active_game(pipeline):
    """Extract the current active game from the pipeline."""
    if pipeline and hasattr(pipeline, "current_game"):
        return pipeline.current_game
    return None


def _game_data_from(active_game) -> dict:
    if isinstance(active_game, dict):
        return active_game
    if isinstance(active_game, str):
        return {"name": active_game, "exe_path": active_game}
    return {}
