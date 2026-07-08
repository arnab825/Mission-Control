import os
import sys
import logging
import json

logger = logging.getLogger(__name__)

# Fallback setup for Windows SSL issue handling similar to decision_maker.py
def _prepare_windows_ssl_runtime() -> None:
    """Prefer Python's own OpenSSL runtime on Windows before importing OpenAI SDK."""
    if sys.platform != "win32":
        return
    try:
        dll_dirs = []
        base_prefix = os.path.abspath(sys.base_prefix)
        dll_dirs.append(os.path.join(base_prefix, "DLLs"))
        dll_dirs.append(os.path.join(base_prefix, "Library", "bin"))
        exe_dir = os.path.dirname(sys.executable)
        dll_dirs.append(exe_dir)

        # Register DLL search directories first (best effort).
        for d in dll_dirs:
            if os.path.isdir(d):
                try:
                    os.add_dll_directory(d)
                except Exception:
                    pass

        # De-prioritize common non-Python OpenSSL locations from PATH.
        path_parts = os.environ.get("PATH", "").split(os.pathsep)
        blocked_markers = (
            "git\\usr\\bin",
            "git\\mingw64\\bin",
            "openssl\\bin",
            "\\windows\\system32",
        )
        preferred = []
        fallback = []
        for p in path_parts:
            norm = p.lower().replace("/", "\\")
            if any(marker in norm for marker in blocked_markers):
                fallback.append(p)
            else:
                preferred.append(p)
        os.environ["PATH"] = os.pathsep.join(preferred + fallback)
    except Exception as e:
        logger.debug("Windows SSL runtime preparation failed: %s", e)

