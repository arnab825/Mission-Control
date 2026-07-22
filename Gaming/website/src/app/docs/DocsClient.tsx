"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Cpu,
  Sliders,
  ArrowRight,
  Radio,
  Shield,
  Terminal,
  Zap,
  Search,
  Download,
  Globe,
  Activity,
  Mic,
  Eye,
  KeyRound,
  Layers,
  GitBranch,
  ChevronRight,
  Package,
  Settings,
  Bot,
  Gamepad2,
  FileCode2,
  ScrollText,
  Wifi,
  Database,
  Lock,
  BarChart2,
} from "lucide-react";

import { DocData } from "@/lib/docs";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  icon: React.ElementType;
  category: string;
  label: string;
  color: string;
  docs: DocData[];
}
// Dynamic sections will be computed below

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

// ─── Quick Links ──────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: "Installation", href: "#getting-started" },
  { label: "Configuration", href: "#configuration" },
  { label: "NIM / AI", href: "#nim-ai" },
  { label: "AI Weights", href: "/docs/on_demand_ai_weights" },
  { label: "HUD", href: "#hud-overlay" },
  { label: "Telemetry", href: "#telemetry" },
  { label: "Agentic AI", href: "#agentic-ai" },
  { label: "Web Search", href: "#web-search" },
  { label: "Changelog", href: "#changelog" },
];

// ─── Card Component ───────────────────────────────────────────────────────────

