"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Gamepad2, Search, Download, Sparkles } from "lucide-react";
import { WINDOWS_INSTALLER_URL, LINUX_INSTALLER_URL, AUTO_DOWNLOAD_URL } from "@/lib/download";
import {
  BENCHMARK_PROFILES,
  TESTED_GAMES_LIST,
  getBenchmarkProfileById,
  TestedGameSummary,
  BenchmarkProfile,
  fetchBenchmarks as fetchLiveBenchmarks,
} from "@/data/benchmarks";
import RateGameModal from "@/components/modals/RateGameModal";
import {
  TestedGameCard,
  TestedGamesFilterBar,
  FeaturedBenchmarkCard,
  GameplaySlideshowModal,
  SortOption,
} from "@/components/tested-games";

type OS = "windows" | "linux" | "mac" | "other" | null;

export default function GamesTestedClient() {
  const [selectedGameId, setSelectedGameId] = useState<string>(
    TESTED_GAMES_LIST[0]?.id || "re4"
  );
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [filterGenre, setFilterGenre] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [visibleCount, setVisibleCount] = useState<number>(12);

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
  const [os, setOs] = useState<OS>(null);

  const featuredGame = profiles[selectedGameId] || getBenchmarkProfileById(selectedGameId);
  const screenshots = featuredGame.screenshots || [];

  const fetchBenchmarks = async () => {
    try {
      const data = await fetchLiveBenchmarks();
      if (data.profiles && Object.keys(data.profiles).length > 0) {
        setProfiles(data.profiles);
      }
      if (data.testedGames && data.testedGames.length > 0) {
        setGamesList(data.testedGames);
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
      const voterId =
        localStorage.getItem("aero_voter_id") || `voter_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("aero_voter_id", voterId);

      const res = await fetch("/api/benchmarks/ratings/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratingId: reviewId, voterId }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, upvotes: data.upvotes || r.upvotes + 1 } : r
          )
        );
        const newVoted = [...votedReviewIds, reviewId];
        setVotedReviewIds(newVoted);
        localStorage.setItem("aero_voted_reviews", JSON.stringify(newVoted));
      }
    } catch (e) {
      console.error("Failed to vote for review:", e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = (window.navigator.userAgent || window.navigator.platform || "").toLowerCase();
      if (ua.includes("win")) setOs("windows");
      else if (ua.includes("linux") || ua.includes("x11")) setOs("linux");
      else if (ua.includes("mac")) setOs("mac");
      else setOs("other");

      const params = new URLSearchParams(window.location.search);
      const gameParam = params.get("game");
      if (
        gameParam &&
        (profiles[gameParam] ||
          gamesList.some((g) => g.id === gameParam) ||
          TESTED_GAMES_LIST.some((g) => g.id === gameParam))
      ) {
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

  // Filter and Sort Games
  const filteredAndSortedGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = gamesList.filter((g) => {
      const matchesGenre = filterGenre === "ALL" || g.genre.toUpperCase().includes(filterGenre);
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

  return (
    <div className="min-h-screen bg-[#070709] text-white pt-20 sm:pt-24 pb-16 sm:pb-20 selection:bg-neon-green selection:text-black overflow-x-hidden w-full max-w-full">
      {/* Background Glow Accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-150 sm:w-250 h-87.5 sm:h-125 bg-neon-green/5 blur-[90px] sm:blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-0 w-87.5 sm:w-150 h-87.5 sm:h-150 bg-purple-500/5 blur-[100px] sm:blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 relative z-10 w-full overflow-hidden">
        {/* Header / Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(118,185,0,0.2)] max-w-full truncate">
            <Gamepad2 className="w-3.5 h-3.5 shrink-0" />{" "}
            <span className="truncate">Hardware Compatibility Audit</span>
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-white uppercase leading-tight wrap-break-word px-1">
            Tested Games &{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-green via-emerald-400 to-teal-300 drop-shadow-[0_0_25px_rgba(118,185,0,0.4)]">
              Performance Benchmarks
            </span>
          </h1>

          <p className="text-gray-400 text-xs sm:text-sm md:text-base font-mono max-w-2xl mx-auto leading-relaxed px-2 wrap-break-word">
            Real-world gaming benchmarks, NVIDIA DLSS / Frame Generation telemetry, and AI-driven
            preset recommendations tested by Mission Control.
          </p>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-6 max-w-3xl mx-auto font-mono w-full">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/3 border border-white/10 text-center flex flex-col justify-center min-h-[4.5rem] sm:min-h-[5.25rem]">
              <div className="text-neon-green font-black text-lg sm:text-2xl truncate">
                {featuredGame.score ? `${featuredGame.score}%` : "100%"}
              </div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate mt-1">
                Local Verified
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/3 border border-white/10 text-center flex flex-col justify-center min-h-[4.5rem] sm:min-h-[5.25rem]">
              <div className="flex items-center justify-center" title={featuredGame.api}>
                {(() => {
                  const rawApi = (featuredGame.api || "DirectX 12").trim();
                  const isUltimate = /ultimate/i.test(rawApi);
                  let base = rawApi.replace(/\s*ultimate/i, "").trim();
                  if (/^dx\s*12/i.test(base)) base = "DirectX 12";
                  if (/^dx\s*11/i.test(base)) base = "DirectX 11";

                  return (
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-emerald-400 font-black text-sm xs:text-base sm:text-lg lg:text-xl tracking-tight leading-none whitespace-nowrap">
                        {base}
                      </span>
                      {isUltimate && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                          ULT
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate mt-1">
                Render Engine
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/3 border border-white/10 text-center flex flex-col justify-center min-h-[4.5rem] sm:min-h-[5.25rem]">
              <div className="text-teal-300 font-black text-lg sm:text-2xl truncate">
                {featuredGame.testedSpecs.latency}
              </div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate mt-1">
                System Latency
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/3 border border-white/10 text-center flex flex-col justify-center min-h-[4.5rem] sm:min-h-[5.25rem]">
              <div className="text-neon-yellow font-black text-lg sm:text-2xl truncate">
                {featuredGame.testedSpecs.vramUsed.split(" / ")[0]}
              </div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate mt-1">
                VRAM Memory
              </div>
            </div>
          </div>
        </div>

        {/* Featured Benchmark Section */}
        <div id="featured-benchmark" className="mb-14 sm:mb-20 scroll-mt-24 sm:scroll-mt-28">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-black font-display uppercase tracking-wider text-white wrap-break-word">
                Benchmark Profile: <span className="text-neon-green">{featuredGame.name}</span>
              </h2>
            </div>
          </div>

          <FeaturedBenchmarkCard
            featuredGame={featuredGame}
            screenshots={screenshots}
            onOpenSlideshow={(idx) => {
              setSlideshowIndex(idx);
              setIsPlaying(false);
            }}
            ratingStats={ratingStats}
            reviews={reviews}
            loadingReviews={loadingReviews}
            votedReviewIds={votedReviewIds}
            onVoteReview={handleVoteReview}
            sortByReview={sortByReview}
            onSortByReviewChange={setSortByReview}
            onOpenRateModal={() => setIsRateModalOpen(true)}
          />
        </div>

        {/* Verified Tested Games Library Grid & Scalable Filter */}
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 border-b border-white/10 pb-4 sm:pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-neon-green uppercase tracking-widest mb-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" /> Microsoft Store-Style Live Previews
              </div>
              <h2 className="text-xl sm:text-3xl font-black font-display uppercase tracking-wider text-white wrap-break-word">
                Verified Tested Games Library
              </h2>
              <p className="text-gray-400 text-xs font-mono mt-1 wrap-break-word">
                Hover over any game to trigger animated previews, real-time FPS benchmarks, and
                hardware telemetry.
              </p>
            </div>

            {/* Quick Stats Counter */}
            <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
              <span>
                Showing <strong className="text-neon-green">{paginatedGames.length}</strong> of{" "}
                <strong className="text-white">{filteredAndSortedGames.length}</strong> tested games
              </span>
            </div>
          </div>

          {/* Unified Search, Sort & Scalable Horizontal Genre Bar */}
          <TestedGamesFilterBar
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setVisibleCount(12);
            }}
            totalGamesCount={gamesList.length}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterGenre={filterGenre}
            onGenreSelect={(genre) => {
              setFilterGenre(genre);
              setVisibleCount(12);
            }}
            availableGenres={availableGenres}
            onResetFilters={() => {
              setFilterGenre("ALL");
              setSearchQuery("");
              setSortBy("featured");
              setVisibleCount(12);
            }}
          />

          {/* Games Grid */}
          {paginatedGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedGames.map((game) => (
                <TestedGameCard
                  key={game.id}
                  game={game}
                  isSelected={game.id === selectedGameId}
                  storeRating={game.storeRating || profiles[game.id]?.storeRating}
                  onSelect={handleSelectGame}
                />
              ))}
            </div>
          ) : (
            /* No Search Results Found State */
            <div className="p-8 sm:p-12 text-center rounded-2xl sm:rounded-3xl bg-[#0c0d12] border border-white/10 space-y-3 sm:space-y-4 max-w-lg mx-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display uppercase text-white wrap-break-word">
                No Matching Games Found
              </h3>
              <p className="text-gray-400 text-xs font-mono leading-relaxed wrap-break-word">
                We couldn&apos;t find any verified benchmark profiles matching &ldquo;
                <span className="text-neon-green">{searchQuery}</span>&rdquo; in the{" "}
                <span className="text-white">{filterGenre}</span> genre.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterGenre("ALL");
                  setSearchQuery("");
                  setSortBy("featured");
                  setVisibleCount(12);
                }}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl btn-premium-primary font-mono text-xs font-bold uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Clear Search & Filters
              </button>
            </div>
          )}

          {/* Load More Button */}
          {filteredAndSortedGames.length > visibleCount && (
            <div className="pt-6 sm:pt-8 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl btn-premium-glass font-mono text-xs font-bold uppercase tracking-wider text-white hover:text-neon-green transition-all shadow-xl cursor-pointer"
              >
                Load More Tested Games ({filteredAndSortedGames.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>

        {/* CTA Download Banner */}
        <div className="mt-12 sm:mt-20 p-5 sm:p-12 rounded-2xl sm:rounded-3xl border-gradient-cyber text-center space-y-3 sm:space-y-4 relative overflow-hidden shadow-[0_0_50px_rgba(118,185,0,0.15)]">
          <div className="relative z-10 max-w-2xl mx-auto space-y-2 sm:space-y-3">
            <h2 className="text-lg xs:text-xl sm:text-3xl font-black font-display uppercase text-white tracking-tight wrap-break-word">
              Ready to Optimize Your PC for Tested Games?
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm font-mono wrap-break-word">
              Download Mission Control to automatically detect installed games, configure hardware
              presets, and monitor thermals in real time.
            </p>
            <div className="pt-2 flex justify-center">
              <a
                href={
                  os === "linux"
                    ? LINUX_INSTALLER_URL
                    : os === "windows"
                      ? WINDOWS_INSTALLER_URL
                      : AUTO_DOWNLOAD_URL
                }
                suppressHydrationWarning
                className="inline-flex items-center gap-2.5 px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl btn-premium-primary font-black font-mono text-xs uppercase tracking-wider shadow-[0_0_35px_rgba(118,185,0,0.5)] group cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0 transition-transform group-hover:translate-y-0.5" />
                <span suppressHydrationWarning>
                  Download Mission Control{" "}
                  {os === "linux" ? "(Linux)" : os === "windows" ? "(Windows)" : ""}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Interactive Slideshow Lightbox Modal */}
      <GameplaySlideshowModal
        isOpen={slideshowIndex !== null}
        gameName={featuredGame.name}
        screenshots={screenshots}
        slideshowIndex={slideshowIndex}
        isPlaying={isPlaying}
        onClose={() => {
          setSlideshowIndex(null);
          setIsPlaying(false);
        }}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        onPrev={handlePrevSlide}
        onNext={handleNextSlide}
        onSelectSlide={(idx) => {
          setSlideshowIndex(idx);
          setIsPlaying(false);
        }}
      />

      {/* Interactive Rate Game & Submit Telemetry Modal */}
      <RateGameModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        onSuccess={() => {
          fetchRatings(selectedGameId);
          fetchBenchmarks();
        }}
        initialGameId={selectedGameId}
        availableGames={gamesList}
      />
    </div>
  );
}
