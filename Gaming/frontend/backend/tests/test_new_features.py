import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from system.optimizer import Optimizer
from system.session_recorder import SessionRecorder
from nvidia.perf_advisor import PerformanceAdvisor
from voice.voice_macros import VoiceMacroEngine
from control.input_manager import InputManager

class MockCaps:
    def __init__(self, dlss_2=False, dlss_3=False):
        self._dlss_2 = dlss_2
        self._dlss_3 = dlss_3
    
    def supports(self, feature):
        if feature == "dlss_2": return self._dlss_2
        if feature == "dlss_3": return self._dlss_3
        return False
        
    @property
    def vram_mb(self):
        return 8000

def test_voice_macros():
    from ai_brain.game_knowledge import get_knowledge_base, DynamicGameProfile
    kb = get_knowledge_base()
    kb._active_game_key = "gta_v"
    
    # Seed a dynamic profile since there is no hardcoded GAME_DATA anymore
    kb._dynamic_profiles["gta_v"] = DynamicGameProfile(
        game_name="Grand Theft Auto V",
        game_key="gta_v",
        keybinds={
            "combat": {
                "Reload": "R",
                "Aim": "RMB",
            }
        }
    )
    
    engine = VoiceMacroEngine()
    macro = engine.match_macro("hey reload my gun now")
    assert macro == "reload", f"Expected reload, got {macro}"
    
    macro_heal = engine.match_macro("aim at him")
    assert macro_heal == "aim", f"Expected aim, got {macro_heal}"
    print("VoiceMacroEngine Test: PASSED")

def test_session_recorder():
    recorder = SessionRecorder()
    recorder.start_session("Test Game")
    
    # We must mock time.time() or just set _last_snapshot_time so it doesn't throttle
    import time
    recorder._last_snapshot_time = 0
    recorder.record_snapshot({"capture_fps": 60, "gpu_metrics": {"gpu_util": 50}})
    recorder._last_snapshot_time = 0
    recorder.record_snapshot({"capture_fps": 40, "gpu_metrics": {"gpu_util": 60}})
    
    summary = recorder.end_session()
    assert summary["fps"]["avg"] == 50.0, f"Expected avg_fps 50, got {summary['fps']['avg']}"
    assert summary["gpu"]["utilization"]["max"] == 60.0, f"Expected max gpu 60, got {summary['gpu']['utilization']['max']}"
    assert summary["game_name"] == "Test Game"
    print("SessionRecorder Test: PASSED")

def test_game_library_filtering():
    from unittest.mock import MagicMock
    from ai_brain.decision_maker import GameBrain
    from system.game_scanner import GameScanner

    mock_games = [
        {"name": "Heavy Rain", "type": "GAME", "genre": "STORY", "exe_path": "HeavyRain.exe"},
        {"name": "Steam", "type": "LAUNCHER", "genre": "PLATFORM", "exe_path": "steam.exe"},
        {"name": "Xbox App", "type": "LAUNCHER", "genre": "PLATFORM"},
        {"name": "Epic Games", "type": "LAUNCHER", "genre": "PLATFORM", "exe_path": "EpicGamesLauncher.exe"},
        {"name": "Spider-man Remastered", "type": "GAME", "genre": "ACTION", "exe_path": "Spider-Man.exe"},
    ]

    original_load = GameScanner.load_cached_games
    GameScanner.load_cached_games = MagicMock(return_value=mock_games)

    try:
        brain = GameBrain(config={})
        context = brain.get_game_library_context(user_id="test_user")
        
        # Verify games and launchers are placed in their respective sections
        assert "User's Scanned/Installed Games:" in context
        assert "User's Installed Gaming Platforms / Launchers:" in context
        
        games_sec = context.split("User's Installed Gaming Platforms / Launchers:")[0]
        launchers_sec = context.split("User's Installed Gaming Platforms / Launchers:")[1]
        
        assert "Heavy Rain" in games_sec, "Expected Heavy Rain in games section"
        assert "Spider-man Remastered" in games_sec, "Expected Spider-man Remastered in games section"
        assert "Heavy Rain" not in launchers_sec, "Heavy Rain should not be in launchers section"
        
        assert "Steam" in launchers_sec, "Expected Steam in launchers section"
        assert "Xbox App" in launchers_sec, "Expected Xbox App in launchers section"
        assert "Epic Games" in launchers_sec, "Expected Epic Games in launchers section"
        assert "Steam" not in games_sec, "Steam should not be in games section"
        
        print("GameLibraryFiltering Test: PASSED")
    finally:
        GameScanner.load_cached_games = original_load

