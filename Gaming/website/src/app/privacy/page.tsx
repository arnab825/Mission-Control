import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, EyeOff, Cpu, Server, Mail, ChevronLeft } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Mission Control Gaming AI",
  description: "Mission Control Labs privacy policy, data practices, local-first telemetry, and user privacy commitment.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-obsidian text-white pt-24 sm:pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-175 sm:w-250 h-100 bg-linear-to-b from-neon-green/15 via-emerald-500/5 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-neon-green mb-8 transition-colors bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-md"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>

        {/* Hero Header */}
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-neon-green/30 bg-obsidian/95 mb-10 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-neon-green via-neon-yellow to-transparent" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.2)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold tracking-widest text-neon-green uppercase bg-neon-green/10 border border-neon-green/30 px-3 py-1 rounded-full">
              LEGAL & COMPLIANCE
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm font-mono text-gray-400">
            Effective Date: September 15, 2026 • Published by Mission Control Labs
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-gray-300 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <EyeOff className="w-5 h-5 text-neon-green" />
              <span>1. Zero Sale of Personal Data</span>
            </h2>
            <p className="mb-3">
              Mission Control Labs does not sell, rent, monetize, or trade your personal information, gaming habits, or telemetry data to any third-party advertisers, data brokers, or commercial aggregators. Mission Control is completely open-source and funded by engineering excellence.
            </p>
          </section>

          {/* Section 2 */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-neon-yellow" />
              <span>2. Local-First Processing & AI Inference</span>
            </h2>
            <p className="mb-3">
              - <strong>DirectX 12 HUD Overlay:</strong> Operates 100% locally on your machine via user-space DirectX presentation hooks. No gameplay video, webcam, or microphone streams are transmitted to remote servers.
            </p>
            <p className="mb-3">
              - <strong>TensorRT & CUDA:</strong> In-game vision recognition and FPS metrics are calculated entirely on your local GPU without cloud roundtrips.
            </p>
            <p>
              - <strong>NVIDIA NIM & AI Assistant:</strong> User-initiated voice and chat inquiries are routed through encrypted HTTPS pipelines strictly to process tactical guidance and return answers to your client.
            </p>
          </section>

          {/* Section 3 */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-cyan-400" />
              <span>3. Telemetry & Anonymous Diagnostics</span>
            </h2>
            <p className="mb-3">
              When reporting glitches or viewing stability scores, only non-personally identifiable diagnostic information is collected:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-gray-300 font-mono text-xs sm:text-sm">
              <li>Operating system name and build number (e.g. Windows 11 23H2)</li>
              <li>Graphics hardware model and display driver version (e.g. RTX 4080, Driver 560.81)</li>
              <li>DirectX error crash code (e.g. DXGI_ERROR_DEVICE_REMOVED)</li>
              <li>Installed application version number</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <Server className="w-5 h-5 text-purple-400" />
              <span>4. Data Security & Storage</span>
            </h2>
            <p className="mb-3">
              All network communications are protected using Transport Layer Security (TLS 1.3). Any optional user preferences and game library indexes are cached locally in your application data directory and can be purged at any time by uninstalling or resetting application state.
            </p>
          </section>

          {/* Section 5 */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-neon-green" />
              <span>5. Support & Contact Information</span>
            </h2>
            <p className="mb-3">
              If you have any questions or data removal requests regarding this Privacy Policy, contact Mission Control Labs:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 font-mono text-xs">
              <a
                href="https://github.com/arnab825/Mission-Control/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green hover:text-black transition-all font-bold"
              >
                GitHub Issue Tracker
              </a>
              <Link
                href="/contact"
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-all font-bold"
              >
                Web Contact Support
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
