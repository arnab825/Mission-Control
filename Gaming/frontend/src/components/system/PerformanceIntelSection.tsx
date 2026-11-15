import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Gauge,
  Activity,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  X
} from 'lucide-react';
import type { TelemetryState, SystemSpecs } from '../../types/telemetry';

export const Heatbar: React.FC<{
  label: string;
  value: number;
  max: number;
  unit: string;
}> = ({ label, value, max, unit }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  let status: 'Safe' | 'Warm' | 'Limit' = 'Safe';
  let badgeClass = 'text-neon-green bg-neon-green/10 border-neon-green/20';
  let barFilledClass = 'bg-neon-green shadow-[0_0_6px_rgba(118,185,0,0.4)]';
  
  if (label.includes('CPU') || label.includes('GPU')) {
    if (value >= 88) {
      status = 'Limit';
      badgeClass = 'text-red-400 bg-red-500/10 border-red-500/20';
      barFilledClass = 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
    } else if (value >= 80) {
      status = 'Warm';
      badgeClass = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      barFilledClass = 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.5)]';
    }
  } else {
    if (percentage >= 90) {
      status = 'Limit';
      badgeClass = 'text-red-400 bg-red-500/10 border-red-500/20';
      barFilledClass = 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
    } else if (percentage >= 75) {
      status = 'Warm';
      badgeClass = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      barFilledClass = 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.5)]';
    }
  }

  const segmentCount = 10;
  const filledSegments = Math.round((percentage / 100) * segmentCount);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between gap-3 min-w-0 transition-all hover:border-white/10">
      {/* Top row: Label & Status Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider truncate" title={label}>
          {label}
        </span>
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${badgeClass}`}>
          {status}
        </span>
      </div>

      {/* Bottom row: Value & Proportional Segmented Track */}
      <div className="flex items-center justify-between gap-3 select-none">
        <span className="text-sm font-black font-mono text-white tracking-tight shrink-0">
          {value.toFixed(0)}{unit}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {Array.from({ length: segmentCount }).map((_, idx) => {
            const isFilled = idx < filledSegments;
            return (
              <div
                key={idx}
                className={`w-1.5 sm:w-2 h-3 sm:h-3.5 rounded-xs transition-all ${
                  isFilled ? barFilledClass : 'bg-white/5'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AnomalyDetailPanel: React.FC<{ event: any }> = ({ event }) => {
  if (!event) {
    return (
      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center h-full min-h-48 text-zinc-500">
        <HelpCircle className="w-8 h-8 mb-3 text-zinc-600 animate-pulse" />
        <p className="text-xs font-bold uppercase tracking-wider">Select an anomaly event</p>
        <p className="text-[10px] mt-1 text-zinc-600">Click any spike or warning in the timeline to let AI analyze it.</p>
      </div>
    );
  }

  const { type, timestamp, data } = event;
  const metrics = data?.hardware_metrics || {};
  const isFrameSpike = type === 'frame_spike';
  const isThermal = type.startsWith('thermal');
  const isVram = type === 'vram_saturation';

  const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col gap-5 h-full">
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-neon-green/10 border border-neon-green/20 text-neon-green">
            {timeStr} · {data?.scene_type || 'unknown'}
          </span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider mt-2">
            {isFrameSpike ? 'Frame Time Spike' : isThermal ? 'Thermal Warning' : 'VRAM Exhaustion'}
          </h3>
          <p className="text-[10px] font-semibold text-zinc-400 mt-1">{data?.message}</p>
        </div>
        <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-neon-green shrink-0">
          <Activity className="w-4 h-4" />
        </div>
      </div>

      {(data?.location || data?.active_quests?.length > 0 || data?.dialogue) && (
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-[10px] flex flex-col gap-2">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Active Game Context</span>
          {data?.location && data.location !== 'Unknown' && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Location:</span>
              <span className="text-white font-bold">{data.location}</span>
            </div>
          )}
          {data?.active_quests?.length > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Active Quest:</span>
              <span className="text-neon-green font-black">{data.active_quests[0]}</span>
            </div>
          )}
          {data?.dialogue && (
            <div className="border-t border-white/5 pt-2 mt-1">
              <span className="text-zinc-500 italic block">"{data.dialogue}"</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Possible Root Causes</span>
        <div className="space-y-2 text-[10px] font-semibold text-zinc-300">
          {isFrameSpike && (
            <>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-neon-green shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-bold">Asset Streaming Bottleneck</span>
                  <span className="text-[9px] text-zinc-500 font-medium">Textures or world elements loaded from drive caused a CPU thread wait.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-neon-green shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-bold">VRAM Swapping</span>
                  <span className="text-[9px] text-zinc-500 font-medium">VRAM usage was near cap ({metrics.vram_total_mb ? ((metrics.vram_used_mb / metrics.vram_total_mb) * 100).toFixed(0) : 0}%), causing assets to spill into system RAM.</span>
                </div>
              </div>
            </>
          )}
          {isThermal && (
            <>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-bold">Thermal Throttling</span>
                  <span className="text-[9px] text-zinc-500 font-medium">Hardware cores reduced clock rates to prevent heat damage.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-bold">Aggressive Fan Curve Missing</span>
                  <span className="text-[9px] text-zinc-500 font-medium">Fan speeds failed to ramp up fast enough to offset the load.</span>
                </div>
              </div>
            </>
          )}
          {isVram && (
            <>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-bold">Texture Footprint Overload</span>
                  <span className="text-[9px] text-zinc-500 font-medium">High resolution textures saturated the VRAM cache ({metrics.vram_total_mb ? ((metrics.vram_used_mb / metrics.vram_total_mb) * 100).toFixed(0) : 0}%).</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-neon-green/5 border border-neon-green/10 mt-auto">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-neon-green shrink-0" />
          <span className="text-[9px] font-black text-neon-green uppercase tracking-widest">Mission Control Actionable Tweak</span>
        </div>
        <p className="text-[10px] font-bold text-zinc-300 leading-relaxed">
          {isFrameSpike
            ? 'Limit maximum frame rate to 90 FPS to stabilize CPU frame pacing. Enable DLSS or FSR frame generation in graphics settings.'
            : isThermal
            ? 'Set the Cooling Profile in Mission Control to Max to boost fans. Limit background processes or apply a minor undervolt.'
            : 'Reduce texture resolution to High and disable Ray Tracing to free up approximately 1.5GB of dedicated VRAM.'}
        </p>
      </div>
    </div>
  );
};

interface PerformanceIntelSectionProps {
  machines: any[];
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
  machineSessions: any[];
  selectedSessionIndex: number;
  setSelectedSessionIndex: (idx: number) => void;
  activeSession: any;
  state: TelemetryState | null;
  specs: SystemSpecs | null;
}

export const PerformanceIntelSection: React.FC<PerformanceIntelSectionProps> = ({
  machines,
  selectedMachineId,
  setSelectedMachineId,
  machineSessions,
  selectedSessionIndex,
  setSelectedSessionIndex,
  activeSession,
  state,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  return (
    <>
      {/* Machine & Session Selectors */}
      {machines.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] shrink-0 mb-2 min-w-0 max-w-full">
          {/* Machine Selector */}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">
              Target Machine
            </span>
            <div className="flex flex-wrap gap-2">
              {machines.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMachineId(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                    selectedMachineId === m.id
                      ? 'bg-neon-green/10 text-neon-green border-neon-green/20 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.15)] font-bold'
                      : 'bg-transparent text-zinc-500 border-transparent hover:bg-white/2 hover:text-zinc-300'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Session Selector */}
          {machineSessions.length > 0 && (
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">
                Select Session
              </span>
              <div className="relative">
                <select
                  value={selectedSessionIndex}
                  onChange={(e) => setSelectedSessionIndex(Number(e.target.value))}
                  className="bg-[#09090f] text-[11px] text-zinc-300 font-bold border border-white/10 rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-neon-green/30 transition-all cursor-pointer min-w-[200px] sm:min-w-[220px] max-w-full"
                >
                  {machineSessions.map((s: any, idx: number) => {
                    const dateStr = s.timestamp 
                      ? new Date(s.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : 'Unknown Date';
                    return (
                      <option key={idx} value={idx}>
                        {s.game_name || 'Gameplay'} - {dateStr}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 pb-8 min-w-0 max-w-full">
        {/* Left Column: Today's Findings & Stress Map */}
        <div className="space-y-4 sm:space-y-6 flex flex-col min-w-0">
          {/* 1. Today's Findings Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 bg-gradient-to-br from-neon-green/[0.05] via-white/[0.02] to-transparent border border-neon-green/20 rounded-3xl relative overflow-hidden flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-neon-green" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                AI Performance Narrative
              </span>
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-tight mb-3">
              {activeSession?.game_name ? `${activeSession.game_name} Session Wrapped` : 'Gameplay Analysis'}
            </h3>
            
            {(() => {
              const findings = activeSession?.summary?.findings || activeSession?.findings || [];
              if (findings.length > 0) {
                return (
                  <div className="space-y-3 text-[11px] font-semibold text-zinc-300">
                    {findings.map((finding: string, i: number) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2.5 leading-relaxed"
                      >
                        <span className="text-neon-green select-none">✓</span>
                        <span>{finding}</span>
                      </motion.div>
                    ))}
                  </div>
                );
              }
              return <p className="text-xs text-zinc-500 italic">No narrative findings compiled yet. Session data is syncing...</p>;
            })()}

            {activeSession && (
              <button
                aria-label="button"
                type="button"
                onClick={() => setIsWrappedOpen(true)}
                className="mt-6 px-4 py-2 bg-white/5 hover:bg-neon-green/10 border border-white/10 hover:border-neon-green/20 text-zinc-300 hover:text-neon-green text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer w-fit"
              >
                View Session Wrapped <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </motion.div>

          {/* 2. Hardware Stress Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 sm:p-6 bg-white/[0.03] border border-white/10 rounded-3xl min-w-0"
          >
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Hardware Stress Map
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
              <Heatbar label="CPU Core Temp" value={state?.cpu_temp || 55} max={95} unit="°C" />
              <Heatbar 
                label="GPU Core Temp" 
                value={state?.gpu_metrics?.temp || state?.gpu_metrics?.temperature || 52} 
                max={95} 
                unit="°C" 
              />
              <Heatbar 
                label="VRAM Footprint" 
                value={state?.gpu_metrics?.vram_percent || (state?.gpu_metrics?.vram_used && state?.gpu_metrics?.vram_total ? (state.gpu_metrics.vram_used / state.gpu_metrics.vram_total * 100) : 45)} 
                max={100} 
                unit="%" 
              />
              <Heatbar label="RAM Saturation" value={state?.mem_pct || 38} max={100} unit="%" />
            </div>
          </motion.div>
        </div>

        {/* Right Column: Timeline & Explain Anomaly */}
        <div className="space-y-4 sm:space-y-6 flex flex-col min-w-0">
          {/* 3. Performance Health Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 sm:p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex-1 flex flex-col min-h-64 min-w-0"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Performance Health Timeline
              </span>
            </div>
            
            {(() => {
              const events = activeSession?.summary?.events || activeSession?.events || [];
              if (events.length > 0) {
                return (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-72 space-y-4 relative">
                    <div className="absolute left-3 top-2 bottom-2 w-[1px] bg-white/5" />
                    
                    {events.map((evt: any, i: number) => {
                      const isSelected = selectedEvent === evt || (!selectedEvent && i === 0);
                      const isSpike = evt.type === 'frame_spike';
                      const isThermal = evt.type.startsWith('thermal');
                      
                      let dotColor = 'bg-neon-green border-neon-green/30';
                      if (isSpike) dotColor = 'bg-neon-green border-neon-green/30';
                      else if (isThermal) dotColor = 'bg-orange-500 border-orange-400/30';
                      else dotColor = 'bg-red-500 border-red-400/30';

                      return (
                        <div 
                          key={i}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedEvent(evt)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedEvent(evt)}
                          className={`flex items-start gap-4 p-3 rounded-2xl transition-all cursor-pointer border select-none ${
                            isSelected 
                              ? 'bg-white/5 border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.3)] text-white' 
                              : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/2 hover:text-white'
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${dotColor} border-4 shrink-0 mt-1 z-10`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-zinc-500">
                              <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className={isSelected ? 'text-neon-green' : 'text-zinc-600'}>{evt.data?.scene_type || 'unknown'}</span>
                            </div>
                            <p className="text-xs font-bold truncate mt-1">{evt.data?.message || evt.type}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 text-xs italic">
                  <CheckCircle className="w-8 h-8 text-zinc-600 mb-2" />
                  No performance anomalies or spikes detected in this session!
                </div>
              );
            })()}
          </motion.div>

          {/* 4. Explain Anomaly panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            <AnomalyDetailPanel event={selectedEvent} />
          </motion.div>
        </div>
      </div>

      {/* 5. Spotify Wrapped style Session Summary Modal */}
      <AnimatePresence>
        {isWrappedOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-[#07070c] border border-neon-green/20 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col gap-6"
            >
              {/* Glowing gradient backdrops */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-neon-green/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-start shrink-0 z-10">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-neon-green">Mission Control WRAPPED</span>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight mt-1">{activeSession?.game_name || 'Session'} Summary</h2>
                  <span className="text-[9px] font-bold text-zinc-500 block mt-0.5">
                    Duration: {activeSession?.duration_secs ? Math.round(activeSession.duration_secs / 60) : 0} mins gameplay
                  </span>
                </div>
                <button
                  aria-label="button"
                  type="button"
                  onClick={() => setIsWrappedOpen(false)}
                  className="p-1.5 hover:bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wrapped statistics */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Average FPS */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Average FPS</span>
                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none">
                      {activeSession?.fps?.avg ? Math.round(activeSession.fps.avg) : '---'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500">FPS</span>
                  </div>
                </div>

                {/* Bottleneck analysis */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">System Bottleneck</span>
                  <div className="mt-auto">
                    {activeSession?.gpu?.utilization?.avg >= 90 ? (
                      <span className="text-xs font-black text-neon-yellow uppercase tracking-wide block">GPU Bound</span>
                    ) : activeSession?.cpu?.utilization?.avg >= 85 ? (
                      <span className="text-xs font-black text-blue-400 uppercase tracking-wide block">CPU Bound</span>
                    ) : (
                      <span className="text-xs font-black text-neon-green uppercase tracking-wide block">Balanced Load</span>
                    )}
                    <span className="text-[8px] sm:text-[9px] text-zinc-500 font-medium leading-relaxed block mt-0.5 truncate">
                      GPU: {activeSession?.gpu?.utilization?.avg || 0}% · CPU: {activeSession?.cpu?.utilization?.avg || 0}%
                    </span>
                  </div>
                </div>

                {/* Performance Score */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Performance Score</span>
                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="text-2xl sm:text-3xl font-black text-neon-green font-mono leading-none">
                      {activeSession?.perf_score_avg ? Math.round(activeSession.perf_score_avg) : '100'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500">/ 100</span>
                  </div>
                </div>

                {/* Temperature Peak */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Peak Thermals</span>
                  <div className="mt-auto">
                    <span className="text-[11px] sm:text-xs font-black text-white font-mono block">
                      CPU max: {activeSession?.cpu?.temperature?.max || 0}°C
                    </span>
                    <span className="text-[11px] sm:text-xs font-black text-white font-mono block">
                      GPU max: {activeSession?.gpu?.temperature?.max || 0}°C
                    </span>
                  </div>
                </div>
              </div>

              {/* Scene Breakdown */}
              {activeSession?.scenes && Object.keys(activeSession.scenes).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Gameplay Scene Breakdown</span>
                  <div className="h-4 sm:h-5 w-full bg-white/5 rounded-full overflow-hidden flex">
                    {Object.entries(activeSession.scenes).map(([scene, percentage]: [string, any], idx) => {
                      const colors = ['bg-neon-green', 'bg-purple-500', 'bg-neon-yellow', 'bg-orange-500'];
                      const color = colors[idx % colors.length];
                      return (
                        <div 
                          key={scene} 
                          className={`h-full ${color}`}
                          style={{ width: `${percentage}%` }}
                          title={`${scene}: ${percentage}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[8px] sm:text-[9px] font-bold text-zinc-400">
                    {Object.entries(activeSession.scenes).map(([scene, percentage]: [string, any], idx) => {
                      const textColors = ['text-neon-green', 'text-purple-400', 'text-neon-yellow', 'text-orange-400'];
                      const textColor = textColors[idx % textColors.length];
                      return (
                        <div key={scene} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${textColor.replace('text-', 'bg-')}`} />
                          <span className="uppercase">{scene}</span>
                          <span className="text-zinc-600 font-mono font-medium">({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-3.5 sm:p-4 rounded-3xl bg-neon-green/5 border border-neon-green/10 flex flex-col gap-1.5">
                <span className="text-[8px] font-black text-neon-green uppercase tracking-widest block">Mission Control Recommendation</span>
                <p className="text-[10px] font-bold text-zinc-300 leading-relaxed">
                  Excellent overall stability! Consider locking FPS at 90 or 120 FPS via the control settings to keep system temps under 75°C.
                </p>
              </div>

              <button
                aria-label="button"
                type="button"
                onClick={() => setIsWrappedOpen(false)}
                className="w-full py-3 bg-neon-green hover:bg-neon-green text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg text-center cursor-pointer mt-2"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
