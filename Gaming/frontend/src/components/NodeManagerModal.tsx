/**
 * Mission Control — Distributed Library
 * NodeManagerModal.tsx: State-of-the-Art Fleet Command & Node Management Hub.
 *
 * Displays registered library nodes with real-time storage telemetry,
 * heartbeat monitoring, directory scan path management, and synchronization controls.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Server, WifiOff, RefreshCw, Trash2,
  Clock, Network, FolderSearch, FolderPlus, Pencil, Check, HardDrive,
  Activity, Copy, ShieldCheck, Gamepad2, ChevronDown, ChevronUp, Radio
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

import { fetchWithFailover, getActiveLibraryServerUrl } from '../hooks/useDistributedStats';

interface NodeStorage {
  storage_total: number;
  storage_used: number;
  storage_free: number;
}

interface LibraryNode {
  node_id: string;
  name: string;
  hostname: string;
  ip: string;
  platform: string;
  status: 'online' | 'offline' | 'scanning' | 'degraded';
  storage_total: number;
  storage_used: number;
  storage_free: number;
  scan_paths: string[];
  last_heartbeat: string | null;
  last_sync: string | null;
  version: string;
  game_count?: number;
}

interface NodeManagerModalProps {
  onClose: () => void;
  sendCommand?: (type: string, payload?: any) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatHeartbeat(ts: string | null): string {
  if (!ts) return 'Never';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function extractFolderName(fullPath: string): string {
  const normalized = fullPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || fullPath;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; text: string; border: string; dot: string; shadow: string }> = {
    online: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
      shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.15)]',
    },
    scanning: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
      shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.15)]',
    },
    degraded: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
      shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.15)]',
    },
    offline: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
      shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
    },
  };

  const current = styles[status] || styles.offline;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${current.bg} ${current.text} ${current.border} ${current.shadow}`}
    >
      <span className={`w-2 h-2 rounded-full ${current.dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
};

const StorageGauge: React.FC<NodeStorage> = ({ storage_total, storage_used }) => {
  const pct = storage_total > 0 ? Math.min(100, (storage_used / storage_total) * 100) : 0;
  const free = Math.max(0, storage_total - storage_used);

  return (
    <div className="w-full space-y-2 bg-black/30 border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-neon-green" />
          <span className="font-bold text-white uppercase tracking-wider">Drive Capacity</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="text-white font-bold">{formatBytes(storage_used)} <span className="text-zinc-500 font-normal">used</span></span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{formatBytes(free)} <span className="text-zinc-500 font-normal">free</span></span>
          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neon-green font-bold">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Multi-gradient progress track */}
      <div className="h-2 rounded-full bg-white/5 p-0.5 border border-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-neon-green via-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(118,185,0,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center justify-between text-[9px] text-zinc-500">
        <span>0 GB</span>
        <span className="text-zinc-400 font-mono">Pool Total: {formatBytes(storage_total)}</span>
      </div>
    </div>
  );
};

// ── Node Card Component ───────────────────────────────────────────────────────

