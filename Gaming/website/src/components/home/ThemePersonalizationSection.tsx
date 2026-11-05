"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Sparkles,
  Gamepad2,
  Check,
  Zap,
  Sliders,
  Shield,
  Layers,
  Monitor,
  Maximize2,
  X,
} from "lucide-react";

export interface WebsiteThemeItem {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  primary: string;
  secondary: string;
  primaryRgb: string;
  secondaryRgb: string;
  faction: string;
  factionSymbol: string;
  factionMotto: string;
  game: string;
}

export const WEBSITE_THEMES: WebsiteThemeItem[] = [
  {
    id: "emerald",
    name: "Emerald Protocol",
    badge: "NVIDIA Signature",
    tagline: "Tactical NVIDIA signature emerald with stealth optics",
    primary: "#76b900",
    secondary: "#bfff00",
    primaryRgb: "118, 185, 0",
    secondaryRgb: "191, 255, 0",
    faction: "RTX Cyber Vanguard",
    factionSymbol: "⚡",
    factionMotto: "Precision & Frame Superiority",
    game: "DOOM: The Dark Ages",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk 2077",
    badge: "Night City Edition",
    tagline: "High-voltage Night City cyan with blazing cyber yellow",
    primary: "#00f0ff",
    secondary: "#fee715",
    primaryRgb: "0, 240, 255",
    secondaryRgb: "254, 231, 21",
    faction: "Night City Syndicate",
    factionSymbol: "☣",
    factionMotto: "High Tech, Low Life",
    game: "Cyberpunk 2077",
  },
  {
    id: "crimson",
    name: "Crimson Fury",
    badge: "Radeon Red",
    tagline: "Aggressive Radeon crimson and hot coral racing flare",
    primary: "#ff2a4b",
    secondary: "#ff758c",
    primaryRgb: "255, 42, 75",
    secondaryRgb: "255, 117, 140",
    faction: "Radeon Bloodhound",
    factionSymbol: "▲",
    factionMotto: "Full Throttle Adrenaline",
    game: "Doom Eternal",
  },
  {
    id: "cobalt",
    name: "Quantum Cobalt",
    badge: "Arc Azure",
    tagline: "Deep space Arc sapphire with electric sky cyan",
    primary: "#00a8ff",
    secondary: "#38bdf8",
    primaryRgb: "0, 168, 255",
    secondaryRgb: "56, 189, 248",
    faction: "Arc Quantum Core",
    factionSymbol: "◈",
    factionMotto: "Algorithmic Precision",
    game: "Starfield",
  },
  {
    id: "amethyst",
    name: "Void Amethyst",
    badge: "Deep Void",
    tagline: "Neon violet with synthwave magenta for deep sessions",
    primary: "#a855f7",
    secondary: "#f472b6",
    primaryRgb: "168, 85, 247",
    secondaryRgb: "244, 114, 182",
    faction: "Cybernet Ronin",
    factionSymbol: "❖",
    factionMotto: "Deep Focus Synthwave",
    game: "Hollow Knight: Silksong",
  },
  {
    id: "solar",
    name: "Solar Flare",
    badge: "Solar Gold",
    tagline: "Warm telemetry amber with molten gold highlights",
    primary: "#f59e0b",
    secondary: "#fde047",
    primaryRgb: "245, 158, 11",
    secondaryRgb: "253, 224, 71",
    faction: "Solaris Orbital Fleet",
    factionSymbol: "☼",
    factionMotto: "Frontier Space Telemetry",
    game: "Forza Horizon 5",
  },
  {
    id: "toxic",
    name: "Toxic Hazard",
    badge: "Biohazard",
    tagline: "Radioactive biohazard green with crisp phosphor mint",
    primary: "#10b981",
    secondary: "#6ee7b7",
    primaryRgb: "16, 185, 129",
    secondaryRgb: "110, 231, 183",
    faction: "Toxic Operatives",
    factionSymbol: "☢",
    factionMotto: "Maximum Performance Decay",
    game: "S.T.A.L.K.E.R. 2",
  },
  {
    id: "stealth",
    name: "Stealth Carbon",
    badge: "Spec Ops",
    tagline: "Pure monochrome platinum and titanium spec-ops slate",
    primary: "#e2e8f0",
    secondary: "#94a3b8",
    primaryRgb: "226, 232, 240",
    secondaryRgb: "148, 163, 184",
    faction: "Stealth Operative",
    factionSymbol: "⬡",
    factionMotto: "Zero Visual Footprint",
    game: "Ghost of Tsushima",
  },
];

