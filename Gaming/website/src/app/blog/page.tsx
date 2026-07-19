import fs from "fs";
import path from "path";
import Link from "next/link";
import React, { Suspense } from "react";
import { getSortedPostsData, formatDateToIST, parseBlogDate } from "@/lib/blog";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { Calendar, ArrowUpRight, Zap, Clock, Gamepad2, Bot, Radio, ChevronDown } from "lucide-react";

const CATEGORY_CONFIG: Record<string, { color: string; activeBg: string; shadow: string; icon: string; hoverBorder: string }> = {
  "Game News": { color: "text-neon-green", activeBg: "bg-neon-green text-obsidian border-neon-green", shadow: "shadow-[0_0_15px_rgba(118,185,0,0.4)]", icon: "🎮", hoverBorder: "hover:border-neon-green/40 shadow-[0_0_25px_rgba(118,185,0,0.1)]" },
  "GPU News": { color: "text-neon-purple", activeBg: "bg-neon-purple text-white border-neon-purple", shadow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]", icon: "⚡", hoverBorder: "hover:border-neon-purple/40" },
  "Game Revisit": { color: "text-amber-400", activeBg: "bg-amber-400 text-obsidian border-amber-400", shadow: "shadow-[0_0_15px_rgba(251,191,36,0.4)]", icon: "🕹️", hoverBorder: "hover:border-amber-400/40" },
  "Hardware Deep-Dive": { color: "text-blue-400", activeBg: "bg-blue-500 text-white border-blue-500", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]", icon: "🔧", hoverBorder: "hover:border-blue-400/40" },
};

const GAMING_CATEGORIES = ["Game News", "GPU News", "Game Revisit", "Hardware Deep-Dive"] as const;