const NodeCard: React.FC<{
  node: LibraryNode;
  onScan: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAddFolder: (node: LibraryNode) => void;
}> = ({ node, onScan, onDelete, onRename, onAddFolder }) => {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(node.name);
  const [loading, setLoading] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState(false);
  const [hbText, setHbText] = useState(formatHeartbeat(node.last_heartbeat));

  useEffect(() => {
    const t = setInterval(() => setHbText(formatHeartbeat(node.last_heartbeat)), 5000);
    return () => clearInterval(t);
  }, [node.last_heartbeat]);

  const handleScan = async () => {
    setLoading(true);
    await onScan(node.node_id);
    setTimeout(() => setLoading(false), 2000);
  };

  const handleRename = () => {
    if (nameInput.trim() && nameInput !== node.name) {
      onRename(node.node_id, nameInput.trim());
    }
    setEditingName(false);
  };

  const copyIpToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.ip) return;
    navigator.clipboard.writeText(node.ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const displayedPaths = expandedPaths ? node.scan_paths : node.scan_paths.slice(0, 3);
  const hiddenCount = Math.max(0, node.scan_paths.length - 3);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative bg-linear-to-b from-white/4 to-white/1 hover:from-white/7 hover:to-white/2 border border-white/10 hover:border-neon-green/40 rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-xl space-y-5 transform-gpu will-change-transform"
    >
      {/* Decorative ambient aura */}
      <div className="absolute top-0 left-8 right-8 h-px bg-linear-to-r from-transparent via-neon-green/30 to-transparent pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:border-neon-green/40 transition-colors">
            <Server className="w-6 h-6 text-neon-green" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    className="bg-black/60 border border-neon-green/50 rounded-lg px-2.5 py-1 text-sm font-black text-white outline-none w-48 shadow-[0_0_10px_rgba(118,185,0,0.2)]"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRename()}
                    onBlur={handleRename}
                  />
                  <button
                    onClick={handleRename}
                    className="p-1 rounded-lg bg-neon-green/20 text-neon-green hover:bg-neon-green/30 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white tracking-wide truncate group-hover:text-neon-green transition-colors">
                    {node.name}
                  </h3>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all"
                    title="Rename node"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-zinc-400 uppercase">
                {node.platform || 'Windows'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
              <span className="font-mono text-zinc-500">{node.hostname}</span>
              <span className="text-zinc-600">·</span>
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>Heartbeat: {hbText}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={node.status} />
        </div>
      </div>

      {/* Network & Telemetry Pill Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div
          onClick={copyIpToClipboard}
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-white/20 transition-all cursor-pointer group/ip"
          title="Click to copy IP"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Network className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[11px] font-mono text-zinc-300 truncate">{node.ip || 'Localhost'}</span>
          </div>
          <span className="text-[9px] font-bold text-zinc-500 group-hover/ip:text-neon-green transition-colors shrink-0">
            {copiedIp ? 'COPIED!' : <Copy className="w-3 h-3" />}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/5">
          <FolderSearch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] text-zinc-300 font-bold truncate">
            {node.game_count !== undefined ? `${node.game_count} Games Detected` : `${node.scan_paths.length} Active Paths`}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-zinc-300 font-bold truncate">
            {node.version ? `Daemon v${node.version}` : 'Native Peer v3.4'}
          </span>
        </div>
      </div>

      {/* Storage Visualizer */}
      <StorageGauge
        storage_total={node.storage_total}
        storage_used={node.storage_used}
        storage_free={node.storage_free}
      />

      {/* Scan Directories Interactive Hub */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Scanned Game Directories ({node.scan_paths.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onAddFolder(node)}
            className="flex items-center gap-1 text-[10px] font-bold text-neon-green hover:underline cursor-pointer"
          >
            <FolderPlus className="w-3 h-3" />
            <span>Add Folder</span>
          </button>
        </div>

        {node.scan_paths.length > 0 ? (
          <div className="space-y-1.5">
            {displayedPaths.map((p, i) => {
              const folderName = extractFolderName(p);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-black/25 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      <FolderSearch className="w-3 h-3 text-neon-green/80" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{folderName}</p>
                      <p className="text-[9px] font-mono text-zinc-500 truncate" title={p}>{p}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-mono text-zinc-400 shrink-0">
                    Index Path
                  </span>
                </div>
              );
            })}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpandedPaths(!expandedPaths)}
                className="w-full py-1.5 rounded-lg bg-white/2 hover:bg-white/5 border border-white/5 text-[10px] font-bold text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{expandedPaths ? 'Collapse paths' : `Show ${hiddenCount} more scanned paths`}</span>
                {expandedPaths ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-black/20 border border-dashed border-white/10 text-center">
            <p className="text-[10px] text-zinc-500">No game directories configured yet.</p>
          </div>
        )}
      </div>

      {/* Action Controls Strip */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-bold text-rose-300">Remove node from fleet?</span>
              <button
                onClick={() => onDelete(node.node_id)}
                className="px-2.5 py-0.5 rounded-lg bg-rose-500 text-black text-[9px] font-black uppercase tracking-wider hover:bg-rose-400 transition-colors"
              >
                Yes, Remove
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-0.5 text-[9px] text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/4 hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              title="Remove this node from your distributed library"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Node</span>
            </button>
          )}
        </div>

        <button
          id={`scan-node-${node.node_id}`}
          onClick={handleScan}
          disabled={loading || node.status === 'offline'}
          className="flex items-center gap-2 px-5 py-2.5 bg-neon-green hover:bg-neon-green/90 text-black font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(118,185,0,0.3)] hover:shadow-[0_0_25px_rgba(118,185,0,0.5)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Scanning Libraries...' : 'Scan Node Libraries'}</span>
        </button>
      </div>
    </motion.div>
  );
};

// ── Main Modal Component ──────────────────────────────────────────────────────

