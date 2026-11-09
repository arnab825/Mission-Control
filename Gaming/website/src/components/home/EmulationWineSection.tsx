"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Layers,
  Sparkles,
  Maximize2,
  X,
  ArrowRight,
  Disc3,
  Cpu,
  Terminal,
  FolderSync,
  Box,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface FeatureDetail {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  screenshot: string;
  fallbackScreenshot: string;
  accentColor: string;
  borderGlow: string;
  bgGlow: string;
  highlights: { title: string; desc: string; icon: any }[];
  pills: string[];
  docLink: string;
}

const EMULATION_WINE_FEATURES: FeatureDetail[] = [
  {
    id: "emulation",
    tag: "Retro & Console Engine",
    title: "Emulation",
    subtitle: "Universal Console Discovery & Multi-Disc Library",
    description:
      "Detects 17 emulators and RetroArch cores, scans ROM folders, merges multi-disc games, and auto-assembles CLI flags for direct 1-click execution.",
    screenshot: "/screenshots/emulation_showcase.webp",
    fallbackScreenshot: "/screenshots/emulation_showcase.png",
    accentColor: "text-purple-400",
    borderGlow: "border-purple-500/40 hover:border-purple-400/80 shadow-[0_0_35px_rgba(168,85,247,0.18)]",
    bgGlow: "from-purple-950/40 via-purple-900/10 to-transparent",
    highlights: [
      {
        title: "17+ Emulators Auto-Discovery",
        desc: "Detects RPCS3, PCSX2, DuckStation, Dolphin, Cemu, Ryujinx, Citra, melonDS, mGBA, Snes9x, Xenia, Xemu, Flycast, and RetroArch libretro cores across standard Windows & Linux paths.",
        icon: Gamepad2,
      },
      {
        title: "Intelligent Multi-Disc Merging",
        desc: "Automatically merges multi-disc adventures (Disc 1, Disc 2, CD1, CD2) into a single library card with an interactive in-card disc selector dropdown.",
        icon: Disc3,
      },
      {
        title: "1-Click CLI Argument Dispatch",
        desc: "Bypasses cumbersome UI launcher workflows by assembling emulator-specific execution parameters and launching games directly into full-screen mode.",
        icon: Terminal,
      },
      {
        title: "Adjacent Cover Artwork Resolution",
        desc: "Extracts local boxart, poster art, and title graphics directly from adjacent directory structures before falling back to cloud assets.",
        icon: FolderSync,
      },
    ],
    pills: [
      "RPCS3 (PS3)",
      "PCSX2 (PS2)",
      "DuckStation (PS1)",
      "Dolphin (GC/Wii)",
      "Cemu (Wii U)",
      "Ryujinx (Switch)",
      "PPSSPP (PSP)",
      "Xenia (X360)",
      "Flycast (Dreamcast)",
      "RetroArch Libretro",
    ],
    docLink: "/docs/emulation_and_roms",
  },
  {
    id: "wine-proton",
    tag: "Linux Compatibility Layer",
    title: "Wine and Proton",
    subtitle: "Built-In Wine Manager & Isolated Game Prefixes",
    description:
      "A built-in Wine Manager, per-game prefixes and options, a sandbox and launch error hints for Windows games on Linux.",
    screenshot: "/screenshots/wine_proton_showcase.webp",
    fallbackScreenshot: "/screenshots/wine_proton_showcase.png",
    accentColor: "text-cyan-400",
    borderGlow: "border-cyan-500/40 hover:border-cyan-400/80 shadow-[0_0_35px_rgba(6,182,212,0.18)]",
    bgGlow: "from-cyan-950/40 via-cyan-900/10 to-transparent",
    highlights: [
      {
        title: "Built-In Wine & Proton Manager",
        desc: "Download, manage, and switch between GE-Proton, Proton Experimental, and custom Wine runners on a per-game basis with zero terminal hassle.",
        icon: Cpu,
      },
      {
        title: "Isolated Per-Game Prefixes",
        desc: "Each Windows game gets a clean, sandboxed Wine prefix directory, preventing registry contamination and DLL conflicts across different games.",
        icon: Box,
      },
      {
        title: "DXVK & VKD3D Translation",
        desc: "High-performance Direct3D 9/10/11 to Vulkan and DirectX 12 translation with asynchronous shader compilation for butter-smooth frametimes.",
        icon: Sparkles,
      },
      {
        title: "Launch Error Diagnostics & Hints",
        desc: "Real-time log scanner that detects missing runtime libraries (.NET, Visual C++, DirectX) and surfaces 1-click remediation hints.",
        icon: HelpCircle,
      },
    ],
    pills: [
      "GE-Proton & Wine-GE",
      "Per-Game WINEPREFIX",
      "DXVK 2.4+ / VKD3D",
      "Launch Error Hints",
      "Runtime Sandboxing",
      "GameScope & FSR",
    ],
    docLink: "/docs/emulation_and_roms",
  },
];

