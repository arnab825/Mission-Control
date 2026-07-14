"""Telemetry thread, optional hot reload, dev helpers."""
from __future__ import annotations

import logging
import os
import random
import re
import platform
import subprocess
import sys
import threading
import time

try:
    import psutil

    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False

try:
    import wmi  # type: ignore[reportMissingImports]
except Exception:
    wmi = None

from core.bridge_server import bridge

logger = logging.getLogger(__name__)


_AWCC_FAILED = False
_PS_THERMAL_FAILED = False


def _try_win_cpu_temp_native() -> float:
    """Driver-free CPU temperature read for Windows systems where WinRing0x64 is blocked.

    Tries multiple user-mode approaches in priority order:
    1. PDH 'Thermal Zone Information' performance counters (works on most modern Intel laptops - fast, no subprocess)
    0. AWCC WMI (Alienware Command Center) - works on all Alienware laptops, no driver needed (slow subprocess, cached)
    2. PowerShell Get-Counter thermal zone (broader compatibility - slow subprocess, cached)
    3. Read all PDH thermal zones dynamically
    Returns 0.0 if nothing works.
    """
    global _AWCC_FAILED, _PS_THERMAL_FAILED
    if sys.platform != "win32":
        return 0.0

    # --- Approach 1: PDH Thermal Zone counters (fast, no subprocess) ---
    try:
        import win32pdh  # type: ignore[reportMissingImports]
        counters_to_try = [
            r"\Thermal Zone Information(_TZ.TZ01)\Temperature",
            r"\Thermal Zone Information(_TZ.THRM)\Temperature",
            r"\Thermal Zone Information(_TZ.TZ00)\Temperature",
            r"\Thermal Zone Information(_TZ.CPUZ)\Temperature",
            r"\Thermal Zone Information(_TZ.CPU0)\Temperature",
        ]
        for counter_path in counters_to_try:
            try:
                query = win32pdh.OpenQuery()
                counter = win32pdh.AddCounter(query, counter_path)
                win32pdh.CollectQueryData(query)
                import time as _time; _time.sleep(0.01)
                win32pdh.CollectQueryData(query)
                _, val = win32pdh.GetFormattedCounterValue(counter, win32pdh.PDH_FMT_DOUBLE)
                win32pdh.CloseQuery(query)
                # PDH returns Kelvin * 10 for thermal zones
                if val > 2500:  # Kelvin * 10 (e.g. 3232 = 323.2K = 50.05°C)
                    celsius = (val / 10.0) - 273.15
                    if 0 < celsius < 120:
                        return round(celsius, 1)
                elif val > 200:  # Some drivers return direct Kelvin
                    celsius = val - 273.15
                    if 0 < celsius < 120:
                        return round(celsius, 1)
            except Exception:
                try:
                    win32pdh.CloseQuery(query)
                except Exception:
                    pass
    except ImportError:
        pass
    except Exception:
        pass

    # --- Approach 0: AWCC WMI (Alienware Command Center) ---
    # AWCCWmiMethodFunction.Thermal_Information returns CPU temp in Celsius.
    # arg2=260 (0x0104) is the 'CPU Internal Thermistor' live sensor.
    # This is pre-installed on all Alienware laptops and needs no kernel driver.
    if not _AWCC_FAILED:
        try:
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            # Diagnostics: Query correct bitpacked sensor IDs and write them to a log file so we can see which one matches the actual CPU temp.
            diag_script = (
                '$awcc = Get-CimInstance -Namespace "root/WMI" -ClassName "AWCCWmiMethodFunction" -ErrorAction Stop; '
                '$res = @(); '
                'foreach ($id in @(4, 260, 516, 772, 1028, 1284, 1540)) { '
                '  try { '
                '    $r = Invoke-CimMethod -InputObject $awcc -MethodName "Thermal_Information" -Arguments @{arg2=[uint32]$id} -ErrorAction Stop; '
                '    $res += "$id=$($r.argr)" '
                '  } catch {} '
                '}; '
                'Write-Host ($res -join ",")'
            )
            diag_out = subprocess.check_output(
                ["powershell", "-NoProfile", "-Command", diag_script],
                startupinfo=si, creationflags=0x08000000, timeout=2.0
            ).decode().strip()
            
            if not diag_out:
                _AWCC_FAILED = True
            else:
                # Write to log file in backend/scratch
                try:
                    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scratch")
                    os.makedirs(log_dir, exist_ok=True)
                    with open(os.path.join(log_dir, "awcc_values.log"), "w") as f:
                        f.write(diag_out + "\n")
                except Exception:
                    pass

                # Parse the output to find a valid temp sensor (preferring values that are not 100 or 0, between 35 and 95)
                # Fallback to 260 if nothing else fits.
                sensor_vals = {}
                for pair in diag_out.split(","):
                    if "=" in pair:
                        key, v = pair.split("=")
                        if v.isdigit():
                            sensor_vals[int(key)] = int(v)

                # Print all values to debug
                logger.debug(f"[Telemetry] AWCC sensor values: {sensor_vals}")

                # Choose the best CPU sensor:
                # On Alienware, 260 is sometimes static 100 (thermal limit or disabled),
                # while other sensors dynamically report temperatures.
                # Let's pick the first sensor in our list that returns a temperature between 30 and 99.
                cpu_sensor_id = 260
                for possible_id in [4, 260, 516, 772, 1028, 1284, 1540]:
                    val = sensor_vals.get(possible_id, 0)
                    if 30 < val < 100:
                        cpu_sensor_id = possible_id
                        break

                # Query the chosen sensor
                awcc_script = (
                    '$awcc = Get-CimInstance -Namespace "root/WMI" -ClassName "AWCCWmiMethodFunction" -ErrorAction Stop; '
                    f'$r = Invoke-CimMethod -InputObject $awcc -MethodName "Thermal_Information" -Arguments @{{arg2=[uint32]{cpu_sensor_id}}}; '
                    'Write-Host $r.argr'
                )
                out = subprocess.check_output(
                    ["powershell", "-NoProfile", "-Command", awcc_script],
                    startupinfo=si, creationflags=0x08000000, timeout=2.0
                ).decode().strip()
                if out.isdigit():
                    t = int(out)
                    # 0xFFFFFFFE / 0xFFFFFFFF are AWCC error codes; valid range is 0-120°C
                    if 0 < t < 120:
                        return float(t)
        except Exception:
            _AWCC_FAILED = True


    # --- Approach 2: PowerShell enumerate all thermal zone instances ---
    if not _PS_THERMAL_FAILED:
        try:
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            out = subprocess.check_output(
                'powershell -NoProfile -Command "'
                'try { '
                '  $zones = Get-CimInstance -ClassName Win32_PerfRawData_Counters_ThermalZoneInformation -ErrorAction Stop; '
                '  if ($zones) { $zones | Where-Object { $_.Name -notmatch \'PCH|BAT|SEN\' } | ForEach-Object { Write-Output ($_.Temperature) } } '
                '} catch { '
                '  try { '
                '    $c = Get-Counter -Counter (Get-Counter -ListSet \"Thermal Zone Information\" -ErrorAction Stop).PathsWithInstances[0] -ErrorAction Stop; '
                '    Write-Output ($c.CounterSamples[0].CookedValue) '
                '  } catch {} '
                '}'  
                '"',
                shell=True, startupinfo=si, creationflags=0x08000000, timeout=2.0
            ).decode().strip().splitlines()
            
            valid_found = False
            for line in out:
                line = line.strip()
                try:
                    val = float(line)
                    # Win32_PerfRawData returns Kelvin * 10
                    if val > 2500:
                        celsius = (val / 10.0) - 273.15
                        if 0 < celsius < 120:
                            valid_found = True
                            return round(celsius, 1)
                    elif val > 200:
                        celsius = val - 273.15
                        if 0 < celsius < 120:
                            valid_found = True
                            return round(celsius, 1)
                except ValueError:
                    pass
            if not valid_found:
                _PS_THERMAL_FAILED = True
        except Exception:
            _PS_THERMAL_FAILED = True

    # --- Approach 3: Read all PDH thermal zones dynamically ---
    try:
        import win32pdh  # type: ignore[reportMissingImports]
        instances = win32pdh.EnumObjectItems(None, None, "Thermal Zone Information", win32pdh.PERF_DETAIL_WIZARD)
        if instances and instances[1]:  # instances[1] is the list of instance names
            query = win32pdh.OpenQuery()
            added = []
            for inst in instances[1][:5]:  # Check first 5 zones
                if any(x in inst.upper() for x in ["TZ01", "TZ02", "PCH", "BAT", "SEN"]):
                    continue
                try:
                    path = f"\\Thermal Zone Information({inst})\\Temperature"
                    ctr = win32pdh.AddCounter(query, path)
                    added.append(ctr)
                except Exception:
                    pass
            if added:
                win32pdh.CollectQueryData(query)
                import time as _time; _time.sleep(0.01)
                win32pdh.CollectQueryData(query)
                best = 0.0
                for ctr in added:
                    try:
                        _, val = win32pdh.GetFormattedCounterValue(ctr, win32pdh.PDH_FMT_DOUBLE)
                        if val > 2500:
                            celsius = (val / 10.0) - 273.15
                        elif val > 200:
                            celsius = val - 273.15
                        else:
                            continue
                        if 0 < celsius < 120:
                            best = max(best, celsius)
                    except Exception:
                        pass
                win32pdh.CloseQuery(query)
                if best > 0:
                    return round(best, 1)
    except Exception:
        pass

    return 0.0



