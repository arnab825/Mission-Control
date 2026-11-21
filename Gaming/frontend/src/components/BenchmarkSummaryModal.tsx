import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Gauge,
  Activity,
  Check,
  Copy,
  Download,
  Flame,
  Cpu,
  Layers,
  Zap,
  ShieldCheck,
  Timer
} from 'lucide-react';
import type { BenchmarkSummary } from '../types/telemetry';

interface BenchmarkSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: BenchmarkSummary | null;
}

export const BenchmarkSummaryModal: React.FC<BenchmarkSummaryModalProps> = ({
  isOpen,
  onClose,
  summary
}) => {
  const [copied, setCopied] = useState(false);

  const formattedDate = useMemo(() => {
    if (!summary?.timestamp) return 'Recent Run';
    return new Date(summary.timestamp * 1000).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [summary?.timestamp]);

  const formattedDuration = useMemo(() => {
    if (!summary?.duration_seconds) return '0s';
    const totalSecs = Math.round(summary.duration_seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, [summary?.duration_seconds]);

  const handleCopy = () => {
    if (!summary) return;
    const text = [
      `# ⚡ Mission Control Benchmark Report`,
      `**Game:** ${summary.game_title}`,
      `**Date:** ${formattedDate} (${formattedDuration})`,
      `---`,
      `- **Average FPS:** ${summary.avg_fps} FPS`,
      `- **1% Low:** ${summary.one_percent_low} FPS`,
      `- **Min / Max FPS:** ${summary.min_fps} / ${summary.max_fps} FPS`,
      `- **Total Frames:** ${summary.total_frames.toLocaleString()}`,
      `- **GPU Utilization / Temp:** ${summary.gpu_avg_pct ?? 0}% @ ${summary.gpu_max_temp ?? 0}°C`,
      `- **CPU Utilization / Temp:** ${summary.cpu_avg_pct ?? 0}% @ ${summary.cpu_max_temp ?? 0}°C`,
      `- **Peak VRAM:** ${summary.vram_max_mb ? Math.round(summary.vram_max_mb) : 0} MB`,
      `- **Bottleneck Assessment:** ${summary.bottleneck?.toUpperCase() ?? 'BALANCED'}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    if (!summary) return;
    const jsonStr = JSON.stringify(summary, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark_${summary.game_title.toLowerCase().replace(/\s+/g, '_')}_${summary.timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && summary && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-[#0d0f12]/95 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header Accent Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-neon-green via-neon-yellow to-emerald-400" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.15)]">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                      Benchmark Complete
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-zinc-500" />
                      {formattedDuration}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-white tracking-wide mt-0.5">
                    {summary.game_title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Main KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Average FPS */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-neon-green/20 relative overflow-hidden group">
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Average FPS
                  </div>
                  <div className="text-3xl font-black font-mono text-neon-green tracking-tight">
                    {Math.round(summary.avg_fps)}
                    <span className="text-xs font-normal text-zinc-500 ml-1">FPS</span>
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500 mt-1">
                    Target: 60+ FPS
                  </div>
                </div>

                {/* 1% Lows */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-amber-500/20 relative overflow-hidden">
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    1% Lows
                  </div>
                  <div className="text-3xl font-black font-mono text-amber-400 tracking-tight">
                    {Math.round(summary.one_percent_low)}
                    <span className="text-xs font-normal text-zinc-500 ml-1">FPS</span>
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500 mt-1">
                    Frame Pacing Floor
                  </div>
                </div>

                {/* Min FPS */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Min / Max FPS
                  </div>
                  <div className="text-xl font-black font-mono text-white tracking-tight flex items-baseline gap-1 mt-1">
                    <span className="text-rose-400">{Math.round(summary.min_fps)}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-emerald-400">{Math.round(summary.max_fps)}</span>
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500 mt-2">
                    Dynamic Range
                  </div>
                </div>

                {/* Total Frames */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Total Frames
                  </div>
                  <div className="text-2xl font-black font-mono text-white tracking-tight mt-0.5">
                    {summary.total_frames.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500 mt-1.5">
                    Sampled Output
                  </div>
                </div>
              </div>

              {/* Frametime Visualizer / Bar Distribution */}
              {summary.frametimes && summary.frametimes.length > 0 && (
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-neon-green" />
                      Frametime Consistency (ms)
                    </span>
                    <span className="font-mono text-zinc-500">
                      {summary.frametimes.length} recent frames
                    </span>
                  </div>

                  <div className="h-16 flex items-end gap-[2px] pt-2 overflow-hidden">
                    {summary.frametimes.map((ft, idx) => {
                      const heightPct = Math.min(100, Math.max(10, (ft / 33.3) * 100));
                      const isSpike = ft > 25.0;
                      const isSmooth = ft <= 16.6;
                      const barColor = isSmooth
                        ? 'bg-neon-green/70'
                        : isSpike
                        ? 'bg-rose-500'
                        : 'bg-amber-400/80';
                      return (
                        <div
                          key={`ft-${idx}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${ft.toFixed(1)} ms (${Math.round(1000 / Math.max(ft, 0.1))} FPS)`}
                          className={`flex-1 min-w-[2px] rounded-t-sm transition-all ${barColor}`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-neon-green" /> &le;16.6ms (60+ FPS)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> 16-25ms
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> &gt;25ms (Spikes)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Hardware Telemetry & Bottleneck Diagnostics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* GPU Performance */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-neon-green" />
                      GPU Diagnostics
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {Math.round(summary.gpu_avg_pct ?? 0)}% avg
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Peak Temperature</span>
                      <span className="font-mono text-zinc-300 font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {Math.round(summary.gpu_max_temp ?? 0)}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Max VRAM Allocated</span>
                      <span className="font-mono text-zinc-300 font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        {summary.vram_max_mb ? `${Math.round(summary.vram_max_mb)} MB` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CPU Performance & Bottleneck */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      CPU & Pipeline
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {Math.round(summary.cpu_avg_pct ?? 0)}% avg
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Peak Temperature</span>
                      <span className="font-mono text-zinc-300 font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {Math.round(summary.cpu_max_temp ?? 0)}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Primary Bottleneck</span>
                      <span className="font-mono font-bold uppercase tracking-wider text-neon-green flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-neon-green" />
                        {summary.bottleneck === 'gpu' ? 'GPU Bound (Optimal)' : summary.bottleneck === 'cpu' ? 'CPU Limited' : 'Balanced'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Toolbar */}
            <div className="p-4 px-6 border-t border-white/5 bg-black/40 flex items-center justify-between gap-3">
              <div className="text-[10px] text-zinc-500 font-medium">
                Recorded via ETW Hardware Telemetry Layer
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-neon-green" />
                      <span className="text-neon-green">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/30 hover:bg-neon-green/20 text-neon-green text-xs font-bold transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
