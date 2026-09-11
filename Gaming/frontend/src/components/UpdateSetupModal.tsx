/**
 * Mission Control — Dedicated Setup UI
 * UpdateSetupModal.tsx: Professional setup & deployment wizard for installing and uninstalling/rolling back updates.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X,
  Cpu,
  ShieldCheck,
  Server,
  Terminal,
  Layers
} from 'lucide-react';

export interface UpdateSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'install' | 'rollback';
  version?: string;
  backupVersion?: string;
  onProceed: () => void;
}

interface StepItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

export const UpdateSetupModal: React.FC<UpdateSetupModalProps> = ({
  isOpen,
  onClose,
  mode,
  version = 'Latest',
  backupVersion = 'Previous',
  onProceed
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const hasTriggeredProceedRef = useRef(false);

  const steps: StepItem[] = mode === 'install' ? [
    {
      id: 'flush',
      title: 'Flushing Session & State Cache',
      desc: 'Committing auth tokens, game library states, and preferences to persistent storage.',
      icon: <Layers className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'shutdown',
      title: 'Stopping Neural Backend & IPC Listeners',
      desc: 'Gracefully closing Python telemetry worker, WebSocket bridges, and process locks.',
      icon: <Server className="w-4 h-4 text-yellow-400" />
    },
    {
      id: 'handoff',
      title: 'Deploying Standalone Setup Engine',
      desc: `Transferring execution to Mission Control Setup (v${version}) for binary extraction.`,
      icon: <Download className="w-4 h-4 text-neon-green" />
    },
    {
      id: 'relaunch',
      title: 'System Handshake & Relaunch',
      desc: 'Finalizing installation and rebooting Mission Control into the new version.',
      icon: <Cpu className="w-4 h-4 text-purple-400" />
    }
  ] : [
    {
      id: 'backup_check',
      title: 'Verifying Stable Snapshot',
      desc: `Validating offline rollback archive (v${backupVersion}) and checksum integrity.`,
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'process_kill',
      title: 'Terminating Active Subprocesses',
      desc: 'Releasing file locks on core DLLs, Python environment, and UI bundles.',
      icon: <Terminal className="w-4 h-4 text-yellow-400" />
    },
    {
      id: 'restore',
      title: 'Uninstalling Update & Restoring Core',
      desc: `Overwriting current files with certified v${backupVersion} stable build.`,
      icon: <RotateCcw className="w-4 h-4 text-neon-green" />
    },
    {
      id: 'restart',
      title: 'Restoring System Baseline',
      desc: 'Launching Mission Control with previous stable configuration.',
      icon: <Cpu className="w-4 h-4 text-purple-400" />
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setIsExecuting(false);
      setCurrentStepIndex(0);
      setProgressPercent(0);
      hasTriggeredProceedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isExecuting) return;

    // Smooth simulated step progression leading to native handoff
    const stepDuration = 550; // ms per step
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next < steps.length) {
          setProgressPercent(Math.round(((next + 1) / steps.length) * 100));
          return next;
        } else {
          clearInterval(interval);
          setProgressPercent(100);
          if (!hasTriggeredProceedRef.current) {
            hasTriggeredProceedRef.current = true;
            setTimeout(() => {
              onProceed();
            }, 400);
          }
          return prev;
        }
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isExecuting, steps.length, onProceed]);

  if (!isOpen) return null;

  const handleStart = () => {
    setIsExecuting(true);
    setProgressPercent(25);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-xl bg-[#0c0e15] border border-white/10 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(118,185,0,0.12)] flex flex-col relative"
        >
          {/* Cybernetic ambient glow header */}
          <div className="relative p-6 pb-4 border-b border-white/8 overflow-hidden bg-gradient-to-r from-white/3 via-neon-green/5 to-purple-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  mode === 'install'
                    ? 'bg-neon-green/10 border-neon-green/30 text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.2)]'
                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                }`}>
                  {mode === 'install' ? <Download className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">
                      MISSION CONTROL SETUP
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono border ${
                      mode === 'install'
                        ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {mode === 'install' ? `v${version}` : `ROLLBACK → v${backupVersion}`}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mt-0.5">
                    {mode === 'install' ? 'Installing Software Upgrade' : 'Uninstalling Current Update'}
                  </h3>
                </div>
              </div>

              {!isExecuting && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress Track */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <span className="text-zinc-400 uppercase tracking-wider">
                  {isExecuting ? steps[currentStepIndex]?.title : 'Ready to begin deployment'}
                </span>
                <span className="text-neon-green font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 via-neon-green to-neon-green"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* Setup Stages Content */}
          <div className="p-6 space-y-3 max-h-[360px] overflow-y-auto">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex && isExecuting;

              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 ${
                    isCurrent
                      ? 'bg-neon-green/10 border-neon-green/40 shadow-[0_0_20px_rgba(118,185,0,0.15)]'
                      : isPast
                      ? 'bg-white/4 border-white/10 opacity-90'
                      : 'bg-white/2 border-white/5 opacity-40'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-neon-green animate-spin" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${
                        isCurrent ? 'text-white' : isPast ? 'text-zinc-200' : 'text-zinc-400'
                      }`}>
                        {step.title}
                      </h4>
                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                        STEP {idx + 1} OF {steps.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Information & Actions Footer */}
          <div className="p-6 pt-3 border-t border-white/8 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>
                {mode === 'install'
                  ? 'Application will close temporarily and launch the setup installer.'
                  : 'Current binaries will be safely replaced with the previous release snapshot.'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              {!isExecuting ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStart}
                    className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 ${
                      mode === 'install'
                        ? 'bg-gradient-to-r from-neon-green to-emerald-400 text-black shadow-neon-green/20'
                        : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-yellow-500/20'
                    }`}
                  >
                    {mode === 'install' ? (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Launch Setup & Install</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Uninstall & Revert</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-neon-green text-[10px] font-black uppercase tracking-widest">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Setup in progress...</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpdateSetupModal;
