"""
NVIDIA GPU capabilities detection.
Identifies which NVIDIA technologies the user's GPU supports:
DLSS, Ray Tracing, Path Tracing, Frame Generation, Reflex, etc.
"""
import subprocess
import re
import logging

logger = logging.getLogger(__name__)

_NVML_AVAILABLE = False
try:
    import pynvml
    _NVML_AVAILABLE = True
except ImportError:
    pass

def discover_best_gpu_index():
    """
    Finds the index of the best available NVIDIA GPU.
    Prioritizes dedicated GPUs over integrated ones by checking VRAM total.
    """
    if not _NVML_AVAILABLE:
        return 0
    try:
        pynvml.nvmlInit()
        device_count = pynvml.nvmlDeviceGetCount()
        if device_count <= 1:
            return 0
            
        best_index = 0
        max_vram = 0
        
        for i in range(device_count):
            try:
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                # Prioritize GPU with more VRAM (usually the dedicated one)
                if mem.total > max_vram:
                    max_vram = mem.total
                    best_index = i
            except Exception:
                continue
        
        return best_index
    except Exception:
        return 0
    finally:
        try:
            pynvml.nvmlShutdown()
        except Exception:
            pass

# ── GPU Architecture Data ──────────────────────────────────────
# Maps compute capability → architecture name and supported features.

GPU_ARCHITECTURES = {
    # (major, minor): (arch_name, generation)
    (6, 0): ("Pascal", "pascal"),
    (6, 1): ("Pascal", "pascal"),
    (6, 2): ("Pascal", "pascal"),
    (7, 0): ("Volta", "volta"),
    (7, 5): ("Turing", "turing"),
    (8, 0): ("Ampere", "ampere"),
    (8, 6): ("Ampere", "ampere"),
    (8, 9): ("Ada Lovelace", "ada"),
    (9, 0): ("Hopper", "hopper"),
    (10, 0): ("Blackwell", "blackwell"),
    (10, 2): ("Blackwell", "blackwell"),
}

# Feature support by architecture generation
FEATURE_SUPPORT = {
    # feature_key: {set of architecture generations that support it}
    "rt_cores": {"turing", "ampere", "ada", "hopper", "blackwell"},
    "tensor_cores": {"volta", "turing", "ampere", "ada", "hopper", "blackwell"},
    "dlss_2": {"turing", "ampere", "ada", "hopper", "blackwell"},
    "dlss_3": {"ada", "blackwell"},                  # Frame Generation
    "dlss_3_5": {"ada", "blackwell"},                 # Ray Reconstruction
    "dlss_4": {"blackwell"},                          # Multi Frame Gen
    "dlss_4_5": {"blackwell"},                        # Dynamic Frame Generation
    "ray_tracing": {"turing", "ampere", "ada", "hopper", "blackwell"},
    "path_tracing": {"ada", "blackwell"},             # Full path tracing viable
    "reflex": {"pascal", "turing", "ampere", "ada", "hopper", "blackwell"},
    "nvenc_av1": {"ada", "blackwell"},                # AV1 hardware encode
    "tensorrt": {"pascal", "volta", "turing", "ampere", "ada", "hopper", "blackwell"},
    "cuda": {"pascal", "volta", "turing", "ampere", "ada", "hopper", "blackwell"},
    "rtx_video_sr": {"ampere", "ada", "blackwell"},   # RTX Video Super Resolution
    "rtx_video_hdr": {"ampere", "ada", "blackwell"},  # RTX Video HDR
}

