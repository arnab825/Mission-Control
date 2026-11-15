import React from 'react';
import { Gauge, Zap } from 'lucide-react';
import type { SystemSpecs } from '../../types/telemetry';

interface SystemTelemetryHeaderProps {
  specs: SystemSpecs | null;
  viewMode: 'graph' | 'details' | 'intel';
  setViewMode: (mode: 'graph' | 'details' | 'intel') => void;
}

export const SystemTelemetryHeader: React.FC<SystemTelemetryHeaderProps> = ({
  specs,
  viewMode,
  setViewMode,
}) => {
  const muxInfo = specs?.hardware?.mux_switch || specs?.mux_switch;

  return (
    <div className="flex flex-col gap-3 border-b border-white/5 pb-3 sm:pb-4 pt-1 shrink-0 min-w-0 max-w-full">
      {/* Tier 1: Title, Live Status & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white uppercase font-sans truncate">
              System Telemetry
            </h2>
            {/* Connected Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neon-yellow/10 border border-neon-yellow/20 shrink-0">
              <span className="w-1 h-1 rounded-full bg-neon-yellow animate-ping" />
              <span className="text-[7px] font-black uppercase text-neon-yellow tracking-wider">Monitor Active</span>
            </div>
          </div>
          <p className="text-[10px] font-medium text-zinc-500 line-clamp-1 sm:line-clamp-none">
            Real-time hardware tracking, memory allocation, multi-threaded core diagnostics, and dynamic GPU telemetry.
          </p>
        </div>

        {/* View Switcher (Details vs Graph vs Performance Intel) */}
        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1 shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            aria-label="button"
            type="button"
            onClick={() => setViewMode('graph')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'graph'
                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.15)] font-bold'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            Graph
          </button>
          <button
            aria-label="button"
            type="button"
            onClick={() => setViewMode('details')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'details'
                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.15)] font-bold'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            Details
          </button>
          <button
            aria-label="Performance Intel"
            type="button"
            onClick={() => setViewMode('intel')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'intel'
                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.15)] font-bold'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            Performance Intel
          </button>
        </div>
      </div>

      {/* Tier 2: Dynamic Hardware Status Badges (Primary GPU & MUX Routing Switch) */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
        {/* Dynamic GPU Telemetry Status chip */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-white/[0.03] border border-white/5 rounded-2xl px-2.5 sm:px-3 py-1.5 shrink-0 max-w-full min-w-0">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/45 border border-white/10 flex items-center justify-center text-blue-400 shrink-0">
            <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block">Primary GPU</span>
            <span className="text-[9px] font-mono font-black text-zinc-300 block truncate max-w-[150px] sm:max-w-[220px]" title={specs?.hardware.gpu}>
              {specs?.hardware.gpu || 'Gathering...'}
            </span>
          </div>
        </div>

        {/* MUX Switch Badge */}
        {muxInfo && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setViewMode('details')}
            onKeyDown={(e) => e.key === 'Enter' && setViewMode('details')}
            title={`Display Routing: ${muxInfo.display_routing}`}
            className="flex items-center gap-2 sm:gap-2.5 bg-white/[0.03] border border-white/5 hover:border-neon-yellow/30 rounded-2xl px-2.5 sm:px-3 py-1.5 cursor-pointer transition-all shrink-0 max-w-full min-w-0"
          >
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 flex items-center justify-center text-neon-yellow shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">
                  {muxInfo.form_factor === 'desktop' ? 'VIDEO ROUTING' : 'MUX ROUTING'}
                </span>
                <span className={`text-[7px] sm:text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                  muxInfo.latency_mode === 'zero_latency_direct' || muxInfo.current_mode === 'discrete'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : muxInfo.current_mode === 'hybrid'
                    ? 'bg-neon-yellow/10 text-neon-yellow border border-neon-yellow/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {muxInfo.form_factor === 'desktop'
                    ? 'DESKTOP DIRECT'
                    : muxInfo.current_mode === 'discrete'
                    ? 'DISCRETE DIRECT'
                    : muxInfo.current_mode === 'hybrid'
                    ? 'HYBRID (OPTIMUS)'
                    : (muxInfo.current_mode || 'AUTO').toUpperCase()}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-zinc-300 block truncate max-w-[150px] sm:max-w-[220px]">
                {muxInfo.primary_oem?.name || muxInfo.active_display_gpu || 'Direct Display'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
