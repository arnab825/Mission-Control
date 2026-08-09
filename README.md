# 🧠 🎮 Mission Control — NVIDIA-Powered AI Gaming Platform

<p align="center">
  <img src="Gaming/frontend/public/logo.png" width="100" alt="Mission Control Logo" />
</p>

<p align="center">
  <b>An advanced, real-time AI gaming assistant & intelligence ecosystem powering desktop performance, live tactical coaching, dynamic HUD overlays, hardware telemetry, and automated gaming news.</b>
</p>

<p align="center">
  <a href="#-repository-structure"><img src="https://img.shields.io/badge/Architecture-Monorepo-blue.svg" alt="Monorepo" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Website-Next.js%2015-black.svg" alt="Next.js" /></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Desktop-Electron%20%2B%20React-47848F.svg" alt="Electron" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/Backend-Python%20%2B%20FastAPI-009688.svg" alt="Python" /></a>
  <a href="https://developer.nvidia.com/cuda-toolkit"><img src="https://img.shields.io/badge/GPU-NVIDIA%20TensorRT%20%2B%20NIM-76B900.svg" alt="NVIDIA" /></a>
  <a href="https://github.com/arnab825/Mission-Control/releases"><img src="https://img.shields.io/badge/GitHub-Releases-brightgreen.svg" alt="Releases" /></a>
</p>

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
├── 🐍 Gaming/backend/        # Python 3.12 + FastAPI + PyNVML + TensorRT + C++ DirectX DLL
│                             # Local AI brain, C++ FPS engine, TensorRT YOLO vision, hardware monitoring, & voice TTS/STT.
│
├── 📜 run_local.ps1          # Automated local build, package & release runner script.
└── ⚙️ .woodpecker/           # CI/CD pipelines for automated multi-platform desktop releases.
```

---

## 🚀 Sub-Project Quick Links

| Component | Stack | Description | Documentation |
|---|---|---|---|
| **Web Platform** | Next.js 15, TypeScript, Tailwind CSS, MongoDB | Live gaming intelligence web app, benchmark profiles, documentation, and RSS AI blog generator. | [Website README](Gaming/website/README.md) |
| **Desktop App** | Electron, React, Vite, Tailwind CSS | Real-time desktop application with glassmorphic HUD overlay, hardware telemetry, & keybindings. | [Frontend README](Gaming/frontend/README.md) |
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

- **Operating System**: Windows 10 / 11 (64-bit strictly required for native C++ DirectX hooks & NVML driver APIs).
- **GPU**: NVIDIA GeForce GTX / RTX series card (RTX 20, 30, 40, or 50 series recommended for TensorRT & DLSS telemetry).
- **Node.js**: v18.x or v20.x+
- **Python**: v3.12 (managed via [`uv`](https://github.com/astral-sh/uv))
- **Drivers**: NVIDIA Display Drivers R580+ & CUDA Toolkit 12.x+

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

## 🌐 Live Web App & Deployments

- **Live Web Application**: [mission-control-roan-seven.vercel.app](https://mission-control-roan-seven.vercel.app)
- **Automated Blog Generation Endpoint**: Protected via `CRON_SECRET` at `/api/blogs/generate`
- **CI/CD Pipeline**: Woodpecker CI/CD configuration at `.woodpecker/release.yml`

---

## 📄 License

This repository is maintained under the project's custom license. See individual sub-directory licenses and documentation files for third-party component specifics.
