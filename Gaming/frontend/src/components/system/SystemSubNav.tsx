import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Box, Zap, Database, Network, Monitor } from 'lucide-react';
import type { TelemetryState, SystemSpecs } from '../../types/telemetry';

export const colorStyles: Record<string, {
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

export const SubNavItem: React.FC<{
  label: string;
  value: string;
  percent: number;
  color: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}> = ({ label, value, percent, color, icon: Icon, isActive, onClick, className = '' }) => {
  const styles = colorStyles[color] || colorStyles.blue;
  return (
    <button
      aria-label={label}
      type="button"
      onClick={onClick}
      className={`group min-w-0 w-full p-2 sm:p-2.5 lg:p-3 rounded-xl lg:rounded-2xl flex items-center gap-2 sm:gap-2.5 lg:gap-3 border transition-all cursor-pointer ${
        isActive ? 'bg-white/[0.06] border-white/20 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/5'
      } ${className}`}
    >
      <div className={`p-1.5 sm:p-2 rounded-lg lg:rounded-xl ${styles.bgMuted} border ${styles.borderMuted} shrink-0`}>
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${styles.text}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex flex-row justify-between items-center w-full mb-1 sm:mb-1.5 gap-1.5 min-w-0">
          <span className={`text-[8.5px] xs:text-[9.5px] sm:text-[10px] lg:text-[11px] font-black uppercase tracking-wider truncate ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
            {label}
          </span>
          <span className={`text-[8.5px] xs:text-[9.5px] sm:text-[10px] lg:text-[11px] font-black tabular-nums truncate ${isActive ? styles.text : 'text-zinc-400 group-hover:text-zinc-300'}`}>
            {value}
          </span>
        </div>
        <div className="w-full h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            className={`h-full rounded-full ${styles.bg}`}
          />
        </div>
      </div>
    </button>
  );
};

interface SystemSubNavProps {
  state: TelemetryState | null;
  specs: SystemSpecs | null;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  viewMode: 'graph' | 'details' | 'intel';
  setViewMode: React.Dispatch<React.SetStateAction<'graph' | 'details' | 'intel'>>;
}

export const SystemSubNav: React.FC<SystemSubNavProps> = ({
  state,
  specs,
  selectedCategory,
  setSelectedCategory,
  viewMode,
  setViewMode,
}) => {
  return (
    <div className="w-full lg:w-60 xl:w-64 grid grid-cols-5 lg:flex lg:flex-col gap-1.5 sm:gap-2 shrink-0 pb-1 lg:pb-0 z-10 bg-transparent custom-scrollbar lg:h-full lg:justify-between min-w-0 max-w-full">
      <SubNavItem
        label="CPU"
        value={`${state?.cpu_pct != null ? state.cpu_pct.toFixed(1) : '0.0'}%`}
        percent={state?.cpu_pct || 0}
        color="blue"
        icon={Cpu}
        isActive={viewMode === 'graph' && selectedCategory === 'CPU'}
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
        isActive={viewMode === 'graph' && selectedCategory === 'Memory'}
        onClick={() => { setSelectedCategory('Memory'); setViewMode('graph'); }}
      />
      <SubNavItem
        label="GPU"
        value={`${(state?.gpu_metrics?.utilization || 0).toFixed(1)}%`}
        percent={state?.gpu_metrics?.utilization || 0}
        color="emerald"
        icon={Zap}
        isActive={viewMode === 'graph' && selectedCategory === 'GPU'}
        onClick={() => { setSelectedCategory('GPU'); setViewMode('graph'); }}
      />
      <SubNavItem
        label="Disk"
        value={`${(state?.disk_util || 0).toFixed(1)}%`}
        percent={state?.disk_util || 0}
        color="orange"
        icon={Database}
        isActive={viewMode === 'graph' && selectedCategory === 'Disk'}
        onClick={() => { setSelectedCategory('Disk'); setViewMode('graph'); }}
      />
      <SubNavItem
        label="Network"
        value={state?.net_speed || specs?.network?.speed || 'Syncing...'}
        percent={state?.net_util || 0}
        color="red"
        icon={Network}
        isActive={viewMode === 'graph' && selectedCategory === 'Network'}
        onClick={() => { setSelectedCategory('Network'); setViewMode('graph'); }}
      />

      {/* Footer info in sub-nav (Visible on Desktop only) */}
      <div className="hidden lg:block mt-auto pt-6">
        <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hardware Info</span>
            <button
              aria-label="button"
              type="button" 
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
  );
};
