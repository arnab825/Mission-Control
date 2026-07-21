import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Zap, Box, Database, Monitor, AlertTriangle, CheckCircle, XCircle, ShieldCheck, RefreshCw
} from 'lucide-react';
import type { TelemetryState } from '../types/telemetry';

let hasAnimatedScore = false;

interface ReadinessPageProps {
  state: TelemetryState | null;
  connected: boolean;
  sendCommand: (type: string, payload?: any) => void;
}

const ReadinessPage: React.FC<ReadinessPageProps> = ({ state, connected, sendCommand }) => {
  const [isReevaluating, setIsReevaluating] = React.useState(false);
  const readinessData = (state as any)?.gaming_readiness;

  // Track readinessData in a ref to avoid stale closures in the auto-retry interval
  const readinessRef = React.useRef(readinessData);
  useEffect(() => {
    readinessRef.current = readinessData;
    setIsReevaluating(false);
  }, [readinessData]);

  // Request gaming readiness data on mount or when connection becomes active, with automatic retry
  // Only fetch if we don't already have the data, preventing re-renders on tab switch
  useEffect(() => {
    if (!connected) return;

    if (!readinessRef.current) {
      sendCommand('get_gaming_readiness');

      const interval = setInterval(() => {
        if (!readinessRef.current) {
          sendCommand('get_gaming_readiness');
        } else {
          clearInterval(interval);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [connected, sendCommand]);

  const score = readinessData?.score ?? 0;
  const components = readinessData?.components ?? {};
  const features = readinessData?.features ?? [];
  const error = readinessData?.error;

  useEffect(() => {
    if (readinessData?.score !== undefined) {
      const timer = setTimeout(() => {
        hasAnimatedScore = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [readinessData?.score]);

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-neon-yellow border-neon-yellow shadow-[0_0_20px_rgba(52,211,153,0.3)]';
    if (s >= 70) return 'text-neon-green border-neon-green shadow-[0_0_20px_rgba(118, 185, 0,0.3)]';
    if (s >= 50) return 'text-orange-400 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.3)]';
    return 'text-red-400 border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.3)]';
  };

  const getScoreText = (s: number) => {
    if (s >= 90) return { label: 'Excellent', color: 'text-neon-yellow' };
    if (s >= 70) return { label: 'Good', color: 'text-neon-green' };
    if (s >= 50) return { label: 'Fair', color: 'text-orange-400' };
    return { label: 'Limited', color: 'text-red-400' };
  };

  const scoreInfo = getScoreText(score);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-neon-yellow" />;
      case 'warn': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <CheckCircle className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getFeatureIcon = (status: string) => {
    if (status === 'Fully Supported') return <CheckCircle className="w-4 h-4 text-neon-yellow" />;
    if (status === 'Reduced Performance' || status === 'Limited Support') return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  if (error) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-400 mb-2">Evaluation Failed</h2>
          <p className="text-zinc-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!readinessData || isReevaluating) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <ShieldCheck className="w-12 h-12 text-neon-green mx-auto mb-4" />
          <h2 className="text-xl font-black text-white uppercase tracking-widest">Evaluating System</h2>
          <p className="text-zinc-500 text-xs mt-2">Analyzing hardware capabilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-neon-green" />
            System Requirements
          </h2>
          <p className="text-xs font-medium text-zinc-500 mt-1">
            Comprehensive hardware capability evaluation and feature compatibility analysis.
          </p>
        </div>
        <button
          onClick={() => {
            hasAnimatedScore = false;
            setIsReevaluating(true);
            sendCommand('get_gaming_readiness', { forceRefresh: true });
          }}
          className="mt-3 sm:mt-0 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 group"
        >
          <RefreshCw className="w-3.5 h-3.5 text-neon-green group-hover:rotate-180 transition-transform duration-500" />
          Re-evaluate
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Score Card & Driver Analysis */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Score Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-neon-green/5 to-transparent pointer-events-none" />
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 relative z-10">Gaming Readiness</h3>

            <div className={`w-36 h-36 rounded-full border-4 flex items-center justify-center mb-6 relative z-10 transition-all duration-1000 ${getScoreColor(score)}`}>
              <div className="text-center">
                <span className="text-4xl font-black tracking-tighter block leading-none">{score}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">/ 100</span>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10 mb-5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Status:</span>
              <span className={`text-xs font-black uppercase tracking-wider ${scoreInfo.color}`}>
                {scoreInfo.label}
              </span>
            </div>

            <div className="w-full max-w-40 bg-zinc-900/80 border border-white/5 rounded-full h-1.5 overflow-hidden relative z-10">
              <motion.div
                className={`h-full rounded-full ${score >= 90 ? 'bg-neon-yellow shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
                  score >= 70 ? 'bg-neon-green shadow-[0_0_8px_rgba(118, 185, 0,0.5)]' :
                    score >= 50 ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' :
                      'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'
                  }`}
                initial={hasAnimatedScore ? { width: `${score}%` } : { width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Driver Analysis */}
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Driver Analysis
            </h3>

            <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-5 flex-1">
              <h4 className="text-xs font-bold text-white mb-2">NVIDIA Driver Optimizations</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">
                Your GPU driver directly impacts performance and compatibility with modern features. We recommend keeping it up to date.
              </p>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-[10px] text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Improved game stability
                </li>
                <li className="flex items-center gap-3 text-[10px] text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  DLSS and Frame Generation support
                </li>
                <li className="flex items-center gap-3 text-[10px] text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Optimized Tensor core utilization
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Hardware Breakdown & Feature Compatibility */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-2 px-2 border-l-2 border-neon-green">Hardware Breakdown</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'cpu', icon: Cpu, label: 'CPU', data: components.cpu },
                { id: 'gpu', icon: Zap, label: 'GPU', data: components.gpu },
                { id: 'ram', icon: Box, label: 'Memory', data: components.ram },
                { id: 'storage', icon: Database, label: 'Storage', data: components.storage },
                { id: 'os', icon: Monitor, label: 'Operating System', data: components.os }
              ].map((comp) => (
                comp.data && (
                  <div key={comp.id} className={`p-5 rounded-2xl border bg-white/[0.03] transition-all flex flex-col gap-3 ${comp.data.status === 'pass' ? 'border-neon-yellow/20' :
                    comp.data.status === 'warn' ? 'border-orange-500/20' : 'border-red-500/20'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                          <comp.icon className="w-4 h-4 text-zinc-400" />
                        </div>
                        <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider">{comp.label}</span>
                      </div>
                      {getStatusIcon(comp.data.status)}
                    </div>

                    <div>
                      <div className="text-sm font-black text-white truncate" title={comp.data.name}>{comp.data.name}</div>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <span className="text-[8px] text-zinc-500 uppercase block">Minimum</span>
                          <span className="text-[10px] font-bold text-zinc-400">{comp.data.min_req}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-zinc-500 uppercase block">Recommended</span>
                          <span className="text-[10px] font-bold text-zinc-400">{comp.data.rec_req}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-white/5">
                      <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                        <span className="font-bold text-zinc-300">Reason:</span> {comp.data.reason}
                      </p>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Feature Compatibility */}
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-neon-green" />
              Feature Compatibility
            </h3>
            <div className="space-y-4">
              {features.map((feat: any, i: number) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="mt-0.5">{getFeatureIcon(feat.status)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{feat.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${feat.status === 'Fully Supported' ? 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/20' :
                        feat.status === 'Reduced Performance' || feat.status === 'Limited Support' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {feat.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium">{feat.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadinessPage;
