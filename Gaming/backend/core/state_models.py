"""Shared Pydantic models for telemetry / pipeline state."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# --- Genre → Assistant Mode Auto-Routing ---
GENRE_MODE_MAP = {
    "FPS": "competitive",
    "Action": "competitive",
    "RPG": "story",
    "Adventure": "story",
    "MOBA": "competitive",
    "Strategy": "hybrid",
    "Simulation": "hybrid",
    "Sports": "competitive",
    "Open World": "story",
    "Racing": "competitive",
}

TITLE_GENRE_MAP = {
    "Valorant": "FPS",
    "Counter-Strike": "FPS",
    "Elden Ring": "RPG",
    "Cyberpunk 2077": "RPG",
    "Dota 2": "MOBA",
    "League of Legends": "MOBA",
    "Genshin Impact": "Open World",
    "Minecraft": "Adventure",
    "Resident Evil": "Action",
    "Overwatch": "FPS",
    "Need for Speed Heat": "Racing",
    "NFS Heat": "Racing",
    "Need for Speed": "Racing",
}


class TelemetryState(BaseModel):
    """Memory-optimized state container (seed dict; runtime adds bridge-only keys)."""

    health: float = 100.0
    is_low_health: bool = False
    detections_count: int = 0
    detections: List[Any] = Field(default_factory=list)
    scene_type: str = "unknown"
    scene_confidence: float = 0.0
    dialogue_text: str = ""
    quest_texts: List[str] = Field(default_factory=list)
    story_advice: str = ""
    ammo: str = "Unknown"
    position: str = "Unknown"
    brain_advice: Dict[str, Any] = Field(default_factory=dict)
    capture_fps: float = 0.0
    vision_fps: float = 0.0
    min_avg_fps: float = 0.0
    max_avg_fps: float = 0.0
    min_fps: float = 0.0
    max_fps: float = 0.0
    one_percent_low: float = 0.0
    cpu_pct: float = 0.0
    cpu_temp: float = 0.0
    cpu_freq: float = 0.0
    cpu_max_freq: float = 0.0
    cpu_power_w: float = 0.0
    mem_pct: float = 0.0
    disk_util: float = 0.0
    gpu_metrics: Dict[str, Any] = Field(default_factory=dict)
    last_voiced_advice: Optional[str] = None
    last_voiced_time: float = 0.0
    agent_intent: str = "observing"
    agent_action: str = "none"
    game_info: Optional[Dict[str, Any]] = None
    game_minimized: bool = False
    game_mode_manual: bool = False
    system_specs: Optional[Dict[str, Any]] = None
    proximity_data: List[Dict[str, Any]] = Field(default_factory=list)
    ai_analytic: Dict[str, Any] = Field(default_factory=dict)
    neural_status: Dict[str, Any] = Field(default_factory=dict)
    active_mode_info: Dict[str, str] = Field(default_factory=dict)
    net_util: float = 0.0
    net_speed: str = "0.0 MB/s"
    input_device: str = "Unknown"
    nvidia_tip: str = ""
    perf_score: int = 100
    cooling_mode: str = "balanced"
    cooling_applied: bool = False
    is_game_active: bool = False
    is_game_focused: bool = False
    game_fps: float = 0.0
    game_loading: bool = False
    # AWCC detection status (Task 9)
    # Populated on startup by the pipeline host; surfaced to the UI as a
    # compatibility badge when Alienware Command Center is detected.
    awcc_status: Optional[Dict[str, Any]] = None
