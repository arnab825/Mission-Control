from enum import IntEnum, Enum
from dataclasses import dataclass, field
from typing import Optional


class QualityLevel(IntEnum):
    OFF = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    VERY_HIGH = 4
    ULTRA = 5

    @classmethod
    def from_string(cls, val: str) -> 'QualityLevel':
        v = str(val).lower().strip()
        if v in {"off", "0", "false", "none", "disabled", "disable"}:
            return cls.OFF
        if v in {"low", "1", "minimum", "min"}:
            return cls.LOW
        if v in {"medium", "2", "normal", "balanced", "standard"}:
            return cls.MEDIUM
        if v in {"high", "3", "recommended"}:
            return cls.HIGH
        if v in {"very high", "very_high", "epic", "extreme", "4"}:
            return cls.VERY_HIGH
        if v in {"ultra", "maximum", "max", "overdrive", "psycho", "5"}:
            return cls.ULTRA
        
        # Fallback heuristic
        try:
            return cls(int(v))
        except (ValueError, KeyError):
            pass
        return cls.MEDIUM  # default fallback if unparseable


class Toggle(Enum):
    ON = "on"
    OFF = "off"
    
    @classmethod
    def from_string(cls, val: str) -> 'Toggle':
        v = str(val).lower().strip()
        if v in {"1", "true", "yes", "enabled", "on", "enable", "high", "ultra", "max"}:
            return cls.ON
        return cls.OFF

@dataclass
class GamePresetState:
    """Universal representation of a game's active graphics settings."""
    # Display
    resolution: Optional[str] = None
    vsync: Optional[Toggle] = None
    fps_limit: Optional[str] = None
    hdr: Optional[Toggle] = None
    
    # Upscaling & Generation
    dlss_mode: Optional[str] = None
    fsr_mode: Optional[str] = None
    frame_gen: Optional[Toggle] = None
    reflex: Optional[Toggle] = None
    
    # Lighting & Shadows
    shadow_quality: Optional[QualityLevel] = None
    ambient_occlusion: Optional[QualityLevel] = None
    reflection_quality: Optional[QualityLevel] = None
    
    # Ray Tracing
    ray_tracing: Optional[Toggle] = None
    path_tracing: Optional[Toggle] = None
    
    # Textures & Details
    texture_quality: Optional[QualityLevel] = None
    anisotropic_filtering: Optional[str] = None
    
    # Post-Processing
    motion_blur: Optional[Toggle] = None
    depth_of_field: Optional[Toggle] = None
    anti_aliasing: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            k: (v.value if hasattr(v, 'value') else v)
            for k, v in self.__dict__.items()
            if v is not None
        }
