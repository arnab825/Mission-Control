"use client";

import { Download, Sliders, Monitor, Cpu, Gauge, HardDrive, Zap, Sparkles } from "lucide-react";
import {
  WINDOWS_INSTALLER_URL,
  WINDOWS_MSI_URL,
  WINDOWS_ZIP_URL,
  LINUX_INSTALLER_URL,
  LINUX_APPIMAGE_URL,
  LINUX_DEB_URL,
  LINUX_TAR_URL,
} from "@/lib/download";

export function DownloadSection() {
  return (
    <section id="download" className="w-full max-w-5xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 text-center mx-auto">
      <div className="mb-12">
        <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">DEPLOYMENT PACKAGES</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-3 font-display uppercase tracking-tight text-white">
          READY TO <span className="text-neon-green glow-text-teal">ENGAGE?</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-base font-sans">Select your deployment platform package below.</p>
      </div>

      {/* OS Download Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-12 sm:mb-16">
        {/* Windows Build */}
        <div className="glass-card p-5 sm:p-8 md:p-10 border-gradient-cyber flex flex-col justify-between group text-left relative overflow-hidden shadow-[0_0_40px_rgba(118,185,0,0.18)] rounded-2xl sm:rounded-3xl">
          <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[9px] sm:text-[10px] font-mono font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-wider shadow-md">
            STABLE BUILD
          </div>
          <div>
            <h3 className="text-xl sm:text-3xl font-black text-white mb-1 font-display">Windows Deployment</h3>
            <p className="text-gray-400 text-xs sm:text-sm font-mono mb-4 sm:mb-7">Windows 10 / 11 64-bit (.exe)</p>
          </div>
          <a
            href={WINDOWS_INSTALLER_URL}
            className="w-full btn-premium-primary px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 font-mono shadow-[0_0_30px_rgba(118,185,0,0.5)] text-center mb-3 sm:mb-4 cursor-pointer group"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:translate-y-0.5" />
            <span>Download for Windows</span>
          </a>
          <div className="flex justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-mono">
            <a href={WINDOWS_MSI_URL} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-neon-green/50 text-gray-300 hover:text-neon-green transition-all flex items-center gap-1.5 shadow-xs">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neon-green" /> MSI Installer
            </a>
            <a href={WINDOWS_ZIP_URL} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-neon-green/50 text-gray-300 hover:text-neon-green transition-all flex items-center gap-1.5 shadow-xs">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neon-green" /> Portable ZIP
            </a>
          </div>
        </div>

        {/* Linux Build */}
        <div className="glass-card p-5 sm:p-8 md:p-10 border-gradient-cyan flex flex-col justify-between group text-left relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.18)] rounded-2xl sm:rounded-3xl">
          <div className="absolute top-0 right-0 bg-cyan-400 text-obsidian text-[9px] sm:text-[10px] font-mono font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-wider shadow-md">
            STABLE BUILD
          </div>
          <div>
            <h3 className="text-xl sm:text-3xl font-black text-white mb-1 font-display">Linux Deployment</h3>
            <p className="text-gray-400 text-xs sm:text-sm font-mono mb-4 sm:mb-7">Ubuntu / Debian / Fedora / Arch (.tar.gz / .AppImage)</p>
          </div>
          <a
            href={LINUX_INSTALLER_URL}
            className="w-full btn-premium-cyan px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 font-mono shadow-[0_0_30px_rgba(6,182,212,0.4)] text-center mb-3 sm:mb-4 cursor-pointer group"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:translate-y-0.5" />
            <span>Download for Linux</span>
          </a>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono">
            <a href={LINUX_TAR_URL} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/50 text-gray-300 hover:text-cyan-400 transition-all flex items-center gap-1.5 shadow-xs">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> .TAR.GZ
            </a>
            <a href={LINUX_APPIMAGE_URL} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/50 text-gray-300 hover:text-cyan-400 transition-all flex items-center gap-1.5 shadow-xs">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> AppImage
            </a>
            <a href={LINUX_DEB_URL} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/50 text-gray-300 hover:text-cyan-400 transition-all flex items-center gap-1.5 shadow-xs">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> .DEB
            </a>
          </div>
        </div>
      </div>

      {/* Hardware Specifications */}
      <div className="text-left w-full max-w-4xl mx-auto">
        <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 font-display border-b border-white/10 pb-4 uppercase tracking-wider text-white flex items-center gap-3">
          <Sliders className="w-5 h-5 text-neon-green shrink-0" />
          HARDWARE SPECIFICATIONS MATRIX
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="glass-card p-6 sm:p-8 border-white/10">
            <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-300 font-display flex items-center gap-2">
              <Sliders className="w-4 h-4 text-gray-400" /> Minimum Requirements
            </h4>
            <ul className="space-y-4 text-xs sm:text-sm text-gray-400 font-mono">
              <li className="flex items-center justify-between border-b border-white/5 pb-3 gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-400 shrink-0" /> OS:
                </span>
                <span>Windows 10 / Ubuntu 22.04+ (64-bit)</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-3 gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-400 shrink-0" /> GPU:
                </span>
                <span>NVIDIA GTX 1060 (6GB VRAM)</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-3 gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-gray-400 shrink-0" /> RAM:
                </span>
                <span>16 GB System RAM</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-400 shrink-0" /> Storage:
                </span>
                <span>4 GB NVMe SSD</span>
              </li>
            </ul>
          </div>

          <div className="glass-card p-6 sm:p-8 border-neon-green/40 bg-neon-green/2 relative overflow-hidden shadow-[0_0_30px_rgba(118,185,0,0.1)]">
            <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg uppercase shadow-md">
              RECOMMENDED
            </div>
            <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-neon-green font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neon-green" /> Recommended Specs
            </h4>
            <ul className="space-y-4 text-xs sm:text-sm text-gray-300 font-mono">
              <li className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-neon-green shrink-0" /> OS:
                </span>
                <span className="text-neon-green font-semibold">Windows 11 / Arch / Fedora (64-bit)</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-neon-green shrink-0" /> GPU:
                </span>
                <span className="text-neon-green font-semibold">NVIDIA RTX 2060+ (6GB+ VRAM)</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-neon-green shrink-0" /> RAM:
                </span>
                <span className="text-neon-green font-semibold">32 GB High-Speed RAM</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-white font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-neon-yellow shrink-0" /> Acceleration:
                </span>
                <span className="text-neon-yellow font-bold">TensorRT Enabled</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
