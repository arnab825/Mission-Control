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
