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

  // Platform-specific launcher banners (using more reliable URLs)
  const LAUNCHER_BANNERS: Record<string, string> = {
    'Steam': 'https://cdn.simpleicons.org/steam/ffffff',
    'Epic Games': 'https://cdn.simpleicons.org/epicgames/ffffff',
    'Epic': 'https://cdn.simpleicons.org/epicgames/ffffff',
    'Xbox': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+DQo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9Ijg4IiBoZWlnaHQ9Ijg4Ij48dGl0bGU+WGJveCBMb2dvPC90aXRsZT48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMzkuNzMgODYuOTFjLTYuNjI4LS42MzUtMTMuMzM4LTMuMDE1LTE5LjEwMi02Ljc3Ni00LjgzLTMuMTUtNS45Mi00LjQ0Ny01LjkyLTcuMDMyIDAtNS4xOTMgNS43MS0xNC4yOSAxNS40OC0yNC42NTggNS41NDctNS44OSAxMy4yNzUtMTIuNzkgMTQuMTEtMTIuNjA0IDEuNjI2LjM2MyAxNC42MTYgMTMuMDM0IDE5LjQ4IDE5IDcuNjkgOS40MyAxMS4yMjQgMTcuMTU0IDkuNDI4IDIwLjU5Ny0xLjM2NSAyLjYxNy05LjgzNyA3LjczMy0xNi4wNiA5LjY5OC01LjEzIDEuNjItMTEuODY3IDIuMzA2LTE3LjQxNiAxLjc3NXpNOC4xODQgNjcuNzAzYy00LjAxNC02LjE1OC02LjA0Mi0xMi4yMi03LjAyLTIwLjk4OC0uMzI0LTIuODk1LS4yMS00LjU1LjczMy0xMC40OTQgMS4xNzMtNy40IDUuMzktMTUuOTcgMTAuNDYtMjEuMjQgMi4xNTgtMi4yNCAyLjM1LTIuMyA0Ljk4Mi0xLjQxIDMuMTkgMS4wOCA2LjYgMy40MzYgMTEuODkgOC4yMmwzLjA5IDIuNzk0LTEuNjkgMi4wN2MtNy44MjggOS42MS0xNi4wOSAyMy4yNC0xOS4yIDMxLjY3LTEuNjkgNC41OC0yLjM3IDkuMTgtMS42NCAxMS4wOTUuNDkgMS4yOTQuMDQuODEyLTEuNjEtMS43MTR6bTcwLjQ1MyAxLjA0N2MuMzk3LTEuOTM2LS4xMDUtNS40OS0xLjI4LTkuMDc2LTIuNTQ1LTcuNzY1LTExLjA1NC0yMi4yMS0xOC44NjctMzIuMDMybC0yLjQ2LTMuMDkyIDIuNjYyLTIuNDQzYzMuNDc0LTMuMTkgNS44ODYtNS4xIDguNDktNi43MjMgMi4wNTMtMS4yOCA0Ljk4OC0yLjQxMyA2LjI1LTIuNDEzLjc3NyAwIDMuNTE2IDIuODUgNS43MjYgNS45NSAzLjQyNCA0LjggNS45NDIgMTAuNjMgNy4yMTggMTYuNjkuODI1IDMuOTIuODk0IDEyLjMuMTMzIDE2LjIxLS42MyAzLjIwOC0xLjk1IDcuMzY2LTMuMjMgMTAuMTg3LS45NyAyLjExMy0zLjM2IDYuMjE4LTQuNDEgNy41NTQtLjU0LjY4Ny0uNTQuNjg2LS4yNC0uNzk2ek00MC40NCAxMS41MDVDMzYuODM0IDkuNjc1IDMxLjI3MiA3LjcxIDI4LjIgNy4xOGMtMS4wNzYtLjE4NS0yLjkxMy0uMjktNC4wOC0uMjMtMi41MzYuMTI4LTIuNDIzLS4wMDQgMS42NDMtMS45MjUgMy4zOC0xLjU5NyA2LjItMi41MzYgMTAuMDMtMy4zNEM0MC4wOTguNzggNDguMTkzLjc3IDUyLjQzIDEuNjYzYzQuNTc1Ljk2NSA5Ljk2NCAyLjk3IDEzIDQuODRsLjkwNC41NTQtMi4wNy0uMTA0QzYwLjE0OCA2Ljc0NSA1NC4xNSA4LjQwOCA0Ny43MSAxMS41NGMtMS45NDIuOTQ2LTMuNjMgMS43LTMuNzU0IDEuNjgtLjEyMy0uMDI0LTEuNzA2LS43OTUtMy41Mi0xLjcxNXoiLz48L3N2Zz4=',
    'Xbox App': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+DQo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9Ijg4IiBoZWlnaHQ9Ijg4Ij48dGl0bGU+WGJveCBMb2dvPC90aXRsZT48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMzkuNzMgODYuOTFjLTYuNjI4LS42MzUtMTMuMzM4LTMuMDE1LTE5LjEwMi02Ljc3Ni00LjgzLTMuMTUtNS45Mi00LjQ0Ny01LjkyLTcuMDMyIDAtNS4xOTMgNS43MS0xNC4yOSAxNS40OC0yNC42NTggNS41NDctNS44OSAxMy4yNzUtMTIuNzkgMTQuMTEtMTIuNjA0IDEuNjI2LjM2MyAxNC42MTYgMTMuMDM0IDE5LjQ4IDE5IDcuNjkgOS40MyAxMS4yMjQgMTcuMTU0IDkuNDI4IDIwLjU5Ny0xLjM2NSAyLjYxNy05LjgzNyA3LjczMy0xNi4wNiA5LjY5OC01LjEzIDEuNjItMTEuODY3IDIuMzA2LTE3LjQxNiAxLjc3NXpNOC4xODQgNjcuNzAzYy00LjAxNC02LjE1OC02LjA0Mi0xMi4yMi03LjAyLTIwLjk4OC0uMzI0LTIuODk1LS4yMS00LjU1LjczMy0xMC40OTQgMS4xNzMtNy40IDUuMzktMTUuOTcgMTAuNDYtMjEuMjQgMi4xNTgtMi4yNCAyLjM1LTIuMyA0Ljk4Mi0xLjQxIDMuMTkgMS4wOCA2LjYgMy40MzYgMTEuODkgOC4yMmwzLjA5IDIuNzk0LTEuNjkgMi4wN2MtNy44MjggOS42MS0xNi4wOSAyMy4yNC0xOS4yIDMxLjY3LTEuNjkgNC41OC0yLjM3IDkuMTgtMS42NCAxMS4wOTUuNDkgMS4yOTQuMDQuODEyLTEuNjEtMS43MTR6bTcwLjQ1MyAxLjA0N2MuMzk3LTEuOTM2LS4xMDUtNS40OS0xLjI4LTkuMDc2LTIuNTQ1LTcuNzY1LTExLjA1NC0yMi4yMS0xOC44NjctMzIuMDMybC0yLjQ2LTMuMDkyIDIuNjYyLTIuNDQzYzMuNDc0LTMuMTkgNS44ODYtNS4xIDguNDktNi43MjMgMi4wNTMtMS4yOCA0Ljk4OC0yLjQxMyA2LjI1LTIuNDEzLjc3NyAwIDMuNTE2IDIuODUgNS43MjYgNS45NSAzLjQyNCA0LjggNS45NDIgMTAuNjMgNy4yMTggMTYuNjkuODI1IDMuOTIuODk0IDEyLjMuMTMzIDE2LjIxLS42MyAzLjIwOC0xLjk1IDcuMzY2LTMuMjMgMTAuMTg3LS45NyAyLjExMy0zLjM2IDYuMjE4LTQuNDEgNy41NTQtLjU0LjY4Ny0uNTQuNjg2LS4yNC0uNzk2ek00MC40NCAxMS41MDVDMzYuODM0IDkuNjc1IDMxLjI3MiA3LjcxIDI4LjIgNy4xOGMtMS4wNzYtLjE4NS0yLjkxMy0uMjktNC4wOC0uMjMtMi41MzYuMTI4LTIuNDIzLS4wMDQgMS42NDMtMS45MjUgMy4zOC0xLjU5NyA2LjItMi41MzYgMTAuMDMtMy4zNEM0MC4wOTguNzggNDguMTkzLjc3IDUyLjQzIDEuNjYzYzQuNTc1Ljk2NSA5Ljk2NCAyLjk3IDEzIDQuODRsLjkwNC41NTQtMi4wNy0uMTA0QzYwLjE0OCA2Ljc0NSA1NC4xNSA4LjQwOCA0Ny43MSAxMS41NGMtMS45NDIuOTQ2LTMuNjMgMS43LTMuNzU0IDEuNjgtLjEyMy0uMDI0LTEuNzA2LS43OTUtMy41Mi0xLjcxNXoiLz48L3N2Zz4=',
    'EA Desktop': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RUE8L3RpdGxlPjxwYXRoIGQ9Ik0xNi42MzUgNi4xNjJsLTUuOTI4IDkuMzc3SDQuMjRsMS41MDgtMi4zaDQuMDI0bDEuNDc0LTIuMzM1SDIuMjY0TC43OSAxMy4yMzloMi4xNTZMMCAxNy44NGgxMi4wNzJsNC41NjMtNy4yNTkgMS42NTIgMi42NmgtMS40MDFsLTEuNDczIDIuMjk5aDQuMzQ3bDEuNDczIDIuM0gyNHptLTExLjQ2MS4xMDdMMy43IDguNjA0bDkuNTItLjAzNSAxLjQ3NC0yLjN6Ii8+PC9zdmc+',
    'Origin': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RUE8L3RpdGxlPjxwYXRoIGQ9Ik0xNi42MzUgNi4xNjJsLTUuOTI4IDkuMzc3SDQuMjRsMS41MDgtMi4zaDQuMDI0bDEuNDc0LTIuMzM1SDIuMjY0TC43OSAxMy4yMzloMi4xNTZMMCAxNy44NGgxMi4wNzJsNC41NjMtNy4yNTkgMS42NTIgMi42NmgtMS40MDFsLTEuNDczIDIuMjk5aDQuMzQ3bDEuNDczIDIuM0gyNHptLTExLjQ2MS4xMDdMMy43IDguNjA0bDkuNTItLjAzNSAxLjQ3NC0yLjN6Ii8+PC9zdmc+',
    'Ubisoft Connect': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+VWJpc29mdDwvdGl0bGU+PHBhdGggZD0iTTIzLjU2MSAxMS45ODhDMjMuMzAxLS4zMDQgNi45NTQtNC44OS42NTYgNi42MzRjLjI4Mi4yMDYuNjYxLjQ3Ny45NDMuNjcyYTExLjc0NyAxMS43NDcgMCAwMC0uOTc2IDMuMDY3IDExLjg4NSAxMS44ODUgMCAwMC0uMTg0IDIuMDcxQy40MzkgMTguODE4IDUuNjIxIDI0IDEyLjAwNSAyNGM2LjM4NSAwIDExLjU1Ni01LjE3IDExLjU1Ni0xMS41NTZ2LS40NTV6bS0yMC4yNyAyLjA2Yy0uMTUyIDEuMjQ2LS4wNTQgMS42MzYtLjA1NCAxLjc4OGwtLjI4Mi4wOThjLS4xMDgtLjIwNi0uMzctLjkzMi0uNDg4LTEuOTA4QzIuMTYzIDEwLjMwOCA0LjcgNi45NiA4LjU3IDYuMzNjMy41NDQtLjUyIDYuOTM3IDEuNjggNy43MjggNC43NThsLS4yODIuMDk4Yy0uMDg3LS4wODctLjIyOC0uMzM2LS43Ny0uODc4LTQuMjgxLTQuMjgxLTExLjAwMi0yLjMyLTExLjk1NiAzLjc0em0xMS4wMDIgMi4wODFhMy4xNDUgMy4xNDUgMCAwMS0yLjU5IDEuMzU1IDMuMTUgMy4xNSAwIDAxLTMuMTU1LTMuMTU1IDMuMTU5IDMuMTU5IDAgMDEyLjkyNy0zLjE0NGMxLjAxOC0uMDQzIDEuOTcyLjUxIDIuNDE2IDEuMzk4YTIuNTggMi41OCAwIDAxLS40NTUgMi45NWMuMjkzLjIwNS41NzUuNC44NTYuNTk1em02LjU4LjEyYy0xLjY2OSAzLjc4Mi01LjEwNiA1Ljc2Ni04Ljc3IDUuNzEyLTcuMDM0LS4zNDctOS4wODMtOC40NjYtNC4zOC0xMS4zOTNsLjIwNy4yMDZjLS4wNzYuMTA4LS4zNTguMzI1LS43OTEgMS4xODItLjUxIDEuMDQxLS42NzIgMi4wODEtLjYwNyAyLjczMi4zNjkgNS42NyA4LjMxNCA2LjgzIDExLjA0NSAxLjIxNEMyMS4wNTcgOC4yMTcgMTEuODIyLjQwMSAzLjYyNiA2LjM3NGwtLjE4NC0uMTg0QzUuNTk5IDIuODA4IDkuODE2IDEuMyAxMy44MzcgMi4zMDljNi4xNDcgMS41NSA5LjQ1MyA3Ljk1NiA3LjAzNSAxMy45NHoiLz48L3N2Zz4=',
    'Battle.net': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+QmF0dGxlLm5ldDwvdGl0bGU+PHBhdGggZD0iTTE4Ljk0IDguMjk2QzE1LjkgNi44OTIgMTEuNTM0IDYgNy40MjYgNi4zMzJjLjIwNi0xLjM2LjcxNC0yLjMwOCAxLjU0OC0yLjUwOCAxLjE0OC0uMjc1IDIuNC40OCAzLjU5NCAxLjg1NC43ODIuMTAyIDEuNzEuMjggMi4zNTUuNDI5QzEyLjc0NyAyLjAxMyA5LjgyOC0uMjgyIDcuNjA3LjU2NWMtMS42ODguNjQ0LTIuNTUzIDIuOTctMi40NDggNi4wOTQtMi4yLjQ2OC0zLjkxNSAxLjMtNS4wMTMgMi40OTUtLjA1Ni4wNjUtLjE4MS4yMjctLjEzNy4zMDUuMDM0LjA1OC4xNDYtLjAwOC4xOTQtLjA0IDEuMjc0LS44OSAyLjkwNC0xLjM3MyA1LjAyNy0xLjY3Ni4zMDMgMy4zMzMgMS43MTMgNy41NiA0LjA1NSAxMC45NTItMS4yOC41MDItMi4zNTYuNTM2LTIuOTQ2LS4wODctLjgxMi0uODU2LS43ODQtMi4zMTgtLjE5LTQuMDRhMjYuNzY0IDI2Ljc2NCAwIDAgMS0uODA3LTIuMjU0Yy0yLjQ1OSAzLjkzNC0yLjk4NiA3LjYxLTEuMTQzIDkuMTEgMS40MDIgMS4xNCAzLjg0Ny43MjUgNi41MDItLjkyNiAxLjUwNSAxLjY3MiAzLjA4MyAyLjc0IDQuNjY3IDMuMDk0LjA4NC4wMTUuMjg3LjA0My4zMzItLjAzNC4wMzQtLjA2LS4wOC0uMTI0LS4xMzEtLjE0OS0xLjQwOC0uNjU3LTIuNjQtMS44MjgtMy45NjQtMy41MTUgMi43MzUtMS45MjkgNS42OTEtNS4yNjMgNy40NTctOC45ODggMS4wNzYuODYgMS42NCAxLjc3MyAxLjM5OCAyLjU5NS0uMzM2IDEuMTMxLTEuNjE1IDEuODQtMy40MDMgMi4xODVhMjcuNjk3IDI3LjY5NyAwIDAgMS0xLjU0OCAxLjgyNmM0LjYzNC4xNiA4LjA4LTEuMjIgOC40NTgtMy41NjUuMjg2LTEuNzg2LTEuMjk1LTMuNjk2LTQuMDUzLTUuMTcuNjk2LTIuMTM5LjgzMi00LjA0LjM0Ni01LjU4OC0uMDI5LS4wOC0uMTA2LS4yNy0uMTk2LS4yNy0uMDY4IDAtLjA2Ny4xMy0uMDYzLjE4Ny4xMzUgMS41NDctLjI2MyAzLjItMS4wNjIgNS4xOXptLTguNTMzIDkuODY5Yy0xLjk2LTMuMTQ1LTMuMDktNi44NDktMy4wODItMTAuNTk0IDMuNzAyLS4xMjQgNy40NzQuNzQ4IDEwLjcxNCAyLjYyNy0xLjc0MyAzLjI2OS00LjM4NSA2LjEtNy42MzMgNy45NjZoLjAwMXoiLz48L3N2Zz4=',
    'GOG Galaxy': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+R09HLmNvbTwvdGl0bGU+PHBhdGggZD0iTTcuMTUgMTUuMjRINC4zNmEuNC40IDAgMCAwLS40LjR2MmMwIC4yMS4xOC40LjQuNGgyLjh2MS4zMmgtMy41Yy0uNTYgMC0xLjAyLS40Ni0xLjAyLTEuMDN2LTMuMzljMC0uNTYuNDYtMS4wMiAxLjAzLTEuMDJoMy40OHYxLjMyek04LjE2IDExLjU0YzAgLjU4LS40NyAxLjA1LTEuMDUgMS4wNUgyLjYzdi0xLjM1aDMuNzhhLjQuNCAwIDAgMCAuNC0uNFY2LjM5YS40LjQgMCAwIDAtLjQtLjRINC4zOWEuNC40IDAgMCAwLS40MS40djIuMDJjMCAuMjMuMTguNC40LjRINnYxLjM1SDMuNjhjLS41OCAwLTEuMDUtLjQ2LTEuMDUtMS4wNFY1LjY4YzAtLjU3LjQ3LTEuMDQgMS4wNS0xLjA0SDcuMWMuNTggMCAxLjA1LjQ3IDEuMDUgMS4wNHY1Ljg2ek0yMS4zNiAxOS4zNmgtMS4zMnYtNC4xMmgtLjkzYS40LjQgMCAwIDAtLjQuNHYzLjcyaC0xLjMzdi00LjEyaC0uOTNhLjQuNCAwIDAgMC0uNC40djMuNzJoLTEuMzN2LTQuNDJjMC0uNTYuNDYtMS4wMiAxLjAzLTEuMDJoNS42MXY1LjQ0ek0yMS4zNyAxMS41NGMwIC41OC0uNDcgMS4wNS0xLjA1IDEuMDVoLTQuNDh2LTEuMzVoMy43OGEuNC40IDAgMCAwIC40LS40VjYuMzlhLjQuNCAwIDAgMC0uNC0uNGgtMi4wM2EuNC40IDAgMCAwLS40LjR2Mi4wMmMwIC4yMy4xOC40LjQuNGgxLjYydjEuMzVIMTYuOWMtLjU4IDAtMS4wNS0uNDYtMS4wNS0xLjA0VjUuNjhjMC0uNTcuNDctMS4wNCAxLjA1LTEuMDRoMy40M2MuNTggMCAxLjA1LjQ3IDEuMDUgMS4wNHY1Ljg2ek0xMy43MiA0LjY0aC0zLjQ0Yy0uNTggMC0xLjA0LjQ3LTEuMDQgMS4wNHYzLjQ0YzAgLjU4LjQ2IDEuMDQgMS4wNCAxLjA0aDMuNDRjLjU3IDAgMS4wNC0uNDYgMS4wNC0xLjA0VjUuNjhjMC0uNTctLjQ3LTEuMDQtMS4wNC0xLjA0bS0uMyAxLjc1djIuMDJhLjQuNCAwIDAgMS0uNC40aC0yLjAzYS40LjQgMCAwIDEtLjQtLjRWNi40YzAtLjIyLjE3LS40LjQtLjRIMTNjLjIzIDAgLjQuMTguNC40ek0xMi42MyAxMy45Mkg5LjI0Yy0uNTcgMC0xLjAzLjQ2LTEuMDMgMS4wMnYzLjM5YzAgLjU3LjQ2IDEuMDMgMS4wMyAxLjAzaDMuMzljLjU3IDAgMS4wMy0uNDYgMS4wMy0xLjAzdi0zLjM5YzAtLjU2LS40Ni0xLjAyLTEuMDMtMS4wMm0tLjMgMS43MnYyYS40LjQgMCAwIDEtLjQuNHYtLjAxSDkuOTRhLjQuNCAwIDAgMS0uNC0uNHYtMS45OWMwLS4yMi4xOC0uNC40LS40aDJjLjIyIDAgLjQuMTguNC40ek0yMy40OSAxLjFhMS43NCAxLjc0IDAgMCAwLTEuMjQtLjUySDEuNzVBMS43NCAxLjc0IDAgMCAwIDAgMi4zM3YxOS4zNGExLjc0IDEuNzQgMCAwIDAgMS43NSAxLjc1aDIwLjVBMS43NCAxLjc0IDAgMCAwIDI0IDIxLjY3VjIuMzNjMC0uNDgtLjItLjkyLS41MS0xLjI0bTAgMjAuNThhMS4yMyAxLjIzIDAgMCAxLTEuMjQgMS4yNEgxLjc1QTEuMjMgMS4yMyAwIDAgMSAuNSAyMS42N1YyLjMzYTEuMjMgMS4yMyAwIDAgMSAxLjI0LTEuMjRoMjAuNWExLjI0IDEuMjQgMCAwIDEgMS4yNCAxLjI0djE5LjM0eiIvPjwvc3ZnPg==',
    'Riot Games': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+UmlvdCBHYW1lczwvdGl0bGU+PHBhdGggZD0iTTEzLjQ1OC44NiAwIDcuMDkzbDMuMzUzIDEyLjc2MSAyLjU1Mi0uMzEzLS43MDEtOC4wMjQuODM4LS4zNzMgMS40NDcgOC4yMDIgNC4zNjEtLjUzNS0uNzc1LTguODU3LjgzLS4zNyAxLjU5MSA5LjAyNSA0LjQxMi0uNTQyLS44NDktOS43MDguODQtLjM3NCAxLjc0IDkuODdMMjQgMTcuMzE4VjMuNVptLjMxNiAxOS4zNTYuMjIyIDEuMjU2TDI0IDIzLjE0di00LjE4bC0xMC4yMiAxLjI1NloiLz48L3N2Zz4=',
    'Rockstar Games': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+Um9ja3N0YXIgR2FtZXM8L3RpdGxlPjxwYXRoIGQ9Ik01Ljk3MSA2LjgxNmgzLjI0MWMxLjQ2OSAwIDIuNzQxLS40NDggMi43NDEtMi4wODQgMC0xLjMtMS4xMTctMS41NzYtMi4xOS0xLjU3Nkg2Ljc0OGwtLjc3NyAzLjY2Wm0xMi44MzQgOC43NTNoNS4xNjhsLTQuNjY0IDMuMjI4Ljc1NSA1LjA4Ny00LjA0MS0zLjA3TDEwLjU5OSAyNGwyLjUzNi01LjM5MnMtMi45NS0zLjA3NS0yLjk0Ny0zLjA3NWMtLjE5OC0uMjYyLS4yNjUtLjkzNi0uMjY1LTEuMjI2IDAtLjM2Ny4wMjQtLjczOS4wNDktMS4xMzQuMDI4LS40NTEuMDU4LS45MzMuMDU4LTEuNDc2IDAtMS4zMzgtLjU5LTIuMDM4LTIuMDM2LTIuMDM4SDUuMjgzbC0xLjE4IDUuNTI1SC4wMjZMMy4yNjkgMGg3LjY3MmMyLjg1MiAwIDUuMDI3LjcwMiA1LjAyNyAzLjkzNiAwIDIuMjc2LTEuMTIgMy44OTQtMy41OTIgNC4yMzN2LjA0NWMxLjE2Mi4yNzYgMS41OTggMS4wNjIgMS41OTggMi41MjcgMCAuNTg1LS4wMTggMS4wOTgtLjAzNCAxLjU4MS0uMDE1LjQyOC0uMDMuODM0LS4wMyAxLjI0MyAwIC41MjUuMTM3IDEuMzgyLjQ4IDEuOTY4aC41NjdsMy4wMjgtNS4wNi44MiA1LjA5NlptLTEuMjMzLTIuOTQ4LTIuMTg3IDMuNjU0aC0zLjQ1N2wyLjEwMyAyLjE4OS0xLjczIDMuNjcyIDMuNzc3LTIuMjE4IDIuOTc2IDIuMjYzLS41NTMtMy43MzEgMy4wOTMtMi4xMzloLTMuNDNsLS41OTItMy42OVoiLz48L3N2Zz4='
  };

  // Robust launcher detection: Check type, genre, and platform name
  const isLauncher =
    game.type?.toUpperCase() === 'LAUNCHER' ||
    game.genre?.toUpperCase() === 'PLATFORM' ||
    ['Steam', 'Epic Games', 'Xbox', 'EA Desktop', 'Origin'].includes(game.platform) && game.name.toLowerCase().includes('app') ||
    game.name.toLowerCase() === game.platform.toLowerCase();

  if (game.local_banner) {
    coverUrl = game.local_banner.startsWith('http') ? game.local_banner : `asset:///${game.local_banner.replace(/\\/g, '/')}`;
  } else if (game.platform === 'Steam' && game.id && !isLauncher) {
    coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/header.jpg`;
  } else if (isLauncher && LAUNCHER_BANNERS[game.platform]) {
    coverUrl = LAUNCHER_BANNERS[game.platform];
  } else if (game.icon && game.icon !== 'null') {
    coverUrl = game.icon.startsWith('http') ? game.icon : `asset:///${game.icon.replace(/\\/g, '/')}`;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group bg-white/[0.03] hover:border-neon-green/30 rounded-3xl overflow-hidden transition-all duration-500 border border-white/5"
    >
      {/* Cover Image */}
      <div className="aspect-video relative overflow-hidden bg-black/40 flex items-center justify-center">
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
      <div className="p-4 space-y-3">
        <div className="min-h-10">
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

        {/* View button */}
        <button aria-label="button" type="button"
          onClick={() => sendCommand('view_game', { game })}
          className="w-full flex items-center justify-center gap-2 py-2 bg-white/4 hover:bg-neon-green hover:text-black rounded-xl transition-all duration-300 border border-white/6 hover:border-neon-green group/btn"
        >
          <span className="text-[9px] font-black uppercase tracking-widest">
            Preview
          </span>
        </button>
      </div>
    </motion.div>
  );
};

