import React from "react";
import Link from "next/link";
import { FileText, Shield, AlertTriangle, Scale, ChevronLeft } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Mission Control Gaming AI",
  description: "Mission Control Labs terms of service, open-source usage rights, and software license agreement.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-obsidian text-white pt-24 sm:pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-175 sm:w-250 h-100 bg-linear-to-b from-neon-green/15 via-emerald-500/5 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-neon-green mb-8 transition-colors bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-md"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>

        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-neon-green/30 bg-obsidian/95 mb-10 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-neon-green via-neon-yellow to-transparent" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.2)]">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold tracking-widest text-neon-green uppercase bg-neon-green/10 border border-neon-green/30 px-3 py-1 rounded-full">
              TERMS & CONDITIONS
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-sm font-mono text-gray-400">
            Last Updated: September 15, 2026 • Mission Control Labs
          </p>
        </div>

        <div className="space-y-8 text-gray-300 text-sm sm:text-base leading-relaxed">
          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-neon-green" />
              <span>1. Open-Source License & Usage</span>
            </h2>
            <p className="mb-3">
              Mission Control is released as free and open-source software under the MIT/GNU licensing framework. You are granted permission to download, install, run, modify, and redistribute the application in accordance with the repository license terms.
            </p>
          </section>

          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>2. Fair Play & Anti-Cheat Compliance</span>
            </h2>
            <p className="mb-3">
              Mission Control is intended as an informational hardware telemetry dashboard, performance diagnostic optimizer, and tactical game companion. It does not modify game executable files, alter protected memory spaces, inject unfair exploits, or bypass digital rights management (DRM).
            </p>
          </section>

          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-neon-yellow" />
              <span>3. Warranty Disclaimer</span>
            </h2>
            <p className="mb-3">
              Mission Control is provided &quot;as is&quot;, without warranty of any kind, express or implied. In no event shall Mission Control Labs or its contributors be liable for any hardware defects, overclocking instabilities, software conflicts, or loss of data arising from the use of the application.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
