export interface FallbackDoc {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  badge?: string;
  badgeColor?: string;
  content: string;
}

export const FALLBACK_DOCS: FallbackDoc[] = [
  {
    slug: "summary",
    title: "Project Summary: Mission Control Gaming AI",
    category: "Overview",
    excerpt:
      "Comprehensive architectural summary of Mission Control, an autonomous DirectX 12 telemetry overlay and AI co-pilot.",
    badge: "Core",
    badgeColor: "text-neon-green",
    content: `# 📊 Project Summary: Mission Control Gaming Assistant

## 🎯 Core Objective

The **Mission Control Gaming Assistant** is a high-performance, real-time agentic system that enhances gaming through advanced computer vision, NVIDIA-accelerated reasoning, live web-powered game intelligence, and autonomous co-pilot capabilities — with zero VRAM impact on gaming performance.

---

## 🛠️ Architectural Pillars

### 1. 👁️ Vision Pipeline (The Eyes)
- **Engine:** Pure TensorRT 10.x (YOLOv8). Sub-5ms inference, 0 MB PyTorch VRAM overhead.
- **Capture:** dxcam (DXGI), D3DShot, or MSS fallback at 60–120fps.
- **Capabilities:** Real-time object detection (enemies, items), RapidOCR (dialogue, quests), heuristic + ML scene classification.

### 2. 🧠 Decision Engine (The Brain)
- **Modes:** Competitive, Story, Hybrid, Agent — each with scene-aware routing logic.
- **NVIDIA NIM:** Cloud reasoning via Llama 3.1 8B (strategic/tactical) and Llama 3.2 11B Vision (multi-modal).
- **Auto Model Routing:** Task type (wiki / patch / strategy / real_time) auto-selects the fastest and most appropriate NIM model.
- **Context Awareness:** Tracks game state, process health, and window focus to manage resources adaptively.

### 3. 🌐 Web Search Intelligence
A gaming-optimized, multi-source search engine that enriches AI responses with live web data. Completely free in both development and production.

---

## ⚡ Key Highlights
- **DirectX 12 Presentation:** Smooth zero-jitter HUD overlay with framerate matching.
- **Physical Telemetry:** WMI and NVML GPU/CPU hardware sensors sampled in isolated threads.
- **Open Knowledge Format (OKF):** Universal cross-game strategy memory format.
`,
  },
  {
    slug: "architecture_and_fixes",
    title: "Distributed Architecture & System Resilience",
    category: "Architecture",
    excerpt:
      "Deep dive into the distributed microservices, failover cascades, and runtime stability hardening in Mission Control.",
    badge: "Microservices",
    badgeColor: "text-neon-green",
    content: `# 🏗️ Distributed Architecture & Fixes

## 🌐 Distributed Cluster & Microservices

Mission Control uses a decoupled client-server architecture:
- **Desktop Client:** Electron + React frontend paired with a high-speed Python backend bridge.
- **Telemetry Service:** Non-blocking hardware metrics capture running on independent priority threads.
- **Distributed Library Gateway:** Centralized game catalog and multi-node synchronization with automatic failover.

## 🛡️ Multi-Tier Failover Engine
If remote cloud endpoints or specific API models become unreachable:
1. **Tier 1 (Google Gemini Flash):** Ultra-low latency primary model router.
2. **Tier 2 (Hugging Face Inference):** Resilient serverless failover.
3. **Tier 3 (NVIDIA NIM):** High-precision enterprise inference.
4. **Local Fallback:** In-memory cached heuristics guarantee continuous operation offline.
`,
  },
  {
    slug: "emulation_and_roms",
    title: "Emulation & ROM Library Orchestration Engine",
    category: "Architecture",
    excerpt:
      "Cross-platform emulator discovery for 17+ emulators, intelligent ROM folder scanning, automatic multi-disc grouping, and seamless 1-click execution.",
    badge: "Emulation Hub",
    badgeColor: "text-purple-400",
    content: `# 🕹️ Emulation & ROM Library Orchestration

## 🎮 Unified Game Emulation & Discovery
Mission Control unifies retro and console games directly alongside PC titles:
- **17+ Emulators Auto-Discovery:** Seamlessly scans for RPCS3, PCSX2, DuckStation, Dolphin, Cemu, Ryujinx, Citra/Lime3DS, PPSSPP, Xenia, Xemu, RetroArch, and more across Windows and Linux.
- **Multi-Disc Merging:** Aggregates multi-disc games into single library cards with interactive disc selection.
- **Direct CLI Argument Forwarding:** Automatically builds emulator-specific CLI parameters and passes ROM paths upon launch.
- **Emulators Hub Modal:** Manage binary overrides, configure custom ROM directories, and test-launch emulators directly from the UI.
- **Smart Directory Validation (v3.9.0):** Automatic tab redirection with actionable warnings when zero directories are configured.
- **Multi-User Library Isolation (v3.9.0):** Persists discovered ROMs directly to the active authenticated profile session.
`,
  },
  {
    slug: "dlss_guide",
    title: "The Evolution of NVIDIA DLSS & DLSS 5.0 Neural Studio",
    category: "Integrations",
    excerpt:
      "Comprehensive breakdown of NVIDIA Deep Learning Super Sampling evolution — from DLSS 1 upscaling to DLSS 5.0 Neural Studio with aesthetic styling and dynamic MFG.",
    badge: "NVIDIA Architecture",
    badgeColor: "text-neon-green",
    content: `# ⚡ The Evolution of NVIDIA DLSS & DLSS 5.0 Neural Studio

NVIDIA Deep Learning Super Sampling (DLSS) is a revolutionary suite of neural rendering technologies powered by dedicated hardware Tensor Cores on GeForce RTX GPUs.

## 🌟 DLSS 5.0 Neural Studio (v3.9.0)
- **Neural Rendering Aesthetic Styles:** 5 switchable neural style models (Cinematic Photoreal, Cyberpunk Hyper-Neon, Ethereal Atmospheric, Gritty Tactical High-Contrast, and Anime Cell-Shaded).
- **Fine-Tuning Intensity Controls:** Precision sliders for Global Style Weight (0–100%), Neural Denoiser Aggressiveness, Material Specular Sharpness, and Temporal Coherence Bias.
- **Dynamic Multi Frame Generation (Dynamic MFG):** 5 frame pacing modes: Adaptive Dynamic (AI-governed), 2x Balanced, 3x Performance, 4x Ultra Performance, and 6x Hyper Scaling.
- **Target Resolution Input Preparation:** Pre-scales frame inputs to 1080p, 1440p, 4K UHD, 8K Ultra, or custom resolutions.
`,
  },
  {
    slug: "changes_summary",
    title: "Recent Updates & Major Releases",
    category: "Overview",
    excerpt:
      "Curated breakdown of major version releases, architectural milestones, and core engine enhancements in Mission Control.",
    badge: "Changelog",
    badgeColor: "text-neon-green",
    content: `# 🚀 Major Updates & Release History

## 🌟 Version v3.9.3 (Latest) — Fixed Agent Neural History persistence across page tabs
- **Agent Neural History Persistence:** In-memory module cache and sessionStorage backing ensures active chat and session history remain persistent when navigating between Dashboard, Settings, and Agent tabs.
- **Dynamic Sidebar Panel Toggle Icons:** Upgraded the static hamburger button to a dynamic stateful panel toggle (\`PanelLeftClose\` with emerald glow when open, \`PanelLeftOpen\` when closed).
- **Desktop Sidebar Drawer Persistence:** Neural History drawer remembers user open/close preference via localStorage and no longer auto-collapses on desktop widescreen.
- **Removed Stability Lab Horizontal Scrollbar:** Converted headroom cards to a responsive 3-column grid (\`grid-cols-1 sm:grid-cols-3\`) to prevent horizontal overflow.
- **Glassmorphic Game Filters & Badge Stacking Fix:** Replaced native select elements with custom CyberFilterDropdown and isolated CSS stacking context to prevent card badges from bleeding over dropdown popovers.
- **React Lazy-Loading 80% Initial Bundle Optimization:** Converted secondary page routes to React.lazy() code-splitting, slashing initial frontend JS bundle by 80.4% (from 967KB to 189KB).

## 🌟 Version v3.9.2 — Performance Optimization, Zero-Hang Architecture & Emulators Hub Alignment
- **Fixed Emulators & ROMs Hub z-index layering and resolution cutoff on scaled displays.**
- **Eliminated modal opening lag with GPU acceleration, reduced backdrop blur, and memoized lists.**
- **Redesigned Game Intelligence header action toolbar preventing button wrapping on compact displays.**
- **Replaced native OS select dropdowns with custom glassmorphic CyberFilterDropdown components.**
- **Resolved CSS stacking context badge overlap with isolated grid boundaries.**
- **Slashed initial frontend JS bundle size by 80.4% (from 967KB to 189KB) via route code-splitting.**
- **Enabled GPU hardware rasterization, zero-copy compositing, and tight 256MB V8 heap ceilings.**
- **Implemented 5MB auto-rotating logs to protect disk storage and eliminate app freezes.**

## 🌟 Version v3.9.1 — 1440p/1600p QHD+ Display Optimization & ROM Scanning Schema Validation Fix
- **ROM Scanning Schema Validation Fix:** Strict Pydantic schema validation for scan_roms and set_rom_paths commands with authenticated session context.
- **1440p & 1600p QHD+ Display Scaling:** Dynamic modal expansion up to max-w-7xl, multi-column emulator grids (3–4 columns), and side-by-side ROM folder cards.
- **Ultra-Responsive Game Intelligence Grid:** Scaled 1–6 column card grid for high-DPI viewports with proportional aspect ratios and widescreen empty state UX.

## 🌟 Version v3.9.0 — DLSS 5.0 Neural Studio, ROM Scanner Guidance & E2EE Verification UX
- **DLSS 5.0 Neural Studio:** Real-time neural rendering controls, aesthetic style presets, intensity fine-tuning sliders, and dynamic MFG modes.
- **ROM Scanner Guidance:** Proactive tab redirection with actionable warning banners when zero folders are configured.
- **Multi-User Library Isolation:** Authenticated user session persistence ensuring emulated titles merge cleanly.
- **E2EE Handshake Verification Overhaul:** Removed redundant account card, fixed scanner box overlay text collision, and relocated telemetry into dedicated pill.
- **Identity Gateway Switching Fix:** Correct provider handle and avatar propagation across sidebar, settings, and switcher.
`,
  },
  {
    slug: "agentic_logic",
    title: "Agentic AI Controller & Automation",
    category: "Core Logic",
    excerpt:
      "Autonomous agent execution loop, safety limits, game state awareness, and user intent parsing.",
    badge: "Engine",
    badgeColor: "text-neon-yellow",
    content: `# 🤖 Agentic AI Controller

## 🎮 Autonomous Gameplay Loop

The agentic controller provides intelligent, hands-free assistance:
- **Scene Analysis:** High-speed frame extraction and OCR tokenization.
- **Tactical Suggestions:** Real-time tips delivered via audio voice synthesis or subtle visual HUD pills.
- **Safety Interlocks:** Strictly user-consented macro execution with game integrity protection.

## 🔒 Safety & Anti-Cheat Compliance
- Operates exclusively in user-mode space without kernel-level hooking.
- Never tampers with protected game memory or system binaries.
- Compatible with modern anti-cheat solutions (Vanguard, Easy Anti-Cheat, BattlEye).
`,
  },
  {
    slug: "fps",
    title: "FPS & VRAM Optimization Engine",
    category: "Performance",
    excerpt:
      "DirectX 12 overlay performance tuning, zero-copy buffer sharing, and memory compaction.",
    badge: "Performance",
    badgeColor: "text-neon-green",
    content: `# 🚀 FPS & VRAM Optimization

## ⚡ Zero-Overhead Telemetry

Mission Control is engineered specifically for competitive gaming:
- **Zero VRAM Footprint:** Frame buffers are sampled via DXGI desktop duplication without duplicating video memory.
- **Dynamic Compaction:** Background working sets are compacted during intensive gaming scenes.
- **Frame-Pacing Protection:** Overlay rendering synchronizes with VSync and G-Sync refresh rates.
`,
  },
  {
    slug: "nvidia_ai_guide",
    title: "NVIDIA NIM & TensorRT Integration Guide",
    category: "Integrations",
    excerpt:
      "How Mission Control leverages NVIDIA NIM cloud models and local TensorRT CUDA acceleration.",
    badge: "NVIDIA",
    badgeColor: "text-neon-green",
    content: `# 🟢 NVIDIA AI Integration Guide

## 💡 Local TensorRT & Cloud NIM Synergy

Mission Control bridges local high-speed processing with powerful cloud inference:
- **Local TensorRT 10.x:** Deployed for ultra-low latency scene classification (<15ms).
- **NVIDIA NIM Cloud Endpoints:** Deployed for deep reasoning, strategy synthesis, and multi-modal image inspection.
- **Zero Hardware Lock-In:** While optimized for NVIDIA GeForce RTX series, fallback pipelines provide full functionality on AMD Radeon and Intel Arc hardware.
`,
  },
  {
    slug: "hardware_optimization",
    title: "Hardware Optimization & Zero-Overhead Architecture",
    category: "Performance",
    excerpt:
      "Deep dive into Mission Control's near-zero overhead architecture: TensorRT FP16 auto-upgrade, CPU P-core affinity isolation, cyclic RAM reclamation, and NVML thermal gating.",
    badge: "Hardware Engine",
    badgeColor: "text-neon-cyan",
    content: `> **Objective**: Optimize Mission Control across GPU (VRAM/Compute), CPU (Cycles/Affinity), and RAM (Working Set/Allocation) to achieve **near-zero overhead** on host AAA gaming performance.

---

## 1. Architectural Philosophy: The Zero-Penalty Co-Pilot

When running concurrently with demanding AAA games (*Cyberpunk 2077*, *Black Myth: Wukong*, *Call of Duty*, *Counter-Strike 2*):
1. **CPU Target**: Average total CPU consumption $\\le 1.5\\%$ (Co-pilot threads isolated to non-primary cores).
2. **GPU Compute Target**: TensorRT vision inference $\\le 3\\text{ ms}$ per execution (zero PyTorch runtime overhead).
3. **VRAM Target**: Total static and dynamic VRAM footprint $\\le 110\\text{ MB}$.
4. **RAM Target**: Working Set memory footprint $\\le 85\\text{ MB}$ via cyclic \`EmptyWorkingSet()\` paging.
5. **Frametime Delta**: $\\Delta \\le 0.3\\%$ impact on game $1\\%$ lows.

---

## 2. Core Implemented Optimizations

### 🚀 Pure TensorRT FP16 Engine Auto-Upgrade
- Auto-discovers compiled \`.engine\` files in \`scripts/\`, \`models/\`, and local app data.
- Bypasses PyTorch and Ultralytics runtimes entirely, instantiating a pure CUDA runtime with TensorRT bindings.
- Cuts VRAM from $\\sim 450\\text{ MB}$ down to **$98\\text{ MB}$** and latency to **$< 3\\text{ ms}$**.

### 🛡️ CPU Heterogeneous Core Affinity Pinning
- Masks off Cores 0 and 1 on systems with $\\ge 6$ logical threads.
- Reserves primary P-cores exclusively for the host game engine's main render loop.
- Isolates assistant pipelines (Vision, Audio, Telemetry, WebSockets) to E-cores / secondary threads.

### 🧹 Proactive RAM Compaction & Working Set Trimming
- Cyclically runs generation-2 garbage collection and Win32 \`EmptyWorkingSet()\` every $\\sim 600$ vision frames.
- Stabilizes background Python memory between **$72\\text{--}85\\text{ MB}$**.
`,
  },
];


