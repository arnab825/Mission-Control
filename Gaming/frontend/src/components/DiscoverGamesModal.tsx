/**
 * Mission Control — Distributed Library
 * DiscoverGamesModal.tsx: Dedicated Gaming Discovery & Live Intel Hub
 *
 * 1. Curated & Trending Games: High-profile AAA and acclaimed indie titles with verified artwork.
 * 2. Dedicated Live Gaming News: Real-time gaming news & hardware deep-dives from
 *    renowned outlets (PC Gamer, Eurogamer, IGN, Tom's Hardware) without touching user blogs.
 * 3. Launcher-aware live web discovery across Steam, Epic Games, GOG, and RAWG.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X, Search, Sparkles, Check, Loader2, Globe, Flame, Gamepad2,
  Newspaper, ExternalLink, RefreshCw, Swords, Crosshair, Compass
} from 'lucide-react';

import { fetchWithFailover } from '../hooks/useDistributedStats';

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

interface NewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  source: string;
  category: string;
  pubDate: string;
  imageUrl?: string | null;
}

interface DiscoverGamesModalProps {
  onClose: () => void;
  onGameAdded?: () => void;
}

type TabType = 'trending' | 'news' | 'action' | 'openworld' | 'shooter';

const LAUNCHER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Steam':       { bg: 'bg-[#1b2838]/80', text: 'text-[#66c0f4]', border: 'border-[#66c0f4]/30' },
  'Epic Games':  { bg: 'bg-purple-950/80', text: 'text-purple-300', border: 'border-purple-500/30' },
  'GOG Galaxy':  { bg: 'bg-violet-950/80', text: 'text-violet-300', border: 'border-violet-500/30' },
  'GOG':         { bg: 'bg-violet-950/80', text: 'text-violet-300', border: 'border-violet-500/30' },
  'Xbox':        { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Xbox Game Pass': { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Web':         { bg: 'bg-zinc-800/80', text: 'text-zinc-300', border: 'border-zinc-500/30' },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'PC Gamer':        { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  'Eurogamer':       { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  'IGN':             { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  'GameSpot':        { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Kotaku':          { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  "Tom's Hardware":  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
};

const SUGGESTED_QUERIES = [
  'Black Myth Wukong', 'Cyberpunk 2077', 'Elden Ring', 'Baldur\'s Gate 3',
  'God of War Ragnarok', 'Grand Theft Auto V', 'Red Dead Redemption 2', 'Forza Horizon 5'
];

// Curated top-tier games displayed prominently instead of obscure symbols/numbers
const CURATED_FEATURED_GAMES: DiscoverItem[] = [
  {
    id: 'black-myth-wukong',
    title: 'Black Myth: Wukong',
    developer: 'Game Science',
    publisher: 'Game Science',
    release_date: '2024-08-20',
    primary_genre: 'Action RPG',
    genres: ['Action RPG', 'Soulslike', 'Mythology'],
    tags: ['Action', 'RPG', 'Atmospheric'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2358720/header.jpg',
    summary: 'An action RPG rooted in Chinese mythology. Set out as the Destined One to venture into the challenges and marvels ahead to uncover the obscured truth beneath the veil of a glorious legend.',
    store: 'Steam',
    store_app_id: '2358720',
    launchers: ['Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'cyberpunk-2077',
    title: 'Cyberpunk 2077',
    developer: 'CD PROJEKT RED',
    publisher: 'CD PROJEKT RED',
    release_date: '2020-12-10',
    primary_genre: 'Open World RPG',
    genres: ['RPG', 'Open World', 'Cyberpunk', 'Action'],
    tags: ['Sci-Fi', 'FPS', 'Story Rich'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg',
    summary: 'An open-world, action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary wrapped up in a do-or-die fight for survival.',
    store: 'Steam',
    store_app_id: '1091500',
    launchers: ['Steam', 'GOG', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'elden-ring',
    title: 'Elden Ring',
    developer: 'FromSoftware Inc.',
    publisher: 'Bandai Namco Entertainment',
    release_date: '2022-02-25',
    primary_genre: 'Action RPG',
    genres: ['Action RPG', 'Soulslike', 'Dark Fantasy'],
    tags: ['Difficult', 'Open World', 'Fantasy'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
    summary: 'Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
    store: 'Steam',
    store_app_id: '1245620',
    launchers: ['Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'baldurs-gate-3',
    title: "Baldur's Gate 3",
    developer: 'Larian Studios',
    publisher: 'Larian Studios',
    release_date: '2023-08-03',
    primary_genre: 'Turn-Based RPG',
    genres: ['RPG', 'Tactical', 'D&D', 'Story Rich'],
    tags: ['Choice Matters', 'Multiplayer', 'Fantasy'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg',
    summary: 'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.',
    store: 'Steam',
    store_app_id: '1086940',
    launchers: ['Steam', 'GOG'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'gta-v',
    title: 'Grand Theft Auto V',
    developer: 'Rockstar North',
    publisher: 'Rockstar Games',
    release_date: '2015-04-14',
    primary_genre: 'Open World Action',
    genres: ['Action', 'Open World', 'Shooter'],
    tags: ['Crime', 'Multiplayer', 'Automobile'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg',
    summary: 'When a young street hustler, a retired bank robber, and a terrifying psychopath find themselves entangled with some of the most frightening and deranged elements of the criminal underworld.',
    store: 'Steam',
    store_app_id: '271590',
    launchers: ['Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'god-of-war-ragnarok',
    title: 'God of War Ragnarök',
    developer: 'Santa Monica Studio',
    publisher: 'PlayStation Publishing LLC',
    release_date: '2024-09-19',
    primary_genre: 'Action Adventure',
    genres: ['Action', 'Adventure', 'Mythology'],
    tags: ['Cinematic', 'Story Rich', 'Hack and Slash'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2322010/header.jpg',
    summary: 'Kratos and Atreus embark on an epic and heartfelt voyage into the mythical realms as they struggle with holding on and letting go.',
    store: 'Steam',
    store_app_id: '2322010',
    launchers: ['Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'helldivers-2',
    title: 'Helldivers 2',
    developer: 'Arrowhead Game Studios',
    publisher: 'PlayStation Publishing LLC',
    release_date: '2024-02-08',
    primary_genre: 'Co-op Shooter',
    genres: ['Action', 'Shooter', 'Third-Person', 'Co-op'],
    tags: ['Multiplayer', 'Sci-Fi', 'Combat'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg',
    summary: 'The Galaxy\'s Last Line of Offence. Enlist in the Helldivers and join the fight for freedom across a hostile galaxy in a fast, frantic, and ferocious third-person shooter.',
    store: 'Steam',
    store_app_id: '553850',
    launchers: ['Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'red-dead-redemption-2',
    title: 'Red Dead Redemption 2',
    developer: 'Rockstar Games',
    publisher: 'Rockstar Games',
    release_date: '2019-12-05',
    primary_genre: 'Open World Western',
    genres: ['Open World', 'Western', 'Action', 'Story Rich'],
    tags: ['Atmospheric', 'Horses', 'Realistic'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg',
    summary: 'Winner of over 175 Game of the Year Awards, Red Dead Redemption 2 is an epic tale of honor and loyalty at the dawn of the modern age in the American frontier.',
    store: 'Steam',
    store_app_id: '1172470',
    launchers: ['Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'forza-horizon-5',
    title: 'Forza Horizon 5',
    developer: 'Playground Games',
    publisher: 'Xbox Game Studios',
    release_date: '2021-11-09',
    primary_genre: 'Open World Racing',
    genres: ['Racing', 'Open World', 'Driving', 'Simulation'],
    tags: ['Automobile', 'Multiplayer', 'Scenic'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg',
    summary: 'Your Ultimate Horizon Adventure awaits! Explore the vibrant and ever-evolving open world landscapes of Mexico with limitless, fun driving action in hundreds of the world\'s greatest cars.',
    store: 'Steam',
    store_app_id: '1551360',
    launchers: ['Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'ghost-of-tsushima',
    title: "Ghost of Tsushima DIRECTOR'S CUT",
    developer: 'Sucker Punch Productions',
    publisher: 'PlayStation Publishing LLC',
    release_date: '2024-05-16',
    primary_genre: 'Action Adventure',
    genres: ['Action', 'Open World', 'Samurai', 'Stealth'],
    tags: ['Atmospheric', 'Swordplay', 'Cinematic'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2215430/header.jpg',
    summary: 'A storm is coming. Venture through Tsushima as Jin Sakai, defying samurai tradition to forge the path of the Ghost and liberate Japan from Mongol invaders.',
    store: 'Steam',
    store_app_id: '2215430',
    launchers: ['Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'the-witcher-3',
    title: 'The Witcher 3: Wild Hunt',
    developer: 'CD PROJEKT RED',
    publisher: 'CD PROJEKT RED',
    release_date: '2015-05-18',
    primary_genre: 'Action RPG',
    genres: ['RPG', 'Open World', 'Fantasy', 'Story Rich'],
    tags: ['Mature', 'Magic', 'Adventure'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg',
    summary: 'You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will.',
    store: 'Steam',
    store_app_id: '292030',
    launchers: ['Steam', 'GOG', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'hades-ii',
    title: 'Hades II',
    developer: 'Supergiant Games',
    publisher: 'Supergiant Games',
    release_date: '2024-05-06',
    primary_genre: 'Action Roguelike',
    genres: ['Roguelike', 'Action', 'Mythology', 'Indie'],
    tags: ['Fast-Paced', 'Isometric', 'Great Soundtrack'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg',
    summary: 'Battle beyond the Underworld using dark sorcery to take on the Titan of Time in this bewitching sequel to the award-winning rogue-like dungeon crawler.',
    store: 'Steam',
    store_app_id: '1145350',
    launchers: ['Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
];

const DiscoverGamesModal: React.FC<DiscoverGamesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('trending');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoverItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [seedError, setSeedError] = useState(false);

  // Dedicated News State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedLauncher, setSelectedLauncher] = useState<string>('All');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Fetch Live Gaming News (from external RSS via Electron IPC)
  const loadGamingNews = async () => {
    setNewsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.fetchGamingNews) {
        const res = await window.electronAPI.fetchGamingNews();
        if (res && res.success && res.items) {
          setNewsItems(res.items);
          return;
        }
      }
      // Fallback: Direct fetch if electronAPI is unavailable or running in browser
      const fallbackRes = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.pcgamer.com%2Frss%2F');
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        const parsed: NewsItem[] = (data.items || []).map((item: any) => ({
          id: item.link,
          title: item.title,
          link: item.link,
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 180) + '...',
          source: 'PC Gamer',
          category: 'Gaming',
          pubDate: item.pubDate || '',
          imageUrl: item.thumbnail || item.enclosure?.link,
        }));
        setNewsItems(parsed);
      }
    } catch {
      // Graceful fallback
    } finally {
      setNewsLoading(false);
    }
  };

  const loadPopularCatalog = async () => {
    setLoading(true);
    try {
      // 1. Fetch live dynamic multi-launcher trending (Steam, Epic Games, GOG)
      let dynamicLauncherList: DiscoverItem[] = [];
      if (typeof window !== 'undefined' && window.electronAPI?.fetchLauncherTrending) {
        try {
          const lRes = await window.electronAPI.fetchLauncherTrending();
          if (lRes && lRes.success && Array.isArray(lRes.games) && lRes.games.length > 0) {
            dynamicLauncherList = lRes.games;
          }
        } catch (_) {}
      } else if (typeof window !== 'undefined' && window.electronAPI?.fetchSteamTrending) {
        try {
          const sRes = await window.electronAPI.fetchSteamTrending();
          if (sRes && sRes.success && Array.isArray(sRes.games)) {
            dynamicLauncherList = sRes.games;
          }
        } catch (_) {}
      }

      // 2. Fetch distributed catalog
      const res = await fetchWithFailover(`/api/games?limit=30`);
      let cleanCatalog: DiscoverItem[] = [];
      if (res.ok) {
        const data = await res.json();
        const rawGames = data.games || [];
        
        // Filter out games with obscure symbolic or non-alphanumeric titles
        cleanCatalog = rawGames.filter((g: any) => {
          const t = (g.title || '').trim();
          return !/^[^a-zA-Z]/.test(t) || t.length > 8;
        }).map((g: any) => ({
          id: g.id,
          title: g.title,
          developer: g.developer,
          publisher: g.publisher,
          release_date: g.releaseDate || g.release_date,
          primary_genre: g.primaryGenre || g.primary_genre,
          genres: g.genres || [],
          tags: g.tags || [],
          cover_url: g.coverUrl || g.cover_url,
          banner_url: g.bannerUrl || g.banner_url,
          summary: g.summary || g.description,
          store: g.source || 'Steam',
          store_app_id: g.source_game_id || g.id,
          launchers: g.launchers || ['Steam'],
          in_catalog: true,
          ai_classified: g.ai_classified ?? true,
          installations: g.installations || [],
        }));
      }

      // 3. Combine: Live Multi-Launcher Trending (Steam, Epic, GOG) first, then Curated, then Catalog
      const existingNames = new Set<string>();
      const combined: DiscoverItem[] = [];

      // Add dynamic multi-launcher games (Steam, Epic, GOG)
      for (const g of dynamicLauncherList) {
        const key = g.title.toLowerCase().trim();
        if (!existingNames.has(key)) {
          existingNames.add(key);
          combined.push(g);
        }
      }

      // Add curated games as baseline
      for (const g of CURATED_FEATURED_GAMES) {
        const key = g.title.toLowerCase().trim();
        if (!existingNames.has(key)) {
          existingNames.add(key);
          combined.push(g);
        }
      }

      // Add catalog games
      for (const g of cleanCatalog) {
        const key = g.title.toLowerCase().trim();
        if (!existingNames.has(key)) {
          existingNames.add(key);
          combined.push(g);
        }
      }

      setResults(combined.length > 0 ? combined : CURATED_FEATURED_GAMES);
      setHasSearched(true);
    } catch {
      setResults(CURATED_FEATURED_GAMES);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      loadPopularCatalog();
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetchWithFailover(
        `/api/games/discover?q=${encodeURIComponent(searchTerm.trim())}&limit=24`
      );
      if (res.ok) {
        const data = await res.json();
        const remoteResults = data.results || [];
        if (remoteResults.length > 0) {
          setResults(remoteResults);
        } else {
          // Client-side search across current games list if backend yields nothing
          const term = searchTerm.toLowerCase();
          const filtered = CURATED_FEATURED_GAMES.filter(
            g => g.title.toLowerCase().includes(term) ||
                 g.developer?.toLowerCase().includes(term) ||
                 g.primary_genre?.toLowerCase().includes(term)
          );
          setResults(filtered);
        }
      } else {
        const term = searchTerm.toLowerCase();
        setResults(CURATED_FEATURED_GAMES.filter(g => g.title.toLowerCase().includes(term)));
      }
    } catch {
      const term = searchTerm.toLowerCase();
      setResults(CURATED_FEATURED_GAMES.filter(g => g.title.toLowerCase().includes(term)));
    } finally {
      setLoading(false);
    }
  };

  const handleSeedLaunchers = async () => {
    setSeeding(true);
    setSeedStatus('Harvesting top games from Steam, Epic, & GOG...');
    setSeedError(false);
    try {
      const res = await fetchWithFailover(`/api/games/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit_per_launcher: 30, classify_immediately: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setSeedError(false);
        setSeedStatus(`Successfully ingested ${data.inserted} new games from launchers!`);
        setTimeout(() => setSeedStatus(null), 5000);
        loadPopularCatalog();
      } else {
        setSeedError(true);
        setSeedStatus('Seed request failed. Server is initializing — try again.');
        setTimeout(() => setSeedStatus(null), 6000);
      }
    } catch {
      setSeedError(true);
      setSeedStatus('Failed to reach the catalog server. Check your connection.');
      setTimeout(() => setSeedStatus(null), 6000);
    } finally {
      setSeeding(false);
    }
  };

  // Preload initial data
  useEffect(() => {
    loadPopularCatalog();
    loadGamingNews();
  }, []);

  // Filter games based on genre tabs and selected launcher
  const displayedGames = useMemo(() => {
    let list = results;
    if (selectedLauncher !== 'All') {
      const target = selectedLauncher.toLowerCase();
      list = list.filter(g =>
        g.store?.toLowerCase().includes(target) ||
        g.launchers?.some(l => l.toLowerCase().includes(target))
      );
    }
    if (activeTab === 'action') {
      return list.filter(g =>
        g.primary_genre?.toLowerCase().includes('action') ||
        g.primary_genre?.toLowerCase().includes('rpg') ||
        g.genres.some(gen => /action|rpg|adventure/i.test(gen))
      );
    }
    if (activeTab === 'openworld') {
      return list.filter(g =>
        g.primary_genre?.toLowerCase().includes('open') ||
        g.primary_genre?.toLowerCase().includes('racing') ||
        g.genres.some(gen => /open world|racing|driving/i.test(gen))
      );
    }
    if (activeTab === 'shooter') {
      return list.filter(g =>
        g.primary_genre?.toLowerCase().includes('shooter') ||
        g.genres.some(gen => /shooter|fps|tactical|combat/i.test(gen))
      );
    }
    return list;
  }, [results, activeTab, selectedLauncher]);

  // Dynamically extract hot trending topics/games from the real live incoming news headlines
  const dynamicNewsTopics = useMemo(() => {
    if (newsItems.length === 0) return [];
    const topicCandidates = [
      'GTA', 'Grand Theft Auto', 'PlayStation', 'PS5', 'Xbox', 'Nintendo', 'Switch',
      'Cyberpunk', 'Elden Ring', 'Black Myth', 'Wukong', 'Witcher', 'Capcom', 'Valve',
      'Steam', 'GeForce', 'RTX', 'AMD', 'Radeon', 'Intel', 'Unreal Engine', 'Doom',
      'Monster Hunter', 'Call of Duty', 'Pokemon', 'Star Wars', 'Overwatch', 'Final Fantasy',
      'Resident Evil', 'Silent Hill', 'Kingdom Come', "Assassin's Creed", 'Dragon Age'
    ];

    const detected = new Set<string>();
    for (const item of newsItems) {
      const text = `${item.title} ${item.description}`.toLowerCase();
      for (const cand of topicCandidates) {
        if (text.includes(cand.toLowerCase())) {
          detected.add(cand);
        }
      }
    }
    return Array.from(detected).slice(0, 10);
  }, [newsItems]);

  // Filter news articles based on selected source, selected dynamic topic & search query
  const displayedNews = useMemo(() => {
    let list = newsItems;
    if (selectedSource !== 'All') {
      list = list.filter(item => item.source.toLowerCase() === selectedSource.toLowerCase());
    }
    if (selectedTopic !== 'All') {
      const topicLower = selectedTopic.toLowerCase();
      list = list.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(topicLower));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(item => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
    }
    return list;
  }, [newsItems, selectedSource, selectedTopic, query]);

  const uniqueSources = useMemo(() => {
    const s = new Set(newsItems.map(n => n.source));
    return ['All', ...Array.from(s)];
  }, [newsItems]);

  return (
    <motion.div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <motion.div
        className="relative z-10 w-full max-w-5xl h-[88vh] bg-zinc-950/98 border border-white/8 rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between gap-4 shrink-0 bg-linear-to-b from-white/3 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center shadow-[0_0_20px_rgba(118,185,0,0.15)]">
              <Globe className="w-5 h-5 text-neon-green" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                DISCOVER GAMES & LIVE INTEL HUB
              </h2>
              <p className="text-[10px] text-zinc-400 font-medium">
                Trending games, launcher cross-discovery & live industry news feed
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
              className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dedicated Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-2 border-b border-white/4 overflow-x-auto no-scrollbar bg-black/30">
          <button
            type="button"
            onClick={() => setActiveTab('trending')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'trending'
                ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                : 'bg-white/3 hover:bg-white/6 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Featured & Trending Games
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'news'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-white/3 hover:bg-white/6 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            Live Gaming News & Articles
            {newsItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/40 text-[8px] font-bold text-white">
                {newsItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('action')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'action'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                : 'bg-white/3 hover:bg-white/6 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Swords className="w-3 h-3" />
            Action & RPG
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('openworld')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'openworld'
                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-white/3 hover:bg-white/6 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Compass className="w-3 h-3" />
            Open World & Racing
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shooter')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'shooter'
                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]'
                : 'bg-white/3 hover:bg-white/6 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            Shooters
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-6 pb-4 border-b border-white/4 space-y-3 shrink-0 bg-black/20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (activeTab !== 'news') {
                handleSearch(query);
              }
            }}
            className="relative"
          >
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === 'news'
                  ? "Filter news articles by headline or keyword (e.g. 'PlayStation', 'RTX', 'Update')..."
                  : "Search games across Steam, Epic, GOG & RAWG (e.g. 'Cyberpunk', 'Elden Ring')..."
              }
              className="w-full bg-black/40 border border-white/10 focus:border-neon-green/40 rounded-2xl pl-11 pr-28 py-3 text-xs font-semibold text-white placeholder-zinc-500 outline-none transition-all"
              autoFocus
            />
            {activeTab !== 'news' && (
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-neon-green hover:bg-neon-green/90 text-black font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search Web'}
              </button>
            )}
          </form>

          {/* Quick Suggestions for Games OR Dynamic Filters for News */}
          {activeTab === 'news' ? (
            <div className="space-y-2 pt-1">
              {/* Outlets Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mr-1 shrink-0">
                  Outlets:
                </span>
                {uniqueSources.map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSelectedSource(source)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      selectedSource === source
                        ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-white/3 hover:bg-white/8 border border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {source}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={loadGamingNews}
                  disabled={newsLoading}
                  className="ml-auto shrink-0 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Refresh Live News"
                >
                  <RefreshCw className={`w-3 h-3 ${newsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Dynamic Live Trending Topics extracted from breaking news */}
              {dynamicNewsTopics.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 border-t border-white/4">
                  <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest mr-1 shrink-0 flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" />
                    Hot in News:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTopic('All')}
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all cursor-pointer ${
                      selectedTopic === 'All'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-white/2 hover:bg-white/5 text-zinc-500 hover:text-zinc-300 border border-white/5'
                    }`}
                  >
                    All Topics
                  </button>
                  {dynamicNewsTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTopic(topic === selectedTopic ? 'All' : topic)}
                      className={`shrink-0 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all cursor-pointer ${
                        selectedTopic === topic
                          ? 'bg-orange-500 text-black font-black shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                          : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/20'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {/* Row 1: Multi-Launcher Platform Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mr-1 shrink-0">
                  Launchers:
                </span>
                {[
                  { id: 'All', label: 'All Stores', style: 'bg-neon-green text-black font-black' },
                  { id: 'Steam', label: 'Steam', style: 'bg-[#1b2838] text-[#66c0f4] border-[#66c0f4]/40' },
                  { id: 'Epic Games', label: 'Epic Games Store', style: 'bg-purple-950 text-purple-300 border-purple-500/40' },
                  { id: 'GOG', label: 'GOG Galaxy', style: 'bg-violet-950 text-violet-300 border-violet-500/40' },
                  { id: 'Xbox', label: 'Xbox Game Pass', style: 'bg-emerald-950 text-emerald-400 border-emerald-500/40' },
                ].map((launcher) => {
                  const isActive = selectedLauncher === launcher.id;
                  return (
                    <button
                      key={launcher.id}
                      type="button"
                      onClick={() => setSelectedLauncher(launcher.id)}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer border ${
                        isActive
                          ? `${launcher.style} shadow-[0_0_12px_rgba(255,255,255,0.15)]`
                          : 'bg-white/3 hover:bg-white/8 border-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {launcher.label}
                    </button>
                  );
                })}
              </div>

              {/* Row 2: Popular Queries */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                    className="shrink-0 px-2.5 py-0.5 rounded-md bg-white/3 hover:bg-white/8 border border-white/5 text-[9px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {seedStatus && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[10px] font-bold rounded-xl px-3 py-1.5 flex items-center gap-2 ${
                seedError
                  ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                  : 'text-neon-green bg-neon-green/10 border border-neon-green/20'
              }`}
            >
              {seedError
                ? <X className="w-3.5 h-3.5" />
                : <Check className="w-3.5 h-3.5" />}
              {seedStatus}
            </motion.div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'news' ? (
            /* DEDICATED PORTION: Live Gaming News & Articles */
            newsLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-16">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                  Aggregating Live Gaming News Feeds...
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Fetching latest dispatches from PC Gamer, Eurogamer, IGN, and Tom's Hardware
                </p>
              </div>
            ) : displayedNews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedNews.map((article) => {
                  const sourceStyle = SOURCE_COLORS[article.source] || {
                    bg: 'bg-white/10',
                    text: 'text-zinc-300',
                    border: 'border-white/15'
                  };
                  return (
                    <div
                      key={article.id}
                      className="group bg-white/2 hover:bg-white/5 border border-white/6 hover:border-white/15 rounded-2xl p-5 flex flex-col justify-between gap-3 transition-all duration-300 shadow-lg hover:shadow-cyan-950/20"
                    >
                      <div className="space-y-2.5">
                        {/* Top Outlet & Category Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border backdrop-blur-md ${sourceStyle.bg} ${sourceStyle.text} ${sourceStyle.border}`}
                            >
                              {article.source}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5 text-[8px] font-bold uppercase tracking-wider">
                              {article.category}
                            </span>
                          </div>
                          {article.pubDate && (
                            <span className="text-[8px] text-zinc-500 font-mono">
                              {article.pubDate.split(' ').slice(0, 4).join(' ')}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
                          {article.title}
                        </h3>

                        {/* Snippet Description */}
                        {article.description && (
                          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                            {article.description}
                          </p>
                        )}
                      </div>

                      {/* Footer External Read Link */}
                      <div className="pt-3 border-t border-white/4 flex items-center justify-between">
                        <span className="text-[9px] text-zinc-500 font-medium">
                          Verified Gaming Dispatch
                        </span>
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Read Story
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-16">
                <Newspaper className="w-10 h-10 mb-3 opacity-30 text-cyan-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  No news dispatches found
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Try another keyword or select "All" sources
                </p>
              </div>
            )
          ) : (
            /* GAMES PORTION: Featured & Trending Games */
            loading ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-16">
                <Loader2 className="w-8 h-8 text-neon-green animate-spin mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Loading Curated & Renowned Games...
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Searching Steam Store, Epic Games, GOG, and RAWG
                </p>
              </div>
            ) : displayedGames.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedGames.map((game) => {
                  const isInstalled = game.installations && game.installations.length > 0;
                  const hasBrokenImg = brokenImages[game.id];
                  const bannerSrc = hasBrokenImg ? null : (game.banner_url || game.cover_url);

                  return (
                    <div
                      key={game.id}
                      className="group bg-white/2 hover:bg-white/4 border border-white/6 hover:border-white/12 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
                    >
                      <div>
                        {/* Cover & Banner */}
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 mb-3 border border-white/5">
                          {bannerSrc ? (
                            <img
                              src={bannerSrc}
                              alt={game.title}
                              onError={() => setBrokenImages(prev => ({ ...prev, [game.id]: true }))}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-zinc-900 to-black p-4 text-center">
                              <Gamepad2 className="w-8 h-8 text-zinc-600 mb-1" />
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider line-clamp-1">
                                {game.title}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/20" />

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
                      <div className="pt-2 border-t border-white/4 flex items-center justify-between text-[9px] text-zinc-500">
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
                <p className="text-[10px] text-zinc-600 mt-1">Try another title or genre keyword</p>
              </div>
            ) : null
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DiscoverGamesModal;
