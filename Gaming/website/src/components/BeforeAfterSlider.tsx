"use client";

import { useState, useRef } from "react";
import { MoveHorizontal, Zap, Cpu, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import beforeImg from "../../public/screenshots/before.png";
import afterImg from "../../public/screenshots/after.png";

export function BeforeAfterSlider() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
      {/* Text Overview & Metrics Comparison */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-neon-green" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-wider uppercase">ARCHITECTURE EVOLUTION</span>
        </div>

        <h3 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-white leading-tight">
          FROM PROTOTYPE TO <span className="text-neon-green glow-text-teal">PRODUCTION</span>
        </h3>

        <div className="space-y-4 font-mono text-xs sm:text-sm">
          {/* BEFORE CARD */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 relative overflow-hidden backdrop-blur-sm group hover:border-white/20 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-500/80" />
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-300 text-sm font-display tracking-wider">BEFORE (V1 PROTOTYPE)</h4>
              <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded border border-white/10">MONOLITHIC</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-3 font-sans">
              Tightly-coupled Python GUI architecture with basic thread polling, rigid layout constraints, and 30 FPS UI latency.
            </p>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 pt-2 border-t border-white/10">
              <div><span className="block text-gray-500 text-[9px]">UI FPS:</span> <span className="font-bold text-gray-300">30 FPS</span></div>
              <div><span className="block text-gray-500 text-[9px]">LATENCY:</span> <span className="font-bold text-gray-300">120 ms</span></div>
              <div><span className="block text-gray-500 text-[9px]">COUPLING:</span> <span className="font-bold text-gray-300">High</span></div>
            </div>
          </div>

          {/* AFTER CARD */}
          <div className="p-5 rounded-2xl bg-neon-green/[0.04] border border-neon-green/40 relative overflow-hidden backdrop-blur-sm shadow-[0_0_30px_rgba(118,185,0,0.1)] group hover:border-neon-green/70 transition-all">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-neon-green shadow-[0_0_15px_rgba(118,185,0,0.8)]" />
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-neon-green text-sm font-display tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-neon-green" /> AFTER (V2 NEXT-GEN)
              </h4>
              <span className="text-[10px] bg-neon-green/20 text-neon-green px-2.5 py-0.5 rounded-full border border-neon-green/40 font-bold">DECOUPLED</span>
            </div>
            <p className="text-gray-200 text-xs leading-relaxed mb-3 font-sans">
              Decoupled native FastAPI/Python backend for zero CPU bottleneck, paired with a hardware-accelerated Next.js + Electron UI.
            </p>
            <div className="grid grid-cols-3 gap-2 text-[10px] pt-2 border-t border-neon-green/20">
              <div><span className="block text-gray-400 text-[9px]">UI FPS:</span> <span className="font-bold text-neon-green text-xs">165+ FPS</span></div>
              <div><span className="block text-gray-400 text-[9px]">LATENCY:</span> <span className="font-bold text-neon-yellow text-xs">0.8 ms</span></div>
              <div><span className="block text-gray-400 text-[9px]">OVERHEAD:</span> <span className="font-bold text-white text-xs">0% CPU</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Slider Frame */}
      <div className="w-full lg:w-2/3 pt-2 sm:pt-4">
        {/* Dedicated Header Bar for Status Badges - Clean Non-Cutoff Display */}
        <div className="flex items-center justify-between mb-4 px-1 font-mono text-[10px] sm:text-xs overflow-visible">
          <div className="flex items-center gap-2 bg-obsidian/90 text-gray-300 px-3.5 py-1.5 rounded-full border border-white/20 shadow-md">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span>BEFORE (PYTHON GUI PROTOTYPE)</span>
          </div>

          <div className="flex items-center gap-2 bg-obsidian/90 text-neon-green px-3.5 py-1.5 rounded-full border border-neon-green/40 shadow-[0_0_15px_rgba(118,185,0,0.2)] font-bold">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
            <span>AFTER (NEXT.JS + ELECTRON)</span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative w-full aspect-[16/10] sm:aspect-video rounded-[24px] sm:rounded-[32px] overflow-hidden cursor-ew-resize group select-none shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-neon-green/30 bg-obsidian"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          {/* After Image (Background - Zoomed out uncropped view) */}
          <div className="absolute inset-0 p-3 sm:p-5 flex items-center justify-center bg-[#0a0a0c]">
            <img src={afterImg.src} alt="After: Next.js + Electron" className="w-full h-full object-contain max-h-full max-w-full rounded-xl" />
          </div>

          {/* Before Image (Foreground, Clipped - Zoomed out uncropped view) */}
          <div
            className="absolute inset-0 border-r-2 border-neon-green z-10 p-3 sm:p-5 flex items-center justify-center overflow-hidden bg-[#0a0a0c]"
            style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
          >
            <img src={beforeImg.src} alt="Before: Python GUI" className="w-full h-full object-contain max-h-full max-w-full rounded-xl grayscale-[15%]" />
          </div>

          {/* Slider Handle Divider */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-neon-green cursor-ew-resize shadow-[0_0_20px_rgba(118,185,0,0.9)] z-20"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-neon-green text-obsidian rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_30px_rgba(118,185,0,0.8)] group-hover:scale-110 transition-transform">
              <MoveHorizontal className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <span className="text-neon-green font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
            <span>‹ SLIDE HORIZONTALLY TO COMPARE ARCHITECTURE EVOLUTION ›</span>
          </span>
        </div>
      </div>
    </div>
  );
}
