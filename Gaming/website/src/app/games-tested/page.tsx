"use client";

import { useState, useEffect, useCallback } from "react";
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
  Download,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WINDOWS_INSTALLER_URL, LINUX_INSTALLER_URL, AUTO_DOWNLOAD_URL } from "@/lib/download";
import { TESTED_GAMES_LIST, getBenchmarkProfileById } from "@/data/benchmarks";

export default function GamesTestedPage() {
  const [selectedGameId, setSelectedGameId] = useState<string>("spiderman2");
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [filterGenre, setFilterGenre] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  type OS = "windows" | "linux" | "mac" | "other" | null;
  const [os, setOs] = useState<OS>(null);

  const featuredGame = getBenchmarkProfileById(selectedGameId);
  const screenshots = featuredGame.screenshots || [];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = (window.navigator.userAgent || window.navigator.platform || "").toLowerCase();
      if (ua.includes("win")) setOs("windows");
      else if (ua.includes("linux") || ua.includes("x11")) setOs("linux");
      else if (ua.includes("mac")) setOs("mac");
      else setOs("other");

      const params = new URLSearchParams(window.location.search);
      const gameParam = params.get("game");
      if (gameParam && TESTED_GAMES_LIST.some((g) => g.id === gameParam)) {
        setSelectedGameId(gameParam);
      }
    }
  }, []);

  // Handle Auto-Play Slideshow Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (slideshowIndex !== null && isPlaying && screenshots.length > 0) {
      interval = setInterval(() => {
        setSlideshowIndex((prevIndex) => {
          if (prevIndex === null) return 0;
          return (prevIndex + 1) % screenshots.length;
        });
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [slideshowIndex, isPlaying, screenshots.length]);

  const handlePrevSlide = useCallback(() => {
    if (slideshowIndex === null || screenshots.length === 0) return;
    setSlideshowIndex((slideshowIndex - 1 + screenshots.length) % screenshots.length);
  }, [slideshowIndex, screenshots.length]);

  const handleNextSlide = useCallback(() => {
    if (slideshowIndex === null || screenshots.length === 0) return;
    setSlideshowIndex((slideshowIndex + 1) % screenshots.length);
  }, [slideshowIndex, screenshots.length]);

  // Handle Keyboard Shortcuts (Arrow Left/Right, Space for Play/Pause, Esc for Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slideshowIndex === null) return;

      if (e.key === "Escape") {
        setSlideshowIndex(null);
        setIsPlaying(false);
      } else if (e.key === "ArrowLeft") {
        handlePrevSlide();
      } else if (e.key === "ArrowRight") {
        handleNextSlide();
      } else if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slideshowIndex, handlePrevSlide, handleNextSlide]);

  const scrollToBenchmark = () => {
    const el = document.getElementById("featured-benchmark");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setSlideshowIndex(null);
    setIsPlaying(false);
    scrollToBenchmark();
  };

  const openSlideshow = (index: number) => {
    setSlideshowIndex(index);
    setIsPlaying(false);
  };

  const closeSlideshow = () => {
    setSlideshowIndex(null);
    setIsPlaying(false);
  };

  const filteredGames = TESTED_GAMES_LIST.filter(g => {
    const matchesGenre = filterGenre === "ALL" || g.genre.toUpperCase().includes(filterGenre);
    const matchesSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const currentSlide = slideshowIndex !== null && screenshots[slideshowIndex] ? screenshots[slideshowIndex] : null;

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
              <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-wider text-white">
                Benchmark Profile: {featuredGame.name}
              </h2>
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
                  <p className="text-gray-300 text-xs sm:text-sm font-sans mt-3 leading-relaxed border-l-2 border-neon-green/40 pl-3">
                    {featuredGame.overview}
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
                  <span className="text-neon-green text-[10px] font-bold flex items-center gap-1">
                    <Play className="w-3 h-3 fill-neon-green" /> Click image to launch interactive slideshow
                  </span>
                </div>

                {/* Primary Large Screenshot */}
                {screenshots.length > 0 && (
                  <div 
                    onClick={() => openSlideshow(0)}
                    className="relative aspect-video rounded-2xl overflow-hidden border border-white/15 bg-black cursor-pointer group/img shadow-2xl"
                  >
                    <img
                      src={screenshots[0].src}
                      alt={screenshots[0].title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div className="w-full flex items-end justify-between gap-2">
                        <div>
                          <div className="text-white font-mono text-xs font-bold flex items-center gap-2">
                            <Maximize2 className="w-3.5 h-3.5 text-neon-green" />
                            {screenshots[0].title}
                          </div>
                          <div className="text-gray-400 font-mono text-[10px] line-clamp-1">
                            {screenshots[0].desc}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-neon-green/20 border border-neon-green/40 text-neon-green text-[10px] font-mono font-bold flex items-center gap-1 shrink-0">
                          <Play className="w-2.5 h-2.5 fill-neon-green" /> Slideshow
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Secondary Screenshots Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {screenshots.slice(1).map((ss, idx) => (
                    <div
                      key={idx}
                      onClick={() => openSlideshow(idx + 1)}
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

              {/* Steam / Microsoft Store Storefront Deep-Dive Inspiration Section */}
              {featuredGame.detailedOverview && (
                <div className="col-span-1 lg:col-span-12 mt-10 pt-10 border-t border-white/15 space-y-12">
                  
                  {/* Section 1: Cinematic Story & Narrative */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-2xl sm:text-3xl font-black font-display text-amber-300 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,0.35)]">
                        A Thrilling Cinematic Narrative
                      </h4>
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" /> Story Overview
                      </span>
                    </div>

                    <p className="text-gray-300 text-sm sm:text-base font-sans leading-relaxed max-w-4xl">
                      {featuredGame.detailedOverview.story}
                    </p>

                    {/* Cinematic Story Image Banner */}
                    {screenshots.length > 0 && (
                      <div 
                        onClick={() => openSlideshow(0)}
                        className="relative w-full aspect-[21/9] sm:aspect-[24/9] rounded-2xl overflow-hidden border border-amber-400/20 bg-black/60 shadow-2xl cursor-pointer group/banner mt-4"
                      >
                        <img
                          src={screenshots[0].src}
                          alt={featuredGame.name}
                          className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-4 sm:p-6">
                          <div className="text-white font-mono text-xs sm:text-sm font-bold flex items-center gap-2">
                            <Maximize2 className="w-4 h-4 text-amber-300" />
                            <span>{screenshots[0].title}</span>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md">
                            <Play className="w-3 h-3 fill-amber-300" /> Cinematic Preview
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Core Gameplay Loop & Dynamic Traversal */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-2xl sm:text-3xl font-black font-display text-emerald-400 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(52,211,153,0.35)]">
                        Dynamic Gameplay & Combat Systems
                      </h4>
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                        <Zap className="w-3.5 h-3.5" /> Core Systems
                      </span>
                    </div>

                    <p className="text-gray-300 text-sm sm:text-base font-sans leading-relaxed max-w-4xl">
                      {featuredGame.detailedOverview.gameplayLoop}
                    </p>

                    {/* Cinematic Gameplay Loop Banner */}
                    {screenshots.length > 1 && (
                      <div 
                        onClick={() => openSlideshow(1)}
                        className="relative w-full aspect-[21/9] sm:aspect-[24/9] rounded-2xl overflow-hidden border border-emerald-400/20 bg-black/60 shadow-2xl cursor-pointer group/banner mt-4"
                      >
                        <img
                          src={screenshots[1].src}
                          alt={screenshots[1].title}
                          className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-4 sm:p-6">
                          <div className="text-white font-mono text-xs sm:text-sm font-bold flex items-center gap-2">
                            <Maximize2 className="w-4 h-4 text-emerald-400" />
                            <span>{screenshots[1].title}</span>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-400/20 border border-emerald-400/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md">
                            <Play className="w-3 h-3 fill-emerald-400" /> In-Engine Action
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Signature Gameplay Mechanics Grid */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-neon-yellow" />
                      <h4 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-wider">
                        Signature Mechanics & Combat Innovations
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {featuredGame.detailedOverview.keyMechanics.map((mech, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-neon-yellow/40 transition-colors font-mono space-y-2 group/card">
                          <div className="text-neon-yellow font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                            {mech.name}
                          </div>
                          <p className="text-gray-300 text-xs sm:text-sm font-sans leading-relaxed">
                            {mech.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </motion.div>
        </div>

        {/* Verified Tested Games Library Grid */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-neon-green uppercase tracking-widest mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Microsoft Store-Style Live Previews
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider text-white">
                Verified Tested Games Library
              </h2>
              <p className="text-gray-400 text-xs font-mono mt-1">
                Hover over any game to trigger animated gameplay previews, FPS metrics, and verified DLSS/Ray Tracing compatibility.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {["ALL", "ACTION", "OPEN WORLD", "RACING", "TACTICAL"].map((genre) => (
                <button
                  key={genre}
                  onClick={() => setFilterGenre(genre)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                    filterGenre === genre
                      ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game) => {
              const isSelected = game.id === selectedGameId;
              return (
                <div
                  key={game.id}
                  className={`rounded-3xl bg-[#0b0c10] border transition-all duration-300 flex flex-col justify-between group overflow-hidden ${
                    isSelected ? "border-neon-green shadow-[0_0_30px_rgba(118,185,0,0.25)]" : "border-white/10 hover:border-neon-green/50 hover:shadow-[0_0_25px_rgba(118,185,0,0.15)] shadow-xl"
                  }`}
                >
                  {/* Card Cover Header with Microsoft Store Hover Preview */}
                  <div className="relative h-48 w-full overflow-hidden border-b border-white/10 group-hover:border-neon-green/30">
                    <img
                      src={game.coverImage}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-black/20 to-black/40" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-gray-200 px-2.5 py-1 rounded-full bg-black/85 border border-white/20 backdrop-blur-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <Gamepad2 className="w-3 h-3 text-neon-green" /> {game.genre.split('/')[0]}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/85 px-2.5 py-1 rounded-full border border-amber-400/30 uppercase backdrop-blur-md shadow-md">
                        {game.storeRating || "4.9 ★★★★★"}
                      </span>
                    </div>

                    {/* Bottom Floating Live Telemetry Badge on Hover */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green text-[10px] font-mono font-bold backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                        <Zap className="w-3 h-3 fill-neon-green" /> {game.fps}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-white/20 text-white text-[10px] font-mono font-bold backdrop-blur-md">
                        {game.dlssVersion || "DLSS 4.0"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] font-mono text-gray-400 font-bold uppercase tracking-wider mb-1">
                          {game.publisher}
                        </div>
                        <h3 className="text-xl font-black font-display text-white uppercase tracking-tight group-hover:text-neon-green transition-colors line-clamp-1">
                          {game.name}
                        </h3>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 font-mono text-xs">
                        <div className="flex justify-between text-[11px] border-b border-white/5 pb-1">
                          <span className="text-gray-400">Target Benchmark:</span>
                          <span className="font-black text-neon-green">{game.fps}</span>
                        </div>
                        <div className="flex justify-between text-[11px] border-b border-white/5 pb-1">
                          <span className="text-gray-400">VRAM Allocation:</span>
                          <span className="font-bold text-white">{game.vram}</span>
                        </div>
                        <div className="flex justify-between text-[11px] border-b border-white/5 pb-1">
                          <span className="text-gray-400">Latency & Load:</span>
                          <span className="font-bold text-emerald-400">{game.latency} • {game.gpuLoad}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-gray-400">Graphics API:</span>
                          <span className="font-bold text-teal-300">{game.api}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectGame(game.id)}
                      className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                        isSelected
                          ? "bg-neon-green text-obsidian shadow-[0_0_20px_rgba(118,185,0,0.5)]"
                          : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 hover:border-neon-green/40"
                      }`}
                    >
                      <span className="truncate">{isSelected ? "Viewing Profile & Gallery" : "View Benchmark & Gameplay"}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
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
                href={os === "linux" ? LINUX_INSTALLER_URL : (os === "windows" ? WINDOWS_INSTALLER_URL : AUTO_DOWNLOAD_URL)}
                suppressHydrationWarning
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-green text-obsidian font-black font-mono text-xs uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_30px_rgba(118,185,0,0.5)]"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span suppressHydrationWarning>Download Mission Control {os === "linux" ? "(Linux)" : os === "windows" ? "(Windows)" : ""}</span>
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Full-Screen Interactive Slideshow Lightbox Modal */}
      <AnimatePresence>
        {slideshowIndex !== null && currentSlide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 bg-black/95 backdrop-blur-xl selection:bg-neon-green selection:text-black"
          >
            {/* Modal Header Controls */}
            <div className="relative z-50 flex items-center justify-between w-full max-w-7xl mx-auto font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white uppercase text-sm font-display tracking-wider">
                  {featuredGame.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-neon-green">
                  {slideshowIndex + 1} / {screenshots.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Auto-Play Slideshow Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    isPlaying
                      ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.6)]"
                      : "bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 hover:text-white"
                  }`}
                  title={isPlaying ? "Pause automatic slideshow (Space)" : "Initiate automatic slideshow (Space)"}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-obsidian" />
                      <span>Pause Slideshow</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-neon-green" />
                      <span>Initiate Auto Slideshow</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  className="text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2.5 transition-all cursor-pointer shadow-xl"
                  onClick={closeSlideshow}
                  title="Close slideshow (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Central Main Viewport with Prev / Next Buttons (Positioned lower with top clearance) */}
            <div className="relative flex-1 flex items-center justify-center pt-10 sm:pt-14 pb-2 w-full max-w-7xl mx-auto overflow-hidden">
              {/* Previous Slide Arrow Button */}
              {screenshots.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="absolute left-2 sm:left-4 z-40 p-3 sm:p-4 rounded-full bg-black/70 hover:bg-neon-green hover:text-obsidian border border-white/20 hover:border-neon-green text-white transition-all cursor-pointer shadow-2xl hover:scale-110"
                  title="Previous image (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}

              {/* Main Active Image Display */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideshowIndex}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="max-w-[92vw] max-h-[52vh] sm:max-h-[56vh] flex items-center justify-center relative"
                >
                  <img
                    src={currentSlide.src}
                    alt={currentSlide.title}
                    className="max-w-full max-h-[52vh] sm:max-h-[56vh] w-auto h-auto object-contain rounded-2xl border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Next Slide Arrow Button */}
              {screenshots.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="absolute right-2 sm:right-4 z-40 p-3 sm:p-4 rounded-full bg-black/70 hover:bg-neon-green hover:text-obsidian border border-white/20 hover:border-neon-green text-white transition-all cursor-pointer shadow-2xl hover:scale-110"
                  title="Next image (Right Arrow)"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}
            </div>

            {/* Bottom Section: Caption & Clickable Thumbnail Strip */}
            <div className="w-full max-w-5xl mx-auto space-y-3 font-mono text-xs relative z-50">
              {/* Slide Caption Details */}
              <div className="bg-obsidian/90 border border-white/15 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
                <div>
                  <div className="text-white font-bold text-sm sm:text-base flex items-center gap-2 font-display uppercase tracking-wide">
                    <Maximize2 className="w-4 h-4 text-neon-green" />
                    {currentSlide.title}
                  </div>
                  <p className="text-gray-300 text-xs font-mono mt-1 leading-relaxed max-w-3xl">
                    {currentSlide.desc}
                  </p>
                </div>

                <div className="text-[10px] text-gray-400 shrink-0 self-end sm:self-center font-mono">
                  Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">←</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">→</kbd> to navigate • <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">Space</kbd> to pause
                </div>
              </div>

              {/* Interactive Thumbnail Strip */}
              {screenshots.length > 1 && (
                <div className="flex items-center justify-center gap-3 overflow-x-auto py-1 no-scrollbar">
                  {screenshots.map((ss, idx) => {
                    const isActive = idx === slideshowIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openSlideshow(idx)}
                        className={`relative w-20 sm:w-24 h-12 sm:h-14 rounded-xl overflow-hidden border transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? "border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.6)] scale-105"
                            : "border-white/20 opacity-50 hover:opacity-100 hover:border-white/40"
                        }`}
                        title={`Jump to slide ${idx + 1}: ${ss.title}`}
                      >
                        <img src={ss.src} alt={ss.title} className="w-full h-full object-cover" />
                        {isActive && (
                          <div className="absolute inset-0 bg-neon-green/10 border-2 border-neon-green pointer-events-none rounded-xl" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
