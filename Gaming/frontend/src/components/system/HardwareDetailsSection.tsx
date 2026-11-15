import React from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  Cpu,
  Zap,
  Box,
  Database,
  HardDrive,
  MemoryStick,
  Wifi,
  Network,
  Gauge
} from 'lucide-react';
import type { TelemetryState, SystemSpecs } from '../../types/telemetry';
import { SpecRow } from './SpecRow';
import { GpuMuxSwitchSection } from './GpuMuxSwitchSection';

interface HardwareDetailsSectionProps {
  specs: SystemSpecs | null;
  state: TelemetryState | null;
  muxInfo: any;
  dgpu: any;
  igpu: any;
  handleOpenOemSoftware: (protocol?: string, oemId?: string) => void;
  handleOpenDisplaySwitcher: () => void;
  handleOpenGraphicsSettings: () => void;
  handleSetMuxMode: (mode: 'hybrid' | 'discrete' | 'integrated' | 'auto') => void;
}

export const HardwareDetailsSection: React.FC<HardwareDetailsSectionProps> = ({
  specs,
  state,
  muxInfo,
  dgpu,
  igpu,
  handleOpenOemSoftware,
  handleOpenDisplaySwitcher,
  handleOpenGraphicsSettings,
  handleSetMuxMode,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:gap-6 pb-8 min-w-0 max-w-full">

      {/* ─── DEVICE SPECIFICATIONS ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <Monitor className="w-4 h-4 text-neon-green" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Device Specifications</span>
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          <SpecRow label="Device Name" value={specs?.device_specs?.device_name || '---'} explanationKey="Device Name" />
          <SpecRow label="System Model" value={specs?.device_specs?.model || '---'} explanationKey="System Model" />
          <SpecRow label="Manufacturer" value={specs?.device_specs?.manufacturer || '---'} />
          <SpecRow label="Motherboard" value={specs?.device_specs?.motherboard || '---'} explanationKey="Motherboard" />
          <SpecRow label="Processor" value={specs?.hardware?.cpu || '---'} explanationKey="Processor" />
          <SpecRow label="Installed RAM" value={specs?.hardware?.ram || '---'} explanationKey="Total Capacity" />
          <SpecRow label="System Type" value={specs?.os_details?.architecture ? `${specs.os_details.architecture} Operating System, x64-based processor` : '64-bit Operating System, x64-based processor'} />
          <SpecRow label="BIOS Version" value={specs?.device_specs?.bios_version ? `${specs.device_specs.bios_version}${specs.device_specs.bios_date ? ` (${specs.device_specs.bios_date})` : ''}` : '---'} />
        </div>
      </motion.div>

      {/* ─── PROCESSOR CARD ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Processor</span>
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          <SpecRow label="Model" value={specs?.hardware?.cpu || '---'} explanationKey="Processor" />
          <SpecRow label="Cores / Threads" value={`${specs?.hardware?.cores || '---'} Cores / ${specs?.hardware?.threads || '---'} Threads`} explanationKey="Cores" />
          <SpecRow label="Current Frequency" value={state?.cpu_freq ? `${state.cpu_freq.toFixed(0)} MHz` : '---'} />
          <SpecRow label="Architecture" value={specs?.os_details?.architecture || '64-bit (x64)'} />
          <SpecRow label="Utilization" value={state?.cpu_pct != null ? `${state.cpu_pct.toFixed(1)}%` : '---'} />
          <SpecRow label="Temperature" value={state?.cpu_temp ? `${Math.round(state.cpu_temp)}°C` : '---'} />
        </div>
      </motion.div>

      {/* ─── GPU ARCHITECTURE & MUX SWITCH CARD ─── */}
      <GpuMuxSwitchSection
        muxInfo={muxInfo}
        specs={specs}
        handleOpenOemSoftware={handleOpenOemSoftware}
        handleOpenDisplaySwitcher={handleOpenDisplaySwitcher}
        handleOpenGraphicsSettings={handleOpenGraphicsSettings}
        handleSetMuxMode={handleSetMuxMode}
      />

      {/* ─── DISCRETE GPU (dGPU) CARD ─── */}
      {dgpu && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-neon-yellow" />
              <div>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Discrete Graphics (dGPU)</span>
                <h4 className="text-sm font-black text-white">{dgpu.name}</h4>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-neon-yellow/10 border border-neon-yellow/20 text-[8px] font-black uppercase text-neon-yellow tracking-widest">
              High Performance
            </span>
          </div>
          <div className="grid grid-cols-1 gap-y-1">
            <SpecRow label="GPU Model" value={dgpu.name} explanationKey="Graphics Card" />
            <SpecRow label="Dedicated VRAM" value={`${dgpu.vram_gb || specs?.vram_gb || 8.0} GB GDDR6`} explanationKey="Dedicated VRAM" />
            <SpecRow label="VRAM Used" value={(state?.gpu_metrics?.vram_used ?? state?.gpu_metrics?.vram_used_mb) != null ? `${state?.gpu_metrics?.vram_used ?? state?.gpu_metrics?.vram_used_mb} MB (${state?.gpu_metrics?.vram_percent ?? 0}%)` : '---'} />
            <SpecRow label="Driver Version" value={dgpu.driver_version || state?.gpu_metrics?.driver_version || '---'} />
            <SpecRow label="Clock Speed" value={(state?.gpu_metrics?.clock_core ?? state?.gpu_metrics?.clock_gpu_mhz) != null ? `${state?.gpu_metrics?.clock_core ?? state?.gpu_metrics?.clock_gpu_mhz} MHz (Core) / ${(state?.gpu_metrics?.clock_mem ?? state?.gpu_metrics?.clock_mem_mhz) != null ? `${state?.gpu_metrics?.clock_mem ?? state?.gpu_metrics?.clock_mem_mhz} MHz (Mem)` : '--- MHz (Mem)'}` : '---'} />
            <SpecRow 
              label="Power Draw" 
              value={(() => {
                const draw = state?.gpu_metrics?.power_draw ?? state?.gpu_metrics?.power_draw_w;
                const limit = state?.gpu_metrics?.power_limit ?? state?.gpu_metrics?.power_limit_w;
                if (draw === undefined || draw === null) return '---';
                const formattedDraw = Math.round(draw);
                const formattedLimit = limit ? ` / ${Math.round(limit)} W limit` : '';
                return `${formattedDraw} W${formattedLimit}`;
              })()} 
            />
            <SpecRow label="Temperature" value={(state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature) ? `${Math.round(state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature ?? 0)}°C` : '---'} />
            <SpecRow label="Display Attachment" value={dgpu.is_display_active ? `Active (${dgpu.active_displays.join(', ') || 'Connected'})` : 'Optimus Pass-Through (Render Only)'} />
          </div>
        </motion.div>
      )}

      {/* ─── INTEGRATED GPU (iGPU) CARD ─── */}
      {igpu && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Integrated Graphics (iGPU)</span>
                <h4 className="text-sm font-black text-white">{igpu.name}</h4>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[8px] font-black uppercase text-blue-400 tracking-widest">
              Power Efficient
            </span>
          </div>
          <div className="grid grid-cols-1 gap-y-1">
            <SpecRow label="GPU Model" value={igpu.name} explanationKey="Graphics Card" />
            <SpecRow label="Provider / Architecture" value={`${igpu.vendor} Processor Graphics`} />
            <SpecRow label="Shared Memory" value={igpu.vram_gb ? `${igpu.vram_gb} GB Dynamic Shared RAM` : 'Shared System RAM'} />
            <SpecRow label="Driver Version" value={igpu.driver_version || '---'} />
            <SpecRow label="Display Status" value={igpu.is_display_active ? `Active (${igpu.active_displays.join(', ') || 'Internal Display'})` : 'Inactive'} />
            <SpecRow label="Display Role" value="Primary Desktop Presentation & Media Decoding" />
          </div>
        </motion.div>
      )}

      {/* ─── FALLBACK SINGLE GRAPHICS CARD ─── */}
      {!dgpu && !igpu && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-4 h-4 text-neon-yellow" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Graphics</span>
          </div>
          <div className="grid grid-cols-1 gap-y-1">
            <SpecRow label="GPU Model" value={specs?.hardware?.gpu || '---'} explanationKey="Graphics Card" />
            <SpecRow label="VRAM" value={(state?.gpu_metrics?.vram_total ?? state?.gpu_metrics?.vram_total_mb) != null ? `${((state?.gpu_metrics?.vram_total ?? state?.gpu_metrics?.vram_total_mb ?? 0) / 1024).toFixed(1)} GB` : (specs?.vram_gb ? `${specs.vram_gb} GB` : '---')} explanationKey="VRAM Total" />
            <SpecRow label="VRAM Used" value={(state?.gpu_metrics?.vram_used ?? state?.gpu_metrics?.vram_used_mb) != null ? `${state?.gpu_metrics?.vram_used ?? state?.gpu_metrics?.vram_used_mb} MB (${state?.gpu_metrics?.vram_percent ?? 0}%)` : '---'} />
            <SpecRow label="Dedicated VRAM" value={specs?.vram_gb ? `${specs.vram_gb} GB` : '---'} />
            <SpecRow label="Driver Version" value={state?.gpu_metrics?.driver_version || '---'} />
            <SpecRow label="Clock Speed" value={(state?.gpu_metrics?.clock_core ?? state?.gpu_metrics?.clock_gpu_mhz) != null ? `${state?.gpu_metrics?.clock_core ?? state?.gpu_metrics?.clock_gpu_mhz} MHz (Core) / ${(state?.gpu_metrics?.clock_mem ?? state?.gpu_metrics?.clock_mem_mhz) != null ? `${state?.gpu_metrics?.clock_mem ?? state?.gpu_metrics?.clock_mem_mhz} MHz (Mem)` : '--- MHz (Mem)'}` : '---'} />
            <SpecRow 
              label="Power Draw" 
              value={(() => {
                const draw = state?.gpu_metrics?.power_draw ?? state?.gpu_metrics?.power_draw_w;
                const limit = state?.gpu_metrics?.power_limit ?? state?.gpu_metrics?.power_limit_w;
                if (draw === undefined || draw === null) return '---';
                const formattedDraw = Math.round(draw);
                const formattedLimit = limit ? ` / ${Math.round(limit)} W limit` : '';
                return `${formattedDraw} W${formattedLimit}`;
              })()} 
            />
            <SpecRow label="Temperature" value={(state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature) ? `${Math.round(state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature ?? 0)}°C` : '---'} />
          </div>
        </motion.div>
      )}

      {/* ─── MEMORY CARD ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <MemoryStick className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Memory</span>
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          {(() => {
            const rd = specs?.hardware?.ram_details;
            const memType = rd && rd.length > 0 ? rd[0].type : 'Unknown';
            const memSpeed = state?.ram_speed || (rd && rd.length > 0 ? rd[0].speed : '---');
            return (
              <>
                <SpecRow label="Type" value={memType !== 'Unknown' ? memType : '---'} explanationKey="Memory Type" />
                <SpecRow label="Total Capacity" value={specs?.hardware?.ram || '---'} />
                <SpecRow label="Speed" value={memSpeed} explanationKey="Memory Speed" />
                <SpecRow label="Modules Installed" value={rd && rd.length > 0 ? `${rd.length} DIMM${rd.length > 1 ? 's' : ''}` : '---'} />
                <SpecRow label="Used / Free" value={state?.mem_used_gb ? `${state.mem_used_gb.toFixed(1)} GB used${state?.mem_total_gb && state?.mem_used_gb ? ` / ${(state.mem_total_gb - state.mem_used_gb).toFixed(1)} GB free` : ''}` : '---'} explanationKey="Used Capacity" />
              </>
            );
          })()}
        </div>
        {/* Physical DIMM Modules */}
        {specs?.hardware?.ram_details && specs.hardware.ram_details.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Box className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Physical Modules</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {specs.hardware.ram_details.map((stick, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/2 border border-white/5 hover:border-purple-500/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Box className="w-3 h-3 text-purple-400" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-white block">{stick.slot || `Slot ${idx + 1}`}</span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">{stick.type || '---'} · {stick.manufacturer || 'Generic'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] flex-1 xl:justify-end justify-start">
                    <div className="min-w-15">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Capacity</span>
                      <span className="text-white font-black">{stick.size || '---'}</span>
                    </div>
                    <div className="min-w-15">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Speed</span>
                      <span className="text-white font-black">{stick.speed || '---'}</span>
                    </div>
                    <div className="min-w-15">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Voltage</span>
                      <span className="text-white font-black">{stick.voltage || '---'}</span>
                    </div>
                    <div className="min-w-22.5">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Part #</span>
                      <span className="text-white font-black truncate max-w-25 block" title={stick.partNumber}>{stick.partNumber || '---'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── STORAGE CARD ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <HardDrive className="w-4 h-4 text-orange-400" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Storage</span>
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          <SpecRow label="Primary Drive" value={specs?.hardware?.storage || '---'} explanationKey="Storage Device" />
          <SpecRow label="Disk Activity" value={state?.disk_util != null ? `${state.disk_util.toFixed(1)}%` : '---'} explanationKey="Utilization" />
        </div>
        {/* Physical Storage Drives */}
        {specs?.hardware?.storage_details && specs.hardware.storage_details.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Physical Drives</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {specs.hardware.storage_details.map((disk, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/2 border border-white/5 hover:border-orange-500/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 shrink-0">
                      <Database className="w-3 h-3 text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-black text-white block truncate" title={disk.name}>{disk.name || `Drive ${idx + 1}`}</span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">{disk.type || 'SSD'} · {disk.interface || 'SATA'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] flex-1 xl:justify-end justify-start min-w-0">
                    <div className="min-w-15">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Capacity</span>
                      <span className="text-white font-black">{disk.size || '---'}</span>
                    </div>
                    <div className="min-w-20">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Bus</span>
                      <span className="text-white font-black">{disk.generation || '---'}</span>
                    </div>
                    <div className="min-w-20">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Form Factor</span>
                      <span className="text-white font-black">{disk.formFactor || '---'}</span>
                    </div>
                    <div className="min-w-25">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Speed (R/W)</span>
                      <span className="text-white font-black">{disk.readSpeed || '---'} / {disk.writeSpeed || '---'}</span>
                    </div>
                    <div className="min-w-20">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Partitions</span>
                      <span className="text-white font-black">{disk.partitions || '---'}</span>
                    </div>
                    <div className="min-w-15">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">System</span>
                      <span className={`font-black ${disk.systemDisk === 'Yes' ? 'text-neon-green' : 'text-zinc-400'}`}>{disk.systemDisk || 'No'}</span>
                    </div>
                    <div className="min-w-15">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Paging</span>
                      <span className={`font-black ${disk.pageFile === 'Yes' ? 'text-neon-yellow' : 'text-zinc-400'}`}>{disk.pageFile || 'No'}</span>
                    </div>
                    <div className="min-w-20">
                      <span className="text-zinc-600 block text-[8px] uppercase tracking-wider mb-0.5">Serial Number</span>
                      <span className="text-white font-black truncate max-w-25 block" title={disk.serialNumber}>{disk.serialNumber || '---'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── OPERATING SYSTEM CARD ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <Monitor className="w-4 h-4 text-zinc-500" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Operating System</span>
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          <SpecRow label="Edition" value={specs?.os_details?.edition || '---'} />
          <SpecRow label="Version" value={specs?.os_details?.version || '---'} />
          <SpecRow label="Architecture" value={specs?.os_details?.architecture || '---'} />
        </div>
      </motion.div>

      {/* ─── NETWORK CONNECTIVITY CARD ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          {specs?.wifi?.ssid ? (
            <Wifi className="w-4 h-4 text-neon-green" />
          ) : (
            <Network className="w-4 h-4 text-blue-400" />
          )}
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Network Connectivity</span>
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          <SpecRow label="Connection Type" value={specs?.wifi?.ssid ? 'Wi-Fi (Wireless)' : (specs?.network?.name ? 'Ethernet (Wired LAN)' : 'Local Network')} />
          <SpecRow label="Adapter Name" value={specs?.wifi?.adapter || specs?.network?.name || '---'} />
          <SpecRow label="Link Speed (R/T)" value={state?.net_speed || specs?.network?.speed || '---'} explanationKey="Current Throughput" />
          {specs?.wifi?.ssid ? (
            <>
              <SpecRow label="SSID" value={specs?.wifi?.ssid} />
              <SpecRow label="Signal Strength" value={specs?.wifi?.signal ? `${specs.wifi.signal}%` : '---'} />
              <SpecRow label="Authentication" value={specs?.wifi?.auth || '---'} />
              <SpecRow label="Channel" value={specs?.wifi?.channel || '---'} />
              <SpecRow label="Protocol" value={specs?.wifi?.protocol || '---'} />
              <SpecRow label="WiFi Version" value={(specs?.wifi as any)?.version || '---'} />
            </>
          ) : (
            <SpecRow label="Status" value={specs?.network?.name ? 'Connected & Active' : 'Active Connection'} />
          )}
        </div>
      </motion.div>

      {/* ─── DISPLAY CARD ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-3.5 sm:p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-3xl min-w-0 max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <Gauge className="w-4 h-4 text-zinc-500" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Display</span>
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          {(specs?.displays || []).map((display, idx) => (
            <React.Fragment key={idx}>
              <SpecRow label={`Display ${idx + 1} Res`} value={`${display.resolution} @ ${display.refresh}`} />
              {display.dpi && (
                <SpecRow label={`Display ${idx + 1} DPI`} value={display.dpi} />
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

    </div>
  );
};