def is_running_in_ide() -> bool:
    """Detect if running in IDE/debugger vs standalone."""
    if "pydevd" in sys.modules:
        return True
    if "debugpy" in sys.modules:
        return True
    if sys.argv[0].endswith("pydevconsole.py"):
        return True
    if any(x in str(sys.argv) for x in ["pycharm", "vscode", "windsurf", "idea"]):
        return True
    if os.environ.get("PYCHARM_HOSTED") or os.environ.get("VSCODE_PID"):
        return True
    if not getattr(sys, "frozen", False):
        return True
    return False


def estimate_cpu_max_freq(cpu_name: str, base_max_freq: int) -> int:
    """
    Estimates the true max turbo boost frequency in MHz of a CPU based on its model name.
    Falls back to base_max_freq if no match/heuristic applies.
    """
    if not cpu_name:
        return base_max_freq if base_max_freq > 0 else 2400

    cpu_name_upper = cpu_name.upper()

    # Exact matches for common gaming CPUs
    db = {
        # Intel 14th Gen (Raptor Lake Refresh) Desktop
        "14900KS": 6200, "14900K": 6000, "14900KF": 6000,
        "14700K": 5600, "14700KF": 5600, "14600K": 5300, "14600KF": 5300,
        # Intel 14th Gen / Raptor Lake Refresh H-series Laptop
        "14900HX": 5800, "14700HX": 5500, "14650HX": 5200, "14600HX": 5000,
        "14900H": 5400, "14700H": 5200, "14650H": 4900, "14600H": 4700,
        # Intel 13th Gen Desktop
        "13900KS": 6000, "13900K": 5800, "13900KF": 5800,
        "13700K": 5400, "13700KF": 5400, "13600K": 5100, "13600KF": 5100,
        # Intel 13th Gen H/HX Laptop
        "13980HX": 5600, "13900HX": 5400, "13700HX": 5100,
        "13620H": 4900, "13900H": 5400, "13700H": 5000, "13500H": 4700,
        # Intel 12th Gen
        "12900KS": 5500, "12900K": 5200, "12900KF": 5200,
        "12700K": 5000, "12700KF": 5000, "12600K": 4900, "12600KF": 4900,
        "12900H": 5000, "12800H": 4800, "12700H": 4700, "12650H": 4500,
        # Intel 11th Gen
        "11900K": 5300, "11900KF": 5300, "11700K": 5000, "11700KF": 5000,
        "11600K": 4900, "11600KF": 4900,
        # Intel 10th Gen
        "10900K": 5300, "10900KF": 5300, "10700K": 5100, "10700KF": 5100,
        "10600K": 4800, "10600KF": 4800,

        # Intel Core Ultra Series 2 (Arrow Lake / Lunar Lake) — Exact model numbers
        "285K": 5700, "265K": 5500, "265KF": 5500, "245K": 5200,
        "285H": 5400, "275HX": 5400, "265H": 5200, "255H": 5100,
        "238V": 4800, "236V": 4700, "228V": 4700,

        # Intel Core Ultra Series 1 (Meteor Lake) — Exact model numbers
        "185H": 5100, "175H": 5000, "165H": 5000, "155H": 4800,
        "165U": 4900, "155U": 4800, "135U": 4400,
        "164U": 4800, "125U": 4300,
        "9 285HX": 5600, "7 265H": 5200, "5 235H": 4600,

        # Intel Core 7 / Core 5 (Meteor Lake consumer brand, no "i" prefix)
        "260H": 5200, "250H": 5000, "240H": 5000,  # Core 7 240H = 5.0 GHz max turbo
        "210H": 4700,  # Core 5 210H
        "220H": 4900,  # Core 7 220H

        # AMD Ryzen 9000
        "9950X": 5700, "9900X": 5600, "9700X": 5500, "9600X": 5400,
        # AMD Ryzen 7000
        "7950X3D": 5700, "7950X": 5700, "7900X3D": 5600, "7900X": 5600,
        "7800X3D": 5000, "7700X": 5400, "7700": 5300, "7600X": 5300, "7600": 5100,
        # AMD Ryzen 5000
        "5950X": 4900, "5900X": 4800, "5800X3D": 4500, "5800X": 4700,
        "5700X": 4600, "5600X": 4600, "5600X3D": 4400, "5600": 4400, "5500": 4200,
        # AMD Ryzen 3000
        "3950X": 4700, "3900X": 4600, "3800X": 4500, "3700X": 4400,
        "3600X": 4400, "3600": 4200,
    }

    # Search for model names in the DB
    for model, freq in db.items():
        pattern = r"\b" + re.escape(model) + r"\b"
        if re.search(pattern, cpu_name_upper):
            return freq
        if f"-{model}" in cpu_name_upper or f" {model}" in cpu_name_upper or cpu_name_upper.endswith(model):
            return freq

    # General heuristics if not in the database
    if "INTEL" in cpu_name_upper:
        # ── New naming: Intel Core Ultra 9 / 7 / 5 ─────────────────────────────
        if "ULTRA" in cpu_name_upper:
            if "ULTRA 9" in cpu_name_upper:
                return 5600
            elif "ULTRA 7" in cpu_name_upper:
                return 5200
            elif "ULTRA 5" in cpu_name_upper:
                return 4800
            return 5000

        # ── New naming: Intel Core 7 / 5 / 3 (Meteor Lake+, no "i" prefix) ────
        import re as _re
        _new_core = _re.search(r"CORE(?:\(TM\))?\s+(\d)\s+(\d{3,4}[A-Z]*)", cpu_name_upper)
        if _new_core:
            tier = int(_new_core.group(1))  # 9, 7, 5, 3
            if tier >= 9:
                return 5600
            elif tier >= 7:
                return 5000
            elif tier >= 5:
                return 4700
            else:
                return 4300

        # ── Legacy naming: Core i9/i7/i5 ────────────────────────────────────────
        if "I9-" in cpu_name_upper:
            if "14" in cpu_name_upper: return 5800
            if "13" in cpu_name_upper: return 5500
            if "12" in cpu_name_upper: return 5000
            if "11" in cpu_name_upper: return 5000
            if "10" in cpu_name_upper: return 5000
            return 4800
        elif "I7-" in cpu_name_upper:
            if "14" in cpu_name_upper: return 5400
            if "13" in cpu_name_upper: return 5000
            if "12" in cpu_name_upper: return 4700
            if "11" in cpu_name_upper: return 4600
            if "10" in cpu_name_upper: return 4800
            return 4500
        elif "I5-" in cpu_name_upper:
            if "14" in cpu_name_upper: return 4900
            if "13" in cpu_name_upper: return 4600
            if "12" in cpu_name_upper: return 4400
            if "11" in cpu_name_upper: return 4400
            if "10" in cpu_name_upper: return 4300
            return 4100

    if "RYZEN" in cpu_name_upper:
        if "9 " in cpu_name_upper or "9-" in cpu_name_upper:
            if "7" in cpu_name_upper: return 5400
            if "5" in cpu_name_upper: return 4800
            return 4500
        elif "7 " in cpu_name_upper or "7-" in cpu_name_upper:
            if "7" in cpu_name_upper: return 5000
            if "5" in cpu_name_upper: return 4600
            return 4400
        elif "5 " in cpu_name_upper or "5-" in cpu_name_upper:
            if "7" in cpu_name_upper: return 5000
            if "5" in cpu_name_upper: return 4400
            return 4200

    return base_max_freq if base_max_freq > 2400 else 2400


