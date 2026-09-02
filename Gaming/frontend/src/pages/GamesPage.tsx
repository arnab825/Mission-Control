import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  HardDrive,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TelemetryState } from '../types/telemetry';

// ── Distributed Library Server Hook & URL ────────────────────────────────────
import { useDistributedStats, fetchWithFailover } from '../hooks/useDistributedStats';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const tb = bytes / 1e12;
  if (tb >= 0.1) return `${tb.toFixed(1)} TB`;
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

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
  installations?: GameInstallation[];
}

export interface GamesPageProps {
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
  mode?: 'library' | 'auth';
  setMode?: (mode: 'library' | 'auth') => void;
}

// ── Platform normalization & color map ────────────────────────────────────────
export function normalizePlatform(platform: string = ''): string {
  const p = platform.trim().toLowerCase();
  if (p === 'steam') return 'Steam';
  if (p.includes('epic')) return 'Epic Games';
  if (p === 'ea' || p.includes('ea ') || p.includes('ea desktop') || p.includes('ea app') || p === 'origin') return 'EA';
  if (p.includes('ubisoft') || p === 'uplay') return 'Ubisoft Connect';
  if (p.includes('xbox') || p.includes('game pass')) return 'Xbox';
  if (p.includes('battle.net') || p.includes('battlenet') || p === 'bnet' || p === 'blizzard') return 'Battle.net';
  if (p.includes('playstation') || p.includes('psn') || p === 'ps pc') return 'PlayStation';
  if (p.includes('gog')) return 'GOG Galaxy';
  if (p.includes('riot')) return 'Riot Games';
  if (p.includes('rockstar')) return 'Rockstar Games';
  if (p.includes('amazon')) return 'Amazon Games';
  if (p.includes('itch')) return 'Itch.io';
  if (p.includes('humble')) return 'Humble Bundle';
  return platform || 'Local';
}

const PLATFORM_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Steam': { bg: 'bg-[#1b2838]/80', text: 'text-[#66c0f4]', border: 'border-[#66c0f4]/40' },
  'Epic Games': { bg: 'bg-[#2a1a3e]/80', text: 'text-[#c084fc]', border: 'border-[#c084fc]/40' },
  'EA': { bg: 'bg-[#3b1219]/80', text: 'text-[#ff4747]', border: 'border-[#ff4747]/40' },
  'EA Desktop': { bg: 'bg-[#3b1219]/80', text: 'text-[#ff4747]', border: 'border-[#ff4747]/40' },
  'EA App': { bg: 'bg-[#3b1219]/80', text: 'text-[#ff4747]', border: 'border-[#ff4747]/40' },
  'Origin': { bg: 'bg-[#2e1d10]/80', text: 'text-[#ff7324]', border: 'border-[#ff7324]/40' },
  'Ubisoft Connect': { bg: 'bg-[#1a2040]/80', text: 'text-[#38bdf8]', border: 'border-[#38bdf8]/40' },
  'Riot Games': { bg: 'bg-[#3e1a1a]/80', text: 'text-[#e84057]', border: 'border-[#e84057]/40' },
  'GOG Galaxy': { bg: 'bg-[#2a1a3e]/80', text: 'text-[#a855f7]', border: 'border-[#a855f7]/40' },
  'Battle.net': { bg: 'bg-[#0f283d]/80', text: 'text-[#00aeff]', border: 'border-[#00aeff]/40' },
  'Xbox': { bg: 'bg-[#102d15]/80', text: 'text-[#107c10]', border: 'border-[#107c10]/40' },
  'PlayStation': { bg: 'bg-[#001e4a]/80', text: 'text-[#0070d1]', border: 'border-[#0070d1]/40' },
  'Rockstar Games': { bg: 'bg-[#2e1a1a]/80', text: 'text-[#fcaf17]', border: 'border-[#fcaf17]/40' },
  'Amazon Games': { bg: 'bg-[#2e2a1a]/80', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/40' },
  'Itch.io': { bg: 'bg-[#2e1a1a]/80', text: 'text-[#fa5c5c]', border: 'border-[#fa5c5c]/40' },
  'Humble Bundle': { bg: 'bg-[#2e2a1a]/80', text: 'text-[#fbbf24]', border: 'border-[#fbbf24]/40' },
  'Local': { bg: 'bg-white/[0.04]', text: 'text-zinc-400', border: 'border-white/10' },
};

function getPlatformStyle(platform: string) {
  const norm = normalizePlatform(platform);
  return PLATFORM_STYLES[platform] || PLATFORM_STYLES[norm] || PLATFORM_STYLES['Local'];
}

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    'Epic Games': 'EPIC',
    'EA': 'EA',
    'EA Desktop': 'EA',
    'EA App': 'EA',
    'Ubisoft Connect': 'UBI',
    'GOG Galaxy': 'GOG',
    'Battle.net': 'BNET',
    'Xbox': 'XBOX',
    'PlayStation': 'PSN',
    'Rockstar Games': 'ROCKSTAR',
    'Amazon Games': 'AMAZON',
    'Humble Bundle': 'HUMBLE',
    'Itch.io': 'ITCH',
    'Riot Games': 'RIOT',
  };
  return labels[platform] || labels[normalizePlatform(platform)] || platform.toUpperCase();
}

// ── Game Card ──────────────────────────────────────────────────────────────────