// ── Game Preview Modal ─────────────────────────────────────────────────────────
const GamePreviewModal: React.FC<{
  game: BackendGame;
  onClose: () => void;
  sendCommand: (type: string, payload?: any) => void;
}> = ({ game, onClose, sendCommand }) => {
  const seed = encodeURIComponent(game.name);

  // High-fidelity cover art strategy
  let coverUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0a0a0a&shape1Color=1a1a2e&shape2Color=16213e&shape3Color=0f3460`;
  const LAUNCHER_BANNERS: Record<string, string> = {
    'Steam': 'https://cdn.simpleicons.org/steam/ffffff',
    'Epic Games': 'https://cdn.simpleicons.org/epicgames/ffffff',
    'Epic': 'https://cdn.simpleicons.org/epicgames/ffffff',
    'Xbox': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+DQo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9Ijg4IiBoZWlnaHQ9Ijg4Ij48dGl0bGU+WGJveCBMb2dvPC90aXRsZT48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMzkuNzMgODYuOTFjLTYuNjI4LS42MzUtMTMuMzM4LTMuMDE1LTE5LjEwMi02Ljc3Ni00LjgzLTMuMTUtNS45Mi00LjQ0Ny01LjkyLTcuMDMyIDAtNS4xOTMgNS43MS0xNC4yOSAxNS40OC0yNC42NTggNS41NDctNS44OSAxMy4yNzUtMTIuNzkgMTQuMTEtMTIuNjA0IDEuNjI2LjM2MyAxNC42MTYgMTMuMDM0IDE5LjQ4IDE5IDcuNjkgOS40MyAxMS4yMjQgMTcuMTU0IDkuNDI4IDIwLjU5Ny0xLjM2NSAyLjYxNy05LjgzNyA3LjczMy0xNi4wNiA5LjY5OC01LjEzIDEuNjItMTEuODY3IDIuMzA2LTE3LjQxNiAxLjc3NXpNOC4xODQgNjcuNzAzYy00LjAxNC02LjE1OC02LjA0Mi0xMi4yMi03LjAyLTIwLjk4OC0uMzI0LTIuODk1LS4yMS00LjU1LjczMy0xMC40OTQgMS4xNzMtNy40IDUuMzktMTUuOTcgMTAuNDYtMjEuMjQgMi4xNTgtMi4yNCAyLjM1LTIuMyA0Ljk4Mi0xLjQxIDMuMTkgMS4wOCA2LjYgMy40MzYgMTEuODkgOC4yMmwzLjA5IDIuNzk0LTEuNjkgMi4wN2MtNy44MjggOS42MS0xNi4wOSAyMy4yNC0xOS4yIDMxLjY3LTEuNjkgNC41OC0yLjM3IDkuMTgtMS42NCAxMS4wOTUuNDkgMS4yOTQuMDQuODEyLTEuNjEtMS43MTR6bTcwLjQ1MyAxLjA0N2MuMzk3LTEuOTM2LS4xMDUtNS40OS0xLjI4LTkuMDc2LTIuNTQ1LTcuNzY1LTExLjA1NC0yMi4yMS0xOC44NjctMzIuMDMybC0yLjQ2LTMuMDkyIDIuNjYyLTIuNDQzYzMuNDc0LTMuMTkgNS44ODYtNS4xIDguNDktNi43MjMgMi4wNTMtMS4yOCA0Ljk4OC0yLjQxMyA2LjI1LTIuNDEzLjc3NyAwIDMuNTE2IDIuODUgNS43MjYgNS45NSAzLjQyNCA0LjggNS45NDIgMTAuNjMgNy4yMTggMTYuNjkuODI1IDMuOTIuODk0IDEyLjMuMTMzIDE2LjIxLS42MyAzLjIwOC0xLjk1IDcuMzY2LTMuMjMgMTAuMTg3LS45NyAyLjExMy0zLjM2IDYuMjE4LTQuNDEgNy41NTQtLjU0LjY4Ny0uNTQuNjg2LS4yNC0uNzk2ek00MC40NCAxMS41MDVDMzYuODM0IDkuNjc1IDMxLjI3MiA3LjcxIDI4LjIgNy4xOGMtMS4wNzYtLjE4NS0yLjkxMy0uMjktNC4wOC0uMjMtMi41MzYuMTI4LTIuNDIzLS4wMDQgMS42NDMtMS45MjUgMy4zOC0xLjU5NyA2LjItMi41MzYgMTAuMDMtMy4zNEM0MC4wOTguNzggNDguMTkzLjc3IDUyLjQzIDEuNjYzYzQuNTc1Ljk2NSA5Ljk2NCAyLjk3IDEzIDQuODRsLjkwNC41NTQtMi4wNy0uMTA0QzYwLjE0OCA2Ljc0NSA1NC4xNSA4LjQwOCA0Ny43MSAxMS41NGMtMS45NDIuOTQ2LTMuNjMgMS43LTMuNzU0IDEuNjgtLjEyMy0uMDI0LTEuNzA2LS43OTUtMy41Mi0xLjcxNXoiLz48L3N2Zz4=',
    'Xbox App': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+DQo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9Ijg4IiBoZWlnaHQ9Ijg4Ij48dGl0bGU+WGJveCBMb2dvPC90aXRsZT48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMzkuNzMgODYuOTFjLTYuNjI4LS42MzUtMTMuMzM4LTMuMDE1LTE5LjEwMi02Ljc3Ni00LjgzLTMuMTUtNS45Mi00LjQ0Ny01LjkyLTcuMDMyIDAtNS4xOTMgNS43MS0xNC4yOSAxNS40OC0yNC42NTggNS41NDctNS44OSAxMy4yNzUtMTIuNzkgMTQuMTEtMTIuNjA0IDEuNjI2LjM2MyAxNC42MTYgMTMuMDM0IDE5LjQ4IDE5IDcuNjkgOS40MyAxMS4yMjQgMTcuMTU0IDkuNDI4IDIwLjU5Ny0xLjM2NSAyLjYxNy05LjgzNyA3LjczMy0xNi4wNiA5LjY5OC01LjEzIDEuNjItMTEuODY3IDIuMzA2LTE3LjQxNiAxLjc3NXpNOC4xODQgNjcuNzAzYy00LjAxNC02LjE1OC02LjA0Mi0xMi4yMi03LjAyLTIwLjk4OC0uMzI0LTIuODk1LS4yMS00LjU1LjczMy0xMC40OTQgMS4xNzMtNy40IDUuMzktMTUuOTcgMTAuNDYtMjEuMjQgMi4xNTgtMi4yNCAyLjM1LTIuMyA0Ljk4Mi0xLjQxIDMuMTkgMS4wOCA2LjYgMy40MzYgMTEuODkgOC4yMmwzLjA5IDIuNzk0LTEuNjkgMi4wN2MtNy44MjggOS42MS0xNi4wOSAyMy4yNC0xOS4yIDMxLjY3LTEuNjkgNC41OC0yLjM3IDkuMTgtMS42NCAxMS4wOTUuNDkgMS4yOTQuMDQuODEyLTEuNjEtMS43MTR6bTcwLjQ1MyAxLjA0N2MuMzk3LTEuOTM2LS4xMDUtNS40OS0xLjI4LTkuMDc2LTIuNTQ1LTcuNzY1LTExLjA1NC0yMi4yMS0xOC44NjctMzIuMDMybC0yLjQ2LTMuMDkyIDIuNjYyLTIuNDQzYzMuNDc0LTMuMTkgNS44ODYtNS4xIDguNDktNi43MjMgMi4wNTMtMS4yOCA0Ljk4OC0yLjQxMyA2LjI1LTIuNDEzLjc3NyAwIDMuNTE2IDIuODUgNS43MjYgNS45NSAzLjQyNCA0LjggNS45NDIgMTAuNjMgNy4yMTggMTYuNjkuODI1IDMuOTIuODk0IDEyLjMuMTMzIDE2LjIxLS42MyAzLjIwOC0xLjk1IDcuMzY2LTMuMjMgMTAuMTg3LS45NyAyLjExMy0zLjM2IDYuMjE4LTQuNDEgNy41NTQtLjU0LjY4Ny0uNTQuNjg2LS4yNC0uNzk2ek00MC40NCAxMS41MDVDMzYuODM0IDkuNjc1IDMxLjI3MiA3LjcxIDI4LjIgNy4xOGMtMS4wNzYtLjE4NS0yLjkxMy0uMjktNC4wOC0uMjMtMi41MzYuMTI4LTIuNDIzLS4wMDQgMS42NDMtMS45MjUgMy4zOC0xLjU5NyA2LjItMi41MzYgMTAuMDMtMy4zNEM0MC4wOTguNzggNDguMTkzLjc3IDUyLjQzIDEuNjYzYzQuNTc1Ljk2NSA5Ljk2NCAyLjk3IDEzIDQuODRsLjkwNC41NTQtMi4wNy0uMTA0QzYwLjE0OCA2Ljc0NSA1NC4xNSA4LjQwOCA0Ny43MSAxMS41NGMtMS45NDIuOTQ2LTMuNjMgMS43LTMuNzU0IDEuNjgtLjEyMy0uMDI0LTEuNzA2LS43OTUtMy41Mi0xLjcxNXoiLz48L3N2Zz4=',
    'EA Desktop': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RUE8L3RpdGxlPjxwYXRoIGQ9Ik0xNi42MzUgNi4xNjJsLTUuOTI4IDkuMzc3SDQuMjRsMS41MDgtMi4zaDQuMDI0bDEuNDc0LTIuMzM1SDIuMjY0TC43OSAxMy4yMzloMi4xNTZMMCAxNy44NGgxMi4wNzJsNC41NjMtNy4yNTkgMS42NTIgMi42NmgtMS40MDFsLTEuNDczIDIuMjk5aDQuMzQ3bDEuNDczIDIuM0gyNHptLTExLjQ2MS4xMDdMMy43IDguNjA0bDkuNTItLjAzNSAxLjQ3NC0yLjN6Ii8+PC9zdmc+',
    'Origin': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+RUE8L3RpdGxlPjxwYXRoIGQ9Ik0xNi42MzUgNi4xNjJsLTUuOTI4IDkuMzc3SDQuMjRsMS41MDgtMi4zaDQuMDI0bDEuNDc0LTIuMzM1SDIuMjY0TC43OSAxMy4yMzloMi4xNTZMMCAxNy44NGgxMi4wNzJsNC41NjMtNy4yNTkgMS42NTIgMi42NmgtMS40MDFsLTEuNDczIDIuMjk5aDQuMzQ3bDEuNDczIDIuM0gyNHptLTExLjQ2MS4xMDdMMy43IDguNjA0bDkuNTItLjAzNSAxLjQ3NC0yLjN6Ii8+PC9zdmc+',
    'Ubisoft Connect': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+VWJpc29mdDwvdGl0bGU+PHBhdGggZD0iTTIzLjU2MSAxMS45ODhDMjMuMzAxLS4zMDQgNi45NTQtNC44OS42NTYgNi42MzRjLjI4Mi4yMDYuNjYxLjQ3Ny45NDMuNjcyYTExLjc0NyAxMS43NDcgMCAwMC0uOTc2IDMuMDY3IDExLjg4NSAxMS44ODUgMCAwMC0uMTg0IDIuMDcxQy40MzkgMTguODE4IDUuNjIxIDI0IDEyLjAwNSAyNGM2LjM4NSAwIDExLjU1Ni01LjE3IDExLjU1Ni0xMS41NTZ2LS40NTV6bS0yMC4yNyAyLjA2Yy0uMTUyIDEuMjQ2LS4wNTQgMS42MzYtLjA1NCAxLjc4OGwtLjI4Mi4wOThjLS4xMDgtLjIwNi0uMzctLjkzMi0uNDg4LTEuOTA4QzIuMTYzIDEwLjMwOCA0LjcgNi45NiA4LjU3IDYuMzNjMy41NDQtLjUyIDYuOTM3IDEuNjggNy43MjggNC43NThsLS4yODIuMDk4Yy0uMDg3LS4wODctLjIyOC0uMzM2LS43Ny0uODc4LTQuMjgxLTQuMjgxLTExLjAwMi0yLjMyLTExLjk1NiAzLjc0em0xMS4wMDIgMi4wODFhMy4xNDUgMy4xNDUgMCAwMS0yLjU5IDEuMzU1IDMuMTUgMy4xNSAwIDAxLTMuMTU1LTMuMTU1IDMuMTU5IDMuMTU5IDAgMDEyLjkyNy0zLjE0NGMxLjAxOC0uMDQzIDEuOTcyLjUxIDIuNDE2IDEuMzk4YTIuNTggMi41OCAwIDAxLS40NTUgMi45NWMuMjkzLjIwNS41NzUuNC44NTYuNTk1em02LjU4LjEyYy0xLjY2OSAzLjc4Mi01LjEwNiA1Ljc2Ni04Ljc3IDUuNzEyLTcuMDM0LS4zNDctOS4wODMtOC40NjYtNC4zOC0xMS4zOTNsLjIwNy4yMDZjLS4wNzYuMTA4LS4zNTguMzI1LS43OTEgMS4xODItLjUxIDEuMDQxLS42NzIgMi4wODEtLjYwNyAyLjczMi4zNjkgNS42NyA4LjMxNCA2LjgzIDExLjA0NSAxLjIxNEMyMS4wNTcgOC4yMTcgMTEuODIyLjQwMSAzLjYyNiA2LjM3NGwtLjE4NC0uMTg0QzUuNTk5IDIuODA4IDkuODE2IDEuMyAxMy44MzcgMi4zMDljNi4xNDcgMS41NSA5LjQ1MyA3Ljk1NiA3LjAzNSAxMy45NHoiLz48L3N2Zz4=',
    'Battle.net': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+QmF0dGxlLm5ldDwvdGl0bGU+PHBhdGggZD0iTTE4Ljk0IDguMjk2QzE1LjkgNi44OTIgMTEuNTM0IDYgNy40MjYgNi4zMzJjLjIwNi0xLjM2LjcxNC0yLjMwOCAxLjU0OC0yLjUwOCAxLjE0OC0uMjc1IDIuNC40OCAzLjU5NCAxLjg1NC43ODIuMTAyIDEuNzEuMjggMi4zNTUuNDI5QzEyLjc0NyAyLjAxMyA5LjgyOC0uMjgyIDcuNjA3LjU2NWMtMS42ODguNjQ0LTIuNTUzIDIuOTctMi40NDggNi4wOTQtMi4yLjQ2OC0zLjkxNSAxLjMtNS4wMTMgMi40OTUtLjA1Ni4wNjUtLjE4MS4yMjctLjEzNy4zMDUuMDM0LjA1OC4xNDYtLjAwOC4xOTQtLjA0IDEuMjc0LS44OSAyLjkwNC0xLjM3MyA1LjAyNy0xLjY3Ni4zMDMgMy4zMzMgMS43MTMgNy41NiA0LjA1NSAxMC45NTItMS4yOC41MDItMi4zNTYuNTM2LTIuOTQ2LS4wODctLjgxMi0uODU2LS43ODQtMi4zMTgtLjE5LTQuMDRhMjYuNzY0IDI2Ljc2NCAwIDAgMS0uODA3LTIuMjU0Yy0yLjQ1OSAzLjkzNC0yLjk4NiA3LjYxLTEuMTQzIDkuMTEgMS40MDIgMS4xNCAzLjg0Ny43MjUgNi41MDItLjkyNiAxLjUwNSAxLjY3MiAzLjA4MyAyLjc0IDQuNjY3IDMuMDk0LjA4NC4wMTUuMjg3LjA0My4zMzItLjAzNC4wMzQtLjA2LS4wOC0uMTI0LS4xMzEtLjE0OS0xLjQwOC0uNjU3LTIuNjQtMS44MjgtMy45NjQtMy41MTUgMi43MzUtMS45MjkgNS42OTEtNS4yNjMgNy40NTctOC45ODggMS4wNzYuODYgMS42NCAxLjc3MyAxLjM5OCAyLjU5NS0uMzM2IDEuMTMxLTEuNjE1IDEuODQtMy40MDMgMi4xODVhMjcuNjk3IDI3LjY5NyAwIDAgMS0xLjU0OCAxLjgyNmM0LjYzNC4xNiA4LjA4LTEuMjIgOC40NTgtMy41NjUuMjg2LTEuNzg2LTEuMjk1LTMuNjk2LTQuMDUzLTUuMTcuNjk2LTIuMTM5LjgzMi00LjA0LjM0Ni01LjU4OC0uMDI5LS4wOC0uMTA2LS4yNy0uMTk2LS4yNy0uMDY4IDAtLjA2Ny4xMy0uMDYzLjE4Ny4xMzUgMS41NDctLjI2MyAzLjItMS4wNjIgNS4xOXptLTguNTMzIDkuODY5Yy0xLjk2LTMuMTQ1LTMuMDktNi44NDktMy4wODItMTAuNTk0IDMuNzAyLS4xMjQgNy40NzQuNzQ4IDEwLjcxNCAyLjYyNy0xLjc0MyAzLjI2OS00LjM4NSA2LjEtNy42MzMgNy45NjZoLjAwMXoiLz48L3N2Zz4=',
    'GOG Galaxy': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+R09HLmNvbTwvdGl0bGU+PHBhdGggZD0iTTcuMTUgMTUuMjRINC4zNmEuNC40IDAgMCAwLS40LjR2MmMwIC4yMS4xOC40LjQuNGgyLjh2MS4zMmgtMy41Yy0uNTYgMC0xLjAyLS40Ni0xLjAyLTEuMDN2LTMuMzljMC0uNTYuNDYtMS4wMiAxLjAzLTEuMDJoMy40OHYxLjMyek04LjE2IDExLjU0YzAgLjU4LS40NyAxLjA1LTEuMDUgMS4wNUgyLjYzdi0xLjM1aDMuNzhhLjQuNCAwIDAgMCAuNC0uNFY2LjM5YS40LjQgMCAwIDAtLjQtLjRINC4zOWEuNC40IDAgMCAwLS40MS40djIuMDJjMCAuMjMuMTguNC40LjRINnYxLjM1SDMuNjhjLS41OCAwLTEuMDUtLjQ2LTEuMDUtMS4wNFY1LjY4YzAtLjU3LjQ3LTEuMDQgMS4wNS0xLjA0SDcuMWMuNTggMCAxLjA1LjQ3IDEuMDUgMS4wNHY1Ljg2ek0yMS4zNiAxOS4zNmgtMS4zMnYtNC4xMmgtLjkzYS40LjQgMCAwIDAtLjQuNHYzLjcyaC0xLjMzdi00LjEyaC0uOTNhLjQuNCAwIDAgMC0uNC40djMuNzJoLTEuMzN2LTQuNDJjMC0uNTYuNDYtMS4wMiAxLjAzLTEuMDJoNS42MXY1LjQ0ek0yMS4zNyAxMS41NGMwIC41OC0uNDcgMS4wNS0xLjA1IDEuMDVoLTQuNDh2LTEuMzVoMy43OGEuNC40IDAgMCAwIC40LS40VjYuMzlhLjQuNCAwIDAgMC0uNC0uNGgtMi4wM2EuNC40IDAgMCAwLS40LjR2Mi4wMmMwIC4yMy4xOC40LjQuNGgxLjYydjEuMzVIMTYuOWMtLjU4IDAtMS4wNS0uNDYtMS4wNS0xLjA0VjUuNjhjMC0uNTcuNDctMS4wNCAxLjA1LTEuMDRoMy40M2MuNTggMCAxLjA1LjQ3IDEuMDUgMS4wNHY1Ljg2ek0xMy43MiA0LjY0aC0zLjQ0Yy0uNTggMC0xLjA0LjQ3LTEuMDQgMS4wNHYzLjQ0YzAgLjU4LjQ2IDEuMDQgMS4wNCAxLjA0aDMuNDRjLjU3IDAgMS4wNC0uNDYgMS4wNC0xLjA0VjUuNjhjMC0uNTctLjQ3LTEuMDQtMS4wNC0xLjA0bS0uMyAxLjc1djIuMDJhLjQuNCAwIDAgMS0uNC40aC0yLjAzYS40LjQgMCAwIDEtLjQtLjRWNi40YzAtLjIyLjE3LS40LjQtLjRIMTNjLjIzIDAgLjQuMTguNC40ek0xMi42MyAxMy45Mkg5LjI0Yy0uNTcgMC0xLjAzLjQ2LTEuMDMgMS4wMnYzLjM5YzAgLjU3LjQ2IDEuMDMgMS4wMyAxLjAzaDMuMzljLjU3IDAgMS4wMy0uNDYgMS4wMy0xLjAzdi0zLjM5YzAtLjU2LS40Ni0xLjAyLTEuMDMtMS4wMm0tLjMgMS43MnYyYS40LjQgMCAwIDEtLjQuNHYtLjAxSDkuOTRhLjQuNCAwIDAgMS0uNC0uNHYtMS45OWMwLS4yMi4xOC0uNC40LS40aDJjLjIyIDAgLjQuMTguNC40ek0yMy40OSAxLjFhMS43NCAxLjc0IDAgMCAwLTEuMjQtLjUySDEuNzVBMS43NCAxLjc0IDAgMCAwIDAgMi4zM3YxOS4zNGExLjc0IDEuNzQgMCAwIDAgMS43NSAxLjc1aDIwLjVBMS43NCAxLjc0IDAgMCAwIDI0IDIxLjY3VjIuMzNjMC0uNDgtLjItLjkyLS41MS0xLjI0bTAgMjAuNThhMS4yMyAxLjIzIDAgMCAxLTEuMjQgMS4yNEgxLjc1QTEuMjMgMS4yMyAwIDAgMSAuNSAyMS42N1YyLjMzYTEuMjMgMS4yMyAwIDAgMSAxLjI0LTEuMjRoMjAuNWExLjI0IDEuMjQgMCAwIDEgMS4yNCAxLjI0djE5LjM0eiIvPjwvc3ZnPg==',
    'Riot Games': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+UmlvdCBHYW1lczwvdGl0bGU+PHBhdGggZD0iTTEzLjQ1OC44NiAwIDcuMDkzbDMuMzUzIDEyLjc2MSAyLjU1Mi0uMzEzLS43MDEtOC4wMjQuODM4LS4zNzMgMS40NDcgOC4yMDIgNC4zNjEtLjUzNS0uNzc1LTguODU3LjgzLS4zNyAxLjU5MSA5LjAyNSA0LjQxMi0uNTQyLS44NDktOS43MDguODQtLjM3NCAxLjc0IDkuODdMMjQgMTcuMzE4VjMuNVptLjMxNiAxOS4zNTYuMjIyIDEuMjU2TDI0IDIzLjE0di00LjE4bC0xMC4yMiAxLjI1NloiLz48L3N2Zz4=',
    'Rockstar Games': 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmZmZmIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+Um9ja3N0YXIgR2FtZXM8L3RpdGxlPjxwYXRoIGQ9Ik01Ljk3MSA2LjgxNmgzLjI0MWMxLjQ2OSAwIDIuNzQxLS40NDggMi43NDEtMi4wODQgMC0xLjMtMS4xMTctMS41NzYtMi4xOS0xLjU3Nkg2Ljc0OGwtLjc3NyAzLjY2Wm0xMi44MzQgOC43NTNoNS4xNjhsLTQuNjY0IDMuMjI4Ljc1NSA1LjA4Ny00LjA0MS0zLjA3TDEwLjU5OSAyNGwyLjUzNi01LjM5MnMtMi45NS0zLjA3NS0yLjk0Ny0zLjA3NWMtLjE5OC0uMjYyLS4yNjUtLjkzNi0uMjY1LTEuMjI2IDAtLjM2Ny4wMjQtLjczOS4wNDktMS4xMzQuMDI4LS40NTEuMDU4LS45MzMuMDU4LTEuNDc2IDAtMS4zMzgtLjU5LTIuMDM4LTIuMDM2LTIuMDM4SDUuMjgzbC0xLjE4IDUuNTI1SC4wMjZMMy4yNjkgMGg3LjY3MmMyLjg1MiAwIDUuMDI3LjcwMiA1LjAyNyAzLjkzNiAwIDIuMjc2LTEuMTIgMy44OTQtMy41OTIgNC4yMzN2LjA0NWMxLjE2Mi4yNzYgMS41OTggMS4wNjIgMS41OTggMi41MjcgMCAuNTg1LS4wMTggMS4wOTgtLjAzNCAxLjU4MS0uMDE1LjQyOC0uMDMuODM0LS4wMyAxLjI0MyAwIC41MjUuMTM3IDEuMzgyLjQ4IDEuOTY4aC41NjdsMy4wMjgtNS4wNi44MiA1LjA5NlptLTEuMjMzLTIuOTQ4LTIuMTg3IDMuNjU0aC0zLjQ1N2wyLjEwMyAyLjE4OS0xLjczIDMuNjcyIDMuNzc3LTIuMjE4IDIuOTc2IDIuMjYzLS41NTMtMy43MzEgMy4wOTMtMi4xMzloLTMuNDNsLS41OTItMy42OVoiLz48L3N2Zz4='
  };

  const isLauncher =
    game.type?.toUpperCase() === 'LAUNCHER' ||
    game.genre?.toUpperCase() === 'PLATFORM' ||
    ['Steam', 'Epic Games', 'Xbox', 'EA Desktop', 'Origin'].includes(game.platform) && game.name.toLowerCase().includes('app') ||
    game.name.toLowerCase() === game.platform.toLowerCase();

  if (game.local_banner) {
    coverUrl = game.local_banner.startsWith('http') ? game.local_banner : `asset:///${game.local_banner.replace(/\\/g, '/')}`;
  } else if (game.platform === 'Steam' && game.id && !isLauncher) {
    coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/header.jpg`;
  } else if (isLauncher && LAUNCHER_BANNERS[game.platform]) {
    coverUrl = LAUNCHER_BANNERS[game.platform];
  } else if (game.icon && game.icon !== 'null') {
    coverUrl = game.icon.startsWith('http') ? game.icon : `asset:///${game.icon.replace(/\\/g, '/')}`;
  }

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

  const handleLaunch = () => {
    if (launchUri) {
      if ((window as any).electronAPI?.launchGame) {
        (window as any).electronAPI.launchGame(launchUri);
      } else {
        sendCommand('launch_game', { exe_path: launchUri });
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors border border-white/10 backdrop-blur-md">
          <X className="w-5 h-5" />
        </button>

        <div className="aspect-[21/9] relative overflow-hidden bg-black flex items-center justify-center">
          <img
            src={coverUrl}
            alt={game.name}
            className={`w-full h-full opacity-60 object-cover`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent pointer-events-none" />
          
          <div className="absolute bottom-6 left-8 right-8">
            <div className={`inline-block px-3 py-1 mb-3 rounded-lg border backdrop-blur-md shadow-lg ${PLATFORM_STYLES[game.platform]?.bg || 'bg-white/10'} ${PLATFORM_STYLES[game.platform]?.text || 'text-white'} ${PLATFORM_STYLES[game.platform]?.border || 'border-white/20'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest">{game.platform}</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-xl">{game.name}</h2>
          </div>
        </div>

        <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Details</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-zinc-300">
                  {game.genre === 'N/A' || !game.genre ? (game.type === 'LAUNCHER' ? 'GAMING PLATFORM' : 'GAME') : game.genre}
                </span>
                {game.tags && game.tags.map((tag, i) => (
                  <span key={`pt-${i}`} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-zinc-300 uppercase tracking-tighter">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {game.features && game.features.length > 0 && (
              <div>
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Supported Tech</h3>
                <div className="flex flex-wrap gap-2">
                  {game.features.map((feature, i) => (
                    <span key={`pf-${i}`} className="px-3 py-1 bg-neon-green/10 border border-neon-green/20 rounded-lg text-xs font-bold text-neon-green uppercase tracking-tighter shadow-[0_0_10px_rgba(118,185,0,0.1)]">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
             <button aria-label="button" type="button"
                onClick={handleLaunch}
                disabled={!launchUri}
                className="w-full flex items-center justify-center gap-2 py-4 bg-neon-green hover:bg-[#8aff00] text-black rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(118,185,0,0.3)] hover:shadow-[0_0_30px_rgba(118,185,0,0.5)] disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-1"
              >
                <Play className="w-5 h-5 fill-current" />
                <span className="text-sm font-black uppercase tracking-widest">
                  {launchUri ? 'Execute' : 'Unavailable'}
                </span>
              </button>
          </div>
        </div>
      </motion.div>
    </div>
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
  const [selectedGame, setSelectedGame] = useState<BackendGame | null>(null);

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
                    sendCommand={() => setSelectedGame(game)} 
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

      {/* Game Preview Modal Overlay */}
      <AnimatePresence>
        {selectedGame && (
          <GamePreviewModal
            game={selectedGame}
            onClose={() => setSelectedGame(null)}
            sendCommand={sendCommand}
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
