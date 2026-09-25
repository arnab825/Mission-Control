"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, CheckCircle2 } from "lucide-react";

export type HudTab = "horizontal" | "compact" | "standard";

export function InteractiveHudSection() {
  const [activeHudTab, setActiveHudTab] = useState<HudTab>("standard");

  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 mx-auto"
    >
      <div className="glass-panel p-4 sm:p-8 lg:p-16 rounded-2xl sm:rounded-[36px] border-neon-green/40 bg-obsidian/95 relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          <div className="lg:col-span-5 space-y-5 sm:space-y-6 w-full">
            <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-3.5 py-1.5 bg-neon-green/10">
              <Radio className="w-4 h-4 text-neon-green animate-pulse shrink-0" />
              <span className="text-neon-green text-[11px] sm:text-xs font-bold font-mono tracking-widest uppercase">
                HUD ARCHITECTURE
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display uppercase tracking-tight text-white leading-tight">
              IMMERSIVE <span className="text-neon-green glow-text-teal">IN-GAME</span> OVERLAY
            </h2>

            <p className="text-gray-300 text-xs sm:text-base leading-relaxed font-sans">
              Mission Control injects a transparent heads-up display. Summon real-time tactical advice, monitor thermals, or launch system macros without leaving your game.
            </p>

            {/* Dynamic HUD Mode Tabs */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1.5 bg-obsidian/90 border border-white/10 rounded-2xl font-mono text-[10px] sm:text-xs w-full shadow-inner">
              {(["horizontal", "compact", "standard"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveHudTab(tab)}
                  className={`w-full py-2.5 px-1 sm:px-3 rounded-xl font-bold uppercase transition-all cursor-pointer truncate text-center ${
                    activeHudTab === tab
                      ? "btn-premium-primary shadow-[0_0_20px_rgba(118,185,0,0.5)] scale-[1.02]"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-2 font-sans">
              {[
                { title: "Zero Frame Loss", desc: "Native DirectX 12 & Vulkan swapchain hook rendering." },
                { title: "Customizable Transparency", desc: "Adjust position, opacity, scale, and color profiles." },
                { title: "Hotkeys & Voice Triggers", desc: "Bind macros to key combinations or voice phrases." },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-neon-green/10 border border-neon-green/40 flex items-center justify-center text-neon-green shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm sm:text-base">{item.title}</div>
                    <div className="text-gray-400 text-xs sm:text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic HUD Showcase Frame */}
          <div className="lg:col-span-7 relative flex flex-col items-center justify-center min-h-95 sm:min-h-110 w-full">
            <div className="w-full bg-[#07080c] border border-white/15 rounded-3xl p-4 sm:p-8 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center">
              {/* Subtle Ambient Backlight Glow */}
              <div className="absolute inset-0 bg-linear-to-tr from-neon-green/10 via-transparent to-emerald-500/5 pointer-events-none" />
              <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
              <div className="absolute inset-0 scanline-effect opacity-20 pointer-events-none" />

              {/* Header Window Title Bar */}
              <div className="w-full flex items-center justify-between px-3.5 py-2 bg-black/60 rounded-xl border border-white/10 mb-6 font-mono text-xs z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neon-green animate-pulse" />
                  <span className="text-white font-bold uppercase tracking-wider text-[11px]">
                    OVERLAY PREVIEW &gt; {activeHudTab} LAYOUT
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest hidden sm:inline">
                  TRANSPARENT HUD HOOK
                </span>
              </div>

              {/* Dynamic Content Frame per HUD layout */}
              <div className="w-full flex-1 flex items-center justify-center py-2 relative z-10">
                <AnimatePresence mode="wait">
                  {activeHudTab === "horizontal" && (
                    <motion.div
                      key="horizontal"
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.96 }}
                      transition={{ duration: 0.3 }}
                      className="w-full flex flex-col items-center gap-4"
                    >
                      <div className="w-full max-w-2xl bg-black/80 p-3 sm:p-4 rounded-2xl border border-neon-green/40 shadow-[0_0_30px_rgba(118,185,0,0.25)] overflow-hidden">
                        <img
                          src="/screenshots/hud_horizontal.webp"
                          alt="Horizontal HUD Overlay Layout"
                          className="w-full h-auto object-contain rounded-lg filter drop-shadow-[0_0_10px_rgba(118,185,0,0.4)]"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-gray-400 font-mono text-[10px] sm:text-[11px]">
                        <span className="text-neon-green font-bold flex items-center gap-1">
                          ✓ Top-Bar Format
                        </span>
                        <span>•</span>
                        <span>System Metrics &amp; Temperatures</span>
                      </div>
                    </motion.div>
                  )}

                  {activeHudTab === "compact" && (
                    <motion.div
                      key="compact"
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.96 }}
                      transition={{ duration: 0.3 }}
                      className="w-full flex flex-col items-center gap-4"
                    >
                      <div className="bg-black/80 p-3 sm:p-4 rounded-2xl border border-neon-green/40 shadow-[0_0_30px_rgba(118,185,0,0.25)] overflow-hidden max-w-70">
                        <img
                          src="/screenshots/hud_compact.webp"
                          alt="Compact HUD Overlay Layout"
                          className="w-full h-auto object-contain rounded-lg filter drop-shadow-[0_0_10px_rgba(118,185,0,0.4)]"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-gray-400 font-mono text-[10px] sm:text-[11px]">
                        <span className="text-neon-green font-bold flex items-center gap-1">
                          ✓ Minimal Corner Widget
                        </span>
                        <span>•</span>
                        <span>Zero Screen Clutter</span>
                      </div>
                    </motion.div>
                  )}

                  {activeHudTab === "standard" && (
                    <motion.div
                      key="standard"
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.96 }}
                      transition={{ duration: 0.3 }}
                      className="w-full flex flex-col items-center gap-4"
                    >
                      <div className="bg-black/80 p-3 sm:p-4 rounded-2xl border border-neon-green/40 shadow-[0_0_30px_rgba(118,185,0,0.25)] overflow-hidden max-w-85">
                        <img
                          src="/screenshots/hud_standard.webp"
                          alt="Standard HUD Overlay Layout"
                          className="w-full h-auto object-contain rounded-lg filter drop-shadow-[0_0_10px_rgba(118,185,0,0.4)]"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-gray-400 font-mono text-[10px] sm:text-[11px]">
                        <span className="text-neon-green font-bold flex items-center gap-1">
                          ✓ Complete Telemetry Suite
                        </span>
                        <span>•</span>
                        <span>Tactical AI Logs</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
