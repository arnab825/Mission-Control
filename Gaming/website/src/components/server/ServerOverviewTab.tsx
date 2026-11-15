"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Network,
  Globe,
  HardDrive,
  Database,
  Cpu,
  ShieldCheck,
} from "lucide-react";

export const ServerOverviewTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      {/* Visual Topology Diagram */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-white/8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[10px] font-mono text-neon-green font-black uppercase tracking-widest">
              CLUSTER ARCHITECTURE &amp; DATA FLOW
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Dual-Pool Microservice Pipeline
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span>Gateway Health Probe: 5s Periodic Poll</span>
          </div>
        </div>

        {/* Graphical Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* 1. Client Layer */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                <span>LAYER 01</span>
                <Monitor className="w-4 h-4 text-neon-green" />
              </div>
              <h3 className="font-bold text-white text-base">Client Interfaces</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Desktop Electron apps, in-game HUD overlays, and background Node Daemons query
                the unified cluster.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-mono text-zinc-500 space-y-1">
              <div>• React + Vite Client</div>
              <div>• Local Node Daemon (Python)</div>
              <div>• Direct C++ IPC Sockets</div>
            </div>
          </div>

          {/* 2. Gateway Layer */}
          <div className="p-5 rounded-2xl bg-linear-to-b from-neon-green/10 to-transparent border border-neon-green/30 flex flex-col justify-between shadow-[0_0_25px_rgba(118,185,0,0.08)]">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-neon-green mb-2">
                <span>LAYER 02</span>
                <Network className="w-4 h-4 text-neon-green" />
              </div>
              <h3 className="font-bold text-white text-base">Multi-Pool Gateway</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Reverse proxy dispatching incoming queries based on path rules. Balances load
                and isolates scraper spikes from client sync.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-neon-green/20 text-[11px] font-mono text-neon-green/80 space-y-1">
              <div>• Port 8800 Entrypoint</div>
              <div>• Sub-millisecond Routing</div>
              <div>• Automatic Fault Bypass</div>
            </div>
          </div>

          {/* 3. Microservice Pools */}
          <div className="space-y-4">
            {/* Discovery Pool */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-1">
                <span>CATALOG POOL</span>
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div className="font-bold text-white text-sm">Ports :8811, :8812</div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Web discovery, storefront scraping (Steam, Epic, GOG), and AI taxonomy.
              </p>
            </div>

            {/* Node Pool */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-400 mb-1">
                <span>NODE SYNC POOL</span>
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <div className="font-bold text-white text-sm">Ports :8821, :8822</div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Machine registration, storage telemetry, manifest parsers, and 15s heartbeats.
              </p>
            </div>
          </div>

          {/* 4. Persistence Tier */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                <span>LAYER 04</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white text-base">Persistence Tier</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Primary high-concurrency Supabase PostgreSQL cluster backed by a zero-overhead
                local SQLite fallback database.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-mono text-zinc-500 space-y-1">
              <div>• canonical_games</div>
              <div>• library_nodes</div>
              <div>• game_installations</div>
              <div>• catalog_fallback.db</div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Decouple Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/8">
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-neon-green" />
            <span>Why Decouple From the Gaming Client?</span>
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Traditional gaming dashboards execute heavy storefront scraping, SQLite writes,
            and web image downloading directly in the client application thread. When
            downloading hundreds of manifest files or processing AI tags, this causes
            micro-stutters, FPS drops, and memory spikes in running games.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Mission Control delegates all ingestion and clustering to background worker pools.
            Your local gaming PC stays 100% focused on rendering frames at maximum clock rates
            with sub-millisecond telemetry.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/8">
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Zero Single Point of Failure (SPOF)</span>
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Even if cloud networks drop or external internet connections fail, Mission Control
            operates in complete autonomy. The client maintains an in-memory 250+ canonical
            database and an embedded SQLite replica (
            <code className="text-neon-green">catalog_fallback.db</code>).
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You can search your library, view high-definition CDN posters, monitor cluster
            storage, and launch games offline without waiting for external server handshakes.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
export default ServerOverviewTab;
