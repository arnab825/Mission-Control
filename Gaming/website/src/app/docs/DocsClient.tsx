"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Cpu,
  Sliders,
  ArrowRight,
  Radio,
  Terminal,
  Search,
  Globe,
  Activity,
  KeyRound,
  Layers,
  GitBranch,
  Bot,
  ScrollText,
  Database,
  Lock,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";

import { DocData } from "@/lib/docs";

// ─── ENV Keys reference ───────────────────────────────────────────────────────

const ENV_KEYS = [
  {
    key: "NVIDIA_API_KEY",
    required: true,
    desc: "Cloud AI inference via NVIDIA NIM (Llama 3.1/3.2, VLM models)",
    link: "https://build.nvidia.com/",
    linkLabel: "build.nvidia.com",
  },
  {
    key: "RAWG_API_KEY",
    required: false,
    desc: "Game DB: ratings, genres, Metacritic, DLC — 20k req/month free",
    link: "https://rawg.io/apidocs",
    linkLabel: "rawg.io/apidocs",
  },
  {
    key: "TAVILY_API_KEY",
    required: false,
    desc: "AI-synthesized web search enrichment — 1k req/month free",
    link: "https://app.tavily.com",
    linkLabel: "app.tavily.com",
  },
  {
    key: "ELEVENLABS_API_KEY",
    required: false,
    desc: "Premium neural TTS voice synthesis (ElevenLabs)",
    link: "https://elevenlabs.io",
    linkLabel: "elevenlabs.io",
  },
];

// ─── Card Component ───────────────────────────────────────────────────────────

