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

<table align="center" width="100%">
  <tr>
    <th colspan="3" style="text-align:center; background:#0f172a; color:#38bdf8; font-size:16px;">
      👤 USER / GAMER INTERACTION LAYER
    </th>
  </tr>
  <tr>
    <td width="33%" align="center"><b>🖥️ Electron Desktop Dashboard</b><br/>React + Vite HUD & Telemetry</td>
    <td width="33%" align="center"><b>📦 Publisher GUI Client</b><br/>Builds, Packaging & Releases</td>
    <td width="33%" align="center"><b>🎙️ Voice & Hotkey Controls</b><br/>Mic Toggle & Global Shortcuts</td>
  </tr>
  <tr>
    <th colspan="3" style="text-align:center; background:#111827; color:#a855f7; font-size:16px;">
      🧠 AI DECISION ENGINE & TASK AUTO-ROUTER
    </th>
  </tr>
  <tr>
    <td colspan="3" align="center">
      <b>Task Classifier ➔ Dynamic Web Search Engine</b> (Wikipedia | RAWG.io | SteamSpy | DuckDuckGo)<br/>
      <b>Model Router ➔ NVIDIA NIM Cloud AI</b> (Llama 3.1 8B/70B Strategic + Llama 3.2 11B Vision VLM)
    </td>
  </tr>
  <tr>
    <th colspan="3" style="text-align:center; background:#064e3b; color:#10b981; font-size:16px;">
      ⚡ REAL-TIME EXECUTION & TELEMETRY PIPELINES
    </th>
  </tr>
  <tr>
    <td width="33%" align="center"><b>🎮 Game Vision Pipeline</b><br/>dxcam 60fps ➔ TensorRT YOLOv8 ➔ OCR</td>
    <td width="33%" align="center"><b>🎙️ Voice Engine</b><br/>Google / Sphinx STT ➔ ElevenLabs / SAPI5 TTS</td>
    <td width="33%" align="center"><b>🔧 Hardware Telemetry</b><br/>C++ DirectX FPS DLL + PyNVML + WMI/PDH</td>
  </tr>
  <tr>
    <th colspan="3" style="text-align:center; background:#312e81; color:#818cf8; font-size:16px;">
      📟 GLASSMORPHIC HUD OVERLAY STREAM
    </th>
  </tr>
  <tr>
    <td colspan="3" align="center">
      <b>Tactical Alerts Cards • Real-time Min/Max FPS & Thermal Bar • Live Subtitles Strip</b>
    </td>
  </tr>
</table>

```mermaid
graph TD
    classDef client fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef ai fill:#0f172a,stroke:#a855f7,stroke-width:2px,color:#f8fafc;
    classDef cloud fill:#022c22,stroke:#10b981,stroke-width:2px,color:#f8fafc;
    classDef output fill:#1c1917,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;

    User["👤 USER / GAMER"] --> UI["🖥️ ELECTRON CLIENT & INTERFACES<br/><i>Dashboard • Library • Agent Chat • HUD • Settings</i>"]:::client

    subgraph ENGINE ["🧠 MISSION CONTROL ENGINE ARCHITECTURE"]
        direction TB

        UI --> Router["🔍 Task Classifier & Web Search Engine<br/><i>RAG Router • DuckDuckGo • RAWG.io • SteamSpy</i>"]:::ai
        Router --> NIM["⚡ NVIDIA NIM CLOUD AI<br/><i>Llama 3.1 8B/70B Strategic + Llama 3.2 11B Vision VLM</i>"]:::cloud

        NIM --> Voice["🎙️ Voice & Subtitle Engine<br/><i>Google STT • ElevenLabs / SAPI5 TTS</i>"]:::output
        NIM --> Advice["💬 Agent Co-Pilot Advice & Tactical Cards"]:::output

        FrameCap["📸 dxcam 60 FPS Capture"] --> YOLO["🎯 TensorRT YOLOv8 + OCR Vision Engine"]:::ai
        YOLO --> HUD["📟 Glassmorphic HUD Overlay<br/><i>Live Telemetry • Tactical Hints • Min/Max FPS</i>"]:::output
        
        HW["🔧 Native Hardware Telemetry<br/><i>LibreHardwareMonitor • PyNVML • C++ ETW DLL</i>"]:::ai --> HUD
        Voice --> HUD
        Advice --> HUD
    end

    class UI client;
    class Router,YOLO,HW ai;
    class NIM cloud;
    class Voice,Advice,HUD output;
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

