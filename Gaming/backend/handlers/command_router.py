"""
Mission Control — Command Router Dispatcher
Dispatches incoming WebSocket bridge commands to their respective domain handlers.
"""
import logging
from core.config_loader import save_config
from core.updater_bridge import handle_bridge_update_commands
from handlers import chat_handler, game_handler, system_handler, agent_handler

logger = logging.getLogger("command_router")


def dispatch_bridge_command(
    cmd_type: str,
    payload: dict,
    pipeline,
    bridge,
    config: dict,
    library_session: dict,
    local_vision=None,
    enforce_security_fn=None,
) -> None:
    """Routes an incoming WebSocket command payload to its domain handler."""
    # Sync user_id to pipeline on every command that carries one
    if payload and "userId" in payload and pipeline:
        pipeline.active_user_id = payload.get("userId")

    # ── Updater commands (handled separately) ─────────────────────
    if handle_bridge_update_commands(cmd_type, payload, bridge):
        return

    # ── Chat / Conversation commands ──────────────────────────────
    if cmd_type == "execute":
        chat_handler.handle_execute(payload, pipeline, bridge, config)
    elif cmd_type == "stop_tts":
        if pipeline and hasattr(pipeline, "voice_manager") and pipeline.voice_manager:
            pipeline.voice_manager.mute_chat_tts()
    elif cmd_type == "set_tts_muted":
        muted = payload.get("muted", True)
        if pipeline and hasattr(pipeline, "voice_manager") and pipeline.voice_manager:
            if muted:
                pipeline.voice_manager.mute_chat_tts()
            else:
                pipeline.voice_manager.unmute_chat_tts()
    elif cmd_type == "speak_text":
        text = payload.get("text", "")
        if text and pipeline and hasattr(pipeline, "voice_manager") and pipeline.voice_manager:
            pipeline.voice_manager.speak(text, force=True)
    elif cmd_type == "migrate_local_history":
        chat_handler.handle_migrate_local_history(payload, pipeline, bridge, config)
    elif cmd_type == "get_chat_sessions":
        chat_handler.handle_get_chat_sessions(payload, pipeline, bridge, config)
    elif cmd_type == "get_chat_history":
        chat_handler.handle_get_chat_history(payload, pipeline, bridge, config)
    elif cmd_type == "get_session_history":
        chat_handler.handle_get_session_history(payload, pipeline, bridge, config)
    elif cmd_type == "create_chat_session":
        chat_handler.handle_create_chat_session(payload, pipeline, bridge, config)
    elif cmd_type == "delete_chat_session":
        chat_handler.handle_delete_chat_session(payload, pipeline, bridge, config)
    elif cmd_type == "clear_chat_sessions":
        chat_handler.handle_clear_chat_sessions(payload, pipeline, bridge, config)
    elif cmd_type == "rename_chat_session":
        chat_handler.handle_rename_chat_session(payload, pipeline, bridge, config)
    elif cmd_type == "suggest_session_title":
        chat_handler.handle_suggest_session_title(payload, pipeline, bridge, config)
    elif cmd_type == "retry_message":
        chat_handler.handle_retry_message(payload, pipeline, bridge, config)
    elif cmd_type == "submit_feedback":
        chat_handler.handle_submit_feedback(payload, pipeline, bridge, config)

    # ── Game library / scanning commands ──────────────────────────
    elif cmd_type == "get_cached_games":
        game_handler.handle_get_cached_games(payload, pipeline, bridge, config, library_session)
    elif cmd_type == "get_discover_games":
        game_handler.handle_get_discover_games(payload, pipeline, bridge, config, library_session)
    elif cmd_type == "scan_games":
        game_handler.handle_scan_games(payload, pipeline, bridge, config, library_session)
    elif cmd_type == "launch_game":
        game_handler.handle_launch_game(payload, pipeline, bridge, config, library_session)
    elif cmd_type == "logout_user":
        game_handler.handle_logout_user(payload, pipeline, bridge, config, library_session)
    elif cmd_type == "delete_account":
        game_handler.handle_delete_account(payload, pipeline, bridge, config, library_session)
    elif cmd_type == "register_local_node":
        game_handler.handle_register_local_node(payload, pipeline, bridge, config)
    elif cmd_type == "get_nodes":
        game_handler.handle_get_nodes(payload, pipeline, bridge, config)
    elif cmd_type == "update_node_paths":
        game_handler.handle_update_node_paths(payload, pipeline, bridge, config, library_session)
    elif cmd_type == "rename_node":
        game_handler.handle_rename_node(payload, pipeline, bridge, config)
    elif cmd_type == "trigger_node_scan":
        game_handler.handle_trigger_node_scan(payload, pipeline, bridge, config, library_session)

    # ── System / hardware / config commands ───────────────────────
    elif cmd_type == "optimize_system":
        system_handler.handle_optimize_system(payload, pipeline, bridge, config)
    elif cmd_type == "toggle_vision_pipeline":
        system_handler.handle_toggle_vision_pipeline(payload, pipeline, bridge, config)
    elif cmd_type == "revert_optimization":
        system_handler.handle_revert_optimization(payload, pipeline, bridge, config)
    elif cmd_type == "set_cooling_mode":
        system_handler.handle_set_cooling_mode(payload, pipeline, bridge, config)
    elif cmd_type == "update_config":
        system_handler.handle_update_config(payload, pipeline, bridge, config, save_config, enforce_security_fn)
    elif cmd_type == "save_settings":
        system_handler.handle_save_settings(payload, pipeline, bridge, config, save_config, enforce_security_fn)
    elif cmd_type == "get_settings":
        system_handler.handle_get_settings(payload, pipeline, bridge, config)
    elif cmd_type == "analyze_screen_local":
        system_handler.handle_analyze_screen_local(payload, pipeline, bridge, config, local_vision)
    elif cmd_type == "clear_logs":
        system_handler.handle_clear_logs(payload, pipeline, bridge, config)
    elif cmd_type == "get_core_optimization":
        system_handler.handle_get_core_optimization(payload, pipeline, bridge, config)
    elif cmd_type == "scan_preset_optimizer":
        system_handler.handle_scan_preset_optimizer(payload, pipeline, bridge, config)
    elif cmd_type == "get_gaming_readiness":
        system_handler.handle_get_gaming_readiness(payload, pipeline, bridge, config)
    elif cmd_type == "install_yolo_deps":
        system_handler.handle_install_yolo_deps(payload, pipeline, bridge, config)
    elif cmd_type == "download_ai_model":
        system_handler.handle_download_ai_model(payload, pipeline, bridge, config)
    elif cmd_type == "uninstall_ai_model":
        system_handler.handle_uninstall_ai_model(payload, pipeline, bridge, config)
    elif cmd_type == "fetch_nvidia_models":
        system_handler.handle_fetch_nvidia_models(payload, pipeline, bridge, config)
    elif cmd_type == "get_controller_config":
        system_handler.handle_get_controller_config(payload, pipeline, bridge, config)
    elif cmd_type == "save_controller_mappings":
        system_handler.handle_save_controller_mappings(payload, pipeline, bridge, config, save_config, enforce_security_fn)
    elif cmd_type == "trigger_controller_rumble":
        system_handler.handle_trigger_controller_rumble(payload, pipeline, bridge, config)

    # ── Agent mode / voice commands ───────────────────────────────
    elif cmd_type == "toggle_agent_mode":
        agent_handler.handle_toggle_agent_mode(payload, pipeline, bridge, config)
    elif cmd_type == "set_personality":
        agent_handler.handle_set_personality(payload, pipeline, bridge, config)
    elif cmd_type == "toggle_voice":
        agent_handler.handle_toggle_voice(payload, pipeline, bridge, config)
    elif cmd_type == "stop_voice":
        agent_handler.handle_stop_voice(payload, pipeline, bridge, config)

    else:
        logger.debug("Unknown bridge command: %s", cmd_type)
