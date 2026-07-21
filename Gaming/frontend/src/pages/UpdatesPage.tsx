import React, { useEffect, useRef } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  History, 
  CheckCircle2, 
  AlertTriangle,
  Cpu,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import type { TelemetryState } from '../types/telemetry';

interface UpdatesPageProps {
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
  defaultTab?: 'check' | 'changelogs';
}

const compareSemVer = (a: string, b: string): number => {
  const cleanA = a.replace(/^v/, '');
  const cleanB = b.replace(/^v/, '');
  const pa = cleanA.split('.').map(Number);
  const pb = cleanB.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
};

export const UpdatesPage: React.FC<UpdatesPageProps> = ({ 
  state, 
  sendCommand,
  defaultTab = 'check'
}) => {
  const [activeTab, setActiveTab] = React.useState<'check' | 'changelogs'>(defaultTab);
  const [expandedVersions, setExpandedVersions] = React.useState<Record<string, boolean>>({});
  const logEndRef = useRef<HTMLDivElement>(null);
  const [nativeUpdate, setNativeUpdate] = React.useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'paused' | 'up-to-date' | 'downloaded' | 'error' | 'not-supported' | 'cancelled';
    version?: string;
    date?: string;
    notes?: string;
    message?: string;
    percent?: number;
  }>({ status: 'idle' });
  const [isManualChecking, setIsManualChecking] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const manualCheckStatusRef = useRef<'idle' | 'checking'>('idle');
  const [rollbackInfo, setRollbackInfo] = React.useState<{ exists: boolean; version?: string } | null>(null);
  const [rollbackConfirm, setRollbackConfirm] = React.useState(false);


  useEffect(() => {
    setActiveTab(defaultTab);
    sendCommand('get_changelogs');
    if (defaultTab === 'check') {
      sendCommand('check_updates');
      // Load persisted update state (pause/resume support)
      if (window.electronAPI?.getElectronUpdateState) {
        window.electronAPI.getElectronUpdateState().then((savedState: any) => {
          if (savedState && savedState.status && savedState.status !== 'idle' && savedState.status !== 'up-to-date') {
            setNativeUpdate(savedState);
          } else {
            window.electronAPI?.checkElectronUpdates?.();
          }
        });
      } else {
        window.electronAPI?.checkElectronUpdates?.();
      }
      // Check if a rollback backup exists
      if ((window.electronAPI as any)?.checkRollbackBackup) {
        (window.electronAPI as any).checkRollbackBackup().then((info: any) => {
          setRollbackInfo(info);
        }).catch(() => {});
      }
    }
  }, [defaultTab]);


  useEffect(() => {
    if (window.electronAPI?.onElectronUpdateStatus) {
      const cleanup = window.electronAPI.onElectronUpdateStatus((_event, data) => {
        console.log('[React NativeUpdate] Received event data:', data);
        if (data) {
          setNativeUpdate(data);
        }
      });
      return () => {
        cleanup();
      };
    }
  }, []);

  const updateState = state?.update_state || { status: 'idle' };
  const installState = state?.update_install_state;
  const changelogsData = state?.changelogs;

  useEffect(() => {
    if (changelogsData?.changelog && changelogsData.changelog.length > 0) {
      const firstVer = changelogsData.changelog[0].version;
      setExpandedVersions(prev => {
        if (Object.keys(prev).length === 0) {
          return { [firstVer]: true };
        }
        return prev;
      });
    }
  }, [changelogsData]);

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => ({
      ...prev,
      [version]: !prev[version]
    }));
  };
  
  // Auto scroll terminal logs
  useEffect(() => {
    if (installState?.step) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [installState?.step]);

  useEffect(() => {
    if (isManualChecking) {
      if (updateState?.status === 'checking') {
        manualCheckStatusRef.current = 'checking';
      }
      if (manualCheckStatusRef.current === 'checking') {
        if (updateState?.status === 'up_to_date') {
          setToastMessage("Mission Control is already up to date!");
          setIsManualChecking(false);
          manualCheckStatusRef.current = 'idle';
        } else if (updateState?.status === 'available') {
          setToastMessage("New update is available for download!");
          setIsManualChecking(false);
          manualCheckStatusRef.current = 'idle';
        } else if (updateState?.status === 'failed') {
          setToastMessage("Update check failed: " + (updateState.reason || 'Network error'));
          setIsManualChecking(false);
          manualCheckStatusRef.current = 'idle';
        }
      }
    }
  }, [updateState?.status, isManualChecking]);

  useEffect(() => {
    if (isManualChecking) {
      const timer = setTimeout(() => {
        if (isManualChecking) {
          setIsManualChecking(false);
          manualCheckStatusRef.current = 'idle';
          setToastMessage("Update check completed.");
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isManualChecking]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (installState?.status === 'success') {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [installState?.status]);

  const currentVersion = state?.version || '---';

  const getReleaseHighlightsForVersion = (version: string) => {
    const cleanTarget = version.replace(/^v/, '');
    let match = null;
    if (updateState?.changelog) {
      match = updateState.changelog.find((log: any) => log.version.replace(/^v/, '') === cleanTarget);
    }
    if (!match && changelogsData?.changelog) {
      match = changelogsData.changelog.find((log: any) => log.version.replace(/^v/, '') === cleanTarget);
    }
    if (match) {
      // Ensure if highlights is a single string with semicolons/newlines, it gets split into separate bullet points
      if (Array.isArray(match.highlights)) {
        const splitHighlights: string[] = [];
        match.highlights.forEach((h: string) => {
          h.split(/;|\n|\|/).forEach(part => {
            const trimmed = part.trim();
            if (trimmed) splitHighlights.push(trimmed);
          });
        });
        return { ...match, highlights: splitHighlights };
      }
      return match;
    }
    if (updateState?.notes) {
      const splitNotes = updateState.notes.split(/;|\n|\||\*|-/).map((s: string) => s.trim()).filter(Boolean);
      if (splitNotes.length > 0) {
        return { version, highlights: splitNotes };
      }
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden relative font-['Inter',system-ui,sans-serif]">
      {/* Animated Background Highlights */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-neon-green/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Page Header */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-zinc-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/25 flex items-center justify-center glow-green">
            <Cpu className="w-4 h-4 text-neon-green" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-widest uppercase text-white">System Relauncher</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Mission Control Engine</p>
          </div>
        </div>
      </div>

        {/* Tab Navigation */}
        <div className="relative z-10 flex border-b border-white/5 bg-zinc-950/40 shrink-0">
          <button aria-label="button" type="button"
            onClick={() => {
              setActiveTab('check');
              sendCommand('check_updates');
              window.electronAPI?.checkElectronUpdates?.();
            }}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
              activeTab === 'check'
                ? 'border-neon-green text-neon-green bg-neon-green/2'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/1'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${updateState?.status === 'checking' ? 'animate-spin' : ''}`} />
              Check Updates
            </span>
          </button>
          <button aria-label="button" type="button"
            onClick={() => {
              setActiveTab('changelogs');
              sendCommand('get_changelogs');
            }}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
              activeTab === 'changelogs'
                ? 'border-neon-green text-neon-green bg-neon-green/2'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/1'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <History className="w-3.5 h-3.5" />
              Neural Patch Notes
            </span>
          </button>
        </div>

        {/* Scrollable Content Workspace */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          
          {/* TAB 1: Check & Install Status */}
          {activeTab === 'check' && (
            <div className="space-y-6">
              
              {/* Native Client Update Alert (Squirrel) */}
              {(!installState || installState.status === 'use_native') && nativeUpdate.status === 'downloaded' && (
                <div className="p-6 bg-linear-to-r from-purple-500/10 to-neon-green/10 border border-neon-green/30 rounded-3xl space-y-4 shadow-[0_0_20px_rgba(118, 185, 0,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-neon-green/5 rounded-full blur-[60px] pointer-events-none" />
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[8px] font-black tracking-widest uppercase border border-purple-500/30">NATIVE DESKTOP UPGRADE</span>
                        <span className="px-2 py-0.5 rounded bg-neon-green/10 text-neon-green text-[8px] font-bold font-mono">v{nativeUpdate.version || 'Latest'}</span>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white mt-1">Desktop Client Update Ready</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase leading-relaxed">
                        A new Electron core wrapper version has been securely downloaded and is ready to apply.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button aria-label="button" type="button"
                        disabled={isManualChecking}
                        onClick={() => {
                          manualCheckStatusRef.current = 'checking';
                          setIsManualChecking(true);
                          sendCommand('check_updates');
                          window.electronAPI?.checkElectronUpdates?.();
                        }}
                        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50"
                      >
                        {isManualChecking ? 'Checking...' : 'Check Again'}
                      </button>
                      <button aria-label="button" type="button"
                        onClick={() => window.electronAPI?.quitAndInstallElectronUpdate?.()}
                        className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-purple-500 to-neon-green hover:from-purple-400 hover:to-neon-green text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(118, 185, 0,0.3)] transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Restart & Relaunch
                      </button>
                    </div>
                  </div>

                  {nativeUpdate.notes && (
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                      <h5 className="text-[8px] font-black text-neon-green uppercase tracking-widest">Wrapper Release Notes:</h5>
                      <div 
                        className="text-[9px] text-zinc-500 leading-relaxed font-mono [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_li]:mt-1"
                        dangerouslySetInnerHTML={{ __html: nativeUpdate.notes }}
                      />
                    </div>
                  )}
                </div>
              )}

              {(!installState || installState.status === 'use_native') && nativeUpdate.status === 'available' && (
                <div className="p-6 bg-linear-to-r from-neon-green/5 to-zinc-900/50 border border-neon-green/30 rounded-3xl space-y-4 shadow-[0_0_20px_rgba(118, 185, 0,0.1)]">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-neon-green/20 text-neon-green text-[8px] font-black tracking-widest uppercase border border-neon-green/30">UPDATE FOUND</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-300 text-[8px] font-bold font-mono">v{nativeUpdate.version}</span>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white mt-2">New Neural Patch Available</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase leading-relaxed">
                        Review the changes below and choose when to download.
                      </p>
                    </div>
                  </div>

                  {nativeUpdate.notes && (
                    <div className="bg-black/60 border border-white/5 rounded-2xl p-4 space-y-2 mt-2">
                      <h5 className="text-[8px] font-black text-neon-green uppercase tracking-widest">Patch Notes:</h5>
                      <div 
                        className="text-[10px] text-zinc-300 leading-relaxed font-mono max-h-32 overflow-y-auto custom-scrollbar [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_li]:mt-1"
                        dangerouslySetInnerHTML={{ __html: nativeUpdate.notes }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button aria-label="Install" type="button"
                      onClick={() => {
                        window.electronAPI?.downloadElectronUpdate?.();
                        setNativeUpdate(prev => ({ ...prev, status: 'downloading' }));
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neon-green hover:bg-neon-green/90 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download & Install
                    </button>
                    <button aria-label="Cancel" type="button"
                      onClick={() => setNativeUpdate({ status: 'idle' })}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {(!installState || installState.status === 'use_native') && nativeUpdate.status === 'downloading' && (
                <div className="p-6 bg-neon-green/5 border border-neon-green/20 rounded-3xl space-y-4 shadow-[0_0_20px_rgba(118,185,0,0.1)]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-neon-green/10 text-neon-green text-[8px] font-black tracking-widest uppercase border border-neon-green/25">DOWNLOADING PATCH</span>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Native Update in Progress</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">
                        {nativeUpdate.message || 'Downloading Electron system wrapper update...'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-neon-green/20 flex items-center justify-center bg-neon-green/5 shrink-0">
                      <RefreshCw className="w-4 h-4 text-neon-green animate-spin" />
                    </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                      <span>Download Progress</span>
                      <span>{nativeUpdate.percent || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neon-green transition-all duration-300" 
                        style={{ width: `${nativeUpdate.percent || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Pause / Cancel Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button aria-label="Pause" type="button"
                      onClick={() => {
                        const pausedPercent = nativeUpdate.percent || 0;
                        if ((window.electronAPI as any)?.pauseElectronUpdate) {
                          (window.electronAPI as any).pauseElectronUpdate();
                        } else {
                          window.electronAPI?.cancelElectronUpdate?.();
                        }
                        setNativeUpdate(prev => ({ ...prev, status: 'paused', percent: pausedPercent, message: `Paused at ${pausedPercent}% — click Resume to continue.` }));
                      }}
                      className="px-6 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      ⏸ Pause
                    </button>
                    <button aria-label="Cancel" type="button"
                      onClick={() => {
                        window.electronAPI?.cancelElectronUpdate?.();
                        setNativeUpdate({ status: 'idle' });
                      }}
                      className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Paused Download State — persists across navigation and app restarts */}
              {(!installState || installState.status === 'use_native') && nativeUpdate.status === 'paused' && (
                <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[8px] font-black tracking-widest uppercase border border-amber-500/25">⏸ DOWNLOAD PAUSED</span>
                        {nativeUpdate.version && <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-300 text-[8px] font-bold font-mono">v{nativeUpdate.version}</span>}
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-amber-300 mt-1">Update Download Paused</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">
                        {nativeUpdate.message || 'Download paused by user.'}
                      </p>
                    </div>
                    <div className="text-2xl font-black text-amber-400/60 font-mono shrink-0">
                      {nativeUpdate.percent || 0}%
                    </div>
                  </div>

                  {/* Frozen progress bar showing where it paused */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                      <span>Paused at</span>
                      <span>{nativeUpdate.percent || 0}% of download</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400/70 transition-all duration-300"
                        style={{ width: `${nativeUpdate.percent || 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-600 font-mono">Note: download will restart from the beginning when resumed (HTTP resume not supported)</p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button aria-label="Resume" type="button"
                      onClick={() => {
                        window.electronAPI?.downloadElectronUpdate?.();
                        setNativeUpdate(prev => ({ ...prev, status: 'downloading', percent: 0, message: 'Restarting download...' }));
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neon-green hover:bg-neon-green/90 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Resume Download
                    </button>
                    <button aria-label="Cancel" type="button"
                      onClick={() => setNativeUpdate({ status: 'idle' })}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Scenario 1: Checking for updates */}
              {updateState?.status === 'checking' && !isManualChecking && (
                <div className="flex flex-col items-center justify-center py-12 gap-y-6">
                  <div className="relative">
                    {/* Ring Pulse scanner */}
                    <div className="absolute inset-0 rounded-full border border-neon-green/20 animate-ping opacity-75" />
                    <div className="w-16 h-16 rounded-full bg-neon-green/5 border border-neon-green/20 flex items-center justify-center shadow-[0_0_20px_rgba(118, 185, 0,0.1)]">
                      <RefreshCw className="w-6 h-6 text-neon-green animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Neural Sync Active</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Verifying checksum values with remote hub...</p>
                  </div>
                </div>
              )}

              {/* Scenario 2 & 3: Unified Update Available / Up to Date layout */}
              {(!updateState || updateState.status === 'available' || updateState.status === 'up_to_date' || updateState.status === 'idle') && updateState?.status !== 'checking' && !installState && (
                <div className="space-y-6">
                  {/* Status header banner */}
                  {updateState.status === 'available' ? (
                    <div className="space-y-3">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-neon-green/5 border border-neon-green/20 rounded-2xl gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-neon-green/10 text-neon-green text-[8px] font-black tracking-widest uppercase">
                              {updateState.is_patch ? 'PATCH UPDATE' : 'UPGRADE AVAILABLE'}
                            </span>
                            <h4 className="text-xs font-black uppercase tracking-widest text-white">
                              {updateState.is_patch ? 'Patch Update Available' : 'Upgrade Available'}
                            </h4>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase leading-relaxed">
                            {updateState.is_patch ? (
                              <>A new patch for version (<span className="text-neon-green font-mono">v{updateState.latest_version}</span>) is available. Apply now to get the latest fixes.</>
                            ) : (
                              <>A new version (<span className="text-neon-green font-mono">v{updateState.latest_version}</span>) is available. Upgrade now to access the latest improvements.</>
                            )}
                          </p>
                        </div>

                        <button aria-label="button" type="button"
                          onClick={() => {
                            if (state?.is_frozen) {
                              window.electronAPI?.downloadElectronUpdate?.();
                              setNativeUpdate({ status: 'downloading', percent: 0 });
                            } else {
                              sendCommand('install_update');
                            }
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-neon-green hover:bg-neon-green text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(118, 185, 0,0.3)] hover:shadow-[0_0_30px_rgba(118, 185, 0,0.5)] transition-all shrink-0 hover:scale-[1.02] cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Upgrade Now
                        </button>
                      </div>

                      {nativeUpdate.status === 'error' && (
                        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-400">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <h5 className="text-[10px] font-black uppercase tracking-widest">Desktop Client Update Interrupted</h5>
                              <p className="text-[9px] font-medium leading-relaxed">
                                {nativeUpdate.message || 'An unexpected error occurred during update initialization.'}
                              </p>
                            </div>
                          </div>
                          <a href="https://github.com/arnab825/Mission-Control/releases" target="_blank" rel="noopener noreferrer"
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[8px] font-black uppercase tracking-widest rounded-xl border border-red-500/30 transition-all text-center shrink-0"
                          >
                            Download Setup.exe Manually
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-zinc-900/40 border border-white/5 rounded-2xl gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 text-[8px] font-black tracking-widest uppercase border border-white/5">PLATFORM CORE</span>
                          <h4 className="text-xs font-black uppercase tracking-widest text-white">Mission Control is up to date</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed">
                          You're running the latest version (<span className="text-zinc-400 font-mono">v{currentVersion}</span>).
                        </p>
                      </div>

                      <button aria-label="button" type="button"
                        disabled={isManualChecking}
                        onClick={() => {
                          manualCheckStatusRef.current = 'checking';
                          setIsManualChecking(true);
                          sendCommand('check_updates');
                          window.electronAPI?.checkElectronUpdates?.();
                        }}
                        className="flex items-center gap-1.5 px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isManualChecking ? 'animate-spin' : ''}`} />
                        {isManualChecking ? 'Checking...' : 'Check Again'}
                      </button>
                    </div>
                  )}

                  {/* Version Comparison Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-zinc-900/20 border border-white/5 rounded-2xl flex flex-col justify-between space-y-2">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Current Version</span>
                      <span className="text-xl font-mono font-black text-white">v{currentVersion}</span>
                    </div>
                    <div className="p-5 bg-zinc-900/20 border border-white/5 rounded-2xl flex flex-col justify-between space-y-2">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Latest Version</span>
                      <span className="text-xl font-mono font-black text-neon-green">
                        v{updateState.status === 'available' ? updateState.latest_version : currentVersion}
                      </span>
                    </div>
                  </div>

                  {/* Highlights section */}
                  {(() => {
                    const targetVer = updateState.status === 'available' ? updateState.latest_version : currentVersion;
                    const highlightsData = getReleaseHighlightsForVersion(targetVer);
                    return (
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-neon-green uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-neon-green" />
                          Release Highlights (v{targetVer})
                        </h5>

                        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 space-y-4">
                          {highlightsData && highlightsData.highlights?.length > 0 ? (
                            <ul className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                              {highlightsData.highlights.map((change: string, idx: number) => (
                                <li key={idx} className="flex gap-2.5 items-start text-[10px] text-zinc-400 font-medium leading-relaxed">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/60 mt-1.5 shrink-0" />
                                  <span>{change}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">No release documentation found for this version.</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {installState && (
                <div className="space-y-6">
                  {((installState.status !== 'use_native') ||
                    (nativeUpdate.status !== 'downloading' && nativeUpdate.status !== 'downloaded' && nativeUpdate.status !== 'available')) && (
                    <div className="flex flex-col items-center justify-center p-6 bg-neon-green/5 border border-neon-green/10 rounded-2xl gap-y-4">
                    {installState.status === 'installing' && (
                      <div className="w-10 h-10 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center shrink-0">
                        <RefreshCw className="w-5 h-5 text-neon-green animate-spin" />
                      </div>
                    )}
                    {installState.status === 'success' && (
                      <div className="w-10 h-10 rounded-full bg-neon-yellow/10 border border-neon-yellow/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-neon-yellow" />
                      </div>
                    )}
                    {installState.status === 'failed' && (
                      <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    {installState.status === 'use_native' && (
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Download className="w-5 h-5 text-purple-400" />
                      </div>
                    )}
                    
                    <div className="text-center space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                        {installState.status === 'installing' && 'Rebuilding Kernel Nodes'}
                        {installState.status === 'success' && 'Rebuild Successful'}
                        {installState.status === 'failed' && 'Platform Compile Failed'}
                        {installState.status === 'use_native' && 'Use Desktop Upgrade'}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {installState.status === 'installing' && (installState.step || 'Running automated Git Sync and dependency updates...')}
                        {installState.status === 'success' && 'Deploying nodes. Relaunching Python server...'}
                        {installState.status === 'failed' && (installState.reason || 'An error occurred during build processes.')}
                        {installState.status === 'use_native' && (installState.step || 'This is a packaged build. Use the native Desktop Upgrade button above to update.')}
                      </p>
                    </div>

                    {installState.status === 'use_native' && (
                      <button aria-label="button" type="button"
                        onClick={() => {
                          window.electronAPI?.checkElectronUpdates?.();
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-purple-500 to-neon-green hover:from-purple-400 hover:to-neon-green text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(118,185,0,0.3)] transition-all hover:scale-[1.02] cursor-pointer mt-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Check Native Update
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

              {/* Scenario 5: Check Failed */}
              {updateState?.status === 'failed' && !installState && (
                <div className="flex flex-col items-center justify-center py-12 gap-y-6">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="text-center space-y-2 max-w-sm">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100">Verification Failure</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed">
                      {updateState.reason || 'Failed to authenticate connection with the remote update server.'}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button aria-label="button" type="button"
                      onClick={() => sendCommand('check_updates')}
                      className="px-6 py-2 bg-neon-green text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-neon-green shadow-[0_0_15px_rgba(118, 185, 0,0.2)] transition-all"
                    >
                      Retry Link
                    </button>
                  </div>
                </div>
              )}

              {/* Hardware Telemetry Hotfix & Glitch Scanner */}
              {!installState && (
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-neon-green uppercase tracking-widest flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-neon-green" />
                      Telemetry Glitch Scanner
                    </h5>
                    <button
                      type="button"
                      onClick={() => sendCommand('check_patches')}
                      className="px-2.5 py-1 rounded bg-neon-green/10 hover:bg-neon-green/20 text-neon-green text-[8px] font-black uppercase tracking-wider border border-neon-green/20 transition cursor-pointer"
                    >
                      Resync Telemetry
                    </button>
                  </div>
                  
                  {state?.patches_sync?.status === 'checking' && (
                    <div className="flex items-center gap-2.5 p-4 bg-white/2 border border-white/5 rounded-2xl animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 text-neon-green animate-spin" />
                      <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Syncing with Next.js hotfix repository...</span>
                    </div>
                  )}

                  {state?.patches_sync?.status === 'failed' && (
                    <div className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-500/15 rounded-2xl text-[8px] text-red-400 font-bold uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Sync failed: {state.patches_sync.error}
                    </div>
                  )}

                  {state?.patches_sync?.status === 'success' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[8px] font-black text-zinc-500 bg-black/40 border border-white/5 p-3.5 rounded-2xl">
                        <span>LOCAL NODE CAPTURE: <strong className="text-zinc-300 font-mono">{state.patches_sync.local_specs.gpu || 'NVIDIA GPU'} | {state.patches_sync.local_specs.os}</strong></span>
                        <span className="text-neon-green">{state.patches_sync.matched_issues.length} MATCHES</span>
                      </div>

                      {state.patches_sync.matched_issues.length === 0 ? (
                        <div className="p-4 bg-neon-yellow/5 border border-neon-yellow/15 rounded-2xl flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-neon-yellow" />
                          <span className="text-[8px] font-black text-neon-yellow uppercase tracking-widest">0 hardware conflicts matching your specs detected in database.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 max-h-55 overflow-y-auto custom-scrollbar pr-1">
                          {state.patches_sync.matched_issues.map((issue: any) => (
                            <div key={issue.id} className="p-4 bg-white/2 border border-white/5 rounded-2xl space-y-2 relative overflow-hidden group hover:border-white/10 transition-all">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-neon-green/10 border border-neon-green/25 text-neon-green uppercase tracking-wider">{issue.category}</span>
                                <span className="text-[8px] font-mono text-neon-green/80 px-2 py-0.5 rounded bg-neon-green/5 border border-neon-green/15 uppercase tracking-wider">{issue.match_reason}</span>
                              </div>
                              <h6 className="text-[10px] font-black text-zinc-200 uppercase tracking-wide leading-snug">{issue.title}</h6>
                              {issue.description && (
                                <p className="text-[9px] text-zinc-400 font-bold uppercase leading-relaxed mt-1">
                                  {issue.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-[8px] text-zinc-500 font-bold uppercase pt-1">
                                <span>Target Context: <strong className="text-zinc-400">{issue.game || 'Global System'}</strong></span>
                                <span className="text-neon-green/90">{issue.votes} affected users</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* System Recovery Section */}
              {!installState && (
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-red-400" />
                    System Recovery & Rollback
                  </h5>

                  {/* Rollback confirm dialog */}
                  {rollbackConfirm ? (
                    <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3">
                      <p className="text-[10px] font-black text-red-300 uppercase tracking-wide">⚠ Confirm Rollback</p>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase leading-relaxed">
                        The app will close, restore the previous backup
                        {rollbackInfo?.version ? ` (v${rollbackInfo.version})` : ''}, and relaunch.
                        Unsaved changes will be lost.
                      </p>
                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRollbackConfirm(false);
                            window.electronAPI?.rollbackElectronUpdate?.();
                          }}
                          className="flex-1 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[8px] font-black uppercase tracking-widest rounded-xl border border-red-500/30 transition cursor-pointer"
                        >
                          Yes, Rollback & Restart
                        </button>
                        <button
                          type="button"
                          onClick={() => setRollbackConfirm(false)}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 text-[8px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : rollbackInfo?.exists ? (
                    <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h6 className="text-[10px] font-black text-zinc-200 uppercase tracking-wide">Offline Backup Restoration</h6>
                          {rollbackInfo.version && (
                            <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 text-[8px] font-mono border border-white/5">backup: v{rollbackInfo.version}</span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase leading-relaxed">
                          A backup of your previous installation is available. Restore it if the current version is unstable.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRollbackConfirm(true)}
                        className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-xl border border-red-500/20 hover:border-red-500/30 transition cursor-pointer shrink-0"
                      >
                        Rollback Core Version
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] text-zinc-600 font-bold uppercase">
                        No rollback backup available. A backup is created automatically when you install an update via "Restart & Relaunch".
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Historical Patch Notes */}
          {activeTab === 'changelogs' && (
            <div className="space-y-6">
              {!changelogsData ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 text-neon-green animate-spin mb-4" />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Parsing Release Archives...</span>
                </div>
              ) : changelogsData.error ? (
                <div className="flex flex-col items-center justify-center py-12 gap-y-4">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <p className="text-[10px] text-zinc-500 uppercase font-black">Archive Access Denied: {changelogsData.error}</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l border-white/5 space-y-6">
                  {(() => {
                    const activeHighlightsVer = updateState?.status === 'available' ? updateState.latest_version : currentVersion;
                    const previousReleases = changelogsData.changelog?.filter((entry: any) => {
                      return compareSemVer(entry.version, activeHighlightsVer) <= 0;
                    }) || [];

                    if (previousReleases.length === 0) {
                      return (
                        <div className="p-6 bg-zinc-900/10 border border-white/5 rounded-2xl text-center">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">No previous releases in history.</p>
                        </div>
                      );
                    }

                    return previousReleases.map((entry: any) => {
                      const isExpanded = !!expandedVersions[entry.version];
                      return (
                        <div key={entry.version} className="relative space-y-2">
                          {/* Timeline dot */}
                          <div className={`absolute -left-7.75 top-2.5 w-2.5 h-2.5 rounded-full border border-[#08080c] ${
                            isExpanded 
                              ? 'bg-neon-green shadow-[0_0_8px_#76b900]' 
                              : 'bg-zinc-700'
                          }`} />

                          {/* Collapsible Trigger Header */}
                          <button aria-label="button" type="button"
                            onClick={() => toggleVersion(entry.version)}
                            className="w-full flex items-center justify-between gap-4 p-2 -mx-2 hover:bg-white/2 border border-transparent hover:border-white/5 rounded-xl transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-neon-green" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                              )}
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-black uppercase tracking-wider transition-colors ${
                                  isExpanded ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                                }`}>
                                  {entry.title}
                                </h4>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono transition-colors ${
                                  isExpanded 
                                    ? 'bg-neon-green/10 text-neon-green/90 border border-neon-green/25' 
                                    : 'bg-white/5 text-zinc-500 border border-white/5 group-hover:text-zinc-400'
                                }`}>
                                  v{entry.version}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{entry.date}</span>
                          </button>

                          {/* Collapsible Details Content */}
                          <div className={`overflow-hidden transition-all duration-300 ${
                            isExpanded ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                          }`}>
                            <div className="bg-zinc-950/60 border border-white/3 rounded-2xl p-5 space-y-2 mt-1">
                              <ul className="space-y-2">
                                {entry.highlights?.map((change: string, idx: number) => (
                                  <li key={idx} className="flex gap-2.5 items-start text-[10px] text-zinc-400 font-medium leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green/50 mt-1.5 shrink-0" />
                                    <span>{change}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="relative z-10 px-8 py-5 border-t border-white/5 bg-zinc-950/60 flex items-center justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-neon-green shadow-[0_0_5px_#76b900] animate-pulse" />
            Active Node Node ID: {currentVersion}
          </span>
          <span className="text-[8px] font-bold text-zinc-600">Mission Control PLATFORM CORE</span>
        </div>
        
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 bg-zinc-900/90 border border-neon-green/30 text-white rounded-2xl shadow-[0_4px_30px_rgba(118,185,0,0.15)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="w-5 h-5 rounded-full bg-neon-green/10 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase ml-2 tracking-widest"
            >
              Dismiss
            </button>
          </div>
        )}
    </div>
  );
};