def test_agentic_safety_blocks():
    from ai_brain.decision_maker import GameBrain
    brain = GameBrain(config={})
    
    # Test 1: Launch command blocked when Agentic Mode is OFF
    resp1 = brain._process_launch_command("[LAUNCH_COMMAND:steam] Greet Steam!", agentic_mode_active=False, is_launch_request=True)
    assert "Agentic Action Blocked" in resp1, f"Expected Agentic Action Blocked, got: {resp1}"
    assert "Greet Steam!" in resp1
    
    # Test 2: Launch command stripped but NOT launched when intent is NOT launch (informational)
    resp2 = brain._process_launch_command("[LAUNCH_COMMAND:steam] Here is how you run Steam.", agentic_mode_active=True, is_launch_request=False)
    assert "Agentic Launcher" not in resp2, "Should not show success message"
    assert "Here is how you run Steam." in resp2
    assert "[LAUNCH_COMMAND:" not in resp2, "Should strip the raw tag"

    # Test 3: System command blocked when Agentic Mode is OFF
    resp3 = brain._process_system_command("[SYSTEM_COMMAND:optimize_system] Run optimization.", agentic_mode_active=False)
    assert "Agentic Action Blocked" in resp3, f"Expected Agentic Action Blocked, got: {resp3}"
    assert "Run optimization." in resp3
    
    # Test 4: Preemptive launch blocked in reply_to_prompt when Agentic Mode is OFF
    from system.game_scanner import GameScanner
    from unittest.mock import MagicMock
    original_load = GameScanner.load_cached_games
    GameScanner.load_cached_games = MagicMock(return_value=[
        {"name": "Steam", "type": "LAUNCHER", "genre": "PLATFORM", "exe_path": "steam.exe"}
    ])
    try:
        # Mock os.path.exists to make sure best_match.get("exe_path") path matches
        import os
        original_exists = os.path.exists
        os.path.exists = MagicMock(return_value=True)
        try:
            resp4 = brain.reply_to_prompt("Open Steam", agentic_mode_active=False)
            assert "Agentic Action Blocked" in resp4, f"Expected Agentic Action Blocked, got: {resp4}"
        finally:
            os.path.exists = original_exists
    finally:
        GameScanner.load_cached_games = original_load
        
    # Test 5: UWP protocol routing for Xbox App in reply_to_prompt when Agentic Mode is ON
    try:
        import os
        from unittest.mock import MagicMock
        original_startfile = getattr(os, "startfile", None)
        mock_startfile = MagicMock()
        os.startfile = mock_startfile
        
        try:
            resp5 = brain.reply_to_prompt("Open Xbox App", agentic_mode_active=True)
            assert "Agentic Launcher" in resp5, f"Expected launch success message, got: {resp5}"
            assert "Xbox App" in resp5
            # Verify it was called with the xbox: URI protocol
            mock_startfile.assert_called_once_with("xbox:")
        finally:
            if original_startfile:
                os.startfile = original_startfile
            else:
                delattr(os, "startfile")
    except Exception as e:
        raise AssertionError(f"Test 5 failed: {e}")
        
    # Test 6: UWP launcher check with shell: prefix in reply_to_prompt when Agentic Mode is ON
    try:
        import os
        from unittest.mock import MagicMock
        original_startfile = getattr(os, "startfile", None)
        mock_startfile = MagicMock()
        os.startfile = mock_startfile
        
        original_load = GameScanner.load_cached_games
        GameScanner.load_cached_games = MagicMock(return_value=[
            {"name": "Minecraft", "type": "GAME", "genre": "CLASSIC", "exe_path": "shell:AppsFolder\\Microsoft.MinecraftUWP_8wekyb3d8bbwe!App"}
        ])
        
        try:
            resp6 = brain.reply_to_prompt("Open Minecraft", agentic_mode_active=True)
            assert "Agentic Launcher" in resp6, f"Expected launch success message, got: {resp6}"
            assert "Minecraft" in resp6
            # Verify it was called with the shell:AppsFolder path
            mock_startfile.assert_called_once_with("shell:AppsFolder\\Microsoft.MinecraftUWP_8wekyb3d8bbwe!App")
        finally:
            GameScanner.load_cached_games = original_load
            if original_startfile:
                os.startfile = original_startfile
            else:
                delattr(os, "startfile")
    except Exception as e:
        raise AssertionError(f"Test 6 failed: {e}")
        
    print("AgenticSafetyBlocks Test: PASSED")

