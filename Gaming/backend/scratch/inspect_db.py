import json
import glob
import os

files = glob.glob(r"E:\AiAssistant\Gaming\backend\config\games_db_*.json")
for file in files:
    print("\n--- File:", file)
    if os.path.exists(file) and os.path.getsize(file) > 0:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                games = json.load(f)
                for g in games:
                    print("  Name:", g.get("name"))
                    print("  Icon:", g.get("icon"))
                    print("  Local Banner:", g.get("local_banner"))
        except Exception as e:
            print("Error loading JSON:", e)