export function EmulationWineSection() {
  const [selectedLightbox, setSelectedLightbox] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<number>(0);

  const CONSOLE_CATEGORIES = [
    {
      name: "PlayStation",
      consoles: "PS3, PS2, PS1, PS Vita, PSP",
      emulators: "RPCS3, PCSX2, DuckStation, Vita3K, PPSSPP",
      extensions: ".iso, .chd, .pkg, .cso, .pbp, .bin, .cue",
      color: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    },
    {
      name: "Nintendo",
      consoles: "Switch, Wii U, Wii, GameCube, 3DS, NDS, GBA, SNES, N64",
      emulators: "Ryujinx, Cemu, Dolphin, Lime3DS/Citra, melonDS, mGBA, Snes9x, Mupen64Plus",
      extensions: ".nsp, .xci, .wux, .wua, .rvz, .3ds, .nds, .gba, .sfc, .z64",
      color: "border-red-500/40 bg-red-500/10 text-red-300",
    },
    {
      name: "Xbox",
      consoles: "Xbox 360, Original Xbox",
      emulators: "Xenia, Xenia Canary, Xemu",
      extensions: ".iso, .xex, .xbe",
      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    },
    {
      name: "Sega & Multi-System",
      consoles: "Dreamcast, Mega Drive / Genesis, Libretro Ecosystem",
      emulators: "Flycast, RetroArch (Dynamic Core Loader)",
      extensions: ".cdi, .gdi, .chd, .md, .bin",
      color: "border-purple-500/40 bg-purple-500/10 text-purple-300",
    },
    {
      name: "Linux Wine & Proton",
      consoles: "Windows PC Titles running on Linux",
      emulators: "Wine-GE, Proton Experimental, Proton-GE, DXVK / VKD3D",
      extensions: ".exe, Windows Game Binaries, Steam/GOG/Epic Installers",
      color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    },
  ];

  return (
    <section
      id="emulation-wine"
      className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
        <div className="inline-block border border-purple-500/30 rounded-full px-4 py-1.5 bg-purple-500/10 mb-4 backdrop-blur-md">
          <span className="text-purple-300 text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            CROSS-PLATFORM EMULATION & LINUX WINE
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
          CONSOLE <span className="text-purple-400 glow-text-purple">EMULATION</span> & WINE RUNNER
        </h2>
        <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
          Bridge classic console nostalgia and high-performance Windows PC gaming on Linux with
          zero configuration friction.
        </p>
      </div>

      {/* Two Hero Feature Showcase Cards (matching the user reference design) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {EMULATION_WINE_FEATURES.map((feat) => {
          return (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5 }}
              className={`glass-card p-6 sm:p-8 rounded-3xl border ${feat.borderGlow} bg-linear-to-b ${feat.bgGlow} flex flex-col justify-between transition-all duration-300 group overflow-hidden relative`}
            >
              <div>
                {/* Visual Screenshot Display Frame */}
                <div
                  onClick={() => setSelectedLightbox(feat.screenshot)}
                  className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-black/60 border border-white/10 mb-6 cursor-pointer group-hover:border-white/20 transition-all shadow-2xl flex items-center justify-center"
                >
                  <img
                    src={feat.screenshot}
                    alt={feat.title}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-103"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== feat.fallbackScreenshot) {
                        target.src = feat.fallbackScreenshot;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Window Bar Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                      <span>{feat.tag}</span>
                    </div>
                    <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/70 group-hover:text-white transition-colors">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 text-[10px] font-mono text-zinc-400 bg-black/70 px-2.5 py-0.5 rounded-md backdrop-blur-md border border-white/5">
                    Click to view high-res showcase
                  </div>
                </div>

                {/* Card Title & Headline */}
                <div className="mb-4">
                  <div className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-zinc-400 mb-1">
                    {feat.title}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                {/* Highlights List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {feat.highlights.map((h) => {
                    const Icon = h.icon;
                    return (
                      <div
                        key={h.title}
                        className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className={`w-4 h-4 ${feat.accentColor} shrink-0`} />
                          <h4 className="text-xs font-bold text-white tracking-wide truncate">
                            {h.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">{h.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Compatibility Pills */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {feat.pills.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={feat.docLink}
                className="inline-flex items-center justify-between w-full px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-mono text-xs font-black uppercase tracking-widest transition-all duration-200 group/link"
              >
                <span>Read Architectural Documentation</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Interactive Console Support Matrix Deck */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 bg-black/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-neon-green" />
              <span>Supported Console & Runtime Compatibility Matrix</span>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Mission Control seamlessly identifies standard console directories, disc formats, and
              emulator binaries.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CONSOLE_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveConsoleTab(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeConsoleTab === idx
                    ? "bg-white/15 text-white border border-white/30 shadow-lg"
                    : "bg-white/5 text-zinc-400 border border-white/5 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Category Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Consoles Covered
            </div>
            <div className="text-sm font-black text-white font-display">
              {CONSOLE_CATEGORIES[activeConsoleTab].consoles}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Auto-Detected Emulators & Runners
            </div>
            <div className="text-sm font-black text-neon-green font-mono">
              {CONSOLE_CATEGORIES[activeConsoleTab].emulators}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
              Recognized Formats & Extensions
            </div>
            <div className="text-xs font-mono font-bold text-purple-300">
              {CONSOLE_CATEGORIES[activeConsoleTab].extensions}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLightbox(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] bg-obsidian rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest">
                  Mission Control Feature Showcase
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLightbox(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-hidden">
                <img
                  src={selectedLightbox}
                  alt="High Resolution Showcase"
                  className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

