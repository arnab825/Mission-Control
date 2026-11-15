"use client";

import React from "react";
import {
  Cpu,
  Tv,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Issue } from "./types";

interface CommunityIssueCardProps {
  issue: Issue;
  hasVoted: boolean;
  isExpanded: boolean;
  onVote: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case "hardware":
      return "text-[#76b900] bg-[#76b900]/10 border-[#76b900]/30";
    case "glitch":
      return "text-neon-green bg-neon-green/10 border-neon-green/30 shadow-[0_0_10px_rgba(118,185,0,0.15)]";
    case "performance":
      return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    default:
      return "text-gray-300 bg-white/5 border-white/10";
  }
};

export const CommunityIssueCard: React.FC<CommunityIssueCardProps> = React.memo(
  ({ issue, hasVoted, isExpanded, onVote, onToggleExpand }) => {
    return (
      <div
        className={`bg-[#0f1015] rounded-xl sm:rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
          isExpanded
            ? "border-neon-green/50 bg-neon-green/2 shadow-[0_0_25px_rgba(118,185,0,0.15)]"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 sm:gap-5">
          {/* Content Section */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider border ${getCategoryColor(
                  issue.category
                )}`}
              >
                {issue.category}
              </span>
              {issue.game && (
                <span className="text-[10px] sm:text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-40">
                  Context: <strong className="text-white">{issue.game}</strong>
                </span>
              )}
              <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono">
                LOGGED: {new Date(issue.createdAt).toLocaleDateString()}
              </span>
              {issue.author && (
                <span className="text-[9px] sm:text-[10px] font-mono text-neon-green/90 bg-neon-green/10 px-2 py-0.5 rounded border border-neon-green/20">
                  PILOT: <strong>@{issue.author}</strong>
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-lg font-bold text-white tracking-wide font-display wrap-break-word leading-snug">
              {issue.title}
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-4xl font-sans wrap-break-word">
              {issue.description}
            </p>

            {/* Primary specs tags */}
            <div className="flex flex-wrap gap-1.5 text-[9px] sm:text-[10px] font-mono text-gray-300 pt-1">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian border border-white/10 truncate max-w-50">
                <Cpu className="w-3 h-3 text-neon-green shrink-0" />{" "}
                <span className="truncate">{issue.specs.cpu}</span>
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-obsidian border border-white/10 truncate max-w-50">
                <Tv className="w-3 h-3 text-neon-green shrink-0" />{" "}
                <span className="truncate">{issue.specs.gpu}</span>
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
                type="button"
                onClick={() => onVote(issue.id)}
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
                type="button"
                onClick={() => onToggleExpand(issue.id)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition sm:hidden shrink-0"
                aria-label="Toggle details"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expand Specs button for desktop */}
        <div className="hidden sm:block border-t border-white/5 px-5 py-2.5 bg-white/1">
          <button
            type="button"
            onClick={() => onToggleExpand(issue.id)}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-neon-green hover:text-white transition cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> Collapse Hardware Telemetry Stack
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Inspect Rig Context ({issue.specs.os} /{" "}
                {issue.specs.ramGB}GB RAM)
              </>
            )}
          </button>
        </div>

        {/* Collapsible Details */}
        {isExpanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2.5 border-t border-white/5 bg-obsidian/90 font-mono text-xs text-gray-300">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="space-y-1 bg-white/2 p-2 sm:p-2.5 rounded-xl border border-white/5">
                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  Operating System
                </span>
                <span className="text-white font-bold truncate block text-[11px]">
                  {issue.specs.os} ({issue.specs.osVersion})
                </span>
              </div>
              <div className="space-y-1 bg-white/2 p-2 sm:p-2.5 rounded-xl border border-white/5">
                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  System Memory
                </span>
                <span className="text-white font-bold truncate block text-[11px]">
                  {issue.specs.ramGB} GB RAM
                </span>
              </div>
              <div className="space-y-1 bg-white/2 p-2 sm:p-2.5 rounded-xl border border-white/5">
                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  GPU Driver Package
                </span>
                <span className="text-neon-green font-bold truncate block text-[11px]">
                  {issue.specs.gpuDriver || "GeForce Game Ready"}
                </span>
              </div>
              <div className="space-y-1 bg-white/2 p-2 sm:p-2.5 rounded-xl border border-white/5">
                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  Build Executable
                </span>
                <span className="text-white font-bold truncate block text-[11px]">
                  v{issue.specs.appVersion} Stealth
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
CommunityIssueCard.displayName = "CommunityIssueCard";
export default CommunityIssueCard;
