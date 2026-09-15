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
    excerpt: "Comprehensive architectural summary of Mission Control, an autonomous DirectX 12 telemetry overlay and AI co-pilot.",
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
    excerpt: "Deep dive into the distributed microservices, failover cascades, and runtime stability hardening in Mission Control.",
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
    slug: "agentic_logic",
    title: "Agentic AI Controller & Automation",
    category: "Core Logic",
    excerpt: "Autonomous agent execution loop, safety limits, game state awareness, and user intent parsing.",
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
    excerpt: "DirectX 12 overlay performance tuning, zero-copy buffer sharing, and memory compaction.",
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
    excerpt: "How Mission Control leverages NVIDIA NIM cloud models and local TensorRT CUDA acceleration.",
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
];