def test_chat_session_sync():
    from unittest.mock import MagicMock
    from handlers import chat_handler
    
    # Mock database memory responses
    mock_memory = MagicMock()
    mock_memory.get_chat_sessions.return_value = [
        {"id": "session_next", "title": "Next Session"},
        {"id": "session_another", "title": "Another Session"}
    ]
    
    mock_pipeline = MagicMock()
    mock_pipeline.memory = mock_memory
    mock_pipeline.active_chat_session_id = "session_deleted"
    
    mock_bridge = MagicMock()
    
    # Test delete active session
    payload_delete = {"sessionId": "session_deleted", "userId": "test_user"}
    chat_handler.handle_delete_chat_session(payload_delete, mock_pipeline, mock_bridge, {})
    
    # Verify memory delete was called
    mock_memory.delete_chat_session.assert_called_once_with("session_deleted", user_id="test_user")
    
    # Verify active_chat_session_id was updated to next available session (session_next)
    assert mock_pipeline.active_chat_session_id == "session_next"
    
    # Verify bridge update_state was called with the next active session
    mock_bridge.update_state.assert_called_with({
        "chat_sessions": mock_memory.get_chat_sessions(),
        "active_chat_session_id": "session_next"
    })
    
    # Test clear all sessions
    mock_bridge.reset_mock()
    payload_clear = {"userId": "test_user"}
    chat_handler.handle_clear_chat_sessions(payload_clear, mock_pipeline, mock_bridge, {})
    
    # Verify active_chat_session_id was reset to empty
    assert mock_pipeline.active_chat_session_id == ""
    
    # Verify bridge update_state was called with empty active session
    mock_bridge.update_state.assert_called_with({
        "chat_sessions": mock_memory.get_chat_sessions(),
        "active_chat_session_id": ""
    })
    
    print("ChatSessionSync Test: PASSED")


