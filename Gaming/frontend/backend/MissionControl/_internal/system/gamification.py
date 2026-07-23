import logging
import json
import os

logger = logging.getLogger(__name__)

class GamificationEngine:
    def __init__(self, db_client=None, user_id=None):
        self.db_client = db_client # Optional supabase client
        self.user_id = user_id
        
        # In-memory local fallback/cache
        self.xp = 0
        self.level = 1
        self.achievements = set()
        self.save_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".gamification_state.json")
        
        # Load local state
        self._load_local_state()

    def _load_local_state(self):
        try:
            if os.path.exists(self.save_path):
                with open(self.save_path, "r") as f:
                    data = json.load(f)
                    self.xp = data.get("xp", 0)
                    self.level = data.get("level", 1)
                    self.achievements = set(data.get("achievements", []))
        except Exception as e:
            logger.error(f"Failed to load gamification state: {e}")

    def _save_local_state(self):
        try:
            with open(self.save_path, "w") as f:
                json.dump({
                    "xp": self.xp,
                    "level": self.level,
                    "achievements": list(self.achievements)
                }, f)
        except Exception as e:
            logger.error(f"Failed to save gamification state: {e}")

    def add_xp(self, amount, reason=""):
        self.xp += amount
        logger.info(f"Earned {amount} XP for: {reason}. Total XP: {self.xp}")
        self._check_level_up()
        self._save_local_state()
        self._sync_to_cloud()

    def unlock_achievement(self, achievement_id):
        if achievement_id not in self.achievements:
            self.achievements.add(achievement_id)
            logger.info(f"Achievement Unlocked! {achievement_id}")
            self.add_xp(500, f"Achievement: {achievement_id}")
            self._save_local_state()

    def _check_level_up(self):
        # Basic curve: Level N requires N * 1000 XP
        required_xp = self.level * 1000
        if self.xp >= required_xp:
            self.level += 1
            self.xp -= required_xp
            logger.info(f"Level Up! Reached Level {self.level}")
            self._check_level_up() # Recursive in case of massive XP gain

    def _sync_to_cloud(self):
        if not self.db_client or not self.user_id:
            return
            
        try:
            # Sync to Supabase xp_leaderboard
            total_aggregate_xp = self.xp
            for i in range(1, self.level):
                total_aggregate_xp += (i * 1000)
                
            self.db_client.table("xp_leaderboard").upsert({
                "user_id": self.user_id,
                "xp": total_aggregate_xp,
                "level": self.level,
                "achievements_count": len(self.achievements)
            }).execute()
        except Exception as e:
            logger.debug(f"Failed to sync gamification to cloud: {e}")
