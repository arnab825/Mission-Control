"use client";

import React from "react";
import { motion } from "framer-motion";

export const ServerResilienceTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-white/8 backdrop-blur-xl">
        <span className="text-[10px] font-mono text-neon-green font-black uppercase tracking-widest">
          ZERO-RENDER-CREDIT PROTECTION
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-4">
          Engineered to Protect Free-Tier Cloud Egress
        </h2>
        <p className="text-zinc-400 text-sm sm:text-base max-w-3xl leading-relaxed">
          Most cloud-hosted gaming tools incur steep API bills or exhaust compute limits
          whenever users type keystrokes in a search bar. Mission Control was architected with
          a strict multi-tier caching and cooldown policy that eliminates unnecessary compute.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-5 rounded-2xl bg-black/40 border border-white/8">
            <div className="text-neon-green font-mono font-bold text-xs mb-2">
              01 • Bounded Cooldowns
            </div>
            <h4 className="font-bold text-white text-base">15-Second Hard Rate Limit</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              The cluster discovery endpoint enforces a strict 15-second client-side cooldown.
              Keystroke debouncing runs 100% in local browser/Electron memory.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/8">
            <div className="text-cyan-400 font-mono font-bold text-xs mb-2">
              02 • Edge CDN Assets
            </div>
            <h4 className="font-bold text-white text-base">Direct Steam CDN Routing</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Game cover art and banners are routed directly to Cloudflare and Akamai Steam
              edge CDNs. Your server never consumes egress bandwidth streaming multi-megabyte
              images.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/8">
            <div className="text-purple-400 font-mono font-bold text-xs mb-2">
              03 • Local SQLite Shadow
            </div>
            <h4 className="font-bold text-white text-base">Autonomous SQLite Replica</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              If the primary Supabase PostgreSQL connection encounters transient latency or
              connection timeouts, the server drops down to{" "}
              <code className="text-white">catalog_fallback.db</code> instantly without
              throwing 500 errors.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Comparison Table */}
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-white mb-6">
          Standalone Launchers vs. Mission Control Cluster
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-zinc-900/30">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs font-mono text-zinc-400 uppercase tracking-wider border-b border-white/8">
              <tr>
                <th className="py-4 px-6">Capability</th>
                <th className="py-4 px-6 text-zinc-500">
                  Standalone Client (Steam/Epic/GOG)
                </th>
                <th className="py-4 px-6 text-neon-green font-bold">
                  Mission Control Distributed Server
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              <tr>
                <td className="py-4 px-6 font-bold text-white">Multi-Store Search</td>
                <td className="py-4 px-6 text-zinc-400">Locked to single store ecosystem</td>
                <td className="py-4 px-6 text-emerald-400 font-bold">
                  Parallel harvest (Steam, Epic, GOG, Xbox, RAWG)
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Cross-Device PC Mesh</td>
                <td className="py-4 px-6 text-zinc-400">
                  No cross-PC awareness or storage tracking
                </td>
                <td className="py-4 px-6 text-emerald-400 font-bold">
                  Live multi-PC node registration with drive telemetry
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">AI Taxonomy &amp; Tags</td>
                <td className="py-4 px-6 text-zinc-400">
                  User-voted or generic marketing tags
                </td>
                <td className="py-4 px-6 text-emerald-400 font-bold">
                  3-tier LLM classification (Gemini, Llama, NVIDIA NIM)
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Offline Capability</td>
                <td className="py-4 px-6 text-zinc-400">
                  Restricted offline modes with authentication timeouts
                </td>
                <td className="py-4 px-6 text-emerald-400 font-bold">
                  100% autonomous local canonical index + SQLite fallback
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-white">Client FPS Overhead</td>
                <td className="py-4 px-6 text-zinc-400">
                  Heavy Electron/Chromium CPU &amp; RAM footprint
                </td>
                <td className="py-4 px-6 text-emerald-400 font-bold">
                  Zero render overhead; heavy workers isolated to server
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
export default ServerResilienceTab;
