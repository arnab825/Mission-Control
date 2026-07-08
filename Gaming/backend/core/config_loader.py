"""Load and persist YAML settings."""
import logging
import os
from typing import Any, Dict

import yaml

logger = logging.getLogger(__name__)

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_CORE_DIR)


def get_app_data_path() -> str:
    pointer = os.path.join(_BACKEND_DIR, ".aero_location")
    if os.path.exists(pointer):
        with open(pointer, "r", encoding="utf-8") as f:
            return f.read().strip()
    return ""

def load_config(path: str = "config/settings.yaml") -> Dict[str, Any]:
    app_path = get_app_data_path()
    if app_path:
        path = os.path.join(app_path, "config", "settings.yaml")

    if not os.path.exists(path):
        potential_path = os.path.join(_BACKEND_DIR, path)
        if os.path.exists(potential_path):
            path = potential_path

    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
    else:
        config = {}

    agent_cfg = config.setdefault("ai_agent", {})

    # Try environment variables first, then fall back to the key already stored in config
    env_api_key = os.environ.get("NVIDIA_API_KEY") or os.environ.get(
        "AI_GAMING_ASSISTANT_NVIDIA_API_KEY"
    ) or agent_cfg.get("nvidia_api_key")

    if env_api_key and env_api_key.strip() and env_api_key not in ("your_nvidia_api_key_here", "YOUR_NVIDIA_API_KEY_HERE"):
        agent_cfg["nvidia_api_key"] = env_api_key
        logger.info("NVIDIA API key loaded successfully.")
    else:
        logger.warning(
            "NVIDIA_API_KEY not found in environment or config. "
            "Agentic AI will use local rules only."
        )
        agent_cfg["nvidia_api_key"] = None

    return config


def save_config(config_dict: Dict[str, Any], path: str = "config/settings.yaml") -> bool:
    try:
        app_path = config_dict.get("system", {}).get("app_data_path")
        if app_path:
            pointer = os.path.join(_BACKEND_DIR, ".aero_location")
            with open(pointer, "w", encoding="utf-8") as f:
                f.write(app_path)
            path = os.path.join(app_path, "config", "settings.yaml")
        else:
            app_path = get_app_data_path()
            if app_path:
                path = os.path.join(app_path, "config", "settings.yaml")

        if not os.path.isabs(path):
            if not os.path.exists(path):
                potential_path = os.path.join(_BACKEND_DIR, path)
                if os.path.exists(os.path.dirname(potential_path)):
                    path = potential_path

        os.makedirs(os.path.dirname(path), exist_ok=True)

        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(config_dict, f, default_flow_style=False, sort_keys=False)
        return True
    except Exception as e:
        logger.error("Failed to save config: %s", e)
        return False