class CoreOptimizationEngine:
    """
    Core Optimization Engine for high-performance gaming application.
    Analyzes hardware specs and game presets to provide optimization pathways.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self.client = None
        self._init_nim_client()

    def _init_nim_client(self):
        _prepare_windows_ssl_runtime()
        import httpx
        from openai import OpenAI
        
        agent_cfg = self.config.get("ai_agent", {})
        api_key = agent_cfg.get("nvidia_api_key") or os.environ.get("NVIDIA_API_KEY") or os.environ.get("AI_GAMING_ASSISTANT_NVIDIA_API_KEY")
        base_url = agent_cfg.get("endpoint_url") or os.environ.get("NVIDIA_ENDPOINT_URL", "https://integrate.api.nvidia.com/v1")
        self.model_id = agent_cfg.get("model_id") or "meta/llama-3.3-70b-instruct"
        
        invalid_keys = ["YOUR_NVIDIA_API_KEY_HERE", "your_nvidia_api_key_here", "", None]
        if api_key and api_key.strip() not in invalid_keys:
            try:
                # Some Windows environments ship conflicting OpenSSL runtimes that
                # crash native TLS initialization ("OPENSSL_Uplink ... no OPENSSL_Applink").
                # We dynamically probe if native SSL/TLS works without crashing by running a quick probe in a subprocess.
                # If the probe succeeds, we use native TLS safely. Otherwise, we fall back to an insecure client.
                needs_insecure_fallback = False
                if sys.platform == "win32" and agent_cfg.get("insecure_tls_windows_fallback", True):
                    try:
                        import subprocess
                        code = (
                            "import sys\n"
                            "import ssl\n"
                            "try:\n"
                            "    ctx = ssl.create_default_context()\n"
                            "    ctx.load_default_certs()\n"
                            "    sys.exit(0)\n"
                            "except Exception:\n"
                            "    sys.exit(0)\n"
                        )
                        result = subprocess.run(
                            [sys.executable, "-c", code],
                            capture_output=True,
                            timeout=1.5,
                            creationflags=0x08000000
                        )
                        needs_insecure_fallback = (result.returncode != 0)
                    except Exception:
                        needs_insecure_fallback = True

                use_insecure_tls = (
                    sys.platform == "win32"
                    and needs_insecure_fallback
                    and not self.config.get("privacy", {}).get("enabled", False)
                )
                if use_insecure_tls:
                    logger.warning(
                        "Using insecure TLS fallback for NVIDIA NIM on Windows due to OpenSSL runtime mismatch."
                    )
                    chat_http = httpx.Client(verify=False, timeout=60.0)
                    self.client = OpenAI(base_url=base_url, api_key=api_key, http_client=chat_http, max_retries=0, timeout=60.0)
                else:
                    self.client = OpenAI(base_url=base_url, api_key=api_key, max_retries=0, timeout=60.0)
            except Exception as e:
                logger.error(f"Failed to initialize NVIDIA NIM client for optimization: {e}")
                self.client = None
        else:
            logger.warning("No valid NVIDIA_API_KEY found for Core Optimization Engine.")
            self.client = None

    def get_optimization_advice(self, hardware_str: str, game_title: str, detected_presets: str) -> str:
        """
        Calls the LLM with the optimization prompt structure.
        """
        if not self.client:
            return "Optimization Engine Offline: No valid AI API Key found."

        system_instruction = (
            "Role & Objective: You are the Core Optimization Engine for a high-performance gaming application. "
            "Your objective is to analyze a user's hardware specifications, detect their game's current default presets, "
            "and provide actionable optimization pathways. You must be precise, hardware-aware, and focused on maximizing both frame rates (FPS) and graphical stability.\n\n"
            "Operational Guidelines:\n"
            "- Assess the Baseline: Quickly evaluate if the 'Detected Presets' are bottlenecking the 'User Hardware'.\n"
            "- Offer Two Pathways: Always provide the user with two distinct options: Auto-Optimize and Custom Tune.\n"
            "- Explain the 'Why': When suggesting a change, briefly explain its impact on the system.\n\n"
            "Response Structure Protocol:\n"
            "1. System & Preset Analysis: 1-2 sentence verdict on how presets match hardware.\n"
            "2. Option A: Auto-Optimize (The 1-Click Solution): Balanced preset for 60+ FPS at native resolution, formatted as Before & After.\n"
            "3. Option B: Custom Tune (The Power User Guide): Break down into FPS Killers (Turn Down First), Visual Anchors (Keep High), and CPU vs GPU Intensive.\n\n"
            "Tone: Professional, concise, and technical. Avoid fluff. Speak directly to a PC gamer who values performance."
        )

        nvidia_cfg = self.config.get("nvidia", {})
        target_preset = nvidia_cfg.get("preset", "custom")
        features = nvidia_cfg.get("gaming_features", {})

        # Resolve intent against game capabilities
        from core.capabilities_registry import GameCapabilitiesRegistry
        from core.resolution_engine import ResolutionEngine
        
        registry = GameCapabilitiesRegistry(self.config)
        engine = ResolutionEngine(registry)
        
        preset_intent = {
            "upscaling": "dlss" if features.get("dlss") else "native",
            "ray_tracing": features.get("ray_tracing"),
            "path_tracing": features.get("path_tracing"),
            "frame_generation": features.get("frame_gen"),
            "quality_preset": target_preset
        }
        
        effective_settings = engine.resolve_settings(game_title, preset_intent)
        
        # Build effective features string
        eff_features = []
        if effective_settings.get("upscaling") == "dlss": eff_features.append("DLSS")
        elif effective_settings.get("upscaling") == "fsr": eff_features.append("FSR")
        if effective_settings.get("ray_tracing"): eff_features.append("Ray Tracing")
        if effective_settings.get("frame_generation"): eff_features.append("Frame Generation")
        if features.get("reflex") and registry.supports_feature(game_title, "reflex"): eff_features.append("Reflex")
        if features.get("hdr") and registry.supports_feature(game_title, "hdr"): eff_features.append("HDR")
        
        eff_features_str = ", ".join(eff_features) if eff_features else "Native/Rasterization Only"

        user_prompt = (
            f"Target Game: {game_title}\n"
            f"User Hardware: {hardware_str}\n"
            f"Detected Presets: {detected_presets}\n"
            f"User's Target Global NVIDIA Preset: {target_preset}\n"
            f"Game-Supported Effective Technologies: {eff_features_str}\n\n"
            f"Please generate the optimization report considering ONLY the Game-Supported Effective Technologies."
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model_id,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Failed to fetch optimization advice: {e}")
            return f"Error communicating with AI Optimization Engine: {e}"
