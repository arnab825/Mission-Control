"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  Cpu,
  Layers,
  Terminal,
  Radio,
  Sliders,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Play,
  ShieldCheck,
  ChevronRight,
  Workflow
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SUB-COMPONENTS: SPECIALIZED MODULE VISUALIZERS
// ─────────────────────────────────────────────────────────────────────────────

// Visualizer 1: Parallel Hardware Telemetry Engine (HTML5 Canvas Graph)
function TelemetryVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let points: number[] = Array.from({ length: 40 }, () => 50 + Math.random() * 20);
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const resizeObserver = new ResizeObserver(() => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    });
    resizeObserver.observe(canvas);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw high-tech grid
      ctx.strokeStyle = "rgba(118, 185, 0, 0.05)";
      ctx.lineWidth = 1;
      const gridGap = 30;
      for (let x = 0; x < width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Add dynamic point and shift line
      points.push(40 + Math.sin(Date.now() * 0.005) * 20 + Math.random() * 15);
      if (points.length > 50) points.shift();

      // Draw area gradient under the wave
      ctx.beginPath();
      ctx.moveTo(0, height);
      points.forEach((p, i) => {
        const x = (width / (points.length - 1)) * i;
        const y = height - (p / 100) * (height - 40) - 20;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(width, height);
      ctx.closePath();
      const areaGrad = ctx.createLinearGradient(0, 0, 0, height);
      areaGrad.addColorStop(0, "rgba(118, 185, 0, 0.12)");
      areaGrad.addColorStop(1, "rgba(118, 185, 0, 0)");
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Draw connection lines
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = (width / (points.length - 1)) * i;
        const y = height - (p / 100) * (height - 40) - 20;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "rgba(118, 185, 0, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(118, 185, 0, 0.5)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw critical thresholds lines
      ctx.strokeStyle = "rgba(239, 68, 68, 0.2)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, height * 0.25);
      ctx.lineTo(width, height * 0.25);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
      ctx.font = "8px monospace";
      ctx.fillText("CRITICAL VRAM LIMIT (85%)", 15, height * 0.25 - 5);

      // HUD Text Info overlay on Canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "10px monospace";
      ctx.fillText(`SYS_POLL: 60Hz`, 20, 25);
      ctx.fillText(`GPU_CLOCK: ${(1850 + Math.sin(Date.now() * 0.002) * 50).toFixed(0)} MHz`, 20, 40);

      const currentFPS = (162 + Math.random() * 4).toFixed(1);
      ctx.fillStyle = "rgba(118, 185, 0, 0.9)";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`FPS: ${currentFPS}`, width - 110, 25);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-56 bg-obsidian/95 border border-white/5 rounded-2xl overflow-hidden p-4 relative flex flex-col justify-between">
      <div className="absolute top-3 right-3 bg-neon-green/10 text-neon-green text-[9px] font-mono border border-neon-green/30 rounded px-2 py-0.5 tracking-wider uppercase font-bold animate-pulse">
        HAL telemetry direct feed
      </div>
      <canvas ref={canvasRef} className="w-full flex-1" />
      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-2 border-t border-white/5">
        <span>0ms latency check</span>
        <span>Hardware Hook: CONNECTED</span>
        <span>SYS_CORE_SENSORS</span>
      </div>
    </div>
  );
}

