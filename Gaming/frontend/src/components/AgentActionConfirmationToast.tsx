import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, Play, AlertCircle } from 'lucide-react';

interface AgentActionConfirmationToastProps {
  confirmation?: {
    text: string;
    delay: number;
    action_id?: string;
  } | null;
  onConfirm: (actionId?: string, confirmed?: boolean) => void;
}

export const AgentActionConfirmationToast: React.FC<AgentActionConfirmationToastProps> = ({
  confirmation,
  onConfirm,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const totalDelay = confirmation?.delay || 2;

  useEffect(() => {
    if (!confirmation) {
      setTimeLeft(0);
      return;
    }

    setTimeLeft(totalDelay);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, totalDelay - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [confirmation, totalDelay]);

  if (!confirmation) return null;

  const progressPct = totalDelay > 0 ? (timeLeft / totalDelay) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-[#0d0d12]/95 border border-amber-500/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(245,158,11,0.25)] backdrop-blur-xl overflow-hidden"
      >
        {/* Animated countdown indicator line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
          <motion.div
            className="h-full bg-linear-to-r from-amber-400 to-red-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-start gap-3 mt-1">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                Autonomous Action Interlock
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-400">
                {timeLeft.toFixed(1)}s
              </span>
            </div>

            <p className="text-xs font-bold text-white mb-3 leading-snug break-words">
              {confirmation.text}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onConfirm(confirmation.action_id, false)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                Cancel Action
              </button>
              <button
                type="button"
                onClick={() => onConfirm(confirmation.action_id, true)}
                className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-200 font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <Play className="w-3 h-3" />
                Execute Now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
