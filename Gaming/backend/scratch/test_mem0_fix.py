import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_brain.memory import GameMemory

# Load dotenv to get API key
load_dotenv()

memory = GameMemory()
user_id = "user_3E7zwiWrt7XmjYOwMAbdwmo7psq"

print("--- Testing get_semantic_memory with empty query (mocking the fix) ---")
def run_get_semantic_memory_fixed(user_id, query=""):
    if not memory.mem0_client:
        return "No Mem0 client"
    try:
        if not query or not query.strip():
            print("Using get_all fallback...")
            results = memory.mem0_client.get_all(filters={"user_id": user_id})
        else:
            print(f"Using search for query: {query}...")
            results = memory.mem0_client.search(query=query, filters={"user_id": user_id})
            
        if not results:
            return "No results"
            
        if isinstance(results, dict):
            results = results.get("results", [])
            
        facts = []
        for res in results:
            if isinstance(res, dict) and "memory" in res:
                facts.append(f"- {res['memory']}")
            elif hasattr(res, "memory"):
                facts.append(f"- {res.memory}")
        return "\n".join(facts)
    except Exception as e:
        return f"Error: {e}"

print("\n--- Testing Empty Query ---")
print(run_get_semantic_memory_fixed(user_id, query=""))

print("\n--- Testing Non-empty Query ---")
print(run_get_semantic_memory_fixed(user_id, query="games suggestions"))
