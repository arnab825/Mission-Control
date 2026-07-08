"""
Preset Comparator — Preset Optimizer engine.

Compares a selected Mission Control preset (e.g. 'quality', 'performance') against
the game's actual parsed config settings and its known feature support list.
Returns a structured delta checklist for the frontend Preset Optimizer panel.
"""
import logging

logger = logging.getLogger(__name__)


# ── Preset requirements ────────────────────────────────────────────────────────
# Each preset defines which features are required/recommended and at what level.
# "required": True  → mismatch is shown as ⚠️ Needs Change
# "required": False → shown as ℹ️ Not Required for this preset
_PRESET_REQUIREMENTS: dict = {
    "quality": {
        "dlss_mode":         {"required": True,  "value": "on",  "label": "DLSS Super Resolution",  "note": "Set mode to Quality or DLAA"},
        "ray_tracing":  {"required": True,  "value": "on",  "label": "Ray Tracing",              "note": "Enable and set to High or Ultra"},
        "path_tracing": {"required": True,  "value": "on",  "label": "Path Tracing",             "note": "Enable Full Path Tracing if available"},
        "reflex":       {"required": True,  "value": "on",  "label": "NVIDIA Reflex",            "note": "Set to Enabled or Enabled + Boost"},
        "hdr":          {"required": True,  "value": "on",  "label": "HDR",                      "note": "Enable HDR / High Dynamic Range"},
        "frame_gen":    {"required": False, "value": "off", "label": "Frame Generation",         "note": "Disable — Frame Gen adds latency in Quality preset"},
    },
    "performance": {
        "dlss_mode":         {"required": True,  "value": "on",  "label": "DLSS Super Resolution",  "note": "Set mode to Balanced or Performance"},
        "frame_gen":    {"required": True,  "value": "on",  "label": "Frame Generation",        "note": "Enable DLSS Frame Generation (2x or 4x)"},
        "reflex":       {"required": True,  "value": "on",  "label": "NVIDIA Reflex",           "note": "Enable Reflex — critical with Frame Gen to reduce added latency"},
        "hdr":          {"required": True,  "value": "on",  "label": "HDR",                     "note": "Enable HDR / High Dynamic Range"},
        "ray_tracing":  {"required": False, "value": "off", "label": "Ray Tracing",             "note": "Disable to maximize frame rate"},
        "path_tracing": {"required": False, "value": "off", "label": "Path Tracing",            "note": "Disable for maximum FPS headroom"},
    },
    "balanced": {
        "dlss_mode":         {"required": True,  "value": "on",  "label": "DLSS Super Resolution",  "note": "Set mode to Balanced"},
        "reflex":       {"required": True,  "value": "on",  "label": "NVIDIA Reflex",           "note": "Enable Reflex for lower input latency"},
        "hdr":          {"required": True,  "value": "on",  "label": "HDR",                     "note": "Enable HDR / High Dynamic Range"},
        "ray_tracing":  {"required": False, "value": "off", "label": "Ray Tracing",             "note": "Disable or set to Low to keep frames smooth"},
        "path_tracing": {"required": False, "value": "off", "label": "Path Tracing",            "note": "Disable for Balanced mode"},
        "frame_gen":    {"required": False, "value": "off", "label": "Frame Generation",        "note": "Disable — not needed in Balanced mode"},
    },
    "latency": {
        "reflex":       {"required": True,  "value": "on",  "label": "NVIDIA Reflex",           "note": "Enable Reflex + Boost mode for lowest latency"},
        "dlss_mode":         {"required": False, "value": "off", "label": "DLSS Super Resolution",  "note": "Disable — avoid upscaling overhead in competitive play"},
        "ray_tracing":  {"required": False, "value": "off", "label": "Ray Tracing",             "note": "Disable to maximize raw frame rate"},
        "path_tracing": {"required": False, "value": "off", "label": "Path Tracing",            "note": "Disable for minimum latency"},
        "frame_gen":    {"required": False, "value": "off", "label": "Frame Generation",        "note": "Disable — Frame Gen increases input latency"},
        "hdr":          {"required": False, "value": "off", "label": "HDR",                     "note": "Disable — HDR processing can add minor GPU overhead"},
    },
    "off": {
        "dlss_mode":         {"required": False, "value": "off", "label": "DLSS Super Resolution",  "note": "Disable for stock rendering"},
        "ray_tracing":  {"required": False, "value": "off", "label": "Ray Tracing",             "note": "Disable"},
        "path_tracing": {"required": False, "value": "off", "label": "Path Tracing",            "note": "Disable"},
        "frame_gen":    {"required": False, "value": "off", "label": "Frame Generation",        "note": "Disable"},
        "reflex":       {"required": False, "value": "off", "label": "NVIDIA Reflex",           "note": "Disable"},
        "hdr":          {"required": False, "value": "off", "label": "HDR",                     "note": "Disable"},
    },
}

