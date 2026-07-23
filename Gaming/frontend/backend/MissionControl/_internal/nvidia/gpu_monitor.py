"""
NVIDIA GPU monitoring via NVML (nvidia-ml-py / pynvml).
Real-time tracking of GPU utilization, VRAM, temperature, clock speeds, and power draw.
Provides data for the performance advisor to recommend DLSS, Ray Tracing, etc.
"""
import time
import threading
import logging

logger = logging.getLogger(__name__)

import sys

_NVML_AVAILABLE = False
try:
    import pynvml
    _NVML_AVAILABLE = True
except ImportError:
    pass

_PDH_AVAILABLE = False
if sys.platform == "win32":
    try:
        import ctypes
        from ctypes import wintypes
        import win32pdh
        
        # Native ctypes GUID representation to avoid importing comtypes
        class GUID(ctypes.Structure):
            _fields_ = [
                ("Data1", ctypes.c_ulong),
                ("Data2", ctypes.c_ushort),
                ("Data3", ctypes.c_ushort),
                ("Data4", ctypes.c_ubyte * 8)
            ]
            
        def parse_guid(guid_str: str) -> GUID:
            guid = GUID()
            hr = ctypes.windll.ole32.CLSIDFromString(ctypes.c_wchar_p(guid_str), ctypes.byref(guid))
            if hr != 0:
                raise ValueError(f"Invalid GUID: {guid_str}")
            return guid
            
        _PDH_AVAILABLE = True
        
        # Define DXGI structures for Windows
        class LUID(ctypes.Structure):
            _fields_ = [
                ("LowPart", wintypes.DWORD),
                ("HighPart", wintypes.LONG)
            ]
            
            def to_string(self):
                return f"luid_0x{self.HighPart:08x}_0x{self.LowPart:08x}"

        class DXGI_ADAPTER_DESC(ctypes.Structure):
            _fields_ = [
                ("Description", ctypes.c_wchar * 128),
                ("VendorId", wintypes.UINT),
                ("DeviceId", wintypes.UINT),
                ("SubSysId", wintypes.UINT),
                ("Revision", wintypes.UINT),
                ("DedicatedVideoMemory", ctypes.c_size_t),
                ("DedicatedSystemMemory", ctypes.c_size_t),
                ("SharedSystemMemory", ctypes.c_size_t),
                ("AdapterLuid", LUID)
            ]
    except ImportError:
        pass


