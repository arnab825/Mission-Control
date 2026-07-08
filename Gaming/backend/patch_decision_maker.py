import os
import re

file_path = r"c:\GitHub\AiAssistant\Gaming\backend\ai_brain\decision_maker.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update __init__ to use ContextEngine
old_context_engine_init = """        # Context Engine (Persistent Background Thread)
        self._context_game_state = {}
        self._context_engine_running = True
        import threading
        self._context_thread = threading.Thread(
            target=self._context_engine_loop,
            daemon=True,
            name="ContextEngine"
        )
        self._context_thread.start()"""

new_context_engine_init = """        # Context Engine (Layer 2)
        try:
            from ai_brain.context_engine import ContextEngine
            self.context_engine = ContextEngine()
            self.context_engine.start()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to start Context Engine: {e}")
            self.context_engine = None"""

content = content.replace(old_context_engine_init, new_context_engine_init)

# 2. Remove _context_engine_loop
loop_pattern = re.compile(r'    def _context_engine_loop\(self\):.*?(?=    def analyze_state\(self, game_state\):)', re.DOTALL)
content = loop_pattern.sub("", content)

# 3. Update analyze_state to use context_engine and add gating
analyze_state_old = """    def analyze_state(self, game_state):
        \"\"\"
        Analyze game state and return advice.
        
        Input: dict with keys like:
          - health (float): Player health percentage
          - enemies_count (int): Number of detected enemies
          - scene_type (str): Current scene classification
          - dialogue_text (str): Detected dialogue
          - quest_texts (list): Detected quest objectives
        Output: dict with 'advice', 'priority', 'category'
        \"\"\"
        scene = game_state.get("scene_type", "unknown")
        health = game_state.get("health", 100)
        enemies = game_state.get("enemies_count", 0)

        # Pass the latest game state to the persistent Context Engine thread
        self._context_game_state = game_state"""

analyze_state_new = """    def analyze_state(self, game_state):
        \"\"\"
        Analyze game state and return advice.
        \"\"\"
        scene = game_state.get("scene_type", "unknown")
        health = game_state.get("health", 100)
        enemies = game_state.get("enemies_count", 0)

        # Feed Layer 2 Context Engine
        if hasattr(self, 'context_engine') and self.context_engine:
            self.context_engine.update_state(game_state)

        # Layer 3 Gating Mechanism: Silently evaluate if we should suppress response
        confidence = game_state.get("scene_confidence", 1.0)
        if scene == "cutscene":
            return self._make_result("...", "low", "waiting", game_state)
        if confidence < 0.3:
            return self._make_result("...", "low", "waiting", game_state)
        if health > 90 and enemies == 0 and scene in ["exploration", "menu", "unknown"]:
            return self._make_result("...", "low", "waiting", game_state)"""

content = content.replace(analyze_state_old, analyze_state_new)


# 4. Update reply_to_prompt to use companion_persona.md
reply_prompt_old = """        agent_cfg = self.config.get("ai_agent", {})
        personality_key = agent_cfg.get("personality", "tactical")
        
        # Resolve custom personality instructions if configured
        prompts = agent_cfg.get("prompts", {})
        personalities = prompts.get("personalities", {})
        system_instr = (
            personalities.get(personality_key)
            or self.PERSONALITY_PROFILES.get(personality_key)
            or personalities.get("tactical")
            or self.PERSONALITY_PROFILES["tactical"]
        )"""

reply_prompt_new = """        agent_cfg = self.config.get("ai_agent", {})
        personality_key = agent_cfg.get("personality", "tactical")
        
        # Load Layer 3 Master Persona
        system_instr = self.PERSONALITY_PROFILES.get(personality_key, self.PERSONALITY_PROFILES["tactical"])
        persona_path = os.path.join(os.path.dirname(__file__), "prompts", "companion_persona.md")
        try:
            if os.path.exists(persona_path):
                with open(persona_path, "r", encoding="utf-8") as pf:
                    system_instr = pf.read() + f"\\n\\n[Active Dynamic Profile: {personality_key.upper()}]"
        except Exception as e:
            logger.error(f"Failed to load master persona: {e}")"""

content = content.replace(reply_prompt_old, reply_prompt_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("decision_maker.py patched successfully")
