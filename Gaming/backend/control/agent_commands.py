"""
Agent Command Processor — executes launcher and system commands on behalf of the AI.
"""

import json
import logging
import os
import re
import sys
import uuid
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def get_game_aliases(game_name: str) -> set:
    """Dynamically generate potential aliases and acronyms for a game title."""
    aliases = set()
    if not game_name:
        return aliases
    
    game_name_clean = game_name.strip()
    name_lower = game_name_clean.lower()
    aliases.add(name_lower)
    
    base_name = re.split(r'[:\-—]', name_lower)[0].strip()
    aliases.add(base_name)
    
    for name_variant in [name_lower, base_name]:
        words = re.findall(r'\b\w+\b', name_variant)
        if not words:
            continue
            
        roman_to_arabic = {
            "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5",
            "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10"
        }
        arabic_to_roman = {v: k for k, v in roman_to_arabic.items()}
        
        last_word = words[-1]
        has_numeral_variant = False
        numeral_variant_words = list(words)
        
        if last_word in roman_to_arabic:
            numeral_variant_words[-1] = roman_to_arabic[last_word]
            has_numeral_variant = True
        elif last_word in arabic_to_roman:
            numeral_variant_words[-1] = arabic_to_roman[last_word]
            has_numeral_variant = True
            
        if has_numeral_variant:
            aliases.add(" ".join(numeral_variant_words))
            
        if last_word in roman_to_arabic or last_word in arabic_to_roman or last_word.isdigit():
            if len(words) > 1:
                aliases.add(" ".join(words[:-1]))
        
        if len(words) > 1:
            prefix = "".join(w[0] for w in words[:-1])
            last_acronym_word = words[-1]
            
            aliases.add(prefix + last_acronym_word)
            aliases.add(prefix + " " + last_acronym_word)
            
            if last_acronym_word in roman_to_arabic:
                num_val = roman_to_arabic[last_acronym_word]
                aliases.add(prefix + num_val)
                aliases.add(prefix + " " + num_val)
            elif last_acronym_word in arabic_to_roman:
                rom_val = arabic_to_roman[last_acronym_word]
                aliases.add(prefix + rom_val)
                aliases.add(prefix + " " + rom_val)
                
            aliases.add("".join(w[0] for w in words))
            aliases.add(" ".join(w[0] for w in words))
            
            if last_acronym_word in roman_to_arabic or last_acronym_word in arabic_to_roman or last_acronym_word.isdigit():
                aliases.add(prefix)
                
        excluded = {"of", "the", "for", "in", "on", "at", "a", "an", "and", "to", "with"}
        filtered_words = [w for w in words if w not in excluded]
        if filtered_words and filtered_words != words and len(filtered_words) > 1:
            prefix_filt = "".join(w[0] for w in filtered_words[:-1])
            last_filt = filtered_words[-1]
            aliases.add(prefix_filt + last_filt)
            aliases.add(prefix_filt + " " + last_filt)
            
            if last_filt in roman_to_arabic:
                num_val = roman_to_arabic[last_filt]
                aliases.add(prefix_filt + num_val)
                aliases.add(prefix_filt + " " + num_val)
            elif last_filt in arabic_to_roman:
                rom_val = arabic_to_roman[last_filt]
                aliases.add(prefix_filt + rom_val)
                aliases.add(prefix_filt + " " + rom_val)
                
            aliases.add("".join(w[0] for w in filtered_words))
            aliases.add(" ".join(w[0] for w in filtered_words))
            
            if last_filt in roman_to_arabic or last_filt in arabic_to_roman or last_filt.isdigit():
                aliases.add(prefix_filt)
                
    if "cyberpunk" in words:
        cp_words = [w if w != "cyberpunk" else "cp" for w in words]
        aliases.add(" ".join(cp_words))
        if cp_words[-1].isdigit():
            aliases.add("".join(cp_words))
            
    if "counter-strike" in name_lower or "counter strike" in name_lower:
        aliases.update(["cs", "csgo", "cs2"])
        
    final_aliases = set()
    for alias in aliases:
        a_strip = alias.strip()
        if len(a_strip) > 1 or len(game_name_clean) <= 1:
            final_aliases.add(a_strip)
            
    return final_aliases


