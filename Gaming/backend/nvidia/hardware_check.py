import os
import ctypes
import logging
import subprocess

logger = logging.getLogger(__name__)

# --- NVIDIA Checks ---

def check_cudnn():
    """Checks for cuDNN availability in the system path or local directory."""
    try:
        candidates = []
        path_env = os.environ.get("PATH", "")
        for p in path_env.split(os.pathsep):
            try:
                if not p: continue
                for fname in os.listdir(p):
                    if fname.lower().startswith("cudnn64_") and fname.lower().endswith(".dll"):
                        candidates.append(os.path.join(p, fname))
            except Exception: continue

        for p in [os.getcwd(), os.path.dirname(__file__)]:
            try:
                for fname in os.listdir(p):
                    if fname.lower().startswith("cudnn64_") and fname.lower().endswith(".dll"):
                        candidates.append(os.path.join(p, fname))
            except Exception: continue

        cuda_paths = []
        cuda_env = os.environ.get("CUDA_PATH")
        if cuda_env:
            cuda_paths.append(os.path.join(cuda_env, "bin"))
        default_cuda_root = r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA"
        if os.path.exists(default_cuda_root):
            for v in os.listdir(default_cuda_root):
                cuda_paths.append(os.path.join(default_cuda_root, v, "bin"))

        for p in cuda_paths:
            try:
                if not p or not os.path.exists(p): continue
                for fname in os.listdir(p):
                    if fname.lower().startswith("cudnn64_") and fname.lower().endswith(".dll"):
                        candidates.append(os.path.join(p, fname))
            except Exception: continue

        candidates = list(dict.fromkeys(candidates))

        for path in candidates:
            try:
                ctypes.WinDLL(path)
                base = os.path.basename(path)
                ver = None
                try:
                    parts = base.split("_")
                    if len(parts) >= 2 and parts[1].lower().endswith('.dll'):
                        ver = int(parts[1].split('.')[0])
                except Exception: ver = None
                return {"status": "Available", "version": ver, "library": base, "path": path}
            except Exception: continue

    except Exception as e:
        logger.debug(f"cuDNN library search failed: {e}")
    
    return {"status": "Not Found", "version": None, "library": None}

def check_tensorrt():
    """Checks for TensorRT availability."""
    try:
        import importlib
        trt = importlib.import_module("tensorrt")
        ver = getattr(trt, "__version__", None)
        return {"status": "Available", "version": ver}
    except Exception:
        return {"status": "Not Found", "version": None}


# --- AMD Checks ---

def check_rocm():
    """Checks for AMD ROCm/HIP availability."""
    try:
        path_env = os.environ.get("PATH", "")
        for p in path_env.split(os.pathsep):
            try:
                if not p: continue
                hip_dll = os.path.join(p, "amdhip64.dll")
                if os.path.exists(hip_dll):
                    return {"status": "Available", "library": "amdhip64.dll"}
            except Exception: continue
        
        # Check default HIP install path on Windows
        if os.path.exists(r"C:\Program Files\AMD\ROCm"):
            return {"status": "Available", "library": "ROCm Install"}
            
    except Exception as e:
        logger.debug(f"ROCm search failed: {e}")
    return {"status": "Not Found", "library": None}


def check_amf():
    """Checks for AMD Advanced Media Framework (AMF)."""
    try:
        # Usually present if drivers are installed in system32
        if os.path.exists(r"C:\Windows\System32\amfrt64.dll"):
            return {"status": "Available", "library": "amfrt64.dll"}
    except Exception: pass
    return {"status": "Not Found", "library": None}


# --- Intel Checks ---

def check_openvino():
    """Checks for Intel OpenVINO toolkit."""
    try:
        import importlib
        ov = importlib.import_module("openvino")
        ver = getattr(ov, "__version__", None)
        return {"status": "Available", "version": ver}
    except Exception:
        # Check system paths
        if os.environ.get("INTEL_OPENVINO_DIR"):
            return {"status": "Available", "version": "Path Based"}
        return {"status": "Not Found", "version": None}

def check_xess():
    """Checks for Intel XeSS SDK DLLs in path."""
    try:
        path_env = os.environ.get("PATH", "")
        for p in path_env.split(os.pathsep):
            try:
                if not p: continue
                xess_dll = os.path.join(p, "libxess.dll")
                if os.path.exists(xess_dll):
                    return {"status": "Available", "library": "libxess.dll"}
            except Exception: continue
    except Exception: pass
    return {"status": "Not Found", "library": None}

# --- Generic / App Checks ---

def check_rtx_video():
    """Checks for RTX Video Super Resolution/HDR support and status."""
    try:
        from nvidia.capabilities import GPUCapabilities
        caps = GPUCapabilities()
        if caps.supports("rtx_video_sr") or caps.supports("rtx_video_hdr"):
            return {"status": "Supported", "details": "Available via NVIDIA Control Panel"}
        return {"status": "Not Supported", "details": "Requires RTX 30-series or newer"}
    except Exception:
        return {"status": "Unknown", "details": "Capability check failed"}

def check_gpu_apps():
    """Checks if GPU control apps are installed/running (NVIDIA App, Adrenalin, Arc Control)."""
    apps = {
        "nvidia": {"status": "Not Found", "details": "NVIDIA App not running"},
        "amd": {"status": "Not Found", "details": "Adrenalin not running"},
        "intel": {"status": "Not Found", "details": "Arc Control not running"}
    }
    try:
        import psutil
        for proc in psutil.process_iter(['name']):
            try:
                name = proc.info['name'].lower()
                if "nvidia app" in name or "nvapp" in name:
                    apps["nvidia"] = {"status": "Detected", "details": "NVIDIA App is active"}
                elif "radeonsoftware" in name or "amdsoftware" in name:
                    apps["amd"] = {"status": "Detected", "details": "AMD Adrenalin is active"}
                elif "arccontrol" in name:
                    apps["intel"] = {"status": "Detected", "details": "Intel Arc Control is active"}
            except Exception: pass
    except Exception:
        pass
    return apps

def get_neural_acceleration_summary():
    """Returns a summary of neural acceleration libraries and software."""
    cudnn = check_cudnn()
    trt = check_tensorrt()
    rocm = check_rocm()
    amf = check_amf()
    ov = check_openvino()
    xess = check_xess()
    rtx_v = check_rtx_video()
    
    apps = check_gpu_apps()
    
    score = 0
    if trt["status"] == "Available" and cudnn["status"] == "Available": score = 100
    elif cudnn["status"] == "Available": score = 50
    elif rocm["status"] == "Available" or ov["status"] == "Available": score = 80
    elif xess["status"] == "Available": score = 60
    
    return {
        "nvidia": {
            "cudnn": cudnn,
            "tensorrt": trt,
            "rtx_video": rtx_v,
            "app": apps["nvidia"]
        },
        "amd": {
            "rocm": rocm,
            "amf": amf,
            "app": apps["amd"]
        },
        "intel": {
            "openvino": ov,
            "xess": xess,
            "app": apps["intel"]
        },
        "score": score
    }
