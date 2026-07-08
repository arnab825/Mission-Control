import sqlite3
import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ai_brain.memory import GameMemory
from core.config_loader import load_config

def main():
    config = load_config()
    mem = GameMemory(config=config)
    conn = sqlite3.connect('data/agent_memory.db')
    cursor = conn.cursor()
    cursor.row_factory = sqlite3.Row
    rows = cursor.execute("SELECT * FROM local_games_cache").fetchall()
    print("Found", len(rows), "rows in local_games_cache")
    for row in rows:
        user_id = row['user_id']
        raw_data = row['data']
        print(f"--- User: {user_id} ---")
        try:
            decrypted = mem._decrypt(raw_data)
            games = json.loads(decrypted)
            print(f"Loaded {len(games)} games:")
            for g in games[:10]:
                print(f" - {g.get('name')} | Platform: {g.get('platform')} | Exe: {g.get('exe_path')}")
            if len(games) > 10:
                print(f" ... and {len(games) - 10} more games")
        except Exception as e:
            print("Failed to decrypt/parse:", e)
    conn.close()

if __name__ == '__main__':
    main()