# ── Generic in-game navigation instructions ────────────────────────────────────
# Keyed by feature. Used as a fallback when no game-specific guide exists.
_GENERIC_INSTRUCTIONS: dict = {
    "dlss_mode": (
        "Open the game's Graphics / Display Settings menu. "
        "Look for 'DLSS', 'NVIDIA DLSS', or 'Super Resolution'. "
        "Set the quality mode to Quality, Balanced, or Performance as instructed above."
    ),
    "ray_tracing": (
        "Open Graphics Settings and find 'Ray Tracing' or 'RTX'. "
        "Toggle it on and set the quality level to Medium, High, or Ultra."
    ),
    "path_tracing": (
        "Open Graphics Settings and find 'Path Tracing' or 'Full Path Tracing'. "
        "Enable it — this is usually a separate toggle from Ray Tracing."
    ),
    "frame_gen": (
        "Open Graphics Settings and look for 'Frame Generation', 'DLSS Frame Generation', "
        "or 'DLSS-G'. Toggle it on/off as recommended."
    ),
    "reflex": (
        "Open Graphics or NVIDIA Settings within the game. "
        "Find 'NVIDIA Reflex Low Latency' and set it to Enabled or Enabled + Boost."
    ),
    "hdr": (
        "Open Display Settings and find 'HDR', 'High Dynamic Range', or 'HDR10'. "
        "Enable it. Make sure Windows HDR is also enabled in your system Display Settings."
    ),
}

