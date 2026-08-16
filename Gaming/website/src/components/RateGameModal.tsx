"use client";

import { useState, useEffect } from "react";
import {
  X,
  Star,
  Gamepad2,
  Cpu,
  Tv,
  Monitor,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TESTED_GAMES_LIST } from "@/data/benchmarks";

interface RateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialGameId?: string;
}

const RATING_DESCRIPTIONS: Record<number, { label: string; color: string }> = {
  1: { label: "1.0 - Severe Stutters / Unplayable", color: "text-rose-400" },
  2: { label: "2.0 - Sub-optimal / Frequent Drops", color: "text-amber-500" },
  3: { label: "3.0 - Decent / Playable with Tweaks", color: "text-yellow-400" },
  4: { label: "4.0 - Great & Smooth Performance", color: "text-emerald-400" },
  5: { label: "5.0 - Flawless / Optimal Benchmark", color: "text-neon-green" },
};

export default function RateGameModal({
  isOpen,
  onClose,
  onSuccess,
  initialGameId = "spiderman2",
}: RateGameModalProps) {
  const [gameId, setGameId] = useState(initialGameId);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [recommend, setRecommend] = useState(true);

  // Specs
  const [gpu, setGpu] = useState("NVIDIA GeForce RTX 4070 Ti");
  const [cpu, setCpu] = useState("AMD Ryzen 7 7800X3D");
  const [ramGB, setRamGB] = useState(32);
  const [resolution, setResolution] = useState("1440p (2560x1440)");
  const [fpsReported, setFpsReported] = useState(115);
  const [os, setOs] = useState("Windows 11");
  const [presetUsed, setPresetUsed] = useState("Ultra Ray Tracing + DLSS");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialGameId) {
      setGameId(initialGameId);
    }
  }, [initialGameId]);

  // Try to prefill username from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("aero_user_tag");
      if (savedUser) setUserName(savedUser);

      // Auto-detect OS
      const ua = window.navigator.userAgent || "";
      if (ua.includes("Windows NT 10.0")) setOs("Windows 10 / 11");
      else if (ua.includes("Linux")) setOs("Linux (Steam Deck / Proton)");
      else if (ua.includes("Mac")) setOs("macOS");
    }
  }, []);

  const activeGame = TESTED_GAMES_LIST.find((g) => g.id === gameId) || TESTED_GAMES_LIST[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !review.trim()) {
      setError("Please provide both a headline and a detailed review.");
      return;
    }

    if (!gpu.trim() || !cpu.trim()) {
      setError("Please enter your rig's GPU and CPU model.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/benchmarks/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGame.id,
          gameName: activeGame.name,
          userName: userName.trim() || "Aero Operator",
          rating,
          title: title.trim(),
          review: review.trim(),
          specs: {
            gpu: gpu.trim(),
            cpu: cpu.trim(),
            ramGB: Number(ramGB) || 16,
            resolution,
            fpsReported: Number(fpsReported) || 60,
            os,
            presetUsed,
          },
          recommend,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit rating");
      }

      if (typeof window !== "undefined" && userName.trim()) {
        localStorage.setItem("aero_user_tag", userName.trim());
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccess(false);
        onClose();
        setTitle("");
        setReview("");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || rating;
  const ratingInfo = RATING_DESCRIPTIONS[currentDisplayRating] || RATING_DESCRIPTIONS[5];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#0c0d12] border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden my-auto max-h-[90vh] flex flex-col font-mono text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-neon-green/10 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-amber-400/10 blur-[80px] pointer-events-none rounded-full" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green">
                <Star className="w-5 h-5 fill-neon-green" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold font-display uppercase tracking-wide text-white">
                  Rate Game & Log Rig Telemetry
                </h3>
                <p className="text-[11px] text-gray-400">
                  Connect your performance logs to the community benchmark database
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto flex-1 pr-1 custom-scrollbar relative z-10">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-neon-green/10 border border-neon-green/40 rounded-xl text-neon-green text-xs flex items-center gap-2 font-bold justify-center">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Benchmark Rating Logged Successfully!</span>
              </div>
            )}

            {/* Target Game Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-neon-green" /> Select Game Title
              </label>
              <select
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-neon-green focus:outline-none text-white text-xs font-mono cursor-pointer transition-all"
              >
                {TESTED_GAMES_LIST.map((game) => (
                  <option key={game.id} value={game.id} className="bg-[#0c0d12] text-white">
                    {game.name} ({game.publisher})
                  </option>
                ))}
              </select>
            </div>

            {/* Star Rating Interactive Selector */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider">
                  Community Star Score
                </label>
                <span className={`text-xs font-bold ${ratingInfo.color}`}>
                  {ratingInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= currentDisplayRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 sm:p-2 rounded-xl transition-all duration-200 hover:scale-115 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                            : "text-gray-600 hover:text-gray-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Operator Name & Headline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider">
                  Operator Handle / Tag
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. CyberVortex_4090"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-neon-green focus:outline-none text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider">
                  Review Headline *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Locked 120 FPS with Reflex Low Latency"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-neon-green focus:outline-none text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Detailed Performance Feedback */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider">
                Detailed Performance & Telemetry Observations *
              </label>
              <textarea
                required
                rows={3}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Describe your frame rate stability, VRAM consumption, stuttering behavior, or specific preset tweaks that worked best..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-neon-green focus:outline-none text-white text-xs font-sans placeholder-gray-500 leading-relaxed"
              />
            </div>

            {/* Hardware Rig Specifications Section */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-neon-green tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-neon-green" /> Hardware Rig & Telemetry Specs
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    <Tv className="w-3 h-3 text-neon-green" /> Graphics Card (GPU)
                  </span>
                  <input
                    type="text"
                    required
                    value={gpu}
                    onChange={(e) => setGpu(e.target.value)}
                    placeholder="e.g. RTX 4070 Ti 12GB"
                    className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-neon-green" /> Processor (CPU)
                  </span>
                  <input
                    type="text"
                    required
                    value={cpu}
                    onChange={(e) => setCpu(e.target.value)}
                    placeholder="e.g. Ryzen 7 7800X3D"
                    className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3 text-neon-green" /> Avg FPS Captured
                  </span>
                  <input
                    type="number"
                    value={fpsReported}
                    onChange={(e) => setFpsReported(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-neon-green font-bold focus:border-neon-green focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-neon-green" /> Resolution
                  </span>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none cursor-pointer"
                  >
                    <option value="4K (3840x2160)">4K (3840x2160)</option>
                    <option value="1440p (2560x1440)">1440p (2560x1440)</option>
                    <option value="1080p (1920x1080)">1080p (1920x1080)</option>
                    <option value="Ultrawide (3440x1440)">Ultrawide (3440x1440)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Recommendation Toggle Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-xs text-gray-300 font-sans">
                Recommend running this title with Mission Control optimizations?
              </span>
              <button
                type="button"
                onClick={() => setRecommend(!recommend)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  recommend
                    ? "bg-neon-green text-obsidian border border-neon-green shadow-[0_0_15px_rgba(118,185,0,0.4)]"
                    : "bg-white/10 text-gray-400 border border-white/10"
                }`}
              >
                {recommend ? "✓ Recommended" : "Not Recommended"}
              </button>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || success}
                className="px-6 py-2.5 rounded-xl bg-neon-green text-obsidian hover:bg-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(118,185,0,0.5)] cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
                    <span>Writing to Database...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Submit Community Benchmark</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
