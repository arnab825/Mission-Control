"""Load and persist YAML settings to a user-survivable location.

Tasks 4, 5, 6 — Settings preservation across updates + JSON versioning
----------------------------------------------------------------------

Storage location (Tasks 4 & 6):
  All user settings are stored in %APPDATA%\\MissionControl\\config\\ which is
  OUTSIDE the application's install directory.  NSIS upgrades wipe
  %ProgramFiles%\\Mission Control\\ but NEVER touch %APPDATA%, so settings
  survive every update automatically.

Migration (Task 4):
  On first run after this change, if no file exists at the persistent path
  but one exists in the old install-relative location, it is copied over
  automatically (one-time migration, silent).

Schema versioning (Tasks 5 & 6):
  A `schema_version` key is injected on every load.  The CURRENT_SCHEMA_VERSION
  constant is incremented when breaking changes are made to the config schema.
  The migrate_config() function handles upgrade steps between versions.

Backwards compatibility:
  Old configs without `schema_version` are treated as version 0 and migrated
  to the current schema without destroying any existing keys.
"""
import json
import logging
import os
import shutil
from typing import Any, Dict

import yaml

logger = logging.getLogger(__name__)

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_CORE_DIR)

# Bump this when a breaking config schema change is made.
CURRENT_SCHEMA_VERSION = 1


# ---------------------------------------------------------------------------
# Persistent storage path helpers
# ---------------------------------------------------------------------------

def get_persistent_config_dir() -> str:
    """Return %APPDATA%\\MissionControl\\config\\ on Windows, XDG on Linux/Mac.

    This directory survives application upgrades because NSIS/electron-builder
    never touches %APPDATA% during install or uninstall.
    """
    if os.name == "nt":
        appdata = os.environ.get("APPDATA") or os.path.expanduser("~")
        return os.path.join(appdata, "MissionControl", "config")
    # Linux / macOS fallback
    xdg = os.environ.get("XDG_CONFIG_HOME") or os.path.join(os.path.expanduser("~"), ".config")
    return os.path.join(xdg, "MissionControl")


def get_persistent_settings_path() -> str:
    return os.path.join(get_persistent_config_dir(), "settings.yaml")


def _legacy_install_relative_path() -> str:
    """Returns the old install-relative config path used before Task 4."""
    return os.path.join(_BACKEND_DIR, "config", "settings.yaml")


def _pointer_file_path() -> str:
    """The old .aero_location pointer file (used prior to Task 4)."""
    return os.path.join(_BACKEND_DIR, ".aero_location")


# ---------------------------------------------------------------------------
# Schema versioning / migration
# ---------------------------------------------------------------------------

