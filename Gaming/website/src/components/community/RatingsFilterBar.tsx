"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  ThumbsUp,
  Clock,
  Star,
  Check,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type RatingSortOption = "top" | "latest" | "rating";

interface RatingsFilterBarProps {
  genreFilter: string;
  onGenreFilterChange: (genre: string) => void;
  availableGenres: [string, number][];
  totalReviewsCount: number;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  sortBy: RatingSortOption;
  onSortByChange: (sort: RatingSortOption) => void;
  onOpenRateModal: () => void;
}

export const RatingsFilterBar: React.FC<RatingsFilterBarProps> = ({
  genreFilter,
  onGenreFilterChange,
  availableGenres,
  totalReviewsCount,
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortByChange,
  onOpenRateModal,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const genreScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollGenres = (dir: "left" | "right") => {
    if (!genreScrollRef.current) return;
    const amount = dir === "left" ? -240 : 240;
    genreScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
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
            type="button"
            onClick={() => onGenreFilterChange("ALL")}
            className={`px-3.5 py-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              genreFilter === "ALL"
                ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.5)] scale-[1.02]"
                : "bg-white/4 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
            }`}
          >
            <span>All Genres</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                genreFilter === "ALL"
                  ? "bg-black/30 text-obsidian font-black"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {totalReviewsCount}
            </span>
          </button>

          {/* Dynamic Genre Pills */}
          {availableGenres.map(([genre, count]) => {
            const isSelected = genreFilter === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => onGenreFilterChange(isSelected ? "ALL" : genre)}
                className={`px-3.5 py-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.5)] scale-[1.02]"
                    : "bg-white/4 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                <span>{genre}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isSelected
                      ? "bg-black/30 text-obsidian font-black"
                      : "bg-white/10 text-gray-400"
                  }`}
                >
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

      {/* Search, Glassmorphic Sort Dropdown & Action Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-white/10">
        {/* Cybernetic Search Bar */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-neon-green transition-colors">
            <Search className="w-4 h-4 text-neon-green/70 group-focus-within:text-neon-green group-focus-within:drop-shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all shrink-0" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search reviews by GPU (e.g. RTX 4090), CPU, player, or keyword..."
            className="w-full h-12 pl-10 sm:pl-11 pr-10 sm:pr-24 bg-black/75 hover:bg-black/95 focus:bg-black border border-white/15 focus:border-neon-green rounded-xl sm:rounded-2xl text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-neon-green/50 focus:shadow-[0_0_25px_rgba(118,185,0,0.25)] transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
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

        {/* Right side controls: Dropdown + Share Review CTA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {/* Glassmorphic Sort Dropdown */}
          <div className="relative w-full lg:w-56" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="w-full h-12 bg-black/75 hover:bg-black/95 border border-white/15 hover:border-neon-green/50 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between gap-2 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(118,185,0,0.15)] cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="p-1 rounded-md bg-neon-green/10 border border-neon-green/30 text-neon-green shrink-0">
                  <ArrowUpDown className="w-3 h-3 text-neon-green" />
                </div>
                <span className="truncate">
                  {sortBy === "top"
                    ? "Most Helpful"
                    : sortBy === "latest"
                      ? "Latest Logged"
                      : "Highest Rating"}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 shrink-0 ${
                  isSortOpen ? "rotate-180 text-neon-green" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isSortOpen && (
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
                    {
                      id: "top",
                      label: "Most Helpful",
                      desc: "Ranked by player upvotes",
                      icon: ThumbsUp,
                    },
                    {
                      id: "latest",
                      label: "Latest Logged",
                      desc: "Most recent community posts",
                      icon: Clock,
                    },
                    {
                      id: "rating",
                      label: "Highest Rating",
                      desc: "Top score benchmarks (5.0★)",
                      icon: Star,
                    },
                  ].map((opt) => {
                    const isSelected = sortBy === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSortByChange(opt.id as RatingSortOption);
                          setIsSortOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? "bg-neon-green text-obsidian font-bold shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? "text-obsidian" : "text-neon-green"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="truncate font-bold">{opt.label}</div>
                            <div
                              className={`text-[9px] truncate ${
                                isSelected ? "text-obsidian/70" : "text-gray-500"
                              }`}
                            >
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-obsidian shrink-0 font-bold" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Share Review CTA Button */}
          <button
            type="button"
            onClick={onOpenRateModal}
            className="w-full lg:w-auto h-12 px-6 rounded-xl sm:rounded-2xl bg-neon-green text-obsidian hover:bg-white hover:shadow-[0_0_30px_rgba(118,185,0,0.6)] text-xs font-mono font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(118,185,0,0.4)] shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Share Review</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default RatingsFilterBar;
