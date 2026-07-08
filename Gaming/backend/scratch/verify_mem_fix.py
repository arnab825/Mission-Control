import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_brain.memory import GameMemory

load_dotenv()

memory = GameMemory()
user_id = "user_3E7zwiWrt7XmjYOwMAbdwmo7psq"

print("--- Verifying actual GameMemory.get_semantic_memory implementation ---")
print("\n--- Empty Query ---")
res_empty = memory.get_semantic_memory(user_id, query="")
print(repr(res_empty))

print("\n--- Non-empty Query ---")
res_query = memory.get_semantic_memory(user_id, query="games suggestions")
print(repr(res_query))
