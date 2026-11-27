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
    if bridge:
        bridge.update_state({"agent_intent": "autonomous" if active else "observing"})


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
    if hasattr(pipeline, "voice_manager") and pipeline.voice_manager:
        pipeline.voice_manager.bridge = bridge
    pipeline.toggle_voice(payload.get("active", False))


def handle_stop_voice(payload: dict, pipeline, bridge, config) -> None:
    pipeline.stop_voice()


def handle_confirm_agentic_action(payload: dict, pipeline, bridge, config) -> None:
    """Handles user confirmation or abort of an agentic action countdown."""
    confirmed = payload.get("confirmed", True) if isinstance(payload, dict) else True
    action_id = payload.get("action_id") if isinstance(payload, dict) else None
    logger.info("Agentic action confirmation received: confirmed=%s, action_id=%s", confirmed, action_id)

    if pipeline and hasattr(pipeline, "handle_confirm_action"):
        pipeline.handle_confirm_action(action_id=action_id, confirmed=confirmed)
    elif pipeline and not confirmed:
        pipeline._action_abort_flag = True
        logger.info("[AGENT] Safety Interlock: Direct action abort triggered.")

    # Also resolve registered tool action in AgentCommandProcessor
    try:
        from control.agent_commands import AgentCommandProcessor
        AgentCommandProcessor.execute_pending_action(
            action_id=action_id,
            confirmed=confirmed,
            pipeline=pipeline,
            bridge=bridge,
            config=config
        )
    except Exception as e:
        logger.error("Error executing pending action in handler: %s", e)

    if bridge:
        # Clear confirmation toast once handled
        bridge.update_state({"confirmation_required": None})

