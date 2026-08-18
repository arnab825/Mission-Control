"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronUp,
  Filter, 
  Cpu, 
  Radio, 
  Plus, 
  Star, 
  ThumbsUp, 
  Clock,
  Sparkles, 
  Search, 
  X, 
  ArrowUpDown, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  AlertTriangle,
  Tv,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReportModal from "@/components/ReportModal";
import RateGameModal from "@/components/RateGameModal";
import { TESTED_GAMES_LIST } from "@/data/benchmarks";

interface Issue {
  id: string;
  title: string;
  description: string;
  category: "hardware" | "glitch" | "performance" | "other";
  game?: string;
  votes: number;
  createdAt: string;
  specs: {
    os: string;
    osVersion: string;
    cpu: string;
    gpu: string;
    gpuDriver?: string;
    ramGB: number;
    appVersion: string;
  };
}

interface GameRatingItem {
  id: string;
  gameId: string;
  gameName: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  review: string;
  specs: {
    gpu: string;
    cpu: string;
    ramGB: number;
    resolution: string;
    fpsReported: number;
    os: string;
    presetUsed?: string;
  };
  media?: Array<{
    url: string;
    type: "image" | "gif" | "video";
    name?: string;
  }>;
  recommend: boolean;
  upvotes: number;
  createdAt: string;
}

