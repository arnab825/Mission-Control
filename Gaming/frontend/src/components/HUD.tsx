import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Lock, Unlock } from 'lucide-react';
import type { TelemetryState } from '../types/telemetry';
import { useAnalysis } from '../hooks/useAnalysis';
import { FrameTimeGraph } from './FrameTimeGraph';
import {
  ThermalState,
  VramState,
  MemoryState,
  PerformanceMode,
  HealthGrade,
} from '../lib/analysisEngine';

const HUD: React.FC<{ state: TelemetryState | null; sendCommand?: (cmd: string, data: any) => void }> = ({ state, sendCommand }) => {
  const overlayCfg = state?.config?.overlay || {};
  const fontSize = overlayCfg.font_size || 11;
  const isLocked = overlayCfg.lock_position === true;
  const showSearch = overlayCfg.show_search_hud !== false;
  const isStandalone = window.location.hash === '#hud';

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);



  const lastLockedRef = useRef<boolean | null>(null);
  const [lockNotice, setLockNotice] = useState<'locked' | 'unlocked' | null>(null);

  useEffect(() => {
    if (lastLockedRef.current === null) {
      lastLockedRef.current = isLocked;
      return;
    }
    if (isLocked !== lastLockedRef.current) {
      setLockNotice(isLocked ? 'locked' : 'unlocked');
      lastLockedRef.current = isLocked;
      const timer = setTimeout(() => {
        setLockNotice(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLocked]);


  // Analysis engine
  const analysis = useAnalysis(state);

  // ── Status helpers (map enums → display strings/styles) ──────────────────
  const cpuThermalInfo = useMemo(() => {
    const s = analysis.cpu.temperatureState;
    if (s === ThermalState.Critical) return { icon: '🔥', label: 'Critical Temp', cls: 'text-rose-400' };
    if (s === ThermalState.Warning)  return { icon: '⚠', label: 'High Temperature', cls: 'text-amber-400' };
    if (s === ThermalState.Normal)   return null; // healthy — show nothing extra
    return null;
  }, [analysis.cpu.temperatureState]);

  const cpuThrottleInfo = useMemo(() => {
    if (analysis.cpu.isThermalThrottling) return { icon: '🔥', label: 'Thermal Throttling', cls: 'text-rose-400' };
    if (analysis.cpu.isPowerLimited)      return { icon: '⚡', label: 'Power Limited', cls: 'text-amber-400' };
    return null;
  }, [analysis.cpu.isThermalThrottling, analysis.cpu.isPowerLimited]);

  const gpuThermalInfo = useMemo(() => {
    const s = analysis.gpu.temperatureState;
    if (s === ThermalState.Critical) return { icon: '🔥', label: 'Critical GPU Temp', cls: 'text-rose-400' };
    if (s === ThermalState.Warning)  return { icon: '⚠', label: 'High GPU Temp', cls: 'text-amber-400' };
    return null;
  }, [analysis.gpu.temperatureState]);

  const gpuVramInfo = useMemo(() => {
    const s = analysis.gpu.vramState;
    if (s === VramState.Critical) return { icon: '⚠', label: 'VRAM Critical', cls: 'text-rose-400' };
    if (s === VramState.High)     return { icon: '⚠', label: 'VRAM Nearly Full', cls: 'text-amber-400' };
    return null;
  }, [analysis.gpu.vramState]);

  const memInfo = useMemo(() => {
    const s = analysis.memory.state;
    if (s === MemoryState.Critical) return { icon: '🔴', label: 'Critical RAM Usage', cls: 'text-rose-400' };
    if (s === MemoryState.Warning)  return { icon: '⚠', label: 'Low Available RAM', cls: 'text-amber-400' };
    return null;
  }, [analysis.memory.state]);

  const perfMode = analysis.performance.mode;
  const healthScore = analysis.performance.healthScore;
  const healthGrade = analysis.performance.healthGrade;

  const healthColor = useMemo(() => {
    if (healthGrade === HealthGrade.Excellent) return 'text-neon-yellow';
    if (healthGrade === HealthGrade.Good)      return 'text-neon-green';
    if (healthGrade === HealthGrade.Fair)      return 'text-amber-400';
    if (healthGrade === HealthGrade.Poor)      return 'text-orange-400';
    return 'text-rose-400';
  }, [healthGrade]);

  const perfColor = useMemo(() => {
    if (perfMode === PerformanceMode.Balanced)      return 'text-neon-yellow';
    if (perfMode === PerformanceMode.Idle)          return 'text-zinc-400';
    if (perfMode === PerformanceMode.CpuBottleneck) return 'text-amber-400';
    if (perfMode === PerformanceMode.GpuBottleneck) return 'text-amber-400';
    return 'text-zinc-500';
  }, [perfMode]);

  // Memoized telemetry calculations
  const { fps, gpuUtil, gpuTemp, vramUsed, vramTot, cpuUtil, memPct, minFps, maxFps, onePctLow, gpuPwr, cpuTemp, cpuPwr, cpuFreq } = useMemo(() => {
    const gpuMetrics = (state?.gpu_metrics || {}) as any;
    return {
      fps: Math.round(state?.fps || state?.capture_fps || state?.vision_fps || 0),
      gpuUtil: Math.round(gpuMetrics.utilization ?? gpuMetrics.gpu_util ?? 0),
      gpuTemp: Math.round(gpuMetrics.temp ?? gpuMetrics.temperature ?? 0),
      gpuPwr: Math.round(gpuMetrics.power_draw ?? gpuMetrics.power_draw_w ?? 0),
      vramUsed: Math.round(gpuMetrics.vram_used ?? gpuMetrics.vram_used_mb ?? 0),
      vramTot: Math.round(gpuMetrics.vram_total ?? gpuMetrics.vram_total_mb ?? 0),
      cpuUtil: state?.cpu_pct ?? 0,
      cpuTemp: Math.round(state?.cpu_temp ?? 0),
      cpuPwr: Math.round(state?.cpu_power_w ?? 0),
      cpuFreq: Math.round(state?.cpu_freq ?? 0),
      memPct: state?.mem_pct ?? 0,
      minFps: state?.min_avg_fps ? Math.round(state.min_avg_fps) : null,
      maxFps: state?.max_avg_fps ? Math.round(state.max_avg_fps) : null,
      onePctLow: state?.one_percent_low ? Math.round(state.one_percent_low) : null,
    };
  }, [state?.is_game_active, state?.fps, state?.capture_fps, state?.vision_fps, state?.gpu_metrics, state?.cpu_pct, state?.cpu_temp, state?.cpu_power_w, state?.cpu_freq, state?.mem_pct, state?.min_avg_fps, state?.max_avg_fps, state?.one_percent_low]);

  const formatMem = (mb: number) => mb >= 1000 ? `${(mb / 1024).toFixed(1)}G` : `${mb}M`;

  const layoutStyle = useMemo(() => overlayCfg.layout_style || 'standard', [overlayCfg.layout_style]);

  const cycleLayout = useCallback(() => {
    const layouts = ['top-right', 'top-left', 'bottom-left', 'bottom-right'];
    const next = layouts[(layouts.indexOf(overlayCfg.layout || 'top-right') + 1) % layouts.length];
    sendCommand?.('update_config', { overlay: { ...overlayCfg, layout: next, x: null, y: null } });
  }, [overlayCfg, sendCommand]);

  const cycleStyle = useCallback(() => {
    const styles = ['standard', 'compact', 'horizontal'];
    const next = styles[(styles.indexOf(layoutStyle) + 1) % styles.length];
    sendCommand?.('update_config', { overlay: { ...overlayCfg, layout_style: next } });
  }, [layoutStyle, overlayCfg, sendCommand]);

  const changeScale = useCallback((delta: number) => {
    const current = overlayCfg.font_size || 11;
    let next = current + delta;
    if (next < 8) next = 8;
    if (next > 24) next = 24;
    sendCommand?.('update_config', { overlay: { ...overlayCfg, font_size: next } });
  }, [overlayCfg, sendCommand]);

  // Notify Electron when game focus changes so z-order is re-asserted
  useEffect(() => {
    if (state?.is_game_active) {
      const gamePid = (state as any)?.game_info?.pid || undefined;
      (window as any).electronAPI?.onGameFocusChanged?.(true, state?.is_game_focused === true, state?.current_game ?? undefined, gamePid);
    }
  }, [state?.is_game_active, state?.is_game_focused, state?.current_game, (state as any)?.game_info?.pid]);

  // Memoize AI analytic data
  const aiAnalytic = useMemo(() => state?.ai_analytic || { search_active: false }, [state?.ai_analytic]);
  const searchStatus = useMemo(() => aiAnalytic.search_active ? "ACTIVE" : "IDLE", [aiAnalytic.search_active]);

  const sizeClass = useMemo(() => {
    if (layoutStyle === 'compact') {
      return 'w-[220px] min-h-[220px] p-4 rounded-xl';
    } else if (layoutStyle === 'horizontal') {
      return 'w-max h-[42px] px-4 py-0 rounded-full';
    }
    return 'w-80 p-6 rounded-2xl';
  }, [layoutStyle]);

  const positionClass = useMemo(() => {
    if (overlayCfg.layout === 'top-right') return 'fixed top-24 right-8';
    if (overlayCfg.layout === 'bottom-left') return 'fixed bottom-8 left-8';
    if (overlayCfg.layout === 'bottom-right') return 'fixed bottom-8 right-8';
    return 'fixed top-24 left-8';
  }, [overlayCfg.layout]);

  const visionOverlay = (state as any)?.vision_overlay;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        drag={!isLocked && !isStandalone} // Only drag via Framer when not inside standalone BrowserWindow
        dragMomentum={false}
        className={isStandalone
          ? `${sizeClass} bg-[#0a0a0c]/85 backdrop-blur-md border border-white/10 shadow-2xl font-mono relative overflow-hidden ${isLocked ? 'cursor-default border-white/10' : 'cursor-default ring-2 ring-neon-green/50 shadow-[0_0_20px_rgba(118, 185, 0,0.3)] border-neon-green/30'}`
          : `${positionClass} ${sizeClass} bg-[#0a0a0c]/85 backdrop-blur-md border border-white/10 z-200 shadow-2xl font-mono relative overflow-hidden ${isLocked ? 'cursor-default border-white/10' : 'cursor-default ring-2 ring-neon-green/50 shadow-[0_0_20px_rgba(118, 185, 0,0.3)] border-neon-green/30'}`
        }
        style={{
          fontSize: `${fontSize}px`,
          WebkitAppRegion: isLocked || !isStandalone ? 'no-drag' : 'drag',
          transition: 'font-size 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.4s ease, box-shadow 0.4s ease, background-color 0.4s ease'
        } as any}
      >
        <AnimatePresence>
          {lockNotice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className={`absolute inset-0 bg-[#0a0a0c]/92 ${layoutStyle === 'horizontal' ? 'rounded-full flex-row gap-2' : 'rounded-2xl flex-col'} flex items-center justify-center z-210 pointer-events-none border border-neon-green/20 backdrop-blur-[2px]`}
            >
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: [0.8, 1.15, 1] }}
                transition={{ type: 'spring', stiffness: 350, damping: 15, delay: 0.05 }}
                className={`rounded-full ${layoutStyle === 'horizontal' ? 'p-1' : 'p-3.5'} ${lockNotice === 'locked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-neon-green/10 text-neon-green border border-neon-green/20'}`}
              >
                {lockNotice === 'locked' ? (
                  <Lock className={layoutStyle === 'horizontal' ? 'w-3.5 h-3.5' : 'w-7 h-7'} />
                ) : (
                  <Unlock className={layoutStyle === 'horizontal' ? 'w-3.5 h-3.5' : 'w-7 h-7'} />
                )}
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`font-black text-[0.8em] tracking-[0.2em] uppercase ${layoutStyle === 'horizontal' ? 'mt-0' : 'mt-3'} ${lockNotice === 'locked' ? 'text-red-400' : 'text-neon-green'}`}
              >
                {lockNotice === 'locked' ? 'Locked' : 'Unlocked'}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {layoutStyle === 'compact' ? (
            <motion.div
              key="compact"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="w-full h-full flex flex-col justify-between"
            >
              {isSettingsOpen ? (
                <div className="flex flex-col gap-1 h-full justify-between select-none" style={{ WebkitAppRegion: 'no-drag' } as any}>
                  <div className="flex justify-between items-center border-b border-white/10 pb-1">
                    <span className="text-[0.8em] font-black text-neon-green">CONFIG</span>
                    <button aria-label="button" type="button" onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer pointer-events-auto">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <button aria-label="button" type="button" onClick={() => { cycleStyle(); setIsSettingsOpen(false); }} className="w-full text-[0.75em] bg-white/5 hover:bg-white/10 rounded py-0.5 cursor-pointer pointer-events-auto transition-colors">Style: {layoutStyle}</button>
                  <button aria-label="button" type="button" onClick={() => { cycleLayout(); setIsSettingsOpen(false); }} className="w-full text-[0.75em] bg-white/5 hover:bg-white/10 rounded py-0.5 cursor-pointer pointer-events-auto transition-colors">Pos: {overlayCfg.layout || 'top-left'}</button>
                  <div className="flex justify-between items-center text-[0.75em] bg-white/5 rounded px-1 py-0.5 pointer-events-auto w-full">
                    <button aria-label="button" type="button" onClick={() => changeScale(-1)} className="px-1 hover:text-neon-green cursor-pointer">-</button>
                    <motion.span key={fontSize} initial={{ scale: 0.75, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }} className="text-neon-green inline-block">{fontSize}px</motion.span>
                    <button aria-label="button" type="button" onClick={() => changeScale(1)} className="px-1 hover:text-neon-green cursor-pointer">+</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 h-full justify-between select-none group">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 relative">
                    <span className="text-[0.85em] font-black text-neon-green uppercase tracking-tighter truncate max-w-[110px]">
                      {state?.is_game_active && state?.current_game ? state.current_game : 'MISSION CONTROL'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isLocked && (
                        <>
                          <button aria-label="button" type="button" onClick={() => setIsSettingsOpen(true)} className="text-zinc-400 hover:text-neon-green transition-colors cursor-pointer pointer-events-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button aria-label="button" type="button" onClick={() => (window as any).electronAPI?.toggleHUD?.()} className="text-zinc-400 hover:text-red-400 transition-colors cursor-pointer pointer-events-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <div className={`w-1.5 h-1.5 rounded-full ${state?.is_game_active ? 'bg-neon-yellow animate-pulse' : 'bg-zinc-600'}`} />
                    </div>
                  </div>

                  {state?.game_loading ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping mb-2" />
                      <span className="text-[8px] font-black tracking-widest text-neon-green animate-pulse">CALIBRATING</span>
                    </div>
                  ) : (
                    <>
                      {showSearch && (
                        <div className="flex justify-between items-center py-0.5 bg-purple-500/5 px-1 rounded mb-1">
                          <span className="text-[0.7em] font-black text-purple-400 uppercase">AI AGENT</span>
                          <span className={`text-[0.75em] font-black ${aiAnalytic.search_active ? 'text-neon-green animate-pulse' : 'text-zinc-500'}`}>
                            {searchStatus}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">FPS</span>
                        <div className="flex gap-1 items-center">
                          <span className="text-[0.8em] font-bold text-white">{state?.is_game_active ? fps : 'N/A'}</span>
                          {state?.is_game_active && minFps !== null && maxFps !== null && (
                            <span className="text-[0.65em] font-bold text-zinc-400 px-1.5 py-0.5 bg-white/5 rounded" title="Average Min-Max FPS range">
                              [{minFps}-{maxFps}]
                            </span>
                          )}
                        </div>
                      </div>

                      {state?.is_game_active && state?.frametimes && state.frametimes.length > 0 && (
                        <div className="py-0.5 mb-1 bg-black/20 rounded">
                          <FrameTimeGraph frametimes={state.frametimes} height={16} color="#76b900" />
                        </div>
                      )}

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">GPU Load</span>
                        <span className="text-[0.8em] font-bold text-white">{gpuUtil}%</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">GPU Core</span>
                        <span className="text-[0.8em] font-bold text-white">{gpuTemp}°C | {gpuPwr}W</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">VRAM</span>
                        <span className="text-[0.8em] font-bold text-white">{formatMem(vramUsed)} / {vramTot > 0 ? formatMem(vramTot) : '—'}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">CPU Load</span>
                        <span className="text-[0.8em] font-bold text-white">{cpuUtil.toFixed(0)}%</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">CPU Core</span>
                        <span className="text-[0.8em] font-bold text-white">{cpuTemp > 0 ? `${cpuTemp}°C` : 'N/A'} {cpuPwr > 0 ? `| ${cpuPwr}W` : ''} {cpuFreq > 0 ? `| ${(cpuFreq / 1000).toFixed(1)}G` : ''}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">RAM Load</span>
                        <span className="text-[0.8em] font-bold text-white">{memPct.toFixed(0)}% | {state?.mem_used_gb?.toFixed(1) || '0'}G</span>
                      </div>


                      {/* Compact health pill */}
                      <div className="flex justify-between items-center pt-1 mt-0.5 border-t border-white/5">
                        <span className="text-[0.7em] font-black text-zinc-500 uppercase">Health</span>
                        <span className={`text-[0.75em] font-black ${healthColor}`}>
                          {healthScore}% {healthGrade === HealthGrade.Excellent ? '✓' : healthGrade === HealthGrade.Critical ? '⚠' : ''}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ) : layoutStyle === 'horizontal' ? (
            <motion.div
              key="horizontal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full h-full flex items-center justify-between"
            >
              {isSettingsOpen ? (
                <div className="flex items-center justify-between w-full h-full select-none" style={{ WebkitAppRegion: 'no-drag' } as any}>
                  <span className="text-[0.8em] font-black text-neon-green mr-4 border-r border-white/10 pr-4">CONFIG</span>
                  <div className="flex items-center gap-2 flex-1">
                    <button aria-label="button" type="button" onClick={() => { cycleStyle(); setIsSettingsOpen(false); }} className="text-[0.75em] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer pointer-events-auto transition-colors">Style: {layoutStyle}</button>
                    <button aria-label="button" type="button" onClick={() => { cycleLayout(); setIsSettingsOpen(false); }} className="text-[0.75em] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer pointer-events-auto transition-colors">Pos: {overlayCfg.layout || 'top-left'}</button>
                    <div className="flex gap-1.5 items-center text-[0.75em] bg-white/5 px-1.5 py-0.5 rounded pointer-events-auto">
                      <button aria-label="button" type="button" onClick={() => changeScale(-1)} className="px-1 hover:text-neon-green cursor-pointer">-</button>
                      <motion.span key={fontSize} initial={{ scale: 0.75, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }} className="text-neon-green inline-block">{fontSize}px</motion.span>
                      <button aria-label="button" type="button" onClick={() => changeScale(1)} className="px-1 hover:text-neon-green cursor-pointer">+</button>
                    </div>
                  </div>
                  <button aria-label="button" type="button" onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-white p-1 cursor-pointer pointer-events-auto">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1.5 h-full select-none w-full text-zinc-300 font-mono tracking-tight">
                  {/* Holographic Game / Status */}
                  <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-md">
                    <div className={`w-1.5 h-1.5 rounded-full ${state?.is_game_active ? 'bg-neon-yellow animate-pulse' : 'bg-slate-500'}`} />
                    <span className="font-black bg-gradient-to-r from-neon-green to-blue-500 bg-clip-text text-transparent uppercase tracking-tight truncate max-w-[130px]">
                      {state?.is_game_active && state?.current_game ? state.current_game : 'MISSION CONTROL'}
                    </span>
                  </div>

                  {state?.game_loading ? (
                    <div className="flex items-center gap-2 text-neon-green flex-1 justify-center bg-slate-900/20 border border-white/5 rounded-full py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
                      <span className="text-[0.8em] font-black tracking-widest animate-pulse">CALIBRATING TELEMETRY</span>
                    </div>
                  ) : (
                    <>
                      {/* FPS */}
                      <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-md">
                        <span className="text-slate-500 font-extrabold uppercase text-[0.7em]">FPS</span>
                        <span className="font-extrabold text-neon-green text-[1.05em] drop-shadow-[0_0_8px_rgba(118, 185, 0,0.25)]">
                          {state?.is_game_active ? fps : '—'}
                        </span>
                        {state?.is_game_active && onePctLow !== null && (
                          <span className="text-amber-400 font-black text-[0.85em] ml-1 bg-amber-500/10 px-1 rounded">
                            {onePctLow}
                          </span>
                        )}
                      </div>

                      {/* GPU */}
                      <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-md">
                        <span className="text-slate-500 font-extrabold uppercase text-[0.7em]">GPU</span>
                        <span className="font-bold text-white">{gpuUtil}%</span>
                        <span className={`font-bold ${gpuTemp > 80 ? 'text-rose-400' : gpuTemp > 65 ? 'text-amber-400' : 'text-neon-yellow'}`}>{gpuTemp}°C</span>
                        {gpuPwr > 0 && <span className="text-slate-400">{gpuPwr}W</span>}
                      </div>

                      {/* CPU */}
                      <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-md">
                        <span className="text-slate-500 font-extrabold uppercase text-[0.7em]">CPU</span>
                        <span className="font-bold text-white">{cpuUtil.toFixed(0)}%</span>
                        {cpuTemp > 0 && (
                          <span className={`font-bold ${cpuTemp > 80 ? 'text-rose-400' : cpuTemp > 65 ? 'text-amber-400' : 'text-neon-yellow'}`}>{cpuTemp}°C</span>
                        )}
                        {cpuPwr > 0 && <span className="text-slate-400">{cpuPwr}W</span>}
                      </div>

                      {/* MEM */}
                      <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-md">
                        <span className="text-slate-500 font-extrabold uppercase text-[0.7em]">RAM</span>
                        <span className="font-bold text-white">{state?.mem_used_gb?.toFixed(1) || '0'}G</span>
                        <span className="text-slate-500 font-extrabold uppercase text-[0.7em] ml-1">VRAM</span>
                        <span className="font-bold text-white">{formatMem(vramUsed)}</span>
                      </div>

                      {/* AI Intel */}
                      {showSearch && (
                        <div className={`flex items-center gap-1 shrink-0 px-2 py-0.5 border rounded-full backdrop-blur-md ${aiAnalytic.search_active ? 'bg-indigo-950/30 border-purple-500/20 text-neon-green' : 'bg-slate-900/40 border-white/5 text-slate-500'}`}>
                          <span className="text-[0.7em] font-black uppercase tracking-wider">AI</span>
                          <span className={`text-[0.85em] font-black tracking-tight ${aiAnalytic.search_active ? 'text-neon-green animate-pulse drop-shadow-[0_0_6px_rgba(118, 185, 0,0.3)]' : 'text-slate-500'}`}>
                            {searchStatus}
                          </span>
                        </div>
                      )}


                      {/* System Health */}
                      <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-md">
                        <span className="text-slate-500 font-extrabold uppercase text-[0.7em]">HEALTH</span>
                        <span className={`font-black ${healthColor}`}>
                          {healthScore}%
                        </span>
                        <span className={`text-[0.75em] font-bold ${healthColor} border-l border-white/10 pl-1`}>
                          {healthGrade}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Settings / Controls */}
                  {!isLocked && (
                    <div className="flex items-center gap-2 shrink-0 px-2.5 py-0.5 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-md pointer-events-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
                      <button aria-label="button" type="button" onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-neon-green transition-colors cursor-pointer p-1 rounded hover:bg-white/5 flex items-center justify-center">
                        <Settings className="w-[1.2em] h-[1.2em]" />
                      </button>
                      <button aria-label="button" type="button" onClick={() => (window as any).electronAPI?.toggleHUD?.()} className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer p-1 rounded hover:bg-white/5 flex items-center justify-center">
                        <X className="w-[1.2em] h-[1.2em]" />
                      </button>
                    </div>
                  )}

                  {!isStandalone && (
                    <div className="border-l border-white/10 pl-2 text-[0.8em] font-black text-neon-green shrink-0">
                      {isLocked ? 'LOCKED' : 'DRAG'}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="standard"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="w-full h-full flex flex-col justify-between"
            >
              {isSettingsOpen ? (
                <div className="flex flex-col gap-4 h-full select-none" style={{ WebkitAppRegion: 'no-drag' } as any}>
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-[0.9em] font-black text-neon-green uppercase tracking-tighter">HUD Config</span>
                    <button aria-label="button" type="button" onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/5 cursor-pointer pointer-events-auto transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="bg-white/5 p-3.5 rounded-xl flex flex-col gap-2.5 text-[0.8em] font-bold border border-white/5">
                      <span className="text-zinc-300">Design Style</span>
                      <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                        {['standard', 'compact', 'horizontal'].map((s) => (
                          <button
                            key={s}
                            aria-label={`style-${s}`}
                            type="button"
                            onClick={() => { sendCommand?.('update_config', { overlay: { ...overlayCfg, layout_style: s } }); setIsSettingsOpen(false); }}
                            className={`flex-1 py-1 text-center text-[0.9em] uppercase font-black tracking-tight rounded-md cursor-pointer transition-all ${
                              layoutStyle === s
                                ? 'bg-neon-green/20 text-neon-green border border-neon-green/30 shadow-[0_0_10px_rgba(118, 185, 0,0.15)]'
                                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-3.5 rounded-xl flex flex-col gap-2.5 text-[0.8em] font-bold border border-white/5">
                      <span className="text-zinc-300">Preset Position</span>
                      <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                        {[
                          { value: 'top-left', label: 'Top-L' },
                          { value: 'top-right', label: 'Top-R' },
                          { value: 'bottom-left', label: 'Bot-L' },
                          { value: 'bottom-right', label: 'Bot-R' }
                        ].map((pos) => (
                          <button
                            key={pos.value}
                            aria-label={`pos-${pos.value}`}
                            type="button"
                            onClick={() => { sendCommand?.('update_config', { overlay: { ...overlayCfg, layout: pos.value, x: null, y: null } }); setIsSettingsOpen(false); }}
                            className={`py-1 text-center text-[0.85em] uppercase font-black rounded-md cursor-pointer transition-all ${
                              (overlayCfg.layout || 'top-left') === pos.value
                                ? 'bg-neon-green/20 text-neon-green border border-neon-green/30 shadow-[0_0_10px_rgba(118, 185, 0,0.15)]'
                                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl flex justify-between items-center text-[0.8em] font-bold pointer-events-auto border border-white/5 w-full">
                      <span className="text-zinc-300">Scaling</span>
                      <div className="flex gap-3 items-center">
                        <button aria-label="button" type="button" onClick={() => changeScale(-1)} className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors text-white hover:text-neon-green">-</button>
                        <motion.span key={fontSize} initial={{ scale: 0.75, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }} className="text-neon-green min-w-7.5 text-center inline-block">{fontSize}px</motion.span>
                        <button aria-label="button" type="button" onClick={() => changeScale(1)} className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors text-white hover:text-neon-green">+</button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto text-center">
                    <span className="text-[0.7em] text-zinc-500">Other settings are available in main app.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 group select-none">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <span className="text-[0.9em] font-black text-neon-green uppercase tracking-tighter truncate max-w-37.5">
                      {state?.is_game_active && state?.current_game ? state.current_game : 'Tactical Interface'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isLocked && (
                        <>
                          <button aria-label="button" type="button" onClick={() => setIsSettingsOpen(true)} className="text-zinc-400 hover:text-neon-green transition-colors cursor-pointer pointer-events-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
                            <Settings className="w-4 h-4" />
                          </button>
                          <button aria-label="button" type="button" onClick={() => (window as any).electronAPI?.toggleHUD?.()} className="text-zinc-400 hover:text-red-400 transition-colors cursor-pointer pointer-events-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <div className={`w-1.5 h-1.5 rounded-full ${state?.is_game_active ? 'bg-neon-yellow animate-pulse' : 'bg-zinc-600'}`} />
                      <span className="text-[0.8em] font-black text-white uppercase tracking-tight">
                        {state?.is_game_active ? 'Online' : 'Standby'}
                      </span>
                    </div>
                  </div>

                  {state?.game_loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-neon-green/10 animate-pulse" />
                        <div className="absolute inset-2 rounded-full border border-dashed border-neon-green/20 animate-spin [animation-duration:8s]" />
                        <div className="w-8 h-8 rounded-full bg-neon-green/10 border border-neon-green/30 animate-pulse flex items-center justify-center shadow-[0_0_15px_rgba(118, 185, 0,0.15)]">
                          <div className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-[10px] font-black tracking-[0.2em] text-neon-green animate-pulse">CALIBRATING</span>
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Hooking Presentation Queue</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Search Intelligence HUD Row */}
                      {showSearch && (
                        <div className="flex justify-between items-center bg-purple-500/5 border border-purple-500/10 rounded-lg px-3 py-2 mb-2">
                          <span className="text-[0.85em] font-black text-purple-400 uppercase">Intelligence</span>
                          <span className={`text-[0.85em] font-black ${aiAnalytic.search_active ? 'text-neon-green animate-pulse' : 'text-zinc-500'}`}>
                            SEARCH: {searchStatus}
                          </span>
                        </div>
                      )}

                      {/* Dynamic FPS Monitor */}
                      <div className="flex justify-between items-center py-1">
                        <span className={`text-[0.85em] font-black uppercase ${state?.is_game_active ? 'text-neon-yellow' : 'text-orange-400'}`}>
                          {state?.is_game_active ? 'Game FPS' : 'Vision FPS'}
                        </span>
                        <span className="text-[0.9em] font-bold text-white">
                          {state?.is_game_active ? `${fps} FPS` : 'N/A'}
                        </span>
                      </div>

                      {/* FPS Performance Stats (1% Low / Avg Min / Avg Max) — shown only during active gameplay */}
                      {state?.is_game_active && (onePctLow !== null || minFps !== null || maxFps !== null) && (
                        <div className="flex gap-2.5 mt-1 select-none">
                          {onePctLow !== null && (
                            <div className="flex-1 flex flex-col items-center py-1 px-1.5 rounded-xl bg-amber-500/5 border border-amber-500/10 shadow-sm" title="1% Low FPS — average of the slowest 1% of frames">
                              <span className="text-[0.55em] font-black text-amber-500/70 uppercase tracking-wider">1% Low</span>
                              <span className="text-[0.85em] font-black text-amber-400 mt-0.5">{onePctLow}</span>
                            </div>
                          )}
                          {minFps !== null && (
                            <div className="flex-1 flex flex-col items-center py-1 px-1.5 rounded-xl bg-slate-900/40 border border-white/5 shadow-sm" title="Session minimum average FPS">
                              <span className="text-[0.55em] font-black text-slate-500 uppercase tracking-wider">Avg Min</span>
                              <span className="text-[0.85em] font-black text-slate-300 mt-0.5">{minFps}</span>
                            </div>
                          )}
                          {maxFps !== null && (
                            <div className="flex-1 flex flex-col items-center py-1 px-1.5 rounded-xl bg-neon-yellow/5 border border-neon-yellow/10 shadow-sm" title="Session maximum average FPS">
                              <span className="text-[0.55em] font-black text-neon-yellow/70 uppercase tracking-wider">Avg Max</span>
                              <span className="text-[0.85em] font-black text-neon-yellow mt-0.5">{maxFps}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Frame Time Graph */}
                      {state?.is_game_active && state?.frametimes && state.frametimes.length > 0 && (
                        <div className="py-1 mt-1 bg-black/20 rounded-xl px-2">
                          <FrameTimeGraph frametimes={state.frametimes} height={28} color="#76b900" />
                        </div>
                      )}

                      {/* GPU Telemetry Block */}
                      <div className="pt-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">GPU Load</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[0.85em] font-bold text-white">{gpuUtil}%</span>
                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-neon-yellow transition-all duration-300"
                                style={{ width: `${gpuUtil}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">GPU Temp</span>
                          <span className="text-[0.85em] font-bold text-white">{gpuTemp}°C <span className="text-zinc-500 mx-1">|</span> {gpuPwr}W</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">VRAM Usage</span>
                          <span className="text-[0.85em] font-bold text-white">
                            {formatMem(vramUsed)} / {vramTot > 0 ? formatMem(vramTot) : '—'}
                          </span>
                        </div>

                        {/* GPU Status badge */}
                        <AnimatePresence mode="wait">
                          {(gpuThermalInfo || gpuVramInfo) ? (
                            <motion.div
                              key={(gpuThermalInfo?.label ?? '') + (gpuVramInfo?.label ?? '')}
                              initial={{ opacity: 0, y: -3 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -3 }}
                              transition={{ duration: 0.2 }}
                              className="flex flex-wrap gap-1"
                            >
                              {gpuThermalInfo && (
                                <span className={`text-[0.72em] font-black ${gpuThermalInfo.cls}`}>
                                  {gpuThermalInfo.icon} {gpuThermalInfo.label}
                                </span>
                              )}
                              {gpuVramInfo && (
                                <span className={`text-[0.72em] font-black ${gpuVramInfo.cls}`}>
                                  {gpuVramInfo.icon} {gpuVramInfo.label}
                                </span>
                              )}
                            </motion.div>
                          ) : (
                            <motion.span
                              key="gpu-ok"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-[0.72em] font-black text-neon-yellow"
                            >
                              ✓ Healthy
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* CPU & RAM Telemetry Block */}
                      <div className="pt-3 space-y-2 border-t border-white/5 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">CPU Util</span>
                          <span className="text-[0.85em] font-bold text-white">{cpuUtil.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">CPU Core</span>
                          <span className="text-[0.85em] font-bold text-white">{cpuTemp > 0 ? `${cpuTemp}°C` : '—'} <span className="text-zinc-500 mx-1">|</span> {cpuPwr > 0 ? `${cpuPwr}W` : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">CPU Clock</span>
                          <span className="text-[0.85em] font-bold text-white">{cpuFreq > 0 ? `${(cpuFreq / 1000).toFixed(2)} GHz` : '—'}</span>
                        </div>

                        {/* CPU Status badge */}
                        <AnimatePresence mode="wait">
                          {(cpuThrottleInfo || cpuThermalInfo) ? (
                            <motion.div
                              key={(cpuThrottleInfo?.label ?? '') + (cpuThermalInfo?.label ?? '')}
                              initial={{ opacity: 0, y: -3 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -3 }}
                              transition={{ duration: 0.2 }}
                              className="flex flex-wrap gap-1"
                            >
                              {cpuThrottleInfo && (
                                <span className={`text-[0.72em] font-black ${cpuThrottleInfo.cls}`}>
                                  {cpuThrottleInfo.icon} {cpuThrottleInfo.label}
                                </span>
                              )}
                              {cpuThermalInfo && !cpuThrottleInfo && (
                                <span className={`text-[0.72em] font-black ${cpuThermalInfo.cls}`}>
                                  {cpuThermalInfo.icon} {cpuThermalInfo.label}
                                </span>
                              )}
                            </motion.div>
                          ) : (
                            <motion.span
                              key="cpu-ok"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-[0.72em] font-black text-neon-yellow"
                            >
                              ✓ Healthy
                            </motion.span>
                          )}
                        </AnimatePresence>

                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">Memory</span>
                          <span className="text-[0.85em] font-bold text-white">
                            {memPct.toFixed(1)}% <span className="text-zinc-500 mx-1">|</span> {state?.mem_used_gb?.toFixed(1) || '0'} GB
                          </span>
                        </div>

                        {/* Memory Status badge */}
                        <AnimatePresence mode="wait">
                          {memInfo ? (
                            <motion.span
                              key={memInfo.label}
                              initial={{ opacity: 0, y: -3 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -3 }}
                              transition={{ duration: 0.2 }}
                              className={`text-[0.72em] font-black ${memInfo.cls}`}
                            >
                              {memInfo.icon} {memInfo.label}
                            </motion.span>
                          ) : (
                            <motion.span
                              key="mem-ok"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-[0.72em] font-black text-neon-yellow"
                            >
                              ✓ Healthy
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Performance & Health Block */}
                      <div className="pt-3 space-y-2 border-t border-white/5 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">Performance</span>
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={perfMode}
                              initial={{ opacity: 0, x: 4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 4 }}
                              transition={{ duration: 0.2 }}
                              className={`text-[0.8em] font-black ${perfColor}`}
                            >
                              {perfMode === PerformanceMode.Unknown ? '—' : perfMode}
                            </motion.span>
                          </AnimatePresence>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[0.8em] font-black text-zinc-500 uppercase">System Health</span>
                          <div className="flex items-center gap-1.5">
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={healthScore}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className={`text-[0.9em] font-black ${healthColor}`}
                              >
                                {healthScore}
                              </motion.span>
                            </AnimatePresence>
                            <span className={`text-[0.72em] font-black ${healthColor}`}>{healthGrade}</span>
                          </div>
                        </div>

                      </div>
                    </>
                  )}

                  {/* Lock/Drag Overlay Status Indicator */}
                  <div className={`w-full mt-6 py-2 px-3 rounded-xl text-[0.75em] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-300 ${isLocked ? 'bg-neon-yellow/5 text-neon-yellow/50 border border-neon-yellow/10' : 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_15px_rgba(118, 185, 0,0.2)] animate-pulse'}`}>
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{isLocked ? 'HUD Locked' : 'Ready to Move'}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>


      </motion.div>

      {/* Full-Screen Local Vision Overlay */}
      {visionOverlay && !visionOverlay.error && visionOverlay.boxes && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <svg className="w-full h-full">
            {visionOverlay.boxes.map((b: any, i: number) => (
              <g key={i}>
                <rect
                  x={b.box[0]}
                  y={b.box[1]}
                  width={b.box[2] - b.box[0]}
                  height={b.box[3] - b.box[1]}
                  fill="none"
                  stroke="#76b900"
                  strokeWidth="2"
                />
                <text
                  x={b.box[0]}
                  y={b.box[1] - 5}
                  fill="#76b900"
                  fontSize="12"
                  fontWeight="bold"
                  className="drop-shadow-md"
                >
                  {b.label} ({Math.round(b.confidence * 100)}%)
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </>
  );
};

export default HUD;
