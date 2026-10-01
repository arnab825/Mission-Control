# 🏷️ Good First Issues & Starter Guide

Welcome! If you are looking to make your first open-source contribution to **Mission Control**, this guide provides curated beginner-friendly tasks, codebase architectural pointers, and step-by-step instructions.

---

## 🧭 Repository Architecture at a Glance

Mission Control is split into three main modules:

```text
Mission-Control/
├── Gaming/
│   ├── frontend/         # Desktop App (Electron + React 19 + TypeScript + Vite + Tailwind)
│   ├── backend/          # System Daemon (Python 3.12 + FastAPI + PyNVML + WMI)
│   └── website/          # Web Platform (Next.js 16 + TypeScript + Tailwind + MongoDB)
├── docs/                 # Architectural specifications and hardware tuning guides
├── CONTRIBUTING.md        # Pull request guidelines and code style rules
└── ROADMAP.md             # High-level product milestones and upcoming features
```

---

## 🎯 Curated Starter Tasks (Pick One!)

### 1. Web Platform (`Gaming/website`) — Next.js & TypeScript
- [ ] **Add a New Verified Game Benchmark**:
  - **File**: [`Gaming/website/src/data/benchmarks.ts`](file:///e:/AiAssistant/Gaming/website/src/data/benchmarks.ts)
  - **Task**: Add a new title to `BENCHMARK_PROFILES` with tested specs (`avgFps`, `vramUsed`, `latency`, `gpuLoad`), graphics presets, and `detailedOverview` (`story`, `gameplayLoop`, `keyMechanics`).
  - **Skill required**: Basic TypeScript / JSON data structuring.
- [ ] **Filter Controls on Benchmarks Page**:
  - **File**: `Gaming/website/src/app/games-tested/page.tsx`
  - **Task**: Add a quick filter button for games running on DirectX 11 vs DirectX 12.
- [ ] **Search Highlighting on Blog Page**:
  - **File**: `Gaming/website/src/app/blog/page.tsx`
  - **Task**: Highlight matched keywords in blog titles or excerpts when searching via query params.

### 2. Desktop Frontend (`Gaming/frontend`) — React & Electron
- [ ] **Keyboard Shortcut Quick-Reference**:
  - **Task**: Add a modal or tooltip displaying HUD hotkeys (`Ctrl + Shift + O` to toggle overlay, `Ctrl + Shift + M` to mute telemetry).
  - **Files**: `Gaming/frontend/src/components/overlay/`
- [ ] **Color Accent Theme Toggle**:
  - **Task**: Allow users to select HUD accent colors (Neon Green, Cyber Cyan, Amber Orange, or Neon Purple).
  - **Files**: `Gaming/frontend/src/store/themeStore.ts`

### 3. Backend Daemon (`Gaming/backend`) — Python & FastAPI
- [ ] **Sensor Safety Boundary Checks**:
  - **File**: `Gaming/backend/telemetry/gpu.py`
  - **Task**: Add boundary clamp checks ensuring GPU percentage metrics stay safely within `[0.0, 100.0]` even when driver reporting drops a frame.
- [ ] **Custom Log Rotation**:
  - **File**: `Gaming/backend/utils/logger.py`
  - **Task**: Configure size-based file rotation for `telemetry.log` (cap at 10MB to conserve disk space).

---

## 🚀 5-Minute Quick Setup

1. **Fork and clone** the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Mission-Control.git
   cd Mission-Control
   ```
2. **Initialize environments**:
   ```bash
   cd Gaming/website && npm run setup
   ```
3. **Run your module**:
   - Web Platform: `cd Gaming/website && npm run dev`
   - Frontend: `cd Gaming/frontend && npm run dev`
   - Backend: `cd Gaming/backend && uv sync && uv run main.py --dev`

---

## 🏷️ GitHub Issues Link

Find live community-tagged issues on GitHub:
👉 **[View Open "Good First Issues" on GitHub](https://github.com/arnab825/Mission-Control/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**

---

## 📤 Need Help?
- Read the full [Contributing Guide](CONTRIBUTING.md) for branch naming conventions and PR checklists.
- Chat with maintainers and community members in our [GitHub Discussions](https://github.com/arnab825/Mission-Control/discussions) or on the website support portal.
