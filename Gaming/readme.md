# 🧠 🎮 Mission Control Gaming Assistant (NVIDIA-Powered)

An advanced, real-time AI gaming assistant that provides tactical coaching, vision-based detection, story tracking, autonomous co-pilot capabilities, and **live web-powered game intelligence** — all running locally on NVIDIA GPUs.

## 🔔 Current Release

- **Version:** `v2.0.0` — 2026-07-06
- **Highlights:** Woodpecker CI/CD Integration — Migrated the packaging, backend compilation, version stamping, and release publication pipelines from GitHub Actions to Woodpecker CI (runnable locally via PowerShell).

### 📜 Release Notes

#### `v2.0.0` — 2026-07-06 (Woodpecker CI/CD Integration)
- **CI/CD Migration**: Switched the entire build and deploy workflow to Woodpecker CI/CD, enabling fully automated local builds and release publishing.
- **Local Run Script**: Added `run_local.ps1` to allow developers to easily run the build, package, and release pipeline locally.
- **BOM File Fixes**: Resolved critical UTF-8 BOM encoding issues in `package.json` that broke Vite and PostCSS builds.

#### `v1.4.9` — 2026-06-28 (Anti-Ghosting Voice Controls, Security Hardening & AI Blog Pipeline)
- **Anti-Ghosting Speech Control**: Gated the Text-To-Speech (TTS) engine for chat responses to only trigger when the user is in an active voice session (`is_listening = true`), avoiding unprompted spoken voice during typing.
- **Hotkey Conflict Resolution**: Replaced the default microphone toggle shortcut from the global paste shortcut `<ctrl>+v` to `<ctrl>+<alt>+m` to eliminate accidental triggers.
- **EasyOCR Eager Quantization Upgrade**: Updated EasyOCR dependency calls to use the modern `torchao` eager-mode API, silencing deprecated `torch.ao.quantization` warnings.
- **Motherboard UUID Lock & Encryption**: Enforced cryptographic Motherboard UUID locks for settings verification, and added local credential isolation policies.
- **AI-Driven Gaming Intel Pipeline**: Programmed a Next.js API endpoint fetching real-time headlines from top feeds (IGN, AnandTech) to generate technical blog articles using NVIDIA NIM.
- **MongoDB Atlas Sync & Cron**: Secured the pipeline with a `CRON_SECRET` auth handshake and scheduled a nightly Vercel cron (02:00 AM IST) that saves posts directly in MongoDB Atlas, protecting generated content from ephemeral Vercel environment wipes.

#### `v1.4.8` — 2026-06-26 (Voice Mic Toggle & Consolidated Electron App Overlay)
- **Consolidated Window Management**: Eliminated the redundant standalone `agent-popup` window overlay to streamline system overhead, consolidating all agent chat interface features into the primary Electron dashboard and HUD overlay.
- **Microphone Hotkey Control**: Integrated customizable microphone toggle hotkey (default `<ctrl>+<alt>+v`), interfacing with the voice manager to start/stop listening on demand with auditory chime indicators.
- **HUD Subtitles Overlay**: Designed a glassmorphic subtitles overlay strip at the bottom center of the HUD screen displaying user voice prompts, agent responses, and a pulsating mic recording state ("Listening...").
- **Auto-Hide Subtitles**: Implemented overlay fade-out logic triggering after 10 seconds of speech or response inactivity when the microphone is inactive.

#### `v1.4.7` — 2026-06-22 (TensorRT & Working Set Memory Optimization)
- **TensorRT Model Integration**: Integrated TensorRT engine support for YOLOv8n object detection to reduce GPU overhead.
- **GPU Metric Key Fix**: Fixed GPU metrics telemetry key mapping from `gpu_util` to `gpu_load` for correct overload detection.
- **Adaptive Throttling**: Implemented Win32 `EmptyWorkingSet` API RAM flushing inside the adaptive throttle loop under high load.
- **Aggressive Model Unloading**: Added aggressive memory reclamation inside `yolo_detector` and `ocr_reader` `unload_model` methods.
- **Game Exit RAM Flush**: Added game exit RAM flush hooks in `main.py` to minimize backend memory footprint when a game stops.

