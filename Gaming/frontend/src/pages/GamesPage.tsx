import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Fuse from 'fuse.js';
import AuthPage from './AuthPage';
import {
  Search,
  Play,
  RefreshCw,
  Gamepad2,
  Loader2,
  CheckCircle2,
  X,
  Cpu,
  Layers,
  Tag,
  ChevronDown,
  RefreshCcw,
  Filter,
  Terminal,
  Database,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TelemetryState } from '../types/telemetry';

// ── Types ──────────────────────────────────────────────────────────────────────
interface BackendGame {
  name: string;
  platform: string;
  id: string;
  install_path?: string;
  exe_path?: string;
  icon?: string;
  local_banner?: string; // Newly added
  features?: string[];
  genre?: string;
  type?: string;
  tags?: string[];
  source?: string;
}

export interface GamesPageProps {
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
  mode?: 'library' | 'auth';
  setMode?: (mode: 'library' | 'auth') => void;
}

// ── Platform color map ─────────────────────────────────────────────────────────
const PLATFORM_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Steam': { bg: 'bg-[#1b2838]/80', text: 'text-[#66c0f4]', border: 'border-[#66c0f4]/40' },
  'Epic Games': { bg: 'bg-[#2a1a3e]/80', text: 'text-[#c084fc]', border: 'border-[#c084fc]/40' },
  'EA Desktop': { bg: 'bg-[#1a2a3e]/80', text: 'text-[#ff6602]', border: 'border-[#ff6602]/40' },
  'Origin': { bg: 'bg-[#1a2a3e]/80', text: 'text-[#ff6602]', border: 'border-[#ff6602]/40' },
  'Ubisoft Connect': { bg: 'bg-[#1a2040]/80', text: 'text-[#38bdf8]', border: 'border-[#38bdf8]/40' },
  'Riot Games': { bg: 'bg-[#3e1a1a]/80', text: 'text-[#e84057]', border: 'border-[#e84057]/40' },
  'GOG Galaxy': { bg: 'bg-[#2a1a3e]/80', text: 'text-[#a855f7]', border: 'border-[#a855f7]/40' },
  'Battle.net': { bg: 'bg-[#1a2a40]/80', text: 'text-[#0cf]', border: 'border-[#0cf]/40' },
  'Xbox': { bg: 'bg-[#1a2e1a]/80', text: 'text-[#4ade80]', border: 'border-[#4ade80]/40' },
  'Rockstar Games': { bg: 'bg-[#2e1a1a]/80', text: 'text-[#f87171]', border: 'border-[#f87171]/40' },
  'Amazon Games': { bg: 'bg-[#2e2a1a]/80', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/40' },
  'Itch.io': { bg: 'bg-[#2e1a1a]/80', text: 'text-[#fa5c5c]', border: 'border-[#fa5c5c]/40' },
  'Humble Bundle': { bg: 'bg-[#2e2a1a]/80', text: 'text-[#fbbf24]', border: 'border-[#fbbf24]/40' },
  'Local': { bg: 'bg-white/[0.04]', text: 'text-zinc-400', border: 'border-white/10' },
};

function getPlatformStyle(platform: string) {
  return PLATFORM_STYLES[platform] || PLATFORM_STYLES['Local'];
}

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    'Epic Games': 'EPIC',
    'EA Desktop': 'EA',
    'Ubisoft Connect': 'UBI',
    'GOG Galaxy': 'GOG',
    'Battle.net': 'BNET',
    'Rockstar Games': 'ROCKSTAR',
    'Amazon Games': 'AMAZON',
    'Humble Bundle': 'HUMBLE',
    'Itch.io': 'ITCH',
    'Riot Games': 'RIOT',
  };
  return labels[platform] || platform.toUpperCase();
}

// ── Game Card ──────────────────────────────────────────────────────────────────

