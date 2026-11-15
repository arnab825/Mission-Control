import React from "react";
import { Cpu, ShieldCheck, Zap, Lock, Cookie, Sliders } from "lucide-react";

export interface LegalHighlight {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

export interface LegalSection {
  id: string;
  code: string;
  title: string;
  content: string;
}

export interface LegalTabData {
  title: string;
  badge: string;
  version: string;
  highlights: LegalHighlight[];
  sections: LegalSection[];
}

export const LEGAL_DATA: Record<"terms" | "privacy" | "cookies", LegalTabData> = {
  terms: {
    title: "Terms of Service & Architecture License",
    badge: "PROTOCOL AGREEMENT",
    version: "Revision 3.4 — Effective June 2026",
    highlights: [
      {
        icon: Cpu,
        title: "Local Execution Grant",
        desc: "Granted for local PC hardware execution, HUD overlay hooks, and local telemetry caching.",
      },
      {
        icon: ShieldCheck,
        title: "Anti-Cheat Compliant",
        desc: "Non-invasive read-only metrics designed to comply with VAC, EasyAntiCheat, and BattlEye.",
      },
      {
        icon: Zap,
        title: "Hardware Safety Margin",
        desc: "Sensory telemetry reads hardware counters within safe vendor specification limits.",
      },
    ],
    sections: [
      {
        id: "sec-1",
        code: "SEC 01.0",
        title: "Acceptance & Core Grant of License",
        content:
          "By downloading, compiling, installing, or executing Mission Control software binaries or accessing the web telemetry portals, you acknowledge and agree to be bound by this License Agreement. Mission Control grants you a non-exclusive, revocable, personal, and non-transferable license to deploy the software across your personal computing hardware for real-time telemetry analysis, AI copilot inference, and benchmark logging.",
      },
      {
        id: "sec-2",
        code: "SEC 02.0",
        title: "Game Integration & Anti-Cheat Safe Harbors",
        content:
          "Mission Control utilizes standard Windows DirectX/Vulkan Present hook layers and RivaTuner Statistics Server (RTSS) shared memory interfaces. The software does not inject executable payloads into protected game memory spaces, execute memory manipulation, or provide competitive advantages. While engineered for maximum anti-cheat compatibility, end users are responsible for verifying game-specific tournament or publisher rules.",
      },
      {
        id: "sec-3",
        code: "SEC 03.0",
        title: "Hardware Telemetry, Sensors & Thermal Safety",
        content:
          "Mission Control polls hardware telemetry (GPU core clocks, VRAM temperature, CPU package wattage, fan RPM) via low-level kernel APIs (NVML, AMD ADL, LibreHardwareMonitor). The software does not enforce unauthorized voltage over-volting beyond vendor-specified bios thresholds. Users retain full responsibility for verifying cooling capabilities and ambient thermal safety.",
      },
      {
        id: "sec-4",
        code: "SEC 04.0",
        title: "Local AI Models & Weight Distribution",
        content:
          "AI features operating on-device (such as ONNX-quantized and SLM tactical models) process inference directly on your Tensor/CUDA cores. Weight distributions provided under permissive open-weights agreements (Apache 2.0 / Llama Community License) remain subject to their respective upstream attribution clauses.",
      },
      {
        id: "sec-5",
        code: "SEC 05.0",
        title: "Limitation of Liability & Warranty Disclaimer",
        content:
          "MISSION CONTROL IS PROVIDED 'AS IS' WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE ARCHITECTS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY HARDWARE DAMAGE, SYSTEM CRASHES, DATA LOSS, OR GAMING ACCOUNT SUSPENSIONS ARISING OUT OF SOFTWARE USAGE.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy & Zero-Cloud Telemetry",
    badge: "DATA SOVEREIGNTY",
    version: "Revision 4.1 — Effective June 2026",
    highlights: [
      {
        icon: Lock,
        title: "Zero Cloud Logging",
        desc: "FPS telemetry, voice processing, and rig specifications never leave your local machine.",
      },
      {
        icon: ShieldCheck,
        title: "No Data Monetization",
        desc: "We do not sell, broker, or monetize your gaming activity or user behavior profiles.",
      },
      {
        icon: Cpu,
        title: "On-Device Inference",
        desc: "AI overlays process queries on your local GPU Tensor cores without third-party exposure.",
      },
    ],
    sections: [
      {
        id: "sec-1",
        code: "SEC 01.0",
        title: "The Zero-Cloud Core Philosophy",
        content:
          "Mission Control is architected around local-first sovereignty. Your gameplay telemetry (1% low FPS, frametimes, memory allocations, CPU/GPU thermals) is processed in volatile local memory and cached strictly in local SQLite/IndexedDB structures on your drive. No frame telemetry is streamed to external cloud servers.",
      },
      {
        id: "sec-2",
        code: "SEC 02.0",
        title: "Information Collected on Website & Community",
        content:
          "When you interact with our public website (e.g., submitting community game ratings, participating in discussions, or subscribing to the Telemetry dispatch newsletter), we only store the information you explicitly provide (email address, rating score, hardware description, and user-provided notes). Newsletter subscriptions can be unsubscribed instantly with a single click.",
      },
      {
        id: "sec-3",
        code: "SEC 03.0",
        title: "Optional Anonymous Crash Dumps",
        content:
          "If the desktop application encounters a fatal DirectX exception or kernel crash, an anonymous mini-dump log is generated locally. You are prompted before any diagnostic is transmitted. Crash reports contain only driver version numbers, OS build tags, and exception stack traces—never personal files or sensitive memory contents.",
      },
      {
        id: "sec-4",
        code: "SEC 04.0",
        title: "Third-Party Feeds & External APIs",
        content:
          "Our web portal aggregates public gaming RSS feeds (IGN, Kotaku, Eurogamer, AnandTech, Tom's Hardware) for news generation. Reading these feeds does not transmit any tracking tokens to third-party ad networks.",
      },
      {
        id: "sec-5",
        code: "SEC 05.0",
        title: "User Rights & Data Erasure (GDPR / CCPA)",
        content:
          "You hold absolute rights to inspect, export, or permanently delete any telemetry or community contributions associated with your account or email address. Contact our privacy team anytime via the support portal for immediate purge execution.",
      },
    ],
  },
  cookies: {
    title: "Cookie & Local Storage Policy",
    badge: "STORAGE SPECIFICATION",
    version: "Revision 2.9 — Effective June 2026",
    highlights: [
      {
        icon: Cookie,
        title: "Zero Tracker Cookies",
        desc: "Zero third-party advertising cookies or cross-domain fingerprint tracking beacons.",
      },
      {
        icon: Lock,
        title: "Strictly Functional",
        desc: "Browser LocalStorage is used only to remember your rig presets, theme, and benchmark filters.",
      },
      {
        icon: Sliders,
        title: "Real-Time Control",
        desc: "Manage storage preferences and toggle non-essential diagnostic caching dynamically below.",
      },
    ],
    sections: [
      {
        id: "sec-1",
        code: "SEC 01.0",
        title: "Overview of Storage Technologies",
        content:
          "We use modern web browser storage mechanisms—primarily LocalStorage, SessionStorage, and secure First-Party Cookies—solely to maintain your session state, persist UI layout customizations, and cache benchmark comparison charts for faster re-renders.",
      },
      {
        id: "sec-2",
        code: "SEC 02.0",
        title: "Essential System Cookies & Storage",
        content:
          "These storage keys are strictly required for the core application to operate. They store your active session tokens, dark HUD theme preferences, and security CSRF verification tokens. Disabling these may cause authentication and rating submissions to fail.",
      },
      {
        id: "sec-3",
        code: "SEC 03.0",
        title: "Hardware Benchmark Cache Storage",
        content:
          "To avoid redundant network requests and provide instant 120 FPS graph rendering, we cache recent GPU benchmark profiles and tested game summaries in browser IndexedDB/LocalStorage.",
      },
      {
        id: "sec-4",
        code: "SEC 04.0",
        title: "Anonymous Performance & Error Metrics",
        content:
          "We measure aggregated site performance (e.g. Core Web Vitals, page render speeds, route latency) using privacy-respecting first-party analytics. No personal IP addresses or persistent cross-site tracking IDs are stored.",
      },
    ],
  },
};