function DocCardView({ card, idx }: { card: DocData; idx: number }) {
  const readTime = useMemo(() => {
    const words = (card.content || card.excerpt || "").split(/\s+/).length;
    const mins = Math.max(1, Math.ceil(words / 180));
    return `${mins} min read`;
  }, [card]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay: idx * 0.04 }}
      className="h-full"
    >
      <Link
        href={`/docs/${card.slug}`}
        className="group flex flex-col justify-between h-full glass-card glass-card-hover border border-white/10 hover:border-neon-green/60 rounded-2xl p-4 sm:p-7 relative overflow-hidden transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.8)] hover:shadow-[0_0_35px_rgba(118,185,0,0.25)] backdrop-blur-2xl"
      >
        {/* Futuristic Cyber Laser Accent Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-neon-green via-neon-yellow to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 blur-2xl group-hover:bg-neon-green/15 transition-all pointer-events-none" />

        <div>
          {/* Header Row: Category Badge & Reading Time */}
          <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neon-green bg-neon-green/10 border border-neon-green/30 rounded-md px-2.5 py-0.5 shadow-[0_0_10px_rgba(118,185,0,0.15)]">
              {card.category || "DOCUMENTATION"}
            </span>
            <span className="text-[10px] font-mono text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              {readTime}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-xl font-bold font-display text-white mb-2.5 group-hover:text-neon-green transition-colors leading-snug line-clamp-2">
            {card.title}
          </h3>

          {/* Excerpt */}
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans line-clamp-3 mb-5">
            {card.excerpt}
          </p>
        </div>

        {/* Footer Action Bar */}
        <div className="pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-neon-green group-hover:text-white transition-colors gap-2">
          <span className="flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-neon-green animate-pulse shrink-0" />
            <span className="truncate">READ DOCS</span>
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green group-hover:bg-neon-green group-hover:text-obsidian group-hover:scale-110 transition-all shadow-[0_0_12px_rgba(118,185,0,0.2)] shrink-0">
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocsClient({ docs }: { docs: DocData[] }) {
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const DOC_SECTIONS = useMemo(() => {
    const categoriesMap: Record<string, DocData[]> = {};
    docs.forEach((doc) => {
      const cat = doc.category || "General";
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(doc);
    });

    const icons = [
      BookOpen,
      Terminal,
      Sliders,
      Cpu,
      Layers,
      Activity,
      Bot,
      Globe,
      ScrollText,
    ];
    let iconIdx = 0;

    return Object.keys(categoriesMap).map((category) => {
      const icon = icons[iconIdx % icons.length];
      iconIdx++;
      return {
        id: category.toLowerCase().replace(/\s+/g, "-"),
        icon,
        category: category.toUpperCase(),
        label: category,
        docs: categoriesMap[category],
      };
    });
  }, [docs]);

  const filtered = useMemo(() => {
    if (!query.trim()) return DOC_SECTIONS;
    const q = query.toLowerCase();

    return DOC_SECTIONS.map((section) => ({
      ...section,
      docs: section.docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.excerpt.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      ),
    })).filter((s) => s.docs.length > 0);
  }, [query, DOC_SECTIONS]);

  const totalDocsCount = useMemo(() => {
    return filtered.reduce((acc, section) => acc + section.docs.length, 0);
  }, [filtered]);

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-2 sm:px-4 relative z-10 font-sans">
      {/* Background ambience */}
      <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[350px] bg-neon-green/5 blur-[180px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-1.5 sm:gap-2 border border-neon-green/30 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 bg-neon-green/10 mb-4 sm:mb-6 backdrop-blur-md shadow-[0_0_20px_rgba(34,197,94,0.15)] max-w-full">
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neon-green animate-pulse shrink-0" />
          <span className="text-neon-green text-[9px] min-[360px]:text-xs font-bold font-mono tracking-wider sm:tracking-widest uppercase truncate max-w-[240px] min-[360px]:max-w-none">
            Mission Control Architecture & API Reference
          </span>
        </div>

        <h1 className="text-lg min-[340px]:text-xl min-[380px]:text-2xl sm:text-5xl lg:text-6xl font-black tracking-normal sm:tracking-tight text-white mb-3 sm:mb-4 font-display uppercase leading-tight break-words">
          DOCUMENTATION{" "}
          <span className="text-neon-green">
            PORTAL
          </span>
        </h1>
        <p className="text-xs sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed font-mono px-2">
          Complete technical reference, API integration guides, system telemetry setup,
          and NVIDIA NIM AI models for production deployments.
        </p>

        {/* Command Search Bar */}
        <div className="relative mt-5 sm:mt-8 max-w-xl mx-auto px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-green" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search documentation topics, APIs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-12 sm:pr-20 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#0c0d12]/90 border border-white/10 text-xs sm:text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green shadow-2xl transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-white transition-colors text-xs font-mono bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
              >
                Clear
              </button>
            ) : (
              <kbd
                onClick={() => {
                  searchInputRef.current?.focus();
                  searchInputRef.current?.select();
                }}
                className="hidden sm:inline-block px-2.5 py-1 text-[10px] font-mono font-bold text-gray-400 hover:text-neon-green bg-white/5 hover:bg-neon-green/10 border border-white/10 hover:border-neon-green/30 rounded-md cursor-pointer transition-all"
              >
                CTRL + K
              </kbd>
            )}
          </div>
        </div>
      </motion.div>

      {/* Results Indicator when searching */}
      {query && (
        <div className="mb-6 flex items-center justify-between text-xs font-mono text-gray-400 border-b border-white/10 pb-3">
          <span>
            Showing <strong className="text-neon-green">{totalDocsCount}</strong> matching document(s)
          </span>
          <button
            onClick={() => setQuery("")}
            className="text-neon-green hover:underline text-xs"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* ── Sections Grid ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 bg-[#0d0e12] border border-dashed border-white/10 rounded-2xl p-8"
          >
            <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-bold text-base font-mono mb-1">
              No Documentation Found
            </h3>
            <p className="text-gray-400 text-xs font-mono mb-4">
              No articles matched &ldquo;{query}&rdquo;.
            </p>
            <button
              onClick={() => setQuery("")}
              className="bg-neon-green text-black font-mono font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-400 transition"
            >
              Reset Search
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-12 sm:space-y-16"
          >
            {filtered.map((section, sIdx) => {
              const SectionIcon = section.icon;
              return (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  {/* Section Header */}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: sIdx * 0.03 }}
                    className="flex items-center justify-between mb-5 sm:mb-6 pb-3 sm:pb-4 border-b border-white/10"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                        <SectionIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="text-[9px] sm:text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest truncate">
                            {section.category}
                          </p>
                          <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 shrink-0">
                            {section.docs.length} articles
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold font-display text-white uppercase tracking-tight truncate">
                          {section.label}
                        </h2>
                      </div>
                    </div>
                  </motion.div>

                  {/* Doc Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.docs.map((card, cIdx) => (
                      <DocCardView key={card.slug} card={card} idx={cIdx} />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ── Environment / API Keys Reference Panel ───────────────── */}
            {!query && (
              <motion.section
                id="api-keys"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
                className="scroll-mt-24"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest">
                        ENVIRONMENT CONFIGURATION
                      </p>
                      <h2 className="text-xl font-bold font-display text-white uppercase">
                        API Keys & Environment Reference
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0c0d12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
                  {/* Code header bar */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-white/5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/60" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <span className="w-3 h-3 rounded-full bg-neon-green/60" />
                      </div>
                      <span className="text-gray-400 text-xs font-mono font-bold">
                        .env.local / settings.yaml
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neon-green uppercase tracking-wider">
                      UTF-8 Encoded
                    </span>
                  </div>

                  <div className="divide-y divide-white/5">
                    {ENV_KEYS.map((env) => (
                      <div
                        key={env.key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleCopy(env.key)}
                            className="font-mono text-sm font-bold text-neon-yellow hover:text-white transition-colors flex items-center gap-1.5 group/btn shrink-0"
                            title="Click to copy key name"
                          >
                            <span>{env.key}</span>
                            {copiedKey === env.key ? (
                              <Check className="w-3.5 h-3.5 text-neon-green" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-500 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            )}
                          </button>
                          <span className="text-xs text-gray-400 leading-relaxed font-sans">
                            {env.desc}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {env.required ? (
                            <span className="text-[10px] font-mono font-bold text-neon-green bg-neon-green/10 border border-neon-green/30 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                              Required
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                              Optional
                            </span>
                          )}
                          <a
                            href={env.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-gray-400 hover:text-neon-green transition-colors flex items-center gap-1 hover:underline"
                          >
                            <span>{env.linkLabel}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Copy snippet container */}
                  <div className="p-5 bg-black/40 border-t border-white/5">
                    <pre className="text-xs font-mono text-gray-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      <span className="text-gray-600"># Cloud AI Inference (NVIDIA NIM Llama 3.1 / 3.2)</span>{"\n"}
                      <span className="text-neon-yellow font-bold">NVIDIA_API_KEY</span>=<span className="text-neon-green">nvapi-xxxxxxxxxxxxxxxxxxxxxxxxx</span>{"\n\n"}
                      <span className="text-gray-600"># Game Knowledge Graph & Search Enrichment</span>{"\n"}
                      <span className="text-white/60">RAWG_API_KEY</span>=your_rawg_key{"\n"}
                      <span className="text-white/60">TAVILY_API_KEY</span>=tvly-xxxxxxxxxxxx
                    </pre>
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── Tech Stack Matrix Reference ─────────────────────────── */}
            {!query && (
              <motion.section
                id="tech-stack"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
                className="scroll-mt-24"
              >
                <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest">
                      SYSTEM SPECIFICATIONS
                    </p>
                    <h2 className="text-xl font-bold font-display text-white uppercase">
                      Architecture & Tech Stack Matrix
                    </h2>
                  </div>
                </div>

                <div className="bg-[#0c0d12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="py-4 px-6 font-display font-black text-white text-[10px] uppercase tracking-widest w-1/3">
                            Architecture Subsystem
                          </th>
                          <th className="py-4 px-6 font-display font-black text-white text-[10px] uppercase tracking-widest">
                            Engine & Technology Stack
                          </th>
                          <th className="py-4 px-6 font-display font-black text-white text-[10px] uppercase tracking-widest text-right">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          ["AI Computer Vision", "Pure TensorRT 10.x (YOLOv8 Engine)", "Active"],
                          ["Frame Screen Capture", "dxcam (DXGI 120fps+) / D3DShot / MSS fallback", "Active"],
                          ["Cloud LLM / Vision", "NVIDIA NIM — Llama 3.1 8B / 3.2 11B Vision", "Active"],
                          ["OCR Text Extraction", "RapidOCR / Tesseract (GPU/ONNX-accelerated)", "Active"],
                          ["Web Search Enrichment", "Wikipedia + SteamSpy + DuckDuckGo + RAWG.io", "Active"],
                          ["Voice STT Processing", "Google Cloud Speech / Sphinx (offline fallback)", "Active"],
                          ["Voice Speech Synthesis", "ElevenLabs / Google Cloud TTS / SAPI5", "Active"],
                          ["UI & Overlay Engine", "Electron + React (HUD) + PyQt6 (Desktop)", "Active"],
                          ["Telemetry & Hardware", "pynvml (NVML) + DirectX C++ FPS Engine", "Active"],
                          ["Hotkey Intercept", "pynput GlobalHotKeys + Win32 GetAsyncKeyState", "Active"],
                          ["Configuration", "PyYAML (settings.yaml) + dotenv (.env)", "Active"],
                          ["Security & Binding", "Motherboard UUID binding + AES-256 E2EE", "Active"],
                        ].map(([layer, tech, status], i) => (
                          <tr
                            key={i}
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-3.5 px-6 text-xs font-mono font-bold text-gray-300 uppercase tracking-wide">
                              {layer}
                            </td>
                            <td className="py-3.5 px-6 text-xs text-gray-400 font-sans">
                              {tech}
                            </td>
                            <td className="py-3.5 px-6 text-[10px] font-mono font-bold text-neon-green text-right">
                              <span className="inline-flex items-center gap-1.5 bg-neon-green/10 border border-neon-green/20 px-2.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                {status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── Footer CTA ───────────────────────────────────────────── */}
            {!query && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-[#0c0d12] border border-neon-green/20 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-neon-green/10 border border-neon-green/30 rounded-full px-4 py-1.5 mb-5">
                    <Lock className="w-3.5 h-3.5 text-neon-green" />
                    <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
                      Open Source Ecosystem
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black font-display text-white uppercase mb-3">
                    Something missing in documentation?
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto mb-8 font-sans">
                    Mission Control is completely open source. Contribute new documentation, propose features, or inspect the codebase on GitHub.
                  </p>
                  <a
                    href="https://github.com/arnab825/Mission-Control"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-neon-green text-black font-bold font-mono text-xs uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_25px_rgba(34,197,94,0.3)] hover:scale-[1.02]"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>View Repository on GitHub</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
