"use client";

import React from "react";
import { ThumbsUp, Tv, Cpu, Zap } from "lucide-react";
import { GameRatingItem } from "./types";

interface CommunityRatingCardProps {
  review: GameRatingItem;
  hasVoted: boolean;
  onVote: (id: string) => void;
}

export const CommunityRatingCard: React.FC<CommunityRatingCardProps> = React.memo(
  ({ review: rev, hasVoted, onVote }) => {
    return (
      <div className="rounded-xl sm:rounded-2xl bg-[#0f1015] border border-white/10 hover:border-neon-green/40 p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all duration-300 font-mono shadow-lg">
        <div className="space-y-2.5">
          {/* Header with user tag, game name, star rating */}
          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green text-xs font-bold uppercase shrink-0">
                {rev.userName ? rev.userName[0] : "A"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate max-w-30 sm:max-w-45">
                  {rev.userName}
                </div>
                <span className="text-[9px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded truncate inline-block max-w-30 sm:max-w-45">
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
            <h4 className="text-xs sm:text-sm font-bold text-white font-display uppercase tracking-wide leading-snug wrap-break-word">
              {rev.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-gray-300 font-sans leading-relaxed mt-1 wrap-break-word">
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

          {/* Hardware Rig Specs Badge Strip */}
          <div className="flex flex-wrap gap-1.5 pt-1 text-[9px] sm:text-[10px]">
            {rev.specs?.gpu && (
              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-50">
                <Tv className="w-3 h-3 text-neon-green shrink-0" />
                <span className="truncate">{rev.specs.gpu}</span>
              </span>
            )}
            {rev.specs?.cpu && (
              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-gray-300 flex items-center gap-1 truncate max-w-50">
                <Cpu className="w-3 h-3 text-neon-green shrink-0" />
                <span className="truncate">{rev.specs.cpu}</span>
              </span>
            )}
            {rev.specs?.fpsReported && (
              <span className="px-2 py-0.5 rounded-md bg-neon-green/10 border border-neon-green/30 text-neon-green font-bold flex items-center gap-1 shrink-0">
                <Zap className="w-3 h-3 shrink-0" />
                {rev.specs.fpsReported} FPS{" "}
                {rev.specs.resolution ? `@ ${rev.specs.resolution.split(" ")[0]}` : ""}
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
            onClick={() => onVote(rev.id)}
            disabled={hasVoted}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              hasVoted
                ? "bg-neon-green/20 text-neon-green border border-neon-green/40 cursor-default"
                : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
            }`}
          >
            <ThumbsUp
              className={`w-3 h-3 ${hasVoted ? "fill-neon-green text-neon-green" : ""}`}
            />
            <span>Helpful ({rev.upvotes || 0})</span>
          </button>
        </div>
      </div>
    );
  }
);
CommunityRatingCard.displayName = "CommunityRatingCard";
export default CommunityRatingCard;
