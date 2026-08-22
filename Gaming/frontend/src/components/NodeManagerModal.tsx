/**
 * Mission Control — Distributed Library
 * NodeManagerModal.tsx: Admin panel for managing Library Nodes.
 *
 * Displays all registered nodes with real storage bars, heartbeat age,
 * hostname/IP, scan paths, and triggers for scan/sync/rename/remove.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Server, WifiOff, RefreshCw, Trash2,
  Clock, Network, FolderSearch, Pencil, Check
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

import { LIBRARY_SERVER_URL } from '../hooks/useDistributedStats';

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

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    online:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    offline:  'bg-red-500/15 text-red-400 border-red-500/30',
    scanning: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    degraded: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${styles[status] || styles.offline}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
      {status}
    </span>
  );
};

const StorageBar: React.FC<NodeStorage> = ({ storage_total, storage_used }) => {
  const pct = storage_total > 0 ? Math.min(100, (storage_used / storage_total) * 100) : 0;
  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-400' : 'bg-neon-green';
  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] text-zinc-500 mb-1">
        <span>{formatBytes(storage_used)} used</span>
        <span>{formatBytes(storage_total)} total</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <div className="text-right text-[9px] text-zinc-600 mt-0.5">{pct.toFixed(1)}%</div>
    </div>
  );
};

const NodeCard: React.FC<{
  node: LibraryNode;
  onScan: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}> = ({ node, onScan, onDelete, onRename }) => {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(node.name);
  const [loading, setLoading] = useState(false);
  const [hbText, setHbText] = useState(formatHeartbeat(node.last_heartbeat));

  // Refresh heartbeat display every 5s
  useEffect(() => {
    const t = setInterval(() => setHbText(formatHeartbeat(node.last_heartbeat)), 5000);
    return () => clearInterval(t);
  }, [node.last_heartbeat]);

  const handleScan = async () => {
    setLoading(true);
    await onScan(node.node_id);
    setLoading(false);
  };

  const handleRename = () => {
    if (nameInput.trim() && nameInput !== node.name) {
      onRename(node.node_id, nameInput.trim());
    }
    setEditingName(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Server className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  className="bg-black/40 border border-neon-green/30 rounded-lg px-2 py-0.5 text-sm font-bold text-white outline-none w-36"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRename()}
                  onBlur={handleRename}
                />
                <button onClick={handleRename} className="text-neon-green">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white truncate">{node.name}</p>
                <button onClick={() => setEditingName(true)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
            <p className="text-[10px] text-zinc-500 truncate">{node.hostname}</p>
          </div>
        </div>
        <StatusPill status={node.status} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Network className="w-3 h-3 shrink-0" />
          <span className="truncate">{node.ip}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{hbText}</span>
        </div>
        {node.game_count !== undefined && (
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 col-span-2">
            <FolderSearch className="w-3 h-3 shrink-0" />
            <span>{node.game_count} games installed</span>
          </div>
        )}
      </div>

      {/* Storage Bar */}
      <StorageBar
        storage_total={node.storage_total}
        storage_used={node.storage_used}
        storage_free={node.storage_free}
      />

      {/* Scan Paths */}
      {node.scan_paths.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Scan Paths</p>
          <div className="space-y-1">
            {node.scan_paths.slice(0, 3).map((p, i) => (
              <div key={i} className="bg-black/20 border border-white/5 rounded-lg px-2 py-1 text-[9px] text-zinc-400 font-mono truncate">
                {p}
              </div>
            ))}
            {node.scan_paths.length > 3 && (
              <p className="text-[9px] text-zinc-600">+{node.scan_paths.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          id={`scan-node-${node.node_id}`}
          onClick={handleScan}
          disabled={loading || node.status === 'offline'}
          className="flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/20 hover:border-neon-green/40 text-neon-green rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Queued' : 'Scan Now'}
        </button>
        <button
          id={`delete-node-${node.node_id}`}
          onClick={() => onDelete(node.node_id)}
          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl transition-all"
          title="Remove node"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────

const NodeManagerModal: React.FC<NodeManagerModalProps> = ({ onClose }) => {
  const { userId } = useAuth();
  const [nodes, setNodes] = useState<LibraryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    try {
      const url = userId
        ? `${LIBRARY_SERVER_URL}/api/nodes?clerk_id=${encodeURIComponent(userId)}`
        : `${LIBRARY_SERVER_URL}/api/nodes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setNodes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Cannot reach library server.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNodes();
    const t = setInterval(fetchNodes, 15000); // Refresh every 15s
    return () => clearInterval(t);
  }, [fetchNodes]);

  const handleScan = async (nodeId: string) => {
    await fetch(`${LIBRARY_SERVER_URL}/api/nodes/${nodeId}/scan`, { method: 'POST' });
  };

  const handleDelete = async (nodeId: string) => {
    if (!confirm(`Remove node ${nodeId} from the library? Its game installations will be deleted.`)) return;
    await fetch(`${LIBRARY_SERVER_URL}/api/nodes/${nodeId}`, { method: 'DELETE' });
    setNodes(prev => prev.filter(n => n.node_id !== nodeId));
  };

  const handleRename = async (nodeId: string, name: string) => {
    await fetch(`${LIBRARY_SERVER_URL}/api/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setNodes(prev => prev.map(n => n.node_id === nodeId ? { ...n, name } : n));
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-start justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-full max-w-md h-full bg-zinc-950/95 border-l border-white/[0.06] overflow-y-auto no-scrollbar"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-white/[0.06] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-white tracking-wide">Library Nodes</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {nodes.filter(n => n.status === 'online').length} online · {nodes.length} total
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-600">
              <RefreshCw className="w-6 h-6 animate-spin mb-3" />
              <p className="text-[10px] uppercase tracking-widest">Connecting to library server...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
              <WifiOff className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-xs text-red-400 font-bold">{error}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Ensure the library server is running at {LIBRARY_SERVER_URL}</p>
              <button onClick={fetchNodes} className="mt-3 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] text-zinc-400 hover:text-white transition-all uppercase tracking-widest">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && nodes.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-600">
              <Server className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-xs font-bold uppercase tracking-widest mb-1">No Nodes Registered</p>
              <p className="text-[10px] text-zinc-600 text-center px-4">
                Run <code className="bg-white/5 px-1 py-0.5 rounded text-zinc-400">python run_node.py</code> on each machine to register it.
              </p>
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
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NodeManagerModal;
