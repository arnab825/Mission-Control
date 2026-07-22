"""
Dynamic GPU Capability Profiler
Profiles a GPU name to determine its architecture, maximum supported DLSS/FG versions,
and graphics feature compatibility. Uses local cache, Web Search + LLM, and robust fallbacks.
"""
import os
import re
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class GPUProfiler:
    def __init__(self, cache_dir: str = None):
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            self.cache_dir = Path(__file__).parent.parent / "data"
        self.cache_file = self.cache_dir / "gpu_profiles_cache.json"
        self._ensure_cache_exists()
        self.cache = self._load_cache()

    def _ensure_cache_exists(self):
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            if not self.cache_file.exists():
                self.cache_file.write_text(json.dumps({}, indent=2))
        except Exception as e:
            logger.warning(f"Failed to initialize GPU cache directory/file: {e}")

    def _load_cache(self) -> dict:
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error loading GPU profiles cache: {e}")
        return {}

    def _save_cache(self):
        try:
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            logger.warning(f"Error saving GPU profiles cache: {e}")

    def normalize_name(self, name: str) -> str:
        if not name:
            return ""
        # Remove common boilerplate terms, trailing spaces, trademark symbols, and normalize spacing
        name = name.lower()
        for term in ["nvidia", "geforce", "amd", "radeon", "intel", "graphics", "video", "adapter", "™", "®", "(r)", "(tm)"]:
            name = name.replace(term, "")
        name = " ".join(name.split())
        return name.strip()

    def get_fallback_profile(self, raw_name: str) -> dict:
        """Heuristics-based profile detection if search / LLM fails or is disabled."""
        name = raw_name.lower()
        profile = {
            "brand": "Other",
            "architecture": "Unknown",
            "max_dlss_quality": "None",
            "max_dlss_perf": "None",
            "max_fg": "None",
            "ray_tracing": False,
            "path_tracing": False,
            "reflex": False,
            "tier": "mid",
            "is_rtx": False
        }

        # 1. Brand detection
        if any(x in name for x in ["nvidia", "geforce", "rtx", "gtx", "quadro", "titan", "tesla"]):
            profile["brand"] = "NVIDIA"
        elif any(x in name for x in ["amd", "radeon", "ryzen", "rx "]):
            profile["brand"] = "AMD"
        elif any(x in name for x in ["intel", "arc", "iris", "uhd"]):
            profile["brand"] = "Intel"

        # 2. NVIDIA Specific Heuristics
        if profile["brand"] == "NVIDIA":
            profile["reflex"] = True # Supported on Maxwell/Pascal+
            # Check RTX/Ray Tracing
            if "rtx" in name or "quadro rtx" in name or "titan rtx" in name or "tesla" in name or any(x in name for x in ["2060", "2070", "2080", "3060", "3070", "3080", "3090", "4060", "4070", "4080", "4090", "5060", "5070", "5080", "5090"]):
                profile["is_rtx"] = True
                profile["ray_tracing"] = True
            
            # Check architectures, DLSS, and FG
            if any(x in name for x in ["5090", "5080", "5070", "5060"]) or (profile["is_rtx"] and "50" in name):
                profile["architecture"] = "Blackwell"
                profile["max_dlss_quality"] = "DLSS 4.5"
                profile["max_dlss_perf"] = "DLSS 4"
                profile["max_fg"] = "4x"
                profile["path_tracing"] = True
                profile["tier"] = "high"
            elif any(x in name for x in ["4090", "4080", "4070", "4060"]) or (profile["is_rtx"] and "40" in name):
                profile["architecture"] = "Ada Lovelace"
                profile["max_dlss_quality"] = "DLSS 3.5"
                profile["max_dlss_perf"] = "DLSS 3"
                profile["max_fg"] = "2x"
                profile["path_tracing"] = True
                profile["tier"] = "high" if not "4060" in name else "mid"
            elif any(x in name for x in ["3090", "3080", "3070", "3060"]) or (profile["is_rtx"] and "30" in name):
                profile["architecture"] = "Ampere"
                profile["max_dlss_quality"] = "DLSS 3.5"
                profile["max_dlss_perf"] = "DLSS 3"
                profile["max_fg"] = "None"
                profile["path_tracing"] = False
                profile["tier"] = "high" if any(x in name for x in ["3080", "3090"]) else "mid"
            elif any(x in name for x in ["2090", "2080", "2070", "2060"]) or (profile["is_rtx"] and "20" in name):
                profile["architecture"] = "Turing"
                profile["max_dlss_quality"] = "DLSS 2"
                profile["max_dlss_perf"] = "DLSS 2"
                profile["max_fg"] = "None"
                profile["path_tracing"] = False
                profile["tier"] = "mid"
            else:
                # GTX, Quadro non-RTX, etc.
                profile["is_rtx"] = False
                profile["ray_tracing"] = False
                profile["max_dlss_quality"] = "None"
                profile["max_dlss_perf"] = "None"
                profile["max_fg"] = "None"
                profile["path_tracing"] = False
                profile["tier"] = "low"
                if "1660" in name or "1650" in name:
                    profile["architecture"] = "Turing"
                    profile["tier"] = "mid"
                elif "1080" in name or "1070" in name or "1060" in name or "1050" in name:
                    profile["architecture"] = "Pascal"
                elif "980" in name or "970" in name or "960" in name:
                    profile["architecture"] = "Maxwell"

        # 3. AMD Specific Heuristics
        elif profile["brand"] == "AMD":
            if "rx 8" in name: # RX 8000 Series
                profile["architecture"] = "RDNA 4"
                profile["ray_tracing"] = True
                profile["tier"] = "high"
            elif "rx 7" in name: # RX 7000 Series
                profile["architecture"] = "RDNA 3"
                profile["ray_tracing"] = True
                profile["tier"] = "high" if any(x in name for x in ["7900", "7800"]) else "mid"
            elif "rx 6" in name: # RX 6000 Series
                profile["architecture"] = "RDNA 2"
                profile["ray_tracing"] = True
                profile["tier"] = "high" if any(x in name for x in ["6900", "6800"]) else "mid"
            elif "rx 5" in name or "vega" in name:
                profile["architecture"] = "GCN"
                profile["tier"] = "low"

        # 4. Intel Specific Heuristics
        elif profile["brand"] == "Intel":
            if "arc" in name:
                profile["architecture"] = "Alchemist"
                profile["ray_tracing"] = True
                profile["tier"] = "mid"
            else:
                profile["architecture"] = "Xe"
                profile["tier"] = "low"

        return profile

    def profile_gpu(self, gpu_name: str, config: dict = None) -> dict:
        """Profiles the GPU. Checks cache first, then tries search+LLM, falls back to heuristics."""
        if not gpu_name or gpu_name == "Unknown" or gpu_name == "Detecting...":
            return self.get_fallback_profile("Unknown")

        normalized = self.normalize_name(gpu_name)
        if not normalized:
            return self.get_fallback_profile(gpu_name)

        if normalized in self.cache:
            return self.cache[normalized]

        logger.info(f"GPU Profile cache miss for '{gpu_name}' (Normalized: '{normalized}'). Attempting dynamic profile...")

        config = config or {}
        profile = None

        # Check privacy shield before doing web search
        privacy_enabled = config.get("privacy", {}).get("enabled", False)
        if not privacy_enabled:
            try:
                # 1. Query Web Search
                from ai_brain.web_search import WebSearchEngine
                search_engine = WebSearchEngine(config)
                
                query = f"{gpu_name} specifications architecture DLSS Frame Generation Ray Tracing"
                search_res = search_engine.search(query, task="general")
                
                search_text = search_res.get("answer", "")
                if not search_text and search_res.get("results"):
                    search_text = "\n".join([r.get("content", "") for r in search_res["results"][:3]])

                if search_text:
                    # 2. Query LLM to parse specifications
                    from ai_brain.core_optimization_engine import CoreOptimizationEngine
                    opt_engine = CoreOptimizationEngine(config)
                    
                    if opt_engine.client:
                        system_instruction = (
                            "You are an expert hardware profiling agent. Given a GPU name and its web search snippets, "
                            "your job is to extract its specifications into a clean, valid JSON object. "
                            "You must follow the JSON schema strictly and return ONLY the JSON object, nothing else. "
                            "Do not wrap the response in markdown code blocks like ```json, just output raw JSON text.\n"
                            "JSON Schema:\n"
                            "{\n"
                            "  \"brand\": \"NVIDIA\" | \"AMD\" | \"Intel\" | \"Other\",\n"
                            "  \"architecture\": \"<arch name e.g. Blackwell, Ada Lovelace, RDNA 3, Alchemist, etc.>\",\n"
                            "  \"max_dlss_quality\": \"DLSS 4.5\" | \"DLSS 3.5\" | \"DLSS 2\" | \"None\",\n"
                            "  \"max_dlss_perf\": \"DLSS 4\" | \"DLSS 3\" | \"DLSS 2\" | \"None\",\n"
                            "  \"max_fg\": \"4x\" | \"2x\" | \"None\",\n"
                            "  \"ray_tracing\": true | false,\n"
                            "  \"path_tracing\": true | false,\n"
                            "  \"reflex\": true | false,\n"
                            "  \"tier\": \"high\" | \"mid\" | \"low\",\n"
                            "  \"is_rtx\": true | false\n"
                            "}"
                        )
                        
                        user_prompt = f"GPU Name: {gpu_name}\nSearch Context:\n{search_text}"
                        
                        response = opt_engine.client.chat.completions.create(
                            model=opt_engine.model_id,
                            messages=[
                                {"role": "system", "content": system_instruction},
                                {"role": "user", "content": user_prompt}
                            ],
                            temperature=0.1,
                            max_tokens=300
                        )
                        
                        raw_response = response.choices[0].message.content.strip()
                        # Strip code block wrappers if LLM still returned them
                        if raw_response.startswith("```"):
                            raw_response = re.sub(r"^```(?:json)?\n", "", raw_response)
                            raw_response = re.sub(r"\n```$", "", raw_response)
                        
                        parsed = json.loads(raw_response)
                        # Validate basic fields exist
                        required_fields = ["brand", "architecture", "max_dlss_quality", "max_dlss_perf", "max_fg", "ray_tracing", "path_tracing", "reflex", "tier", "is_rtx"]
                        if all(f in parsed for f in required_fields):
                            profile = parsed
                            logger.info(f"Successfully profiled GPU '{gpu_name}' dynamically using Search + LLM.")
            except Exception as e:
                logger.warning(f"Dynamic GPU profiling via Search+LLM failed: {e}. Falling back to heuristics.")

        if not profile:
            # Fallback to local heuristic checks
            profile = self.get_fallback_profile(gpu_name)
            logger.info(f"Applied heuristic fallback profile for GPU '{gpu_name}'.")

        # Save to cache
        self.cache[normalized] = profile
        self._save_cache()
        return profile
