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

<div align="center">

| Layer | Subsystem & Technologies | Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **👤 Client UI** | <img src="https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white" /> <img src="https://img.shields.io/badge/React-18-20232A?style=flat-square&logo=react&logoColor=61DAFB" /> <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" /> <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" /><br/>**Desktop Client & Glassmorphic HUD** | • Frameless titlebar IPC & `--is-auth-popup` lifecycle<br/>• Performance Lab, System Telemetry & Game Library<br/>• Adaptive `useBridge` hook with 100ms/150ms state batching |
| **🔒 Identity** | <img src="https://img.shields.io/badge/Clerk-Authentication-6C47FF?style=flat-square&logo=clerk&logoColor=white" /> <img src="https://img.shields.io/badge/OAuth-Google%20%7C%20Discord-4285F4?style=flat-square&logo=google&logoColor=white" /><br/>**Cyberpunk Security Portal** | • Signature `#0b0d13` tactical canvas & `#76b900` neon green HUD theme<br/>• Watermarks, striped dev badges & footers suppressed<br/>• Seamless multi-account switching & secondary identity linking |
| **⚡ Protocol** | <img src="https://img.shields.io/badge/WebSocket-RFC_6455-010101?style=flat-square&logo=socketdotio&logoColor=white" /> <img src="https://img.shields.io/badge/Port-8765-76B900?style=flat-square" /><br/>**Aero Real-Time WebSocket Bridge** | • Origin validation (`localhost`, `127.0.0.1`, `file`, `vscode-webview`)<br/>• Clean RFC 6455 1000/1001 ("going away") graceful disconnects<br/>• Critical bypass filter for voice prompts, alerts & vision frames |
| **🔧 Telemetry** | <img src="https://img.shields.io/badge/DirectX-C%2B%2B_ETW-0078D6?style=flat-square&logo=windows&logoColor=white" /> <img src="https://img.shields.io/badge/NVIDIA-NVML-76B900?style=flat-square&logo=nvidia&logoColor=white" /><br/>**Hardware Engine & Present Hook** | • C++ DirectX presentation hook for instant FPS & 1% low metrics<br/>• PyNVML monitor for GPU clocks, VRAM MB, thermals & power Watts<br/>• WMI / CIM / PDH CPU query chain & Win32 working set RAM compaction |
| **🎯 Vision AI** | <img src="https://img.shields.io/badge/TensorRT-10.x-76B900?style=flat-square&logo=nvidia&logoColor=white" /> <img src="https://img.shields.io/badge/YOLO-v8_Engine-00FFFF?style=flat-square" /> <img src="https://img.shields.io/badge/Capture-DXGI_120FPS-FF6F00?style=flat-square" /><br/>**On-Demand Vision Pipeline** | • `dxcam` zero-copy DirectX Desktop Duplication capture at 120 FPS<br/>• Pure TensorRT YOLOv8 inference saving ~1 GB PyTorch VRAM<br/>• RapidOCR / Tesseract dynamic dialogue and quest ROI extraction |
| **🧠 Agent Brain** | <img src="https://img.shields.io/badge/NVIDIA-NIM_Cloud-76B900?style=flat-square&logo=nvidia&logoColor=white" /> <img src="https://img.shields.io/badge/LLM-Llama_3.1-4285F4?style=flat-square&logo=meta&logoColor=white" /> <img src="https://img.shields.io/badge/Voice-ElevenLabs%20%7C%20SAPI5-FF8000?style=flat-square" /><br/>**Autonomous Copilot & Web RAG** | • Multi-source RAG search across Wikipedia, SteamSpy, DuckDuckGo & RAWG<br/>• Strategic NIM reasoning (`Llama 3.1 8B/70B` + `Llama 3.2 11B Vision VLM`)<br/>• Dual voice engine with Google STT and ElevenLabs / SAPI5 TTS |
| **🌐 Node Cluster** | <img src="https://img.shields.io/badge/Daemon-Node_Service-3776AB?style=flat-square&logo=python&logoColor=white" /> <img src="https://img.shields.io/badge/Cloud-Azure%20%7C%20Render-0089D6?style=flat-square&logo=microsoftazure&logoColor=white" /><br/>**Distributed Library Network** | • Local `node_service.py` daemon with deterministic MAC-derived IDs<br/>• Multi-launcher game detection across Steam, Epic, GOG, Xbox & Riot<br/>• Byte-exact disk sizing and multi-tier cloud failover (30s/35s timeout) |
| **📦 Packaging** | <img src="https://img.shields.io/badge/PyInstaller-Backend-FFD43B?style=flat-square&logo=python&logoColor=3776AB" /> <img src="https://img.shields.io/badge/electron--builder-Packager-2F3241?style=flat-square&logo=electron&logoColor=white" /><br/>**Multi-Platform Release Pipeline** | • Single-command `publish.ps1` with semver bumping & `uv lock` alignment<br/>• Windows NSIS (`.exe`), MSI (`.msi`), ZIP (`.zip`) & Linux archives (`.tar.gz`)<br/>• Native Debian (`.deb`) and Universal Linux (`.AppImage`) packaging |

</div>

<br/>

```mermaid
flowchart TD
    classDef client fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef bridge fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef telemetry fill:#022c22,stroke:#10b981,stroke-width:2px,color:#f8fafc;
    classDef vision fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#f8fafc;
    classDef ai fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#f8fafc;
    classDef cluster fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;
    classDef release fill:#312e81,stroke:#ec4899,stroke-width:2px,color:#f8fafc;

    User(["👤 GAMER / USER"]) --> Desktop["🖥️ DESKTOP CLIENT (Electron + React 18 + Vite)<br/>HUD Overlay • Telemetry Bento • Clerk Cyberpunk Auth"]:::client
    
    Desktop <-->|"ws://127.0.0.1:8765<br/>Adaptive Throttling: 100ms idle / 150ms game"| Bridge["⚡ AERO WEBSOCKET BRIDGE (bridge_server.py)<br/>Origin Guard • Priority Bypass • Graceful 1000/1001 Close"]:::bridge

    Bridge <-->|"FPS, Temps & Power Draw"| Telemetry["🔧 HARDWARE TELEMETRY ENGINE<br/>DirectX C++ Present Hook • PyNVML • WMI/PDH Chain • RAM Compaction"]:::telemetry
    Bridge <-->|"120 FPS Frame Stream"| Vision["🎯 REAL-TIME VISION STACK<br/>dxcam Capture • Pure TensorRT 10.x YOLOv8 • RapidOCR"]:::vision
    Bridge <-->|"Tactical Voice & Chat"| Agent["🧠 AUTONOMOUS AGENT & AI BRAIN<br/>Intent Router • Gaming RAG Web Search • NVIDIA NIM Cloud VLM"]:::ai

    Desktop -.->|"Local Node Sync"| NodeDaemon["🌐 DISTRIBUTED LIBRARY NODE<br/>MAC Hardware ID • Multi-Launcher Game Scanner • Cloud Gateway"]:::cluster
    NodeDaemon <-->|"Sync Manifests"| WebPortal["🌐 WEB PLATFORM (Next.js 15 + MongoDB)<br/>Node Clustering • AI Gaming Intel RSS Pipeline"]:::cluster

    Desktop -.->|"publish.ps1"| Packaging["📦 PACKAGING & MULTI-PLATFORM DISTRIBUTION<br/>PyInstaller .exe • electron-builder NSIS/MSI • deb & AppImage"]:::release
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