#### `v1.4.6` — 2026-06-17 (Game Scanner & Legacy Feature Tags)
- **Frostbite Engine Detection**: Implemented Frostbite Engine detection to properly flag native HDR support in Need for Speed Heat and other EA titles.
- **UI Parsers**: Updated Settings and Games UI libraries to parse new config tags.

#### `v1.4.5` — 2026-06-10 (Interactive Icons and Search Dismissal)
- **Lucide Icons**: Added representative Lucide icons for all subpart links in navbar dropdowns.
- **Desktop Search**: Added focused clear and dismiss close button on desktop search bar.

#### `v1.4.4` — 2026-06-10 (Hover Dropdown Click Interceptor Fix)
- **Hover Dropdowns**: Eliminated empty gap between navigation headers and dropdown panels to stabilize hover state and allow click actions.

#### `v1.4.3` — 2026-06-10 (Comprehensive Navbar Dropdowns Menu)
- **Navbar Dropdowns**: Converted every main header nav link into a dedicated dropdown submenu.
- **Submit Telemetry**: Connected Submit Telemetry dropdown item to auto-open ReportModal via URL query parameters.

#### `v1.4.2` — 2026-06-10 (SEO and Responsive Navbar Enhancements)
- **Responsive Dropdown**: Added responsive dropdown for secondary navbar links.
- **Autocomplete Suggestions**: Added search bar autocomplete suggestions.
- **SEO & Metadata**: Injected JSON-LD Schema markup and enhanced SEO keywords metadata.

#### `v1.4.1` — 2026-06-10 (WebGL and WebSocket Specs Auto-Detection)
- **WebGL**: Added discrete GPU request to WebGL.
- **WebSocket Specs**: Added direct local desktop app websocket specs query layer.

#### `v1.4.0` — 2026-06-10 (Theme and Spec Auto-Detection Fixes)
- **WebGL GPU**: Fixed WebGL GPU parameter name to enable auto-detection.
- **Select Option Styling**: Added dark styling classes to select and option tags.

#### `v1.3.9` — 2026-06-10 (Telemetry & Community Bug Tracker)
- **Community Glitch Tracker**: Implemented community glitch tracker on website.
- **Telemetry Sync**: Connected telemetry sync to launcher modal.
- **Privacy Settings**: Added privacy toggle controls to settings.

