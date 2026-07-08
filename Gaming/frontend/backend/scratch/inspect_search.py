import os
import sys
import json
from dotenv import load_dotenv
from mem0 import MemoryClient

load_dotenv()
api_key = os.environ.get("MEM0_API_KEY")
client = MemoryClient(api_key=api_key)

user = "user_3E7zwiWrt7XmjYOwMAbdwmo7psq"
try:
    print("=== Search with query 'games' ===")
    res = client.search(query="games", filters={"user_id": user})
    print(type(res))
    print(json.dumps(res, indent=2))
except Exception as e:
    print(f"Error: {e}")
