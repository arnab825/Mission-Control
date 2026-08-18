/**
 * Mission Control — Distributed Library
 * GameInstallationsModal.tsx: Shows all installation records for a game
 * across all Library Nodes with exact sizes, node status, store, and paths.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HardDrive, Server, Wifi, WifiOff, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export interface GameInstallation {
  nodeId: string;
  nodeName: string;
  nodeStatus: string;
  store: string;
  storeAppId?: string;
  installPath: string;
  exePath?: string;
  version?: string;
  sizeBytes: number;
  status: string;
}

interface GameInstallationsModalProps {
  gameTitle: string;
  coverUrl?: string;
  primaryGenre?: string;
  installations: GameInstallation[];
  onClose: () => void;
}

const STORE_LABELS: Record<string, string> = {
  steam:    'Steam',
  epic:     'Epic Games',
  gog:      'GOG Galaxy',
  ubisoft:  'Ubisoft Connect',
  ea:       'EA Desktop',
  rockstar: 'Rockstar Games',
  xbox:     'Xbox',
  battlenet:'Battle.net',
  manual:   'Manual Install',
  amazon:   'Amazon Games',
  itch:     'Itch.io',
  humble:   'Humble Bundle',
};

const STORE_COLORS: Record<string, string> = {
  steam:    'text-[#66c0f4] border-[#66c0f4]/30 bg-[#1b2838]/60',
  epic:     'text-purple-400 border-purple-400/30 bg-purple-900/20',
  gog:      'text-violet-400 border-violet-400/30 bg-violet-900/20',
  ubisoft:  'text-sky-400 border-sky-400/30 bg-sky-900/20',
  ea:       'text-orange-400 border-orange-400/30 bg-orange-900/20',
  rockstar: 'text-red-400 border-red-400/30 bg-red-900/20',
  xbox:     'text-green-400 border-green-400/30 bg-green-900/20',
  battlenet:'text-cyan-400 border-cyan-400/30 bg-cyan-900/20',
  manual:   'text-zinc-400 border-zinc-400/20 bg-zinc-800/20',
};

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1e6;
  return `${mb.toFixed(0)} MB`;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="shrink-0 p-1 hover:bg-white/5 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
      {copied ? <CheckCircle2 className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

const InstallationCard: React.FC<{ inst: GameInstallation }> = ({ inst }) => {
  const isOnline = inst.nodeStatus === 'online';
  const storeColor = STORE_COLORS[inst.store] || STORE_COLORS.manual;
  const storeLabel = STORE_LABELS[inst.store] || inst.store;
  const isAvailable = inst.status === 'available';

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${isAvailable ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.04] bg-black/20 opacity-60'}`}>
      {/* Node & Status Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${isOnline ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{inst.nodeName || inst.nodeId}</p>
            {!isAvailable && (
              <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Currently Unavailable</p>
            )}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${storeColor}`}>
          {storeLabel}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="col-span-2">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Install Path</p>
          <div className="flex items-center gap-1 bg-black/20 rounded-lg px-2 py-1">
            <p className="text-[9px] font-mono text-zinc-400 truncate flex-1">{inst.installPath}</p>
            <CopyButton text={inst.installPath} />
          </div>
        </div>

        <div>
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Size</p>
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="text-xs font-bold text-white">{formatBytes(inst.sizeBytes)}</span>
          </div>
        </div>

        {inst.version && (
          <div>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Version</p>
            <span className="text-[10px] font-mono text-zinc-400">{inst.version}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const GameInstallationsModal: React.FC<GameInstallationsModalProps> = ({
  gameTitle, coverUrl, primaryGenre, installations, onClose
}) => {
  const available = installations.filter(i => i.status === 'available').length;
  const unavailable = installations.length - available;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative z-10 w-full max-w-lg bg-zinc-950/98 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        >
          {/* Header */}
          <div className="relative">
            {coverUrl && (
              <div className="absolute inset-0">
                <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-15" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-zinc-950/50" />
              </div>
            )}
            <div className="relative px-5 pt-5 pb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-white leading-tight">{gameTitle}</h2>
                {primaryGenre && (
                  <p className="text-[10px] text-zinc-400 mt-0.5">{primaryGenre}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-zinc-500">
                    <span className="text-white font-bold">{installations.length}</span> installation{installations.length !== 1 ? 's' : ''}
                  </span>
                  {available > 0 && (
                    <span className="text-[10px] text-emerald-400">
                      <span className="font-bold">{available}</span> available
                    </span>
                  )}
                  {unavailable > 0 && (
                    <span className="text-[10px] text-red-400">
                      <span className="font-bold">{unavailable}</span> offline
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="shrink-0 p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Installation List */}
          <div className="px-5 pb-5 space-y-3 max-h-96 overflow-y-auto no-scrollbar">
            {installations.length === 0 ? (
              <div className="py-10 text-center">
                <Server className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Not installed on any node</p>
                <p className="text-[10px] text-zinc-700 mt-1">Game exists in the master catalog but isn't installed.</p>
              </div>
            ) : (
              installations.map((inst, i) => (
                <InstallationCard key={`${inst.nodeId}-${inst.store}-${i}`} inst={inst} />
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameInstallationsModal;
