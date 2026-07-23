import os
import yaml
import logging
from pathlib import Path
from typing import Optional
from .schema import GamePresetState, QualityLevel, Toggle

logger = logging.getLogger(__name__)

class PresetEngine:
    def __init__(self):
        self.adapters = {}
        self._load_adapters()

    def _load_adapters(self):
        adapter_dir = Path(__file__).parent / "adapters"
        if not adapter_dir.exists():
            return
            
        for file in adapter_dir.glob("*.yaml"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    adapter = yaml.safe_load(f)
                    game_id = adapter.get("game_id")
                    if game_id:
                        self.adapters[game_id] = adapter
            except Exception as e:
                logger.error(f"Failed to load adapter {file}: {e}")

    def get_adapter_for_game(self, game_title: str) -> Optional[dict]:
        """Match game title to a known adapter."""
        title_clean = game_title.lower().replace(" ", "_").replace("-", "_")
        for game_id, adapter in self.adapters.items():
            if game_id in title_clean or title_clean in game_id:
                return adapter
        return None

    def apply_adapter_mapping(self, adapter: dict, raw_data: dict) -> GamePresetState:
        """Map raw data to Universal Schema using adapter rules."""
        state_dict = {"raw_config": raw_data}
        mapping = adapter.get("mapping", {})
        
        for schema_key, rule in mapping.items():
            raw_path = rule.get("path")
            
            # Simple dot-notation path resolution (e.g. "graphics.advanced.shadows")
            val = self._resolve_path(raw_data, raw_path)
            if val is not None:
                # Apply translation values if specified
                translation_table = rule.get("values")
                if translation_table and str(val) in translation_table:
                    val = translation_table[str(val)]
                
                # Coerce types
                if rule.get("type") == "toggle":
                    val = self._coerce_toggle(val)
                elif rule.get("type") == "quality_level":
                    val = self._coerce_quality(val)
                
                state_dict[schema_key] = val
                
        return GamePresetState(**state_dict)

    def _resolve_path(self, data: dict, path: str):
        parts = path.split(".")
        current = data
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        return current

    def _coerce_toggle(self, val) -> Optional[Toggle]:
        if val is None:
            return None
        if isinstance(val, Toggle):
            return val
        s = str(val).lower()
        if s in ["true", "1", "on", "enable", "enabled", "yes"]:
            return Toggle.ON
        if s in ["false", "0", "off", "disable", "disabled", "no"]:
            return Toggle.OFF
        return None

    def _coerce_quality(self, val) -> Optional[QualityLevel]:
        if val is None:
            return None
        if isinstance(val, QualityLevel):
            return val
        try:
            return QualityLevel(int(val))
        except ValueError:
            return None
