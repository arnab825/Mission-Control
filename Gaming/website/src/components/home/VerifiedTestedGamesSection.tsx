"use client";

import Link from "next/link";
import { TestedGameSummary } from "@/data/benchmarks";
import {
  Gamepad2,
  ArrowRight,
  Cpu,
  Sparkles,
  Zap,
  Activity,
  Flame,
  Eye,
  Shield,
} from "lucide-react";

interface VerifiedTestedGamesSectionProps {
  testedGames: TestedGameSummary[];
}

export function VerifiedTestedGamesSection({ testedGames }: VerifiedTestedGamesSectionProps) {
  return (
    <section className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 mx-auto">
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-3 backdrop-blur-md">
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">VERIFIED HARDWARE BENCHMARKS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-white">
          SUPPORTED <span className="text-neon-green glow-text-teal">AAA TITLES</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-base font-sans mt-2">
          Real hardware benchmark profiles verified natively on local NVIDIA GPUs with zero game latency.
        </p>
      </div>

      {/* Display Verified Tested Games */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
        {testedGames.map((game) => (
          <div
            key={game.id}
            className="rounded-3xl border border-white/15 bg-[#0b0c10] hover:border-neon-green/60 flex flex-col justify-between group relative overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_0_30px_rgba(118,185,0,0.25)] transition-all duration-300"
          >
            {/* Game Screenshot Banner Header */}
            <div className="relative h-44 sm:h-48 w-full overflow-hidden border-b border-white/10 group-hover:border-neon-green/30">
              <img
                src={game.coverImage}
                alt={game.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== "/images/game-placeholder.png") {
                    target.src = "/images/game-placeholder.png";
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#0b0c10] via-[#0b0c10]/50 to-black/30" />

              {/* Header Overlays */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-mono font-bold text-gray-200 px-2.5 py-1 rounded-full bg-black/80 border border-white/20 backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5 shadow-lg max-w-[60%] shrink min-w-0">
                  <Gamepad2 className="w-3 h-3 text-neon-green shrink-0" />
                  <span className="truncate">{game.publisher}</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/80 px-2.5 py-1 rounded-full border border-amber-400/30 backdrop-blur-md uppercase tracking-wider shadow-lg shrink-0 whitespace-nowrap">
                  {game.storeRating || "Verified"}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 space-y-4 sm:space-y-5">
              {/* Game Title & Genre */}
              <div>
                <h3 className="text-lg sm:text-2xl font-black font-display text-white group-hover:text-neon-green transition-colors uppercase tracking-tight leading-tight">
                  {game.name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-gray-400 mt-1">
                  <span>{game.genre}</span>
                  <span>•</span>
                  <span className="text-neon-yellow shrink-0">{game.api}</span>
                </div>
              </div>

              {/* Real Telemetry Benchmark Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-2.5 sm:p-3 bg-white/3 border border-white/10 rounded-2xl font-mono text-xs">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-gray-400 text-[9px] sm:text-[10px] block font-bold uppercase">Avg FPS</span>
                  <span className="text-neon-green font-black text-sm sm:text-base">{game.fps}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 min-w-0">
                  <span className="text-gray-400 text-[9px] sm:text-[10px] block font-bold uppercase">VRAM Used</span>
                  <span className="text-white font-bold text-[11px] sm:text-sm tracking-tight whitespace-nowrap block" title={game.vram}>
                    <span className="sm:hidden">{game.vram.replace(/(\d+\.?\d*)\s*GB\s*\/\s*(\d+\.?\d*)\s*GB/i, "$1/$2 GB").replace(/\.00/g, "")}</span>
                    <span className="hidden sm:inline">{game.vram}</span>
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-gray-400 text-[9px] sm:text-[10px] block font-bold uppercase">Latency</span>
                  <span className="text-amber-400 font-bold text-xs sm:text-sm">{game.latency}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-gray-400 text-[9px] sm:text-[10px] block font-bold uppercase">GPU Load</span>
                  <span className="text-emerald-400 font-bold text-xs sm:text-sm">{game.gpuLoad}</span>
                </div>
              </div>

              {/* Tech Tags */}
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                {game.keyTech.map((tech, i) => {
                  const lower = tech.toLowerCase();
                  let IconComponent = Cpu;
                  let iconColor = "text-neon-green";

                  if (lower.includes("dlss") || lower.includes("ai")) {
                    IconComponent = Sparkles;
                    iconColor = "text-neon-green";
                  } else if (lower.includes("frame gen") || lower.includes("fps")) {
                    IconComponent = Zap;
                    iconColor = "text-neon-yellow";
                  } else if (lower.includes("reflex") || lower.includes("latency")) {
                    IconComponent = Activity;
                    iconColor = "text-cyan-400";
                  } else if (lower.includes("ray tracing") || lower.includes("path")) {
                    IconComponent = Sparkles;
                    iconColor = "text-purple-400";
                  } else if (lower.includes("frostbite") || lower.includes("snowdrop") || lower.includes("engine") || lower.includes("unreal")) {
                    IconComponent = Flame;
                    iconColor = "text-amber-400";
                  } else if (lower.includes("shader") || lower.includes("volumetric") || lower.includes("render") || lower.includes("heat")) {
                    IconComponent = Eye;
                    iconColor = "text-violet-400";
                  } else if (lower.includes("dx12") || lower.includes("vulkan") || lower.includes("directx")) {
                    IconComponent = Cpu;
                    iconColor = "text-emerald-400";
                  } else if (lower.includes("fullscreen") || lower.includes("etw")) {
                    IconComponent = Shield;
                    iconColor = "text-indigo-400";
                  }

                  return (
                    <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 hover:border-white/20 rounded-lg text-gray-200 flex items-center gap-1.5 transition-colors font-semibold">
                      <IconComponent className={`w-3 h-3 ${iconColor} shrink-0`} />
                      <span>{tech}</span>
                    </span>
                  );
                })}
              </div>

              {/* View Profile Button */}
              <Link
                href={`/games-tested?game=${game.id}`}
                className="w-full btn-premium-glass py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all duration-300 flex items-center justify-center gap-2 text-center group/btn shadow-[0_0_15px_rgba(118,185,0,0.15)] hover:shadow-[0_0_25px_rgba(118,185,0,0.4)] shrink-0 whitespace-nowrap text-white hover:text-neon-green"
              >
                <span className="truncate">View Benchmark Profile</span>
                <ArrowRight className="w-4 h-4 shrink-0 text-neon-green transition-transform group-hover/btn:translate-x-1.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* View More Profiles Button */}
      <div className="text-center">
        <Link
          href="/games-tested"
          className="inline-flex items-center justify-center gap-3 btn-premium-glass px-8 py-4 text-xs sm:text-sm font-black font-mono uppercase tracking-wider text-white hover:text-neon-green shadow-[0_0_25px_rgba(118,185,0,0.25)] transition-all group"
        >
          <span>View More Benchmark Profiles</span>
          <ArrowRight className="w-4 h-4 text-neon-green group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
