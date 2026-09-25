"use client";

import { motion } from "framer-motion";

export function PerformanceComparisonSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 mx-auto"
    >
      <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
          REPLACE THE <span className="text-neon-green glow-text-teal">BLOATWARE</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
          Standard game launchers consume hundreds of megabytes of RAM and harvest user telemetry. See how Mission Control stacks up.
        </p>
      </div>

      {/* Comparison Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Bloated Launchers */}
        <div className="glass-card p-6 sm:p-8 border-red-500/30 bg-red-950/6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h3 className="text-2xl font-bold text-white font-display">Standard Launchers</h3>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mt-1">Chromium &amp; Webview Wrappers</p>
            </div>
            <span className="px-3.5 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-mono font-bold uppercase">
              Heavy Overhead
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-400">RAM Footprint</span>
                <span className="text-red-400 font-bold">1,200 MB+</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-red-500 h-full w-[85%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-400">Background Telemetry</span>
                <span className="text-red-400 font-bold">Active Cloud Mining</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-red-500 h-full w-[75%]" />
              </div>
            </div>

            <ul className="pt-4 border-t border-white/10 space-y-3 text-xs sm:text-sm text-gray-400 font-sans">
              <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Constant cloud connectivity requirement</li>
              <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Intrusive popups &amp; auto-play store ads</li>
              <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Frame stutters during background sync</li>
            </ul>
          </div>
        </div>

        {/* Mission Control System */}
        <div className="glass-card p-6 sm:p-8 border-neon-green/50 bg-neon-green/3 relative overflow-hidden shadow-[0_0_40px_rgba(118,185,0,0.15)]">
          <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[10px] font-mono font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
            OPTIMIZED ENGINE
          </div>

          <div className="flex items-center justify-between mb-6 mt-2 sm:mt-0">
            <div>
              <h3 className="text-2xl font-bold text-white font-display">Mission Control</h3>
              <p className="text-xs font-mono text-neon-green uppercase tracking-wider mt-1">Native C++ &amp; PyTorch CUDA</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-300 font-medium">RAM Footprint</span>
                <span className="text-neon-green font-bold glow-text-teal">45 MB</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-neon-green h-full w-[10%] shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-300 font-medium">Telemetry Privacy</span>
                <span className="text-neon-green font-bold glow-text-teal">100% Offline Local Sandbox</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-neon-green h-full w-full shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
              </div>
            </div>

            <ul className="pt-4 border-t border-white/10 space-y-3 text-xs sm:text-sm text-gray-200 font-sans">
              <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Zero cloud dependency (Local CUDA models)</li>
              <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Startup time under 180ms</li>
              <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Autonomous PyTorch standby VRAM purge</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