const GameCard: React.FC<{ game: BackendGame; sendCommand: (type: string, payload?: any) => void; isRtxGpu?: boolean; isNvidiaGpu?: boolean }> = ({ game, sendCommand }) => {
  const seed = encodeURIComponent(game.name);

  // High-fidelity cover art strategy: Local Banner > Steam Header > Local Icon > Generative Placeholder
  let coverUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0a0a0a&shape1Color=1a1a2e&shape2Color=16213e&shape3Color=0f3460`;

  // Robust launcher detection: Check type, genre, and platform name
  const isLauncher =
    game.type?.toUpperCase() === 'LAUNCHER' ||
    game.genre?.toUpperCase() === 'PLATFORM' ||
    ['Steam', 'Epic Games', 'Xbox', 'EA Desktop', 'Origin'].includes(game.platform) && game.name.toLowerCase().includes('app') ||
    game.name.toLowerCase() === game.platform.toLowerCase();

  const getLaunchUri = () => {
    if (game.platform === 'Steam' && game.id && !isLauncher) return `steam://rungameid/${game.id}`;
    if ((game.platform === 'Epic Games' || game.platform === 'Epic') && game.id && !isLauncher) return `com.epicgames.launcher://apps/${game.id}?action=launch&silent=true`;
    if ((game.platform === 'EA Desktop' || game.platform === 'Origin') && game.id && !isLauncher) return `origin://launchgame/${game.id}`;
    if (game.platform === 'Ubisoft Connect' && game.id && !isLauncher) return `uplay://launch/${game.id}`;
    if (game.platform === 'GOG Galaxy' && game.id && !isLauncher) return `goggalaxy://openGameView/${game.id}`;
    if (game.platform === 'Battle.net' && game.id && !isLauncher) return `battlenet://play/${game.id}`;
    if (game.exe_path) return game.exe_path;
    if (game.platform === 'Steam') return 'steam://open/main';
    if (game.platform === 'Epic Games' || game.platform === 'Epic') return 'com.epicgames.launcher://store';
    if (game.platform === 'EA Desktop' || game.platform === 'Origin') return 'origin://';
    if (game.platform === 'Ubisoft Connect') return 'uplay://';
    if (game.platform === 'GOG Galaxy') return 'goggalaxy://';
    if (game.platform === 'Battle.net') return 'battlenet://';
    if (game.platform === 'Xbox' || game.platform === 'Xbox App') return 'xbox:';
    return null;
  };

  const launchUri = getLaunchUri();

  const handleLaunch = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (launchUri) {
      if ((window as any).electronAPI?.launchGame) {
        (window as any).electronAPI.launchGame(launchUri);
      } else {
        sendCommand('launch_game', { exe_path: launchUri });
      }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group bg-white/[0.03] hover:border-neon-green/30 rounded-3xl overflow-hidden transition-all duration-500 border border-white/5 flex flex-col justify-between"
    >
      {/* Cover Image */}
      <div 
        onClick={handleLaunch}
        className="aspect-video relative overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer"
      >
        <img
          src={coverUrl}
          alt={game.name}
          className={`w-full h-full transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100 ${isLauncher ? 'object-contain p-8' : 'object-cover'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const fallbackIcon = game.icon && game.icon !== 'null' ? (game.icon.startsWith('http') ? game.icon : `asset:///${game.icon.replace(/\\/g, '/')}`) : null;
            const dicebearUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0a0a0a&shape1Color=1a1a2e&shape2Color=16213e&shape3Color=0f3460`;

            if (fallbackIcon && target.src !== fallbackIcon && target.src !== dicebearUrl) {
              target.src = fallbackIcon;
            } else if (target.src !== dicebearUrl) {
              target.src = dicebearUrl;
            }
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Platform Badge */}
        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg border backdrop-blur-md shadow-lg ${PLATFORM_STYLES[game.platform]?.bg || 'bg-white/10'} ${PLATFORM_STYLES[game.platform]?.text || 'text-white'} ${PLATFORM_STYLES[game.platform]?.border || 'border-white/20'}`}>
          <span className="text-[8px] font-black uppercase tracking-widest">{game.platform}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div 
            onClick={handleLaunch}
            className="min-h-10 cursor-pointer"
          >
            <h4 className="text-sm font-black text-white tracking-tight group-hover:text-neon-green transition-colors truncate leading-tight">
              {game.name}
            </h4>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              {game.genre === 'N/A' || !game.genre ? (game.type === 'LAUNCHER' ? 'GAMING PLATFORM' : 'GAME') : game.genre}
            </p>
          </div>

          {/* AI Genre/Mode Tags */}
          <div className="flex gap-1 flex-wrap min-h-4">
            {game.tags && game.tags.map((tag, i) => (
              <span key={`t-${i}`} className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 uppercase tracking-tighter border border-white/5">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button aria-label="button" type="button"
            onClick={handleLaunch}
            disabled={!launchUri}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neon-green hover:bg-[#8aff00] text-black font-black uppercase text-[9px] tracking-widest rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(118,185,0,0.25)] hover:shadow-[0_0_25px_rgba(118,185,0,0.45)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{launchUri ? 'Execute' : 'Unavailable'}</span>
          </button>

        </div>
      </div>
    </motion.div>
  );
};

const CacheLoadingScreen: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8">
    <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-10 flex flex-col items-center max-w-md w-full shadow-[0_0_50px_rgba(118, 185, 0,0.05)]">
      <div className="relative w-20 h-20 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full border-t border-neon-green animate-spin [animation-duration:1.5s]" />
        <div className="absolute inset-2 rounded-full border-b border-indigo-500 animate-spin [animation-duration:2s]" />
        <Database className="w-8 h-8 text-neon-green animate-pulse" />
      </div>
      <h3 className="text-sm font-black tracking-[0.3em] text-white uppercase text-center mb-2">
        Retrieving Neural Archive
      </h3>
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center leading-relaxed">
        Establishing connection with secure DB node and fetching local game profiles.
      </p>
    </div>
  </div>
);

interface ScanningDashboardProps {
  scanProgress: number;
  scanStatus: string;
  gpuName: string;
  isRtxGpu: boolean;
  scanLogs: { time: string; message: string }[];
}

const ScanningDashboard: React.FC<ScanningDashboardProps> = ({ scanProgress, scanStatus, gpuName, isRtxGpu, scanLogs }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scanProgress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8"
    >
      <div className="bg-black/30 backdrop-blur-xl border border-neon-green/10 rounded-3xl p-6 sm:p-10 flex flex-col lg:flex-row items-center gap-10 max-w-5xl w-full shadow-[0_0_80px_rgba(118, 185, 0,0.1)] relative overflow-hidden">
        {/* Background grid accent */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50" />

        {/* Left: Progress Visualization */}
        <div className="relative flex-shrink-0 flex flex-col items-center z-10">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer spinning ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="96" cy="96" r={radius + 12}
                className="stroke-neon-green/20 animate-spin [animation-duration:8s]"
                strokeWidth="2" strokeDasharray="4 12" fill="transparent"
              />
              <circle
                cx="96" cy="96" r={radius}
                className="stroke-white/5"
                strokeWidth="6" fill="transparent"
              />
              <circle
                cx="96" cy="96" r={radius}
                className="stroke-neon-green transition-all duration-300 ease-out drop-shadow-[0_0_10px_rgba(118, 185, 0,0.6)]"
                strokeWidth="6" fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {scanProgress}<span className="text-neon-green text-xl">%</span>
              </span>
              <span className="text-[8px] font-bold text-neon-green/80 uppercase tracking-[0.3em] mt-1">
                Phase {scanProgress < 95 ? '1' : scanProgress < 97 ? '2' : '3'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Scan Active</span>
          </div>
        </div>

        {/* Right: Terminal & Diagnostics */}
        <div className="flex-1 w-full space-y-6 z-10">
          {/* Diagnostic Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-start gap-3 min-w-0">
              <Cpu className="w-4 h-4 text-neon-yellow mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Host GPU</div>
                <div className="text-[10px] font-black text-white uppercase tracking-wider truncate" title={gpuName || 'Standard GPU'}>{gpuName || 'Standard GPU'}</div>
                <div className="text-[8px] font-bold text-neon-yellow uppercase tracking-widest mt-0.5 truncate">{isRtxGpu ? 'RTX Framework Active' : 'Standard Framework'}</div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-start gap-3 min-w-0">
              <Shield className="w-4 h-4 text-neon-green mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Database Node</div>
                <div className="text-[10px] font-black text-white uppercase tracking-wider truncate" title="Supabase Core">Supabase Core</div>
                <div className="text-[8px] font-bold text-neon-green uppercase tracking-widest mt-0.5 truncate">E2E Shield Active</div>
              </div>
            </div>
          </div>

          {/* Terminal Emulator */}
          <div className="bg-[#050505]/80 border border-white/10 rounded-xl overflow-hidden shadow-inner flex flex-col">
            <div className="bg-white/5 border-b border-white/5 px-4 py-2 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Live Execution Logs</span>
            </div>
            <div className="p-4 h-40 overflow-y-auto custom-scrollbar font-mono text-[9px] space-y-1.5 flex flex-col justify-end">
              {scanLogs.length === 0 ? (
                <div className="text-zinc-600">Initializing scanner node...</div>
              ) : (
                scanLogs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-zinc-600 font-bold shrink-0">[{log.time}]</span>
                    <span className={i === scanLogs.length - 1 ? "text-neon-green font-bold drop-shadow-[0_0_5px_rgba(118, 185, 0,0.4)]" : "text-zinc-400"}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              {scanStatus !== 'idle' && scanStatus !== 'Complete' && scanProgress < 100 && (
                <div className="flex gap-2 items-center text-neon-green font-bold mt-1">
                  <span>&gt;</span>
                  <span className="animate-pulse">{scanStatus}</span>
                  <span className="w-1.5 h-3 bg-neon-green animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

// ── Main Library Content ───────────────────────────────────────────────────────
const GamesLibraryContent: React.FC<GamesPageProps> = ({ state, sendCommand, setMode }) => {
  const { isSignedIn, userId, signOut } = useAuth();

  // Detect GPU tier for library feature badge coloring
  const gpuCaps = state?.system_specs?.hardware?.gpu_capabilities;
  const gpuName = (state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '').toLowerCase();
  const driverVersion = state?.gpu_metrics?.driver_version;

  const isNvidiaGpu = gpuCaps
    ? (gpuCaps.brand === 'NVIDIA')
    : !!(gpuName.includes('nvidia') || gpuName.includes('geforce') || gpuName.includes('rtx') || gpuName.includes('gtx') || (driverVersion && driverVersion !== 'Unknown' && driverVersion !== '---'));

  const isRtxGpu = gpuCaps
    ? (gpuCaps.is_rtx ?? false)
    : (isNvidiaGpu && (gpuName.includes('rtx') || gpuName.includes('quadro rtx') || gpuName.includes('titan rtx')));
  const [filter, setFilter] = useState('All');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedFeature, setSelectedFeature] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const initialGames = (state as any)?.game_library || [];
  const initialLoaded = (state as any)?.game_library !== undefined;

  const [games, setGames] = useState<BackendGame[]>(initialGames);
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<{ time: string; message: string }[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(initialLoaded);
  const lastGamesRequestRef = useRef<number>(0);
  const gamesRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the auth state at which we last requested games, to fire a re-request when isSignedIn resolves
  const lastAuthStateRef = useRef<string>('');
  // Tracks previous userId to detect provider switches (userId changes while still signed in)
  const lastUserIdRef = useRef<string | null | undefined>(undefined);


  const handlePlatformChange = (p: string) => {
    setFilter(p);
  };

  const handleGenreChange = (g: string) => {
    setSelectedGenre(g);
  };

  const handleFeatureChange = (f: string) => {
    setSelectedFeature(f);
  };

  const handleTypeChange = (t: string) => {
    setSelectedType(t);
  };

  const handleResetFilters = () => {
    setFilter('All');
    setSelectedGenre('All');
    setSelectedFeature('All');
    setSelectedType('All');
  };

  // Sync game_library and scan state from WebSocket bridge state
  useEffect(() => {
    if (!state) return;
    const s = state as any;
    if (s.game_library !== undefined) {
      const newGames = s.game_library || [];
      setGames(newGames);
      // Mark games as loaded even if the library is empty (backend confirmed no games yet)
      setGamesLoaded(true);
    }
    if (s.scan_state) {
      setScanStatus(s.scan_state.status || 'idle');
      setScanProgress(s.scan_state.progress || 0);
      setIsScanning(s.scan_state.is_running || false);
    }
  }, [state]);

  // Track scanning logs
  useEffect(() => {
    if (!isScanning) {
      if (scanStatus === 'Complete') {
        const timer = setTimeout(() => setScanLogs([]), 2000);
        return () => clearTimeout(timer);
      } else {
        setScanLogs([]);
      }
      return;
    }
    if (scanStatus && scanStatus !== 'idle') {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScanLogs(prev => {
        if (prev.length > 0 && prev[prev.length - 1].message === scanStatus) {
          return prev;
        }
        return [...prev, { time, message: scanStatus }].slice(-10);
      });
    }
  }, [scanStatus, isScanning]);

  // Push scan progress to Windows Taskbar Icon (Roadmap Item 3)
  useEffect(() => {
    if ((window as any).electronAPI?.setProgressBar) {
      if (isScanning) {
        // Convert percentage (0-100) to fraction (0.0-1.0)
        (window as any).electronAPI.setProgressBar(scanProgress / 100);
      } else {
        // Remove progress bar when scan completes
        (window as any).electronAPI.setProgressBar(-1);
      }
    }
  }, [isScanning, scanProgress]);

  // On login, user change, or sign out: load games (with debouncing to prevent request spam)
  useEffect(() => {
    const s = state as any;

    // Build a stable auth key to detect when isSignedIn actually changed
    const authKey = `${isSignedIn ? '1' : '0'}_${userId || 'guest'}`;
    const isNewAuthState = lastAuthStateRef.current !== authKey;
    if (isNewAuthState) {
      lastAuthStateRef.current = authKey;
      // Auth state changed — reset loaded flag to trigger a fresh fetch
      if (isSignedIn) {
        setGamesLoaded(false);
        // If the userId itself changed (e.g. switching OAuth provider: Discord → Google),
        // the scan that was running for the old user is now irrelevant. Reset scan UI
        // immediately since !isSignedIn never fires during a provider switch.
        const prevUserId = lastUserIdRef.current;
        if (prevUserId !== undefined && prevUserId !== userId) {
          setIsScanning(false);
          setScanProgress(0);
          setScanStatus('idle');
          setScanLogs([]);
          setGames([]);
        }
      }
      lastUserIdRef.current = userId;
    }

    if (isSignedIn && (s?.game_library !== undefined || gamesLoaded)) {
      setGamesLoaded(true);
      // Clear any pending timeouts when games arrive
      if (gamesRequestTimeoutRef.current) {
        clearTimeout(gamesRequestTimeoutRef.current);
        gamesRequestTimeoutRef.current = null;
      }
    } else if (isSignedIn && !gamesLoaded) {
      // Only request games if not requested recently (debounce: 500ms)
      const now = Date.now();
      if (now - lastGamesRequestRef.current > 500) {
        lastGamesRequestRef.current = now;
        sendCommand('get_cached_games', {
          userId: userId || undefined
        });
      }

      // Set timeout for retry only if not already set
      if (!gamesRequestTimeoutRef.current) {
        gamesRequestTimeoutRef.current = setTimeout(() => {
          gamesRequestTimeoutRef.current = null;
          // If games still not loaded, request again (single retry)
          const currentState = state as any;
          if (currentState?.game_library === undefined && Date.now() - lastGamesRequestRef.current > 500) {
            lastGamesRequestRef.current = Date.now();
            sendCommand('get_cached_games', {
              userId: userId || undefined
            });
          }
        }, 1500); // Give backend more time for game library (1.5s instead of 1s)
      }
    }

    return () => {
      if (gamesRequestTimeoutRef.current) {
        clearTimeout(gamesRequestTimeoutRef.current);
        gamesRequestTimeoutRef.current = null;
      }
    };
  }, [state, userId, isSignedIn, gamesLoaded, sendCommand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear local library and abort any in-progress scan UI when the user signs out
  useEffect(() => {
    if (!isSignedIn) {
      setGames([]);
      setScanStatus('idle');
      setScanProgress(0);
      setIsScanning(false);
      setScanLogs([]);
    }
  }, [isSignedIn]);

  const triggerFullScan = () => {
    setScanStatus('Starting scan...');
    setScanProgress(0);
    setIsScanning(true);
    setGames([]);
    sendCommand('scan_games', { userId: userId || undefined });
  };

  // ── Platform filter tabs ───────────────────────────────────────────────────────
  const platforms = useMemo(() => {
    const unique = [...new Set(games.map(g => g.platform))].filter(Boolean);
    return unique;
  }, [games]);

  // ── Genre dynamic options ─────────────────────────────────────────────────────
  const genres = useMemo(() => {
    const unique = [...new Set(games.map(g => g.genre))].filter(Boolean);
    return unique.sort();
  }, [games]);

  // ── Local Filtering ────────────────────────────────────────────────────────────
  const filteredGames = useMemo(() => {
    let result = games;

    if (filter !== 'All') {
      result = result.filter(g => g.platform === filter);
    }

    if (selectedGenre !== 'All') {
      result = result.filter(g => g.genre?.toUpperCase() === selectedGenre.toUpperCase());
    }

    if (selectedFeature !== 'All') {
      if (selectedFeature.toUpperCase() === 'LEGACY') {
        result = result.filter(g =>
          g.features?.some(f => ['LEGACY', 'PHYSX', 'ANSEL'].includes(f.toUpperCase())) ||
          (g.features?.some(f => f.toUpperCase() === 'REFLEX') && !g.features?.some(f => f.toUpperCase() === 'DLSS'))
        );
      } else {
        result = result.filter(g => g.features?.some(f => f.toUpperCase() === selectedFeature.toUpperCase()));
      }
    }

    if (selectedType !== 'All') {
      if (filter !== 'All') {
        result = result.filter(g =>
          g.type?.toUpperCase() === selectedType.toUpperCase() ||
          (g.type?.toUpperCase() === 'LAUNCHER' && g.platform === filter)
        );
      } else {
        result = result.filter(g => g.type?.toUpperCase() === selectedType.toUpperCase());
      }
    }

    if (searchQuery.trim()) {
      const fuseInstance = new Fuse(result, {
        keys: [
          { name: 'name', weight: 0.7 },
          { name: 'platform', weight: 0.2 },
          { name: 'genre', weight: 0.1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
      result = fuseInstance.search(searchQuery.trim()).map(r => r.item);
    }

    return result;
  }, [games, filter, selectedGenre, selectedFeature, selectedType, searchQuery]);

  return (
    <div className="flex-1 p-4 sm:p-6 flex flex-col overflow-y-auto custom-scrollbar gap-y-4 sm:gap-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">GAME INTELLIGENCE</h2>
          <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-[0.3em] mt-0.5">
            Neural Library Orchestration
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center md:justify-end">
          {!isSignedIn ? (
            <button aria-label="button" type="button"
              onClick={() => setMode?.('auth')}
              className="flex items-center gap-2 px-4 py-2 border border-neon-green/20 text-neon-green hover:bg-neon-green/10 hover:border-neon-green/40 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all mr-2 shadow-[0_0_15px_rgba(118, 185, 0,0.1)] hover:shadow-[0_0_20px_rgba(118, 185, 0,0.2)]"
            >
              Link Neural Node
            </button>
          ) : (
            <button aria-label="button" type="button"
              onClick={() => {
                // Immediately reset scan UI so the Library doesn't stay stuck mid-scan
                setIsScanning(false);
                setScanProgress(0);
                setScanStatus('idle');
                setScanLogs([]);
                sendCommand('logout_user', { userId });
                signOut();
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all mr-2"
            >
              Sign Out
            </button>
          )}
          {/* Scan progress indicator */}
          {isScanning && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-green/10 border border-neon-green/20 rounded-xl max-w-full">
              <Loader2 className="w-3.5 h-3.5 text-neon-green animate-spin shrink-0" />
              <span className="text-[9px] font-black text-neon-green uppercase tracking-widest truncate">
                {scanProgress}% — {scanStatus}
              </span>
            </div>
          )}
          {scanStatus === 'done' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-yellow/10 border border-neon-yellow/20 rounded-xl max-w-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-neon-yellow shrink-0" />
              <span className="text-[9px] font-black text-neon-yellow uppercase tracking-widest truncate">
                {games.length} Games Found
              </span>
            </div>
          )}

          <button aria-label="button" type="button"
            onClick={triggerFullScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2.5 bg-neon-green text-black font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(118, 185, 0,0.3)] hover:shadow-[0_0_30px_rgba(118, 185, 0,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">{isScanning ? 'Scanning...' : 'Full Scan'}</span>
          </button>
        </div>
      </div>

      {isScanning ? (
        <ScanningDashboard
          scanProgress={scanProgress}
          scanStatus={scanStatus}
          gpuName={gpuName}
          isRtxGpu={isRtxGpu}
          scanLogs={scanLogs}
        />
      ) : !gamesLoaded ? (
        <CacheLoadingScreen />
      ) : (
        <>
          {/* HUD Tactical Filters Console */}
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 sm:p-5 space-y-4">
            {/* Tier 1: Platform Pills & Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap lg:flex-nowrap gap-1.5 items-center lg:overflow-x-auto no-scrollbar lg:whitespace-nowrap pb-1 lg:pb-0 shrink-0 max-w-full">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mr-2 shrink-0">Platform:</span>
                {/* All button */}
                <button aria-label="button" type="button"
                  onClick={() => handlePlatformChange('All')}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${filter === 'All'
                    ? 'bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/5'
                    }`}
                >
                  All ({games.length})
                </button>
                {/* Per-platform filters */}
                {platforms.map(p => {
                  const style = getPlatformStyle(p);
                  const count = games.filter(g => g.platform === p).length;
                  return (
                    <button aria-label="button" type="button"
                      key={p}
                      onClick={() => handlePlatformChange(p)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${filter === p
                        ? `${style.bg} ${style.text} ${style.border} shadow-lg`
                        : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/5'
                        }`}
                    >
                      {getPlatformLabel(p)} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search & Toggle Filters */}
              <div className="w-full lg:max-w-md flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search neural database..."
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-2.5 pl-10 pr-9 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-neon-green/40 transition-colors"
                  />
                  {searchQuery && (
                    <button aria-label="button" type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button aria-label="button" type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${showAdvanced
                    ? 'bg-neon-green/10 text-neon-green border-neon-green/20 shadow-[0_0_15px_rgba(118, 185, 0,0.15)]'
                    : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white hover:border-white/10'
                    }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {showAdvanced ? 'Hide HUD' : 'Filter HUD'}
                </button>
              </div>
            </div>

            {/* Collapsible Tier 2 filters */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-4 pt-2"
                >
                  {/* Separator line */}
                  <div className="h-[1px] bg-white/5 mb-4" />

                  {/* Tier 2: AI Classification & Nvidia Tech Filters */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 w-full lg:w-auto">

                      {/* Genre Filter */}
                      <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Genre:</span>
                        </div>
                        <div className="relative">
                          <select
                            value={selectedGenre}
                            onChange={(e) => handleGenreChange(e.target.value)}
                            className="appearance-none bg-black/40 border border-white/5 hover:border-neon-green/20 text-zinc-300 focus:text-white rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest focus:outline-none transition-all cursor-pointer min-w-[120px]"
                          >
                            <option value="All" className="bg-[#0a0a0a]">All Genres</option>
                            {genres.map(g => (
                              <option key={g} value={g} className="bg-[#0a0a0a]">{g}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Nvidia Tech Feature Filter */}
                      <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-neon-yellow" />
                          <span className="text-[8px] font-black text-neon-yellow/80 uppercase tracking-widest">Nvidia Tech:</span>
                        </div>
                        <div className="relative">
                          <select
                            value={selectedFeature}
                            onChange={(e) => handleFeatureChange(e.target.value)}
                            className="appearance-none bg-black/40 border border-neon-yellow/10 hover:border-neon-yellow/30 text-neon-yellow focus:text-white rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest focus:outline-none transition-all cursor-pointer min-w-[120px]"
                          >
                            <option value="All" className="bg-[#0a0a0a] text-zinc-400">All Tech</option>
                            <option value="DLSS" className="bg-[#0a0a0a] text-neon-yellow font-bold">Nvidia DLSS</option>
                            <option value="RTX" className="bg-[#0a0a0a] text-neon-yellow font-bold">Nvidia RTX</option>
                            <option value="REFLEX" className="bg-[#0a0a0a] text-neon-yellow font-bold">Nvidia Reflex</option>
                            <option value="LEGACY" className="bg-[#0a0a0a] text-neon-yellow font-bold">Nvidia Legacy (GTX)</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-neon-yellow absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Type Filter */}
                      <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Type:</span>
                        </div>
                        <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/5">
                          {['All', 'GAME', 'LAUNCHER'].map((t) => (
                            <button aria-label="button" type="button"
                              key={t}
                              onClick={() => handleTypeChange(t)}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${selectedType === t
                                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                                }`}
                            >
                              {t === 'GAME' ? 'Games' : t === 'LAUNCHER' ? 'Launchers' : 'All'}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Reset Filters / Stats summary */}
                    <div className="flex items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                        Showing {filteredGames.length} / {games.length}
                      </span>
                      {(filter !== 'All' || selectedGenre !== 'All' || selectedFeature !== 'All' || selectedType !== 'All') && (
                        <button aria-label="button" type="button"
                          onClick={handleResetFilters}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-xl transition-all text-[8px] font-black uppercase tracking-widest shrink-0"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Bar (during scan) */}
          {isScanning && (
            <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-neon-green"
                initial={{ width: 0 }}
                animate={{ width: `${scanProgress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}

          {/* Games Grid */}
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              <AnimatePresence mode="popLayout">
                {filteredGames.map((game, i) => (
                  <GameCard 
                    key={`${game.id}-${i}`} 
                    game={game} 
                    sendCommand={sendCommand}
                    isRtxGpu={isRtxGpu} 
                    isNvidiaGpu={isNvidiaGpu} 
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-600 border border-white/5 border-dashed rounded-3xl bg-white/1">
              <Gamepad2 className="w-10 h-10 mb-4 opacity-30" />
              <p className="text-xs font-bold tracking-widest uppercase">
                {games.length === 0 ? 'Run a Full Scan to Discover Games' : 'No Results Found'}
              </p>
              {games.length === 0 && (
                <button aria-label="button" type="button"
                  onClick={triggerFullScan}
                  className="mt-4 px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white hover:border-white/20 transition-all uppercase tracking-widest"
                >
                  Start Scan
                </button>
              )}
            </div>
          )}
        </>
      )}


    </div>
  );
};

// ── Protected Page Wrapper ─────────────────────────────────────────────────────
const GamesPage: React.FC<GamesPageProps> = (props) => {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <GamesLibraryContent {...props} />;
  }

  if (props.mode === 'auth') {
    return <AuthPage onBackToLibrary={() => props.setMode?.('library')} />;
  }

  return <GamesLibraryContent {...props} />;
};

export default GamesPage;
