"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Gamepad2,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Activity,
  Cpu,
  Maximize2,
  X,
  Tv,
  Sparkles,
  Layers,
  Search,
  ArrowRight,
  Monitor,
  Flame,
  Gauge,
  Sliders,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WINDOWS_INSTALLER_URL } from "@/lib/download";
import { TESTED_GAMES_LIST, getBenchmarkProfileById } from "@/data/benchmarks";

export default function GamesTestedPage() {
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string; desc: string } | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string>("spiderman2");
  const [filterGenre, setFilterGenre] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImage(null);
      }
    };
    if (selectedImage) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage]);

  const scrollToBenchmark = () => {
    const el = document.getElementById("featured-benchmark");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    scrollToBenchmark();
  };

  const featuredGame = getBenchmarkProfileById(selectedGameId);

  const filteredGames = TESTED_GAMES_LIST.filter(g => {
    const matchesGenre = filterGenre === "ALL" || g.genre.toUpperCase().includes(filterGenre);
    const matchesSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#070709] text-white pt-24 pb-20 selection:bg-neon-green selection:text-black">
      {/* Background Glow Accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-neon-green/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header / Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(118,185,0,0.2)]">
            <Gamepad2 className="w-4 h-4" /> Hardware Compatibility Audit
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white uppercase leading-tight">
            Tested Games & <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-emerald-400 to-teal-300 drop-shadow-[0_0_25px_rgba(118,185,0,0.4)]">Performance Benchmarks</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base font-mono max-w-2xl mx-auto leading-relaxed">
            Real-world gaming benchmarks, NVIDIA DLSS / Frame Generation telemetry, and AI-driven preset recommendations tested by Mission Control.
          </p>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto font-mono">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-neon-green font-black text-xl sm:text-2xl">100%</div>
              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Local Verification</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-emerald-400 font-black text-xl sm:text-2xl">DX12 / VK</div>
              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Render Engine</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-teal-300 font-black text-xl sm:text-2xl">{featuredGame.testedSpecs.latency}</div>
              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">System Latency</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-neon-yellow font-black text-xl sm:text-2xl">{featuredGame.testedSpecs.vramUsed.split(' / ')[0]}</div>
              <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">VRAM Allocation</div>
            </div>
          </div>
        </div>

        {/* Featured Benchmark Section */}
        <div id="featured-benchmark" className="mb-20 scroll-mt-28">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-wider text-white">
                Benchmark Profile: {featuredGame.name}
              </h2>
            </div>
            
            {/* Interactive Game Selection Switcher */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-full">
              {TESTED_GAMES_LIST.map((game) => {
                const isActive = game.id === selectedGameId;
                return (
                  <button
                    key={game.id}
                    onClick={() => handleSelectGame(game.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {game.name}
                  </button>
                );
              })}
            </div>
          </div>

          <motion.div
            key={featuredGame.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-3xl bg-[#0c0d12] border border-white/15 p-6 sm:p-10 shadow-2xl overflow-hidden group"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-green/10 blur-[100px] pointer-events-none rounded-full" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              
              {/* Left Column: Game Info & Metrics */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-neon-green uppercase tracking-widest mb-2">
                    <ShieldCheck className="w-4 h-4" /> {featuredGame.publisher} • {featuredGame.api}
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black font-display text-white uppercase tracking-tight">
                    {featuredGame.name}
                  </h3>
                  <p className="text-gray-400 text-xs font-mono mt-2 leading-relaxed">
                    Full hardware audit and AI optimization benchmark. Mission Control verified 4K Ray Tracing, DLSS Super Resolution, Frame Generation, and Reflex latency tuning.
                  </p>
                </div>

                {/* Tested Specs Grid - Actual Captured Data */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Avg FPS</div>
                    <div className="text-xl font-black text-neon-green">{featuredGame.testedSpecs.avgFps}</div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Input Latency</div>
                    <div className="text-xl font-black text-emerald-400">{featuredGame.testedSpecs.latency}</div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">VRAM Allocation</div>
                    <div className="text-sm font-bold text-white">{featuredGame.testedSpecs.vramUsed}</div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">GPU Usage</div>
                    <div className="text-sm font-bold text-neon-yellow">{featuredGame.testedSpecs.gpuLoad}</div>
                  </div>
                </div>

                {/* Key Technologies Verified */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">Verified Key Technologies</div>
                  <div className="flex flex-wrap gap-2">
                    {featuredGame.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green text-[11px] font-mono font-bold uppercase tracking-tight"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {feat.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Presets breakdown */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 font-mono text-xs">
                  <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-neon-green" /> Recommended Mission Control Presets
                  </div>
                  <div className="space-y-1.5 text-gray-300 text-[11px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400">RTX 40 / 50 Series:</span>
                      <span className="font-bold text-neon-green">{featuredGame.presets.rtx40}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400">RTX 30 Series:</span>
                      <span className="font-bold text-emerald-400">{featuredGame.presets.rtx30}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">GTX 10 / 16 Series:</span>
                      <span className="font-bold text-neon-yellow">{featuredGame.presets.gtx}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Screenshot Gallery Preview */}
              <div className="lg:col-span-7 space-y-4">
                <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Captured 4K In-Engine Screenshots</span>
                  <span className="text-gray-500 text-[10px]">Click any image to enlarge</span>
                </div>

                {/* Primary Large Screenshot */}
                {featuredGame.screenshots.length > 0 && (
                  <div 
                    onClick={() => setSelectedImage(featuredGame.screenshots[0])}
                    className="relative aspect-video rounded-2xl overflow-hidden border border-white/15 bg-black cursor-pointer group/img shadow-2xl"
                  >
                    <img
                      src={featuredGame.screenshots[0].src}
                      alt={featuredGame.screenshots[0].title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div>
                        <div className="text-white font-mono text-xs font-bold flex items-center gap-2">
                          <Maximize2 className="w-3.5 h-3.5 text-neon-green" />
                          {featuredGame.screenshots[0].title}
                        </div>
                        <div className="text-gray-400 font-mono text-[10px] line-clamp-1">
                          {featuredGame.screenshots[0].desc}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Secondary Screenshots Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {featuredGame.screenshots.slice(1).map((ss, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(ss)}
                      className="relative aspect-video rounded-xl overflow-hidden border border-white/15 bg-black cursor-pointer group/img shadow-lg"
                    >
                      <img
                        src={ss.src}
                        alt={ss.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                        <div className="text-white font-mono text-[11px] font-bold truncate flex items-center gap-1.5">
                          <Maximize2 className="w-3 h-3 text-neon-green shrink-0" />
                          <span className="truncate">{ss.title}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          </motion.div>
        </div>

        {/* Verified Tested Games Library Grid */}
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-2xl font-black font-display uppercase tracking-wider text-white">
                Verified Tested Games
              </h2>
              <p className="text-gray-400 text-xs font-mono">
                Verified compatibility profiles, actual VRAM footprints, system latency, and GPU loads tested by Mission Control.
              </p>
            </div>
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => {
              const isSelected = game.id === selectedGameId;
              return (
                <div
                  key={game.id}
                  className={`p-6 rounded-2xl bg-[#0b0c10] border transition-all duration-300 flex flex-col justify-between space-y-4 group ${
                    isSelected ? "border-neon-green shadow-[0_0_20px_rgba(118,185,0,0.15)]" : "border-white/10 hover:border-neon-green/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5 text-neon-green" /> {game.genre}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-neon-green bg-neon-green/10 px-2 py-0.5 rounded border border-neon-green/30 uppercase">
                        {game.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-black font-display text-white uppercase tracking-tight group-hover:text-neon-green transition-colors">
                      {game.name}
                    </h3>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">Target FPS:</span>
                        <span className="font-bold text-neon-green">{game.fps}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">VRAM Footprint:</span>
                        <span className="font-bold text-white">{game.vram}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">GPU Usage & Latency:</span>
                        <span className="font-bold text-emerald-400">{game.gpuLoad} | {game.latency}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">Recommended Preset:</span>
                        <span className="font-bold text-neon-yellow">{game.preset}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Key Technologies</div>
                      <div className="flex flex-wrap gap-1.5">
                        {game.keyTech.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 text-[10px] font-mono font-bold"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500 text-[10px]">Verified by Mission Control</span>
                    <button
                      onClick={() => handleSelectGame(game.id)}
                      className="text-neon-green hover:underline flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                    >
                      View Profile <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Download Banner */}
        <div className="mt-20 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-neon-green/15 via-emerald-500/10 to-transparent border border-neon-green/30 text-center space-y-4 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black font-display uppercase text-white tracking-tight">
              Ready to Optimize Your PC for Tested Games?
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm font-mono">
              Download Mission Control to automatically detect installed games, configure hardware presets, and monitor thermals in real time.
            </p>
            <div className="pt-2 flex justify-center">
              <a
                href={WINDOWS_INSTALLER_URL}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-green text-obsidian font-black font-mono text-xs uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_30px_rgba(118,185,0,0.5)]"
              >
                <Download className="w-4 h-4" /> Download Mission Control
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Full-Screen Sharp Lightbox Modal for Screenshots */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
              onClick={() => setSelectedImage(null)}
            />

            {/* Close Button */}
            <button
              type="button"
              className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50 text-gray-300 hover:text-white bg-black/60 hover:bg-white/20 border border-white/20 rounded-full p-3 transition-all cursor-pointer shadow-xl"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              title="Close image view (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center pointer-events-auto"
            >
              <img
                src={selectedImage.src}
                alt={selectedImage.title}
                className="max-w-[95vw] max-h-[82vh] w-auto h-auto object-contain rounded-2xl border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
              />
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between w-full px-3 text-xs font-mono gap-2 text-gray-300">
                <div>
                  <span className="font-bold text-white text-sm">{selectedImage.title}</span>
                  <p className="text-gray-400 text-[11px] font-normal">{selectedImage.desc}</p>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-neon-green hover:underline cursor-pointer font-bold shrink-0 text-xs"
                >
                  Click anywhere or press Esc to close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
