"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  AlertTriangle, 
  Cpu, 
  Tv, 
  Maximize2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Info,
  Radio,
  Plus,
  Star,
  ThumbsUp,
  MessageSquare,
  Gamepad2,
  Sliders,
  Users,
  ShieldCheck,
  Sparkles,
  Search,
  X,
  ArrowUpDown,
  Check
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

const GAME_FILTER_LABELS: Record<string, string> = {
  spiderman2: "Spider-Man 2",
  gtav: "GTA V",
  tsushima: "Ghost of Tsushima",
  nfsheat: "NFS Heat",
  thedivision: "The Division",
};

export default function CommunityPage() {
  // Main Tab: "ratings" | "glitches"
  const [activeTab, setActiveTab] = useState<"ratings" | "glitches">("ratings");

  // Ratings State
  const [reviews, setReviews] = useState<GameRatingItem[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [ratingGameFilter, setRatingGameFilter] = useState<string>("all");
  const [ratingSortBy, setRatingSortBy] = useState<"top" | "latest">("top");
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

  const ratingSortRef = useRef<HTMLDivElement>(null);
  const issueSortRef = useRef<HTMLDivElement>(null);

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
      const url = ratingGameFilter === "all"
        ? `/api/benchmarks/ratings?sortBy=${ratingSortBy}`
        : `/api/benchmarks/ratings?gameId=${ratingGameFilter}&sortBy=${ratingSortBy}`;
      
      const res = await fetch(url);
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
  }, [ratingGameFilter, ratingSortBy]);

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

  // Filtered Reviews based on text search
  const processedReviews = useMemo(() => {
    const q = ratingSearchQuery.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.review.toLowerCase().includes(q) ||
        r.gameName.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        r.specs.gpu.toLowerCase().includes(q) ||
        r.specs.cpu.toLowerCase().includes(q)
    );
  }, [reviews, ratingSearchQuery]);

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
    <main className="flex-1 min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0c] relative overflow-x-hidden">
      
      {/* Cyber Grid & Ambient Background */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-green/10 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Title & Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-bold font-mono tracking-widest uppercase backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" /> COMMUNITY HARDWARE & GAMING HUB
          </div>
          <h1 className="text-2xl min-[375px]:text-3xl sm:text-6xl font-black font-display uppercase tracking-tight text-white">
            COMMUNITY <br className="sm:hidden" /> <span className="text-neon-green glow-text-teal">INTEL HUB</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-base text-gray-400 leading-relaxed font-sans">
            Read real player game reviews, compare hardware rig setups, or submit system driver glitches to trigger community fixes.
          </p>
        </motion.div>

        {/* Top-Level Navigation Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl gap-1">
            <button
              onClick={() => setActiveTab("ratings")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                activeTab === "ratings"
                  ? "bg-neon-green text-obsidian shadow-[0_0_20px_rgba(118,185,0,0.5)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
              <span>Community Reviews & Rig Posts</span>
            </button>

            <button
              onClick={() => setActiveTab("glitches")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                activeTab === "glitches"
                  ? "bg-neon-green text-obsidian shadow-[0_0_20px_rgba(118,185,0,0.5)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Kernel Telemetry Glitch Tracker</span>
            </button>
          </div>
        </div>

        {/* TAB 1: COMMUNITY GAME RATINGS & RIG REVIEWS */}
        {activeTab === "ratings" && (
          <div className="space-y-8">
            {/* Rating Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: "Community Reviews", 
                  count: ratingStats.totalRatings || reviews.length, 
                  color: "border-white/10 text-white" 
                },
                { 
                  label: "Average Rating", 
                  count: ratingStats.averageRating > 0 ? `${ratingStats.averageRating.toFixed(1)} / 5.0` : "Unrated", 
                  color: "border-amber-400/40 text-amber-400" 
                },
                { 
                  label: "Player Recommendation", 
                  count: `${ratingStats.recommendationRate}%`, 
                  color: "border-neon-green/40 text-neon-green glow-text-teal" 
                },
                { 
                  label: "Avg Player Rig FPS", 
                  count: ratingStats.avgReportedFps > 0 ? `${ratingStats.avgReportedFps} FPS` : "—", 
                  color: "border-emerald-400/40 text-emerald-400" 
                }
              ].map((item, idx) => (
                <div key={idx} className="glass-card p-5 flex flex-col items-center justify-center text-center space-y-1 border">
                  <span className="text-[9px] min-[375px]:text-[11px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                    {item.label}
                  </span>
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${item.color}`}>
                    {loadingRatings ? "..." : item.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Game Filters & Action Bar */}
            <div className="space-y-4 p-4 rounded-2xl glass-card border border-white/10">
              
              {/* Game Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setRatingGameFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer shrink-0 ${
                    ratingGameFilter === "all"
                      ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                      : "bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  All Games
                </button>
                {TESTED_GAMES_LIST.map((game) => {
                  const label = GAME_FILTER_LABELS[game.id] || game.name;
                  const isSelected = ratingGameFilter === game.id;
                  return (
                    <button
                      key={game.id}
                      onClick={() => setRatingGameFilter(game.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                          : "bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Search, Custom Sort Dropdown & Action Button */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-white/5">
                
                {/* Search Bar for reviews */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ratingSearchQuery}
                    onChange={(e) => setRatingSearchQuery(e.target.value)}
                    placeholder="Search reviews by rig, GPU, CPU, player or keyword..."
                    className="w-full pl-10 pr-9 py-2 bg-black/60 border border-white/15 focus:border-neon-green rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                  />
                  {ratingSearchQuery && (
                    <button
                      onClick={() => setRatingSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Custom Glassmorphic Sort Dropdown */}
                  <div className="relative" ref={ratingSortRef}>
                    <button
                      type="button"
                      onClick={() => setIsRatingSortOpen(!isRatingSortOpen)}
                      className="w-full sm:w-auto bg-black/70 hover:bg-black/90 border border-white/15 hover:border-neon-green/50 rounded-xl px-4 py-2 text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between gap-2.5 transition-all shadow-lg cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-neon-green shrink-0" />
                        <span>{ratingSortBy === "top" ? "Most Helpful" : "Latest Reviews"}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isRatingSortOpen ? "rotate-180 text-neon-green" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isRatingSortOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute right-0 top-full mt-1.5 w-48 bg-[#0b0c10] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-30 p-1 font-mono text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setRatingSortBy("top");
                              setIsRatingSortOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer ${
                              ratingSortBy === "top"
                                ? "bg-neon-green text-obsidian font-bold"
                                : "text-gray-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span>Most Helpful</span>
                            {ratingSortBy === "top" && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRatingSortBy("latest");
                              setIsRatingSortOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer ${
                              ratingSortBy === "latest"
                                ? "bg-neon-green text-obsidian font-bold"
                                : "text-gray-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span>Latest Logged</span>
                            {ratingSortBy === "latest" && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => setIsRateModalOpen(true)}
                    className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-neon-green text-obsidian hover:bg-white hover:shadow-[0_0_20px_rgba(118,185,0,0.4)] transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Share Review
                  </button>
                </div>

              </div>
            </div>

            {/* Ratings Feed */}
            {loadingRatings ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-10 h-10 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neon-green font-mono tracking-wider uppercase">Loading community reviews...</p>
              </div>
            ) : processedReviews.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl border border-white/10 space-y-3 font-mono">
                <Star className="w-10 h-10 text-gray-500 mx-auto" />
                <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase leading-tight px-4">
                  {ratingSearchQuery ? "No matching community posts" : "No community reviews posted yet"}
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 px-4 max-w-md mx-auto">
                  {ratingSearchQuery 
                    ? "Try adjusting your search terms or clearing the filter."
                    : "Be the first community member to share your gameplay impressions and rig setup."}
                </p>
                <button
                  onClick={() => setIsRateModalOpen(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-neon-green text-obsidian font-bold text-xs uppercase tracking-wider font-mono hover:bg-white transition-all shadow-lg cursor-pointer"
                >
                  + Write First Community Review
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedReviews.map((rev) => {
                  const hasVoted = votedReviewIds.includes(rev.id);
                  return (
                    <div
                      key={rev.id}
                      className="glass-card glass-card-hover rounded-2xl border border-white/10 p-6 flex flex-col justify-between space-y-4 transition-all duration-300 font-mono"
                    >
                      <div className="space-y-3">
                        {/* Header with user tag, game name, star rating */}
                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green text-xs font-bold uppercase">
                              {rev.userName ? rev.userName[0] : "A"}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">
                                {rev.userName}
                              </div>
                              <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                                {rev.gameName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                              {"★".repeat(rev.rating)}
                              {"☆".repeat(5 - rev.rating)}
                              <span className="text-[11px] font-bold text-white ml-1">
                                {rev.rating}.0
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Title & Review Content */}
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white font-display uppercase tracking-wide">
                            {rev.title}
                          </h4>
                          <p className="text-xs text-gray-300 font-sans leading-relaxed mt-1.5">
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
                        <div className="flex flex-wrap gap-1.5 pt-2 text-[10px]">
                          {rev.specs?.gpu && (
                            <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-white/10 text-gray-300 flex items-center gap-1.5">
                              <Tv className="w-3 h-3 text-neon-green" /> {rev.specs.gpu}
                            </span>
                          )}
                          {rev.specs?.cpu && (
                            <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-white/10 text-gray-300 flex items-center gap-1.5">
                              <Cpu className="w-3 h-3 text-neon-green" /> {rev.specs.cpu}
                            </span>
                          )}
                          {rev.specs?.fpsReported && (
                            <span className="px-2.5 py-1 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green font-bold flex items-center gap-1.5">
                              <Zap className="w-3 h-3" /> {rev.specs.fpsReported} FPS {rev.specs.resolution ? `@ ${rev.specs.resolution.split(' ')[0]}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          {rev.recommend ? (
                            <span className="text-emerald-400 font-bold">✓ Recommended with Mission Control</span>
                          ) : (
                            <span>Player Review</span>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleVoteReview(rev.id)}
                          disabled={hasVoted}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            hasVoted
                              ? "bg-neon-green/20 text-neon-green border border-neon-green/40 cursor-default"
                              : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? "fill-neon-green text-neon-green" : ""}`} />
                          <span>{hasVoted ? "Helpful" : "Helpful"} ({rev.upvotes || 0})</span>
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
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Active Telemetry Reports", count: issueStats.total, color: "border-white/10" },
                { label: "Rendering & Glitches", count: issueStats.glitches, color: "border-neon-green/40 text-neon-green glow-text-teal" },
                { label: "Hardware & Sensors", count: issueStats.hardware, color: "border-[#76b900]/40 text-[#76b900]" },
                { label: "Performance Drops", count: issueStats.performance, color: "border-amber-500/40 text-amber-400" }
              ].map((item, idx) => (
                <div key={idx} className="glass-card p-5 flex flex-col items-center justify-center text-center space-y-1 border">
                  <span className="text-[9px] min-[375px]:text-[11px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                    {item.label}
                  </span>
                  <span className={`text-3xl font-black font-mono ${item.color}`}>
                    {loadingIssues ? "..." : item.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Filters and Actions Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl glass-card border border-white/10">
              {/* Categories Tab */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All Telemetry Logs" },
                  { id: "glitch", label: "Glitches" },
                  { id: "hardware", label: "Hardware" },
                  { id: "performance", label: "Performance" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer ${
                      categoryFilter === tab.id
                        ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_15px_rgba(118, 185, 0,0.4)]"
                        : "bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sorting and Submit button */}
              <div className="flex flex-col min-[440px]:flex-row items-stretch min-[440px]:items-center gap-3 w-full sm:w-auto">
                {/* Custom Glassmorphic Sort Dropdown */}
                <div className="relative" ref={issueSortRef}>
                  <button
                    type="button"
                    onClick={() => setIsIssueSortOpen(!isIssueSortOpen)}
                    className="w-full min-[440px]:w-auto bg-black/70 hover:bg-black/90 border border-white/15 hover:border-neon-green/50 rounded-xl px-4 py-2 text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between gap-2.5 transition-all shadow-lg cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-neon-green shrink-0" />
                      <span>{issueSortBy === "votes" ? "Most Voted Logs" : "Latest Logged"}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isIssueSortOpen ? "rotate-180 text-neon-green" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isIssueSortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute right-0 top-full mt-1.5 w-48 bg-[#0b0c10] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-30 p-1 font-mono text-xs"
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
                          <span>Most Voted Logs</span>
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
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-neon-green text-obsidian hover:bg-white hover:shadow-[0_0_20px_rgba(118, 185, 0, 0.4)] transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-1.5 w-full min-[440px]:w-auto"
                >
                  <Plus className="w-4 h-4" /> Log Telemetry Glitch
                </button>
              </div>
            </div>

            {/* Glitches List */}
            {loadingIssues ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-10 h-10 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neon-green font-mono tracking-wider uppercase">Loading kernel telemetry feed...</p>
              </div>
            ) : processedIssues.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl border border-white/10 space-y-3">
                <AlertTriangle className="w-10 h-10 text-gray-500 mx-auto" />
                <h3 className="text-sm min-[375px]:text-base sm:text-lg font-bold text-white font-display uppercase leading-tight px-4">No telemetry reports match filters</h3>
                <p className="text-[11px] min-[375px]:text-xs sm:text-sm text-gray-400 font-mono px-4">Be the first operator to dispatch a hardware or rendering fault.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {processedIssues.map((issue) => {
                  const hasVoted = votedIssueIds.includes(issue.id);
                  const isExpanded = expandedIssueId === issue.id;

                  return (
                    <div 
                      key={issue.id} 
                      className={`glass-card glass-card-hover rounded-2xl border transition-all duration-300 ${
                        isExpanded ? "border-neon-green/50 bg-neon-green/[0.02] shadow-[0_0_30px_rgba(118, 185, 0,0.1)]" : "border-white/10"
                      }`}
                    >
                      <div className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        {/* Content Section */}
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-3 py-1 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider border ${getCategoryColor(issue.category)}`}>
                              {issue.category}
                            </span>
                            {issue.game && (
                              <span className="text-xs font-mono text-gray-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/5">
                                Context: <strong className="text-white">{issue.game}</strong>
                              </span>
                            )}
                            <span className="text-[10px] text-gray-500 font-mono">
                              LOGGED: {new Date(issue.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-white tracking-wide font-display">
                            {issue.title}
                          </h3>

                          <p className="text-sm text-gray-300 leading-relaxed max-w-4xl font-sans">
                            {issue.description}
                          </p>

                          {/* Primary specs tags */}
                          <div className="flex flex-wrap gap-2 text-xs font-mono text-gray-300 pt-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-obsidian border border-white/10">
                              <Cpu className="w-3.5 h-3.5 text-neon-green" /> {issue.specs.cpu}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-obsidian border border-white/10">
                              <Tv className="w-3.5 h-3.5 text-neon-green" /> {issue.specs.gpu}
                            </span>
                          </div>
                        </div>

                        {/* Voting Action Section */}
                        <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-4 sm:w-32 self-stretch sm:self-auto sm:border-l sm:border-white/10 sm:pl-6">
                          <div className="text-center sm:w-full">
                            <div className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                              Affected Rigs
                            </div>
                            <div className="text-3xl font-black font-mono text-white tracking-tight">
                              {issue.votes}
                            </div>
                          </div>

                          <button
                            onClick={() => handleVoteIssue(issue.id)}
                            disabled={hasVoted}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-1.5 ${
                              hasVoted
                                ? "bg-neon-green/20 text-neon-green border-neon-green/40 cursor-default"
                                : "bg-neon-green text-obsidian border-neon-green hover:bg-white hover:shadow-[0_0_20px_rgba(118, 185, 0,0.4)] cursor-pointer"
                            }`}
                          >
                            {hasVoted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" /> Verified
                              </>
                            ) : (
                              "Confirm Fault"
                            )}
                          </button>

                          <button
                            onClick={() => toggleExpandIssue(issue.id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition sm:hidden"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expand Specs button for desktop */}
                      <div className="hidden sm:block border-t border-white/5 px-6 py-3 bg-white/[0.01]">
                        <button
                          onClick={() => toggleExpandIssue(issue.id)}
                          className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-neon-green hover:text-white transition cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" /> Collapse Hardware Telemetry Stack
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" /> Inspect Rig Context ({issue.specs.os} / {issue.specs.ramGB}GB RAM)
                            </>
                          )}
                        </button>
                      </div>

                      {/* Collapsible Details */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-3 border-t border-white/5 bg-obsidian/90 font-mono text-xs text-gray-300">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                Operating System
                              </span>
                              <span className="text-white font-bold">{issue.specs.os} ({issue.specs.osVersion})</span>
                            </div>
                            <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                System Memory
                              </span>
                              <span className="text-white font-bold">{issue.specs.ramGB} GB RAM</span>
                            </div>
                            <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                GPU Driver Package
                              </span>
                              <span className="text-neon-green font-bold">{issue.specs.gpuDriver || "GeForce Game Ready"}</span>
                            </div>
                            <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                Build Executable
                              </span>
                              <span className="text-white font-bold">v{issue.specs.appVersion} Stealth</span>
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
        initialGameId={ratingGameFilter !== "all" ? ratingGameFilter : "spiderman2"}
      />
    </main>
  );
}
