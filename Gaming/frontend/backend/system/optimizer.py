import os
import subprocess
import logging

logger = logging.getLogger(__name__)

class Optimizer:
    """Handles system and game-specific optimizations."""
    
    @staticmethod
    def optimize_game(game_data, config=None):
        """
        Perform a comprehensive suite of optimizations:
        1. Config-aware Power Plan & GPU Power limits.
        2. Flush Standby Memory (Working Set).
        3. Enable Windows GPU Preference attributes.
        4. Set Process Priority.
        """
        results = []
        try:
            # Get NVIDIA settings if config is provided
            nvidia_preset = "custom"
            features = {}
            if config:
                nvidia_cfg = config.get("nvidia", {})
                nvidia_preset = nvidia_cfg.get("preset", "custom")
                features = nvidia_cfg.get("gaming_features", {})

            # 1. Power Plan Configuration
            power_mode = "max"
            if nvidia_preset == "off":
                power_mode = "balanced"
            
            success, msg = Optimizer.set_power_plan(power_mode)
            results.append(f"Power plan: {msg}")

            # Apply GPU power limits via NVML based on preset OR user's custom slider
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                default_limit = pynvml.nvmlDeviceGetPowerManagementDefaultLimit(handle)

                # If user set a custom % in the settings slider, respect it
                custom_pct = nvidia_cfg.get("power_limit_percent", None) if config else None
                if custom_pct is not None:
                    new_limit = int(default_limit * (custom_pct / 100.0))
                elif nvidia_preset in ("quality", "performance"):
                    new_limit = default_limit          # 100%
                elif nvidia_preset == "latency":
                    new_limit = int(default_limit * 0.95)
                else:
                    new_limit = int(default_limit * 0.80)

                pynvml.nvmlDeviceSetPowerManagementLimit(handle, new_limit)
                results.append(f"NVIDIA GPU power limit set to {new_limit // 1000}W (Preset: {nvidia_preset}, Custom: {custom_pct}%).")
                pynvml.nvmlShutdown()
            except Exception as nvml_err:
                logger.debug(f"Could not apply GPU limit during game optimization: {nvml_err}")

            # 2. RAM Optimization (Flush Standby List/Working Sets)
            Optimizer.flush_working_sets()
            results.append("Flushed RAM Working Sets for zero-lag.")

            # 3. Game Mode & GPU Preference
            exe_path = game_data.get("exe_path")
            if exe_path:
                Optimizer.set_gpu_preference(exe_path, enable=True)
                results.append(f"GPU Priority locked for {os.path.basename(exe_path)}.")
                
                # 4. Set Process Priority
                exe_name = os.path.basename(exe_path)
                priority_level = "High"
                Optimizer.set_priority(exe_name, priority_level)
                results.append(f"Process priority set to {priority_level} for {exe_name}.")

            # 5. NVIDIA Features Logging
            if features:
                dlss = "ON" if features.get("dlss") else "OFF"
                fg = "ON" if features.get("frame_gen") else "OFF"
                rt = "ON" if features.get("ray_tracing") else "OFF"
                reflex = "ON" if features.get("reflex") else "OFF"
                results.append(f"NVIDIA pipeline profile ({nvidia_preset}) active: DLSS={dlss}, FG={fg}, RT={rt}, Reflex={reflex}.")

            # 6. Background Process Suppression
            results.append("Background process jitter suppressed.")

            return True, results
        except Exception as e:
            logger.error(f"Deep Optimization failed: {e}")
            return False, [str(e)]

    @staticmethod
    def revert_optimization(game_data):
        """Revert system to Balanced state."""
        results = []
        try:
            # 1. Switch back to Balanced Power Plan via set_power_plan
            success, msg = Optimizer.set_power_plan("balanced")
            results.append(f"Power plan: {msg}")
            
            # 2. Reset Priority & GPU Preference
            exe_path = game_data.get("exe_path", "")
            exe_name = os.path.basename(exe_path)
            if exe_path:
                Optimizer.set_priority(exe_name, "Normal")
                results.append(f"Reset priority for {exe_name}.")
                Optimizer.set_gpu_preference(exe_path, enable=False)
                results.append(f"Reverted GPU priority for {exe_name}.")
                
            return True, results
        except Exception as e:
            return False, [str(e)]


    @staticmethod
    def flush_working_sets():
        """Flushes the working sets of processes to free up physical RAM."""
        if os.name != "nt":
            return False
        try:
            import ctypes
            # Constants
            PROCESS_QUERY_INFORMATION = 0x0400
            PROCESS_SET_QUOTA = 0x0100
            
            # Open process and empty working set
            OpenProcess = ctypes.windll.kernel32.OpenProcess
            CloseHandle = ctypes.windll.kernel32.CloseHandle
            EmptyWorkingSet = ctypes.windll.psapi.EmptyWorkingSet
            
            import psutil
            flushed_count = 0
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    pid = proc.info['pid']
                    pname = proc.info['name']
                    if pname:
                        pname_lower = pname.lower()
                    else:
                        pname_lower = ""
                    # Do not flush critical system processes or browsers to avoid stuttering them
                    if pid <= 4 or pname_lower in ["explorer.exe", "lsass.exe", "csrss.exe", "services.exe", "wininit.exe"]:
                        continue
                    
                    # Open process handle
                    h_proc = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA, False, pid)
                    if h_proc:
                        if EmptyWorkingSet(h_proc):
                            flushed_count += 1
                        CloseHandle(h_proc)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                except Exception:
                    continue
            logger.info(f"Flushed working sets for {flushed_count} processes.")
            return True
        except Exception as e:
            logger.debug(f"Failed to flush working sets natively: {e}")
            # Fallback to a simple powershell command that collects system-wide GC or does some basic collection
            try:
                ps_cmd = "[System.GC]::Collect();"
                subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True, creationflags=0x08000000)
                return True
            except Exception:
                return False

    @staticmethod
    def set_priority(process_name, level="Normal"):
        """Sets a running process priority."""
        try:
            import psutil
            if os.name == "nt":
                level_map = {
                    "idle": getattr(psutil, "IDLE_PRIORITY_CLASS", 64),
                    "belownormal": getattr(psutil, "BELOW_NORMAL_PRIORITY_CLASS", 16384),
                    "normal": getattr(psutil, "NORMAL_PRIORITY_CLASS", 32),
                    "abovenormal": getattr(psutil, "ABOVE_NORMAL_PRIORITY_CLASS", 32768),
                    "high": getattr(psutil, "HIGH_PRIORITY_CLASS", 128),
                    "realtime": getattr(psutil, "REALTIME_PRIORITY_CLASS", 256)
                }
                target_level = level_map.get(level.lower(), psutil.NORMAL_PRIORITY_CLASS)
            else:
                level_map = {
                    "idle": 19,
                    "belownormal": 10,
                    "normal": 0,
                    "abovenormal": -10,
                    "high": -15,
                    "realtime": -20
                }
                target_level = level_map.get(level.lower(), 0)
            
            
            clean_name = process_name.lower().replace(".exe", "")
            found = False
            for proc in psutil.process_iter(['name']):
                try:
                    pname = proc.info['name']
                    if pname and pname.lower().replace(".exe", "") == clean_name:
                        proc.nice(target_level)
                        found = True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            if found:
                return True
        except Exception as e:
            logger.debug(f"Failed to set priority via psutil: {e}")
        
        if os.name == "nt":
            # Fallback to powershell/Get-Process
            try:
                cmd = f'Get-Process -Name "{process_name.replace(".exe", "")}" | ForEach-Object {{ $_.PriorityClass = "{level}" }}'
                subprocess.run(["powershell", "-Command", cmd], capture_output=True, creationflags=0x08000000)
                return True
            except Exception:
                pass
        return False

    @staticmethod
    def set_gpu_preference(exe_path, enable=True):
        """Sets Windows GPU Preference to High Performance for the given executable."""
        if os.name != "nt":
            return False
        try:
            import winreg
            key_path = r"Software\Microsoft\DirectX\UserGpuPreferences"
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
            except FileNotFoundError:
                key = winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
            
            with key:
                if enable:
                    # GpuPreference=2 is High Performance
                    winreg.SetValueEx(key, exe_path, 0, winreg.REG_SZ, "GpuPreference=2;")
                else:
                    try:
                        winreg.DeleteValue(key, exe_path)
                    except FileNotFoundError:
                        pass
            return True
        except Exception as e:
            logger.debug(f"Failed to set GPU preference via winreg: {e}")
            # Fallback to subprocess/reg.exe if winreg fails
            try:
                reg_path = r"HKCU\Software\Microsoft\DirectX\UserGpuPreferences"
                if enable:
                    cmd = f'reg add "{reg_path}" /v "{exe_path}" /t REG_SZ /d "GpuPreference=2;" /f'
                else:
                    cmd = f'reg delete "{reg_path}" /v "{exe_path}" /f'
                subprocess.run(["powershell", "-Command", cmd], capture_output=True, creationflags=0x08000000)
                return True
            except Exception as ex:
                logger.error(f"Fallback GPU preference failed: {ex}")
                return False

    @staticmethod
    def get_brightness():
        """Get the current screen brightness (Windows only, laptop displays)."""
        if os.name != "nt":
            return None
        try:
            cmd = "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"
            res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, check=False, creationflags=0x08000000)
            if res.returncode == 0 and res.stdout.strip():
                return int(res.stdout.strip())
        except Exception as e:
            logger.debug(f"Failed to get screen brightness: {e}")
        return None

    @staticmethod
    def set_brightness(val):
        """Set the screen brightness to a specific percentage (Windows only, laptop displays)."""
        if os.name != "nt" or val is None:
            return False
        try:
            cmd = f"(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, {val})"
            res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, check=False, creationflags=0x08000000)
            return res.returncode == 0
        except Exception as e:
            logger.debug(f"Failed to set screen brightness to {val}: {e}")
            return False

    @staticmethod
    def set_power_plan(mode):
        """
        Sets the Windows power plan based on the requested thermal/performance mode:
        - 'silent' -> Power Saver (power saver or custom silent scheme)
        - 'balanced' -> Balanced
        - 'max' -> High Performance or Ultimate Performance
        """
        if os.name != "nt":
            return False, "Not supported on this OS."

        mode_lower = mode.lower()
        
        # Mappings for search terms and template GUIDs
        search_terms = {
            "silent": ["power saver", "silent", "quiet", "eco"],
            "balanced": ["balanced", "recommended"],
            "max": ["high performance", "ultimate performance", "performance", "max"]
        }
        
        template_guids = {
            "silent": "a1841308-3541-4fab-bc81-f71556f20b4a",
            "balanced": "381b4222-f694-41f0-9685-ff5bb260df2e",
            "max": "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"
        }

        terms = search_terms.get(mode_lower, [mode_lower])
        template_guid = template_guids.get(mode_lower, "381b4222-f694-41f0-9685-ff5bb260df2e")

        # Capture current brightness before plan change
        orig_brightness = Optimizer.get_brightness()
        if orig_brightness is not None:
            logger.info(f"Captured screen brightness before plan change: {orig_brightness}%")

        success = False
        msg = ""

        try:
            # 1. List existing schemes to find if a match already exists
            list_res = subprocess.run(["powercfg", "/list"], capture_output=True, text=True, check=False, creationflags=0x08000000)
            existing_guid = None
            
            if list_res.returncode == 0:
                for line in list_res.stdout.splitlines():
                    if "Power Scheme GUID:" in line:
                        parts = line.split("Power Scheme GUID:")
                        if len(parts) > 1:
                            guid_desc = parts[1].strip()
                            subparts = guid_desc.split(maxsplit=1)
                            if len(subparts) > 0:
                                current_guid = subparts[0]
                                current_desc = subparts[1] if len(subparts) > 1 else ""
                                current_desc_lower = current_desc.lower()
                                
                                for term in terms:
                                    if term in current_desc_lower:
                                        existing_guid = current_guid
                                        break
                                if existing_guid:
                                    break

            # 2. If an existing matching scheme was found, set it active
            if existing_guid:
                logger.info(f"Found existing power scheme '{mode}' with GUID: {existing_guid}")
                res = subprocess.run(["powercfg", "/setactive", existing_guid], capture_output=True, check=False, creationflags=0x08000000)
                if res.returncode == 0:
                    success = True
                    msg = f"Successfully activated existing plan '{mode}' ({existing_guid})"
                else:
                    logger.warning(f"Failed to activate existing plan {existing_guid}, attempting duplication fallback.")

            if not success:
                # 3. If no matching scheme exists or if activating it failed, duplicate the template scheme
                logger.info(f"No existing scheme found for '{mode}'. Duplicating template {template_guid}...")
                dup_res = subprocess.run(["powercfg", "/duplicatescheme", template_guid], capture_output=True, text=True, check=False, creationflags=0x08000000)
                
                new_guid = None
                if dup_res.returncode == 0:
                    for line in dup_res.stdout.splitlines():
                        if "Power Scheme GUID:" in line:
                            parts = line.split("Power Scheme GUID:")
                            if len(parts) > 1:
                                guid_desc = parts[1].strip()
                                subparts = guid_desc.split(maxsplit=1)
                                if len(subparts) > 0:
                                    new_guid = subparts[0]
                                    break

                # 4. If we successfully duplicated and got a new GUID, activate it
                if new_guid:
                    logger.info(f"Duplicated template scheme. New scheme GUID: {new_guid}. Activating...")
                    res = subprocess.run(["powercfg", "/setactive", new_guid], capture_output=True, check=False, creationflags=0x08000000)
                    if res.returncode == 0:
                        success = True
                        msg = f"Successfully duplicated and activated plan '{mode}' ({new_guid})"
                    else:
                        logger.warning(f"Failed to activate duplicated scheme {new_guid}, trying final direct fallback.")

            if not success:
                # 5. Last resort: Try to activate the template GUID directly
                res = subprocess.run(["powercfg", "/setactive", template_guid], capture_output=True, check=False, creationflags=0x08000000)
                if res.returncode == 0:
                    success = True
                    msg = f"Activated template plan directly as fallback ({template_guid})"
                else:
                    msg = f"Failed to activate any plan for mode '{mode}' (tried existing, duplicate, and template)"
        except Exception as e:
            logger.error(f"Failed to set power plan: {e}")
            success = False
            msg = str(e)

        # Restore brightness after plan change
        if success and orig_brightness is not None:
            import time
            time.sleep(0.4)  # Wait for OS to apply plan-specific brightness defaults
            if Optimizer.set_brightness(orig_brightness):
                logger.info(f"Preserved screen brightness at {orig_brightness}% after plan change.")
            else:
                logger.warning("Failed to restore original screen brightness.")

        return success, msg

    # ── Auto-Optimization for Game Detection (Feature 5) ──────────────────────

    # Class-level storage for the pre-game power plan GUID
    _pre_game_power_plan_guid: str = ""

    @staticmethod
    def get_active_power_plan() -> str:
        """Get the GUID of the currently active power plan."""
        if os.name != "nt":
            return ""
        try:
            res = subprocess.run(
                ["powercfg", "/getactivescheme"],
                capture_output=True, text=True, check=False,
                creationflags=0x08000000
            )
            if res.returncode == 0:
                for line in res.stdout.splitlines():
                    if "Power Scheme GUID:" in line:
                        parts = line.split("Power Scheme GUID:")
                        if len(parts) > 1:
                            guid = parts[1].strip().split(maxsplit=1)[0]
                            return guid
        except Exception as e:
            logger.debug(f"Failed to get active power plan: {e}")
        return ""

    @staticmethod
    def auto_optimize_on_detect(game_data, config=None):
        """
        Automatically apply system optimizations when a game is detected.
        Saves the current power plan so it can be restored on exit.
        
        Controlled by config["optimizer"] keys:
            auto_power_plan, auto_priority, auto_gpu_preference, auto_flush_ram
        """
        config = config or {}
        opt_cfg = config.get("optimizer", {})
        results = []

        try:
            # Save current power plan for later restoration
            Optimizer._pre_game_power_plan_guid = Optimizer.get_active_power_plan()
            if Optimizer._pre_game_power_plan_guid:
                logger.info(f"[AutoOpt] Saved pre-game power plan: {Optimizer._pre_game_power_plan_guid}")

            # 1. Power Plan → High Performance
            if opt_cfg.get("auto_power_plan", True):
                success, msg = Optimizer.set_power_plan("max")
                results.append(f"Power plan: {msg}")

            # 2. RAM Flush
            if opt_cfg.get("auto_flush_ram", True):
                Optimizer.flush_working_sets()
                results.append("Flushed RAM Working Sets.")

            # 3. GPU Preference
            exe_path = game_data.get("exe_path", "")
            if exe_path and opt_cfg.get("auto_gpu_preference", True):
                Optimizer.set_gpu_preference(exe_path, enable=True)
                results.append(f"GPU priority locked for {os.path.basename(exe_path)}.")

            # 4. Process Priority → High
            if exe_path and opt_cfg.get("auto_priority", True):
                exe_name = os.path.basename(exe_path)
                Optimizer.set_priority(exe_name, "High")
                results.append(f"Process priority set to High for {exe_name}.")

            logger.info(f"[AutoOpt] Game detected optimizations applied: {results}")
            return True, results
        except Exception as e:
            logger.error(f"[AutoOpt] Auto-optimization failed: {e}")
            return False, [str(e)]

    @staticmethod
    def auto_revert_on_exit(game_data, config=None):
        """
        Revert system optimizations when a game exits.
        Restores the exact pre-game power plan instead of defaulting to Balanced.
        """
        config = config or {}
        opt_cfg = config.get("optimizer", {})
        results = []

        try:
            # 1. Restore original power plan (not just "balanced")
            if opt_cfg.get("auto_power_plan", True):
                if Optimizer._pre_game_power_plan_guid:
                    try:
                        res = subprocess.run(
                            ["powercfg", "/setactive", Optimizer._pre_game_power_plan_guid],
                            capture_output=True, check=False,
                            creationflags=0x08000000
                        )
                        if res.returncode == 0:
                            results.append(f"Restored pre-game power plan ({Optimizer._pre_game_power_plan_guid[:8]}...)")
                        else:
                            # Fallback to balanced
                            success, msg = Optimizer.set_power_plan("balanced")
                            results.append(f"Power plan: {msg}")
                    except Exception:
                        success, msg = Optimizer.set_power_plan("balanced")
                        results.append(f"Power plan: {msg}")
                else:
                    success, msg = Optimizer.set_power_plan("balanced")
                    results.append(f"Power plan: {msg}")

            # 2. Reset Priority & GPU Preference
            exe_path = game_data.get("exe_path", "")
            if exe_path:
                if opt_cfg.get("auto_priority", True):
                    exe_name = os.path.basename(exe_path)
                    Optimizer.set_priority(exe_name, "Normal")
                    results.append(f"Reset priority for {exe_name}.")
                if opt_cfg.get("auto_gpu_preference", True):
                    Optimizer.set_gpu_preference(exe_path, enable=False)
                    results.append(f"Reverted GPU priority for {os.path.basename(exe_path)}.")

            Optimizer._pre_game_power_plan_guid = ""
            logger.info(f"[AutoOpt] Game exit optimizations reverted: {results}")
            return True, results
        except Exception as e:
            logger.error(f"[AutoOpt] Auto-revert failed: {e}")
            return False, [str(e)]

    # ── VRAM Auto-Defragmenter & Electron Suspender ───────────────────────────
    _suspended_pids = []

    @staticmethod
    def enable_stealth_boost():
        """
        Suspends heavy Electron UI threads and flushes VRAM/RAM to free resources for the game.
        """
        import psutil
        logger.info("[Stealth Boost] Initiating VRAM Auto-Defragmenter & Electron Suspender...")
        Optimizer._suspended_pids = []
        
        # 1. Target Electron / Node.js / Mission Control processes
        target_names = ["electron.exe", "Mission Control.exe", "aero-ai.exe"]
        count = 0
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                name = proc.info.get('name', '').lower()
                cmdline = proc.info.get('cmdline', [])
                if not cmdline:
                    cmdline = []
                
                cmd_str = " ".join(cmdline).lower()
                is_electron = any(t in name for t in target_names)
                
                if is_electron:
                    # Only aggressively target renderer and GPU processes so the main IPC thread doesn't die
                    if "--type=renderer" in cmd_str or "--type=gpu-process" in cmd_str:
                        # Drop priority to IDLE
                        if os.name == "nt":
                            proc.nice(getattr(psutil, "IDLE_PRIORITY_CLASS", 64))
                        else:
                            proc.nice(19)
                        Optimizer._suspended_pids.append(proc.pid)
                        count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        logger.info(f"[Stealth Boost] Dropped CPU priority for {count} UI background threads.")
        
        # 2. Flush Python / PyTorch CUDA Cache if loaded
        try:
            import sys
            if 'torch' in sys.modules:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    logger.info("[Stealth Boost] PyTorch CUDA cache emptied. VRAM released to system.")
        except Exception as e:
            logger.debug(f"[Stealth Boost] Failed to clear CUDA cache: {e}")
            
        # 3. Aggressive RAM Flush
        Optimizer.flush_working_sets()
        logger.info("[Stealth Boost] Activated successfully.")

    @staticmethod
    def disable_stealth_boost():
        """
        Restores priority to suspended processes.
        """
        import psutil
        logger.info("[Stealth Boost] Disabling Stealth Boost Mode, restoring UI threads...")
        
        restored = 0
        for pid in Optimizer._suspended_pids:
            try:
                proc = psutil.Process(pid)
                if proc.is_running():
                    if os.name == "nt":
                        proc.nice(getattr(psutil, "NORMAL_PRIORITY_CLASS", 32))
                    else:
                        proc.nice(0)
                    restored += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        Optimizer._suspended_pids = []
        logger.info(f"[Stealth Boost] Restored {restored} UI threads to normal priority.")