# ── Game-specific instruction overrides ───────────────────────────────────────
# Matched by checking if any key substring appears in the lowercased game title.
# More specific names should come before generic ones.
_GAME_INSTRUCTIONS: dict = {
    "spider-man 2": {
        "dlss_mode":         "Settings → Graphics → NVIDIA DLSS → set Super Resolution to your preferred quality",
        "ray_tracing":  "Settings → Graphics → Ray Tracing → toggle on, set Ray Tracing Quality to Ultra",
        "path_tracing": "Settings → Graphics → Ray Tracing → enable Full Path Tracing (Overdrive)",
        "frame_gen":    "Settings → Graphics → NVIDIA DLSS → DLSS Frame Generation → On/Off",
        "reflex":       "Settings → Graphics → NVIDIA Reflex Low Latency → Enabled + Boost",
        "hdr":          "Settings → Display → HDR → Enable",
    },
    "spider-man": {
        "dlss_mode":         "Settings → Display → DLSS → set to Quality or Performance",
        "ray_tracing":  "Settings → Display → Ray Tracing → On, set quality to High or Ultra",
        "reflex":       "Settings → Display → NVIDIA Reflex Low Latency → Enabled",
        "hdr":          "Settings → Display → HDR → On",
    },
    "cyberpunk": {
        "dlss_mode":         "Settings → Graphics → DLSS → set Super Resolution Mode",
        "ray_tracing":  "Settings → Graphics → Ray Tracing → enable Psycho preset or individual RT options",
        "path_tracing": "Settings → Graphics → Ray Tracing → Path Tracing (Overdrive Mode) → On",
        "frame_gen":    "Settings → Graphics → DLSS Frame Generation → On",
        "reflex":       "Settings → Graphics → NVIDIA Reflex Low Latency → On + Boost",
        "hdr":          "Settings → Video → HDR → On",
    },
    "witcher": {
        "dlss_mode":         "Options → Graphics → DLSS → set Super Resolution",
        "ray_tracing":  "Options → Graphics → Ray Tracing → enable and adjust quality",
        "reflex":       "Options → Graphics → NVIDIA Reflex → On",
        "hdr":          "Options → Display → HDR → On",
    },
    "red dead": {
        "dlss_mode":         "Settings → Graphics → TAA / DLSS → switch to DLSS and select quality",
        "ray_tracing":  "Settings → Graphics → Ray Tracing → enable",
        "reflex":       "Settings → Graphics → Latency Reduction → NVIDIA Reflex → On",
        "hdr":          "Settings → Display → HDR Display → enable",
    },
    "hogwarts": {
        "dlss_mode":         "Settings → Display → NVIDIA DLSS → enable and set quality",
        "ray_tracing":  "Settings → Display → Ray Tracing → enable",
        "frame_gen":    "Settings → Display → DLSS Frame Generation → On",
        "reflex":       "Settings → Display → NVIDIA Reflex → On",
        "hdr":          "Settings → Display → HDR → On",
    },
    "alan wake": {
        "dlss_mode":         "Settings → Graphics → DLSS Super Resolution → On, set mode",
        "ray_tracing":  "Settings → Graphics → Ray Tracing → On",
        "path_tracing": "Settings → Graphics → Path Tracing → On",
        "frame_gen":    "Settings → Graphics → DLSS Frame Generation → On",
        "reflex":       "Settings → Graphics → NVIDIA Reflex → On",
        "hdr":          "Settings → Graphics → HDR → On",
    },
    "control": {
        "dlss_mode":         "Settings → Graphics → DLSS → On, set quality mode",
        "ray_tracing":  "Settings → Graphics → Ray Tracing → On, set quality",
        "reflex":       "Settings → Graphics → NVIDIA Reflex → On",
        "hdr":          "Settings → Graphics → HDR → On",
    },
    "black myth": {
        "dlss_mode":         "Settings → Display → DLSS → set Super Resolution to Quality or Performance",
        "ray_tracing":  "Settings → Display → Ray Tracing → On",
        "path_tracing": "Settings → Display → Path Tracing → On",
        "frame_gen":    "Settings → Display → Frame Generation → On",
        "reflex":       "Settings → Display → NVIDIA Reflex → On",
        "hdr":          "Settings → Display → HDR → On",
    },
    "starfield": {
        "dlss_mode":         "Settings → Display → Upscaling → DLSS, set quality level",
        "reflex":       "Settings → Display → NVIDIA Reflex → On",
        "hdr":          "Settings → Display → HDR → On",
    },
    "elden ring": {
        "dlss_mode":         "System → Graphic Settings → Anti-aliasing → DLSS",
        "ray_tracing":  "System → Graphic Settings → Ray Tracing → On",
        "reflex":       "System → Graphic Settings → NVIDIA Reflex → On",
        "hdr":          "System → Graphic Settings → HDR → On",
    },
    "baldur": {
        "dlss_mode":         "Video → Upscaling → DLSS, set Quality Mode",
        "hdr":          "Video → Display → HDR → On",
    },
    "helldivers": {
        "dlss_mode":         "Options → Video → Upscaling → DLSS",
        "frame_gen":    "Options → Video → DLSS Frame Generation → On",
        "reflex":       "Options → Video → NVIDIA Reflex → On",
        "hdr":          "Options → Video → HDR → On",
    },
}


