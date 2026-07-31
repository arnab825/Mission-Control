# ai_providers.py

PROVIDERS = {
    "auto": {
        "label": "Auto (Smart Failover)",
        "client_type": "openai",
        "env_key": "NVIDIA_API_KEY",
        "default_model": "auto"
    },
    "nvidia": {
        "label": "NVIDIA NIM",
        "client_type": "openai",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "env_key": "NVIDIA_API_KEY",
        "default_model": "meta/llama-3.1-8b-instruct"
    },
    "gemini": {
        "label": "Google Gemini",
        "client_type": "openai",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY",
        "default_model": "gemini-flash-latest"
    },
    "groq": {
        "label": "Groq (Lightning Fast)",
        "client_type": "openai",
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
        "default_model": "llama-3.3-70b-versatile"
    },
    "openrouter": {
        "label": "OpenRouter (Free Tier)",
        "client_type": "openai",
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "default_model": "deepseek/deepseek-r1:free"
    }
}
