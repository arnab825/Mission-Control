import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, Zap, Box, Database, Search, Settings, ShieldCheck, 
  AlertTriangle, XCircle, Bot, Info,TrendingUp, BrainCircuit
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { TelemetryState } from '../types/telemetry';
import { useHotkey } from '../hooks/useHotkey';
import { formatFrequency, formatTemp } from '../lib/formatters';
import { useAuth } from '@clerk/clerk-react';

interface StatCardProps {
  label: string;
  value: string | number;
  percent: number;
  subtext: string;
  icon: React.ElementType;
  color: string;
  history: number[];
  onClick?: () => void;
}

const StatCard = React.memo<StatCardProps>(({ label, value, percent, subtext, icon: Icon, color, history, onClick }) => {
  const chartWidth = 200;
  const chartHeight = 40;

  const linePath = useMemo(() => history.map((p, i) => {
    const x = i * (chartWidth / (history.length - 1));
    const y = chartHeight - (p / 100 * chartHeight);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' '), [history]);

  const areaPath = useMemo(() => `${linePath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`, [linePath]);

  const colorMap: Record<string, string> = {
    cyan: '#76b900',
    fuchsia: '#e879f9',
    purple: '#a855f7',
    orange: '#fb923c',
  };

  const cardColorStyles: Record<string, {
    bg: string;
    bgMuted: string;
    borderMuted: string;
    text: string;
    shadow: string;
  }> = {
    cyan: {
      bg: 'bg-neon-green',
      bgMuted: 'bg-neon-green/10',
      borderMuted: 'border-neon-green/20',
      text: 'text-neon-green',
      shadow: 'shadow-[0_0_15px_rgba(118, 185, 0,0.5)]',
    },
    fuchsia: {
      bg: 'bg-fuchsia-500',
      bgMuted: 'bg-fuchsia-500/10',
      borderMuted: 'border-fuchsia-500/20',
      text: 'text-fuchsia-400',
      shadow: 'shadow-[0_0_15px_rgba(232,121,249,0.5)]',
    },
    purple: {
      bg: 'bg-purple-500',
      bgMuted: 'bg-purple-500/10',
      borderMuted: 'border-purple-500/20',
      text: 'text-purple-400',
      shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]',
    },
    orange: {
      bg: 'bg-orange-500',
      bgMuted: 'bg-orange-500/10',
      borderMuted: 'border-orange-500/20',
      text: 'text-orange-400',
      shadow: 'shadow-[0_0_15px_rgba(251,146,60,0.5)]',
    },
  };

  const hexColor = colorMap[color] || '#ffffff';
  const styles = cardColorStyles[color] || cardColorStyles.cyan;

  return (
    <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
      onClick={onClick}
      className={`bg-white/[0.03] border border-white/5 rounded-3xl p-5 flex-1 relative overflow-hidden group hover:bg-white/4 transition-all duration-500 min-w-0 ${onClick ? 'cursor-pointer hover:border-neon-green/30' : ''}`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg ${styles.bgMuted} border ${styles.borderMuted} shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${styles.text}`} />
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{label}</span>
          </div>
          <span className="text-xl lg:text-2xl font-black text-white tracking-tighter shrink-0">{value}%</span>
        </div>

        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${styles.bg} ${styles.shadow}`}
          />
        </div>

        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight truncate">{subtext}</p>
      </div>

      {/* Sparkline Background */}
      <div className="absolute bottom-0 left-0 right-0 h-10 opacity-12 pointer-events-none z-0">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hexColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={hexColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#grad-${color})`} />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            d={linePath}
            fill="none"
            stroke={hexColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
});

interface DashboardPageProps {
  state: TelemetryState | null;
  onCommand: (type: string, payload: any) => void;
  onNavigate?: (page: string, extra?: any) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ state, onCommand, onNavigate }) => {
  const { userId } = useAuth();
  const [history, setHistory] = useState<Record<string, number[]>>({
    CPU: Array(20).fill(0),
    GPU: Array(20).fill(0),
    RAM: Array(20).fill(0),
    Disk: Array(20).fill(0),
  });

  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'AGENT'>('ALL');
  const logEndRef = React.useRef<HTMLDivElement>(null);

  const isOptimized = (state as any)?.optimization_status?.active;

  // Request full state on initial mount
  useEffect(() => {
    onCommand('request_state', {});
  }, []);

  // Hotkeys:
  // 1. Toggle Game Optimization Mode (ctrl+shift+o)
  useHotkey('ctrl+shift+o', () => {
    if (isOptimized) {
      onCommand('revert_optimization', {});
    } else {
      onCommand('optimize_system', {});
    }
  });

  // 2. Scan Library (ctrl+shift+s)
  useHotkey('ctrl+shift+s', () => {
    onCommand('scan_games', { userId: userId || undefined });
  });

  useEffect(() => {
    if (state) {
      const gpuVal = state.gpu_metrics?.utilization ?? state.gpu_metrics?.gpu_util ?? 0;
      setHistory(prev => ({
        CPU: [...prev.CPU.slice(1), state.cpu_pct || 0],
        GPU: [...prev.GPU.slice(1), gpuVal],
        RAM: [...prev.RAM.slice(1), state.mem_pct || 0],
        Disk: [...prev.Disk.slice(1), state.disk_util || 0],
      }));
    }
  }, [state]);

  const rawLogs = (state as any)?.logs || [
    { time: '00:00:00', type: 'INFO', msg: 'Neural Link operational. Awaiting backend synchronization.' }
  ];

  // Active consecutive log duplicates filter ("there is two so make it one")
  const filteredLogs = useMemo(() => {
    const baseLogs = filter === 'ALL' ? rawLogs : rawLogs.filter((log: any) => log.type === filter);
    const deduplicated: any[] = [];
    let lastMsg = '';
    let lastTime = '';
    
    for (const log of baseLogs) {
      if (log.msg === lastMsg && log.time === lastTime) {
        continue;
      }
      deduplicated.push(log);
      lastMsg = log.msg;
      lastTime = log.time;
    }
    return deduplicated;
  }, [rawLogs, filter]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs]);

  const handleCopyAll = () => {
    const logText = filteredLogs.map((log: any) => `${log.time} [${log.type}] ${log.msg}`).join('\n');
    navigator.clipboard.writeText(logText);
  };

  const handleClear = () => {
    onCommand('clear_logs', {});
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-full overflow-y-auto lg:overflow-hidden gap-y-6 bg-transparent select-none min-h-0">
      
      {/* Header section (shrink-0) */}
      <div className="flex justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-neon-green/45 flex items-center justify-center bg-neon-green/5 overflow-hidden p-1 shadow-[0_0_18px_rgba(118, 185, 0,0.2)] shrink-0">
            <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
          </div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-purple-500 tracking-tighter leading-tight uppercase drop-shadow-[0_0_15px_rgba(118, 185, 0,0.8)]">Mission Control</h2>
            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.3em] mt-1">Status: System Nominal</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-yellow animate-pulse" />
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Neural Link Active</span>
          </div>
        </div>
      </div>

      {/* Top Stat Cards Grid - Responsive layout (2x2 on medium screen, 1x4 on large) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6 shrink-0">
        <StatCard
          label="CPU"
          value={state?.cpu_pct != null ? state.cpu_pct.toFixed(1) : '0.0'}
          percent={state?.cpu_pct || 0}
          subtext={`Clock: ${state?.cpu_freq ? formatFrequency(state.cpu_freq) : '---'} / ${state?.cpu_max_freq ? formatFrequency(state.cpu_max_freq) : '---'} | Temp: ${state?.cpu_temp && state.cpu_temp > 0 ? formatTemp(Math.round(state.cpu_temp)) : '---°C'}`}
          icon={Cpu}
          color="cyan"
          history={history.CPU}
          onClick={() => onNavigate?.('system', { category: 'CPU' })}
        />
        <StatCard
          label="GPU"
          value={Math.round(state?.gpu_metrics?.utilization ?? state?.gpu_metrics?.gpu_util ?? 0)}
          percent={Math.round(state?.gpu_metrics?.utilization ?? state?.gpu_metrics?.gpu_util ?? 0)}
          subtext={`VRAM: ${Math.round(state?.gpu_metrics?.vram_used ?? state?.gpu_metrics?.vram_used_mb ?? 0)}/${Math.round(state?.gpu_metrics?.vram_total ?? state?.gpu_metrics?.vram_total_mb ?? 0)} MB | Temp: ${Math.round(state?.gpu_metrics?.temp ?? state?.gpu_metrics?.temperature ?? 0) || '---'}°C`}
          icon={Zap}
          color="fuchsia"
          history={history.GPU}
          onClick={() => onNavigate?.('system', { category: 'GPU' })}
        />
        <StatCard
          label="RAM"
          value={state?.mem_pct != null ? state.mem_pct.toFixed(1) : '0.0'}
          percent={state?.mem_pct || 0}
          subtext={`Used: ${state?.mem_used_gb != null ? state.mem_used_gb.toFixed(1) : '---'}/${state?.mem_total_gb != null ? state.mem_total_gb.toFixed(1) : '---'} GB`}
          icon={Box}
          color="purple"
          history={history.RAM}
          onClick={() => onNavigate?.('system', { category: 'Memory' })}
        />
        <StatCard
          label="DISK"
          value={state?.disk_util != null ? state.disk_util.toFixed(1) : '0.0'}
          percent={state?.disk_util || 0}
          subtext={`Drive: ${state?.system_specs?.hardware?.storage || 'Primary Storage'}`}
          icon={Database}
          color="orange"
          history={history.Disk}
          onClick={() => onNavigate?.('system', { category: 'Disk' })}
        />
      </div>

      {/* Main Bottom Grid - Responsive stack (vertical on tablet/mobile, side-by-side on desktop) */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch lg:flex-1 min-h-0 overflow-visible lg:overflow-hidden pb-4 lg:pb-0">
        
        {/* === BRANDED AI ASSISTANT PORTION (Left/Center) === */}
        <div className="flex-1 flex flex-col min-h-[350px] lg:min-h-0 min-w-0 bg-white/[0.06] border border-white/15 rounded-3xl p-5 relative overflow-hidden shadow-[0_0_20px_rgba(118, 185, 0,0.05)]">
          
          {/* Header block with fully responsive layout to protect against squishing/truncation */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row justify-between lg:items-start xl:items-center gap-3 border-b border-white/5 pb-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 shrink-0">
                <BrainCircuit className="w-3.5 h-3.5 text-neon-green" />
              </div>
              <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white uppercase tracking-widest truncate drop-shadow-[0_0_10px_rgba(118, 185, 0,0.8)]">Mission Control </span>
              <div className="px-1.5 py-0.5 rounded bg-neon-green/10 border border-neon-green/20 flex items-center gap-1 shrink-0">
                <span className="w-1 h-1 rounded-full bg-neon-green animate-pulse shadow-[0_0_5px_#76b900]" />
                <span className="text-[7px] font-black text-neon-green uppercase tracking-widest leading-none">Core Sync</span>
              </div>
            </div>

            {/* Filter and action buttons */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap lg:flex-wrap xl:flex-nowrap">
              <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5 gap-0.5 overflow-x-auto no-scrollbar shrink-0">
                {(['ALL', 'INFO', 'WARN', 'ERROR', 'AGENT'] as const).map(lvl => {
                  const activeStyles: Record<string, string> = {
                    ALL: 'bg-white/10 text-white',
                    INFO: 'bg-neon-yellow/20 text-neon-yellow',
                    WARN: 'bg-amber-500/20 text-amber-400',
                    ERROR: 'bg-red-500/20 text-red-400',
                    AGENT: 'bg-neon-green/20 text-neon-green',
                  };
                  return (
                    <button aria-label="button" type="button"
                      key={lvl}
                      onClick={() => setFilter(lvl)}
                      className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all shrink-0 ${filter === lvl ? activeStyles[lvl] : 'text-zinc-600 hover:text-zinc-300'
                        }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button aria-label="button" type="button"
                  onClick={handleCopyAll}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all shrink-0"
                >Copy</button>
                <button aria-label="button" type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 rounded-xl text-[8px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 transition-all shrink-0"
                >Clear</button>
              </div>
            </div>
          </div>

          {/* AI strategy chat-like logs feed (deduplicated) */}
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar gap-y-2 pr-1 min-h-0 mt-3">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-600">
                <BrainCircuit className="w-8 h-8 opacity-20 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Assistant standby</span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredLogs.map((log: any, i: number) => {
                  const cfg: Record<string, { icon: React.ElementType; pill: string; bar: string; text: string; label: string }> = {
                    INFO: { icon: ShieldCheck, pill: 'bg-neon-yellow/15 text-neon-yellow border-neon-yellow/20', bar: 'bg-neon-yellow', text: 'text-zinc-200', label: 'System' },
                    WARN: { icon: AlertTriangle, pill: 'bg-amber-500/15  text-amber-400  border-amber-500/20', bar: 'bg-amber-400', text: 'text-amber-100/90', label: 'Warning' },
                    ERROR: { icon: XCircle, pill: 'bg-red-500/15    text-red-400    border-red-500/20', bar: 'bg-red-500', text: 'text-red-200/90', label: 'Critical' },
                    AGENT: { icon: Bot, pill: 'bg-neon-green/15   text-neon-green   border-neon-green/20', bar: 'bg-neon-green', text: 'text-neon-green/90', label: 'AI Tactical' },
                    DEBUG: { icon: Info, pill: 'bg-purple-500/15 text-purple-400 border-purple-500/20', bar: 'bg-purple-400', text: 'text-purple-100/80', label: 'Debug' },
                  };
                  const { icon: Icon, pill, bar, text, label } = cfg[log.type] ?? cfg['INFO'];

                  // Translate raw backend messages into gamer-friendly copy
                  const friendlyMsg = (msg: string): string => {
                    if (!msg) return msg;
                    if (msg.includes('Child process spawned')) return '⚙️ Background thread initialized';
                    if (msg.includes('Hardware monitor error')) return '🔌 Hardware sensory sync delayed';
                    if (msg.includes('System scan complete')) return '✅ Hardware profile synced — status nominal';
                    if (msg.includes('Starting server')) return '🚀 Mission Control backend core is online';
                    if (msg.includes('Bridge Server started')) return '🔗 Neural link established with frontend';
                    if (msg.includes('Frontend client connected')) return '🎮 Console dashboard linked';
                    if (msg.includes('Frontend client disconnected')) return '📴 Dashboard session concluded';
                    if (msg.includes('Game detected')) return `🎮 ${msg.replace('Game detected:', 'Tactical Game Detected:')}`;
                    if (msg.includes('Game exited')) return '🏁 Game session closed — system standby';
                    if (msg.includes('GPU Monitor')) return `🖥️ ${msg}`;
                    if (msg.includes('Voice Manager')) return '🎙️ Co-Pilot Speech Recognition active';
                    if (msg.includes('Game scan complete')) return `🗂️ ${msg}`;
                    if (msg.includes('optimization')) return `⚡ ${msg}`;
                    if (msg.includes('Neural Link')) return `🧠 ${msg}`;
                    return msg;
                  };

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-3 bg-white/[0.03] hover:bg-white/4 border border-white/5 rounded-2xl px-4 py-3 group transition-colors relative overflow-hidden"
                    >
                      {/* Left accent bar */}
                      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${bar}`} />

                      {/* Icon */}
                      <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${pill}`}>
                        <Icon className="w-3 h-3" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[9px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded-md ${pill}`}>{label}</span>
                          <span className="text-[9px] text-zinc-600 font-mono">{log.time}</span>
                        </div>
                        <p className={`text-[11px] font-semibold leading-snug break-all whitespace-pre-wrap ${text}`}>{friendlyMsg(log.msg)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* === TACTICAL CONTROLS & DIAGNOSTICS (Right) === */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-4 min-h-[380px] lg:min-h-0 lg:overflow-hidden pr-1">
          <div className="flex items-center shrink-0">
            <span className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-fuchsia-400 uppercase tracking-[0.25em] filter drop-shadow-[0_0_12px_rgba(118, 185, 0,0.8)]">Tactical Diagnostics</span>
          </div>
          
          {/* Action Trigger Deck */}
          <div className="flex gap-2.5 shrink-0">
            <button aria-label="button" type="button"
              onClick={() => onCommand('scan_games', { userId: userId || undefined })}
              className="group relative flex-1 py-3 bg-neon-green hover:bg-neon-green text-black font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(118, 185, 0,0.2)] flex items-center justify-center gap-1.5 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Search className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Scan Library</span>
            </button>

            {(state as any)?.optimization_status?.active ? (
              <button aria-label="button" type="button"
                onClick={() => onCommand('revert_optimization', {})}
                className="group relative flex-1 py-3 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-400 border border-fuchsia-500/40 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-1.5 overflow-hidden shadow-[0_0_20px_rgba(232,121,249,0.15)] animate-pulse"
              >
                <div className="absolute inset-0 bg-fuchsia-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Zap className="w-3.5 h-3.5 relative z-10 text-fuchsia-400" />
                <span className="relative z-10">Undo Game Mode</span>
              </button>
            ) : (
              <button aria-label="button" type="button"
                onClick={() => onCommand('optimize_system', {})}
                className="group relative flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-1.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Settings className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Optimize</span>
              </button>
            )}
          </div>

          {/* Compact Telemetry Plot Visualizer (flexes to fill remaining column space) */}
          <div className="flex-1 bg-white/[0.06] border border-white/15 rounded-3xl p-4 flex flex-col gap-2 min-h-0 shadow-[0_0_20px_rgba(232,121,249,0.05)]">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-neon-yellow" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Live Telemetry</span>
              </div>
              <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Last 20 ticks</span>
            </div>

            {/* Custom chart legend */}
            <div className="flex items-center gap-3.5 shrink-0">
              {[
                { key: 'GPU', color: '#e879f9', label: 'GPU %' },
                { key: 'CPU', color: '#76b900', label: 'CPU %' },
                { key: 'RAM', color: '#a855f7', label: 'RAM %' },
              ].map(({ key, color, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
                </div>
              ))}
            </div>

            {/* Recharts AreaChart (flexes to fill exactly remaining vertical space) */}
            <div className="flex-1 min-h-[160px] lg:min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={history.GPU.map((_, i) => ({
                    t: i,
                    GPU: Math.round(history.GPU[i] ?? 0),
                    CPU: Math.round(history.CPU[i] ?? 0),
                    RAM: Math.round(history.RAM[i] ?? 0),
                  }))}
                  margin={{ top: 2, right: 2, left: -32, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e879f9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e879f9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#76b900" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#76b900" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={[0, 100]} tick={{ fill: '#52525b', fontSize: 8, fontWeight: 700 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
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
                    formatter={(value: any, name: any) => [`${value}%`, name]}
                    cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="GPU" stroke="#e879f9" strokeWidth={1.2} fill="url(#gpuGrad)" dot={false} activeDot={{ r: 2.5, fill: '#e879f9' }} />
                  <Area type="monotone" dataKey="CPU" stroke="#76b900" strokeWidth={1.2} fill="url(#cpuGrad)" dot={false} activeDot={{ r: 2.5, fill: '#76b900' }} />
                  <Area type="monotone" dataKey="RAM" stroke="#a855f7" strokeWidth={1.2} fill="url(#ramGrad)" dot={false} activeDot={{ r: 2.5, fill: '#a855f7' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Optimization Progress Details */}
          {(state as any)?.optimization_status && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 space-y-2 text-[8px] font-bold text-zinc-500 uppercase tracking-widest shrink-0 max-h-24 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <span>Optimization Status</span>
                <span className={(state as any).optimization_status.active ? "text-neon-green font-black" : "text-zinc-600 font-black"}>
                  {(state as any).optimization_status.active ? "OPTIMIZED" : "BALANCED"}
                </span>
              </div>
              {(state as any).optimization_status.results?.map((res: string, idx: number) => (
                <div key={idx} className="flex items-start gap-1.5 text-zinc-300 leading-tight normal-case">
                  <div className={`w-1 h-1 rounded-full mt-1 shrink-0 ${(state as any).optimization_status.active ? "bg-neon-green shadow-[0_0_5px_#76b900]" : "bg-zinc-600"}`} />
                  <span className="font-semibold text-[8px] text-zinc-400">{res}</span>
                </div>
              ))}
              {(state as any).optimization_status.error && (
                <div className="text-red-400 font-mono text-[8px] font-normal normal-case">
                  Error: {(state as any).optimization_status.error}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