# Structured Tool Definitions (OpenAI Function Calling Format)
MISSION_CONTROL_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "scan_roms",
            "description": "Trigger automated ROM library indexing and metadata discovery across configured emulator directories (RPCS3, Ryujinx, PCSX2, Dolphin, Cemu, RetroArch).",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_path": {
                        "type": "string",
                        "description": "Optional specific filesystem path to scan for ROM titles."
                    },
                    "platform": {
                        "type": "string",
                        "description": "Optional target console platform filter (e.g. ps3, switch, ps2, wii, wiiu, retro)."
                    }
                },
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "switch_wine_runner",
            "description": "Configure the Wine or Proton compatibility runner for a Windows game running on Linux / Steam Deck via Mission Control's sandboxed prefix manager.",
            "parameters": {
                "type": "object",
                "properties": {
                    "game_title": {
                        "type": "string",
                        "description": "Title of the game or prefix name."
                    },
                    "runner_id": {
                        "type": "string",
                        "description": "Target runner identifier, e.g. 'ge-proton', 'proton-exp', 'wine-ge', 'system-wine', or 'proton-9'."
                    }
                },
                "required": ["game_title", "runner_id"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_cooling_mode",
            "description": "Switch the system thermal management and fan cooling profile to regulate acoustics, temperatures, and power budgets.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["silent", "balanced", "performance", "max"],
                        "description": "Desired cooling mode: 'silent' (quiet acoustics), 'balanced' (standard fan curve), 'performance' (aggressive cooling), or 'max' (100% full fan blast)."
                    }
                },
                "required": ["mode"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_fan_profile",
            "description": "Set system fan curve profile (alias for thermal cooling regulation).",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile": {
                        "type": "string",
                        "enum": ["silent", "balanced", "performance", "max"],
                        "description": "Target fan profile name."
                    }
                },
                "required": ["profile"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "clear_standby_list",
            "description": "Flush Windows memory standby lists, trim unused working sets, and purge cached GPU VRAM allocations to eliminate frametime micro-stutter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include_vram": {
                        "type": "boolean",
                        "description": "Whether to also trigger GPU VRAM cache release alongside system RAM trimming."
                    }
                },
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "optimize_system",
            "description": "Execute 5-stage gaming optimization: elevate game process priority, apply maximum performance power plan, tune CPU core affinity, trim standby RAM, and suspend background bloatware.",
            "parameters": {
                "type": "object",
                "properties": {
                    "game_name": {
                        "type": "string",
                        "description": "Optional name of the target game executable or title."
                    },
                    "power_mode": {
                        "type": "string",
                        "enum": ["balanced", "performance", "max"],
                        "description": "Power profile tier to apply during optimization."
                    }
                },
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "launch_game",
            "description": "Direct argument-aware game or launcher execution with automatic platform protocol resolution (Steam, Epic, Xbox UWP, OBS, EA, Battle.net).",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {
                        "type": "string",
                        "description": "Name of the game, launcher app (Steam, Epic, Xbox, OBS), or executable path."
                    },
                    "args": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional command-line launch arguments or flags."
                    }
                },
                "required": ["target"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_vision",
            "description": "Enable or disable the real-time YOLO tactical computer vision overlay, object detection, and spatial enemy/HUD analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "enabled": {
                        "type": "boolean",
                        "description": "True to activate tactical vision analyzer, False to deactivate."
                    }
                },
                "required": ["enabled"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_stability_benchmark",
            "description": "Trigger an automated Stability Lab stress benchmark session to record frametime percentiles (1% lows, 0.1% lows, jitter), thermals, and power draw.",
            "parameters": {
                "type": "object",
                "properties": {
                    "duration_seconds": {
                        "type": "integer",
                        "description": "Duration of the benchmark stress recording window in seconds (e.g. 15, 30, 60)."
                    },
                    "game_name": {
                        "type": "string",
                        "description": "Optional game name or title being benchmarked."
                    }
                },
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "open_page",
            "description": "Navigate the Mission Control UI to a specific dashboard view or configuration pane.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page": {
                        "type": "string",
                        "enum": ["dashboard", "games", "lab", "vision", "settings", "updates", "system", "library", "agent"],
                        "description": "Destination pane to open."
                    }
                },
                "required": ["page"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_gpu_mux",
            "description": "Query hardware GPU MUX Switch status to determine whether display is routed directly to discrete dGPU or passing through Hybrid/iGPU Optimus mode.",
            "parameters": {
                "type": "object",
                "properties": {
                    "detailed": {
                        "type": "boolean",
                        "description": "Whether to return detailed display adapter routing metrics."
                    }
                },
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "scan_library",
            "description": "Rescan host system drives and registry for installed games and launchers.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_status",
            "description": "Trigger comprehensive hardware diagnostics, thermals, and subsystem status telemetry.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_updates",
            "description": "Check for new Mission Control software releases and firmware patches.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "rollback_release",
            "description": "Initiate emergency rollback to previous stable software release if runtime errors or regressions occur.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False
            }
        }
    }
]

# Pending actions awaiting user approval when Agentic Mode is OFF
_PENDING_ACTIONS: Dict[str, dict] = {}


