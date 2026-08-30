import { useState, useEffect, useCallback } from 'react';

export const PRIMARY_LIBRARY_SERVER_URL = (window as any).__LIBRARY_SERVER_URL__
  || (import.meta as any).env?.VITE_LIBRARY_SERVER_URL
  || 'https://mission-control-server-okj7.onrender.com';

export const BACKUP_LIBRARY_SERVER_URL = (window as any).__BACKUP_LIBRARY_SERVER_URL__
  || (import.meta as any).env?.VITE_BACKUP_LIBRARY_SERVER_URL
  || 'https://mission-control-wz0l.onrender.com';

// Candidate endpoints ordered by priority
export const CANDIDATE_LIBRARY_SERVER_URLS = [
  PRIMARY_LIBRARY_SERVER_URL,
  BACKUP_LIBRARY_SERVER_URL,
].filter(Boolean);

let _activeServerUrl = CANDIDATE_LIBRARY_SERVER_URLS[0] || '';

export function getActiveLibraryServerUrl(): string {
  return _activeServerUrl;
}

export function setActiveLibraryServerUrl(url: string) {
  if (url) _activeServerUrl = url;
}

// Backward-compatible export — dynamically evaluates active or first available server
export const LIBRARY_SERVER_URL = _activeServerUrl;

/**
 * Universal multi-tier HTTP client with automatic failover.
 * Queries primary endpoint first; if down (network error, timeout, 5xx, or 503),
 * instantly transparently retries on the backup server and remembers the working host.
 */
export async function fetchWithFailover(path: string, options: RequestInit = {}): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Prioritize current known active server, followed by the rest
  const endpoints = [
    _activeServerUrl,
    ...CANDIDATE_LIBRARY_SERVER_URLS.filter(u => u !== _activeServerUrl),
  ].filter(Boolean);

  let lastError: any = null;

  for (const baseUrl of endpoints) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const fullUrl = `${cleanBase}${cleanPath}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const combinedSignal = options.signal || controller.signal;

      const res = await fetch(fullUrl, {
        ...options,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);

      // If server responds with OK or 4xx (valid HTTP logic from an alive server)
      if (res.status < 500) {
        _activeServerUrl = cleanBase;
        return res;
      }

      // If server returns 5xx (502, 503 Service Unavailable, 504 Gateway Timeout), failover to backup
      console.warn(`[Failover] Endpoint ${cleanBase} returned ${res.status}. Trying backup server...`);
      lastError = new Error(`Server returned status ${res.status}`);
    } catch (err: any) {
      console.warn(`[Failover] Failed to connect to ${cleanBase}:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All library server endpoints are unreachable.');
}

export interface DistributedStats {
  total_master_games: number;
  total_installed_games: number;
  total_nodes: number;
  online_nodes: number;
  total_storage_bytes: number;
  used_storage_bytes: number;
  nodes: Array<{ node_id: string; name: string; status: string; storage_total: number; storage_used: number }>;
}

export function useDistributedStats(userId?: string | null): { stats: DistributedStats | null; serverOnline: boolean; activeUrl: string } {
  const [stats, setStats] = useState<DistributedStats | null>(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>(_activeServerUrl);

  const fetchStats = useCallback(async () => {
    try {
      const path = userId
        ? `/api/library/stats?clerk_id=${encodeURIComponent(userId)}`
        : `/api/library/stats`;
      const res = await fetchWithFailover(path);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setServerOnline(true);
        setActiveUrl(_activeServerUrl);
        return;
      }
    } catch {
      // Both primary and backup unreachable
    }
    setServerOnline(false);
  }, [userId]);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 30000);
    return () => clearInterval(t);
  }, [fetchStats]);

  return { stats, serverOnline, activeUrl };
}
