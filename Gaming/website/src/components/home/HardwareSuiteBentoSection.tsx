"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Zap,
  Shield,
  Flame,
  Globe,
  RefreshCw,
  Lock,
  Volume2,
  ExternalLink,
  Rss,
} from "lucide-react";

export const PERSONALITY_DATA: Record<
  string,
  {
    desc: string;
    quote: string;
    stats: { tactical: number; aggression: number; immersion: number; sass: number };
  }
> = {
  Tactical: {
    desc: "Precision tactical analysis focusing on positioning, weapon cooldowns, enemy shield status, and squad callouts.",
    quote: '"Enemy shields cracked on squad B. Recommending immediate high-ground flank before thermal reset."',
    stats: { tactical: 95, aggression: 65, immersion: 85, sass: 15 },
  },
  Immersive: {
    desc: "Lore-infused roleplay commentary designed to deepen your narrative bond with the campaign world.",
    quote: '"By the Ancient Flame, the corruption spreads! Maintain defensive shield perimeter at all costs!"',
    stats: { tactical: 70, aggression: 45, immersion: 100, sass: 20 },
  },
  Friendly: {
    desc: "Supportive, encouraging co-pilot offering calm gameplay advice and moral support during intense boss encounters.",
    quote: '"Incredible shot! Let\'s pop a shield cell and regroup before the next wave arrives, buddy."',
    stats: { tactical: 75, aggression: 25, immersion: 80, sass: 10 },
  },
  Sarcastic: {
    desc: "Witty, dry, and brutally honest tactical roasts when you miss shots or trigger alarms.",
    quote: '"Oh brilliant accuracy. I\'m currently calculating our survival odds... 0.04%. Great job."',
    stats: { tactical: 85, aggression: 75, immersion: 60, sass: 100 },
  },
  Aggressive: {
    desc: "High-octane adrenaline commander pushing you to push relentlessly and dominate the battlefield.",
    quote: '"DESTROY THEM ALL! LEAVE NO SURVIVORS! RELOAD NOW AND PUSH THE FRONT LINE!"',
    stats: { tactical: 90, aggression: 100, immersion: 90, sass: 55 },
  },
};

