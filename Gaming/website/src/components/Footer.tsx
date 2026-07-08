"use client";

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Mail, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
export default function Footer() {
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'cookies' | null>(null);

  const modalContent = {
    terms: {
      title: "Terms & Conditions",
      date: "June 2026",
      content: (
        <>
          <h2 className="text-xl font-bold mt-6 mb-2">1. Acceptance of Terms</h2>
          <p className="mb-4 text-gray-400 leading-relaxed">By downloading or using Mission Control, you agree to these terms.</p>
          <h2 className="text-xl font-bold mt-6 mb-2">2. Use License</h2>
          <p className="mb-4 text-gray-400 leading-relaxed">Mission Control is provided as-is during its experimental phase.</p>
        </>
      )
    },
    privacy: {
      title: "Privacy Policy",
      date: "June 2026",
      content: (
        <>
          <h2 className="text-xl font-bold mt-6 mb-2">1. Local Processing</h2>
          <p className="mb-4 text-gray-400 leading-relaxed">Mission Control processes all AI inference locally on your NVIDIA hardware. We do not upload your gaming telemetry to the cloud.</p>
          <h2 className="text-xl font-bold mt-6 mb-2">2. Data Collection</h2>
          <p className="mb-4 text-gray-400 leading-relaxed">Anonymous crash reports and performance metrics may be collected if you opt-in.</p>
        </>
      )
    },
    cookies: {
      title: "Cookie Policy",
      date: "June 2026",
      content: (
        <>
          <h2 className="text-xl font-bold mt-6 mb-2">1. Essential Cookies</h2>
          <p className="mb-4 text-gray-400 leading-relaxed">We use essential cookies to maintain your session.</p>
          <h2 className="text-xl font-bold mt-6 mb-2">2. Analytics</h2>
          <p className="mb-4 text-gray-400 leading-relaxed">We use anonymous analytics cookies to improve our website.</p>
        </>
      )
    }
  };

  return (
    <>
      <motion.footer 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full bg-[#0a0a0d] py-16 mt-24 relative overflow-hidden border-t border-white/[0.05]"
      >
        {/* Animated Gradient Top Border */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-green/60 to-transparent shadow-[0_0_15px_rgba(118, 185, 0,0.4)]"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand & Creators */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-black font-display tracking-tight text-white mb-4">
              MISSION <span className="text-neon-green drop-shadow-[0_0_10px_rgba(118, 185, 0,0.5)]">CONTROL</span>
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm text-sm sm:text-base leading-relaxed">
              The ultimate AI-powered tactical gaming overlay and rig dashboard. Designed for zero-latency execution.
            </p>
            <div className="flex gap-4">
              <Link href="https://twitter.com" className="text-gray-400 hover:text-neon-green hover:translate-x-0.5 hover:drop-shadow-[0_0_8px_rgba(118, 185, 0,0.5)] transition-all duration-300 flex items-center gap-2 text-sm font-medium">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> Twitter
              </Link>
              <Link href="https://discord.com" className="text-gray-400 hover:text-neon-green hover:translate-x-0.5 hover:drop-shadow-[0_0_8px_rgba(118, 185, 0,0.5)] transition-all duration-300 flex items-center gap-2 text-sm font-medium">
                <svg viewBox="0 0 127.14 96.36" className="w-4 h-4 fill-current"><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.82-.6,1.61-1.24,2.37-1.91a75.48,75.48,0,0,0,76.12,0c.76.67,1.55,1.31,2.37,1.91a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.12,123.63,25.32,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/></svg> Discord
              </Link>
              <Link href="https://github.com" className="text-gray-400 hover:text-neon-green hover:translate-x-0.5 hover:drop-shadow-[0_0_8px_rgba(118, 185, 0,0.5)] transition-all duration-300 flex items-center gap-2 text-sm font-medium">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg> GitHub
              </Link>
            </div>
          </div>

          {/* Legal Links (Modals) */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider font-display">Support & Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118, 185, 0,0.8)] transition-all duration-300"></span> Contact Support
                </Link>
              </li>
              <li>
                <button onClick={() => setActiveModal('terms')} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118, 185, 0,0.8)] transition-all duration-300"></span> Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('privacy')} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118, 185, 0,0.8)] transition-all duration-300"></span> Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('cookies')} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118, 185, 0,0.8)] transition-all duration-300"></span> Cookie Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider font-display">Telemetry Feed</h4>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">Subscribe for firmware updates, model patches, and performance optimizations.</p>
            <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="operator@system.io"
                className="bg-obsidian/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_20px_rgba(118, 185, 0,0.3)] transition-all duration-300 font-mono"
                suppressHydrationWarning={true}
              />
              <button
                type="submit"
                className="bg-neon-green/10 text-neon-green border border-neon-green/50 hover:bg-neon-green hover:text-obsidian transition-all duration-300 rounded-xl px-4 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(118, 185, 0,0.15)]"
              >
                <Send className="w-4 h-4" /> Subscribe to Telemetry
              </button>
            </form>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/[0.05] text-center text-gray-500 text-xs tracking-wide">
          &copy; {new Date().getFullYear()} MISSION CONTROL ARCHITECTURE. ALL RIGHTS RESERVED. ZERO CLOUD DEPENDENCY.
        </div>
      </motion.footer>

      {/* Modal Overlay */}
      <AnimatePresence>
      {activeModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          ></div>

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass-panel w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl relative z-10 border-neon-green/30 shadow-[0_0_50px_rgba(118, 185, 0,0.1)] p-8"
          >
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-neon-green transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h1 className="text-3xl font-bold font-display mb-2 text-white">{modalContent[activeModal].title}</h1>
            <p className="text-sm text-neon-green mb-8 font-display">Last updated: {modalContent[activeModal].date}</p>

            <div className="prose prose-invert max-w-none font-sans">
              {modalContent[activeModal].content}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-neon-green text-obsidian px-6 py-2 rounded-md font-bold hover:bg-white transition-colors"
              >
                Accept & Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
