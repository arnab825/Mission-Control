from typing import Dict, Any, List
import logging
from .capabilities_registry import GameCapabilitiesRegistry

logger = logging.getLogger(__name__)

class ResolutionEngine:
    """
    Intersects Preset Intents with Game Capabilities to produce Effective Settings.
    """

    def __init__(self, registry: GameCapabilitiesRegistry):
        self.registry = registry

    def resolve_settings(self, game_name: str, preset_intent: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolves the intended preset settings against the game's actual capabilities.
        
        Args:
            game_name: The name of the game being launched or configured.
            preset_intent: A dictionary representing the user's intent 
                           (e.g., {"upscaling": ["dlss", "fsr", "native"], "ray_tracing": True})
                           
        Returns:
            Dict[str, Any]: The effective settings to apply.
        """
        effective_settings = {}
        capabilities = self.registry.get_capabilities(game_name)

        if not capabilities:
            logger.warning(f"No capabilities found for {game_name}. Applying safe fallbacks.")
            return self._apply_safe_fallbacks(preset_intent)

        # 1. Resolve Upscaling
        upscaling_preference = preset_intent.get("upscaling", ["native"])
        if isinstance(upscaling_preference, str):
            upscaling_preference = [upscaling_preference]

        effective_settings["upscaling"] = "native" # Default fallback
        for tech in upscaling_preference:
            tech = tech.lower()
            if tech == "native":
                effective_settings["upscaling"] = "native"
                break
            if self.registry.supports_feature(game_name, tech):
                effective_settings["upscaling"] = tech
                break

        # 2. Resolve Ray Tracing
        wants_rt = preset_intent.get("ray_tracing", False)
        if wants_rt and self.registry.supports_feature(game_name, "ray_tracing"):
            effective_settings["ray_tracing"] = True
        else:
            effective_settings["ray_tracing"] = False
            
        # 3. Resolve Path Tracing (Requires RT)
        wants_pt = preset_intent.get("path_tracing", False)
        if wants_pt and effective_settings["ray_tracing"] and self.registry.supports_feature(game_name, "path_tracing"):
             effective_settings["path_tracing"] = True
        else:
             effective_settings["path_tracing"] = False

        # 4. Resolve Frame Generation
        wants_fg = preset_intent.get("frame_generation", False)
        if wants_fg and self.registry.supports_feature(game_name, "frame_generation"):
            # Determine which FG to use (DLSS-G vs FSR-FG based on upscaler usually)
            fg_types = capabilities["features"]["frame_generation"]
            if effective_settings["upscaling"] == "dlss" and "dlss_g" in fg_types:
                 effective_settings["frame_generation"] = "dlss_g"
            elif effective_settings["upscaling"] == "fsr" and "fsr_fg" in fg_types:
                 effective_settings["frame_generation"] = "fsr_fg"
            elif isinstance(fg_types, list) and len(fg_types) > 0:
                 effective_settings["frame_generation"] = fg_types[0] # Just pick the first available
            else:
                 effective_settings["frame_generation"] = False
        else:
            effective_settings["frame_generation"] = False

        # 5. General quality preset (Low, Medium, High, Ultra)
        # This usually applies to textures, shadows, etc. which most games support.
        effective_settings["quality_preset"] = preset_intent.get("quality_preset", "medium")

        logger.info(f"Resolved settings for {game_name}: {effective_settings}")
        return effective_settings

    def _apply_safe_fallbacks(self, preset_intent: Dict[str, Any]) -> Dict[str, Any]:
        """Applies safe, conservative settings when a game is unknown."""
        return {
            "upscaling": "native",
            "ray_tracing": False,
            "path_tracing": False,
            "frame_generation": False,
            "quality_preset": preset_intent.get("quality_preset", "medium")
        }
