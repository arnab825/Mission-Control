"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Globe,
  Cpu,
  Database,
  Activity,
  ShieldCheck,
  Layers,
  Zap,
  CheckCircle2,
  HardDrive,
  Terminal,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Download,
  Laptop,
  Monitor,
  Search,
  Gamepad2,
  Network,
  Wifi,
  Clock,
  Sparkles,
  Sliders,
  AlertTriangle
} from "lucide-react";

type ActiveTab = "overview" | "discover" | "nodes" | "resilience" | "api";

interface ApiEndpointExample {
  method: "GET" | "POST";
  path: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  pool: "Catalog Pool (:8811/:8812)" | "Node Pool (:8821/:8822)" | "Gateway (:8800)";
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody: any;
}

const API_EXAMPLES: ApiEndpointExample[] = [
  {
    method: "GET",
    path: "/api/games/discover?q=Assassin's Creed Mirage&limit=5",
    name: "Discover Games from Web",
    badge: "Web Discovery",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description:
      "Performs real-time parallel harvesting across Steam, Epic Games, GOG, and RAWG. Normalizes titles, resolves official CDN artwork, and triggers asynchronous LLM genre taxonomy classification.",
    pool: "Catalog Pool (:8811/:8812)",
    responseBody: {
      success: true,
      query: "Assassin's Creed Mirage",
      total_found: 1,
      results: [
        {
          id: "assassins-creed-mirage",
          title: "Assassin's Creed Mirage",
          developer: "Ubisoft Bordeaux",
          publisher: "Ubisoft",
          release_date: "2024-10-17",
          primary_genre: "Stealth Action",
          genres: ["Stealth", "Action Adventure", "Parkour", "Historical"],
          tags: ["Open World", "Story Rich", "Assassins", "Singleplayer"],
          store: "Steam",
          store_app_id: "3035570",
          cover_url: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3035570/library_600x900_2x.jpg",
          banner_url: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/3035570/header.jpg",
          in_catalog: true,
          ai_classified: true,
          launchers: ["Steam", "Ubisoft Connect", "Epic Games"],
          store_availability: {
            steam: { available: true, store_app_id: "3035570" },
            ubisoft: { available: true, store_app_id: "ubi-ac-mirage" }
          }
        }
      ],
      cached: true,
      compute_credits_used: 0
    }
  },
  {
    method: "POST",
    path: "/api/nodes/register",
    name: "Register Hardware Node",
    badge: "Cluster Mesh",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    description:
      "Connects a local PC or handheld to the cluster. Stores host telemetry, IP resolution, CPU/GPU capabilities, and physical storage capacity.",
    pool: "Node Pool (:8821/:8822)",
    requestBody: {
      name: "Desktop-Battlestation",
      hostname: "ROG-TITAN-X",
      ip: "192.168.1.142",
      os: "Windows 11 Pro 64-bit (23H2)",
      specs: {
        cpu: "AMD Ryzen 9 7950X3D (16 Cores, 32 Threads)",
        gpu: "NVIDIA GeForce RTX 4090 (24GB GDDR6X)",
        ram_gb: 64
      },
      storage_total_gb: 4096,
      storage_free_gb: 1840,
      auth_token: "node_sec_994b2fe1a87c"
    },
    responseBody: {
      success: true,
      node_id: "node_774a10fc",
      status: "online",
      heartbeat_interval_sec: 15,
      offline_timeout_sec: 45,
      message: "Node registered to cluster. Awaiting initial launcher sync."
    }
  },
  {
    method: "POST",
    path: "/api/nodes/node_774a10fc/sync",
    name: "Sync Node Game Installations",
    badge: "Manifest Crawl",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description:
      "Transmits parsed local launcher manifests (.acf, .item, SQLite) to link local game files with master canonical records.",
    pool: "Node Pool (:8821/:8822)",
    requestBody: {
      node_id: "node_774a10fc",
      games_count: 24,
      installations: [
        {
          game_id: "assassins-creed-mirage",
          store: "Steam",
          install_path: "D:\\SteamLibrary\\steamapps\\common\\Assassin's Creed Mirage",
          size_bytes: 41249780000,
          executable: "ACMirage.exe",
          last_played: "2026-09-08T18:30:00Z"
        }
      ]
    },
    responseBody: {
      success: true,
      synced_games: 24,
      linked_canonical: 24,
      cluster_installations_total: 68,
      timestamp: "2026-09-10T05:45:00Z"
    }
  },
  {
    method: "GET",
    path: "/api/library/stats",
    name: "Cluster-Wide Library Telemetry",
    badge: "Mesh Stats",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description:
      "Aggregates total games, total distinct installed titles, active cluster nodes, and free storage capacity across all connected hardware.",
    pool: "Node Pool (:8821/:8822)",
    responseBody: {
      total_canonical_games: 1042,
      total_active_nodes: 3,
      total_installed_games: 68,
      total_cluster_storage_gb: 8192,
      free_cluster_storage_gb: 3410,
      nodes: [
        { id: "node_774a10fc", name: "Desktop-Battlestation", status: "online", installed_count: 38, last_seen_seconds_ago: 3 },
        { id: "node_882b99ea", name: "Razer-Blade-Laptop", status: "online", installed_count: 18, last_seen_seconds_ago: 8 },
        { id: "node_114c00ab", name: "Steam-Deck-OLED", status: "online", installed_count: 12, last_seen_seconds_ago: 12 }
      ]
    }
  },
  {
    method: "GET",
    path: "/cluster/status",
    name: "Cluster Load Balancer HUD",
    badge: "Load Balancer",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    description:
      "Real-time gateway status reporting instance health, latency metrics, upstream pool round-robin state, and memory allocations.",
    pool: "Gateway (:8800)",
    responseBody: {
      gateway: { status: "healthy", port: 8800, uptime_seconds: 482910 },
      pools: {
        catalog_discovery: {
          strategy: "round-robin",
          active_instances: 2,
          targets: [
            { url: "http://127.0.0.1:8811", healthy: true, latency_ms: 2.1 },
            { url: "http://127.0.0.1:8812", healthy: true, latency_ms: 1.9 }
          ]
        },
        user_library_sync: {
          strategy: "round-robin",
          active_instances: 2,
          targets: [
            { url: "http://127.0.0.1:8821", healthy: true, latency_ms: 0.8 },
            { url: "http://127.0.0.1:8822", healthy: true, latency_ms: 0.7 }
          ]
        }
      },
      database: { tier: 1, provider: "Supabase PostgreSQL", fallback_sqlite_ready: true }
    }
  }
];

