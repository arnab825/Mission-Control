import os
import sys
import json
from dotenv import load_dotenv
from mem0 import MemoryClient

load_dotenv()
api_key = os.environ.get("MEM0_API_KEY")
client = MemoryClient(api_key=api_key)

users = ["guest", "user_3E5UF1JGYl2zQ8XlCfthbeyEc6n", "user_3E7zwiWrt7XmjYOwMAbdwmo7psq"]
for user in users:
    print(f"\n=== RAW Memories for User: {user} ===")
    try:
        res = client.get_all(filters={"user_id": user})
        print(json.dumps(res, indent=2))
    except Exception as e:
        print(f"Error: {e}")
