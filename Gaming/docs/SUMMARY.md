# 📊 Project Summary: Mission Control Gaming Assistant

## 🎯 Core Objective

The **Mission Control Gaming Assistant** is a high-performance, real-time agentic system that enhances gaming through advanced computer vision, NVIDIA-accelerated reasoning, live web-powered game intelligence, and autonomous co-pilot capabilities — with zero VRAM impact on gaming performance.

---

## 🛠️ Architectural Pillars

### 1. 👁️ Vision Pipeline (The Eyes)
- **Engine:** Pure TensorRT 10.x (YOLOv8). Sub-5ms inference, 0 MB PyTorch VRAM overhead.
- **Capture:** dxcam (DXGI), D3DShot, or MSS fallback at 60–120fps.
- **Capabilities:** Real-time object detection (enemies, items), EasyOCR (dialogue, quests), heuristic + ML scene classification.

### 2. 🧠 Decision Engine (The Brain)
- **Modes:** Competitive, Story, Hybrid, Agent — each with scene-aware routing logic.
- **NVIDIA NIM:** Cloud reasoning via Llama 3.1 8B (strategic/tactical) and Llama 3.2 11B Vision (multi-modal).
- **Auto Model Routing:** Task type (wiki / patch / strategy / real_time) auto-selects the fastest and most appropriate NIM model.
- **Context Awareness:** Tracks game state, process health, and window focus to manage resources adaptively.

### 3. 🌐 Web Search Intelligence (New)
A **gaming-optimized, multi-source search engine** that enriches AI responses with live web data. Completely free in both development and production — no credit card ever required.

| Source | Key | Limit | Purpose |
|---|---|---|---|
| **Wikipedia API** | None | ♾️ Unlimited | Game lore, characters, wiki lookups |
| **SteamSpy API** | None | ♾️ Unlimited | Steam stats, player counts, tags |
| **DuckDuckGo** | None | ♾️ Unlimited | Guides, patch notes, community tips |
| **RAWG.io** | Free key | 20,000/month | Ratings, genres, Metacritic, DLC |
| **Tavily AI** | User key | 1,000/month | Optional enrichment (richer AI answers) |

**Task → Source → Model routing:**
```
User Query → detect_task() → select providers → fetch results
           → inject context into NIM prompt → model_override per task
           → AI response enriched with live game data
```

### 4. 🗣️ Voice Engine (The Voice)
- **STT:** Google Cloud (primary), Sphinx (local/offline fallback).
- **TTS:** ElevenLabs (premium), Google Cloud TTS (cloud), SAPI5 / pyttsx3 (always-available local).
- **Profiles:** Named personality profiles (Aero Female / Aero Male / Custom) with distinct rate, pitch, and provider settings per profile.
- **Stability:** Direct COM integration for zero-crash SAPI5 access. Async queue prevents UI blocking.

### 5. 🎮 Agentic Control (The Hands)
- **Autonomous Inputs:** Programmatic keyboard, mouse, and controller via pynput/pyautogui.
- **Safety Workflows:** User-authorized toggles with real-time override detection.
- **Agent Personalities:** Tactical, Friendly, Immersive, Sarcastic, Aggressive.

### 6. 🔧 Hardware Telemetry (The Foundation)
- **GPU:** pynvml (NVML) — real-time thermals, clocks, VRAM, utilization.
- **CPU:** psutil + adaptive priming loop (zero-latency startup, no 0% bug).
- **Thermal:** Multi-stage fallback chain — WMI (MSAcpi) → CIM → PerfData → LibreHardwareMonitor social sync.
- **RAM/Storage:** PowerShell CIM for robust hardware identification on Windows 11.
- **Network:** Real-time WiFi/LAN adapter telemetry.
- **Admin Note:** Full thermal sensor access (CPU temp) requires running as Administrator on modern motherboards.

### 7. ⌨️ Hotkey System
- **Engine:** pynput `GlobalHotKeys` + Win32 `GetAsyncKeyState` fallback.
- **UI:** Click-to-record `HotkeyEdit` widget — no manual `<ctrl>+<alt>+o` typing.
- **Display:** Clean `Ctrl + Alt + O` format (no angle brackets).
- **Configurable:** All 4 hotkeys (HUD toggle, Agentic toggle, Font +/-) editable in Settings.

---

## 🔄 Recent Changes

| Version | Change |
|---|---|
| Latest | **Mission Control UI Overhaul** — Premium glassmorphism, neural backgrounds, Lucide icons |
| Latest | **Hybrid Connectivity** — Intelligent offline/online switching with Neural Lite local reasoning |
| Latest | **Gaming Web Search Engine** — Wikipedia + RAWG + SteamSpy + DuckDuckGo, free dev+prod |
| Latest | **Auto Model Router** — Task-based NIM model selection (tactical/strategic/vision) |
| Latest | **Hotkey Recorder** — Click-to-record with live visual feedback |
| Latest | **CPU Thermal Fallback** — Aggressive multi-stage WMI → CIM → LibreHWM chain |
| Latest | **System Page Fix** — CPU name no longer renders as raw JSON |
| Latest | **Voice Profile System** — Male/female profiles with ElevenLabs + Google + SAPI5 |
| Latest | **NVIDIA NIM Multi-Model** — Nemotron/Llama task-mapped model pipeline |
| Latest | **OSD Polish** — `---` placeholder for missing sensors (no `N/A` clutter) |

---

## 📈 Roadmap Status

| Phase | Description | Status |
|---|---|---|
| 1–10 | Vision, capture, pipeline, multi-mode brain, memory, input, NVIDIA, TensorRT, Blackwell | ✅ Done |
| 11 | System & Hardware Dashboard + Full Settings | ✅ Done |
| 12 | In-App Auto-Update System | ✅ Done |
| 13 | Agentic AI Assistant (G-Assist interface) | ✅ Done |
| 14 | NVIDIA NIM full reasoning integration | ✅ Done |
| 15 | Autonomous co-pilot (input control) | ✅ Done |
| 16 | Multi-model pipeline optimization | ✅ Done |
| 17 | Multi-modal vision (VLM) | ✅ Done |
| 18 | Adaptive Agent Personalities | ✅ Done |
| 19 | High-Reliability Voice Engine | ✅ Done |
| 20 | Autonomous Gameplay + Safety Lab | ✅ Done |
| **21** | **Gaming Web Search Intelligence** | ✅ **Done** |
| **22** | **Hotkey Recorder + Auto Model Routing** | ✅ **Done** |

---

*Last Updated: 2026-05-16*
