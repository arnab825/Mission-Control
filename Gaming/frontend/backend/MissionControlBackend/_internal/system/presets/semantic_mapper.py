import logging
import json
import difflib
import os
from typing import Optional
from .schema import GamePresetState, QualityLevel, Toggle

logger = logging.getLogger(__name__)

# Heuristic synonym dictionary
# Maps Universal Schema keys to common game engine property names.
FEATURE_SYNONYMS = {
    "resolution": ["resolution", "screen_size", "display_resolution", "res"],
    "vsync": ["vsync", "v_sync", "vertical_sync", "waitforverticalsync"],
    "fps_limit": ["fps_limit", "max_fps", "framerate_limit", "maxfps", "framelimit"],
    "hdr": ["hdr", "high_dynamic_range", "hdr10", "hdr_enabled"],
    "dlss_mode": ["dlss", "dlss_mode", "dlssmode", "dlss_quality", "dlss_superresolution"],
    "fsr_mode": ["fsr", "fsr_mode", "fsrmode", "fsr_quality", "fidelityfx_super_resolution"],
    "frame_gen": ["frame_generation", "framegen", "dlssg", "dlss_g", "fg_enabled"],
    "reflex": ["reflex", "nv_reflex", "nvidia_reflex", "low_latency_mode"],
    "shadow_quality": ["shadow_quality", "shadows", "cascaded_shadows", "shadowres", "sg.shadowquality", "shadow"],
    "ambient_occlusion": ["ambient_occlusion", "ao", "ssao", "hbao", "sg.ambientocclusion"],
    "reflection_quality": ["reflection_quality", "reflections", "ssr", "screen_space_reflections", "sg.reflectionquality"],
    "ray_tracing": ["ray_tracing", "rtx", "raytracing", "rt_enabled"],
    "path_tracing": ["path_tracing", "pathtracing", "overdrive", "pt_enabled"],
    "texture_quality": ["texture_quality", "textures", "sg.texturequality", "texture_res", "texture"],
    "anisotropic_filtering": ["anisotropic_filtering", "aniso", "af", "texture_filtering"],
    "motion_blur": ["motion_blur", "blur", "sg.motionblur"],
    "depth_of_field": ["depth_of_field", "dof", "sg.depthoffield"],
    "anti_aliasing": ["anti_aliasing", "aa", "sg.antialiasing", "post_process_aa"]
}

class SemanticMapper:
    """
    Zero-config heuristic and LLM-assisted config parser.
    Maps an arbitrary game config dictionary to the Universal GamePresetState.
    """
    def __init__(self, use_llm_fallback=True):
        self.use_llm_fallback = use_llm_fallback
        
    def _fuzzy_match_key(self, raw_key: str) -> str | None:
        """Finds the best matching Universal Schema key for a raw config key."""
        raw_key_clean = raw_key.lower().replace("-", "_").replace(" ", "_")
        
        # Direct substring match
        for schema_key, synonyms in FEATURE_SYNONYMS.items():
            if any(syn in raw_key_clean for syn in synonyms):
                return schema_key
                
        # DiffLib fallback
        best_match = None
        best_score = 0.0
        for schema_key, synonyms in FEATURE_SYNONYMS.items():
            matches = difflib.get_close_matches(raw_key_clean, synonyms, n=1, cutoff=0.8)
            if matches:
                return schema_key
                
        return None

    def _normalize_value(self, schema_key: str, raw_value: str):
        """Converts raw string to correct type based on schema definition."""
        field_type = str(GamePresetState.__dataclass_fields__[schema_key].type)
        
        if "QualityLevel" in field_type:
            return QualityLevel.from_string(str(raw_value))
        elif "Toggle" in field_type:
            return Toggle.from_string(str(raw_value))
        return str(raw_value)

    def _llm_fallback_parse(self, unmapped_raw: dict) -> dict:
        """
        Passes unmapped raw config dict to an LLM to extract remaining settings.
        Returns a dict of parsed universal keys.
        """
        # Read API key explicitly from env if possible
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            return {}
            
        try:
            from openai import OpenAI
            import httpx
            # Suppress SSL errors for local parsing
            http_client = httpx.Client(verify=False, timeout=10.0)
            client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=api_key,
                http_client=http_client
            )
            
            prompt = f"""
            You are a technical assistant. I have a raw JSON config file from a video game.
            Map the keys into the following JSON schema exactly. Only return valid JSON. Do not include markdown.
            Schema Keys allowed: {list(FEATURE_SYNONYMS.keys())}
            Values allowed: Numbers 0-5 for quality, "on"/"off" for toggles, or strings.
            
            Raw Config:
            {json.dumps(unmapped_raw)[:1500]}
            """
            
            response = client.chat.completions.create(
                model="meta/llama-3.3-70b-instruct",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            # Clean possible markdown
            if content.startswith("```json"):
                content = content.split("```json")[1].split("```")[0].strip()
            elif content.startswith("```"):
                content = content.split("```")[1].split("```")[0].strip()
                
            return json.loads(content)
        except Exception as e:
            logger.debug(f"[SemanticMapper] LLM fallback failed: {e}")
            return {}

    def map_config(self, raw_config: dict) -> GamePresetState:
        """
        Translates a raw game configuration dictionary into the Universal Schema.
        """
        parsed_state = {}
        unmapped_raw = {}
        
        # Pass 1: Fast Heuristic Mapping
        for key, value in raw_config.items():
            schema_key = self._fuzzy_match_key(key)
            if schema_key:
                if schema_key not in parsed_state: # don't overwrite if already found
                    parsed_state[schema_key] = self._normalize_value(schema_key, value)
            else:
                unmapped_raw[key] = value

        # Pass 2: LLM Fallback (if enabled and we missed critical stuff)
        if self.use_llm_fallback and unmapped_raw and len(parsed_state) < 3:
            logger.info("[SemanticMapper] Falling back to LLM for parsing config.")
            llm_results = self._llm_fallback_parse(unmapped_raw)
            for k, v in llm_results.items():
                if k in FEATURE_SYNONYMS and k not in parsed_state:
                    parsed_state[k] = self._normalize_value(k, v)

        return GamePresetState(**parsed_state)
