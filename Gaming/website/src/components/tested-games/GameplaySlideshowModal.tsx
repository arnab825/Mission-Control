"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ScreenshotItem {
  src: string;
  title: string;
  desc: string;
}

interface GameplaySlideshowModalProps {
  isOpen: boolean;
  gameName: string;
  screenshots: ScreenshotItem[];
  slideshowIndex: number | null;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectSlide: (index: number) => void;
}

export const GameplaySlideshowModal: React.FC<GameplaySlideshowModalProps> = ({
  isOpen,
  gameName,
  screenshots,
  slideshowIndex,
  isPlaying,
  onClose,
  onTogglePlay,
  onPrev,
  onNext,
  onSelectSlide,
}) => {
  if (!isOpen || slideshowIndex === null || !screenshots[slideshowIndex]) {
    return null;
  }

  const currentSlide = screenshots[slideshowIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex flex-col justify-between p-2 sm:p-6 bg-black/95 backdrop-blur-xl selection:bg-neon-green selection:text-black overflow-hidden w-full h-full max-w-full max-h-full"
      >
        {/* Modal Header Controls */}
        <div className="relative z-50 flex items-center justify-between w-full max-w-7xl mx-auto font-mono text-xs gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <span className="font-bold text-white uppercase text-xs sm:text-sm font-display tracking-wider truncate max-w-30 xs:max-w-[200px] sm:max-w-none">
              {gameName}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-[11px] font-bold text-neon-green shrink-0">
              {slideshowIndex + 1} / {screenshots.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Auto-Play Slideshow Toggle Button */}
            <button
              type="button"
              onClick={onTogglePlay}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isPlaying
                  ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.6)]"
                  : "bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 hover:text-white"
              }`}
              title={
                isPlaying
                  ? "Pause automatic slideshow (Space)"
                  : "Initiate automatic slideshow (Space)"
              }
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-obsidian" />
                  <span className="hidden xs:inline">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-neon-green" />
                  <span className="hidden xs:inline">Auto Slideshow</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-1.5 sm:p-2.5 transition-all cursor-pointer shadow-xl"
              onClick={onClose}
              title="Close slideshow (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Central Main Viewport with Prev / Next Buttons */}
        <div className="relative flex-1 flex items-center justify-center pt-3 sm:pt-10 pb-1 sm:pb-2 w-full max-w-7xl mx-auto overflow-hidden min-h-0">
          {screenshots.length > 1 && (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-1 sm:left-4 z-40 p-2 sm:p-4 rounded-full bg-black/70 hover:bg-neon-green hover:text-obsidian border border-white/20 hover:border-neon-green text-white transition-all cursor-pointer shadow-2xl hover:scale-110"
              title="Previous image (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Main Active Image Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={slideshowIndex}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="max-w-[94vw] max-h-[44vh] sm:max-h-[56vh] flex items-center justify-center relative min-w-0"
            >
              <img
                src={currentSlide.src}
                alt={currentSlide.title}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== "/images/game-placeholder.png") {
                    target.src = "/images/game-placeholder.png";
                  }
                }}
                className="max-w-full max-h-[44vh] sm:max-h-[56vh] w-auto h-auto object-contain rounded-xl sm:rounded-2xl border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
              />
            </motion.div>
          </AnimatePresence>

          {screenshots.length > 1 && (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-1 sm:right-4 z-40 p-2 sm:p-4 rounded-full bg-black/70 hover:bg-neon-green hover:text-obsidian border border-white/20 hover:border-neon-green text-white transition-all cursor-pointer shadow-2xl hover:scale-110"
              title="Next image (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4 sm:w-8 sm:h-8" />
            </button>
          )}
        </div>

        {/* Bottom Section: Caption & Clickable Thumbnail Strip */}
        <div className="w-full max-w-5xl mx-auto space-y-1.5 sm:space-y-3 font-mono text-xs relative z-50 min-w-0 pb-1 sm:pb-0">
          <div className="w-full min-w-0 bg-obsidian/90 border border-white/15 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 backdrop-blur-md overflow-hidden">
            <div className="w-full min-w-0">
              <div className="text-white font-bold text-xs sm:text-base flex items-center gap-1.5 sm:gap-2 font-display uppercase tracking-wide min-w-0">
                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-green shrink-0" />
                <span className="truncate block min-w-0">{currentSlide.title}</span>
              </div>
              <p className="text-gray-300 text-[10px] sm:text-xs font-mono mt-0.5 sm:mt-1 leading-relaxed max-w-3xl line-clamp-2 sm:line-clamp-none wrap-break-word">
                {currentSlide.desc}
              </p>
            </div>

            <div className="hidden sm:block text-[10px] text-gray-400 shrink-0 self-end sm:self-center font-mono">
              Use{" "}
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">
                ←
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">
                →
              </kbd>{" "}
              to navigate •{" "}
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">
                Space
              </kbd>{" "}
              to pause
            </div>
          </div>

          {screenshots.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 overflow-x-auto py-1 no-scrollbar w-full max-w-full px-0.5">
              {screenshots.map((ss, idx) => {
                const isActive = idx === slideshowIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectSlide(idx)}
                    className={`relative w-14 xs:w-16 sm:w-24 h-9 xs:h-10 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden border transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? "border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.6)] scale-105"
                        : "border-white/20 opacity-50 hover:opacity-100 hover:border-white/40"
                    }`}
                    title={`Jump to slide ${idx + 1}: ${ss.title}`}
                  >
                    <img
                      src={ss.src}
                      alt={ss.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-neon-green/10 border-2 border-neon-green pointer-events-none rounded-lg sm:rounded-xl" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default GameplaySlideshowModal;
