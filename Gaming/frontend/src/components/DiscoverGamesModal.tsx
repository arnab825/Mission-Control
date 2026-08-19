/**
 * Mission Control — Distributed Library
 * DiscoverGamesModal.tsx: Find & add games via live web search across
 * renowned game launchers (Steam, Epic Games Store, GOG, RAWG).
 *
 * Automatically previews real launcher metadata, AI-classified genres,
 * and seamlessly adds them to the canonical games master catalog.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Search, Sparkles, Check, Loader2, Globe, Flame, Gamepad2
} from 'lucide-react';

const LIBRARY_SERVER_URL = (window as any).__LIBRARY_SERVER_URL__
  || import.meta.env.VITE_LIBRARY_SERVER_URL
  || 'http://localhost:8800';

interface DiscoverItem {
  id: string;
  title: string;
  developer?: string;
  publisher?: string;
  release_date?: string;
  primary_genre?: string;
  genres: string[];
  tags: string[];
  cover_url?: string;
  banner_url?: string;
  summary?: string;
  store?: string;
  store_app_id?: string;
  launchers: string[];
  in_catalog: boolean;
  ai_classified: boolean;
  installations: Array<{ nodeId: string; nodeName: string; status: string }>;
}

interface DiscoverGamesModalProps {
  onClose: () => void;
  onGameAdded?: () => void;
}

const LAUNCHER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Steam':       { bg: 'bg-[#1b2838]/80', text: 'text-[#66c0f4]', border: 'border-[#66c0f4]/30' },
  'Epic Games':  { bg: 'bg-purple-950/80', text: 'text-purple-300', border: 'border-purple-500/30' },
  'GOG Galaxy':  { bg: 'bg-violet-950/80', text: 'text-violet-300', border: 'border-violet-500/30' },
  'GOG':         { bg: 'bg-violet-950/80', text: 'text-violet-300', border: 'border-violet-500/30' },
  'Web':         { bg: 'bg-zinc-800/80', text: 'text-zinc-300', border: 'border-zinc-500/30' },
};

const SUGGESTED_QUERIES = [
  'Elden Ring', 'Cyberpunk 2077', 'Black Myth Wukong', 'Baldur\'s Gate 3',
  'God of War Ragnarok', 'Grand Theft Auto V', 'Red Dead Redemption 2', 'Forza Horizon 5'
];

const DiscoverGamesModal: React.FC<DiscoverGamesModalProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoverItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `${LIBRARY_SERVER_URL}/api/games/discover?q=${encodeURIComponent(searchTerm.trim())}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedLaunchers = async () => {
    setSeeding(true);
    setSeedStatus('Harvesting top games from Steam, Epic, & GOG...');
    try {
      const res = await fetch(`${LIBRARY_SERVER_URL}/api/games/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit_per_launcher: 30, classify_immediately: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setSeedStatus(`Successfully ingested ${data.inserted} new games from launchers!`);
        setTimeout(() => setSeedStatus(null), 4000);
      }
    } catch {
      setSeedStatus('Failed to seed catalog.');
    } finally {
      setSeeding(false);
    }
  };

  // Trigger initial search for popular games if empty
  useEffect(() => {
    handleSearch('Top');
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <motion.div
        className="relative z-10 w-full max-w-5xl h-[85vh] bg-zinc-950/98 border border-white/[0.08] rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between gap-4 shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center shadow-[0_0_20px_rgba(118,185,0,0.15)]">
              <Globe className="w-5 h-5 text-neon-green" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide">
                DISCOVER GAMES FROM LAUNCHERS & WEB
              </h2>
              <p className="text-[10px] text-zinc-400 font-medium">
                Live search across Steam, Epic Games, GOG, and RAWG · AI-classified genres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedLaunchers}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              title="Harvest top bestselling games across Steam, Epic Games, & GOG"
            >
              <Flame className={`w-3.5 h-3.5 text-orange-400 ${seeding ? 'animate-bounce' : ''}`} />
              {seeding ? 'Harvesting...' : 'Harvest Launcher Top 100'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Suggestions */}
        <div className="p-6 pb-4 border-b border-white/[0.04] space-y-3 shrink-0 bg-black/20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="relative"
          >
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, e.g. 'Cyberpunk 2077', 'Elden Ring', 'Black Myth Wukong'..."
              className="w-full bg-black/40 border border-white/10 focus:border-neon-green/40 rounded-2xl pl-11 pr-28 py-3 text-xs font-semibold text-white placeholder-zinc-500 outline-none transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-neon-green hover:bg-neon-green/90 text-black font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search Web'}
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mr-1 shrink-0">
              Popular:
            </span>
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuery(q);
                  handleSearch(q);
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[9px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {seedStatus && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-bold text-neon-green bg-neon-green/10 border border-neon-green/20 rounded-xl px-3 py-1.5 flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              {seedStatus}
            </motion.div>
          )}
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-16">
              <Loader2 className="w-8 h-8 text-neon-green animate-spin mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Searching renowned launchers & web...</p>
              <p className="text-[10px] text-zinc-600 mt-1">Crawling Steam Store, Epic Games, GOG, and RAWG</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((game) => {
                const isInstalled = game.installations && game.installations.length > 0;
                return (
                  <div
                    key={game.id}
                    className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
                  >
                    <div>
                      {/* Cover & Banner */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 mb-3 border border-white/5">
                        {game.cover_url || game.banner_url ? (
                          <img
                            src={game.cover_url || game.banner_url}
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="w-8 h-8 text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                        {/* Store Badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          {game.launchers?.map((l) => {
                            const style = LAUNCHER_STYLES[l] || LAUNCHER_STYLES.Web;
                            return (
                              <span
                                key={l}
                                className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border backdrop-blur-md ${style.bg} ${style.text} ${style.border}`}
                              >
                                {l}
                              </span>
                            );
                          })}
                        </div>

                        {/* Installed Indicator */}
                        {isInstalled && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase tracking-wider backdrop-blur-md">
                            Installed
                          </div>
                        )}

                        {/* Primary Genre Tag */}
                        {game.primary_genre && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-white text-[8px] font-bold backdrop-blur-sm">
                            <Sparkles className="w-2.5 h-2.5 text-neon-green" />
                            {game.primary_genre}
                          </div>
                        )}
                      </div>

                      {/* Title & Developer */}
                      <h3 className="text-sm font-black text-white truncate group-hover:text-neon-green transition-colors">
                        {game.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5 truncate">
                        {game.developer && <span>{game.developer}</span>}
                        {game.developer && game.release_date && <span>·</span>}
                        {game.release_date && <span>{game.release_date}</span>}
                      </div>

                      {/* Summary */}
                      {game.summary && (
                        <p className="text-[10px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                          {game.summary}
                        </p>
                      )}
                    </div>

                    {/* Footer Status */}
                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-neon-green" />
                        <span>In Master Catalog</span>
                      </div>
                      {isInstalled ? (
                        <span className="text-emerald-400 font-bold">
                          {game.installations.length} node{game.installations.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-zinc-600">Uninstalled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSearched ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-16">
              <Gamepad2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-xs font-bold uppercase tracking-widest">No matching games found</p>
              <p className="text-[10px] text-zinc-600 mt-1">Try another title or keyword</p>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DiscoverGamesModal;