export default function ServerArchitectureClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedApiIdx, setSelectedApiIdx] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [pulseCount, setPulseCount] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseCount((prev) => (prev + 1) % 1000);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyApi = () => {
    const example = API_EXAMPLES[selectedApiIdx];
    const payload = JSON.stringify(example.responseBody, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-zinc-100 selection:bg-neon-green/30 selection:text-neon-green relative overflow-hidden">
      {/* Background ambient gradient fields */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-neon-green/5 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute top-[800px] right-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute top-[1800px] left-0 w-[700px] h-[700px] bg-purple-500/5 blur-[200px] rounded-full pointer-events-none" />

      {/* Cybernetic grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto z-10">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[11px] font-mono font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(118,185,0,0.2)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
            </span>
            <span>HYBRID CLOUD-EDGE CLUSTER INFRASTRUCTURE</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black font-display tracking-tight text-white max-w-5xl leading-[1.08]"
          >
            WHAT OUR <span className="text-neon-green drop-shadow-[0_0_25px_rgba(118,185,0,0.35)]">SERVER</span> ACTUALLY DOES
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-xl text-zinc-400 max-w-3xl leading-relaxed"
          >
            Discover how Mission Control decouples heavy web scraping, game launcher crawling, and AI taxonomy classification from real-time client gameplay. A dual-pool microservice architecture specifically engineered for <strong className="text-white">Discover From Web</strong> and <strong className="text-white">Manage Nodes</strong>.
          </motion.p>

          {/* Live System Metrics Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl pt-4"
          >
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>API GATEWAY</span>
                <Network className="w-3.5 h-3.5 text-neon-green" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">Port :8800</div>
              <p className="text-[11px] text-zinc-500 mt-1">Multi-Pool Reverse Proxy</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>DISCOVERY POOL</span>
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">Ports :8811–12</div>
              <p className="text-[11px] text-zinc-500 mt-1">5-Store Live Harvester</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>NODE SYNC POOL</span>
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">Ports :8821–22</div>
              <p className="text-[11px] text-zinc-500 mt-1">15s Heartbeat Watchdog</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-md text-left">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
                <span>LOCAL FAILOVER</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">100% Offline</div>
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
        {/* TAB 1: CLUSTER TOPOLOGY */}
        {activeTab === "overview" && (
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
                      Desktop Electron apps, in-game HUD overlays, and background Node Daemons query the unified cluster.
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
                      Reverse proxy dispatching incoming queries based on path rules. Balances load and isolates scraper spikes from client sync.
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
                      Primary high-concurrency Supabase PostgreSQL cluster backed by a zero-overhead local SQLite fallback database.
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
                  Traditional gaming dashboards execute heavy storefront scraping, SQLite writes, and web image downloading directly in the client application thread. When downloading hundreds of manifest files or processing AI tags, this causes micro-stutters, FPS drops, and memory spikes in running games.
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Mission Control delegates all ingestion and clustering to background worker pools. Your local gaming PC stays 100% focused on rendering frames at maximum clock rates with sub-millisecond telemetry.
                </p>
              </div>

              <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/8">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <span>Zero Single Point of Failure (SPOF)</span>
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  Even if cloud networks drop or external internet connections fail, Mission Control operates in complete autonomy. The client maintains an in-memory 250+ canonical database and an embedded SQLite replica (<code className="text-neon-green">catalog_fallback.db</code>).
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  You can search your library, view high-definition CDN posters, monitor cluster storage, and launch games offline without waiting for external server handshakes.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: DISCOVER FROM WEB */}
        {activeTab === "discover" && (
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
                  When you search for a game in Mission Control, you aren't just querying a local folder. You are querying an intelligent multi-source ingestion engine that cross-references Steam, Epic Games, GOG Galaxy, Xbox PC, and RAWG in real time.
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
                    Over 250+ top AAA &amp; acclaimed indie titles are stored directly in the frontend memory. As you type, acronyms like <code className="text-white bg-white/5 px-1 py-0.5 rounded">gta</code>, <code className="text-white bg-white/5 px-1 py-0.5 rounded">cp2077</code>, and <code className="text-white bg-white/5 px-1 py-0.5 rounded">ac mirage</code> expand instantaneously with zero network latency and zero render credit egress.
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
                  <h4 className="text-lg font-bold text-white">Native Client Storefront Connectors</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    If a title isn't in the curated list, the desktop app leverages native Electron IPC to query Steam Store and Epic Games APIs directly from your machine. Bypasses cloud bottlenecks and ensures current sale prices and Metascores are accurate.
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
                  <h4 className="text-lg font-bold text-white">Distributed Harvester &amp; AI Worker</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Only invoked when local tiers produce fewer than two matches. Guarded by a strict 15-second cooldown to preserve free-tier compute credits. Performs deep web harvesting across 5 stores and classifies metadata in the background.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Features Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white">Multi-Storefront Exclusivity Detection</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Games are often exclusive or released across multiple stores under different IDs. The server checks simultaneous existence across Steam, Epic Games, Xbox PC, and GOG. If a game is an Epic Exclusive (like <em>Alan Wake 2</em>), or available on PC Game Pass, it tags the storefront badges accordingly.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white">Multi-Tier AI Taxonomy Pipeline</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Raw store tags can be chaotic or misleading. The server runs an asynchronous background queue powered by a 3-tier LLM failover (Google Gemini Flash $\rightarrow$ Hugging Face Llama 3.1 $\rightarrow$ NVIDIA NIM). It automatically extracts normalized genres, deep gameplay loops, and hardware features (Ray Tracing, DLSS 3, Path Tracing).
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white">Verified High-Resolution CDN Asset Resolution</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Replaces low-res generic shapes with verified official CDN assets. Maps game IDs to Steam's official Cloudflare and Akamai content delivery networks, fetching 600x900 vertical posters, 460x215 horizontal capsules, and 1920x620 hero banners with zero image hosting costs.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white">Title Normalization &amp; Alias Expansion</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Games with complex editions, subtitles, and release tags (e.g. <em>The Witcher 3: Wild Hunt - Game of the Year Edition</em> or <em>Marvel's Spider-Man Remastered</em>) are stripped to canonical stems. This guarantees that duplicate store entries map back to one unified game profile.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: MANAGE NODES */}
        {activeTab === "nodes" && (
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
                  Gamers rarely play on just one device. You might have a primary liquid-cooled desktop, a portable gaming laptop, a Steam Deck or ROG Ally, and a living room TV rig. Manage Nodes transforms your disjointed rigs into a unified, synchronized cluster.
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
                <h4 className="text-lg font-bold text-white">Hardware &amp; Storage Registration</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  When a PC runs Mission Control or the <code className="text-white bg-white/5 px-1 py-0.5 rounded">distributed_node</code> daemon, it registers with the server using a secure token. It transmits hostname, IP address, GPU architecture, and physical drive volumes via native OS calls (<code className="text-neon-green">shutil.disk_usage</code>).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-mono font-black mb-3">
                  02
                </div>
                <h4 className="text-lg font-bold text-white">Zero-Effort Manifest Harvesting</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  The node automatically deep-scans your local storage. It parses Steam <code className="text-white bg-white/5 px-1 py-0.5 rounded">appmanifest.acf</code> files, Epic Games <code className="text-white bg-white/5 px-1 py-0.5 rounded">.item</code> JSONs, GOG Galaxy SQLite databases, and Xbox App packages without needing you to manually input executable paths.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/8 relative">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-mono font-black mb-3">
                  03
                </div>
                <h4 className="text-lg font-bold text-white">Cluster Availability Matrix</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  All installations are linked to the master <code className="text-neon-green">canonical_games</code> registry. Your game cards indicate where copies exist (e.g. <em>Available on Desktop Rig [D:\] and Steam Deck [MicroSD]</em>) alongside aggregated cluster storage stats.
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
                    To prevent ghost game launches on sleeping or powered-down computers, every active node streams an encrypted heartbeat packet to the <code className="text-white bg-white/5 px-1 py-0.5 rounded">Node Pool (:8821/:8822)</code> every 15 seconds.
                  </p>
                  <p>
                    The packet carries current CPU load, active thermals, and available drive space. The server continuously updates the node's <code className="text-white bg-white/5 px-1 py-0.5 rounded">last_heartbeat</code> timestamp in the cluster registry.
                  </p>
                </div>
                <div>
                  <p className="mb-3">
                    In the background, a threaded <strong>Offline Watchdog</strong> audits all registered nodes. If a computer shuts down, disconnects from Wi-Fi, or suspends for longer than 45 seconds, the watchdog immediately updates its status to <span className="text-red-400 font-bold">offline</span>.
                  </p>
                  <p>
                    Games installed solely on that offline machine are flagged gracefully in the UI with a badge explaining that the host machine is currently unavailable.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: ZERO-CREDIT RESILIENCE */}
        {activeTab === "resilience" && (
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
                Most cloud-hosted gaming tools incur steep API bills or exhaust compute limits whenever users type keystrokes in a search bar. Mission Control was architected with a strict multi-tier caching and cooldown policy that eliminates unnecessary compute.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/8">
                  <div className="text-neon-green font-mono font-bold text-xs mb-2">01 • Bounded Cooldowns</div>
                  <h4 className="font-bold text-white text-base">15-Second Hard Rate Limit</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    The cluster discovery endpoint enforces a strict 15-second client-side cooldown. Keystroke debouncing runs 100% in local browser/Electron memory.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/8">
                  <div className="text-cyan-400 font-mono font-bold text-xs mb-2">02 • Edge CDN Assets</div>
                  <h4 className="font-bold text-white text-base">Direct Steam CDN Routing</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Game cover art and banners are routed directly to Cloudflare and Akamai Steam edge CDNs. Your server never consumes egress bandwidth streaming multi-megabyte images.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/8">
                  <div className="text-purple-400 font-mono font-bold text-xs mb-2">03 • Local SQLite Shadow</div>
                  <h4 className="font-bold text-white text-base">Autonomous SQLite Replica</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    If the primary Supabase PostgreSQL connection encounters transient latency or connection timeouts, the server drops down to <code className="text-white">catalog_fallback.db</code> instantly without throwing 500 errors.
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
                      <th className="py-4 px-6 text-zinc-500">Standalone Client (Steam/Epic/GOG)</th>
                      <th className="py-4 px-6 text-neon-green font-bold">Mission Control Distributed Server</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    <tr>
                      <td className="py-4 px-6 font-bold text-white">Multi-Store Search</td>
                      <td className="py-4 px-6 text-zinc-400">Locked to single store ecosystem</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">Parallel harvest (Steam, Epic, GOG, Xbox, RAWG)</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-bold text-white">Cross-Device PC Mesh</td>
                      <td className="py-4 px-6 text-zinc-400">No cross-PC awareness or storage tracking</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">Live multi-PC node registration with drive telemetry</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-bold text-white">AI Taxonomy &amp; Tags</td>
                      <td className="py-4 px-6 text-zinc-400">User-voted or generic marketing tags</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">3-tier LLM classification (Gemini, Llama, NVIDIA NIM)</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-bold text-white">Offline Capability</td>
                      <td className="py-4 px-6 text-zinc-400">Restricted offline modes with authentication timeouts</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">100% autonomous local canonical index + SQLite fallback</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-bold text-white">Client FPS Overhead</td>
                      <td className="py-4 px-6 text-zinc-400">Heavy Electron/Chromium CPU &amp; RAM footprint</td>
                      <td className="py-4 px-6 text-emerald-400 font-bold">Zero render overhead; heavy workers isolated to server</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: LIVE API EXPLORER */}
        {activeTab === "api" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Interactive API Payload Explorer
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Inspect real HTTP request and response structures served by the API Gateway and worker pools.
              </p>
            </div>

            {/* Endpoint Selector Buttons */}
            <div className="flex flex-wrap gap-2">
              {API_EXAMPLES.map((ex, idx) => (
                <button
                  key={ex.path}
                  onClick={() => setSelectedApiIdx(idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedApiIdx === idx
                      ? "bg-neon-green/20 border border-neon-green text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.15)]"
                      : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/8 text-zinc-400"
                  }`}
                >
                  <span className={ex.method === "GET" ? "text-emerald-400" : "text-amber-400"}>
                    {ex.method}
                  </span>
                  <span>{ex.name}</span>
                </button>
              ))}
            </div>

            {/* Selected Endpoint Card */}
            {(() => {
              const current = API_EXAMPLES[selectedApiIdx];
              return (
                <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/8">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase border ${current.badgeColor}`}>
                          {current.badge}
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-300">
                          {current.pool}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-sm sm:text-base text-white font-bold">
                        <span className={current.method === "GET" ? "text-emerald-400" : "text-amber-400"}>
                          {current.method}
                        </span>
                        <span className="text-zinc-200">{current.path}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-2 max-w-2xl">
                        {current.description}
                      </p>
                    </div>

                    <button
                      onClick={handleCopyApi}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-mono transition-all self-start lg:self-center cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied Payload" : "Copy Response JSON"}</span>
                    </button>
                  </div>

                  {/* If POST has request body */}
                  {current.requestBody && (
                    <div>
                      <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                        Request Body (JSON)
                      </div>
                      <pre className="p-4 rounded-xl bg-black/60 border border-white/8 font-mono text-xs text-zinc-300 overflow-x-auto">
                        {JSON.stringify(current.requestBody, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Response Body */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                      <span>Response Payload (HTTP 200 OK)</span>
                      <span className="text-emerald-400 font-bold">application/json</span>
                    </div>
                    <pre className="p-4 rounded-xl bg-black/70 border border-white/8 font-mono text-xs text-emerald-400/90 overflow-x-auto max-h-96 custom-scrollbar">
                      {JSON.stringify(current.responseBody, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
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
              <div className="text-zinc-500 mb-2"># 1. Start the entire cluster with load balancing</div>
              <div className="text-neon-green font-bold select-all">
                cd Gaming/distributed_server<br />
                python run_cluster.py --catalog-instances 2 --node-instances 2
              </div>
            </div>

            {/* Step B */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/8">
              <div className="text-zinc-500 mb-2"># 2. Connect a secondary PC or handheld to the cluster</div>
              <div className="text-cyan-400 font-bold select-all">
                cd Gaming/distributed_server<br />
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
            Download Mission Control for Windows &amp; Linux. Access Discover From Web and Manage Nodes with 100% offline fallback and zero cloud dependency.
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
