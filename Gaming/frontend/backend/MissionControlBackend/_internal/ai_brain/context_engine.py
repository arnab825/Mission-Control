import time
import logging

logger = logging.getLogger(__name__)

class ContextEngine:
    """
    Layer 2: Context Engine
    Runs continuously in a background thread.
    Feeds live telemetry and session state.
    Builds the temporary player profile (playstyle, combat preference, skill level).
    """

    def __init__(self):
        self.running = False
        self.game_state = {}
        self.player_profile = {
            "deaths_this_session": 0,
            "playtime_seconds": 0,
            "tilt_detected": False,
            "playstyle": "unknown",
            "status_summary": "Initializing..."
        }
        self.session_start = time.time()
        self._last_health = 100
        self._rapid_damage_events = 0

    def start(self):
        self.running = True
        import threading
        self._thread = threading.Thread(target=self._loop, daemon=True, name="ContextEngineLoop")
        self._thread.start()

    def stop(self):
        self.running = False

    def update_state(self, game_state):
        self.game_state = game_state

    def _loop(self):
        while self.running:
            try:
                self._analyze_session_data()
            except Exception as e:
                logger.error(f"ContextEngine loop error: {e}")
            time.sleep(1.0)

    def _analyze_session_data(self):
        if not self.game_state:
            return

        # Update Playtime
        self.player_profile["playtime_seconds"] = int(time.time() - self.session_start)

        # Analyze Health / Deaths
        current_health = self.game_state.get("health", 100)
        
        # Super naive death detection: health goes from >0 to 0
        if current_health <= 0 and self._last_health > 0:
            self.player_profile["deaths_this_session"] += 1
            self._rapid_damage_events += 2 # Spike on death
            
        if current_health < self._last_health:
            self._rapid_damage_events += 1

        self._last_health = current_health

        # Decay rapid damage events to avoid permanent tilt
        if self._rapid_damage_events > 0:
            self._rapid_damage_events = max(0, self._rapid_damage_events - 0.2)

        # Tilt Detection
        if self._rapid_damage_events > 15:
            self.player_profile["tilt_detected"] = True
        else:
            self.player_profile["tilt_detected"] = False

        # Build context string for Layer 3
        tilt_str = "TILT DETECTED" if self.player_profile["tilt_detected"] else "Calm"
        self.player_profile["status_summary"] = (
            f"Deaths: {self.player_profile['deaths_this_session']} | "
            f"Playtime: {self.player_profile['playtime_seconds']}s | "
            f"State: {tilt_str}"
        )

    def get_context(self):
        return self.player_profile

    def reset(self):
        """Reset the context engine session statistics."""
        self.session_start = time.time()
        self._last_health = 100
        self._rapid_damage_events = 0
        self.player_profile = {
            "deaths_this_session": 0,
            "playtime_seconds": 0,
            "tilt_detected": False,
            "playstyle": "unknown",
            "status_summary": "Calm"
        }
        logger.info("ContextEngine session statistics reset successfully.")