const NodeManagerModal: React.FC<NodeManagerModalProps> = ({ onClose, sendCommand }) => {
  const { userId } = useAuth();
  const [nodes, setNodes] = useState<LibraryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  const fetchNodes = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      let data: LibraryNode[] = [];
      if (userId) {
        const res = await fetchWithFailover(`/api/nodes?clerk_id=${encodeURIComponent(userId)}`);
        if (res.ok) {
          data = await res.json();
        }
      }
      setNodes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Cannot reach library server.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNodes(true);
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchNodes(false);
      }
    }, 15000);
    return () => clearInterval(t);
  }, [fetchNodes]);

  const handleRegisterThisPC = useCallback(async () => {
    setRegistering(true);
    try {
      if (sendCommand) {
        sendCommand('register_local_node', { userId });
      }
      setTimeout(() => {
        fetchNodes(true);
        setRegistering(false);
      }, 2500);
    } catch {
      setRegistering(false);
    }
  }, [sendCommand, userId, fetchNodes]);

  const handleScan = async (nodeId: string) => {
    await fetchWithFailover(`/api/nodes/${nodeId}/scan`, { method: 'POST' });
  };

  const handleDelete = async (nodeId: string) => {
    await fetchWithFailover(`/api/nodes/${nodeId}`, { method: 'DELETE' });
    setNodes(prev => prev.filter(n => n.node_id !== nodeId));
  };

  const handleRename = async (nodeId: string, name: string) => {
    await fetchWithFailover(`/api/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setNodes(prev => prev.map(n => n.node_id === nodeId ? { ...n, name } : n));
  };

  const handleAddFolder = async (node: LibraryNode) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.selectDirectory) {
      try {
        const selectedDir = await (window as any).electronAPI.selectDirectory();
        if (selectedDir && !node.scan_paths.includes(selectedDir)) {
          const updatedPaths = [...node.scan_paths, selectedDir];
          await fetchWithFailover(`/api/nodes/${node.node_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scan_paths: updatedPaths }),
          });
          setNodes(prev => prev.map(n => n.node_id === node.node_id ? { ...n, scan_paths: updatedPaths } : n));
        }
      } catch (_) {}
    }
  };

  // Hardware-optimized aggregated fleet statistics memoization
  const { onlineNodes, totalUsedStorage, totalCapacity, totalGames } = useMemo(() => {
    const online = nodes.filter(n => n.status === 'online');
    const used = nodes.reduce((acc, n) => acc + (n.storage_used || 0), 0);
    const cap = nodes.reduce((acc, n) => acc + (n.storage_total || 0), 0);
    const games = nodes.reduce((acc, n) => acc + (n.game_count || 0), 0);
    return { onlineNodes: online, totalUsedStorage: used, totalCapacity: cap, totalGames: games };
  }, [nodes]);

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden">
      {/* Cinematic backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transform-gpu"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Main Glassmorphic Modal */}
      <motion.div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-zinc-950/90 border border-white/10 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden backdrop-blur-2xl transform-gpu will-change-transform"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Soft atmospheric glow accents */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-neon-green/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Modal Top Header */}
        <div className="relative z-10 bg-black/40 border-b border-white/6 px-6 py-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.2)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Distributed Fleet Command
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-neon-green">
                  v3.4
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Decentralized Library Nodes · Multi-PC Game Indexing & Storage Pools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchNodes(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Refresh Fleet Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleRegisterThisPC}
              disabled={registering}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neon-green/15 border border-neon-green/30 hover:bg-neon-green/25 text-neon-green text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(118,185,0,0.15)] disabled:opacity-50 cursor-pointer"
              title="Synchronize this machine into the distributed library network"
            >
              {registering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
              <span>{registering ? 'Connecting...' : 'Sync This PC'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fleet Status HUD Overview Bar */}
        <div className="relative z-10 bg-black/20 border-b border-white/5 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/2 border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Fleet Status</p>
              <p className="text-xs font-black text-white mt-0.5">
                {onlineNodes.length} Online <span className="text-zinc-500 font-normal">/ {nodes.length} Total</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/2 border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Fleet Storage</p>
              <p className="text-xs font-black text-white mt-0.5 truncate">
                {formatBytes(totalUsedStorage)} <span className="text-zinc-500 font-normal">/ {formatBytes(totalCapacity)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/2 border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-neon-green/10 text-neon-green flex items-center justify-center shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Indexed Games</p>
              <p className="text-xs font-black text-white mt-0.5">
                {totalGames > 0 ? `${totalGames} Installed` : 'Active Discovery'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/2 border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Network className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Active Mesh</p>
              <p className="text-xs font-black text-white mt-0.5 truncate font-mono">
                {nodes[0]?.ip || '127.0.0.1'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Node Cards Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading && nodes.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin text-neon-green mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-white">
                Connecting to Distributed Fleet...
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">Polling peer storage nodes and heartbeat signals</p>
            </div>
          )}

          {error && nodes.length === 0 && (
            <div className="rounded-3xl bg-rose-500/10 border border-rose-500/20 p-6 text-center">
              <WifiOff className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <h4 className="text-sm font-black text-rose-400 uppercase tracking-wider">Gateway Offline</h4>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-md mx-auto">
                Unable to contact distributed library servers at {getActiveLibraryServerUrl()}.
              </p>
              <button
                onClick={() => fetchNodes(true)}
                className="mt-4 px-5 py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-all"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!loading && nodes.length === 0 && !error && (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-3xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center mb-4 text-neon-green shadow-[0_0_30px_rgba(118,185,0,0.2)]">
                <Server className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
                No Nodes Connected
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
                Connect this PC to automatically index your installed Steam, Epic, EA, GOG & Xbox libraries, track SSD storage, and sync game telemetry across your devices.
              </p>
              <button
                onClick={handleRegisterThisPC}
                disabled={registering}
                className="flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl bg-neon-green text-black font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(118,185,0,0.4)] hover:shadow-[0_0_35px_rgba(118,185,0,0.6)] cursor-pointer disabled:opacity-50"
              >
                {registering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                <span>{registering ? 'Connecting Local Node...' : 'Connect This PC (1-Click)'}</span>
              </button>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {nodes.map(node => (
              <NodeCard
                key={node.node_id}
                node={node}
                onScan={handleScan}
                onDelete={handleDelete}
                onRename={handleRename}
                onAddFolder={handleAddFolder}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default NodeManagerModal;