class PresetComparator:
    """
    Compares a selected preset's requirements against:
    1. Scanned in-game config values (if config files were found)
    2. The game's known feature support (from the library scanner)

    Returns a structured list of comparison items for the frontend panel.
    """

    def compare(
        self,
        preset_key: str,
        scanned_settings: dict,
        game_features: list,
        game_title: str = "",
    ) -> list:
        """
        :param preset_key: One of 'quality', 'performance', 'balanced', 'latency', 'off'
        :param scanned_settings: Parsed key→value dict from game config files (may be empty)
        :param game_features: Feature list from game library, e.g. ['DLSS', 'RTX', 'REFLEX']
        :param game_title: Game name (used to look up specific instructions)
        :returns: List of comparison item dicts
        """
        requirements = _PRESET_REQUIREMENTS.get(preset_key, _PRESET_REQUIREMENTS["balanced"])
        game_instructions = self._match_game_instructions(game_title)
        features_upper = [f.upper() for f in game_features]

        items = []
        for feature_key, req in requirements.items():
            game_supports = self._game_supports(feature_key, features_upper)
            current_value = self._get_current_value(feature_key, scanned_settings)
            required_value = req["value"]
            required = req["required"]

            # Determine status
            if not game_supports:
                status = "not_supported"
            elif current_value is None:
                # Config not found — can only infer from feature support
                status = "unknown"
            elif self._values_match(current_value, required_value):
                status = "match"
            else:
                status = "mismatch" if required else "optional_mismatch"

            instruction = (
                game_instructions.get(feature_key)
                or _GENERIC_INSTRUCTIONS.get(feature_key, "")
            )

            items.append({
                "feature":        feature_key,
                "label":          req["label"],
                "status":         status,
                "required":       required,
                "current_value":  self._format_value(current_value),
                "required_value": self._format_value(required_value),
                "note":           req.get("note", ""),
                "instruction":    instruction,
                "game_supports":  game_supports,
            })

        return items

    # ── Private helpers ────────────────────────────────────────────────────────
    
    def _format_value(self, val) -> str | None:
        if val is None:
            return None
        if isinstance(val, int) or (isinstance(val, str) and val.isdigit()):
            v = int(val)
            mapping = {0: "Off", 1: "Low", 2: "Medium", 3: "High", 4: "Very High", 5: "Ultra"}
            return mapping.get(v, str(val))
        return str(val).capitalize()

    def _match_game_instructions(self, game_title: str) -> dict:
        """Return per-feature instructions for a known game, or {} for generic fallback."""
        if not game_title:
            return {}
        title_lower = game_title.lower()
        for key, instructions in _GAME_INSTRUCTIONS.items():
            if key in title_lower:
                return instructions
        return {}

    def _game_supports(self, feature_key: str, features_upper: list) -> bool:
        """Check if the game library entry indicates this feature is supported."""
        mapping = {
            "dlss_mode":         ["DLSS"],
            "ray_tracing":  ["RTX", "RAY_TRACING", "RAY TRACING"],
            "path_tracing": ["PATH_TRACING", "PATH TRACING"],
            "frame_gen":    ["FRAME_GEN", "FRAME GEN", "FG"],
            "reflex":       ["REFLEX"],
            "hdr":          ["HDR"],
        }
        required_tags = mapping.get(feature_key, [])
        if not required_tags:
            return True  # unknown feature — assume supported
        return any(tag in features_upper for tag in required_tags)

    def _get_current_value(self, feature_key: str, scanned: dict) -> str | None:
        """Look up the feature in scanned settings. Returns None if not found."""
        if not scanned:
            return None
        val = scanned.get(feature_key)
        if val is None:
            return None
        return str(val).lower().strip()

    def _values_match(self, current: str | int, required: str | int) -> bool:
        """Fuzzy match for Zero-Config Semantic Mapping enum values."""
        ON_VALUES  = {"on", "true", "1", "enabled", "yes", "enable", "balanced", "quality", "performance", "dlaa", "auto"}
        OFF_VALUES = {"off", "false", "0", "disabled", "no", "disable", "none"}

        # If it's a QualityLevel integer (0-5)
        if isinstance(current, int) or (isinstance(current, str) and current.isdigit()):
            c_val = int(current)
            if str(required).lower() in ON_VALUES:
                return c_val > 0 # Any level > 0 counts as "ON"
            if str(required).lower() in OFF_VALUES:
                return c_val == 0
            
            # If required is an int (e.g. must be at least HIGH (3))
            if isinstance(required, int) or (isinstance(required, str) and required.isdigit()):
                return c_val >= int(required)

        c = str(current).lower()
        r = str(required).lower()

        if r in ON_VALUES:
            return c in ON_VALUES
        if r in OFF_VALUES:
            return c in OFF_VALUES
        return c == r
