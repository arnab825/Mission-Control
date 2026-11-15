"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type SortOption = "featured" | "fps" | "latency" | "name";

interface TestedGamesFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalGamesCount: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterGenre: string;
  onGenreSelect: (genre: string) => void;
  availableGenres: [string, number][];
  onResetFilters: () => void;
}

export const TestedGamesFilterBar: React.FC<TestedGamesFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  totalGamesCount,
  sortBy,
  onSortChange,
  filterGenre,
  onGenreSelect,
  availableGenres,
  onResetFilters,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const genreScrollRef = useRef<HTMLDivElement>(null);

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

  const scrollGenres = (direction: "left" | "right") => {
    if (genreScrollRef.current) {
      const scrollAmount = direction === "left" ? -200 : 200;
      genreScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const isFiltered = filterGenre !== "ALL" || searchQuery || sortBy !== "featured";

  return (
    <div className="space-y-3 sm:space-y-4 bg-white/2 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 backdrop-blur-md w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${totalGamesCount} tested games...`}
            className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-black/60 border border-white/15 focus:border-neon-green rounded-xl text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
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
                {sortBy === "featured" && (
                  <Sparkles className="w-3.5 h-3.5 text-neon-green shrink-0" />
                )}
                {sortBy === "fps" && <Zap className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                {sortBy === "latency" && (
                  <Activity className="w-3.5 h-3.5 text-neon-green shrink-0" />
                )}
                {sortBy === "name" && (
                  <ArrowUpDown className="w-3.5 h-3.5 text-neon-green shrink-0" />
                )}
                <span className="truncate">
                  {sortBy === "featured" && "Featured"}
                  {sortBy === "fps" && "Highest FPS"}
                  {sortBy === "latency" && "Lowest Latency"}
                  {sortBy === "name" && "Title (A-Z)"}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${
                  isSortOpen ? "rotate-180 text-neon-green" : ""
                }`}
              />
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
                    { value: "name", label: "Title (A-Z)", icon: ArrowUpDown },
                  ].map((opt) => {
                    const isCurrent = sortBy === opt.value;
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onSortChange(opt.value as SortOption);
                          setIsSortOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-neon-green/15 text-neon-green border-l-2 border-neon-green"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <IconComp
                            className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-neon-green" : "text-gray-400"}`}
                          />
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {isCurrent && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-neon-green shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Scalable Horizontal-Scrolling Genre Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-white/5 w-full">
        <button
          type="button"
          onClick={() => scrollGenres("left")}
          className="w-7 h-7 rounded-lg bg-black/70 hover:bg-black/90 border border-white/15 hover:border-neon-green/50 flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md cursor-pointer shrink-0"
          title="Scroll left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={genreScrollRef}
          className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
          style={{ scrollbarWidth: "none" }}
        >
          {/* 'ALL' Pill */}
          <button
            type="button"
            onClick={() => onGenreSelect("ALL")}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              filterGenre === "ALL"
                ? "btn-premium-primary shadow-[0_0_20px_rgba(118,185,0,0.55)] scale-105"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10"
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterGenre === "ALL"
                  ? "bg-black/40 text-black font-black"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {totalGamesCount}
            </span>
          </button>

          {/* Dynamic Genre Pills */}
          {availableGenres.map(([genre, count]) => {
            const isSelected = filterGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => onGenreSelect(isSelected ? "ALL" : genre)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "btn-premium-primary shadow-[0_0_20px_rgba(118,185,0,0.55)] scale-105"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10"
                }`}
              >
                <span>{genre}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-black/40 text-black font-black"
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
          className="w-7 h-7 rounded-lg bg-black/70 hover:bg-black/90 border border-white/15 hover:border-neon-green/50 flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md cursor-pointer shrink-0"
          title="Scroll right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
export default TestedGamesFilterBar;
