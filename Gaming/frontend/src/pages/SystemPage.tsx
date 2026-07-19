import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Cpu,
  Box,
  Zap,
  Database,
  Network,
  Info,
  Monitor,
  Shield,
  Wifi,
  HardDrive,
  MemoryStick,
  Gauge,
  Activity,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';
import type { TelemetryState, SystemSpecs } from '../types/telemetry';
import { AdvisorPanel } from '../components/AdvisorPanel';

const colorStyles: Record<string, {
  bg: string;
  bgMuted: string;
  borderMuted: string;
  text: string;
}> = {
  blue: {
    bg: 'bg-blue-500',
    bgMuted: 'bg-blue-500/10',
    borderMuted: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  purple: {
    bg: 'bg-purple-500',
    bgMuted: 'bg-purple-500/10',
    borderMuted: 'border-purple-500/20',
    text: 'text-purple-400',
  },
  emerald: {
    bg: 'bg-neon-yellow',
    bgMuted: 'bg-neon-yellow/10',
    borderMuted: 'border-neon-yellow/20',
    text: 'text-neon-yellow',
  },
  orange: {
    bg: 'bg-orange-500',
    bgMuted: 'bg-orange-500/10',
    borderMuted: 'border-orange-500/20',
    text: 'text-orange-400',
  },
  red: {
    bg: 'bg-red-500',
    bgMuted: 'bg-red-500/10',
    borderMuted: 'border-red-500/20',
    text: 'text-red-400',
  },
};

const metricExplanations: Record<string, string> = {
  // CPU
  'Processor': 'The Central Processing Unit (CPU) - the main brain of your computer that executes game instructions.',
  'Current Frequency': 'The speed at which your CPU cores execute instructions, measured in MegaHertz (MHz). Higher speeds yield smoother gameplay.',
  'Utilization': 'The percentage of total processing capacity currently being used by active games and system processes.',
  'Cores': 'Physical processing units on your CPU chip. More cores allow handling more background tasks simultaneously.',
  'Threads': 'Virtual processing cores. Hypershredding technology allows each physical core to work on multiple tasks at once.',
  
  // Memory
  'Memory Type': 'The generation of RAM (Double Data Rate e.g. DDR4 or DDR5) in your system. DDR5 transfers data significantly faster than DDR4.',
  'Total Capacity': 'Total Random Access Memory (RAM) available. More RAM prevents system stuttering when loading massive textures.',
  'Memory Speed': 'The frequency of data transfer between RAM and processor. Faster speed improves loading times and minimum 1% low frames.',
  'Modules Installed': 'Physical RAM sticks in motherboard DIMM slots. Dual sticks enable dual-channel bandwidth for up to double data speeds.',
  'Used Capacity': 'The amount of active memory occupied by open games and the operating system.',
  
  // GPU
  'Graphics Card': 'The Graphics Processing Unit (GPU) - handles rendering all frames, complex 3D meshes, shaders, and real-time lighting.',
  'VRAM Total': 'Total Video RAM on the GPU. Higher VRAM allows running games at higher resolutions (like 1440p or 4K) and Ultra textures.',
  'VRAM Used': 'Active Video RAM footprint. Exceeding your VRAM capacity causes severe lag spikes as assets load from slower system RAM.',
  'Dedicated VRAM': 'Ultra-fast memory built directly on your graphics card layout, dedicated purely to rendering.',
  'Power Draw': 'The electrical power currently consumed by your graphics card, measured in Watts (W).',
  'Driver Version': 'The operating software for your GPU. Keep this updated for maximum stability and performance optimizations in new games.',
  'Temperature': 'Current thermal status of your GPU core. Staying under 80-85°C prevents thermal throttling (GPU slowing down to cool off).',
  
  // Disk
  'Storage Device': 'The active drive where data is stored. Solid State Drives (SSDs) load games exponentially faster than Hard Drives (HDDs).',
  'Volume Partitions': 'Logical divisions on the storage drive (e.g. C: and D: partitions).',
  'System Disk': 'Indicates if this storage drive contains the Windows Operating System files.',
  'Page File (Paging)': 'A virtual memory file on the disk used as an overflow buffer when physical RAM is fully saturated.',
  'Serial Number': 'Unique hardware identifier code for the physical storage drive.',
  'Bus Generation': 'The interface standard (e.g. PCIe 3.0 or PCIe 4.0). PCIe 4.0 NVMe drives offer double the bandwidth of PCIe 3.0.',
  'Physical Slot': 'The slot format (e.g. M.2 or 2.5" SATA). M.2 NVMe drives connect directly to the motherboard for maximum speeds.',
  'Speed (R/W)': 'Read and Write speeds. Faster read speeds mean zero texture pop-in during gameplay.',

  // Network
  'Network Adapter': 'The hardware device (Ethernet port or Wi-Fi card) connecting your system to the internet.',
  'Current Throughput': 'Real-time bandwidth download/upload rate. Lower connection speed can cause network lag (high ping).',
  'SSID': 'The name of the Wi-Fi network you are currently connected to.',
  'Protocol': 'The Wi-Fi generation standard (e.g. Wi-Fi 6 or 802.11ax). Newer protocols offer lower latency in online combat.',
  'Signal Strength': 'The quality of connection between your device and the router. Higher percentage means fewer dropped packets.',
  'Channel': 'The specific radio frequency channel your Wi-Fi is broadcasting on. Less crowded channels have less interference.',
};

const SpecRow: React.FC<{
  label: string;
  value: string | number;
  explanationKey?: string;
}> = ({ label, value, explanationKey }) => {
  const key = explanationKey || label;
  const explanation = metricExplanations[key];
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 pt-1.5 gap-4 relative min-w-0 w-full">
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider truncate max-w-[120px] sm:max-w-[180px]" title={label}>
          {label}
        </span>
        {explanation && (
          <div className="relative group/tooltip inline-block shrink-0">
            <span className="p-0.5 hover:bg-white/5 rounded-full cursor-help text-zinc-600 hover:text-neon-green transition-colors block">
              <Info className="w-3 h-3" />
            </span>
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#0a0a0f] border border-white/10 text-[10px] text-zinc-400 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none normal-case leading-relaxed font-medium">
              {explanation}
              <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-[#0a0a0f]" />
            </div>
          </div>
        )}
      </div>
      <span className="text-xs font-black text-white text-right truncate pl-2 flex-1 min-w-0" title={value?.toString()}>
        {value}
      </span>
    </div>
  );
};

const SubNavItem: React.FC<{
  label: string,
  value: string,
  percent: number,
  color: string,
  icon: React.ElementType,
  isActive: boolean,
  onClick: () => void,
  className?: string
}> = ({ label, value, percent, color, icon: Icon, isActive, onClick, className = '' }) => {
  const styles = colorStyles[color] || colorStyles.blue;
  return (
    <button aria-label="button" type="button"
      onClick={onClick}
      className={`shrink-0 w-[135px] sm:w-[160px] lg:w-full min-w-0 p-2.5 lg:p-3.5 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-3 border transition-all ${
        isActive ? 'bg-white/4 border-white/10 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/2'
      } ${className}`}
    >
      <div className={`p-1.5 lg:p-2 rounded-lg lg:rounded-xl ${styles.bgMuted} border ${styles.borderMuted} shrink-0`}>
        <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${styles.text}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-1 gap-0.5 lg:gap-1">
          <span className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest truncate ${isActive ? 'text-white' : 'text-zinc-500'}`}>
            {label}
          </span>
          <span className={`text-[9px] lg:text-[10px] font-black truncate ${isActive ? styles.text : 'text-zinc-600'}`}>
            {value}
          </span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className={`h-full ${styles.bg}`}
          />
        </div>
      </div>
    </button>
  );
};

const mergeSpecs = (prev: SystemSpecs | null, incoming: SystemSpecs | undefined | null): SystemSpecs | null => {
  if (!prev) return incoming || null;
  if (!incoming) return prev;

  return {
    ...prev,
    hardware: {
      ...prev.hardware,
      cpu: incoming.hardware?.cpu || prev.hardware?.cpu,
      cores: incoming.hardware?.cores || prev.hardware?.cores,
      threads: incoming.hardware?.threads || prev.hardware?.threads,
      gpu: incoming.hardware?.gpu && incoming.hardware.gpu !== 'Gathering...' ? incoming.hardware.gpu : prev.hardware?.gpu,
      ram: incoming.hardware?.ram || prev.hardware?.ram,
      storage: incoming.hardware?.storage && incoming.hardware.storage !== 'Gathering...' ? incoming.hardware.storage : prev.hardware?.storage,
      ram_details: (incoming.hardware?.ram_details && incoming.hardware.ram_details.length > 0)
        ? incoming.hardware.ram_details
        : prev.hardware?.ram_details,
      storage_details: (incoming.hardware?.storage_details && incoming.hardware.storage_details.length > 0)
        ? incoming.hardware.storage_details
        : prev.hardware?.storage_details,
    },
    network: incoming.network || prev.network,
    wifi: incoming.wifi || prev.wifi,
    os_details: incoming.os_details || prev.os_details,
    displays: (incoming.displays && incoming.displays.length > 0) ? incoming.displays : prev.displays,
    peripherals: (incoming.peripherals && incoming.peripherals.length > 0) ? incoming.peripherals : prev.peripherals,
    vram_gb: incoming.vram_gb || prev.vram_gb,
  };
};

const Heatbar: React.FC<{
  label: string;
  value: number;
  max: number;
  unit: string;
}> = ({ label, value, max, unit }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  let status: 'Safe' | 'Warm' | 'Limit' = 'Safe';
  let textClass = 'text-neon-yellow';
  
  if (label.includes('CPU') || label.includes('GPU')) {
    if (value >= 88) {
      status = 'Limit';
      textClass = 'text-red-400';
    } else if (value >= 80) {
      status = 'Warm';
      textClass = 'text-orange-400';
    }
  } else {
    if (percentage >= 90) {
      status = 'Limit';
      textClass = 'text-red-400';
    } else if (percentage >= 75) {
      status = 'Warm';
      textClass = 'text-orange-400';
    }
  }

  const blockCount = 14;
  const filledBlocks = Math.round((percentage / 100) * blockCount);
  const blocksVisual = '█'.repeat(filledBlocks);
  const emptyVisual = '░'.repeat(Math.max(0, blockCount - filledBlocks));

  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">{label}</span>
        <span className="text-xs font-black text-white block mt-0.5">{value.toFixed(0)}{unit}</span>
      </div>
      <div className="flex flex-col items-end gap-1 select-none">
        <div className="font-mono text-xs tracking-wider flex items-center gap-0.5">
          <span className={textClass}>{blocksVisual}</span>
          <span className="text-zinc-800">{emptyVisual}</span>
        </div>
        <span className={`text-[8px] font-black uppercase tracking-widest ${textClass}`}>{status}</span>
      </div>
    </div>
  );
};

const AnomalyDetailPanel: React.FC<{ event: any }> = ({ event }) => {
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

interface SystemPageProps {
  state: TelemetryState | null;
  selectedCategory?: string;
  setSelectedCategory?: (category: string) => void;
  sendCommand?: (type: string, payload?: any) => void;
}

const SystemPage: React.FC<SystemPageProps> = ({ 
  state, 
  selectedCategory: controlledCategory, 
  setSelectedCategory: setControlledCategory,
  sendCommand
}) => {
  const [localCategory, setLocalCategory] = useState('CPU');
  const selectedCategory = controlledCategory ?? localCategory;
  const setSelectedCategory = setControlledCategory ?? setLocalCategory;
  const [specs, setSpecs] = useState<SystemSpecs | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'details' | 'intel'>('graph');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [selectedDiskIndex, setSelectedDiskIndex] = useState(0);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number>(0);

  // Get unique machines from session history
  const machines = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    (state?.session_history || []).forEach((s: any) => {
      const mId = s.machine_id || 'unknown_machine';
      const mName = s.machine_name || 'Unknown Machine';
      if (!seen.has(mId)) {
        seen.add(mId);
        list.push({ id: mId, name: mName });
      }
    });
    return list;
  }, [state?.session_history]);

  // Set default selected machine
  useEffect(() => {
    if (machines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machines[0].id);
    }
  }, [machines, selectedMachineId]);

  // Filter sessions by selected machine
  const machineSessions = useMemo(() => {
    if (!selectedMachineId) return [];
    return (state?.session_history || []).filter((s: any) => (s.machine_id || 'unknown_machine') === selectedMachineId);
  }, [state?.session_history, selectedMachineId]);

  // Reset session index when machine changes
  useEffect(() => {
    setSelectedSessionIndex(0);
    setSelectedEvent(null);
  }, [selectedMachineId]);

  // Active session
  const activeSession = useMemo(() => {
    return machineSessions[selectedSessionIndex] || null;
  }, [machineSessions, selectedSessionIndex]);

  // Reset selectedEvent when activeSession changes
  useEffect(() => {
    setSelectedEvent(null);
  }, [activeSession]);
  const [history, setHistory] = useState<Record<string, number[]>>({
    CPU: Array(20).fill(0),
    Memory: Array(20).fill(0),
    GPU: Array(20).fill(0),
    Disk: Array(20).fill(0),
    Network: Array(20).fill(0),
  });
  
  // Ref to debounce history updates
  const lastHistoryUpdateRef = useRef<number>(0);
  const HISTORY_UPDATE_INTERVAL = 200; // Update history every 200ms max

  useEffect(() => {
    let timer: any;
    const fetchSpecs = async () => {
      if (window.electronAPI) {
        const data = await window.electronAPI.getSystemStats();
        setSpecs(prev => mergeSpecs(prev, data));
        
        // Poll every 2 seconds until heavy hardware details are fully gathered
        const hasFullDetails = data?.hardware?.ram_details && data.hardware.ram_details.length > 0;
        if (!hasFullDetails) {
          timer = setTimeout(fetchSpecs, 2000);
        }
      }
    };
    fetchSpecs();
    return () => clearTimeout(timer);
  }, []);

  // Fetch session history when entering Intel tab
  useEffect(() => {
    if (viewMode === 'intel' && sendCommand) {
      sendCommand('get_session_history', { userId: 'guest' });
    }
  }, [viewMode, sendCommand]);

  // Circular caching: Save full specs back to Electron when fully gathered from the Python backend
  useEffect(() => {
    if (specs && specs.hardware?.ram_details && specs.hardware.ram_details.length > 0) {
      if (window.electronAPI?.saveSystemStats) {
        window.electronAPI.saveSystemStats(specs).catch(err => {
          console.error('[SystemPage] Failed to save specs to Electron:', err);
        });
      }
    }
  }, [specs]);

  useEffect(() => {
    if (state) {
      if (state.system_specs) {
        setSpecs(prev => mergeSpecs(prev, state.system_specs));
      }
      
      // Debounce history updates - only update if enough time has passed
      const now = Date.now();
      if (now - lastHistoryUpdateRef.current < HISTORY_UPDATE_INTERVAL) {
        return; // Skip update if too soon
      }
      lastHistoryUpdateRef.current = now;
      
      setHistory(prev => {
        const memBase = state.mem_pct || 0;
        const memNoise = memBase > 0 ? (memBase + (Math.sin(Date.now() / 1500) * 0.4) + (Math.random() * 0.2 - 0.1)) : 0;
        const memVal = Math.max(0, Math.min(100, memNoise));

        const diskBase = state.disk_util || 0;
        const diskNoise = diskBase > 0 ? (diskBase + (Math.sin(Date.now() / 800) * 0.15) + (Math.random() * 0.1 - 0.05)) : 0;
        const diskVal = Math.max(0, Math.min(100, diskNoise));

        return {
          CPU: [...prev.CPU.slice(1), state.cpu_pct || 0],
          Memory: [...prev.Memory.slice(1), memVal],
          GPU: [...prev.GPU.slice(1), state.gpu_metrics?.utilization ?? state.gpu_metrics?.gpu_util ?? 0],
          Disk: [...prev.Disk.slice(1), diskVal],
          Network: [...prev.Network.slice(1), state.net_util || 0],
        };
      });
    }
  }, [state]);

  const getCategorySpecifications = useMemo(() => {
    if (!specs) return [];
    
    switch (selectedCategory) {
      case 'CPU':
        return [
          { label: 'Processor', value: specs.hardware.cpu },
          { label: 'Current Frequency', value: state?.cpu_freq ? `${state.cpu_freq.toFixed(0)} MHz` : '---' },
          { label: 'Utilization', value: `${state?.cpu_pct != null ? state.cpu_pct.toFixed(1) : '0.0'}%` },
          { label: 'Temperature', value: state?.cpu_temp ? `${Math.round(state.cpu_temp)}°C` : '---' },
          { label: 'Cores', value: specs.hardware.cores?.toString() || '---' },
          { label: 'Threads', value: specs.hardware.threads?.toString() || '---' },
        ];

      case 'Memory': {
        const memType = specs.hardware.ram_details && specs.hardware.ram_details.length > 0 
          ? specs.hardware.ram_details[0].type 
          : 'Unknown';
        const memSpeed = state?.ram_speed || (specs.hardware.ram_details && specs.hardware.ram_details.length > 0 ? specs.hardware.ram_details[0].speed : '---');
        const moduleCount = specs.hardware.ram_details ? specs.hardware.ram_details.length : 0;

        return [
          { label: 'Memory Type', value: memType !== 'Unknown' ? memType : '---' },
          { label: 'Total Capacity', value: specs.hardware.ram },
          { label: 'Memory Speed', value: memSpeed },
          { label: 'Modules Installed', value: moduleCount > 0 ? `${moduleCount} DIMM${moduleCount > 1 ? 's' : ''}` : '---' },
          { label: 'Used Capacity', value: state?.mem_used_gb ? `${state.mem_used_gb.toFixed(1)} GB` : '---' },
          { label: 'Utilization', value: `${state?.mem_pct != null ? state.mem_pct.toFixed(1) : '0.0'}%` },
        ];
      }

      case 'GPU': {
        const vramTot = state?.gpu_metrics?.vram_total ?? state?.gpu_metrics?.vram_total_mb;
        const vramUsed = state?.gpu_metrics?.vram_used ?? state?.gpu_metrics?.vram_used_mb;
        const powerDraw = state?.gpu_metrics?.power_draw ?? state?.gpu_metrics?.power_draw_w;
        const temp = state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature;
        return [
          { label: 'Graphics Card', value: specs.hardware.gpu },
          { label: 'VRAM Total', value: vramTot != null ? `${(vramTot / 1024).toFixed(1)} GB` : '---' },
          { label: 'VRAM Used', value: vramUsed != null ? `${vramUsed} MB (${state?.gpu_metrics?.vram_percent ?? 0}%)` : '---' },
          { label: 'Dedicated VRAM', value: specs.vram_gb ? `${specs.vram_gb} GB` : '---' },
          { label: 'Power Draw', value: powerDraw !== undefined && powerDraw !== null ? `${Math.round(powerDraw)} W` : '---' },
          { label: 'Driver Version', value: state?.gpu_metrics?.driver_version || '---' },
          { label: 'Temperature', value: temp ? `${Math.round(temp)}°C` : '---' },
        ];
      }

      case 'Disk': {
        const details = specs.hardware.storage_details && specs.hardware.storage_details.length > selectedDiskIndex
          ? specs.hardware.storage_details[selectedDiskIndex]
          : (specs.hardware.storage_details && specs.hardware.storage_details.length > 0 ? specs.hardware.storage_details[0] : null);
        
        const rows = [
          { label: 'Storage Device', value: details ? `${details.name} (${details.size})` : specs.hardware.storage },
          { label: 'Utilization', value: `${state?.disk_util?.toFixed(1) || 0}%` },
        ];

        if (details) {
          rows.push(
            { label: 'Volume Partitions', value: details.partitions || '---' },
            { label: 'System Disk', value: details.systemDisk || 'No' },
            { label: 'Page File (Paging)', value: details.pageFile || 'No' },
            { label: 'Serial Number', value: details.serialNumber || '---' }
          );
        }
        return rows;
      }

      case 'Network':
        return [
          { label: 'Network Adapter', value: specs.network?.name || '---' },
          { label: 'Current Throughput', value: state?.net_speed || '---' },
          { label: 'SSID', value: specs.wifi?.ssid || '---' },
          { label: 'Protocol', value: specs.wifi?.protocol || '---' },
          { label: 'Signal Strength', value: specs.wifi?.signal ? `${specs.wifi.signal}%` : '---' },
        ];

      default:
        return [];
    }
  }, [specs, selectedCategory, state, selectedDiskIndex]);

  const getActiveMetric = useMemo(() => {
    if (!state) return { value: '0.0%', percent: 0 };
    switch (selectedCategory) {
      case 'CPU': return { value: `${(state.cpu_pct ?? 0).toFixed(1)}%`, percent: state.cpu_pct ?? 0 };
      case 'Memory': return { value: `${(state.mem_pct ?? 0).toFixed(1)}%`, percent: state.mem_pct ?? 0 };
      case 'GPU': {
        const util = state.gpu_metrics?.utilization ?? state.gpu_metrics?.gpu_util ?? 0;
        return { value: `${(util).toFixed(1)}%`, percent: util };
      }
      case 'Disk': return { value: `${(state.disk_util || 0).toFixed(1)}%`, percent: state.disk_util || 0 };
      case 'Network': return { value: state.net_speed || specs?.network?.speed || '---', percent: state.net_util || 0 };
      default: return { value: '0.0%', percent: 0 };
    }
  }, [selectedCategory, state, specs]);

  const getMemoryDDRType = useMemo(() => {
    if (!specs?.hardware?.ram_details || specs.hardware.ram_details.length === 0) return '';
    const type = specs.hardware.ram_details[0].type;
    return type && type !== 'Unknown' ? type : '';
  }, [specs]);

  const getHardwareDetail = useMemo(() => {
    if (!specs) return 'Gathering Specs...';
    switch (selectedCategory) {
      case 'CPU': return specs.hardware.cpu;
      case 'Memory': {
        const ddr = getMemoryDDRType;
        return ddr ? `${ddr} ${specs.hardware.ram}` : specs.hardware.ram;
      }
      case 'GPU': return specs.hardware.gpu;
      case 'Disk': {
        const details = specs.hardware.storage_details && specs.hardware.storage_details.length > selectedDiskIndex
          ? specs.hardware.storage_details[selectedDiskIndex]
          : null;
        return details ? `${details.name} (${details.size})` : specs.hardware.storage;
      }
      case 'Network': return specs.network?.name || 'Local Network';
      default: return specs.hardware.cpu;
    }
  }, [specs, selectedCategory, selectedDiskIndex, getMemoryDDRType]);

  const getCategoryIcon = useMemo(() => {
    switch (selectedCategory) {
      case 'CPU': return <Cpu className="w-5 h-5 text-blue-400" />;
      case 'Memory': return <Box className="w-5 h-5 text-purple-400" />;
      case 'GPU': return <Zap className="w-5 h-5 text-neon-yellow" />;
      case 'Disk': return <Database className="w-5 h-5 text-orange-400" />;
      case 'Network': return <Network className="w-5 h-5 text-red-400" />;
      default: return <Cpu className="w-5 h-5 text-blue-400" />;
    }
  }, [selectedCategory]);

  const getCategoryColor = useMemo(() => {
    switch (selectedCategory) {
      case 'CPU': return '#60a5fa';
      case 'Memory': return '#c084fc';
      case 'GPU': return '#34d399';
      case 'Disk': return '#fb923c';
      case 'Network': return '#f87171';
      default: return '#60a5fa';
    }
  }, [selectedCategory]);

  // Get memoized values
  const metric = getActiveMetric;
  const currentPoints = history[selectedCategory] || Array(20).fill(0);

  // Format dataset for Recharts AreaChart
  const chartData = useMemo(() => {
    return currentPoints.map((val, i) => ({
      tick: i,
      val: Math.round(val || 0)
    }));
  }, [currentPoints]);

  return (
    <div className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col h-full min-h-0 bg-transparent select-none gap-y-5 md:gap-y-6">
      
      {/* Sleek Low-Profile Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 pt-1 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase font-sans">
              System Telemetry
            </h2>
            {/* Connected Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neon-yellow/10 border border-neon-yellow/20">
              <span className="w-1 h-1 rounded-full bg-neon-yellow animate-ping" />
              <span className="text-[7px] font-black uppercase text-neon-yellow tracking-wider">Monitor Active</span>
            </div>
          </div>
          <p className="text-[10px] font-medium text-zinc-500">
            Real-time hardware tracking, memory allocation, multi-threaded core diagnostics, and dynamic GPU telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end w-full sm:w-auto">
          {/* Dynamic GPU Telemetry Status chip */}
          <div className="hidden md:flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-3.5 py-1.5">
            <div className="relative w-8 h-8 rounded-xl bg-black/45 border border-white/10 flex items-center justify-center text-blue-400">
              <Gauge className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-right">
              <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block">Primary GPU</span>
              <span className="text-[9px] font-mono font-black text-zinc-300 block whitespace-nowrap">{specs?.hardware.gpu || 'Gathering...'}</span>
            </div>
          </div>

          {/* View Switcher (Details vs Graph vs Performance Intel) */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
            <button aria-label="button" type="button"
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'graph'
                  ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.15)] font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              Graph
            </button>
            <button aria-label="button" type="button"
              onClick={() => setViewMode('details')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'details'
                  ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.15)] font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              Details
            </button>
            <button aria-label="button" type="button"
              onClick={() => setViewMode('intel')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'intel'
                  ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.15)] font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              Performance Intel
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0">

        {/* Left Sub-nav */}
      <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 lg:gap-1.5 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto shrink-0 pb-2 lg:pb-20 sticky top-0 lg:relative z-10 bg-zinc-950/95 backdrop-blur-md lg:bg-transparent -mx-4 px-4 lg:mx-0 lg:px-0 pt-2 lg:pt-0 no-scrollbar mask-fade-right lg:mask-none">
        <SubNavItem
          label="CPU"
          value={`${state?.cpu_pct != null ? state.cpu_pct.toFixed(1) : '0.0'}%`}
          percent={state?.cpu_pct || 0}
          color="blue"
          icon={Cpu}
          isActive={selectedCategory === 'CPU'}
          onClick={() => { setSelectedCategory('CPU'); setViewMode('graph'); }}
        />
        <SubNavItem 
          label="Memory" 
          value={(() => {
            if (state?.mem_used_gb && state?.mem_total_gb) {
              return `${state.mem_used_gb}/${state.mem_total_gb} GB`;
            }
            return state?.mem_pct ? `${state.mem_pct}%` : '---';
          })()}
          percent={state?.mem_pct || 0}
          color="purple" 
          icon={Box} 
          isActive={selectedCategory === 'Memory'}
          onClick={() => { setSelectedCategory('Memory'); setViewMode('graph'); }}
        />
        <SubNavItem
          label="GPU"
          value={`${(state?.gpu_metrics?.utilization || 0).toFixed(1)}%`}
          percent={state?.gpu_metrics?.utilization || 0}
          color="emerald"
          icon={Zap}
          isActive={selectedCategory === 'GPU'}
          onClick={() => { setSelectedCategory('GPU'); setViewMode('graph'); }}
        />
        <SubNavItem
          label="Disk"
          value={`${(state?.disk_util || 0).toFixed(1)}%`}
          percent={state?.disk_util || 0}
          color="orange"
          icon={Database}
          isActive={selectedCategory === 'Disk'}
          onClick={() => { setSelectedCategory('Disk'); setViewMode('graph'); }}
        />
        <SubNavItem
          label="Network"
          value={state?.net_speed || specs?.network?.speed || 'Syncing...'}
          percent={state?.net_util || 0}
          color="red"
          icon={Network}
          isActive={selectedCategory === 'Network'}
          onClick={() => { setSelectedCategory('Network'); setViewMode('graph'); }}
        />

        {/* Footer info in sub-nav (Visible on Desktop only) */}
        <div className="hidden lg:block mt-auto pt-6">
          <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hardware Info</span>
              <button aria-label="button" type="button" 
                onClick={() => setViewMode(prev => prev === 'graph' ? 'details' : 'graph')}
                className={`text-[10px] font-black ml-auto cursor-pointer transition-colors ${viewMode === 'details' ? 'text-neon-green' : 'text-white hover:text-neon-green'}`}
              >
                {viewMode === 'details' ? 'BACK' : 'DETAILS'}
              </button>
            </div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase truncate">
              {specs?.hardware.gpu || 'Gathering Specs...'}
            </p>
            {(!specs || specs.hardware.gpu === 'Gathering...') && (
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
                animate={{ translateX: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Details Area */}
      <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] p-5 md:p-8 flex flex-col overflow-y-auto custom-scrollbar shadow-2xl relative min-h-0">
        <div className="flex justify-between items-start mb-6 md:mb-10 shrink-0 gap-4">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase mb-1 leading-none truncate">
              {viewMode === 'graph' ? (
                selectedCategory === 'Memory' ? (() => {
                  const ddr = getMemoryDDRType;
                  return ddr ? `${ddr} Utilization` : 'Memory Utilization';
                })() : `${selectedCategory} Utilization`
              ) : viewMode === 'details' ? 'Hardware Details' : 'Performance Intel'}
            </h2>
            <p className="text-xs font-bold text-zinc-500 truncate" title={viewMode === 'graph' ? getHardwareDetail : viewMode === 'details' ? 'System Hardware Specifications' : 'AI-Assisted Telemetry Narrative'}>
              {viewMode === 'graph' ? getHardwareDetail : viewMode === 'details' ? 'System Hardware Specifications' : 'AI-Assisted Telemetry Narrative'}
            </p>
          </div>
          <div className="flex items-center gap-3.5 shrink-0">
            {viewMode === 'graph' && (
              <span 
                className="text-3xl md:text-5xl font-black tracking-tighter leading-none shrink-0" 
                style={{ 
                  color: getCategoryColor,
                  textShadow: `0 0 20px ${getCategoryColor}40`
                }}
              >
                {metric.value}
              </span>
            )}
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-2xl shrink-0">
              {viewMode === 'graph' ? getCategoryIcon : viewMode === 'details' ? <Shield className="w-5 h-5 text-blue-400" /> : <Sparkles className="w-5 h-5 text-neon-green animate-pulse" />}
            </div>
          </div>
        </div>

        <AdvisorPanel recommendations={state?.advisor_recommendations?.filter(r => !r.category || r.category === selectedCategory || r.category === 'System')} />

        <div className="flex-1 flex flex-col gap-y-12">
          {viewMode === 'graph' ? (
            <>
              {/* Graph Area */}
              <div className="h-64 border-b border-white/5 relative group shrink-0">
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="systemChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getCategoryColor} stopOpacity="0.4" />
                          <stop offset="95%" stopColor={getCategoryColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="tick" hide />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fill: '#71717a', fontSize: 9, fontWeight: 700 }} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `${v}%`} 
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(9,9,15,0.95)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#fff',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                        }}
                        formatter={(value: any) => [`${value}%`, selectedCategory]}
                        cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="val" 
                        stroke={getCategoryColor} 
                        strokeWidth={2.5} 
                        fill="url(#systemChartGrad)" 
                        dot={false} 
                        activeDot={{ r: 3.5, fill: getCategoryColor }} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dynamic Specifications Area */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Specifications</span>
                </div>
                <div className="grid grid-cols-1 gap-y-1">
                  {getCategorySpecifications.map((spec: any, i: number) => (
                    <SpecRow key={i} label={spec.label} value={spec.value} />
                  ))}
                </div>
              </div>

              {/* Physical Memory Modules Consolidation (Memory Tab Only) */}
              {selectedCategory === 'Memory' && specs?.hardware?.ram_details && specs.hardware.ram_details.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Physical Modules</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {specs.hardware.ram_details.map((stick, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-purple-500/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <Box className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block">{stick.slot || `Slot ${idx + 1}`}</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{stick.type || 'Unknown'} - {stick.manufacturer || 'Generic'}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] flex-1 xl:flex xl:flex-wrap xl:justify-end xl:gap-x-8 xl:gap-y-4">
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
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Physical Storage Drives</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {specs.hardware.storage_details.map((disk, idx) => (
                      <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()} 
                        key={idx} 
                        onClick={() => setSelectedDiskIndex(idx)}
                        className={`p-4 rounded-2xl transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer border ${
                          selectedDiskIndex === idx 
                            ? 'bg-orange-500/5 border-orange-500/40 shadow-[0_0_15px_rgba(251,146,60,0.15)] text-white' 
                            : 'bg-white/[0.03] border-white/5 hover:border-orange-500/20 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                            <Database className="w-4 h-4 text-orange-400" />
                          </div>
                          <div className="max-w-55">
                            <span className="text-xs font-black text-white block truncate" title={disk.name}>{disk.name || `Drive ${idx + 1}`}</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{disk.type || 'SSD'} ({disk.interface || 'SATA'})</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:flex xl:flex-wrap xl:justify-end xl:gap-x-8 xl:gap-y-4 gap-4 text-[11px] flex-1">
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
          ) : viewMode === 'details' ? (
            <div className="grid grid-cols-1 gap-6 pb-8">

              {/* ─── PROCESSOR CARD ─── */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl"
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

              {/* ─── GRAPHICS CARD ─── */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl"
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
                      const limitMax = state?.gpu_metrics?.power_limit_max ?? state?.gpu_metrics?.power_limit_max_w;
                      if (draw === undefined || draw === null) return '---';
                      const formattedDraw = Math.round(draw);
                      const formattedLimit = limit ? ` / ${Math.round(limit)} W configured` : '';
                      const formattedMax = (limitMax && limitMax > 0) ? ` (chassis: ${Math.round(limitMax)} W TGP)` : '';
                      return `${formattedDraw} W${formattedLimit}${formattedMax}`;
                    })()} 
                  />
                  <SpecRow label="Temperature" value={(state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature) ? `${Math.round(state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature ?? 0)}°C` : '---'} />
                </div>
              </motion.div>

              {/* ─── MEMORY CARD ─── */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 bg-white/3 border border-white/10 rounded-3xl"
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
                className="p-6 bg-white/3 border border-white/10 rounded-3xl"
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
                        <div key={idx} className="p-3.5 rounded-2xl bg-white/2 border border-white/5 hover:border-orange-500/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                              <Database className="w-3 h-3 text-orange-400" />
                            </div>
                            <div className="max-w-50">
                              <span className="text-[11px] font-black text-white block truncate" title={disk.name}>{disk.name || `Drive ${idx + 1}`}</span>
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">{disk.type || 'SSD'} · {disk.interface || 'SATA'}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] flex-1 xl:justify-end justify-start">
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
                className="p-6 bg-white/3 border border-white/10 rounded-3xl"
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
                className="p-6 bg-white/3 border border-white/10 rounded-3xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Wifi className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Network Connectivity</span>
                </div>
                <div className="grid grid-cols-1 gap-y-1">
                  <SpecRow label="SSID" value={specs?.wifi?.ssid || '---'} />
                  <SpecRow label="Signal Strength" value={specs?.wifi?.signal ? `${specs.wifi.signal}%` : '---'} />
                  <SpecRow label="Link Speed (R/T)" value={state?.net_speed || specs?.network?.speed || '---'} explanationKey="Current Throughput" />
                  <SpecRow label="Authentication" value={specs?.wifi?.auth || '---'} />
                  <SpecRow label="Channel" value={specs?.wifi?.channel || '---'} />
                  <SpecRow label="Protocol" value={specs?.wifi?.protocol || '---'} />
                  <SpecRow label="WiFi Version" value={(specs?.wifi as any)?.version || '---'} />
                </div>
              </motion.div>

              {/* ─── DISPLAY CARD ─── */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 bg-white/3 border border-white/10 rounded-3xl"
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
          ) : (
            <>
              {/* Machine & Session Selectors */}
              {machines.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] shrink-0 mb-2">
                  {/* Machine Selector */}
                  <div className="flex flex-col gap-2">
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
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">
                        Select Session
                      </span>
                      <div className="relative">
                        <select
                          value={selectedSessionIndex}
                          onChange={(e) => setSelectedSessionIndex(Number(e.target.value))}
                          className="bg-[#09090f] text-[11px] text-zinc-300 font-bold border border-white/10 rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-neon-green/30 transition-all cursor-pointer min-w-[220px]"
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

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
              
              {/* Left Column: Today's Findings & Stress Map */}
              <div className="space-y-6 flex flex-col">
                
                {/* 1. Today's Findings Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-gradient-to-br from-neon-green/[0.05] via-white/[0.02] to-transparent border border-neon-green/20 rounded-3xl relative overflow-hidden flex-1"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-neon-green" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      AI Performance Narrative
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight mb-3">
                    {(() => {
                      const session = activeSession;
                      return session?.game_name ? `${session.game_name} Session Wrapped` : 'Gameplay Analysis';
                    })()}
                  </h3>
                  
                  {(() => {
                    const session = activeSession;
                    const findings = session?.summary?.findings || session?.findings || [];
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
                  className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Gauge className="w-4 h-4 text-zinc-400" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Hardware Stress Map
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
              <div className="space-y-6 flex flex-col">
                
                {/* 3. Performance Health Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex-1 flex flex-col min-h-64"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-zinc-400" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Performance Health Timeline
                    </span>
                  </div>
                  
                  {(() => {
                    const session = activeSession;
                    const events = session?.summary?.events || session?.events || [];
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

                            if (!selectedEvent && i === 0) {
                              setTimeout(() => setSelectedEvent(evt), 0);
                            }

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
                  className="flex-1"
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
                    className="w-full max-w-lg bg-[#07070c] border border-neon-green/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl flex flex-col gap-6"
                  >
                    {/* Glowing gradient backdrops */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-neon-green/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    {(() => {
                      const session = activeSession;
                      return (
                        <>
                          <div className="flex justify-between items-start shrink-0 z-10">
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-neon-green">Mission Control WRAPPED</span>
                              <h2 className="text-xl font-black text-white uppercase tracking-tight mt-1">{session?.game_name || 'Session'} Summary</h2>
                              <span className="text-[9px] font-bold text-zinc-500 block mt-0.5">
                                Duration: {session?.duration_secs ? Math.round(session.duration_secs / 60) : 0} mins gameplay
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

                          {/* wrapped statistics */}
                          <div className="grid grid-cols-2 gap-4">
                            
                            {/* Average FPS */}
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Average FPS</span>
                              <div className="flex items-baseline gap-1 mt-auto">
                                <span className="text-3xl font-black text-white font-mono leading-none">
                                  {session?.fps?.avg ? Math.round(session.fps.avg) : '---'}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-500">FPS</span>
                              </div>
                            </div>

                            {/* Bottleneck analysis */}
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">System Bottleneck</span>
                              <div className="mt-auto">
                                {session?.gpu?.utilization?.avg >= 90 ? (
                                  <span className="text-xs font-black text-neon-yellow uppercase tracking-wide block">GPU Bound</span>
                                ) : session?.cpu?.utilization?.avg >= 85 ? (
                                  <span className="text-xs font-black text-blue-400 uppercase tracking-wide block">CPU Bound</span>
                                ) : (
                                  <span className="text-xs font-black text-neon-green uppercase tracking-wide block">Balanced Load</span>
                                )}
                                <span className="text-[9px] text-zinc-500 font-medium leading-relaxed block mt-0.5">
                                  GPU avg: {session?.gpu?.utilization?.avg || 0}% · CPU avg: {session?.cpu?.utilization?.avg || 0}%
                                </span>
                              </div>
                            </div>

                            {/* Performance Score */}
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Performance Score</span>
                              <div className="flex items-baseline gap-1 mt-auto">
                                <span className="text-3xl font-black text-neon-green font-mono leading-none">
                                  {session?.perf_score_avg ? Math.round(session.perf_score_avg) : '100'}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-500">/ 100</span>
                              </div>
                            </div>

                            {/* Temperature Peak */}
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-28 relative">
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Peak Thermals</span>
                              <div className="mt-auto">
                                <span className="text-xs font-black text-white font-mono block">
                                  CPU max: {session?.cpu?.temperature?.max || 0}°C
                                </span>
                                <span className="text-xs font-black text-white font-mono block">
                                  GPU max: {session?.gpu?.temperature?.max || 0}°C
                                </span>
                              </div>
                            </div>

                          </div>

                          {/* Scene Breakdown */}
                          {session?.scenes && Object.keys(session.scenes).length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Gameplay Scene Breakdown</span>
                              <div className="h-5 w-full bg-white/5 rounded-full overflow-hidden flex">
                                {Object.entries(session.scenes).map(([scene, percentage]: [string, any], idx) => {
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
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[9px] font-bold text-zinc-400">
                                {Object.entries(session.scenes).map(([scene, percentage]: [string, any], idx) => {
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

                          <div className="p-4 rounded-3xl bg-neon-green/5 border border-neon-green/10 flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-neon-green uppercase tracking-widest block">Mission Control Recommendation</span>
                            <p className="text-[10px] font-bold text-zinc-300 leading-relaxed">
                              Excellent overall stability! Consider locking FPS at 90 or 120 FPS via the control settings to keep system temps under 75°C.
                            </p>
                          </div>
                        </>
                      );
                    })()}

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
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

export default SystemPage;
