"""
Unit tests for One-Click Game Mode, RAM Cleaner, Agentic Action Confirmation & Crash Analyzer.
"""
import pytest
from core.command_schemas import validate_bridge_command
from system.optimizer import Optimizer


def test_command_schemas_game_mode_validation():
    # Valid enable_game_mode
    valid, payload, err = validate_bridge_command("enable_game_mode", {"power_mode": "max", "exclusions": ["discord.exe"]})
    assert valid is True
    assert err is None
    assert payload.power_mode == "max"
    assert payload.exclusions == ["discord.exe"]

    # Reject extra keys due to extra="forbid"
    valid, _, err = validate_bridge_command("enable_game_mode", {"power_mode": "max", "extra_bad_field": 123})
    assert valid is False
    assert err is not None

    # Valid disable_game_mode
    valid, _, err = validate_bridge_command("disable_game_mode", {})
    assert valid is True

    # Valid clean_standby_memory
    valid, _, err = validate_bridge_command("clean_standby_memory", {})
    assert valid is True

    # Valid confirm_agentic_action
    valid, payload, err = validate_bridge_command("confirm_agentic_action", {"action_id": "act-1234", "confirmed": False})
    assert valid is True
    assert payload.action_id == "act-1234"
    assert payload.confirmed is False

    # Valid analyze_crash_logs
    valid, _, err = validate_bridge_command("analyze_crash_logs", {})
    assert valid is True


def test_optimizer_game_mode_lifecycle():
    # Enable Game Mode
    status = Optimizer.enable_full_game_mode(exclusions=["test.exe"], power_mode="max")
    assert status["active"] is True
    assert len(status["stages"]) == 5
    assert all("name" in s and "status" in s for s in status["stages"])
    assert Optimizer.get_game_mode_state()["active"] is True

    # Disable Game Mode
    revert_status = Optimizer.disable_full_game_mode()
    assert revert_status["active"] is False
    assert Optimizer.get_game_mode_state()["active"] is False


def test_optimizer_ram_pressure_and_cleaner():
    consumers = Optimizer.get_top_ram_consumers(limit=3)
    assert isinstance(consumers, list)
    for c in consumers:
        assert "pid" in c
        assert "name" in c
        assert "memory_mb" in c

    cleaned = Optimizer.clean_standby_memory_explicit()
    assert cleaned["success"] is True
    assert "freed_mb" in cleaned
    assert "usage_pct" in cleaned


def test_optimizer_crash_analyzer():
    report = Optimizer.analyze_system_crashes()
    assert "detected" in report
    assert "summary" in report
    assert "recommendations" in report
    assert isinstance(report["recommendations"], list)


def test_mission_control_tools_schema():
    import json
    from control.agent_commands import AgentCommandProcessor, MISSION_CONTROL_TOOLS

    tools = AgentCommandProcessor.get_tools()
    assert len(tools) >= 12
    tool_names = [t["function"]["name"] for t in tools]
    expected_names = [
        "scan_roms", "switch_wine_runner", "set_cooling_mode", "set_fan_profile",
        "clear_standby_list", "optimize_system", "launch_game", "toggle_vision",
        "run_stability_benchmark", "open_page", "check_gpu_mux", "system_status"
    ]
    for exp in expected_names:
        assert exp in tool_names, f"Expected tool {exp} in tools schema"

    for t in tools:
        assert t["type"] == "function"
        assert "name" in t["function"]
        assert "description" in t["function"]
        assert "parameters" in t["function"]
        assert t["function"]["parameters"]["type"] == "object"


