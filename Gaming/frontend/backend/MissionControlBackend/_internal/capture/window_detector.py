"""
Window Detector - Detects game windows and provides window info for capture.
Handles Alt+Tab detection and window focus state.
"""
import win32gui
import win32process
import psutil
import time
import threading
import logging
from typing import Optional, Callable, Dict, Any, Tuple

logger = logging.getLogger(__name__)


class WindowDetector:
    """
    Detects game windows and monitors their focus state.
    
    Features:
    - Detect any game window (non-browser)
    - Monitor window focus state (foreground/background)
    - Handle Alt+Tab gracefully
    """
    
    # Browser window classes to exclude
    BROWSER_CLASSES = {
        "Chrome_WidgetWin_1",  # Chrome, Edge
        "MozillaWindowClass",   # Firefox
        "OperaWindowClass",     # Opera
        "BraveWindowClass",     # Brave
    }
    
    # Common game window classes
    GAME_WINDOW_CLASSES = {
        "UNITYWNDCLASS",       # Unity games
        "UnrealWindow",        # Unreal Engine games
        "CryENGINE",           # CryEngine games
        "Source Engine",       # Source engine games
        "SDL_app",             # SDL-based games
        "GlFW30",              # GLFW games
    }

    # System and development processes that are NEVER games
    EXCLUDED_PROCS = {
        "explorer.exe", "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe",
        "opera.exe", "vivaldi.exe", "code.exe", "devenv.exe", "pycharm64.exe",
        "epicgameslauncher.exe", "steam.exe", "discord.exe", "spotify.exe",
        "taskmgr.exe", "cmd.exe", "powershell.exe", "conhost.exe", "aero-ai.exe",
        "electron.exe", "antigravity ide.exe", "xbox.exe", "xboxapp.exe", 
        "xboxpcapp.exe", "xboxgamingapp.exe", "microsoft.gamingapp.exe", 
        "ea.exe", "eaapp.exe", "goggalaxy.exe", "battlenet.exe", "ubisoftconnect.exe",
        "applicationframehost.exe", "settings.exe", "node.exe", "python.exe", "py.exe",
        "wscript.exe", "cscript.exe", "git.exe", "hp.omen.omencommandcenter.exe",
        "lghub.exe", "razer synapse.exe", "rzcommon.exe", "rzcortex.exe",
        "armourywebhelper.exe", "armourycontrol.exe", "armourycrate.exe",
        "msicenter.exe", "awcc.exe", "icue.exe", "sgaminghub.exe", "nzxtcam.exe",
        "nvidia share.exe", "nvsphelper64.exe"
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
        "nzxt cam", "nvidia geforce experience", "geforce experience"
    ]
    
    def __init__(self, poll_interval: float = 1.0, app_data_path: Optional[str] = None):
        self.poll_interval = poll_interval
        self.app_data_path = app_data_path
        self._running = False
        self._thread: Optional[threading.Thread] = None
        
        # Current window state
        self._current_window: Optional[Dict[str, Any]] = None
        self._is_focused = False
        self._last_focus_change = 0.0
        
        # Callbacks
        self.on_window_detected: Optional[Callable[[Dict], None]] = None
        self.on_focus_gained: Optional[Callable[[], None]] = None
        self.on_focus_lost: Optional[Callable[[], None]] = None
        
    def start(self):
        """Start the window detector thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._detect_loop, daemon=True, name="WindowDetector")
        self._thread.start()
        logger.info("Window detector started")
        
    def stop(self):
        """Stop the window detector thread."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("Window detector stopped")
        
    def _detect_loop(self):
        """Main detection loop."""
        while self._running:
            try:
                window_info = self._get_foreground_game_window()
                
                if window_info:
                    if not self._current_window:
                        # New game window detected
                        self._current_window = window_info
                        self._is_focused = True
                        self._last_focus_change = time.time()
                        
                        logger.info(f"Game window detected: {window_info['title']} (PID: {window_info['pid']})")
                        
                        if self.on_window_detected:
                            try:
                                self.on_window_detected(window_info)
                            except Exception as e:
                                logger.error(f"Error in window_detected callback: {e}")
                                
                        if self.on_focus_gained:
                            try:
                                self.on_focus_gained()
                            except Exception as e:
                                logger.error(f"Error in focus_gained callback: {e}")
                                
                    elif self._current_window['hwnd'] != window_info['hwnd']:
                        # Different game window
                        old_title = self._current_window.get('title', 'Unknown')
                        self._current_window = window_info
                        self._is_focused = True
                        self._last_focus_change = time.time()
                        
                        logger.info(f"Switched to game window: {window_info['title']} (was: {old_title})")
                        
                        if self.on_window_detected:
                            try:
                                self.on_window_detected(window_info)
                            except Exception as e:
                                logger.error(f"Error in window_detected callback: {e}")
                                
                        if self.on_focus_gained:
                            try:
                                self.on_focus_gained()
                            except Exception as e:
                                logger.error(f"Error in focus_gained callback: {e}")
                                
                    elif not self._is_focused:
                        # Focus regained
                        self._is_focused = True
                        self._last_focus_change = time.time()
                        
                        logger.info(f"Focus regained: {window_info['title']}")
                        
                        if self.on_focus_gained:
                            try:
                                self.on_focus_gained()
                            except Exception as e:
                                logger.error(f"Error in focus_gained callback: {e}")
                else:
                    # No game window in foreground
                    if self._current_window and self._is_focused:
                        # Lost focus (Alt+Tab or window minimized)
                        self._is_focused = False
                        self._last_focus_change = time.time()
                        
                        logger.info(f"Focus lost: {self._current_window.get('title', 'Unknown')}")
                        
                        if self.on_focus_lost:
                            try:
                                self.on_focus_lost()
                            except Exception as e:
                                logger.error(f"Error in focus_lost callback: {e}")
                                
            except Exception as e:
                logger.error(f"Error in window detection loop: {e}")
                
            time.sleep(self.poll_interval)
            
    def _get_foreground_game_window(self) -> Optional[Dict[str, Any]]:
        """
        Get the current foreground window if it's a game (not browser).
        Returns window info dict or None.
        """
        try:
            # Get foreground window
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return None
                
            # Get window title
            title = win32gui.GetWindowText(hwnd)
            if not title:
                return None
                
            for char in ['\u200b', '\u200c', '\u200d', '\ufeff', '\u200e', '\u200f']:
                title = title.replace(char, '')
            if not title:
                return None
                
            # Get window class
            try:
                window_class = win32gui.GetClassName(hwnd)
            except:
                window_class = "Unknown"
                
            # Check if it's a browser (exclude)
            if window_class in self.BROWSER_CLASSES:
                return None
                
            # Check window style - games typically have certain styles
            style = win32gui.GetWindowLong(hwnd, win32gui.GWL_STYLE)
            ex_style = win32gui.GetWindowLong(hwnd, win32gui.GWL_EXSTYLE)
            
            # Get window rect for size check
            rect = win32gui.GetWindowRect(hwnd)
            width = rect[2] - rect[0]
            height = rect[3] - rect[1]
            
            # Minimum size for games (filter out small windows)
            if width < 640 or height < 480:
                return None
                
            # Get process info
            try:
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                process = psutil.Process(pid)
                exe_name = process.name()
                exe_path = process.exe()
            except (psutil.NoSuchProcess, psutil.AccessDenied, Exception):
                pid = 0
                exe_name = "Unknown"
                exe_path = ""

            # If the foreground window belongs to our own app, preserve the current state
            our_procs = {"electron.exe", "aero-ai.exe", "python.exe", "py.exe", "missioncontrol.exe", "missioncontrolbackend.exe", "mission control.exe"}
            if exe_name.lower() in our_procs and self._current_window:
                return self._current_window
                
            # Check if it looks like a game by various heuristics
            is_game = self._is_likely_game(title, window_class, exe_name, width, height)
            
            if is_game:
                return {
                    "hwnd": hwnd,
                    "title": title,
                    "window_class": window_class,
                    "pid": pid,
                    "exe_name": exe_name,
                    "exe_path": exe_path,
                    "rect": rect,
                    "width": width,
                    "height": height,
                    "style": style,
                    "ex_style": ex_style,
                }
                
        except Exception as e:
            logger.debug(f"Error getting foreground window: {e}")
            
        return None
        
    def _load_library_games(self):
        """Load scanned games from all games_db*.json databases."""
        library_games = []
        try:
            import json
            import glob
            from pathlib import Path
            # Use provided app_data_path or fallback to backend config directory
            if self.app_data_path:
                config_dir = Path(self.app_data_path)
            else:
                config_dir = Path(__file__).parent.parent / "config"
                
            cache_files = glob.glob(str(config_dir / "games_db*.json"))
            for path_str in cache_files:
                cache_file = Path(path_str)
                if cache_file.exists():
                    try:
                        with open(cache_file, "r", encoding="utf-8") as f:
                            games = json.load(f)
                            for game in games:
                                # Extract the executable base name
                                exe_path = game.get("exe_path")
                                if exe_path:
                                    exe_name = Path(exe_path).name.lower()
                                    if exe_name and exe_name.endswith(".exe"):
                                        library_games.append(exe_name)
                                # Also add the game name itself as keyword
                                name = game.get("name")
                                if name:
                                    library_games.append(name.lower())
                    except Exception as fe:
                        logger.debug(f"Failed to load specific games database {cache_file}: {fe}")
        except Exception as e:
            logger.debug(f"Failed to load library games database: {e}")
        return library_games

    def _is_likely_game(self, title: str, window_class: str, exe_name: str, width: int, height: int) -> bool:
        """
        Heuristic to determine if a window is likely a game.
        """
        title_lower = title.lower()
        exe_lower = exe_name.lower()

        # Check against exclusions first!
        if exe_lower in self.EXCLUDED_PROCS:
            return False
        if any(ext in title_lower for ext in self.EXCLUDED_TITLES):
            return False

        # 1. Match against dynamically scanned library games!
        import re as _re
        library_games = self._load_library_games()
        if library_games:
            # Check if active executable matches any scanned executable name from our library database
            for lib_game in library_games:
                if lib_game.endswith(".exe") and lib_game == exe_lower:
                    return True
            
            # Check if active window title matches any scanned library title — WHOLE-WORD only.
            # Using substring match caused false positives where music player titles containing
            # words like "Grand", "Spider", "Man" from game names triggered game detection.
            for lib_game in library_games:
                if not lib_game.endswith(".exe") and len(lib_game) > 5:
                    # Escape and match as a whole-word phrase (word boundaries on each side)
                    pattern = r'\b' + _re.escape(lib_game) + r'\b'
                    if _re.search(pattern, title_lower):
                        return True

        # 2. Known game window classes
        if window_class in self.GAME_WINDOW_CLASSES:
            return True
            
        # Check for game-like patterns in title
        game_keywords = [
            "game", "play", "launch", "witcher", "gta", "farcry", "elden", "dark",
            "souls", "rdr", "redemption", "cyberpunk", "battlefield", "callofduty",
            "cod", "apex", "fortnite", "valorant", "lol", "league", "dota",
            "minecraft", "skyrim", "fallout", "assassin", "creed", "tomb", "raider",
            "resident", "evil", "halo", "gears", "forza", "horizon", "flight",
            "simulator", " simulator", "sims", "fifa", "nba", "madden", "nfl",
            "starcraft", "warcraft", "overwatch", "diablo", "path", "exile",
            "escape", "tarkov", "pubg", "battlegrounds", "rogue", "company",
            "heroes", "storm", "smite", "paladins", "warframe", "destiny",
            "spiderman", "spider-man", "marvel", "miles", "remastered", "zero"
        ]
        
        # Generic words that should not be dynamically added to game keywords (to avoid system matching)
        generic_keywords = {
            "app", "apps", "game", "games", "play", "player", "launcher", "launchers", 
            "client", "clients", "enhanced", "remastered", "edition", "trial", "demo", 
            "setup", "install", "installer", "system", "man", "hub", "center", "control", 
            "experience", "monitor", "utility", "helper", "service", "overlay", "update", 
            "updater", "check", "checker", "test"
        }

        # Dynamically enrich keywords from scanned library games.
        # Only add individual words that are specific enough (>= 5 chars) to avoid
        # common English words like "man", "the", "auto", "play" causing false positives.
        if library_games:
            import re
            for lib_game in library_games:
                if not lib_game.endswith(".exe"):
                    game_keywords.append(lib_game)
                    # Split into individual alphanumeric words — only keep long, specific ones
                    words = re.findall(r'[a-zA-Z0-9]+', lib_game)
                    for w in words:
                        w_lower = w.lower()
                        if len(w_lower) >= 5 and w_lower not in game_keywords and w_lower not in generic_keywords:
                            game_keywords.append(w_lower)
        
        if any(keyword in title_lower for keyword in game_keywords):
            return True
            
        # Check exe name for game patterns
        if any(keyword in exe_lower for keyword in game_keywords):
            return True
            
        # Fullscreen or borderless window styles suggest games
        # WS_POPUP (0x80000000) or WS_BORDER with specific sizes
        if width >= 1920 and height >= 1080:
            # Likely fullscreen game at 1080p+
            if "game" in exe_lower or "game" in title_lower:
                return True
                
        return False
        
    def get_current_window(self) -> Optional[Dict[str, Any]]:
        """Get the currently tracked window info."""
        return self._current_window.copy() if self._current_window else None
        
    def is_focused(self) -> bool:
        """Check if the tracked window currently has focus."""
        return self._is_focused
        
    def get_window_region(self) -> Optional[Tuple[int, int, int, int]]:
        """Get the region (left, top, right, bottom) of the tracked window."""
        if self._current_window:
            return self._current_window.get('rect')
        return None
        
    def time_since_focus_change(self) -> float:
        """Get seconds since last focus change."""
        return time.time() - self._last_focus_change
