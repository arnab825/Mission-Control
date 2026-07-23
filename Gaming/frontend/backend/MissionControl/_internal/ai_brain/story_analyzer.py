"""
Story analyzer for single-player / narrative games.
Tracks quest progress, dialogue context, and provides story-aware advice.
"""
import time
import logging
from collections import deque

logger = logging.getLogger(__name__)


class StoryAnalyzer:
    """
    Provides story-aware analysis for single-player / narrative games.
    Tracks dialogue history, quest objectives, and provides contextual tips.
    """

    def __init__(self, config=None):
        self.config = config or {}
        self._dialogue_history = deque(maxlen=50)
        self._quest_log = []
        self._discovered_items = set()
        self._visited_scenes = deque(maxlen=100)
        self._last_dialogue = ""
        self._last_quest_update = 0
        self._interaction_hints = []

    def update(self, scene_type, ocr_results=None, detections=None):
        """
        Update story state based on current frame analysis.
        Returns contextual advice string.
        """
        advice_parts = []
        
        # Track scene transitions
        self._visited_scenes.append({
            "scene": scene_type,
            "time": time.time()
        })

        if ocr_results:
            # Process dialogue text
            dialogue_text = self._extract_dialogue(ocr_results)
            if dialogue_text and dialogue_text != self._last_dialogue:
                self._dialogue_history.append({
                    "text": dialogue_text,
                    "time": time.time()
                })
                self._last_dialogue = dialogue_text
            
            # Process quest text
            quest_text = self._extract_quest(ocr_results)
            if quest_text:
                self._update_quests(quest_text)
            
            # Process item/interaction prompts
            item_text = self._extract_items(ocr_results)
            if item_text:
                self._interaction_hints = item_text

        # Generate advice based on scene type
        if scene_type == "dialogue":
            advice_parts.append(self._dialogue_advice())
        elif scene_type == "exploration":
            advice_parts.append(self._exploration_advice(detections))
        elif scene_type == "combat":
            advice_parts.append(self._combat_story_advice(detections))
        elif scene_type == "cutscene":
            advice_parts.append("Cutscene playing. Watch for story clues.")
        elif scene_type == "menu":
            advice_parts.append("Menu detected. Consider saving your game.")
        elif scene_type == "inventory":
            advice_parts.append(self._inventory_advice())

        return " | ".join([a for a in advice_parts if a])

    def get_story_summary(self):
        """Returns a brief summary of tracked story elements."""
        summary = []
        if self._quest_log:
            summary.append(f"Active quests: {len(self._quest_log)}")
            for q in self._quest_log[-3:]:
                summary.append(f"  - {q}")
        if self._discovered_items:
            summary.append(f"Items noted: {len(self._discovered_items)}")
        if self._dialogue_history:
            summary.append(f"Dialogue entries: {len(self._dialogue_history)}")
        return "\n".join(summary) if summary else "No story data tracked yet."

    def _extract_dialogue(self, ocr_results):
        texts = []
        for region in ["subtitle", "dialogue"]:
            for t in ocr_results.get(region, []):
                if t.get("confidence", 0) > 0.6 and len(t.get("text", "")) > 5:
                    texts.append(t["text"])
        return " ".join(texts) if texts else ""

    def _extract_quest(self, ocr_results):
        texts = []
        for t in ocr_results.get("quest", []):
            if t.get("confidence", 0) > 0.6:
                texts.append(t["text"])
        return texts

    def _extract_items(self, ocr_results):
        texts = []
        for region in ["item", "tooltip"]:
            for t in ocr_results.get(region, []):
                if t.get("confidence", 0) > 0.6:
                    texts.append(t["text"])
        return texts

    def _update_quests(self, quest_texts):
        for qt in quest_texts:
            if qt not in self._quest_log:
                self._quest_log.append(qt)
                logger.info(f"New quest tracked: {qt}")

    def _dialogue_advice(self):
        if self._interaction_hints:
            return f"Dialogue active. Interaction: {self._interaction_hints[0]}"
        return "Dialogue in progress. Pay attention to choices."

    def _exploration_advice(self, detections):
        tips = []
        if self._interaction_hints:
            tips.append(f"Nearby: {', '.join(self._interaction_hints[:2])}")
        if detections and len(detections) > 0:
            tips.append(f"{len(detections)} points of interest detected")
        if not tips:
            tips.append("Exploring. Look for items and NPCs.")
        return " | ".join(tips)

    def _combat_story_advice(self, detections):
        enemy_count = len(detections) if detections else 0
        if enemy_count > 3:
            return f"Heavy combat ({enemy_count} enemies). Use abilities wisely."
        elif enemy_count > 0:
            return f"Combat ({enemy_count} enemies). Check for loot after."
        return "Combat area. Stay alert."

    def _inventory_advice(self):
        return "Inventory open. Equip best gear before proceeding."