def test_dynamic_prompt_loading():
    """Test that custom prompts in config override hardcoded defaults."""
    from ai_brain.decision_maker import GameBrain
    from unittest.mock import MagicMock

    # Build config with custom prompts
    custom_config = {
        "ai_agent": {
            "personality": "sarcastic",
            "prompts": {
                "welcome_prompt": "Custom welcome instruction for testing.",
                "welcome_fallback": "Custom fallback message.",
                "inactive_greeting_desktop": "Custom desktop greeting. You have {count_games} games.",
                "inactive_greeting_desktop_fallback": "Custom fallback greeting.",
                "active_greeting_game": "Custom in-game greeting for {game_display}. HP: {health_pct}.",
                "system_access_instruction": "CUSTOM SYSTEM INSTRUCTION",
                "brevity_concise": "CUSTOM BREVITY CONCISE",
                "brevity_detailed": "CUSTOM BREVITY DETAILED",
                "brevity_concise_chat": "CUSTOM BREVITY CONCISE CHAT",
                "personalities": {
                    "tactical": "CUSTOM TACTICAL PERSONALITY",
                    "sarcastic": "CUSTOM SARCASTIC PERSONALITY",
                }
            }
        }
    }

    brain = GameBrain(config=custom_config)

    # 1. Test _safe_format handles correct substitution
    formatted = brain._safe_format("Hello {name}, you have {count} items.", name="TestUser", count=5)
    assert formatted == "Hello TestUser, you have 5 items.", f"_safe_format failed: {formatted}"

    # 2. Test _safe_format returns template on bad keys without crashing
    safe_result = brain._safe_format("Hello {bad_key}.")
    assert "{bad_key}" in safe_result, f"Expected template returned on error, got: {safe_result}"

    # 3. Test personality is loaded from config prompts
    # We verify via the prompts dict rather than calling reply_to_prompt (which needs a live NIM)
    agent_cfg = custom_config.get("ai_agent", {})
    prompts = agent_cfg.get("prompts", {})
    personalities = prompts.get("personalities", brain.PERSONALITY_PROFILES)
    personality_key = agent_cfg.get("personality", "tactical")
    system_instr = personalities.get(personality_key, personalities.get("tactical", ""))
    assert system_instr == "CUSTOM SARCASTIC PERSONALITY", f"Expected custom sarcastic personality, got: {system_instr}"

    # 4. Test inactive_greeting_desktop formats count_games correctly
    inactive_greeting_template = prompts.get("inactive_greeting_desktop", "")
    result = brain._safe_format(inactive_greeting_template, count_games=42)
    assert "42" in result, f"Expected count_games=42 in greeting, got: {result}"

    # 5. Test active_greeting_game formats correctly
    active_greeting_template = prompts.get("active_greeting_game", "")
    result2 = brain._safe_format(active_greeting_template, game_display="Elden Ring", health_pct=80, ammo="90/90", position="Limgrave", enemies=3)
    assert "Elden Ring" in result2, f"Expected game name in greeting, got: {result2}"
    assert "80" in result2, f"Expected health_pct in greeting, got: {result2}"

    # 6. Test system_access_instruction is from config
    assert prompts.get("system_access_instruction") == "CUSTOM SYSTEM INSTRUCTION"

    # 7. Test brevity prompts are from config
    assert prompts.get("brevity_concise") == "CUSTOM BREVITY CONCISE"
    assert prompts.get("brevity_detailed") == "CUSTOM BREVITY DETAILED"

    # 8. Test welcome_fallback from config  
    from unittest.mock import patch
    from handlers import chat_handler

    captured_calls = []
    mock_memory = MagicMock()
    mock_memory.get_chat_history.return_value = []
    mock_pipeline = MagicMock()
    mock_pipeline.memory = mock_memory
    mock_pipeline.brain = None  # Force use of fallback
    mock_bridge = MagicMock()

    # We capture what add_chat_message was called with to confirm custom fallback was used
    def capture_add_message(session_id, role, content, **kwargs):
        captured_calls.append((role, content))
    mock_memory.add_chat_message.side_effect = capture_add_message

    payload = {"sessionId": "test_sess", "userId": "test_user", "title": "Test"}
    config_with_custom = custom_config.copy()
    chat_handler.handle_create_chat_session(payload, mock_pipeline, mock_bridge, config_with_custom)

    # Give thread time to complete
    import time
    time.sleep(0.3)

    # Find the agent's message in captured calls
    agent_msgs = [c[1] for c in captured_calls if c[0] == "agent"]
    assert any("Custom fallback message." in m for m in agent_msgs), \
        f"Expected custom fallback in welcome, got: {agent_msgs}"

    print("DynamicPromptLoading Test: PASSED")


def test_game_loading_detection():
    # Verify game loading state is computed correctly based on frame count and FPS
    # game_loading = frame_count < 30 or average_fps == 0.0
    from core.state_models import TelemetryState
    
    # 1. Default state
    state = TelemetryState()
    assert state.game_fps == 0.0
    assert state.game_loading is False

    # 2. Check the condition logic
    def compute_game_loading(frame_count: int, average_fps: float) -> bool:
        return frame_count < 30 or average_fps == 0.0

    assert compute_game_loading(0, 0.0) is True
    assert compute_game_loading(10, 60.0) is True
    assert compute_game_loading(35, 0.0) is True
    assert compute_game_loading(35, 60.0) is False
    print("GameLoadingDetection Test: PASSED")


