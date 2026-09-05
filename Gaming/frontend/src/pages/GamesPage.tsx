import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Fuse from 'fuse.js';
import AuthPage from './AuthPage';
import NodeManagerModal from '../components/NodeManagerModal';
import GameInstallationsModal, { type GameInstallation } from '../components/GameInstallationsModal';
import DiscoverGamesModal from '../components/DiscoverGamesModal';
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
  Shield,
  Server,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TelemetryState } from '../types/telemetry';
import { useDistributedStats, fetchWithFailover } from '../hooks/useDistributedStats';
import { getSteamAppIdForTitle } from '../data/discoverCatalog';

// ── Types ──────────────────────────────────────────────────────────────────────
interface BackendGame {
  name: string;
  platform: string;
  id: string;
  install_path?: string;
  exe_path?: string;
  icon?: string;
  local_banner?: string;
  features?: string[];
  genre?: string;
  type?: string;
  tags?: string[];
  source?: string;
  installations?: GameInstallation[];
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
  'EA App': { bg: 'bg-[#1a2a3e]/80', text: 'text-[#ff6602]', border: 'border-[#ff6602]/40' },
  'Origin': { bg: 'bg-[#1a2a3e]/80', text: 'text-[#ff6602]', border: 'border-[#ff6602]/40' },
  'Ubisoft Connect': { bg: 'bg-[#1a2040]/80', text: 'text-[#38bdf8]', border: 'border-[#38bdf8]/40' },
  'Riot Games': { bg: 'bg-[#3e1a1a]/80', text: 'text-[#e84057]', border: 'border-[#e84057]/40' },
  'GOG Galaxy': { bg: 'bg-[#2a1a3e]/80', text: 'text-[#a855f7]', border: 'border-[#a855f7]/40' },
  'Battle.net': { bg: 'bg-[#1a2a40]/80', text: 'text-[#0cf]', border: 'border-[#0cf]/40' },
  'Xbox': { bg: 'bg-[#1a2e1a]/80', text: 'text-[#4ade80]', border: 'border-[#4ade80]/40' },
  'Xbox App': { bg: 'bg-[#1a2e1a]/80', text: 'text-[#4ade80]', border: 'border-[#4ade80]/40' },
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
    'EA App': 'EA',
    'Ubisoft Connect': 'UBI',
    'GOG Galaxy': 'GOG',
    'Battle.net': 'BNET',
    'Rockstar Games': 'ROCKSTAR',
    'Amazon Games': 'AMAZON',
    'Humble Bundle': 'HUMBLE',
    'Itch.io': 'ITCH',
    'Riot Games': 'RIOT',
    'Xbox App': 'XBOX',
  };
  return labels[platform] || platform.toUpperCase();
}

