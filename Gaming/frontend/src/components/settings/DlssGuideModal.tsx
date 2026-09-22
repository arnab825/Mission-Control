import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { DLSS_GUIDE } from '../../data/settingsConstants';

export const DlssGuideModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c10] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl z-[10000]"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-neon-green" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-black text-white tracking-widest uppercase">The Evolution of DLSS</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From AI Upscaling to Neural Rendering</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {DLSS_GUIDE.map((g) => (
                  <div key={g.version} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="text-neon-green text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(118,185,0,0.8)]" />
                      DLSS {g.version} ({g.name})
                    </h3>
                    <div className="flex flex-col gap-1.5 mt-2">
                      <p className="text-[10px] text-zinc-300">
                        <span className="text-white font-bold">Key Tech:</span> {g.tech}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        <span className="text-white font-bold">Impact:</span> {g.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
    </AnimatePresence>
  );
};
