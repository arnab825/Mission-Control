"""
Game telemetry rule engine for generating context-specific recommendations.
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class TelemetryAdvisor:
    """
    Analyzes game-specific telemetry state (health, speed, resources)
    and maps it to genre-based strategy advice.
    """

    @staticmethod
    def get_custom_telemetry_advice(state: dict, game_title: str) -> Optional[Dict[str, str]]:
        """
        Generate game/genre specific advice based on custom telemetry fields.
        """
        from core.state_models import TITLE_GENRE_MAP
        
        genre = "Unknown"
        game_title_lower = (game_title or "").lower()
        
        for title, g in TITLE_GENRE_MAP.items():
            if title.lower() == game_title_lower:
                genre = g
                break
                
        if genre == "Unknown":
            genre = state.get("genre", "Unknown")
            
        advice_parts = []
        priority = "low"
        category = "status"
        
        # 1. Racing / Sports Game Rules
        if genre.upper() == "RACING" or "racing" in game_title_lower or "need for speed" in game_title_lower:
            category = "racing"
            speed = state.get("speed")
            position = state.get("position")
            lap = state.get("lap")
            damage = state.get("damage") or state.get("car_damage")
            
            if damage is not None:
                try:
                    damage_val = float(damage)
                    if damage_val > 70:
                        advice_parts.append("CRITICAL DAMAGE: Vehicle integrity low. Seek repair/pit stop immediately!")
                        priority = "high"
                    elif damage_val > 40:
                        advice_parts.append("WARNING: Vehicle damaged. Handle corners with care.")
                        priority = "medium"
                except ValueError:
                    pass
                    
            if position is not None:
                try:
                    pos_val = int(position)
                    if pos_val > 3:
                        advice_parts.append(f"Position P{pos_val}. Draft leading vehicles to gain speed.")
                        priority = "medium"
                except ValueError:
                    pass
                    
            if speed is not None:
                try:
                    speed_val = float(speed)
                    if speed_val > 150:
                        advice_parts.append("High speed. Prepare braking zones early for upcoming turns.")
                except ValueError:
                    pass

        # 2. Strategy / MOBA Game Rules
        elif genre.upper() in ("STRATEGY", "MOBA") or any(x in game_title_lower for x in ("dota", "league of legends", "starcraft", "age of empires")):
            category = "strategy"
            gold = state.get("gold") or state.get("resources_gold")
            wood = state.get("wood") or state.get("resources_wood")
            mana = state.get("mana") or state.get("mp")
            population = state.get("population") or state.get("pop")
            
            if mana is not None:
                try:
                    mana_val = float(mana)
                    if mana_val < 20:
                        advice_parts.append("Low Mana/MP. Conserve abilities and avoid team fights.")
                        priority = "high"
                        category = "combat"
                except ValueError:
                    pass
                    
            if gold is not None:
                try:
                    gold_val = float(gold)
                    if gold_val > 2000:
                        advice_parts.append("High gold reserves. Return to shop to purchase items/upgrades.")
                        priority = "medium"
                except ValueError:
                    pass

        # 3. RPG / Souls-like / Action Rules
        elif genre.upper() in ("RPG", "OPEN WORLD") or any(x in game_title_lower for x in ("elden ring", "cyberpunk", "souls", "witcher")):
            category = "rpg"
            stamina = state.get("stamina") or state.get("stamina_pct")
            mana = state.get("mana") or state.get("mp") or state.get("fp")
            level = state.get("level")
            xp = state.get("xp") or state.get("experience")
            
            if stamina is not None:
                try:
                    stamina_val = float(stamina)
                    if stamina_val < 25:
                        advice_parts.append("Low Stamina. Manage spacing and roll defensively.")
                        priority = "high"
                        category = "combat"
                except ValueError:
                    pass
                    
            if mana is not None:
                try:
                    mana_val = float(mana)
                    if mana_val < 20:
                        advice_parts.append("Low Mana/FP. Replenish focus points before casting spells.")
                        priority = "medium"
                except ValueError:
                    pass

        # 4. Survival Game Rules
        elif any(x in game_title_lower for x in ("minecraft", "rust", "ark", "survival")):
            category = "survival"
            hunger = state.get("hunger") or state.get("food")
            thirst = state.get("thirst") or state.get("water")
            durability = state.get("durability") or state.get("tool_durability")
            
            if hunger is not None:
                try:
                    hunger_val = float(hunger)
                    if hunger_val < 30 or hunger_val < 3:
                        advice_parts.append("Low Hunger. Consume food immediately to restore stamina/regeneration.")
                        priority = "high"
                except ValueError:
                    pass
                    
            if thirst is not None:
                try:
                    thirst_val = float(thirst)
                    if thirst_val < 30:
                        advice_parts.append("Low Hydration. Drink water immediately.")
                        priority = "high"
                except ValueError:
                    pass

        if advice_parts:
            return {
                "advice": " | ".join(advice_parts),
                "priority": priority,
                "category": category
            }
        return None
