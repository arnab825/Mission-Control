"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Menu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WINDOWS_INSTALLER_URL } from "@/lib/download";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedMobileSub, setExpandedMobileSub] = useState<string | null>(null);
  
  type OS = "windows" | "linux" | "mac" | "other" | null;
  const [os, setOs] = useState<OS>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);

    // OS Detection
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes("win")) setOs("windows");
    else if (platform.includes("linux")) setOs("linux");
    else if (platform.includes("mac")) setOs("mac");
    else setOs("other");

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
    setIsMobileSearchOpen(false);
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
        { name: "Getting Started Guide", href: "/docs", icon: BookOpen },
        { name: "Launcher Core Setup", href: "/docs", icon: Settings },
        { name: "Troubleshooting FAQ", href: "/docs", icon: HelpCircle },
        { name: "Neural Cryptography", href: "/docs", icon: ShieldCheck },
      ]
    },
    {
      name: "Community",
      href: "/community",
      icon: Users,
      subLinks: [
        { name: "Active Glitch Tracker", href: "/community", icon: AlertTriangle },
        { name: "Submit Telemetry Report", href: "/community?report=true", icon: Send },
        { name: "Prioritized Hotfixes", href: "/community", icon: TrendingUp },
        { name: "Diagnostics Database", href: "/community", icon: Database },
      ]
    },
  ];

  const moreLinks = [
    { name: "Blog Intelligence", href: "/blog", icon: Newspaper },
    { name: "Contact Support", href: "/contact", icon: Mail },
  ];

  const mobileNavLinks = [...navLinks, ...moreLinks];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 w-full h-20 z-50 transition-all duration-300 ${isScrolled
        ? "bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
        : "bg-[#0a0a0c]/80 backdrop-blur-md border-b border-white/[0.08]"
        }`}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between relative">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group z-10">
          <div className="w-14 h-14 rounded-xl border border-neon-green/40 flex items-center justify-center bg-neon-green/10 group-hover:border-neon-green group-hover:shadow-[0_0_20px_rgba(118, 185, 0,0.6)] shadow-[0_0_10px_rgba(118, 185, 0,0.2)] transition-all duration-300 overflow-hidden p-1.5">
            <img src="/logo.png" alt="Mission Control" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg sm:text-xl font-black font-display tracking-wider text-white group-hover:text-neon-green transition-colors duration-300">
            MISSION <span className="text-neon-green drop-shadow-[0_0_8px_rgba(118, 185, 0,0.5)]">CONTROL</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <div key={link.name} className="relative group">
                <Link
                  href={link.href}
                  className={`relative font-mono text-xs tracking-wider uppercase transition-colors duration-300 py-2 flex items-center gap-1.5 ${isActive ? "text-neon-green font-bold" : "text-gray-400 hover:text-white"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5 text-neon-green/70 group-hover:text-neon-green transition-colors" />
                  <span>{link.name}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-white transition-transform duration-300 group-hover:rotate-180" />
                  <span className={`absolute bottom-0 left-0 h-[2px] bg-neon-green shadow-[0_0_8px_rgba(118, 185, 0,0.8)] rounded transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"}`} />
                </Link>
                
                <div className="absolute top-full left-0 pt-2 w-56 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 origin-top-left z-50">
                  <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-2 space-y-1 shadow-2xl">
                    {link.subLinks.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-mono tracking-wider uppercase text-gray-400 hover:text-neon-green hover:bg-white/[0.04] transition-all text-left"
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
            <button className="font-mono text-xs tracking-wider uppercase transition-colors duration-300 py-2 flex items-center gap-1.5 text-gray-400 hover:text-white cursor-pointer focus:outline-none">
              <span>More Intel</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform duration-300 group-hover:rotate-180" />
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
                        isActive ? "bg-neon-green/10 text-neon-green font-bold" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
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
        <div className="hidden md:block relative max-w-[200px] xl:max-w-[240px] w-full mx-4 z-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search docs/blog..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              className="w-full bg-obsidian/80 border border-white/15 hover:border-neon-green/40 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_15px_rgba(118, 185, 0,0.25)] transition-all"
            />
            <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            {(searchQuery || isSearchFocused) && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearchFocused(false);
                }}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {isSearchFocused && (
            <div className="absolute top-11 left-0 w-80 bg-[#0d0e12] border border-white/10 rounded-2xl p-2 z-50 max-h-80 overflow-y-auto shadow-2xl">
              {searchResults.length > 0 ? (
                <>
                  {(showAllResults ? searchResults : searchResults.slice(0, 5)).map((res: any, idx: number) => (
                    <Link
                      key={idx}
                      href={res.url}
                      className="block p-3 hover:bg-white/[0.05] rounded-xl transition-colors text-left font-mono"
                    >
                      <div className="text-[10px] font-bold text-neon-green uppercase tracking-widest mb-0.5">{res.category}</div>
                      <div className="text-xs font-bold text-white truncate">{res.title}</div>
                      <div className="text-[11px] text-gray-400 truncate">{res.description}</div>
                    </Link>
                  ))}
                  {searchResults.length > 5 && !showAllResults && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowAllResults(true);
                      }}
                      className="w-full text-center py-2 mt-1 text-[10px] font-mono font-bold text-neon-green hover:text-white hover:bg-neon-green/15 border border-neon-green/30 rounded-xl transition-all cursor-pointer uppercase tracking-widest"
                    >
                      Show More Results ({searchResults.length - 5} remaining)
                    </button>
                  )}
                </>
              ) : (
                <div className="p-3 space-y-2 font-mono">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-1">Suggested Telemetry Searches</div>
                  <div className="space-y-1">
                    {[
                      { title: "DirectX 12 Overlay Swapchain", category: "Community", query: "DirectX 12" },
                      { title: "NVIDIA DLSS Frame Generation", category: "Docs", query: "DLSS" },
                      { title: "Parallel Hardware Diagnostics", category: "Architecture", query: "Thermal" },
                    ].map((s, idx) => (
                      <button
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSearch(s.query);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-xs text-gray-300 hover:text-neon-green text-left transition-colors cursor-pointer"
                      >
                        <span>{s.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400">{s.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button & Mobile Controls */}
        <div className="flex items-center gap-3 z-10">
          <div className="hidden lg:block">
            {os === "mac" || os === "other" ? (
              <div
                className="relative inline-flex items-center justify-center px-4 py-2 font-mono text-[10px] font-bold tracking-wider uppercase border border-white/20 text-gray-400 rounded-xl bg-white/5 cursor-not-allowed max-w-[220px] text-center leading-tight"
              >
                This app will not support this operating system.
              </div>
            ) : (
              <a
                href={os === "windows" ? WINDOWS_INSTALLER_URL : "/#download"}
                className="relative inline-flex items-center justify-center px-5 py-2.5 font-mono text-xs font-black tracking-wider uppercase border border-neon-green/50 text-neon-green rounded-xl bg-neon-green/10 hover:bg-neon-green hover:text-obsidian hover:shadow-[0_0_25px_rgba(118, 185, 0,0.6)] shadow-[0_0_10px_rgba(118, 185, 0,0.2)] transition-all duration-300 gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download {os === "linux" ? "for Linux" : ""}</span>
              </a>
            )}
          </div>

          {/* Search Trigger for Mobile */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2.5 text-gray-300 hover:text-neon-green focus:outline-none transition-colors rounded-xl bg-white/[0.03] border border-white/5"
            aria-label="Toggle Mobile Search"
          >
            <SearchIcon className="w-5 h-5" />
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2.5 text-gray-300 hover:text-neon-green focus:outline-none transition-colors rounded-xl bg-white/[0.03] border border-white/5"
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
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 bg-[#0a0a0c] z-30 flex items-center px-4 gap-3 border-b border-neon-green/30"
            >
              <SearchIcon className="w-5 h-5 text-neon-green shrink-0" />
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  placeholder="Search docs & intel..."
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-transparent border-none text-white focus:outline-none placeholder-gray-500 py-2 text-sm font-mono pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="absolute right-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Mobile Search Results Popover */}
              {searchResults.length > 0 && (
                <div className="absolute top-20 left-0 right-0 bg-[#0d0e12] border-b border-white/10 max-h-[calc(100vh-5rem)] overflow-y-auto p-4 space-y-3 shadow-2xl z-40 font-mono">
                  {searchResults.map((res: any, idx: number) => (
                    <Link
                      key={idx}
                      href={res.url}
                      onClick={() => {
                        setIsMobileSearchOpen(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="block p-3.5 bg-white/[0.03] border border-white/5 rounded-xl hover:border-neon-green/40 transition-colors"
                    >
                      <div className="text-[10px] font-bold text-neon-green uppercase tracking-widest mb-1">{res.category}</div>
                      <div className="text-sm font-bold text-white">{res.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{res.description}</div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FULLY RESPONSIVE MOBILE MENU DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden fixed top-20 left-0 w-full bg-[#0a0a0c]/98 backdrop-blur-2xl border-b border-neon-green/30 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[calc(100vh-5rem)] overflow-y-auto z-40"
          >
            <div className="px-4 py-6 flex flex-col gap-3 font-mono">
              
              {mobileNavLinks.map((link: any) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                const hasSub = link.subLinks && link.subLinks.length > 0;
                const isSubOpen = expandedMobileSub === link.name;

                return (
                  <div key={link.name} className="glass-card p-4 border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between w-full">
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 text-sm font-bold uppercase tracking-wider ${
                          isActive ? "text-neon-green glow-text-teal" : "text-white hover:text-neon-green"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{link.name}</span>
                      </Link>

                      {hasSub && (
                        <button
                          onClick={() => setExpandedMobileSub(isSubOpen ? null : link.name)}
                          className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSubOpen ? "rotate-180 text-neon-green" : ""}`} />
                        </button>
                      )}
                    </div>

                    {/* Collapsible Mobile Sub-Links */}
                    {hasSub && isSubOpen && (
                      <div className="mt-3 pt-3 border-t border-white/5 pl-4 space-y-2.5">
                        {link.subLinks.map((sub: any) => {
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center gap-2.5 py-1.5 text-xs text-gray-300 hover:text-neon-green uppercase tracking-wider transition-colors"
                            >
                              <SubIcon className="w-3.5 h-3.5 text-neon-green/70 shrink-0" />
                              <span>{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile Download CTA */}
              <div className="pt-2">
                {os === "mac" || os === "other" ? (
                  <div
                    className="w-full text-center py-4 rounded-2xl bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-wider border border-white/20 flex items-center justify-center px-4"
                  >
                    This app will not support this operating system.
                  </div>
                ) : (
                  <Link
                    href={os === "windows" ? WINDOWS_INSTALLER_URL : "/#download"}
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-4 rounded-2xl bg-neon-green text-obsidian font-black text-sm uppercase tracking-wider hover:bg-white transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(118, 185, 0,0.4)]"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download for {os === "linux" ? "Linux" : "Windows"}</span>
                  </Link>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.nav>
  );
}
