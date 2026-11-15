import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalScanningOverlayProps {
  isRunning?: boolean;
  isBackground?: boolean;
  isDismissed: boolean;
  onDismiss: () => void;
  status?: string;
  progress?: number;
}

export const GlobalScanningOverlay: React.FC<GlobalScanningOverlayProps> = ({
  isRunning,
  isBackground,
  isDismissed,
  onDismiss,
  status = 'Scanning...',
  progress = 0,
}) => {
  return (
    <AnimatePresence>
      {isRunning && !isBackground && !isDismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ zIndex: 9999 }}
          className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-2xl select-none"
        >
          {/* Radar scanner graphics */}
          <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
            {/* Outer spinning glow ring */}
            <div className="absolute inset-0 rounded-full border border-neon-green/10 animate-pulse" />
            <div className="absolute inset-4 rounded-full border border-dashed border-neon-green/20 animate-spin [animation-duration:15s]" />

            {/* Rotating scanner sweep line */}
            <div className="absolute inset-0 rounded-full bg-linear-to-tr from-neon-green/20 via-transparent to-transparent animate-spin [animation-duration:3s]" />

            {/* Central glowing icon */}
            <div className="relative w-24 h-24 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center shadow-[0_0_30px_rgba(118,185,0,0.2)] overflow-hidden p-2">
              <img src="/logo.png" className="w-12 h-12 object-contain animate-pulse" alt="Mission Control Logo" />
            </div>
          </div>

          {/* Title & Info */}
          <div className="text-center space-y-3 max-w-md px-6">
            <h3 className="text-sm font-black tracking-[0.3em] text-white uppercase">
              System Scan In Progress
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
              Analyzing local drives and game registries for compatibility
            </p>

            {/* Progress bar */}
            <div className="space-y-2 py-4">
              <div className="flex justify-between items-center text-[10px] font-mono font-bold text-neon-green">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-80 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div
                  className="h-full bg-linear-to-r from-neon-green via-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(118,185,0,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Console Log Simulation */}
            <div className="h-16 w-80 bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-[8px] text-zinc-500 text-left overflow-hidden flex flex-col justify-end gap-1.5 shadow-inner">
              <div className="opacity-40">Connecting to mission control database...</div>
              <div className="opacity-70">Detecting NVIDIA RTX processing pipelines...</div>
              <div className="text-neon-green animate-pulse font-bold">
                &gt; {status || 'Analyzing manifest files...'}
              </div>
            </div>

            {/* Run in background button */}
            <button
              aria-label="Run in background"
              type="button"
              onClick={onDismiss}
              className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Run in Background
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
