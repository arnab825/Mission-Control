"""
Process Watcher - Monitors running processes for game detection.
Auto-starts pipeline when game detected, auto-stops when game exits.
"""
import os
import psutil
import threading
import time
import logging
import win32gui
import win32process
from typing import Optional, Callable, Dict, Any, List
from pathlib import Path

logger = logging.getLogger(__name__)


class ProcessWatcher:
    """
    Watches for game processes and triggers auto-start/stop.
    
    Signals:
        - game_detected(game_info: dict): When a game process is found
        - game_exited(): When the game process ends
    """
    
    # Common game process patterns
    GAME_EXE_PATTERNS = [
        "*.exe"  # Will filter by window detection later
    ]
    
    # Browser processes to exclude
    BROWSER_PROCESSES = {
        "chrome.exe", "firefox.exe", "msedge.exe", "opera.exe", 
        "brave.exe", "vivaldi.exe", "steamwebhelper.exe"
    }
    
    # Known game launchers (for reference)
    LAUNCHER_PROCESSES = {
        "steam.exe", "epicgameslauncher.exe", "origin.exe", 
        "eaapp.exe", "ubisoftconnect.exe", "gog.exe", "battle.net.exe",
        "xbox.exe", "xboxapp.exe", "xboxpcapp.exe", "xboxgamingapp.exe", 
        "microsoft.gamingapp.exe", "ea.exe", "goggalaxy.exe", "battlenet.exe"
    }

    # System and development processes that are NEVER games
    EXCLUDED_PROCESSES = {
        "explorer.exe", "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe",
        "opera.exe", "vivaldi.exe", "code.exe", "devenv.exe", "pycharm64.exe",
        "epicgameslauncher.exe", "steam.exe", "discord.exe", "spotify.exe",
        "taskmgr.exe", "cmd.exe", "powershell.exe", "conhost.exe", "aero-ai.exe",
        "electron.exe", "antigravity ide.exe", "antigravity.exe", "antigravity-ide.exe",
        "wt.exe", "wsl.exe", "bash.exe", "mintty.exe",
        "xbox.exe", "xboxapp.exe", "xboxpcapp.exe", "xboxgamingapp.exe", 
        "microsoft.gamingapp.exe", "ea.exe", "eaapp.exe", "goggalaxy.exe", "battlenet.exe", "ubisoftconnect.exe",
        "applicationframehost.exe", "settings.exe", "node.exe", "python.exe", "py.exe",
        "wscript.exe", "cscript.exe", "git.exe", "hp.omen.omencommandcenter.exe",
        "lghub.exe", "razer synapse.exe", "rzcommon.exe", "rzcortex.exe",
        "armourywebhelper.exe", "armourycontrol.exe", "armourycrate.exe",
        "msicenter.exe", "awcc.exe", "icue.exe", "sgaminghub.exe", "nzxtcam.exe",
        "nvidia share.exe", "nvsphelper64.exe",
        "steamwebhelper.exe", "steamservice.exe", "steamerrorreporter.exe",
        "epicwebhelper.exe", "unrealcefsubprocess.exe",
        "galaxyclient.exe", "galaxyclient service.exe", "gog galaxy.exe",
        "upc.exe", "eabackgroundservice.exe", "eadesktop.exe", "eaconnect_microsoft.exe",
        "vlc.exe", "mpc-hc.exe", "mpc-hc64.exe", "potplayer.exe", "potplayermini64.exe", 
        "wmplayer.exe", "movies.television.exe"
    }

    # Window titles that are NEVER games
    EXCLUDED_TITLES = [
        "visual studio", "vscode", "pycharm", "cursor", "windows terminal", 
        "powershell", "cmd", "idle", "task manager", "system settings", 
        "calculator", "notepad", "sublime", "atom", "terminal",
        "Mission Control", "aero-ai", "nvidia", "amd", "radeon", "intel", "geforce",
        "microsoft store", "epic games launcher", "steam", "origin", "ubisoft connect",
        "battle.net", "galaxy", "gog", "discord", "spotify", "chrome", "firefox", "edge",
        "brave", "opera", "vivaldi", "xbox", "xbox app", "ea app", "ea desktop",
        "omen gaming hub", "logitech g hub", "razer synapse", "razer cortex",
        "armoury crate", "msi center", "alienware command center", "icue",
        "nzxt cam", "nvidia geforce experience", "geforce experience",
        "vlc", "vlc media player", "media player", "windows media player", 
        "mpc-hc", "potplayer", "quicktime", "movies & tv", "movies and tv"
    ]
    
    def __init__(self, poll_interval: float = 2.0, game_registry: Optional[List[Dict]] = None):
        self.poll_interval = poll_interval
        self.game_registry = game_registry or []  # List of known games from scanner
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._current_game: Optional[Dict[str, Any]] = None
        self._game_start_time: Optional[float] = None
        
        # Callbacks
        self.on_game_detected: Optional[Callable[[Dict], None]] = None
        self.on_game_exited: Optional[Callable[[], None]] = None
        self.on_game_crashed: Optional[Callable[[Dict], None]] = None
        self.on_game_hung: Optional[Callable[[Dict], None]] = None
        # Fires every poll cycle while game is running; delivers updated minimization/hwnd state
        self.on_game_status_changed: Optional[Callable[[Dict], None]] = None
        
        # Process tracking
        self._monitored_pid: Optional[int] = None
        self._grace_period_seconds = 60.0  # Wait before declaring game exited
        self._last_seen_time: float = 0.0
        
        # Crash & Hang detection state
        self._hung_since: Optional[float] = None
        self._hung_alert_fired: bool = False
        self._hung_threshold_seconds: float = 10.0
        
        # GPU Monitoring for auto-detection
        self._gpu_monitor = None
        try:
            from nvidia.gpu_monitor import GPUMonitor
            self._gpu_monitor = GPUMonitor()
        except Exception:
            pass
        
    def start(self):
        """Start the process watcher thread."""
        if self._running:
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._watch_loop, daemon=True, name="ProcessWatcher")
        self._thread.start()
        logger.info("Process watcher started")
        
    def stop(self):
        """Stop the process watcher thread."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("Process watcher stopped")
        
    def _watch_loop(self):
        """Main watching loop."""
        while self._running:
            try:
                # ADAPTIVE POLLING: If we're already monitoring a game, poll less frequently
                # since we're just waiting for it to exit.
                game_info = self._detect_running_game()
                
                if game_info and not self._current_game:
                    # Game started
                    self._current_game = game_info
                    self._game_start_time = time.time()
                    self._monitored_pid = game_info.get("pid")
                    self._last_seen_time = time.time()
                    self._hung_since = None
                    self._hung_alert_fired = False
                    
                    logger.info(f"Game detected: {game_info.get('name')} (PID: {self._monitored_pid})")
                    
                    if self.on_game_detected:
                        try:
                            self.on_game_detected(game_info)
                        except Exception as e:
                            logger.error(f"Error in game_detected callback: {e}")
                            
                elif game_info and self._current_game:
                    # Game still running - update last seen time and propagate state
                    self._last_seen_time = time.time()
                    self._current_game = game_info  # Refresh minimization/hwnd
                    if self.on_game_status_changed:
                        try:
                            self.on_game_status_changed(game_info)
                        except Exception as e:
                            logger.error(f"Error in game_status_changed callback: {e}")
                    
                    # ── Hang Detection ──────────────────────────────────────
                    if self._monitored_pid:
                        is_hung = self._check_hung_window(self._monitored_pid)
                        if is_hung:
                            if self._hung_since is None:
                                self._hung_since = time.time()
                            elif (time.time() - self._hung_since) > self._hung_threshold_seconds and not self._hung_alert_fired:
                                self._hung_alert_fired = True
                                logger.warning(f"Game HUNG detected: {self._current_game.get('name')} (PID: {self._monitored_pid}) — not responding for {self._hung_threshold_seconds:.0f}s")
                                if self.on_game_hung:
                                    try:
                                        self.on_game_hung({
                                            "game": self._current_game,
                                            "pid": self._monitored_pid,
                                            "hung_duration": time.time() - self._hung_since,
                                        })
                                    except Exception as e:
                                        logger.error(f"Error in game_hung callback: {e}")
                        else:
                            # Game recovered from hung state
                            if self._hung_since is not None:
                                logger.info(f"Game recovered from hung state after {time.time() - self._hung_since:.1f}s")
                            self._hung_since = None
                            self._hung_alert_fired = False
                    
                elif not game_info and self._current_game:
                    # ── Crash / Normal Exit Detection ──────────────────────
                    exit_info = self._check_process_exit(self._monitored_pid)
                    
                    if exit_info["exited"]:
                        game_name = self._current_game.get('name', 'Unknown')
                        
                        if exit_info["crashed"]:
                            # Non-zero exit code → crash
                            logger.warning(f"Game CRASHED: {game_name} (PID: {self._monitored_pid}, exit_code={exit_info['exit_code']})")
                            if self.on_game_crashed:
                                try:
                                    self.on_game_crashed({
                                        "game": self._current_game,
                                        "pid": self._monitored_pid,
                                        "exit_code": exit_info["exit_code"],
                                        "session_duration": time.time() - (self._game_start_time or time.time()),
                                    })
                                except Exception as e:
                                    logger.error(f"Error in game_crashed callback: {e}")
                            # Also fire game_exited for cleanup
                            if self.on_game_exited:
                                try:
                                    self.on_game_exited()
                                except Exception as e:
                                    logger.error(f"Error in game_exited callback: {e}")
                        else:
                            # Clean exit
                            logger.info(f"Game exited cleanly: {game_name}")
                            if self.on_game_exited:
                                try:
                                    self.on_game_exited()
                                except Exception as e:
                                    logger.error(f"Error in game_exited callback: {e}")
                        
                        self._current_game = None
                        self._monitored_pid = None
                        self._game_start_time = None
                        self._hung_since = None
                        self._hung_alert_fired = False
                    else:
                        # Process still alive but not detected by game scan — grace period
                        time_since_last_seen = time.time() - self._last_seen_time
                        if time_since_last_seen > self._grace_period_seconds:
                            logger.info(f"Game exited: {self._current_game.get('name')} (after {time_since_last_seen:.1f}s grace period)")
                            if self.on_game_exited:
                                try:
                                    self.on_game_exited()
                                except Exception as e:
                                    logger.error(f"Error in game_exited callback: {e}")
                            self._current_game = None
                            self._monitored_pid = None
                            self._game_start_time = None
                            self._hung_since = None
                            self._hung_alert_fired = False
                
                # Intelligent sleep: poll faster when looking for a game, 
                # slower when a game is already active (we trust PID check more)
                sleep_time = self.poll_interval
                if self._current_game:
                    sleep_time = 5.0 # We only need to check if it's still alive
                
            except Exception as e:
                logger.error(f"Error in process watcher loop: {e}")
                sleep_time = self.poll_interval
                
            time.sleep(sleep_time)
            
    def _detect_running_game(self) -> Optional[Dict[str, Any]]:
        """
        Detect if a known game is currently running.
        Returns game info dict or None.
        """
        try:
            # SHORTCUT: If we are already monitoring a PID, check if it's still alive first
            if self._monitored_pid:
                try:
                    proc = psutil.Process(self._monitored_pid)
                    if proc.is_running():
                        # Still the same game? (Check name to be sure)
                        if self._current_game and proc.name().lower() == self._current_game.get("exe_name"):
                            # Update window state
                            is_minimized = self._is_window_minimized(self._monitored_pid)
                            hwnd = self._get_hwnd_for_pid(self._monitored_pid)
                            
                            # Check if the process has no visible window for more than 30 seconds (orphaned/background)
                            if hwnd is None:
                                try:
                                    elapsed = time.time() - proc.create_time()
                                    if elapsed > 30.0:
                                        logger.info(f"Monitored game process {proc.name()} (PID: {self._monitored_pid}) has no visible window after {elapsed:.1f}s. Treating as not running.")
                                        return None
                                except Exception:
                                    pass
                                    
                            self._current_game["is_minimized"] = is_minimized
                            self._current_game["hwnd"] = hwnd
                            return self._current_game
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            # Get list of running processes - only fetch name first to save time
            running_procs = {}
            for proc in psutil.process_iter(['name']):
                try:
                    name = proc.info['name']
                    if name and name.lower().endswith('.exe'):
                        # Only fetch full info if it's a potential candidate
                        name_lower = name.lower()
                        if name_lower in self.BROWSER_PROCESSES: continue
                        
                        # Store just the name for now
                        running_procs[name_lower] = proc
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Check known games from registry
            for game in self.game_registry:
                # Exclude launchers and system apps from being detected as active games
                if game.get("type") == "LAUNCHER" or game.get("name") in (
                    "Xbox App", "Steam", "Epic Games Launcher", "EA Desktop", 
                    "Ubisoft Connect", "Battle.net", "GOG Galaxy"
                ):
                    continue
                exe_path = game.get("exe_path", "")
                if exe_path:
                    exe_name = Path(exe_path).name.lower()
                    if exe_name in self.EXCLUDED_PROCESSES or exe_name in self.LAUNCHER_PROCESSES or exe_name in self.BROWSER_PROCESSES:
                        continue
                    if exe_name in running_procs:
                        # Now fetch full info for the winner
                        proc = running_procs[exe_name]
                        pid = proc.pid
                        hwnd = self._get_hwnd_for_pid(pid)
                        
                        # Verify it has a window or is newly launched
                        if hwnd is None:
                            try:
                                elapsed = time.time() - proc.create_time()
                                if elapsed > 30.0:
                                    # Skip this process as it's likely an orphaned background process
                                    continue
                            except Exception:
                                pass
                                
                        return {
                            **game,
                            "name": game.get("name", "Unknown Game"),
                            "exe_path": exe_path,
                            "exe_name": exe_name,
                            "pid": pid,
                            "hwnd": hwnd,
                            "is_minimized": self._is_window_minimized(pid),
                            "source": "registry"
                        }

                # Method 2: Match by install path
                install_path = game.get("install_path", "")
                if install_path and install_path != "Shortcut":
                    install_lower = install_path.lower().replace("/", os.sep).rstrip(os.sep)
                    for pname, p_obj in running_procs.items():
                        if pname in self.BROWSER_PROCESSES or pname in self.LAUNCHER_PROCESSES or pname in self.EXCLUDED_PROCESSES:
                            continue
                        try:
                            # Only fetch exe path if it might be a match
                            proc_exe = p_obj.exe().lower().replace("/", os.sep)
                            if proc_exe and proc_exe.startswith(install_lower):
                                pid = p_obj.pid
                                hwnd = self._get_hwnd_for_pid(pid)
                                
                                # Verify it has a window or is newly launched
                                if hwnd is None:
                                    try:
                                        elapsed = time.time() - p_obj.create_time()
                                        if elapsed > 30.0:
                                            continue
                                    except Exception:
                                        pass
                                        
                                return {
                                    **game,
                                    "name": game.get("name", "Unknown Game"),
                                    "exe_path": proc_exe,
                                    "exe_name": pname,
                                    "pid": pid,
                                    "hwnd": hwnd,
                                    "is_minimized": self._is_window_minimized(pid),
                                    "source": "registry_path"
                                }
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            continue

            # --- GPU Monitoring for auto-detection ---
            if self._gpu_monitor and self._gpu_monitor.is_available:
                gpu_procs = self._gpu_monitor.get_active_graphics_processes()
                for gp in gpu_procs:
                    exe_name = gp["name"].lower()
                    if exe_name in self.BROWSER_PROCESSES or exe_name in self.LAUNCHER_PROCESSES or exe_name in self.EXCLUDED_PROCESSES:
                        continue
                    if gp["memory_mb"] > 200: # Increased threshold for less noise
                        pid = gp["pid"]
                        hwnd = self._get_hwnd_for_pid(pid)
                        
                        # Verify it has a window or is newly launched
                        if hwnd is None:
                            try:
                                proc = psutil.Process(pid)
                                elapsed = time.time() - proc.create_time()
                                if elapsed > 30.0:
                                    continue
                            except Exception:
                                pass
                                
                        return {
                            "name": exe_name.replace(".exe", "").title(),
                            "exe_name": exe_name,
                            "pid": pid,
                            "hwnd": hwnd,
                            "is_minimized": self._is_window_minimized(pid),
                            "source": "nvidia_neural",
                        }

            # --- Foreground Window Heuristic Fallback ---
            try:
                fg_hwnd = win32gui.GetForegroundWindow()
                if fg_hwnd:
                    fg_title = win32gui.GetWindowText(fg_hwnd)
                    if fg_title:
                        for char in ['\u200b', '\u200c', '\u200d', '\ufeff', '\u200e', '\u200f']:
                            fg_title = fg_title.replace(char, '')
                        _, fg_pid = win32process.GetWindowThreadProcessId(fg_hwnd)
                        if fg_pid and psutil is not None:
                            proc = psutil.Process(fg_pid)
                            exe_name = proc.name().lower()
                            
                            title_lower = fg_title.lower()
                            
                            if exe_name not in self.EXCLUDED_PROCESSES and exe_name not in self.LAUNCHER_PROCESSES and exe_name not in self.BROWSER_PROCESSES and not any(ext in title_lower for ext in self.EXCLUDED_TITLES):
                                famous_game_keywords = [
                                    "grand theft auto", "gta", "cyberpunk", "far cry", "spiderman", "witcher", 
                                    "valorant", "counter-strike", "csgo", "minecraft", "fortnite", "apex legends", 
                                    "destiny", "diablo", "red dead", "rdr", "borderlands", "halo", "doom", "skyrim", 
                                    "fallout", "assassin's creed", "forza", "fifa", "madden", "nba 2k", "playgtav",
                                    "elden ring", "hades", "hollow knight"
                                ]
                                
                                is_game = False
                                import re
                                
                                # 1. Check famous game keywords as whole words
                                for kw in famous_game_keywords:
                                    pattern = r'\b' + re.escape(kw) + r'\b'
                                    if re.search(pattern, title_lower) or re.search(pattern, exe_name):
                                        is_game = True
                                        break
                                
                                # 2. Check registered games as whole words (strict full name match)
                                if not is_game and self.game_registry:
                                    for game in self.game_registry:
                                        name = game.get("name")
                                        if name:
                                            name_lower = name.lower()
                                            pattern = r'\b' + re.escape(name_lower) + r'\b'
                                            if re.search(pattern, title_lower) or re.search(pattern, exe_name):
                                                is_game = True
                                                break
                                    
                                if is_game:
                                    pid = fg_pid
                                    return {
                                        "name": fg_title,
                                        "exe_path": proc.exe(),
                                        "exe_name": exe_name,
                                        "pid": pid,
                                        "hwnd": self._get_hwnd_for_pid(pid),
                                        "is_minimized": self._is_window_minimized(pid),
                                        "source": "foreground_heuristic",
                                    }
            except Exception as e:
                logger.error(f"Error in foreground heuristic check: {e}")
                    
        except Exception as e:
            logger.error(f"Error detecting running games: {e}")
            
        return None

    def _check_hung_window(self, pid: int) -> bool:
        """Check if any visible window belonging to the PID is hung (Not Responding)."""
        try:
            hung_found = [False]
            def callback(hwnd, _data):
                if win32gui.IsWindowVisible(hwnd):
                    _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
                    if found_pid == pid:
                        try:
                            if win32gui.IsHungAppWindow(hwnd):
                                hung_found[0] = True
                                return False  # Stop enumeration
                        except Exception:
                            pass
                return True
            win32gui.EnumWindows(callback, None)
            return hung_found[0]
        except Exception:
            return False

    def _check_process_exit(self, pid: Optional[int]) -> Dict[str, Any]:
        """Check if a monitored PID has exited and determine if it crashed."""
        if pid is None:
            return {"exited": True, "crashed": False, "exit_code": None}
        try:
            proc = psutil.Process(pid)
            if proc.is_running() and proc.status() != psutil.STATUS_ZOMBIE:
                return {"exited": False, "crashed": False, "exit_code": None}
            # Process is zombie — treat as exited
            return {"exited": True, "crashed": False, "exit_code": None}
        except psutil.NoSuchProcess:
            # Process fully gone — try to get exit code from OS (Windows-specific)
            exit_code = self._get_exit_code(pid)
            # Common non-zero exit codes that indicate crashes:
            # 0xC0000005 = Access Violation, 0xC000001D = Illegal Instruction,
            # -1073741819 = signed version of 0xC0000005
            crashed = exit_code is not None and exit_code != 0
            return {"exited": True, "crashed": crashed, "exit_code": exit_code}
        except psutil.AccessDenied:
            return {"exited": True, "crashed": False, "exit_code": None}

    @staticmethod
    def _get_exit_code(pid: int) -> Optional[int]:
        """Attempt to retrieve exit code of a terminated process via Win32 API."""
        try:
            import ctypes
            PROCESS_QUERY_INFORMATION = 0x0400
            handle = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_INFORMATION, False, pid)
            if handle:
                exit_code = ctypes.c_ulong()
                ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
                ctypes.windll.kernel32.CloseHandle(handle)
                STILL_ACTIVE = 259
                if exit_code.value != STILL_ACTIVE:
                    return exit_code.value
        except Exception:
            pass
        return None

    def _get_hwnd_for_pid(self, pid: int) -> Optional[int]:
        """Return the main (largest visible) window handle for the given PID.
        
        Enumerates all top-level windows and picks the visible, non-iconic
        window belonging to `pid` that has the largest client area — this
        is almost always the primary render target of the game.
        """
        try:
            best_hwnd = None
            best_area = 0

            def _cb(hwnd, _):
                nonlocal best_hwnd, best_area
                if not win32gui.IsWindowVisible(hwnd):
                    return True
                _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
                if found_pid != pid:
                    return True
                try:
                    rect = win32gui.GetClientRect(hwnd)
                    w = rect[2] - rect[0]
                    h = rect[3] - rect[1]
                    area = w * h
                    if area > best_area:
                        best_area = area
                        best_hwnd = hwnd
                except Exception:
                    pass
                return True

            win32gui.EnumWindows(_cb, None)
            return best_hwnd
        except Exception:
            return None

    def _is_window_minimized(self, pid: int) -> bool:
        """Check if any window belonging to the PID is minimized."""
        try:
            def callback(hwnd, windows):
                if win32gui.IsWindowVisible(hwnd):
                    _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
                    if found_pid == pid:
                        # 1 = Normal, 2 = Minimized, 3 = Maximized
                        is_iconic = win32gui.IsIconic(hwnd)
                        windows.append(is_iconic)
                return True

            windows = []
            win32gui.EnumWindows(callback, windows)
            # If any window is NOT minimized, we consider the game "playing"
            # If all windows are minimized, it's minimized.
            if not windows:
                return False
            return all(windows)
        except Exception:
            return False
        
    def get_current_game(self) -> Optional[Dict[str, Any]]:
        """Get currently running game info, if any."""
        return self._current_game.copy() if self._current_game else None

    @property
    def current_game(self) -> Optional[dict]:
        return self._current_game

        
    def is_game_running(self) -> bool:
        """Check if a game is currently detected."""
        return self._current_game is not None
        
    def update_game_registry(self, games: List[Dict]):
        """Update the list of known games to watch for."""
        self.game_registry = games
        logger.debug(f"Game registry updated: {len(games)} games")
