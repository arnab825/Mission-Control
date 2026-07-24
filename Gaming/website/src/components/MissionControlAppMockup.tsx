"use client";

import { motion } from "framer-motion";
import { 
  Activity, 
  BrainCircuit, 
  Cpu, 
  Bot, 
  Gamepad2, 
  Monitor, 
  Gauge, 
  RefreshCw, 
  Settings, 
  Search, 
  Wrench, 
  LogOut, 
  SlidersHorizontal,
  Layers,
  Zap,
  Terminal,
  CheckCircle2,
  HardDrive
} from "lucide-react";

interface MockupProps {
  className?: string;
  showWindowControls?: boolean;
}

export function MissionControlAppMockup({ className = "", showWindowControls = true }: MockupProps) {
  return (
    <div className={`w-full bg-[#08090d] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] text-white font-sans text-xs select-none ${className}`}>
      
      {/* App Window Header Bar */}
      <div className="bg-[#0c0d12] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green font-black text-[10px]">
            MC
          </div>
          <span className="font-mono text-xs font-black tracking-wider text-white">MISSION CONTROL</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-gray-300 flex items-center gap-1">
            <span>FRIENDLY</span>
            <SlidersHorizontal className="w-2.5 h-2.5 text-gray-400" />
          </div>
          <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-gray-300 flex items-center gap-1">
            <span>AGENT</span>
            <div className="w-2 h-2 rounded-full bg-neon-green" />
          </div>
          <div className="px-2.5 py-0.5 rounded bg-neon-green/10 border border-neon-green/30 text-[10px] font-mono font-bold text-neon-green">
            + SYNC
          </div>
          
          {showWindowControls && (
            <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-white/10">
              <button aria-label="button" type="button" className="px-2 py-0.5 text-gray-400 hover:text-white font-mono text-[10px]">HUD</button>
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            </div>
          )}
        </div>
      </div>

      {/* Main Desktop App Grid (Sidebar + Dashboard Body) */}
      <div className="flex flex-col md:flex-row min-h-[460px] bg-[#07080b]">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-52 bg-[#0a0b10] border-r border-white/5 p-3 flex flex-col justify-between shrink-0">
          
          {/* Sidebar Nav Section */}
          <div className="space-y-4">
            {/* Logo Header */}
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-6 h-6 rounded-lg bg-neon-green flex items-center justify-center text-obsidian font-black text-xs shadow-[0_0_12px_rgba(118,185,0,0.5)]">
                MC
              </div>
              <span className="font-display font-black text-sm text-white tracking-wider">MISSION CONTROL</span>
            </div>

            {/* Navigation Category */}
            <div>
              <div className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest px-2.5 mb-1.5">
                NAVIGATION
              </div>
              <nav className="space-y-0.5 font-mono text-[11px]">
                <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-white/10 text-neon-green font-bold border border-white/10">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </div>
                {[
                  { label: "Vision", icon: BrainCircuit },
                  { label: "Stability Lab", icon: Gauge },
                  { label: "Agent", icon: Bot },
                  { label: "Library", icon: Gamepad2 },
                  { label: "System", icon: Monitor },
                  { label: "Readiness", icon: CheckCircle2 },
                  { label: "Updates", icon: RefreshCw },
                  { label: "Settings", icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Authentication & Footer */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <div className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest px-2.5">
              AUTHENTICATION
            </div>

            <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center font-mono font-black text-neon-green text-xs shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-white truncate">ANIRUDHA BASU THAKUR</div>
                  <div className="text-[8px] font-mono text-neon-green flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    <span>ACTIVE</span>
                  </div>
                </div>
              </div>
              <LogOut className="w-3.5 h-3.5 text-gray-500 hover:text-white shrink-0 ml-1 cursor-pointer" />
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 px-1 pt-1">
              <span>MISSION CONTROL</span>
              <span className="text-neon-green font-bold">v2.3.7</span>
            </div>
          </div>

        </div>

        {/* Dashboard Main Content Area */}
        <div className="flex-1 p-4 md:p-6 space-y-5 overflow-x-hidden">
          
          {/* Top Title Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black font-display text-white tracking-wider uppercase">
                  MISSION CONTROL
                </h1>
                <span className="text-[9px] font-mono font-bold text-neon-green bg-neon-green/10 border border-neon-green/30 px-2 py-0.5 rounded-full">
                  STATUS: SYSTEM NOMINAL
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-neon-green tracking-widest uppercase">NEURAL LINK ACTIVE</span>
            </div>
          </div>

          {/* 4 Hardware Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* CPU */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-neon-green" />
                  <span>CPU</span>
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">51.1%</div>
              <div className="text-[9px] font-mono text-gray-400 truncate">
                CLOCK: 3.48 GHZ | TEMP: 83°C
              </div>
            </div>

            {/* GPU */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>GPU</span>
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">0%</div>
              <div className="text-[9px] font-mono text-gray-400 truncate">
                VRAM: 0/8151 MB | TEMP: 56°C
              </div>
            </div>

            {/* RAM */}
            <div className="bg-white/[0.03] border border-neon-green/30 rounded-2xl p-3.5 space-y-1.5 relative overflow-hidden">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neon-green" />
                  <span>RAM</span>
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">62.0%</div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-1 overflow-hidden">
                <div className="bg-gradient-to-r from-neon-green to-purple-500 h-full w-[62%]" />
              </div>
              <div className="text-[9px] font-mono text-gray-400 truncate">
                USED: 14.7/23.6 GB
              </div>
            </div>

            {/* DISK */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>DISK</span>
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">4.9%</div>
              <div className="text-[9px] font-mono text-gray-400 truncate">
                DRIVE: SAMSUNG MZVL81T0...
              </div>
            </div>

          </div>

          {/* Main Middle Split: Log Feed + Tactical Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* Left Log Stream Container */}
            <div className="lg:col-span-8 bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-neon-green" />
                  <span className="font-mono text-xs font-bold text-white">MISSION CONTROL</span>
                  <span className="text-[9px] font-mono text-neon-green bg-neon-green/10 border border-neon-green/30 px-1.5 py-0.5 rounded font-bold">
                    CORE SYNC
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-neon-green text-obsidian font-bold">ALL</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400">INFO</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400">WARN</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400">ERROR</span>
                </div>
              </div>

              {/* Log Messages Stream */}
              <div className="space-y-2 font-mono text-[10px]">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-neon-green shrink-0" />
                  <span className="text-gray-300">Server: Ready (process watcher enabled)</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-neon-green shrink-0" />
                  <span className="text-gray-300">[LibraryWatcher] Background library watcher started.</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-neon-green shrink-0" />
                  <span className="text-gray-300">Static hardware specs discovered via consolidated Windows query.</span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-neon-green shrink-0" />
                  <span className="text-gray-300">Static hardware specs cached successfully.</span>
                </div>
                <div className="p-2 rounded-xl bg-neon-green/[0.05] border border-neon-green/30 flex items-center gap-2.5 text-neon-green font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hardware profile synced — status nominal</span>
                </div>
              </div>
            </div>

            {/* Right Tactical Diagnostics Panel */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                TACTICAL DIAGNOSTICS
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button aria-label="button" type="button" className="py-2.5 px-3 bg-neon-green text-obsidian rounded-xl font-mono text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(118,185,0,0.3)]">
                  <Search className="w-3 h-3" />
                  <span>SCAN LIBRARY</span>
                </button>
                <button aria-label="button" type="button" className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/10">
                  <Wrench className="w-3 h-3 text-gray-400" />
                  <span>OPTIMIZE</span>
                </button>
              </div>

              {/* Live Telemetry Wave Graph */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 space-y-2">
                <div className="flex justify-between items-center text-[9px] font-mono text-gray-400">
                  <span className="font-bold text-white">LIVE TELEMETRY</span>
                  <span>LAST 20 TICKS</span>
                </div>

                {/* SVG Live Wave Chart */}
                <div className="h-20 w-full relative pt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M 0 30 Q 15 20, 30 25 T 60 15 T 90 28 L 100 20"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                    />
                    <path
                      d="M 0 35 Q 20 28, 40 32 T 70 20 T 95 35 L 100 15"
                      fill="none"
                      stroke="#76b900"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                <div className="flex justify-around text-[8px] font-mono text-gray-400 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> CPU %</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-neon-green" /> RAM %</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
