import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Sparkles } from 'lucide-react';

interface GlobalToastNotificationProps {
  toast: { message: string; type?: 'warning' | 'info' } | null;
}

export const GlobalToastNotification: React.FC<GlobalToastNotificationProps> = ({ toast }) => {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl border ${
            toast.type === 'warning' 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
              : 'bg-neon-green/10 border-neon-green/30 text-neon-green'
          }`}
        >
          {toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
