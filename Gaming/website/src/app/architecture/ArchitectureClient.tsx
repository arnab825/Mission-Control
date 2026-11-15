"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  Cpu,
  Layers,
  Terminal,
  Radio,
  Sliders,
  Sparkles,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TelemetryVisualizer,
  AIVisualizer,
  HUDVisualizer,
  TerminalVisualizer,
  ICONS,
  type ComponentData,
} from "@/components/architecture";

const VISUALIZERS: Record<string, React.ReactNode> = {
  "parallel-hardware": <TelemetryVisualizer />,
  "nim-core": <AIVisualizer />,
  "directx-presentation": <HUDVisualizer />,
  "process-watcher": <TerminalVisualizer />,
};

export default function ArchitectureClient({ components }: { components: ComponentData[] }) {
  const [activeModule, setActiveModule] = useState(components[0]?.id || "parallel-hardware");
  const pathname = usePathname();

  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace("#", "");
      if (hash && components.some((c) => c.id === hash)) {
        setActiveModule(hash);
      }
    };

    handleHashChange();
    const timer = setTimeout(handleHashChange, 100);

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [pathname, components]);

  const activeModuleData = components.find((c) => c.id === activeModule) || components[0];
  if (!activeModuleData) return null;

  const ActiveIcon = ICONS[activeModuleData.iconName] || Activity;
  const activeVisualizer = VISUALIZERS[activeModuleData.id] || <TelemetryVisualizer />;

  return (
    <div className="min-h-screen pt-24 sm:pt-28 pb-24 px-4 sm:px-6 max-w-6xl mx-auto w-full relative z-10 bg-[#0a0a0c] overflow-x-hidden">
      {/* Cyber Grid & Ambient Radial Glows */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-green/10 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 sm:mb-14 max-w-4xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 border border-neon-green/40 rounded-full px-4 py-1.5 bg-neon-green/10 mb-5 backdrop-blur-md shadow-[0_0_20px_rgba(118,185,0,0.2)]">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
            HARDWARE & NEURAL PIPELINE
          </span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight mb-4 uppercase text-white leading-tight">
          SYSTEM <span className="text-neon-green glow-text-teal">ARCHITECTURE</span>
        </h1>
        <p className="text-gray-300 text-xs sm:text-base leading-relaxed max-w-2xl mx-auto font-mono mb-8">
          Explore the low-level telemetry monitoring daemons, quantized neural compilers, and
          swapchain overlay presentation hooks that make up the Mission Control core.
        </p>

        {/* Sub-Millisecond Dataflow Pipeline Banner */}
        <div className="hidden sm:flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 font-mono text-[10px] sm:text-xs text-gray-400 backdrop-blur-md max-w-3xl mx-auto shadow-lg">
          <div className="flex items-center gap-2 text-neon-green font-bold">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
            <span>01 TELEMETRY HAL</span>
          </div>
          <span className="text-neon-green/50">➔</span>
          <div className="flex items-center gap-2 text-white font-bold">
            <Cpu className="w-3.5 h-3.5 text-neon-yellow" />
            <span>02 LOCAL TENSORRT</span>
          </div>
          <span className="text-neon-green/50">➔</span>
          <div className="flex items-center gap-2 text-white font-bold">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>03 SWAPCHAIN OVERLAY</span>
          </div>
          <span className="text-neon-green/50">➔</span>
          <div className="flex items-center gap-2 text-neon-green font-bold">
            <Terminal className="w-3.5 h-3.5 text-neon-green" />
            <span>04 AGENTIC DAEMON</span>
          </div>
        </div>
      </motion.div>

      {/* Main Split-Pane Interactive Visualizer Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        {/* Left Side: Modular Selector Tabs List (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="text-xs uppercase font-mono tracking-wider font-bold text-neon-green/80 mb-1 flex items-center gap-2 pl-1">
            <Workflow className="w-4 h-4 text-neon-green" /> Core System Layers
          </div>

          {components.map((comp) => {
            const CompIcon = ICONS[comp.iconName] || Activity;
            const isSelected = activeModule === comp.id;

            return (
              <button
                key={comp.id}
                id={comp.id}
                onClick={() => {
                  setActiveModule(comp.id);
                  if (typeof window !== "undefined") {
                    window.history.replaceState(null, "", `#${comp.id}`);
                  }
                }}
                className={`w-full text-left glass-card p-5 relative overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col rounded-2xl ${
                  isSelected
                    ? "border-neon-green/60 bg-neon-green/[0.06] shadow-[0_0_30px_rgba(118,185,0,0.2)]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {/* Top Row: Icon + Title info */}
                <div className="flex gap-4 items-center w-full">
                  {/* Visual active indicator bar on the left */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-neon-green shadow-[0_0_12px_#76b900] rounded-r" />
                  )}

                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isSelected
                        ? "bg-neon-green text-obsidian shadow-[0_0_20px_rgba(118,185,0,0.4)] stroke-[2.5]"
                        : "bg-white/5 text-gray-300 border border-white/10"
                    }`}
                  >
                    <CompIcon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-baseline mb-1">
                      <span
                        className={`text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider ${
                          isSelected ? "text-neon-green" : "text-gray-400"
                        }`}
                      >
                        Layer {comp.num}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1.5 text-[8px] font-mono font-bold bg-neon-green/20 text-neon-green border border-neon-green/40 rounded-full px-2 py-0.5 uppercase tracking-widest animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-green" /> ACTIVE
                        </span>
                      )}
                    </div>
                    <h3
                      className={`text-sm sm:text-base font-bold font-display uppercase tracking-wider transition-colors duration-250 leading-tight text-white`}
                    >
                      {comp.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono uppercase mt-0.5 leading-snug">
                      {comp.subTitle}
                    </p>
                  </div>

                  {/* Background Large Number Overlay */}
                  <div
                    className={`absolute bottom-[-15px] right-2 text-6xl font-display font-black select-none pointer-events-none transition-colors duration-300 ${
                      isSelected ? "text-neon-green/[0.06]" : "text-white/[0.02]"
                    }`}
                  >
                    {comp.num}
                  </div>
                </div>

                {/* Mobile Inline Content Expansion */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="lg:hidden mt-4 pt-4 border-t border-white/10 space-y-4 text-left w-full cursor-default overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-full">
                        {VISUALIZERS[comp.id] || <TelemetryVisualizer />}
                      </div>

                      <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-sans normal-case tracking-normal">
                        {comp.desc}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {comp.specs.map((spec, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-obsidian/90 p-3 rounded-xl border border-neon-green/20 font-mono"
                          >
                            <div className="text-gray-400 text-[8px] uppercase tracking-wider mb-0.5">
                              {spec.label}
                            </div>
                            <div className="text-neon-green font-bold text-xs">{spec.val}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {/* Right Side: Telemetry HUD Visualizer Screen (7 Columns) */}
        <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-28 space-y-6">
          <div className="text-xs uppercase font-mono tracking-wider font-bold text-neon-green/80 mb-1 flex items-center justify-between pl-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neon-green" /> Live Diagnostics Visualizer
            </div>
            <span className="text-[10px] text-gray-500 font-normal">REFRESH: 60 FPS</span>
          </div>

          <div className="glass-panel border-neon-green/30 rounded-3xl overflow-hidden p-6 sm:p-8 bg-[#0d0f14]/95 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
            {/* Visualizer Frame Header Bar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/40 flex items-center justify-center text-neon-green shrink-0 shadow-[0_0_15px_rgba(118,185,0,0.2)]">
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-bold uppercase tracking-wider text-sm">
                    {activeModuleData.title}
                  </div>
                  <div className="text-[10px] text-neon-green uppercase mt-0.5 font-bold">
                    {activeModuleData.subTitle}
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0 bg-neon-green/10 border border-neon-green/30 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
                <span className="text-[9px] text-neon-green font-bold uppercase tracking-wider">
                  System Link: OK
                </span>
              </div>
            </div>

            {/* Dynamic Rendering Sub-Visualizer */}
            <div className="mb-6 relative z-10 transition-all duration-300">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {activeVisualizer}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Module Description details */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neon-green flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-neon-green" /> Module Operations & Pipeline
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed font-sans">
                {activeModuleData.desc}
              </p>

              {/* Badges specifications grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-white/10">
                {activeModuleData.specs.map((spec, sIdx) => (
                  <div
                    key={sIdx}
                    className="bg-obsidian/90 p-3.5 rounded-xl border border-neon-green/20 font-mono shadow-inner"
                  >
                    <div className="text-gray-400 text-[9px] uppercase tracking-wider mb-1 font-semibold">
                      {spec.label}
                    </div>
                    <div className="text-neon-green font-bold text-xs">{spec.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagonal corner glow indicator */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-neon-green/10 rounded-tl-full blur-2xl pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Verification / Security Architecture Summary */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mt-24 border-t border-white/10 pt-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Motherboard UUID Binding",
              icon: ShieldCheck,
              desc: "Telemetry logs and configuration profiles are encrypted locally and bound directly to physical motherboard UUID keys to prevent telemetry hijacking or falsification.",
            },
            {
              title: "Real-time Priority Threads",
              icon: Sliders,
              desc: "The watcher daemon operates on realtime system priority classes, suspending background Electron window cycles during gameplay to reclaim raw CPU threads.",
            },
            {
              title: "Quantized Local Inference",
              icon: Cpu,
              desc: "By native execution of FP16 and INT8 weight structures compiled specifically for local CUDA cores, prompt evaluation latency stays under 15ms.",
            },
          ].map((item, idx) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={idx}
                className="glass-card p-6 border-white/10 hover:border-neon-green/50 hover:bg-neon-green/[0.03] transition-all duration-300 relative group overflow-hidden rounded-2xl shadow-lg"
              >
                <div className="w-11 h-11 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green group-hover:bg-neon-green group-hover:text-obsidian transition-colors mb-4 shrink-0 shadow-[0_0_15px_rgba(118,185,0,0.15)]">
                  <ItemIcon className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-lg font-bold text-white font-display uppercase mb-2 group-hover:text-neon-green transition-colors">
                  {item.title}
                </h4>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-sans">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
