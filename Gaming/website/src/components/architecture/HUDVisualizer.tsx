"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function HUDVisualizer() {
  return (
    <div className="w-full h-56 bg-obsidian/95 border border-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-between p-4 font-mono select-none">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/images/gaming-hud-bg.jpg')" }}
      />
      <div className="absolute inset-0 border border-white/5 bg-radial-gradient from-transparent to-black/80 pointer-events-none" />

      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-neon-green/40" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-neon-green/40" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-neon-green/40" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-neon-green/40" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-12 h-12 border border-dashed border-neon-green/30 rounded-full flex items-center justify-center animate-spin"
          style={{ animationDuration: "12s" }}
        />
        <div className="absolute w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_6px_rgba(118,185,0,0.8)]" />
      </div>

      <div className="flex justify-between items-start z-10">
        <div className="space-y-1">
          <div className="text-[10px] text-gray-400">TARGET: APEX_LEGENDS.EXE</div>
          <div className="text-[9px] text-neon-green bg-neon-green/10 border border-neon-green/20 rounded px-1.5 py-0.5 inline-block font-bold">
            HOOKED_DX12_PRESENT
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-base font-black text-white">165.4 FPS</div>
          <div className="text-[9px] text-gray-500">FRAME TIME: 6.04 ms</div>
        </div>
      </div>

      <div className="z-10 bg-black/40 border border-white/10 rounded-xl p-2.5 max-w-[200px] shadow-lg backdrop-blur-sm self-start mb-1 text-[9px] space-y-1.5">
        <div className="flex items-center gap-1.5 text-white/80 font-bold border-b border-white/5 pb-1">
          <Sparkles className="w-3 h-3 text-neon-green" /> TACTICAL COMPANION
        </div>
        <div className="text-gray-300 leading-relaxed">
          &quot;Enemy approaching. Purging standby VRAM memory page cache.&quot;
        </div>
        <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
          <div className="bg-neon-green h-full w-[80%] shadow-[0_0_6px_#76b900]" />
        </div>
      </div>

      <div className="flex justify-between items-center z-10 text-[9px] text-gray-500 pt-1.5 border-t border-white/5">
        <span>Swapchain Composite: 0.8ms delay</span>
        <span>Reflex Low Latency: ACTIVE</span>
      </div>
    </div>
  );
}
