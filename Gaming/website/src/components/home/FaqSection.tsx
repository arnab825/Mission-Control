"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export const FAQS = [
  {
    q: "What hardware do I need to run Mission Control?",
    a: "Mission Control requires an NVIDIA GTX or RTX series graphics card (GTX 1060 6GB minimum, RTX 2060+ recommended) because all neural AI models run locally on Tensor Cores to guarantee zero game latency.",
  },
  {
    q: "Is Mission Control free and open source?",
    a: "Yes! Mission Control is 100% free, telemetry-transparent, and open-source. Created by Mission Control Labs & open contributors on GitHub.",
  },
  {
    q: "Will using the HUD get me banned in anti-cheat protected multiplayer games?",
    a: "Mission Control operates as a standard hardware overlay, using DirectX/Vulkan hooks identical to Steam or Discord overlays. However, triggering 'Agentic Command Macros' in competitive titles is at your discretion based on each game's TOS.",
  },
  {
    q: "How does local processing compare to cloud AI tools?",
    a: "Cloud AI tools add 200ms–500ms network latency and consume bandwidth. Local CUDA inference runs directly inside your VRAM with response times under 15ms without sending private data over the web.",
  },
];

export function FaqSection() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-3xl px-4 sm:px-6 mb-20 sm:mb-28 relative z-10 mx-auto"
    >
      <div className="text-center mb-10 sm:mb-14">
        <h2 className="text-2xl sm:text-4xl font-black mb-3 font-display uppercase tracking-wider text-white">
          FREQUENTLY ASKED <span className="text-neon-green glow-text-teal">QUESTIONS</span>
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm font-sans">
          Everything you need to know about setup, anti-cheat safety, and local CUDA execution.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, idx) => {
          const isOpen = activeFaq === idx;
          return (
            <div
              key={idx}
              className={`glass-card transition-all duration-300 overflow-hidden ${
                isOpen ? "border-gradient-cyber shadow-[0_0_25px_rgba(118,185,0,0.2)]" : "hover:border-white/25"
              }`}
            >
              <button
                onClick={() => setActiveFaq(isOpen ? null : idx)}
                className="w-full p-5 sm:p-6 text-left flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
              >
                <span
                  className={`font-bold text-sm sm:text-lg transition-colors leading-snug ${
                    isOpen ? "text-neon-green glow-text-teal" : "text-white"
                  }`}
                >
                  {faq.q}
                </span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen
                      ? "rotate-180 icon-badge-premium shadow-[0_0_15px_rgba(118,185,0,0.5)] text-neon-green"
                      : "bg-white/5 border border-white/10 text-gray-400"
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-gray-300 text-xs sm:text-sm leading-relaxed border-t border-white/10 pt-4 font-sans">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
