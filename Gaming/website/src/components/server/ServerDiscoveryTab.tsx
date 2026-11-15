"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Sliders,
  Sparkles,
  ShieldCheck,
  Layers,
  Zap,
  Activity,
  Terminal,
} from "lucide-react";

export const ServerDiscoveryTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-cyan-950/30 via-zinc-900/40 to-black border border-cyan-500/20 relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold uppercase mb-3">
            <Globe className="w-3.5 h-3.5" />
            <span>Catalog &amp; Web Discovery Pool (:8811/:8812)</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Discover From Web: Beyond Single-Storefront Search
          </h2>
          <p className="text-zinc-300 text-sm sm:text-base mt-3 leading-relaxed">
            When you search for a game in Mission Control, you aren&apos;t just querying a local
            folder. You are querying an intelligent multi-source ingestion engine that
            cross-references Steam, Epic Games, GOG Galaxy, Xbox PC, and RAWG in real time.
          </p>
        </div>
      </div>

      {/* 3-Tier Execution Pipeline */}
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-white mb-6 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-neon-green" />
          <span>The 3-Tier Zero-Render-Credit Pipeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1 */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-neon-green/10 text-neon-green border border-neon-green/30">
                TIER 01 • 0ms Latency
              </span>
              <Sparkles className="w-4 h-4 text-neon-green" />
            </div>
            <h4 className="text-lg font-bold text-white">Local Persistent Canonical Index</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Over 250+ top AAA &amp; acclaimed indie titles are stored directly in the
              frontend memory. As you type, acronyms like{" "}
              <code className="text-white bg-white/5 px-1 py-0.5 rounded">gta</code>,{" "}
              <code className="text-white bg-white/5 px-1 py-0.5 rounded">cp2077</code>, and{" "}
              <code className="text-white bg-white/5 px-1 py-0.5 rounded">ac mirage</code>{" "}
              expand instantaneously with zero network latency and zero render credit egress.
            </p>
          </div>

          {/* Tier 2 */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                TIER 02 • Direct Client APIs
              </span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <h4 className="text-lg font-bold text-white">
              Native Client Storefront Connectors
            </h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              If a title isn&apos;t in the curated list, the desktop app leverages native Electron
              IPC to query Steam Store and Epic Games APIs directly from your machine.
              Bypasses cloud bottlenecks and ensures current sale prices and Metascores are
              accurate.
            </p>
          </div>

          {/* Tier 3 */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
                TIER 03 • Cooldown-Guarded Cluster
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <h4 className="text-lg font-bold text-white">
              Distributed Harvester &amp; AI Worker
            </h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Only invoked when local tiers produce fewer than two matches. Guarded by a
              strict 15-second cooldown to preserve free-tier compute credits. Performs deep
              web harvesting across 5 stores and classifies metadata in the background.
            </p>
          </div>
        </div>
      </div>

      {/* Key Features Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-lg font-bold text-white">
            Multi-Storefront Exclusivity Detection
          </h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Games are often exclusive or released across multiple stores under different IDs.
            The server checks simultaneous existence across Steam, Epic Games, Xbox PC, and
            GOG. If a game is an Epic Exclusive (like <em>Alan Wake 2</em>), or available on
            PC Game Pass, it tags the storefront badges accordingly.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="text-lg font-bold text-white">Multi-Tier AI Taxonomy Pipeline</h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Raw store tags can be chaotic or misleading. The server runs an asynchronous
            background queue powered by a 3-tier LLM failover (Google Gemini Flash
            &rarr; Hugging Face Llama 3.1 &rarr; NVIDIA NIM). It automatically
            extracts normalized genres, deep gameplay loops, and hardware features (Ray
            Tracing, DLSS 3, Path Tracing).
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <h4 className="text-lg font-bold text-white">
            Verified High-Resolution CDN Asset Resolution
          </h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Replaces low-res generic shapes with verified official CDN assets. Maps game IDs
            to Steam&apos;s official Cloudflare and Akamai content delivery networks, fetching
            600x900 vertical posters, 460x215 horizontal capsules, and 1920x620 hero banners
            with zero image hosting costs.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Terminal className="w-5 h-5" />
          </div>
          <h4 className="text-lg font-bold text-white">
            Title Normalization &amp; Alias Expansion
          </h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Games with complex editions, subtitles, and release tags (e.g.{" "}
            <em>The Witcher 3: Wild Hunt - Game of the Year Edition</em> or{" "}
            <em>Marvel&apos;s Spider-Man Remastered</em>) are stripped to canonical stems. This
            guarantees that duplicate store entries map back to one unified game profile.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
export default ServerDiscoveryTab;
