import os
import sys
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

api_key = os.environ.get("NVIDIA_API_KEY")
print(f"Loaded Key: {api_key[:10]}...{api_key[-10:] if api_key else ''}")

try:
    from openai import OpenAI
    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=api_key)
    print("Sending request to integrate.api.nvidia.com...")
    response = client.chat.completions.create(
        model="meta/llama-3.3-70b-instruct",
        messages=[{"role": "user", "content": "Say hello"}],
        max_tokens=10
    )
    print("Response:")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error occurred: {e}")