class GPUMonitor:
    """
    Real-time NVIDIA GPU metrics via NVML.
    Tracks: utilization, VRAM, temperature, clocks, power, encoder/decoder usage.
    """
    _NVML_LOCK = threading.Lock()
    _NVML_INITIALIZED = False

    def __init__(self, device_index=None, poll_interval=1.0):
        with GPUMonitor._NVML_LOCK:
            if _NVML_AVAILABLE and not GPUMonitor._NVML_INITIALIZED:
                try:
                    pynvml.nvmlInit()
                    GPUMonitor._NVML_INITIALIZED = True
                    logger.info("NVML initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize NVML: {e}")

        if device_index is None:
            try:
                from nvidia.capabilities import discover_best_gpu_index
                self._device_index = discover_best_gpu_index()
            except ImportError:
                self._device_index = 0
        else:
            self._device_index = device_index
        
        self._poll_interval = poll_interval
        self._handle = None
        self._running = False
        self._thread = None
        self._lock = threading.Lock()
        self._initialized = GPUMonitor._NVML_INITIALIZED
        
        if self._initialized:
            try:
                self._handle = pynvml.nvmlDeviceGetHandleByIndex(self._device_index)
            except Exception as e:
                logger.error(f"Failed to get GPU handle for index {self._device_index}: {e}")
                self._initialized = False
        
        # Current metrics
        self._metrics = {
            "gpu_name": "Unknown",
            "driver_version": "Unknown",
            "gpu_util": 0,           # GPU core utilization (%)
            "mem_util": 0,           # Memory controller utilization (%)
            "vram_used_mb": 0,       # VRAM used (MB)
            "vram_total_mb": 0,      # VRAM total (MB)
            "vram_percent": 0.0,     # VRAM usage (%)
            "temperature": 0,        # GPU temp (°C)
            "fan_speed": 0,          # Fan speed (%)
            "power_draw_w": 0.0,     # Current power draw (W)
            "power_limit_w": 0.0,    # Currently configured NVML power limit (W)
            "power_limit_max_w": 0.0, # Hardware TGP ceiling / chassis max (W)
            "clock_gpu_mhz": 0,      # GPU clock (MHz)
            "clock_mem_mhz": 0,      # Memory clock (MHz)
            "pcie_gen": 0,           # PCIe generation
            "pcie_width": 0,         # PCIe lane width
            "encoder_util": 0,       # NVENC utilization (%)
            "decoder_util": 0,       # NVDEC utilization (%)
            "pcie_link_gen": 0,      # Current PCIe link generation
            "pcie_link_width": 0,    # Current PCIe link width
            "driver_outdated": False,
            "latest_driver": "Unknown",
            "thermal_status": "OK",  # OK, Slowdown, Shutdown, etc.
        }
        
        # Initialize DXGI LUID mapping on Windows
        self._dxgi_gpus = []
        self._pdh_query = None
        self._pdh_counter = None
        if sys.platform == "win32" and _PDH_AVAILABLE:
            try:
                self._init_dxgi_mapping()
                self._pdh_query = win32pdh.OpenQuery()
                self._pdh_counter = win32pdh.AddCounter(self._pdh_query, r"\GPU Engine(*)\Utilization Percentage")
                win32pdh.CollectQueryData(self._pdh_query)
            except Exception as e:
                logger.warning(f"Failed to initialize DXGI mapping or persistent PDH query: {e}")
                self._pdh_query = None
                self._pdh_counter = None
                
        self._init_nvml()

    def _init_nvml(self):
        """Initialize NVML and get GPU handle."""
        if not _NVML_AVAILABLE:
            logger.warning("pynvml not installed. GPU monitoring disabled. "
                          "Install with: uv pip install pynvml")
            return
        
        # Windows-specific DLL path resolution for nvml.dll
        if sys.platform == "win32":
            import os
            extra_paths = [
                r"C:\Windows\System32",
                r"C:\Program Files\NVIDIA Corporation\NVSMI",
                r"C:\Program Files\NVIDIA Corporation\NVIDIA-SMI"
            ]
            for p in extra_paths:
                if os.path.exists(p) and p not in os.environ["PATH"]:
                    os.environ["PATH"] = p + os.pathsep + os.environ["PATH"]
        
        try:
            with GPUMonitor._NVML_LOCK:
                if not GPUMonitor._NVML_INITIALIZED:
                    pynvml.nvmlInit()
                    GPUMonitor._NVML_INITIALIZED = True
            self._handle = pynvml.nvmlDeviceGetHandleByIndex(self._device_index)
            
            # Static info
            name = pynvml.nvmlDeviceGetName(self._handle)
            if isinstance(name, bytes):
                name = name.decode("utf-8")
            driver = pynvml.nvmlSystemGetDriverVersion()
            if isinstance(driver, bytes):
                driver = driver.decode("utf-8")
            
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(self._handle)
            
            with self._lock:
                self._metrics["gpu_name"] = name
                self._metrics["driver_version"] = driver
                self._metrics["vram_total_mb"] = mem_info.total // (1024 * 1024)
            
            self._initialized = True
            self._consecutive_errors = 0
            logger.info(f"GPU Monitor: {name} | Driver: {driver} | "
                       f"VRAM: {mem_info.total // (1024*1024)}MB")
        except Exception as e:
            logger.error(f"NVML init failed: {e}")
            self._initialized = False

    def _init_dxgi_mapping(self):
        """Map GPU names to their performance counter LUID strings."""
        self._dxgi_gpus = []
        if not _PDH_AVAILABLE:
            return
            
        try:
            dxgi = ctypes.windll.dxgi
            IID_IDXGIFactory = parse_guid("{7b7166ec-21c7-44ae-b21a-c9ae321ae369}")
            factory = ctypes.c_void_p()
            hr = dxgi.CreateDXGIFactory(ctypes.byref(IID_IDXGIFactory), ctypes.byref(factory))
            if hr != 0:
                logger.warning(f"CreateDXGIFactory failed in DXGI LUID mapping: {hr}")
                return
                
            adapter_idx = 0
            while True:
                interface_ptr = ctypes.cast(factory.value, ctypes.POINTER(ctypes.c_void_p))
                vtable = ctypes.cast(interface_ptr[0], ctypes.POINTER(ctypes.c_void_p))
                
                enum_adapters = ctypes.WINFUNCTYPE(
                    ctypes.c_long, ctypes.c_void_p, wintypes.UINT, ctypes.POINTER(ctypes.c_void_p)
                )(vtable[7])
                
                adapter = ctypes.c_void_p()
                hr = enum_adapters(factory.value, adapter_idx, ctypes.byref(adapter))
                if hr != 0:
                    break
                    
                adapter_interface_ptr = ctypes.cast(adapter.value, ctypes.POINTER(ctypes.c_void_p))
                adapter_vtable = ctypes.cast(adapter_interface_ptr[0], ctypes.POINTER(ctypes.c_void_p))
                
                get_desc = ctypes.WINFUNCTYPE(
                    ctypes.c_long, ctypes.c_void_p, ctypes.POINTER(DXGI_ADAPTER_DESC)
                )(adapter_vtable[8])
                
                desc = DXGI_ADAPTER_DESC()
                hr = get_desc(adapter.value, ctypes.byref(desc))
                if hr == 0:
                    self._dxgi_gpus.append({
                        "name": desc.Description,
                        "luid": desc.AdapterLuid.to_string(),
                        "vram_total_mb": desc.DedicatedVideoMemory // (1024 * 1024)
                    })
                    
                ctypes.WINFUNCTYPE(wintypes.ULONG, ctypes.c_void_p)(adapter_vtable[2])(adapter.value)
                adapter_idx += 1
                
            ctypes.WINFUNCTYPE(wintypes.ULONG, ctypes.c_void_p)(vtable[2])(factory.value)
            logger.info(f"DXGI GPU mapping initialized successfully: {self._dxgi_gpus}")
        except Exception as e:
            logger.warning(f"Failed to initialize DXGI GPU mapping: {e}")

    def _reset_dynamic_metrics(self):
        """Reset dynamic metrics to default idle values."""
        with self._lock:
            self._metrics.update({
                "gpu_util": 0,
                "mem_util": 0,
                "vram_used_mb": 0,
                "vram_percent": 0.0,
                "temperature": 0,
                "fan_speed": 0,
                "power_draw_w": 0.0,
                "clock_gpu_mhz": 0,
                "clock_mem_mhz": 0,
            })

    def _handle_nvml_error(self, e):
        """Handle NVML errors by logging and marking for re-initialization if critical."""
        if not self._initialized:
            return
            
        err_name = type(e).__name__
        logger.debug(f"NVML error: {err_name} - {e}")
        
        # Non-supported features (e.g. power limits or fan speed on laptops) are static hardware properties,
        # and should not count as critical communication errors that reset the monitor.
        if err_name == "NVMLError_NotSupported":
            return
            
        if not hasattr(self, "_consecutive_errors"):
            self._consecutive_errors = 0
        self._consecutive_errors += 1
        
        # If the GPU was lost, uninitialized, or we hit multiple consecutive errors, reset NVML
        if err_name in ("NVMLError_GpuLost", "NVMLError_Uninitialized") or self._consecutive_errors >= 5:
            self._initialized = False
            self._handle = None
            self._consecutive_errors = 0
            self._reset_dynamic_metrics()

    def poll_once(self, is_game_active=False) -> dict:
        """Update metrics once."""
        vram_updated = False
        
        # 1. Attempt NVML initialization or recovery if not online
        if not self._initialized or not self._handle:
            now = time.time()
            if not hasattr(self, "_last_reinit_attempt") or (now - self._last_reinit_attempt) > 5.0:
                self._last_reinit_attempt = now
                logger.info("Attempting to re-initialize NVML...")
                self._init_nvml()

        # 2. Update VRAM via NVML if online
        if self._initialized and self._handle:
            try:
                mem = pynvml.nvmlDeviceGetMemoryInfo(self._handle)
                with self._lock:
                    self._metrics["vram_used_mb"] = mem.used // (1024 * 1024)
                    self._metrics["vram_total_mb"] = mem.total // (1024 * 1024)
                    if mem.total > 0:
                        self._metrics["vram_percent"] = round(mem.used / mem.total * 100, 1)
                vram_updated = True
            except Exception as e:
                self._handle_nvml_error(e)

        # 3. Fallback/Alternatives for VRAM if NVML didn't update it
        if not vram_updated:
            # Check if this is an NVIDIA system where the GPU is offline (D3 sleep)
            has_nvidia = any("nvidia" in gpu["name"].lower() for gpu in self._dxgi_gpus)
            if has_nvidia and not self._initialized:
                # NVIDIA GPU is offline / in D3 sleep. VRAM usage is 0.
                with self._lock:
                    self._metrics["vram_used_mb"] = 0
                    self._metrics["vram_percent"] = 0.0
                vram_updated = True
            elif sys.platform == "win32" and _PDH_AVAILABLE:
                # Non-NVIDIA (AMD/Intel) system, or fallback. Use PDH.
                try:
                    target_luid = None
                    # Find LUID of the primary non-Intel GPU if possible, otherwise first GPU
                    for gpu in self._dxgi_gpus:
                        if "nvidia" in gpu["name"].lower():
                            target_luid = gpu["luid"].lower()
                            break
                    if not target_luid:
                        for gpu in self._dxgi_gpus:
                            if "amd" in gpu["name"].lower() or "radeon" in gpu["name"].lower():
                                target_luid = gpu["luid"].lower()
                                break
                    if not target_luid:
                        for gpu in self._dxgi_gpus:
                            if gpu["vram_total_mb"] > 512:
                                target_luid = gpu["luid"].lower()
                                break
                    if not target_luid and self._dxgi_gpus:
                        target_luid = self._dxgi_gpus[0]["luid"].lower()

                    if target_luid:
                        hq = win32pdh.OpenQuery()
                        hc = win32pdh.AddCounter(hq, r"\GPU Local Adapter Memory(*)\Local Usage")
                        win32pdh.CollectQueryData(hq)
                        items = win32pdh.GetFormattedCounterArray(hc, win32pdh.PDH_FMT_LARGE)
                        win32pdh.CloseQuery(hq)
                        
                        matched_val = None
                        if isinstance(items, dict):
                            for inst_name, byte_val in items.items():
                                if inst_name.lower().startswith(target_luid):
                                    matched_val = byte_val
                                    break
                        else:
                            for inst_name, byte_val in items:
                                if inst_name.lower().startswith(target_luid):
                                    matched_val = byte_val
                                    break
                                    
                        if matched_val is not None:
                            with self._lock:
                                self._metrics["vram_used_mb"] = matched_val // (1024 * 1024)
                                # Ensure vram_total_mb is set
                                if self._metrics["vram_total_mb"] <= 0:
                                    for gpu in self._dxgi_gpus:
                                        if gpu["luid"].lower() == target_luid:
                                            self._metrics["vram_total_mb"] = gpu["vram_total_mb"]
                                            break
                                if self._metrics["vram_total_mb"] > 0:
                                    self._metrics["vram_percent"] = round((self._metrics["vram_used_mb"] / self._metrics["vram_total_mb"]) * 100, 1)
                            vram_updated = True
                except Exception as pdh_err:
                    logger.debug(f"PDH VRAM fallback poll failed: {pdh_err}")

        # 4. Handle remaining metrics when NVML is offline
        if not self._initialized or not self._handle:
            # NVML is offline. Get GPU utilization via PDH if available.
            gpu_util = 0.0
            if self._pdh_query and self._pdh_counter:
                try:
                    win32pdh.CollectQueryData(self._pdh_query)
                    items = win32pdh.GetFormattedCounterArray(self._pdh_counter, win32pdh.PDH_FMT_DOUBLE)
                    
                    target_luid = None
                    for gpu in self._dxgi_gpus:
                        if "nvidia" in gpu["name"].lower():
                            target_luid = gpu["luid"].lower()
                            break
                    if not target_luid:
                        for gpu in self._dxgi_gpus:
                            if "amd" in gpu["name"].lower() or "radeon" in gpu["name"].lower():
                                target_luid = gpu["luid"].lower()
                                break
                    if not target_luid:
                        for gpu in self._dxgi_gpus:
                            if gpu["vram_total_mb"] > 512:
                                target_luid = gpu["luid"].lower()
                                break
                    if not target_luid and self._dxgi_gpus:
                        target_luid = self._dxgi_gpus[0]["luid"].lower()
                        
                    total_util = 0.0
                    if isinstance(items, dict):
                        for k, v in items.items():
                            if v > 0 and '_engtype_3d' in k.lower():
                                if not target_luid or target_luid in k.lower():
                                    total_util += v
                    else:
                        for k, v in items:
                            if v > 0 and '_engtype_3d' in k.lower():
                                if not target_luid or target_luid in k.lower():
                                    total_util += v
                    gpu_util = min(100.0, round(total_util, 1))
                except Exception as pdh_err:
                    logger.debug(f"PDH GPU util fallback failed: {pdh_err}")
            
            with self._lock:
                self._metrics.update({
                    "gpu_util": gpu_util,
                    "mem_util": 0.0,
                    "temperature": 0,
                    "fan_speed": 0,
                    "power_draw_w": 0.0,
                    "clock_gpu_mhz": 0,
                    "clock_mem_mhz": 0,
                })
                if not vram_updated:
                    self._metrics.update({
                        "vram_used_mb": 0,
                        "vram_percent": 0.0,
                    })
                # Clean up idle/base VRAM reporting
                if not is_game_active and self._metrics.get("gpu_util", 0) < 5 and self._metrics.get("vram_used_mb", 0) <= 500:
                    self._metrics["vram_used_mb"] = 0
                    self._metrics["vram_percent"] = 0.0
            return dict(self._metrics)

        # 5. Query remaining active NVML metrics if online
        with self._lock:
            # Utilization
            try:
                util = pynvml.nvmlDeviceGetUtilizationRates(self._handle)
                self._metrics["gpu_util"] = util.gpu
                self._metrics["mem_util"] = util.memory
            except Exception as e:
                self._handle_nvml_error(e)
            
            # Temperature
            try:
                self._metrics["temperature"] = pynvml.nvmlDeviceGetTemperature(self._handle, pynvml.NVML_TEMPERATURE_GPU)
            except Exception as e:
                self._handle_nvml_error(e)
            
            # Clocks
            try:
                self._metrics["clock_gpu_mhz"] = pynvml.nvmlDeviceGetClockInfo(self._handle, pynvml.NVML_CLOCK_GRAPHICS)
                self._metrics["clock_mem_mhz"] = pynvml.nvmlDeviceGetClockInfo(self._handle, pynvml.NVML_CLOCK_MEM)
            except Exception as e:
                self._handle_nvml_error(e)
            
            # Power
            try:
                raw_power = pynvml.nvmlDeviceGetPowerUsage(self._handle)
                power = raw_power / 1000.0
                if power > 1000.0:
                    power = power / 1000.0
                if power > 1000.0:
                    power = 0.0

                try:
                    try:
                        raw_limit = pynvml.nvmlDeviceGetPowerManagementLimit(self._handle)
                    except Exception:
                        raw_limit = pynvml.nvmlDeviceGetEnforcedPowerLimit(self._handle)

                    power_limit = raw_limit / 1000.0
                    if power_limit > 1000.0:
                        power_limit = power_limit / 1000.0
                    if power_limit > 1000.0:
                        power_limit = 0.0
                    if power > power_limit and power_limit > 0:
                        power = power_limit
                except Exception:
                    pass

                self._metrics["power_draw_w"] = round(power, 1)
            except Exception as e:
                self._handle_nvml_error(e)

            # Power limit (currently configured NVML limit)
            # Power limit & hardware TGP max constraints
            try:
                try:
                    raw_limit = pynvml.nvmlDeviceGetPowerManagementLimit(self._handle)
                except Exception:
                    raw_limit = pynvml.nvmlDeviceGetEnforcedPowerLimit(self._handle)
                power_limit = raw_limit / 1000.0
                if power_limit > 1000.0: power_limit /= 1000.0
                if power_limit > 1000.0: power_limit = 0.0

                power_limit_max = 0.0
                try:
                    _min_raw, max_raw = pynvml.nvmlDeviceGetPowerManagementLimitConstraints(self._handle)
                    power_limit_max = max_raw / 1000.0
                    if power_limit_max > 1000.0: power_limit_max /= 1000.0
                    if power_limit_max > 1000.0: power_limit_max = 0.0
                except Exception:
                    pass

                effective_limit = round(max(power_limit, power_limit_max) if power_limit_max > 0 else power_limit, 1)
                max_limit = round(power_limit_max if power_limit_max > 0 else effective_limit, 1)

                self._metrics["power_limit"] = effective_limit
                self._metrics["power_limit_w"] = effective_limit
                self._metrics["power_limit_watts"] = effective_limit
                self._metrics["power_limit_max"] = max_limit
                self._metrics["power_limit_max_w"] = max_limit
                self._metrics["power_limit_max_watts"] = max_limit
            except Exception as e:
                self._handle_nvml_error(e)
            
            # Fan speed
            try:
                self._metrics["fan_speed"] = pynvml.nvmlDeviceGetFanSpeed(self._handle)
            except Exception as e:
                self._handle_nvml_error(e)
            
            # Encoder utilization
            try:
                enc_util, _ = pynvml.nvmlDeviceGetEncoderUtilization(self._handle)
                self._metrics["encoder_util"] = enc_util
            except Exception as e:
                self._handle_nvml_error(e)
 
            # PCIe Status
            try:
                self._metrics["pcie_link_gen"] = pynvml.nvmlDeviceGetCurrPcieLinkGeneration(self._handle)
                self._metrics["pcie_link_width"] = pynvml.nvmlDeviceGetCurrPcieLinkWidth(self._handle)
            except Exception as e:
                self._handle_nvml_error(e)
 
            # Thermal Status
            try:
                slowdown = pynvml.nvmlDeviceGetCurrentClocksThrottleReasons(self._handle)
                if slowdown & pynvml.nvmlClocksThrottleReasonThermalSlowdown:
                    self._metrics["thermal_status"] = "Thermal Slowdown"
                elif slowdown & pynvml.nvmlClocksThrottleReasonPowerLimit:
                    self._metrics["thermal_status"] = "Power Limited"
                else:
                    self._metrics["thermal_status"] = "Normal"
            except Exception as e:
                self._handle_nvml_error(e)
 
            # Reset error count on successful poll
            if self._initialized:
                self._consecutive_errors = 0

            # Clean up idle/base VRAM reporting
            if not is_game_active and self._metrics.get("gpu_util", 0) < 5 and self._metrics.get("vram_used_mb", 0) <= 500:
                self._metrics["vram_used_mb"] = 0
                self._metrics["vram_percent"] = 0.0

            return dict(self._metrics)

    def get_active_graphics_processes(self):
        """Returns a list of processes currently utilizing the GPU for graphics or compute."""
        if not self._initialized:
            return []
        res = []
        import psutil
        
        try:
            # 1. Get graphics processes
            procs = pynvml.nvmlDeviceGetGraphicsRunningProcesses(self._handle)
            for p in procs:
                try:
                    process = psutil.Process(p.pid)
                    res.append({
                        "pid": p.pid,
                        "name": process.name(),
                        "memory_mb": p.usedGpuMemory // (1024 * 1024),
                        "type": "Graphics"
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception: pass

        try:
            # 2. Get compute processes (important for some games/CUDA apps)
            c_procs = pynvml.nvmlDeviceGetComputeRunningProcesses(self._handle)
            for p in c_procs:
                # Avoid duplicates if a process is in both lists
                if any(r["pid"] == p.pid for r in res):
                    continue
                try:
                    process = psutil.Process(p.pid)
                    res.append({
                        "pid": p.pid,
                        "name": process.name(),
                        "memory_mb": p.usedGpuMemory // (1024 * 1024),
                        "type": "Compute"
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception: pass

        return res

    def analyze_driver(self):
        """Analyze current driver and recommend updates."""
        current = self._metrics["driver_version"]
        try:
            from packaging import version
            latest_mock = "552.22" 
            if version.parse(current) < version.parse(latest_mock):
                self._metrics["driver_outdated"] = True
                self._metrics["latest_driver"] = latest_mock
        except Exception:
            pass

    @property
    def metrics(self) -> dict:
        """Get a snapshot of current GPU metrics."""
        with self._lock:
            return dict(self._metrics)

    @property
    def is_available(self) -> bool:
        return self._initialized or len(self._dxgi_gpus) > 0

    def start(self):
        """Start background polling thread."""
        if not self._initialized or self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._poll_loop, name="GPUMonitor", daemon=True
        )
        self._thread.start()
        logger.info(f"GPU monitoring started ({self._poll_interval}s interval)")

    def stop(self):
        """Stop background polling."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)

    def _poll_loop(self):
        while self._running:
            self.poll_once()
            time.sleep(self._poll_interval)

    def shutdown(self):
        """Clean up NVML and PDH."""
        self.stop()
        if self._pdh_query:
            try:
                win32pdh.CloseQuery(self._pdh_query)
            except Exception:
                pass
            self._pdh_query = None
            self._pdh_counter = None
