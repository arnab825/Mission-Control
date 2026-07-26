"use client";

import React, { useState } from "react";
import { Play, Video, Film, Sparkles, Monitor, Share2, Layers, ExternalLink, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoItem {
  id: string;
  title: string;
  category: "Gameplay HUD" | "Benchmark Test" | "AI Voice Companion" | "Teaser Trailer";
  duration: string;
  thumbnail: string;
  youtubeId?: string;
  videoUrl?: string;
  views: string;
  desc: string;
}

const PROMOTIONAL_VIDEOS: VideoItem[] = [
  {
    id: "main-teaser",
    title: "Mission Control V2 - Next-Gen Local AI Gaming Overlay Trailer",
    category: "Teaser Trailer",
    duration: "1:45",
    thumbnail: "/screenshots/dashboard.webp",
    youtubeId: "dQw4w9WgXcQ", // Placeholder YouTube ID - easily replaceable with user's video link
    views: "24.8K Views",
    desc: "Experience sub-0.8ms local CUDA AI inference, real-time VRAM memory cleanup, and DirectX 12 hardware overlay presentation."
  },
  {
    id: "gameplay-hud",
    title: "Cyberpunk 2077 - Zero Latency HUD & AI Companion Demo",
    category: "Gameplay HUD",
    duration: "2:10",
    thumbnail: "/screenshots/before.png",
    youtubeId: "dQw4w9WgXcQ",
    views: "18.2K Views",
    desc: "Real-time telemetry tracking and voice command macros executing with 0% CPU impact during heavy ray-tracing gameplay."
  },
  {
    id: "vram-benchmark",
    title: "VRAM Memory Page Cleanup - Hardware Benchmark Stress Test",
    category: "Benchmark Test",
    duration: "1:15",
    thumbnail: "/screenshots/after.png",
    youtubeId: "dQw4w9WgXcQ",
    views: "15.4K Views",
    desc: "Demonstrating 1.8GB VRAM recovery on NVIDIA RTX 4090 without closing background game processes."
  }
];

export function PromotionalVideoShowcase() {
  const [activeVideo, setActiveVideo] = useState<VideoItem>(PROMOTIONAL_VIDEOS[0]);
  const [isPlayingModalOpen, setIsPlayingModalOpen] = useState(false);

  return (
    <section id="video-showcase" className="w-full max-w-7xl px-4 sm:px-6 my-20 sm:my-32 relative z-10 mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 border border-neon-green/40 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md shadow-[0_0_20px_rgba(118,185,0,0.2)]">
          <Film className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
            MEDIA & VIDEO SHOWCASE
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-white mb-4">
          PROMOTIONAL <span className="text-neon-green glow-text-teal">DEMO & TRAILERS</span>
        </h2>
        <p className="text-gray-400 text-xs sm:text-base leading-relaxed font-mono">
          Watch real-time gameplay clips, hardware benchmark video stress tests, and local CUDA AI voice companion demonstrations.
        </p>
      </div>

      {/* Main Video Showcase Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Featured Large Video Player Card (7 Columns) */}
        <div className="lg:col-span-7">
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-neon-green/40 bg-obsidian shadow-[0_0_50px_rgba(0,0,0,0.9)] group">
            <img 
              src={activeVideo.thumbnail} 
              alt={activeVideo.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />

            {/* Play Overlay Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                onClick={() => setIsPlayingModalOpen(true)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neon-green text-obsidian flex items-center justify-center shadow-[0_0_40px_rgba(118,185,0,0.8)] hover:scale-110 transition-transform cursor-pointer group/btn"
              >
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-obsidian ml-1 group-hover/btn:scale-110 transition-transform" />
              </button>
            </div>

            {/* Video Badges & Title Overlay */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="bg-neon-green text-obsidian px-3 py-1 rounded-full font-bold uppercase text-[10px]">
                  {activeVideo.category}
                </span>
                <span className="bg-black/60 text-gray-300 px-2.5 py-1 rounded-full border border-white/10 text-[10px]">
                  ⏱ {activeVideo.duration}
                </span>
                <span className="text-neon-yellow text-[10px] font-bold">
                  {activeVideo.views}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display uppercase text-white line-clamp-2">
                {activeVideo.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Video Playlist Selector (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="text-xs uppercase font-mono tracking-wider font-bold text-neon-green/80 flex items-center gap-2 pl-1 mb-1">
            <Video className="w-4 h-4 text-neon-green" /> Select Promotional Video Reel
          </div>

          {PROMOTIONAL_VIDEOS.map((vid) => {
            const isSelected = activeVideo.id === vid.id;
            return (
              <button
                key={vid.id}
                onClick={() => setActiveVideo(vid)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
                  isSelected
                    ? "border-neon-green/60 bg-neon-green/[0.08] shadow-[0_0_25px_rgba(118,185,0,0.15)]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 border border-white/10">
                  <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between font-mono text-[9px] text-gray-400 mb-1 uppercase">
                    <span className={isSelected ? "text-neon-green font-bold" : "text-gray-400"}>{vid.category}</span>
                    <span>{vid.duration}</span>
                  </div>
                  <h4 className="text-xs font-bold font-display text-white uppercase line-clamp-1">
                    {vid.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-mono line-clamp-1 mt-0.5">
                    {vid.desc}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Video Creator & Sponsorship Note */}
          <div className="p-4 rounded-2xl bg-neon-green/5 border border-neon-green/30 backdrop-blur-md flex items-center justify-between gap-3 font-mono text-xs text-gray-300 mt-2">
            <div className="flex items-center gap-2 text-neon-green font-bold text-[11px]">
              <Sparkles className="w-4 h-4 text-neon-green shrink-0 animate-pulse" />
              <span>RECORDING CUSTOM VIDEO POSTS?</span>
            </div>
            <a 
              href="#sponsor-section"
              className="text-[10px] font-bold text-obsidian bg-neon-green px-3 py-1.5 rounded-full hover:bg-neon-yellow transition-colors shrink-0 uppercase"
            >
              SPONSOR REELS ↗
            </a>
          </div>
        </div>
      </div>

      {/* Video Modal Player */}
      <AnimatePresence>
        {isPlayingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPlayingModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full aspect-video rounded-3xl overflow-hidden border border-neon-green/50 shadow-[0_0_60px_rgba(118,185,0,0.4)] bg-obsidian"
            >
              <button
                onClick={() => setIsPlayingModalOpen(false)}
                className="absolute top-4 right-4 z-20 bg-obsidian/90 border border-neon-green text-neon-green p-2 rounded-full hover:bg-neon-green hover:text-obsidian transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
