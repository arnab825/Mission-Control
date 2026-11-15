import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ExternalLink, Monitor, ChevronRight, ChevronDown } from 'lucide-react';
import type { SystemSpecs } from '../../types/telemetry';
import { SpecRow } from './SpecRow';

interface GpuMuxSwitchSectionProps {
  muxInfo: any;
  specs: SystemSpecs | null;
  handleOpenOemSoftware: (protocol?: string, oemId?: string) => void;
  handleOpenDisplaySwitcher: () => void;
  handleOpenGraphicsSettings: () => void;
  handleSetMuxMode: (mode: 'hybrid' | 'discrete' | 'integrated' | 'auto') => void;
}

export const GpuMuxSwitchSection: React.FC<GpuMuxSwitchSectionProps> = ({
  muxInfo,
  specs,
  handleOpenOemSoftware,
  handleOpenDisplaySwitcher,
  handleOpenGraphicsSettings,
  handleSetMuxMode,
}) => {
  if (!muxInfo) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="p-4 sm:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl relative overflow-hidden min-w-0 max-w-full"
    >
      <div className="flex flex-col gap-3.5 mb-6 min-w-0">
        {/* Top: Header Info */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate">
                {muxInfo.form_factor === 'desktop' ? 'Display Pipeline & OEM Ecosystem' : 'GPU Architecture & MUX Switch'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                muxInfo.form_factor === 'desktop'
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                  : muxInfo.form_factor === 'handheld_apu'
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                  : muxInfo.has_mux
                  ? 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {muxInfo.form_factor === 'desktop'
                  ? 'Desktop PC Direct Link (0ms)'
                  : muxInfo.form_factor === 'handheld_apu'
                  ? 'Handheld APU Architecture'
                  : muxInfo.has_mux
                  ? 'Hybrid MUX Capable'
                  : 'Dynamic Optimus Routing'}
              </span>
            </div>
            <p className="text-[10px] font-medium text-zinc-500 mt-0.5 line-clamp-2 sm:line-clamp-none">
              Multi-GPU display routing, PCIe render pass-through, and OEM software synchronization.
            </p>
          </div>
        </div>

        {/* Quick Companion & Display Tools Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 max-w-full">
          {muxInfo.primary_oem && (
            <button
              type="button"
              onClick={() => handleOpenOemSoftware(muxInfo.primary_oem?.protocol, muxInfo.primary_oem?.id)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-neon-yellow/10 hover:bg-neon-yellow/20 border border-neon-yellow/30 text-neon-yellow text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer min-w-0 max-w-full truncate"
              title={`Launch ${muxInfo.primary_oem.name}`}
            >
              <ExternalLink className="w-3 h-3 text-neon-yellow shrink-0" />
              <span className="truncate">{muxInfo.primary_oem.name}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenDisplaySwitcher}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer min-w-0 max-w-full truncate"
            title="Open Windows Display Switcher (displayswitch.exe)"
          >
            <Monitor className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">Display Switcher</span>
          </button>

          <button
            type="button"
            onClick={handleOpenGraphicsSettings}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer min-w-0 max-w-full truncate"
            title="Open Windows Graphics Settings"
          >
            <span className="truncate">Graphics Settings</span>
            <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* Visual Display Routing Pipeline */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Live Display Pipeline</span>
          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
            muxInfo.latency_mode === 'zero_latency_direct'
              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
              : 'text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20'
          }`}>
            {muxInfo.latency_mode === 'zero_latency_direct' ? '0ms Hardware Link' : '+1-3ms Optimus Buffer'}
          </span>
        </div>

        {muxInfo.form_factor === 'desktop' ? (
          <div className="flex flex-col 2xl:flex-row items-center justify-between gap-3 text-center 2xl:text-left">
            {/* Discrete GPU Node */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-cyan-500/20 w-full 2xl:flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 justify-center 2xl:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Discrete 3D Render (PCIe)</span>
              </div>
              <p className="text-xs font-black text-white truncate">{muxInfo.dgpu_name || specs?.hardware.gpu}</p>
              <p className="text-[9px] font-medium text-zinc-500">Zero-Latency Direct Video Bus</p>
            </div>

            {/* Connection Cable */}
            <div className="flex 2xl:flex-col items-center justify-center gap-1 text-zinc-600 shrink-0">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                DP / HDMI (0ms Direct)
              </span>
              <ChevronRight className="w-4 h-4 text-cyan-400 hidden 2xl:block" />
              <ChevronDown className="w-4 h-4 text-cyan-400 2xl:hidden" />
            </div>

            {/* Desktop Monitor Node */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 w-full 2xl:flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 justify-center 2xl:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                <span className="text-[8px] font-black text-neon-green uppercase tracking-widest">Physical Monitor</span>
              </div>
              <p className="text-xs font-black text-white truncate">{specs?.displays?.[0]?.resolution || '1920x1080'} @ {specs?.displays?.[0]?.refresh || '144Hz'}</p>
              <p className="text-[9px] font-medium text-zinc-500">{muxInfo.active_display_gpu || 'Direct Monitor Port'}</p>
            </div>
          </div>
        ) : muxInfo.form_factor === 'handheld_apu' ? (
          <div className="flex flex-col 2xl:flex-row items-center justify-between gap-3 text-center 2xl:text-left">
            {/* Handheld APU Node */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-purple-500/20 w-full 2xl:flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 justify-center 2xl:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Handheld SoC APU</span>
              </div>
              <p className="text-xs font-black text-white truncate">{specs?.hardware?.cpu}</p>
              <p className="text-[9px] font-medium text-zinc-500">Unified UMA Memory Architecture</p>
            </div>

            {/* Connection Pipe */}
            <div className="flex 2xl:flex-col items-center justify-center gap-1 text-zinc-600 shrink-0">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-purple-400">
                Direct MIPI / eDP
              </span>
              <ChevronRight className="w-4 h-4 text-purple-400 hidden 2xl:block" />
              <ChevronDown className="w-4 h-4 text-purple-400 2xl:hidden" />
            </div>

            {/* Touchscreen Panel */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 w-full 2xl:flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 justify-center 2xl:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                <span className="text-[8px] font-black text-neon-green uppercase tracking-widest">Console Touch Display</span>
              </div>
              <p className="text-xs font-black text-white truncate">{specs?.displays?.[0]?.resolution || '1920x1080'} @ {specs?.displays?.[0]?.refresh || '120Hz'}</p>
              <p className="text-[9px] font-medium text-zinc-500">{muxInfo.active_display_gpu || 'Integrated Panel'}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center justify-between gap-2.5 sm:gap-3 text-center 2xl:text-left min-w-0 max-w-full">
            {/* Discrete GPU Node */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-neon-yellow/20 w-full 2xl:flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 justify-center 2xl:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow" />
                <span className="text-[8px] font-black text-neon-yellow uppercase tracking-widest">Discrete 3D Render</span>
              </div>
              <p className="text-xs font-black text-white truncate">{muxInfo.dgpu_name || specs?.hardware.gpu}</p>
              <p className="text-[9px] font-medium text-zinc-500">Dedicated Gaming GPU</p>
            </div>

            {/* Connection Pipe */}
            <div className="flex 2xl:flex-col items-center justify-center gap-1 text-zinc-600 shrink-0 py-1 2xl:py-0">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                {muxInfo.current_mode === 'discrete' ? 'Direct MUX' : 'PCIe Copy'}
              </span>
              <ChevronRight className="w-4 h-4 text-neon-yellow hidden 2xl:block" />
              <ChevronDown className="w-4 h-4 text-neon-yellow 2xl:hidden" />
            </div>

            {/* iGPU or Direct Display Node */}
            {muxInfo.igpu_name && (
              <>
                <div className={`p-3 rounded-xl border w-full 2xl:flex-1 min-w-0 ${
                  muxInfo.current_mode === 'discrete'
                    ? 'bg-white/[0.01] border-white/5 opacity-50'
                    : 'bg-white/[0.03] border-blue-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-1 justify-center 2xl:justify-start">
                    <span className={`w-1.5 h-1.5 rounded-full ${muxInfo.current_mode === 'discrete' ? 'bg-zinc-600' : 'bg-blue-400'}`} />
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Display Controller</span>
                  </div>
                  <p className="text-xs font-black text-white truncate">{muxInfo.igpu_name}</p>
                  <p className="text-[9px] font-medium text-zinc-500">Desktop eDP Output</p>
                </div>

                <div className="flex 2xl:flex-col items-center justify-center gap-1 text-zinc-600 shrink-0 py-1 2xl:py-0">
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-400">eDP</span>
                  <ChevronRight className="w-4 h-4 text-blue-400 hidden 2xl:block" />
                  <ChevronDown className="w-4 h-4 text-blue-400 2xl:hidden" />
                </div>
              </>
            )}

            {/* Display Panel Node */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 w-full 2xl:flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 justify-center 2xl:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                <span className="text-[8px] font-black text-neon-green uppercase tracking-widest">Physical Display</span>
              </div>
              <p className="text-xs font-black text-white truncate">{specs?.displays?.[0]?.resolution || '1920x1080'} @ {specs?.displays?.[0]?.refresh || '144Hz'}</p>
              <p className="text-[9px] font-medium text-zinc-500">{muxInfo.active_display_gpu || 'Primary Monitor'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Working Mode Selector */}
      <div className="mb-6 min-w-0 max-w-full">
        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-3">
          GPU Working Mode & OEM Mapping
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-2.5 sm:gap-3 min-w-0 max-w-full">
          {[
            {
              key: 'hybrid',
              label: 'Hybrid (Optimus)',
              desc: 'Balanced. iGPU powers desktop display; dGPU awakens for 3D games.',
              active: (muxInfo.user_preferred_mode || muxInfo.current_mode) === 'hybrid',
              alias: muxInfo.brand_vocabulary?.hybrid
            },
            {
              key: 'discrete',
              label: 'dGPU Direct',
              desc: 'Lowest latency. Dedicated RTX direct rendering for games.',
              active: (muxInfo.user_preferred_mode || muxInfo.current_mode) === 'discrete',
              alias: muxInfo.brand_vocabulary?.discrete
            },
            {
              key: 'integrated',
              label: 'iGPU Only (Eco)',
              desc: 'Max battery life. Discrete GPU suspended in ultra-low power.',
              active: (muxInfo.user_preferred_mode || muxInfo.current_mode) === 'integrated',
              alias: muxInfo.brand_vocabulary?.integrated
            },
            {
              key: 'auto',
              label: 'Auto (Advanced)',
              desc: 'Dynamic Advanced Optimus / Windows DirectX automatic routing.',
              active: (muxInfo.user_preferred_mode || muxInfo.current_mode) === 'auto',
              alias: muxInfo.brand_vocabulary?.auto
            }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSetMuxMode(item.key as any)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2 min-w-0 w-full ${
                item.active
                  ? 'bg-neon-yellow/10 border-neon-yellow/40 shadow-[0_0_15px_rgba(191,255,0,0.15)] text-white'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between mb-1 min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-wider truncate ${item.active ? 'text-neon-yellow' : 'text-white'}`}>
                    {item.label}
                  </span>
                  {item.active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow shrink-0 ml-1" />
                  )}
                </div>
                {item.alias && item.alias !== item.label && (
                  <span className="text-[8px] font-bold text-neon-yellow/80 block mb-1 tracking-tight truncate">
                    {item.alias}
                  </span>
                )}
                <p className="text-[9px] font-medium text-zinc-500 leading-snug break-words">
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detected OEM Software Ecosystem Strip */}
      {muxInfo.installed_oem_suites && muxInfo.installed_oem_suites.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 mb-6 min-w-0 max-w-full">
          <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate">
              Detected OEM & GPU Control Suites ({muxInfo.installed_oem_suites.length})
            </span>
            <span className="text-[8px] font-black text-neon-yellow uppercase tracking-widest shrink-0">
              System Synchronized
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
            {muxInfo.installed_oem_suites.map((suite: any) => (
              <button
                key={suite.id}
                type="button"
                onClick={() => handleOpenOemSoftware(suite.protocol, suite.id)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-neon-yellow/30 text-white text-[9px] font-bold flex items-center gap-2 transition-all cursor-pointer group max-w-full truncate min-w-0"
                title={`Open ${suite.name} (${suite.protocol})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow group-hover:scale-125 transition-transform shrink-0" />
                <span className="truncate">{suite.name}</span>
                <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-neon-yellow transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MUX Spec Rows */}
      <div className="grid grid-cols-1 gap-y-1">
        <SpecRow 
          label="Form Factor Architecture" 
          value={
            muxInfo.form_factor === 'desktop' 
              ? 'Desktop PC Rig (Direct PCIe Output)' 
              : muxInfo.form_factor === 'handheld_apu' 
              ? 'Handheld Console / APU (Unified UMA)' 
              : muxInfo.has_mux 
              ? 'Gaming Laptop (Hardware MUX Switch)' 
              : 'Gaming Laptop (Optimus Hybrid)'
          } 
        />
        <SpecRow 
          label="Active Working Mode" 
          value={
            muxInfo.brand_vocabulary?.[muxInfo.current_mode as keyof typeof muxInfo.brand_vocabulary] 
              || (muxInfo.current_mode === 'hybrid' ? 'Hybrid (NVIDIA Optimus)' : muxInfo.current_mode === 'discrete' ? 'Discrete Direct (Hardware MUX)' : muxInfo.current_mode.toUpperCase())
          } 
          explanationKey="Working Mode" 
        />
        <SpecRow label="Display Routing" value={muxInfo.display_routing} explanationKey="Display Routing" />
        <SpecRow 
          label="Hardware MUX Support" 
          value={
            muxInfo.form_factor === 'desktop' 
              ? 'Not Applicable (Direct PCIe Video Output)' 
              : muxInfo.has_mux 
              ? 'Supported (Hybrid Multiplexer)' 
              : 'Standard Optimus'
          } 
          explanationKey="Hardware MUX" 
        />
        <SpecRow label="Latency Mode" value={muxInfo.latency_mode === 'zero_latency_direct' ? 'Zero Latency (0ms direct hardware link)' : 'Standard Optimus (+1-3ms PCIe frame buffer copy)'} explanationKey="Latency Mode" />
        <SpecRow label="Active Display Controller" value={muxInfo.active_display_gpu || '---'} />
        <SpecRow 
          label="OEM Companion Hub" 
          value={muxInfo.primary_oem ? `${muxInfo.primary_oem.name} (${muxInfo.primary_oem.brand})` : 'Universal Windows / GPU Driver'} 
        />
      </div>
    </motion.div>
  );
};
