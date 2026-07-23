"""
Agent mode / voice / personality handlers.
Commands: toggle_agent_mode, set_personality, toggle_voice, stop_voice
"""
import logging

logger = logging.getLogger(__name__)


def handle_toggle_agent_mode(payload: dict, pipeline, bridge, config) -> None:
    active = payload.get("active", False)
    logger.info("Setting Agent Mode: %s", active)
    if pipeline:
        user_id = payload.get("userId", "guest")
        pipeline.active_user_id = user_id
        pipeline.set_agentic_mode(active)


def handle_set_personality(payload: dict, pipeline, bridge, config) -> None:
    personality = payload.get("personality", "tactical")
    pipeline.set_agent_personality(personality)
    
    # Persist the active personality choice to global config and save to disk
    if "ai_agent" not in config:
        config["ai_agent"] = {}
    config["ai_agent"]["personality"] = personality
    
    try:
        from core.config_loader import save_config
        save_config(config)
        bridge.update_state({"config": config})
    except Exception as e:
        logger.error("Failed to save personality config: %s", e)


def handle_toggle_voice(payload: dict, pipeline, bridge, config) -> None:
    pipeline.toggle_voice(payload.get("active", False))


def handle_stop_voice(payload: dict, pipeline, bridge, config) -> None:
    pipeline.stop_voice()