def test_agentic_tool_execution_autonomous():
    import json
    from unittest.mock import MagicMock
    from control.agent_commands import AgentCommandProcessor

    mock_bridge = MagicMock()
    mock_pipeline = MagicMock()
    mock_pipeline._game_state = {}

    # 1. scan_roms autonomous
    res_roms = AgentCommandProcessor.execute_tool(
        tool_name="scan_roms",
        arguments={"platform": "ps3", "target_path": "C:\\Roms"},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=True
    )
    assert res_roms["status"] == "executed"
    assert "scan_roms" in res_roms["tool"]
    assert "Emulation Indexer" in res_roms["message"]
    mock_bridge.update_state.assert_called()

    # 2. switch_wine_runner autonomous
    res_wine = AgentCommandProcessor.execute_tool(
        tool_name="switch_wine_runner",
        arguments={"game_title": "Elden Ring", "runner_id": "ge-proton"},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=True
    )
    assert res_wine["status"] == "executed"
    assert "Elden Ring" in res_wine["message"]
    assert "ge-proton" in res_wine["message"]

    # 3. set_cooling_mode autonomous
    res_cool = AgentCommandProcessor.execute_tool(
        tool_name="set_cooling_mode",
        arguments={"mode": "max"},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=True
    )
    assert res_cool["status"] == "executed"
    assert "Stability Mode" in res_cool["message"]

    # 4. clear_standby_list autonomous
    res_ram = AgentCommandProcessor.execute_tool(
        tool_name="clear_standby_list",
        arguments={"include_vram": True},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=True
    )
    assert res_ram["status"] == "executed"
    assert "Memory Purge" in res_ram["message"]

    # 5. check_gpu_mux
    res_mux = AgentCommandProcessor.execute_tool(
        tool_name="check_gpu_mux",
        arguments={"detailed": True},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=True
    )
    assert res_mux["status"] == "executed"
    assert "GPU MUX Switch" in res_mux["message"]

    # 6. run_stability_benchmark
    res_bench = AgentCommandProcessor.execute_tool(
        tool_name="run_stability_benchmark",
        arguments={"duration_seconds": 20, "game_name": "Cyberpunk 2077"},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=True
    )
    assert res_bench["status"] == "executed"
    assert "Stability Lab" in res_bench["message"]


def test_agentic_tool_execution_observing_and_confirmation():
    from unittest.mock import MagicMock
    from control.agent_commands import AgentCommandProcessor

    mock_bridge = MagicMock()
    mock_pipeline = MagicMock()
    mock_pipeline.action_confirm_callback = MagicMock()

    # In observing mode (agentic_mode_active=False), tool is held in pending status
    res_pend = AgentCommandProcessor.execute_tool(
        tool_name="set_cooling_mode",
        arguments={"mode": "performance"},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=False
    )
    assert res_pend["status"] == "pending"
    assert "Agentic Action Blocked" in res_pend["message"]
    action_id = res_pend["action_id"]
    assert action_id in AgentCommandProcessor.get_pending_actions()
    mock_pipeline.action_confirm_callback.assert_called_once()

    # Now execute the pending action via confirmation
    confirm_res = AgentCommandProcessor.execute_pending_action(
        action_id=action_id,
        confirmed=True,
        pipeline=mock_pipeline,
        bridge=mock_bridge
    )
    assert confirm_res is not None
    assert confirm_res["status"] == "executed"
    assert action_id not in AgentCommandProcessor.get_pending_actions()

    # Test user cancelling pending action
    res_cancel_target = AgentCommandProcessor.execute_tool(
        tool_name="scan_roms",
        arguments={"platform": "switch"},
        bridge=mock_bridge,
        pipeline=mock_pipeline,
        agentic_mode_active=False
    )
    cancel_aid = res_cancel_target["action_id"]
    cancel_res = AgentCommandProcessor.execute_pending_action(
        action_id=cancel_aid,
        confirmed=False,
        pipeline=mock_pipeline,
        bridge=mock_bridge
    )
    assert cancel_res["status"] == "cancelled"
    assert cancel_aid not in AgentCommandProcessor.get_pending_actions()


def test_tool_call_tag_parsing():
    import json
    from unittest.mock import MagicMock
    from control.agent_commands import AgentCommandProcessor

    mock_bridge = MagicMock()
    mock_pipeline = MagicMock()

    call_tag = '[TOOL_CALL:{"name": "switch_wine_runner", "arguments": {"game_title": "Witcher 3", "runner_id": "ge-proton-9"}}]'
    response_in = f"{call_tag} I have updated the runner configuration for you."

    processed = AgentCommandProcessor.process_system_command(
        response=response_in,
        agentic_mode_active=True,
        bridge=mock_bridge,
        pipeline=mock_pipeline
    )
    assert "[TOOL_CALL:" not in processed
    assert "[ACTION_CARD:" in processed
    assert "Wine & Proton Manager" in processed
    assert "Witcher 3" in processed
    assert "ge-proton-9" in processed
