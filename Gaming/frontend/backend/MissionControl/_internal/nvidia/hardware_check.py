import os
import ctypes
import logging
import subprocess

logger = logging.getLogger(__name__)

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

        common_path = r"C:\Program Files\NVIDIA\Cudnn"
        if os.path.exists(common_path):
            for root, dirs, files in os.walk(common_path):
                for f in files:
                    if f.lower().startswith("cudnn64_") and f.lower().endswith(".dll"):
                        candidates.append(os.path.join(root, f))

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

def check_nvidia_app():
    """Checks if NVIDIA App is installed/running."""
    try:
        import psutil
        for proc in psutil.process_iter(['name']):
            if proc.info['name'] and "NVIDIA App" in proc.info['name']:
                return {"status": "Detected", "details": "NVIDIA App is active"}
    except Exception:
        pass
    return {"status": "Not Found", "details": "NVIDIA App not running"}

def get_neural_acceleration_summary():
    """Returns a summary of neural acceleration libraries and software."""
    cudnn = check_cudnn()
    trt = check_tensorrt()
    rtx_v = check_rtx_video()
    nv_app = check_nvidia_app()
    
    return {
        "cudnn": cudnn,
        "tensorrt": trt,
        "rtx_video": rtx_v,
        "nvidia_app": nv_app,
        "score": 100 if trt["status"] == "Available" and cudnn["status"] == "Available" else 50 if cudnn["status"] == "Available" else 0
    }