export const FACTIONS = [
  {
    name: "RTX Cyber Vanguard",
    symbol: "⚡",
    theme: "Emerald Protocol",
    color: "#76b900",
    desc: "Optimized for extreme framerates, low input lag, and ray-tracing mastery.",
  },
  {
    name: "Night City Syndicate",
    symbol: "☣",
    theme: "Cyberpunk 2077",
    color: "#00f0ff",
    desc: "High-contrast cybernetic neon styled for nocturnal deep-dive gaming.",
  },
  {
    name: "Radeon Bloodhound",
    symbol: "▲",
    theme: "Crimson Fury",
    color: "#ff2a4b",
    desc: "Adrenaline-fueled thermal aggression calibrated for fast-paced competitive shooters.",
  },
  {
    name: "Arc Quantum Core",
    symbol: "◈",
    theme: "Quantum Cobalt",
    color: "#00a8ff",
    desc: "Algorithmic telemetry precision inspired by deep space research outposts.",
  },
  {
    name: "Solaris Orbital Fleet",
    symbol: "☼",
    theme: "Solar Flare",
    color: "#f59e0b",
    desc: "Warm telemetry amber and gold engineered for sprawling open-world exploration.",
  },
];

export const CANVAS_TEXTURES = [
  { name: "Cyber Matrix Dots", desc: "Futuristic coordinate dot mesh with theme glow" },
  { name: "Silicon Circuitry", desc: "Subtle microchip traces and computational bus" },
  { name: "CRT Scanlines", desc: "Tactical retro-futuristic arcade phosphor filter" },
  { name: "Celestial Nebula", desc: "Atmospheric deep space ambient cosmic haze" },
];