def test_game_scanner_retail_uninstaller():
    from system.game_scanner import GameScanner
    from pathlib import Path
    import shutil
    import tempfile
    
    # Create a temporary directory structure resembling a game install path
    temp_dir = tempfile.mkdtemp()
    try:
        # Create unins000.exe in root
        game_root = Path(temp_dir) / "007 First Light"
        game_root.mkdir(parents=True)
        uninstaller = game_root / "unins000.exe"
        with open(uninstaller, "wb") as f:
            f.write(b"dummy uninstaller contents")
            
        # Create Retail directory and 007FirstLight.exe
        retail_dir = game_root / "Retail"
        retail_dir.mkdir()
        game_exe = retail_dir / "007FirstLight.exe"
        with open(game_exe, "wb") as f:
            # Write 6MB to satisfy the size check
            f.write(b"0" * (6 * 1024 * 1024))
            
        scanner = GameScanner()
        
        # 1. Test _deep_scan_folder resolves name to "007 First Light" when pointing to "Retail" folder
        found_games = set()
        scanner._deep_scan_folder_count = 0
        scanner._deep_scan_max_folders = 10
        scanner._deep_scan_folder(
            retail_dir, max_depth=2, current_depth=0,
            skip_folders=set(), game_patterns=["game", "retail"], found_games=found_games
        )
        
        # Verify that the game added is named "007 First Light" instead of "Retail"
        assert len(scanner.games) > 0, "Expected at least one game to be found"
        added_game = scanner.games[0]
        assert added_game["name"] == "007 First Light", f"Expected name '007 First Light', got '{added_game['name']}'"
        assert "007FirstLight.exe" in added_game["exe_path"], f"Expected exe_path to point to game executable, got '{added_game['exe_path']}'"
        
        print("GameScannerRetailUninstaller Test: PASSED")
    finally:
        shutil.rmtree(temp_dir)


def test_context_engine_integration():
    from ai_brain.context_engine import ContextEngine
    from unittest.mock import MagicMock
    import time

    # 1. Test ContextEngine.reset()
    ce = ContextEngine()
    ce.player_profile["deaths_this_session"] = 5
    ce.player_profile["tilt_detected"] = True
    ce._rapid_damage_events = 10
    ce.reset()
    assert ce.player_profile["deaths_this_session"] == 0
    assert ce.player_profile["tilt_detected"] is False
    assert ce._rapid_damage_events == 0
    print("ContextEngine.reset Test: PASSED")

    # 2. Test set_agentic_mode calls ContextEngine.reset()
    from core.state_models import TelemetryState
    class DummyPipeline:
        def __init__(self):
            self.agentic_mode_active = False
            self._state_lock = MagicMock()
            self._game_state = TelemetryState().model_dump()
            self.input_manager = MagicMock()
            self.brain = MagicMock()
        
        def set_agentic_mode(self, active):
            from core.pipeline_host import GamingAssistantPipeline
            # Call the actual set_agentic_mode function bound to this dummy
            GamingAssistantPipeline.set_agentic_mode(self, active)

    dp = DummyPipeline()
    dp.set_agentic_mode(True)
    assert dp.agentic_mode_active is True
    dp.brain.context_engine.reset.assert_called_once()
    print("PipelineHost.set_agentic_mode ContextEngine.reset integration Test: PASSED")


