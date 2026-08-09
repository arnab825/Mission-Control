# 🖥️ Mission Control — Desktop Frontend (`Gaming/frontend`)

<p align="center">
  <img src="public/logo.ico" width="80" alt="Mission Control Desktop Logo" />
</p>

The primary desktop client interface for **Mission Control**, built using Electron, React, Vite, TypeScript, and Tailwind CSS. It provides a real-time HUD (Heads-Up Display) overlay, system hardware telemetry panel, AI agent chat interface, global hotkeys recorder, and hardware settings control.

---

## 📸 Interface Screenshots

<table align="center">
  <tr>
    <td width="50%" align="center">
      <b>🖥️ Main Console Dashboard</b><br/><br/>
      <img src="../website/public/screenshots/dashboard.webp" alt="Main Console Dashboard" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>📟 Glassmorphic HUD Overlay</b><br/><br/>
      <img src="../website/public/screenshots/hud.webp" alt="Glassmorphic HUD Overlay" width="100%"/>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>📊 Real-Time Hardware Telemetry</b><br/><br/>
      <img src="../website/public/screenshots/system.webp" alt="Real-Time Hardware Telemetry" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>🎮 Game Library & Auto-Sense Target Routing</b><br/><br/>
      <img src="../website/public/screenshots/library.webp" alt="Game Library" width="100%"/>
    </td>
  </tr>
</table>

---

## ⚡ Key Features

- **📟 Glassmorphic HUD Overlay**: Low-overhead overlay strip rendering real-time FPS counter, CPU/GPU temperatures, wattage, and dynamic voice/AI co-pilot subtitles.
- **📊 Real-Time Hardware Telemetry**: Live CPU, GPU, VRAM, RAM, Network, and Disk telemetry visualization backed by high-frequency Python backend WebSockets.
- **⌨️ Global Hotkeys Engine**: Fully customizable hotkey recorder (`Ctrl+W` HUD toggle, `Ctrl+Alt+M` mic toggle, `Ctrl+Alt+A` Agentic mode).
- **🎙️ Voice Subtitles & Audio Engine**: Glassmorphic voice prompt indicator with real-time listening state pulsating animation and speech-to-text response cards.
- **📦 Multi-Platform Packaging (Electron Forge)**: Native installer support for Windows (`Squirrel.Windows` / NSIS) and Linux (`DEB` / `RPM` / `AppImage`).

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron
- **UI Library**: React + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **IPC & Telemetry**: WebSockets & Electron IPC Main/Renderer
- **Packaging**: Electron Forge (`@electron-forge/maker-squirrel`, `@electron-forge/maker-zip`)

---

## 🚀 Getting Started

### 1. Installation

```bash
# Navigate to frontend directory
cd Gaming/frontend

# Install dependencies
npm install
```

### 2. Running in Development Mode

```bash
# Ensure Python backend is running on port 8000 first
npm run dev
```

### 3. Packaging & Building Production Executable

```bash
# Compile Vite assets & launch Electron Forge packager
npm run make
```

---

## 📂 Project Structure

```
Gaming/frontend/
├── electron/
│   ├── main.ts                # Main Electron process, window management, & HUD bounds
│   └── preload.ts             # Context bridge IPC expose
├── src/
│   ├── components/
│   │   ├── HUD.tsx            # Glassmorphic overlay component
│   │   ├── Dashboard.tsx      # System hardware & telemetry view
│   │   ├── AgentChat.tsx      # AI agent conversation card
│   │   └── Settings.tsx       # Profile, hotkey & HW settings
│   ├── hooks/                 # Custom React hooks (useHotkey, useDebounce)
│   ├── App.tsx                # Main layout router
│   └── index.css              # Glassmorphic styles & design system
├── forge.config.ts            # Electron Forge build & packaging configuration
└── vite.config.ts             # Vite build options & plugin setup
```