export function ThemePersonalizationSection() {
  const [selectedThemeId, setSelectedThemeId] = useState<string>("cyberpunk");
  const [gifView, setGifView] = useState<"dashboard" | "hud">("dashboard");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const selectedTheme =
    WEBSITE_THEMES.find((t) => t.id === selectedThemeId) || WEBSITE_THEMES[0];

  const currentGifSrc =
    gifView === "dashboard"
      ? "/screenshots/theme_showcase.gif"
      : "/screenshots/theme_hud_morph.gif";

  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 mx-auto"
    >
      {/* Section Header */}
      <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
          <Palette className="w-3.5 h-3.5 text-neon-green" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
            APP THEMES & PERSONALIZATION STUDIO
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
          YOUR RIG. <span className="text-neon-green glow-text-teal">YOUR IDENTITY.</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
          Elevate your cockpit with{" "}
          <strong className="text-white">8 engineered color schemes</strong>,{" "}
          <strong className="text-neon-green">Game-Adaptive auto-theming</strong>, and tactical{" "}
          <strong className="text-white">Gamer Factions</strong>.
        </p>
      </div>

      {/* Interactive Theme Palette Selector Bar */}
      <div className="mb-8 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg">
        <div className="flex items-center justify-between mb-3 px-1 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-neon-green" />
            <span className="font-bold text-white uppercase tracking-wider">
              Curated Theme Schemes
            </span>
          </div>
          <span className="hidden sm:inline text-gray-500">
            Click any palette to preview live telemetry styling
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {WEBSITE_THEMES.map((theme) => {
            const isSelected = theme.id === selectedThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer group ${
                  isSelected
                    ? "bg-white/15 shadow-lg scale-[1.02]"
                    : "bg-black/40 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
                style={{
                  borderColor: isSelected ? theme.primary : undefined,
                  boxShadow: isSelected
                    ? `0 0 20px rgba(${theme.primaryRgb}, 0.35)`
                    : undefined,
                }}
              >
                {/* Dual-Color Swatch Pill */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                    style={{ backgroundColor: theme.secondary }}
                  />
                </div>

                <span
                  className={`text-xs font-bold font-mono tracking-tight text-center leading-tight transition-colors ${
                    isSelected ? "text-white" : "text-gray-300 group-hover:text-white"
                  }`}
                >
                  {theme.name}
                </span>

                <span
                  className="text-[10px] font-mono mt-1 px-1.5 py-0.5 rounded text-center truncate max-w-full"
                  style={{
                    color: theme.primary,
                    backgroundColor: `rgba(${theme.primaryRgb}, 0.12)`,
                  }}
                >
                  {theme.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Live Animated GIF Showcase Player */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-3xl p-3 sm:p-4 bg-white/5 border border-white/10 shadow-2xl relative overflow-hidden group">
          {/* Ambient Glow matching selected theme */}
          <div
            className="absolute inset-0 blur-3xl opacity-30 pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${selectedTheme.primary} 0%, transparent 70%)`,
            }}
          />

          {/* Player View Switcher Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: selectedTheme.primary }}
                />
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: selectedTheme.primary }}
                />
              </span>
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Live Theme Morphing Demo
              </span>
            </div>

            {/* Toggle between Dashboard & HUD Overlay GIF */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-mono">
              <button
                onClick={() => setGifView("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  gifView === "dashboard"
                    ? "bg-white/20 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setGifView("hud")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  gifView === "hud"
                    ? "bg-white/20 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>In-Game HUD</span>
              </button>
            </div>
          </div>

          {/* Animated GIF Display with Enlarge Button */}
          <div className="relative w-full aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden bg-obsidian border border-white/10 group/img">
            <img
              key={currentGifSrc}
              src={currentGifSrc}
              alt="Mission Control Theme Morphing Showcase"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover upscale-crisp transition-transform duration-500 group-hover/img:scale-[1.01]"
            />

            {/* Hover overlay with zoom button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/50 backdrop-blur-[2px] transition-all duration-300">
              <button
                onClick={() => setIsLightboxOpen(true)}
                className="flex items-center gap-2 bg-white text-obsidian px-5 py-2.5 rounded-full font-bold font-mono text-xs hover:scale-105 transition-transform shadow-2xl cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" /> Enlarge View
              </button>
            </div>

            {/* Corner Badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-gray-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: selectedTheme.primary }} />
              <span>Animated Theme Cycling (8 Colorways)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Theme Inspector & Identity Details */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          {/* Active Theme Spec Card */}
          <div
            className="p-5 sm:p-6 rounded-3xl bg-white/5 border backdrop-blur-md flex flex-col justify-between relative overflow-hidden transition-all duration-500"
            style={{
              borderColor: `rgba(${selectedTheme.primaryRgb}, 0.35)`,
              boxShadow: `0 0 35px rgba(${selectedTheme.primaryRgb}, 0.12)`,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-xs font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                  style={{
                    color: selectedTheme.primary,
                    backgroundColor: `rgba(${selectedTheme.primaryRgb}, 0.15)`,
                    borderColor: `rgba(${selectedTheme.primaryRgb}, 0.3)`,
                  }}
                >
                  {selectedTheme.badge}
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-black/40"
                    style={{ backgroundColor: selectedTheme.primary }}
                    title={`Primary: ${selectedTheme.primary}`}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/40"
                    style={{ backgroundColor: selectedTheme.secondary }}
                    title={`Secondary: ${selectedTheme.secondary}`}
                  />
                </div>
              </div>

              <h3 className="text-2xl font-black font-display text-white mb-2">
                {selectedTheme.name}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                {selectedTheme.tagline}
              </p>

              {/* Color Code Breakdown */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
                  <span className="text-gray-400">Primary Accent</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: selectedTheme.primary }}
                    />
                    <span className="font-bold text-white uppercase">
                      {selectedTheme.primary}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
                  <span className="text-gray-400">Secondary Highlight</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: selectedTheme.secondary }}
                    />
                    <span className="font-bold text-white uppercase">
                      {selectedTheme.secondary}
                    </span>
                  </div>
                </div>
              </div>

              {/* Game-Adaptive Theming Callout */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs">
                <div className="flex items-center gap-2 text-white font-mono font-bold mb-1">
                  <Zap className="w-3.5 h-3.5" style={{ color: selectedTheme.primary }} />
                  <span>Adaptive Game Link</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Automatically morphs to this palette when launching{" "}
                  <strong className="text-white">{selectedTheme.game}</strong>.
                </p>
              </div>
            </div>

            {/* Faction Alignment */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedTheme.factionSymbol}</span>
                <div>
                  <div className="text-white font-bold">{selectedTheme.faction}</div>
                  <div className="text-[10px] text-gray-400">{selectedTheme.factionMotto}</div>
                </div>
              </div>
              <Check className="w-4 h-4" style={{ color: selectedTheme.primary }} />
            </div>
          </div>

          {/* Personalization Capabilities Mini-Bento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-white font-mono text-xs font-bold mb-2">
                <Shield className="w-3.5 h-3.5 text-neon-green" />
                <span>5 Factions</span>
              </div>
              <p className="text-gray-400 text-[11px] leading-tight">
                Align with RTX Cyber Vanguard, Night City Syndicate & more.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-white font-mono text-xs font-bold mb-2">
                <Layers className="w-3.5 h-3.5 text-neon-green" />
                <span>4 Textures</span>
              </div>
              <p className="text-gray-400 text-[11px] leading-tight">
                Matrix Dots, Silicon Bus, CRT Scanlines, and Celestial Nebula.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Enlarge View */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          >
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
              onClick={() => setIsLightboxOpen(false)}
            />

            <button
              type="button"
              className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50 text-gray-300 hover:text-white bg-black/60 hover:bg-white/20 border border-white/20 rounded-full p-3 transition-all cursor-pointer shadow-xl"
              onClick={() => setIsLightboxOpen(false)}
              title="Close view (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center"
            >
              <img
                src={currentGifSrc}
                alt="Enlarged Theme Showcase"
                className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain rounded-xl border border-white/15 shadow-2xl"
              />
              <div className="mt-3 flex items-center justify-between w-full px-2 text-xs font-mono text-gray-400">
                <span className="font-bold text-white">
                  Mission Control Theme Personalization Studio
                </span>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="text-neon-green hover:underline cursor-pointer font-bold"
                >
                  Click backdrop or press Esc to close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

