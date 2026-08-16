"use client";

import { useState, useEffect, useRef } from "react";
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
  Search,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Film,
  UploadCloud,
  Trash2,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TESTED_GAMES_LIST, TestedGameSummary } from "@/data/benchmarks";

interface RateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialGameId?: string;
}

interface AttachedMedia {
  id: string;
  url: string;
  type: "image" | "gif" | "video";
  name: string;
  size?: number;
  uploading: boolean;
  error?: string;
}

const RATING_DESCRIPTIONS: Record<number, { label: string; color: string }> = {
  1: { label: "1.0 - Severe Stutters / Unplayable", color: "text-rose-400" },
  2: { label: "2.0 - Sub-optimal / Frequent Drops", color: "text-amber-500" },
  3: { label: "3.0 - Decent / Playable with Tweaks", color: "text-yellow-400" },
  4: { label: "4.0 - Great & Smooth Performance", color: "text-emerald-400" },
  5: { label: "5.0 - Flawless / Optimal Experience", color: "text-neon-green" },
};

export default function RateGameModal({
  isOpen,
  onClose,
  onSuccess,
  initialGameId = "spiderman2",
}: RateGameModalProps) {
  const [selectedGame, setSelectedGame] = useState<TestedGameSummary | null>(null);
  const [customGameName, setCustomGameName] = useState<string>("");
  const [gameSearchQuery, setGameSearchQuery] = useState<string>("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [review, setReview] = useState<string>("");
  const [recommend, setRecommend] = useState<boolean>(true);

  // Attached Media (Images, GIFs, Videos)
  const [mediaList, setMediaList] = useState<AttachedMedia[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Specs
  const [gpu, setGpu] = useState<string>("NVIDIA GeForce RTX 4070 Ti");
  const [cpu, setCpu] = useState<string>("AMD Ryzen 7 7800X3D");
  const [ramGB, setRamGB] = useState<number>(32);
  const [resolution, setResolution] = useState<string>("1440p (2560x1440)");
  const [fpsReported, setFpsReported] = useState<number>(115);
  const [os, setOs] = useState<string>("Windows 11");
  const [presetUsed, setPresetUsed] = useState<string>("Ultra Ray Tracing + DLSS");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Initial game setup
  useEffect(() => {
    if (initialGameId) {
      const match = TESTED_GAMES_LIST.find((g) => g.id === initialGameId);
      if (match) {
        setSelectedGame(match);
        setCustomGameName(match.name);
      }
    } else if (TESTED_GAMES_LIST.length > 0) {
      setSelectedGame(TESTED_GAMES_LIST[0]);
      setCustomGameName(TESTED_GAMES_LIST[0].name);
    }
  }, [initialGameId]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autofill user info from localStorage & OS
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("aero_user_tag");
      if (savedUser) setUserName(savedUser);

      const ua = window.navigator.userAgent || "";
      if (ua.includes("Windows NT 10.0")) setOs("Windows 10 / 11");
      else if (ua.includes("Linux")) setOs("Linux (Steam Deck / Proton)");
      else if (ua.includes("Mac")) setOs("macOS");
    }
  }, []);

  // Filtered games for searchbar
  const searchResults = TESTED_GAMES_LIST.filter((g) => {
    const q = gameSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      g.name.toLowerCase().includes(q) ||
      g.publisher.toLowerCase().includes(q) ||
      g.genre.toLowerCase().includes(q)
    );
  });

  const handleSelectGame = (game: TestedGameSummary) => {
    setSelectedGame(game);
    setCustomGameName(game.name);
    setGameSearchQuery("");
    setIsSearchDropdownOpen(false);
  };

  const handleUseCustomGame = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setSelectedGame({
      id: slug,
      name: trimmed,
      publisher: "Community Submission",
      genre: "General Gaming",
      preset: "Custom Settings",
      keyTech: ["DirectX 12", "Reflex"],
      status: "COMMUNITY POST",
      fps: `${fpsReported} FPS`,
      vram: "Dynamic",
      gpuLoad: "100%",
      latency: "10 ms",
      api: "DX12",
      coverImage: "/games/game-placeholder.webp",
    });
    setCustomGameName(trimmed);
    setGameSearchQuery("");
    setIsSearchDropdownOpen(false);
  };

  // Upload file helper
  const uploadFile = async (file: File) => {
    const tempId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isVideo = file.type.startsWith("video/");
    const isGif = file.type.includes("gif");
    const mediaType: "image" | "gif" | "video" = isVideo ? "video" : isGif ? "gif" : "image";

    const localPreviewUrl = URL.createObjectURL(file);

    const newMediaItem: AttachedMedia = {
      id: tempId,
      url: localPreviewUrl,
      type: mediaType,
      name: file.name,
      size: file.size,
      uploading: true,
    };

    setMediaList((prev) => [...prev, newMediaItem]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload media file");
      }

      const data = await res.json();
      setMediaList((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                url: data.url,
                type: data.type || mediaType,
                uploading: false,
              }
            : item
        )
      );
    } catch (err: any) {
      setMediaList((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                uploading: false,
                error: err.message || "Upload failed",
              }
            : item
        )
      );
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = 4 - mediaList.length;
    if (remainingSlots <= 0) {
      setError("Maximum 4 media attachments allowed per post.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    filesToUpload.forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 25MB limit.`);
        return;
      }
      uploadFile(file);
    });
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeGameName = selectedGame?.name || customGameName.trim();
    const activeGameId = selectedGame?.id || activeGameName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (!activeGameName) {
      setError("Please search or enter the title of the game you are reviewing.");
      return;
    }

    if (!title.trim() || !review.trim()) {
      setError("Please provide both a headline and a detailed review.");
      return;
    }

    if (!gpu.trim() || !cpu.trim()) {
      setError("Please enter your rig's GPU and CPU model.");
      return;
    }

    // Check if any media is still uploading
    if (mediaList.some((m) => m.uploading)) {
      setError("Please wait for your media files to finish uploading.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/benchmarks/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: activeGameId,
          gameName: activeGameName,
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
          media: mediaList
            .filter((m) => !m.error && m.url)
            .map((m) => ({
              url: m.url,
              type: m.type,
              name: m.name,
            })),
          recommend,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit post");
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
        setMediaList([]);
      }, 1400);
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
                <div className="text-[10px] text-neon-green font-bold tracking-widest uppercase mb-0.5">
                  COMMUNITY POST
                </div>
                <h3 className="text-base sm:text-xl font-bold font-display uppercase tracking-wide text-white">
                  Share Game Review & Rig Setup
                </h3>
                <p className="text-[11px] text-gray-400">
                  Publish your performance observations, screenshots, gameplay clips, and rating
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
              <div className="p-4 bg-neon-green/10 border border-neon-green/40 rounded-xl text-neon-green text-xs flex items-center gap-2 font-bold justify-center shadow-[0_0_20px_rgba(118,185,0,0.3)]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Community Review Published Successfully!</span>
              </div>
            )}

            {/* Target Game Searchbar */}
            <div className="space-y-2" ref={searchContainerRef}>
              <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-neon-green" /> Game Title
                </span>
                {selectedGame && (
                  <span className="text-[10px] text-neon-green font-normal">
                    ✓ Selected: {selectedGame.name}
                  </span>
                )}
              </label>

              {/* Selected Game Card Preview or Search Input */}
              {selectedGame && !isSearchDropdownOpen ? (
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/[0.04] border border-neon-green/40 shadow-[0_0_15px_rgba(118,185,0,0.15)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                      <img
                        src={selectedGame.coverImage}
                        alt={selectedGame.name}
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.src = "/games/SpiderMan_SS1.webp";
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide truncate">
                        {selectedGame.name}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {selectedGame.publisher} • {selectedGame.genre}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSearchDropdownOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-gray-200 uppercase tracking-wider font-bold transition-all cursor-pointer shrink-0 ml-2"
                  >
                    Change Game
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      value={gameSearchQuery}
                      onChange={(e) => {
                        setGameSearchQuery(e.target.value);
                        setIsSearchDropdownOpen(true);
                      }}
                      onFocus={() => setIsSearchDropdownOpen(true)}
                      placeholder="Search tested titles (e.g. Spider-Man, GTA V, Ghost of Tsushima)..."
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/70 border border-neon-green/60 text-white text-xs font-mono placeholder-gray-500 focus:outline-none shadow-[0_0_15px_rgba(118,185,0,0.2)]"
                    />
                    {gameSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setGameSearchQuery("")}
                        className="absolute right-3 text-gray-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Search Dropdown Results */}
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0b0c10] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-30 max-h-56 overflow-y-auto custom-scrollbar">
                    {searchResults.length > 0 ? (
                      searchResults.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => handleSelectGame(game)}
                          className="w-full p-2.5 flex items-center justify-between gap-3 text-left hover:bg-white/5 border-b border-white/5 last:border-none transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-black/60 shrink-0 border border-white/10">
                              <img
                                src={game.coverImage}
                                alt={game.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e: any) => {
                                  e.target.src = "/games/SpiderMan_SS1.webp";
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white group-hover:text-neon-green transition-colors truncate">
                                {game.name}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {game.publisher}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-400/30 shrink-0">
                            {game.fps}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center space-y-2">
                        <p className="text-xs text-gray-400">
                          No verified game matched &ldquo;{gameSearchQuery}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => handleUseCustomGame(gameSearchQuery)}
                          className="px-3 py-1.5 rounded-lg bg-neon-green text-obsidian text-xs font-bold uppercase tracking-wider hover:bg-white transition-all cursor-pointer"
                        >
                          + Post Review for &ldquo;{gameSearchQuery.slice(0, 20)}&rdquo;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Star Rating Interactive Selector */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider">
                  Your Overall Star Rating
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
                  Your Name / Gamer Tag
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. CyberPilot_4090"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-neon-green focus:outline-none text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider">
                  Post Headline *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Flawless 120 FPS on 1440p with DLSS Quality"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-neon-green focus:outline-none text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Detailed Performance Feedback */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider">
                Review & Gameplay Experience *
              </label>
              <textarea
                required
                rows={3}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts on game stability, frame rates, graphic settings, or any tweaks that boosted performance..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-neon-green focus:outline-none text-white text-xs font-sans placeholder-gray-500 leading-relaxed"
              />
            </div>

            {/* Media Upload Section (Images, GIFs, Videos) */}
            <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-neon-green" /> Media Attachments (Screenshots, GIFs, Gameplay Videos)
                </label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {mediaList.length}/4 Files (Max 25MB each)
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,image/gif"
                className="hidden"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  if (e.target) e.target.value = "";
                }}
              />

              {/* Drag & Drop Upload Target Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-neon-green bg-neon-green/10 scale-[1.01]"
                    : "border-white/15 hover:border-neon-green/50 bg-black/40 hover:bg-black/60"
                }`}
              >
                <div className="flex items-center gap-2 text-neon-green">
                  <ImageIcon className="w-4 h-4" />
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-200 font-bold">
                    Click to browse or drag & drop media files
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Supports PNG, JPG, WEBP, animated GIFs, and MP4/WebM gameplay clips
                  </p>
                </div>
              </div>

              {/* Uploaded Media Thumbnails Strip */}
              {mediaList.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {mediaList.map((item) => (
                    <div
                      key={item.id}
                      className="relative aspect-video rounded-xl overflow-hidden bg-black/80 border border-white/15 group"
                    >
                      {item.type === "video" ? (
                        <div className="relative w-full h-full bg-black flex items-center justify-center">
                          <video
                            src={item.url}
                            className="w-full h-full object-cover opacity-80"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-7 h-7 rounded-full bg-black/70 border border-neon-green/60 flex items-center justify-center text-neon-green shadow-lg">
                              <Play className="w-3.5 h-3.5 fill-neon-green ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Type Badge */}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-[9px] font-mono font-bold uppercase text-white shadow">
                        {item.type}
                      </span>

                      {/* Uploading Spinner */}
                      {item.uploading && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 z-10">
                          <div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                          <span className="text-[9px] text-neon-green font-mono">Uploading...</span>
                        </div>
                      )}

                      {/* Error state */}
                      {item.error && (
                        <div className="absolute inset-0 bg-rose-950/80 p-1 flex flex-col items-center justify-center text-center z-10">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span className="text-[8px] text-rose-300 truncate max-w-full">
                            {item.error}
                          </span>
                        </div>
                      )}

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMedia(item.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 hover:bg-rose-600 text-gray-300 hover:text-white transition-colors cursor-pointer shadow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hardware Rig Specifications Section */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-neon-green tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-neon-green" /> Rig Specifications & Performance
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
                    <Zap className="w-3 h-3 text-neon-green" /> Avg FPS Achieved
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
                Would you recommend playing this title with Mission Control?
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
                disabled={loading || success || mediaList.some((m) => m.uploading)}
                className="px-6 py-2.5 rounded-xl bg-neon-green text-obsidian hover:bg-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(118,185,0,0.5)] cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-obsidian border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Publish Community Post</span>
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
