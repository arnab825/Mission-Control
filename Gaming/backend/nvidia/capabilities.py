"""
Multi-Vendor GPU capabilities detection (NVIDIA, AMD, Intel).
Identifies which technologies the user's GPU supports:
DLSS, FSR, XeSS, Ray Tracing, Frame Generation, Reflex, Anti-Lag, etc.
"""
import subprocess
import re
import logging
import platform

logger = logging.getLogger(__name__)

_NVML_AVAILABLE = False
try:
    import pynvml
    _NVML_AVAILABLE = True
except ImportError:
    pass

def discover_best_gpu_index():
    """
    Finds the index of the best available NVIDIA GPU if available.
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


def _get_wmi_gpus():
    """Fallback method to detect GPU names via WMI on Windows."""
    gpus = []
    if platform.system() == "Windows":
        try:
            result = subprocess.run(
                ["wmic", "path", "win32_VideoController", "get", "name"],
                capture_output=True, text=True, creationflags=0x08000000
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split("\n")
                for line in lines[1:]:
                    name = line.strip()
                    if name:
                        gpus.append(name)
        except Exception as e:
            logger.warning(f"WMI GPU detection failed: {e}")
    return gpus

# ── Feature Database ──────────────────────────────────────

FEATURE_INFO = {
    # Cross-platform / Generic
    "ray_tracing": {
        "name": "Hardware Ray Tracing",
        "desc": "Simulates realistic light behavior for shadows, reflections, and global illumination.",
        "impact": "Visual quality ↑↑↑, Performance ↓↓",
    },
    # NVIDIA
    "tensor_cores": {
        "name": "Tensor Cores",
        "desc": "AI/ML accelerator cores used by DLSS, DLAA, and AI denoising.",
        "impact": "Enables all DLSS/AI features",
    },
    "dlss_2": {
        "name": "DLSS 2 (Super Resolution)",
        "desc": "NVIDIA AI-powered upscaling.",
        "impact": "Performance ↑↑, Visual quality ≈ native",
    },
    "dlss_3": {
        "name": "DLSS 3 (Frame Generation)",
        "desc": "AI generates intermediate frames.",
        "impact": "Performance ↑↑↑, Requires Reflex",
    },
    "dlss_3_5": {
        "name": "DLSS 3.5 (Ray Reconstruction)",
        "desc": "AI-powered ray reconstruction for cleaner RT.",
        "impact": "RT quality ↑↑",
    },
    "reflex": {
        "name": "NVIDIA Reflex",
        "desc": "Reduces render queue latency.",
        "impact": "Latency ↓↓",
    },
    "nvenc_av1": {
        "name": "NVENC AV1",
        "desc": "Hardware AV1 video encoding.",
        "impact": "Stream quality ↑",
    },
    # AMD
    "fsr_2": {
        "name": "FSR 2 (Super Resolution)",
        "desc": "AMD spatial and temporal upscaling.",
        "impact": "Performance ↑↑",
    },
    "fsr_3": {
        "name": "FSR 3 (Frame Generation)",
        "desc": "AMD temporal upscaling with Frame Generation.",
        "impact": "Performance ↑↑↑",
    },
    "afmf": {
        "name": "AMD Fluid Motion Frames (AFMF)",
        "desc": "Driver-level frame generation for any game.",
        "impact": "Performance ↑↑, Latency ↑",
    },
    "anti_lag": {
        "name": "Radeon Anti-Lag",
        "desc": "Reduces input-to-response latency.",
        "impact": "Latency ↓",
    },
    "anti_lag_2": {
        "name": "Radeon Anti-Lag 2",
        "desc": "Game-integrated low latency.",
        "impact": "Latency ↓↓",
    },
    "amf_av1": {
        "name": "AMF AV1",
        "desc": "AMD Advanced Media Framework AV1 encoding.",
        "impact": "Stream quality ↑",
    },
    # Intel
    "xess_1_3": {
        "name": "Intel XeSS 1.3",
        "desc": "AI-enhanced upscaling powered by XMX.",
        "impact": "Performance ↑↑",
    },
    "extrass": {
        "name": "Intel ExtraSS",
        "desc": "Intel Frame Generation.",
        "impact": "Performance ↑↑↑",
    },
    "smooth_sync": {
        "name": "Intel SmoothSync",
        "desc": "Reduces screen tearing visually without VSync latency.",
        "impact": "Tearing ↓, Latency unaffected",
    },
    "qsv_av1": {
        "name": "Intel QuickSync AV1",
        "desc": "Intel hardware AV1 encoding.",
        "impact": "Stream quality ↑",
    },
}

class GPUCapabilities:
    """
    Detects GPU capabilities and supported technologies for NVIDIA, AMD, and Intel.
    """

    def __init__(self, device_index=None):
        self._device_index = device_index if device_index is not None else discover_best_gpu_index()
        self._gpu_name = "Unknown"
        self._vendor = "unknown"
        self._architecture = "unknown"
        self._generation = "unknown"
        self._vram_mb = 0
        self._driver_version = ""
        self._supported_features = {}
        
        self._detect()

    def _detect(self):
        """Detect GPU capabilities."""
        # 1. Try NVML first for NVIDIA GPUs
        nvidia_detected = False
        if _NVML_AVAILABLE:
            try:
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(self._device_index)
                
                name = pynvml.nvmlDeviceGetName(handle)
                self._gpu_name = name.decode("utf-8") if isinstance(name, bytes) else name
                self._vendor = "nvidia"
                
                mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                self._vram_mb = mem.total // (1024 * 1024)
                
                driver = pynvml.nvmlSystemGetDriverVersion()
                self._driver_version = driver.decode("utf-8") if isinstance(driver, bytes) else driver
                
                pynvml.nvmlShutdown()
                nvidia_detected = True
            except Exception as e:
                pass
                
        # 2. If not NVIDIA, try to detect AMD/Intel via WMI
        if not nvidia_detected:
            gpus = _get_wmi_gpus()
            # Prioritize dedicated GPUs if possible
            for name in gpus:
                if "NVIDIA" in name.upper() or "AMD" in name.upper() or "RADEON" in name.upper() or "INTEL ARC" in name.upper() or "INTEL(R) ARC" in name.upper():
                    self._gpu_name = name
                    break
            if self._gpu_name == "Unknown" and gpus:
                self._gpu_name = gpus[0]
                
            name_upper = self._gpu_name.upper()
            if "NVIDIA" in name_upper:
                self._vendor = "nvidia"
            elif "AMD" in name_upper or "RADEON" in name_upper:
                self._vendor = "amd"
            elif "INTEL" in name_upper or "ARC" in name_upper:
                self._vendor = "intel"
            else:
                self._vendor = "generic"

        # Resolve architecture and features based on vendor and name
        self._resolve_architecture()
        self._resolve_features()

    def _resolve_architecture(self):
        """Infer architecture and generation from GPU name."""
        name_upper = self._gpu_name.upper()
        
        if self._vendor == "nvidia":
            if any(x in name_upper for x in ["RTX 50", "5090", "5080", "5070", "5060"]):
                self._architecture, self._generation = "Blackwell", "blackwell"
            elif any(x in name_upper for x in ["RTX 40", "4090", "4080", "4070", "4060"]):
                self._architecture, self._generation = "Ada Lovelace", "ada"
            elif any(x in name_upper for x in ["RTX 30", "3090", "3080", "3070", "3060", "A100"]):
                self._architecture, self._generation = "Ampere", "ampere"
            elif any(x in name_upper for x in ["RTX 20", "2080", "2070", "2060", "1660"]):
                self._architecture, self._generation = "Turing", "turing"
            elif any(x in name_upper for x in ["GTX 10", "1080", "1070", "1060", "1050", "TITAN X"]):
                self._architecture, self._generation = "Pascal", "pascal"
            else:
                self._architecture, self._generation = "Unknown NVIDIA", "unknown"
                
        elif self._vendor == "amd":
            if any(x in name_upper for x in ["RX 8000", "8900", "8800", "8700"]):
                self._architecture, self._generation = "RDNA 4", "rdna4"
            elif any(x in name_upper for x in ["RX 7000", "7900", "7800", "7700", "7600"]):
                self._architecture, self._generation = "RDNA 3", "rdna3"
            elif any(x in name_upper for x in ["RX 6000", "6900", "6800", "6700", "6600", "6500"]):
                self._architecture, self._generation = "RDNA 2", "rdna2"
            elif any(x in name_upper for x in ["RX 5000", "5700", "5600", "5500"]):
                self._architecture, self._generation = "RDNA 1", "rdna1"
            elif "VEGA" in name_upper or "RADEON VII" in name_upper:
                self._architecture, self._generation = "Vega", "vega"
            elif any(x in name_upper for x in ["RX 590", "RX 580", "RX 570", "RX 480", "RX 470"]):
                self._architecture, self._generation = "Polaris", "polaris"
            else:
                self._architecture, self._generation = "AMD Generic", "unknown"
                
        elif self._vendor == "intel":
            if "B-SERIES" in name_upper or "B580" in name_upper or "B570" in name_upper:
                self._architecture, self._generation = "Battlemage (Xe2)", "battlemage"
            elif "ARC" in name_upper and any(x in name_upper for x in ["A770", "A750", "A580", "A380"]):
                self._architecture, self._generation = "Alchemist (Xe-HPG)", "alchemist"
            elif "IRIS XE" in name_upper or "UHD" in name_upper:
                self._architecture, self._generation = "Xe-LP", "xelp"
            else:
                self._architecture, self._generation = "Intel Generic", "unknown"

    def _resolve_features(self):
        """Determine which features this GPU supports based on vendor and generation."""
        self._supported_features = {}
        
        # Initialize all features as unsupported
        for feature_key, info in FEATURE_INFO.items():
            self._supported_features[feature_key] = {
                "supported": False,
                **info
            }
            
        gen = self._generation
        
        if self._vendor == "nvidia":
            has_rt = gen in ["turing", "ampere", "ada", "hopper", "blackwell"]
            has_tensor = gen in ["volta", "turing", "ampere", "ada", "hopper", "blackwell"]
            
            self._set_supported("ray_tracing", has_rt)
            self._set_supported("tensor_cores", has_tensor)
            self._set_supported("dlss_2", has_tensor)
            self._set_supported("dlss_3", gen in ["ada", "blackwell"])
            self._set_supported("dlss_3_5", has_tensor)
            self._set_supported("reflex", True)
            self._set_supported("nvenc_av1", gen in ["ada", "blackwell"])
            self._set_supported("fsr_2", True) # NVIDIA supports FSR 2
            
        elif self._vendor == "amd":
            has_rt = gen in ["rdna2", "rdna3", "rdna4"]
            
            self._set_supported("ray_tracing", has_rt)
            self._set_supported("fsr_2", True)
            self._set_supported("fsr_3", True)
            self._set_supported("afmf", gen in ["rdna2", "rdna3", "rdna4"])
            self._set_supported("anti_lag", True)
            self._set_supported("anti_lag_2", gen in ["rdna3", "rdna4"])
            self._set_supported("amf_av1", gen in ["rdna3", "rdna4"])
            
        elif self._vendor == "intel":
            has_rt = gen in ["alchemist", "battlemage"]
            
            self._set_supported("ray_tracing", has_rt)
            self._set_supported("xess_1_3", gen in ["alchemist", "battlemage", "xelp"])
            self._set_supported("extrass", gen in ["alchemist", "battlemage"])
            self._set_supported("smooth_sync", gen in ["alchemist", "battlemage"])
            self._set_supported("qsv_av1", gen in ["alchemist", "battlemage"])
            self._set_supported("fsr_2", True) # Intel supports FSR 2
            
        else:
            # Generic fallback
            self._set_supported("fsr_2", True)

    def _set_supported(self, feature_key: str, supported: bool):
        if feature_key in self._supported_features:
            self._supported_features[feature_key]["supported"] = supported

    # ── Public API ────────────────────────────────────────────────

    @property
    def gpu_name(self) -> str:
        return self._gpu_name
        
    @property
    def vendor(self) -> str:
        return self._vendor

    @property
    def architecture(self) -> str:
        return self._architecture

    @property
    def generation(self) -> str:
        return self._generation

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
            "vendor": self._vendor,
            "architecture": self._architecture,
            "generation": self._generation,
            "vram_mb": self._vram_mb,
            "driver_version": self._driver_version,
            "supported_features": self.get_supported_list(),
            "unsupported_features": self.get_unsupported_list(),
        }

    def print_report(self):
        """Print a human-readable capabilities report."""
        print(f"\n{'='*60}")
        print(f"  GPU Capabilities Report")
        print(f"{'='*60}")
        print(f"  GPU:            {self._gpu_name}")
        print(f"  Vendor:         {self._vendor.upper()}")
        print(f"  Architecture:   {self._architecture}")
        print(f"  Generation:     {self._generation}")
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
