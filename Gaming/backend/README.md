# 🐍 Mission Control — Python AI & Hardware Backend (`Gaming/backend`)

The core execution engine and telemetry host for **Mission Control**, built with Python 3.12, FastAPI, PyNVML, TensorRT, and custom native C++ DirectX frame queue hooks (`fps_counter.dll`). It manages AI model routing, computer vision, voice engines, and low-level hardware diagnostics.

---

## ⚡ Key Features

- **⚡ C++ DirectX FPS Engine (`fps_counter.dll`)**:
  - Low-level DirectX presentation queue hooking compiled from C++ source (`fps_counter.cpp`).
  - Captures true 1% low FPS, minimum FPS, maximum FPS, and instantaneous frame time deltas without standard Python sample lag.
- **🟢 TensorRT YOLO Vision & NVIDIA NIM**:
  - Pure TensorRT 10.x execution path for YOLOv8 object detection with zero PyTorch VRAM overhead.
  - Multi-tier NVIDIA NIM AI model router (Llama 3.1 8B/70B and Llama 3.2 11B Vision VLM) for real-time tactical game coaching.
- **📊 Real-Time Hardware Telemetry Pipeline**:
  - Direct physical GPU wattage, temperature, clock speeds, and VRAM monitoring via `pynvml`.
  - CPU thermal zone decoding with fallback chain: WMI ➔ CIM ➔ PDH Performance Counters.
  - Native Win32 `EmptyWorkingSet` memory reclamation loop during high system load or game shutdown events.
- **🎙️ Multi-Engine Voice Manager**:
  - Speech-To-Text (STT) via Google Cloud Speech & offline Sphinx fallback.
  - Text-To-Speech (TTS) via ElevenLabs, Google TTS, and native Windows SAPI5 fallback.
  - Anti-ghosting control gating audio outputs strictly during active user sessions.
- **🔒 Motherboard UUID Security Lock**:
  - Cryptographic motherboard hardware signature binding (`enforce_neural_security`) verified via PowerShell PnP Win32 CIM to protect local credentials and settings.

---

## 🛠️ Tech Stack & Dependencies

- **Language**: Python 3.12 (managed via [`uv`](https://github.com/astral-sh/uv))
- **Web Framework**: FastAPI + WebSockets
- **Hardware Telemetry**: `pynvml`, `psutil`, `ctypes` (Win32 API)
- **C++ Native Layer**: MSVC compiled `fps_counter.dll`
- **Vision AI**: TensorRT 10.x, RapidOCR, OpenCV
- **LLM / VLM**: NVIDIA NIM SDK, Hugging Face Hub, Google Gemini API

---

## 🚀 Getting Started

### 1. Installation

```bash
# Navigate to backend directory
cd Gaming/backend

# Sync Python environment dependencies using uv
uv sync
```

### 2. Environment Configuration (`.env`)

Create a `.env` file in `Gaming/backend/` with your API keys:

```env
# Required for NVIDIA NIM Cloud AI Models
NVIDIA_API_KEY=nvapi-your_nvidia_nim_key

# Optional: Game Database & Web Intelligence
RAWG_API_KEY=your_rawg_api_key
TAVILY_API_KEY=tvly-your_tavily_key

# Optional: Premium TTS Voice Engine
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### 3. Run Backend Service

```bash
# Standard execution
uv run main.py

# Developer mode with auto-reload
uv run main.py --dev

# Run as Administrator (recommended for full hardware thermal & FPS counter access)
Start-Process powershell -ArgumentList "-NoExit -Command uv run main.py" -Verb RunAs
```

---

## 📂 Backend Architecture

```
Gaming/backend/
├── ai_brain/                # NIM model router, web search engine, & tactical decision maker
├── capture/                 # High-frequency screen capture (dxcam, DXGI)
├── control/                 # Input simulation & Windows power scheme controller
├── core/                    # FastAPI server & WebSocket connection handlers
├── fps_counter/             # C++ source code (fps_counter.cpp) & compiled DLL (fps_counter.dll)
├── vision/                  # TensorRT YOLOv8 detector & RapidOCR engine
├── voice/                   # Multi-engine STT/TTS voice manager
├── main.py                  # Main entry point & startup diagnostics lock
├── pyproject.toml           # Project dependencies & tool configurations
└── version.json             # Canonical application version metadata
```
