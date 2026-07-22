import logging
from system.hw_checker import HardwareChecker

logger = logging.getLogger(__name__)

class GamingReadinessEngine:
    def __init__(self, config=None):
        self.config = config or {}
        self.hw_checker = HardwareChecker(self.config)
        
        import json
        from pathlib import Path
        app_data_path = self.config.get("system", {}).get("app_data_path")
        if app_data_path:
            base_dir = Path(app_data_path)
        else:
            base_dir = Path(__file__).parent.parent
        self.cache_file = base_dir / "config" / "readiness_cache.json"

    def evaluate_readiness(self, force_refresh=False):
        """
        Gathers hardware specs and evaluates them against minimum/recommended
        requirements, calculating a Gaming Readiness Score and determining
        feature compatibility. Uses a local JSON cache to bypass slow checks.
        """
        import json
        import platform
        if not force_refresh and self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    
                    cpu_name = platform.processor()
                    gpu_name = self.hw_checker.gpu_caps.gpu_name
                    
                    cached_specs = cached.get("specs", {})
                    if cached_specs.get("cpu") == cpu_name and cached_specs.get("gpu") == gpu_name:
                        logger.info("Serving gaming readiness from cache (hardware unchanged)")
                        return cached.get("readiness")
            except Exception as exc:
                logger.warning("Failed to load readiness cache: %s", exc)

        try:
            specs = self.hw_checker.get_system_specs()
            
            os_eval = self._evaluate_os(specs.get("os_details", {}))
            cpu_eval = self._evaluate_cpu(specs.get("hardware", {}))
            ram_eval = self._evaluate_ram(specs.get("hardware", {}))
            gpu_eval = self._evaluate_gpu(specs.get("hardware", {}), specs.get("vram_gb", 0))
            storage_eval = self._evaluate_storage(specs.get("hardware", {}))
            
            score = self._calculate_score(os_eval, cpu_eval, ram_eval, gpu_eval, storage_eval)
            features = self._evaluate_features(gpu_eval, cpu_eval)
            
            result = {
                "score": score,
                "components": {
                    "os": os_eval,
                    "cpu": cpu_eval,
                    "ram": ram_eval,
                    "gpu": gpu_eval,
                    "storage": storage_eval
                },
                "features": features
            }
            
            # Save to cache
            try:
                self.cache_file.parent.mkdir(parents=True, exist_ok=True)
                with open(self.cache_file, "w", encoding="utf-8") as f:
                    json.dump({
                        "specs": {
                            "cpu": platform.processor(),
                            "gpu": self.hw_checker.gpu_caps.gpu_name
                        },
                        "readiness": result
                    }, f, indent=4)
            except Exception as exc:
                logger.error("Failed to save readiness cache: %s", exc)
                
            return result
        except Exception as e:
            logger.error(f"Error evaluating gaming readiness: {e}", exc_info=True)
            return {"error": str(e)}

    def _evaluate_os(self, os_details):
        edition = os_details.get("edition", "Unknown OS")
        version = os_details.get("version", "Unknown Version")
        
        # Simple evaluation logic
        is_win11 = "Windows 11" in edition
        is_win10 = "Windows 10" in edition
        
        status = "fail"
        reason = "Unsupported OS. Windows 10 (64-bit) or higher is required."
        if is_win11:
            status = "pass"
            reason = "Windows 11 provides the latest gaming optimizations and DirectStorage support."
        elif is_win10:
            status = "warn"
            reason = "Windows 10 is supported, but Windows 11 is recommended for optimal performance."
            
        return {
            "name": edition,
            "version": version,
            "min_req": "Windows 10 (64-bit)",
            "rec_req": "Windows 11",
            "status": status,
            "reason": reason,
            "score_impact": 100 if is_win11 else (80 if is_win10 else 0)
        }

    def _evaluate_cpu(self, hw):
        name = hw.get("cpu", "Unknown CPU")
        cores = hw.get("cores", 0)
        
        status = "fail"
        reason = "CPU does not meet the minimum requirement of 4 physical cores."
        score_impact = 0
        
        if cores >= 6:
            status = "pass"
            reason = f"{cores} Physical Cores provide more than sufficient processing capability for real-time HUD, Vision processing, and background services."
            score_impact = 100
        elif cores >= 4:
            status = "warn"
            reason = "4 Physical Cores meet minimum requirements, but heavier AI features might experience reduced performance."
            score_impact = 70
            
        return {
            "name": name,
            "min_req": "4 Physical Cores",
            "rec_req": "6+ Physical Cores",
            "status": status,
            "reason": reason,
            "score_impact": score_impact
        }

    def _evaluate_ram(self, hw):
        ram_str = hw.get("ram", "0GB")
        ram_gb = 0
        try:
            import re
            ram_gb = int(re.sub(r"[^\d]", "", ram_str))
        except:
            pass
            
        status = "fail"
        reason = "Less than 8 GB of RAM detected. Stuttering and instability are highly likely."
        score_impact = 0
        
        if ram_gb >= 16:
            status = "pass"
            reason = "Sufficient memory for simultaneous game execution, overlay rendering, and Vision analysis."
            score_impact = 100
        elif ram_gb >= 8:
            status = "warn"
            reason = "8 GB meets minimum requirements, but you may need to close background apps for optimal performance."
            score_impact = 70
            
        return {
            "name": f"{ram_gb} GB",
            "min_req": "8 GB",
            "rec_req": "16 GB",
            "status": status,
            "reason": reason,
            "score_impact": score_impact
        }

    def _evaluate_gpu(self, hw, vram_gb):
        name = hw.get("gpu", "Unknown GPU")
        
        # Analyze GPU family based on name
        name_upper = name.upper()
        
        is_rtx = "RTX" in name_upper
        is_gtx = "GTX" in name_upper
        
        status = "fail"
        reason = "Unsupported GPU. An NVIDIA GPU (GTX 10-series or newer) is required for core features."
        score_impact = 0
        
        if is_rtx:
            status = "pass"
            reason = "Supports all required NVIDIA APIs, Tensor cores for AI, and advanced rendering technologies."
            score_impact = 100
        elif is_gtx and any(x in name_upper for x in ["1050", "1060", "1070", "1080", "1650", "1660"]):
            status = "warn"
            reason = "GTX series GPUs have limited support. AI Vision analysis may run significantly slower without Tensor cores."
            score_impact = 60
            
        return {
            "name": name,
            "min_req": "NVIDIA GTX 10-Series",
            "rec_req": "NVIDIA RTX 20-Series or newer",
            "status": status,
            "reason": reason,
            "score_impact": score_impact
        }

    def _evaluate_storage(self, hw):
        # We will check if it's an SSD and roughly space available.
        # hw.get("storage_details") might be helpful
        details = hw.get("storage_details", [])
        is_ssd = False
        if details and len(details) > 0:
            is_ssd = details[0].get("type", "").upper() == "SSD"
            name = details[0].get("name", "Unknown Drive")
        else:
            name = hw.get("storage", "Unknown Storage")
            is_ssd = "SSD" in name.upper() or "NVME" in name.upper()
            
        status = "warn" if not is_ssd else "pass"
        reason = "HDD detected. Game loading times and real-time asset streaming may be severely impacted." if not is_ssd else "SSD storage ensures fast loading and smooth asset streaming."
        score_impact = 50 if not is_ssd else 100
        
        return {
            "name": name,
            "min_req": "SATA Drive",
            "rec_req": "NVMe / SATA SSD",
            "status": status,
            "reason": reason,
            "score_impact": score_impact
        }

    def _calculate_score(self, os_eval, cpu_eval, ram_eval, gpu_eval, storage_eval):
        # Weights: CPU 25%, GPU 35%, RAM 15%, Storage 10%, OS 5%, Drivers 10%
        # For now, we wrap driver score into GPU score (so GPU is 45% total effectively)
        
        score = (
            (cpu_eval["score_impact"] * 0.25) +
            (gpu_eval["score_impact"] * 0.45) +
            (ram_eval["score_impact"] * 0.15) +
            (storage_eval["score_impact"] * 0.10) +
            (os_eval["score_impact"] * 0.05)
        )
        return int(score)

    def _evaluate_features(self, gpu_eval, cpu_eval):
        return [
            {
                "name": "Gaming Library",
                "status": "Fully Supported",
                "reason": "Basic application features are supported on all hardware."
            },
            {
                "name": "HUD Overlay",
                "status": "Fully Supported",
                "reason": "Hardware-accelerated overlay is supported."
            },
            {
                "name": "Performance Monitoring",
                "status": "Fully Supported",
                "reason": "System telemetry APIs are available."
            },
            {
                "name": "Vision Analysis",
                "status": "Fully Supported" if gpu_eval["status"] == "pass" else ("Reduced Performance" if gpu_eval["status"] == "warn" else "Unsupported"),
                "reason": "Vision processing uses Tensor cores on RTX GPUs for real-time inference. Runs in fallback mode on GTX." if gpu_eval["status"] != "fail" else "Requires a supported NVIDIA GPU."
            },
            {
                "name": "Future AI Assistant",
                "status": "Fully Supported",
                "reason": "Cloud-based AI requires minimal local hardware."
            },
            {
                "name": "Future Recording Features",
                "status": "Unsupported",
                "reason": "Feature currently in development."
            }
        ]
