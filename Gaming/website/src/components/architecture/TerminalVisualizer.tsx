"use client";

import React, { useState, useEffect, useRef } from "react";

export function TerminalVisualizer() {
  const [logs, setLogs] = useState<string[]>([
    "[09:12:01.04] INIT: Initializing System Kernel Event Listener...",
    "[09:12:01.12] OK: Hooked Windows Kernel Object notifications.",
    "[09:12:01.45] BOOT: Compiling TensorRT execution weights...",
    "[09:12:02.10] OK: Loaded local INT8 GPU model structures (1.84 GB VRAM).",
    "[09:12:02.56] DAEMON: Process Watcher thread spawned successfully [PID: 4892].",
    "[09:12:03.01] SYSTEM: Low-level WMI and NVML core telemetry streaming on port 8765.",
    "[09:12:04.12] WATCHING: Polling active processes for targeted executables...",
  ]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const commands = [
      "PROCESS_HOOK: Detected ApexLegends.exe startup.",
      "SYSTEM: Suspended background helper threads to reclaim 1.8GB VRAM.",
      "HOOK: DX12 swapchain composition overlay loaded successfully.",
      "REFLEX: Set low-latency driver acceleration to Reflex Boost mode.",
      "AI_COMPANION: In-game HUD macro listening on hotkey Shift+F12.",
      "NVML: Polling graphics hardware thermal sensors at 60Hz.",
      "SYSTEM: Flushed standby PyTorch CUDA cache handles.",
      "WATCHING: Target active process loop poll OK.",
    ];

    const interval = setInterval(() => {
      const timestamp = new Date().toTimeString().split(" ")[0];
      const randomCmd = commands[Math.floor(Math.random() * commands.length)];
      setLogs((prev) => [...prev, `[${timestamp}] ${randomCmd}`]);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full h-56 bg-obsidian/95 border border-white/5 rounded-2xl p-4 flex flex-col justify-between font-mono text-[10px] relative overflow-hidden">
      <div className="absolute top-3 right-3 bg-neon-green/10 text-neon-green text-[9px] border border-neon-green/30 rounded px-2 py-0.5 tracking-wider uppercase font-bold">
        Watcher Terminal stream
      </div>

      <div className="text-xs text-gray-400 mb-2.5 border-b border-white/5 pb-1.5">
        Kernel Log Telemetry Stream
      </div>

      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-gray-400 max-h-[125px] scrollbar-thin select-text text-left leading-relaxed scroll-smooth"
      >
        {logs.map((log, idx) => {
          let logColor = "text-gray-400";
          if (log.includes("OK:")) logColor = "text-neon-green";
          else if (log.includes("HOOK:")) logColor = "text-neon-yellow";
          else if (log.includes("PROCESS_HOOK:")) logColor = "text-yellow-400 font-bold";
          else if (log.includes("INIT:") || log.includes("BOOT:")) logColor = "text-blue-400";

          return (
            <div key={idx} className={`${logColor} animate-in fade-in duration-300`}>
              {log}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] text-gray-500">
        <span>PID: 4892 Active</span>
        <span>Thread priority: REALTIME</span>
      </div>
    </div>
  );
}
