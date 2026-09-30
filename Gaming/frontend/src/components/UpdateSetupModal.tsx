/**
 * Mission Control — Dedicated Setup UI
 * UpdateSetupModal.tsx: Professional setup & deployment wizard for installing and uninstalling/rolling back updates.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
      title: 'Flushing Session State & Game Cache',
      desc: 'Safely persisting active authentication tokens, discovered game library indices, and custom graphics preferences to persistent local storage.',
      icon: <Layers className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'shutdown',
      title: 'Stopping Neural Backend & Hardware Services',
      desc: 'Gracefully terminating Python AI worker daemons, IPC WebSocket bridges, and releasing active DLL file locks to prevent extraction conflicts.',
      icon: <Server className="w-4 h-4 text-yellow-400" />
    },
    {
      id: 'handoff',
      title: 'Deploying Standalone Setup Engine',
      desc: `Launching verified Mission Control Setup (v${version}) with administrative rights for background binary replacement and dependency alignment.`,
      icon: <Download className="w-4 h-4 text-neon-green" />
    },
    {
      id: 'relaunch',
      title: 'System Handshake & Verified Relaunch',
      desc: 'Validating binary checksums, re-initializing low-latency hardware monitors, and rebooting Mission Control into the updated version.',
      icon: <Cpu className="w-4 h-4 text-purple-400" />
    }
  ] : [
    {
      id: 'backup_check',
      title: 'Verifying Stable Snapshot Archive',
      desc: `Inspecting local rollback snapshot repository (v${backupVersion}), validating executable binaries, and verifying archive checksum integrity.`,
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'process_kill',
      title: 'Terminating Active Subprocesses & Hooks',
      desc: 'Releasing active file locks on core C++ hardware monitor DLLs, Python telemetry environment, and background worker threads.',
      icon: <Terminal className="w-4 h-4 text-yellow-400" />
    },
    {
      id: 'restore',
      title: 'Restoring Core Binaries & Fallback Baseline',
      desc: `Safely overwriting current binaries with certified stable v${backupVersion} build while preserving all user neural profiles and game library configs in %APPDATA%.`,
      icon: <RotateCcw className="w-4 h-4 text-neon-green" />
    },
    {
      id: 'restart',
      title: 'Restoring System Baseline & Rebooting',
      desc: 'Re-initializing hardware monitors, re-establishing secure local IPC sockets, and restarting Mission Control under the previous stable configuration.',
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

  // Handle ESC key to dismiss setup wizard safely when not actively installing
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExecuting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExecuting, onClose]);

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

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-xl overflow-y-auto custom-scrollbar select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isExecuting) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl my-auto bg-[#0c0e15] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(118,185,0,0.12)] flex flex-col relative max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)]"
          >
            {/* Cybernetic ambient glow header */}
            <div className="relative p-4 sm:p-6 pb-3.5 sm:pb-4 border-b border-white/8 overflow-hidden bg-gradient-to-r from-white/3 via-neon-green/5 to-purple-500/5 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className={`p-2 sm:p-2.5 rounded-2xl border shrink-0 ${
                    mode === 'install'
                      ? 'bg-neon-green/10 border-neon-green/30 text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.2)]'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                  }`}>
                    {mode === 'install' ? <Download className="w-4 h-4 sm:w-5 sm:h-5" /> : <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">
                        MISSION CONTROL SETUP
                      </span>
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[7px] sm:text-[8px] font-bold font-mono border ${
                        mode === 'install'
                          ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {mode === 'install' ? `v${version}` : `ROLLBACK → v${backupVersion}`}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mt-0.5 truncate">
                      {mode === 'install' ? 'Installing Software Upgrade' : 'Uninstalling Current Update'}
                    </h3>
                  </div>
                </div>

                {!isExecuting && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0"
                    aria-label="Close setup window"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Progress Track */}
              <div className="mt-3.5 sm:mt-4">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono mb-1.5 gap-2">
                  <span className="text-zinc-400 uppercase tracking-wider truncate">
                    {isExecuting ? steps[currentStepIndex]?.title : 'Ready to deploy • Benchmarks, game configs, and neural profiles preserved'}
                  </span>
                  <span className="text-neon-green font-bold shrink-0">{progressPercent}%</span>
                </div>
                <div className="h-1.5 sm:h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 via-neon-green to-neon-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* Setup Stages Content - Scrollable and flex-adaptive */}
            <div className="p-4 sm:p-6 space-y-2.5 sm:space-y-3 overflow-y-auto flex-1 min-h-[140px] max-h-[360px] custom-scrollbar">
              {steps.map((step, idx) => {
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex && isExecuting;

                return (
                  <div
                    key={step.id}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-2.5 sm:gap-3.5 ${
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
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-[11px] sm:text-xs font-black uppercase tracking-wider truncate ${
                          isCurrent ? 'text-white' : isPast ? 'text-zinc-200' : 'text-zinc-400'
                        }`}>
                          {step.title}
                        </h4>
                        <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase tracking-widest shrink-0">
                          STEP {idx + 1} OF {steps.length}
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-relaxed font-sans">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Information & Actions Footer */}
            <div className="p-4 sm:p-6 pt-3 sm:pt-3 border-t border-white/8 bg-black/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
              <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-zinc-400">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="leading-tight">
                  {mode === 'install'
                    ? 'Mission Control will close temporarily to execute the setup installer. Custom neural presets, game benchmarks, and account sessions will be preserved.'
                    : 'Current binaries will be safely replaced with the previous certified release snapshot. User configurations and telemetry databases remain untouched.'}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
                {!isExecuting ? (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleStart}
                      className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex items-center justify-center gap-1.5 sm:gap-2 ${
                        mode === 'install'
                          ? 'bg-gradient-to-r from-neon-green to-emerald-400 text-black shadow-neon-green/20'
                          : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-yellow-500/20'
                      }`}
                    >
                      {mode === 'install' ? (
                        <>
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Launch Setup & Install</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Uninstall & Revert</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-neon-green text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Setup in progress...</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default UpdateSetupModal;