class TelemetryThread(threading.Thread):
    """Dedicated thread for high-frequency hardware telemetry."""

    def __init__(self, pipeline):
        super().__init__(name="Telemetry", daemon=True)
        self.p = pipeline
        self.running = False
        self._last_ps_poll = 0
        self._latest_lhm_data = None
        self._lhm_proc = None

        # Persistent PDH query for real Disk Utilization on Windows
        self._disk_query = None
        self._disk_counter = None

        # Persistent PDH query for real CPU performance percentage on Windows (works around static psutil.cpu_freq())
        self._cpu_query = None
        self._cpu_counter = None

        self._cpu_base_freq = 2400
        self._cached_cpu_max_freq = 0
        self._cpu_max_freq_resolved = False

    def stop(self):
        """Request the telemetry loop to stop."""
        self.running = False
        if hasattr(self, "_lhm_proc") and self._lhm_proc:
            try:
                self._lhm_proc.terminate()
            except Exception:
                pass
            self._lhm_proc = None

    def _discover_hardware(self):
        """Fetches system specifications from the backend (device-specific)."""
        try:
            specs = self.p.hw_checker.get_system_specs()

            # RAM speed is a static hardware property — extract it from specs to avoid redundant slow PowerShell spawns
            if not hasattr(self, "_cached_ram_speed"):
                ram_speed = "---"
                if specs and "hardware" in specs and "ram_details" in specs["hardware"]:
                    speeds = []
                    for stick in specs["hardware"]["ram_details"]:
                        spd = stick.get("speed", "")
                        digits = re.findall(r"\d+", spd)
                        if digits:
                            speeds.append(int(digits[0]))
                    if speeds:
                        ram_speed = f"{max(speeds)}MHz"
                self._cached_ram_speed = ram_speed
            else:
                ram_speed = self._cached_ram_speed

            with self.p._state_lock:
                self.p._game_state["system_specs"] = specs
                self.p._game_state["ram_speed"] = ram_speed

            logger.info("System scan complete for: %s", specs["hardware"]["cpu"])
        except Exception as e:
            logger.error("Failed to discover hardware: %s", e)

    def run(self):
        self.running = True
        
        import subprocess
        import json

        # Start the LibreHardwareMonitor C# helper process
        def start_lhm_helper():
            try:
                exe_dir = os.path.dirname(sys.executable)
                base_dir = os.path.dirname(exe_dir) if getattr(sys, "frozen", False) else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                
                lhm_paths = [
                    os.path.join(base_dir, "system", "hardware_monitor", "bin", "Release", "net10.0", "HardwareMonitor.exe"),
                    os.path.join(base_dir, "system", "hardware_monitor", "bin", "Debug", "net10.0", "HardwareMonitor.exe"),
                    os.path.join(base_dir, "system", "hardware_monitor", "bin", "Release", "net10.0", "HardwareMonitor.dll"),
                    os.path.join(base_dir, "system", "hardware_monitor", "bin", "Debug", "net10.0", "HardwareMonitor.dll"),
                    os.path.join(exe_dir, "HardwareMonitor.exe"),
                    os.path.join(exe_dir, "HardwareMonitor.dll"),
                ]

                lhm_path = None
                for p in lhm_paths:
                    if os.path.exists(p):
                        lhm_path = p
                        break

                if not lhm_path:
                    logger.warning(f"[Telemetry] LibreHardwareMonitor helper not found in any standard path.")
                    return None

                logger.info(f"[Telemetry] Launching Hardware Monitor: {lhm_path}")
                startupinfo = None
                if sys.platform == "win32":
                    startupinfo = subprocess.STARTUPINFO()
                    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                    startupinfo.wShowWindow = 0 # SW_HIDE

                cmd = [lhm_path] if lhm_path.endswith(".exe") else ["dotnet", lhm_path]
                
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True,
                    bufsize=1,
                    startupinfo=startupinfo
                )
                
                def reader_thread():
                    while self.running and proc.poll() is None:
                        line = proc.stdout.readline()
                        if not line:
                            break
                        try:
                            data = json.loads(line.strip())
                            if "error" in data:
                                logger.error(f"[Telemetry] LibreHardwareMonitor error: {data['error']}")
                            else:
                                self._latest_lhm_data = data
                                self._latest_lhm_time = time.time()
                        except Exception:
                            pass
                    logger.info("[Telemetry] LibreHardwareMonitor helper process or reader thread exited.")

                t = threading.Thread(target=reader_thread, name="LHMReader", daemon=True)
                t.start()
                logger.info("[Telemetry] Successfully started LibreHardwareMonitor helper background process.")
                return proc
            except Exception as e:
                logger.warning(f"[Telemetry] Failed to start LibreHardwareMonitor helper process: {e}")
                return None

        self._lhm_proc = start_lhm_helper()

        # Populate basic hardware info instantly so the UI doesn't look empty/laggy
        try:
            basic_specs = self.p.hw_checker.get_basic_specs()
            with self.p._state_lock:
                if not self.p._game_state.get("system_specs"):
                    self.p._game_state["system_specs"] = basic_specs
            bridge.update_state({"system_specs": basic_specs})
        except Exception as e:
            logger.debug(f"Failed to populate basic specs: {e}")

        try:
            psutil.cpu_percent(interval=0.1)
        except Exception:
            pass

        def _deferred_discovery():
            # Wait 2 seconds for startup phase to settle down
            time.sleep(2.0)
            if self.running and (self.p.running or getattr(self.p, "headless", False)):
                self._discover_hardware()

        threading.Thread(target=_deferred_discovery, name="HWDiscovery", daemon=True).start()

        # Initialize PDH queries inside the thread loop to prevent cross-thread handle exceptions
        if sys.platform == "win32" and _PSUTIL_AVAILABLE:
            try:
                import win32pdh
                self._disk_query = win32pdh.OpenQuery()
                self._disk_counter = win32pdh.AddCounter(self._disk_query, r"\PhysicalDisk(_Total)\% Disk Time")
                win32pdh.CollectQueryData(self._disk_query)
            except Exception as e:
                logger.debug(f"Failed to initialize persistent disk PDH query: {e}")
                self._disk_query = None
                self._disk_counter = None
            try:
                import win32pdh
                self._cpu_query = win32pdh.OpenQuery()
                self._cpu_counter = win32pdh.AddCounter(self._cpu_query, r"\Processor Information(_Total)\% Processor Performance")
                win32pdh.CollectQueryData(self._cpu_query)
            except Exception as e:
                logger.debug(f"Failed to initialize persistent CPU performance percentage PDH query: {e}")
                self._cpu_query = None
                self._cpu_counter = None

        while self.running and (self.p.running or getattr(self.p, "headless", False)):
            try:
                now = time.time()

                with self.p._state_lock:
                    is_active = self.p._game_state.get("is_game_active", False)
                # Extremely snappy, high-frequency real-time updates (0.5s when active, 1.0s when idle)
                poll_interval = 0.5 if is_active else 1.0

                # Check if C# helper died, try to restart it
                if self._lhm_proc is not None and self._lhm_proc.poll() is not None:
                    logger.warning("[Telemetry] LibreHardwareMonitor helper exited. Restarting...")
                    self._lhm_proc = start_lhm_helper()

                lhm = self._latest_lhm_data if hasattr(self, "_latest_lhm_time") and now - self._latest_lhm_time < 5.0 else None

                # Base CPU percentage (psutil is extremely accurate and matches Task Manager/AWCC exactly)
                cpu_pct = psutil.cpu_percent(interval=None)

                # Virtual Memory details
                mem = psutil.virtual_memory()
                mem_pct = mem.percent
                mem_used_gb = round(mem.used / (1024**3), 1)
                mem_total_gb = round(mem.total / (1024**3), 1)
                if lhm:
                    if "ram_pct" in lhm:
                        mem_pct = float(lhm["ram_pct"])
                    if "ram_used_gb" in lhm:
                        mem_used_gb = round(float(lhm["ram_used_gb"]), 1)
                    if "ram_total_gb" in lhm:
                        mem_total_gb = round(float(lhm["ram_total_gb"]), 1)

                # Lazy-cache CPU max frequency once at startup, retrying if CPU name isn't fully discovered yet
                if not getattr(self, "_cpu_max_freq_resolved", False):
                    cpu_name = ""
                    try:
                        specs = self.p._game_state.get("system_specs")
                        if specs:
                            cpu_name = specs.get("hardware", {}).get("cpu", "")
                    except Exception:
                        pass
                    
                    if cpu_name and cpu_name != "Detecting..." and cpu_name != "Unknown CPU":
                        max_f = 0
                        try:
                            cf = psutil.cpu_freq() if hasattr(psutil, "cpu_freq") else None
                            if cf and cf.max:
                                max_f = int(cf.max)
                        except Exception:
                            pass
                        if max_f <= 0 and sys.platform == "win32":
                            try:
                                import subprocess
                                si = subprocess.STARTUPINFO()
                                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                                out = subprocess.check_output(
                                    'powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Processor | Select-Object -ExpandProperty MaxClockSpeed"',
                                    shell=True, startupinfo=si, creationflags=0x08000000, timeout=2.0
                                ).decode().strip()
                                if out.isdigit():
                                    max_f = int(out)
                            except Exception:
                                pass
                        
                        estimated_max = estimate_cpu_max_freq(cpu_name, max_f)
                        self._cached_cpu_max_freq = max(max_f, estimated_max) if max(max_f, estimated_max) > 0 else 2400
                        # Task Manager calculates frequency using base clock.
                        self._cpu_base_freq = max_f if max_f > 0 else 2400
                        self._cpu_max_freq_resolved = True
                    else:
                        # Temporary fallback until specs are discovered: use estimated max from basic_specs
                        if self._cached_cpu_max_freq <= 0:
                            max_f = 0
                            try:
                                cf = psutil.cpu_freq() if hasattr(psutil, "cpu_freq") else None
                                if cf and cf.max:
                                    max_f = int(cf.max)
                            except Exception:
                                pass
                            # Try to get a better estimate from basic specs already loaded
                            try:
                                basic_cpu = (self.p._game_state.get("system_specs") or {}).get("hardware", {}).get("cpu", "")
                                if basic_cpu and basic_cpu not in ("Detecting...", "Unknown CPU"):
                                    est = estimate_cpu_max_freq(basic_cpu, max_f)
                                    if est > max_f:
                                        max_f = est
                            except Exception:
                                pass
                            self._cached_cpu_max_freq = max_f if max_f > 2400 else 2400
                            self._cpu_base_freq = max_f if max_f > 0 else 2400

                # CPU frequency (Current active frequency)
                cpu_freq = 0
                
                # Check persistent PDH query first on Windows for dynamic clock speed
                if sys.platform == "win32" and self._cpu_query and self._cpu_counter:
                    try:
                        import win32pdh
                        win32pdh.CollectQueryData(self._cpu_query)
                        _, val = win32pdh.GetFormattedCounterValue(self._cpu_counter, win32pdh.PDH_FMT_DOUBLE)
                        if val > 0:
                            base_f = getattr(self, "_cpu_base_freq", 2400)
                            cpu_freq = int(base_f * (val / 100.0))
                    except Exception as e:
                        logger.debug(f"PDH CPU frequency query failed: {e}")
                
                # Fallback to LHM's hardware core clocks (MSR readings) if PDH was not available or returned 0
                if cpu_freq <= 0:
                    if lhm and lhm.get("cpu_max_freq", 0) > 0:
                        cpu_freq = int(float(lhm["cpu_max_freq"]))
                    elif lhm and lhm.get("cpu_freq", 0) > 0:
                        cpu_freq = int(float(lhm["cpu_freq"]))
                
                # Fallback to psutil
                if cpu_freq <= 0 and sys.platform != "win32":
                    try:
                        cf = psutil.cpu_freq() if hasattr(psutil, "cpu_freq") else None
                        cpu_freq = int(cf.current) if cf else 0
                    except Exception:
                        pass
                
                # Max Frequency (Denominator: Spec Max from DB)
                cpu_max_freq = self._cached_cpu_max_freq
                if cpu_freq > cpu_max_freq:
                    cpu_max_freq = cpu_freq

                disk_util = 0.0
                if sys.platform == "win32" and self._disk_query and self._disk_counter:
                    try:
                        import win32pdh
                        win32pdh.CollectQueryData(self._disk_query)
                        _, val = win32pdh.GetFormattedCounterValue(self._disk_counter, win32pdh.PDH_FMT_DOUBLE)
                        disk_util = min(100.0, max(0.0, round(val, 1)))
                    except Exception as e:
                        logger.debug(f"PDH Disk query failed: {e}")
                        disk_util = 0.0
                else:
                    try:
                        disk_io = psutil.disk_io_counters()
                        if hasattr(self, "_last_disk_io") and hasattr(self, "_last_disk_time"):
                            dt = now - self._last_disk_time
                            if dt > 0:
                                read_bytes = disk_io.read_bytes - self._last_disk_io.read_bytes
                                write_bytes = disk_io.write_bytes - self._last_disk_io.write_bytes
                                tot_bytes = read_bytes + write_bytes
                                tot_mb = tot_bytes / (1024 * 1024) / dt
                                base_util = min(tot_mb * 2.0, 100.0)
                                disk_util = round(base_util, 1)
                        self._last_disk_io = disk_io
                        self._last_disk_time = now
                    except Exception:
                        disk_util = 0.0

                net_util = 0.0
                net_speed = "0.0 MB/s"
                try:
                    net_io = psutil.net_io_counters()
                    if hasattr(self, "_last_net_io") and hasattr(self, "_last_net_time"):
                        dt = now - self._last_net_time
                        if dt > 0:
                            s = (net_io.bytes_sent - self._last_net_io.bytes_sent) / dt
                            r = (net_io.bytes_recv - self._last_net_io.bytes_recv) / dt
                            tot_mb = (s + r) / (1024 * 1024)
                            net_speed = f"{tot_mb:.1f} MB/s"
                            net_util = min(tot_mb * 10, 100)
                    self._last_net_io = net_io
                    self._last_net_time = now
                except Exception:
                    pass

                # Poll GPUMonitor if available
                gpu_metrics = {}
                if not hasattr(self, "_last_gpu_poll") or (now - self._last_gpu_poll) > 0.5:
                    self._last_gpu_poll = now
                    gpu_metrics = (
                        self.p.gpu_monitor.poll_once(is_game_active=is_active)
                        if self.p.gpu_monitor and self.p.gpu_monitor.is_available
                        else {}
                    )

                # Overlay GPU metrics from LibreHardwareMonitor
                if lhm:
                    if not gpu_metrics:
                        gpu_metrics = {}
                    if "gpu_temp" in lhm and lhm["gpu_temp"] is not None:
                        gpu_metrics["temperature"] = float(lhm["gpu_temp"])
                        gpu_metrics["temp"] = float(lhm["gpu_temp"])
                    if "gpu_pct" in lhm and lhm["gpu_pct"] is not None:
                        gpu_metrics["gpu_util"] = float(lhm["gpu_pct"])
                        gpu_metrics["utilization"] = float(lhm["gpu_pct"])
                    if "gpu_power_w" in lhm and lhm["gpu_power_w"] is not None:
                        if "power_draw_w" not in gpu_metrics:
                            gpu_metrics["power_draw_w"] = float(lhm["gpu_power_w"])
                            gpu_metrics["power_draw"] = float(lhm["gpu_power_w"])
                    if "gpu_vram_used" in lhm and lhm["gpu_vram_used"] is not None:
                        gpu_metrics["vram_used_mb"] = float(lhm["gpu_vram_used"])
                        gpu_metrics["vram_used"] = float(lhm["gpu_vram_used"])
                    if "gpu_vram_total" in lhm and lhm["gpu_vram_total"] is not None:
                        gpu_metrics["vram_total_mb"] = float(lhm["gpu_vram_total"])
                        gpu_metrics["vram_total"] = float(lhm["gpu_vram_total"])
                    if "gpu_clock" in lhm and lhm["gpu_clock"] is not None:
                        gpu_metrics["clock_gpu_mhz"] = float(lhm["gpu_clock"])
                        gpu_metrics["clock_core"] = float(lhm["gpu_clock"])
                    
                    # Compute vram_percent if not present
                    v_used = gpu_metrics.get("vram_used_mb")
                    v_total = gpu_metrics.get("vram_total_mb")
                    if v_used and v_total:
                        gpu_metrics["vram_percent"] = (v_used / v_total) * 100

                # Clean up idle/base VRAM reporting when not gaming
                if gpu_metrics and not is_active:
                    g_util = gpu_metrics.get("gpu_util", 0) or 0
                    v_used = gpu_metrics.get("vram_used_mb", 0) or 0
                    if g_util < 5 and v_used <= 500:
                        gpu_metrics["vram_used_mb"] = 0.0
                        gpu_metrics["vram_used"] = 0.0
                        gpu_metrics["vram_percent"] = 0.0

                cpu_temp = 0
                cpu_power_w = 0

                # Try to use LibreHardwareMonitor first for CPU temp & power.
                # Program.cs now emits cpu_temp_sensor with the name of the LHM
                # sensor that was chosen (e.g. "CPU Package", "Tdie", "Core Max").
                # Log it once at startup so it is visible in the console log.
                if lhm and lhm.get("cpu_temp", 0) > 0:
                    cpu_temp = float(lhm["cpu_temp"])
                    sensor_name = lhm.get("cpu_temp_sensor", "")
                    if sensor_name and not getattr(self, "_lhm_sensor_logged", False):
                        self._lhm_sensor_logged = True
                        logger.info(
                            f"[Telemetry] CPU temperature source: \"{sensor_name}\" = {cpu_temp}°C"
                        )
                if lhm and lhm.get("cpu_power_w", 0) > 0:
                    cpu_power_w = float(lhm["cpu_power_w"])

                # Fallback to psutil temperatures if LHM is not providing CPU temp
                if cpu_temp <= 0 and now - self._last_ps_poll > 5.0:
                    self._last_ps_poll = now

                    if hasattr(psutil, "sensors_temperatures"):
                        try:
                            temps = psutil.sensors_temperatures()
                            for key in [
                                "coretemp",
                                "cpu_thermal",
                                "cpu-thermal",
                                "k10temp",
                                "amd_energy",
                            ]:
                                if key in temps:
                                    cpu_temp = temps[key][0].current
                                    break
                        except Exception:
                            pass

                # Windows WMI Fallback (Crucial for HP/Dell Laptops with proprietary ECs)
                if platform.system() == "Windows":
                    # Only poll WMI if CPU temp or freq is not resolved from LHM/psutil
                    if cpu_temp <= 0 or cpu_freq <= 0:
                        if not hasattr(self, "_last_wmi_temp_poll") or (now - self._last_wmi_temp_poll) > 5.0:
                            self._last_wmi_temp_poll = now
                            try:
                                import subprocess
                                si = subprocess.STARTUPINFO()
                                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                                try:
                                    # Query both ACPI temperature and max actual core frequency in one fast call, prefixing to prevent parsing confusion
                                    out = subprocess.check_output(
                                        'powershell -NoProfile -Command "$t = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature | Where-Object { $_.InstanceName -notmatch \'PCH|BAT|SEN\' } | Select-Object -ExpandProperty CurrentTemperature -ErrorAction SilentlyContinue; $f = Get-CimInstance -ClassName Win32_PerfFormattedData_Counters_ProcessorInformation | Measure-Object -Property ActualFrequency -Maximum | Select-Object -ExpandProperty Maximum -ErrorAction SilentlyContinue; Write-Output \\"TEMP:$t\\"; Write-Output \\"FREQ:$f\\""',
                                        shell=True, startupinfo=si, creationflags=0x08000000, timeout=2.0
                                    ).decode().strip().splitlines()
                                    wmi_temps = []
                                    for line in out:
                                        line = line.strip()
                                        if line.startswith("TEMP:") and line[5:].strip().isdigit():
                                            t = int(line[5:].strip())
                                            if t > 0:
                                                temp_c = (t - 2732) / 10.0
                                                if 0 < temp_c < 120:
                                                    wmi_temps.append(temp_c)
                                        elif line.startswith("FREQ:") and line[5:].strip().isdigit():
                                            f = int(line[5:].strip())
                                            if f > 0:
                                                self._cached_wmi_freq = f
                                    if wmi_temps:
                                        self._cached_wmi_temp = max(wmi_temps)
                                except (subprocess.TimeoutExpired, subprocess.SubprocessError) as sub_err:
                                    logger.debug(f"Powershell WMI query failed/timed out: {sub_err}")
                                    # Slow down future polls on timeout
                                    self._last_wmi_temp_poll = now + 10.0
                                    
                                    # Fallback to legacy wmic for temperature only if powershell fails
                                    try:
                                        out = subprocess.check_output(
                                            'wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get InstanceName,CurrentTemperature /value',
                                            shell=True, startupinfo=si, creationflags=0x08000000, timeout=2.0
                                        ).decode().strip()
                                        lines = [line.strip() for line in out.splitlines() if line.strip()]
                                        current_inst = ""
                                        for line in lines:
                                            if "InstanceName=" in line:
                                                current_inst = line.split("InstanceName=")[-1].strip()
                                            elif "CurrentTemperature=" in line:
                                                val = line.split("CurrentTemperature=")[-1].strip()
                                                if val.isdigit():
                                                    t = int(val)
                                                    if t > 0 and not any(x in current_inst.upper() for x in ["PCH", "BAT", "SEN"]):
                                                        temp_c = (t - 2732) / 10.0
                                                        if 0 < temp_c < 120:
                                                            self._cached_wmi_temp = temp_c
                                    except Exception:
                                        pass
                                except Exception as e:
                                    logger.debug(f"WMI query failed: {e}")
                            except Exception:
                                pass
                    
                    if cpu_temp <= 0 and hasattr(self, "_cached_wmi_temp"):
                        cpu_temp = self._cached_wmi_temp

                    if cpu_freq <= 0 and hasattr(self, "_cached_wmi_freq") and self._cached_wmi_freq > 0:
                        cpu_freq = self._cached_wmi_freq

                    # --- Driver-free fallback for VBS/Alienware systems ---
                    # Only poll native temp if we don't have a CPU temperature, or if we have successfully used it before.
                    # Throttling to 5s instead of 2s to minimize CPU cycles.
                    if cpu_temp <= 0 or (hasattr(self, "_cached_native_temp") and self._cached_native_temp > 0):
                        if not hasattr(self, "_last_native_temp_poll") or (now - self._last_native_temp_poll) > 5.0:
                            self._last_native_temp_poll = now
                            t = _try_win_cpu_temp_native()
                            if t > 0:
                                self._cached_native_temp = t
                                logger.debug(f"[Telemetry] AWCC/Native thermal read: {t}°C")
                    if cpu_temp <= 0 and hasattr(self, "_cached_native_temp") and self._cached_native_temp > 0:
                        cpu_temp = self._cached_native_temp

                    # --- Smart Estimation Fallback if no sensor works or is blocked ---
                    if cpu_temp <= 0:
                        pass # Fallback simulation removed to prevent inaccurate reporting

                # --- Source-aware temperature post-processing ---
                # LHM priority ladder (Program.cs GetCpuTempPriority):
                #   100 — "CPU Package" / "Package"   ← package-level die temp (preferred)
                #    95 — "Tdie"                        ← AMD silicon die, no offset
                #    90 — "Tctl" / "Tctl/Tdie"          ← AMD control temp
                #    85 — CCD* (AMD chiplet die)
                #    70 — generic CPU-named sensor
                #     5 — "Core Max" / "Core Average"   ← per-core aggregates, NOT package
                #     2 — "Core #N"                     ← individual cores, last resort
                # Fallback sources (WMI ACPI, psutil, native) get an outlier guard
                # before the EMA step below.
                lhm_provided_temp = lhm and lhm.get("cpu_temp", 0) > 0

                if cpu_temp > 0:
                    # Hard clamp: Tjunction max is 100°C for most Intel/AMD CPUs.
                    cpu_temp = min(cpu_temp, 100.0)

                    if not lhm_provided_temp:
                        # Outlier guard for noisy fallback sensors: if the reading
                        # jumps more than 15°C in a single tick AND the CPU is
                        # lightly loaded (<50%), treat it as a sensor artifact.
                        last = getattr(self, "_last_cpu_temp", 0)
                        if last > 0 and abs(cpu_temp - last) > 15 and cpu_pct < 50:
                            logger.debug(
                                f"[Telemetry] Outlier spike rejected: {cpu_temp:.1f}°C "
                                f"(prev={last:.1f}°C, load={cpu_pct:.0f}%)"
                            )
                            cpu_temp = last + (15 if cpu_temp > last else -15)

                    # Light symmetric EMA — reduces 1-3°C sensor jitter.
                    # alpha=0.5 means display moves 50% toward actual each tick,
                    # reaching 90%+ of the real value within ~3-4 ticks (~3s).
                    # Symmetric on heat-up and cool-down: no stuck-at-high lag.
                    last = getattr(self, "_last_cpu_temp", 0)
                    if last > 0:
                        cpu_temp = last + 0.5 * (cpu_temp - last)

                    self._last_cpu_temp = cpu_temp
                    cpu_temp = round(cpu_temp, 1)


                # Fallback / estimated CPU power draw if LHM is not providing CPU power
                if cpu_power_w <= 0:
                    # Estimate power based on CPU load (cpu_pct)
                    # For a typical CPU (45W TDP, 115W PL2)
                    # Idle is ~5W, load is ~45-90W depending on utilization
                    cpu_power_w = 5.0 + (55.0 * (cpu_pct / 100.0))

                with self.p._state_lock:
                    telemetry_update = {
                        "cpu_pct": cpu_pct,
                        "mem_pct": mem_pct,
                        "mem_used_gb": mem_used_gb,
                        "mem_total_gb": mem_total_gb,
                        "cpu_temp": cpu_temp,
                        "cpu_freq": cpu_freq,
                        "cpu_max_freq": cpu_max_freq,
                        "cpu_power_w": cpu_power_w,
                        "disk_util": disk_util,
                        "net_util": net_util,
                        "net_speed": net_speed,
                        "gpu_metrics": gpu_metrics,
                    }

                    
                    # Always include system_specs if available (discovered by hw_checker)
                    if "system_specs" in self.p._game_state:
                        telemetry_update["system_specs"] = self.p._game_state["system_specs"]
                    if "ram_speed" in self.p._game_state:
                        telemetry_update["ram_speed"] = self.p._game_state["ram_speed"]
                    
                    self.p._game_state.update(telemetry_update)


                    state_copy = dict(self.p._game_state)

                if not hasattr(self, "_admin_checked"):
                    import ctypes

                    is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
                    if not is_admin and cpu_temp <= 0:
                        logger.debug(
                            "CPU Temperature restricted: Run as Administrator to enable thermal sensors."
                        )
                    self._admin_checked = True

                if "gpu_metrics" in state_copy and state_copy["gpu_metrics"]:
                    gm = state_copy["gpu_metrics"]
                    state_copy["gpu_metrics"] = {
                        **gm,
                        "utilization": gm.get("gpu_util"),
                        "temp": gm.get("temperature"),
                        "vram_used": gm.get("vram_used_mb"),
                        "vram_total": gm.get("vram_total_mb"),
                        "vram_percent": gm.get("vram_percent"),
                        "clock_core": gm.get("clock_gpu_mhz"),
                        "clock_mem": gm.get("clock_mem_mhz"),
                        "power_draw": gm.get("power_draw_w"),
                        "power_limit": gm.get("power_limit_w"),
                        "driver_version": gm.get("driver_version"),
                        "fan_speed": gm.get("fan_speed"),
                    }

                def get_screen_refresh_rate() -> int:
                    try:
                        import ctypes
                        user32 = ctypes.windll.user32
                        dm = ctypes.create_string_buffer(156)
                        if user32.EnumDisplaySettingsW(None, -1, dm):
                            import struct
                            freq = struct.unpack_from("I", dm, 120)[0]
                            if freq > 0:
                                return freq
                    except Exception:
                        pass
                    return 60

                game_fps = state_copy.get("game_fps", 0.0)
                state_copy["fps"] = round(game_fps, 1) if (is_active and game_fps > 0.0) else 0.0

                game_info = state_copy.get("game_info")
                if game_info:
                    state_copy["current_game"] = game_info.get("name", "")
                elif state_copy.get("game_mode_manual", False):
                    state_copy["current_game"] = "Manual Optimization"
                else:
                    state_copy["current_game"] = None

                if hasattr(self.p, "system_advisor") and self.p.system_advisor:
                    try:
                        recs = self.p.system_advisor.evaluate(state_copy)
                        state_copy["advisor_recommendations"] = recs
                    except Exception as adv_e:
                        logger.error("System Advisor error: %s", adv_e)

                bridge.update_state(state_copy)


            except Exception as e:
                logger.error("Hardware monitor error: %s", e, exc_info=True)
            time.sleep(poll_interval)

        # Clean up persistent disk query
        if self._disk_query:
            try:
                import win32pdh
                win32pdh.CloseQuery(self._disk_query)
            except Exception:
                pass
            self._disk_query = None
            self._disk_counter = None

        # Clean up persistent CPU frequency query
        if self._cpu_query:
            try:
                import win32pdh
                win32pdh.CloseQuery(self._cpu_query)
            except Exception:
                pass
            self._cpu_query = None
            self._cpu_counter = None