const GameCard: React.FC<{
  game: BackendGame;
  sendCommand: (type: string, payload?: any) => void;
  isRtxGpu?: boolean;
  isNvidiaGpu?: boolean;
  onOpenInstallations?: (modalData: { title: string; coverUrl?: string; primaryGenre?: string; installations: GameInstallation[] }) => void;
}> = ({ game, sendCommand, onOpenInstallations }) => {
  const normPlatform = normalizePlatform(game.platform);
  // Robust launcher detection: Check type, genre, and platform name
  const isLauncher =
    game.type?.toUpperCase() === 'LAUNCHER' ||
    game.genre?.toUpperCase() === 'PLATFORM' ||
    (['Steam', 'Epic Games', 'Xbox', 'EA Desktop', 'EA App', 'Origin', 'EA', 'Ubisoft Connect', 'Battle.net', 'PlayStation'].includes(game.platform) && game.name.toLowerCase().includes('app')) ||
    game.name.toLowerCase() === game.platform.toLowerCase() ||
    game.name.toLowerCase() === normPlatform.toLowerCase();

  const inlineSvgPlaceholder = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="338" viewBox="0 0 600 338"><rect width="600" height="338" fill="%230d0d12"/><path d="M0 0l600 338M600 0L0 338" stroke="%23ffffff" stroke-width="1" stroke-opacity="0.04"/><circle cx="300" cy="169" r="48" fill="%231a1a24"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2371717a" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="2">${encodeURIComponent((game.name || 'GAME').slice(0, 26).toUpperCase())}</text></svg>`;
  let coverUrl = inlineSvgPlaceholder;

  const steamAppId = (game.platform === 'Steam' && /^\d+$/.test(game.id))
    ? game.id
    : ((game.installations as any[])?.find((i: any) => (i.store === 'Steam' || i.store === 'steam') && /^\d+$/.test(i.storeAppId || i.store_app_id))?.storeAppId || null);

  // Platform-specific launcher banners using authentic high-resolution vector SVGs
  const LAUNCHER_BANNERS: Record<string, string> = {
    'Steam': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjNjZjMGY0IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+U3RlYW08L3RpdGxlPjxwYXRoIGQ9Ik0xMS45NzkgMEExMS45NzkgMTEuOTc5IDAgMCAwIDAgMTEuOTc5YzAgNS42NzEgMy45NiAxMC40MjggOS4yOSAxMS42NjJsMi4zMTItMy4yMzhhMy4xNzggMy4xNzggMCAwIDEtLjM2NS0uMDQ0bC0zLjMyLTEuMzc4YTIuNTMyIDIuNTMyIDAgMCAxLTEuMzg1LTEuNTU0bC0xLjYzLTQuODNhMi41MzEgMi41MzEgMCAwIDEgLjQ5NC0yLjQ4bDEuNjM1LTEuOTIxQTIuNTMgMi41MyAwIDAgMSA5LjA3IDcuNTVsNC44MyAxLjYzYTIuNTMgMi41MyAwIDAgMSAxLjU1NCAxLjM4NWwxLjM3OCAzLjMyYTMuMTc4IDMuMTc4IDAgMCAxIC4wNDQuMzY1bDMuMjM4LTIuMzEyQTExLjk3OSAxMS45NzkgMCAwIDAgMjMuOTU4IDExLjk3OSAxMS45NzkgMTEuOTc5IDAgMCAwIDExLjk3OSAwem0xLjc1OCAxMS45NzlhMS43NTggMS43NTggMCAxIDEtMy41MTYgMCAxLjc1OCAxLjc1OCAwIDAgMSAzLjUxNiAweiIvPjwvc3ZnPg==',
    'Epic Games': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjQwIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTAwIDAgTDEwIDI1IFYxMzUgQzEwIDE4NSAxMDAgMjQwIDEwMCAyNDAgQzEwMCAyNDAgMTkwIDE4NSAxOTAgMTM1IFYyNSBaIi8+PHBhdGggZmlsbD0iIzE2MTYxNiIgZD0iTTEwMCAxMiBMMjIgMzQgVjEzMCBDMjIgMTczIDEwMCAyMjIgMTAwIDIyMiBDMTAwIDIyMiAxNzggMTczIDE3OCAxMzAgVjM0IFoiLz48ZyBmaWxsPSIjZmZmZmZmIj48cGF0aCBkPSJNNDIgNTUgSDgyIFY3MiBINjIgVjg1IEg3OCBWMTAwIEg2MiBWMTE1IEg4MiBWMTMyIEg0MiBaIi8+PHBhdGggZD0iTTg4IDU1IEgxMTggQzEyOCA1NSAxMzUgNjIgMTM1IDczIEMxMzUgODQgMTI5IDkxIDExOCA5MSBIMTA4IFYxMzIgSDg4IFogTTEwOCA3MSBIMTE1IEMxMTcgNzEgMTE4IDcyIDExOCA3MyBDMTE4IDc0IDExNyA3NSAxMTUgNzUgSDEwOCBaIi8+PHBhdGggZD0iTTE0MCA1NSBIMTU4IFYxMzIgSDE0MCBaIi8+PC9nPjxyZWN0IHg9IjQyIiB5PSIxNDUiIHdpZHRoPSIxMTYiIGhlaWdodD0iMjgiIHJ4PSI0IiBmaWxsPSIjZmZmZmZmIi8+PHRleHQgeD0iMTAwIiB5PSIxNjUiIGZpbGw9IiMwZjBmMGYiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSIxOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjIiPkdBTUVTPC90ZXh0Pjwvc3ZnPg==',
    'EA': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmY0NzQ3IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RWxlY3Ryb25pYyBBcnRzPC90aXRsZT48cGF0aCBkPSJNMTYuNjM1IDYuMTYybC01LjkyOCA5LjM3N0g0LjI0bDEuNTA4LTIuM2g0LjAyNGwxLjQ3NC0yLjMzNUgyLjI2NEwuNzkgMTMuMjM5aDIuMTU2TDAgMTcuODRoMTIuMDcybDQuNTYzLTcuMjU5IDEuNjUyIDIuNjZoLTEuNDAxbC0xLjQ3MyAyLjI5OWg0LjM0N2wxLjQ3MyAyLjNIMjR6bS0xMS40NjEuMTA3TDMuNyA4LjYwNGw5LjUyLS4wMzUgMS40NzQtMi4zeiIvPjwvc3ZnPg==',
    'EA Desktop': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmY0NzQ3IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RWxlY3Ryb25pYyBBcnRzPC90aXRsZT48cGF0aCBkPSJNMTYuNjM1IDYuMTYybC01LjkyOCA5LjM3N0g0LjI0bDEuNTA4LTIuM2g0LjAyNGwxLjQ3NC0yLjMzNUgyLjI2NEwuNzkgMTMuMjM5aDIuMTU2TDAgMTcuODRoMTIuMDcybDQuNTYzLTcuMjU5IDEuNjUyIDIuNjZoLTEuNDAxbC0xLjQ3MyAyLjI5OWg0LjM0N2wxLjQ3MyAyLjNIMjR6bS0xMS40NjEuMTA3TDMuNyA4LjYwNGw5LjUyLS4wMzUgMS40NzQtMi4zeiIvPjwvc3ZnPg==',
    'EA App': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmY0NzQ3IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RWxlY3Ryb25pYyBBcnRzPC90aXRsZT48cGF0aCBkPSJNMTYuNjM1IDYuMTYybC01LjkyOCA5LjM3N0g0LjI0bDEuNTA4LTIuM2g0LjAyNGwxLjQ3NC0yLjMzNUgyLjI2NEwuNzkgMTMuMjM5aDIuMTU2TDAgMTcuODRoMTIuMDcybDQuNTYzLTcuMjU5IDEuNjUyIDIuNjZoLTEuNDAxbC0xLjQ3MyAyLjI5OWg0LjM0N2wxLjQ3MyAyLjNIMjR6bS0xMS40NjEuMTA3TDMuNyA4LjYwNGw5LjUyLS4wMzUgMS40NzQtMi4zeiIvPjwvc3ZnPg==',
    'Origin': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmY0NzQ3IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RWxlY3Ryb25pYyBBcnRzPC90aXRsZT48cGF0aCBkPSJNMTYuNjM1IDYuMTYybC01LjkyOCA5LjM3N0g0LjI0bDEuNTA4LTIuM2g0LjAyNGwxLjQ3NC0yLjMzNUgyLjI2NEwuNzkgMTMuMjM5aDIuMTU2TDAgMTcuODRoMTIuMDcybDQuNTYzLTcuMjU5IDEuNjUyIDIuNjZoLTEuNDAxbC0xLjQ3MyAyLjI5OWg0LjM0N2wxLjQ3MyAyLjNIMjR6bS0xMS40NjEuMTA3TDMuNyA4LjYwNGw5LjUyLS4wMzUgMS40NzQtMi4zeiIvPjwvc3ZnPg==',
    'Xbox': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9Ijg4IiBoZWlnaHQ9Ijg4Ij48dGl0bGU+WGJveDwvdGl0bGU+PHBhdGggZmlsbD0iIzEwN2MxMCIgZD0iTTEyIDBDNS4zNzMgMCAwIDUuMzczIDAgMTJzNS4zNzMgMTIgMTIgMTIgMTItNS4zNzMgMTItMTJTMTguNjI3IDAgMTIgMHptLTEuMDc3IDIzLjgyYy0xLjgwOC0uMTczLTMuNjM4LS44MjItNS4yMDktMS44NDgtMS4zMTctLjg2LTEuNjE0LTEuMjEzLTEuNjE0LTEuOTE4IDAtMS40MTYgMS41NTctMy44OTcgNC4yMjItNi43MjUgMS41MTMtMS42MDYgMy42Mi0zLjQ4OCAzLjg0OC0zLjQzOC40NDMuMDk5IDMuOTg2IDMuNTU1IDUuMzEzIDUuMTgyIDIuMDk3IDIuNTcyIDMuMDYxIDQuNjc4IDIuNTcxIDUuNjE3LS4zNzIuNzE0LTIuNjgzIDIuMTA5LTQuMzggMi42NDUtMi40OS40NDItMy4yMzYuNjI5LTQuNzUxLjQ4NXptLTguNTk5LTUuMjFjLTEuMDk1LTEuNjgtMS42NDgtMy4zMzMtMS45MTUtNS43MjQtLjA4OC0uNzktLjA1Ny0xLjI0MS4yLTIuODYyLjMyLTIuMDE4IDEuNDctNC4zNTUgMi44NTMtNS43OTMuNTg5LS42MTEuNjQxLS42MjcgMS4zNTktLjM4NS44Ny4yOTUgMS44IC45MzcgMy4yNDMgMi4yNDJsLjg0My43NjItLjQ2MS41NjVjLTIuMTM1IDIuNjItNC4zODggNi4zMzgtNS4yMzYgOC42MzctLjQ2MSAxLjI1LS42NDYgMi41MDQtLjQ0NyAzLjAyNi4xMzQuMzUzLjAxMS4yMjItLjQzOS0uNDY4em0xOS4yMTUuMjg2Yy4xMDgtLjUyOC0uMDI5LTEuNDk3LS4zNDktMi40NzUtLjY5NC0yLjExOC0zLjAxNS02LjA1Ny01LjE0Ni04LjczNmwtLjY3MS0uODQzLjcyNi0uNjY2Yy45NDctLjg3IDEuNjA1LTEuMzkxIDIuMzE2LTEuODM0LjU2LS4zNDkgMS4zNi0uNjU4IDEuNzA1LS42NTguMjEyIDAgLjk1OS43NzcgMS41NjIgMS42MjMuOTM0IDEuMzA5IDEuNjIgMi44OTkgMS45NjggNC41NTIuMjI1IDEuMDY5LjI0NCAzLjM1NS4wMzYgNC40MjEtLjE3Mi44NzUtLjUzMiAyLjAwOS0uODgxIDIuNzc4LS4yNjUuNTc2LS45MTYgMS42OTQtMS4yMDUgMi4wNi0uMTQ3LjE4Ny0uMTQ3LjE4Ny0uMDY1LS4yMTd6TTExLjAyOSAzLjEzOEMxMC4wNDUgMi42MzkgOC41MjggMi4xMDMgNy42OSAxLjk1OWMtLjI5My0uMDUtLjc5NC0uMDc5LTEuMTEyLS4wNjMtLjY5Mi4wMzUtLjY2MS0uMDAxLjQ0OC0uNTI1LjkyMi0uNDM2IDEuNjkxLS42OTIgMi43MzUtLjkxMSAzLjE3NS0uMjQ2IDUuMzgyLS4yNDkgNi41MzgtLjAwNSAxLjI0OC4yNjMgMi43MTcuODEgMy41NDUgMS4zMmwuMjQ3LjE1MS0uNTY0LS4wMjhjLTIuNDc0LS4yOTgtNC4xMDguMTU2LTUuODY0IDEuMDExLS41My4yNTgtLjk5LjQ2NC0xLjAyNC40NTgtLjAzNC0uMDA3LS40NjUtLjIxNy0uOTYtLjQ2OHoiLz48L3N2Zz4=',
    'Battle.net': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMDBhZWZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+QmF0dGxlLm5ldDwvdGl0bGU+PHBhdGggZD0iTTE4Ljk0IDguMjk2QzE1LjkgNi44OTIgMTEuNTM0IDYgNy40MjYgNi4zMzJjLjIwNi0xLjM2LjcxNC0yLjMwOCAxLjU0OC0yLjUwOCAxLjE0OC0uMjc1IDIuNC40OCAzLjU5NCAxLjg1NC43ODIuMTAyIDEuNzEuMjggMi4zNTUuNDI5QzEyLjc0NyAyLjAxMyA5LjgyOC0uMjgyIDcuNjA3LjU2NWMtMS42ODguNjQ0LTIuNTUzIDIuOTctMi40NDggNi4wOTQtMi4yLjQ2OC0zLjkxNSAxLjMtNS4wMTMgMi40OTUtLjA1Ni4wNjUtLjE4MS4yMjctLjEzNy4zMDUuMDM0LjA1OC4xNDYtLjAwOC4xOTQtLjA0IDEuMjc0LS44OSAyLjkwNC0xLjM3MyA1LjAyNy0xLjY3Ni4zMDMgMy4zMzMgMS43MTMgNy41NiA0LjA1NSAxMC45NTItMS4yOC41MDItMi4zNTYuNTM2LTIuOTQ2LS4wODctLjgxMi0uODU2LS43ODQtMi4zMTgtLjE5LTQuMDRhMjYuNzY0IDI2Ljc2NCAwIDAgMS0uODA3LTIuMjU0Yy0yLjQ1OSAzLjkzNC0yLjk4NiA3LjYxLTEuMTQzIDkuMTEgMS40MDIgMS4xNCAzLjg0Ny43MjUgNi41MDItLjkyNiAxLjUwNSAxLjY3MiAzLjA4MyAyLjc0IDQuNjY3IDMuMDk0LjA4NC4wMTUuMjg3LjA0My4zMzItLjAzNC4wMzQtLjA2LS4wOC0uMTI0LS4xMzEtLjE0OS0xLjQwOC0uNjU3LTIuNjQtMS44MjgtMy45NjQtMy45MTUgMi43MzUtMS45MjkgNS42OTEtNS4yNjMgNy40NTctOC45ODggMS4wNzYuODYgMS42NCAxLjc3MyAxLjM5OCAyLjU5NS0uMzM2IDEuMTMxLTEuNjE1IDEuODQtMy40MDMgMi4xODVhMjcuNjk3IDI3LjY5NyAwIDAgMS0xLjU0OCAxLjgyNmM0LjYzNC4xNiA4LjA4LTEuMjIgOC40NTgtMy41NjUuMjg2LTEuNzg2LTEuMjk1LTMuNjk2LTQuMDUzLTUuMTcuNjk2LTIuMTM5LjgzMi00LjA0LjM0Ni01LjU4OC0uMDI5LS4wOC0uMTA2LS4yNy0uMTk2LS4yNy0uMDY4IDAtLjA2Ny4xMy0uMDYzLjE4Ny4xMzUgMS41NDctLjI2MyAzLjItMS4wNjIgNS4xOXptLTguNTMzIDkuODY5Yy0xLjk2LTMuMTQ1LTMuMDktNi44NDktMy4wODItMTAuNTk0IDMuNzAyLS4xMjQgNy40NzQuNzQ4IDEwLjcxNCAyLjYyNy0xLjc0MyAzLjI2OS00LjM4NSA2LjEtNy42MzMgNy45NjZ6Ii8+PC9zdmc+',
    'PlayStation': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMDA3MGQxIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+UGxheVN0YXRpb248L3RpdGxlPjxwYXRoIGQ9Ik04LjkwNSAxOC4wNjd2LTMuNzljMS4wNzkuNTIgMi4xNTguNzQgMy4yMzguNzQgMS4zNDQgMCAyLjA1LS40NCAyLjA1LTEuMjggMC0uODItLjU3LTEuMjItMS45Mi0xLjY2LTIuMTgtLjc0LTMuNjYtMS41Ny0zLjY2LTMuODMgMC0yLjI4IDEuNzYtMy44IDQuMzgtMy44IDEuNDkgMCAyLjc2LjM1IDMuOC45OXYzLjYzYy0xLjA3LS41OC0yLjE3LS44Mi0zLjIzLS44Mi0xLjIxIDAtMS44LjQ0LTEuOCAxLjE1IDAgLjc2LjU5IDEuMTUgMS45NSAxLjYyIDIuMzcuODQgMy42MyAxLjc3IDMuNjMgMy45MyAwIDIuNDUtMS44MyAzLjg3LTQuNTcgMy44Ny0xLjU5IDAtMi45OS0uMzktMy44Ni0xLjE1ek0yMy41IDE3LjVjLTEuNCAxLjA1LTMuMzcgMS44My01LjgzIDIuMjlsMS4xLTMuNjNjMS43OC0uMzQgMy4xOS0uODggNC4xNS0xLjU3LjU4LS40Mi43OS0uODQuNjItMS4xNS0uMjItLjM4LS44OS0uNTItMS45My0uNDFsLjktMy4wOGMxLjkyLS4xNSAzLjE1LjIyIDMuNjUuOTguNTQuODMuMTggMS44NC0uNzEgMi41My0uNzguNjEtMS43NCAxLjE0LTIuODUgMS41OHpNLjUgMTcuNWMuODkuNjkgMS44NSAxLjIyIDIuODUgMS41OC45Ni42OSAyLjM3IDEuMjMgNC4xNSAxLjU3bC0xLjEtMy42M2MtMi40Ni0uNDYtNC40My0xLjI0LTUuODMtMi4yOS0uODktLjY5LTEuMjUtMS43LS43MS0yLjUzLjUtLjc2IDEuNzMtMS4xMyAzLjY1LS45OGwtLjkgMy4wOGMtMS4wNC0uMTEtMS43MS4wMy0xLjkzLjQxLS4xNy4zMS4wNC43My42MiAxLjE1eiIvPjwvc3ZnPg==',
    'Ubisoft Connect': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMDBhZWZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+VWJpc29mdDwvdGl0bGU+PHBhdGggZD0iTTIzLjU2MSAxMS45ODhDMjMuMzAxLS4zMDQgNi45NTQtNC44OS42NTYgNi42MzRjLjI4Mi4yMDYuNjYxLjQ3Ny45NDMuNjcyYTExLjc0NyAxMS43NDcgMCAwMC0uOTc2IDMuMDY3IDExLjg4NSAxMS44ODUgMCAwMC0uMTg0IDIuMDcxQy40MzkgMTguODE4IDUuNjIxIDI0IDEyLjAwNSAyNGM2LjM4NSAwIDExLjU1Ni01LjE3IDExLjU1Ni0xMS41NTZ2LS40NTV6bS0yMC4yNyAyLjA2Yy0uMTUyIDEuMjQ2LS4wNTQgMS42MzYtLjA1NCAxLjc4OGwtLjI4Mi4wOThjLS4xMDgtLjIwNi0uMzctLjkzMi0uNDg4LTEuOTA4QzIuMTYzIDEwLjMwOCA0LjcgNi45NiA4LjU3IDYuMzNjMy41NDQtLjUyIDYuOTM3IDEuNjggNy43MjggNC43NThsLS4yODIuMDk4Yy0uMDg3LS4wODctLjIyOC0uMzM2LS43Ny0uODc4LTQuMjgxLTQuMjgxLTExLjAwMi0yLjMyLTExLjk1NiAzLjc0em0xMS4wMDIgMi4wODFhMy4xNDUgMy4xNDUgMCAwMS0yLjU5IDEuMzU1IDMuMTUgMy4xNSAwIDAxLTMuMTU1LTMuMTU1IDMuMTU5IDMuMTU5IDAgMDEyLjkyNy0zLjE0NGMxLjAxOC0uMDQzIDEuOTcyLjUxIDIuNDE2IDEuMzk4YTIuNTggMi41OCAwIDAxLS40NTUgMi45NWMuMjkzLjIwNS41NzUuNC44NTYuNTk1em02LjU4LjEyYy0xLjY2OSAzLjc4Mi01LjEwNiA1Ljc2Ni04Ljc3IDUuNzEyLTcuMDM0LS4zNDctOS4wODMtOC40NjYtNC4zOC0xMS4zOTNsLjIwNy4yMDZjLS4wNzYuMTA4LS4zNTguMzI1LS43OTEgMS4xODItLjUxIDEuMDQxLS42NzIgMi4wODEtLjYwNyAyLjczMi4zNjkgNS42NyA4LjMxNCA2LjgzIDExLjA0NSAxLjIxNEMyMS4wNTcgOC4yMTcgMTEuODIyLjQwMSAzLjYyNiA2LjM3NGwtLjE4NC0uMTg0QzUuNTk5IDIuODA4IDkuODE2IDEuMyAxMy44MzcgMi4zMDljNi4xNDcgMS4xNSA5LjQ1MyA3Ljk1NiA3LjAzNSAxMy45NHoiLz48L3N2Zz4=',
    'GOG Galaxy': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjYTA1NWY3IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+R09HLmNvbTwvdGl0bGU+PHBhdGggZD0iTTcuMTUgMTUuMjRINC4zNmEuNC40IDAgMCAwLS40LjR2MmMwIC4yMS4xOC40LjQuNGgyLjh2MS4zMmgtMy41Yy0uNTYgMC0xLjAyLS40Ni0xLjAyLTEuMDN2LTMuMzljMC0uNTYuNDYtMS4wMiAxLjAzLTEuMDJoMy40OHYxLjMyek0guMTYg\+MTEuNTRjMCAuNTgtLTY3IDEuMDUtMS4wNSAxLjA1SC42M3YtMS4zNWgzLjc4YS40LjQgMCAwIDAuNC0uNFY2LjM5YS40LjQgMCAwIDAtLjQtLjRINC4zOWEuNC40IDAgMCAwLS40MS40djIuMDJjMCAuMjMuMTE4LjQuNC40aDZ2MS4zNUgzLjY4Yy0uNTggMC0xLjA1LS40Ni0xLjA1LTEuMDRWNS42OGMwLS41Ny40Ny0xLjA0IDEuMDUtMS4wNEg3LjFjLjU4IDAgMS4wNS40NyAxLjA1IDEuMDR2NS44NnpNMjEuMzYgMTkuMzZoLTEuMzJ2LTQuMTJoLS45M2EuNC40IDAgMCAwLS40LjR2My43MmgtMS4zM3YtNC4xMmgtLjkzYS40LjQgMCAwIDAtLjQuNHYzLjcyaC0xLjMzdm00LjQyYzAtLjU2LjQ2LTEuMDIgMS4wMy0xLjAyaDUuNjF2NS40NHpNMjEuMzcgMTEuNTRjMCAuNTgtLjQ3IDEuMDUtMS4wNSAxLjA1aC00LjQ4di0xLjM1aDMuNzhhLjQuNCAwIDAgMCAuNC0uNFY2LjM5YS40LjQgMCAwIDAtLjQtLjRoLTIuMDNhLjQuNCAwIDAgMC0uNC40djIuMDJjMCAuMjMuMTguNC40LjRoMS42MnYxLjM1SDE2LjljLS41OCAwLTEuMDUtLjQ2LTEuMDUtMS4wNFY1LjY4YzAtLjU3LjQ3LTEuMDQgMS4wNS0xLjA0aDMuNDNjLjU4IDAgMS4wNS40NyAxLjA1IDEuMDR2NS44NnpNMTMuNzIgNC42NGgtMy40NGMtLjU4IDAtMS4wNC40Ny0xLjA0IDEuMDR2My40NGMwIC41OC40NiAxLjA0IDEuMDQgMS4wNGgzLjQ0Yy41NyAwIDEuMDQtLjQ2IDEuMDQtMS4wNFY1LjY4YzAtLjU3LS40Ny0xLjA0LTEuMDQtMS4wNG0tLjMgMS43NXYyLjAyYS40LjQgMCAwIDEtLjQuNGgtMi4wM2EuNC40IDAgMCAxLS40LS40VjYuNGMwLS4yMi4xNy0uNC40LS40SDEzYy4yMyAwIC4uMTguNC40ek0xMi42MyAxMy45Mkg5LjI0Yy0uNTcgMC0xLjAzLjQ2LTEuMDMgMS4wMnYzLjM5YzAgLjU3LjQ2IDEuMDMgMS4wMyAxLjAzaDMuMzljLjU3IDAgMS4wMy0uNDYgMS4wMy0xLjAzdi0zLjM5YzAtLjU2LS40Ni0xLjAyLTEuMDMtMS4wMm0tLjMgMS43MnYyYS40LjQgMCAwIDEtLjQuNHYtLjAxSDkuOTRhLjQuNCAwIDAgMS0uNC0uNHYtMS45OWMwLS4yMi4xOC0uNC40LS40aDJjLjIyIDAgLjQuMTguNC40ek0yMy40OSAxLjFhMS43NCAxLjc0IDAgMCAwLTEuMjQtLjUySDEuNzVBMS43NCAxLjc0IDAgMCAwIDAgMi4zM3YxOS4zNGExLjc0IDEuNzQgMCAwIDAgMS43NSAxLjc1aDIwLjVBMS43NCAxLjc0IDAgMCAwIDI0IDIxLjY3VjIuMzNjMC0uNDgtLjItLjkyLS41MS0xLjI0bTAgMjAuNThhMS4yMyAxLjIzIDAgMCAxLTEuMjQgMS4yNEgxLjc1QTEuMjMgMS4yMyAwIDAgMSAuNSAyMS42N1YyLjMzYTEuMjMgMS4yMyAwIDAgMSAxLjI0LTEuMjRoMjAuNWExLjI0IDEuMjQgMCAwIDEgMS4yNCAxLjI0djE5LjM0eiIvPjwvc3ZnPg==',
    'Riot Games': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+UmlvdCBHYW1lczwvdGl0bGU+PHBhdGggZD0iTTEzLjQ1OC44NiAwIDcuMDkzbDMuMzUzIDEyLjc2MSAyLjU1Mi0uMzEzLS43MDEtOC4wMjQuODM4LS4zNzMgMS40NDcgOC4yMDIgNC4zNjEtLjUzNS0uNzc1LTguODU3LjgzLS4zNyAxLjU5MSA5LjAyNSA0LjQxMi0uNTQyLS44NDktOS43MDguODQtLjM3NCAxLjc0IDkuODdMMjQgMTcuMzE4VjMuNVptLjMxNiAxOS4zNTYuMjIyIDEuMjU2TDI0IDIzLjE0di00LjE4bC0xMC4yMiAxLjI1NloiLz48L3N2Zz4=',
    'Rockstar Games': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmNhZjE3IiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+Um9ja3N0YXIgR2FtZXM8L3RpdGxlPjxwYXRoIGQ9Ik01Ljk3MSA2LjgxNmgzLjI0MWMxLjQ2OSAwIDIuNzQxLS40NDggMi43NDEtMi4wODQgMC0xLjMtMS4xMTctMS41NzYtMi4xOS0xLjU3Nkg2Ljc0OGwtLjc3NyAzLjY2Wm0xMi44MzQgOC43NTNoNS4xNjhsLTQuNjY0IDMuMjI4Ljc1NSA1LjA4Ny00LjA0MS0zLjA3TDEwLjU5OSAyNGwyLjUzNi01LjM5MnMtMi45NS0zLjA3NS0yLjk0Ny0zLjA3NWMtLjE5OC0uMjYyLS4yNjUtLjkzNi0uMjY1LTEuMjI2IDAtLjM2Ny4wMjQtLjczOS4wNDktMS4xMzQuMDI4LS40NTEuMDU4LS45MzMuMDU4LTEuNDc2IDAtMS4zMzgtLjU5LTIuMDM4LTIuMDM2LTIuMDM4SDUuMjgzbC0xLjE4IDUuNTI1SC4wMjZMMy4yNjkgMGg3LjY3MmMyLjg1MiAwIDUuMDI3LjcwMiA1LjAyNyAzLjkzNiAwIDIuMjc2LTEuMTIgMy44OTQtMy41OTIgNC4yMzN2LjA0NWMxLjE2Mi4yNzYgMS41OTggMS4wNjIgMS41OTggMi41MjcgMCAuNTg1LS4wMTggMS4wOTgtLjAzNCAxLjU4MS0uMDE1LjQyOC0uMDMuODM0LS4wMyAxLjI0MyAwIC41MjUuMTM3IDEuMzgyLjQ4IDEuOTY4aC41NjdsMy4wMjgtNS4wNi44MiA1LjA5NlptLTEuMjMzLTIuOTQ4LTIuMTg3IDMuNjU0aC0zLjQ1N2wyLjEwMyAyLjE4OS0xLjczIDMuNjcyIDMuNzc3LTIuMjE4IDIuOTc2IDIuMjYzLS41NTMtMy43MzEgMy4wOTMtMi4xMzloLTMuNDNsLS41OTItMy42OVoiLz48L3N2Zz4='
  };

  const launcherBanner = LAUNCHER_BANNERS[game.platform] || LAUNCHER_BANNERS[normPlatform];

  if (game.local_banner && game.local_banner !== 'null') {
    coverUrl = game.local_banner.startsWith('http') ? game.local_banner : `asset:///${game.local_banner.replace(/\\/g, '/')}`;
  } else if (steamAppId && !isLauncher) {
    coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
  } else if (isLauncher && launcherBanner) {
    coverUrl = launcherBanner;
  } else if (game.icon && game.icon !== 'null') {
    coverUrl = game.icon.startsWith('http') ? game.icon : `asset:///${game.icon.replace(/\\/g, '/')}`;
  } else if (launcherBanner) {
    coverUrl = launcherBanner;
  }

  const getLaunchUri = () => {
    if (game.platform === 'Steam' && steamAppId && !isLauncher) return `steam://rungameid/${steamAppId}`;
    if ((game.platform === 'Epic Games' || game.platform === 'Epic') && game.id && !isLauncher) return `com.epicgames.launcher://apps/${game.id}?action=launch&silent=true`;
    if ((game.platform === 'EA Desktop' || game.platform === 'EA App' || game.platform === 'Origin' || game.platform === 'EA') && game.id && !isLauncher) return `origin://launchgame/${game.id}`;
    if (game.platform === 'Ubisoft Connect' && game.id && !isLauncher) return `uplay://launch/${game.id}`;
    if (game.platform === 'GOG Galaxy' && game.id && !isLauncher) return `goggalaxy://openGameView/${game.id}`;
    if (game.platform === 'Battle.net' && game.id && !isLauncher) return `battlenet://play/${game.id}`;
    if (game.exe_path) return game.exe_path;
    if (game.platform === 'Steam') return 'steam://open/main';
    if (game.platform === 'Epic Games' || game.platform === 'Epic') return 'com.epicgames.launcher://store';
    if (game.platform === 'EA Desktop' || game.platform === 'EA App' || game.platform === 'Origin' || game.platform === 'EA') return 'origin://';
    if (game.platform === 'Ubisoft Connect') return 'uplay://';
    if (game.platform === 'GOG Galaxy') return 'goggalaxy://';
    if (game.platform === 'Battle.net') return 'battlenet://';
    if (game.platform === 'Xbox' || game.platform === 'Xbox App') return 'xbox:';
    return null;
  };

  const launchUri = getLaunchUri();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (launchUri && !isLaunching) {
      setIsLaunching(true);
      if ((window as any).electronAPI?.launchGame) {
        (window as any).electronAPI.launchGame(launchUri);
      } else {
        sendCommand('launch_game', { exe_path: launchUri });
      }
      setTimeout(() => setIsLaunching(false), 2500);
    }
  };

  const platformStyle = getPlatformStyle(game.platform);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group bg-white/3 hover:border-neon-green/30 rounded-3xl overflow-hidden transition-all duration-500 border border-white/5 flex flex-col justify-between shadow-lg"
    >
      {/* Cover Image */}
      <div
        onClick={handleLaunch}
        className="aspect-video relative overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer"
      >
        <img
          src={coverUrl}
          alt={game.name}
          className={`w-full h-full transition-transform duration-700 group-hover:scale-110 opacity-75 group-hover:opacity-100 ${isLauncher ? 'object-contain p-8' : 'object-cover'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const steamFallback = steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg` : null;
            const fallbackIcon = game.icon && game.icon !== 'null' ? (game.icon.startsWith('http') ? game.icon : `asset:///${game.icon.replace(/\\/g, '/')}`) : null;

            if (steamFallback && target.src !== steamFallback) {
              target.src = steamFallback;
            } else if (launcherBanner && target.src !== launcherBanner) {
              target.src = launcherBanner;
            } else if (fallbackIcon && target.src !== fallbackIcon && target.src !== inlineSvgPlaceholder) {
              target.src = fallbackIcon;
            } else if (target.src !== inlineSvgPlaceholder) {
              target.src = inlineSvgPlaceholder;
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
          <div
            onClick={handleLaunch}
            className="min-h-10 cursor-pointer"
          >
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
                    className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${colorClass}`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}

          {/* AI Genre/Mode Tags */}
          {game.tags && game.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap min-h-4">
              {game.tags.map((tag, i) => (
                <span key={`t-${i}`} className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 uppercase tracking-tighter border border-white/5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button aria-label="button" type="button"
            onClick={handleLaunch}
            disabled={!launchUri || isLaunching}
            className="relative flex-1 flex items-center justify-center gap-1.5 py-2 bg-neon-green hover:bg-[#8aff00] text-black font-black uppercase text-[9px] tracking-widest rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(118,185,0,0.25)] hover:shadow-[0_0_25px_rgba(118,185,0,0.45)] disabled:opacity-80 disabled:cursor-wait cursor-pointer overflow-hidden group"
          >
            {isLaunching && (
              <motion.div
                className="absolute inset-0 bg-black/20"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              />
            )}
            <div className="relative z-10 flex items-center gap-1.5">
              {isLaunching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{launchUri ? (isLauncher ? 'Launch Platform' : 'Execute') : 'Unavailable'}</span>
                </>
              )}
            </div>
          </button>

          {game.installations && game.installations.length > 1 && (
            <button aria-label="button" type="button"
              onClick={() => onOpenInstallations?.({
                title: game.name,
                coverUrl,
                primaryGenre: game.genre,
                installations: game.installations || [],
              })}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 hover:border-cyan-500/40 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
              title="Inspect All Node Installations"
            >
              <Server className="w-3.5 h-3.5" />
            </button>
          )}
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
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none opacity-50" />

        {/* Left: Progress Visualization */}
        <div className="relative shrink-0 flex flex-col items-center z-10">
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
  const [showNodeManager, setShowNodeManager] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [installationsModal, setInstallationsModal] = useState<{ title: string; coverUrl?: string; primaryGenre?: string; installations: GameInstallation[] } | null>(null);
  const { stats: distributedStats, serverOnline: libraryServerOnline } = useDistributedStats(userId);
  
  // Instant Local-First Cache: Load from localStorage on Frame-0 to eliminate loading screen delay
  const getPersistedGames = (): BackendGame[] => {
    try {
      const stored = localStorage.getItem(`mc_cached_library_${userId || 'guest'}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return [];
  };

  const persisted = getPersistedGames();
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
  // Tracks the auth state at which we last requested games, to fire a re-request when isSignedIn resolves
  const lastAuthStateRef = useRef<string>('');
  // Tracks previous userId to detect provider switches (userId changes while still signed in)
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  // Persist library snapshot to localStorage whenever updated
  useEffect(() => {
    if (games.length > 0) {
      try {
        localStorage.setItem(`mc_cached_library_${userId || 'guest'}`, JSON.stringify(games));
      } catch { }
    }
  }, [games, userId]);

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
      // Auth state changed — if we have local cache, keep gamesLoaded true!
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

    if (isSignedIn && (s?.game_library !== undefined || games.length > 0)) {
      setGamesLoaded(true);
      if (gamesRequestTimeoutRef.current) {
        clearTimeout(gamesRequestTimeoutRef.current);
        gamesRequestTimeoutRef.current = null;
      }
    } else if (isSignedIn && !gamesLoaded) {
      const now = Date.now();
      if (now - lastGamesRequestRef.current > 500) {
        lastGamesRequestRef.current = now;
        
        // Fast parallel request: Query local backend immediately
        sendCommand('get_cached_games', { userId: userId || undefined });

        // If distributed server is online, fetch with strict 1.5s timeout
        if (libraryServerOnline && userId) {
          const controller = new AbortController();
          const timerId = setTimeout(() => controller.abort(), 1500);

          fetchWithFailover(`/api/games?installed_only=true&clerk_id=${encodeURIComponent(userId)}`, { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
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
                    type: g.type || 'GAME',
                    icon: g.coverUrl || g.cover_url || g.icon,
                    local_banner: g.bannerUrl || g.banner_url || g.coverUrl || g.cover_url || g.local_banner,
                    install_path: firstInst?.installPath || firstInst?.install_path || g.install_path,
                    exe_path: firstInst?.exePath || firstInst?.exe_path || g.exe_path,
                    source: firstInst?.store || g.source,
                    installations: g.installations || [],
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
          setGamesLoaded(true);
        }, 1200); // 1.2s safety fallback to never keep screen stuck
      }
    }

    return () => {
      if (gamesRequestTimeoutRef.current) {
        clearTimeout(gamesRequestTimeoutRef.current);
        gamesRequestTimeoutRef.current = null;
      }
    };
  }, [state, userId, isSignedIn, gamesLoaded, games.length, sendCommand]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const gamesOnlyCount = useMemo(() => games.filter(g => g.type !== 'LAUNCHER' && g.genre !== 'PLATFORM').length, [games]);
  const launchersCount = useMemo(() => games.filter(g => g.type === 'LAUNCHER' || g.genre === 'PLATFORM').length, [games]);

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
    <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-y-auto custom-scrollbar gap-y-4 sm:gap-y-6">

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

          {!isSignedIn ? (
            <button aria-label="button" type="button"
              onClick={() => setMode?.('auth')}
              className="flex items-center gap-2 px-4 py-2 border border-neon-green/20 text-neon-green hover:bg-neon-green/10 hover:border-neon-green/40 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(118, 185, 0,0.1)] hover:shadow-[0_0_20px_rgba(118, 185, 0,0.2)] cursor-pointer"
            >
              Link Neural Node
            </button>
          ) : (
            <button aria-label="button" type="button"
              onClick={() => {
                setIsScanning(false);
                setScanProgress(0);
                setScanStatus('idle');
                setScanLogs([]);
                sendCommand('logout_user', { userId });
                signOut();
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
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
                {games.length} Found
              </span>
            </div>
          )}

          <button aria-label="button" type="button"
            onClick={triggerFullScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2.5 bg-neon-green text-black font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(118, 185, 0,0.3)] hover:shadow-[0_0_30px_rgba(118, 185, 0,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">{isScanning ? 'Scanning...' : 'Full Scan'}</span>
          </button>
        </div>
      </div>

      {/* Distributed Fleet Telemetry Bar */}
      {distributedStats && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-white/3 border border-white/6 rounded-2xl"
        >
          {/* Stats Pills */}
          {(() => {
            const displayGames = (distributedStats.total_master_games && distributedStats.total_master_games > 0)
              ? distributedStats.total_master_games
              : (distributedStats.total_installed_games && distributedStats.total_installed_games > 0)
                ? distributedStats.total_installed_games
                : (games.length || 0);

            const displayStorage = (distributedStats.total_storage_bytes && distributedStats.total_storage_bytes > 0)
              ? distributedStats.total_storage_bytes
              : (distributedStats.nodes && distributedStats.nodes.length > 0)
                ? distributedStats.nodes.reduce((sum, n) => sum + (n.storage_total || 0), 0)
                : 2045559955456;

            return (
              <>
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] font-black text-white">{displayGames.toLocaleString()}</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Games</span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] font-black text-white">{formatBytes(displayStorage)}</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Storage</span>
                </div>
              </>
            );
          })()}
          <div className="w-px h-3 bg-white/10" />
          {/* Node Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Server className="w-3.5 h-3.5 text-zinc-500" />
            {distributedStats.nodes && distributedStats.nodes.length > 0 ? (
              distributedStats.nodes.map(n => (
                <span
                  key={n.node_id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                    n.status === 'online'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      : 'bg-red-500/10 text-red-400 border-red-500/20 opacity-60'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${ n.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400' }`} />
                  {n.name}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest bg-white/5 text-zinc-400 border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Local Machine Node
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${libraryServerOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-zinc-400 border-white/10'}`}>
              {libraryServerOnline ? 'Fleet Sync: Online' : 'Fleet Sync: Standalone Mode'}
            </span>
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
          <div className="bg-white/3 border border-white/5 rounded-3xl p-4 sm:p-5 space-y-4">
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
                  <button aria-label="button" type="button"
                    onClick={() => handlePlatformChange('All')}
                    className={`shrink-0 px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all border cursor-pointer ${filter === 'All'
                      ? 'bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                      : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/5'
                      }`}
                  >
                    All
                  </button>
                  {platforms.map(p => {
                    const style = getPlatformStyle(p);
                    const count = games.filter(g => g.platform === p).length;
                    return (
                      <button aria-label="button" type="button"
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

              {/* Search & Toggle Filters — always on own row, full width */}
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 relative min-w-0">
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
                  <div className="h-px bg-white/5 mb-4" />

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
                            className="appearance-none bg-black/40 border border-white/5 hover:border-neon-green/20 text-zinc-300 focus:text-white rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest focus:outline-none transition-all cursor-pointer min-w-30"
                          >
                            <option value="All" className="bg-obsidian">All Genres</option>
                            {genres.map(g => (
                              <option key={g} value={g} className="bg-obsidian">{g}</option>
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


      {/* Node Manager Modal */}
      <AnimatePresence>
        {showNodeManager && <NodeManagerModal onClose={() => setShowNodeManager(false)} sendCommand={sendCommand} />}
      </AnimatePresence>

      {/* Discover Games Modal */}
      <AnimatePresence>
        {showDiscoverModal && (
          <DiscoverGamesModal
            onClose={() => setShowDiscoverModal(false)}
            onGameAdded={() => {
              // Refresh or signal update
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
