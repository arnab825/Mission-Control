import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import SafeResponsiveContainer from '../SafeResponsiveContainer';
import {
  Box,
  Zap,
  Database,
  Info
} from 'lucide-react';
import type { SystemSpecs } from '../../types/telemetry';
import { SpecRow } from './SpecRow';

export const SystemAreaChart = React.memo<{
  data: { tick: number; val: number }[];
  color: string;
  category: string;
}>(({ data, color, category }) => {
  return (
    <SafeResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
      >
        <defs>
          <linearGradient id="systemChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity="0.4" />
            <stop offset="95%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis dataKey="tick" hide />
        <YAxis 
          domain={[0, 100]} 
          tick={{ fill: '#71717a', fontSize: 9, fontWeight: 700 }} 
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-[#09090f]/90 border border-white/10 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md">
                  <span className="text-[10px] font-mono font-bold text-white block">
                    {category}: {payload[0].value}%
                  </span>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="val"
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#systemChartGrad)"
          isAnimationActive={false}
        />
      </AreaChart>
    </SafeResponsiveContainer>
  );
});

interface SystemGraphCanvasProps {
  selectedCategory: string;
  chartData: { tick: number; val: number }[];
  categoryColor: string;
  specifications: { label: string; value: string | number }[];
  specs: SystemSpecs | null;
  activeGpuIndex: number;
  setActiveGpuIndex: (idx: number) => void;
  selectedDiskIndex: number;
  setSelectedDiskIndex: (idx: number) => void;
}

export const SystemGraphCanvas: React.FC<SystemGraphCanvasProps> = ({
  selectedCategory,
  chartData,
  categoryColor,
  specifications,
  specs,
  activeGpuIndex,
  setActiveGpuIndex,
  selectedDiskIndex,
  setSelectedDiskIndex,
}) => {
  return (
    <>
      {/* Graph Area */}
      <div className="h-64 border-b border-white/5 relative group shrink-0 min-w-0 max-w-full">
        <div className="absolute inset-0 min-w-0 max-w-full">
          <SystemAreaChart
            data={chartData}
            color={categoryColor}
            category={selectedCategory}
          />
        </div>
      </div>

      {/* Dynamic Specifications Area */}
      <div className="space-y-4 min-w-0 max-w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Specifications</span>
          </div>

          {selectedCategory === 'GPU' && (specs?.hardware?.gpus || specs?.gpus || []).length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-xl flex-wrap min-w-0">
              {(specs?.hardware?.gpus || specs?.gpus || []).map((gpu, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveGpuIndex(idx)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 max-w-full truncate ${
                    activeGpuIndex === idx
                      ? 'bg-neon-yellow/15 border border-neon-yellow/30 text-neon-yellow'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  <Zap className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{gpu.type === 'discrete' ? 'dGPU' : 'iGPU'}: {gpu.name}</span>
                  {gpu.is_display_active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green shrink-0" title="Active Display Output" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-y-1 min-w-0 max-w-full">
          {specifications.map((spec, i) => (
            <SpecRow key={i} label={spec.label} value={spec.value} />
          ))}
        </div>
      </div>

      {/* Physical Memory Modules Consolidation (Memory Tab Only) */}
      {selectedCategory === 'Memory' && specs?.hardware?.ram_details && specs.hardware.ram_details.length > 0 && (
        <div className="mt-8 space-y-4 min-w-0 max-w-full">
          <div className="flex items-center gap-2">
            <Box className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Physical Modules</span>
          </div>
          <div className="grid grid-cols-1 gap-4 min-w-0">
            {specs.hardware.ram_details.map((stick, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-purple-500/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 shrink-0">
                    <Box className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">{stick.slot || `Slot ${idx + 1}`}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase truncate block">{stick.type || 'Unknown'} - {stick.manufacturer || 'Generic'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] flex-1 xl:flex xl:flex-wrap xl:justify-end xl:gap-x-8 xl:gap-y-4 min-w-0">
                  <div className="min-w-0 xl:min-w-20">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Capacity</span>
                    <span className="text-white font-black">{stick.size || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-20">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Speed</span>
                    <span className="text-white font-black">{stick.speed || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-20">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Voltage</span>
                    <span className="text-white font-black">{stick.voltage || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-30">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Part Number</span>
                    <span className="text-white font-black truncate max-w-full xl:max-w-30 block" title={stick.partNumber}>{stick.partNumber || '---'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Physical Storage Drives Consolidation (Disk Tab Only) */}
      {selectedCategory === 'Disk' && specs?.hardware?.storage_details && specs.hardware.storage_details.length > 0 && (
        <div className="mt-8 space-y-4 min-w-0 max-w-full">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Physical Storage Drives</span>
          </div>
          <div className="grid grid-cols-1 gap-4 min-w-0">
            {specs.hardware.storage_details.map((disk, idx) => (
              <div 
                role="button" 
                tabIndex={0} 
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()} 
                key={idx} 
                onClick={() => setSelectedDiskIndex(idx)}
                className={`p-4 rounded-2xl transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer border min-w-0 ${
                  selectedDiskIndex === idx 
                    ? 'bg-orange-500/5 border-orange-500/40 shadow-[0_0_15px_rgba(251,146,60,0.15)] text-white' 
                    : 'bg-white/[0.03] border-white/5 hover:border-orange-500/20 text-zinc-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 shrink-0">
                    <Database className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="max-w-55 min-w-0">
                    <span className="text-xs font-black text-white block truncate" title={disk.name}>{disk.name || `Drive ${idx + 1}`}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase truncate block">{disk.type || 'SSD'} ({disk.interface || 'SATA'})</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:flex xl:flex-wrap xl:justify-end xl:gap-x-8 xl:gap-y-4 gap-4 text-[11px] flex-1 min-w-0">
                  <div className="min-w-0 xl:min-w-17.5">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Capacity</span>
                    <span className="text-white font-black">{disk.size || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-25">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Bus Generation</span>
                    <span className="text-white font-black">{disk.generation || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-25">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Physical Slot</span>
                    <span className="text-white font-black">{disk.formFactor || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-30">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Speed (R/W)</span>
                    <span className="text-white font-black">{disk.readSpeed || '---'} / {disk.writeSpeed || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-20">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Partitions</span>
                    <span className="text-white font-black">{disk.partitions || '---'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-20">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">System Disk</span>
                    <span className={`font-black ${disk.systemDisk === 'Yes' ? 'text-neon-green' : 'text-zinc-400'}`}>{disk.systemDisk || 'No'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-20">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Paging</span>
                    <span className={`font-black ${disk.pageFile === 'Yes' ? 'text-neon-yellow' : 'text-zinc-400'}`}>{disk.pageFile || 'No'}</span>
                  </div>
                  <div className="min-w-0 xl:min-w-25">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-0.5">Serial Number</span>
                    <span className="text-white font-black truncate max-w-full xl:max-w-25 block" title={disk.serialNumber}>{disk.serialNumber || '---'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
