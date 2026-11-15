"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Server,
  Globe,
  HardDrive,
  ShieldCheck,
  Layers,
  Code2,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  ServerOverviewTab,
  ServerDiscoveryTab,
  ServerNodesTab,
  ServerResilienceTab,
  ServerApiExplorerTab,
} from "@/components/server";

type ActiveTab = "overview" | "discover" | "nodes" | "resilience" | "api";

export default function ServerArchitectureClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [pulseCount, setPulseCount] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseCount((prev) => (prev + 1) % 1000);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#07080b] text-white selection:bg-neon-green selection:text-black font-sans relative overflow-x-hidden">
      {/* ── AMBIENT BACKGROUND GLOWS ────────────────────────────────────────── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-250 h-125 bg-neon-green/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-0 w-150 h-150 bg-cyan-500/5 blur-[160px] pointer-events-none rounded-full" />

      {/* ── HERO HEADER ────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-24 pb-12 sm:pt-32 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(118,185,0,0.2)]">
            <Server className="w-3.5 h-3.5" />
            <span>Distributed Microservice Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-tight font-display">
            MISSION CONTROL{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-green via-emerald-400 to-teal-300 drop-shadow-[0_0_35px_rgba(118,185,0,0.4)]">
              DISTRIBUTED SERVER
            </span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base font-mono max-w-2xl mx-auto leading-relaxed">
            High-concurrency API gateway and dual-pool microservice cluster powering cross-storefront
            web discovery, multi-device hardware telemetry, and zero-egress resilience.
          </p>

          {/* Quick Metrics Bar */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 max-w-4xl mx-auto"
          >
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>GATEWAY LOAD BALANCER</span>
                <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-neon-green font-mono">
                Port :8800
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Round-Robin Failover</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>DISCOVERY POOL</span>
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                Ports :8811–12
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">5-Store Live Harvester</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>NODE SYNC POOL</span>
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                Ports :8821–22
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">15s Heartbeat Watchdog</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>LOCAL FAILOVER</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                100% Offline
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Zero Cloud Dependency</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── NAVIGATION TABS ───────────────────────────────────────────────────── */}
      <section className="sticky top-20 z-40 bg-[#07080b]/90 backdrop-blur-xl border-y border-white/8 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-start md:justify-center overflow-x-auto no-scrollbar gap-2">
          {[
            { id: "overview", label: "Cluster Topology", icon: Layers },
            { id: "discover", label: "Discover From Web", icon: Globe, highlight: true },
            { id: "nodes", label: "Manage Nodes & Mesh", icon: HardDrive, highlight: true },
            { id: "resilience", label: "Zero-Credit Resilience", icon: ShieldCheck },
            { id: "api", label: "Live API Explorer", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-neon-green text-black shadow-[0_0_20px_rgba(118,185,0,0.35)]"
                    : tab.highlight
                      ? "bg-white/[0.06] text-white hover:bg-white/10 border border-white/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── TAB CONTENT CONTAINERS ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {activeTab === "overview" && <ServerOverviewTab />}
        {activeTab === "discover" && <ServerDiscoveryTab />}
        {activeTab === "nodes" && <ServerNodesTab />}
        {activeTab === "resilience" && <ServerResilienceTab />}
        {activeTab === "api" && <ServerApiExplorerTab />}
      </div>

      {/* ── QUICK START TERMINAL ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-white/10 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
            <div>
              <span className="text-[10px] font-mono text-neon-green font-black uppercase tracking-widest">
                LAUNCH YOUR OWN CLUSTER
              </span>
              <h3 className="text-2xl font-black text-white mt-1">
                Run the Distributed Cluster Locally in Seconds
              </h3>
            </div>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all"
            >
              <span>Read Architecture Documentation</span>
              <ExternalLink className="w-3.5 h-3.5 text-neon-green" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Step A */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/8">
              <div className="text-zinc-500 mb-2">
                # 1. Start the entire cluster with load balancing
              </div>
              <div className="text-neon-green font-bold select-all">
                cd Gaming/distributed_server
                <br />
                python run_cluster.py --catalog-instances 2 --node-instances 2
              </div>
            </div>

            {/* Step B */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/8">
              <div className="text-zinc-500 mb-2">
                # 2. Connect a secondary PC or handheld to the cluster
              </div>
              <div className="text-cyan-400 font-bold select-all">
                cd Gaming/distributed_server
                <br />
                python distributed_node.py --server http://192.168.1.100:8800
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CALL TO ACTION ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-8 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-linear-to-b from-neon-green/10 via-white/[0.02] to-transparent border border-neon-green/30 relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Experience Unified Gaming Orchestration?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mt-3 mb-8 leading-relaxed">
            Download Mission Control for Windows &amp; Linux. Access Discover From Web and Manage
            Nodes with 100% offline fallback and zero cloud dependency.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/downloads"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-neon-green text-black font-black text-xs uppercase tracking-widest hover:bg-neon-green/90 transition-all shadow-[0_0_30px_rgba(118,185,0,0.4)]"
            >
              <Download className="w-4 h-4" />
              <span>Download Mission Control</span>
            </Link>

            <Link
              href="/architecture"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs uppercase tracking-widest transition-all"
            >
              <Layers className="w-4 h-4 text-neon-green" />
              <span>Explore Engine Architecture</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
