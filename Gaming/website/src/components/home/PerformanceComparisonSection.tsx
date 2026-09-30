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
          Standard game launchers consume hundreds of megabytes of RAM and harvest user telemetry.
          See how Mission Control stacks up.
        </p>
      </div>

      {/* Comparison Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Legacy Overlays & Bloated Launchers */}
        <div className="glass-card p-6 sm:p-8 border-red-500/30 bg-red-950/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h3 className="text-2xl font-bold text-white font-display">Legacy Overlays</h3>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mt-1">
                MSI Afterburner • RTSS • Discord / Steam Overlays
              </p>
            </div>
            <span className="px-3.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-mono font-bold uppercase">
              Static &amp; Obsolete
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-400">Tactical AI &amp; Game Intelligence</span>
                <span className="text-red-400 font-bold">0% (Pure Static Numbers)</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-red-500 h-full w-[0%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-400">VRAM Overhead &amp; Hooks</span>
                <span className="text-red-400 font-bold">Invasive D3D / Vulkan Injections</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-red-500 h-full w-[80%]" />
              </div>
            </div>

            <ul className="pt-4 border-t border-white/10 space-y-3 text-xs sm:text-sm text-gray-400 font-sans">
              <li className="flex items-center gap-2.5">
                <span className="text-red-500 font-bold shrink-0">✕</span> Zero AI coaching, voice
                control, or in-game vision
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-red-500 font-bold shrink-0">✕</span> Outdated 2000s Windows
                98/XP style interfaces
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-red-500 font-bold shrink-0">✕</span> Frequent anti-cheat flags
                and invasive hook crashes
              </li>
            </ul>
          </div>
        </div>

        {/* Mission Control System */}
        <div className="glass-card p-6 sm:p-8 border-neon-green/50 bg-neon-green/5 relative overflow-hidden shadow-[0_0_45px_rgba(118,185,0,0.2)]">
          <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[10px] font-mono font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest shadow-md">
            NEXT-GEN AI STATION
          </div>

          <div className="flex items-center justify-between mb-6 mt-2 sm:mt-0">
            <div>
              <h3 className="text-2xl font-bold text-white font-display">Mission Control</h3>
              <p className="text-xs font-mono text-neon-green uppercase tracking-wider mt-1">
                Pure TensorRT • C++ Direct Present • Agent Co-Pilot
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-300 font-medium">
                  Tactical AI &amp; Real-Time Coaching
                </span>
                <span className="text-neon-green font-bold glow-text-teal">
                  Sub-15ms Local CUDA Inference
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-neon-green h-full w-full shadow-[0_0_12px_rgba(118,185,0,0.9)]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                <span className="text-gray-300 font-medium">Safe Transparent Hooking</span>
                <span className="text-neon-green font-bold glow-text-teal">
                  Zero Anti-Cheat Bans (DXGI Duplicate)
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="bg-neon-green h-full w-full shadow-[0_0_12px_rgba(118,185,0,0.9)]" />
              </div>
            </div>

            <ul className="pt-4 border-t border-white/10 space-y-3 text-xs sm:text-sm text-gray-200 font-sans">
              <li className="flex items-center gap-2.5">
                <span className="text-neon-green font-black shrink-0">✓</span> Autonomous AI voice
                co-pilot with live patch notes &amp; RAG search
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-neon-green font-black shrink-0">✓</span> Cyberpunk
                glassmorphic HUD with custom font scaling &amp; metrics
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-neon-green font-black shrink-0">✓</span> Zero PyTorch VRAM
                penalty via pure NVIDIA TensorRT execution
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