// ── Game Card ──────────────────────────────────────────────────────────────────
const GameCard: React.FC<{
  game: BackendGame;
  sendCommand: (type: string, payload?: any) => void;
  isRtxGpu?: boolean;
  isNvidiaGpu?: boolean;
  onOpenInstallations?: (data: { title: string; coverUrl?: string; primaryGenre?: string; installations: GameInstallation[] }) => void;
}> = React.memo(({ game, sendCommand, onOpenInstallations }) => {
  const seed = encodeURIComponent(game.name);

  // High-fidelity cover art strategy: Local Banner > Steam Header > Local Icon > Generative Placeholder
  let coverUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0a0a0a&shape1Color=1a1a2e&shape2Color=16213e&shape3Color=0f3460`;

  // Modern, high-resolution official launcher emblems & brand assets (bundled locally in public/launchers)
  const LAUNCHER_BANNERS: Record<string, string> = {
    'Steam': '/launchers/steam.png',
    'Epic Games': '/launchers/epic-games.png',
    'Epic': '/launchers/epic-games.png',
    'Xbox': '/launchers/xbox.png',
    'Xbox App': '/launchers/xbox.png',
    'EA Desktop': '/launchers/ea.png',
    'EA App': '/launchers/ea.png',
    'Origin': '/launchers/ea.png',
    'EA': '/launchers/ea.png',
    'Ubisoft Connect': '/launchers/ubisoft.png',
    'Ubisoft': '/launchers/ubisoft.png',
    'Battle.net': '/launchers/battlenet.svg',
    'GOG Galaxy': '/launchers/gog.svg',
    'Riot Games': '/launchers/riot.svg',
    'Rockstar Games': '/launchers/rockstar.png',
    'Rockstar': '/launchers/rockstar.png'
  };

  // Explicit launcher detection
  const isLauncher =
    game.type?.toUpperCase() === 'LAUNCHER' ||
    (game.genre?.toUpperCase() === 'PLATFORM' && !game.id?.match(/^\d+$/)) ||
    (game.name.toLowerCase() === game.platform?.toLowerCase() && !game.id?.match(/^\d+$/));

  const normPlatform = game.platform?.trim();
  const launcherBanner = isLauncher ? (
    LAUNCHER_BANNERS[game.platform] ||
    LAUNCHER_BANNERS[normPlatform] ||
    (normPlatform?.toLowerCase().includes('epic') ? LAUNCHER_BANNERS['Epic Games'] : null) ||
    (normPlatform?.toLowerCase().includes('ea') || normPlatform?.toLowerCase().includes('origin') ? LAUNCHER_BANNERS['EA Desktop'] : null) ||
    (normPlatform?.toLowerCase().includes('ubisoft') || normPlatform?.toLowerCase().includes('uplay') ? LAUNCHER_BANNERS['Ubisoft Connect'] : null) ||
    (normPlatform?.toLowerCase().includes('steam') ? LAUNCHER_BANNERS['Steam'] : null) ||
    (normPlatform?.toLowerCase().includes('xbox') ? LAUNCHER_BANNERS['Xbox'] : null) ||
    (normPlatform?.toLowerCase().includes('rockstar') ? LAUNCHER_BANNERS['Rockstar Games'] : null) ||
    (normPlatform?.toLowerCase().includes('battle') ? LAUNCHER_BANNERS['Battle.net'] : null) ||
    (normPlatform?.toLowerCase().includes('gog') ? LAUNCHER_BANNERS['GOG Galaxy'] : null) ||
    (normPlatform?.toLowerCase().includes('riot') ? LAUNCHER_BANNERS['Riot Games'] : null)
  ) : null;

  const steamAppId = (!isLauncher && game.platform === 'Steam' && /^\d+$/.test(game.id))
    ? game.id
    : (!isLauncher ? getSteamAppIdForTitle(game.name) : null);

  if (isLauncher && launcherBanner) {
    coverUrl = launcherBanner;
  } else if (game.local_banner && game.local_banner !== 'null') {
    coverUrl = game.local_banner.startsWith('http') ? game.local_banner : `asset:///${game.local_banner.replace(/\\/g, '/')}`;
  } else if (steamAppId) {
    coverUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/header.jpg`;
  } else if (game.icon && game.icon !== 'null') {
    coverUrl = game.icon.startsWith('http') ? game.icon : `asset:///${game.icon.replace(/\\/g, '/')}`;
  } else if (launcherBanner) {
    coverUrl = launcherBanner;
  }

  const getLaunchUri = () => {
    if (game.platform === 'Steam' && game.id && !isLauncher) return `steam://rungameid/${game.id}`;
    if ((game.platform === 'Epic Games' || game.platform === 'Epic') && game.id && !isLauncher) return `com.epicgames.launcher://apps/${game.id}?action=launch&silent=true`;
    if ((game.platform === 'EA Desktop' || game.platform === 'EA App' || game.platform === 'Origin' || game.platform === 'EA') && game.id && !isLauncher) return `origin://launchgame/${game.id}`;
    if (game.platform === 'Ubisoft Connect' && game.id && !isLauncher) return `uplay://launch/${game.id}`;
    if (game.platform === 'GOG Galaxy' && game.id && !isLauncher) return `goggalaxy://openGameView/${game.id}`;
    if (game.platform === 'Battle.net' && game.id && !isLauncher) return `battlenet://play/${game.id}`;

    if (game.exe_path) return game.exe_path;

    if (game.platform === 'Steam') return 'steam://open/main';
    if (game.platform === 'Epic Games' || game.platform === 'Epic') return 'com.epicgames.launcher://store';
    if (game.platform === 'EA Desktop' || game.platform === 'Origin' || game.platform === 'EA App') return 'origin://';
    if (game.platform === 'Ubisoft Connect') return 'uplay://';
    if (game.platform === 'GOG Galaxy') return 'goggalaxy://';
    if (game.platform === 'Battle.net') return 'battlenet://';
    if (game.platform === 'Xbox' || game.platform === 'Xbox App') return 'xbox:';
    return null;
  };

  const launchUri = getLaunchUri();

  const handleLaunch = () => {
    if (launchUri) {
      if ((window as any).electronAPI?.launchGame) {
        (window as any).electronAPI.launchGame(launchUri);
      } else {
        sendCommand('launch_game', { exe_path: launchUri });
      }
    }
  };

  const platformStyle = getPlatformStyle(game.platform);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white/2 hover:bg-white/4 border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-colors flex flex-col justify-between"
    >
      {/* Banner / Poster */}
      <div className="relative h-44 w-full bg-black/40 overflow-hidden flex items-center justify-center">
        <img
          src={coverUrl}
          alt={game.name}
          className={`w-full h-full ${isLauncher ? 'object-contain p-8 group-hover:scale-105' : 'object-cover group-hover:scale-105'} transition-transform duration-500`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (launcherBanner && target.src !== launcherBanner) {
              target.src = launcherBanner;
            } else if (!isLauncher) {
              const fallbackAppId = getSteamAppIdForTitle(game.name);
              const fallbackHeader = fallbackAppId ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${fallbackAppId}/header.jpg` : null;
              if (fallbackHeader && target.src !== fallbackHeader) {
                target.src = fallbackHeader;
                return;
              }
              if (!target.src.includes('dicebear')) {
                target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0a0a0a&shape1Color=1a1a2e&shape2Color=16213e&shape3Color=0f3460`;
              }
            } else if (!target.src.includes('dicebear')) {
              target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0a0a0a&shape1Color=1a1a2e&shape2Color=16213e&shape3Color=0f3460`;
            }
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Platform Badge */}
        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg border backdrop-blur-md shadow-lg ${platformStyle.bg} ${platformStyle.text} ${platformStyle.border}`}>
          <span className="text-[8px] font-black uppercase tracking-widest">{getPlatformLabel(game.platform)}</span>
        </div>

        {/* Multi-Node Installations Badge */}
        {game.installations && game.installations.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInstallations?.({
                title: game.name,
                coverUrl,
                primaryGenre: game.genre,
                installations: game.installations || [],
              });
            }}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-[#071d2b]/80 backdrop-blur-md shadow-lg text-cyan-400 hover:text-cyan-200 hover:border-cyan-400/60 transition-all cursor-pointer z-10"
            title="Inspect Installations Across Distributed Nodes"
          >
            <Server className="w-3 h-3 text-cyan-400" />
            <span className="text-[8px] font-black tracking-wider uppercase">
              {game.installations.length} {game.installations.length === 1 ? 'Node' : 'Nodes'}
            </span>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div onClick={handleLaunch} className="min-h-10 cursor-pointer">
            <h4 className="text-sm font-black text-white tracking-tight group-hover:text-neon-green transition-colors truncate leading-tight">
              {game.name}
            </h4>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              {game.genre === 'N/A' || !game.genre ? (isLauncher ? 'GAMING PLATFORM' : 'GAME') : game.genre}
            </p>
          </div>

          {/* Hardware Feature Badges (NVIDIA DLSS, Frame Gen, RTX, Reflex, HDR, FSR) */}
          {game.features && game.features.length > 0 && (
            <div className="flex gap-1 flex-wrap pt-0.5">
              {game.features.map((feat) => {
                const f = feat.toUpperCase();
                let colorClass = 'bg-white/5 text-zinc-300 border-white/10';
                if (f.includes('DLSS') || f.includes('FRAME_GEN') || f.includes('FRAME GEN')) {
                  colorClass = 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30 shadow-[0_0_8px_rgba(223,255,0,0.12)]';
                } else if (f.includes('RTX') || f.includes('RAY_TRACING') || f.includes('PATH_TRACING')) {
                  colorClass = 'bg-neon-green/10 text-neon-green border-neon-green/30 shadow-[0_0_8px_rgba(118,185,0,0.12)]';
                } else if (f.includes('REFLEX')) {
                  colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                } else if (f.includes('HDR')) {
                  colorClass = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
                } else if (f.includes('FSR')) {
                  colorClass = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                }
                const label = feat.replace('_', ' ');
                return (
                  <span
                    key={feat}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${colorClass}`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            aria-label="button"
            type="button"
            onClick={handleLaunch}
            disabled={!launchUri}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
              launchUri
                ? 'bg-white/10 hover:bg-neon-green text-white hover:text-black shadow-lg hover:shadow-[0_0_20px_rgba(118,185,0,0.4)]'
                : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{launchUri ? (isLauncher ? 'Launch Platform' : 'Execute') : 'Unavailable'}</span>
          </button>

          {game.installations && game.installations.length > 1 && (
            <button
              aria-label="button"
              type="button"
              onClick={() => onOpenInstallations?.({
                title: game.name,
                coverUrl,
                primaryGenre: game.genre,
                installations: game.installations || [],
              })}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 hover:border-cyan-500/40 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              title="Inspect All Node Installations"
            >
              <Server className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
GameCard.displayName = 'GameCard';

// ── Scanning Dashboard ─────────────────────────────────────────────────────────
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
      <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col items-center max-w-xl w-full shadow-[0_0_80px_rgba(118,185,0,0.1)]">
        {/* Progress Gauge */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center mb-6">
          <svg className="w-full h-full -rotate-90">
            <circle cx="50%" cy="50%" r={radius} className="stroke-white/5" strokeWidth="8" fill="transparent" />
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              className="stroke-neon-green transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tighter">
              {scanProgress}%
            </span>
            <span className="text-[8px] sm:text-[9px] font-black text-neon-green tracking-widest uppercase mt-0.5">
              Analyzing
            </span>
          </div>
        </div>

        {/* Current status */}
        <h3 className="text-xs sm:text-sm font-black tracking-[0.25em] text-white uppercase text-center mb-1">
          Deep Registry & Filesystem Harvest
        </h3>
        <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center truncate max-w-full px-4 mb-6">
          {scanStatus}
        </p>

        {/* Hardware & Cloud Sync Badges */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
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

        {/* Live log stream */}
        <div className="w-full bg-black/50 border border-white/5 rounded-2xl p-3.5 space-y-1.5 font-mono text-[9px]">
          <div className="flex items-center gap-2 text-zinc-500 text-[8px] font-bold tracking-widest uppercase border-b border-white/5 pb-1.5 mb-2">
            <Terminal className="w-3 h-3 text-neon-green" />
            <span>Real-time Discovery Telemetry</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-hidden flex flex-col justify-end">
            {scanLogs.length === 0 ? (
              <div className="text-zinc-600 italic">Initializing scanner threads...</div>
            ) : (
              scanLogs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2 truncate">
                  <span className="text-zinc-600 select-none">[{log.time}]</span>
                  <span className={idx === scanLogs.length - 1 ? "text-neon-green font-bold" : "text-zinc-400"}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
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
        <img src="/logo.png" className="w-10 h-10 object-contain animate-pulse" alt="Mission Control Logo" />
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

// ── Main Library Content ───────────────────────────────────────────────────────
const GamesLibraryContent: React.FC<GamesPageProps> = ({ state, sendCommand, setMode: _setMode }) => {
  const { isSignedIn, userId } = useAuth();

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
  const [showNodeManager, setShowNodeManager] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [installationsModal, setInstallationsModal] = useState<{ title: string; coverUrl?: string; primaryGenre?: string; installations: GameInstallation[] } | null>(null);
  const { stats: distributedStats, serverOnline: libraryServerOnline } = useDistributedStats(userId);

  // Instant Local-First Cache: Load from localStorage on Frame-0 to eliminate loading screen delay
  const getPersistedGames = useCallback((): BackendGame[] => {
    try {
      const keys = [
        `mc_cached_library_${userId || 'guest'}`,
        'mc_cached_library_guest',
      ];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('mc_cached_library_') && !keys.includes(k)) {
          keys.push(k);
        }
      }
      for (const k of keys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch { }
    return [];
  }, [userId]);

  const persisted = useMemo(() => getPersistedGames(), [getPersistedGames]);
  const initialGames = (state as any)?.game_library || (persisted.length > 0 ? persisted : []);
  const initialLoaded = (state as any)?.game_library !== undefined || persisted.length > 0;

  const [games, setGames] = useState<BackendGame[]>(initialGames);
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<{ time: string; message: string }[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(initialLoaded);

  const lastGamesRequestRef = useRef<number>(0);
  const gamesRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAuthStateRef = useRef<string>('');
  const lastUserIdRef = useRef<string | null | undefined>(userId);
  const prevLibraryRef = useRef<any>(null);
  const lastSavedGamesRef = useRef<string>('');

  // Persist library cache to localStorage safely only when content actually changes
  useEffect(() => {
    if (games.length > 0) {
      try {
        const serialized = JSON.stringify(games);
        if (serialized !== lastSavedGamesRef.current) {
          lastSavedGamesRef.current = serialized;
          localStorage.setItem(`mc_cached_library_${userId || 'guest'}`, serialized);
        }
      } catch { }
    }
  }, [games, userId]);

  const handlePlatformChange = (p: string) => setFilter(p);
  const handleGenreChange = (g: string) => setSelectedGenre(g);
  const handleFeatureChange = (f: string) => setSelectedFeature(f);
  const handleTypeChange = (t: string) => setSelectedType(t);
  const handleResetFilters = () => {
    setFilter('All');
    setSelectedGenre('All');
    setSelectedFeature('All');
    setSelectedType('All');
  };

  // Sync game_library and scan state from WebSocket bridge state with change detection to prevent render thrash
  useEffect(() => {
    if (!state) return;
    const s = state as any;
    if (s.game_library !== undefined && s.game_library !== prevLibraryRef.current) {
      prevLibraryRef.current = s.game_library;
      const newGames = s.game_library || [];
      setGames(newGames);
      setGamesLoaded(true);
    }
    if (s.scan_state) {
      const status = s.scan_state.status || 'idle';
      const progress = s.scan_state.progress || 0;
      const running = s.scan_state.is_running || false;
      setScanStatus(prev => prev !== status ? status : prev);
      setScanProgress(prev => prev !== progress ? progress : prev);
      setIsScanning(prev => prev !== running ? running : prev);
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

  // Push scan progress to Windows Taskbar Icon
  useEffect(() => {
    if ((window as any).electronAPI?.setProgressBar) {
      if (isScanning) {
        (window as any).electronAPI.setProgressBar(scanProgress / 100);
      } else {
        (window as any).electronAPI.setProgressBar(-1);
      }
    }
  }, [isScanning, scanProgress]);

  // On login, user change, or sign out: load games (with debouncing to prevent request spam)
  useEffect(() => {
    const s = state as any;
    const authKey = `${isSignedIn ? '1' : '0'}_${userId || 'guest'}`;
    const isNewAuthState = lastAuthStateRef.current !== authKey;

    if (isNewAuthState) {
      lastAuthStateRef.current = authKey;
      const persistedNow = getPersistedGames();
      if (persistedNow.length > 0) {
        setGames(persistedNow);
        setGamesLoaded(true);
      } else if (isSignedIn) {
        setGamesLoaded(false);
      }

      const prevUserId = lastUserIdRef.current;
      if (prevUserId !== undefined && prevUserId !== userId) {
        setIsScanning(false);
        setScanProgress(0);
        setScanStatus('idle');
        setScanLogs([]);
      }
      lastUserIdRef.current = userId;
    }

    if (s?.game_library !== undefined || games.length > 0) {
      setGamesLoaded(true);
      if (gamesRequestTimeoutRef.current) {
        clearTimeout(gamesRequestTimeoutRef.current);
        gamesRequestTimeoutRef.current = null;
      }
    } else if (!gamesLoaded) {
      const now = Date.now();
      if (now - lastGamesRequestRef.current > 500) {
        lastGamesRequestRef.current = now;

        // Query local backend immediately
        sendCommand('get_cached_games', { userId: userId || undefined });

        // If distributed server is online, fetch with strict 1.5s timeout
        if (libraryServerOnline && userId) {
          const controller = new AbortController();
          const timerId = setTimeout(() => controller.abort(), 1500);

          fetchWithFailover(`/api/games?installed_only=true&clerk_id=${encodeURIComponent(userId)}`, { signal: controller.signal })
            .then((res: Response) => res.json())
            .then((data: any) => {
              clearTimeout(timerId);
              if (data && Array.isArray(data.games) && data.games.length > 0) {
                const mappedGames: BackendGame[] = data.games.map((g: any) => {
                  const firstInst = g.installations?.[0];
                  return {
                    id: firstInst?.storeAppId || g.id,
                    name: g.title || g.name,
                    platform: firstInst?.store || (Array.isArray(g.platforms) ? g.platforms[0] : g.platforms) || 'Local',
                    genre: g.primaryGenre || g.primary_genre || g.genre || 'Action',
                    features: g.features || [],
                    tags: g.tags || [],
                    type: g.type || 'game',
                    install_path: firstInst?.installPath,
                    exe_path: firstInst?.exePath,
                    icon: g.cover_url || g.coverUrl,
                    local_banner: g.banner_url || g.bannerUrl,
                    installations: g.installations,
                  };
                });
                setGames(mappedGames);
                setGamesLoaded(true);
              }
            })
            .catch(() => {
              clearTimeout(timerId);
            });
        }
      }

      if (!gamesRequestTimeoutRef.current) {
        gamesRequestTimeoutRef.current = setTimeout(() => {
          gamesRequestTimeoutRef.current = null;
          const currentState = state as any;
          if (currentState?.game_library === undefined && Date.now() - lastGamesRequestRef.current > 500) {
            lastGamesRequestRef.current = Date.now();
            sendCommand('get_cached_games', { userId: userId || undefined });
          }
        }, 1500);
      }
    }

    return () => {
      if (gamesRequestTimeoutRef.current) {
        clearTimeout(gamesRequestTimeoutRef.current);
        gamesRequestTimeoutRef.current = null;
      }
    };
  }, [state, userId, isSignedIn, games.length, gamesLoaded, sendCommand, libraryServerOnline, getPersistedGames]);

  // On sign-out, switch to guest cache without blanking out locally installed games
  useEffect(() => {
    if (!isSignedIn) {
      const guestGames = getPersistedGames();
      if (guestGames.length > 0) {
        setGames(guestGames);
      }
      setScanStatus('idle');
      setScanProgress(0);
      setIsScanning(false);
      setScanLogs([]);
    }
  }, [isSignedIn, getPersistedGames]);

  const triggerFullScan = () => {
    setScanStatus('Starting scan...');
    setScanProgress(0);
    setIsScanning(true);
    setGames([]);
    sendCommand('scan_games', { userId: userId || undefined });
  };

  // Platform filter tabs
  const platforms = useMemo(() => {
    const unique = [...new Set(games.map(g => g.platform))].filter(Boolean);
    return unique;
  }, [games]);

  // Genre dynamic options
  const genres = useMemo(() => {
    const unique = [...new Set(games.map(g => g.genre))].filter(Boolean);
    return unique.sort();
  }, [games]);

  // Quick type counts
  const launchersCount = useMemo(
    () => games.filter(g =>
      g.type?.toUpperCase() === 'LAUNCHER' ||
      (g.genre?.toUpperCase() === 'PLATFORM' && !g.id?.match(/^\d+$/)) ||
      (g.name.toLowerCase() === g.platform?.toLowerCase() && !g.id?.match(/^\d+$/))
    ).length,
    [games]
  );
  const gamesOnlyCount = games.length - launchersCount;

  // Memoized Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(games, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'platform', weight: 0.2 },
        { name: 'genre', weight: 0.1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [games]);

  // Local Filtering
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
      if (selectedType === 'GAME') {
        result = result.filter(g =>
          g.type?.toUpperCase() !== 'LAUNCHER' &&
          !(g.genre?.toUpperCase() === 'PLATFORM' && !g.id?.match(/^\d+$/)) &&
          !(g.name.toLowerCase() === g.platform?.toLowerCase() && !g.id?.match(/^\d+$/))
        );
      } else if (selectedType === 'LAUNCHER') {
        result = result.filter(g =>
          g.type?.toUpperCase() === 'LAUNCHER' ||
          (g.genre?.toUpperCase() === 'PLATFORM' && !g.id?.match(/^\d+$/)) ||
          (g.name.toLowerCase() === g.platform?.toLowerCase() && !g.id?.match(/^\d+$/))
        );
      }
    }

    if (searchQuery.trim()) {
      result = fuse.search(searchQuery.trim()).map(r => r.item);
      // Re-apply platform & type constraints if search is active
      if (filter !== 'All') result = result.filter(g => g.platform === filter);
      if (selectedType === 'GAME') {
        result = result.filter(g =>
          g.type?.toUpperCase() !== 'LAUNCHER' &&
          !(g.genre?.toUpperCase() === 'PLATFORM' && !g.id?.match(/^\d+$/)) &&
          !(g.name.toLowerCase() === g.platform?.toLowerCase() && !g.id?.match(/^\d+$/))
        );
      } else if (selectedType === 'LAUNCHER') {
        result = result.filter(g =>
          g.type?.toUpperCase() === 'LAUNCHER' ||
          (g.genre?.toUpperCase() === 'PLATFORM' && !g.id?.match(/^\d+$/)) ||
          (g.name.toLowerCase() === g.platform?.toLowerCase() && !g.id?.match(/^\d+$/))
        );
      }
    }

    return result;
  }, [games, filter, selectedGenre, selectedFeature, selectedType, searchQuery, fuse]);

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
          {/* Web Discovery button — always accessible */}
          <button
            id="discover-games-btn"
            type="button"
            onClick={() => setShowDiscoverModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 hover:border-neon-green/50 text-neon-green font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_15px_rgba(118,185,0,0.15)] cursor-pointer shrink-0"
            title="Search and add games from Steam, Epic, GOG, and RAWG"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Discover from Web</span>
          </button>

          {/* Node Manager button — always accessible */}
          <button
            id="manage-nodes-btn"
            type="button"
            onClick={() => setShowNodeManager(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer shrink-0"
            title="Manage Local & Remote Cluster Nodes"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Manage Nodes</span>
          </button>

          {/* Scan progress indicator */}
          {isScanning && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-neon-green/10 border border-neon-green/20 rounded-2xl max-w-full shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-neon-green animate-spin shrink-0" />
              <span className="text-[10px] font-black text-neon-green uppercase tracking-widest truncate">
                {scanProgress}% — {scanStatus}
              </span>
            </div>
          )}
          {scanStatus === 'done' && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-neon-yellow/10 border border-neon-yellow/20 rounded-2xl max-w-full shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-neon-yellow shrink-0" />
              <span className="text-[10px] font-black text-neon-yellow uppercase tracking-widest truncate">
                {games.length} Games Found
              </span>
            </div>
          )}

          <button aria-label="button" type="button"
            onClick={triggerFullScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2.5 bg-neon-green text-black font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(118,185,0,0.3)] hover:shadow-[0_0_30px_rgba(118,185,0,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">{isScanning ? 'Scanning...' : 'Full Scan'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Node Cluster Status Bar (Only shown when remote cluster nodes exist) */}
      {distributedStats?.nodes && distributedStats.nodes.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-white/3 border border-white/6 rounded-2xl"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Server className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-1">Cluster Nodes:</span>
            {distributedStats.nodes.map(n => (
              <span
                key={n.node_id}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                  n.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-red-500/10 text-red-400 border-red-500/20 opacity-60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${n.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {n.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

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
          <div className="bg-white/3 backdrop-blur-xl border border-white/5 rounded-2xl p-3 space-y-3">
            {/* Tier 1: Quick Type Toggle, Platform Pills & Search */}
            <div className="flex flex-col gap-3">
              {/* Type Switcher & Platform Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Quick Type Filter */}
                <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5 shrink-0">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-zinc-500" />
                    View:
                  </span>
                  {[
                    { id: 'All', label: 'All', count: games.length },
                    { id: 'GAME', label: 'Games', count: gamesOnlyCount },
                    { id: 'LAUNCHER', label: 'Launchers', count: launchersCount },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTypeChange(t.id)}
                      className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        selectedType === t.id
                          ? 'bg-neon-green/15 text-neon-green border border-neon-green/30 shadow-[0_0_10px_rgba(118,185,0,0.15)]'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>

                {/* Platform pills */}
                <div className="flex flex-nowrap gap-1.5 items-center overflow-x-auto no-scrollbar shrink-0 max-w-full">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mr-1 shrink-0">Platform:</span>
                  <button
                    aria-label="button"
                    type="button"
                    onClick={() => handlePlatformChange('All')}
                    className={`shrink-0 px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all border cursor-pointer ${filter === 'All'
                      ? 'bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                      : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/5'
                      }`}
                  >
                    All ({games.length})
                  </button>
                  {platforms.map(p => {
                    const style = getPlatformStyle(p);
                    const count = games.filter(g => g.platform === p).length;
                    return (
                      <button
                        aria-label="button"
                        type="button"
                        key={p}
                        onClick={() => handlePlatformChange(p)}
                        className={`shrink-0 px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all border cursor-pointer ${filter === p
                          ? `${style.bg} ${style.text} ${style.border} shadow-lg`
                          : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/5'
                          }`}
                      >
                        {getPlatformLabel(p)} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search & Toggle Filters */}
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search neural game archive, platforms, tags, engine types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-neon-green/50 transition-all font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                    showAdvanced || selectedGenre !== 'All' || selectedFeature !== 'All'
                      ? 'bg-neon-green/10 text-neon-green border-neon-green/30 shadow-[0_0_15px_rgba(118,185,0,0.15)]'
                      : 'bg-black/40 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                  {(selectedGenre !== 'All' || selectedFeature !== 'All') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                  )}
                </button>
              </div>
            </div>

            {/* Tier 2: Collapsible Filters */}
            {showAdvanced && (
              <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* Genre Filter */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Genre:</span>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedGenre}
                        onChange={(e) => handleGenreChange(e.target.value)}
                        className="appearance-none bg-black/40 border border-white/10 hover:border-white/20 text-zinc-300 focus:text-white rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest focus:outline-none transition-all cursor-pointer min-w-30"
                      >
                        <option value="All" className="bg-obsidian text-zinc-400">All Genres</option>
                        {genres.map((g) => (
                          <option key={g} value={g} className="bg-obsidian text-white">{g}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Hardware Feature / Tech Filter */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-neon-yellow" />
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Tech:</span>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedFeature}
                        onChange={(e) => handleFeatureChange(e.target.value)}
                        className="appearance-none bg-black/40 border border-neon-yellow/10 hover:border-neon-yellow/30 text-neon-yellow focus:text-white rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest focus:outline-none transition-all cursor-pointer min-w-30"
                      >
                        <option value="All" className="bg-obsidian text-zinc-400">All Tech</option>
                        <option value="DLSS" className="bg-obsidian text-neon-yellow font-bold">Nvidia DLSS</option>
                        <option value="RTX" className="bg-obsidian text-neon-yellow font-bold">Nvidia RTX</option>
                        <option value="REFLEX" className="bg-obsidian text-neon-yellow font-bold">Nvidia Reflex</option>
                        <option value="LEGACY" className="bg-obsidian text-neon-yellow font-bold">Nvidia Legacy (GTX)</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-neon-yellow absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Reset Filters */}
                {(filter !== 'All' || selectedGenre !== 'All' || selectedFeature !== 'All' || selectedType !== 'All' || searchQuery !== '') && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors ml-auto cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            )}
          </div>

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
                    onOpenInstallations={setInstallationsModal}
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
                <button
                  aria-label="button"
                  type="button"
                  onClick={triggerFullScan}
                  className="mt-4 px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white hover:border-white/20 transition-all uppercase tracking-widest cursor-pointer"
                >
                  Start Scan
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Node Manager Modal */}
      <AnimatePresence>
        {showNodeManager && <NodeManagerModal onClose={() => setShowNodeManager(false)} sendCommand={sendCommand} />}
      </AnimatePresence>

      {/* Discover Games Modal */}
      <AnimatePresence>
        {showDiscoverModal && (
          <DiscoverGamesModal
            onClose={() => setShowDiscoverModal(false)}
            installedGames={games}
            onGameAdded={() => {
              // Trigger reload or signal update
              sendCommand('get_cached_games', { userId: userId || undefined });
            }}
          />
        )}
      </AnimatePresence>

      {/* Game Installations Modal */}
      <AnimatePresence>
        {installationsModal && (
          <GameInstallationsModal
            gameTitle={installationsModal.title}
            coverUrl={installationsModal.coverUrl}
            primaryGenre={installationsModal.primaryGenre}
            installations={installationsModal.installations}
            onClose={() => setInstallationsModal(null)}
          />
        )}
      </AnimatePresence>
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