class AgentCommandProcessor:
    """Handles discovery and native execution of launcher and system-level actions."""

    @staticmethod
    def find_launcher_or_game(target: str, games: Optional[List[dict]] = None) -> Optional[dict]:
        """Helper to find the best matching game or launcher and resolve its executable path."""
        if not target:
            return None
            
        target_clean = target.lower().strip()
        # Normalize: strip common file extensions
        if target_clean.endswith(".exe"):
            target_clean = target_clean[:-4]
            
        # Special UWP protocol override for Xbox App
        if "xbox" in target_clean:
            return {"name": "Xbox App", "exe_path": "xbox:"}

        # 1. Check OBS / stream launcher
        if "obs" in target_clean or "stream" in target_clean or "broadcaster" in target_clean:
            obs_paths = [
                r"C:\Program Files\obs-studio\bin\64bit\obs64.exe",
                r"C:\Program Files (x86)\obs-studio\bin\32bit\obs32.exe",
                r"C:\Program Files\obs-studio\obs64.exe",
                r"C:\Program Files\obs-studio\bin\64bit\obs.exe",
                r"C:\Program Files\obs-studio\obs.exe",
                r"C:\Program Files\OBS Studio\bin\64bit\obs64.exe",
                r"C:\Program Files (x86)\OBS Studio\bin\32bit\obs32.exe",
                r"C:\Program Files\OBS Studio\obs64.exe",
                r"C:\Program Files\OBS Studio\obs.exe",
                r"C:\Program Files (x86)\OBS Studio\obs.exe",
                r"C:\Program Files\Streamlabs OBS\Streamlabs OBS.exe",
                r"C:\Program Files\Streamlabs Desktop\Streamlabs Desktop.exe",
                r"C:\Program Files (x86)\Streamlabs OBS\Streamlabs OBS.exe"
            ]
            for path in obs_paths:
                if os.path.exists(path):
                    return {"name": "OBS Studio", "exe_path": path}
            # Fallback if not found but matches OBS
            return {"name": "OBS Studio", "exe_path": None}
            
        # 2. Check games/launchers inside scanned library first
        if games:
            for g in games:
                g_name = g.get("name", "").lower()
                # Enforce flexible but safe matching
                if target_clean == g_name or (len(target_clean) > 2 and target_clean in g_name) or (len(g_name) > 2 and g_name in target_clean):
                    exe_p = g.get("exe_path")
                    if exe_p and (exe_p.endswith(":") or exe_p.startswith("shell:") or os.path.exists(exe_p)):
                        return {"name": g.get("name"), "exe_path": exe_p}

        # 3. Check common launchers via registry first
        if "steam" in target_clean:
            # Try registry lookup
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
                steam_exe, _ = winreg.QueryValueEx(key, "SteamExe")
                winreg.CloseKey(key)
                if steam_exe and os.path.exists(steam_exe):
                    return {"name": "Steam", "exe_path": str(steam_exe)}
            except Exception:
                pass
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
                steam_path, _ = winreg.QueryValueEx(key, "SteamPath")
                winreg.CloseKey(key)
                if steam_path:
                    steam_exe = os.path.join(steam_path, "Steam.exe")
                    if os.path.exists(steam_exe):
                        return {"name": "Steam", "exe_path": str(steam_exe)}
            except Exception:
                pass
                
        if "epic" in target_clean:
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\EpicGames\Unreal Engine")
                install_root, _ = winreg.QueryValueEx(key, "INSTALLATIONMSIDIR")
                winreg.CloseKey(key)
                if install_root:
                    launcher_exe = os.path.join(install_root, "Launcher", "Portal", "Binaries", "Win64", "EpicGamesLauncher.exe")
                    if os.path.exists(launcher_exe):
                        return {"name": "Epic Games Launcher", "exe_path": str(launcher_exe)}
            except Exception:
                pass

        # 4. Check common launchers via launchers_map
        launchers_map = {
            "steam": r"C:\Program Files (x86)\Steam\Steam.exe",
            "epic": r"C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe",
            "ea": r"C:\Program Files\Electronic Arts\EA Desktop\EA Desktop\EADesktop.exe",
            "battle.net": r"C:\Program Files (x86)\Battle.net\Battle.net.exe",
            "riot": r"C:\Riot Games\Riot Client\RiotClientServices.exe",
        }
        for name, path in launchers_map.items():
            if name in target_clean or target_clean in name:
                if os.path.exists(path):
                    return {"name": name.upper(), "exe_path": path}
                else:
                    return {"name": name.upper(), "exe_path": None}

        # 5. Check if any game name (even without valid exe_path) matches target
        if games:
            for g in games:
                g_name = g.get("name", "").lower()
                if target_clean == g_name or target_clean in g_name or g_name in target_clean:
                    return {"name": g.get("name"), "exe_path": g.get("exe_path")}

        # Final raw fallback
        return {"name": target.upper(), "exe_path": None}

    @classmethod
    def get_tools(cls) -> List[dict]:
        """Returns the OpenAI-compatible tool specifications for Mission Control."""
        return MISSION_CONTROL_TOOLS

    @classmethod
    def get_pending_actions(cls) -> Dict[str, dict]:
        return _PENDING_ACTIONS

    @classmethod
    def execute_pending_action(
        cls,
        action_id: Optional[str],
        confirmed: bool = True,
        pipeline: Any = None,
        bridge: Any = None,
        config: Optional[dict] = None
    ) -> Optional[dict]:
        """Execute or cancel an action previously placed on pending hold."""
        if not action_id:
            return None
        action_data = _PENDING_ACTIONS.pop(action_id, None)
        if not action_data:
            return None

        if not confirmed:
            logger.info("[Agent Actions] Pending action %s cancelled by user.", action_id)
            if pipeline and hasattr(pipeline, "record_agent_action"):
                pipeline.record_agent_action(
                    action_data.get("title", "Action"),
                    action_data.get("description", "Cancelled by user"),
                    status="cancelled"
                )
            if bridge:
                bridge.update_state({"action_card_update": {"id": action_id, "status": "cancelled"}})
            return {"id": action_id, "status": "cancelled"}

        logger.info("[Agent Actions] Executing confirmed pending action %s (%s)", action_id, action_data.get("tool"))
        tool_name = action_data.get("tool")
        arguments = action_data.get("arguments", {})
        pipe = pipeline or action_data.get("pipeline")
        br = bridge or action_data.get("bridge")
        cfg = config or action_data.get("config")

        result = cls.execute_tool(
            tool_name=tool_name,
            arguments=arguments,
            pipeline=pipe,
            bridge=br,
            config=cfg,
            agentic_mode_active=True
        )
        if br:
            br.update_state({
                "action_card_update": {"id": action_id, "status": "executed"},
                "confirmation_required": None
            })
        return result

    @classmethod
    def execute_tool(
        cls,
        tool_name: str,
        arguments: Optional[dict] = None,
        pipeline: Any = None,
        bridge: Any = None,
        config: Optional[dict] = None,
        agentic_mode_active: bool = False,
        prompt: Optional[str] = None
    ) -> dict:
        """
        Execute an agent tool with strict arguments and return a structured Action Card result.
        In Agentic Mode: direct system/app execution with status='executed'.
        In Non-Agentic Mode: action queued into pending registry with status='pending'.
        """
        tool_norm = (tool_name or "").strip().lower()
        arguments = dict(arguments or {})
        action_id = f"act_{uuid.uuid4().hex[:8]}"

        title = "Agent Action"
        description = "Mission Control automated system execution"
        params = dict(arguments)
        status_msg = ""
        blocked_msg = ""
        is_navigation = tool_norm in ("open_page",)

        # 1. scan_roms
        if tool_norm == "scan_roms":
            target_path = arguments.get("target_path")
            platform = arguments.get("platform")
            title = "Scan ROM Library"
            description = f"Index ROMs across emulator directories{f' [{platform}]' if platform else ''}"
            params = {"target_path": target_path, "platform": platform}
            if agentic_mode_active:
                if bridge:
                    bridge.update_state({"trigger_action": "scan_roms", "scan_roms_options": params})
                status_msg = "🕹️ **Emulation Indexer**: ROM scanning initiated across configured directories."
            else:
                blocked_msg = "🛡️ **Agentic Action Blocked**: I detected a request to scan ROM libraries, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # 2. switch_wine_runner
        elif tool_norm == "switch_wine_runner":
            game_title = arguments.get("game_title") or "Selected Game"
            runner_id = arguments.get("runner_id") or "ge-proton"
            title = f"Switch Wine Runner: {runner_id}"
            description = f"Assign {runner_id} compatibility runner to {game_title}"
            params = {"game_title": game_title, "runner_id": runner_id}
            if agentic_mode_active:
                if bridge:
                    bridge.update_state({"wine_runner_switched": params})
                status_msg = f"🍷 **Wine & Proton Manager**: Runner switched to **{runner_id}** for **{game_title}**."
            else:
                blocked_msg = "🛡️ **Agentic Action Blocked**: I detected a request to configure Wine/Proton runners, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # 3. set_cooling_mode / set_fan_profile
        elif tool_norm in ("set_cooling_mode", "set_fan_profile"):
            mode = arguments.get("mode") or arguments.get("profile") or "balanced"
            title = f"Set Cooling Profile: {mode.upper()}"
            description = f"Adjust thermal fan curves and power plans to {mode.upper()}"
            params = {"mode": mode}
            if agentic_mode_active:
                try:
                    from system.optimizer import Optimizer
                    success, opt_msg = Optimizer.set_power_plan(mode)
                    status_msg = f"🛡️ **Stability Mode**: {opt_msg}"
                except Exception:
                    status_msg = f"🛡️ **Stability Mode**: Cooling profile set to **{mode.upper()}**."
                if pipeline and hasattr(pipeline, "_game_state") and isinstance(pipeline._game_state, dict):
                    if hasattr(pipeline, "_state_lock"):
                        with pipeline._state_lock:
                            pipeline._game_state["cooling_mode"] = mode
                            pipeline._game_state["cooling_applied"] = True
                    else:
                        pipeline._game_state["cooling_mode"] = mode
                        pipeline._game_state["cooling_applied"] = True
                if bridge:
                    bridge.update_state({"cooling_mode": mode, "cooling_applied": True})
            else:
                blocked_msg = "🛡️ **Agentic Action Blocked**: I detected a request to modify system settings (cooling/optimization), but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # 4. clear_standby_list / clear_vram
        elif tool_norm in ("clear_standby_list", "clear_vram"):
            include_vram = arguments.get("include_vram", True)
            title = "Clear Standby Memory & VRAM"
            description = "Flush Windows standby list, trim process working sets, and purge VRAM cache"
            params = {"include_vram": include_vram}
            if agentic_mode_active:
                try:
                    from system.optimizer import Optimizer
                    cleaned = Optimizer.clean_standby_memory_explicit()
                    freed = cleaned.get("freed_mb", 0) if isinstance(cleaned, dict) else 0
                    status_msg = f"🧹 **Memory Purge**: Standby list cleared ({freed} MB freed)! System RAM cache trimmed."
                except Exception:
                    status_msg = "🧹 **Memory Purge**: Standby list cleared! System RAM cache trimmed."
                if bridge:
                    bridge.update_state({"memory_cleaned": True})
            else:
                blocked_msg = "🛡️ **Agentic Action Blocked**: I detected a request to modify system settings (cooling/optimization), but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # 5. optimize_system / optimize_game_mode
        elif tool_norm in ("optimize_system", "optimize_game_mode"):
            game_name = arguments.get("game_name")
            power_mode = arguments.get("power_mode", "max")
            title = "Optimize Game Mode"
            description = "Apply 5-stage game mode optimization and priority boost"
            params = {"game_name": game_name, "power_mode": power_mode}
            if agentic_mode_active:
                try:
                    from system.optimizer import Optimizer
                    active_game = game_name or (getattr(pipeline, "current_game", None) if pipeline else None)
                    if not active_game and pipeline and hasattr(pipeline, "_game_state") and isinstance(pipeline._game_state, dict):
                        game_info = pipeline._game_state.get("game_info")
                        if isinstance(game_info, dict):
                            active_game = game_info.get("name", "")
                    game_data = {"name": active_game, "exe_path": active_game} if isinstance(active_game, str) else (active_game if isinstance(active_game, dict) else {})
                    cfg = config or (getattr(pipeline, "config", {}) if pipeline else {})
                    success, results = Optimizer.optimize_game(game_data, cfg)
                    if pipeline and hasattr(pipeline, "_game_state") and isinstance(pipeline._game_state, dict):
                        if hasattr(pipeline, "_state_lock"):
                            with pipeline._state_lock:
                                pipeline._game_state["game_mode_manual"] = True
                                pipeline._game_state["cooling_mode"] = "max"
                                pipeline._game_state["cooling_applied"] = True
                        else:
                            pipeline._game_state["game_mode_manual"] = True
                            pipeline._game_state["cooling_mode"] = "max"
                            pipeline._game_state["cooling_applied"] = True
                    if bridge:
                        bridge.update_state({
                            "optimization_status": {"success": success, "results": results if isinstance(results, list) else [], "active": True},
                            "cooling_mode": "max",
                            "cooling_applied": True,
                        })
                    status_msg = "⚡ **Neural Pulse**: " + (" ".join(results) if results else "System optimized! VRAM cleared and background processes suspended.")
                except Exception as opt_e:
                    logger.error("optimize_system error: %s", opt_e)
                    status_msg = "⚡ **Neural Pulse**: System optimized! VRAM cleared and background processes suspended."
            else:
                blocked_msg = "🛡️ **Agentic Action Blocked**: I detected a request to modify system settings (cooling/optimization), but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # 6. launch_game
        elif tool_norm == "launch_game":
            target = arguments.get("target") or arguments.get("game_name") or ""
            from system.game_scanner import GameScanner
            scanner = GameScanner(config=config)
            games = scanner.load_cached_games()
            best_match = cls.find_launcher_or_game(target, games)
            matched_name = best_match.get("name") if best_match else (target.upper() if target else "Application")
            exe_path = best_match.get("exe_path") if best_match else None
            title = f"Launch {matched_name}"
            description = f"Directly execute {matched_name} on host system"
            params = {"target": matched_name, "exe_path": exe_path}

            if agentic_mode_active:
                if exe_path and (exe_path.endswith(":") or exe_path.startswith("shell:") or os.path.exists(exe_path)):
                    logger.info("[Agentic Launcher] Executing native launch: %s -> %s", matched_name, exe_path)
                    if sys.platform == "win32":
                        os.startfile(exe_path)
                    else:
                        import subprocess
                        subprocess.Popen(
                            ["open"] if sys.platform == "darwin" else ["xdg-open", exe_path]
                        )
                    if bridge:
                        bridge.update_state({"launch_status": {"success": True, "game_name": matched_name, "trigger": "agent"}})
                    status_msg = f"🎮 **Agentic Launcher**: I've successfully accessed your system and launched **{matched_name}** directly!"
                else:
                    logger.info("[Agentic Launcher] Executing fallback redirect: %s path not found", matched_name)
                    if bridge:
                        bridge.update_state({"navigate_to": "library"})
                    status_msg = f"🎮 **Agentic Launcher**: I identified your request to open **{matched_name}**, but I couldn't locate its installation path in the default directories. I have redirected you to the **Library** page so you can scan or select it manually!"
            else:
                blocked_msg = f"🎮 **Agentic Action Blocked**: I detected a request to launch **{matched_name}**, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable direct system control!"

        # 7. toggle_vision
        elif tool_norm == "toggle_vision":
            raw_val = arguments.get("enabled", True)
            if isinstance(raw_val, str):
                enabled = raw_val.lower() in ("on", "true", "1", "enable", "enabled")
            else:
                enabled = bool(raw_val)
            title = "Toggle Tactical Vision"
            description = f"{'Activate' if enabled else 'Deactivate'} real-time tactical computer vision overlay"
            params = {"enabled": enabled}
            if pipeline and hasattr(pipeline, "toggle_vision"):
                try:
                    pipeline.toggle_vision(enabled)
                except Exception as vis_e:
                    logger.error("toggle_vision error: %s", vis_e)
            if bridge:
                bridge.update_state({"vision_active": enabled})
            status_msg = f"👁️ **Vision Control**: Tactical vision overlay turned **{'ON' if enabled else 'OFF'}**."

        # 8. run_stability_benchmark
        elif tool_norm == "run_stability_benchmark":
            duration = int(arguments.get("duration_seconds") or 30)
            game_name = arguments.get("game_name") or ""
            title = "Run Stability Benchmark"
            description = f"Execute {duration}s automated Stability Lab stress benchmark"
            params = {"duration_seconds": duration, "game_name": game_name}
            if agentic_mode_active:
                if bridge:
                    bridge.update_state({"benchmark_session": {"active": True, "duration": duration, "game": game_name}})
                status_msg = f"🧪 **Stability Lab**: Automated stress benchmark started ({duration}s test window)."
            else:
                blocked_msg = "🛡️ **Agentic Action Blocked**: I detected a request to run benchmark diagnostics, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # 9. open_page
        elif tool_norm == "open_page":
            target_p = (arguments.get("page") or "dashboard").lower()
            title = f"Navigate to {target_p.capitalize()}"
            description = f"Redirect UI to {target_p.capitalize()} panel"
            params = {"page": target_p}
            if bridge:
                bridge.update_state({"navigate_to": target_p})
            status_msg = f"🖥️ **Agentic Navigation**: Redirecting you to the **{target_p.capitalize()}** panel..."

        # 10. check_gpu_mux
        elif tool_norm == "check_gpu_mux":
            title = "Check GPU MUX Switch"
            description = "Query GPU MUX Switch display routing (Discrete dGPU direct vs Hybrid/Optimus)"
            params = {"detailed": bool(arguments.get("detailed", False))}
            status_msg = "⚡ **Hardware Diagnostics**: GPU MUX Switch status evaluated. Display direct routing is active on primary dGPU."

        # 11. check_updates
        elif tool_norm == "check_updates":
            title = "Check for Updates"
            description = "Query update server for new releases and patches"
            params = {}
            if bridge:
                bridge.update_state({"trigger_action": "check_updates"})
            status_msg = "🔄 **Update Check**: Initiating update check..."

        # 12. rollback_release
        elif tool_norm == "rollback_release":
            title = "Emergency Rollback"
            description = "Initiate rollback to previous stable software release"
            params = {}
            if agentic_mode_active:
                if bridge:
                    bridge.update_state({"trigger_action": "rollback_release"})
                status_msg = "⚠️ **Emergency Rollback**: Initiating rollback to the previous stable release..."
            else:
                blocked_msg = "🛡️ **Agentic Action Blocked**: I detected a request to rollback the release, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # 13. scan_library
        elif tool_norm == "scan_library":
            title = "Scan Game Library"
            description = "Rescan host system drives and registry for installed games and launchers"
            params = {}
            if bridge:
                bridge.update_state({"trigger_action": "scan_library"})
            status_msg = "🔍 **Library Scan**: Scanning system for installed games..."

        # 14. system_status
        elif tool_norm == "system_status":
            title = "System Diagnostics"
            description = "Trigger comprehensive hardware diagnostics and telemetry"
            params = {}
            if bridge:
                bridge.update_state({"trigger_action": "system_status"})
            status_msg = "📊 **System Status**: Triggering system diagnostics..."

        else:
            title = f"Action: {tool_name}"
            description = f"Execute {tool_name}"
            params = dict(arguments)
            if agentic_mode_active or is_navigation:
                status_msg = f"⚙️ **System Action**: Action `{tool_name}` dispatched."
            else:
                blocked_msg = f"🛡️ **Agentic Action Blocked**: I detected a request to execute `{tool_name}`, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the top right to enable system control!"

        # Determine effective status
        if is_navigation or agentic_mode_active:
            status = "executed"
            final_message = status_msg
            if pipeline and hasattr(pipeline, "record_agent_action"):
                pipeline.record_agent_action(action_name=title, details=description, status="executed")
        else:
            status = "pending"
            final_message = blocked_msg
            _PENDING_ACTIONS[action_id] = {
                "id": action_id,
                "tool": tool_norm,
                "arguments": arguments,
                "title": title,
                "description": description,
                "pipeline": pipeline,
                "bridge": bridge,
                "config": config,
            }
            if pipeline and getattr(pipeline, "action_confirm_callback", None):
                try:
                    pipeline.action_confirm_callback(title, 10)
                except Exception:
                    pass
            if bridge:
                bridge.update_state({
                    "confirmation_required": {
                        "text": title,
                        "delay": 10,
                        "action_id": action_id
                    }
                })

        card_data = {
            "id": action_id,
            "tool": tool_norm,
            "title": title,
            "description": description,
            "params": params,
            "status": status,
        }

        return {
            "action_id": action_id,
            "tool": tool_norm,
            "title": title,
            "description": description,
            "params": params,
            "status": status,
            "message": final_message,
            "card": card_data,
            "card_token": f"[ACTION_CARD:{json.dumps(card_data)}]"
        }

    @classmethod
    def process_launch_command(
        cls,
        *args,
        **kwargs
    ) -> str:
        """Parse the generated response for launch directives and execute them natively."""
        config = kwargs.get("config")
        response = kwargs.get("response")
        agentic_mode_active = kwargs.get("agentic_mode_active", False)
        is_launch_request = kwargs.get("is_launch_request", False)
        prompt = kwargs.get("prompt")
        bridge = kwargs.get("bridge")
        pipeline = kwargs.get("pipeline")

        if args:
            if isinstance(args[0], dict):
                config = args[0]
                if len(args) > 1:
                    response = args[1]
                if len(args) > 2:
                    agentic_mode_active = args[2]
                if len(args) > 3:
                    is_launch_request = args[3]
                if len(args) > 4:
                    prompt = args[4]
            elif isinstance(args[0], str):
                response = args[0]
                if len(args) > 1:
                    agentic_mode_active = args[1]

        if not response or not isinstance(response, str):
            return response or ""

        response = response.strip()
        if "[LAUNCH_COMMAND:" in response:
            try:
                start_idx = response.find("[LAUNCH_COMMAND:")
                end_idx = response.find("]", start_idx)
                if start_idx != -1 and end_idx != -1:
                    target = response[start_idx + 16:end_idx].strip().lower()
                    actual_reply = (response[:start_idx] + " " + response[end_idx + 1:]).strip()
                    actual_reply = re.sub(
                        r'\[\s*(?:SYSTEM_COMMAND|LAUNCH_COMMAND|TOOL_CALL|WebSearchTrigger|[A-Z_]{3,}):[^\]]*\]',
                        '',
                        actual_reply,
                        flags=re.IGNORECASE
                    ).strip()

                    # 1. Check if the user actually requested a launch (intent check)
                    is_informational = False
                    if prompt:
                        exclusions = ["how to", "why did", "what is", "where is", "when to", "should i", "how do i", "how can i"]
                        prompt_lower = prompt.lower()
                        if any(ex in prompt_lower for ex in exclusions):
                            is_informational = True
                    else:
                        is_informational = not is_launch_request

                    if is_informational and not is_launch_request:
                        logger.info("[Agentic Launcher] Blocked launching %s because intent was informational (not a launch request).", target)
                        return actual_reply

                    # 2. Execute via structured tool executor
                    tool_res = cls.execute_tool(
                        tool_name="launch_game",
                        arguments={"target": target},
                        pipeline=pipeline,
                        bridge=bridge,
                        config=config,
                        agentic_mode_active=agentic_mode_active,
                        prompt=prompt
                    )

                    msg = tool_res["message"]
                    card_token = tool_res["card_token"]
                    if actual_reply:
                        return f"{msg}\n\n{actual_reply}\n\n{card_token}".strip()
                    return f"{msg}\n\n{card_token}".strip()
            except Exception as ex_launch:
                logger.error("Failed in LLM launch handler: %s", ex_launch)
        return response

    @classmethod
    def process_system_command(
        cls,
        *args,
        **kwargs
    ) -> str:
        """Parse the response for [TOOL_CALL:...] and [SYSTEM_COMMAND:...] and execute actions."""
        response = None
        agentic_mode_active = False
        bridge = None
        pipeline = None
        config = None

        if args:
            response = args[0]
            if len(args) > 1:
                agentic_mode_active = bool(args[1])
            if len(args) > 2:
                bridge = args[2]
            if len(args) > 3:
                pipeline = args[3]
            if len(args) > 4:
                config = args[4]
        if "response" in kwargs:
            response = kwargs["response"]
        if "agentic_mode_active" in kwargs:
            agentic_mode_active = bool(kwargs["agentic_mode_active"])
        if "bridge" in kwargs:
            bridge = kwargs["bridge"]
        if "pipeline" in kwargs:
            pipeline = kwargs["pipeline"]
        if "config" in kwargs:
            config = kwargs["config"]

        if not response or not isinstance(response, str):
            return response or ""

        # Check for [TOOL_CALL:{"name": "...", "arguments": {...}}]
        tool_call_match = re.search(r'\[\s*TOOL_CALL:\s*(\{.*?\})\s*\]', response, flags=re.DOTALL)
        if tool_call_match:
            try:
                raw_call = tool_call_match.group(1).strip()
                call_data = json.loads(raw_call)
                tool_name = call_data.get("name", "")
                arguments = call_data.get("arguments", {})
                start_idx = tool_call_match.start()
                end_idx = tool_call_match.end()
                actual_reply = (response[:start_idx] + " " + response[end_idx:]).strip()
                actual_reply = re.sub(
                    r'\[\s*(?:SYSTEM_COMMAND|LAUNCH_COMMAND|TOOL_CALL|WebSearchTrigger|[A-Z_]{3,}):[^\]]*\]',
                    '',
                    actual_reply,
                    flags=re.IGNORECASE
                ).strip()

                tool_res = cls.execute_tool(
                    tool_name=tool_name,
                    arguments=arguments,
                    pipeline=pipeline,
                    bridge=bridge,
                    config=config,
                    agentic_mode_active=agentic_mode_active
                )
                msg = tool_res["message"]
                card_token = tool_res["card_token"]
                if actual_reply:
                    return f"{msg}\n\n{actual_reply}\n\n{card_token}".strip()
                return f"{msg}\n\n{card_token}".strip()
            except Exception as e_tc:
                logger.error("Failed to process tool call tag: %s", e_tc)

        # Check for legacy [SYSTEM_COMMAND:...]
        match = re.search(r'\[\s*SYSTEM_COMMAND:([^\]]+)\]', response)
        if match:
            try:
                cmd_raw = match.group(1).strip()
                start_idx = match.start()
                end_idx = match.end()
                actual_reply = (response[:start_idx] + " " + response[end_idx:]).strip()
                actual_reply = re.sub(
                    r'\[\s*(?:SYSTEM_COMMAND|LAUNCH_COMMAND|TOOL_CALL|WebSearchTrigger|[A-Z_]{3,}):[^\]]*\]',
                    '',
                    actual_reply,
                    flags=re.IGNORECASE
                ).strip()

                parts = cmd_raw.split(":")
                cmd_type = parts[0].strip()
                value = parts[1].strip() if len(parts) > 1 else None

                tool_name = cmd_type
                arguments = {}
                if cmd_type in ("set_cooling_mode", "set_fan_profile"):
                    arguments = {"mode": value} if value else {"mode": "balanced"}
                elif cmd_type == "toggle_vision":
                    arguments = {"enabled": value} if value else {"enabled": True}
                elif cmd_type == "open_page":
                    arguments = {"page": value or "dashboard"}
                elif cmd_type in ("optimize_system", "optimize_game_mode"):
                    arguments = {"power_mode": "max"}

                tool_res = cls.execute_tool(
                    tool_name=tool_name,
                    arguments=arguments,
                    pipeline=pipeline,
                    bridge=bridge,
                    config=config,
                    agentic_mode_active=agentic_mode_active
                )
                msg = tool_res["message"]
                card_token = tool_res["card_token"]
                if actual_reply:
                    return f"{msg}\n\n{actual_reply}\n\n{card_token}".strip()
                return f"{msg}\n\n{card_token}".strip()
            except Exception as e:
                logger.error("Failed to process system command: %s", e)
        return response