// Visualizer 2: Local AI Inference Pipeline (TensorRT Neural Node Grid)
function AIVisualizer() {
  const [activePulse, setActivePulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePulse(prev => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Neural layers visual mapping
  const layers = [
    { name: "Input Nodes", count: 3, color: "bg-gray-500" },
    { name: "TensorRT Latent Core", count: 4, color: "bg-neon-green" },
    { name: "Weights Output", count: 3, color: "bg-neon-yellow" }
  ];

  return (
    <div className="w-full h-56 bg-obsidian/95 border border-white/5 rounded-2xl p-5 relative flex flex-col justify-between overflow-hidden font-mono">
      <div className="absolute top-3 right-3 bg-neon-green/10 text-neon-green text-[9px] border border-neon-green/30 rounded px-2 py-0.5 tracking-wider uppercase font-bold">
        CUDA sandboxed kernel
      </div>

      <div className="text-xs text-gray-400 mb-2">Quantized Neural Pathway Execution</div>

      {/* Network Visual Nodes */}
      <div className="flex justify-between items-center px-6 py-2 h-28 relative">
        {/* SVG connection lines in background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <line x1="20%" y1="15%" x2="50%" y2="10%" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
          <line x1="20%" y1="15%" x2="50%" y2="35%" stroke="rgba(118, 185, 0, 0.15)" strokeWidth="1.5" />
          <line x1="20%" y1="50%" x2="50%" y2="35%" stroke="rgba(118, 185, 0, 0.3)" strokeWidth="1.5" />
          <line x1="20%" y1="50%" x2="50%" y2="60%" stroke="rgba(118, 185, 0, 0.15)" strokeWidth="1.5" />
          <line x1="20%" y1="85%" x2="50%" y2="60%" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
          <line x1="20%" y1="85%" x2="50%" y2="85%" stroke="rgba(118, 185, 0, 0.2)" strokeWidth="1.5" />

          <line x1="50%" y1="10%" x2="80%" y2="15%" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
          <line x1="50%" y1="35%" x2="80%" y2="15%" stroke="rgba(118, 185, 0, 0.3)" strokeWidth="1.5" />
          <line x1="50%" y1="35%" x2="80%" y2="50%" stroke="rgba(118, 185, 0, 0.2)" strokeWidth="1.5" />
          <line x1="50%" y1="60%" x2="80%" y2="50%" stroke="rgba(118, 185, 0, 0.4)" strokeWidth="1.5" />
          <line x1="50%" y1="60%" x2="80%" y2="85%" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
          <line x1="50%" y1="85%" x2="80%" y2="85%" stroke="rgba(118, 185, 0, 0.3)" strokeWidth="1.5" />

          {/* Animated glowing signal pulses */}
          <circle cx={`${20 + activePulse * 20}%`} cy={`${50 - activePulse * 5}%`} r="3" fill="#bfff00" className="animate-ping" />
          <circle cx={`${50 + activePulse * 10}%`} cy={`${35 + activePulse * 8}%`} r="3" fill="#76b900" />
        </svg>

        {/* Nodes columns */}
        {layers.map((layer, lIdx) => (
          <div key={lIdx} className="flex flex-col justify-around h-full z-10 text-center">
            <span className="text-[8px] text-gray-500 uppercase tracking-widest mb-1.5">{layer.name}</span>
            <div className="flex flex-col gap-2.5 items-center">
              {Array.from({ length: layer.count }).map((_, nIdx) => (
                <div
                  key={nIdx}
                  className={`w-3 h-3 rounded-full border border-white/20 transition-all duration-500 shadow-md ${layer.color} ${activePulse === lIdx || activePulse === 3 ? "scale-125 shadow-[0_0_8px_currentColor]" : "opacity-60"
                    }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Model memory info metrics */}
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

// Visualizer 3: DirectX 12 / Vulkan Present Overlay (HUD Simulation)
function HUDVisualizer() {
  return (
    <div className="w-full h-56 bg-obsidian/95 border border-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-between p-4 font-mono select-none">

      {/* HUD background grid representing a game rendering viewport */}
      <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('/images/gaming-hud-bg.jpg')" }} />
      <div className="absolute inset-0 border border-white/5 bg-radial-gradient from-transparent to-black/80 pointer-events-none" />

      {/* Futuristic corner frame overlays */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-neon-green/40" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-neon-green/40" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-neon-green/40" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-neon-green/40" />

      {/* Simulated Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 border border-dashed border-neon-green/30 rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: "12s" }} />
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

      {/* Floating HUD Widget Overlay */}
      <div className="z-10 bg-black/40 border border-white/10 rounded-xl p-2.5 max-w-[200px] shadow-lg backdrop-blur-sm self-start mb-1 text-[9px] space-y-1.5">
        <div className="flex items-center gap-1.5 text-white/80 font-bold border-b border-white/5 pb-1">
          <Sparkles className="w-3 h-3 text-neon-green" /> TACTICAL COMPANION
        </div>
        <div className="text-gray-300 leading-relaxed">
          "Enemy approaching. Purging standby memory page cache."
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

// Visualizer 4: Process Watcher & Agentic Daemon (Scrolling Log Console)
function TerminalVisualizer() {
  const [logs, setLogs] = useState<string[]>([
    "[09:12:01.04] INIT: Initializing System Kernel Event Listener...",
    "[09:12:01.12] OK: Hooked Windows Kernel Object notifications.",
    "[09:12:01.45] BOOT: Compiling TensorRT execution weights...",
    "[09:12:02.10] OK: Loaded local INT8 GPU model structures (1.84 GB VRAM).",
    "[09:12:02.56] DAEMON: Process Watcher thread spawned successfully [PID: 4892].",
    "[09:12:03.01] SYSTEM: Low-level WMI and NVML core telemetry streaming on port 8765.",
    "[09:12:04.12] WATCHING: Polling active processes for targeted executables..."
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
      "WATCHING: Target active process loop poll OK."
    ];

    const interval = setInterval(() => {
      const timestamp = new Date().toTimeString().split(" ")[0];
      const randomCmd = commands[Math.floor(Math.random() * commands.length)];
      setLogs(prev => [...prev, `[${timestamp}] ${randomCmd}`]);
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

      <div className="text-xs text-gray-400 mb-2.5 border-b border-white/5 pb-1.5">Kernel Log Telemetry Stream</div>

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

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAIN REDESIGNED ARCHITECTURE PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  const [activeModule, setActiveModule] = useState("parallel-hardware");
  const pathname = usePathname();

  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace("#", "");
      if (hash && ["parallel-hardware", "nim-core", "directx-presentation", "process-watcher"].includes(hash)) {
        setActiveModule(hash);
      }
    };

    handleHashChange();
    
    // Safe timeout for client mounting cycles
    const timer = setTimeout(handleHashChange, 100);

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [pathname]);

  const components = [
    {
      id: "parallel-hardware",
      num: "01",
      icon: Activity,
      title: "Parallel Hardware Telemetry Engine",
      subTitle: "60Hz Low-Level HAL & WMI Monitoring Daemon",
      desc: "A headless C++ daemon interfaces directly with the Operating System Hardware Abstraction Layer (HAL) and Windows Management Instrumentation (WMI). It queries sub-millisecond thermals, clock rates, and VRAM memory page faults, streaming JSON telemetry over local WebSockets directly to the React overlay thread at 60 FPS.",
      specs: [
        { label: "Polling Rate", val: "60 Hz Active" },
        { label: "CPU Overhead", val: "< 0.2%" },
        { label: "Protocol", val: "Local WebSocket IPC" }
      ],
      visualizer: <TelemetryVisualizer />
    },
    {
      id: "nim-core",
      num: "02",
      icon: Cpu,
      title: "Local AI Inference Pipeline (TensorRT)",
      subTitle: "Quantized FP16 & INT8 Neural Model Execution",
      desc: "Mission Control compiles open-weights LLMs directly into optimized NVIDIA TensorRT execution engines. By leveraging physical Tensor Cores on GeForce GTX and RTX hardware, inference runs entirely inside localized VRAM sandboxes with zero cloud ping or external bandwidth consumption.",
      specs: [
        { label: "Inference Latency", val: "12.4 ms" },
        { label: "Precision Engine", val: "FP16 / INT8 Quantized" },
        { label: "Privacy Rating", val: "100% Local / Sandbox" }
      ],
      visualizer: <AIVisualizer />
    },
    {
      id: "directx-presentation",
      num: "03",
      icon: Layers,
      title: "DirectX 12 / Vulkan Present Overlay",
      subTitle: "Seamless Hardware Swapchain Composition",
      desc: "Using hardware-level swapchain hooking and transparent desktop window composition, Mission Control projects a non-intrusive heads-up display directly over active rendering pipelines without interrupting G-Sync, FreeSync, or HDR color spaces.",
      specs: [
        { label: "Render Overhead", val: "0 FPS Drop" },
        { label: "Hook Protocols", val: "DirectX 11/12, Vulkan" },
        { label: "Input Pass-Through", val: "Sub-millisecond" }
      ],
      visualizer: <HUDVisualizer />
    },
    {
      id: "process-watcher",
      num: "04",
      icon: Terminal,
      title: "Process Watcher & Agentic Daemon",
      subTitle: "Autonomous Game State Reaction Engine",
      desc: "An asynchronous system event listener watches process handles across Windows and Linux system kernels. Upon detecting targeted game executables, it automatically invokes system tuning profiles, suspends background Electron apps, and clears PyTorch caches.",
      specs: [
        { label: "Detection Engine", val: "Kernel Event Hook" },
        { label: "Action Response", val: "< 5 ms" },
        { label: "Safety Verification", val: "Memory Read-Only" }
      ],
      visualizer: <TerminalVisualizer />
    }
  ];

  const activeModuleData = components.find(c => c.id === activeModule) || components[0];
  const ActiveIcon = activeModuleData.icon;

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
        className="text-center mb-10 sm:mb-16 max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-5 backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">HARDWARE & NEURAL PIPELINE</span>
        </div>
        <h1 className="text-3xl sm:text-6xl font-black font-display tracking-tight mb-4 uppercase text-white">
          SYSTEM <span className="text-neon-green glow-text-teal">ARCHITECTURE</span>
        </h1>
        <p className="text-gray-400 text-xs sm:text-base leading-relaxed max-w-2xl mx-auto font-mono">
          Explore the low-level telemetry monitoring daemons, quantized neural compilers, and swapchain overlay presentation hooks that make up the Mission Control core.
        </p>
      </motion.div>

      {/* Main Split-Pane Interactive Visualizer Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">

        {/* Left Side: Modular Selector Tabs List (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="text-xs uppercase font-mono tracking-wider font-bold text-gray-500 mb-1 flex items-center gap-2 pl-1">
            <Workflow className="w-4 h-4 text-neon-green" /> Core System Layers
          </div>

          {components.map((comp, idx) => {
            const CompIcon = comp.icon;
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
                className={`w-full text-left glass-card p-5 relative overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col ${isSelected
                    ? "border-neon-green/50 bg-neon-green/[0.03] shadow-[0_0_25px_rgba(118,185,0,0.15)]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
              >
                {/* Top Row: Icon + Title info */}
                <div className="flex gap-4 items-center w-full">
                  {/* Visual active indicator bar on the left */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-neon-green shadow-[0_0_10px_#76b900] rounded-r" />
                  )}

                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected
                      ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118, 185, 0, 0.35)]"
                      : "bg-white/5 text-gray-400"
                    }`}>
                    <CompIcon className="w-5.5 h-5.5" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className={`text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider ${isSelected ? "text-neon-green" : "text-gray-500"
                        }`}>
                        Layer {comp.num}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[8px] font-mono font-bold bg-neon-green/15 text-neon-green border border-neon-green/30 rounded px-1.5 py-0.5 uppercase tracking-widest animate-pulse">
                          <span className="w-1 h-1 rounded-full bg-neon-green" /> Running
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm sm:text-base font-bold font-display uppercase tracking-wider transition-colors duration-250 leading-tight text-white`}>
                      {comp.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono uppercase mt-0.5 leading-snug">
                      {comp.subTitle}
                    </p>
                  </div>

                  {/* Background Large Number Overlay */}
                  <div className={`absolute bottom-[-15px] right-2 text-6xl font-display font-black select-none pointer-events-none transition-colors duration-300 ${isSelected ? "text-neon-green/[0.03]" : "text-white/[0.01]"
                    }`}>
                    {comp.num}
                  </div>
                </div>

                {/* Mobile Inline Content Expansion: Visible only on < lg viewports when active */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="lg:hidden mt-4 pt-4 border-t border-white/5 space-y-4 text-left w-full cursor-default overflow-hidden"
                      onClick={(e) => e.stopPropagation()} // Prevent collapse trigger when interacting inside
                    >
                      {/* Active Visualizer Panel */}
                      <div className="w-full">
                        {comp.visualizer}
                      </div>

                      {/* Description Text */}
                      <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-sans normal-case tracking-normal">
                        {comp.desc}
                      </p>

                      {/* Specs badges grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {comp.specs.map((spec, sIdx) => (
                          <div key={sIdx} className="bg-obsidian/85 p-3 rounded-xl border border-white/5 font-mono">
                            <div className="text-gray-500 text-[8px] uppercase tracking-wider mb-0.5">{spec.label}</div>
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

        {/* Right Side: Telemetry HUD Visualizer Screen (7 Columns) - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-28 space-y-6">
          <div className="text-xs uppercase font-mono tracking-wider font-bold text-gray-500 mb-1 flex items-center gap-2 pl-1">
            <Sliders className="w-4 h-4 text-neon-green" /> Live Diagnostics Visualizer
          </div>

          <div className="glass-panel border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 bg-[#0d0f14]/95 shadow-[0_0_50px_rgba(0,0,0,0.85)] relative">

            {/* Visualizer Frame Header Bar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                  <ActiveIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-white font-bold uppercase tracking-wider">{activeModuleData.title}</div>
                  <div className="text-[10px] text-neon-green uppercase mt-0.5">{activeModuleData.subTitle}</div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 bg-white/5 border border-white/5 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
                <span className="text-[9px] text-gray-400 font-bold uppercase">System Link: OK</span>
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
                  {activeModuleData.visualizer}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Module Description details */}
            <div className="space-y-4">
              <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-neon-green">
                Module Operations & Pipeline
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed font-sans">
                {activeModuleData.desc}
              </p>

              {/* Badges specifications grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-white/5">
                {activeModuleData.specs.map((spec, sIdx) => (
                  <div key={sIdx} className="bg-obsidian/85 p-3.5 rounded-xl border border-white/5 font-mono">
                    <div className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">{spec.label}</div>
                    <div className="text-white font-bold text-xs text-neon-green">{spec.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* High-tech aesthetic diagonal corner indicator */}
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-neon-green/5 rounded-tl-full blur-xl pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Verification / Security Architecture Summary */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mt-20 border-t border-white/10 pt-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Motherboard UUID Binding",
              icon: ShieldCheck,
              desc: "Telemetry logs and configuration profiles are encrypted locally and bound directly to physical motherboard UUID keys to prevent telemetry hijacking or falsification."
            },
            {
              title: "Real-time Priority Threads",
              icon: Sliders,
              desc: "The watcher daemon operates on realtime system priority classes, suspending background Electron window cycles during gameplay to reclaim raw CPU threads."
            },
            {
              title: "Quantized Local Inference",
              icon: Cpu,
              desc: "By native execution of FP16 and INT8 weight structures compiled specifically for local CUDA cores, prompt evaluation latency stays under 15ms."
            }
          ].map((item, idx) => {
            const ItemIcon = item.icon;
            return (
              <div key={idx} className="glass-card p-6 border-white/5 hover:border-neon-green/30 transition-all duration-300 relative group overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-neon-green/10 group-hover:text-neon-green transition-colors mb-4 shrink-0">
                  <ItemIcon className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white font-display uppercase mb-2 group-hover:text-neon-green transition-colors">
                  {item.title}
                </h4>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-sans">
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
