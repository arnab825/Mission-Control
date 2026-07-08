import os
import sys
import json
import sqlite3

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_brain.memory import GameMemory

memory = GameMemory()
print("Chat sessions in DB:")
cur = memory._conn.cursor()
cur.execute("SELECT id, title, start_time, user_id FROM chat_sessions")
for row in cur.fetchall():
    print(f"Session: ID={row['id']}, Title={row['title']}, User={row['user_id']}")
    
    # Decrypt and print messages in this session
    messages = memory.get_chat_history(row['id'])
    print(f"  Messages ({len(messages)}):")
    for msg in messages:
        print(f"    [{msg['role']}] {msg['content']}")
    print("-" * 50)
