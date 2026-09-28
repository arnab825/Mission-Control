# 🧠 🎮 Mission Control — NVIDIA-Powered AI Gaming Platform

<p align="center">
  <img src="Gaming/frontend/public/logo.png" width="100" alt="Mission Control Logo" />
</p>

<p align="center">
  <b>An advanced, real-time AI gaming assistant & intelligence ecosystem powering desktop performance, live tactical coaching, dynamic HUD overlays, hardware telemetry, and automated gaming news.</b>
</p>

<p align="center">
  <a href="https://github.com/arnab825/Mission-Control/stargazers"><img src="https://img.shields.io/github/stars/arnab825/Mission-Control?style=for-the-badge&color=76B900&logo=github" alt="GitHub Stars" /></a>
  <a href="https://github.com/arnab825/Mission-Control/network/members"><img src="https://img.shields.io/github/forks/arnab825/Mission-Control?style=for-the-badge&color=blue&logo=github" alt="GitHub Forks" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome" /></a>
  <a href="https://developer.nvidia.com/cuda-toolkit"><img src="https://img.shields.io/badge/GPU-NVIDIA%20TensorRT%20%2B%20NIM-76B900.svg?style=for-the-badge&logo=nvidia" alt="NVIDIA" /></a>
  <a href="https://github.com/arnab825/Mission-Control/releases"><img src="https://img.shields.io/badge/GitHub-Releases-brightgreen.svg?style=for-the-badge" alt="Releases" /></a>
</p>

---

## 📸 Interface & Capabilities Showcase

<table align="center">
  <tr>
    <td width="50%" align="center">
      <b>🖥️ Main Console & Dashboard</b><br/><br/>
      <img src="Gaming/website/public/screenshots/dashboard.webp" alt="Main Console & Dashboard" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>🤖 Autonomous AI Co-Pilot & Tactical Agent</b><br/><br/>
      <img src="Gaming/website/public/screenshots/agent.webp" alt="Autonomous AI Co-Pilot & Tactical Agent" width="100%"/>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>📟 Glassmorphic HUD Overlay</b><br/><br/>
      <img src="Gaming/website/public/screenshots/hud.webp" alt="Glassmorphic HUD Overlay" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>🎯 TensorRT AI Vision & YOLO Detection</b><br/><br/>
      <img src="Gaming/website/public/screenshots/vision.webp" alt="TensorRT AI Vision" width="100%"/>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>📊 Real-Time Hardware Telemetry</b><br/><br/>
      <img src="Gaming/website/public/screenshots/system.webp" alt="Real-Time Hardware Telemetry" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>🔬 Performance Tuning Lab & Power Controls</b><br/><br/>
      <img src="Gaming/website/public/screenshots/lab.webp" alt="Performance Tuning Lab" width="100%"/>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>🎮 Game Library & Auto-Sense Target Routing</b><br/><br/>
      <img src="Gaming/website/public/screenshots/library.webp" alt="Game Library" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>⚡ AI Hardware Readiness Matrix</b><br/><br/>
      <img src="Gaming/website/public/screenshots/readiness.webp" alt="AI Hardware Readiness" width="100%"/>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>⚙️ System Settings & AI Neural Configuration</b><br/><br/>
      <img src="Gaming/website/public/screenshots/setting.webp" alt="System Settings & AI Configuration" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>🔍 Deep Scanner & Library Auto-Discovery</b><br/><br/>
      <img src="Gaming/website/public/screenshots/deepscanner.png" alt="Deep Scanner & Auto-Discovery" width="100%"/>
    </td>
  </tr>
</table>

---

## 📌 Monorepo Architecture Overview

**Mission Control** is an integrated platform split into three primary sub-projects designed to deliver ultra-low latency hardware monitoring, local AI vision, and high-performance gaming intelligence:

```
Mission-Control /
├── 🌐 Gaming/website/        # Next.js 15 (App Router) + Tailwind CSS + MongoDB
│                             # Web platform, documentation hub, and automated AI Gaming Intel blog pipeline.
│
├── 🖥️ Gaming/frontend/       # Electron + React + Vite + TypeScript
│                             # Desktop dashboard, glassmorphic HUD overlay, hotkeys engine, and telemetry UI.
│
├── 📦 Gaming/publisher-gui/  # Electron + Vite + Tailwind CSS
│                             # Build manager, installer generator, & release publishing client GUI.
│
├── 🐍 Gaming/backend/        # Python 3.12 + FastAPI + PyNVML + TensorRT + C++ DirectX DLL
│                             # Local AI brain, C++ FPS engine, TensorRT YOLO vision, hardware monitoring, & voice TTS/STT.
│
├── 📜 run_local.ps1          # Automated local build, package & release runner script.
└── ⚙️ .woodpecker/           # CI/CD pipelines for automated multi-platform desktop releases.
```

### 🧱 System Workflow Architecture

