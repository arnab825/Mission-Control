import React, { useState } from 'react';
import {
  Cpu,
  AlertTriangle,
  Sliders,
  Zap,
  Target,
  Check,
  ArrowRight,
  BookOpen,
  Info,
  Flame
} from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { HardwareFeatureMatrix } from './HardwareFeatureMatrix';
import { PRESET_DETAILS } from '../../data/settingsConstants';
import type { TelemetryState } from '../../types/telemetry';

interface GpuPipelineSectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  updateGpuTuning: (updates: any) => void;
  activePreset: string;
  handlePresetChange: (preset: string) => void;
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
  isCapableGpu: boolean;
  isAdvancedGpu: boolean;
  libraryStats: {
    dlssGamesCount: number;
    fgGamesCount: number;
    rtGamesCount: number;
    ptGamesCount: number;
    reflexGamesCount: number;
    hdrGamesCount: number;
  };
  activeFeatures: string[] | null;
  effectiveLibrary: any[];
  userId?: string | null;
  searchQuery?: string;
  onShowDlssGuide: () => void;
}

export const GpuPipelineSection: React.FC<GpuPipelineSectionProps> = ({
  localConfig,
  updateGpuTuning,
  activePreset,
  handlePresetChange,
  state,
  sendCommand,
  isCapableGpu,
  isAdvancedGpu,
  libraryStats,
  activeFeatures,
  effectiveLibrary,
  userId,
  searchQuery,
  onShowDlssGuide
}) => {
  const [isApplying, setIsApplying] = useState(false);

  const currentTuning = localConfig.gpu_tuning || localConfig.nvidia || {};

  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Processing Pipeline"
      icon={Cpu}
      searchTerms="nvidia dlss rtx ray tracing frame generation reflex hdr gpu tuning power limit nvml preset optimizer"
    >
      {!isCapableGpu ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 select-none">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-0.5">Advanced GPU Required</span>
            <p className="text-[9px] font-bold text-zinc-500 leading-normal uppercase">
              This system does not have an active NVIDIA GPU. Hardware-accelerated DLSS, Ray Tracing, Reflex, and Frame Generation are locked.
            </p>
          </div>
        </div>
      ) : (
        !isAdvancedGpu && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 select-none">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-0.5">Legacy GPU Detected</span>
              <p className="text-[9px] font-bold text-zinc-500 leading-normal uppercase">
                Legacy technologies (Reflex, PhysX, Ansel) are supported, but RTX hardware-specific features (Ray Tracing, DLSS, and Frame Gen) are locked.
              </p>
            </div>
          </div>
        )
      )}

      {/* Global NVIDIA Preset Grid */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-200 mb-0.5 uppercase tracking-widest">Global NVIDIA Preset</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Choose a unified preset. This <span className="text-neon-green font-bold">immediately applies</span> to your Windows Power Plan and NVIDIA GPU Power Limit (via NVML). DLSS/RT/FG toggles below are <span className="text-amber-400 font-bold">advisory preferences</span> used by the AI assistant — they must be set inside each game's own settings menu.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full mt-2">
          {PRESET_DETAILS.map((preset) => {
            const isActive = activePreset === preset.key;
            const PresetIcon = preset.icon;
            return (
              <button
                aria-label="button"
                type="button"
                key={preset.key}
                onClick={() => handlePresetChange(preset.key)}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between text-left select-none outline-hidden h-full cursor-pointer relative overflow-hidden group ${
                  isActive
                    ? 'bg-neon-green/10 border-neon-green/40 text-neon-green shadow-[0_0_20px_rgba(118,185,0,0.15)] ring-1 ring-neon-green/20'
                    : 'bg-white/2 border-white/5 text-zinc-400 hover:bg-white/4 hover:border-white/10 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-neon-green to-blue-500" />
                )}

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {PresetIcon && (
                        <PresetIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-neon-green' : 'text-zinc-400'}`} />
                      )}
                      <h4 className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {preset.title}
                      </h4>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(118,185,0,0.8)] mt-1.5 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] font-medium leading-relaxed opacity-80 min-h-[32px]">
                    {preset.desc}
                  </p>
                </div>

                <div className="space-y-2.5 mt-4 pt-3 border-t border-white/5 w-full">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">GPU Power</span>
                      <span className={isActive ? 'text-neon-green' : 'text-zinc-400'}>{preset.powerLimit}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">Power Plan</span>
                      <span className={isActive ? 'text-neon-green' : 'text-zinc-400'}>{preset.powerPlan}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Pipeline:</span>
                    {preset.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wide opacity-90">
                        <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-neon-green' : 'bg-zinc-600'}`} />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Hardware Status */}
      {(() => {
        const gpuM = state?.gpu_metrics as any;
        const rawPowerDraw = gpuM?.power_draw_w ?? gpuM?.power_draw ?? null;
        const rawPowerLimit = gpuM?.power_limit_w ?? gpuM?.power_limit ?? null;
        const powerDraw = rawPowerDraw !== null ? Math.round(rawPowerDraw) : null;
        const powerLimit = rawPowerLimit !== null ? Math.round(rawPowerLimit) : null;
        const limitPct =
          rawPowerDraw && rawPowerLimit && rawPowerLimit > 0
            ? Math.round((rawPowerDraw / rawPowerLimit) * 100)
            : null;

        const presetMap: Record<string, { color: string; label: string }> = {
          quality: { color: 'text-neon-green', label: 'RTX Ultra Quality' },
          performance: { color: 'text-blue-400', label: 'RTX High FPS' },
          balanced: { color: 'text-violet-400', label: 'RTX Balanced' },
          latency: { color: 'text-neon-yellow', label: 'eSports Latency' },
          off: { color: 'text-zinc-400', label: 'Stock / Power Save' },
          auto: { color: 'text-amber-400', label: 'Auto-Configure' },
          custom: { color: 'text-rose-400', label: 'Custom Profile' },
        };
        const active = presetMap[activePreset] ?? presetMap.custom;

        return (
          <div className="bg-black/30 border border-white/8 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(191,255,0,0.7)] animate-pulse" />
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Live Hardware Status</span>
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/8 shrink-0" />

            <div className="flex flex-wrap gap-x-6 gap-y-2 flex-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Active Preset</span>
                <span className={`text-[10px] font-black uppercase tracking-wide ${active.color}`}>{active.label}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">GPU Power Draw</span>
                <span className="text-[10px] font-black text-white">
                  {powerDraw !== null ? `${powerDraw}W draw` : <span className="text-zinc-600">—</span>}
                  {powerLimit !== null && powerLimit > 0 && <span className="text-zinc-500 font-medium"> / {powerLimit}W limit</span>}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Power Plan</span>
                <span className="text-[10px] font-black text-white">
                  {activePreset === 'off' || activePreset === 'balanced' ? (
                    <span className="text-violet-400">Balanced Mode</span>
                  ) : activePreset === 'latency' || activePreset === 'performance' || activePreset === 'quality' ? (
                    <span className="text-neon-yellow">High Performance</span>
                  ) : (
                    <span className="text-zinc-400">Adaptive</span>
                  )}
                </span>
              </div>

              {limitPct !== null && (
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Power Usage</span>
                    <span className="text-[8px] font-black text-zinc-400">{limitPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        limitPct > 85 ? 'bg-red-400' : limitPct > 60 ? 'bg-amber-400' : 'bg-neon-yellow'
                      }`}
                      style={{ width: `${limitPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              aria-label="Apply preset hardware settings now"
              type="button"
              onClick={() => {
                setIsApplying(true);
                sendCommand('save_settings', { config: localConfig });
                setTimeout(() => setIsApplying(false), 1500);
              }}
              disabled={isApplying}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-neon-yellow/10 border border-neon-yellow/30 hover:bg-neon-yellow/20 hover:border-neon-yellow/50 text-neon-yellow font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
            >
              {isApplying ? (
                <>
                  <div className="w-3 h-3 border border-neon-yellow/30 border-t-neon-yellow rounded-full animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  Apply Now
                </>
              )}
            </button>
          </div>
        );
      })()}

      {/* Preset Optimizer Panel */}
      {!state?.preset_optimizer || state.preset_optimizer.status === 'no_game' ? (
        <div className="bg-[#08080c]/80 border border-white/5 rounded-2xl p-5 flex flex-col gap-5 overflow-hidden relative">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neon-green/5 border border-white/5 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">Preset Optimizer</h4>
                <p className="text-[10px] text-zinc-500 font-medium">Status: Standby — Waiting for active game...</p>
              </div>
            </div>
            <button
              aria-label="Rescan"
              type="button"
              onClick={() =>
                sendCommand('scan_preset_optimizer', {
                  preset: currentTuning.preset || 'quality',
                  game_entry: (state as any)?.game_info || null
                })
              }
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors text-zinc-300 shrink-0"
            >
              Rescan Config
            </button>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse shrink-0" />
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-relaxed">
              Launch a game to automatically analyze, semantically map, and align your selected RTX preset using the Zero-Config AI engine.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#08080c]/80 border border-white/10 rounded-2xl p-5 flex flex-col gap-5 overflow-hidden relative">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-neon-green" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Preset Optimizer</h4>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Comparing <span className="text-neon-green">{state.preset_optimizer.preset}</span> preset against{' '}
                  <span className="text-white">{state.preset_optimizer.game_title}</span> config
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neon-yellow/10 border border-neon-yellow/20">
                  <Check className="w-3 h-3 text-neon-yellow" />
                  <span className="text-[9px] font-black text-neon-yellow">
                    {state.preset_optimizer.match_count || 0} Matches
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-[9px] font-black text-amber-400">
                    {state.preset_optimizer.mismatch_count || 0} Mismatches
                  </span>
                </div>
              </div>
              <button
                aria-label="Rescan"
                type="button"
                onClick={() =>
                  sendCommand('scan_preset_optimizer', {
                    preset: currentTuning.preset || 'quality',
                    game_entry: (state as any)?.game_info || null
                  })
                }
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors text-zinc-300 shrink-0"
              >
                Rescan Config
              </button>
            </div>
          </div>

          {state.preset_optimizer.status === 'error' ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-[10px] font-bold text-red-400">Scan Error: {state.preset_optimizer.error}</p>
            </div>
          ) : state.preset_optimizer.status === 'no_config_found' ? (
            <div className="p-4 bg-zinc-800/50 border border-white/5 rounded-xl">
              <p className="text-[10px] font-medium text-zinc-400">
                Could not locate config files for {state.preset_optimizer.game_title}. You will need to manually configure settings in-game.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {state.preset_optimizer.items.map((item: any) => {
                const isMatch = item.status === 'match';
                const isMismatch = item.status === 'mismatch';
                const isOptMismatch = item.status === 'optional_mismatch';
                const isUnsupported = item.status === 'not_supported';
                const isUnknown = item.status === 'unknown';

                const renderValuePill = (val: string | null) => {
                  if (!val) {
                    return (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800/40 border border-white/5 text-[9px] font-mono font-bold text-zinc-500 uppercase">
                        Unknown
                      </span>
                    );
                  }
                  const normalized = val.toUpperCase();
                  let colorClasses = 'bg-zinc-800/60 border border-white/10 text-zinc-400';
                  if (normalized === 'ON') {
                    colorClasses = 'bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow font-bold';
                  } else if (normalized === 'OFF') {
                    colorClasses = 'bg-red-500/10 border border-red-500/20 text-red-400 font-bold';
                  } else if (
                    ['LOW', 'MEDIUM', 'HIGH', 'ULTRA', 'QUALITY', 'BALANCED', 'PERFORMANCE', 'NORMAL', 'EXTREME', 'VERY'].some(
                      kw => normalized.includes(kw)
                    )
                  ) {
                    colorClasses = 'bg-neon-green/10 border border-neon-green/20 text-neon-green font-bold';
                  }
                  return (
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono tracking-wider uppercase ${colorClasses}`}>
                      {normalized}
                    </span>
                  );
                };

                let borderAccentClass = 'border-l-[3px] border-l-zinc-700/40 border-y border-r border-white/5';
                let statusColor = 'text-zinc-500 bg-zinc-800 border-zinc-700';
                let icon = <div className="w-3 h-3 rounded-full bg-zinc-600" />;

                if (isUnsupported) {
                  borderAccentClass = 'border-l-[3px] border-l-red-500/40 border-y border-r border-white/5';
                  statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                  icon = (
                    <div className="w-3 h-3 rounded-full border-2 border-red-400 flex items-center justify-center">
                      <div className="w-1.5 h-0.5 bg-red-400" />
                    </div>
                  );
                } else if (isMatch) {
                  borderAccentClass = 'border-l-[3px] border-l-neon-yellow/50 border-y border-r border-white/5';
                  statusColor = 'text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20 shadow-[0_0_10px_rgba(191,255,0,0.15)]';
                  icon = <Check className="w-3 h-3 text-neon-yellow" />;
                } else if (isMismatch) {
                  borderAccentClass = 'border-l-[3px] border-l-amber-500/70 border-y border-r border-white/5';
                  statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
                  icon = <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />;
                } else if (isOptMismatch) {
                  borderAccentClass = 'border-l-[3px] border-l-blue-500/60 border-y border-r border-white/5';
                  statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                  icon = <div className="w-3 h-3 rounded-full border-2 border-blue-400" />;
                }

                return (
                  <div
                    key={item.feature}
                    className={`group flex flex-col rounded-xl overflow-hidden bg-black/20 hover:bg-zinc-900/10 border transition-all duration-300 ${borderAccentClass}`}
                  >
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${statusColor}`}>
                          {icon}
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black text-white uppercase tracking-wider">{item.label}</h5>
                          {isUnknown ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Config State:</span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800/40 border border-white/5 text-[9px] font-mono font-bold text-zinc-500 uppercase">
                                Not Found
                              </span>
                            </div>
                          ) : isUnsupported ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Hardware Support:</span>
                              <span className="px-1.5 py-0.5 rounded bg-red-950/20 border border-red-900/30 text-[9px] font-mono font-bold text-red-400 uppercase">
                                Unsupported
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Current:</span>
                                {renderValuePill(item.current_value)}
                              </div>
                              <ArrowRight className={`w-3.5 h-3.5 text-zinc-600 shrink-0 ${!isMatch ? 'text-neon-green/80 animate-pulse' : ''}`} />
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Target:</span>
                                {renderValuePill(item.required_value)}
                              </div>
                              {isMatch && (
                                <span className="ml-1.5 px-2 py-0.5 rounded bg-neon-yellow/10 border border-neon-yellow/20 text-[8px] font-black uppercase text-neon-yellow tracking-widest">
                                  Aligned
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.required && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                          Required
                        </span>
                      )}
                    </div>
                    {(isMismatch || isOptMismatch || isUnknown) && !isUnsupported && item.instruction && (
                      <div className="px-3.5 pb-3.5 pt-1.5 border-t border-white/5 bg-[#0e1622]/10">
                        <div className="bg-cyan-950/20 border border-neon-green/10 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-neon-green">
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-wider">AI Integration Guide</span>
                          </div>
                          <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">{item.instruction}</p>
                          {item.note && (
                            <div className="flex items-start gap-2 bg-[#08080c]/60 border border-neon-green/10 rounded-lg p-2.5 mt-1">
                              <Info className="w-3.5 h-3.5 text-neon-green shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-neon-green">Important Note</span>
                                <p className="text-[11.5px] font-semibold text-zinc-200 leading-relaxed">{item.note}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Advisory Preferences vs. Real Hardware Control</p>
          <p className="text-[9px] font-medium text-zinc-400 leading-relaxed">
            <span className="text-neon-yellow font-bold">✓ Real effect:</span> GPU Power Limit (NVML), Windows Power Plan, Process Priority, GPU Registry Preference — applied the moment you click "Optimize" or save settings.<br />
            <span className="text-amber-400 font-bold">⚠ Advisory only:</span> DLSS, Frame Generation, Ray Tracing, Reflex, HDR — these are per-game settings inside each game's own options menu. No external app can override them. The AI uses your preferences here to give you guidance.
          </p>
        </div>
      </div>

      {/* DLSS Advisory */}
      <SettingsField
        label={
          <div className="flex items-center gap-2">
            <span>NVIDIA Deep Learning Super Sampling (DLSS)</span>
            {activeFeatures && !activeFeatures.includes('DLSS') && (
              <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">
                Unsupported by Active Game
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${
                libraryStats.dlssGamesCount > 0
                  ? 'bg-neon-green/10 border-neon-green/20 text-neon-green'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {libraryStats.dlssGamesCount > 0 ? `Used by ${libraryStats.dlssGamesCount} game${libraryStats.dlssGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
            </span>
          </div>
        }
        description={
          activeFeatures && !activeFeatures.includes('DLSS')
            ? 'Your active game does not support DLSS. This advisory preference is safely ignored.'
            : "Advisory preference — enable this in your game's own graphics settings. The AI uses your selection to give in-game guidance."
        }
      >
        <div className={`flex flex-col gap-4 ${!isAdvancedGpu || (activeFeatures && !activeFeatures.includes('DLSS')) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const nextVal = !currentTuning.gaming_features?.dlss;
              updateGpuTuning((t: any) => ({
                gaming_features: {
                  ...(t.gaming_features || {}),
                  dlss: nextVal,
                  dlss_version: nextVal ? t.gaming_features?.dlss_version || 'DLSS 1' : undefined
                }
              }));
            }}
            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
              currentTuning.gaming_features?.dlss ? 'bg-neon-green' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute transition-all ${
                currentTuning.gaming_features?.dlss ? 'bg-black right-1' : 'bg-zinc-600 left-1'
              }`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['DLSS 1', 'DLSS 2', 'DLSS 3', 'DLSS 3.5', 'DLSS 4', 'DLSS 4.5', 'DLSS 5'].map((v) => (
              <button
                aria-label="button"
                type="button"
                key={v}
                onClick={() => updateGpuTuning((t: any) => ({ gaming_features: { ...(t.gaming_features || {}), dlss_version: v } }))}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${
                  currentTuning.gaming_features?.dlss_version === v && currentTuning.gaming_features?.dlss
                    ? 'bg-neon-green text-black border-neon-green shadow-[0_0_10px_rgba(118,185,0,0.3)]'
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={onShowDlssGuide}
              className="flex items-center gap-2 px-4 py-2 bg-neon-green/10 border border-neon-green/20 hover:bg-neon-green/20 hover:border-neon-green/40 text-neon-green font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              View NVIDIA DLSS Evolution Guide
            </button>
          </div>
        </div>
      </SettingsField>

      {/* Frame Generation Advisory */}
      <SettingsField
        label={
          <div className="flex items-center gap-2">
            <span>Frame Generation (FG)</span>
            {activeFeatures && !activeFeatures.includes('FRAME_GEN') && (
              <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">
                Unsupported by Active Game
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${
                libraryStats.fgGamesCount > 0
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {libraryStats.fgGamesCount > 0 ? `Used by ${libraryStats.fgGamesCount} game${libraryStats.fgGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
            </span>
          </div>
        }
        description={
          activeFeatures && !activeFeatures.includes('FRAME_GEN')
            ? 'Your active game does not support Frame Generation. This advisory preference is safely ignored.'
            : "Advisory preference — enable Frame Gen inside your game's graphics menu. The AI will advise based on this setting."
        }
      >
        <div className={`flex flex-col gap-4 ${!isAdvancedGpu || (activeFeatures && !activeFeatures.includes('FRAME_GEN')) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const nextVal = !currentTuning.gaming_features?.frame_gen;
              updateGpuTuning((t: any) => ({
                gaming_features: {
                  ...(t.gaming_features || {}),
                  frame_gen: nextVal,
                  frame_gen_multiplier: nextVal ? t.gaming_features?.frame_gen_multiplier || '2x' : undefined
                }
              }));
            }}
            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
              currentTuning.gaming_features?.frame_gen ? 'bg-blue-500' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute transition-all ${
                currentTuning.gaming_features?.frame_gen ? 'bg-black right-1' : 'bg-zinc-600 left-1'
              }`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['2x', '3x', '4x', '6x'].map((mult) => {
              const isSelected =
                currentTuning.gaming_features?.frame_gen_multiplier === mult ||
                (!currentTuning.gaming_features?.frame_gen_multiplier && mult === '2x');
              return (
                <button
                  aria-label="button"
                  type="button"
                  key={mult}
                  onClick={() =>
                    updateGpuTuning((t: any) => ({
                      gaming_features: {
                        ...(t.gaming_features || {}),
                        frame_gen_multiplier: mult
                      }
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${
                    isSelected && currentTuning.gaming_features?.frame_gen
                      ? 'bg-blue-500 text-black border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                      : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'
                  }`}
                >
                  {mult}
                </button>
              );
            })}
          </div>
        </div>
      </SettingsField>

      {/* Ray Tracing & Path Tracing */}
      <SettingsField
        label={
          <div className="flex items-center gap-2">
            <span>Ray Tracing & Path Tracing</span>
            {activeFeatures && !activeFeatures.includes('RTX') && !activeFeatures.includes('PATH_TRACING') && (
              <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">
                Unsupported by Active Game
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${
                libraryStats.rtGamesCount > 0 || libraryStats.ptGamesCount > 0
                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {libraryStats.rtGamesCount > 0 || libraryStats.ptGamesCount > 0
                ? `RT: ${libraryStats.rtGamesCount} · PT: ${libraryStats.ptGamesCount} in library`
                : '0 games in library support this'}
            </span>
          </div>
        }
        description={
          activeFeatures && !activeFeatures.includes('RTX') && !activeFeatures.includes('PATH_TRACING')
            ? 'Your active game does not support Ray Tracing. This advisory preference is safely ignored.'
            : 'Advisory preference — enable RT/PT in-game. The AI uses this to tailor performance advice.'
        }
      >
        <div className={`flex gap-4 ${!isAdvancedGpu || (activeFeatures && !activeFeatures.includes('RTX') && !activeFeatures.includes('PATH_TRACING')) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
          <button
            aria-label="button"
            type="button"
            onClick={() => updateGpuTuning((t: any) => ({ gaming_features: { ...(t.gaming_features || {}), ray_tracing: !t.gaming_features?.ray_tracing } }))}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              currentTuning.gaming_features?.ray_tracing ? 'bg-neon-green/20 border-neon-green/40 text-neon-green' : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            Ray Tracing
          </button>
          <button
            aria-label="button"
            type="button"
            onClick={() => updateGpuTuning((t: any) => ({ gaming_features: { ...(t.gaming_features || {}), path_tracing: !t.gaming_features?.path_tracing } }))}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              currentTuning.gaming_features?.path_tracing ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            <Flame className="w-3 h-3 inline-block mr-1" />
            Path Tracing
          </button>
        </div>
      </SettingsField>

      {/* NVIDIA Reflex */}
      <SettingsField
        label={
          <div className="flex items-center gap-2">
            <span>NVIDIA Reflex</span>
            {activeFeatures && !activeFeatures.includes('REFLEX') && (
              <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">
                Unsupported by Active Game
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${
                libraryStats.reflexGamesCount > 0
                  ? 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {libraryStats.reflexGamesCount > 0 ? `Used by ${libraryStats.reflexGamesCount} game${libraryStats.reflexGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
            </span>
          </div>
        }
        description={
          activeFeatures && !activeFeatures.includes('REFLEX')
            ? 'Your active game does not support NVIDIA Reflex. This advisory preference is safely ignored.'
            : 'Advisory preference — enable NVIDIA Reflex in-game. Tells the AI your latency priority.'
        }
      >
        <div className={`flex gap-4 ${!isCapableGpu || (activeFeatures && !activeFeatures.includes('REFLEX')) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
          <button
            aria-label="button"
            type="button"
            onClick={() => updateGpuTuning((t: any) => ({ gaming_features: { ...(t.gaming_features || {}), reflex: !t.gaming_features?.reflex } }))}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              currentTuning.gaming_features?.reflex ? 'bg-neon-yellow/20 border-neon-yellow/40 text-neon-yellow' : 'bg-white/5 border-white/10 text-zinc-500'
            } ${!isCapableGpu ? 'pointer-events-none opacity-40 select-none' : ''}`}
          >
            NVIDIA Reflex
          </button>
        </div>
      </SettingsField>

      {/* HDR Optimization */}
      <SettingsField
        label={
          <div className="flex items-center gap-2">
            <span>High Dynamic Range (HDR)</span>
            {activeFeatures && !activeFeatures.includes('HDR') && (
              <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">
                Unsupported by Active Game
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${
                libraryStats.hdrGamesCount > 0
                  ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {libraryStats.hdrGamesCount > 0 ? `Used by ${libraryStats.hdrGamesCount} game${libraryStats.hdrGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
            </span>
          </div>
        }
        description={
          activeFeatures && !activeFeatures.includes('HDR')
            ? 'Your active game does not natively support HDR. This advisory preference is safely ignored.'
            : 'Advisory preference — enable HDR in Windows Display Settings and in-game. The AI uses this for visual quality guidance.'
        }
      >
        <div className={`flex gap-4 ${activeFeatures && !activeFeatures.includes('HDR') ? 'pointer-events-none opacity-40 select-none' : ''}`}>
          <button
            aria-label="button"
            type="button"
            onClick={() => updateGpuTuning((t: any) => ({ gaming_features: { ...(t.gaming_features || {}), hdr: !t.gaming_features?.hdr } }))}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              currentTuning.gaming_features?.hdr ? 'bg-violet-500/20 border-violet-500/40 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            HDR Optimization
          </button>
        </div>
      </SettingsField>

      {/* Real Hardware Controls */}
      <div className="border-t border-white/5 pt-6 mt-2 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-yellow/10 border border-neon-yellow/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-neon-yellow" />
          </div>
          <div>
            <p className="text-[10px] font-black text-neon-yellow uppercase tracking-[0.2em]">Real Hardware Controls</p>
            <p className="text-[9px] font-medium text-zinc-500">
              These settings are applied <span className="text-neon-yellow">immediately</span> to your actual GPU hardware via NVML / Windows APIs.
            </p>
          </div>
        </div>

        {/* GPU Power Limit */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
          <div className="flex-1">
            <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">GPU Power Limit</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Directly caps NVIDIA GPU wattage via NVML. Lower = cooler &amp; quieter. Max = full performance. Applied on next "Optimize" or save.
            </p>
          </div>
          <div className="w-full lg:w-96 shrink-0 space-y-2">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={currentTuning.power_limit_percent ?? 100}
                onChange={(e) => updateGpuTuning({ power_limit_percent: parseInt(e.target.value) })}
                className="flex-1 accent-neon-yellow"
              />
              <span className="text-xs font-black text-neon-yellow w-12 text-right">
                {currentTuning.power_limit_percent ?? 100}%
              </span>
            </div>
            <div className="flex justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-wider px-0.5">
              <span>50% — Eco</span>
              <span>80% — Balanced</span>
              <span>100% — Max</span>
            </div>
          </div>
        </div>

        {/* NVIDIA Power Management Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
          <div className="flex-1">
            <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">NVIDIA Power Management Mode</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Sets "Prefer Maximum Performance" globally in NVIDIA driver via registry. Prevents GPU from downclocking when idle. Effective after driver restart or next game launch.
            </p>
          </div>
          <div className="w-full lg:w-96 shrink-0">
            <div className="flex gap-2">
              {(['adaptive', 'max_performance', 'optimal'] as const).map((mode) => (
                <button
                  aria-label="button"
                  type="button"
                  key={mode}
                  onClick={() => updateGpuTuning({ power_management_mode: mode })}
                  className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                    (currentTuning.power_management_mode ?? 'adaptive') === mode
                      ? 'bg-neon-yellow/20 border-neon-yellow/40 text-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.15)]'
                      : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'
                  }`}
                >
                  {mode === 'adaptive' ? 'Adaptive' : mode === 'max_performance' ? 'Max Perf' : 'Optimal'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Low Latency Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
          <div className="flex-1">
            <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">Low Latency Mode (Ultra)</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Enables "Ultra" low latency in NVIDIA Control Panel via registry — limits pre-rendered frames to 1. Reduces input lag globally for all DX9/DX11/DX12 games.
            </p>
          </div>
          <div className="w-full lg:w-96 shrink-0">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
              onClick={() => updateGpuTuning((t: any) => ({ low_latency_mode: !t.low_latency_mode }))}
              className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
                currentTuning.low_latency_mode ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.3)]' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                  currentTuning.low_latency_mode ? 'right-1' : 'left-1'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Shader Cache Size */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
          <div className="flex-1">
            <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">Shader Cache Size</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Controls the NVIDIA driver shader cache size (NVCP registry). Larger cache = fewer stutters on first launch. Applied after driver restart.
            </p>
          </div>
          <div className="w-full lg:w-96 shrink-0 space-y-2">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={currentTuning.shader_cache_gb ?? 10}
                onChange={(e) => updateGpuTuning({ shader_cache_gb: parseInt(e.target.value) })}
                className="flex-1 accent-neon-green"
              />
              <span className="text-xs font-black text-neon-green w-16 text-right">
                {currentTuning.shader_cache_gb ?? 10} GB
              </span>
            </div>
            <div className="flex justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-wider px-0.5">
              <span>1 GB</span>
              <span>10 GB (Default)</span>
              <span>100 GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Feature Matrix */}
      <HardwareFeatureMatrix
        effectiveLibrary={effectiveLibrary}
        state={state}
        sendCommand={sendCommand}
        userId={userId}
        isAdvancedGpu={isAdvancedGpu}
        isCapableGpu={isCapableGpu}
      />
    </SettingsSection>
  );
};