export function HardwareSuiteBentoSection() {
  const [activePersonality, setActivePersonality] = useState("Tactical");
  const [isVramFlushing, setIsVramFlushing] = useState(false);
  const [vramFlushedMsg, setVramFlushedMsg] = useState<string | null>(null);

  // Live External Site Fetching State
  const [externalNews, setExternalNews] = useState<
    Array<{ title: string; link: string; source: string; description: string }>
  >([]);
  const [isFetchingExternal, setIsFetchingExternal] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const handleVramFlush = () => {
    setIsVramFlushing(true);
    setVramFlushedMsg(null);
    setTimeout(() => {
      setIsVramFlushing(false);
      setVramFlushedMsg("1.8 GB VRAM Freed Successfully");
      setTimeout(() => setVramFlushedMsg(null), 4000);
    }, 1200);
  };

  const fetchExternalSiteData = async () => {
    setIsFetchingExternal(true);
    try {
      const res = await fetch("/api/blogs/news");
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setExternalNews(data.items.slice(0, 4));
          setHasFetched(true);
        }
      }
    } catch (err) {
      console.error("External site fetch failed", err);
    } finally {
      setIsFetchingExternal(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 mx-auto"
    >
      {/* Section Header */}
      <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
        <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">TACTICAL HARDWARE SUITE</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
          GAIN THE <span className="text-neon-green glow-text-teal">UNFAIR</span> ADVANTAGE
        </h2>
        <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
          Engineered by <strong className="text-neon-green">Mission Control Labs</strong> for zero CPU bottlenecking.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD 1: 5 AI PERSONALITIES INTERACTIVE SIMULATOR (SPAN 2 COLS) */}
        <div className="glass-card glass-card-hover p-6 sm:p-8 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-between relative group overflow-hidden border-neon-green/40 bg-linear-to-b from-white/4 to-transparent">
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl icon-badge-premium shadow-[0_0_20px_rgba(118,185,0,0.3)] shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display text-white">5 Adaptive AI Personalities</h3>
                  <p className="text-xs font-mono text-neon-green uppercase tracking-wider">Dynamic Voice & Guidance Modes</p>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neon-green px-3.5 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 uppercase tracking-wider">
                Featured AI Engine
              </span>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-sans">
              {PERSONALITY_DATA[activePersonality].desc}
            </p>

            {/* Personality Selector Tabs */}
            <div className="flex overflow-x-auto sm:grid sm:grid-cols-5 gap-1.5 sm:gap-2 p-1.5 bg-obsidian/90 border border-white/10 rounded-xl text-center mb-6 no-scrollbar scrollbar-none">
              {["Tactical", "Immersive", "Friendly", "Sarcastic", "Aggressive"].map((p) => {
                const isActive = activePersonality === p;
                return (
                  <button
                    key={p}
                    onClick={() => setActivePersonality(p)}
                    className={`py-2.5 px-3 sm:px-2 md:px-3 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink ${
                      isActive
                        ? "btn-premium-primary shadow-[0_0_20px_rgba(118,185,0,0.55)] scale-[1.03]"
                        : "bg-white/2 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Voice Frequency Equalizer Visualizer & Quote Box */}
            <div className="bg-obsidian/95 border border-neon-green/30 p-4 sm:p-5 rounded-xl relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3 text-xs font-mono text-gray-400">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-neon-green animate-pulse shrink-0" />
                  <span className="text-white font-bold uppercase">{activePersonality} VOICE MATRIX</span>
                </div>
                {/* Equalizer frequency bars */}
                <div className="flex items-end gap-1 h-4 shrink-0">
                  {[60, 100, 45, 80, 95, 30, 85, 50, 90, 70].map((val, idx) => (
                    <div
                      key={idx}
                      className="w-1 bg-neon-green rounded-full animate-pulse"
                      style={{ height: `${val}%`, animationDelay: `${idx * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>

              <div className="text-xs sm:text-sm font-mono text-neon-green italic leading-relaxed">
                {PERSONALITY_DATA[activePersonality].quote}
              </div>

              {/* Trait Meters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 font-mono text-[10px] sm:text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400">TACTICAL:</span>
                    <span className="text-neon-green font-bold">{PERSONALITY_DATA[activePersonality].stats.tactical}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-neon-green h-full transition-all duration-500" style={{ width: `${PERSONALITY_DATA[activePersonality].stats.tactical}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400">AGGRESSION:</span>
                    <span className="text-red-400 font-bold">{PERSONALITY_DATA[activePersonality].stats.aggression}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${PERSONALITY_DATA[activePersonality].stats.aggression}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400">IMMERSION:</span>
                    <span className="text-neon-yellow font-bold">{PERSONALITY_DATA[activePersonality].stats.immersion}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-neon-yellow h-full transition-all duration-500" style={{ width: `${PERSONALITY_DATA[activePersonality].stats.immersion}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400">SASS LEVEL:</span>
                    <span className="text-purple-400 font-bold">{PERSONALITY_DATA[activePersonality].stats.sass}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full transition-all duration-500" style={{ width: `${PERSONALITY_DATA[activePersonality].stats.sass}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: DEEP GAME SCANNER */}
        <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl icon-badge-cyan shadow-[0_0_20px_rgba(6,182,212,0.25)] shrink-0">
                <Search className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                AUTO-SCANNER
              </span>
            </div>
            <h3 className="text-2xl font-bold font-display text-white mb-1">Deep Game Scanner</h3>
            <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">NVIDIA DLSS & Path Tracing</div>
            <p className="text-gray-400 text-sm leading-relaxed font-sans mb-6">
              Scans game directories up to 3 subfolders deep to auto-configure DLSS 4 Multi-Frame Gen & Reflex low latency.
            </p>
          </div>

          {/* Deep Scanner Interface Preview */}
          <div className="w-full h-32 bg-obsidian border border-white/10 rounded-xl relative overflow-hidden group/scan-preview">
            <img
              src="/screenshots/deepscanner.png"
              alt="Deep Game Scanner Interface"
              className="w-full h-full object-cover transition-all duration-500 group-hover/scan-preview:scale-105 group-hover/scan-preview:border-neon-green/30"
            />
            <div className="absolute inset-0 bg-linear-to-t from-obsidian/85 via-obsidian/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 font-mono text-[9px] text-neon-green bg-obsidian/90 px-2.5 py-1 rounded-md border border-neon-green/30 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span>SCANNER ACTIVE</span>
            </div>
          </div>
        </div>

        {/* CARD 3: AGENTIC SYSTEM HOOKS */}
        <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl icon-badge-yellow shadow-[0_0_20px_rgba(251,191,36,0.25)] shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                ZERO LATENCY
              </span>
            </div>
            <h3 className="text-2xl font-bold font-display text-white mb-1">Agentic System Hooks</h3>
            <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">Autonomous System Commands</div>
            <p className="text-gray-400 text-sm leading-relaxed font-sans mb-4">
              Executes background PyTorch CUDA VRAM purges, triggers custom hardware cooling curves, and runs macro scripts headlessly.
            </p>
          </div>

          <div className="p-4 bg-obsidian border border-white/10 rounded-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">VRAM RECLAIM:</span>
              <button
                onClick={handleVramFlush}
                disabled={isVramFlushing}
                className="btn-premium-primary px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isVramFlushing ? "animate-spin" : ""}`} />
                <span>{isVramFlushing ? "PURGING..." : "FLUSH VRAM"}</span>
              </button>
            </div>

            {vramFlushedMsg && (
              <div className="text-[10px] text-neon-green bg-neon-green/10 p-2 rounded border border-neon-green/30 text-center font-bold">
                ✓ {vramFlushedMsg}
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: HARDWARE-LOCKED PRIVACY */}
        <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl icon-badge-premium shadow-[0_0_20px_rgba(118,185,0,0.25)] shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                LOCAL ONLY
              </span>
            </div>
            <h3 className="text-2xl font-bold font-display text-white mb-1">Hardware Privacy</h3>
            <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">Motherboard UUID Sandbox</div>
            <p className="text-gray-400 text-sm leading-relaxed font-sans mb-4">
              Custom prompts and performance telemetry are encrypted directly to your physical PC UUID. 100% offline local processing.
            </p>
          </div>

          <div className="p-3.5 bg-obsidian border border-neon-green/20 rounded-xl flex items-center gap-3 font-mono text-xs text-gray-300">
            <Lock className="w-5 h-5 text-neon-green shrink-0 animate-pulse" />
            <div className="truncate">
              <div className="text-[10px] text-gray-500">ENCRYPTED HARDWARE HASH</div>
              <div className="text-white font-bold text-[11px] truncate">UUID: 8F2A-94B1-0021-CUDA</div>
            </div>
          </div>
        </div>

        {/* CARD 5: STEALTH BOOST MODE */}
        <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl icon-badge-yellow shadow-[0_0_20px_rgba(251,191,36,0.25)] shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                MAX FPS
              </span>
            </div>
            <h3 className="text-2xl font-bold font-display text-white mb-1">Stealth Boost Mode</h3>
            <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">Aggressive Resource Purge</div>
            <p className="text-gray-400 text-sm leading-relaxed font-sans mb-4">
              Suspends unnecessary Windows background services and standby cache memory during active gameplay loops.
            </p>
          </div>

          <div className="p-4 bg-obsidian border border-white/10 rounded-xl space-y-2 font-mono text-xs">
            <div className="flex justify-between text-gray-300 text-[11px]">
              <span>BOOST EFFICIENCY</span>
              <span className="text-neon-green font-bold">+14.2% FPS</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-neon-green h-full w-[88%] shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
            </div>
          </div>
        </div>

        {/* CARD 6: LIVE WEB CONTEXT SCRAPER WITH REAL EXTERNAL SITE FETCHING */}
        <div className="glass-card glass-card-hover p-6 sm:p-8 col-span-1 md:col-span-2 lg:col-span-3 flex flex-col justify-between relative group overflow-hidden border-neon-green/40">
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl icon-badge-cyan shadow-[0_0_20px_rgba(6,182,212,0.25)] shrink-0">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display text-white">Live Web Context Scraper</h3>
                  <p className="text-xs font-mono text-neon-green uppercase tracking-wider">Real External Site News & Guide Engine</p>
                </div>
              </div>

              {/* FETCH EXTERNAL SITE BUTTON */}
              <button
                onClick={fetchExternalSiteData}
                disabled={isFetchingExternal}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 btn-premium-primary px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(118,185,0,0.4)] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingExternal ? "animate-spin" : ""}`} />
                <span>{isFetchingExternal ? "FETCHING EXTERNAL SITES..." : "FETCH EXTERNAL SITE DATA"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed font-sans mb-6">
              Connects directly to external sites (IGN, Kotaku, Eurogamer, AnandTech, Tom's Hardware) to stream real-time gaming news and boss mechanics directly into your tactical HUD.
            </p>
          </div>

          <div className="p-4 bg-obsidian/95 border border-neon-green/30 rounded-xl font-mono text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 border-b border-white/10 pb-2.5">
              <span className="text-neon-green font-bold flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-ping shrink-0" />
                <span className="truncate">{hasFetched ? "LIVE EXTERNAL RSS FEEDS (4 ARTICLES FETCHED)" : "PARSED EXTERNAL SITE FEEDS"}</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider">IGN • KOTAKU • EUROGAMER</span>
            </div>

            {hasFetched && externalNews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {externalNews.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-white/3 border border-white/10 rounded-lg hover:border-neon-green/40 hover:bg-neon-green/5 transition-all text-xs group"
                  >
                    <div className="flex justify-between items-center text-neon-green font-bold text-[11px] mb-1">
                      <span className="uppercase font-mono flex items-center gap-1.5">
                        <Rss className="w-3 h-3" /> [{item.source}]
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-neon-green" />
                    </div>
                    <div className="text-white font-sans font-semibold group-hover:text-neon-yellow transition-colors line-clamp-1">
                      {item.title}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white/2 border border-white/10 rounded-lg">
                  <div className="text-gray-300 text-[11px] font-bold">ELDEN RING WIKI SCRAPER</div>
                  <div className="text-neon-yellow text-xs mt-1">"Malenia Phase 2 Waterfowl Dodge Timings"</div>
                </div>
                <div className="p-3 bg-white/2 border border-white/10 rounded-lg">
                  <div className="text-gray-300 text-[11px] font-bold">CYBERPUNK 2077 WIKI SCRAPER</div>
                  <div className="text-white text-xs mt-1">"Patch 2.12 Frame Generation Driver Fixes"</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