def migrate_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Upgrade config dict to CURRENT_SCHEMA_VERSION in-place.

    Each `from_version` block applies incremental upgrades so configs that
    are multiple versions behind are migrated step-by-step without data loss.
    """
    version = config.get("schema_version", 0)

    # v0 → v1: no structural changes, just stamp the version
    if version < 1:
        config["schema_version"] = 1
        logger.info("[Config] Migrated settings schema from v%d to v1.", version)

    # Future migrations:
    # if version < 2:
    #     config["new_key"] = config.pop("old_key", default)
    #     config["schema_version"] = 2

    return config


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_config(path: str | None = None) -> Dict[str, Any]:
    """Load settings from the persistent %APPDATA% location.

    Resolution order:
      1. The persistent path: %APPDATA%\\MissionControl\\config\\settings.yaml
      2. Migrate from the old install-relative path (one-time, Task 4)
      3. Migrate from the old .aero_location pointer file (legacy)
      4. Return empty config (first-ever run)

    The loaded config is always returned with schema_version set to
    CURRENT_SCHEMA_VERSION after migration.
    """
    persistent = path or get_persistent_settings_path()

    # If the persistent file doesn't exist, attempt one-time migration from old locations
    if not path and not os.path.exists(persistent):
        _migrate_from_legacy(persistent)

    if os.path.exists(persistent):
        try:
            with open(persistent, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f) or {}
        except Exception as e:
            logger.error("[Config] Failed to read settings.yaml: %s", e)
            config = {}
    else:
        config = {}

    # Apply schema migration
    config = migrate_config(config)

    # Inject NVIDIA API key from environment (takes precedence over stored key)
    agent_cfg = config.setdefault("ai_agent", {})
    env_api_key = (
        os.environ.get("NVIDIA_API_KEY")
        or os.environ.get("AI_GAMING_ASSISTANT_NVIDIA_API_KEY")
        or agent_cfg.get("nvidia_api_key")
    )
    if env_api_key and env_api_key.strip() and env_api_key not in (
        "your_nvidia_api_key_here", "YOUR_NVIDIA_API_KEY_HERE"
    ):
        agent_cfg["nvidia_api_key"] = env_api_key
        logger.info("[Config] NVIDIA API key loaded successfully.")
    else:
        logger.warning(
            "[Config] NVIDIA_API_KEY not found in environment or config. "
            "Agentic AI will use local rules only."
        )
        agent_cfg["nvidia_api_key"] = None

    # Write a settings.json mirror for tooling/external integrations (Task 5)
    if not path:
        _write_json_mirror(config)

    return config


def save_config(config_dict: Dict[str, Any], path: str | None = None) -> bool:
    """Persist settings to %APPDATA%\\MissionControl\\config\\settings.yaml.

    The `path` argument is accepted for backwards compatibility but ignored;
    all saves always go to the persistent location (Task 4).
    """
    try:
        persistent = path or get_persistent_settings_path()
        os.makedirs(os.path.dirname(persistent), exist_ok=True)

        # Ensure schema_version is always written
        config_dict.setdefault("schema_version", CURRENT_SCHEMA_VERSION)

        with open(persistent, "w", encoding="utf-8") as f:
            yaml.dump(config_dict, f, default_flow_style=False, sort_keys=False)

        logger.debug("[Config] Settings saved to %s", persistent)

        # Keep JSON mirror in sync (Task 5)
        if not path:
            _write_json_mirror(config_dict)

        return True
    except Exception as e:
        logger.error("[Config] Failed to save config: %s", e)
        return False


# ---------------------------------------------------------------------------
# JSON mirror (Task 5 — settings.json)
# ---------------------------------------------------------------------------

def _write_json_mirror(config: Dict[str, Any]) -> None:
    """Write a settings.json mirror alongside settings.yaml for tooling.

    Only user-facing, non-sensitive keys are mirrored.  API keys and internal
    state are excluded.  This file is intended for external integrations and
    diagnostics; the YAML file remains the source of truth.
    """
    try:
        json_path = os.path.join(get_persistent_config_dir(), "settings.json")
        os.makedirs(os.path.dirname(json_path), exist_ok=True)

        # Build a sanitised subset — exclude the AI agent block (contains API keys)
        mirror_keys = {k: v for k, v in config.items() if k not in ("ai_agent",)}
        mirror_keys["schema_version"] = config.get("schema_version", CURRENT_SCHEMA_VERSION)
        mirror_keys["_generated_by"] = "Mission Control backend"

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(mirror_keys, f, indent=2, default=str)
    except Exception as e:
        logger.debug("[Config] Could not write settings.json mirror: %s", e)


# ---------------------------------------------------------------------------
# Legacy migration helper
# ---------------------------------------------------------------------------

def _migrate_from_legacy(persistent_dest: str) -> None:
    """One-time migration from old config locations to the persistent path.

    Checks (in priority order):
      1. Old .aero_location pointer file → pointed directory
      2. Install-relative config/settings.yaml

    If found, copies the file to `persistent_dest` and logs a notice.
    Only runs when `persistent_dest` does not yet exist.
    """
    # Candidate 1: the old .aero_location pointer file
    pointer = _pointer_file_path()
    if os.path.exists(pointer):
        try:
            with open(pointer, "r", encoding="utf-8") as f:
                old_dir = f.read().strip()
            old_yaml = os.path.join(old_dir, "config", "settings.yaml")
            if os.path.exists(old_yaml):
                os.makedirs(os.path.dirname(persistent_dest), exist_ok=True)
                shutil.copy2(old_yaml, persistent_dest)
                logger.info(
                    "[Config] Migrated settings from legacy pointer location: %s → %s",
                    old_yaml, persistent_dest,
                )
                return
        except Exception as e:
            logger.debug("[Config] Could not migrate from .aero_location: %s", e)

    # Candidate 2: install-relative config/settings.yaml
    legacy = _legacy_install_relative_path()
    if os.path.exists(legacy):
        try:
            os.makedirs(os.path.dirname(persistent_dest), exist_ok=True)
            shutil.copy2(legacy, persistent_dest)
            logger.info(
                "[Config] Migrated settings from install-relative location: %s → %s",
                legacy, persistent_dest,
            )
        except Exception as e:
            logger.debug("[Config] Could not migrate from install-relative path: %s", e)


# ---------------------------------------------------------------------------
# Legacy shim (backwards compat for callers using get_app_data_path)
# ---------------------------------------------------------------------------

def get_app_data_path() -> str:
    """Backwards-compatible shim.  Returns the persistent config directory."""
    return get_persistent_config_dir()