```mermaid
graph TB
    subgraph CLIENT ["🖥️ DESKTOP CLIENT LAYER (Electron + React 18 + Vite)"]
        direction TB
        UI["React 18 Single-Page Application<br/><i>Dashboard • HUD • Lab • Vision • Readiness • Settings</i>"]
        Hook["useBridge Hook<br/><i>Adaptive Throttle (100ms idle / 150ms game)<br/>Outbound Queue • Heartbeat Ping</i>"]
        Clerk["Clerk Security Portal<br/><i>Custom Cyberpunk Theme (#0b0d13 / #76b900)<br/>Multi-Account Switching & OAuth Links</i>"]
        IPC["Electron Main Process<br/><i>Frameless Titlebar IPC • --is-auth-popup Lifecycle<br/>Child Process Supervisor</i>"]
        
        UI <--> Hook
        UI <--> Clerk
        UI <--> IPC
    end

    subgraph BRIDGE ["⚡ AERO WEBSOCKET BRIDGE PROTOCOL (Port 8765)"]
        direction TB
        WS["WebSocket Server (core/bridge_server.py)<br/><i>Origin Validation • Command Debouncing<br/>Graceful 1000/1001 Close Detection</i>"]
        Bypass["Bypass Filter<br/><i>Voice • Agent Advice • Crashes • Vision FPS</i>"]
        Router["Command Dispatcher (handlers/command_router.py)<br/><i>Validated Command Schemas & Async ThreadPool</i>"]
        
        WS --> Bypass
        WS <--> Router
    end

    subgraph ENGINE ["🐍 LOCAL PYTHON BACKEND RUNTIME (Python 3.12)"]
        direction TB
        subgraph TELEMETRY ["Hardware & Game Monitoring"]
            ETW["C++ DirectX Present Hook<br/><i>Instant FPS • 1% Lows • Frame Times</i>"]
            NVML["PyNVML Monitor<br/><i>Clocks • Temp • Fan • VRAM MB • Watts</i>"]
            CPU["WMI / CIM / PDH Chain<br/><i>CPU Temp • Clock Freq • Core Util</i>"]
            RAM["Win32 Memory Manager<br/><i>Aggressive Working Set Trimming</i>"]
        end

        subgraph VISION ["Real-Time Vision Stack"]
            Cap["dxcam Screen Capture<br/><i>120 FPS Zero-Copy DXGI Buffers</i>"]
            TRT["TensorRT 10.x YOLOv8 Engine<br/><i>Zero-VRAM PyTorch Bypass (~1GB Saved)</i>"]
            OCR["RapidOCR / Tesseract<br/><i>Dynamic Quest & Dialogue ROI Extraction</i>"]
            Scene["Scene Classifier<br/><i>Combat • Cutscene • Menu • Loading</i>"]
            
            Cap --> TRT
            Cap --> OCR
            Cap --> Scene
        end

        subgraph AGENTIC ["Autonomous AI & Voice Engine"]
            Intent["Intent & Task Classifier<br/><i>Wiki • Patch • Strategy • Real-time</i>"]
            RAG["Gaming RAG Web Search<br/><i>Wikipedia • SteamSpy • DuckDuckGo • RAWG</i>"]
            NIM["NVIDIA NIM Cloud AI<br/><i>Llama 3.1 8B/70B + Llama 3.2 11B Vision VLM</i>"]
            Voice["Dual-Engine Voice Suite<br/><i>Google/Sphinx STT • ElevenLabs/SAPI5 TTS</i>"]
            Exec["Autonomous Control Engine<br/><i>Game Launching • Hardware Tuning • Input Simulation</i>"]
            
            Intent --> RAG --> NIM --> Voice
            NIM --> Exec
        end
    end

    subgraph CLUSTER ["🌐 DISTRIBUTED NODE NETWORK & CLOUD WEB PLATFORM"]
        direction TB
        Node["Autonomous Library Node Daemon (distributed_node)<br/><i>Hardware UUID Identity • Multi-Launcher Game Scanner<br/>Exact Disk Byte Sizing • Azure/Render Failover</i>"]
        Web["Mission Control Web Portal (Next.js 15 App Router)<br/><i>MongoDB Atlas • Centralized Node Clustering<br/>Automated AI Gaming Intel RSS Pipeline (5:30 AM IST)</i>"]
        
        Node <-->|Heartbeat & Game Sync| Web
    end

    subgraph RELEASE ["📦 PACKAGING & MULTI-PLATFORM DISTRIBUTION"]
        direction TB
        Pub["scripts/publish.ps1 Pipeline<br/><i>bump_version.py • sync_version.py • uv lock</i>"]
        PyInst["PyInstaller Backend Build (build_app.ps1)<br/><i>Standalone MissionControl.exe + logo.ico</i>"]
        ElPack["electron-builder Packaging<br/><i>Windows NSIS (.exe) • MSI (.msi) • ZIP (.zip) • Linux (.tar.gz)</i>"]
        LinPack["Linux Native Packagers<br/><i>pack_deb.py (.deb) • pack_appimage.py (.AppImage)</i>"]
        GH["GitHub Releases API<br/><i>Automated Release Notes & Multi-Asset Upload</i>"]

        Pub --> PyInst --> ElPack --> LinPack --> GH
    end

    Hook <-->|ws://127.0.0.1:8765| WS
    Router <--> TELEMETRY
    Router <--> VISION
    Router <--> AGENTIC
    UI -.->|Direct Node Sync| Node
```

