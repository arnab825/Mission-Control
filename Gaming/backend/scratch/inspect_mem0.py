import os
import sys
from dotenv import load_dotenv
from mem0 import MemoryClient

load_dotenv()
api_key = os.environ.get("MEM0_API_KEY")
if not api_key:
    print("Error: MEM0_API_KEY not found in environment.")
    sys.exit(1)

client = MemoryClient(api_key=api_key)

users = ["guest", "user_3E5UF1JGYl2zQ8XlCfthbeyEc6n", "user_3E7zwiWrt7XmjYOwMAbdwmo7psq"]
for user in users:
    print(f"\n=== Memories for User: {user} ===")
    try:
        # Try search with empty query and user filter
        results = client.search(query="", filters={"user_id": user})
        if results:
            for i, res in enumerate(results):
                if isinstance(res, dict):
                    print(f"{i+1}. {res.get('memory')} (ID: {res.get('id')})")
                else:
                    print(f"{i+1}. {getattr(res, 'memory', res)} (ID: {getattr(res, 'id', 'N/A')})")
        else:
            print("No memories found via search.")
    except Exception as e:
        print(f"Error searching memories: {e}")
        
    try:
        # Try get_all with filters parameter
        results = client.get_all(filters={"user_id": user})
        if results:
            for i, res in enumerate(results):
                if isinstance(res, dict):
                    print(f"{i+1}. {res.get('memory')} (ID: {res.get('id')})")
                else:
                    print(f"{i+1}. {getattr(res, 'memory', res)} (ID: {getattr(res, 'id', 'N/A')})")
        else:
            print("No memories found via get_all.")
    except Exception as e:
        print(f"Error getting all memories: {e}")
