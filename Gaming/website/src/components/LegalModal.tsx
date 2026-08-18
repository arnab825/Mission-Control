"use client";

import { useState, useMemo } from "react";
import {
  X,
  ShieldCheck,
  FileText,
  Cookie,
  CheckCircle2,
  Lock,
  Cpu,
  Zap,
  Search,
  ExternalLink,
  Sliders,
  ChevronRight,
  Sparkles,
  Info,
  Scale
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export type LegalModalTab = "terms" | "privacy" | "cookies";

interface LegalModalProps {
  isOpen: boolean;
  activeTab: LegalModalTab;
  onClose: () => void;
  onTabChange: (tab: LegalModalTab) => void;
}

export default function LegalModal({
  isOpen,
  activeTab,
  onClose,
  onTabChange,
}: LegalModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cookieSettings, setCookieSettings] = useState({
    essential: true, // Always locked
    hardwareCache: true,
    anonymousDiagnostics: false,
  });

  // Section data for each legal tab
  const legalData = useMemo(() => {
    return {
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
  }, [activeTab]);

  const currentData = legalData[activeTab];

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return currentData.sections;
    const q = searchQuery.toLowerCase();
    return currentData.sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
    );
  }, [currentData, searchQuery]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 overflow-hidden"
        >
          {/* Backdrop Blur with Cyber Pattern */}
          <div
            className="fixed inset-0 bg-[#070709]/85 backdrop-blur-md transition-opacity"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative w-full max-w-4xl h-[88dvh] sm:h-auto sm:max-h-[85vh] flex flex-col bg-[#0c0d12]/95 border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_30px_rgba(118,185,0,0.12)] overflow-hidden z-10 my-auto"
          >
            {/* Top Glowing Ambient Border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-green to-transparent shadow-[0_0_15px_rgba(118,185,0,0.8)] z-20" />

            {/* Corner Decorative Tech Brackets */}
            <div className="absolute top-1.5 left-3 font-mono text-[9px] text-neon-green/40 pointer-events-none uppercase tracking-widest hidden sm:block">
              SYS-DOC-SEC // V3.4
            </div>
            <div className="absolute top-1.5 right-14 font-mono text-[9px] text-white/30 pointer-events-none uppercase tracking-widest hidden sm:block">
              ENCRYPTED-VERIFIED
            </div>

            {/* Header Section */}
            <div className="p-3.5 sm:p-6 border-b border-white/[0.08] relative bg-gradient-to-b from-white/[0.03] to-transparent shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(118,185,0,0.2)] shrink-0">
                    {activeTab === "terms" && <Scale className="w-4 h-4 sm:w-5 sm:h-5" />}
                    {activeTab === "privacy" && <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
                    {activeTab === "cookies" && <Cookie className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/30 shrink-0">
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-neon-green animate-pulse" />
                        {currentData.badge}
                      </span>
                      <span className="text-gray-500 text-[10px] sm:text-xs font-mono hidden md:inline truncate">
                        {currentData.version}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-2xl font-black font-display text-white tracking-tight truncate">
                      {currentData.title}
                    </h2>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/[0.04] border border-white/10 hover:border-neon-green/50 hover:bg-neon-green/10 text-gray-400 hover:text-neon-green flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Horizontal Scrollable Tabs & Search on Desktop */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap py-0.5 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      onTabChange("terms");
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap ${
                      activeTab === "terms"
                        ? "bg-neon-green text-obsidian font-bold shadow-[0_0_15px_rgba(118,185,0,0.3)]"
                        : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/5"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Terms</span>
                  </button>

                  <button
                    onClick={() => {
                      onTabChange("privacy");
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap ${
                      activeTab === "privacy"
                        ? "bg-neon-green text-obsidian font-bold shadow-[0_0_15px_rgba(118,185,0,0.3)]"
                        : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/5"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Privacy</span>
                  </button>

                  <button
                    onClick={() => {
                      onTabChange("cookies");
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap ${
                      activeTab === "cookies"
                        ? "bg-neon-green text-obsidian font-bold shadow-[0_0_15px_rgba(118,185,0,0.3)]"
                        : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/5"
                    }`}
                  >
                    <Cookie className="w-3.5 h-3.5" />
                    <span>Cookies</span>
                  </button>
                </div>

                {/* Quick Search Input (Desktop view) */}
                <div className="hidden sm:block w-52 relative shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter clauses..."
                    className="w-full bg-[#12141c] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-green font-mono transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 text-xs sm:text-sm text-gray-300">
              {/* Quick Search on Mobile */}
              <div className="sm:hidden relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter legal clauses..."
                  className="w-full bg-[#12141c] border border-white/10 rounded-lg pl-8 pr-7 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-green font-mono transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs p-1"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Tactical Highlight Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {currentData.highlights.map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white/[0.02] border border-white/[0.06] hover:border-neon-green/30 rounded-xl p-3 sm:p-3.5 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-neon-green/10 text-neon-green flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <h4 className="font-bold text-white text-xs font-display tracking-wide truncate">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-gray-400 text-[11px] sm:text-xs leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Cookie Toggles (when on cookie policy tab) */}
              {activeTab === "cookies" && (
                <div className="bg-[#10121a] border border-neon-green/20 rounded-xl p-3.5 sm:p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-green" />
                      <h4 className="font-bold text-white text-xs sm:text-sm font-display uppercase tracking-wider">
                        Live Storage & Cookie Preferences
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-1.5 py-0.5 rounded border border-neon-green/30">
                      ON-DEVICE ONLY
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Essential */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/5 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">Essential Session Data</span>
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/10 text-gray-400">
                            Required
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                          Theme configurations, security tokens, and navigation states.
                        </p>
                      </div>
                      <div className="w-9 h-5 rounded-full bg-neon-green/30 border border-neon-green/60 flex items-center justify-end px-0.5 cursor-not-allowed opacity-80 shrink-0">
                        <div className="w-3.5 h-3.5 rounded-full bg-neon-green shadow-sm" />
                      </div>
                    </div>

                    {/* Hardware Cache */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/5 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">Hardware Benchmark Cache</span>
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-neon-green/10 text-neon-green">
                            Accelerated
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                          Local caching of GPU/CPU benchmark data for zero-latency charts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCookieSettings((prev) => ({
                            ...prev,
                            hardwareCache: !prev.hardwareCache,
                          }))
                        }
                        className={`w-9 h-5 rounded-full border transition-all flex items-center px-0.5 cursor-pointer shrink-0 ${
                          cookieSettings.hardwareCache
                            ? "bg-neon-green/30 border-neon-green/60 justify-end"
                            : "bg-white/10 border-white/20 justify-start"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full transition-all ${
                            cookieSettings.hardwareCache
                              ? "bg-neon-green shadow-[0_0_8px_rgba(118,185,0,0.8)]"
                              : "bg-gray-400"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Anonymous Diagnostics */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/5 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">Anonymous Diagnostics</span>
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/10 text-gray-400">
                            Optional
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                          Anonymous aggregate performance metrics to optimize page load speeds.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCookieSettings((prev) => ({
                            ...prev,
                            anonymousDiagnostics: !prev.anonymousDiagnostics,
                          }))
                        }
                        className={`w-9 h-5 rounded-full border transition-all flex items-center px-0.5 cursor-pointer shrink-0 ${
                          cookieSettings.anonymousDiagnostics
                            ? "bg-neon-green/30 border-neon-green/60 justify-end"
                            : "bg-white/10 border-white/20 justify-start"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full transition-all ${
                            cookieSettings.anonymousDiagnostics
                              ? "bg-neon-green shadow-[0_0_8px_rgba(118,185,0,0.8)]"
                              : "bg-gray-400"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Clauses Section List */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                    Detailed Articles ({filteredSections.length})
                  </h3>
                  <span className="text-[10px] sm:text-[11px] font-mono text-gray-500">
                    Jurisdiction: Global Standard
                  </span>
                </div>

                {filteredSections.length === 0 ? (
                  <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/5">
                    <Info className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-xs">
                      No matching legal clauses found for &quot;{searchQuery}&quot;.
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-neon-green text-xs hover:underline cursor-pointer"
                    >
                      Clear search filter
                    </button>
                  </div>
                ) : (
                  filteredSections.map((sec) => (
                    <div
                      key={sec.id}
                      className="bg-[#0f1118]/70 border border-white/[0.06] hover:border-white/15 rounded-xl p-3.5 sm:p-5 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neon-green bg-neon-green/10 px-1.5 py-0.5 rounded border border-neon-green/30 shrink-0">
                          {sec.code}
                        </span>
                        <h4 className="font-bold text-white text-xs sm:text-base font-display">
                          {sec.title}
                        </h4>
                      </div>
                      <p className="text-gray-400 text-xs sm:text-sm leading-relaxed pl-0.5">
                        {sec.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Help & Support Note */}
              <div className="p-3 sm:p-4 rounded-xl bg-neon-green/[0.04] border border-neon-green/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green shrink-0" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Have questions regarding our compliance?</h5>
                    <p className="text-gray-400 text-[10px] sm:text-[11px]">
                      Our engineering and legal team provides direct clarification on telemetry architecture.
                    </p>
                  </div>
                </div>
                <Link
                  href="/contact"
                  onClick={onClose}
                  className="text-xs font-bold text-neon-green hover:text-white flex items-center gap-1 shrink-0 group transition-colors"
                >
                  Contact Support <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="p-3 sm:p-5 border-t border-white/[0.08] bg-[#090a0e] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg sm:rounded-xl bg-neon-green hover:bg-[#88d900] text-obsidian font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(118,185,0,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledge & Close</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
