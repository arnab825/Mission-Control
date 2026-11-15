"use client";

import React from "react";
import { motion } from "framer-motion";
import { HardDrive, Clock } from "lucide-react";

export const ServerNodesTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-purple-950/30 via-zinc-900/40 to-black border border-purple-500/20 relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold uppercase mb-3">
            <HardDrive className="w-3.5 h-3.5" />
            <span>User Library &amp; Node Sync Pool (:8821/:8822)</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Manage Nodes: Your Multi-PC Gaming Mesh
          </h2>
          <p className="text-zinc-300 text-sm sm:text-base mt-3 leading-relaxed">
            Gamers rarely play on just one device. You might have a primary liquid-cooled
            desktop, a portable gaming laptop, a Steam Deck or ROG Ally, and a living room TV
            rig. Manage Nodes transforms your disjointed rigs into a unified, synchronized
            cluster.
          </p>
        </div>
      </div>

      {/* How Manage Nodes Works Step-by-Step */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-mono font-black mb-3">
            01
          </div>
          <h4 className="text-lg font-bold text-white">
            Hardware &amp; Storage Registration
          </h4>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            When a PC runs Mission Control or the{" "}
            <code className="text-white bg-white/5 px-1 py-0.5 rounded">
              distributed_node
            </code>{" "}
            daemon, it registers with the server using a secure token. It transmits hostname,
            IP address, GPU architecture, and physical drive volumes via native OS calls (
            <code className="text-neon-green">shutil.disk_usage</code>).
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-mono font-black mb-3">
            02
          </div>
          <h4 className="text-lg font-bold text-white">Zero-Effort Manifest Harvesting</h4>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            The node automatically deep-scans your local storage. It parses Steam{" "}
            <code className="text-white bg-white/5 px-1 py-0.5 rounded">appmanifest.acf</code>{" "}
            files, Epic Games{" "}
            <code className="text-white bg-white/5 px-1 py-0.5 rounded">.item</code> JSONs,
            GOG Galaxy SQLite databases, and Xbox App packages without needing you to manually
            input executable paths.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-mono font-black mb-3">
            03
          </div>
          <h4 className="text-lg font-bold text-white">Cluster Availability Matrix</h4>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            All installations are linked to the master{" "}
            <code className="text-neon-green">canonical_games</code> registry. Your game cards
            indicate where copies exist (e.g.{" "}
            <em>Available on Desktop Rig [D:\] and Steam Deck [MicroSD]</em>) alongside
            aggregated cluster storage stats.
          </p>
        </div>
      </div>

      {/* The 15-Second Heartbeat & Offline Watchdog Deep Dive */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
          <div>
            <span className="text-[10px] font-mono text-purple-400 font-black uppercase tracking-widest">
              RELIABILITY &amp; INTEGRITY
            </span>
            <h3 className="text-2xl font-black text-white mt-1">
              The 15-Second Heartbeat &amp; Offline Watchdog Daemon
            </h3>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold">
            <Clock className="w-4 h-4" />
            <span>45-Second Auto-Disconnect Threshold</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-zinc-400 leading-relaxed">
          <div>
            <p className="mb-3">
              To prevent ghost game launches on sleeping or powered-down computers, every
              active node streams an encrypted heartbeat packet to the{" "}
              <code className="text-white bg-white/5 px-1 py-0.5 rounded">
                Node Pool (:8821/:8822)
              </code>{" "}
              every 15 seconds.
            </p>
            <p>
              The packet carries current CPU load, active thermals, and available drive space.
              The server continuously updates the node&apos;s{" "}
              <code className="text-white bg-white/5 px-1 py-0.5 rounded">
                last_heartbeat
              </code>{" "}
              timestamp in the cluster registry.
            </p>
          </div>
          <div>
            <p className="mb-3">
              In the background, a threaded <strong>Offline Watchdog</strong> audits all
              registered nodes. If a computer shuts down, disconnects from Wi-Fi, or suspends
              for longer than 45 seconds, the watchdog immediately updates its status to{" "}
              <span className="text-red-400 font-bold">offline</span>.
            </p>
            <p>
              Games installed solely on that offline machine are flagged gracefully in the UI
              with a badge explaining that the host machine is currently unavailable.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default ServerNodesTab;