class _ChildProcessLogger:
    """Logs newly spawned child processes for debugging spawn loops."""

    def __init__(self, poll_interval=2.0):
        self._poll_interval = poll_interval
        self._running = False
        self._thread = None
        self._seen = set()

    def start(self):
        if not _PSUTIL_AVAILABLE:
            logger.warning("psutil not available; child process logging disabled")
            return
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, name="ChildProcLogger", daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _loop(self):
        try:
            parent = psutil.Process(os.getpid())
        except Exception as e:
            logger.debug("Child process logger failed to init: %s", e)
            return
        while self._running:
            try:
                children = parent.children(recursive=True)
                for child in children:
                    if child.pid in self._seen:
                        continue
                    self._seen.add(child.pid)
                    try:
                        cmdline = " ".join(child.cmdline())
                    except Exception:
                        cmdline = "<unknown>"
                    logger.warning("Child process spawned: pid=%s cmd=%s", child.pid, cmdline)
            except Exception:
                pass
            time.sleep(self._poll_interval)


class HotReloader:
    """Watches for changes in .py or .yaml files and restarts the app."""

    def __init__(self, watch_dir=".", interval=0.8, on_reload=None):
        self.watch_dir = watch_dir
        self.interval = interval
        self.on_reload = on_reload
        self._mtimes = {}
        self._running = False
        self._restart_requested = False
        self._changed_path = None
        self._thread = None

    def start(self):
        logger.info("[HOT RELOAD] Active. Watching for changes...")
        self._mtimes = self._scan_files()
        self._running = True
        self._thread = threading.Thread(target=self._loop, name="HotReloader", daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    @property
    def restart_requested(self):
        return self._restart_requested

    def _scan_files(self):
        new_state = {}
        ignore_dirs = {".git", "__pycache__", ".venv", "data", "logs", "assets", "scripts"}

        try:
            for root, dirs, files in os.walk(self.watch_dir):
                dirs[:] = [d for d in dirs if d not in ignore_dirs]

                for f in files:
                    if f.endswith(".py") or f.endswith(".yaml"):
                        path = os.path.join(root, f)
                        try:
                            new_state[path] = os.path.getmtime(path)
                        except Exception:
                            pass
        except Exception:
            pass
        return new_state

    def _loop(self):
        while self._running:
            try:
                current = self._scan_files()
                for path, mtime in current.items():
                    if path in self._mtimes and mtime > self._mtimes[path]:
                        logger.info("[RELOAD] Change detected in %s. Restarting...", os.path.basename(path))
                        self._changed_path = path
                        self._restart_requested = True
                        self._restart(path)
                        return
                self._mtimes = current
            except Exception:
                pass
            time.sleep(3.0)

    def _restart(self, changed_path):
        if callable(self.on_reload):
            try:
                self.on_reload(changed_path)
                return
            except Exception as e:
                logger.warning("[RELOAD] Graceful restart callback failed: %s. Falling back.", e)

        python = sys.executable
        args = [python] + sys.argv
        if "--dev" not in args:
            args.append("--dev")
        subprocess.Popen(args)
        os._exit(0)
