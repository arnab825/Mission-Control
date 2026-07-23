import os

file_path = r"c:\GitHub\Mission-Control\Gaming\backend\core\pipeline_host.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_code = """def _auto_switch_mode(self, genre: str, title: str):
        \"\"\"Intelligently switch assistant mode based on game genre.\"\"\"
        mode = GENRE_MODE_MAP.get(genre, "hybrid")
        if self.brain.mode != mode:
            logger.info(f"[AUTO-MODE] Switching to '{mode}' for {title} ({genre})")
            self.brain.set_mode(mode)
            # Sync back to config for persistence
            if "ai_agent" not in self.config: self.config["ai_agent"] = {}
            self.config["ai_agent"]["assistant_mode"] = mode
            
            # Notify UI if in headless mode
            if self.headless:
                bridge.update_state({"assistant_mode": mode})"""

new_code = """def _auto_switch_mode(self, genre: str, title: str):
        \"\"\"Intelligently switch assistant mode and persona based on game genre.\"\"\"
        mode = GENRE_MODE_MAP.get(genre, "hybrid")
        
        # Map modes to Personas
        mode_to_persona = {
            "competitive": "tactical",
            "story": "immersive",
            "hybrid": "friendly"
        }
        persona = mode_to_persona.get(mode, "tactical")
        
        if self.brain.mode != mode or self.config.get("ai_agent", {}).get("personality") != persona:
            logger.info(f"[AUTO-MODE] Switching Mode to '{mode}' and Persona to '{persona}' for {title} ({genre})")
            if hasattr(self.brain, 'set_mode'):
                self.brain.set_mode(mode)
            
            # Sync back to config for persistence
            if "ai_agent" not in self.config: self.config["ai_agent"] = {}
            self.config["ai_agent"]["assistant_mode"] = mode
            self.config["ai_agent"]["personality"] = persona
            
            # Update GameBrain config dynamically
            if hasattr(self.brain, 'config'):
                self.brain.config = self.config
            
            # Notify UI if in headless mode
            if self.headless:
                bridge.update_state({"assistant_mode": mode, "personality": persona})"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("pipeline_host.py patched successfully!")
else:
    print("Failed to find old code in pipeline_host.py!")
