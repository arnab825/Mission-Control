"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
import { WINDOWS_INSTALLER_URL, WINDOWS_MSI_URL, WINDOWS_ZIP_URL } from "@/lib/download";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { 
  Users, 
  Search, 
  Zap, 
  Shield, 
  Globe, 
  Cloud, 
  Flame, 
  BarChart, 
  Download, 
  FileText, 
  CheckCircle2, 
  ChevronDown,
  Cpu,
  Activity,
  Terminal,
  Sparkles,
  Layers,
  Sliders,
  Radio,
  ExternalLink,
  ArrowRight
} from "lucide-react";

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activePersonality, setActivePersonality] = useState("Tactical");
  const [consoleCommand, setConsoleCommand] = useState("/boost --vram-flush");
  
  type OS = "windows" | "linux" | "mac" | "other" | null;
  const [os, setOs] = useState<OS>(null);

  useEffect(() => {
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes("win")) setOs("windows");
    else if (platform.includes("linux")) setOs("linux");
    else if (platform.includes("mac")) setOs("mac");
    else setOs("other");
  }, []);

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

  const bentoFeatures = [
    {
      title: "5 AI Personalities",
      tagline: "Adaptive Tactical Intelligence",
      desc: "Switch dynamically between Tactical, Friendly, Immersive, Sarcastic, and Aggressive modes. The neural engine analyzes game state to deliver real-time voice and HUD guidance.",
      icon: Users,
      span: "col-span-1 md:col-span-2 lg:col-span-2",
      badge: "Featured AI Engine",
      visual: (
        <div className="mt-6">
          <div className="flex flex-wrap gap-1.5 sm:grid sm:grid-cols-5 sm:gap-2 p-3 bg-obsidian/80 border border-white/10 rounded-xl text-center">
            {["Tactical", "Immersive", "Friendly", "Sarcastic", "Aggressive"].map((p) => {
              const isActive = activePersonality === p;
              return (
                <button
                  key={p}
                  onClick={() => setActivePersonality(p)}
                  className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${isActive ? "bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_10px_rgba(118, 185, 0,0.2)]" : "bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/10"}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs font-mono text-gray-300 bg-white/5 p-3 rounded-lg border border-white/10 h-16 flex items-center justify-center italic text-center transition-all">
            {activePersonality === "Tactical" && '"Enemy shields cracked. Push now or fall back to high ground."'}
            {activePersonality === "Immersive" && '"By the Maker, we cannot hold this position much longer!"'}
            {activePersonality === "Friendly" && '"Great shot! Let\'s heal up before the next wave, buddy."'}
            {activePersonality === "Sarcastic" && '"Oh brilliant, you missed again. I\'ll just calculate the odds of us dying... 99%."'}
            {activePersonality === "Aggressive" && '"DESTROY THEM! LEAVE NO SURVIVORS! RELOAD AND PUSH!"'}
          </div>
        </div>
      )
    },
    {
      title: "Deep Game Scanner",
      tagline: "NVIDIA Integration Auto-Detect",
      desc: "Scans game directories up to 3 folders deep to automatically configure DLSS 3.5 Frame Generation, Reflex Low Latency, and Path Tracing.",
      icon: Search,
      span: "col-span-1 md:col-span-1 lg:col-span-1",
      badge: "Auto-Scan",
      visual: null
    },
    {
      title: "Agentic Hooks",
      tagline: "Autonomous Command Execution",
      desc: "Empower the AI assistant to perform headless background tasks: flush PyTorch VRAM, execute game scripts, or trigger hardware fan profiles.",
      icon: Zap,
      span: "col-span-1 md:col-span-1 lg:col-span-1",
      badge: "Zero Latency",
      visual: null
    },
    {
      title: "Hardware-Locked Privacy",
      tagline: "Motherboard UUID Sandbox",
      desc: "Telemetry and custom prompt histories are encrypted and locked directly to your physical hardware UUID. 100% local processing—no cloud data mining.",
      icon: Shield,
      span: "col-span-1 md:col-span-1 lg:col-span-1",
      badge: "Local Only",
      visual: null
    },
    {
      title: "Live Web Context",
      tagline: "Real-Time Wiki & Guide Injection",
      desc: "Concurrent background workers scrap game wikis, boss vulnerabilities, and patch notes, feeding actionable insights directly into your tactical HUD.",
      icon: Globe,
      span: "col-span-1 md:col-span-2 lg:col-span-2",
      badge: "Real-time Context",
      visual: (
        <div className="mt-4 p-3 bg-obsidian/90 border border-neon-green/30 rounded-xl flex items-center gap-3 text-xs font-mono text-gray-300">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-ping shrink-0" />
          <span className="truncate">Scraping boss mechanics for: Cyberpunk 2077...</span>
        </div>
      )
    },
    {
      title: "Stealth Boost Mode",
      tagline: "Aggressive Resource Reclaim",
      desc: "Suspends background UI threads and purges standby memory caches during active gameplay to maximize every raw frame.",
      icon: Flame,
      span: "col-span-1 md:col-span-1 lg:col-span-1",
      badge: "Max FPS",
      visual: null
    }
  ];

  const faqs = [
    {
      q: "What hardware do I need to run Mission Control?",
      a: "Mission Control requires an NVIDIA GTX or RTX series graphics card (GTX 1060 6GB minimum, RTX 2060+ recommended) because all neural AI models run locally on Tensor Cores to guarantee zero game latency."
    },
    {
      q: "Is Mission Control free and open source?",
      a: "Yes! Mission Control is 100% free, telemetry-transparent, and open-source. You can inspect the entire codebase, build from source, or submit pull requests on GitHub."
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
    <div className="min-h-screen flex flex-col items-center justify-start w-full relative overflow-hidden pt-24 sm:pt-28 bg-transparent">
      
      {/* JSON-LD Schemas */}
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="software-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      {/* Cyber Grid & Glowing Ambient Lighting Background */}
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none z-0" />
      <div className="absolute inset-0 cyber-dots opacity-20 pointer-events-none z-0" />
      
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[400px] sm:h-[500px] bg-neon-green/10 rounded-full blur-[120px] sm:blur-[140px] pointer-events-none z-0 animate-pulse-slow" />

      {/* ================= HERO SECTION ================= */}
      <section className="w-full max-w-7xl px-4 sm:px-6 mt-6 sm:mt-16 mb-20 sm:mb-36 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-7 flex flex-col items-start text-left"
          >
            {/* Hero Brand Logo */}
            <div className="flex items-center gap-3 sm:gap-4 mb-8">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border border-neon-green/30 flex items-center justify-center bg-neon-green/5 overflow-hidden p-2 sm:p-3 shadow-[0_0_25px_rgba(118, 185, 0,0.15)] shrink-0">
                <img src="/logo.png" alt="Mission Control Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] sm:text-[10px] font-mono font-bold text-neon-green uppercase tracking-wider sm:tracking-widest block mb-0.5 truncate">THE NEXT-GEN GAME ASSISTANT</span>
                <span className="text-base sm:text-lg font-black font-display text-white uppercase tracking-wider block">MISSION CONTROL</span>
              </div>
            </div>

            {/* Top Tactical Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
              <div className="inline-flex items-center gap-2 border border-neon-green/40 rounded-full px-3.5 py-1.5 bg-neon-green/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse shrink-0" />
                <span className="text-neon-green text-[11px] sm:text-xs font-bold font-mono tracking-wider uppercase">NVIDIA TensorRT Native</span>
              </div>
              <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-3.5 py-1.5 bg-white/[0.03] backdrop-blur-md">
                <Shield className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-300 text-[11px] sm:text-xs font-semibold font-mono tracking-wider uppercase">v2.4 Stealth Build</span>
              </div>
            </div>
            
            {/* Headline */}
            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black font-display tracking-tight text-white mb-6 uppercase leading-[1.1] sm:leading-[1.05]">
              THE ULTIMATE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-neon-green glow-text-teal">
                GAMING AI
              </span> DASHBOARD
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-xl text-gray-300 sm:text-gray-400 max-w-2xl mb-8 sm:mb-10 leading-relaxed font-normal">
              Next-generation tactical HUD overlay built for high-performance rigs. Monitor thermals in real-time, trigger agentic system commands, and receive low-latency AI tactical advice—directly inside your game.
            </p>

            {/* CTAs - Flawless Mobile Responsiveness */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
              {os === "mac" || os === "other" ? (
                <div
                  className="group relative inline-flex items-center justify-center gap-3 bg-white/5 border border-white/20 text-gray-400 px-7 py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider text-center w-full sm:w-auto cursor-not-allowed"
                >
                  <span>This app will not support this OS</span>
                </div>
              ) : (
                <Link 
                  href="#download" 
                  className="group relative inline-flex items-center justify-center gap-3 bg-neon-green text-obsidian px-7 py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 hover:bg-white hover:shadow-[0_0_35px_rgba(118, 185, 0,0.6)] active:scale-95 text-center shadow-[0_0_25px_rgba(118, 185, 0,0.35)] w-full sm:w-auto"
                >
                  <Download className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 shrink-0" />
                  <span>Download for {os === "linux" ? "Linux" : "Windows"}</span>
                </Link>
              )}

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link 
                  href="/docs" 
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 glass-card glass-card-hover px-6 py-4 text-xs sm:text-base font-bold text-white transition-all text-center border-white/15"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green shrink-0" />
                  <span>Read Architecture Docs</span>
                </Link>

                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center justify-center p-4 glass-card glass-card-hover text-gray-300 hover:text-white transition-colors border-white/15 shrink-0"
                  title="View GitHub Repository"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>
            
            {/* Quick Spec Highlights */}
            <div className="mt-10 pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-lg text-center sm:text-left">
              <div>
                <div className="text-xl sm:text-3xl font-black font-mono text-white">165+</div>
                <div className="text-[10px] sm:text-xs text-gray-400 font-sans uppercase tracking-wider mt-1">FPS Target Lock</div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black font-mono text-neon-green glow-text-teal">1.2ms</div>
                <div className="text-[10px] sm:text-xs text-gray-400 font-sans uppercase tracking-wider mt-1">CUDA Latency</div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black font-mono text-white">0%</div>
                <div className="text-[10px] sm:text-xs text-gray-400 font-sans uppercase tracking-wider mt-1">Cloud Dependency</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Dynamic Interactive Overlay Mockup & Telemetry Cards */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 relative w-full flex flex-col items-center"
          >
            {/* Glow backing */}
            <div className="absolute inset-0 bg-neon-green/15 blur-3xl rounded-3xl -z-10" />

            {/* Tactical Dashboard Frame */}
            <div className="w-full bg-[#0d0f14]/95 border border-white/15 rounded-[24px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] scanline-effect relative">
              
              {/* Window Header Bar */}
              <div className="bg-obsidian/95 px-4 sm:px-5 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-1 text-[10px] sm:text-xs font-mono text-gray-400 uppercase tracking-widest truncate max-w-[140px] sm:max-w-none">MISSION_CONTROL_HUD</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-neon-green animate-ping" />
                  <span className="text-[10px] sm:text-[11px] font-mono text-neon-green font-bold">LIVE IN-GAME</span>
                </div>
              </div>

              {/* Tactical Inner Viewport */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                
                {/* Floating Telemetry Widgets Bar */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  
                  {/* FPS & Frame Time Widget */}
                  <div className="glass-card p-3.5 sm:p-4 border-neon-green/30 bg-neon-green/[0.03]">
                    <div className="flex justify-between items-center text-[10px] sm:text-xs text-gray-400 font-mono mb-1">
                      <span>FRAME_RATE</span>
                      <Activity className="w-3.5 h-3.5 text-neon-green shrink-0" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">165.4</span>
                      <span className="text-[10px] sm:text-xs font-mono text-neon-green font-bold">FPS</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div className="bg-neon-green h-full w-[88%] shadow-[0_0_8px_rgba(118, 185, 0,0.8)]" />
                    </div>
                  </div>

                  {/* GPU Thermals & Load */}
                  <div className="glass-card p-3.5 sm:p-4">
                    <div className="flex justify-between items-center text-[10px] sm:text-xs text-gray-400 font-mono mb-1">
                      <span>GPU_THERMALS</span>
                      <Cpu className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">62°C</span>
                      <span className="text-[10px] sm:text-xs font-mono text-gray-400">42% LOAD</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div className="bg-neon-yellow h-full w-[42%]" />
                    </div>
                  </div>

                </div>

                {/* AI Assistant Live Feed Box */}
                <div className="glass-card p-3.5 sm:p-4 border-neon-green/30 bg-obsidian/90">
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-neon-green shrink-0" />
                      <span className="text-xs font-bold font-mono text-white uppercase">AI Companion</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-neon-green/20 text-neon-green font-bold">TACTICAL</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-gray-400 text-[11px]">
                      <span className="text-neon-green font-bold">&gt; Scanner:</span> Cyberpunk 2077 detected.
                    </div>
                    <div className="text-white bg-white/[0.04] p-2.5 rounded-xl border border-white/5 leading-relaxed text-[11px]">
                      <span className="text-yellow-400 font-bold">Recommendation:</span> Reclaiming 1.8 GB VRAM. Enabling Reflex Boost for low latency.
                    </div>
                  </div>
                </div>

                {/* Simulated Quick Console Terminal */}
                <div className="bg-obsidian p-3 sm:p-3.5 rounded-xl border border-white/10 font-mono text-xs flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-neon-green shrink-0" />
                  <span className="text-neon-green font-bold">&gt;</span>
                  <input 
                    type="text" 
                    value={consoleCommand}
                    onChange={(e) => setConsoleCommand(e.target.value)}
                    className="bg-transparent text-gray-200 focus:outline-none w-full font-mono text-xs"
                  />
                  <span className="text-[9px] sm:text-[10px] text-gray-400 bg-white/10 px-2 py-1 rounded shrink-0 font-bold">ENTER</span>
                </div>

              </div>
            </div>

            {/* Mobile Responsive Floating Accents */}
            <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-6 sm:-left-6 glass-card p-3.5 px-4 flex items-center gap-3 border-neon-green/40 bg-obsidian/95 shadow-2xl z-20 w-full sm:w-auto">
              <div className="w-3 h-3 rounded-full bg-neon-green animate-ping shrink-0" />
              <div className="text-xs font-mono">
                <div className="text-white font-bold">AGENTIC HOOK ACTIVE</div>
                <div className="text-gray-400 text-[10px]">PyTorch CUDA Idle Cache Flushed</div>
              </div>
            </div>

          </motion.div>

        </div>
      </section>

      {/* ================= FEATURES SECTION (BENTO GRID) ================= */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-20 sm:mb-36 relative z-10"
      >
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
            <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">TACTICAL ENGINE SPECS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-4 sm:mb-6 font-display uppercase tracking-tight text-white">
            GAIN THE <span className="text-neon-green glow-text-teal">UNFAIR</span> ADVANTAGE
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
            Engineered natively for Windows 11 and Linux gaming environments. Minimal CPU footprint, maximum in-game intelligence.
          </p>
        </div>

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bentoFeatures.map((feat, i) => {
            const IconComp = feat.icon;
            return (
              <div 
                key={i} 
                className={`glass-card glass-card-hover p-6 sm:p-8 flex flex-col justify-between relative group overflow-hidden ${feat.span}`}
              >
                {/* Corner highlight */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-bl-full blur-2xl pointer-events-none group-hover:bg-neon-green/15 transition-all duration-500" />

                <div>
                  {/* Top Bar with Icon and Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_15px_rgba(118, 185, 0,0.15)] group-hover:bg-neon-green group-hover:text-obsidian transition-all duration-300 shrink-0">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-gray-300 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 uppercase tracking-wider">
                      {feat.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-2xl font-bold font-display text-white mb-1.5 group-hover:text-neon-green transition-colors">
                    {feat.title}
                  </h3>
                  <div className="text-xs font-mono text-neon-green uppercase tracking-wider mb-3 font-semibold">
                    {feat.tagline}
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed font-sans">
                    {feat.desc}
                  </p>
                </div>

                {/* Optional Custom Visual Element */}
                {feat.visual && (
                  <div className="mt-4">
                    {feat.visual}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ================= SCREENSHOT GALLERY SECTION ================= */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-20 sm:mb-36 relative z-10"
      >
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
            <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">APP PREVIEW</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-4 sm:mb-6 font-display uppercase tracking-tight text-white">
            DESIGNED FOR <span className="text-neon-green glow-text-teal">GAMERS</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
            A beautiful, lightweight, and hardware-accelerated interface that stays out of your way until you need it.
          </p>
        </div>
        
        <ScreenshotGallery />
      </motion.section>

      {/* ================= BEFORE & AFTER ARCHITECTURE SECTION ================= */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-20 sm:mb-36 relative z-10"
      >
        <BeforeAfterSlider />
      </motion.section>

      {/* ================= AI OVERLAY PREVIEW SECTION ================= */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-20 sm:mb-36 relative z-10"
      >
        <div className="glass-panel p-6 sm:p-12 lg:p-16 rounded-[28px] sm:rounded-[32px] border-neon-green/30 bg-obsidian/90 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10">
                <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse shrink-0" />
                <span className="text-neon-green text-xs font-bold font-mono tracking-wider uppercase">HUD ARCHITECTURE</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-white leading-tight">
                IMMERSIVE <span className="text-neon-green glow-text-teal">IN-GAME</span> HUD OVERLAY
              </h2>

              <p className="text-gray-400 text-sm sm:text-base leading-relaxed font-sans">
                Mission Control injects an ultra-transparent, non-intrusive heads-up display. Summon tactical advice, execute hardware commands, or review real-time telemetry graphs without alt-tabbing away from combat.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  { title: "Zero Frame Impact", desc: "Hardware accelerated rendering using DirectX 12 & Vulkan swapchains." },
                  { title: "Transparent HUD Panels", desc: "Customizable opacity, position, and tactical color schemes." },
                  { title: "Voice & Macro Execution", desc: "Voice activated macros or hotkeys for rapid system control." }
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

            {/* Simulated HUD Visual Demo */}
            <div className="lg:col-span-6 relative">
              <div className="w-full bg-[#07080b] border border-white/15 rounded-2xl p-4 sm:p-6 relative scanline-effect shadow-2xl">
                
                {/* Simulated Crosshair background graphic */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <div className="w-40 h-40 border border-neon-green rounded-full flex items-center justify-center">
                    <div className="w-20 h-20 border border-dashed border-white rounded-full" />
                  </div>
                </div>

                <div className="relative z-10 space-y-4 font-mono text-xs">
                  {/* HUD Top Status Bar */}
                  <div className="flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/10 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-yellow shrink-0" />
                      <span className="text-white font-bold text-[11px] sm:text-xs">GAME: APEX LEGENDS</span>
                    </div>
                    <span className="text-neon-green text-[11px] sm:text-xs font-bold">LATENCY: 0.8ms</span>
                  </div>

                  {/* Tactical Assistant Prompt Box */}
                  <div className="glass-card p-3.5 sm:p-4 border-neon-green/40 bg-neon-green/[0.04]">
                    <div className="text-neon-green font-bold mb-1 flex items-center justify-between text-[11px]">
                      <span>TACTICAL ASSISTANT &gt;</span>
                      <span className="text-[9px] bg-neon-green/20 px-2 py-0.5 rounded text-white">AUTONOMOUS</span>
                    </div>
                    <p className="text-gray-200 leading-relaxed text-xs">
                      "Enemy squad approaching from Ring East. Recommending VRAM flush to preserve 1% low frame consistency."
                    </p>
                  </div>

                  {/* Real-time Analytics Graph Bar */}
                  <div className="glass-card p-3.5 sm:p-4 space-y-2">
                    <div className="flex justify-between text-gray-400 text-[10px] sm:text-[11px]">
                      <span>FPS STABILITY INDEX</span>
                      <span className="text-white font-bold">99.4% PERFECT</span>
                    </div>
                    <div className="flex items-end gap-1 sm:gap-1.5 h-12 pt-2">
                      {[60, 75, 80, 70, 90, 85, 95, 100, 98, 96, 99, 97, 100].map((h, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-neon-green/40 hover:bg-neon-green rounded-t transition-all" 
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

        </div>
      </motion.section>

      {/* ================= PERFORMANCE SECTION ================= */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl px-4 sm:px-6 mb-20 sm:mb-36 relative z-10"
      >
        <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black mb-4 sm:mb-6 font-display uppercase tracking-tight text-white">
            REPLACE THE <span className="text-neon-green glow-text-teal">BLOATWARE</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg leading-relaxed font-sans">
            Traditional game launchers hog hundreds of megabytes of RAM, track user telemetry, and slow down your PC. See how Mission Control stacks up.
          </p>
        </div>

        {/* Performance Comparison Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Bloated Launchers */}
          <div className="glass-card p-6 sm:p-8 border-red-500/20 bg-red-950/[0.05] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display">Standard Launchers</h3>
                <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mt-1">Electron & Chromium Wrappers</p>
              </div>
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase">Heavy Overhead</span>
            </div>

            <div className="space-y-5 sm:space-y-6">
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
                  <span className="text-red-400 font-bold">Active Mining</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-red-500 h-full w-[70%]" />
                </div>
              </div>

              <ul className="pt-4 border-t border-white/5 space-y-2.5 text-xs sm:text-sm text-gray-400 font-sans">
                <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Cloud dependency for game launch</li>
                <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Frequent intrusive web updates</li>
                <li className="flex items-center gap-2.5"><span className="text-red-500 font-bold shrink-0">✕</span> Micro-stutters during high CPU loads</li>
              </ul>
            </div>
          </div>

          {/* Mission Control Tactical System */}
          <div className="glass-card p-6 sm:p-8 border-neon-green/50 bg-neon-green/[0.03] relative overflow-hidden shadow-[0_0_40px_rgba(118, 185, 0,0.15)]">
            <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[9px] sm:text-[10px] font-mono font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-widest">
              OPTIMIZED ARCHITECTURE
            </div>

            <div className="flex items-center justify-between mb-6 sm:mb-8 mt-2 sm:mt-0">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display">Mission Control</h3>
                <p className="text-xs font-mono text-neon-green uppercase tracking-wider mt-1">Native C++ & PyTorch CUDA</p>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-6">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                  <span className="text-gray-300 font-medium">RAM Footprint</span>
                  <span className="text-neon-green font-bold glow-text-teal">45 MB</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-neon-green h-full w-[10%] shadow-[0_0_10px_rgba(118, 185, 0,0.8)]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2 font-mono">
                  <span className="text-gray-300 font-medium">Telemetry Privacy</span>
                  <span className="text-neon-green font-bold glow-text-teal">100% Local Sandbox</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-neon-green h-full w-[100%] shadow-[0_0_10px_rgba(118, 185, 0,0.8)]" />
                </div>
              </div>

              <ul className="pt-4 border-t border-white/10 space-y-2.5 text-xs sm:text-sm text-gray-200 font-sans">
                <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Zero Cloud Dependency (Local Models)</li>
                <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Instant OS startup in under 200ms</li>
                <li className="flex items-center gap-2.5"><span className="text-neon-green font-black shrink-0">✓</span> Automated PyTorch VRAM flushing</li>
              </ul>
            </div>
          </div>

        </div>
      </motion.section>

      {/* ================= DOWNLOAD & SYSTEM REQUIREMENTS ================= */}
      <section id="download" className="w-full max-w-5xl px-4 sm:px-6 mb-20 sm:mb-36 relative z-10 text-center">
        
        <div className="mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl font-black mb-3 sm:mb-4 font-display uppercase tracking-tight text-white">
            READY TO <span className="text-neon-green glow-text-teal">ENGAGE?</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base font-sans">Select your operating system deployment package below.</p>
        </div>

        {/* OS Download Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          
          {/* Windows Package */}
          <div className="glass-card p-6 sm:p-10 border-neon-green/40 hover:border-neon-green flex flex-col justify-between group text-left relative overflow-hidden shadow-[0_0_30px_rgba(118, 185, 0,0.15)]">
            <div className="absolute top-0 right-0 bg-neon-green/20 text-neon-green text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              RECOMMENDED BUILD
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1.5 font-display">Windows</h3>
              <p className="text-gray-400 text-xs sm:text-sm font-mono mb-6 sm:mb-8">Windows 10 / 11 64-bit (.exe)</p>
            </div>
            <a
              href={WINDOWS_INSTALLER_URL}
              className="w-full bg-neon-green text-obsidian px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-white hover:shadow-[0_0_25px_rgba(118, 185, 0,0.6)] transition-all duration-300 flex items-center justify-center gap-2 font-mono shadow-[0_0_15px_rgba(118, 185, 0,0.3)] text-center mb-4"
            >
              <Download className="w-4 h-4 shrink-0" /> Download for Windows
            </a>
            <div className="flex justify-center gap-4 text-xs font-mono">
              <a href={WINDOWS_MSI_URL} className="text-gray-400 hover:text-neon-green transition-colors flex items-center gap-1">
                <Download className="w-3 h-3" /> MSI Installer
              </a>
              <span className="text-gray-600">|</span>
              <a href={WINDOWS_ZIP_URL} className="text-gray-400 hover:text-neon-green transition-colors flex items-center gap-1">
                <Download className="w-3 h-3" /> Portable ZIP
              </a>
            </div>
          </div>

          {/* Linux Package */}
          <div className="glass-card p-6 sm:p-10 border-white/10 flex flex-col justify-between text-left relative overflow-hidden opacity-80">
            <div className="absolute top-0 right-0 bg-white/10 text-gray-400 text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              IN DEVELOPMENT
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1.5 font-display">Linux</h3>
              <p className="text-gray-400 text-xs sm:text-sm font-mono mb-6 sm:mb-8">AppImage / .deb Package</p>
            </div>
            <button className="w-full border border-white/10 bg-white/5 text-gray-500 px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-not-allowed font-mono">
              Under Active Development
            </button>
          </div>

        </div>

        {/* Hardware Specifications - Mobile Responsive Layout */}
        <div className="text-left w-full max-w-4xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 font-display border-b border-white/10 pb-4 uppercase tracking-wider text-white flex items-center gap-3">
            <Sliders className="w-5 h-5 text-neon-green shrink-0" />
            SYSTEM REQUIREMENTS
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="glass-card p-6 sm:p-8 border-white/10">
              <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-300 font-display">Minimum System Specs</h4>
              <ul className="space-y-3.5 text-xs sm:text-sm text-gray-400 font-mono">
                <li className="flex flex-col sm:flex-row sm:justify-between border-b border-white/5 pb-2.5 gap-1">
                  <span className="text-white font-bold">OS:</span> Windows 10 64-bit
                </li>
                <li className="flex flex-col sm:flex-row sm:justify-between border-b border-white/5 pb-2.5 gap-1">
                  <span className="text-white font-bold">GPU:</span> NVIDIA GTX 1060 (6GB VRAM)
                </li>
                <li className="flex flex-col sm:flex-row sm:justify-between border-b border-white/5 pb-2.5 gap-1">
                  <span className="text-white font-bold">RAM:</span> 16 GB System RAM
                </li>
                <li className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-white font-bold">Storage:</span> 4 GB NVMe / SSD
                </li>
              </ul>
            </div>

            <div className="glass-card p-6 sm:p-8 border-neon-green/40 bg-neon-green/[0.02] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[9px] sm:text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg uppercase">
                MAX PERFORMANCE
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-neon-green font-display">Recommended Specs</h4>
              <ul className="space-y-3.5 text-xs sm:text-sm text-gray-300 font-mono">
                <li className="flex flex-col sm:flex-row sm:justify-between border-b border-white/10 pb-2.5 gap-1">
                  <span className="text-white font-bold">OS:</span> Windows 11 64-bit
                </li>
                <li className="flex flex-col sm:flex-row sm:justify-between border-b border-white/10 pb-2.5 gap-1">
                  <span className="text-white font-bold">GPU:</span> NVIDIA RTX 2060+ (6GB+ VRAM)
                </li>
                <li className="flex flex-col sm:flex-row sm:justify-between border-b border-white/10 pb-2.5 gap-1">
                  <span className="text-white font-bold">RAM:</span> 32 GB High-Speed RAM
                </li>
                <li className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-white font-bold">Acceleration:</span> TensorRT Enabled
                </li>
              </ul>
            </div>
          </div>
        </div>

      </section>

      {/* ================= FAQ SECTION (ACCORDION) ================= */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl px-4 sm:px-6 mb-20 sm:mb-24 relative z-10"
      >
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-black mb-3 sm:mb-4 font-display uppercase tracking-wider text-white">
            FREQUENTLY ASKED <span className="text-neon-green glow-text-teal">QUESTIONS</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm font-sans">Everything you need to know about setup, anti-cheat safety, and local inference.</p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className={`glass-card transition-all duration-300 overflow-hidden ${isOpen ? "border-neon-green/50 bg-neon-green/[0.03]" : "hover:border-white/20"}`}
              >
                <button 
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                >
                  <span className={`font-bold text-sm sm:text-lg transition-colors leading-snug ${isOpen ? "text-neon-green" : "text-white"}`}>
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 bg-neon-green/20 border-neon-green/50 text-neon-green" : "text-gray-400"}`}>
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
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-gray-300 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-4 font-sans">
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

    </div>
  );
}
