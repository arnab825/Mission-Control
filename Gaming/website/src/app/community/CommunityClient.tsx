"use client";

import { useEffect, useState, useMemo } from "react";
import { Radio, Star, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import ReportModal from "@/components/modals/ReportModal";
import RateGameModal from "@/components/modals/RateGameModal";
import {
  TestedGameSummary,
  getLiveTestedGames,
  fetchBenchmarks,
} from "@/data/benchmarks";
import {
  Issue,
  GameRatingItem,
  RatingSortOption,
  IssueSortOption,
  CommunityRatingCard,
  CommunityIssueCard,
  RatingsFilterBar,
  GlitchesFilterBar,
} from "@/components/community";

export default function CommunityClient() {
  // Main Tab: "ratings" | "glitches"
  const [activeTab, setActiveTab] = useState<"ratings" | "glitches">("ratings");

  // Ratings State
  const [reviews, setReviews] = useState<GameRatingItem[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [ratingGenreFilter, setRatingGenreFilter] = useState<string>("ALL");
  const [ratingSortBy, setRatingSortBy] = useState<RatingSortOption>("top");
  const [ratingSearchQuery, setRatingSearchQuery] = useState<string>("");
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [votedReviewIds, setVotedReviewIds] = useState<string[]>([]);
  const [ratingStats, setRatingStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    recommendationRate: 100,
    avgReportedFps: 0,
  });
  const [testedGames, setTestedGames] = useState<TestedGameSummary[]>(getLiveTestedGames());

  // Glitches / Issues State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [votedIssueIds, setVotedIssueIds] = useState<string[]>([]);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [issueSortBy, setIssueSortBy] = useState<IssueSortOption>("votes");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [issueStats, setIssueStats] = useState({
    total: 0,
    glitches: 0,
    hardware: 0,
    performance: 0,
  });

  // Dynamic Genre Aggregation from tested games library
  const availableGenres = useMemo(() => {
    const genreMap = new Map<string, number>();

    testedGames.forEach((g) => {
      const parts = g.genre
        .split(/[\/,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      parts.forEach((p) => {
        genreMap.set(p, (genreMap.get(p) || 0) + 1);
      });
    });

    return Array.from(genreMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [testedGames]);

  useEffect(() => {
    fetchBenchmarks()
      .then((data) => {
        if (data.testedGames && data.testedGames.length > 0) {
          setTestedGames(data.testedGames);
        }
      })
      .catch(() => {});
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
            avgReportedFps: data.summary.avgReportedFps || 0,
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

        const counts = data.reduce(
          (acc: any, curr: Issue) => {
            acc.total++;
            if (curr.category === "glitch") acc.glitches++;
            else if (curr.category === "hardware") acc.hardware++;
            else if (curr.category === "performance") acc.performance++;
            return acc;
          },
          { total: 0, glitches: 0, hardware: 0, performance: 0 }
        );

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
        setIssues((prev) =>
          prev.map((issue) => (issue.id === issueId ? { ...issue, votes: issue.votes + 1 } : issue))
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

  const toggleExpandIssue = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  // Filtered Reviews based on Genre, Search query, and Sorting
  const processedReviews = useMemo(() => {
    let list = [...reviews];

    if (ratingGenreFilter !== "ALL") {
      const gNorm = ratingGenreFilter.toLowerCase();
      list = list.filter((r) => {
        const game = testedGames.find(
          (g) => g.id === r.gameId || g.name.toLowerCase() === r.gameName?.toLowerCase()
        );
        if (game) {
          return game.genre.toLowerCase().includes(gNorm);
        }
        return (r.title + " " + r.review + " " + r.gameName).toLowerCase().includes(gNorm);
      });
    }

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

    if (ratingSortBy === "top") {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else if (ratingSortBy === "latest") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (ratingSortBy === "rating") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [reviews, ratingGenreFilter, ratingSearchQuery, ratingSortBy, testedGames]);

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

  return (
    <main className="flex-1 min-h-screen pt-24 sm:pt-28 pb-20 sm:pb-24 px-3 sm:px-6 lg:px-8 bg-obsidian relative overflow-x-hidden w-full max-w-full">
      {/* Cyber Grid & Ambient Background */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-125 h-75 bg-neon-green/10 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

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
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black font-display uppercase tracking-tight text-white leading-tight wrap-break-word">
            COMMUNITY <span className="text-neon-green glow-text-teal">INTEL HUB</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-sans max-w-xl mx-auto wrap-break-word">
            Read real player game reviews, compare hardware rig setups, or submit system driver
            glitches to trigger community fixes.
          </p>
        </motion.div>

        {/* Top-Level Navigation Tabs */}
        <div className="flex justify-center w-full px-2">
          <div className="inline-flex p-1 rounded-xl bg-[#111217] border border-white/15 backdrop-blur-xl gap-1 shadow-lg w-full max-w-[320px] sm:max-w-sm">
            <button
              type="button"
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
              type="button"
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
                  color: "text-white",
                },
                {
                  label: "Average Rating",
                  count:
                    ratingStats.averageRating > 0
                      ? `${ratingStats.averageRating.toFixed(1)} / 5.0`
                      : "Unrated",
                  color: "text-amber-400",
                },
                {
                  label: "Player Recommended",
                  count: `${ratingStats.recommendationRate}%`,
                  color: "text-neon-green glow-text-teal",
                },
                {
                  label: "Avg Rig FPS",
                  count: ratingStats.avgReportedFps > 0 ? `${ratingStats.avgReportedFps} FPS` : "—",
                  color: "text-emerald-400",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="min-w-0 w-full bg-[#111217]/90 border border-white/10 rounded-xl p-2.5 sm:p-4 flex flex-col items-center justify-center text-center space-y-1 shadow-md overflow-hidden"
                >
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs uppercase font-mono font-bold text-gray-400 tracking-wider truncate block w-full max-w-full">
                    {item.label}
                  </span>
                  <span
                    className={`text-base min-[360px]:text-lg sm:text-2xl font-black font-mono truncate max-w-full ${item.color}`}
                  >
                    {loadingRatings ? "..." : item.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Dynamic Genre Filter & Search Controls */}
            <RatingsFilterBar
              genreFilter={ratingGenreFilter}
              onGenreFilterChange={setRatingGenreFilter}
              availableGenres={availableGenres}
              totalReviewsCount={reviews.length}
              searchQuery={ratingSearchQuery}
              onSearchQueryChange={setRatingSearchQuery}
              sortBy={ratingSortBy}
              onSortByChange={setRatingSortBy}
              onOpenRateModal={() => setIsRateModalOpen(true)}
            />

            {/* Ratings Feed */}
            {loadingRatings ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-8 h-8 border-3 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neon-green font-mono tracking-wider uppercase">
                  Loading community reviews...
                </p>
              </div>
            ) : processedReviews.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-[#111217] rounded-xl sm:rounded-2xl border border-white/10 space-y-2.5 font-mono p-4">
                <Star className="w-8 h-8 text-gray-500 mx-auto" />
                <h3 className="text-sm sm:text-base font-bold text-white font-display uppercase leading-tight">
                  {ratingSearchQuery
                    ? "No matching community posts"
                    : "No community reviews posted yet"}
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {ratingSearchQuery
                    ? "Try adjusting your search terms or clearing the filter."
                    : "Be the first community member to share your gameplay impressions and rig setup."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(true)}
                  className="mt-1.5 px-4 py-2 rounded-xl bg-neon-green text-obsidian font-bold text-xs uppercase tracking-wider font-mono hover:bg-white transition-all shadow-md cursor-pointer"
                >
                  + Write First Community Review
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {processedReviews.map((rev) => (
                  <CommunityRatingCard
                    key={rev.id}
                    review={rev}
                    hasVoted={votedReviewIds.includes(rev.id)}
                    onVote={handleVoteReview}
                  />
                ))}
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
                {
                  label: "Rendering Glitches",
                  count: issueStats.glitches,
                  color: "text-neon-green glow-text-teal",
                },
                {
                  label: "Hardware & Sensors",
                  count: issueStats.hardware,
                  color: "text-[#76b900]",
                },
                {
                  label: "Performance Drops",
                  count: issueStats.performance,
                  color: "text-amber-400",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="min-w-0 w-full bg-[#111217]/90 border border-white/10 rounded-xl p-2.5 sm:p-4 flex flex-col items-center justify-center text-center space-y-1 shadow-md overflow-hidden"
                >
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs uppercase font-mono font-bold text-gray-400 tracking-wider truncate block w-full max-w-full">
                    {item.label}
                  </span>
                  <span
                    className={`text-base min-[360px]:text-lg sm:text-2xl font-black font-mono truncate max-w-full ${item.color}`}
                  >
                    {loadingIssues ? "..." : item.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Filters and Actions Header */}
            <GlitchesFilterBar
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              sortBy={issueSortBy}
              onSortByChange={setIssueSortBy}
              onOpenReportModal={() => setIsIssueModalOpen(true)}
            />

            {/* Glitches List */}
            {loadingIssues ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-8 h-8 border-3 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neon-green font-mono tracking-wider uppercase">
                  Loading telemetry feed...
                </p>
              </div>
            ) : processedIssues.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-[#111217] rounded-xl sm:rounded-2xl border border-white/10 space-y-2.5 p-4 font-mono">
                <AlertTriangle className="w-8 h-8 text-gray-500 mx-auto" />
                <h3 className="text-sm sm:text-base font-bold text-white font-display uppercase leading-tight">
                  No telemetry reports match filters
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-400 max-w-sm mx-auto">
                  Be the first operator to dispatch a hardware or rendering fault.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {processedIssues.map((issue) => (
                  <CommunityIssueCard
                    key={issue.id}
                    issue={issue}
                    hasVoted={votedIssueIds.includes(issue.id)}
                    isExpanded={expandedIssueId === issue.id}
                    onVote={handleVoteIssue}
                    onToggleExpand={toggleExpandIssue}
                  />
                ))}
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
        initialGameId={testedGames[0]?.id || "codmw4"}
        availableGames={testedGames}
      />
    </main>
  );
}