# Human-friendly feature descriptions
FEATURE_INFO = {
    "rt_cores": {
        "name": "RT Cores (Ray Tracing)",
        "desc": "Hardware-accelerated ray tracing for realistic lighting, shadows, and reflections.",
        "impact": "Visual quality ↑↑, Performance ↓ (mitigated by DLSS)",
    },
    "tensor_cores": {
        "name": "Tensor Cores",
        "desc": "AI/ML accelerator cores used by DLSS, DLAA, and AI denoising.",
        "impact": "Enables all DLSS/AI features",
    },
    "dlss_2": {
        "name": "DLSS 2 (Super Resolution)",
        "desc": "AI-powered upscaling: renders at lower resolution, upscales to native quality using deep learning.",
        "impact": "Performance ↑↑ (up to 2x), Visual quality ≈ native",
    },
    "dlss_3": {
        "name": "DLSS 3 (Frame Generation)",
        "desc": "AI generates entirely new intermediate frames, effectively doubling FPS beyond GPU rendering speed.",
        "impact": "Performance ↑↑↑ (up to 4x with SR+FG), Latency ↑ (use with Reflex)",
    },
    "dlss_3_5": {
        "name": "DLSS 3.5 (Ray Reconstruction)",
        "desc": "Replaces hand-tuned denoisers with AI-powered ray reconstruction for cleaner RT at lower ray counts.",
        "impact": "RT quality ↑↑ at lower performance cost",
    },
    "dlss_4": {
        "name": "DLSS 4 (Multi Frame Generation)",
        "desc": "Generates up to 3 frames for every rendered frame, massive FPS boost with Blackwell architecture.",
        "impact": "Performance ↑↑↑↑ (up to 8x), Requires RTX 50 series",
    },
    "dlss_4_5": {
        "name": "DLSS 4.5 (Dynamic Frame Generation)",
        "desc": "Dynamically adjusts the number of generated frames based on scene complexity and motion.",
        "impact": "Smoothness ↑↑↑↑, Latency optimized",
    },
    "ray_tracing": {
        "name": "Ray Tracing",
        "desc": "Simulates realistic light behavior for shadows, reflections, and global illumination.",
        "impact": "Visual quality ↑↑↑, Performance ↓↓ (enable DLSS to compensate)",
    },
    "path_tracing": {
        "name": "Full Path Tracing",
        "desc": "Every light ray in the scene is physically simulated. Used in Cyberpunk 2077 RT Overdrive, Portal RTX.",
        "impact": "Visual quality ↑↑↑↑ (photorealistic), Very GPU intensive",
    },
    "reflex": {
        "name": "NVIDIA Reflex (Low Latency)",
        "desc": "Reduces render queue latency for more responsive input. Critical for competitive gaming.",
        "impact": "Latency ↓↓ (up to 50% lower), Essential with DLSS 3 Frame Gen",
    },
    "nvenc_av1": {
        "name": "NVENC AV1 Encoding",
        "desc": "Hardware AV1 video encoding for high-quality, low-bitrate game streaming and recording.",
        "impact": "Stream/record quality ↑ at lower bitrate, Near-zero performance impact",
    },
    "tensorrt": {
        "name": "TensorRT Inference",
        "desc": "Optimized AI inference engine. Converts models to run up to 10x faster on NVIDIA GPUs.",
        "impact": "AI model inference ↑↑↑ (10x faster YOLO, etc.)",
    },
    "cuda": {
        "name": "CUDA Compute",
        "desc": "General-purpose GPU computing. Foundation for all GPU-accelerated processing.",
        "impact": "Enables all GPU-accelerated features",
    },
    "rtx_video_sr": {
        "name": "RTX Video Super Resolution",
        "desc": "Uses AI to upscale low-resolution video and remove compression artifacts.",
        "impact": "Video quality ↑↑ (cleaner streams/videos)",
    },
    "rtx_video_hdr": {
        "name": "RTX Video HDR",
        "desc": "AI-powered SDR-to-HDR conversion for videos in your browser or players.",
        "impact": "Visual vibrance ↑↑ on HDR displays",
    },
}


