import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Zap, Sliders, Cpu, Target } from 'lucide-react';
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
              className="bg-[#0c0c10] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl z-[10000]"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-neon-green" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-black text-white tracking-widest uppercase">The Evolution of NVIDIA DLSS</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">From AI Upscaling to DLSS 5 Neural Rendering</p>
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
                {/* DLSS 5 Spotlight Hero Banner */}
                <div className="p-5 rounded-2xl bg-linear-to-b from-purple-950/40 via-[#100d1c] to-black/60 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500/20 border-b border-l border-purple-500/30 rounded-bl-xl text-[8px] font-black uppercase tracking-widest text-purple-300">
                    Next-Gen Neural Paradigm
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-[12px] font-black uppercase tracking-widest text-purple-300">
                      DLSS 5: Neural Rendering & World Model
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-300 leading-relaxed font-medium mb-4">
                    DLSS 5 shifts from image reconstruction to continuous neural rendering. Rather than simply scaling lower-resolution pixels or interpolating frames, the Neural Rendering Engine (NRE) ingests raw scene geometry, motion vectors, and neural shader primitives to synthesize photorealistic frames with full artistic control.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-cyan-300 mb-1">
                        <Sliders className="w-3 h-3 text-cyan-400" />
                        <span>Aesthetic Style Neural Transfer</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-normal">
                        Choose between styles like Cinematic Photorealism, Cyberpunk Neon, Gritty Noir, and Fantasy, with fine-tuning intensity sliders.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-blue-300 mb-1">
                        <Zap className="w-3 h-3 text-blue-400" />
                        <span>Dynamic Multi Frame Gen (DMFG)</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-normal">
                        Adaptive 1X to 6X frame generation locked dynamically to your monitor refresh rate with Reflex latency pacing.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-neon-green mb-1">
                        <Target className="w-3 h-3 text-neon-green" />
                        <span>Target Resolution & Prepare NR Input</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-normal">
                        Scales render workloads down to 33% (1/9th pixel cost) while the neural diffusion pipeline reconstructs up to 8K target outputs.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-amber-300 mb-1">
                        <Cpu className="w-3 h-3 text-amber-400" />
                        <span>Continuous Representation</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-normal">
                        Replaces polygon rasterization artifacts and micro-jitter with sub-pixel continuous tensor representations.
                      </p>
                    </div>
                  </div>

                  {/* Architecture Flow Diagram */}
                  <div className="p-3 rounded-xl bg-black/60 border border-purple-500/20 text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                      DLSS 5 Pipeline Architecture
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-[8.5px] font-mono font-bold text-zinc-300">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-400">G-Buffer & Motion Vectors</span>
                      <span className="text-purple-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-purple-950/50 border border-purple-500/30 text-purple-300">Prepare NR Input</span>
                      <span className="text-purple-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200">Neural Rendering Core</span>
                      <span className="text-purple-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">Aesthetic Style Matrix</span>
                      <span className="text-purple-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-blue-950/50 border border-blue-500/30 text-blue-300">Dynamic MFG (1x-6x)</span>
                      <span className="text-purple-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-neon-green/20 border border-neon-green/30 text-neon-green">Target 4K/8K Display</span>
                    </div>
                  </div>
                </div>

                {/* Evolution Cards for all versions */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">
                    Complete DLSS Architectural Timeline
                  </h4>
                  {DLSS_GUIDE.map((g) => {
                    const isV5 = g.version === '5';
                    return (
                      <div
                        key={g.version}
                        className={`p-4 rounded-xl transition-all ${
                          isV5
                            ? 'bg-purple-950/20 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                            : 'bg-white/5 border border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${isV5 ? 'text-purple-400' : 'text-neon-green'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isV5 ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-neon-green shadow-[0_0_8px_rgba(118,185,0,0.8)]'}`} />
                            DLSS {g.version} ({g.name})
                          </h3>
                          {isV5 && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[8px] font-mono font-black uppercase">
                              Active Standard
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-2">
                          <p className="text-[10px] text-zinc-300">
                            <span className="text-white font-bold">Key Tech:</span> {g.tech}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            <span className="text-white font-bold">Impact:</span> {g.impact}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
    </AnimatePresence>
  );
};
