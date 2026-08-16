"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  ChevronDown,
  Play,
  Pause,
  BookOpen,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Star,
  ThumbsUp,
  MessageSquare,
  Plus,
  Users,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WINDOWS_INSTALLER_URL, LINUX_INSTALLER_URL, AUTO_DOWNLOAD_URL } from "@/lib/download";
import { BENCHMARK_PROFILES, TESTED_GAMES_LIST, getBenchmarkProfileById, TestedGameSummary, BenchmarkProfile } from "@/data/benchmarks";
import RateGameModal from "@/components/RateGameModal";

export default function GamesTestedPage() {
  const [selectedGameId, setSelectedGameId] = useState<string>("spiderman2");
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [filterGenre, setFilterGenre] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"featured" | "fps" | "latency" | "name">("featured");
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const genreScrollRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Live MongoDB Benchmarks & Ratings State
  const [gamesList, setGamesList] = useState<TestedGameSummary[]>(TESTED_GAMES_LIST);
  const [profiles, setProfiles] = useState<Record<string, BenchmarkProfile>>(BENCHMARK_PROFILES);
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState<{
    averageRating: number;
    totalRatings: number;
    recommendationRate: number;
    avgReportedFps: number;
    distribution: { [key: number]: number };
  } | null>(null);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState<boolean>(false);
  const [votedReviewIds, setVotedReviewIds] = useState<string[]>([]);
  const [sortByReview, setSortByReview] = useState<"top" | "latest">("top");

  type OS = "windows" | "linux" | "mac" | "other" | null;
  const [os, setOs] = useState<OS>(null);

  const featuredGame = profiles[selectedGameId] || getBenchmarkProfileById(selectedGameId);
  const screenshots = featuredGame.screenshots || [];

  const fetchBenchmarks = async () => {
    try {
      const res = await fetch("/api/benchmarks");
      if (res.ok) {
        const data = await res.json();
        if (data.profiles) setProfiles(data.profiles);
        if (data.testedGames) setGamesList(data.testedGames);
      }
    } catch (e) {
      console.warn("Failed to fetch live benchmarks from API:", e);
    }
  };

  const fetchRatings = async (gameId: string) => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/benchmarks/ratings?gameId=${gameId}&sortBy=${sortByReview}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.ratings || []);
        setRatingStats(data.summary || null);
      }
    } catch (e) {
      console.warn("Failed to fetch live game ratings:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
    const storedVoted = localStorage.getItem("aero_voted_reviews");
    if (storedVoted) {
      try {
        setVotedReviewIds(JSON.parse(storedVoted));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      fetchRatings(selectedGameId);
    }
  }, [selectedGameId, sortByReview]);

  const handleVoteReview = async (reviewId: string) => {
    if (votedReviewIds.includes(reviewId)) return;

    try {
      const voterId = localStorage.getItem("aero_voter_id") || `voter_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("aero_voter_id", voterId);

      const res = await fetch("/api/benchmarks/ratings/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratingId: reviewId, voterId }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, upvotes: data.upvotes || r.upvotes + 1 } : r))
        );
        const newVoted = [...votedReviewIds, reviewId];
        setVotedReviewIds(newVoted);
        localStorage.setItem("aero_voted_reviews", JSON.stringify(newVoted));
      }
    } catch (e) {
      console.error("Failed to vote for review:", e);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Handle Keyboard Shortcuts
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

  // Dynamically compute all unique genres and their counts
  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>();
    gamesList.forEach((g) => {
      const parts = g.genre.split("/").map((p) => p.trim().toUpperCase());
      parts.forEach((gen) => {
        if (gen) {
          counts.set(gen, (counts.get(gen) || 0) + 1);
        }
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [gamesList]);

  // Filter and Sort Games (Optimized for 100,000+ games)
  const filteredAndSortedGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = gamesList.filter((g) => {
      const matchesGenre =
        filterGenre === "ALL" ||
        g.genre.toUpperCase().includes(filterGenre);
      const matchesSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.publisher.toLowerCase().includes(q) ||
        g.api.toLowerCase().includes(q);
      return matchesGenre && matchesSearch;
    });

    if (sortBy === "fps") {
      return result.sort((a, b) => (parseInt(b.fps) || 0) - (parseInt(a.fps) || 0));
    } else if (sortBy === "latency") {
      return result.sort((a, b) => (parseFloat(a.latency) || 0) - (parseFloat(b.latency) || 0));
    } else if (sortBy === "name") {
      return result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [gamesList, filterGenre, searchQuery, sortBy]);

  const paginatedGames = useMemo(() => {
    return filteredAndSortedGames.slice(0, visibleCount);
  }, [filteredAndSortedGames, visibleCount]);

  const scrollGenres = (direction: "left" | "right") => {
    if (genreScrollRef.current) {
      const scrollAmount = direction === "left" ? -200 : 200;
      genreScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const currentSlide = slideshowIndex !== null && screenshots[slideshowIndex] ? screenshots[slideshowIndex] : null;

  return (
    <div className="min-h-screen bg-[#070709] text-white pt-20 sm:pt-24 pb-16 sm:pb-20 selection:bg-neon-green selection:text-black overflow-x-hidden w-full max-w-full">
      {/* Background Glow Accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[350px] sm:h-[500px] bg-neon-green/5 blur-[90px] sm:blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-0 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-purple-500/5 blur-[100px] sm:blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 relative z-10 w-full overflow-hidden">
        
        {/* Header / Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(118,185,0,0.2)] max-w-full truncate">
            <Gamepad2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Hardware Compatibility Audit</span>
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-white uppercase leading-tight break-words px-1">
            Tested Games & <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-emerald-400 to-teal-300 drop-shadow-[0_0_25px_rgba(118,185,0,0.4)]">Performance Benchmarks</span>
          </h1>

          <p className="text-gray-400 text-xs sm:text-sm md:text-base font-mono max-w-2xl mx-auto leading-relaxed px-2 break-words">
            Real-world gaming benchmarks, NVIDIA DLSS / Frame Generation telemetry, and AI-driven preset recommendations tested by Mission Control.
          </p>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-6 max-w-3xl mx-auto font-mono w-full">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-neon-green font-black text-lg sm:text-2xl truncate">100%</div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">Local Verified</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-emerald-400 font-black text-lg sm:text-2xl truncate">DX12 / VK</div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">Render Engine</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-teal-300 font-black text-lg sm:text-2xl truncate">{featuredGame.testedSpecs.latency}</div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">System Latency</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-neon-yellow font-black text-lg sm:text-2xl truncate">{featuredGame.testedSpecs.vramUsed.split(' / ')[0]}</div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">VRAM Memory</div>
            </div>
          </div>
        </div>

        {/* Featured Benchmark Section */}
        <div id="featured-benchmark" className="mb-14 sm:mb-20 scroll-mt-24 sm:scroll-mt-28">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-black font-display uppercase tracking-wider text-white break-words">
                Benchmark Profile: <span className="text-neon-green">{featuredGame.name}</span>
              </h2>
            </div>
          </div>

          <motion.div
            key={featuredGame.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl sm:rounded-3xl bg-[#0c0d12] border border-white/15 p-4 sm:p-8 lg:p-10 shadow-2xl overflow-hidden group"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-neon-green/10 blur-[80px] sm:blur-[100px] pointer-events-none rounded-full" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
              
              {/* Left Column: Game Info & Metrics */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-6">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-bold text-neon-green uppercase tracking-widest mb-2 flex-wrap">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> <span>{featuredGame.publisher}</span> • <span>{featuredGame.api}</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black font-display text-white uppercase tracking-tight break-words">
                    {featuredGame.name}
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm font-sans mt-2.5 sm:mt-3 leading-relaxed border-l-2 border-neon-green/40 pl-2.5 sm:pl-3 break-words">
                    {featuredGame.overview}
                  </p>
                </div>

                {/* Tested Specs Grid - Actual Captured Data */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 font-mono">
                  <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">Avg FPS</div>
                    <div className="text-lg sm:text-xl font-black text-neon-green truncate">{featuredGame.testedSpecs.avgFps}</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">Input Latency</div>
                    <div className="text-lg sm:text-xl font-black text-emerald-400 truncate">{featuredGame.testedSpecs.latency}</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">VRAM Allocation</div>
                    <div className="text-xs sm:text-sm font-bold text-white truncate">{featuredGame.testedSpecs.vramUsed}</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">GPU Usage</div>
                    <div className="text-xs sm:text-sm font-bold text-neon-yellow truncate">{featuredGame.testedSpecs.gpuLoad}</div>
                  </div>
                </div>

                {/* Key Technologies Verified */}
                <div className="space-y-2">
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">Verified Key Technologies</div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {featuredGame.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-tight"
                      >
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{feat.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Presets breakdown */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 font-mono text-xs">
                  <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-[11px] sm:text-xs">
                    <Sliders className="w-3.5 h-3.5 text-neon-green shrink-0" /> <span>Recommended Presets</span>
                  </div>
                  <div className="space-y-1.5 text-gray-300 text-[10px] sm:text-[11px]">
                    <div className="flex flex-col xs:flex-row xs:justify-between border-b border-white/5 pb-1 gap-0.5">
                      <span className="text-gray-400">RTX 40 / 50:</span>
                      <span className="font-bold text-neon-green break-words">{featuredGame.presets.rtx40}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between border-b border-white/5 pb-1 gap-0.5">
                      <span className="text-gray-400">RTX 30:</span>
                      <span className="font-bold text-emerald-400 break-words">{featuredGame.presets.rtx30}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5">
                      <span className="text-gray-400">GTX 10 / 16:</span>
                      <span className="font-bold text-neon-yellow break-words">{featuredGame.presets.gtx}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Screenshot Gallery Preview */}
              <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                <div className="text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Captured 4K Screenshots</span>
                  <span className="text-neon-green text-[10px] font-bold flex items-center gap-1">
                    <Play className="w-2.5 h-2.5 fill-neon-green" /> Interactive Slideshow
                  </span>
                </div>

                {/* Primary Large Screenshot */}
                {screenshots.length > 0 && (
                  <div 
                    onClick={() => openSlideshow(0)}
                    className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-white/15 bg-black cursor-pointer group/img shadow-2xl"
                  >
                    <img
                      src={screenshots[0].src}
                      alt={screenshots[0].title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 sm:p-4">
                      <div className="w-full flex items-end justify-between gap-2">
                        <div>
                          <div className="text-white font-mono text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2">
                            <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neon-green shrink-0" />
                            <span className="truncate">{screenshots[0].title}</span>
                          </div>
                          <div className="text-gray-400 font-mono text-[9px] sm:text-[10px] line-clamp-1">
                            {screenshots[0].desc}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-neon-green/20 border border-neon-green/40 text-neon-green text-[9px] sm:text-[10px] font-mono font-bold flex items-center gap-1 shrink-0">
                          <Play className="w-2 h-2 fill-neon-green" /> View
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Secondary Screenshots Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {screenshots.slice(1).map((ss, idx) => (
                    <div
                      key={idx}
                      onClick={() => openSlideshow(idx + 1)}
                      className="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-white/15 bg-black cursor-pointer group/img shadow-lg"
                    >
                      <img
                        src={ss.src}
                        alt={ss.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 sm:p-3">
                        <div className="text-white font-mono text-[10px] sm:text-[11px] font-bold truncate flex items-center gap-1 sm:gap-1.5">
                          <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neon-green shrink-0" />
                          <span className="truncate">{ss.title}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Storefront Deep-Dive Inspiration Section */}
              {featuredGame.detailedOverview && (
                <div className="col-span-1 lg:col-span-12 mt-6 sm:mt-10 pt-6 sm:pt-10 border-t border-white/15 space-y-8 sm:space-y-12">
                  
                  {/* Section 1: Cinematic Story & Narrative */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-lg sm:text-3xl font-black font-display text-amber-300 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,0.35)] break-words">
                        A Thrilling Cinematic Narrative
                      </h4>
                      <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shrink-0">
                        <BookOpen className="w-3 h-3" /> Overview
                      </span>
                    </div>

                    <p className="text-gray-300 text-xs sm:text-base font-sans leading-relaxed max-w-4xl break-words">
                      {featuredGame.detailedOverview.story}
                    </p>

                    {/* Cinematic Story Image Banner */}
                    {screenshots.length > 0 && (
                      <div 
                        onClick={() => openSlideshow(0)}
                        className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden border border-amber-400/20 bg-black/60 shadow-2xl cursor-pointer group/banner mt-2 sm:mt-4"
                      >
                        <img
                          src={screenshots[0].src}
                          alt={featuredGame.name}
                          className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col sm:flex-row items-start sm:items-end justify-between p-3 sm:p-6 gap-2">
                          <div className="text-white font-mono text-[11px] sm:text-sm font-bold flex items-center gap-1.5">
                            <Maximize2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span className="truncate">{screenshots[0].title}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shrink-0">
                            <Play className="w-2.5 h-2.5 fill-amber-300" /> Preview
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Core Gameplay Loop & Dynamic Traversal */}
                  <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-lg sm:text-3xl font-black font-display text-emerald-400 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(52,211,153,0.35)] break-words">
                        Dynamic Gameplay & Combat Systems
                      </h4>
                      <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shrink-0">
                        <Zap className="w-3 h-3" /> Systems
                      </span>
                    </div>

                    <p className="text-gray-300 text-xs sm:text-base font-sans leading-relaxed max-w-4xl break-words">
                      {featuredGame.detailedOverview.gameplayLoop}
                    </p>

                    {/* Cinematic Gameplay Loop Banner */}
                    {screenshots.length > 1 && (
                      <div 
                        onClick={() => openSlideshow(1)}
                        className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden border border-emerald-400/20 bg-black/60 shadow-2xl cursor-pointer group/banner mt-2 sm:mt-4"
                      >
                        <img
                          src={screenshots[1].src}
                          alt={featuredGame.name}
                          className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col sm:flex-row items-start sm:items-end justify-between p-3 sm:p-6 gap-2">
                          <div className="text-white font-mono text-[11px] sm:text-sm font-bold flex items-center gap-1.5">
                            <Maximize2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{screenshots[1].title}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-400/20 border border-emerald-400/40 text-emerald-400 text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shrink-0">
                            <Play className="w-2.5 h-2.5 fill-emerald-400" /> In-Engine Action
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Signature Gameplay Mechanics Grid */}
                  <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-neon-yellow shrink-0" />
                      <h4 className="text-lg sm:text-2xl font-black font-display text-white uppercase tracking-wider break-words">
                        Signature Mechanics & Combat Innovations
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {featuredGame.detailedOverview.keyMechanics.map((mech, idx) => (
                        <div key={idx} className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 hover:border-neon-yellow/40 transition-colors font-mono space-y-1.5 sm:space-y-2 group/card">
                          <div className="text-neon-yellow font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(250,204,21,0.8)] shrink-0" />
                            <span className="truncate">{mech.name}</span>
                          </div>
                          <p className="text-gray-300 text-xs sm:text-sm font-sans leading-relaxed break-words">
                            {mech.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4: Community Hardware Telemetry & Rig Reviews (MongoDB Live Data) */}
                  <div className="space-y-6 pt-4 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-neon-green uppercase tracking-widest">
                          <Users className="w-4 h-4 text-neon-green shrink-0" /> Community Telemetry & Rig Audits
                        </div>
                        <h4 className="text-lg sm:text-2xl font-black font-display text-white uppercase tracking-wider">
                          Player Ratings & Hardware Logs
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsRateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-neon-green text-obsidian font-mono text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_20px_rgba(118,185,0,0.4)] cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Rate Game / Log Rig</span>
                      </button>
                    </div>

                    {/* Community Metrics Summary Card */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Community Score</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl sm:text-3xl font-black text-amber-400">
                            {ratingStats?.averageRating ? ratingStats.averageRating.toFixed(1) : "4.9"}
                          </span>
                          <span className="text-xs text-gray-500 font-bold">/ 5.0</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                          {"★".repeat(Math.floor(ratingStats?.averageRating || 5))}
                          {"☆".repeat(5 - Math.floor(ratingStats?.averageRating || 5))}
                          <span className="text-gray-400 text-[10px] ml-1">
                            ({ratingStats?.totalRatings || reviews.length} logs)
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Recommendation</span>
                        <div className="text-2xl sm:text-3xl font-black text-neon-green">
                          {ratingStats?.recommendationRate ?? 98}%
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate">
                          Verified with Mission Control
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Avg Community FPS</span>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                          {ratingStats?.avgReportedFps || 84} FPS
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate">
                          Captured across player rigs
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Telemetry Engine</span>
                        <div className="text-base sm:text-lg font-bold text-white truncate">
                          DirectX 12 / Vulkan
                        </div>
                        <span className="text-[10px] text-neon-green block truncate">
                          Zero-Latency Local Overlay
                        </span>
                      </div>
                    </div>

                    {/* Star Rating Distribution Bar Chart */}
                    {ratingStats && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 font-mono">
                        <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                          Rating Score Distribution
                        </div>
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = ratingStats.distribution[star] || 0;
                          const pct = ratingStats.totalRatings > 0 ? (count / ratingStats.totalRatings) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-3 text-xs">
                              <span className="w-10 text-gray-400 font-bold flex items-center gap-0.5 shrink-0">
                                {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-neon-green rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-12 text-right text-gray-400 text-[11px] shrink-0 font-bold">
                                {count} ({Math.round(pct)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Community Reviews Feed Header */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <div className="text-xs font-bold text-gray-300 uppercase font-mono flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-neon-green" /> Verified Operator Reviews ({reviews.length})
                      </div>
                      <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-xl p-1 text-[11px] font-mono">
                        <button
                          type="button"
                          onClick={() => setSortByReview("top")}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            sortByReview === "top"
                              ? "bg-neon-green text-obsidian font-bold"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          Most Helpful
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortByReview("latest")}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            sortByReview === "latest"
                              ? "bg-neon-green text-obsidian font-bold"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          Latest
                        </button>
                      </div>
                    </div>

                    {/* Reviews List */}
                    {loadingReviews ? (
                      <div className="py-8 text-center text-xs font-mono text-gray-400 space-y-2">
                        <div className="w-6 h-6 border-2 border-neon-green border-t-transparent rounded-full animate-spin mx-auto" />
                        <p>Loading verified community telemetry logs...</p>
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 font-mono">
                        <Star className="w-8 h-8 text-gray-600 mx-auto" />
                        <div className="text-sm font-bold text-white uppercase">No Community Logs Yet</div>
                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                          Be the first pilot to benchmark your GPU rig and log performance telemetry for {featuredGame.name}.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsRateModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-neon-green text-obsidian font-bold text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer"
                        >
                          Submit First Review
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reviews.map((rev) => {
                          const hasVoted = votedReviewIds.includes(rev.id);
                          return (
                            <div
                              key={rev.id}
                              className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-3 font-mono flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                {/* Reviewer Header */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green text-xs font-bold uppercase">
                                      {rev.userName ? rev.userName[0] : "A"}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                                        {rev.userName}
                                      </div>
                                      <span className="text-[10px] text-gray-500">
                                        {new Date(rev.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                                    {"★".repeat(rev.rating)}
                                    <span className="text-[10px] font-bold text-gray-300 ml-1">
                                      {rev.rating}.0
                                    </span>
                                  </div>
                                </div>

                                {/* Title & Body */}
                                <div>
                                  <h5 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wide leading-snug">
                                    {rev.title}
                                  </h5>
                                  <p className="text-xs text-gray-300 font-sans leading-relaxed mt-1 line-clamp-4">
                                    {rev.review}
                                  </p>
                                </div>

                                {/* Rig Specs Pill Badges */}
                                <div className="flex flex-wrap gap-1.5 text-[10px] pt-1">
                                  {rev.specs?.gpu && (
                                    <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-[200px]">
                                      <Tv className="w-2.5 h-2.5 text-neon-green shrink-0" />
                                      <span className="truncate">{rev.specs.gpu}</span>
                                    </span>
                                  )}
                                  {rev.specs?.cpu && (
                                    <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-[200px]">
                                      <Cpu className="w-2.5 h-2.5 text-neon-green shrink-0" />
                                      <span className="truncate">{rev.specs.cpu}</span>
                                    </span>
                                  )}
                                  {rev.specs?.fpsReported && (
                                    <span className="px-2 py-0.5 rounded-md bg-neon-green/10 border border-neon-green/30 text-neon-green font-bold flex items-center gap-1 shrink-0">
                                      <Zap className="w-2.5 h-2.5 shrink-0" />
                                      {rev.specs.fpsReported} FPS {rev.specs.resolution ? `@ ${rev.specs.resolution.split(' ')[0]}` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Upvote & Helpful Section */}
                              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] text-gray-500">
                                  {rev.recommend ? "✓ Recommended" : "Review Log"}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleVoteReview(rev.id)}
                                  disabled={hasVoted}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    hasVoted
                                      ? "bg-neon-green/20 text-neon-green border border-neon-green/40 cursor-default"
                                      : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
                                  }`}
                                >
                                  <ThumbsUp className={`w-3 h-3 ${hasVoted ? "fill-neon-green text-neon-green" : ""}`} />
                                  <span>{hasVoted ? "Helpful" : "Helpful"} ({rev.upvotes || 0})</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </motion.div>
        </div>

        {/* Verified Tested Games Library Grid & Scalable Filter */}
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 border-b border-white/10 pb-4 sm:pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-neon-green uppercase tracking-widest mb-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" /> Microsoft Store-Style Live Previews
              </div>
              <h2 className="text-xl sm:text-3xl font-black font-display uppercase tracking-wider text-white break-words">
                Verified Tested Games Library
              </h2>
              <p className="text-gray-400 text-xs font-mono mt-1 break-words">
                Hover over any game to trigger animated previews, real-time FPS benchmarks, and hardware telemetry.
              </p>
            </div>

            {/* Quick Stats Counter */}
            <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
              <span>Showing <strong className="text-neon-green">{paginatedGames.length}</strong> of <strong className="text-white">{filteredAndSortedGames.length}</strong> tested games</span>
            </div>
          </div>

          {/* Unified Search, Sort & Scalable Horizontal Genre Bar */}
          <div className="space-y-3 sm:space-y-4 bg-white/[0.02] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 backdrop-blur-md w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(12);
                  }}
                  placeholder="Search 100,000+ games..."
                  className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-black/60 border border-white/15 focus:border-neon-green rounded-xl text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Custom Glassmorphic Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-full sm:w-auto" ref={sortDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="w-full sm:w-auto justify-between bg-black/70 hover:bg-black/90 border border-white/15 hover:border-neon-green/50 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {sortBy === "featured" && <Sparkles className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                      {sortBy === "fps" && <Zap className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                      {sortBy === "latency" && <Activity className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                      {sortBy === "name" && <ArrowUpDown className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                      <span className="truncate">
                        {sortBy === "featured" && "Featured"}
                        {sortBy === "fps" && "Highest FPS"}
                        {sortBy === "latency" && "Lowest Latency"}
                        {sortBy === "name" && "Title (A-Z)"}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${isSortOpen ? "rotate-180 text-neon-green" : ""}`} />
                  </button>

                  {/* Dropdown Menu Popup */}
                  <AnimatePresence>
                    {isSortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-full sm:w-56 bg-[#0c0d12]/95 border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl py-1.5 z-50 overflow-hidden"
                      >
                        <div className="px-3.5 py-1.5 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
                          Sort Tested Library
                        </div>

                        {[
                          { value: "featured", label: "Featured Benchmarks", icon: Sparkles },
                          { value: "fps", label: "Highest FPS", icon: Zap },
                          { value: "latency", label: "Lowest Latency", icon: Activity },
                          { value: "name", label: "Title (A-Z)", icon: ArrowUpDown }
                        ].map((opt) => {
                          const isCurrent = sortBy === opt.value;
                          const IconComp = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSortBy(opt.value as any);
                                setIsSortOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                                isCurrent
                                  ? "bg-neon-green/15 text-neon-green border-l-2 border-neon-green"
                                  : "text-gray-300 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <IconComp className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-neon-green" : "text-gray-400"}`} />
                                <span className="truncate">{opt.label}</span>
                              </div>
                              {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Reset Filters Button */}
                {(filterGenre !== "ALL" || searchQuery || sortBy !== "featured") && (
                  <button
                    onClick={() => {
                      setFilterGenre("ALL");
                      setSearchQuery("");
                      setSortBy("featured");
                      setVisibleCount(12);
                    }}
                    className="px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scalable Horizontal-Scrolling Genre Bar with Arrows */}
            <div className="relative flex items-center group/genres pt-2 border-t border-white/5 w-full">
              <button
                onClick={() => scrollGenres("left")}
                className="hidden sm:flex absolute left-0 z-20 w-7 h-7 rounded-full bg-black/80 border border-white/20 items-center justify-center text-gray-300 hover:text-white hover:border-neon-green transition-all -translate-x-3 shadow-xl cursor-pointer"
                title="Scroll left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div
                ref={genreScrollRef}
                className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-0.5 py-1"
                style={{ scrollbarWidth: "none" }}
              >
                {/* 'ALL' Pill */}
                <button
                  onClick={() => {
                    setFilterGenre("ALL");
                    setVisibleCount(12);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterGenre === "ALL"
                      ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.5)]"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <span>ALL</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] ${filterGenre === "ALL" ? "bg-black/20 text-black" : "bg-white/10 text-gray-300"}`}>
                    {TESTED_GAMES_LIST.length}
                  </span>
                </button>

                {/* Dynamic Genre Pills */}
                {availableGenres.map(([genre, count]) => {
                  const isActive = filterGenre === genre;
                  return (
                    <button
                      key={genre}
                      onClick={() => {
                        setFilterGenre(genre);
                        setVisibleCount(12);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.5)]"
                          : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      <span>{genre}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] ${isActive ? "bg-black/20 text-black" : "bg-white/10 text-gray-300"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => scrollGenres("right")}
                className="hidden sm:flex absolute right-0 z-20 w-7 h-7 rounded-full bg-black/80 border border-white/20 items-center justify-center text-gray-300 hover:text-white hover:border-neon-green transition-all translate-x-3 shadow-xl cursor-pointer"
                title="Scroll right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Games Grid (Rendered with Paginated Slice for Max Performance) */}
          {paginatedGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedGames.map((game) => {
                const isSelected = game.id === selectedGameId;
                return (
                  <div
                    key={game.id}
                    className={`rounded-2xl sm:rounded-3xl bg-[#0b0c10] border transition-all duration-300 flex flex-col justify-between group overflow-hidden ${
                      isSelected ? "border-neon-green shadow-[0_0_30px_rgba(118,185,0,0.25)]" : "border-white/10 hover:border-neon-green/50 hover:shadow-[0_0_25px_rgba(118,185,0,0.15)] shadow-xl"
                    }`}
                  >
                    {/* Card Cover Header with Microsoft Store Hover Preview */}
                    <div className="relative h-40 sm:h-48 w-full overflow-hidden border-b border-white/10 group-hover:border-neon-green/30">
                      <img
                        src={game.coverImage}
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-black/20 to-black/40" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-gray-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/85 border border-white/20 backdrop-blur-md uppercase tracking-wider flex items-center gap-1 shadow-md truncate">
                          <Gamepad2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neon-green shrink-0" /> {game.genre.split('/')[0]}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300 bg-black/85 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-amber-400/30 uppercase backdrop-blur-md shadow-md shrink-0">
                          {game.storeRating || "4.9 ★★★★★"}
                        </span>
                      </div>

                      {/* Bottom Floating Live Telemetry Badge */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green text-[9px] sm:text-[10px] font-mono font-bold backdrop-blur-md flex items-center gap-1 shadow-lg truncate">
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-neon-green shrink-0" /> {game.fps}
                        </span>
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-black/80 border border-white/20 text-white text-[9px] sm:text-[10px] font-mono font-bold backdrop-blur-md truncate">
                          {game.dlssVersion || "Verified DX12"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-6 flex flex-col justify-between flex-1 space-y-3 sm:space-y-4">
                      <div className="space-y-2.5 sm:space-y-3">
                        <div>
                          <div className="text-[10px] sm:text-[11px] font-mono text-gray-400 font-bold uppercase tracking-wider mb-1 truncate">
                            {game.publisher}
                          </div>
                          <h3 className="text-lg sm:text-xl font-black font-display text-white uppercase tracking-tight group-hover:text-neon-green transition-colors line-clamp-1 break-words">
                            {game.name}
                          </h3>
                        </div>

                        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 sm:space-y-2 font-mono text-xs">
                          <div className="flex justify-between text-[10px] sm:text-[11px] border-b border-white/5 pb-1">
                            <span className="text-gray-400">Target Benchmark:</span>
                            <span className="font-black text-neon-green truncate">{game.fps}</span>
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-[11px] border-b border-white/5 pb-1">
                            <span className="text-gray-400">VRAM Allocation:</span>
                            <span className="font-bold text-white truncate">{game.vram}</span>
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-[11px] border-b border-white/5 pb-1">
                            <span className="text-gray-400">Latency & Load:</span>
                            <span className="font-bold text-emerald-400 truncate">{game.latency} • {game.gpuLoad}</span>
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-[11px]">
                            <span className="text-gray-400">Graphics API:</span>
                            <span className="font-bold text-teal-300 truncate">{game.api}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectGame(game.id)}
                        className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
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
          ) : (
            /* No Search Results Found State */
            <div className="p-8 sm:p-12 text-center rounded-2xl sm:rounded-3xl bg-[#0c0d12] border border-white/10 space-y-3 sm:space-y-4 max-w-lg mx-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display uppercase text-white break-words">No Matching Games Found</h3>
              <p className="text-gray-400 text-xs font-mono leading-relaxed break-words">
                We couldn&apos;t find any verified benchmark profiles matching &ldquo;<span className="text-neon-green">{searchQuery}</span>&rdquo; in the <span className="text-white">{filterGenre}</span> genre.
              </p>
              <button
                onClick={() => {
                  setFilterGenre("ALL");
                  setSearchQuery("");
                  setSortBy("featured");
                  setVisibleCount(12);
                }}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-neon-green text-obsidian font-mono text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-lg cursor-pointer"
              >
                Clear Search & Filters
              </button>
            </div>
          )}

          {/* Load More Button for 100k+ Games Scale */}
          {filteredAndSortedGames.length > visibleCount && (
            <div className="pt-6 sm:pt-8 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-neon-green hover:text-obsidian border border-white/15 hover:border-neon-green font-mono text-xs font-bold uppercase tracking-wider text-white transition-all shadow-xl cursor-pointer"
              >
                Load More Tested Games ({filteredAndSortedGames.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>

        {/* CTA Download Banner */}
        <div className="mt-12 sm:mt-20 p-5 sm:p-12 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-neon-green/15 via-emerald-500/10 to-transparent border border-neon-green/30 text-center space-y-3 sm:space-y-4 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-2 sm:space-y-3">
            <h2 className="text-lg xs:text-xl sm:text-3xl font-black font-display uppercase text-white tracking-tight break-words">
              Ready to Optimize Your PC for Tested Games?
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm font-mono break-words">
              Download Mission Control to automatically detect installed games, configure hardware presets, and monitor thermals in real time.
            </p>
            <div className="pt-2 flex justify-center">
              <a
                href={os === "linux" ? LINUX_INSTALLER_URL : (os === "windows" ? WINDOWS_INSTALLER_URL : AUTO_DOWNLOAD_URL)}
                suppressHydrationWarning
                className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-neon-green text-obsidian font-black font-mono text-xs uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_30px_rgba(118,185,0,0.5)]"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
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
            className="fixed inset-0 z-[100] flex flex-col justify-between p-2 sm:p-6 bg-black/95 backdrop-blur-xl selection:bg-neon-green selection:text-black overflow-hidden w-full h-full max-w-full max-h-full"
          >
            {/* Modal Header Controls */}
            <div className="relative z-50 flex items-center justify-between w-full max-w-7xl mx-auto font-mono text-xs gap-2 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <span className="font-bold text-white uppercase text-xs sm:text-sm font-display tracking-wider truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none">
                  {featuredGame.name}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-[11px] font-bold text-neon-green shrink-0">
                  {slideshowIndex + 1} / {screenshots.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                {/* Auto-Play Slideshow Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlaying
                      ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.6)]"
                      : "bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 hover:text-white"
                  }`}
                  title={isPlaying ? "Pause automatic slideshow (Space)" : "Initiate automatic slideshow (Space)"}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-obsidian" />
                      <span className="hidden xs:inline">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-neon-green" />
                      <span className="hidden xs:inline">Auto Slideshow</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  className="text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-1.5 sm:p-2.5 transition-all cursor-pointer shadow-xl"
                  onClick={closeSlideshow}
                  title="Close slideshow (Esc)"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Central Main Viewport with Prev / Next Buttons */}
            <div className="relative flex-1 flex items-center justify-center pt-3 sm:pt-10 pb-1 sm:pb-2 w-full max-w-7xl mx-auto overflow-hidden min-h-0">
              {/* Previous Slide Arrow Button */}
              {screenshots.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="absolute left-1 sm:left-4 z-40 p-2 sm:p-4 rounded-full bg-black/70 hover:bg-neon-green hover:text-obsidian border border-white/20 hover:border-neon-green text-white transition-all cursor-pointer shadow-2xl hover:scale-110"
                  title="Previous image (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-8 sm:h-8" />
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
                  className="max-w-[94vw] max-h-[44vh] sm:max-h-[56vh] flex items-center justify-center relative min-w-0"
                >
                  <img
                    src={currentSlide.src}
                    alt={currentSlide.title}
                    className="max-w-full max-h-[44vh] sm:max-h-[56vh] w-auto h-auto object-contain rounded-xl sm:rounded-2xl border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Next Slide Arrow Button */}
              {screenshots.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="absolute right-1 sm:right-4 z-40 p-2 sm:p-4 rounded-full bg-black/70 hover:bg-neon-green hover:text-obsidian border border-white/20 hover:border-neon-green text-white transition-all cursor-pointer shadow-2xl hover:scale-110"
                  title="Next image (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4 sm:w-8 sm:h-8" />
                </button>
              )}
            </div>

            {/* Bottom Section: Caption & Clickable Thumbnail Strip */}
            <div className="w-full max-w-5xl mx-auto space-y-1.5 sm:space-y-3 font-mono text-xs relative z-50 min-w-0 pb-1 sm:pb-0">
              {/* Slide Caption Details */}
              <div className="w-full min-w-0 bg-obsidian/90 border border-white/15 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 backdrop-blur-md overflow-hidden">
                <div className="w-full min-w-0">
                  <div className="text-white font-bold text-xs sm:text-base flex items-center gap-1.5 sm:gap-2 font-display uppercase tracking-wide min-w-0">
                    <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-green shrink-0" />
                    <span className="truncate block min-w-0">{currentSlide.title}</span>
                  </div>
                  <p className="text-gray-300 text-[10px] sm:text-xs font-mono mt-0.5 sm:mt-1 leading-relaxed max-w-3xl line-clamp-2 sm:line-clamp-none break-words">
                    {currentSlide.desc}
                  </p>
                </div>

                <div className="hidden sm:block text-[10px] text-gray-400 shrink-0 self-end sm:self-center font-mono">
                  Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">←</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">→</kbd> to navigate • <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20 text-white">Space</kbd> to pause
                </div>
              </div>

              {/* Interactive Thumbnail Strip */}
              {screenshots.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 sm:gap-3 overflow-x-auto py-1 no-scrollbar w-full max-w-full px-0.5">
                  {screenshots.map((ss, idx) => {
                    const isActive = idx === slideshowIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openSlideshow(idx)}
                        className={`relative w-14 xs:w-16 sm:w-24 h-9 xs:h-10 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden border transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? "border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.6)] scale-105"
                            : "border-white/20 opacity-50 hover:opacity-100 hover:border-white/40"
                        }`}
                        title={`Jump to slide ${idx + 1}: ${ss.title}`}
                      >
                        <img src={ss.src} alt={ss.title} className="w-full h-full object-cover" />
                        {isActive && (
                          <div className="absolute inset-0 bg-neon-green/10 border-2 border-neon-green pointer-events-none rounded-lg sm:rounded-xl" />
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

      {/* Interactive Rate Game & Submit Telemetry Modal */}
      <RateGameModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        onSuccess={() => {
          fetchRatings(selectedGameId);
          fetchBenchmarks();
        }}
        initialGameId={selectedGameId}
      />
    </div>
  );
}
