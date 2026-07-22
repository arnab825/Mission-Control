import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class GameCapabilitiesRegistry:
    """
    Manages the knowledge base of what graphics technologies each game supports.
    It can read from the scanned local game library for dynamic feature detection.
    """

    def __init__(self, config: dict = None):
        self.config = config or {}
        self.capabilities: Dict[str, Dict[str, Any]] = {}
        self._load_from_scanned_cache()

    def _load_from_scanned_cache(self):
        """Loads capabilities from the game scanner's JSON cache."""
        try:
            # Locate games_db.json
            app_data_path = self.config.get("system", {}).get("app_data_path")
            if app_data_path:
                base_dir = Path(app_data_path)
            else:
                base_dir = Path(__file__).parent.parent.parent / "backend"
                
            cache_file = base_dir / "config" / "games_db.json"
            # In a real user env with Clerk, there might be a userId suffix. 
            # For simplicity in the registry, we'll try to find any games_db_*.json or fallback to games_db.json
            
            db_files = list((base_dir / "config").glob("games_db*.json"))
            if db_files:
                cache_file = db_files[0] # Just use the first one found

            if cache_file.exists():
                with open(cache_file, "r", encoding="utf-8") as f:
                    games = json.load(f)
                    
                for g in games:
                    name = g.get("name")
                    features = g.get("features", [])
                    if name:
                        self.capabilities[name.lower()] = {
                            "engine": g.get("engine", "Unknown"),
                            "features": {
                                "dlss": "DLSS" in features,
                                "fsr": "FSR" in features,
                                "ray_tracing": "RTX" in features or "RAY_TRACING" in features,
                                "path_tracing": "PATH_TRACING" in features,
                                "frame_generation": "FRAME_GEN" in features,
                                "reflex": "REFLEX" in features,
                                "hdr": "HDR" in features,
                                "physx": "PHYSX" in features,
                            }
                        }
        except Exception as e:
            logger.error(f"Failed to load capabilities from scanned cache: {e}")

    def get_capabilities(self, game_name: str) -> Optional[Dict[str, Any]]:
        """Returns the capabilities for a specific game, or None if unknown."""
        return self.capabilities.get(game_name.lower())

    def supports_feature(self, game_name: str, feature: str) -> bool:
        """Checks if a game supports a specific feature."""
        game_caps = self.get_capabilities(game_name)
        if not game_caps:
            return False # Assume false if we don't know
        
        feature_val = game_caps.get("features", {}).get(feature.lower())
        if isinstance(feature_val, list):
            return len(feature_val) > 0
        return bool(feature_val)