export default async function BlogListing({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const currentTab =
    resolvedParams?.tab === "logs"
      ? "logs"
      : "intel";
  const activeCategory = resolvedParams?.category ?? "all";

  interface ChangelogLog {
    version: string;
    date: string;
    title: string;
    highlights?: string[];
  }

  // Changelog (local version.json)
  const versionFile = path.join(process.cwd(), "../backend/version.json");
  let logs: ChangelogLog[] = [];
  try {
    const rawData = fs.readFileSync(versionFile, "utf-8");
    const data = JSON.parse(rawData);
    const allLogs = (data.changelog || []) as ChangelogLog[];
    const now = new Date();
    logs = allLogs.filter((log) => new Date(log.date) <= now);
  } catch { }

  // Get all local MDX posts
  const allMdxPosts = getSortedPostsData();

  // Local gaming posts (MDX) are fetched synchronously and don't block
  const localGamingPosts = allMdxPosts.filter(
    (p) => p.category && p.category !== "Mission Brief"
  ).map((p) => ({
    _id: p.id,
    title: p.title,
    slug: { current: p.id },
    category: p.category,
    excerpt: p.excerpt,
    tags: p.tags,
    author: p.author,
    aiGenerated: p.aiGenerated,
    publishedAt: p.date,
    coverImage: p.coverImage,
  }));

  return (
    <div className="min-h-screen pt-28 pb-24 px-4 sm:px-6 max-w-6xl mx-auto w-full relative z-10 bg-[#0a0a0c]">

      {/* Cyber Grid & Ambient Radial Glows */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-green/10 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* Header */}
      <div className="text-left mb-12 max-w-3xl">
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
            TELEMETRY DISPATCH & INTEL
          </span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight mb-4 uppercase text-white">
          MISSION CONTROL <span className="text-neon-green glow-text-teal">INTELLIGENCE</span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed font-mono">
          Stay up to date with core engine optimizations, hardware firmware patches, GPU news, and game telemetry intelligence.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 mb-10 border-b border-white/10 pb-4">
        <Link
          href="/blog?tab=intel"
          className={`px-3 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-bold transition-all duration-300 border flex items-center justify-center gap-2 ${
            currentTab === "intel"
              ? "bg-amber-400 text-obsidian border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
              : "bg-white/[0.03] border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden min-[360px]:inline">Gaming Intel</span>
          <span className="min-[360px]:hidden">Intel</span>
        </Link>
        <Link
          href="/blog?tab=logs"
          className={`px-3 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-bold transition-all duration-300 border flex items-center justify-center gap-2 ${
            currentTab === "logs"
              ? "bg-white text-obsidian border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              : "bg-white/[0.03] border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden min-[360px]:inline">Transmission Logs</span>
          <span className="min-[360px]:hidden">Logs</span>
        </Link>
      </div>

      {/* ── Gaming Intel (MongoDB + MDX) ── */}
      {currentTab === "intel" && (
        <Suspense fallback={
          <div className="py-20 flex flex-col items-center justify-center gap-4 border border-white/5 bg-white/[0.01] rounded-2xl">
            <Radio className="w-8 h-8 text-amber-400 animate-pulse" />
            <p className="text-amber-400 font-mono text-xs uppercase tracking-widest animate-pulse">Establishing Secure Connection to Intelligence Database...</p>
          </div>
        }>
          <GamingIntelData activeCategory={activeCategory} localGamingPosts={localGamingPosts} />
        </Suspense>
      )}

      {/* ── Transmission Logs (version.json) ── */}
      {currentTab === "logs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {logs.map((post, idx) => (
            <Link href={`/blog/${post.version}`} key={`${post.version}-${idx}`} className="block group">
              <article className="glass-card glass-card-hover p-5 sm:p-8 border border-white/10 rounded-2xl relative overflow-hidden h-full flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  <div className="flex items-center gap-4 text-xs font-mono text-white mb-4 uppercase tracking-widest flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {formatDateToIST(post.date)}
                    </span>
                    <span className="flex items-center gap-1.5 text-neon-green">
                      <Zap className="w-3.5 h-3.5" /> Kernel Release
                    </span>
                  </div>
                  <h2 className="text-lg min-[375px]:text-xl sm:text-2xl font-bold mb-3 text-white group-hover:text-neon-green transition-colors font-display line-clamp-2">
                    v{post.version} - {post.title}
                  </h2>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-3 font-sans">
                    {post.highlights?.[0] ?? "Check out the latest patch notes and agent fixes."}
                  </p>
                </div>
                <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between pt-4 border-t border-white/5 mt-auto gap-3 text-xs">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                    <div className="w-6 h-6 rounded-full bg-obsidian border border-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                      v{post.version}
                    </div>
                    <span>Mission Control Core Engine</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1 uppercase tracking-wider group-hover:translate-x-1 transition-transform self-end min-[380px]:self-auto shrink-0">
                    View Release Logs <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
          {logs.length === 0 && (
            <p className="text-gray-500 font-mono italic py-8">No transmission logs recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

interface DBPost {
  _id: { toString(): string };
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  tags?: string[];
  author?: string;
  aiGenerated?: boolean;
  publishedAt: Date;
  coverImage?: string;
}

async function GamingIntelData({ activeCategory, localGamingPosts }: { activeCategory: string, localGamingPosts: any[] }) {
  // Fetch from MongoDB (with graceful fallback for unwhitelisted IPs)
  let dbPosts: DBPost[] = [];
  try {
    await connectDB();
    const query: any = { publishedAt: { $lte: new Date() } };
    if (activeCategory !== "all") {
      query.category = activeCategory;
    }
    dbPosts = (await GamingPost.find(query).sort({ publishedAt: -1 }).lean()) as unknown as DBPost[];
  } catch (error) {
    console.warn("MongoDB Connection Error: IP not whitelisted. Falling back to local posts.");
  }

  const mappedDbPosts = dbPosts.map((p) => ({
    _id: p._id?.toString() || Math.random().toString(),
    title: p.title || 'Untitled Intel',
    slug: { current: p.slug || 'unknown-slug' },
    category: p.category || 'Mission Brief',
    excerpt: p.excerpt || '',
    tags: p.tags || [],
    author: p.author || 'Mission Control',
    aiGenerated: p.aiGenerated || false,
    publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : new Date().toISOString(),
    coverImage: p.coverImage,
  }));

  // Filter local posts by activeCategory if selected
  const filteredLocalGaming = activeCategory !== "all"
    ? localGamingPosts.filter((p) => p.category === activeCategory)
    : localGamingPosts;

  // Combine and deduplicate by slug/id to prevent double rendering
  const seenSlugs = new Set<string>();
  const combined = [...mappedDbPosts, ...filteredLocalGaming];
  const gamingPosts = [];

  for (const post of combined) {
    const slug = post.slug?.current || post._id;
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      gamingPosts.push(post);
    }
  }

  // Sort by date descending using parseBlogDate
  gamingPosts.sort(
    (a, b) => parseBlogDate(b.publishedAt).getTime() - parseBlogDate(a.publishedAt).getTime()
  );

  const getCategoryCount = (catName: string) => {
    if (catName === "all") {
      const seen = new Set();
      return [...mappedDbPosts, ...localGamingPosts].filter(p => {
        const slug = p.slug?.current || p._id;
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      }).length;
    }
    const seen = new Set();
    return [...mappedDbPosts, ...localGamingPosts]
      .filter(p => p.category === catName)
      .filter(p => {
        const slug = p.slug?.current || p._id;
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      }).length;
  };

  const activeCategoryConfig = activeCategory !== "all" 
    ? CATEGORY_CONFIG[activeCategory] 
    : { color: "text-amber-400", icon: "📰" };

  return (
    <div>
      {/* Category filter pills - Mobile Accordion */}
      <details className="group sm:hidden mb-8 border border-white/10 rounded-xl bg-white/[0.02]">
        <summary className="flex items-center justify-between p-4 text-xs font-mono font-bold text-gray-300 cursor-pointer select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-white/10 transition-all duration-300 hover:border-amber-400/30">
          <span className="flex items-center gap-2">
            <span className={activeCategoryConfig.color}>{activeCategoryConfig.icon}</span>
            Active Filter: <span className={`${activeCategoryConfig.color} uppercase font-bold`}>{activeCategory === "all" ? "All Intel" : activeCategory}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="p-3 flex flex-col gap-2 bg-obsidian/95 rounded-b-xl">
          <Link
            href="/blog?tab=intel&category=all"
            className={`flex items-center justify-between p-3 rounded-lg text-xs font-mono font-bold border transition-all text-left ${
              activeCategory === "all"
                ? "bg-amber-400 text-obsidian border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                : "border-white/5 text-gray-400 hover:text-white bg-white/[0.01]"
            }`}
          >
            <span>📰 All Intel</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold ${
              activeCategory === "all" ? "bg-black/20 text-current" : "bg-white/5 text-gray-400"
            }`}>
              {getCategoryCount("all")}
            </span>
          </Link>
          {GAMING_CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <Link
                key={cat}
                href={`/blog?tab=intel&category=${encodeURIComponent(cat)}`}
                className={`flex items-center justify-between p-3 rounded-lg text-xs font-mono font-bold border transition-all text-left ${
                  activeCategory === cat
                    ? `${cfg.activeBg} ${cfg.shadow}`
                    : "border-white/5 text-gray-400 hover:text-white bg-white/[0.01]"
                }`}
              >
                <span>{cfg.icon} {cat}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold ${
                  activeCategory === cat ? "bg-black/20 text-current" : "bg-white/5 text-gray-400"
                }`}>
                  {getCategoryCount(cat)}
                </span>
              </Link>
            );
          })}
        </div>
      </details>

      {/* Category filter pills - Desktop Horizontal List */}
      <div className="hidden sm:block relative w-full mb-8">
        <div className="flex items-center gap-2 sm:flex-wrap">
          <Link
            href="/blog?tab=intel&category=all"
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 ${
              activeCategory === "all"
                ? "bg-amber-400 text-obsidian border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white bg-white/[0.02]"
            }`}
          >
            <span>All Intel</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold ${
              activeCategory === "all" ? "bg-black/20 text-current" : "bg-white/5 text-gray-400"
            }`}>
              {getCategoryCount("all")}
            </span>
          </Link>
          {GAMING_CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <Link
                key={cat}
                href={`/blog?tab=intel&category=${encodeURIComponent(cat)}`}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? `${cfg.activeBg} ${cfg.shadow}`
                    : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white bg-white/[0.02]"
                }`}
              >
                <span>{cfg.icon} {cat}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold ${
                  activeCategory === cat ? "bg-black/20 text-current" : "bg-white/5 text-gray-400"
                }`}>
                  {getCategoryCount(cat)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gamingPosts.map((post) => {
          const cfg = (post.category ? CATEGORY_CONFIG[post.category as keyof typeof CATEGORY_CONFIG] : null) ?? {
            color: "text-neon-green",
            icon: "📰",
            hoverBorder: "hover:border-neon-green/40",
          };
          const slug = post.slug?.current ?? post._id;
          const date = post.publishedAt ?? "";

          return (
            <Link href={`/blog/gaming/${slug}`} key={post._id} className="block group">
              <article
                className={`glass-card glass-card-hover border border-white/10 ${cfg.hoverBorder} rounded-2xl relative overflow-hidden h-full flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {post.coverImage ? (
                  <div className="w-full h-48 overflow-hidden relative border-b border-white/10">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : null}

                <div className="p-5 sm:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-md border bg-white/5 ${cfg.color} border-current/20`}
                      >
                        {cfg.icon} {post.category}
                      </span>
                      {post.aiGenerated && (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-md border border-violet-500/30 text-violet-400 bg-violet-500/10 flex items-center gap-1">
                          <Bot className="w-3 h-3" /> AI PIPELINE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-400 mb-3 uppercase tracking-widest flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {formatDateToIST(date)}
                      </span>
                    </div>
                    <h2
                      className="text-lg min-[375px]:text-xl sm:text-2xl font-bold mb-3 text-white group-hover:text-amber-400 transition-colors font-display line-clamp-2"
                    >
                      {post.title}
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-3 font-sans">
                      {post.excerpt}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags.slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between pt-4 border-t border-white/5 mt-auto gap-3 text-xs">
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                      <div className="w-6 h-6 rounded-full bg-obsidian border border-amber-400/40 flex items-center justify-center text-amber-400 text-[10px] font-bold">
                        AI
                      </div>
                      <span>{post.author ?? "Mission Control Neural Brief"}</span>
                    </div>
                    <span
                      className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider group-hover:translate-x-1 transition-transform self-end min-[380px]:self-auto shrink-0"
                    >
                      Read Intel <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
        {gamingPosts.length === 0 && (
          <div className="col-span-2 py-16 text-center glass-card rounded-2xl">
            <p className="text-gray-400 font-mono italic">No gaming intel dispatches logged.</p>
            <p className="text-gray-500 text-xs font-mono mt-2">
              Telemetry feed models update automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
