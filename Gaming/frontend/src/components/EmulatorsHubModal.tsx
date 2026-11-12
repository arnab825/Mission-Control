/**
 * Mission Control — Emulation Engine & ROM Manager
 * EmulatorsHubModal.tsx: Discovers 17 standalone emulators, RetroArch cores,
 * configures ROM search paths, merges multi-disc titles, and manages launch parameters.
 * Fully responsive across all desktop window dimensions and viewport sizes.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Play,
  Settings2,
  Disc3,
  Cpu,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import type { EmulationState, EmulatorInfo } from '../types/telemetry';

interface EmulatorsHubModalProps {
  onClose: () => void;
  emulationState?: EmulationState;
  sendCommand: (type: string, payload?: any) => void;
  userId?: string;
}

type TabType = 'installed' | 'all' | 'roms';
type ConsoleFilter = 'all' | 'playstation' | 'nintendo' | 'xbox' | 'retroarch';

export const EmulatorsHubModal: React.FC<EmulatorsHubModalProps> = ({
  onClose,
  emulationState,
  sendCommand,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('installed');
  const [newPathInput, setNewPathInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedEmulator, setSelectedEmulator] = useState<EmulatorInfo | null>(null);
  const [customExeInput, setCustomExeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [consoleFilter, setConsoleFilter] = useState<ConsoleFilter>('all');
  const [noFoldersWarning, setNoFoldersWarning] = useState(false);

  // Fetch initial emulation state on open once
  useEffect(() => {
    sendCommand('get_emulation_state');
  }, []);

  const emulators = useMemo(() => emulationState?.emulators || [], [emulationState?.emulators]);
  const installedEmulators = useMemo(() => emulators.filter((e) => e.is_installed), [emulators]);
  const romPaths = useMemo(() => emulationState?.rom_paths || [], [emulationState?.rom_paths]);
  const emulatedCount = emulationState?.emulated_games_count || 0;

  // Filter emulators for Tab 2
  const filteredEmulators = useMemo(() => {
    return emulators.filter((emu) => {
      // Console filter
      if (consoleFilter !== 'all') {
        const consoleStr = (emu.console || '').toLowerCase();
        const nameStr = (emu.name || '').toLowerCase();
        if (consoleFilter === 'playstation' && !consoleStr.includes('ps') && !consoleStr.includes('playstation') && !consoleStr.includes('vita') && !consoleStr.includes('psp')) {
          return false;
        }
        if (consoleFilter === 'nintendo' && !consoleStr.includes('switch') && !consoleStr.includes('wii') && !consoleStr.includes('gamecube') && !consoleStr.includes('ds') && !consoleStr.includes('3ds') && !consoleStr.includes('gba') && !consoleStr.includes('snes') && !consoleStr.includes('nes') && !consoleStr.includes('n64')) {
          return false;
        }
        if (consoleFilter === 'xbox' && !consoleStr.includes('xbox')) {
          return false;
        }
        if (consoleFilter === 'retroarch' && !nameStr.includes('retroarch') && !consoleStr.includes('multi') && !consoleStr.includes('dreamcast') && !consoleStr.includes('genesis')) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = emu.name.toLowerCase().includes(q);
        const matchesConsole = (emu.console || '').toLowerCase().includes(q);
        const matchesExt = (emu.extensions || []).some((ext) => ext.toLowerCase().includes(q));
        if (!matchesName && !matchesConsole && !matchesExt) {
          return false;
        }
      }

      return true;
    });
  }, [emulators, consoleFilter, searchQuery]);

  const handleAddRomPath = () => {
    const trimmed = newPathInput.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...romPaths, trimmed]));
    sendCommand('set_rom_paths', { paths: updated, userId });
    setNewPathInput('');
    setNoFoldersWarning(false);
  };

  const handleRemoveRomPath = (pathToRemove: string) => {
    const updated = romPaths.filter((p) => p !== pathToRemove);
    sendCommand('set_rom_paths', { paths: updated, userId });
  };

  const handleScanRoms = () => {
    if (romPaths.length === 0) {
      setActiveTab('roms');
      setNoFoldersWarning(true);
      return;
    }
    setNoFoldersWarning(false);
    setIsScanning(true);
    sendCommand('scan_roms', { userId });
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none overflow-y-auto">
      {/* Backdrop — Lightweight blur & GPU acceleration for zero opening lag */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transform-gpu will-change-opacity"
      />

      {/* Modal Dialog — Snappy GPU transform animation with zero frame drops */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[92vh] sm:max-h-[88vh] md:max-h-[86vh] flex flex-col rounded-2xl sm:rounded-3xl bg-zinc-950/98 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden font-['Inter',system-ui,sans-serif] my-auto transform-gpu will-change-transform will-change-opacity"
      >
        {/* Soft Ambient Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-16 bg-neon-green/10 blur-xl pointer-events-none rounded-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 xl:py-5 border-b border-white/10 shrink-0 gap-3">
          <div className="flex items-center gap-3 xl:gap-4 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 xl:w-11 xl:h-11 rounded-xl sm:rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(118,185,0,0.25)] shrink-0">
              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 xl:w-5.5 xl:h-5.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 xl:gap-3 flex-wrap">
                <h3 className="text-sm sm:text-base xl:text-lg font-black uppercase tracking-tight text-white truncate">
                  Emulators & ROM Library
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-neon-green/15 border border-neon-green/30 text-[8px] sm:text-[9px] xl:text-[10px] font-black uppercase text-neon-green tracking-wider shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  {installedEmulators.length} / {emulators.length || 17} Ready
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] xl:text-xs text-zinc-400 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                Auto-detects standalone emulators, RetroArch cores, and groups multi-disc titles.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 xl:w-5.5 xl:h-5.5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 sm:px-6 xl:px-8 py-2 sm:py-3 xl:py-3.5 border-b border-white/5 bg-zinc-900/40 gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-0.5">
            <button
              onClick={() => setActiveTab('installed')}
              className={`px-3 xl:px-4 py-1.5 xl:py-2 rounded-xl text-[11px] sm:text-xs xl:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 xl:gap-2 shrink-0 ${
                activeTab === 'installed'
                  ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span>Installed ({installedEmulators.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 xl:px-4 py-1.5 xl:py-2 rounded-xl text-[11px] sm:text-xs xl:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 xl:gap-2 shrink-0 ${
                activeTab === 'all'
                  ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span>All Emulators ({emulators.length || 17})</span>
            </button>

            <button
              onClick={() => setActiveTab('roms')}
              className={`px-3 xl:px-4 py-1.5 xl:py-2 rounded-xl text-[11px] sm:text-xs xl:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 xl:gap-2 shrink-0 ${
                activeTab === 'roms'
                  ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span>ROM Folders ({romPaths.length})</span>
            </button>
          </div>

          <button
            onClick={handleScanRoms}
            disabled={isScanning}
            className="flex items-center justify-center gap-1.5 xl:gap-2 px-3 xl:px-4 py-1.5 xl:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs xl:text-sm font-black uppercase tracking-wider text-zinc-200 transition-all cursor-pointer disabled:opacity-50 shrink-0 w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isScanning ? 'animate-spin text-neon-green' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan ROMs'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 xl:p-8 space-y-4 xl:space-y-6 custom-scrollbar">
          {/* TAB 1: INSTALLED EMULATORS */}
          {activeTab === 'installed' && (
            <div>
              {installedEmulators.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-10 md:py-14 px-4 text-center min-h-[220px] sm:min-h-[280px]">
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 mb-3 sm:mb-4">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h4 className="text-xs sm:text-sm xl:text-base font-black uppercase tracking-wider text-zinc-200">
                    No Emulators Detected Automatically
                  </h4>
                  <p className="text-[11px] sm:text-xs text-zinc-400 max-w-lg mt-1.5 mb-4 sm:mb-5 leading-relaxed">
                    Mission Control checks standard directories and system PATH for RPCS3, PCSX2, DuckStation, Dolphin, Cemu, and more.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                    <button
                      onClick={() => setActiveTab('all')}
                      className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green font-black uppercase text-[10px] sm:text-xs tracking-wider hover:bg-neon-green/20 transition-all cursor-pointer shadow-[0_0_15px_rgba(118,185,0,0.15)] text-center"
                    >
                      View All Supported Emulators (17)
                    </button>
                    <button
                      onClick={() => setActiveTab('roms')}
                      className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-black uppercase text-[10px] sm:text-xs tracking-wider hover:bg-purple-500/20 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.15)] text-center"
                    >
                      Configure ROM Folders ({romPaths.length})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3 sm:gap-3.5 xl:gap-4.5">
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
            <div className="space-y-4 xl:space-y-5">
              {/* Responsive Search & Console Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 xl:gap-3 p-3 xl:p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by name, console, or extension..."
                    className="w-full pl-8 xl:pl-9 pr-3 py-1.5 xl:py-2 rounded-xl bg-black/40 border border-white/10 text-xs xl:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-neon-green/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs xl:text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Console Pills */}
                <div className="flex items-center gap-1 xl:gap-1.5 overflow-x-auto no-scrollbar shrink-0 py-0.5">
                  {(['all', 'playstation', 'nintendo', 'xbox', 'retroarch'] as ConsoleFilter[]).map((cf) => {
                    const isSelected = consoleFilter === cf;
                    const labelMap: Record<ConsoleFilter, string> = {
                      all: 'All',
                      playstation: 'PlayStation',
                      nintendo: 'Nintendo',
                      xbox: 'Xbox',
                      retroarch: 'RetroArch',
                    };
                    return (
                      <button
                        key={cf}
                        type="button"
                        onClick={() => setConsoleFilter(cf)}
                        className={`px-2.5 xl:px-3 py-1 xl:py-1.5 rounded-lg text-[10px] xl:text-[11px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-neon-green/20 border border-neon-green/40 text-neon-green font-black'
                            : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {labelMap[cf]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status summary banner */}
              <div className="px-3.5 xl:px-4 py-2.5 xl:py-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs xl:text-sm text-zinc-400 flex-wrap gap-2">
                <span className="text-[11px] xl:text-xs">
                  Showing {filteredEmulators.length} of {emulators.length || 17} emulators
                </span>
                <span className="font-mono text-neon-green text-[11px] xl:text-xs shrink-0">
                  {installedEmulators.length} Detected Ready
                </span>
              </div>

              {filteredEmulators.length === 0 ? (
                <div className="p-8 xl:p-12 text-center text-xs xl:text-sm text-zinc-500 rounded-2xl bg-black/20 border border-white/5">
                  No emulators match your filter criteria. Try clearing search or selecting 'All'.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3 sm:gap-3.5 xl:gap-4.5">
                  {filteredEmulators.map((emu) => (
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

          {/* TAB 3: ROM FOLDERS */}
          {activeTab === 'roms' && (
            <div className="space-y-4 sm:space-y-5 xl:space-y-6">
              {/* No Folders Warning Banner */}
              {noFoldersWarning && (
                <div className="p-3.5 sm:p-4 xl:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-amber-200">
                  <div className="flex items-start gap-2.5 xl:gap-3">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 xl:w-6 xl:h-6 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs xl:text-sm">
                      <span className="font-bold text-amber-300 block mb-0.5">No ROM Directories Configured</span>
                      Please add at least one folder path below where your console ROMs or disc images (.iso, .chd, .pkg, etc.) are stored before scanning.
                    </div>
                  </div>
                  <button
                    onClick={() => setNoFoldersWarning(false)}
                    className="p-1 hover:text-white rounded text-amber-400/70 hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                  </button>
                </div>
              )}

              {/* Add Path Card */}
              <div className="p-3.5 sm:p-4 xl:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 xl:space-y-4">
                <label className="text-xs xl:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 xl:w-5 xl:h-5 text-neon-green shrink-0" />
                  <span>Add ROM Search Directory</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2 xl:gap-3">
                  <input
                    type="text"
                    value={newPathInput}
                    onChange={(e) => setNewPathInput(e.target.value)}
                    placeholder="e.g. D:\Emulation\roms or ~/Games/ROMs"
                    className="flex-1 px-3.5 xl:px-4 py-2 xl:py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs xl:text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-neon-green/50 min-w-0"
                  />
                  <button
                    onClick={handleAddRomPath}
                    disabled={!newPathInput.trim()}
                    className="px-4 xl:px-5 py-2 xl:py-2.5 rounded-xl bg-neon-green text-black font-black uppercase text-xs xl:text-sm tracking-wider hover:bg-neon-green/90 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4 xl:w-5 xl:h-5" />
                    <span>Add Directory</span>
                  </button>
                </div>
                <p className="text-[10px] xl:text-xs text-zinc-400 leading-relaxed">
                  Tip: Organize ROMs into console subfolders (e.g. <span className="font-mono text-zinc-300">ps2/</span>, <span className="font-mono text-zinc-300">switch/</span>, <span className="font-mono text-zinc-300">psx/</span>) for automatic console pairing.
                </p>
              </div>

              {/* Configured Paths List */}
              <div>
                <div className="flex items-center justify-between mb-2 xl:mb-3 flex-wrap gap-1">
                  <span className="text-[10px] xl:text-xs font-black uppercase tracking-widest text-zinc-400">
                    Configured ROM Folders ({romPaths.length})
                  </span>
                  <span className="text-[10px] xl:text-xs font-mono text-neon-green">
                    {emulatedCount} ROMs in Library
                  </span>
                </div>

                {romPaths.length === 0 ? (
                  <div className="p-6 sm:p-8 xl:p-10 rounded-2xl bg-black/20 border border-white/5 text-center text-xs xl:text-sm text-zinc-500">
                    No custom ROM directories added. Add your emulation folder above to scan games.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 xl:gap-3">
                    {romPaths.map((p) => (
                      <div
                        key={p}
                        className="flex items-center justify-between p-2.5 sm:p-3 xl:p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <FolderOpen className="w-4 h-4 xl:w-4.5 xl:h-4.5 text-neon-green shrink-0" />
                          <span className="text-xs xl:text-sm font-mono text-zinc-200 truncate">{p}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveRomPath(p)}
                          className="p-1.5 xl:p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Remove Directory"
                        >
                          <Trash2 className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Disc Info Banner */}
              <div className="p-3.5 sm:p-4 xl:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 sm:gap-3 xl:gap-3.5">
                <Disc3 className="w-4 h-4 sm:w-5 sm:h-5 xl:w-6 xl:h-6 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] sm:text-xs xl:text-sm text-blue-200 leading-relaxed">
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
              className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            >
              <div className="w-full max-w-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-zinc-900 border border-white/15 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-black uppercase text-white truncate">
                    Configure {selectedEmulator.name} Path
                  </h4>
                  <button
                    onClick={() => setSelectedEmulator(null)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0"
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

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedEmulator(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveCustomExe(selectedEmulator.id)}
                    className="px-4 py-1.5 rounded-xl bg-neon-green text-black font-black uppercase text-xs hover:bg-neon-green/90 transition-all cursor-pointer"
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

const EmulatorCard = React.memo<{
  emu: EmulatorInfo;
  onLaunch: () => void;
  onConfigure: () => void;
}>(({ emu, onLaunch, onConfigure }) => {
  return (
    <div
      className={`p-3.5 sm:p-4 xl:p-4.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 sm:gap-3 xl:gap-3.5 ${
        emu.is_installed
          ? 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
          : 'bg-black/30 border-white/5 opacity-70 hover:opacity-90'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 xl:w-11 xl:h-11 rounded-xl border flex items-center justify-center font-black text-xs xl:text-sm shrink-0 shadow-inner"
            style={{
              backgroundColor: `${emu.color}15`,
              borderColor: `${emu.color}40`,
              color: emu.color,
            }}
          >
            {emu.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs sm:text-sm xl:text-base font-black text-white truncate">{emu.name}</span>
              {emu.is_installed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[8px] sm:text-[8.5px] xl:text-[9px] font-black uppercase text-emerald-400 tracking-wider shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Ready
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] sm:text-[8.5px] xl:text-[9px] font-black uppercase text-zinc-500 tracking-wider shrink-0">
                  Not Installed
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] xl:text-xs text-zinc-400 font-medium truncate mt-0.5">
              {emu.console}
            </p>
          </div>
        </div>

        {emu.website && (
          <a
            href={emu.website}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 xl:p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors shrink-0"
            title="Official Website"
          >
            <ExternalLink className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
          </a>
        )}
      </div>

      {emu.exe_path && (
        <div className="text-[8.5px] sm:text-[9px] xl:text-[9.5px] font-mono text-zinc-400 truncate bg-black/40 px-2 py-1 xl:py-1.5 rounded-lg border border-white/5" title={emu.exe_path}>
          {emu.exe_path}
        </div>
      )}

      {emu.cores && emu.cores.length > 0 && (
        <div className="text-[8.5px] sm:text-[9px] xl:text-[10px] font-mono text-neon-green flex items-center gap-1">
          <Sparkles className="w-3 h-3 shrink-0" />
          <span className="truncate">{emu.cores.length} Libretro Cores Detected</span>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-2">
        <div className="text-[7.5px] sm:text-[8px] xl:text-[9px] font-mono text-zinc-500 uppercase tracking-wider truncate max-w-[130px] sm:max-w-none">
          {emu.extensions.slice(0, 3).join(' ')}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onConfigure}
            className="px-2.5 xl:px-3 py-1 xl:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[9px] sm:text-[10px] xl:text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
            title="Configure Binary Path"
          >
            <Settings2 className="w-3 h-3 xl:w-3.5 xl:h-3.5" />
            <span>Path</span>
          </button>

          {emu.is_installed && (
            <button
              onClick={onLaunch}
              className="px-3 xl:px-3.5 py-1 xl:py-1.5 rounded-lg bg-neon-green/15 hover:bg-neon-green text-neon-green hover:text-black border border-neon-green/30 text-[9px] sm:text-[10px] xl:text-[11px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
            >
              <Play className="w-3 h-3 xl:w-3.5 xl:h-3.5 fill-current" />
              <span>Launch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
