"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Cpu,
  BookOpen,
  Newspaper,
  Mail,
  Download,
  Shield,
  Search as SearchIcon,
  X,
  Users,
  ChevronDown,
  ChevronRight,
  Zap,
  Tv,
  Activity,
  Terminal,
  Settings,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Send,
  TrendingUp,
  Database,
  Menu,
  Gamepad2,
  FileText,
  Star,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WINDOWS_INSTALLER_URL, LINUX_INSTALLER_URL, AUTO_DOWNLOAD_URL } from "@/lib/download";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedMobileSub, setExpandedMobileSub] = useState<string | null>(null);

  type OS = "windows" | "linux" | "mac" | "other" | null;
  const [os, setOs] = useState<OS>(null);

  const closeSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchFocused(false);
    setShowAllResults(false);
    setIsMobileSearchOpen(false);
  };

  // Scroll listener & OS detection
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // OS Detection
    const ua = (
      (typeof window !== "undefined" && (window.navigator.userAgent || window.navigator.platform)) || ""
    ).toLowerCase();
    if (ua.includes("win")) setOs("windows");
    else if (ua.includes("linux") || ua.includes("x11")) setOs("linux");
    else if (ua.includes("mac")) setOs("mac");
    else setOs("other");

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scrolling when mobile menu or mobile search is open to eliminate jitter & touch rubber-banding
  useEffect(() => {
    if (isOpen || isMobileSearchOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("mc-mobile-nav-toggle", { detail: { open: true } }));
    } else {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("mc-mobile-nav-toggle", { detail: { open: false } }));
    }
    return () => {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("mc-mobile-nav-toggle", { detail: { open: false } }));
    };
  }, [isOpen, isMobileSearchOpen]);

  // Close mobile drawer and search on route change
  useEffect(() => {
    setIsOpen(false);
    closeSearch();
  }, [pathname]);

  // Global Ctrl + K / Cmd + K Shortcut handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K" || e.code === "KeyK";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        if (pathname === "/docs") {
          window.dispatchEvent(new CustomEvent("trigger-docs-search"));
        } else {
          desktopSearchRef.current?.focus();
          desktopSearchRef.current?.select();
          setIsSearchFocused(true);
        }
      } else if (e.key === "Escape") {
        closeSearch();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
  }, [pathname]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setShowAllResults(false);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Search query failed", err);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/blog?search=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    } else if (e.key === "Escape") {
      closeSearch();
    }
  };

  const navLinks = [
    {
      name: "Architecture",
      href: "/architecture",
      icon: Cpu,
      subLinks: [
        { name: "NIM Core Integration", href: "/architecture#nim-core", icon: Zap },
        { name: "DirectX Presentation", href: "/architecture#directx-presentation", icon: Tv },
        { name: "Hardware Diagnostics", href: "/architecture#parallel-hardware", icon: Activity },
        { name: "Process Watcher Thread", href: "/architecture#process-watcher", icon: Terminal },
      ]
    },
    {
      name: "Docs",
      href: "/docs",
      icon: BookOpen,
      subLinks: [
        { name: "Project Summary", href: "/docs/summary", icon: BookOpen },
        { name: "System Architecture", href: "/docs/design", icon: Cpu },
        { name: "Agentic AI Controller", href: "/docs/agentic_logic", icon: Terminal },
        { name: "NVIDIA NIM Guide", href: "/docs/nvidia_ai_guide", icon: Zap },
        { name: "FPS & VRAM Optimization", href: "/docs/fps", icon: Activity },
        { name: "On-Demand AI Weights", href: "/docs/on_demand_ai_weights", icon: ShieldCheck },
      ]
    },
    {
      name: "Community",
      href: "/community",
      icon: Users,
      subLinks: [
        { name: "Community Game Reviews", href: "/community?tab=ratings", icon: Star },
        { name: "Share Review & Rig Setup", href: "/community?tab=ratings&rate=true", icon: Sparkles },
        { name: "Kernel Glitch Tracker", href: "/community?tab=glitches", icon: AlertTriangle },
        { name: "Submit Telemetry Report", href: "/community?tab=glitches&report=true", icon: Send },
      ]
    },
  ];

  const moreLinks = [
    { name: "Games Tested", href: "/games-tested", icon: Gamepad2 },
    { name: "Blog Intelligence", href: "/blog", icon: Newspaper },
    { name: "Contact Support", href: "/contact", icon: Mail },
  ];

  const mobileNavLinks = [...navLinks, ...moreLinks];

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full h-20 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-obsidian/95 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
            : "bg-obsidian/85 backdrop-blur-md border-b border-white/8"
        }`}
      >
        {/* Luminous Cybernetic Gradient Line along Navbar bottom */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-neon-green/40 to-transparent pointer-events-none shadow-[0_0_12px_rgba(118,185,0,0.3)]" />

        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between relative">

          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-neon-green/40 flex items-center justify-center bg-linear-to-br from-neon-green/20 via-neon-green/10 to-transparent group-hover:border-neon-green group-hover:shadow-[0_0_25px_rgba(118,185,0,0.6)] shadow-[0_0_12px_rgba(118,185,0,0.25)] transition-all duration-300 overflow-hidden p-1.5 shrink-0">
              <img src="/logo.png" alt="Mission Control" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm min-[375px]:text-base sm:text-xl font-black font-display tracking-wider text-white group-hover:text-neon-green transition-colors duration-300 whitespace-nowrap">
              MISSION <span className="text-neon-green drop-shadow-[0_0_10px_rgba(118,185,0,0.6)]">CONTROL</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 shrink-0">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <div key={link.name} className="relative group">
                  <Link
                    href={link.href}
                    className={`relative font-mono text-xs tracking-wider uppercase transition-colors duration-300 py-2 flex items-center gap-1.5 whitespace-nowrap ${
                      isActive ? "text-neon-green font-bold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-neon-green/70 group-hover:text-neon-green transition-colors" />
                    <span>{link.name}</span>
                    <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-white transition-transform duration-300 group-hover:rotate-180" />
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-neon-green shadow-[0_0_8px_rgba(118,185,0,0.8)] rounded transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"}`} />
                  </Link>

                  <div className="absolute top-full left-0 pt-2 w-56 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 origin-top-left z-50">
                    <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-2 space-y-1 shadow-2xl">
                      {link.subLinks.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-mono tracking-wider uppercase text-gray-400 hover:text-neon-green hover:bg-white/4 transition-all text-left"
                          >
                            <SubIcon className="w-3.5 h-3.5 text-neon-green/80 shrink-0" />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* More Links Dropdown */}
            <div className="relative group">
              <button className="font-mono text-xs tracking-wider uppercase transition-colors duration-300 py-2 flex items-center gap-1.5 text-gray-400 hover:text-white cursor-pointer focus:outline-none whitespace-nowrap">
                <span>More Intel</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform duration-300 group-hover:rotate-180 shrink-0" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-48 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 origin-top-left z-50">
                <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-2 shadow-2xl space-y-1">
                  {moreLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-mono tracking-wider uppercase transition-all ${
                          isActive ? "bg-neon-green/10 text-neon-green font-bold" : "text-gray-400 hover:text-white hover:bg-white/4"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-neon-green/80" />
                        {link.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar - Desktop Layout */}
          <div className="hidden md:block relative max-w-52.5 xl:max-w-65 w-full mx-4 z-10">
            <div className="relative flex items-center">
              <input
                ref={desktopSearchRef}
                type="text"
                placeholder="Search docs/blog..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                className="w-full bg-obsidian/90 border border-white/15 hover:border-neon-green/50 focus:border-neon-green rounded-xl pl-9 pr-14 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:shadow-[0_0_15px_rgba(118,185,0,0.3)] transition-all"
              />
              <SearchIcon className="w-3.5 h-3.5 text-neon-green absolute left-3 pointer-events-none" />
              <div className="absolute right-2.5 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      closeSearch();
                    }}
                    onClick={closeSearch}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    aria-label="Close Search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd
                    onClick={() => {
                      desktopSearchRef.current?.focus();
                      setIsSearchFocused(true);
                    }}
                    className="text-[9px] font-mono font-bold text-gray-400 bg-white/5 hover:bg-neon-green/10 border border-white/10 hover:border-neon-green/30 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                  >
                    CTRL+K
                  </kbd>
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-11 left-0 w-80 sm:w-96 bg-[#0d0e12]/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-2.5 z-50 max-h-96 overflow-y-auto shadow-2xl space-y-2">
                {searchResults.length > 0 ? (
                  <>
                    <div className="text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest px-3 py-1.5 border-b border-white/10 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <SearchIcon className="w-3 h-3 text-neon-green" /> Search Results
                      </span>
                      <span className="text-gray-500">{searchResults.length} matches</span>
                    </div>
                    {(showAllResults ? searchResults : searchResults.slice(0, 6)).map((res: any, idx: number) => {
                      const c = ((res.category || res.type || "") as string).toLowerCase();
                      const Icon = c.includes("arch") || c.includes("engine") || c.includes("hardware")
                        ? Cpu
                        : c.includes("doc") || c.includes("guide") || c.includes("api")
                        ? BookOpen
                        : c.includes("game") || c.includes("benchmark")
                        ? Gamepad2
                        : c.includes("blog") || c.includes("news") || c.includes("intel")
                        ? Newspaper
                        : c.includes("comm") || c.includes("review") || c.includes("operator")
                        ? Users
                        : c.includes("perf") || c.includes("dlss") || c.includes("fps")
                        ? Zap
                        : Sparkles;

                      return (
                        <Link
                          key={idx}
                          href={res.url}
                          onClick={closeSearch}
                          className="block p-2.5 hover:bg-white/5 rounded-xl transition-all text-left font-mono border-b border-white/5 last:border-0 group/res hover:border-neon-green/30"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[9px] font-bold text-neon-green uppercase tracking-wider bg-neon-green/10 border border-neon-green/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                              <Icon className="w-3 h-3 text-neon-green shrink-0" />
                              <span>{res.category || res.type}</span>
                            </span>
                            <ArrowRight className="w-3 h-3 text-gray-600 group-hover/res:text-neon-green transition-colors shrink-0" />
                          </div>
                          <div className="text-xs font-bold text-white group-hover/res:text-neon-green transition-colors truncate">{res.title}</div>
                          <div className="text-[11px] text-gray-400 truncate mt-0.5">{res.description}</div>
                        </Link>
                      );
                    })}
                    {searchResults.length > 6 && !showAllResults && (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowAllResults(true);
                        }}
                        className="w-full text-center py-2.5 mt-1 text-[10px] font-mono font-bold text-neon-green hover:text-white hover:bg-neon-green/15 border border-neon-green/30 rounded-xl transition-all cursor-pointer uppercase tracking-widest"
                      >
                        Show All ({searchResults.length} results)
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-2 space-y-2 font-mono">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-neon-green" /> Suggested Searches
                      </span>
                      <span className="text-[9px] text-neon-green flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" /> Live Index
                      </span>
                    </div>
                    <div className="space-y-1 pt-1">
                      {[
                        { title: "DirectX 12 Overlay Swapchain", category: "Architecture", icon: Cpu, href: "/architecture#directx-presentation" },
                        { title: "NVIDIA DLSS Frame Generation", category: "Docs", icon: Zap, href: "/docs/nvidia_ai_guide" },
                        { title: "Project Summary & Roadmap", category: "Docs", icon: BookOpen, href: "/docs/summary" },
                        { title: "Parallel Hardware Diagnostics", category: "Architecture", icon: Activity, href: "/architecture#parallel-hardware" },
                        { title: "Tested Games & Telemetry", category: "Benchmarks", icon: Gamepad2, href: "/games-tested" },
                        { title: "AI Intelligence Dispatch", category: "News", icon: Newspaper, href: "/blog" },
                      ].map((s, idx) => {
                        const Icon = s.icon;
                        return (
                          <Link
                            key={idx}
                            href={s.href}
                            onClick={closeSearch}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/8 text-xs text-gray-300 hover:text-white text-left transition-all cursor-pointer group/item border border-transparent hover:border-white/10"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="w-6 h-6 rounded-lg bg-white/5 group-hover/item:bg-neon-green/10 border border-white/10 group-hover/item:border-neon-green/30 flex items-center justify-center text-gray-400 group-hover/item:text-neon-green shrink-0 transition-colors">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="truncate group-hover/item:text-neon-green transition-colors font-sans text-xs text-gray-200">
                                {s.title}
                              </span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 group-hover/item:bg-neon-green/15 border border-white/10 group-hover/item:border-neon-green/30 text-gray-400 group-hover/item:text-neon-green font-mono shrink-0 transition-colors uppercase tracking-wider">
                              {s.category}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Button & Mobile Controls */}
          <div className="flex items-center gap-2 sm:gap-3 z-10 shrink-0">
            <div className="hidden lg:block">
              {os === "mac" || os === "other" ? (
                <div
                  className="relative inline-flex items-center justify-center px-3.5 py-2 font-mono text-[10px] font-bold tracking-wider uppercase border border-white/20 text-gray-400 rounded-xl bg-white/5 cursor-not-allowed text-center leading-tight whitespace-nowrap"
                >
                  OS Unsupported
                </div>
              ) : (
                <a
                  href={os === "linux" ? LINUX_INSTALLER_URL : (os === "windows" ? WINDOWS_INSTALLER_URL : AUTO_DOWNLOAD_URL)}
                  suppressHydrationWarning
                  className="relative inline-flex items-center justify-center px-5 py-2.5 font-mono text-xs font-black tracking-wider uppercase btn-premium-primary transition-all duration-300 gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-[0_0_30px_rgba(118,185,0,0.45)] group"
                >
                  <Download className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-y-0.5" />
                  <span>DOWNLOAD</span>
                </a>
              )}
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => {
                const nextState = !isMobileSearchOpen;
                setIsMobileSearchOpen(nextState);
                if (nextState) {
                  setIsOpen(false);
                  setTimeout(() => mobileSearchRef.current?.focus(), 150);
                }
              }}
              className="md:hidden p-2.5 text-gray-300 hover:text-neon-green active:scale-95 focus:outline-none transition-all rounded-xl bg-white/4 border border-white/10 touch-manipulation cursor-pointer"
              aria-label="Toggle Mobile Search"
            >
              <SearchIcon className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => {
                const nextState = !isOpen;
                setIsOpen(nextState);
                if (nextState) setIsMobileSearchOpen(false);
              }}
              className="lg:hidden p-2.5 text-gray-300 hover:text-neon-green active:scale-95 focus:outline-none transition-all rounded-xl bg-white/4 border border-white/10 touch-manipulation cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? (
                <X className="w-6 h-6 text-neon-green" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Full-Width Mobile Search Overlay */}
          <AnimatePresence>
            {isMobileSearchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-obsidian z-30 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 border-b border-neon-green/40 shadow-2xl"
              >
                <SearchIcon className="w-5 h-5 text-neon-green shrink-0" />
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={mobileSearchRef}
                    type="text"
                    placeholder="Search docs, features, intel..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full bg-transparent border-none text-white focus:outline-none placeholder-gray-500 py-2 text-xs sm:text-sm font-mono pr-7"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-1 text-gray-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={closeSearch}
                  className="p-2 text-gray-400 hover:text-neon-green transition-colors cursor-pointer"
                  aria-label="Close search overlay"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Mobile Search Results Popover */}
                {searchResults.length > 0 && (
                  <div className="absolute top-20 left-0 right-0 bg-[#0d0e12]/98 backdrop-blur-xl border-b border-white/10 max-h-[calc(100dvh-5rem)] overflow-y-auto p-4 space-y-2.5 shadow-2xl z-40 font-mono overscroll-contain">
                    {searchResults.map((res: any, idx: number) => {
                      const c = ((res.category || res.type || "") as string).toLowerCase();
                      const Icon = c.includes("arch") || c.includes("engine") || c.includes("hardware")
                        ? Cpu
                        : c.includes("doc") || c.includes("guide") || c.includes("api")
                        ? BookOpen
                        : c.includes("game") || c.includes("benchmark")
                        ? Gamepad2
                        : c.includes("blog") || c.includes("news") || c.includes("intel")
                        ? Newspaper
                        : c.includes("comm") || c.includes("review") || c.includes("operator")
                        ? Users
                        : c.includes("perf") || c.includes("dlss") || c.includes("fps")
                        ? Zap
                        : Sparkles;

                      return (
                        <Link
                          key={idx}
                          href={res.url}
                          onClick={closeSearch}
                          className="block p-3 bg-white/4 border border-white/10 hover:border-neon-green/50 active:bg-white/8 rounded-xl transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-neon-green uppercase tracking-widest flex items-center gap-1.5 bg-neon-green/10 px-2 py-0.5 rounded-full border border-neon-green/30">
                              <Icon className="w-3 h-3 text-neon-green shrink-0" />
                              <span>{res.category || res.type}</span>
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div className="text-sm font-bold text-white">{res.title}</div>
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">{res.description}</div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </header>

      {/* FULLY OPTIMIZED MOBILE NAVIGATION DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Dimmer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/70 z-40"
              style={{ willChange: "opacity" }}
            />

            {/* Mobile Drawer Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="lg:hidden fixed top-20 left-0 right-0 w-full bg-obsidian/98 backdrop-blur-xl border-b border-neon-green/30 shadow-[0_20px_50px_rgba(0,0,0,0.95)] max-h-[calc(100dvh-5rem)] overflow-y-auto z-40 overscroll-contain"
              style={{
                WebkitOverflowScrolling: "touch",
                willChange: "transform, opacity",
                transform: "translate3d(0, 0, 0)",
              }}
            >
              <div className="px-4 py-5 flex flex-col gap-2.5 font-mono">

                {mobileNavLinks.map((link: any) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  const hasSub = link.subLinks && link.subLinks.length > 0;
                  const isSubOpen = expandedMobileSub === link.name;

                  return (
                    <div
                      key={link.name}
                      className={`bg-white/3 border rounded-2xl p-3 sm:p-3.5 transition-colors ${
                        isActive
                          ? "border-neon-green/40 bg-neon-green/4"
                          : "border-white/10 hover:border-white/20 active:bg-white/6"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Link
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 text-sm font-bold uppercase tracking-wider flex-1 py-0.5 ${
                            isActive ? "text-neon-green glow-text-teal" : "text-white active:text-neon-green"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="truncate">{link.name}</span>
                        </Link>

                        {hasSub && (
                          <button
                            type="button"
                            onClick={() => setExpandedMobileSub(isSubOpen ? null : link.name)}
                            className="p-2 rounded-xl bg-white/5 active:bg-neon-green/10 text-gray-400 active:text-neon-green touch-manipulation cursor-pointer"
                            aria-label={`Toggle ${link.name} sub-menu`}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isSubOpen ? "rotate-180 text-neon-green" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Smooth Collapsible Mobile Sub-Links */}
                      <AnimatePresence initial={false}>
                        {hasSub && isSubOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-white/5 pl-2 space-y-2">
                              {link.subLinks.map((sub: any) => {
                                const SubIcon = sub.icon;
                                const isSubActive = pathname === sub.href;
                                return (
                                  <Link
                                    key={sub.name}
                                    href={sub.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-2.5 py-2 px-2 rounded-lg text-xs uppercase tracking-wider transition-colors active:bg-white/5 ${
                                      isSubActive ? "text-neon-green font-bold bg-neon-green/10" : "text-gray-300 hover:text-white"
                                    }`}
                                  >
                                    <SubIcon className="w-3.5 h-3.5 text-neon-green/80 shrink-0" />
                                    <span className="truncate">{sub.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Mobile Download CTA */}
                <div className="pt-2">
                  {os === "mac" || os === "other" ? (
                    <div
                      className="w-full text-center py-3.5 rounded-xl bg-white/5 text-gray-400 font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center justify-center px-4"
                    >
                      This app will not support this operating system.
                    </div>
                  ) : (
                    <a
                      href={os === "linux" ? LINUX_INSTALLER_URL : (os === "windows" ? WINDOWS_INSTALLER_URL : AUTO_DOWNLOAD_URL)}
                      suppressHydrationWarning
                      onClick={() => setIsOpen(false)}
                      className="w-full text-center py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider btn-premium-primary transition-all flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(118,185,0,0.5)] cursor-pointer touch-manipulation active:scale-[0.99]"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span>DOWNLOAD MISSION CONTROL</span>
                    </a>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
