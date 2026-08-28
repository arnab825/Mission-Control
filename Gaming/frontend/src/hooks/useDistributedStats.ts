import { useState, useEffect, useCallback } from 'react';

export const PRIMARY_LIBRARY_SERVER_URL = (window as any).__LIBRARY_SERVER_URL__
  || (import.meta as any).env?.VITE_LIBRARY_SERVER_URL
  || '';

export const BACKUP_LIBRARY_SERVER_URL = (window as any).__BACKUP_LIBRARY_SERVER_URL__
  || (import.meta as any).env?.VITE_BACKUP_LIBRARY_SERVER_URL
  || '';

export const LIBRARY_SERVER_URL = PRIMARY_LIBRARY_SERVER_URL || BACKUP_LIBRARY_SERVER_URL;

export interface DistributedStats {
  total_master_games: number;
  total_installed_games: number;
  total_nodes: number;
  online_nodes: number;
  total_storage_bytes: number;
  used_storage_bytes: number;
  nodes: Array<{ node_id: string; name: string; status: string; storage_total: number; storage_used: number }>;
}

export function useDistributedStats(userId?: string | null): { stats: DistributedStats | null; serverOnline: boolean } {
  const [stats, setStats] = useState<DistributedStats | null>(null);
  const [serverOnline, setServerOnline] = useState(false);

  const fetchStats = useCallback(async () => {
    const endpoints = [PRIMARY_LIBRARY_SERVER_URL, BACKUP_LIBRARY_SERVER_URL].filter(Boolean);
    if (endpoints.length === 0) {
      setServerOnline(false);
      return;
    }
    for (const baseUrl of endpoints) {
      try {
        const url = userId
          ? `${baseUrl}/api/library/stats?clerk_id=${encodeURIComponent(userId)}`
          : `${baseUrl}/api/library/stats`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          setStats(await res.json());
          setServerOnline(true);
          return;
        }
      } catch {
        // Failover to backup endpoint
      }
    }
    setServerOnline(false);
  }, [userId]);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 30000);
    return () => clearInterval(t);
  }, [fetchStats]);

  return { stats, serverOnline };
}
