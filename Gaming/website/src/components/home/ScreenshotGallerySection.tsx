"use client";

import { motion } from "framer-motion";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";

export function ScreenshotGallerySection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 mx-auto"
    >
      <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
        <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">REAL APP INTERFACE</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
          DESIGNED FOR <span className="text-neon-green glow-text-teal">GAMERS</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
          High-contrast, hardware-accelerated interface engineered by <strong className="text-neon-green">Mission Control Labs</strong>.
        </p>
      </div>

      <ScreenshotGallery />
    </motion.section>
  );
}
