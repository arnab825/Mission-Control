"""
Pydantic v2 Command Schemas for Bridge WebSocket messages.
Enforces strict type, length, format verification, and forbids extraneous keys on incoming client commands.
"""
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, ConfigDict, Field, ValidationError


class BaseCommandPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class EmptyPayload(BaseCommandPayload):
    pass


class ExecutePayload(BaseCommandPayload):
    input: str = Field(min_length=1, max_length=5000)
    sessionId: Optional[str] = Field(default="default", max_length=128)
    userId: Optional[str] = Field(default="guest", max_length=128)


class LaunchGamePayload(BaseCommandPayload):
    exe_path: str = Field(min_length=1, max_length=500)


class DeleteAccountPayload(BaseCommandPayload):
    userId: str = Field(min_length=1, max_length=128)


class UserIdPayload(BaseCommandPayload):
    userId: Optional[str] = Field(default="guest", max_length=128)


class ChatSessionPayload(BaseCommandPayload):
    sessionId: Optional[str] = Field(default=None, max_length=128)
    title: Optional[str] = Field(default=None, max_length=200)
    userId: Optional[str] = Field(default="guest", max_length=128)


class RenameChatSessionPayload(BaseCommandPayload):
    sessionId: str = Field(min_length=1, max_length=128)
    title: str = Field(min_length=1, max_length=200)
    userId: Optional[str] = Field(default="guest", max_length=128)


class FeedbackPayload(BaseCommandPayload):
    sessionId: str = Field(min_length=1, max_length=128)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    feedback: Optional[str] = Field(default="", max_length=2000)
    userId: Optional[str] = Field(default="guest", max_length=128)


class ConfigPayload(BaseCommandPayload):
    config: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    userId: Optional[str] = Field(default=None, max_length=128)
    voice: Optional[Dict[str, Any]] = None
    scanner: Optional[Dict[str, Any]] = None
    system: Optional[Dict[str, Any]] = None
    overlay: Optional[Dict[str, Any]] = None
    nvidia: Optional[Dict[str, Any]] = None
    gpu_tuning: Optional[Dict[str, Any]] = None


class ToggleVisionPipelinePayload(BaseCommandPayload):
    enabled: Optional[bool] = True


class ScanGamesPayload(BaseCommandPayload):
    userId: Optional[str] = Field(default=None, max_length=128)
    forceRefresh: Optional[bool] = False


class GetCachedGamesPayload(BaseCommandPayload):
    userId: Optional[str] = Field(default=None, max_length=128)
    forceRefresh: Optional[bool] = False


class SetCoolingModePayload(BaseCommandPayload):
    mode: str = Field(min_length=1, max_length=50)
    userId: Optional[str] = Field(default="guest", max_length=128)


class ControllerRumblePayload(BaseCommandPayload):
    left_motor: float = Field(ge=0.0, le=1.0, default=0.5)
    right_motor: float = Field(ge=0.0, le=1.0, default=0.5)
    duration: float = Field(ge=0.0, le=10.0, default=0.5)


class SaveControllerMappingsPayload(BaseCommandPayload):
    mappings: Optional[Dict[str, Any]] = None
    deadzone: Optional[float] = Field(ge=0.0, le=1.0, default=None)


class NodeActionPayload(BaseCommandPayload):
    nodeId: Optional[str] = Field(default=None, max_length=128)
    userId: Optional[str] = Field(default="guest", max_length=128)
    name: Optional[str] = Field(default=None, max_length=100)
    scanPaths: Optional[List[str]] = None


class ModelActionPayload(BaseCommandPayload):
    model_id: str = Field(min_length=1, max_length=128)


class ScanPresetOptimizerPayload(BaseCommandPayload):
    game_path: Optional[str] = Field(default=None, max_length=500)
    game_name: Optional[str] = Field(default=None, max_length=200)
    userId: Optional[str] = Field(default="guest", max_length=128)


COMMAND_SCHEMA_MAP = {
    "execute": ExecutePayload,
    "launch_game": LaunchGamePayload,
    "delete_account": DeleteAccountPayload,
    "logout_user": UserIdPayload,
    "revert_optimization": UserIdPayload,
    "optimize_system": UserIdPayload,
    "get_session_history": UserIdPayload,
    "get_settings": UserIdPayload,
    "create_chat_session": ChatSessionPayload,
    "delete_chat_session": ChatSessionPayload,
    "rename_chat_session": RenameChatSessionPayload,
    "submit_feedback": FeedbackPayload,
    "update_config": ConfigPayload,
    "save_settings": ConfigPayload,
    "toggle_vision_pipeline": ToggleVisionPipelinePayload,
    "scan_games": ScanGamesPayload,
    "get_cached_games": GetCachedGamesPayload,
    "set_cooling_mode": SetCoolingModePayload,
    "trigger_controller_rumble": ControllerRumblePayload,
    "save_controller_mappings": SaveControllerMappingsPayload,
    "get_controller_config": EmptyPayload,
    "get_gaming_readiness": ScanGamesPayload,
    "get_nodes": UserIdPayload,
    "register_local_node": UserIdPayload,
    "trigger_node_scan": NodeActionPayload,
    "rename_node": NodeActionPayload,
    "update_node_paths": NodeActionPayload,
    "get_changelogs": EmptyPayload,
    "check_updates": EmptyPayload,
    "check_patches": EmptyPayload,
    "install_update": EmptyPayload,
    "install_yolo_deps": EmptyPayload,
    "download_ai_model": ModelActionPayload,
    "uninstall_ai_model": ModelActionPayload,
    "scan_preset_optimizer": ScanPresetOptimizerPayload,
    "request_state": BaseCommandPayload,
}


def validate_bridge_command(cmd_type: str, raw_payload: Any) -> Tuple[bool, Optional[BaseCommandPayload], Optional[str]]:
    """
    Validates an incoming bridge command payload against its registered Pydantic schema.
    Returns (is_valid, validated_data, error_message).
    Strict key matching: any extra unpermitted keys are rejected.
    """
    schema = COMMAND_SCHEMA_MAP.get(cmd_type)
    if not schema:
        # Reject commands with non-dict payloads or unexpected structures
        if raw_payload is not None and not isinstance(raw_payload, dict):
            return False, None, f"Payload for '{cmd_type}' must be a dictionary or null"
        return True, raw_payload, None

    try:
        data = raw_payload if isinstance(raw_payload, dict) else {}
        validated = schema.model_validate(data)
        return True, validated, None
    except ValidationError as e:
        first_error = e.errors()[0] if e.errors() else {}
        msg = f"{first_error.get('loc', ['field'])}: {first_error.get('msg', 'validation error')}"
        return False, None, msg

