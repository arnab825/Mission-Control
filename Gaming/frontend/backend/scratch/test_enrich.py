import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path("c:/GitHub/AiAssistant/Gaming/backend")
sys.path.append(str(backend_dir))

from system.game_scanner import GameScanner

print("Initializing GameScanner...")
scanner = GameScanner(user_id="user_3E7zwiWrt7XmjYOwMAbdwmo7psq")

# Let's mock scanner.games to just contain '007 First Light'
scanner.games = [{
    "id": "local_007firstlight",
    "name": "007 First Light",
    "platform": "Local",
    "install_path": "C:\\Games\\007 First Light",
    "exe_path": None,
    "icon": None,
    "features": [],
    "type": "GAME",
    "genre": "CLASSIC",
    "tags": [],
    "source": "Local",
    "local_banner": None
}]

print("Running AI enrichment...")
scanner.enrich_with_ai()

updated_game = scanner.games[0]
print("\nEnriched Game:")
print("Name:", updated_game.get("name"))
print("Type:", updated_game.get("type"))
print("Genre:", updated_game.get("genre"))
print("Tags:", updated_game.get("tags"))

print("\nSaving to cache...")
scanner.save_games_to_cache(scanner.games)

print("\nVerifying by loading from cache...")
scanner2 = GameScanner(user_id="user_3E7zwiWrt7XmjYOwMAbdwmo7psq")
cached = scanner2.load_cached_games()
for g in cached:
    if "007" in g["name"]:
        print("Loaded Name:", g.get("name"))
        print("Loaded Type:", g.get("type"))
        print("Loaded Genre:", g.get("genre"))
        print("Loaded Tags:", g.get("tags"))
