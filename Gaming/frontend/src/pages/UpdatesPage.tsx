import React, { useEffect, useRef } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  History, 
  CheckCircle2, 
  AlertTriangle,
  Terminal,
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
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'up-to-date' | 'downloaded' | 'error' | 'not-supported';
    version?: string;
    date?: string;
    notes?: string;
    message?: string;
    percent?: number;
  }>({ status: 'idle' });

  useEffect(() => {
    setActiveTab(defaultTab);
    if (defaultTab === 'check') {
      sendCommand('check_updates');
      sendCommand('check_patches');
      window.electronAPI?.checkElectronUpdates?.();
    } else if (defaultTab === 'changelogs') {
      sendCommand('get_changelogs');
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

  const updateState = state?.update_state;
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
    if (updateState?.changelog) {
      const match = updateState.changelog.find((log: any) => log.version.replace(/^v/, '') === cleanTarget);
      if (match) return match;
    }
    if (changelogsData?.changelog) {
      const match = changelogsData.changelog.find((log: any) => log.version.replace(/^v/, '') === cleanTarget);
      if (match) return match;
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
              {!installState && nativeUpdate.status === 'downloaded' && (
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

                    <button aria-label="button" type="button"
                      onClick={() => window.electronAPI?.quitAndInstallElectronUpdate?.()}
                      className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-purple-500 to-neon-green hover:from-purple-400 hover:to-neon-green text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(118, 185, 0,0.3)] transition-all shrink-0 hover:scale-[1.02] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Restart & Relaunch
                    </button>
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

              {!installState && nativeUpdate.status === 'available' && (
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

              {!installState && nativeUpdate.status === 'downloading' && (
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
                </div>
              )}

              {/* Scenario 1: Checking for updates */}
              {(!updateState || updateState.status === 'checking') && (
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
              {updateState && (updateState.status === 'available' || updateState.status === 'up_to_date') && !installState && (
                <div className="space-y-6">
                  {/* Status header banner */}
                  {updateState.status === 'available' ? (
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-neon-green/5 border border-neon-green/20 rounded-2xl gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-neon-green/10 text-neon-green text-[8px] font-black tracking-widest uppercase">UPGRADE AVAILABLE</span>
                          <h4 className="text-xs font-black uppercase tracking-widest text-white">Upgrade Available</h4>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase leading-relaxed">
                          A new version (<span className="text-neon-green font-mono">v{updateState.latest_version}</span>) is available. Upgrade now to access the latest improvements.
                        </p>
                      </div>

                      <button aria-label="button" type="button"
                        onClick={() => sendCommand('install_update')}
                        className="flex items-center gap-2 px-6 py-3 bg-neon-green hover:bg-neon-green text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(118, 185, 0,0.3)] hover:shadow-[0_0_30px_rgba(118, 185, 0,0.5)] transition-all shrink-0 hover:scale-[1.02] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Upgrade Now
                      </button>
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
                        onClick={() => sendCommand('check_updates')}
                        className="flex items-center gap-1.5 px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                        Check Again
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

              {/* Scenario 4: Installing Update (Shell output logs) */}
              {installState && (
                <div className="space-y-6">
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
                    
                    <div className="text-center space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                        {installState.status === 'installing' && 'Rebuilding Kernel Nodes'}
                        {installState.status === 'success' && 'Rebuild Successful'}
                        {installState.status === 'failed' && 'Platform Compile Failed'}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {installState.status === 'installing' && 'Running automated Git Sync and dependency updates...'}
                        {installState.status === 'success' && 'Deploying nodes. Relaunching Python server...'}
                        {installState.status === 'failed' && 'An error occurred during build processes.'}
                      </p>
                    </div>
                  </div>

                  {/* Shell / Terminal log area */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                      Build Step Logs
                    </h5>
                    
                    <div className="bg-black/80 rounded-2xl p-6 border border-white/5 font-mono text-[9px] text-neon-green/80 min-h-35 max-h-55 overflow-y-auto custom-scrollbar space-y-2">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span>[SYSTEM]</span>
                        <span>Initializing build worker...</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-purple-400 shrink-0">[SHELL]</span>
                        <span className="text-white font-black">{installState.step}</span>
                      </div>
                      
                      {installState.status === 'failed' && (
                        <div className="flex gap-2 text-red-400 bg-red-500/5 border border-red-500/15 rounded px-2.5 py-1.5 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{installState.reason}</span>
                        </div>
                      )}

                      {installState.status === 'success' && (
                        <div className="text-neon-yellow font-bold animate-pulse mt-2">
                          [SUCCESS] Kernel rebuild completed. Automatically restarting the main thread...
                        </div>
                      )}

                      <div ref={logEndRef} />
                    </div>
                  </div>
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
                      return compareSemVer(entry.version, activeHighlightsVer) < 0;
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
        
    </div>
  );
};
