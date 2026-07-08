import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path("c:/GitHub/AiAssistant/Gaming/backend")
sys.path.append(str(backend_dir))

from system.game_scanner import GameScanner

print("Initializing GameScanner...")
# Try to instantiate a scanner with a dummy or actual user ID if known
scanner = GameScanner(user_id="user_3E7zwiWrt7XmjYOwMAbdwmo7psq")

print("Loading cached games...")
cached = scanner.load_cached_games()
print(f"Loaded {len(cached)} games from cache.")

for g in cached:
    if "007" in g["name"] or "Light" in g["name"]:
        print("\nFound Target Game:")
        print("Name:", g.get("name"))
        print("Type:", g.get("type"))
        print("Genre:", g.get("genre"))
        print("Tags:", g.get("tags"))
        print("Features:", g.get("features"))
        print("Platform:", g.get("platform"))
        print("Install Path:", g.get("install_path"))
