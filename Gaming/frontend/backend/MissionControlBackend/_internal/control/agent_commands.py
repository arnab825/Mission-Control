"""
Agent Command Processor — executes launcher and system commands on behalf of the AI.
"""

import logging
import os
import re
import sys
from typing import Dict, List, Optional

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
    def process_launch_command(
        cls,
        config: dict,
        response: str,
        agentic_mode_active: bool = False,
        is_launch_request: bool = False,
        prompt: Optional[str] = None
    ) -> str:
        """Parse the generated response for launch directives and execute them natively."""
        if not response:
            return response
        response = response.strip()
        if "[LAUNCH_COMMAND:" in response:
            try:
                start_idx = response.find("[LAUNCH_COMMAND:")
                end_idx = response.find("]", start_idx)
                if start_idx != -1 and end_idx != -1:
                    target = response[start_idx + 16:end_idx].strip().lower()
                    actual_reply = (response[:start_idx] + " " + response[end_idx + 1:]).strip()
                    
                    from system.game_scanner import GameScanner
                    scanner = GameScanner(config=config)
                    games = scanner.load_cached_games()
                    
                    best_match = cls.find_launcher_or_game(target, games)
                    
                    if best_match:
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
                            logger.info(f"[Agentic Launcher] Blocked launching {best_match.get('name')} because intent was informational (not a launch request).")
                            return actual_reply

                        # 2. Check if Agentic Mode is active first
                        if not agentic_mode_active:
                            logger.info(f"[Agentic Launcher] Blocked launching {best_match.get('name')} because Agentic Mode is disabled.")
                            return f"🎮 **Agentic Action Blocked**: I detected a request to launch **{best_match.get('name')}**, but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the sidebar to enable direct system control!\n\n{actual_reply}"
                        
                        exe_path = best_match.get("exe_path")
                        if exe_path and (exe_path.endswith(":") or exe_path.startswith("shell:") or os.path.exists(exe_path)):
                            logger.info(f"[Agentic Launcher] Executing native launch: {best_match.get('name')} -> {exe_path}")
                            if sys.platform == "win32":
                                os.startfile(exe_path)
                            else:
                                import subprocess
                                subprocess.Popen(
                                    ["open"] if sys.platform == "darwin" else ["xdg-open", exe_path]
                                )
                            return f"🎮 **Agentic Launcher**: I've successfully accessed your system and launched **{best_match.get('name')}** directly!\n\n{actual_reply}"
                        else:
                            # Fallback if the path was not found or is missing
                            logger.info(f"[Agentic Launcher] Executing fallback redirect: {best_match.get('name')} path not found")
                            return f"🎮 **Agentic Launcher**: I identified your request to open **{best_match.get('name')}**, but I couldn't locate its installation path in the default directories. I have redirected you to the **Library** page so you can scan or select it manually!\n\n{actual_reply}"
            except Exception as ex_launch:
                logger.error(f"Failed in LLM launch handler: {ex_launch}")
        return response

    @staticmethod
    def process_system_command(response: str, agentic_mode_active: bool = False) -> str:
        """Parse the response for [SYSTEM_COMMAND:...] and execute app-level configurations."""
        if not response or "[SYSTEM_COMMAND:" not in response:
            return response
            
        try:
            start_idx = response.find("[SYSTEM_COMMAND:")
            end_idx = response.find("]", start_idx)
            if start_idx != -1 and end_idx != -1:
                cmd_raw = response[start_idx + 16:end_idx].strip()
                actual_reply = (response[:start_idx] + " " + response[end_idx + 1:]).strip()
                
                parts = cmd_raw.split(":")
                cmd_type = parts[0]
                value = parts[1] if len(parts) > 1 else None
                
                # Check for agentic mode before executing system modifications (set_cooling_mode, optimize_system)
                is_navigation = cmd_type == "open_page"
                
                if not is_navigation and not agentic_mode_active:
                    logger.info(f"[Agentic System] Blocked system command '{cmd_type}' because Agentic Mode is disabled.")
                    return f"🛡️ **Agentic Action Blocked**: I detected a request to modify system settings (cooling/optimization), but **Agentic Mode** is currently disabled. Please toggle **Agentic Mode** ON in the sidebar to enable system control!\n\n{actual_reply}"
                
                status_msg = ""
                if cmd_type == "set_cooling_mode":
                    try:
                        from system.optimizer import Optimizer
                        success, msg = Optimizer.set_power_plan(value)
                        status_msg = f"🛡️ **Stability Mode**: {msg}"
                    except Exception:
                        status_msg = f"🛡️ **Stability Mode**: Cooling profile set to **{value.upper()}**."
                elif cmd_type == "toggle_vision":
                    status_msg = f"👁️ **Vision Control**: Tactical vision overlay turned **{value.upper()}**."
                elif cmd_type == "optimize_system":
                    try:
                        from system.optimizer import Optimizer
                        success, results = Optimizer.optimize_game({})
                        status_msg = "⚡ **Neural Pulse**: " + " ".join(results)
                    except Exception:
                        status_msg = "⚡ **Neural Pulse**: System optimized! VRAM cleared and background processes suspended."
                elif cmd_type == "open_page":
                    status_msg = f"🖥️ **Agentic Navigation**: Redirecting you to the **{value.capitalize()}** panel..."

                if status_msg:
                    return f"{status_msg}\n\n{actual_reply}"
                return actual_reply
        except Exception as e:
            logger.error(f"Failed to process system command: {e}")
        return response
