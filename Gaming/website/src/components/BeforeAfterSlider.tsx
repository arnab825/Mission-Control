"use client";

import { useState, useRef } from "react";
import { MoveHorizontal } from "lucide-react";

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
      {/* Text Overview */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10">
          <span className="text-neon-green text-xs font-bold font-mono tracking-wider uppercase">Architecture Evolution</span>
        </div>
        <h3 className="text-3xl font-black font-display uppercase tracking-tight text-white">
          FROM PROTOTYPE TO <span className="text-neon-green glow-text-teal">PRODUCTION</span>
        </h3>
        <div className="space-y-4 font-mono text-sm">
          <div className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gray-500" />
            <h4 className="font-bold text-gray-300 mb-2">BEFORE (V1)</h4>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              Built entirely in Python. The backend telemetry logic and frontend UI were tightly coupled using basic Python GUI libraries. This resulted in rigid design limitations, higher latency, and standard visuals.
            </p>
          </div>
          <div className="p-4 sm:p-5 rounded-xl bg-neon-green/5 border border-neon-green/30 relative overflow-hidden shadow-[0_0_30px_rgba(118,185,0,0.05)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-neon-green shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
            <h4 className="font-bold text-neon-green mb-2">AFTER (V2 NEXT-GEN)</h4>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
              A decoupled hardware powerhouse. We now use a high-performance Python + Electron backend for native hardware-level telemetry, paired with a stunning, hardware-accelerated Next.js frontend for maximum visual fidelity and zero game impact.
            </p>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="w-full lg:w-2/3">
        <div 
          ref={containerRef}
          className="relative w-full aspect-[16/10] sm:aspect-video rounded-[16px] sm:rounded-[24px] overflow-hidden cursor-ew-resize group select-none shadow-2xl border border-white/10 bg-obsidian"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          {/* After Image (Background) */}
          <div className="absolute inset-0">
             <img src="/screenshots/after.png" alt="After: Next.js + Electron" className="w-full h-full object-cover" />
             <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-neon-green text-obsidian px-3 py-1.5 rounded-full font-mono text-[10px] sm:text-xs font-bold shadow-[0_0_15px_rgba(118,185,0,0.4)]">
               AFTER (NEXT.JS + ELECTRON)
             </div>
          </div>
          
          {/* Before Image (Foreground, Clipped) */}
          <div 
            className="absolute inset-0 border-r-2 border-white/80 z-10"
            style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
          >
             <img src="/screenshots/before.png" alt="Before: Python GUI" className="w-full h-full object-cover grayscale-[20%]" />
             <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-gray-800/90 text-white px-3 py-1.5 rounded-full font-mono text-[10px] sm:text-xs font-bold backdrop-blur-sm border border-white/10">
               BEFORE (PYTHON ONLY)
             </div>
          </div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_20px_rgba(255,255,255,0.8)] z-20"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white text-obsidian rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <MoveHorizontal className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <span className="text-gray-500 font-mono text-xs uppercase tracking-widest animate-pulse">Drag to compare</span>
        </div>
      </div>
    </div>
  );
}