#### `v1.3.8` — 2026-06-10 (DirectX Native Frame-Rate Engine & High-Fidelity HUD Telemetry)
- **C++ DirectX FPS Engine**: Implemented low-level frame presentation queue queries inside the C++ native layer ([fps_counter.cpp](file:///c:/GitHub/Mission-Control/Gaming/backend/fps_counter.cpp) compiled to `fps_counter.dll`), capturing absolute instantaneous minimum and maximum FPS.
- **Precision Telemetry Stream**: Exposed absolute min/max FPS, 1% lows, average min/max FPS, real-time CPU/GPU wattage, CPU/GPU temperatures, and physical RAM/VRAM capacities over the WebSocket bridge without Rolling Average Python fallbacks.
- **HUD Layout Standardization**: Standardized CPU Util and GPU Temp indicators across Standard, Compact, and Horizontal layouts in [HUD.tsx](file:///c:/GitHub/Mission-Control/Gaming/frontend/src/components/HUD.tsx), utilizing relative `em` scaling for perfect proportion adjustment and dynamic Electron `setBounds` window boundaries resizing in [main.ts](file:///c:/GitHub/Mission-Control/Gaming/frontend/electron/main.ts).
- **Speech Recognition Deprecation Guard**: Silenced third-party standard library deprecation warnings (`aifc` and `audioop` slated for removal in Python 3.13) by wrapping imports in a localized `warnings.catch_warnings` block inside [voice_manager.py](file:///c:/GitHub/Mission-Control/Gaming/backend/voice/voice_manager.py).

#### `v1.3.7` — 2026-05-30 (Asynchronous Search, Pure Telemetry & Active Cleaning)
- **Asynchronous Gameplay Search**: Integrated a fully background asynchronous thread to fetch mission and strategy walkthroughs, eliminating core brain thread blocks and HUD stuttering.
- **Real-Time Telemetry**: Replaced all estimated, randomized, or mock telemetry generators with direct, physical NVML and PDH queries for CPU, GPU, RAM, FPS, and Disk.
- **Active HUD Positioning & Cleaning**: Implemented robust window close/destruction lifecycle on toggle-off to release graphics resources, and tied snaps to native Electron show/hide events.
- **Settings Page Auto-Sync**: Overhauled form synchronization using `useEffect` hooks to map external coordinates adjustments, preventing stale saves from overwriting HUD layouts.
- **Process State Handshake**: Synchronized library process watcher scans directly with the pipeline state lock to display active game titles instantly on the HUD.

#### `v1.3.6` — 2026-05-28 (Premium UI Responsiveness & GPU Feature Badges)
- **Console Dashboard Header**: Made the console dashboard header fully responsive, stacking elements cleanly on smaller viewports and preventing title truncation.
- **Platform Filters**: Improved Platform filter pills container to prevent wrapping and remain perfectly aligned on a single row.
- **Unused Warnings**: Fixed GPU_RTX_FEATURES declared but never read warning by removing REFLEX and using it for the needsRtx capability check.

#### `v1.3.5` — 2026-05-28 (Snappy Telemetry Preloading & Concurrent Hardware Scans)
- **Instant Telemetry Preloading**: Populates basic system specifications (CPU model, RAM Capacity, OS name) instantly in memory on startup, allowing the React dashboard to render these specs immediately.
- **Concurrently Executed Hardware Scans**: Refactored the heavy static hardware queries (partition details, USB peripherals, RAM sticks) to run in parallel using a `ThreadPoolExecutor`, cutting startup discovery latency from 8–9 seconds down to less than 2 seconds.
- **Native OS & Display Queries**: Overhauled OS details and display detection using Windows HKLM registry keys and native ctypes `EnumDisplaySettingsW` API. This fetches resolution/refresh rate and OS edition in under 1ms, avoiding slow PowerShell `CimInstance` subprocesses.
- **Redundant RAM Speed Query Removal**: Extracted max RAM speed directly from the cached physical RAM stick details, saving a redundant, slow PowerShell call.

#### `v1.3.4` — 2026-05-28 (Native API Performance Tuning & Real Standby RAM Flush)
- **Native API Integration**: Replaced slow external PowerShell process spawns for registry modifications (`winreg`) and process priority settings (`psutil`) with native Python APIs, reducing execution time from hundreds of milliseconds to microseconds.
- **Real System Standby RAM Flush**: Replaced the ineffective `[System.GC]::Collect()` command with a real Windows API-level working set flush (`EmptyWorkingSet` via `ctypes` & `psutil`) to genuinely free up system RAM and reduce game micro-stutters.
- **Robust Fallback Mechanisms**: Implemented reliable safety nets that fall back to standard CLI tools and PowerShell commands if native APIs encounter permission errors or platform limitations.

#### `v1.3.3` — 2026-05-28 (Automatic Screen Brightness Preservation)
- **Adaptive Screen Brightness Preservation**: Overhauled the power scheme application to automatically capture current screen brightness prior to switching power plans, and restore the original level 0.4 seconds after the switch. This prevents jarring display changes when activating Max, Silent, or Balanced modes.

#### `v1.3.2` — 2026-05-28 (Game Mode Power Scheme Diagnostics & Safety Details)
- **Windows Power Scheme Mapping**: Explained behavior of Silent, Balanced, and Max modes, which map directly to Power Saver, Balanced, and High Performance system templates respectively.
- **Adaptive Screen Brightness Clarification**: Documented why screen brightness may decrease when switching profiles (due to independent OS profile settings) and how to resolve it by updating the specific plan brightness.
- **Hardware Safety Integrity**: Outlined why Game Mode cannot fry laptop hardware, as it works via official Windows APIs and preserves silicon-level thermal and hardware-level safeguards.
- **Silent Mode Cooling Logic**: Documented how Silent mode throttles CPU/GPU power limits and changes OS cooling policy to passive for low-noise fan operation.

#### `v1.3.1` — 2026-05-28 (Premium System Telemetry Polish & Dynamic Library Routing)
- **Space-Efficient Header**: Redesigned the System Telemetry page header to be extremely low-profile and compact, reclaiming substantial vertical screen space.
- **GPU Full Name**: Removed truncation from the dynamic GPU telemetry chip to show the full active system graphics card model name cleanly.
- **CPU Architecture Spec**: Replaced empty CPU temperature `---` with CPU Architecture for verified high-fidelity specification validation.
- **Compact Settings Toggle**: Relocated the diagnostics `Inspect Pipeline Log` button next to the `Aero Auto-Sense` active status badge in the Settings page.
- **Dynamic Library Target Matching**: Enhanced co-pilot pipeline mapping with presets preservation and robust case-insensitive substring genre routing.

#### `v1.3.0` — 2026-05-24 (Dynamic OAuth Linking & Cryptographic E2EE Overhaul)
- **Dynamic Linked Account**: Upgraded settings profile card to include live Monogram initial generation, clipboard Node ID utils, and dynamic "Gateway Integrity" locks.
- **SSO Identity Gateways**: Integrated direct Google, Discord, and Microsoft OAuth connection buttons using Clerk, displaying live status details and enforcing lockout security constraints.
- **Hardware-Bound E2EE**: Connected motherboard UUID binds to dynamically calculated session handshakes, letting the dashboard card update active E2EE encryption signals in real time.
- **Privacy & Security Grid & Backend Enforcer**: Overhauled the Privacy card into a 2-column glassmorphic grid; added Secure Sandbox, Motherboard UUID Binding, and 5-min Key Rotation toggles; built an active `enforce_neural_security` enforcer on the Python backend that executes on startup and settings modification events, using PowerShell PnP Win32 CIM to verify motherboard hardware signatures.
- **Pycache Ghosting Guard**: Completely resolved stale module loads and ghost zombie processes by recursively purging pycaches, running standard `sys.dont_write_bytecode`, and setting `PYTHONDONTWRITEBYTECODE=1` in spawners.
- **Electron Forge Configuration**: Integrated multi-platform packaging (Windows/Linux) via Squirrel, DEB, and RPM makers with zero blank screen startup flash.

#### `v1.2.2` — 2026-05-20 (UX Reusability and Logging Stability)
- **Custom React Hooks:** Added custom React hooks `useHotkey` and `useDebounce` for dashboard control.
- **Telemetry Formatting:** Created reusable formatters library to display clock speeds and bytes cleanly.
- **Startup Crash Fix:** Fixed a critical main.py startup crash caused by invalid logging.Formatter parameters.
- **Release Tooling:** Resolved path mismatches in release tools (`publish.ps1` and `bump_version.py`).


## 🔁 Significant Overhaul

This release contains a large, system-wide overhaul that restructures the core pipeline, vision stack, UI, AI integration, and release tooling. The changes are designed to improve runtime stability, increase performance on NVIDIA GPUs, and enable richer multimodal AI features.

- **Pipeline & Stability:** Rewrote the pipeline host into a modular, multi-threaded `PipelineHost` with explicit alive flags, safe shutdown/join semantics, and improved signal handling to eliminate `RuntimeError` crashes during Qt teardown.
- **Vision & Inference:** Made TensorRT the preferred inference path with automatic TensorRT detection, YOLOv8 TensorRT engine support, and a robust PyTorch fallback for compatibility.
- **Multi-Model AI & NIM:** Integrated NVIDIA NIM (Llama 3.x) and VLMs, added Auto Model Routing (tactical/strategic/vision), and introduced state-hashing caches to reduce redundant inference calls.
- **Web Intelligence:** Added a multi-source gaming web search engine (Wikipedia, RAWG.io, SteamSpy, DuckDuckGo) to enrich context and enable patch-aware routing for the AI brain.
- **UI Overhaul:** Implemented full `Settings` and `System` pages, a Hotkey Recorder widget, HUD persistence and font scaling, and polished OSD visuals and layout.
- **Telemetry & Hardware:** Hardened CPU thermal reading with a WMI → CIM → PerfData fallback chain, integrated `pynvml` for GPU telemetry, and improved PowerShell fallbacks for Windows environments.
- **Voice, OCR & Story:** Added hardware-accelerated TTS (NIM/ElevenLabs) with voice profiles, dynamic OCR ROI detection, and tighter StoryAnalyzer integration.
- **Auto-Update & Packaging:** In-app update system using `version.json` and `UpdateDialog`, automated release tooling, and packaging scripts (`build_app.ps1`, `scripts/bump_version.py`).
- **Agentic AI & Control:** Implemented high-level autonomous co-pilot capabilities with direct system access. The AI can now launch games, control hardware (Cooling/VRAM), and simulate I/O device inputs based on live gameplay context and your local game library. See [AGENTIC_LOGIC.md](AGENTIC_LOGIC.md) for full architecture.

Impact: these changes improve reliability, reduce crashes, enable higher-performance inference, and provide a more maintainable, feature-rich codebase. See the full technical notes in [backend/patches.md](backend/patches.md) and the canonical version metadata at [backend/version.json](backend/version.json).

---

## 🚀 Project Overview

**Mission Control** is built for gamers with **NVIDIA RTX GPUs (20, 30, 40, 50 series)**. By leveraging **Pure TensorRT Inference**, the assistant runs with **ZERO PyTorch VRAM overhead**, saving ~1GB of memory for your games.

---

## 🧱 Full App Workflow Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        Mission Control — FULL SYSTEM WORKFLOW                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

  USER
   │
   ▼
┌──────────────────────────────────────────────────────┐
│              🖥️  DESKTOP UI (PyQt6)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Games    │ │ Agent    │ │ System   │ │Settings │ │
│  │ Library  │ │ Chat     │ │Dashboard │ │ Page    │ │
│  └──────────┘ └────┬─────┘ └──────────┘ └────┬────┘ │
└───────────────────┼──────────────────────────┼──────┘
                    │ User Query                │ Config
                    ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🧠 AI DECISION ENGINE                                │
│                         (ai_brain/decision_maker.py)                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TASK AUTO-DETECTION                              │   │
│  │   "how to"→strategy │ "patch"→patch │ "wiki"→wiki │ "server"→live  │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │                  🌐 WEB SEARCH ENGINE (Free, Dev+Prod)              │   │
│  │                   (ai_brain/web_search.py)                          │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────────┐  │   │
│  │  │  Wikipedia  │ │   RAWG.io   │ │  SteamSpy  │ │  DuckDuckGo  │  │   │
│  │  │  (No Key)   │ │ (Free Key)  │ │  (No Key)  │ │   (No Key)   │  │   │
│  │  │ Unlimited   │ │ 20k/month   │ │ Unlimited  │ │  Unlimited   │  │   │
│  │  │  Game Lore  │ │ Game DB     │ │ Steam Data │ │ Guides/News  │  │   │
│  │  └─────────────┘ └─────────────┘ └────────────┘ └──────────────┘  │   │
│  │                          [Optional: Tavily AI — User Key]           │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │ Enriched Context                          │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │               🤖 MODEL AUTO-ROUTER (Task → NIM Model)               │   │
│  │  wiki/patch → tactical_model  │  strategy → strategic_model         │   │
│  │  vision     → vision_model    │  general  → strategic_model         │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │                   🔮 NVIDIA NIM (Cloud AI)                          │   │
│  │   Llama 3.1 8B (Strategic) │ Llama 3.1 8B (Tactical)               │   │
│  │   Llama 3.2 11B Vision (VLM) — Multi-modal game scene analysis      │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │ AI Response
          ┌──────────────────────┼───────────────────────────┐
          │                      │                           │
          ▼                      ▼                           ▼
┌──────────────────┐  ┌──────────────────┐      ┌────────────────────────┐
│  🎙️ VOICE ENGINE  │  │  💬 AGENT CHAT   │      │  🎮 GAME VISION PIPELINE│
│ (voice_manager)  │  │  (Agent Page)    │      │                        │
│                  │  │                  │      │  ┌──────────────────┐  │
│ STT (Listen):    │  │  - Chat replies  │      │  │  Screen Capture   │  │
│  Google (Cloud)  │  │  - Advice cards  │      │  │  (dxcam, 60fps+)  │  │
│  Sphinx (Local)  │  │  - Action confirm│      │  └────────┬─────────┘  │
│                  │  └──────────────────┘      │           │            │
│ TTS (Speak):     │                            │  ┌────────▼─────────┐  │
│  ElevenLabs      │                            │  │  YOLOv8 Vision   │  │
│  Google Cloud    │                            │  │  (TensorRT 10x)  │  │
│  SAPI5 (Local)   │                            │  └────────┬─────────┘  │
└──────────────────┘                            │           │            │
                                                │  ┌────────▼─────────┐  │
                                                │  │   OCR / Scene    │  │
                                                │  │ Classification   │  │
                                                │  └────────┬─────────┘  │
                                                └──────────┼─────────────┘
                                                           │
                                                ┌──────────▼──────────────┐
                                                │   📟 HUD OVERLAY        │
                                                │   (GameOverlay Qt)      │
                                                │   - Tactical alerts     │
                                                │   - HP / GPU / CPU bar  │
                                                │   - Story tips          │
                                                │   - Agent advice cards  │
                                                └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    🔧 HARDWARE TELEMETRY LAYER                              │
│                                                                             │
│  GPU (pynvml)     CPU (psutil)     Thermal (WMI/CIM/LibreHWM fallback)     │
│  RAM (PowerShell CIM)    Network (WiFi/LAN adapters)    Disk I/O            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                  ⌨️  GLOBAL HOTKEY SYSTEM                                   │
│                  (pynput.GlobalHotKeys + Win32 fallback)                    │
│                                                                             │
│  Ctrl+W → Toggle HUD     Ctrl+Alt+A → Toggle Agentic Mode                  │
│  Ctrl+Alt+= → Font Up    Ctrl+Alt+- → Font Down                            │
│  [All hotkeys are user-configurable in Settings → Global Hotkeys]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Web Search Intelligence Engine

Mission Control includes a **gaming-optimized, multi-source web search engine** that provides live game data directly to the AI. Works **100% free in both development and production** — no credit card required.

### Source Stack

| Source | Key Required | Limit | Best For |
|---|---|---|---|
| **Wikipedia API** | ❌ None | ♾️ Unlimited | Game lore, characters, story, wikis |
| **SteamSpy API** | ❌ None | ♾️ Unlimited | Steam player counts, tags, pricing |
| **DuckDuckGo** | ❌ None | ♾️ Unlimited | Patch notes, guides, strategies |
| **RAWG.io Game DB** | ✅ Free key | 20,000/month | Ratings, genres, Metacritic, DLC |
| **Tavily AI** | ✅ User's key | 1,000/month | Rich AI-synthesized answers (optional) |

### Auto Task Routing

| User Says | Task Detected | Sources Used | NIM Model |
|---|---|---|---|
| *"where is the sword of dawn"* | `wiki` | Wikipedia + RAWG | Tactical (fast) |
| *"latest patch notes"* | `patch` | DuckDuckGo (news) | Tactical (fast) |
| *"best sniper build"* | `strategy` | DuckDuckGo + SteamSpy | Strategic (deep) |
| *"is the server down?"* | `real_time` | SteamSpy + DuckDuckGo | Tactical (fast) |
| *"game rating and genre"* | `game_info` | RAWG + SteamSpy | Strategic (deep) |

### Setup (Optional Keys)

```bash
# .env file — only needed for enhanced sources
RAWG_API_KEY=your-key       # Free at: https://rawg.io/apidocs (20k/month)
TAVILY_API_KEY=tvly-xxxxx   # Free at: https://app.tavily.com (1000/month)

# DuckDuckGo, Wikipedia, SteamSpy — NO KEY NEEDED, auto-enabled always
```

---

## 🎮 Game Modes

| Mode | Best For | Features |
|---|---|---|
| **Competitive** | FPS, Battle Royale, MOBA | Enemy detection, health alerts, tactical positioning |
| **Story** | RPG, Adventure, Open World | Quest tracking, dialogue reading, exploration tips |
| **Hybrid** | Souls-like, Action RPG | Combat + Story combined, adapts per scene |
| **Agent** | Automation & Support | Story skipping, autonomous co-pilot, web-enriched advice |

---

## 🎯 NVIDIA Technology Integration

| Technology | GPU Required | What It Does |
|---|---|---|
| **DLSS 2 (Super Resolution)** | RTX 20+ (Turing) | AI upscaling — up to 2x FPS boost |
| **DLSS 3 (Frame Generation)** | RTX 40+ (Ada) | AI-generated frames — up to 4x FPS |
| **DLSS 4 (Multi Frame Gen)** | RTX 50+ (Blackwell) | Up to 8x FPS with multi-frame generation |
| **TensorRT** | All NVIDIA GPUs | **Pure TRT**: 10x faster AI, 0 MB PyTorch VRAM |
| **NVIDIA Reflex** | RTX 20+ (Turing) | Reduces input latency by up to 50% |
| **Path Tracing** | RTX 30+ (Ampere) | Ultra-fidelity light simulation |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **AI Vision** | Pure TensorRT 10.x (YOLOv8 Engine) |
| **Screen Capture** | dxcam (DXGI 120fps+) / d3dshot / MSS fallback |
| **Text Detection** | RapidOCR / Tesseract (GPU/ONNX-accelerated) |
| **Web Search** | Wikipedia + SteamSpy + DuckDuckGo + RAWG.io |
| **Cloud AI** | NVIDIA NIM (Llama 3.1/3.2, Vision Models) |
| **Voice STT** | Google Cloud / Sphinx (offline) |
| **Voice TTS** | ElevenLabs / Google Cloud TTS / SAPI5 |
| **UI / Overlay** | PyQt6 + Native Win32 API |
| **GPU Monitoring** | pynvml (NVML) / PowerShell CIM fallback |
| **Hotkeys** | pynput GlobalHotKeys + Win32 GetAsyncKeyState |
| **Serialization** | orjson (ultra-fast) |
| **Config** | PyYAML (settings.yaml + .env) |
| **Testing** | Vitest + React Testing Library (RTL) + jsdom |
| **Auto-Updater:** `git pull` + `uv sync` via background thread |
| **Version Control:** `version.json` + `publish.ps1` (CI/CD pipeline) |

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- NVIDIA GPU (RTX 20, 30, 40, or 50 series)
- [NVIDIA Drivers](https://www.nvidia.com/download/index.aspx) (R580+ for Blackwell)
- [CUDA Toolkit 12.x+](https://developer.nvidia.com/cuda-downloads)
- [TensorRT 10.x](https://developer.nvidia.com/tensorrt) (optional, for max performance)

### 2. Install Dependencies
```bash
uv python pin 3.12
uv sync
```

### 3. Configure API Keys (`.env`)
```bash
# Required for cloud AI
NVIDIA_API_KEY=nvapi-xxxxx      # https://build.nvidia.com/

# Optional: Enhanced web search
RAWG_API_KEY=your-key           # https://rawg.io/apidocs (free, 20k/month)
TAVILY_API_KEY=tvly-xxxxx       # https://app.tavily.com (free, 1k/month)

# Optional: Premium voice
ELEVENLABS_API_KEY=your-key     # https://elevenlabs.io
```

### 4. Run
```bash
# Standard run
uv run main.py

# Developer mode (Hot Reload enabled)
uv run main.py --dev

# Run as Administrator (required for hardware FPS tracking and full thermal sensors)
# Note: -NoExit keeps the window open so you can clearly see any error logs if it crashes
Start-Process powershell -ArgumentList "-NoExit -Command uv run main.py" -Verb RunAs
```

---

## 🚀 Deployment Stages

There are two main tracks for deploying updates:

### 1. Website Deployment (Vercel)
To deploy the frontend website to Vercel, push your commits directly to the `main` branch:
```bash
git push origin main
```

### 2. Desktop App Deployment (Woodpecker CI / Local Pipeline)
To package, build the NSIS installer, and publish a new desktop app release to GitHub:
1. Make sure you have the Woodpecker CLI installed (or let the local run script fetch it automatically).
2. Run the local build script:
   ```powershell
   .\run_local.ps1
   ```
3. Enter the tag version (e.g., `v2.0.0`) and enter your GitHub Personal Access Token (with **Contents: Read & write** access to `arnab825/Mission-Control`) when prompted.

---

## 📅 Roadmap Progress

- [x] Phase 1–10: Screen capture, YOLO vision, multi-threaded pipeline, story/quest support, memory, input devices, NVIDIA tech, TensorRT, Blackwell
- [x] Phase 11: System & Hardware Dashboard + Full Settings Page
- [x] Phase 12: In-App Auto-Update System
- [x] Phase 13: Agentic AI Assistant (G-Assist interface + Stability Lab)
- [x] Phase 14: NVIDIA NIM full reasoning integration
- [x] Phase 15: Agent mode with autonomous co-pilot
- [x] Phase 16: Multi-model pipeline optimization
- [x] Phase 17: Multi-modal vision (VLM + Deep Scene Analysis)
- [x] Phase 18: Adaptive Agent Personalities
- [x] Phase 19: High-Reliability Voice Engine (ElevenLabs + Google + SAPI5)
- [x] Phase 20: Autonomous Gameplay Validation + Safety Lab
- [x] Phase 21: **Gaming Web Search Intelligence (Wikipedia + RAWG + SteamSpy + DDG)**
- [x] Phase 22: **Hotkey Recorder UI + Auto Model Routing**
- [x] Phase 23: **UX Reusability & Logging Stability (React hooks, formatting, log fix)**
- [x] Phase 24: **Hardware Diagnostics & Testing Integration (Vitest, RTL, HW Telemetry Overhaul)**
- [x] Phase 25: **Electron autoUpdater & Squirrel Windows/Mac Installation Hooks**
- [x] Phase 26: **Electron Forge Multi-Platform Packing Configuration (Squirrel, DEB, RPM)**
- [x] Phase 27: **Dynamic Clerk SSO/OAuth Linked Accounts (Google, Discord, Microsoft)**
- [x] Phase 28: **Motherboard Hardware UUID & Dynamic Cryptographic E2EE Binds**
- [x] Phase 29: **Bytecode-Free Pycache-Bypass Guard & Zombie Process Fail-Fast**
- [x] Phase 30: **2-Column Glassmorphic Privacy & Neural Security Grid Upgrade**
- [x] Phase 31: **Active Backend Security Enforcer & Dynamic Motherboard UUID Lock**
- [x] Phase 32: **Sleek Telemetry UI, Dynamic Library Presets & Substring Genre Matching**
- [x] Phase 33: **DirectX C++ FPS Engine, Precision HUD Telemetry & Python 3.13 Warning Filters**
- [x] Phase 34: **TensorRT Integration & Aggressive Win32 Working Set RAM Flushing**
- [x] Phase 35: **Electron Build & Package Automation and Website Installer Direct Downloads**

**Project Status: Full Agentic AI Gaming Assistant with C++ DirectX FPS hooking, detailed HUD layouts, TensorRT inference optimization, aggressive RAM management, and automated release pipeline.**

---

## 📚 Documentation
- **[Full Patch History](./docs/backend/patches.md)**: Detailed technical notes for every version.
- **[Agentic AI Logic](./docs/AGENTIC_LOGIC.md)**: Detailed flow and instruction logic for autonomous co-pilot features.
- **[Project Summary](./docs/SUMMARY.md)**: Architecture pillars and system overview.
- **[Publishing Process](./docs/process.md)**: Step-by-step release guide.
