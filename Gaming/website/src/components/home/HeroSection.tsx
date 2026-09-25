"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  FileText,
  Zap,
  Shield,
  Cpu,
  Globe,
  Bot,
  Sparkles,
  ExternalLink,
  Maximize2,
  X,
} from "lucide-react";
import {
  WINDOWS_INSTALLER_URL,
  LINUX_INSTALLER_URL,
  AUTO_DOWNLOAD_URL,
} from "@/lib/download";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export type OS = "windows" | "linux" | "mac" | "other" | null;

interface HeroSectionProps {
  os: OS;
  appVersion: string;
}

export function HeroSection({ os, appVersion }: HeroSectionProps) {
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  return (
    <>
      {/* Top Brand Ribbon */}
      <div className="w-full bg-black/60 border-b border-neon-green/30 backdrop-blur-xl py-2.5 px-4 relative z-20 text-center flex items-center justify-center font-mono text-xs shadow-[0_0_25px_rgba(118,185,0,0.15)]">
        <div className="inline-flex items-center justify-center flex-wrap gap-2 sm:gap-3.5 text-[10px] sm:text-xs">
          <div className="flex items-center gap-2 text-neon-green font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-neon-yellow animate-pulse shrink-0" />
            <span>POWERED BY MISSION CONTROL LABS</span>
          </div>

          <span className="text-white/20 font-bold hidden sm:inline">•</span>

          <div className="flex items-center gap-2 text-gray-300 font-semibold tracking-wider uppercase text-[10px] sm:text-xs">
            <Cpu className="w-3.5 h-3.5 text-neon-green shrink-0" />
            <span>NVIDIA TENSORRT LOCAL CUDA PLATFORM</span>
          </div>

          <a
            href="https://developer.nvidia.com/tensorrt"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-neon-yellow font-bold bg-neon-yellow/10 border border-neon-yellow/30 hover:bg-neon-yellow hover:text-obsidian hover:shadow-[0_0_15px_rgba(255,255,0,0.5)] transition-all px-2.5 py-0.5 rounded-full text-[10px] uppercase cursor-pointer"
          >
            <span>NVIDIA AI SITE</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Hero Section Container */}
      <section className="w-full max-w-7xl px-4 sm:px-6 mt-4 sm:mt-10 mb-16 sm:mb-28 relative z-10 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Details, Title, Description, CTAs, and Telemetry Stats */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <h1 className="sr-only">Mission Control — Autonomous AI Gaming Assistant & Telemetry Overlay</h1>

            {/* Glowing Category Badge */}
            <div className="inline-flex items-center gap-2 border border-neon-green/60 rounded-full px-3.5 py-1.5 bg-linear-to-r from-neon-green/25 via-neon-green/10 to-transparent backdrop-blur-xl mb-6 shadow-[0_0_30px_rgba(118,185,0,0.3)] flex-wrap justify-center lg:justify-start">
              <span className="text-neon-green text-[11px] sm:text-xs font-bold font-mono tracking-widest uppercase flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-neon-yellow" /> TACTICAL ENGINE v{appVersion}
              </span>
              <span className="text-white/30 hidden sm:inline">•</span>
              <span className="text-gray-300 text-xs font-mono font-semibold hidden sm:inline">LOCAL CUDA</span>
              <span className="text-white/30 hidden sm:inline">•</span>
              <span className="text-neon-yellow text-xs font-mono font-bold uppercase flex items-center gap-1 bg-neon-yellow/10 px-2 py-0.5 rounded-full border border-neon-yellow/30">
                <Bot className="w-3 h-3 text-neon-yellow" /> AGENT CO-PILOT
              </span>
            </div>

            {/* Premium Cybernetic Gradient Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white mb-4 uppercase leading-[1.05] select-none text-center lg:text-left">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-white via-gray-200 to-gray-400">
                THE ULTIMATE
              </span> <br />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-neon-green via-emerald-400 to-cyan-400 font-black drop-shadow-[0_0_35px_rgba(118,185,0,0.6)]">
                GAMING AI
              </span> <br />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-gray-100 via-white to-gray-300">
                DASHBOARD
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl mb-6 leading-relaxed font-sans text-center lg:text-left">
              Engineered by <strong className="text-neon-green font-bold">Mission Control Labs</strong> for high-performance rigs. Monitor thermals in real-time, trigger agentic system macros, and receive <span className="text-neon-yellow font-mono font-bold px-1.5 py-0.5 rounded bg-neon-yellow/10 border border-neon-yellow/30 text-[11px]">sub-15ms</span> local AI tactics directly inside your game.
            </p>

            {/* Unified Action Buttons & Telemetry Grid Container */}
            <div className="w-full max-w-md lg:max-w-xl mx-auto lg:mx-0 flex flex-col gap-3 sm:gap-4 mb-6">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full font-mono text-xs">
                {os === "mac" || os === "other" ? (
                  <div className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-white/5 border border-white/20 text-gray-400 px-6 h-12.5 rounded-xl font-bold uppercase tracking-wider text-center cursor-not-allowed">
                    <span>Windows & Linux Only</span>
                  </div>
                ) : (
                  <a
                    href={os === "linux" ? LINUX_INSTALLER_URL : (os === "windows" ? WINDOWS_INSTALLER_URL : AUTO_DOWNLOAD_URL)}
                    suppressHydrationWarning
                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-2.5 btn-premium-primary px-6 h-12.5 rounded-xl font-black uppercase tracking-wider text-center shadow-[0_0_35px_rgba(118,185,0,0.5)] whitespace-nowrap group cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-y-0.5" />
                    <span suppressHydrationWarning>DOWNLOAD NOW ({os === "linux" ? "LINUX" : "WINDOWS"})</span>
                  </a>
                )}

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <Link
                    href="/docs"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 btn-premium-glass px-5 h-12.5 font-bold transition-all text-center rounded-xl whitespace-nowrap group"
                  >
                    <div className="w-5 h-5 rounded-md icon-badge-premium shrink-0">
                      <FileText className="w-3 h-3 text-neon-green" />
                    </div>
                    <span>Architecture Docs</span>
                  </Link>

                  <a
                    href="https://github.com/arnab825/Mission-Control"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-12.5 h-12.5 btn-premium-glass text-gray-300 hover:text-neon-green transition-all shrink-0 rounded-xl group"
                    title="View GitHub Repository"
                  >
                    <GithubIcon className="w-4.5 h-4.5 text-neon-green group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>

              {/* High-Tech Telemetry Stats Counter Grid */}
              <div className="w-full grid grid-cols-2 gap-2.5 font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-white/3 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-md hover:border-neon-green/50 hover:shadow-[0_0_20px_rgba(118,185,0,0.2)] transition-all h-full min-h-18 group">
                  <div className="w-7 h-7 rounded-lg icon-badge-yellow mb-1 shrink-0">
                    <Zap className="w-3.5 h-3.5 text-neon-yellow" />
                  </div>
                  <span className="text-neon-green font-black text-xs">&lt;15ms</span>
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mt-0.5 text-center">Local CUDA Latency</span>
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-md hover:border-neon-green/50 hover:shadow-[0_0_20px_rgba(118,185,0,0.2)] transition-all h-full min-h-18 group">
                  <div className="w-7 h-7 rounded-lg icon-badge-premium mb-1 shrink-0">
                    <Shield className="w-3.5 h-3.5 text-neon-green" />
                  </div>
                  <span className="text-neon-green font-black text-xs">100% SAFE</span>
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mt-0.5 text-center">Overlay Hooking</span>
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-md hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all h-full min-h-18 group">
                  <div className="w-7 h-7 rounded-lg icon-badge-purple mb-1 shrink-0">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span className="text-purple-400 font-black text-xs">TENSORRT</span>
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mt-0.5 text-center">NVIDIA Engine</span>
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-md hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all h-full min-h-18 group">
                  <div className="w-7 h-7 rounded-lg icon-badge-cyan mb-1 shrink-0">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <span className="text-cyan-400 font-black text-xs">100% FREE</span>
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mt-0.5 text-center">Open Source GitHub</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Windows 11 Desktop App Image Showcase Window */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-6 w-full relative"
          >
            <div className="glass-panel p-2.5 sm:p-4 rounded-3xl sm:rounded-[28px] border-gradient-cyber bg-obsidian/95 shadow-[0_0_70px_rgba(118,185,0,0.3)] relative overflow-hidden">
              {/* Windows 11 Fluent Cyber Titlebar Header */}
              <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-black/70 rounded-xl border border-white/10 mb-2.5 sm:mb-3 font-mono text-[11px]">
                <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-neon-green/10 border border-neon-green/40 flex items-center justify-center p-0.5 shrink-0 shadow-[0_0_10px_rgba(118,185,0,0.4)] overflow-hidden">
                      <img src="/logo.png" alt="Mission Control Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-gray-200 font-bold tracking-wider text-[11px] sm:text-xs truncate">
                      MISSION CONTROL v{appVersion} <span className="hidden sm:inline">— TACTICAL STATION</span>
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-neon-green font-bold text-[10px] bg-neon-green/10 border border-neon-green/30 px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse shrink-0 shadow-[0_0_8px_rgba(118,185,0,0.8)]" />
                    <span>CUDA ENGINE: 165 FPS</span>
                  </div>
                </div>
              </div>

              {/* Main App Showcase Image with 3K HD Zoom Modal Trigger */}
              <div
                onClick={() => setIsZoomModalOpen(true)}
                className="relative rounded-2xl overflow-hidden border border-white/15 group select-none cursor-pointer shadow-2xl"
              >
                <img
                  src="/screenshots/dashboard.webp"
                  alt="Mission Control Tactical Interface"
                  className="w-full h-auto object-cover rounded-2xl upscale-crisp group-hover:scale-[1.02] transition-transform duration-700"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 font-mono text-xs font-bold text-neon-green bg-black/70 backdrop-blur-xs">
                  <Maximize2 className="w-4 h-4 animate-bounce" />
                  <span>CLICK TO INSPECT FULL 3K HD INTERFACE</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Full-Resolution 3K HD Screenshot Lightbox Modal */}
      <AnimatePresence>
        {isZoomModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center cursor-zoom-out select-none"
          >
            <div className="relative max-w-7xl w-full max-h-[92vh] overflow-auto glass-card p-2 border-neon-green/40 shadow-[0_0_50px_rgba(118,185,0,0.3)]">
              <button
                onClick={() => setIsZoomModalOpen(false)}
                className="absolute top-4 right-4 z-10 bg-obsidian/90 border border-neon-green/50 text-neon-green p-2 rounded-full hover:bg-neon-green hover:text-obsidian transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src="/screenshots/dashboard.webp"
                alt="Mission Control Full 3K HD Interface"
                className="w-full h-auto rounded-lg object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
