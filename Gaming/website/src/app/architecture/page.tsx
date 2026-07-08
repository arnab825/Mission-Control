"use client";

import { Activity, Cpu, Layers, Server, Monitor, CheckCircle2, Shield, Zap, Terminal, Radio, Sliders, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function ArchitecturePage() {
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
      ]
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
      ]
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
      ]
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
      ]
    }
  ];

  return (
    <div className="min-h-screen pt-28 pb-24 px-4 sm:px-6 max-w-6xl mx-auto w-full relative z-10 bg-[#0a0a0c]">
      
      {/* Cyber Grid & Ambient Radial Glows */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-green/10 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-20 max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-6 backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">HARDWARE & NEURAL PIPELINE</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight mb-6 uppercase text-white">
          SYSTEM <span className="text-neon-green glow-text-teal">ARCHITECTURE</span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
          Deep dive into low-level graphics hooks, hardware telemetry daemons, and quantized CUDA inference engines powering Mission Control in 2026.
        </p>
      </motion.div>

      {/* Component Core Details */}
      <div className="space-y-10">
        {components.map((comp, idx) => {
          const IconComp = comp.icon;
          return (
            <motion.section 
              key={comp.id}
              id={comp.id} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="glass-card glass-card-hover p-8 sm:p-12 relative overflow-hidden group border-white/10 hover:border-neon-green/40"
            >
              {/* Background Giant Numbering */}
              <div className="absolute top-0 right-0 p-6 sm:p-10 text-white/[0.03] font-display text-8xl sm:text-9xl font-black -z-10 select-none group-hover:text-neon-green/[0.06] transition-colors">
                {comp.num}
              </div>

              {/* Header Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_15px_rgba(118, 185, 0,0.15)] shrink-0">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display text-white uppercase group-hover:text-neon-green transition-colors">
                      {comp.title}
                    </h2>
                    <div className="text-xs font-mono text-neon-green uppercase tracking-wider mt-0.5">
                      {comp.subTitle}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-8">
                {comp.desc}
              </p>

              {/* Telemetry Spec Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                {comp.specs.map((spec, sIdx) => (
                  <div key={sIdx} className="bg-obsidian/80 p-4 rounded-xl border border-white/5 font-mono">
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{spec.label}</div>
                    <div className="text-white font-bold text-sm text-neon-green">{spec.val}</div>
                  </div>
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
