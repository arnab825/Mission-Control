import os
import sys
from dotenv import load_dotenv

load_dotenv()

from core.state_manager import StateManager
sm = StateManager()
config = sm.get_config()

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
