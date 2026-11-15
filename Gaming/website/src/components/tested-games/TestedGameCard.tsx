"use client";

import React from "react";
import { Gamepad2, Zap, ArrowRight } from "lucide-react";
import { TestedGameSummary } from "@/data/benchmarks";

interface TestedGameCardProps {
  game: TestedGameSummary;
  isSelected: boolean;
  storeRating?: string;
  onSelect: (id: string) => void;
}

export const TestedGameCard: React.FC<TestedGameCardProps> = React.memo(
  ({ game, isSelected, storeRating, onSelect }) => {
    return (
      <div
        className={`rounded-2xl sm:rounded-3xl bg-[#0b0c10] border transition-all duration-300 flex flex-col justify-between group overflow-hidden ${
          isSelected
            ? "border-neon-green shadow-[0_0_30px_rgba(118,185,0,0.25)]"
            : "border-white/10 hover:border-neon-green/50 hover:shadow-[0_0_25px_rgba(118,185,0,0.15)] shadow-xl"
        }`}
      >
        {/* Card Cover Header with Live Telemetry Badges */}
        <div className="relative h-40 sm:h-48 w-full overflow-hidden border-b border-white/10 group-hover:border-neon-green/30">
          <img
            src={game.coverImage}
            alt={game.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== "/images/game-placeholder.png") {
                target.src = "/images/game-placeholder.png";
              }
            }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#0b0c10] via-black/20 to-black/40" />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-gray-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/85 border border-white/20 backdrop-blur-md uppercase tracking-wider flex items-center gap-1 shadow-md truncate">
              <Gamepad2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neon-green shrink-0" />{" "}
              {game.genre.split("/")[0]}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300 bg-black/85 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-amber-400/30 uppercase backdrop-blur-md shadow-md shrink-0">
              {storeRating || "Verified"}
            </span>
          </div>

          {/* Bottom Floating Live Telemetry Badge */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green text-[9px] sm:text-[10px] font-mono font-bold backdrop-blur-md flex items-center gap-1 shadow-lg truncate">
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-neon-green shrink-0" /> {game.fps}
            </span>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-black/80 border border-white/20 text-white text-[9px] sm:text-[10px] font-mono font-bold backdrop-blur-md truncate">
              {game.dlssVersion || game.api || "Verified"}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col justify-between flex-1 space-y-3 sm:space-y-4">
          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <div className="text-[10px] sm:text-[11px] font-mono text-gray-400 font-bold uppercase tracking-wider mb-1 truncate">
                {game.publisher}
              </div>
              <h3 className="text-lg sm:text-xl font-black font-display text-white uppercase tracking-tight group-hover:text-neon-green transition-colors line-clamp-1 wrap-break-word">
                {game.name}
              </h3>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/3 border border-white/10 space-y-1.5 sm:space-y-2 font-mono text-xs">
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
                <span className="font-bold text-emerald-400 truncate">
                  {game.latency} • {game.gpuLoad}
                </span>
              </div>
              <div className="flex justify-between text-[10px] sm:text-[11px]">
                <span className="text-gray-400">Graphics API:</span>
                <span className="font-bold text-teal-300 truncate">{game.api}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(game.id)}
            className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
              isSelected
                ? "btn-premium-primary shadow-[0_0_20px_rgba(118,185,0,0.5)]"
                : "btn-premium-glass text-white hover:text-neon-green"
            }`}
          >
            <span className="truncate">
              {isSelected ? "Viewing Profile & Gallery" : "View Benchmark & Gameplay"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-neon-green" />
          </button>
        </div>
      </div>
    );
  }
);

TestedGameCard.displayName = "TestedGameCard";
export default TestedGameCard;