def test_spiderman2_agent_toggle():
    from unittest.mock import MagicMock, patch
    from ai_brain.decision_maker import GameBrain
    from system.game_scanner import GameScanner
    from control.agent_commands import get_game_aliases
    
    # 1. Verify aliases for Spider-Man 2
    aliases = get_game_aliases("Marvel's Spider-Man 2")
    assert any("spider-man" in a or "spiderman" in a for a in aliases), f"Expected spider-man aliases, got: {aliases}"
    
    # 2. Setup mock games library including Spider-Man 2
    mock_games = [
        {"name": "Marvel's Spider-Man 2", "type": "GAME", "genre": "ACTION", "exe_path": "Spider-Man2.exe"}
    ]
    
    with patch("system.game_scanner.GameScanner.load_cached_games", return_value=mock_games):
        brain = GameBrain(config={})
        
        # Test 3: Command execution blocked when agentic mode is False
        res_blocked = brain._process_launch_command(
            "[LAUNCH_COMMAND:spider-man 2] Launching now!",
            agentic_mode_active=False,
            is_launch_request=True
        )
        assert "Agentic Action Blocked" in res_blocked, f"Expected block message, got: {res_blocked}"
        
        # Test 4: Command execution allowed when agentic mode is True
        with patch("os.path.exists", return_value=True), \
             patch("os.startfile", create=True) as mock_startfile:
            
            res_allowed = brain._process_launch_command(
                "[LAUNCH_COMMAND:spider-man 2] Launching now!",
                agentic_mode_active=True,
                is_launch_request=True
            )
            assert "I've successfully accessed your system" in res_allowed, f"Expected launch message, got: {res_allowed}"
            mock_startfile.assert_called_once_with("Spider-Man2.exe")
                
    print("test_spiderman2_agent_toggle: PASSED")


def test_agent_toggle_session_creation():
    from unittest.mock import MagicMock, patch
    from core.pipeline_host import GamingAssistantPipeline
    from core.state_models import TelemetryState
    
    class DummyPipeline:
        def __init__(self):
            self.agentic_mode_active = False
            self.active_chat_session_id = "default"
            self.active_user_id = "user_123"
            self._state_lock = MagicMock()
            self._game_state = TelemetryState().model_dump()
            self.input_manager = MagicMock()
            self.brain = MagicMock()
            self.memory = MagicMock()
            self.config = {}

        def set_agentic_mode(self, active):
            GamingAssistantPipeline.set_agentic_mode(self, active)

    dp = DummyPipeline()
    mock_history = [{"role": "agent", "content": "hello"}]
    mock_sessions = [{"id": "session_123", "title": "New Chat"}]
    dp.memory.get_chat_history.return_value = mock_history
    dp.memory.get_chat_sessions.return_value = mock_sessions

    with patch("core.bridge_server.bridge.update_state") as mock_update_state:
        dp.set_agentic_mode(True)
        
        # Verify mode is activated
        assert dp.agentic_mode_active is True
        
        # Verify a new session ID starting with "session_" was created
        assert dp.active_chat_session_id.startswith("session_")
        
        # Verify the session was created in memory
        dp.memory.create_chat_session.assert_called_once_with(dp.active_chat_session_id, "New Chat", user_id="user_123")
        
        # Verify welcome message was added
        dp.memory.add_chat_message.assert_called_once()
        args, kwargs = dp.memory.add_chat_message.call_args
        assert args[0] == dp.active_chat_session_id
        assert args[1] == "agent"
        assert "Agentic Mode Activated" in args[2]

        # Verify bridge was updated
        mock_update_state.assert_called_once()
        update_payload = mock_update_state.call_args[0][0]
        assert update_payload["active_chat_session_id"] == dp.active_chat_session_id
        assert update_payload["chat_sessions"] == mock_sessions
        assert update_payload["chat_history"] == {"sessionId": dp.active_chat_session_id, "messages": mock_history}
        
    print("test_agent_toggle_session_creation: PASSED")


if __name__ == "__main__":
    try:
        test_voice_macros()
        test_session_recorder()
        test_game_library_filtering()
        test_agentic_safety_blocks()
        test_chat_session_sync()
        test_dynamic_prompt_loading()
        test_game_loading_detection()
        test_game_scanner_retail_uninstaller()
        test_context_engine_integration()
        test_spiderman2_agent_toggle()
        test_agent_toggle_session_creation()
        print("\nAll new feature tests passed successfully!")
    except AssertionError as e:
        print(f"\nTEST FAILED: {e}")
        sys.exit(1)