function DocCardView({ card, idx }: { card: DocData; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay: idx * 0.05 }}
    >
      <Link
        href={`/docs/${card.slug}`}
        className="group flex flex-col justify-between h-full glass-card glass-card-hover p-6 border border-white/10 rounded-xl relative overflow-hidden"
      >
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-neon-green/5 rounded-bl-full transition-all duration-300 group-hover:bg-neon-green/10" />

        <div>
          {card.badge && (
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-widest ${card.badgeColor || "text-neon-green"} bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 inline-block mb-3`}
            >
              {card.badge}
            </span>
          )}
          <h3 className="text-sm font-bold font-display text-white mb-2 group-hover:text-neon-green transition-colors leading-snug line-clamp-2">
            {card.title}
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-sans line-clamp-3">
            {card.excerpt}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-neon-green/70 group-hover:text-neon-green transition-colors">
          <span>Read docs</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocsClient({ docs }: { docs: DocData[] }) {
  const [query, setQuery] = useState("");

  const DOC_SECTIONS = useMemo(() => {
    const categoriesMap: Record<string, DocData[]> = {};
    docs.forEach(doc => {
      const cat = doc.category || "General";
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(doc);
    });

    const icons = [BookOpen, Terminal, Sliders, Cpu, Layers, Activity, Bot, Globe, ScrollText];
    let iconIdx = 0;

    return Object.keys(categoriesMap).map(category => {
      const icon = icons[iconIdx % icons.length];
      iconIdx++;
      return {
        id: category.toLowerCase().replace(/\s+/g, '-'),
        icon,
        category: category.toUpperCase(),
        label: category,
        color: "neon-green",
        docs: categoriesMap[category]
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
          d.title.toLowerCase().includes(q) || d.excerpt.toLowerCase().includes(q)
      ),
    })).filter((s) => s.docs.length > 0);
  }, [query, DOC_SECTIONS]);

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 relative z-10">

      {/* Background ambience */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-neon-green/8 blur-[160px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-5 backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
            Tactical Documentation · v1.4.8
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-5 font-display uppercase">
          MISSION CONTROL{" "}
          <span className="text-neon-green glow-text-teal">DOCS</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-mono">
          Complete technical reference for the Mission Control gaming AI
          platform — installation, API integration, architecture, and
          configuration for production deployments.
        </p>

        {/* Search */}
        <div className="relative mt-8 max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-neon-green/50 focus:bg-neon-green/5 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-xs font-mono"
            >
              clear
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Quick Links ───────────────────────────────────────────────────── */}
      {!query && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-14 flex flex-wrap gap-2 justify-center"
        >
          {QUICK_LINKS.map((ql) => (
            <a
              key={ql.href}
              href={ql.href}
              className="text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-white/10 text-gray-400 hover:text-neon-green hover:border-neon-green/40 hover:bg-neon-green/5 transition-all"
            >
              {ql.label}
            </a>
          ))}
        </motion.div>
      )}

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20 text-gray-500 font-mono text-sm"
          >
            No docs matched &ldquo;{query}&rdquo;
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-16"
          >
            {filtered.map((section, sIdx) => {
              const SectionIcon = section.icon;
              return (
                <section key={section.id} id={section.id}>
                  {/* Section Header */}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: sIdx * 0.03 }}
                    className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                      <SectionIcon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest">
                        {section.category}
                      </p>
                      <h2 className="text-xl font-bold font-display text-white uppercase">
                        {section.label}
                      </h2>
                    </div>
                  </motion.div>

                  {/* Doc Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {section.docs.map((card, cIdx) => (
                      <DocCardView key={card.slug} card={card} idx={cIdx} />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ── API Keys Reference Panel ─────────────────────────────── */}
            {!query && (
              <motion.section
                id="api-keys"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                  <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                    <KeyRound style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest">
                      ENVIRONMENT
                    </p>
                    <h2 className="text-xl font-bold font-display text-white uppercase">
                      API Keys Reference
                    </h2>
                  </div>
                </div>

                <div className="glass-card border border-white/10 rounded-2xl overflow-hidden">
                  {/* Code header bar */}
                  <div className="flex items-center gap-2 px-5 py-3 bg-white/5 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/60" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <span className="w-3 h-3 rounded-full bg-neon-green/60" />
                    </div>
                    <span className="text-gray-500 text-xs font-mono ml-2">
                      .env
                    </span>
                  </div>

                  <div className="divide-y divide-white/5">
                    {ENV_KEYS.map((env) => (
                      <div
                        key={env.key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-white/3 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-sm font-bold text-neon-yellow mt-0.5 shrink-0">
                            {env.key}
                          </span>
                          <span className="text-xs text-gray-400 leading-relaxed">
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
                            className="text-[10px] font-mono text-gray-500 hover:text-neon-green transition-colors underline underline-offset-2"
                          >
                            {env.linkLabel} ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Copy hint */}
                  <div className="px-5 py-4 bg-white/3 border-t border-white/5">
                    <pre className="text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
                      <span className="text-gray-600"># Required for cloud AI</span>
                      {"\n"}
                      <span className="text-neon-yellow">NVIDIA_API_KEY</span>
                      <span className="text-gray-400">=nvapi-xxxxx</span>
                      {"\n"}
                      <span className="text-gray-600"># Optional: enhanced search</span>
                      {"\n"}
                      <span className="text-white/40">RAWG_API_KEY</span>
                      <span className="text-gray-600">=your-key</span>
                      {"\n"}
                      <span className="text-white/40">TAVILY_API_KEY</span>
                      <span className="text-gray-600">=tvly-xxxxx</span>
                      {"\n"}
                      <span className="text-white/40">ELEVENLABS_API_KEY</span>
                      <span className="text-gray-600">=your-key</span>
                    </pre>
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── Tech Stack Table ─────────────────────────────────────── */}
            {!query && (
              <motion.section
                id="tech-stack"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                  <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                    <Database style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest">
                      REFERENCE
                    </p>
                    <h2 className="text-xl font-bold font-display text-white uppercase">
                      Tech Stack
                    </h2>
                  </div>
                </div>

                <div className="glass-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="py-3.5 px-5 font-display font-black text-white text-[10px] uppercase tracking-widest w-1/3">
                            Layer
                          </th>
                          <th className="py-3.5 px-5 font-display font-black text-white text-[10px] uppercase tracking-widest">
                            Technology
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          ["AI Vision", "Pure TensorRT 10.x (YOLOv8 Engine)"],
                          ["Screen Capture", "dxcam (DXGI 120fps+) / D3DShot / MSS fallback"],
                          ["Cloud AI", "NVIDIA NIM — Llama 3.1 8B / 3.2 11B Vision"],
                          ["Text Detection", "RapidOCR / Tesseract (GPU/ONNX-accelerated)"],
                          ["Web Search", "Wikipedia + SteamSpy + DuckDuckGo + RAWG.io"],
                          ["Voice STT", "Google Cloud Speech / Sphinx (offline)"],
                          ["Voice TTS", "ElevenLabs / Google Cloud TTS / SAPI5"],
                          ["UI / Overlay", "Electron + React (HUD) + PyQt6 (Desktop)"],
                          ["GPU Monitoring", "pynvml (NVML) + DirectX C++ FPS Engine"],
                          ["Hotkeys", "pynput GlobalHotKeys + Win32 GetAsyncKeyState"],
                          ["Config", "PyYAML (settings.yaml) + dotenv (.env)"],
                          ["Security", "Motherboard UUID binding + AES-256 E2EE"],
                        ].map(([layer, tech], i) => (
                          <tr
                            key={i}
                            className="hover:bg-neon-green/3 transition-colors"
                          >
                            <td className="py-3 px-5 text-xs font-mono font-bold text-gray-400 uppercase tracking-wide">
                              {layer}
                            </td>
                            <td className="py-3 px-5 text-xs text-gray-300 font-sans">
                              {tech}
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
                className="glass-card border border-neon-green/20 rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-neon-green/10 border border-neon-green/30 rounded-full px-4 py-1.5 mb-5">
                    <Lock className="w-3.5 h-3.5 text-neon-green" />
                    <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
                      Open Source
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black font-display text-white uppercase mb-3">
                    Something missing?
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto mb-6 font-sans">
                    Mission Control is open source. Browse the full codebase,
                    submit issues, or contribute new documentation on GitHub.
                  </p>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-neon-green text-obsidian font-bold font-mono text-sm uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-neon-yellow transition-colors"
                  >
                    <GitBranch className="w-4 h-4" />
                    View on GitHub
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
