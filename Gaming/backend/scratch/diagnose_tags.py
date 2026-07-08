import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path("c:/GitHub/AiAssistant/Gaming/backend")
sys.path.append(str(backend_dir))

from ai_brain.decision_maker import GameBrain
from system.game_scanner import GameScanner

print("Initializing GameBrain...")
brain = GameBrain()

print("Classifying '007 First Light'...")
res = brain.classify_game_title("007 First Light")
print("Result:", res)
