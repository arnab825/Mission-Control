"use client";

import React, { useRef, useState, useEffect } from "react";
import { Filter, ChevronDown, Check, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type IssueSortOption = "votes" | "latest";

interface GlitchesFilterBarProps {
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  sortBy: IssueSortOption;
  onSortByChange: (sort: IssueSortOption) => void;
  onOpenReportModal: () => void;
}

export const GlitchesFilterBar: React.FC<GlitchesFilterBarProps> = ({
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortByChange,
  onOpenReportModal,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2.5 sm:space-y-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#111217]/80 border border-white/10">
      {/* Categories Tab */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
        {[
          { id: "all", label: "All Logs" },
          { id: "glitch", label: "Glitches" },
          { id: "hardware", label: "Hardware" },
          { id: "performance", label: "Performance" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onCategoryFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer shrink-0 ${
              categoryFilter === tab.id
                ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_12px_rgba(118,185,0,0.4)]"
                : "bg-white/3 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Side-by-side action controls */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        {/* Custom Glassmorphic Sort Dropdown */}
        <div className="relative flex-1" ref={sortRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="w-full bg-black/70 hover:bg-black/90 border border-white/15 hover:border-neon-green/50 rounded-xl px-3 py-2 text-[11px] sm:text-xs font-mono font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between gap-1.5 transition-all shadow cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Filter className="w-3 h-3 text-neon-green shrink-0" />
              <span className="truncate">
                {sortBy === "votes" ? "Most Voted" : "Latest"}
              </span>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-gray-400 transition-transform duration-200 shrink-0 ${
                isSortOpen ? "rotate-180 text-neon-green" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {isSortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 left-0 top-full mt-1.5 bg-[#0b0c10] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-30 p-1 font-mono text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSortByChange("votes");
                    setIsSortOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer ${
                    sortBy === "votes"
                      ? "bg-neon-green text-obsidian font-bold"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>Most Voted</span>
                  {sortBy === "votes" && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSortByChange("latest");
                    setIsSortOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between cursor-pointer ${
                    sortBy === "latest"
                      ? "bg-neon-green text-obsidian font-bold"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>Latest Logged</span>
                  {sortBy === "latest" && <Check className="w-3.5 h-3.5" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="flex-1 px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl bg-neon-green text-obsidian hover:bg-white hover:shadow-[0_0_15px_rgba(118,185,0,0.4)] transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-1.5 shadow shrink-0"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />{" "}
          <span className="truncate">Log Glitch</span>
        </button>
      </div>
    </div>
  );
};
export default GlitchesFilterBar;
