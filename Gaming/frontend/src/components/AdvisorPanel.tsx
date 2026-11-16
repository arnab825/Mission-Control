import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Info,
  AlertTriangle,
  Zap,
  ChevronDown,
  Cpu,
} from 'lucide-react';
import type { AdvisorRecommendation } from '../types/telemetry';

interface AdvisorPanelProps {
  recommendations?: AdvisorRecommendation[];
}

const severityConfig = {
  Critical: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'shadow-[0_0_15px_rgba(248,113,113,0.3)]',
  },
  Warning: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    glow: 'shadow-[0_0_15px_rgba(251,146,60,0.2)]',
  },
  Recommendation: {
    icon: Zap,
    color: 'text-neon-green',
    bg: 'bg-neon-green/10',
    border: 'border-neon-green/20',
    glow: 'shadow-[0_0_15px_rgba(118, 185, 0,0.2)]',
  },
  Informational: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: '',
  },
};

const AdvisorItem: React.FC<{ rec: AdvisorRecommendation }> = ({ rec }) => {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[rec.severity] || severityConfig.Informational;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative overflow-hidden rounded-2xl border ${config.border} bg-white/[0.03] backdrop-blur-md transition-all duration-300 ${expanded ? 'bg-white/[0.06] shadow-lg' : 'hover:bg-white/[0.05]'} group`}
    >
      <div
        className="p-3.5 sm:p-4 cursor-pointer flex items-center sm:items-start gap-3 sm:gap-4 select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`p-2.5 rounded-xl ${config.bg} ${config.border} border shrink-0 group-hover:${config.glow} transition-shadow duration-300`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mb-1">
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {rec.title}
            </h4>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border} shrink-0`}>
              {rec.severity}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed group-hover:text-zinc-200 transition-colors line-clamp-2 sm:line-clamp-none">
            {rec.description}
          </p>
        </div>

        <div className="shrink-0 pl-1 self-center sm:self-start sm:pt-1">
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="flex gap-4">
                <div className="w-10 shrink-0 flex justify-center">
                  <div className="w-px h-full bg-white/5" />
                </div>
                <div className="flex-1 space-y-3 pb-1 pr-4">
                  {rec.reason && (
                    <div>
                      <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Reason</span>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                        {rec.reason}
                      </p>
                    </div>
                  )}
                  {rec.action && (
                    <div>
                      <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Recommended Action</span>
                      <p className="text-xs sm:text-sm text-neon-green leading-relaxed font-bold">
                        {rec.action}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const AdvisorPanel: React.FC<AdvisorPanelProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  // Deduplicate by ID
  const uniqueRecs = Array.from(new Map(recommendations.map(r => [r.id, r])).values());

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 shadow-[0_0_10px_rgba(118, 185, 0,0.15)] relative">
            <Cpu className="w-4 h-4 text-neon-green relative z-10" />
            <div className="absolute inset-0 bg-neon-green/20 blur-md rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              AI Performance Advisor
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
              </span>
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium tracking-wide">
              Real-time telemetry analysis and optimizations
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
            {uniqueRecs.length} Insight{uniqueRecs.length !== 1 && 's'}
          </div>
        </div>
      </div>

      <div className={`grid gap-3.5 ${uniqueRecs.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 w-full'}`}>
        <AnimatePresence mode="popLayout">
          {uniqueRecs.map((rec) => (
            <AdvisorItem key={rec.id} rec={rec} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
