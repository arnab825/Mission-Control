/**
 * Mission Control — Distributed Library
 * DiscoverGamesModal.tsx: Dedicated Gaming Discovery & Live Intel Hub
 *
 * 1. Curated & Trending Games: High-profile AAA and acclaimed indie titles with verified artwork.
 * 2. Dedicated Live Gaming News: Real-time gaming news & hardware deep-dives from
 *    renowned outlets (PC Gamer, Eurogamer, IGN, Tom's Hardware) without touching user blogs.
 * 3. Launcher-aware live web discovery across Steam, Epic Games, GOG, and RAWG.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Sparkles, Check, Loader2, Globe, Flame, Gamepad2,
  Newspaper, ExternalLink, RefreshCw, ArrowLeftRight, Swords, Crosshair, Compass,
  Clock, ArrowRight, CornerDownLeft
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
  'Steam':            { bg: 'bg-[#1b2838]/80', text: 'text-[#66c0f4]', border: 'border-[#66c0f4]/30' },
  'Epic Games':       { bg: 'bg-purple-950/80', text: 'text-purple-300', border: 'border-purple-500/30' },
  'GOG Galaxy':       { bg: 'bg-violet-950/80', text: 'text-violet-300', border: 'border-violet-500/30' },
  'GOG':              { bg: 'bg-violet-950/80', text: 'text-violet-300', border: 'border-violet-500/30' },
  'Xbox':             { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Xbox Game Pass':   { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'EA App':           { bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-500/30' },
  'EA Desktop':       { bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-500/30' },
  'EA':               { bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-500/30' },
  'Ubisoft Connect':  { bg: 'bg-blue-950/80', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Ubisoft':          { bg: 'bg-blue-950/80', text: 'text-blue-400', border: 'border-blue-500/30' },
  'PlayStation':      { bg: 'bg-sky-950/80', text: 'text-sky-400', border: 'border-sky-500/30' },
  'PlayStation PC':   { bg: 'bg-sky-950/80', text: 'text-sky-400', border: 'border-sky-500/30' },
  'Rockstar Games':   { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Rockstar':         { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Battle.net':       { bg: 'bg-cyan-950/80', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'Web':              { bg: 'bg-zinc-800/80', text: 'text-zinc-300', border: 'border-zinc-500/30' },
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
  // ── STEAM & EPIC ────────────────────────────────────────────────────────────
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
    launchers: ['Steam', 'GOG Galaxy', 'Epic Games'],
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
    launchers: ['Steam', 'GOG Galaxy'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },

  // ── ROCKSTAR GAMES ──────────────────────────────────────────────────────────
  {
    id: 'gta-v',
    title: 'Grand Theft Auto V',
    developer: 'Rockstar North',
    publisher: 'Rockstar Games',
    release_date: '2015-04-14',
    primary_genre: 'Open World Action',
    genres: ['Action', 'Open World', 'Shooter', 'Rockstar Games'],
    tags: ['Crime', 'Multiplayer', 'Automobile', 'Rockstar Games'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg',
    summary: 'When a young street hustler, a retired bank robber, and a terrifying psychopath find themselves entangled with some of the most frightening and deranged elements of the criminal underworld.',
    store: 'Rockstar Games',
    store_app_id: '271590',
    launchers: ['Rockstar Games', 'Steam', 'Epic Games'],
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
    genres: ['Open World', 'Western', 'Action', 'Story Rich', 'Rockstar Games'],
    tags: ['Atmospheric', 'Horses', 'Realistic', 'Rockstar Games'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg',
    summary: 'Winner of over 175 Game of the Year Awards, Red Dead Redemption 2 is an epic tale of honor and loyalty at the dawn of the modern age in the American frontier.',
    store: 'Rockstar Games',
    store_app_id: '1174180',
    launchers: ['Rockstar Games', 'Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },

  // ── PLAYSTATION PC ──────────────────────────────────────────────────────────
  {
    id: 'god-of-war-ragnarok',
    title: 'God of War Ragnarök',
    developer: 'Santa Monica Studio',
    publisher: 'PlayStation Publishing LLC',
    release_date: '2024-09-19',
    primary_genre: 'Action Adventure',
    genres: ['Action', 'Adventure', 'Mythology', 'PlayStation'],
    tags: ['Cinematic', 'Story Rich', 'PlayStation PC', 'Sony'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2322010/header.jpg',
    summary: 'Kratos and Atreus embark on an epic and heartfelt voyage into the mythical realms as they struggle with holding on and letting go.',
    store: 'PlayStation',
    store_app_id: '2322010',
    launchers: ['PlayStation', 'Steam', 'Epic Games'],
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
    genres: ['Action', 'Open World', 'Samurai', 'Stealth', 'PlayStation'],
    tags: ['Atmospheric', 'Swordplay', 'PlayStation PC', 'Sony'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2215430/header.jpg',
    summary: 'A storm is coming. Venture through Tsushima as Jin Sakai, defying samurai tradition to forge the path of the Ghost and liberate Japan from Mongol invaders.',
    store: 'PlayStation',
    store_app_id: '2215430',
    launchers: ['PlayStation', 'Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'spiderman-remastered',
    title: "Marvel's Spider-Man Remastered",
    developer: 'Insomniac Games / Nixxes',
    publisher: 'PlayStation Publishing LLC',
    release_date: '2022-08-12',
    primary_genre: 'Superhero Action',
    genres: ['Action', 'Open World', 'Superhero', 'PlayStation'],
    tags: ['PlayStation PC', 'Sony', 'Marvel', 'Web-Slinging'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1817070/header.jpg',
    summary: 'Play as an experienced Peter Parker fighting iconic Marvel villains across vibrant open-world New York.',
    store: 'PlayStation',
    store_app_id: '1817070',
    launchers: ['PlayStation', 'Steam', 'Epic Games'],
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
    genres: ['Action', 'Shooter', 'Third-Person', 'Co-op', 'PlayStation'],
    tags: ['Multiplayer', 'Sci-Fi', 'PlayStation PC', 'Sony'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg',
    summary: 'The Galaxy\'s Last Line of Offence. Enlist in the Helldivers and join the fight for freedom across a hostile galaxy in a fast, frantic, and ferocious third-person shooter.',
    store: 'PlayStation',
    store_app_id: '553850',
    launchers: ['PlayStation', 'Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },

  // ── EA APP / ELECTRONIC ARTS ────────────────────────────────────────────────
  {
    id: 'ea-fc-25',
    title: 'EA SPORTS FC 25',
    developer: 'EA Vancouver & EA Romania',
    publisher: 'Electronic Arts',
    release_date: '2024-09-27',
    primary_genre: 'Sports & Football',
    genres: ['Sports', 'Football', 'Simulation', 'EA App'],
    tags: ['EA App', 'Multiplayer', 'Competitive', 'Ultimate Team'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2669320/header.jpg',
    summary: 'EA SPORTS FC 25 gives you more ways to win for the club with 5v5 Rush, tactical overhaul via FC IQ, and official club licensing.',
    store: 'EA App',
    store_app_id: '2669320',
    launchers: ['EA App', 'Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'apex-legends',
    title: 'Apex Legends',
    developer: 'Respawn Entertainment',
    publisher: 'Electronic Arts',
    release_date: '2020-11-05',
    primary_genre: 'Battle Royale',
    genres: ['Action', 'Battle Royale', 'FPS', 'Multiplayer', 'EA App'],
    tags: ['Hero Shooter', 'Free to Play', 'EA App'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg',
    summary: 'Conquer with character in Apex Legends, a free-to-play battle royale hero shooter where legendary characters with powerful abilities team up to battle for fame & fortune.',
    store: 'EA App',
    store_app_id: '1172470',
    launchers: ['EA App', 'Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'jedi-survivor',
    title: 'STAR WARS Jedi: Survivor',
    developer: 'Respawn Entertainment',
    publisher: 'Electronic Arts',
    release_date: '2023-04-28',
    primary_genre: 'Action Adventure',
    genres: ['Action', 'Adventure', 'Sci-Fi', 'EA App'],
    tags: ['Star Wars', 'Lightsaber', 'EA App', 'Soulslike'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1774580/header.jpg',
    summary: 'The story of Cal Kestis continues in STAR WARS Jedi: Survivor, a third-person, galaxy-spanning action-adventure game from Respawn Entertainment.',
    store: 'EA App',
    store_app_id: '1774580',
    launchers: ['EA App', 'Steam', 'Epic Games'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },

  // ── UBISOFT CONNECT ─────────────────────────────────────────────────────────
  {
    id: 'ac-mirage',
    title: "Assassin's Creed Mirage",
    developer: 'Ubisoft Bordeaux',
    publisher: 'Ubisoft',
    release_date: '2023-10-05',
    primary_genre: 'Stealth Action',
    genres: ['Action', 'Stealth', 'Open World', 'Ubisoft Connect'],
    tags: ['Parkour', 'Assassins', 'Ubisoft Connect', 'Historical'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2844890/header.jpg',
    summary: 'Experience the story of Basim, a cunning street thief with nightmarish visions, seeking answers and justice in ninth-century Baghdad.',
    store: 'Ubisoft Connect',
    store_app_id: '2844890',
    launchers: ['Ubisoft Connect', 'Epic Games', 'Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'r6-siege',
    title: "Tom Clancy's Rainbow Six Siege",
    developer: 'Ubisoft Montreal',
    publisher: 'Ubisoft',
    release_date: '2015-12-01',
    primary_genre: 'Tactical Shooter',
    genres: ['Tactical Shooter', 'FPS', 'Multiplayer', 'Ubisoft Connect'],
    tags: ['Competitive', 'Tactical', 'Destruction', 'Ubisoft Connect'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/359550/header.jpg',
    summary: 'Master the art of destruction and gadgetry in Tom Clancy’s Rainbow Six Siege. Face intense close-quarters combat, tactical team play, and explosive action.',
    store: 'Ubisoft Connect',
    store_app_id: '359550',
    launchers: ['Ubisoft Connect', 'Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },

  // ── BATTLE.NET ──────────────────────────────────────────────────────────────
  {
    id: 'diablo-4',
    title: 'Diablo IV',
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    release_date: '2023-06-05',
    primary_genre: 'Action RPG',
    genres: ['Action RPG', 'Hack and Slash', 'Dark Fantasy', 'Battle.net'],
    tags: ['Loot', 'Multiplayer', 'Battle.net', 'Blizzard'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2344520/header.jpg',
    summary: 'The endless battle between the High Heavens and the Burning Hells rages on. Create your hero and embark on a dark adventure across Sanctuary.',
    store: 'Battle.net',
    store_app_id: '2344520',
    launchers: ['Battle.net', 'Steam', 'Xbox Game Pass'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },
  {
    id: 'overwatch-2',
    title: 'Overwatch 2',
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    release_date: '2022-10-04',
    primary_genre: 'Hero Shooter',
    genres: ['FPS', 'Hero Shooter', 'Multiplayer', 'Battle.net'],
    tags: ['Free to Play', 'Team-Based', 'Battle.net', 'Blizzard'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2357570/header.jpg',
    summary: 'An optimistic future worth fighting for in this team-based action title featuring an ever-expanding roster of unique heroes and global combat arenas.',
    store: 'Battle.net',
    store_app_id: '2357570',
    launchers: ['Battle.net', 'Steam'],
    in_catalog: true,
    ai_classified: true,
    installations: [],
  },

  // ── XBOX GAME PASS ──────────────────────────────────────────────────────────
  {
    id: 'forza-horizon-5',
    title: 'Forza Horizon 5',
    developer: 'Playground Games',
    publisher: 'Xbox Game Studios',
    release_date: '2021-11-09',
    primary_genre: 'Open World Racing',
    genres: ['Racing', 'Open World', 'Driving', 'Xbox Game Pass'],
    tags: ['Automobile', 'Multiplayer', 'Scenic', 'Xbox Game Pass'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg',
    summary: 'Your Ultimate Horizon Adventure awaits! Explore the vibrant and ever-evolving open world landscapes of Mexico with limitless driving action in hundreds of great cars.',
    store: 'Xbox Game Pass',
    store_app_id: '1551360',
    launchers: ['Xbox Game Pass', 'Steam'],
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
    tags: ['Mature', 'Magic', 'Adventure', 'GOG Galaxy'],
    banner_url: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg',
    summary: 'You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will.',
    store: 'Steam',
    store_app_id: '292030',
    launchers: ['Steam', 'GOG Galaxy', 'Epic Games'],
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
    tags: ['Fast-Paced', 'Isometric', 'Great Soundtrack', 'Epic Games'],
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

// Global in-memory LRU search cache (TTL: 30 minutes) to eliminate redundant requests & protect Supabase free-tier limits
const SEARCH_CACHE = new Map<string, { timestamp: number; data: DiscoverItem[] }>();
const CLIENT_CACHE_TTL = 30 * 60 * 1000;

function getCachedSearchResults(key: string): DiscoverItem[] | null {
  const norm = key.trim().toLowerCase();
  const hit = SEARCH_CACHE.get(norm);
  if (hit && Date.now() - hit.timestamp < CLIENT_CACHE_TTL) {
    return hit.data;
  }
  try {
    const raw = sessionStorage.getItem(`mc_search_${norm}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.timestamp < CLIENT_CACHE_TTL) {
        SEARCH_CACHE.set(norm, parsed);
        return parsed.data;
      }
    }
  } catch (_) {}
  return null;
}

function setCachedSearchResults(key: string, data: DiscoverItem[]) {
  const norm = key.trim().toLowerCase();
  const entry = { timestamp: Date.now(), data };
  SEARCH_CACHE.set(norm, entry);
  try {
    sessionStorage.setItem(`mc_search_${norm}`, JSON.stringify(entry));
  } catch (_) {}
}

const DiscoverGamesModal: React.FC<DiscoverGamesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('trending');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoverItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [seedError, setSeedError] = useState(false);

  // Google-Style Search & Suggestions State
  const [suggestions, setSuggestions] = useState<DiscoverItem[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mc_recent_game_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSupabaseCallRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dedicated News State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedLauncher, setSelectedLauncher] = useState<string>('All');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [selectedGame, setSelectedGame] = useState<DiscoverItem | null>(null);
  const [activeLauncherMap, setActiveLauncherMap] = useState<Record<string, string>>({});

  const getGameActiveLauncher = (game: DiscoverItem): string => {
    if (activeLauncherMap[game.id]) {
      return activeLauncherMap[game.id];
    }
    if (selectedLauncher !== 'All' && game.launchers?.includes(selectedLauncher)) {
      return selectedLauncher;
    }
    // Default to Steam if available, otherwise game.store or first available launcher
    if (game.launchers?.includes('Steam')) {
      return 'Steam';
    }
    return game.store || game.launchers?.[0] || 'Steam';
  };

  const handleOpenStore = (
    e: React.MouseEvent,
    game: DiscoverItem,
    mode: 'steam_client' | 'web' = 'steam_client',
    overrideLauncher?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const targetLauncher = overrideLauncher || getGameActiveLauncher(game);

    const isGOG = targetLauncher === 'GOG Galaxy' || targetLauncher === 'GOG';
    const isEpic = targetLauncher === 'Epic Games' || targetLauncher === 'Epic';
    const isXbox = targetLauncher === 'Xbox' || targetLauncher === 'Xbox Game Pass';
    const isEA = targetLauncher === 'EA App' || targetLauncher === 'EA Desktop' || targetLauncher === 'EA' || targetLauncher === 'Origin';
    const isUbisoft = targetLauncher === 'Ubisoft Connect' || targetLauncher === 'Ubisoft' || targetLauncher === 'Uplay';
    const isPlaystation = targetLauncher === 'PlayStation' || targetLauncher === 'PlayStation PC' || targetLauncher === 'PS PC' || targetLauncher === 'Sony';
    const isRockstar = targetLauncher === 'Rockstar Games' || targetLauncher === 'Rockstar';
    const isBattlenet = targetLauncher === 'Battle.net' || targetLauncher === 'Blizzard';

    let webUrl = '';
    let clientProtocolUrl: string | null = null;

    if (isGOG) {
      webUrl = `https://www.gog.com/en/game/${game.store_app_id || encodeURIComponent(game.title)}`;
      clientProtocolUrl = game.store_app_id ? `goggalaxy://openGameView/${game.store_app_id}` : null;
    } else if (isEpic) {
      webUrl = `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(game.title)}`;
      clientProtocolUrl = game.store_app_id ? `com.epicgames.launcher://apps/${game.store_app_id}?action=browse` : null;
    } else if (isXbox) {
      webUrl = `https://www.xbox.com/en-us/games/store/search?q=${encodeURIComponent(game.title)}`;
      clientProtocolUrl = `ms-windows-store://search/?query=${encodeURIComponent(game.title)}`;
    } else if (isEA) {
      webUrl = `https://www.ea.com/games/library/browse?search=${encodeURIComponent(game.title)}`;
      clientProtocolUrl = game.store_app_id ? `eaapp://launch/${game.store_app_id}` : 'eaapp://';
    } else if (isUbisoft) {
      webUrl = `https://store.ubisoft.com/search?q=${encodeURIComponent(game.title)}`;
      clientProtocolUrl = game.store_app_id ? `uplay://launch/${game.store_app_id}/0` : 'uplay://';
    } else if (isPlaystation) {
      webUrl = `https://store.playstation.com/en-us/search/${encodeURIComponent(game.title)}`;
      clientProtocolUrl = null;
    } else if (isRockstar) {
      webUrl = `https://store.rockstargames.com/search?q=${encodeURIComponent(game.title)}`;
      clientProtocolUrl = 'rockstar://';
    } else if (isBattlenet) {
      webUrl = `https://shop.battle.net/search?q=${encodeURIComponent(game.title)}`;
      clientProtocolUrl = 'battlenet://';
    } else {
      // Default: Steam
      webUrl = game.store_app_id
        ? `https://store.steampowered.com/app/${game.store_app_id}`
        : `https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}`;
      clientProtocolUrl = game.store_app_id ? `steam://store/${game.store_app_id}` : null;
    }

    const targetUrl = mode === 'steam_client' && clientProtocolUrl ? clientProtocolUrl : webUrl;

    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(targetUrl).catch(() => {
        (window as any).electronAPI?.openExternal?.(webUrl);
      });
    } else {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Fetch Live Gaming News (from Electron IPC, dev proxy, or live RSS)
  const loadGamingNews = async () => {
    setNewsLoading(true);
    try {
      // 1. Electron Desktop IPC
      if (typeof window !== 'undefined' && window.electronAPI?.fetchGamingNews) {
        try {
          const res = await window.electronAPI.fetchGamingNews();
          if (res && res.success && Array.isArray(res.items) && res.items.length > 0) {
            setNewsItems(res.items);
            return;
          }
        } catch (_) {}
      }

      // 2. Vite Dev Server News Proxy (works in browser & desktop without CORS)
      try {
        const localRes = await fetch('/api/gaming-news');
        if (localRes.ok) {
          const data = await localRes.json();
          if (data && data.success && Array.isArray(data.items) && data.items.length > 0) {
            setNewsItems(data.items);
            return;
          }
        }
      } catch (_) {}

      // 3. Fallback: Direct browser fetch from RSS proxy
      try {
        const fallbackRes = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.pcgamer.com%2Frss%2F');
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const parsed: NewsItem[] = (data.items || []).map((item: any) => ({
            id: item.link || String(Math.random()),
            title: item.title || 'Gaming News Dispatch',
            link: item.link || 'https://www.pcgamer.com/news/',
            description: (item.description || '').replace(/<[^>]*>/g, '').trim().slice(0, 200) + '...',
            source: 'PC Gamer',
            category: 'Gaming',
            pubDate: item.pubDate || 'Recent',
            imageUrl: item.thumbnail || item.enclosure?.link,
          }));
          if (parsed.length > 0) {
            setNewsItems(parsed);
            return;
          }
        }
      } catch (_) {}

      // 4. Standby curated news baseline with 100% verified URLs that never 404
      setNewsItems([
        {
          id: 'news-pcgamer-verified',
          title: "PC Gamer: Breaking News, Hardware Benchmarks, and Exclusive Game Previews",
          link: 'https://www.pcgamer.com/news/',
          description: 'The global authority on PC gaming. Real-time industry updates, GPU performance analyses, patch notes, and Steam trending titles.',
          source: 'PC Gamer',
          category: 'Gaming',
          pubDate: 'Live Feed',
        },
        {
          id: 'news-eurogamer-verified',
          title: "Eurogamer: Latest Game Reviews, Guides, and Next-Gen Hardware Intel",
          link: 'https://www.eurogamer.net/news',
          description: 'Comprehensive reporting across PlayStation, Xbox, Nintendo, and PC with authoritative reviews and verified release schedules.',
          source: 'Eurogamer',
          category: 'Gaming',
          pubDate: 'Live Feed',
        },
        {
          id: 'news-tomshardware-verified',
          title: "Tom's Hardware: Real-Time GPU, CPU, and Gaming Hardware Dispatches",
          link: 'https://www.tomshardware.com/news',
          description: 'Deep architectural coverage of NVIDIA RTX, AMD Radeon, and Intel processors, alongside component pricing trackers and deals.',
          source: "Tom's Hardware",
          category: 'Hardware',
          pubDate: 'Live Feed',
        },
        {
          id: 'news-kotaku-verified',
          title: "Kotaku: Gaming Culture, Developer Leaks, and In-Depth Editorial Coverage",
          link: 'https://kotaku.com/news',
          description: 'Inside reports on upcoming AAA releases, indie sensations, patch breakdowns, and gaming industry developments.',
          source: 'Kotaku',
          category: 'Gaming',
          pubDate: 'Live Feed',
        },
        {
          id: 'news-polygon-verified',
          title: "Polygon: Features, Game Recommendations, and Modern Entertainment News",
          link: 'https://www.polygon.com/news',
          description: 'Critical analysis of contemporary gaming culture, award-winning releases, and cross-platform adaptations.',
          source: 'Polygon',
          category: 'Gaming',
          pubDate: 'Live Feed',
        }
      ]);
    } catch {
      setNewsItems([
        {
          id: 'news-pcgamer-verified',
          title: "PC Gamer: Breaking News, Hardware Benchmarks, and Exclusive Game Previews",
          link: 'https://www.pcgamer.com/news/',
          description: 'The global authority on PC gaming. Real-time industry updates, GPU performance analyses, patch notes, and Steam trending titles.',
          source: 'PC Gamer',
          category: 'Gaming',
          pubDate: 'Live Feed',
        }
      ]);
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
      }

      // If no launcher items from IPC, fetch live from official Steam Store API directly
      if (dynamicLauncherList.length === 0) {
        try {
          const sRes = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=us&l=en');
          if (sRes.ok) {
            const sData = await sRes.json();
            const topSellers = sData.top_sellers?.items || [];
            const specials = sData.specials?.items || [];
            const seen = new Set<string>();

            const addLiveSteam = (item: any, tag: string) => {
              if (!item?.id || !item?.name || seen.has(item.name.toLowerCase())) return;
              if (/Soundtrack|Valve Index|Steam Deck|Controller/i.test(item.name)) return;
              seen.add(item.name.toLowerCase());
              const imgUrl = item.header_image || `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`;
              dynamicLauncherList.push({
                id: `steam-${item.id}`,
                title: item.name,
                developer: 'Steam Verified',
                publisher: 'Steam Partner',
                release_date: new Date().getFullYear().toString(),
                primary_genre: tag,
                genres: ['Action', tag, 'Steam'],
                tags: [tag, 'Steam Official'],
                cover_url: imgUrl,
                banner_url: imgUrl,
                summary: item.discount_percent > 0
                  ? `Steam Special Offer — currently ${item.discount_percent}% off on Steam Store.`
                  : `Trending official release on the Steam Store.`,
                store: 'Steam',
                store_app_id: String(item.id),
                launchers: ['Steam'],
                in_catalog: true,
                ai_classified: true,
                installations: [],
              });
            };

            topSellers.slice(0, 8).forEach((item: any) => addLiveSteam(item, 'Top Seller'));
            specials.slice(0, 6).forEach((item: any) => addLiveSteam(item, 'Special Deal'));
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

  // Google-Style Instant Multi-Source Query Engine
  const executeGameQuery = async (queryTerm: string): Promise<DiscoverItem[]> => {
    const clean = queryTerm.trim();
    if (!clean) return [];

    // 1. Tier 1: In-Memory / Session Storage Cache (0ms, 0 Network, 0 Supabase cost)
    const cached = getCachedSearchResults(clean);
    if (cached && cached.length > 0) {
      return cached;
    }

    const termLower = clean.toLowerCase();
    let combinedResults: DiscoverItem[] = [];
    const seenIds = new Set<string>();

    // 2. Tier 2: Real-time Public Store API (Electron IPC or Direct Steam Store Search - Zero Supabase Egress)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.searchGamesLive) {
        const liveRes = await window.electronAPI.searchGamesLive(clean);
        if (liveRes && liveRes.success && Array.isArray(liveRes.games) && liveRes.games.length > 0) {
          liveRes.games.forEach((g: DiscoverItem) => {
            if (!seenIds.has(g.id)) {
              seenIds.add(g.id);
              combinedResults.push(g);
            }
          });
        }
      } else {
        // Direct browser fetch from Steam Store Search API
        const sRes = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(clean)}&l=english&cc=US`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData?.items && Array.isArray(sData.items)) {
            sData.items.forEach((item: any) => {
              const appId = String(item.id);
              const id = `steam-${appId}`;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const banner = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
                combinedResults.push({
                  id,
                  title: item.name,
                  developer: 'Steam Verified',
                  publisher: 'Steam Partner',
                  release_date: new Date().getFullYear().toString(),
                  primary_genre: item.metascore ? `Metascore ${item.metascore}` : 'Steam Store',
                  genres: ['Action', 'Steam Store'],
                  tags: ['Steam Store', item.metascore ? `Metascore: ${item.metascore}` : 'Verified'],
                  cover_url: banner,
                  banner_url: banner,
                  summary: item.price
                    ? `Official Steam Release. Available now on Steam Store (${(item.price.final / 100).toFixed(2)} ${item.price.currency}).`
                    : `Official Steam title matching "${clean}".`,
                  store: 'Steam',
                  store_app_id: appId,
                  launchers: ['Steam'],
                  in_catalog: true,
                  ai_classified: true,
                  installations: [],
                });
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn('[SearchEngine] Public store search error:', err);
    }

    // 3. Match from Curated Featured Games as instant high-fidelity additions
    CURATED_FEATURED_GAMES.forEach((g) => {
      if (!seenIds.has(g.id)) {
        if (
          g.title.toLowerCase().includes(termLower) ||
          g.developer?.toLowerCase().includes(termLower) ||
          g.primary_genre?.toLowerCase().includes(termLower) ||
          g.tags.some(t => t.toLowerCase().includes(termLower))
        ) {
          seenIds.add(g.id);
          combinedResults.push(g);
        }
      }
    });

    // 4. Tier 3: Supabase / Distributed Server Fallback (Throttled & Lightweight)
    // Only query if results are scarce (< 4) to protect free-tier quotas
    if (combinedResults.length < 4) {
      try {
        const now = Date.now();
        if (now - lastSupabaseCallRef.current > 4000) { // Max 1 request per 4s
          lastSupabaseCallRef.current = now;
          const remoteRes = await fetchWithFailover(`/api/games/discover?q=${encodeURIComponent(clean)}&limit=12`);
          if (remoteRes.ok) {
            const data = await remoteRes.json();
            const remoteItems = data.results || [];
            remoteItems.forEach((g: any) => {
              if (!seenIds.has(g.id)) {
                seenIds.add(g.id);
                combinedResults.push(g);
              }
            });
          }
        }
      } catch (_) {}
    }

    // Cache the merged results
    if (combinedResults.length > 0) {
      setCachedSearchResults(clean, combinedResults);
    }

    return combinedResults;
  };

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches(prev => {
      const next = [clean, ...prev.filter(t => t.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem('mc_recent_game_searches', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const next = prev.filter(t => t !== term);
      try {
        localStorage.setItem('mc_recent_game_searches', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const clearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('mc_recent_game_searches');
    } catch (_) {}
  };

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      loadPopularCatalog();
      return;
    }
    setLoading(true);
    setHasSearched(true);
    setIsSuggestOpen(false);
    saveRecentSearch(searchTerm);
    try {
      const queryResults = await executeGameQuery(searchTerm);
      setResults(queryResults.length > 0 ? queryResults : CURATED_FEATURED_GAMES);
    } catch {
      const term = searchTerm.toLowerCase();
      setResults(CURATED_FEATURED_GAMES.filter(g => g.title.toLowerCase().includes(term)));
    } finally {
      setLoading(false);
    }
  };

  // Google-Style Debounced Auto-complete
  useEffect(() => {
    if (activeTab === 'news' || !query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setIsSuggestLoading(false);
      setFocusedIndex(-1);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSuggestLoading(true);
      try {
        const queryResults = await executeGameQuery(query);
        setSuggestions(queryResults.slice(0, 6));
        setIsSuggestOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSuggestLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, activeTab]);

  // Click outside to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSuggestOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && suggestions[focusedIndex]) {
        e.preventDefault();
        const selected = suggestions[focusedIndex];
        setIsSuggestOpen(false);
        saveRecentSearch(selected.title);
        setSelectedGame(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSuggestOpen(false);
      setFocusedIndex(-1);
    }
  };

  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="text-neon-green font-black">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
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
        className="relative z-10 w-full max-w-5xl h-[88vh] bg-zinc-950/98 border border-white/8 rounded-3xl flex flex-col overflow-hidden shadow-2xl transform-gpu will-change-transform"
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
          <div ref={searchContainerRef} className="relative">
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
                onFocus={() => {
                  if (query.trim().length >= 2 && suggestions.length > 0) {
                    setIsSuggestOpen(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeTab === 'news'
                    ? "Filter news articles by headline or keyword (e.g. 'PlayStation', 'RTX', 'Update')..."
                    : "Search games across Steam, Epic, GOG & RAWG (e.g. 'Cyberpunk', 'Elden Ring')..."
                }
                className="w-full bg-black/40 border border-white/10 focus:border-neon-green/40 focus:shadow-[0_0_20px_rgba(118,185,0,0.15)] rounded-2xl pl-11 pr-36 py-3 text-xs font-semibold text-white placeholder-zinc-500 outline-none transition-all"
                autoFocus
              />

              {/* Clear button when query is present */}
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                    setIsSuggestOpen(false);
                    setFocusedIndex(-1);
                    if (hasSearched) {
                      loadPopularCatalog();
                    }
                  }}
                  className="absolute right-28 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Submit button */}
              {activeTab !== 'news' && (
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-neon-green hover:bg-neon-green/90 text-black font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-[0_0_12px_rgba(118,185,0,0.2)] flex items-center gap-1.5"
                >
                  {loading || isSuggestLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Search Web</span>
                  )}
                </button>
              )}
            </form>

            {/* Google-Style Instant Floating Suggestions Dropdown */}
            <AnimatePresence>
              {isSuggestOpen && suggestions.length > 0 && activeTab !== 'news' && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.99 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-[#0c0e15]/95 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(118,185,0,0.12)] overflow-hidden"
                >
                  <div className="p-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                    {suggestions.map((game, idx) => {
                      const isFocused = idx === focusedIndex;
                      const banner = game.banner_url || game.cover_url;
                      return (
                        <div
                          key={game.id}
                          onMouseEnter={() => setFocusedIndex(idx)}
                          onClick={() => {
                            saveRecentSearch(game.title);
                            setIsSuggestOpen(false);
                            setSelectedGame(game);
                          }}
                          className={`flex items-center justify-between gap-3 p-2 rounded-xl transition-all cursor-pointer ${
                            isFocused
                              ? 'bg-neon-green/15 border border-neon-green/30 text-white pl-3 shadow-[0_0_15px_rgba(118,185,0,0.15)]'
                              : 'hover:bg-white/5 border border-transparent text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Tiny capsule banner */}
                            <div className="w-14 h-8 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 relative">
                              {banner ? (
                                <img src={banner} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                  <Gamepad2 className="w-3.5 h-3.5 text-zinc-600" />
                                </div>
                              )}
                            </div>

                            {/* Title & Metadata */}
                            <div className="min-w-0">
                              <h4 className="text-xs font-black truncate leading-tight">
                                {renderHighlightedText(game.title, query)}
                              </h4>
                              <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono mt-0.5 truncate">
                                <span className="text-neon-green/80 font-bold uppercase">{game.primary_genre || 'Game'}</span>
                                {game.release_date && (
                                  <>
                                    <span>·</span>
                                    <span>{game.release_date.split('-')[0]}</span>
                                  </>
                                )}
                                {game.developer && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{game.developer}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick launcher action buttons */}
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {game.store_app_id && (() => {
                              const activeLauncher = getGameActiveLauncher(game);
                              const isGOG = activeLauncher === 'GOG Galaxy' || activeLauncher === 'GOG';
                              const isEpic = activeLauncher === 'Epic Games' || activeLauncher === 'Epic';
                              const isXbox = activeLauncher === 'Xbox' || activeLauncher === 'Xbox Game Pass';

                              let btnClass = 'bg-[#172030] hover:bg-[#203048] text-[#66c0f4] border-[#66c0f4]/30';
                              let label = 'Steam';
                              if (isGOG) {
                                btnClass = 'bg-violet-950/70 hover:bg-violet-900 text-violet-300 border-violet-500/40';
                                label = 'GOG';
                              } else if (isEpic) {
                                btnClass = 'bg-purple-950/70 hover:bg-purple-900 text-purple-300 border-purple-500/40';
                                label = 'Epic';
                              } else if (isXbox) {
                                btnClass = 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40';
                                label = 'Xbox';
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenStore(e, game, 'steam_client', activeLauncher)}
                                  className={`p-1.5 rounded-lg hover:text-white border text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${btnClass}`}
                                  title={`Launch directly in ${label} client`}
                                >
                                  <Gamepad2 className="w-3 h-3" />
                                  <span className="hidden sm:inline text-[8px]">{label}</span>
                                </button>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={() => {
                                saveRecentSearch(game.title);
                                setIsSuggestOpen(false);
                                setSelectedGame(game);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-neon-green/20 text-zinc-400 hover:text-neon-green border border-white/10 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              title="Inspect full game details"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dropdown keyboard navigation hints */}
                  <div className="px-3 py-1.5 bg-black/40 border-t border-white/6 flex items-center justify-between text-[8px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1">
                      <CornerDownLeft className="w-2.5 h-2.5 text-neon-green" /> Press <strong className="text-zinc-300">Enter</strong> to inspect
                    </span>
                    <span>Use <strong className="text-zinc-300">↑ ↓</strong> to navigate · <strong className="text-zinc-300">Esc</strong> to close</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
                  { id: 'EA App', label: 'EA App', style: 'bg-red-950 text-red-400 border-red-500/40' },
                  { id: 'Ubisoft Connect', label: 'Ubisoft Connect', style: 'bg-blue-950 text-blue-400 border-blue-500/40' },
                  { id: 'PlayStation', label: 'PlayStation PC', style: 'bg-sky-950 text-sky-400 border-sky-500/40' },
                  { id: 'Rockstar Games', label: 'Rockstar Games', style: 'bg-amber-950 text-amber-400 border-amber-500/40' },
                  { id: 'Battle.net', label: 'Battle.net', style: 'bg-cyan-950 text-cyan-400 border-cyan-500/40' },
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

              {/* Row 2: Recent Searches (if any exist) */}
              {recentSearches.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mr-1 shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-zinc-400" />
                    Recent:
                  </span>
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => {
                        setQuery(term);
                        handleSearch(term);
                      }}
                      className="group/chip shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/4 hover:bg-neon-green/15 border border-white/8 hover:border-neon-green/30 text-[9px] font-medium text-zinc-400 hover:text-neon-green transition-all cursor-pointer"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(e, term)}
                        className="opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity"
                        title="Remove from history"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={clearAllRecent}
                    className="shrink-0 text-[8px] text-zinc-600 hover:text-zinc-400 underline font-mono ml-1 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Row 3: Popular Queries */}
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
                      onClick={() => setSelectedGame(game)}
                      className="group bg-white/2 hover:bg-white/4 border border-white/6 hover:border-neon-green/30 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer hover:scale-[1.01] shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transform-gpu will-change-transform"
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
                              decoding="async"
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

                          {/* Store Badge Interactive Switcher */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                            {game.launchers?.map((l) => {
                              const style = LAUNCHER_STYLES[l] || LAUNCHER_STYLES.Web;
                              const activeLauncher = getGameActiveLauncher(game);
                              const isSelected = activeLauncher === l;
                              const isMultiple = (game.launchers?.length || 0) > 1;

                              return (
                                <button
                                  key={l}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveLauncherMap(prev => ({ ...prev, [game.id]: l }));
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border backdrop-blur-md transition-all ${
                                    isSelected
                                      ? `${style.bg} ${style.text} ${style.border} ring-1.5 ring-white/70 shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-105`
                                      : `${style.bg} ${style.text} ${style.border} opacity-50 hover:opacity-90 hover:scale-100`
                                  } ${isMultiple ? 'cursor-pointer' : 'cursor-default'}`}
                                  title={isMultiple ? `Click to switch active launcher to ${l}` : l}
                                >
                                  {l}
                                </button>
                              );
                            })}
                          </div>

                          {/* Installed Indicator */}
                          {isInstalled && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase tracking-wider backdrop-blur-md flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
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

                      {/* Footer Status & Actions */}
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-[10px]">
                        <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                          <span className="font-mono text-[9px] text-neon-green/80 uppercase tracking-wider">
                            {game.tags?.[0] || game.genres?.[0] || game.primary_genre || 'Featured'}
                          </span>
                          {game.release_date && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="text-zinc-500 text-[9px] font-mono">
                                {game.release_date.split('-')[0]}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isInstalled ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Installed
                            </span>
                          ) : (
                            <>
                              {game.store_app_id && (() => {
                                const activeLauncher = getGameActiveLauncher(game);
                                const isGOG = activeLauncher === 'GOG Galaxy' || activeLauncher === 'GOG';
                                const isEpic = activeLauncher === 'Epic Games' || activeLauncher === 'Epic';
                                const isXbox = activeLauncher === 'Xbox' || activeLauncher === 'Xbox Game Pass';

                                let btnClass = 'bg-[#172030] hover:bg-[#1f2d42] text-[#66c0f4] border-[#66c0f4]/30';
                                let label = 'Steam';
                                if (isGOG) {
                                  btnClass = 'bg-violet-950/70 hover:bg-violet-900 text-violet-300 border-violet-500/40';
                                  label = 'GOG';
                                } else if (isEpic) {
                                  btnClass = 'bg-purple-950/70 hover:bg-purple-900 text-purple-300 border-purple-500/40';
                                  label = 'Epic';
                                } else if (isXbox) {
                                  btnClass = 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40';
                                  label = 'Xbox';
                                }

                                const hasMultiple = (game.launchers?.length || 0) > 1;

                                const cycleLauncher = (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!hasMultiple) return;
                                  const list = game.launchers || [];
                                  const currIdx = list.indexOf(activeLauncher);
                                  const nextIdx = (currIdx + 1) % list.length;
                                  setActiveLauncherMap(prev => ({ ...prev, [game.id]: list[nextIdx] }));
                                };

                                return (
                                  <div className="inline-flex items-center rounded-lg overflow-hidden border border-white/10 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenStore(e, game, 'steam_client', activeLauncher)}
                                      className={`px-2 py-1 hover:text-white text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${btnClass}`}
                                      title={`Open directly in ${label} client`}
                                    >
                                      <Gamepad2 className="w-2.5 h-2.5" />
                                      <span>{label}</span>
                                    </button>
                                    {hasMultiple && (
                                      <button
                                        type="button"
                                        onClick={cycleLauncher}
                                        className="px-1.5 py-1 bg-white/5 hover:bg-neon-green/20 text-zinc-400 hover:text-neon-green transition-all border-l border-white/10 cursor-pointer flex items-center justify-center group/swap"
                                        title={`Switch launcher: ${game.launchers?.join(' ⇄ ')}`}
                                      >
                                        <ArrowLeftRight className="w-2.5 h-2.5 group-hover/swap:scale-115 transition-transform" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                              <button
                                type="button"
                                onClick={(e) => handleOpenStore(e, game, 'web')}
                                className="group/btn px-2 py-1 rounded-lg bg-white/4 hover:bg-neon-green/15 text-zinc-400 hover:text-neon-green border border-white/8 hover:border-neon-green/30 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                title={`Open ${game.title} store page in browser`}
                              >
                                <span>Web</span>
                                <ExternalLink className="w-2.5 h-2.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Expanded In-App Game Intel Inspector Dialog */}
      <AnimatePresence>
        {selectedGame && (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xl z-70 flex items-center justify-center p-4 sm:p-6 select-none"
            onClick={() => setSelectedGame(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0e1017] border border-white/12 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(118,185,0,0.1)] flex flex-col max-h-[90vh]"
            >
              {/* Hero Banner Header */}
              <div className="relative aspect-21/9 bg-black/60 overflow-hidden border-b border-white/8 shrink-0">
                {selectedGame.banner_url || selectedGame.cover_url ? (
                  <img
                    src={selectedGame.banner_url || selectedGame.cover_url}
                    alt={selectedGame.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-linear-to-r from-zinc-900 to-black">
                    <Gamepad2 className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-[#0e1017] via-[#0e1017]/50 to-transparent" />

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Title and metadata on hero */}
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {selectedGame.launchers?.map((l) => {
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
                      {selectedGame.primary_genre && (
                        <span className="px-2 py-0.5 rounded-md bg-neon-green/10 text-neon-green border border-neon-green/30 text-[8px] font-bold uppercase tracking-wider backdrop-blur-md">
                          {selectedGame.primary_genre}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                      {selectedGame.title}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
                {/* Meta details row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/2 border border-white/6 font-mono text-[10px]">
                  <div>
                    <span className="text-zinc-500 block uppercase text-[8px] font-black">Developer</span>
                    <span className="text-zinc-200 truncate block font-bold">{selectedGame.developer || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase text-[8px] font-black">Release Date</span>
                    <span className="text-zinc-200 truncate block font-bold">{selectedGame.release_date || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-zinc-500 block uppercase text-[8px] font-black">Status</span>
                    <span className={selectedGame.installations?.length > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-400 font-bold'}>
                      {selectedGame.installations?.length > 0 ? 'Installed on Node' : 'Available for Acquisition'}
                    </span>
                  </div>
                </div>

                {/* Synopsis / Summary */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Game Intel & Synopsis
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-black/25 p-4 rounded-2xl border border-white/5 font-sans">
                    {selectedGame.summary || 'No synopsis provided for this title.'}
                  </p>
                </div>

                {/* Genre & Tags */}
                {((selectedGame.genres?.length || 0) > 0 || (selectedGame.tags?.length || 0) > 0) && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      Classifications & Tags
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set([...(selectedGame.genres || []), ...(selectedGame.tags || [])])).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-white/4 text-zinc-300 border border-white/8 text-[9px] font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 sm:p-6 bg-black/40 border-t border-white/8 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Back to Hub
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedGame.store_app_id && (() => {
                    const launchers = selectedGame.launchers && selectedGame.launchers.length > 0
                      ? selectedGame.launchers
                      : [getGameActiveLauncher(selectedGame)];

                    return launchers.map((launcher) => {
                      const isGOG = launcher === 'GOG Galaxy' || launcher === 'GOG';
                      const isEpic = launcher === 'Epic Games' || launcher === 'Epic';
                      const isXbox = launcher === 'Xbox' || launcher === 'Xbox Game Pass';

                      let btnClass = 'from-[#172030] to-[#1b2838] hover:from-[#1b2838] hover:to-[#223348] border-[#66c0f4]/40 text-[#66c0f4] shadow-[0_0_15px_rgba(102,192,244,0.2)] hover:shadow-[0_0_20px_rgba(102,192,244,0.4)]';
                      let label = 'Open in Steam Client';
                      if (isGOG) {
                        btnClass = 'from-violet-950 to-[#200f38] hover:from-[#200f38] hover:to-[#2e1550] border-violet-500/40 text-violet-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]';
                        label = 'Open in GOG Galaxy';
                      } else if (isEpic) {
                        btnClass = 'from-purple-950 to-[#280c28] hover:from-[#280c28] hover:to-[#381038] border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(217,70,239,0.2)] hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]';
                        label = 'Open in Epic Launcher';
                      } else if (isXbox) {
                        btnClass = 'from-emerald-950 to-[#0a2818] hover:from-[#0a2818] hover:to-[#0f3822] border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]';
                        label = 'Open in Xbox App';
                      }

                      return (
                        <button
                          key={launcher}
                          type="button"
                          onClick={(e) => handleOpenStore(e, selectedGame, 'steam_client', launcher)}
                          className={`group/client px-3.5 py-2 rounded-xl bg-linear-to-r hover:text-white border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${btnClass}`}
                        >
                          <Gamepad2 className="w-3.5 h-3.5 group-hover/client:rotate-12 transition-transform" />
                          <span>{label}</span>
                        </button>
                      );
                    });
                  })()}

                  <button
                    type="button"
                    onClick={(e) => handleOpenStore(e, selectedGame, 'web')}
                    className="px-4 py-2 rounded-xl bg-neon-green hover:bg-neon-green/90 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(118,185,0,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>View Store Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DiscoverGamesModal;
