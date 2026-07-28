"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
import { WINDOWS_INSTALLER_URL, WINDOWS_MSI_URL, WINDOWS_ZIP_URL } from "@/lib/download";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
//import { PromotionalVideoShowcase } from "@/components/PromotionalVideoShowcase";
//import { SponsorshipPartnerSection } from "@/components/SponsorshipPartnerSection";
import { TESTED_GAMES_LIST } from "@/data/benchmarks";
import {
  Users,
  Search,
  Zap,
  Shield,
  Globe,
  Flame,
  Download,
  FileText,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Monitor,
  HardDrive,
  Activity,
  Terminal,
  Sparkles,
  Sliders,
  Radio,
  ArrowRight,
  Scan,
  Lock,
  RefreshCw,
  Crosshair,
  TrendingUp,
  Gauge,
  Volume2,
  Server,
  Layers,
  Gamepad2,
  ExternalLink,
  Rss,
  Newspaper,
  Maximize2,
  X
} from "lucide-react";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activePersonality, setActivePersonality] = useState("Tactical");
  const [activeHudTab, setActiveHudTab] = useState<"combat" | "telemetry" | "scraper">("combat");
  const [isVramFlushing, setIsVramFlushing] = useState(false);
  const [vramFlushedMsg, setVramFlushedMsg] = useState<string | null>(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Live External Site Fetching State
  const [externalNews, setExternalNews] = useState<Array<{ title: string; link: string; source: string; description: string }>>([]);
  const [isFetchingExternal, setIsFetchingExternal] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  type OS = "windows" | "linux" | "mac" | "other" | null;
  const [os, setOs] = useState<OS>(null);
  const [appVersion, setAppVersion] = useState("2.6.2");

  useEffect(() => {
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes("win")) setOs("windows");
    else if (platform.includes("linux")) setOs("linux");
    else if (platform.includes("mac")) setOs("mac");
    else setOs("other");

    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        if (data?.version) setAppVersion(data.version);
      })
      .catch(() => {});
  }, []);

  const fetchExternalSiteData = async () => {
    setIsFetchingExternal(true);
    try {
      const res = await fetch("/api/blogs/news");
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setExternalNews(data.items.slice(0, 4));
          setHasFetched(true);
        }
      }
    } catch (err) {
      console.error("External site fetch failed", err);
    } finally {
      setIsFetchingExternal(false);
    }
  };

  const handleVramFlush = () => {
    setIsVramFlushing(true);
    setVramFlushedMsg(null);
    setTimeout(() => {
      setIsVramFlushing(false);
      setVramFlushedMsg("1.8 GB VRAM Freed Successfully");
      setTimeout(() => setVramFlushedMsg(null), 4000);
    }, 1200);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What hardware do I need?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mission Control strictly requires an NVIDIA GTX or RTX graphics card to run its powerful AI models locally for zero latency."
        }
      },
      {
        "@type": "Question",
        "name": "Is Mission Control free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Mission Control is 100% free and open-source. Anyone can contribute on GitHub."
        }
      },
      {
        "@type": "Question",
        "name": "Will this get me banned in multiplayer games?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mission Control operates as a standard transparent overlay (similar to Steam or Discord overlays). However, agentic macros in competitive multiplayer are used at your own risk."
        }
      }
    ]
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Mission Control",
    "operatingSystem": "Windows, Linux",
    "applicationCategory": "GameApplication"
  };

  const techPartners = [
    { name: "NVIDIA TensorRT", tag: "Local CUDA Engine", url: "https://developer.nvidia.com/tensorrt", icon: Cpu },
    { name: "PyTorch 2.4", tag: "Neural Inference", url: "https://pytorch.org/", icon: Flame },
    { name: "Electron Native", tag: "Hardware IPC", url: "https://www.electronjs.org/", icon: Layers },
    { name: "Next.js 16", tag: "Vite UI Engine", url: "https://nextjs.org/", icon: Zap },
    { name: "DirectX 12 Ultimate", tag: "Swapchain Injection", url: "https://devblogs.microsoft.com/directx/directx12ultimate/", icon: Crosshair },
    { name: "Vulkan 1.3", tag: "Zero Latency Hook", url: "https://www.vulkan.org/", icon: Radio },
  ];

  const supportedGames = [
    { title: "Cyberpunk 2077", tag: "DLSS 3.5 Path Tracing", url: "https://store.steampowered.com/app/2050650/Cyberpunk_2077/" },
    { title: "Apex Legends", tag: "165+ FPS Target Lock", url: "https://store.steampowered.com/app/1172470/Apex_Legends/" },
    { title: "Elden Ring", tag: "Boss Scraper Ready", url: "https://store.steampowered.com/app/1245625/ELDEN_RING/" },
    { title: "Call of Duty: Warzone", tag: "Reflex Low Latency", url: "https://store.steampowered.com/app/1962663/Call_of_Duty_Warzone/" },
    { title: "Valorant", tag: "Hardware Overlay Tuned", url: "https://playvalorant.com/" },
    { title: "Counter-Strike 2", tag: "Sub-1ms Telemetry", url: "https://store.steampowered.com/app/730/CounterStrike_2/" },
    { title: "GTA V / FiveM", tag: "Custom Agentic Scripting", url: "https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/" },
    { title: "Spider-Man 2", tag: "DirectX 12 Ray Tracing", url: "https://insomniac.games/" }
  ];

  const personalityData: Record<string, { desc: string; quote: string; stats: { tactical: number; aggression: number; immersion: number; sass: number } }> = {
    Tactical: {
      desc: "Precision tactical analysis focusing on positioning, weapon cooldowns, enemy shield status, and squad callouts.",
      quote: '"Enemy shields cracked on squad B. Recommending immediate high-ground flank before thermal reset."',
      stats: { tactical: 95, aggression: 65, immersion: 85, sass: 15 }
    },
    Immersive: {
      desc: "Lore-infused roleplay commentary designed to deepen your narrative bond with the campaign world.",
      quote: '"By the Ancient Flame, the corruption spreads! Maintain defensive shield perimeter at all costs!"',
      stats: { tactical: 70, aggression: 45, immersion: 100, sass: 20 }
    },
    Friendly: {
      desc: "Supportive, encouraging co-pilot offering calm gameplay advice and moral support during intense boss encounters.",
      quote: '"Incredible shot! Let\'s pop a shield cell and regroup before the next wave arrives, buddy."',
      stats: { tactical: 75, aggression: 25, immersion: 80, sass: 10 }
    },
    Sarcastic: {
      desc: "Witty, dry, and brutally honest tactical roasts when you miss shots or trigger alarms.",
      quote: '"Oh brilliant accuracy. I\'m currently calculating our survival odds... 0.04%. Great job."',
      stats: { tactical: 85, aggression: 75, immersion: 60, sass: 100 }
    },
    Aggressive: {
      desc: "High-octane adrenaline commander pushing you to push relentlessly and dominate the battlefield.",
      quote: '"DESTROY THEM ALL! LEAVE NO SURVIVORS! RELOAD NOW AND PUSH THE FRONT LINE!"',
      stats: { tactical: 90, aggression: 100, immersion: 90, sass: 55 }
    }
  };

  const faqs = [
    {
      q: "What hardware do I need to run Mission Control?",
      a: "Mission Control requires an NVIDIA GTX or RTX series graphics card (GTX 1060 6GB minimum, RTX 2060+ recommended) because all neural AI models run locally on Tensor Cores to guarantee zero game latency."
    },
    {
      q: "Is Mission Control free and open source?",
      a: "Yes! Mission Control is 100% free, telemetry-transparent, and open-source. Created by Mission Control Labs & open contributors on GitHub."
    },
    {
      q: "Will using the HUD get me banned in anti-cheat protected multiplayer games?",
      a: "Mission Control operates as a standard hardware overlay, using DirectX/Vulkan hooks identical to Steam or Discord overlays. However, triggering 'Agentic Command Macros' in competitive titles is at your discretion based on each game's TOS."
    },
    {
      q: "How does local processing compare to cloud AI tools?",
      a: "Cloud AI tools add 200ms–500ms network latency and consume bandwidth. Local CUDA inference runs directly inside your VRAM with response times under 15ms without sending private data over the web."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start w-full relative overflow-hidden pt-20 sm:pt-24 bg-obsidian text-white">

      {/* JSON-LD Schemas */}
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="software-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      {/* Background Cybernetic Grid & Ambient Spotlights */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none z-0" />
      <div className="absolute inset-0 cyber-dots opacity-15 pointer-events-none z-0" />

      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] sm:w-[1200px] h-[500px] sm:h-[700px] bg-neon-green/10 rounded-full blur-[150px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-neon-yellow/5 rounded-full blur-[180px] pointer-events-none z-0" />

      {/* ================= TOP BRAND RIBBON ================= */}
      <div className="w-full bg-gradient-to-r from-neon-green/[0.08] via-neon-green/15 to-neon-green/[0.08] border-b border-neon-green/40 backdrop-blur-md py-2.5 px-4 relative z-20 text-center flex items-center justify-center gap-2 sm:gap-4 font-mono text-[10px] sm:text-xs shadow-[0_0_20px_rgba(118,185,0,0.15)]">
        <div className="flex items-center gap-1.5 text-neon-green font-bold tracking-widest uppercase shrink-0">
          <div className="w-5 h-5 rounded bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-neon-green shrink-0 shadow-[0_0_10px_rgba(118,185,0,0.3)]">
            <Sparkles className="w-3 h-3 animate-pulse" />
          </div>
          <span>POWERED BY MISSION CONTROL LABS</span>
        </div>

        <span className="text-neon-green/40 font-black">{"×"}</span>

        <div className="flex items-center gap-1.5 text-gray-200 truncate font-semibold">
          <div className="w-5 h-5 rounded bg-white/10 border border-white/20 flex items-center justify-center text-neon-yellow shrink-0">
            <Cpu className="w-3 h-3" />
          </div>
          <span className="truncate">NVIDIA TENSORRT LOCAL CUDA AI PLATFORM</span>
        </div>

        <a
          href="https://developer.nvidia.com/tensorrt"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1 text-neon-yellow font-bold bg-neon-yellow/10 border border-neon-yellow/40 hover:bg-neon-yellow hover:text-obsidian hover:shadow-[0_0_15px_rgba(255,255,0,0.4)] transition-all px-2.5 py-1 rounded-full text-[9px] uppercase cursor-pointer"
        >
          <span>NVIDIA AI SITE</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* ================= HERO SECTION ================= */}
      <section className="w-full max-w-7xl px-4 sm:px-6 mt-8 sm:mt-14 mb-20 sm:mb-28 relative z-10 mx-auto text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center w-full"
        >

          {/* High-Tech Tactical Header Pill */}
          <div className="inline-flex items-center gap-2 sm:gap-3 border border-neon-green/50 rounded-full px-4 py-1.5 bg-neon-green/10 backdrop-blur-md mb-6 shadow-[0_0_25px_rgba(118,185,0,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-neon-green shrink-0 animate-pulse" />
            <span className="text-neon-green text-[10px] sm:text-xs font-bold font-mono tracking-widest uppercase">
              TACTICAL SYSTEM ENGINE v{appVersion}
            </span>
          </div>

          {/* ROG / Razer Inspired Gradient Title matching screenshot */}
          <h1 className="text-4xl sm:text-7xl lg:text-8xl font-black font-display tracking-tight text-white mb-6 uppercase leading-[1.02] max-w-5xl">
            THE ULTIMATE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-neon-yellow to-neon-green glow-text-green drop-shadow-[0_0_25px_rgba(118,185,0,0.6)]">
              GAMING AI
            </span> <br />
            DASHBOARD
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-gray-300 max-w-2xl mb-10 leading-relaxed font-mono text-center">
            Engineered by <strong className="text-neon-green">Mission Control Labs</strong> for high-performance rigs. Monitor thermals in real-time, trigger agentic system macros, and receive sub-15ms local AI tactics directly inside your game.
          </p>

          {/* Primary Action Buttons & Quick Tag Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-12">
            {os === "mac" || os === "other" ? (
              <div className="group relative inline-flex items-center justify-center gap-3 bg-white/5 border border-white/20 text-gray-400 px-8 py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider text-center w-full sm:w-auto cursor-not-allowed">
                <span>Windows & Linux Only</span>
              </div>
            ) : (
              <a
                href={WINDOWS_INSTALLER_URL}
                className="group relative inline-flex items-center justify-center gap-3 bg-neon-green text-obsidian px-9 py-4.5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 hover:bg-white hover:shadow-[0_0_45px_rgba(118,185,0,0.8)] active:scale-95 text-center shadow-[0_0_35px_rgba(118,185,0,0.4)] w-full sm:w-auto font-mono cyber-clip-sm"
              >
                <Download className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 shrink-0" />
                <span>DOWNLOAD NOW (WINDOWS)</span>
              </a>
            )}

            <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
              <Link
                href="/docs"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 glass-card glass-card-hover px-7 py-4.5 text-xs sm:text-base font-bold text-white transition-all text-center border-white/15 hover:border-neon-green/40 font-mono"
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green shrink-0" />
                <span>Architecture Docs</span>
              </Link>

              <a
                href="https://github.com/arnab825/Mission-Control"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center p-4.5 glass-card glass-card-hover text-gray-300 hover:text-neon-green transition-colors border-white/15 shrink-0"
                title="View GitHub Repository"
              >
                <GithubIcon className="w-5 h-5 text-neon-green" />
              </a>
            </div>
          </div>

          {/* Interactive 3D Mockup Container with Feature Hotspots */}
          <div className="w-full max-w-5xl relative mt-4">
            <div className="glass-panel p-2.5 sm:p-4 rounded-[24px] sm:rounded-[32px] border-neon-green/40 bg-obsidian/90 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden">

              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/10 mb-3 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-gray-400 ml-2 font-bold hidden sm:inline">MISSION CONTROL v{appVersion} — TACTICAL STATION</span>
                </div>
                <div className="flex items-center gap-3 text-neon-green font-bold">
                  <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                  <span>CUDA ENGINE: ACTIVE</span>
                </div>
              </div>

              {/* Main App Showcase Image with 3K HD Zoom Modal Trigger */}
              <div 
                onClick={() => setIsZoomModalOpen(true)}
                className="relative rounded-xl overflow-hidden border border-white/10 group select-none cursor-pointer"
              >
                <img
                  src="/screenshots/dashboard.webp"
                  alt="Mission Control Tactical Interface"
                  className="w-full h-auto object-cover rounded-xl upscale-crisp group-hover:scale-[1.01] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-obsidian/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 font-mono text-xs font-bold text-neon-green bg-black/60 backdrop-blur-xs">
                  <Maximize2 className="w-4 h-4 animate-bounce" />
                  <span>CLICK TO INSPECT FULL 3K HD SCREENSHOT</span>
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      </section>

      {/* ================= FULL-RESOLUTION 3K HD SCREENSHOT LIGHTBOX MODAL ================= */}
      <AnimatePresence>
        {isZoomModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center cursor-zoom-out select-none"
          >
            <div className="relative max-w-7xl w-full max-h-[92vh] overflow-auto glass-card p-2 border-neon-green/40 shadow-[0_0_50px_rgba(118,185,0,0.3)]">
              <button 
                onClick={() => setIsZoomModalOpen(false)}
                className="absolute top-4 right-4 z-10 bg-obsidian/90 border border-neon-green/50 text-neon-green p-2 rounded-full hover:bg-neon-green hover:text-obsidian transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src="/screenshots/dashboard.webp" 
                alt="Mission Control Full 3K HD Interface" 
                className="w-full h-auto rounded-lg object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= TECH PARTNER TICKER STRIP ================= */}
      <div className="w-full bg-white/[0.02] border-y border-white/10 py-6 overflow-hidden relative z-10 mb-20 sm:mb-28">
        <div className="max-w-7xl mx-auto px-4 text-center mb-5 font-mono text-[11px] text-neon-green/90 uppercase tracking-widest flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span>BUILT ON INDUSTRY-LEADING GAMING ARCHITECTURES (CLICK TO FETCH EXTERNAL SITES)</span>
        </div>
        <div className="animate-marquee flex items-center gap-6 sm:gap-12 font-mono">
          {[...techPartners, ...techPartners].map((partner, idx) => {
            const Icon = partner.icon;
            return (
              <a
                key={idx}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 shrink-0 glass-card px-5 py-3 border-white/10 hover:border-neon-green/60 hover:bg-neon-green/10 hover:shadow-[0_0_20px_rgba(118,185,0,0.25)] transition-all cursor-pointer group rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green group-hover:scale-110 group-hover:bg-neon-green group-hover:text-obsidian transition-all shadow-[0_0_10px_rgba(118,185,0,0.15)]">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-xs sm:text-sm group-hover:text-neon-green transition-colors">{partner.name}</span>
                  <span className="text-gray-400 text-[10px] font-semibold">{partner.tag}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-neon-green group-hover:translate-x-0.5 transition-all ml-1" />
              </a>
            );
          })}
        </div>
      </div>

      {/* ================= VERIFIED TESTED GAMES SECTION ================= */}
      <section className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10">
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

        {/* Display 2 Verified Tested Games */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-10">
          {TESTED_GAMES_LIST.slice(0, 2).map((game) => (
            <div
              key={game.id}
              className="glass-card p-6 sm:p-8 border-neon-green/40 bg-gradient-to-b from-white/[0.03] to-transparent flex flex-col justify-between group relative overflow-hidden shadow-[0_0_30px_rgba(118,185,0,0.1)] hover:border-neon-green/70 transition-all"
            >
              {/* Corner Badge */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-neon-green shrink-0" />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{game.publisher}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-neon-green px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 uppercase tracking-wider">
                  {game.status}
                </span>
              </div>

              {/* Game Title & Genre */}
              <div className="mb-6">
                <h3 className="text-2xl sm:text-3xl font-black font-display text-white mb-1 group-hover:text-neon-green transition-colors">
                  {game.name}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <span>{game.genre}</span>
                  <span>•</span>
                  <span className="text-neon-yellow">{game.api}</span>
                </div>
              </div>

              {/* Real Telemetry Benchmark Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-obsidian/90 border border-white/10 rounded-xl font-mono text-xs mb-6">
                <div>
                  <span className="text-gray-400 text-[10px] block">AVG FPS:</span>
                  <span className="text-neon-green font-bold text-sm">{game.fps}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">VRAM USED:</span>
                  <span className="text-white font-bold text-sm">{game.vram}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">LATENCY:</span>
                  <span className="text-neon-yellow font-bold text-sm">{game.latency}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">GPU LOAD:</span>
                  <span className="text-white font-bold text-sm">{game.gpuLoad}</span>
                </div>
              </div>

              {/* Tech Tags */}
              <div className="flex flex-wrap gap-1.5 mb-6 font-mono text-[10px]">
                {game.keyTech.map((tech, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-gray-300">
                    ✓ {tech}
                  </span>
                ))}
              </div>

              {/* View Profile Button */}
              <Link
                href={`/games-tested?game=${game.id}`}
                className="w-full bg-neon-green/10 text-neon-green border border-neon-green/40 hover:bg-neon-green hover:text-obsidian px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all duration-300 flex items-center justify-center gap-2 text-center group/btn shadow-[0_0_15px_rgba(118,185,0,0.15)]"
              >
                <span>View Profile & Benchmarks</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>

        {/* View More Profiles Button */}
        <div className="text-center">
          <Link
            href="/games-tested"
            className="inline-flex items-center justify-center gap-3 glass-card glass-card-hover px-8 py-4 text-xs sm:text-sm font-black font-mono uppercase tracking-wider text-white border-neon-green/30 hover:border-neon-green/60 hover:text-neon-green shadow-[0_0_20px_rgba(118,185,0,0.2)] transition-all"
          >
            <span>View More Benchmark Profiles</span>
            <ArrowRight className="w-4 h-4 text-neon-green" />
          </Link>
        </div>
      </section>

      {/* ================= BENTO GRID ENGINE SPECS ================= */}
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10"
      >
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
            <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">TACTICAL HARDWARE SUITE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
            GAIN THE <span className="text-neon-green glow-text-teal">UNFAIR</span> ADVANTAGE
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
            Engineered by <strong className="text-neon-green">Mission Control Labs</strong> for zero CPU bottlenecking.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* CARD 1: 5 AI PERSONALITIES INTERACTIVE SIMULATOR (SPAN 2 COLS) */}
          <div className="glass-card glass-card-hover p-6 sm:p-8 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-between relative group overflow-hidden border-neon-green/40 bg-gradient-to-b from-white/[0.04] to-transparent">
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/40 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(118,185,0,0.2)]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-display text-white">5 Adaptive AI Personalities</h3>
                    <p className="text-xs font-mono text-neon-green uppercase tracking-wider">Dynamic Voice & Guidance Modes</p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neon-green px-3.5 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 uppercase tracking-wider">
                  Featured AI Engine
                </span>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6 font-sans">
                {personalityData[activePersonality].desc}
              </p>

              {/* Personality Selector Tabs - Scrollable on mobile, 5-col grid on sm+ */}
              <div className="flex overflow-x-auto sm:grid sm:grid-cols-5 gap-1.5 sm:gap-2 p-1.5 bg-obsidian/90 border border-white/10 rounded-xl text-center mb-6 no-scrollbar scrollbar-none">
                {["Tactical", "Immersive", "Friendly", "Sarcastic", "Aggressive"].map((p) => {
                  const isActive = activePersonality === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setActivePersonality(p)}
                      className={`py-2 px-3 sm:px-2 md:px-3 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink ${isActive
                          ? "bg-neon-green text-obsidian shadow-[0_0_15px_rgba(118,185,0,0.5)] scale-[1.02]"
                          : "bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Voice Frequency Equalizer Visualizer & Quote Box */}
              <div className="bg-obsidian/95 border border-neon-green/30 p-4 sm:p-5 rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3 text-xs font-mono text-gray-400">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-neon-green animate-pulse shrink-0" />
                    <span className="text-white font-bold uppercase">{activePersonality} VOICE MATRIX</span>
                  </div>
                  {/* Equalizer frequency bars */}
                  <div className="flex items-end gap-1 h-4 shrink-0">
                    {[60, 100, 45, 80, 95, 30, 85, 50, 90, 70].map((val, idx) => (
                      <div
                        key={idx}
                        className="w-1 bg-neon-green rounded-full animate-pulse"
                        style={{ height: `${val}%`, animationDelay: `${idx * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-mono text-neon-green italic leading-relaxed">
                  {personalityData[activePersonality].quote}
                </div>

                {/* Trait Meters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 font-mono text-[10px] sm:text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400">TACTICAL:</span>
                      <span className="text-neon-green font-bold">{personalityData[activePersonality].stats.tactical}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-neon-green h-full transition-all duration-500" style={{ width: `${personalityData[activePersonality].stats.tactical}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400">AGGRESSION:</span>
                      <span className="text-red-400 font-bold">{personalityData[activePersonality].stats.aggression}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${personalityData[activePersonality].stats.aggression}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400">IMMERSION:</span>
                      <span className="text-neon-yellow font-bold">{personalityData[activePersonality].stats.immersion}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-neon-yellow h-full transition-all duration-500" style={{ width: `${personalityData[activePersonality].stats.immersion}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400">SASS LEVEL:</span>
                      <span className="text-purple-400 font-bold">{personalityData[activePersonality].stats.sass}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-400 h-full transition-all duration-500" style={{ width: `${personalityData[activePersonality].stats.sass}%` }} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* CARD 2: DEEP GAME SCANNER */}
          <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
                  <Search className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                  AUTO-SCANNER
                </span>
              </div>
              <h3 className="text-2xl font-bold font-display text-white mb-1">Deep Game Scanner</h3>
              <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">NVIDIA DLSS & Path Tracing</div>
              <p className="text-gray-400 text-sm leading-relaxed font-sans mb-6">
                Scans game directories up to 3 subfolders deep to auto-configure DLSS 3.5 Frame Gen & Reflex low latency.
              </p>
            </div>

            {/* High-Fidelity Deep Scanner Interface Preview */}
            <div className="w-full h-32 bg-obsidian border border-white/10 rounded-xl relative overflow-hidden group/scan-preview">
              <img
                src="/screenshots/deepscanner.png"
                alt="Deep Game Scanner Interface"
                className="w-full h-full object-cover transition-all duration-500 group-hover/scan-preview:scale-105 group-hover/scan-preview:border-neon-green/30"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/85 via-obsidian/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 font-mono text-[9px] text-neon-green bg-obsidian/90 px-2.5 py-1 rounded-md border border-neon-green/30 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                <span>SCANNER ACTIVE</span>
              </div>
            </div>
          </div>

          {/* CARD 3: AGENTIC SYSTEM HOOKS */}
          <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                  ZERO LATENCY
                </span>
              </div>
              <h3 className="text-2xl font-bold font-display text-white mb-1">Agentic System Hooks</h3>
              <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">Autonomous System Commands</div>
              <p className="text-gray-400 text-sm leading-relaxed font-sans mb-4">
                Executes background PyTorch CUDA VRAM purges, triggers custom hardware cooling curves, and runs macro scripts headlessly.
              </p>
            </div>

            <div className="p-4 bg-obsidian border border-white/10 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">VRAM RECLAIM:</span>
                <button
                  onClick={handleVramFlush}
                  disabled={isVramFlushing}
                  className="px-3 py-1 rounded bg-neon-green/20 text-neon-green border border-neon-green/40 hover:bg-neon-green hover:text-obsidian transition-colors font-bold text-[10px] flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isVramFlushing ? "animate-spin" : ""}`} />
                  <span>{isVramFlushing ? "PURGING..." : "FLUSH VRAM"}</span>
                </button>
              </div>

              {vramFlushedMsg && (
                <div className="text-[10px] text-neon-green bg-neon-green/10 p-2 rounded border border-neon-green/30 text-center font-bold">
                  ✓ {vramFlushedMsg}
                </div>
              )}
            </div>
          </div>

          {/* CARD 4: HARDWARE-LOCKED PRIVACY */}
          <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                  LOCAL ONLY
                </span>
              </div>
              <h3 className="text-2xl font-bold font-display text-white mb-1">Hardware Privacy</h3>
              <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">Motherboard UUID Sandbox</div>
              <p className="text-gray-400 text-sm leading-relaxed font-sans mb-4">
                Custom prompts and performance telemetry are encrypted directly to your physical PC UUID. 100% offline local processing.
              </p>
            </div>

            <div className="p-3.5 bg-obsidian border border-neon-green/20 rounded-xl flex items-center gap-3 font-mono text-xs text-gray-300">
              <Lock className="w-5 h-5 text-neon-green shrink-0 animate-pulse" />
              <div className="truncate">
                <div className="text-[10px] text-gray-500">ENCRYPTED HARDWARE HASH</div>
                <div className="text-white font-bold text-[11px] truncate">UUID: 8F2A-94B1-0021-CUDA</div>
              </div>
            </div>
          </div>

          {/* CARD 5: STEALTH BOOST MODE (Fills Row 2 Column 3) */}
          <div className="glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-white/10">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
                  <Flame className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
                  MAX FPS
                </span>
              </div>
              <h3 className="text-2xl font-bold font-display text-white mb-1">Stealth Boost Mode</h3>
              <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">Aggressive Resource Purge</div>
              <p className="text-gray-400 text-sm leading-relaxed font-sans mb-4">
                Suspends unnecessary Windows background services and standby cache memory during active gameplay loops.
              </p>
            </div>

            <div className="p-4 bg-obsidian border border-white/10 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between text-gray-300 text-[11px]">
                <span>BOOST EFFICIENCY</span>
                <span className="text-neon-green font-bold">+14.2% FPS</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-neon-green h-full w-[88%] shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
              </div>
            </div>
          </div>

          {/* CARD 6: LIVE WEB CONTEXT SCRAPER WITH REAL EXTERNAL SITE FETCHING (SPAN 3 COLS - ROW 3) */}
          <div className="glass-card glass-card-hover p-6 sm:p-8 col-span-1 md:col-span-2 lg:col-span-3 flex flex-col justify-between relative group overflow-hidden border-neon-green/40">
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-display text-white">Live Web Context Scraper</h3>
                    <p className="text-xs font-mono text-neon-green uppercase tracking-wider">Real External Site News & Guide Engine</p>
                  </div>
                </div>

                {/* FETCH EXTERNAL SITE BUTTON */}
                <button
                  onClick={fetchExternalSiteData}
                  disabled={isFetchingExternal}
                  className="w-full sm:w-auto justify-center inline-flex items-center gap-2 bg-neon-green text-obsidian px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider hover:bg-white hover:shadow-[0_0_20px_rgba(118,185,0,0.6)] transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingExternal ? "animate-spin" : ""}`} />
                  <span>{isFetchingExternal ? "FETCHING EXTERNAL SITES..." : "FETCH EXTERNAL SITE DATA"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed font-sans mb-6">
                Connects directly to external sites (IGN, Kotaku, Eurogamer, AnandTech, Tom's Hardware) to stream real-time gaming news and boss mechanics directly into your tactical HUD.
              </p>
            </div>

            <div className="p-4 bg-obsidian/95 border border-neon-green/30 rounded-xl font-mono text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 border-b border-white/10 pb-2.5">
                <span className="text-neon-green font-bold flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-neon-green animate-ping shrink-0" />
                  <span className="truncate">{hasFetched ? "LIVE EXTERNAL RSS FEEDS (4 ARTICLES FETCHED)" : "PARSED EXTERNAL SITE FEEDS"}</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono tracking-wider">IGN • KOTAKU • EUROGAMER</span>
              </div>

              {hasFetched && externalNews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {externalNews.map((item, i) => (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-white/[0.03] border border-white/10 rounded-lg hover:border-neon-green/40 hover:bg-neon-green/5 transition-all text-xs group"
                    >
                      <div className="flex justify-between items-center text-neon-green font-bold text-[11px] mb-1">
                        <span className="uppercase font-mono flex items-center gap-1.5">
                          <Rss className="w-3 h-3" /> [{item.source}]
                        </span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-neon-green" />
                      </div>
                      <div className="text-white font-sans font-semibold group-hover:text-neon-yellow transition-colors line-clamp-1">
                        {item.title}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg">
                    <div className="text-gray-300 text-[11px] font-bold">ELDEN RING WIKI SCRAPER</div>
                    <div className="text-neon-yellow text-xs mt-1">"Malenia Phase 2 Waterfowl Dodge Timings"</div>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg">
                    <div className="text-gray-300 text-[11px] font-bold">CYBERPUNK 2077 WIKI SCRAPER</div>
                    <div className="text-white text-xs mt-1">"Patch 2.12 Frame Generation Driver Fixes"</div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </motion.section>

      {/* ================= SCREENSHOT GALLERY SECTION ================= */}
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10"
      >
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
            <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">REAL APP INTERFACE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
            DESIGNED FOR <span className="text-neon-green glow-text-teal">GAMERS</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
            High-contrast, hardware-accelerated interface engineered by <strong className="text-neon-green">Mission Control Labs</strong>.
          </p>
        </div>

        <ScreenshotGallery />
      </motion.section>

      {/* ================= BEFORE & AFTER ARCHITECTURE SECTION ================= */}
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10"
      >
        <BeforeAfterSlider />
      </motion.section>

      {/* ================= PROMOTIONAL MEDIA & VIDEO SHOWCASE ================= */}
      {/* <PromotionalVideoShowcase /> */}

      {/* ================= INTERACTIVE HUD OVERLAY PREVIEW SECTION ================= */}
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10"
      >
        <div className="glass-panel p-6 sm:p-12 lg:p-16 rounded-[28px] sm:rounded-[36px] border-neon-green/40 bg-obsidian/95 relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)]">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10">
                <Radio className="w-4 h-4 text-neon-green animate-pulse shrink-0" />
                <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">HUD ARCHITECTURE</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-white leading-tight">
                IMMERSIVE <span className="text-neon-green glow-text-teal">IN-GAME</span> OVERLAY
              </h2>

              <p className="text-gray-300 text-sm sm:text-base leading-relaxed font-sans">
                Mission Control injects a transparent heads-up display. Summon real-time tactical advice, monitor thermals, or launch system macros without leaving your game.
              </p>

              {/* Dynamic HUD Mode Tabs */}
              <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-xl font-mono text-xs">
                {(["combat", "telemetry", "scraper"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveHudTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold uppercase transition-all cursor-pointer ${activeHudTab === tab
                        ? "bg-neon-green text-obsidian shadow-[0_0_10px_rgba(118,185,0,0.4)]"
                        : "text-gray-400 hover:text-white"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-4 pt-2 font-sans">
                {[
                  { title: "Zero Frame Loss", desc: "Native DirectX 12 & Vulkan swapchain hook rendering." },
                  { title: "Customizable Transparency", desc: "Adjust position, opacity, scale, and color profiles." },
                  { title: "Hotkeys & Voice Triggers", desc: "Bind macros to key combinations or voice phrases." }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-neon-green/10 border border-neon-green/40 flex items-center justify-center text-neon-green shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm sm:text-base">{item.title}</div>
                      <div className="text-gray-400 text-xs sm:text-sm">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Dynamic HUD Visual Container */}
            <div className="lg:col-span-7 relative">
              <div className="w-full bg-[#06070a] border border-white/20 rounded-2xl p-5 sm:p-7 relative scanline-effect shadow-2xl">

                {/* Background Crosshair Graphic */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <Crosshair className="w-48 h-48 text-neon-green" />
                </div>

                <div className="relative z-10 space-y-4 font-mono text-xs">
                  {/* HUD Header Status */}
                  <div className="flex justify-between items-center bg-white/[0.04] p-3.5 rounded-xl border border-white/10 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-neon-green animate-ping" />
                      <span className="text-white font-bold text-xs">APEX LEGENDS (DX12)</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-gray-400">FRAME TIME: <strong className="text-neon-yellow">6.0ms</strong></span>
                      <span className="text-neon-green font-bold">LATENCY: 0.8ms</span>
                    </div>
                  </div>

                  {/* Mode Specific Dynamic Body */}
                  {activeHudTab === "combat" && (
                    <div className="space-y-4">
                      <div className="glass-card p-4 border-neon-green/40 bg-neon-green/[0.04]">
                        <div className="text-neon-green font-bold mb-1.5 flex items-center justify-between text-xs">
                          <span>TACTICAL ASSISTANT &gt; TACTICAL MODE</span>
                          <span className="text-[9px] bg-neon-green/20 px-2 py-0.5 rounded text-white font-mono">AUTONOMOUS</span>
                        </div>
                        <p className="text-gray-200 leading-relaxed text-xs sm:text-sm">
                          "Enemy squad holding East building. Flank from high ground left to break line of sight."
                        </p>
                      </div>

                      <div className="glass-card p-4 space-y-2 border-white/10">
                        <div className="flex justify-between text-gray-400 text-[11px]">
                          <span>FRAME RATE STABILITY INDEX</span>
                          <span className="text-white font-bold">165 FPS (STABLE)</span>
                        </div>
                        <div className="flex items-end gap-1.5 h-14 pt-2">
                          {[70, 85, 90, 88, 95, 92, 100, 98, 96, 99, 97, 100, 98, 100].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-neon-green/50 hover:bg-neon-green rounded-t transition-all"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeHudTab === "telemetry" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-4 border-white/10">
                        <div className="text-gray-400 text-[10px] mb-1">GPU THERMAL CLOCK</div>
                        <div className="text-2xl font-bold text-white font-mono">62°C</div>
                        <div className="text-neon-green text-[10px] mt-1">Fan Speed: 48%</div>
                      </div>
                      <div className="glass-card p-4 border-white/10">
                        <div className="text-gray-400 text-[10px] mb-1">CUDA VRAM USED</div>
                        <div className="text-2xl font-bold text-neon-yellow font-mono">4.2 GB</div>
                        <div className="text-gray-400 text-[10px] mt-1">Total: 24 GB</div>
                      </div>
                      <div className="glass-card p-4 col-span-2 border-white/10 flex justify-between items-center">
                        <span className="text-gray-300 font-bold">PYTORCH INFERENCE ENGINE</span>
                        <span className="text-neon-green font-bold">ACTIVE (0.8ms)</span>
                      </div>
                    </div>
                  )}

                  {activeHudTab === "scraper" && (
                    <div className="glass-card p-4 border-neon-green/30 bg-neon-green/[0.02] space-y-2">
                      <div className="text-neon-yellow font-bold text-xs border-b border-white/10 pb-1">
                        LIVE WIKI INJECTION: WIKI SCRAPER ACTIVE
                      </div>
                      <div className="text-gray-300 text-xs leading-relaxed">
                        • Weakness: Shock damage (+25% critical multiplier)<br />
                        • Recommended Loadout: Energy rifle with high-velocity optics<br />
                        • Spawn Interval: 45 Seconds
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>

        </div>
      </motion.section>

      {/* ================= PERFORMANCE COMPARISON SECTION ================= */}
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10"
      >
        <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
            REPLACE THE <span className="text-neon-green glow-text-teal">BLOATWARE</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
            Standard game launchers consume hundreds of megabytes of RAM and harvest user telemetry. See how Mission Control stacks up.
          </p>
        </div>

        {/* Comparison Side-by-Side Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

          {/* Bloated Launchers */}
          <div className="glass-card p-6 sm:p-8 border-red-500/30 bg-red-950/[0.06] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <h3 className="text-2xl font-bold text-white font-display">Standard Launchers</h3>
                <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mt-1">Chromium & Webview Wrappers</p>
              </div>
              <span className="px-3.5 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-mono font-bold uppercase">
                Heavy Overhead
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                  <span className="text-gray-400">RAM Footprint</span>
                  <span className="text-red-400 font-bold">1,200 MB+</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-red-500 h-full w-[85%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                  <span className="text-gray-400">Background Telemetry</span>
                  <span className="text-red-400 font-bold">Active Cloud Mining</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-red-500 h-full w-[75%]" />
                </div>
              </div>

              <ul className="pt-4 border-t border-white/10 space-y-3 text-xs sm:text-sm text-gray-400 font-sans">
                <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Constant cloud connectivity requirement</li>
                <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Intrusive popups & auto-play store ads</li>
                <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Frame stutters during background sync</li>
              </ul>
            </div>
          </div>

          {/* Mission Control System */}
          <div className="glass-card p-6 sm:p-8 border-neon-green/50 bg-neon-green/[0.03] relative overflow-hidden shadow-[0_0_40px_rgba(118,185,0,0.15)]">
            <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[10px] font-mono font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
              OPTIMIZED ENGINE
            </div>

            <div className="flex items-center justify-between mb-6 mt-2 sm:mt-0">
              <div>
                <h3 className="text-2xl font-bold text-white font-display">Mission Control</h3>
                <p className="text-xs font-mono text-neon-green uppercase tracking-wider mt-1">Native C++ & PyTorch CUDA</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                  <span className="text-gray-300 font-medium">RAM Footprint</span>
                  <span className="text-neon-green font-bold glow-text-teal">45 MB</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-neon-green h-full w-[10%] shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                  <span className="text-gray-300 font-medium">Telemetry Privacy</span>
                  <span className="text-neon-green font-bold glow-text-teal">100% Offline Local Sandbox</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-neon-green h-full w-[100%] shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
                </div>
              </div>

              <ul className="pt-4 border-t border-white/10 space-y-3 text-xs sm:text-sm text-gray-200 font-sans">
                <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Zero cloud dependency (Local CUDA models)</li>
                <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Startup time under 180ms</li>
                <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Autonomous PyTorch standby VRAM purge</li>
              </ul>
            </div>
          </div>

        </div>
      </motion.section>

      {/* ================= DOWNLOAD & SYSTEM REQUIREMENTS ================= */}
      <section id="download" className="w-full max-w-5xl px-4 sm:px-6 mb-24 sm:mb-36 relative z-10 text-center">

        <div className="mb-12">
          <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
            <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">DEPLOYMENT PACKAGES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-3 font-display uppercase tracking-tight text-white">
            READY TO <span className="text-neon-green glow-text-teal">ENGAGE?</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base font-sans">Select your deployment platform package below.</p>
        </div>

        {/* OS Download Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-16">

          {/* Windows Build */}
          <div className="glass-card p-6 sm:p-10 border-neon-green/50 hover:border-neon-green flex flex-col justify-between group text-left relative overflow-hidden shadow-[0_0_35px_rgba(118,185,0,0.15)]">
            <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[10px] font-mono font-bold px-3.5 py-1 rounded-bl-lg uppercase tracking-wider">
              STABLE BUILD
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1.5 font-display">Windows Deployment</h3>
              <p className="text-gray-400 text-xs sm:text-sm font-mono mb-8">Windows 10 / 11 64-bit (.exe)</p>
            </div>
            <a
              href={WINDOWS_INSTALLER_URL}
              className="w-full bg-neon-green text-obsidian px-6 py-4.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-white hover:shadow-[0_0_30px_rgba(118,185,0,0.6)] transition-all duration-300 flex items-center justify-center gap-2.5 font-mono shadow-[0_0_20px_rgba(118,185,0,0.3)] text-center mb-4 cursor-pointer"
            >
              <Download className="w-5 h-5 shrink-0" /> Download for Windows
            </a>
            <div className="flex justify-center gap-4 text-xs font-mono">
              <a href={WINDOWS_MSI_URL} className="text-gray-400 hover:text-neon-green transition-colors flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> MSI Installer
              </a>
              <span className="text-gray-600">|</span>
              <a href={WINDOWS_ZIP_URL} className="text-gray-400 hover:text-neon-green transition-colors flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Portable ZIP
              </a>
            </div>
          </div>

          {/* Linux Build */}
          <div className="glass-card p-6 sm:p-10 border-white/10 flex flex-col justify-between text-left relative overflow-hidden opacity-85">
            <div className="absolute top-0 right-0 bg-white/10 text-gray-400 text-[10px] font-mono font-bold px-3.5 py-1 rounded-bl-lg uppercase tracking-wider">
              IN DEVELOPMENT
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1.5 font-display">Linux Package</h3>
              <p className="text-gray-400 text-xs sm:text-sm font-mono mb-8">AppImage / .deb Package</p>
            </div>
            <button className="w-full border border-white/10 bg-white/5 text-gray-500 px-6 py-4.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-not-allowed font-mono">
              Under Active Development
            </button>
          </div>

        </div>

        {/* Hardware Specifications */}
        <div className="text-left w-full max-w-4xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 font-display border-b border-white/10 pb-4 uppercase tracking-wider text-white flex items-center gap-3">
            <Sliders className="w-5 h-5 text-neon-green shrink-0" />
            HARDWARE SPECIFICATIONS MATRIX
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="glass-card p-6 sm:p-8 border-white/10">
              <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-300 font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-gray-400" /> Minimum Requirements
              </h4>
              <ul className="space-y-4 text-xs sm:text-sm text-gray-400 font-mono">
                <li className="flex items-center justify-between border-b border-white/5 pb-3 gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400 shrink-0" /> OS:
                  </span>
                  <span>Windows 10 64-bit</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-3 gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-gray-400 shrink-0" /> GPU:
                  </span>
                  <span>NVIDIA GTX 1060 (6GB VRAM)</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-3 gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-gray-400 shrink-0" /> RAM:
                  </span>
                  <span>16 GB System RAM</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-gray-400 shrink-0" /> Storage:
                  </span>
                  <span>4 GB NVMe SSD</span>
                </li>
              </ul>
            </div>

            <div className="glass-card p-6 sm:p-8 border-neon-green/40 bg-neon-green/[0.02] relative overflow-hidden shadow-[0_0_30px_rgba(118,185,0,0.1)]">
              <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg uppercase shadow-md">
                RECOMMENDED
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-neon-green font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-green" /> Recommended Specs
              </h4>
              <ul className="space-y-4 text-xs sm:text-sm text-gray-300 font-mono">
                <li className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-neon-green shrink-0" /> OS:
                  </span>
                  <span className="text-neon-green font-semibold">Windows 11 64-bit</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-neon-green shrink-0" /> GPU:
                  </span>
                  <span className="text-neon-green font-semibold">NVIDIA RTX 2060+ (6GB+ VRAM)</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-neon-green shrink-0" /> RAM:
                  </span>
                  <span className="text-neon-green font-semibold">32 GB High-Speed RAM</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-neon-yellow shrink-0" /> Acceleration:
                  </span>
                  <span className="text-neon-yellow font-bold">TensorRT Enabled</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </section>

      {/* ================= HARDWARE OEM & BRAND SPONSORSHIP SECTION ================= */}
      {/* <SponsorshipPartnerSection /> */}

      {/* ================= FAQ SECTION (ACCORDION) ================= */}
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl px-4 sm:px-6 mb-20 sm:mb-28 relative z-10"
      >
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-4xl font-black mb-3 font-display uppercase tracking-wider text-white">
            FREQUENTLY ASKED <span className="text-neon-green glow-text-teal">QUESTIONS</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm font-sans">Everything you need to know about setup, anti-cheat safety, and local CUDA execution.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className={`glass-card transition-all duration-300 overflow-hidden ${isOpen ? "border-neon-green/50 bg-neon-green/[0.04] shadow-[0_0_20px_rgba(118,185,0,0.15)]" : "hover:border-white/20"
                  }`}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                >
                  <span className={`font-bold text-sm sm:text-lg transition-colors leading-snug ${isOpen ? "text-neon-green" : "text-white"}`}>
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 bg-neon-green/20 border-neon-green/50 text-neon-green" : "text-gray-400"
                    }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-gray-300 text-xs sm:text-sm leading-relaxed border-t border-white/10 pt-4 font-sans">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* FLOATING ACTION BUTTON: FETCH LIVE EXTERNAL INTEL */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={fetchExternalSiteData}
          disabled={isFetchingExternal}
          className="group relative inline-flex items-center gap-2 bg-obsidian/90 border border-neon-green text-neon-green px-4 py-3 rounded-full font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(118,185,0,0.35)] hover:bg-neon-green hover:text-obsidian transition-all cursor-pointer backdrop-blur-md"
          title="Fetch Live External Site Intel (IGN, Kotaku, Eurogamer)"
        >
          <Rss className={`w-4 h-4 ${isFetchingExternal ? "animate-spin" : "animate-pulse"}`} />
          <span className="hidden sm:inline">{isFetchingExternal ? "FETCHING..." : "FETCH EXTERNAL INTEL"}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
