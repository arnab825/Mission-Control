"use client";

import React, { useState, useEffect } from "react";

export function AIVisualizer() {
  const [activePulse, setActivePulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePulse((prev) => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const layers = [
    { name: "Input Nodes", count: 3, color: "bg-gray-500" },
    { name: "TensorRT Latent Core", count: 4, color: "bg-neon-green" },
    { name: "Weights Output", count: 3, color: "bg-neon-yellow" },
  ];

  return (
    <div className="w-full h-56 bg-obsidian/95 border border-white/5 rounded-2xl p-5 relative flex flex-col justify-between overflow-hidden font-mono">
      <div className="absolute top-3 right-3 bg-neon-green/10 text-neon-green text-[9px] border border-neon-green/30 rounded px-2 py-0.5 tracking-wider uppercase font-bold">
        CUDA sandboxed kernel
      </div>

      <div className="text-xs text-gray-400 mb-2">Quantized Neural Pathway Execution</div>

      <div className="flex justify-between items-center px-6 py-2 h-28 relative">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <line
            x1="20%"
            y1="15%"
            x2="50%"
            y2="10%"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1.5"
          />
          <line
            x1="20%"
            y1="15%"
            x2="50%"
            y2="35%"
            stroke="rgba(118, 185, 0, 0.15)"
            strokeWidth="1.5"
          />
          <line
            x1="20%"
            y1="50%"
            x2="50%"
            y2="35%"
            stroke="rgba(118, 185, 0, 0.3)"
            strokeWidth="1.5"
          />
          <line
            x1="20%"
            y1="50%"
            x2="50%"
            y2="60%"
            stroke="rgba(118, 185, 0, 0.15)"
            strokeWidth="1.5"
          />
          <line
            x1="20%"
            y1="85%"
            x2="50%"
            y2="60%"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1.5"
          />
          <line
            x1="20%"
            y1="85%"
            x2="50%"
            y2="85%"
            stroke="rgba(118, 185, 0, 0.2)"
            strokeWidth="1.5"
          />

          <line
            x1="50%"
            y1="10%"
            x2="80%"
            y2="15%"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1.5"
          />
          <line
            x1="50%"
            y1="35%"
            x2="80%"
            y2="15%"
            stroke="rgba(118, 185, 0, 0.3)"
            strokeWidth="1.5"
          />
          <line
            x1="50%"
            y1="35%"
            x2="80%"
            y2="50%"
            stroke="rgba(118, 185, 0, 0.2)"
            strokeWidth="1.5"
          />
          <line
            x1="50%"
            y1="60%"
            x2="80%"
            y2="50%"
            stroke="rgba(118, 185, 0, 0.4)"
            strokeWidth="1.5"
          />
          <line
            x1="50%"
            y1="60%"
            x2="80%"
            y2="85%"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1.5"
          />
          <line
            x1="50%"
            y1="85%"
            x2="80%"
            y2="85%"
            stroke="rgba(118, 185, 0, 0.3)"
            strokeWidth="1.5"
          />

          <circle
            cx={`${20 + activePulse * 20}%`}
            cy={`${50 - activePulse * 5}%`}
            r="3"
            fill="#bfff00"
            className="animate-ping"
          />
          <circle
            cx={`${50 + activePulse * 10}%`}
            cy={`${35 + activePulse * 8}%`}
            r="3"
            fill="#76b900"
          />
        </svg>

        {layers.map((layer, lIdx) => (
          <div key={lIdx} className="flex flex-col justify-around h-full z-10 text-center">
            <span className="text-[8px] text-gray-500 uppercase tracking-widest mb-1.5">
              {layer.name}
            </span>
            <div className="flex flex-col gap-2.5 items-center">
              {Array.from({ length: layer.count }).map((_, nIdx) => (
                <div
                  key={nIdx}
                  className={`w-3 h-3 rounded-full border border-white/20 transition-all duration-500 shadow-md ${layer.color} ${
                    activePulse === lIdx || activePulse === 3
                      ? "scale-125 shadow-[0_0_8px_currentColor]"
                      : "opacity-60"
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2.5 border-t border-white/5 text-[10px] text-gray-400">
        <div>
          <span>MODEL VRAM: </span>
          <span className="text-neon-green font-bold">1.84 GB / 8.0 GB</span>
        </div>
        <div>
          <span>SPEED: </span>
          <span className="text-neon-yellow font-bold">85.4 Tok/sec</span>
        </div>
        <div>
          <span>LATENCY: </span>
          <span className="text-neon-green font-bold">12.4 ms</span>
        </div>
      </div>
    </div>
  );
}
