import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from core.ai_providers import PROVIDERS
print("Providers loaded:", list(PROVIDERS.keys()))

import json
config = {}
try:
    with open(os.path.expandvars(r"%LOCALAPPDATA%\MissionControl\config.json"), "r") as f:
        config = json.load(f)
except Exception as e:
    print("Failed to load config:", e)

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
