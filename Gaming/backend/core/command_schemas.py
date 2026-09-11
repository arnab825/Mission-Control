"""
Pydantic v2 Command Schemas for Bridge WebSocket messages.
Enforces strict type, length, and format verification on incoming client commands.
"""
from typing import Any, Dict, Optional, Tuple
from pydantic import BaseModel, ConfigDict, Field, ValidationError


class BaseCommandPayload(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class ExecutePayload(BaseCommandPayload):
    input: str = Field(min_length=1, max_length=5000)
    sessionId: Optional[str] = Field(default="default", max_length=128)
    userId: Optional[str] = Field(default="guest", max_length=128)


class LaunchGamePayload(BaseCommandPayload):
    exe_path: str = Field(min_length=1, max_length=500)


class DeleteAccountPayload(BaseCommandPayload):
    userId: str = Field(min_length=1, max_length=128)


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


COMMAND_SCHEMA_MAP = {
    "execute": ExecutePayload,
    "launch_game": LaunchGamePayload,
    "delete_account": DeleteAccountPayload,
    "create_chat_session": ChatSessionPayload,
    "delete_chat_session": ChatSessionPayload,
    "rename_chat_session": RenameChatSessionPayload,
    "submit_feedback": FeedbackPayload,
    "update_config": ConfigPayload,
    "save_settings": ConfigPayload,
}


def validate_bridge_command(cmd_type: str, raw_payload: Any) -> Tuple[bool, Optional[BaseCommandPayload], Optional[str]]:
    """
    Validates an incoming bridge command payload against its registered Pydantic schema.
    Returns (is_valid, validated_data, error_message).
    """
    schema = COMMAND_SCHEMA_MAP.get(cmd_type)
    if not schema:
        # Commands without explicit schema pass through if dictionary, otherwise rejected
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