export default function CommunityPage() {
  // Main Tab: "ratings" | "glitches"
  const [activeTab, setActiveTab] = useState<"ratings" | "glitches">("ratings");

  // Ratings State
  const [reviews, setReviews] = useState<GameRatingItem[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [ratingGenreFilter, setRatingGenreFilter] = useState<string>("ALL");
  const [ratingSortBy, setRatingSortBy] = useState<"top" | "latest" | "rating">("top");
  const [ratingSearchQuery, setRatingSearchQuery] = useState<string>("");
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isRatingSortOpen, setIsRatingSortOpen] = useState(false);
  const [votedReviewIds, setVotedReviewIds] = useState<string[]>([]);
  const [ratingStats, setRatingStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    recommendationRate: 100,
    avgReportedFps: 0
  });

  // Glitches / Issues State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [votedIssueIds, setVotedIssueIds] = useState<string[]>([]);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isIssueSortOpen, setIsIssueSortOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [issueSortBy, setIssueSortBy] = useState<"votes" | "latest">("votes");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [issueStats, setIssueStats] = useState({
    total: 0,
    glitches: 0,
    hardware: 0,
    performance: 0
  });

  const genreScrollRef = useRef<HTMLDivElement>(null);
  const ratingSortRef = useRef<HTMLDivElement>(null);
  const issueSortRef = useRef<HTMLDivElement>(null);

  // Dynamic Genre Aggregation from tested games library
  const availableGenres = useMemo(() => {
    const genreMap = new Map<string, number>();
    
    TESTED_GAMES_LIST.forEach((g) => {
      const parts = g.genre.split(/[\/,]/).map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        genreMap.set(p, (genreMap.get(p) || 0) + 1);
      });
    });

    return Array.from(genreMap.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  const scrollGenres = (dir: "left" | "right") => {
    if (!genreScrollRef.current) return;
    const amount = dir === "left" ? -240 : 240;
    genreScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ratingSortRef.current && !ratingSortRef.current.contains(e.target as Node)) {
        setIsRatingSortOpen(false);
      }
      if (issueSortRef.current && !issueSortRef.current.contains(e.target as Node)) {
        setIsIssueSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Community Game Ratings
  const fetchRatings = async () => {
    try {
      setLoadingRatings(true);
      const res = await fetch("/api/benchmarks/ratings?sortBy=latest");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.ratings || []);
        if (data.summary) {
          setRatingStats({
            totalRatings: data.summary.totalRatings || data.ratings?.length || 0,
            averageRating: data.summary.averageRating || 0,
            recommendationRate: data.summary.recommendationRate ?? 100,
            avgReportedFps: data.summary.avgReportedFps || 0
          });
        }
      }
    } catch (e) {
      console.error("Failed to load community ratings:", e);
    } finally {
      setLoadingRatings(false);
    }
  };

  // Fetch Community Issues
  const fetchIssues = async () => {
    try {
      setLoadingIssues(true);
      const res = await fetch("/api/issues");
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
        
        const counts = data.reduce((acc: any, curr: Issue) => {
          acc.total++;
          if (curr.category === "glitch") acc.glitches++;
          else if (curr.category === "hardware") acc.hardware++;
          else if (curr.category === "performance") acc.performance++;
          return acc;
        }, { total: 0, glitches: 0, hardware: 0, performance: 0 });
        
        setIssueStats(counts);
      }
    } catch (e) {
      console.error("Failed to load community issues:", e);
    } finally {
      setLoadingIssues(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  useEffect(() => {
    fetchIssues();
    
    const storedIssueVotes = localStorage.getItem("aero_voted_issues");
    if (storedIssueVotes) {
      try {
        setVotedIssueIds(JSON.parse(storedIssueVotes));
      } catch {}
    }

    const storedReviewVotes = localStorage.getItem("aero_voted_reviews");
    if (storedReviewVotes) {
      try {
        setVotedReviewIds(JSON.parse(storedReviewVotes));
      } catch {}
    }

    // Synchronize active tab & modal states with URL query params
    const handleUrlSync = () => {
      if (typeof window === "undefined") return;
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab");
      const reportParam = searchParams.get("report") === "true";
      const rateParam = searchParams.get("rate") === "true";

      if (tabParam === "glitches" || reportParam) {
        setActiveTab("glitches");
        if (reportParam) setIsIssueModalOpen(true);
      } else if (tabParam === "ratings" || rateParam) {
        setActiveTab("ratings");
        if (rateParam) setIsRateModalOpen(true);
      }
    };

    handleUrlSync();
    window.addEventListener("popstate", handleUrlSync);
    return () => window.removeEventListener("popstate", handleUrlSync);
  }, []);

  const handleVoteIssue = async (issueId: string) => {
    if (votedIssueIds.includes(issueId)) return;

    try {
      const res = await fetch("/api/issues/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId }),
      });

      if (res.ok) {
        setIssues(prev => 
          prev.map(issue => 
            issue.id === issueId ? { ...issue, votes: issue.votes + 1 } : issue
          )
        );
        
        const newVoted = [...votedIssueIds, issueId];
        setVotedIssueIds(newVoted);
        localStorage.setItem("aero_voted_issues", JSON.stringify(newVoted));
      }
    } catch (e) {
      console.error("Failed to submit vote:", e);
    }
  };

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

  const toggleExpandIssue = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  // Filtered Reviews based on Genre, Search query, and Sorting
  const processedReviews = useMemo(() => {
    let list = [...reviews];

    // Filter by Genre
    if (ratingGenreFilter !== "ALL") {
      const gNorm = ratingGenreFilter.toLowerCase();
      list = list.filter((r) => {
        const game = TESTED_GAMES_LIST.find(
          (g) => g.id === r.gameId || g.name.toLowerCase() === r.gameName?.toLowerCase()
        );
        if (game) {
          return game.genre.toLowerCase().includes(gNorm);
        }
        return (r.title + " " + r.review + " " + r.gameName).toLowerCase().includes(gNorm);
      });
    }

    // Filter by Search Query
    const q = ratingSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.review.toLowerCase().includes(q) ||
          r.gameName.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q) ||
          r.specs?.gpu?.toLowerCase().includes(q) ||
          r.specs?.cpu?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (ratingSortBy === "top") {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else if (ratingSortBy === "latest") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (ratingSortBy === "rating") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [reviews, ratingGenreFilter, ratingSearchQuery, ratingSortBy]);

  const processedIssues = useMemo(() => {
    return [...issues]
      .filter((issue) => {
        if (categoryFilter === "all") return true;
        return issue.category === categoryFilter;
      })
      .sort((a, b) => {
        if (issueSortBy === "votes") {
          return b.votes - a.votes;
        } else {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [issues, categoryFilter, issueSortBy]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "hardware": return "text-[#76b900] bg-[#76b900]/10 border-[#76b900]/30";
      case "glitch": return "text-neon-green bg-neon-green/10 border-neon-green/30 shadow-[0_0_10px_rgba(118, 185, 0,0.15)]";
      case "performance": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      default: return "text-gray-300 bg-white/5 border-white/10";
    }
  };

  return (
    <main className="flex-1 min-h-screen pt-24 sm:pt-28 pb-20 sm:pb-24 px-3 sm:px-6 lg:px-8 bg-[#0a0a0c] relative overflow-x-hidden w-full max-w-full">
      
      {/* Cyber Grid & Ambient Background */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[300px] bg-neon-green/10 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-10">
        
        {/* Title & Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto px-2"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] sm:text-xs font-bold font-mono tracking-wider sm:tracking-widest uppercase backdrop-blur-md max-w-full">
            <Radio className="w-3 h-3 text-neon-green animate-pulse shrink-0" />
            <span className="truncate">Community Intel & Hardware Hub</span>
          </div>
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black font-display uppercase tracking-tight text-white leading-tight break-words">
            COMMUNITY <span className="text-neon-green glow-text-teal">INTEL HUB</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans max-w-xl mx-auto break-words">
            Read real player game reviews, compare hardware rig setups, or submit system driver glitches to trigger community fixes.
          </p>
        </motion.div>

        {/* Top-Level Navigation Tabs */}
        <div className="flex justify-center w-full px-2">
          <div className="inline-flex p-1 rounded-xl bg-[#111217] border border-white/15 backdrop-blur-xl gap-1 shadow-lg w-full max-w-[320px] sm:max-w-sm">
            <button
              onClick={() => setActiveTab("ratings")}
              className={`flex-1 min-w-0 py-2 px-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "ratings"
                  ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="truncate">Reviews</span>
            </button>

            <button
              onClick={() => setActiveTab("glitches")}
              className={`flex-1 min-w-0 py-2 px-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "glitches"
                  ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Glitches</span>
            </button>
          </div>
        </div>

        {/* TAB 1: COMMUNITY GAME RATINGS & RIG REVIEWS */}
        {activeTab === "ratings" && (
          <div className="space-y-4 sm:space-y-6 w-full">
            {/* Rating Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
              {[
                { 
                  label: "Community Reviews", 
                  count: ratingStats.totalRatings || reviews.length, 
                  color: "text-white" 
                },
                { 
                  label: "Average Rating", 
                  count: ratingStats.averageRating > 0 ? `${ratingStats.averageRating.toFixed(1)} / 5.0` : "Unrated", 
                  color: "text-amber-400" 
                },
                { 
                  label: "Player Recommended", 
                  count: `${ratingStats.recommendationRate}%`, 
                  color: "text-neon-green glow-text-teal" 
                },
                { 
                  label: "Avg Rig FPS", 
                  count: ratingStats.avgReportedFps > 0 ? `${ratingStats.avgReportedFps} FPS` : "—", 
                  color: "text-emerald-400" 
                }
              ].map((item, idx) => (
                <div key={idx} className="min-w-0 w-full bg-[#111217]/90 border border-white/10 rounded-xl p-2.5 sm:p-4 flex flex-col items-center justify-center text-center space-y-1 shadow-md overflow-hidden">
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs uppercase font-mono font-bold text-gray-400 tracking-wider truncate block w-full max-w-full">
                    {item.label}
                  </span>
                  <span className={`text-base min-[360px]:text-lg sm:text-2xl font-black font-mono truncate max-w-full ${item.color}`}>
                    {loadingRatings ? "..." : item.count}
                  </span>
                </div>
              ))}
            </div>
            {/* Scalable Dynamic Genre Filter Bar & Search/Actions Hub */}
            <div className="space-y-3 sm:space-y-4 p-3.5 sm:p-5 rounded-2xl bg-[#0e0f14]/90 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              
              {/* Scalable Horizontal-Scrolling Dynamic Genre Bar */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                <button
                  type="button"
                  onClick={() => scrollGenres("left")}
                  className="w-8 h-8 rounded-xl bg-black/80 hover:bg-black border border-white/15 hover:border-neon-green/50 flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md cursor-pointer shrink-0"
                  title="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={genreScrollRef}
                  className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
                  style={{ scrollbarWidth: "none" }}
                >
                  {/* 'ALL GENRES' Pill */}
                  <button
                    onClick={() => setRatingGenreFilter("ALL")}
                    className={`px-3.5 py-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                      ratingGenreFilter === "ALL"
                        ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.5)] scale-[1.02]"
                        : "bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    <span>All Genres</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${ratingGenreFilter === "ALL" ? "bg-black/30 text-obsidian font-black" : "bg-white/10 text-gray-400"}`}>
                      {reviews.length}
                    </span>
                  </button>

                  {/* Dynamic Genre Pills */}
                  {availableGenres.map(([genre, count]) => {
                    const isSelected = ratingGenreFilter === genre;
                    return (
                      <button
                        key={genre}
                        onClick={() => setRatingGenreFilter(isSelected ? "ALL" : genre)}
                        className={`px-3.5 py-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.5)] scale-[1.02]"
                            : "bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                        }`}
                      >
                        <span>{genre}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isSelected ? "bg-black/30 text-obsidian font-black" : "bg-white/10 text-gray-400"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => scrollGenres("right")}
                  className="w-8 h-8 rounded-xl bg-black/80 hover:bg-black border border-white/15 hover:border-neon-green/50 flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md cursor-pointer shrink-0"
                  title="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Premium Search, Glassmorphic Sort Dropdown & Action Controls */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-white/10">
                
                {/* Premium Cybernetic Search Bar */}
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-neon-green transition-colors">
                    <Search className="w-4 h-4 text-neon-green/70 group-focus-within:text-neon-green group-focus-within:drop-shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all shrink-0" />
                  </div>
                  <input
                    type="text"
                    value={ratingSearchQuery}
                    onChange={(e) => setRatingSearchQuery(e.target.value)}
                    placeholder="Search reviews by GPU (e.g. RTX 4090), CPU, player, or keyword..."
                    className="w-full h-12 pl-10 sm:pl-11 pr-10 sm:pr-24 bg-black/75 hover:bg-black/95 focus:bg-black border border-white/15 focus:border-neon-green rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-neon-green/50 focus:shadow-[0_0_25px_rgba(118,185,0,0.25)] transition-all shadow-inner"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                    {ratingSearchQuery ? (
                      <button
                        onClick={() => setRatingSearchQuery("")}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400 select-none">
                        Live Filter
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side controls: Premium Dropdown + Share Review CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                  {/* Premium Glassmorphic Sort Dropdown */}
                  <div className="relative w-full lg:w-56" ref={ratingSortRef}>
                    <button
                      type="button"
                      onClick={() => setIsRatingSortOpen(!isRatingSortOpen)}
                      className="w-full h-12 bg-black/75 hover:bg-black/95 border border-white/15 hover:border-neon-green/50 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between gap-2 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(118,185,0,0.15)] cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="p-1 rounded-md bg-neon-green/10 border border-neon-green/30 text-neon-green shrink-0">
                          <ArrowUpDown className="w-3 h-3 text-neon-green" />
                        </div>
                        <span className="truncate">
                          {ratingSortBy === "top" ? "Most Helpful" : ratingSortBy === "latest" ? "Latest Logged" : "Highest Rating"}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 shrink-0 ${isRatingSortOpen ? "rotate-180 text-neon-green" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isRatingSortOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 left-0 lg:left-auto top-full mt-2 lg:w-60 bg-[#0c0d12]/95 backdrop-blur-2xl border border-neon-green/30 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(118,185,0,0.15)] overflow-hidden z-40 p-1.5 font-mono text-xs space-y-1"
                        >
                          <div className="px-3 py-1.5 text-[9px] uppercase font-bold text-gray-500 tracking-widest border-b border-white/10 flex items-center justify-between">
                            <span>Sort Telemetry Feed</span>
                            <span className="text-neon-green">Active</span>
                          </div>

                          {[
                            { id: "top", label: "Most Helpful", desc: "Ranked by player upvotes", icon: ThumbsUp },
                            { id: "latest", label: "Latest Logged", desc: "Most recent community posts", icon: Clock },
                            { id: "rating", label: "Highest Rating", desc: "Top score benchmarks (5.0★)", icon: Star },
                          ].map((opt) => {
                            const isSelected = ratingSortBy === opt.id;
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setRatingSortBy(opt.id as any);
                                  setIsRatingSortOpen(false);
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? "bg-neon-green text-obsidian font-bold shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-obsidian" : "text-neon-green"}`} />
                                  <div className="min-w-0">
                                    <div className="truncate font-bold">{opt.label}</div>
                                    <div className={`text-[9px] truncate ${isSelected ? "text-obsidian/70" : "text-gray-500"}`}>
                                      {opt.desc}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-obsidian shrink-0 font-bold" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Share Review CTA Button */}
                  <button
                    onClick={() => setIsRateModalOpen(true)}
                    className="w-full lg:w-auto h-12 px-6 rounded-xl sm:rounded-2xl bg-neon-green text-obsidian hover:bg-white hover:shadow-[0_0_30px_rgba(118,185,0,0.6)] text-xs font-mono font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(118,185,0,0.4)] shrink-0"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Share Review</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Ratings Feed */}
            {loadingRatings ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-8 h-8 border-3 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neon-green font-mono tracking-wider uppercase">Loading community reviews...</p>
              </div>
            ) : processedReviews.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-[#111217] rounded-xl sm:rounded-2xl border border-white/10 space-y-2.5 font-mono p-4">
                <Star className="w-8 h-8 text-gray-500 mx-auto" />
                <h3 className="text-sm sm:text-base font-bold text-white font-display uppercase leading-tight">
                  {ratingSearchQuery ? "No matching community posts" : "No community reviews posted yet"}
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {ratingSearchQuery 
                    ? "Try adjusting your search terms or clearing the filter."
                    : "Be the first community member to share your gameplay impressions and rig setup."}
                </p>
                <button
                  onClick={() => setIsRateModalOpen(true)}
                  className="mt-1.5 px-4 py-2 rounded-xl bg-neon-green text-obsidian font-bold text-xs uppercase tracking-wider font-mono hover:bg-white transition-all shadow-md cursor-pointer"
                >
                  + Write First Community Review
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {processedReviews.map((rev) => {
                  const hasVoted = votedReviewIds.includes(rev.id);
                  return (
                    <div
                      key={rev.id}
                      className="rounded-xl sm:rounded-2xl bg-[#0f1015] border border-white/10 hover:border-neon-green/40 p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all duration-300 font-mono shadow-lg"
                    >
                      <div className="space-y-2.5">
                        {/* Header with user tag, game name, star rating */}
                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green text-xs font-bold uppercase shrink-0">
                              {rev.userName ? rev.userName[0] : "A"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                                {rev.userName}
                              </div>
                              <span className="text-[9px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded truncate inline-block max-w-[120px] sm:max-w-[180px]">
                                {rev.gameName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-0.5 text-amber-400 text-[11px]">
                              {"★".repeat(rev.rating)}
                              {"☆".repeat(5 - rev.rating)}
                              <span className="text-[10px] font-bold text-white ml-1">
                                {rev.rating}.0
                              </span>
                            </div>
                            <span className="text-[9px] text-gray-500">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Title & Review Content */}
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wide leading-snug break-words">
                            {rev.title}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-gray-300 font-sans leading-relaxed mt-1 break-words">
                            {rev.review}
                          </p>
                        </div>

                        {/* Attached Media Gallery (Images, GIFs, Videos) */}
                        {rev.media && rev.media.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {rev.media.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="relative aspect-video rounded-xl overflow-hidden bg-black/80 border border-white/15 group/media"
                              >
                                {m.type === "video" ? (
                                  <video
                                    src={m.url}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <img
                                    src={m.url}
                                    alt={m.name || "Media attachment"}
                                    className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300 cursor-pointer"
                                    onClick={() => window.open(m.url, "_blank")}
                                  />
                                )}
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-[9px] font-mono font-bold uppercase text-white shadow pointer-events-none">
                                  {m.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Hardware Rig Specs Badge Strip */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[9px] sm:text-[10px]">
                          {rev.specs?.gpu && (
                            <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-[200px]">
                              <Tv className="w-3 h-3 text-neon-green shrink-0" />
                              <span className="truncate">{rev.specs.gpu}</span>
                            </span>
                          )}
                          {rev.specs?.cpu && (
                            <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-[200px]">
                              <Cpu className="w-3 h-3 text-neon-green shrink-0" />
                              <span className="truncate">{rev.specs.cpu}</span>
                            </span>
                          )}
                          {rev.specs?.fpsReported && (
                            <span className="px-2 py-0.5 rounded-md bg-neon-green/10 border border-neon-green/30 text-neon-green font-bold flex items-center gap-1 shrink-0">
                              <Zap className="w-3 h-3 shrink-0" />
                              {rev.specs.fpsReported} FPS {rev.specs.resolution ? `@ ${rev.specs.resolution.split(' ')[0]}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] text-gray-500">
                          {rev.recommend ? (
                            <span className="text-emerald-400 font-bold">✓ Recommended</span>
                          ) : (
                            <span>Review Log</span>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleVoteReview(rev.id)}
                          disabled={hasVoted}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            hasVoted
                              ? "bg-neon-green/20 text-neon-green border border-neon-green/40 cursor-default"
                              : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
                          }`}
                        >
                          <ThumbsUp className={`w-3 h-3 ${hasVoted ? "fill-neon-green text-neon-green" : ""}`} />
                          <span>Helpful ({rev.upvotes || 0})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KERNEL TELEMETRY & GLITCH TRACKER */}
        {activeTab === "glitches" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
              {[
                { label: "Active Telemetry", count: issueStats.total, color: "text-white" },
                { label: "Rendering Glitches", count: issueStats.glitches, color: "text-neon-green glow-text-teal" },
                { label: "Hardware & Sensors", count: issueStats.hardware, color: "text-[#76b900]" },
                { label: "Performance Drops", count: issueStats.performance, color: "text-amber-400" }
              ].map((item, idx) => (
                <div key={idx} className="min-w-0 w-full bg-[#111217]/90 border border-white/10 rounded-xl p-2.5 sm:p-4 flex flex-col items-center justify-center text-center space-y-1 shadow-md overflow-hidden">
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs uppercase font-mono font-bold text-gray-400 tracking-wider truncate block w-full max-w-full">
                    {item.label}
                  </span>
                  <span className={`text-base min-[360px]:text-lg sm:text-2xl font-black font-mono truncate max-w-full ${item.color}`}>
                    {loadingIssues ? "..." : item.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Filters and Actions Header */}
            <div className="space-y-2.5 sm:space-y-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#111217]/80 border border-white/10">
              {/* Categories Tab */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
                {[
                  { id: "all", label: "All Logs" },
                  { id: "glitch", label: "Glitches" },
                  { id: "hardware", label: "Hardware" },
                  { id: "performance", label: "Performance" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer shrink-0 ${
                      categoryFilter === tab.id
                        ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_12px_rgba(118,185,0,0.4)]"
                        : "bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Side-by-side action controls */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                {/* Custom Glassmorphic Sort Dropdown */}
                <div className="relative flex-1" ref={issueSortRef}>
                  <button
                    type="button"
                    onClick={() => setIsIssueSortOpen(!isIssueSortOpen)}
                    className="w-full bg-black/70 hover:bg-black/90 border border-white/15 hover:border-neon-green/50 rounded-xl px-3 py-2 text-[11px] sm:text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between gap-1.5 transition-all shadow cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Filter className="w-3 h-3 text-neon-green shrink-0" />
                      <span className="truncate">{issueSortBy === "votes" ? "Most Voted" : "Latest"}</span>
                    </div>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 shrink-0 ${isIssueSortOpen ? "rotate-180 text-neon-green" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isIssueSortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute right-0 left-0 top-full mt-1.5 bg-[#0b0c10] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-30 p-1 font-mono text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIssueSortBy("votes");
                            setIsIssueSortOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer ${
                            issueSortBy === "votes"
                              ? "bg-neon-green text-obsidian font-bold"
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span>Most Voted</span>
                          {issueSortBy === "votes" && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIssueSortBy("latest");
                            setIsIssueSortOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer ${
                            issueSortBy === "latest"
                              ? "bg-neon-green text-obsidian font-bold"
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span>Latest Logged</span>
                          {issueSortBy === "latest" && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setIsIssueModalOpen(true)}
                  className="flex-1 px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl bg-neon-green text-obsidian hover:bg-white hover:shadow-[0_0_15px_rgba(118,185,0,0.4)] transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-1.5 shadow shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Log Glitch</span>
                </button>
              </div>
            </div>

            {/* Glitches List */}
            {loadingIssues ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-8 h-8 border-3 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neon-green font-mono tracking-wider uppercase">Loading telemetry feed...</p>
              </div>
            ) : processedIssues.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-[#111217] rounded-xl sm:rounded-2xl border border-white/10 space-y-2.5 p-4 font-mono">
                <AlertTriangle className="w-8 h-8 text-gray-500 mx-auto" />
                <h3 className="text-sm sm:text-base font-bold text-white font-display uppercase leading-tight">No telemetry reports match filters</h3>
                <p className="text-[11px] sm:text-xs text-gray-400 max-w-sm mx-auto">Be the first operator to dispatch a hardware or rendering fault.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {processedIssues.map((issue) => {
                  const hasVoted = votedIssueIds.includes(issue.id);
                  const isExpanded = expandedIssueId === issue.id;

                  return (
                    <div 
                      key={issue.id} 
                      className={`bg-[#0f1015] rounded-xl sm:rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
                        isExpanded ? "border-neon-green/50 bg-neon-green/[0.02] shadow-[0_0_25px_rgba(118,185,0,0.15)]" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 sm:gap-5">
                        {/* Content Section */}
                        <div className="space-y-2.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider border ${getCategoryColor(issue.category)}`}>
                              {issue.category}
                            </span>
                            {issue.game && (
                              <span className="text-[10px] sm:text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[160px]">
                                Context: <strong className="text-white">{issue.game}</strong>
                              </span>
                            )}
                            <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono">
                              LOGGED: {new Date(issue.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-lg font-bold text-white tracking-wide font-display break-words leading-snug">
                            {issue.title}
                          </h3>

                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-4xl font-sans break-words">
                            {issue.description}
                          </p>

                          {/* Primary specs tags */}
                          <div className="flex flex-wrap gap-1.5 text-[9px] sm:text-[10px] font-mono text-gray-300 pt-1">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian border border-white/10 truncate max-w-[200px]">
                              <Cpu className="w-3 h-3 text-neon-green shrink-0" /> <span className="truncate">{issue.specs.cpu}</span>
                            </span>
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian border border-white/10 truncate max-w-[200px]">
                              <Tv className="w-3 h-3 text-neon-green shrink-0" /> <span className="truncate">{issue.specs.gpu}</span>
                            </span>
                          </div>
                        </div>

                        {/* Voting Action Section */}
                        <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-3 sm:w-32 self-stretch sm:self-auto sm:border-l sm:border-white/10 sm:pl-5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                          <div className="text-left sm:text-center sm:w-full">
                            <div className="text-[9px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                              Affected Rigs
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                              {issue.votes}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleVoteIssue(issue.id)}
                              disabled={hasVoted}
                              className={`py-1.5 px-3 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-200 border flex items-center justify-center gap-1 shrink-0 ${
                                hasVoted
                                  ? "bg-neon-green/20 text-neon-green border-neon-green/40 cursor-default"
                                  : "bg-neon-green text-obsidian border-neon-green hover:bg-white cursor-pointer"
                              }`}
                            >
                              {hasVoted ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-neon-green shrink-0" /> Verified
                                </>
                              ) : (
                                "Confirm Fault"
                              )}
                            </button>

                            <button
                              onClick={() => toggleExpandIssue(issue.id)}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition sm:hidden shrink-0"
                              aria-label="Toggle details"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expand Specs button for desktop */}
                      <div className="hidden sm:block border-t border-white/5 px-5 py-2.5 bg-white/[0.01]">
                        <button
                          onClick={() => toggleExpandIssue(issue.id)}
                          className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-neon-green hover:text-white transition cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" /> Collapse Hardware Telemetry Stack
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" /> Inspect Rig Context ({issue.specs.os} / {issue.specs.ramGB}GB RAM)
                            </>
                          )}
                        </button>
                      </div>

                      {/* Collapsible Details */}
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2.5 border-t border-white/5 bg-obsidian/90 font-mono text-xs text-gray-300">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                            <div className="space-y-1 bg-white/[0.02] p-2 sm:p-2.5 rounded-xl border border-white/5">
                              <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                Operating System
                              </span>
                              <span className="text-white font-bold truncate block text-[11px]">{issue.specs.os} ({issue.specs.osVersion})</span>
                            </div>
                            <div className="space-y-1 bg-white/[0.02] p-2 sm:p-2.5 rounded-xl border border-white/5">
                              <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                System Memory
                              </span>
                              <span className="text-white font-bold truncate block text-[11px]">{issue.specs.ramGB} GB RAM</span>
                            </div>
                            <div className="space-y-1 bg-white/[0.02] p-2 sm:p-2.5 rounded-xl border border-white/5">
                              <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                GPU Driver Package
                              </span>
                              <span className="text-neon-green font-bold truncate block text-[11px]">{issue.specs.gpuDriver || "GeForce Game Ready"}</span>
                            </div>
                            <div className="space-y-1 bg-white/[0.02] p-2 sm:p-2.5 rounded-xl border border-white/5">
                              <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                Build Executable
                              </span>
                              <span className="text-white font-bold truncate block text-[11px]">v{issue.specs.appVersion} Stealth</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Submit Report Modal */}
      <ReportModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={fetchIssues}
      />

      {/* Rate Game Modal */}
      <RateGameModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        onSuccess={fetchRatings}
        initialGameId="spiderman2"
      />
    </main>
  );
}
