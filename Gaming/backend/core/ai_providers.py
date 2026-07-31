# ai_providers.py

PROVIDERS = {
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
        "default_model": "gemini-1.5-flash"
    },
    "kimi": {
        "label": "Moonshot (Kimi)",
        "client_type": "openai",
        "base_url": "https://api.moonshot.cn/v1",
        "env_key": "MOONSHOT_API_KEY",
        "default_model": "moonshot-v1-8k"
    },
    "deepseek": {
        "label": "DeepSeek",
        "client_type": "openai",
        "base_url": "https://api.deepseek.com",
        "env_key": "DEEPSEEK_API_KEY",
        "default_model": "deepseek-chat"
    }
}
