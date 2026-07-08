import os
import logging
from dotenv import load_dotenv
from mem0 import MemoryClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_mem0")

def test_mem0():
    load_dotenv()
    api_key = os.environ.get("MEM0_API_KEY")
    if not api_key:
        print("Error: MEM0_API_KEY not found in .env")
        return

    print(f"Initializing MemoryClient with key: {api_key[:6]}...")
    client = MemoryClient(api_key=api_key)
    
    # 1. Test search
    print("\n--- Testing Mem0 search ---")
    try:
        results = client.search(query="gaming preferences", filters={"user_id": "test_user_123"})
        print(f"Search succeeded! Found {len(results)} results:")
        print(results)
    except Exception as e:
        print(f"Search failed: {e}")

    # 2. Test add
    print("\n--- Testing Mem0 add ---")
    messages = [
        {"role": "user", "content": "I prefer playing open world RPG games like Witcher 3."},
        {"role": "assistant", "content": "That is noted. Witcher 3 is a great game."}
    ]
    try:
        res = client.add(messages, user_id="test_user_123")
        print("Add succeeded! Response:")
        print(res)
    except Exception as e:
        print(f"Add failed: {e}")

if __name__ == "__main__":
    test_mem0()
