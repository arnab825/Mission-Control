import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv

load_dotenv()

from core.config_loader import load_config
config = load_config()

from ai_brain.decision_maker import GameBrain
brain = GameBrain(config=config)

print("=== CONFIG ===")
print("provider:", config.get("ai_agent", {}).get("provider"))
print("model_id:", config.get("ai_agent", {}).get("model_id"))

print("=== BRAIN ===")
print("client:", brain.client)
print("all_clients keys:", list(brain.all_clients.keys()))

for k, v in brain.all_clients.items():
    print(f"Provider: {k}")
    print(f"  client: {v['client']}")

print("\n=== AI COMMAND TEST ===")
prompt = "The system is unstable. Rollback to the previous stable release!"
response = brain.reply_to_prompt(prompt, user_id="test_user", session_id="test_session")
print(f"Prompt: {prompt}")
print(f"Response:\n{response}")

