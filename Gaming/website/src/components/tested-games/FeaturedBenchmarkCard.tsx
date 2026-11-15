"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Play,
  Maximize2,
  BookOpen,
  Zap,
  Users,
  Plus,
  Star,
  MessageSquare,
  ThumbsUp,
  Tv,
  Cpu,
} from "lucide-react";
import { BenchmarkProfile } from "@/data/benchmarks";

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  recommendationRate: number;
  avgReportedFps: number;
  distribution: { [key: number]: number };
}

interface FeaturedBenchmarkCardProps {
  featuredGame: BenchmarkProfile;
  screenshots: { src: string; title: string; desc: string }[];
  onOpenSlideshow: (index: number) => void;
  ratingStats: RatingStats | null;
  reviews: any[];
  loadingReviews: boolean;
  votedReviewIds: string[];
  onVoteReview: (reviewId: string) => void;
  sortByReview: "top" | "latest";
  onSortByReviewChange: (sort: "top" | "latest") => void;
  onOpenRateModal: () => void;
}

export const FeaturedBenchmarkCard: React.FC<FeaturedBenchmarkCardProps> = ({
  featuredGame,
  screenshots,
  onOpenSlideshow,
  ratingStats,
  reviews,
  loadingReviews,
  votedReviewIds,
  onVoteReview,
  sortByReview,
  onSortByReviewChange,
  onOpenRateModal,
}) => {
  return (
    <motion.div
      key={featuredGame.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl sm:rounded-3xl bg-[#0c0d12] border border-white/15 p-4 sm:p-8 lg:p-10 shadow-2xl overflow-hidden group"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-75 sm:w-125 h-75 sm:h-125 bg-neon-green/10 blur-[80px] sm:blur-[100px] pointer-events-none rounded-full" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
        {/* Left Column: Game Info & Metrics */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-bold text-neon-green uppercase tracking-widest mb-2 flex-wrap">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />{" "}
              <span>{featuredGame.publisher}</span> • <span>{featuredGame.api}</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black font-display text-white uppercase tracking-tight wrap-break-word">
              {featuredGame.name}
            </h3>
            <p className="text-gray-300 text-xs sm:text-sm font-sans mt-2.5 sm:mt-3 leading-relaxed border-l-2 border-neon-green/40 pl-2.5 sm:pl-3 wrap-break-word">
              {featuredGame.overview}
            </p>
          </div>

          {/* Tested Specs Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 font-mono">
            <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">
                Avg FPS
              </div>
              <div className="text-lg sm:text-xl font-black text-neon-green truncate">
                {featuredGame.testedSpecs.avgFps}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">
                Input Latency
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 truncate">
                {featuredGame.testedSpecs.latency}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">
                VRAM Allocation
              </div>
              <div className="text-xs sm:text-sm font-bold text-white truncate">
                {featuredGame.testedSpecs.vramUsed}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase truncate">
                GPU Usage
              </div>
              <div className="text-xs sm:text-sm font-bold text-neon-yellow truncate">
                {featuredGame.testedSpecs.gpuLoad}
              </div>
            </div>
          </div>

          {/* Key Technologies Verified */}
          <div className="space-y-2">
            <div className="text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
              Verified Key Technologies
            </div>
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
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/3 border border-white/10 space-y-2 font-mono text-xs">
            <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-[11px] sm:text-xs">
              <Sliders className="w-3.5 h-3.5 text-neon-green shrink-0" />{" "}
              <span>Recommended Presets</span>
            </div>
            <div className="space-y-1.5 text-gray-300 text-[10px] sm:text-[11px]">
              <div className="flex flex-col xs:flex-row xs:justify-between border-b border-white/5 pb-1 gap-0.5">
                <span className="text-gray-400">RTX 40 / 50:</span>
                <span className="font-bold text-neon-green wrap-break-word">
                  {featuredGame.presets.rtx40}
                </span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between border-b border-white/5 pb-1 gap-0.5">
                <span className="text-gray-400">RTX 30:</span>
                <span className="font-bold text-emerald-400 wrap-break-word">
                  {featuredGame.presets.rtx30}
                </span>
              </div>
              <div className="flex flex-col xs:flex-row xs:justify-between gap-0.5">
                <span className="text-gray-400">GTX 10 / 16:</span>
                <span className="font-bold text-neon-yellow wrap-break-word">
                  {featuredGame.presets.gtx}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Screenshot Gallery Preview */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          <div className="text-[11px] sm:text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span>Captured Telemetry Screenshots</span>
            <span className="text-neon-green text-[10px] font-bold flex items-center gap-1">
              <Play className="w-2.5 h-2.5 fill-neon-green" /> Interactive Slideshow
            </span>
          </div>

          {/* Primary Large Screenshot */}
          {screenshots.length > 0 && (
            <div
              onClick={() => onOpenSlideshow(0)}
              className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-white/15 bg-black cursor-pointer group/img shadow-2xl"
            >
              <img
                src={screenshots[0].src}
                alt={screenshots[0].title}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex items-end p-3 sm:p-4">
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
                onClick={() => onOpenSlideshow(idx + 1)}
                className="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-white/15 bg-black cursor-pointer group/img shadow-lg"
              >
                <img
                  src={ss.src}
                  alt={ss.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex items-end p-2 sm:p-3">
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
                <h4 className="text-lg sm:text-3xl font-black font-display text-amber-300 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,0.35)] wrap-break-word">
                  A Thrilling Cinematic Narrative
                </h4>
                <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shrink-0">
                  <BookOpen className="w-3 h-3" /> Overview
                </span>
              </div>

              <p className="text-gray-300 text-xs sm:text-base font-sans leading-relaxed max-w-4xl wrap-break-word">
                {featuredGame.detailedOverview.story}
              </p>

              {/* Cinematic Story Image Banner */}
              {screenshots.length > 0 && (
                <div
                  onClick={() => onOpenSlideshow(0)}
                  className="relative w-full aspect-video sm:aspect-21/9 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-400/20 bg-black/60 shadow-2xl cursor-pointer group/banner mt-2 sm:mt-4"
                >
                  <img
                    src={screenshots[0].src}
                    alt={featuredGame.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex flex-col sm:flex-row items-start sm:items-end justify-between p-3 sm:p-6 gap-2">
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
                <h4 className="text-lg sm:text-3xl font-black font-display text-emerald-400 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(52,211,153,0.35)] wrap-break-word">
                  Dynamic Gameplay & Combat Systems
                </h4>
                <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shrink-0">
                  <Zap className="w-3 h-3" /> Systems
                </span>
              </div>

              <p className="text-gray-300 text-xs sm:text-base font-sans leading-relaxed max-w-4xl wrap-break-word">
                {featuredGame.detailedOverview.gameplayLoop}
              </p>

              {/* Cinematic Gameplay Loop Banner */}
              {screenshots.length > 1 && (
                <div
                  onClick={() => onOpenSlideshow(1)}
                  className="relative w-full aspect-video sm:aspect-21/9 rounded-xl sm:rounded-2xl overflow-hidden border border-emerald-400/20 bg-black/60 shadow-2xl cursor-pointer group/banner mt-2 sm:mt-4"
                >
                  <img
                    src={screenshots[1].src}
                    alt={featuredGame.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex flex-col sm:flex-row items-start sm:items-end justify-between p-3 sm:p-6 gap-2">
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
                <h4 className="text-lg sm:text-2xl font-black font-display text-white uppercase tracking-wider wrap-break-word">
                  Signature Mechanics & Combat Innovations
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {featuredGame.detailedOverview.keyMechanics.map((mech, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/3 border border-white/10 hover:border-neon-yellow/40 transition-colors font-mono space-y-1.5 sm:space-y-2 group/card"
                  >
                    <div className="text-neon-yellow font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(250,204,21,0.8)] shrink-0" />
                      <span className="truncate">{mech.name}</span>
                    </div>
                    <p className="text-gray-300 text-xs sm:text-sm font-sans leading-relaxed wrap-break-word">
                      {mech.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Community Hardware Telemetry & Rig Reviews */}
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
                  onClick={onOpenRateModal}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl btn-premium-primary font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(118,185,0,0.4)] cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Share Review & Rig Log</span>
                </button>
              </div>

              {/* Community Metrics Summary Card */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                <div className="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">
                    Community Score
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400">
                      {ratingStats && ratingStats.totalRatings > 0
                        ? ratingStats.averageRating.toFixed(1)
                        : featuredGame.storeRating
                          ? parseFloat(featuredGame.storeRating).toFixed(1)
                          : featuredGame.score
                            ? (featuredGame.score / 20).toFixed(1)
                            : "5.0"}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">/ 5.0</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                    {(() => {
                      const scoreNum =
                        ratingStats && ratingStats.totalRatings > 0
                          ? ratingStats.averageRating
                          : featuredGame.storeRating
                            ? parseFloat(featuredGame.storeRating)
                            : featuredGame.score
                              ? featuredGame.score / 20
                              : 5;
                      const fullStars = Math.min(5, Math.max(0, Math.floor(scoreNum)));
                      return (
                        <>
                          {"★".repeat(fullStars)}
                          {"☆".repeat(5 - fullStars)}
                        </>
                      );
                    })()}
                    <span className="text-gray-400 text-[10px] ml-1">
                      ({ratingStats?.totalRatings ?? reviews.length} logs)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">
                    Recommendation
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-neon-green">
                    {ratingStats && ratingStats.totalRatings > 0
                      ? `${ratingStats.recommendationRate}%`
                      : `${featuredGame.score || 100}%`}
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">
                    Verified with Mission Control
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">
                    Avg Community FPS
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {ratingStats &&
                    ratingStats.totalRatings > 0 &&
                    ratingStats.avgReportedFps > 0
                      ? `${ratingStats.avgReportedFps} FPS`
                      : featuredGame.testedSpecs.avgFps}
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">
                    {ratingStats &&
                    ratingStats.totalRatings > 0 &&
                    ratingStats.avgReportedFps > 0
                      ? "Captured across player rigs"
                      : "Verified benchmark telemetry"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">
                    Telemetry Engine
                  </span>
                  <div
                    className="text-base sm:text-lg font-bold text-white truncate"
                    title={featuredGame.api}
                  >
                    {featuredGame.api}
                  </div>
                  <span className="text-[10px] text-neon-green block truncate">
                    Zero-Latency Local Overlay
                  </span>
                </div>
              </div>

              {/* Star Rating Distribution Bar Chart */}
              {ratingStats && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white/2 border border-white/10 space-y-2 font-mono">
                  <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Rating Score Distribution
                  </div>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingStats.distribution[star] || 0;
                    const pct =
                      ratingStats.totalRatings > 0
                        ? (count / ratingStats.totalRatings) * 100
                        : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-10 text-gray-400 font-bold flex items-center gap-0.5 shrink-0">
                          {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-linear-to-r from-amber-400 to-neon-green rounded-full transition-all duration-500"
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
                    onClick={() => onSortByReviewChange("top")}
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
                    onClick={() => onSortByReviewChange("latest")}
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
                <div className="p-8 text-center rounded-2xl bg-white/2 border border-white/10 space-y-3 font-mono">
                  <Star className="w-8 h-8 text-gray-600 mx-auto" />
                  <div className="text-sm font-bold text-white uppercase">
                    No Community Logs Yet
                  </div>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Be the first pilot to benchmark your GPU rig and log performance telemetry for {featuredGame.name}.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenRateModal}
                    className="px-4 py-2 rounded-xl btn-premium-primary font-bold text-xs uppercase tracking-wider cursor-pointer"
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
                        className="p-4 sm:p-5 rounded-2xl bg-white/2 border border-white/10 hover:border-white/20 transition-all space-y-3 font-mono flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {/* Reviewer Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green text-xs font-bold uppercase">
                                {rev.userName ? rev.userName[0] : "A"}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white truncate max-w-35 sm:max-w-50">
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

                          {/* Attached Media Gallery */}
                          {rev.media && rev.media.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {rev.media.map((m: any, mIdx: number) => (
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
                                      loading="lazy"
                                      decoding="async"
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

                          {/* Rig Specs Pill Badges */}
                          <div className="flex flex-wrap gap-1.5 text-[10px] pt-1">
                            {rev.specs?.gpu && (
                              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-50">
                                <Tv className="w-2.5 h-2.5 text-neon-green shrink-0" />
                                <span className="truncate">{rev.specs.gpu}</span>
                              </span>
                            )}
                            {rev.specs?.cpu && (
                              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-50">
                                <Cpu className="w-2.5 h-2.5 text-neon-green shrink-0" />
                                <span className="truncate">{rev.specs.cpu}</span>
                              </span>
                            )}
                            {rev.specs?.fpsReported && (
                              <span className="px-2 py-0.5 rounded-md bg-neon-green/10 border border-neon-green/30 text-neon-green font-bold flex items-center gap-1 shrink-0">
                                <Zap className="w-2.5 h-2.5 shrink-0" />
                                {rev.specs.fpsReported} FPS{" "}
                                {rev.specs.resolution
                                  ? `@ ${rev.specs.resolution.split(" ")[0]}`
                                  : ""}
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
                            onClick={() => onVoteReview(rev.id)}
                            disabled={hasVoted}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              hasVoted
                                ? "bg-neon-green/20 text-neon-green border border-neon-green/40 cursor-default"
                                : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
                            }`}
                          >
                            <ThumbsUp
                              className={`w-3 h-3 ${hasVoted ? "fill-neon-green text-neon-green" : ""}`}
                            />
                            <span>
                              {hasVoted ? "Helpful" : "Helpful"} ({rev.upvotes || 0})
                            </span>
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
  );
};
export default FeaturedBenchmarkCard;