---

## 🚀 Sub-Project Quick Links

| Component | Stack | Description | Documentation |
|---|---|---|---|
| **Web Platform** | Next.js 15, TypeScript, Tailwind CSS, MongoDB | Live gaming intelligence web app, benchmark profiles, documentation, and RSS AI blog generator. | [Website README](Gaming/website/README.md) |
| **Desktop App** | Electron, React, Vite, Tailwind CSS | Real-time desktop application with glassmorphic HUD overlay, hardware telemetry, & keybindings. | [Frontend README](Gaming/frontend/README.md) |
| **Publisher GUI** | Electron, Vite, Tailwind CSS | Release packaging, installer generation, release manifest sync & asset publisher client. | [Publisher GUI README](Gaming/publisher-gui/README.md) |
| **Python Backend** | Python 3.12, FastAPI, C++, PyNVML, TensorRT | High-frequency telemetry service, native DirectX frame queue monitoring, and NVIDIA AI models. | [Backend README](Gaming/backend/README.md) |
| **Complete System** | Architecture & Versioning | Detailed technical patch notes, agentic logic, and system overview. | [System Manual](Gaming/readme.md) |

---

## 🎯 Key Features

- **⚡ Zero-Latency C++ DirectX FPS Tracking**: Native C++ DLL (`fps_counter.dll`) hooking into low-level presentation queues for 1% lows and instantaneous FPS telemetry without Python overhead.
- **🟢 NVIDIA TensorRT & NIM Acceleration**: Pure TensorRT inference for YOLOv8 vision detection with **0 MB PyTorch VRAM waste**, paired with NVIDIA NIM (Llama 3.1 & 3.2 Vision) cloud reasoning.
- **🖥️ Glassmorphic HUD Overlay**: Dynamic desktop overlay displaying real-time FPS, CPU/GPU temperatures, wattage, and active AI co-pilot tactical suggestions.
- **📰 Automated AI Gaming Intel Blog**: Vercel cron-scheduled RSS aggregator (IGN, Kotaku, Eurogamer, AnandTech, Tom's Hardware) running a 3-tier failover LLM pipeline to generate daily technical news saved directly to MongoDB Atlas.
- **🔒 Motherboard UUID Security & HW Telemetry**: Cryptographic Motherboard UUID locking, Win32 working set RAM flushing, and hardware telemetry via PyNVML, WMI, and PDH.

---

## 🛠️ Prerequisites & Requirements

- **Operating System**: Windows 10 / 11 (64-bit) or Linux (Ubuntu 22.04+, Arch, Fedora x86_64).
- **GPU**: NVIDIA GeForce GTX / RTX series card (RTX 20, 30, 40, or 50 series recommended for TensorRT & DLSS telemetry).
- **Node.js**: v18.x or v20.x+
- **Python**: v3.12 (managed via [`uv`](https://github.com/astral-sh/uv))
- **Drivers**: NVIDIA Display Drivers R580+ & CUDA Toolkit 12.x+
- **Download Packages**: Windows (`.exe`, `.msi`, `.zip`) & Linux (`.AppImage`, `.deb`, `.rpm`, `.tar.gz`) available via GitHub Releases and the web platform.

---

## ⚡ Quick Start / Local Development

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/arnab825/Mission-Control.git
cd Mission-Control
```

### 2. Running the Next.js Web Platform

```bash
cd Gaming/website
npm install
npm run dev
# Web app runs at http://localhost:3000
```

### 3. Running the Electron Desktop App & Backend

```bash
# Terminal 1: Run Python Backend
cd Gaming/backend
uv sync
uv run main.py --dev

# Terminal 2: Run Electron Desktop App
cd Gaming/frontend
npm install
npm run dev
```

### 4. Running Automated Local Build Script

```powershell
# Run the local packaging & release pipeline
.\run_local.ps1
```

---

## 🤝 Community & Contributing

We welcome contributions from developers, gamers, and open-source enthusiasts!

* **[Contributing Guide](CONTRIBUTING.md)**: Detailed steps on setting up local dev environments, submitting PRs, and testing telemetry modules.
* **[Good First Issues](https://github.com/arnab825/Mission-Control/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**: Tagged tasks perfect for getting started with the repository.
* **[System Roadmap](Gaming/docs/ProductRoadmap.md)**: Check upcoming features including multi-vendor AMD RX & Intel Arc telemetry support.

---

## 📄 License

This repository and open-source codebase are licensed under the **[Apache License 2.0](LICENSE)**. See the root [LICENSE](LICENSE) file and [Desktop App EULA](Gaming/frontend/electron/license.txt) for details.

