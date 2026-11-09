/**
 * Mission Control — Emulation Engine & ROM Manager
 * EmulatorsHubModal.tsx: Discovers 17 standalone emulators, RetroArch cores,
 * configures ROM search paths, merges multi-disc titles, and manages launch parameters.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Gamepad2,
  FolderOpen,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings2,
  Disc3,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { EmulationState, EmulatorInfo } from '../types/telemetry';

interface EmulatorsHubModalProps {
  onClose: () => void;
  emulationState?: EmulationState;
  sendCommand: (type: string, payload?: any) => void;
}

type TabType = 'installed' | 'all' | 'roms';

export const EmulatorsHubModal: React.FC<EmulatorsHubModalProps> = ({
  onClose,
  emulationState,
  sendCommand,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('installed');
  const [newPathInput, setNewPathInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedEmulator, setSelectedEmulator] = useState<EmulatorInfo | null>(null);
  const [customExeInput, setCustomExeInput] = useState('');

  // Fetch initial emulation state on open
  useEffect(() => {
    sendCommand('get_emulation_state');
  }, [sendCommand]);

  const emulators = emulationState?.emulators || [];
  const installedEmulators = emulators.filter((e) => e.is_installed);
  const romPaths = emulationState?.rom_paths || [];
  const emulatedCount = emulationState?.emulated_games_count || 0;

  const handleAddRomPath = () => {
    const trimmed = newPathInput.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...romPaths, trimmed]));
    sendCommand('set_rom_paths', { paths: updated });
    setNewPathInput('');
  };

  const handleRemoveRomPath = (pathToRemove: string) => {
    const updated = romPaths.filter((p) => p !== pathToRemove);
    sendCommand('set_rom_paths', { paths: updated });
  };

  const handleScanRoms = () => {
    setIsScanning(true);
    sendCommand('scan_roms');
    setTimeout(() => setIsScanning(false), 2000);
  };

  const handleSaveCustomExe = (emuId: string) => {
    sendCommand('configure_emulator', {
      emulator_id: emuId,
      exe_path: customExeInput.trim(),
    });
    setSelectedEmulator(null);
    setCustomExeInput('');
  };

  const handleLaunchEmulator = (emu: EmulatorInfo) => {
    if (emu.exe_path) {
      sendCommand('launch_game', { exe_path: emu.exe_path });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl bg-zinc-950 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden font-['Inter',system-ui,sans-serif]"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-neon-green/10 blur-3xl pointer-events-none rounded-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(118,185,0,0.25)]">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  Emulators & ROM Library
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neon-green/15 border border-neon-green/30 text-[9px] font-black uppercase text-neon-green tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  {installedEmulators.length} / {emulators.length || 17} Ready
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                Auto-detects standalone emulators, RetroArch cores, and groups multi-disc titles.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('installed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'installed'
                  ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Installed ({installedEmulators.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Emulators ({emulators.length || 17})</span>
            </button>

            <button
              onClick={() => setActiveTab('roms')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'roms'
                  ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>ROM Folders ({romPaths.length})</span>
            </button>
          </div>

          <button
            onClick={handleScanRoms}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-neon-green' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan ROMs'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: INSTALLED EMULATORS */}
          {activeTab === 'installed' && (
            <div>
              {installedEmulators.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 mb-4">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-zinc-200">
                    No Emulators Detected Automatically
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mt-1 mb-5">
                    Mission Control checks standard directories and system PATH for RPCS3, PCSX2, DuckStation, Dolphin, Cemu, and more.
                  </p>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="px-4 py-2 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green font-black uppercase text-xs tracking-wider hover:bg-neon-green/20 transition-all cursor-pointer"
                  >
                    View All Supported Emulators & Configure Paths
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {installedEmulators.map((emu) => (
                    <EmulatorCard
                      key={emu.id}
                      emu={emu}
                      onLaunch={() => handleLaunchEmulator(emu)}
                      onConfigure={() => {
                        setSelectedEmulator(emu);
                        setCustomExeInput(emu.custom_exe_path || emu.exe_path);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL SUPPORTED EMULATORS */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Supported consoles: PS1, PS2, PS3, PSP, PS Vita, Switch, Wii, Wii U, GameCube, 3DS, DS, Xbox 360, Xbox, RetroArch.
                </span>
                <span className="font-mono text-neon-green shrink-0">
                  {installedEmulators.length} Installed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {emulators.map((emu) => (
                  <EmulatorCard
                    key={emu.id}
                    emu={emu}
                    onLaunch={() => handleLaunchEmulator(emu)}
                    onConfigure={() => {
                      setSelectedEmulator(emu);
                      setCustomExeInput(emu.custom_exe_path || emu.exe_path);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ROM FOLDERS */}
          {activeTab === 'roms' && (
            <div className="space-y-5">
              {/* Add Path Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-neon-green" />
                  Add ROM Search Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPathInput}
                    onChange={(e) => setNewPathInput(e.target.value)}
                    placeholder="e.g. D:\Emulation\roms or ~/Games/ROMs"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-neon-green/50"
                  />
                  <button
                    onClick={handleAddRomPath}
                    disabled={!newPathInput.trim()}
                    className="px-4 py-2 rounded-xl bg-neon-green text-black font-black uppercase text-xs tracking-wider hover:bg-neon-green/90 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Directory</span>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Tip: Organize ROMs into console subfolders (e.g. <span className="font-mono text-zinc-300">ps2/</span>, <span className="font-mono text-zinc-300">switch/</span>, <span className="font-mono text-zinc-300">psx/</span>) for automatic console pairing.
                </p>
              </div>

              {/* Configured Paths List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Configured ROM Folders ({romPaths.length})
                  </span>
                  <span className="text-[10px] font-mono text-neon-green">
                    {emulatedCount} ROMs in Library
                  </span>
                </div>

                {romPaths.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center text-xs text-zinc-500">
                    No custom ROM directories added. Add your emulation folder above to scan games.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {romPaths.map((p) => (
                      <div
                        key={p}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FolderOpen className="w-4 h-4 text-neon-green shrink-0" />
                          <span className="text-xs font-mono text-zinc-200 truncate">{p}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveRomPath(p)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Remove Directory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Disc Info Banner */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Disc3 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    Automatic Multi-Disc Merging
                  </span>
                  Titles spanning multiple discs (e.g. <span className="font-mono">Metal Gear Solid (Disc 1).chd</span> and <span className="font-mono">(Disc 2).chd</span>) are automatically collapsed into a single game card with an interactive disc switcher.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configure Emulator Sub-modal */}
        <AnimatePresence>
          {selectedEmulator && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            >
              <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase text-white">
                    Configure {selectedEmulator.name} Path
                  </h4>
                  <button
                    onClick={() => setSelectedEmulator(null)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Custom Executable Binary
                  </label>
                  <input
                    type="text"
                    value={customExeInput}
                    onChange={(e) => setCustomExeInput(e.target.value)}
                    placeholder="e.g. C:\Emulation\rpcs3\rpcs3.exe"
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/10 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-neon-green"
                  />
                  <p className="text-[9px] text-zinc-500">
                    Provide the absolute path to the emulator binary on this machine.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedEmulator(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveCustomExe(selectedEmulator.id)}
                    className="px-4 py-1.5 rounded-xl bg-neon-green text-black font-black uppercase text-xs"
                  >
                    Save Path
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const EmulatorCard: React.FC<{
  emu: EmulatorInfo;
  onLaunch: () => void;
  onConfigure: () => void;
}> = ({ emu, onLaunch, onConfigure }) => {
  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
        emu.is_installed
          ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
          : 'bg-black/30 border-white/5 opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs shrink-0"
            style={{
              backgroundColor: `${emu.color}15`,
              borderColor: `${emu.color}40`,
              color: emu.color,
            }}
          >
            {emu.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white truncate">{emu.name}</span>
              {emu.is_installed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[8px] font-black uppercase text-emerald-400 tracking-wider">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Ready
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-black uppercase text-zinc-500 tracking-wider">
                  Not Installed
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
              {emu.console}
            </p>
          </div>
        </div>

        {emu.website && (
          <a
            href={emu.website}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Official Website"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {emu.exe_path && (
        <div className="text-[9px] font-mono text-zinc-500 truncate bg-black/40 px-2 py-1 rounded-lg border border-white/5">
          {emu.exe_path}
        </div>
      )}

      {emu.cores && emu.cores.length > 0 && (
        <div className="text-[9px] font-mono text-neon-green flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>{emu.cores.length} Libretro Cores Detected</span>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
          {emu.extensions.slice(0, 3).join(' ')}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onConfigure}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
            title="Configure Binary Path"
          >
            <Settings2 className="w-3 h-3" />
            <span>Path</span>
          </button>

          {emu.is_installed && (
            <button
              onClick={onLaunch}
              className="px-3 py-1 rounded-lg bg-neon-green/15 hover:bg-neon-green text-neon-green hover:text-black border border-neon-green/30 text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Launch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