class GPUCapabilities:
    """
    Detects NVIDIA GPU capabilities and supported technologies.
    """

    def __init__(self, device_index=None):
        if device_index is None:
            self._device_index = discover_best_gpu_index()
        else:
            self._device_index = device_index
        self._gpu_name = "Unknown"
        self._compute_capability = (0, 0)
        self._architecture = "unknown"
        self._generation = "unknown"
        self._vram_mb = 0
        self._driver_version = ""
        self._supported_features = {}
        
        self._detect()

    def _detect(self):
        """Detect GPU capabilities."""
        if not _NVML_AVAILABLE:
            logger.warning("pynvml not available. Trying nvidia-smi fallback.")
            self._detect_via_smi()
            return
        
        try:
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(self._device_index)
            
            # GPU name
            name = pynvml.nvmlDeviceGetName(handle)
            self._gpu_name = name.decode("utf-8") if isinstance(name, bytes) else name
            
            # VRAM
            mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
            self._vram_mb = mem.total // (1024 * 1024)
            
            # Driver
            driver = pynvml.nvmlSystemGetDriverVersion()
            self._driver_version = driver.decode("utf-8") if isinstance(driver, bytes) else driver
            
            # Compute capability
            try:
                major = pynvml.nvmlDeviceGetCudaComputeCapability(handle)
                if isinstance(major, tuple):
                    self._compute_capability = major
                else:
                    # Some versions return (major, minor) directly
                    minor = 0
                    self._compute_capability = (major, minor)
            except Exception:
                # Fallback: infer from GPU name
                self._compute_capability = self._infer_compute_capability(self._gpu_name)
            
            pynvml.nvmlShutdown()
        except Exception as e:
            logger.error(f"GPU detection failed: {e}")
            self._detect_via_smi()
        
        # Resolve architecture
        self._resolve_architecture()
        self._resolve_features()

    def _detect_via_smi(self):
        """Fallback: detect via nvidia-smi command."""
        import os
        import platform
        try:
            # Hide the console window on Windows
            si = None
            creationflags = 0
            if os.name == 'nt' or platform.system() == 'Windows':
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                si.wShowWindow = 0
                creationflags = 0x08000000

            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,driver_version,compute_cap",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5,
                startupinfo=si,
                creationflags=creationflags
            )
            if result.returncode == 0:
                parts = result.stdout.strip().split(",")
                if len(parts) >= 4:
                    self._gpu_name = parts[0].strip()
                    self._vram_mb = int(float(parts[1].strip()))
                    self._driver_version = parts[2].strip()
                    cc = parts[3].strip()
                    if "." in cc:
                        major, minor = cc.split(".")
                        self._compute_capability = (int(major), int(minor))
        except Exception as e:
            logger.error(f"nvidia-smi detection failed: {e}")

    def _infer_compute_capability(self, name):
        """Infer compute capability from GPU name."""
        name_upper = name.upper()
        if any(x in name_upper for x in ["RTX 50", "5090", "5080", "5070", "5060"]):
            return (10, 0)
        elif any(x in name_upper for x in ["RTX 40", "4090", "4080", "4070", "4060"]):
            return (8, 9)
        elif any(x in name_upper for x in ["RTX 30", "3090", "3080", "3070", "3060", "A100"]):
            return (8, 6)
        elif any(x in name_upper for x in ["RTX 20", "2080", "2070", "2060", "1660"]):
            return (7, 5)
        elif any(x in name_upper for x in ["V100", "TITAN V"]):
            return (7, 0)
        elif any(x in name_upper for x in ["GTX 10", "1080", "1070", "1060", "1050", "TITAN X"]):
            return (6, 1)
        return (7, 5)  # Default to Turing as safe bet

    def _resolve_architecture(self):
        """Map compute capability to architecture name."""
        cc = self._compute_capability
        if cc in GPU_ARCHITECTURES:
            self._architecture, self._generation = GPU_ARCHITECTURES[cc]
        else:
            # Find closest match
            for (maj, min_), (arch, gen) in sorted(GPU_ARCHITECTURES.items(), reverse=True):
                if cc[0] > maj or (cc[0] == maj and cc[1] >= min_):
                    self._architecture, self._generation = arch, gen
                    break

    def _resolve_features(self):
        """Determine which features this GPU supports."""
        self._supported_features = {}
        for feature_key, supported_gens in FEATURE_SUPPORT.items():
            supported = self._generation in supported_gens
            self._supported_features[feature_key] = {
                "supported": supported,
                **FEATURE_INFO.get(feature_key, {}),
            }

    # ── Public API ────────────────────────────────────────────────

    @property
    def gpu_name(self) -> str:
        return self._gpu_name

    @property
    def architecture(self) -> str:
        return self._architecture

    @property
    def generation(self) -> str:
        return self._generation

    @property
    def compute_capability(self) -> tuple:
        return self._compute_capability

    @property
    def vram_mb(self) -> int:
        return self._vram_mb

    @property
    def driver_version(self) -> str:
        return self._driver_version

    def supports(self, feature_key: str) -> bool:
        """Check if the GPU supports a specific feature."""
        feat = self._supported_features.get(feature_key, {})
        return feat.get("supported", False)

    def get_supported_features(self) -> dict:
        """Get all features with their support status."""
        return dict(self._supported_features)

    def get_supported_list(self) -> list:
        """Get list of supported feature keys."""
        return [k for k, v in self._supported_features.items() if v.get("supported")]

    def get_unsupported_list(self) -> list:
        """Get list of unsupported feature keys."""
        return [k for k, v in self._supported_features.items() if not v.get("supported")]

    def get_summary(self) -> dict:
        """Get a complete GPU summary."""
        return {
            "gpu_name": self._gpu_name,
            "architecture": self._architecture,
            "generation": self._generation,
            "compute_capability": f"{self._compute_capability[0]}.{self._compute_capability[1]}",
            "vram_mb": self._vram_mb,
            "driver_version": self._driver_version,
            "supported_features": self.get_supported_list(),
            "unsupported_features": self.get_unsupported_list(),
        }

    def print_report(self):
        """Print a human-readable capabilities report."""
        print(f"\n{'='*60}")
        print(f"  NVIDIA GPU Capabilities Report")
        print(f"{'='*60}")
        print(f"  GPU:            {self._gpu_name}")
        print(f"  Architecture:   {self._architecture}")
        print(f"  Compute:        {self._compute_capability[0]}.{self._compute_capability[1]}")
        print(f"  VRAM:           {self._vram_mb} MB")
        print(f"  Driver:         {self._driver_version}")
        print(f"{'─'*60}")
        print(f"  Feature Support:")
        for key, feat in self._supported_features.items():
            status = "✅" if feat["supported"] else "❌"
            name = feat.get("name", key)
            print(f"    {status} {name}")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    caps = GPUCapabilities()
    caps.print_report()
