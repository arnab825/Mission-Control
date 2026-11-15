import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cpu,
  Box,
  Zap,
  Database,
  Network,
  Shield,
  Sparkles
} from 'lucide-react';
import type { TelemetryState, SystemSpecs } from '../types/telemetry';
import { AdvisorPanel } from '../components/AdvisorPanel';
import { SystemTelemetryHeader } from '../components/system/SystemTelemetryHeader';
import { SystemSubNav } from '../components/system/SystemSubNav';
import { HardwareDetailsSection } from '../components/system/HardwareDetailsSection';
import { PerformanceIntelSection } from '../components/system/PerformanceIntelSection';
import { SystemGraphCanvas } from '../components/system/SystemGraphCanvas';

const mergeSpecs = (prev: SystemSpecs | null, incoming: SystemSpecs | undefined | null): SystemSpecs | null => {
  if (!prev) return incoming || null;
  if (!incoming) return prev;

  const mergedGpus = (incoming.hardware?.gpus && incoming.hardware.gpus.length > 0)
    ? incoming.hardware.gpus
    : (incoming.gpus && incoming.gpus.length > 0
        ? incoming.gpus
        : (prev.hardware?.gpus || prev.gpus));

  const mergedMux = incoming.hardware?.mux_switch || incoming.mux_switch || prev.hardware?.mux_switch || prev.mux_switch;

  return {
    ...prev,
    hardware: {
      ...prev.hardware,
      cpu: incoming.hardware?.cpu || prev.hardware?.cpu,
      cores: incoming.hardware?.cores || prev.hardware?.cores,
      threads: incoming.hardware?.threads || prev.hardware?.threads,
      gpu: incoming.hardware?.gpu && incoming.hardware.gpu !== 'Gathering...' ? incoming.hardware.gpu : prev.hardware?.gpu,
      gpus: mergedGpus,
      mux_switch: mergedMux,
      ram: incoming.hardware?.ram || prev.hardware?.ram,
      storage: incoming.hardware?.storage && incoming.hardware.storage !== 'Gathering...' ? incoming.hardware.storage : prev.hardware?.storage,
      ram_details: (incoming.hardware?.ram_details && incoming.hardware.ram_details.length > 0)
        ? incoming.hardware.ram_details
        : prev.hardware?.ram_details,
      storage_details: (incoming.hardware?.storage_details && incoming.hardware.storage_details.length > 0)
        ? incoming.hardware.storage_details
        : prev.hardware?.storage_details,
    },
    gpus: mergedGpus,
    mux_switch: mergedMux,
    network: incoming.network || prev.network,
    wifi: incoming.wifi || prev.wifi,
    os_details: incoming.os_details || prev.os_details,
    device_specs: incoming.device_specs || prev.device_specs,
    displays: (incoming.displays && incoming.displays.length > 0) ? incoming.displays : prev.displays,
    peripherals: (incoming.peripherals && incoming.peripherals.length > 0) ? incoming.peripherals : prev.peripherals,
    vram_gb: incoming.vram_gb || prev.vram_gb,
  };
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
  const [selectedDiskIndex, setSelectedDiskIndex] = useState(0);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number>(0);
  const [activeGpuIndex, setActiveGpuIndex] = useState<number>(0);

  const handleSetMuxMode = (mode: 'hybrid' | 'discrete' | 'igpu_only' | 'integrated' | 'auto') => {
    if (sendCommand) {
      sendCommand('set_gpu_working_mode', { mode });
    }
    setSpecs(prev => {
      if (!prev) return prev;
      const currentMux = prev.mux_switch || prev.hardware?.mux_switch;
      const updatedMux = currentMux ? { ...currentMux, user_preferred_mode: mode === 'integrated' ? 'igpu_only' : mode } : undefined;
      return {
        ...prev,
        mux_switch: updatedMux,
        hardware: {
          ...prev.hardware,
          mux_switch: updatedMux,
        }
      };
    });
  };

  const handleOpenGraphicsSettings = () => {
    if (sendCommand) {
      sendCommand('open_graphics_settings');
    }
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal('ms-settings:display-advanced-graphics').catch(() => {});
    }
  };

  const handleOpenOemSoftware = (protocol?: string, suiteId?: string) => {
    if (sendCommand) {
      sendCommand('open_oem_software', { protocol, suite_id: suiteId });
    }
  };

  const handleOpenDisplaySwitcher = () => {
    if (sendCommand) {
      sendCommand('open_display_switcher', {});
    }
  };
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Always reset scroll to top when changing telemetry view modes or categories
  useEffect(() => {
    if (mainScrollRef.current) {
      if (typeof mainScrollRef.current.scrollTo === 'function') {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        mainScrollRef.current.scrollTop = 0;
      }
    }
  }, [viewMode, selectedCategory]);

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
  }, [selectedMachineId]);

  // Active session
  const activeSession = useMemo(() => {
    return machineSessions[selectedSessionIndex] || null;
  }, [machineSessions, selectedSessionIndex]);
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
      let activeUid = 'guest';
      try {
        const raw = localStorage.getItem('mc_authenticated_user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u.id) activeUid = u.id;
        }
      } catch (_) {}
      sendCommand('get_session_history', { userId: activeUid });
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
        const gpusList = specs.hardware.gpus || specs.gpus || [];
        const targetGpu = (gpusList && gpusList.length > activeGpuIndex)
          ? gpusList[activeGpuIndex]
          : null;
        const vramTot = state?.gpu_metrics?.vram_total ?? state?.gpu_metrics?.vram_total_mb;
        const vramUsed = state?.gpu_metrics?.vram_used ?? state?.gpu_metrics?.vram_used_mb;
        const powerDraw = state?.gpu_metrics?.power_draw ?? state?.gpu_metrics?.power_draw_w;
        const temp = state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature;

        if (targetGpu && targetGpu.type === 'integrated') {
          return [
            { label: 'Graphics Card', value: targetGpu.name },
            { label: 'Architecture', value: 'Integrated Display Controller (iGPU)' },
            { label: 'Display Output', value: targetGpu.is_display_active ? `Active (${targetGpu.active_displays.join(', ') || 'Internal Panel'})` : 'Standby / Internal' },
            { label: 'Shared Memory', value: targetGpu.vram_gb ? `${targetGpu.vram_gb} GB Dynamic Shared RAM` : 'Shared System RAM' },
            { label: 'Driver Version', value: targetGpu.driver_version || '---' },
            { label: 'Provider', value: targetGpu.vendor || 'Intel' },
          ];
        }

        return [
          { label: 'Graphics Card', value: targetGpu ? targetGpu.name : specs.hardware.gpu },
          { label: 'Architecture', value: targetGpu ? `${targetGpu.vendor} Discrete Gaming GPU (dGPU)` : 'Discrete GPU' },
          { label: 'VRAM Total', value: vramTot != null ? `${(vramTot / 1024).toFixed(1)} GB` : (specs.vram_gb ? `${specs.vram_gb} GB` : '---') },
          { label: 'VRAM Used', value: vramUsed != null ? `${vramUsed} MB (${state?.gpu_metrics?.vram_percent ?? 0}%)` : '---' },
          { label: 'Dedicated VRAM', value: (targetGpu?.vram_gb || specs.vram_gb) ? `${targetGpu?.vram_gb || specs.vram_gb} GB GDDR` : '---' },
          { label: 'Power Draw', value: powerDraw !== undefined && powerDraw !== null ? `${Math.round(powerDraw)} W` : '---' },
          { label: 'Driver Version', value: targetGpu?.driver_version || state?.gpu_metrics?.driver_version || '---' },
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
  }, [specs, selectedCategory, state, selectedDiskIndex, activeGpuIndex]);

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
      case 'GPU': {
        const gpusList = specs.hardware.gpus || specs.gpus || [];
        const targetGpu = (gpusList && gpusList.length > activeGpuIndex) ? gpusList[activeGpuIndex] : null;
        return targetGpu ? targetGpu.name : specs.hardware.gpu;
      }
      case 'Disk': {
        const details = specs.hardware.storage_details && specs.hardware.storage_details.length > selectedDiskIndex
          ? specs.hardware.storage_details[selectedDiskIndex]
          : null;
        return details ? `${details.name} (${details.size})` : specs.hardware.storage;
      }
      case 'Network': return specs.network?.name || 'Local Network';
      default: return specs.hardware.cpu;
    }
  }, [specs, selectedCategory, selectedDiskIndex, getMemoryDDRType, activeGpuIndex]);

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

  const gpusList = specs?.hardware?.gpus || specs?.gpus || [];
  const muxInfo = specs?.hardware?.mux_switch || specs?.mux_switch;
  const dgpu = gpusList.find(g => g.type === 'discrete') || (gpusList.length > 0 ? gpusList[0] : null);
  const igpu = gpusList.find(g => g.type === 'integrated');

  return (
    <div className="flex-1 p-2.5 sm:p-4 md:p-6 lg:p-8 overflow-hidden flex flex-col min-h-0 min-w-0 max-w-full bg-transparent select-none gap-y-2.5 sm:gap-y-4 md:gap-y-5">
      
      {/* Sleek Low-Profile Telemetry Header */}
      <SystemTelemetryHeader
        specs={specs}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="flex-1 min-h-0 min-w-0 max-w-full flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 overflow-hidden">
        {/* Left Sub-nav */}
        <SystemSubNav
          state={state}
          specs={specs}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {/* Main Details Area */}
        <div ref={mainScrollRef} className="flex-1 min-h-0 min-w-0 max-w-full bg-white/[0.03] border border-white/5 rounded-2xl lg:rounded-[2.5rem] p-3 sm:p-5 md:p-6 lg:p-8 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar shadow-2xl relative">
          <div className="flex justify-between items-start mb-4 sm:mb-6 md:mb-8 shrink-0 gap-4">
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

          <div className="flex-1 flex flex-col gap-y-12 min-w-0 max-w-full">
            {viewMode === 'graph' ? (
              <SystemGraphCanvas
                selectedCategory={selectedCategory}
                chartData={chartData}
                categoryColor={getCategoryColor}
                specifications={getCategorySpecifications}
                specs={specs}
                activeGpuIndex={activeGpuIndex}
                setActiveGpuIndex={setActiveGpuIndex}
                selectedDiskIndex={selectedDiskIndex}
                setSelectedDiskIndex={setSelectedDiskIndex}
              />
            ) : viewMode === 'details' ? (
              <HardwareDetailsSection
                specs={specs}
                state={state}
                muxInfo={muxInfo}
                dgpu={dgpu}
                igpu={igpu}
                handleOpenOemSoftware={handleOpenOemSoftware}
                handleOpenDisplaySwitcher={handleOpenDisplaySwitcher}
                handleOpenGraphicsSettings={handleOpenGraphicsSettings}
                handleSetMuxMode={handleSetMuxMode}
              />
            ) : (
              <PerformanceIntelSection
                machines={machines}
                selectedMachineId={selectedMachineId}
                setSelectedMachineId={setSelectedMachineId}
                machineSessions={machineSessions}
                selectedSessionIndex={selectedSessionIndex}
                setSelectedSessionIndex={setSelectedSessionIndex}
                activeSession={activeSession}
                state={state}
                specs={specs}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPage;
