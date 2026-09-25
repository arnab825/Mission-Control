"use client";

import { Sparkles, Cpu, Flame, Layers, Zap, Crosshair, Radio, ExternalLink } from "lucide-react";

export const TECH_PARTNERS = [
  { name: "NVIDIA TensorRT", tag: "Local CUDA Engine", url: "https://developer.nvidia.com/tensorrt", icon: Cpu },
  { name: "PyTorch 2.4", tag: "Neural Inference", url: "https://pytorch.org/", icon: Flame },
  { name: "Electron Native", tag: "Hardware IPC", url: "https://www.electronjs.org/", icon: Layers },
  { name: "Next.js 16", tag: "Vite UI Engine", url: "https://nextjs.org/", icon: Zap },
  { name: "DirectX 12 Ultimate", tag: "Swapchain Injection", url: "https://devblogs.microsoft.com/directx/announcing-directx-12-ultimate/", icon: Crosshair },
  { name: "Vulkan 1.3", tag: "Zero Latency Hook", url: "https://www.vulkan.org/", icon: Radio },
];

export function TechPartnersTicker() {
  return (
    <div className="w-full bg-white/2 border-y border-white/10 py-5 sm:py-6 overflow-hidden relative z-10 mb-16 sm:mb-28">
      <div className="max-w-7xl mx-auto px-4 text-center mb-4 sm:mb-5 font-mono text-[10px] sm:text-[11px] text-neon-green/90 uppercase tracking-widest flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-neon-green animate-pulse shrink-0" />
        <span>BUILT ON INDUSTRY-LEADING GAMING ARCHITECTURES</span>
      </div>
      <div className="animate-marquee flex items-center gap-6 sm:gap-12 font-mono">
        {[...TECH_PARTNERS, ...TECH_PARTNERS].map((partner, idx) => {
          const Icon = partner.icon;
          return (
            <a
              key={idx}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 shrink-0 glass-card px-5 py-3 border-white/10 hover:border-neon-green/60 hover:bg-neon-green/10 hover:shadow-[0_0_20px_rgba(118,185,0,0.25)] transition-all cursor-pointer group rounded-xl"
            >
              <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green group-hover:scale-110 group-hover:bg-neon-green group-hover:text-obsidian transition-all shadow-[0_0_10px_rgba(118,185,0,0.15)]">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-xs sm:text-sm group-hover:text-neon-green transition-colors">{partner.name}</span>
                <span className="text-gray-400 text-[10px] font-semibold">{partner.tag}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-neon-green group-hover:translate-x-0.5 transition-all ml-1" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
