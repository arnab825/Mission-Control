import React, { useState, useEffect } from 'react';
import SidebarLeft from './components/SidebarLeft';
import Titlebar from './components/Titlebar';
import {
  SystemPage,
  SettingsPage,
  LabPage,
  DashboardPage,
  VisionPage,
  AgentPage,
  ReadinessPage
} from './pages';
import GamesPage from './pages/GamesPage';
import AuthPage from './pages/AuthPage';
import HUD from './components/HUD';
import { useBridge } from './hooks/useBridge';
import type { TelemetryState } from './types/telemetry';
import { UpdaterModal } from './components/UpdaterModal';
import { Sparkles, ChevronDown, ToggleRight, ToggleLeft, Menu, Gamepad2 } from 'lucide-react';
import { useAuth, useSignIn, useSignUp } from '@clerk/clerk-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

interface AppTelemetryState extends TelemetryState {
  scan_state?: {
    progress: number;
    status: string;
    is_running: boolean;
  };
}

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isIntelOpen, setIsIntelOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1280 : true);
  const [activePage, setActivePage] = useState('dashboard');
  const [isScanOverlayDismissed, setIsScanOverlayDismissed] = useState(false);
  const [visitedPages, setVisitedPages] = useState<Record<string, boolean>>({ dashboard: true });

  // Update visited pages tracking when active page changes
  useEffect(() => {
    setVisitedPages(prev => prev[activePage] ? prev : { ...prev, [activePage]: true });
  }, [activePage]);

  const lastLaunchTimeRef = React.useRef<number>(0);
  // If the user cancelled OAuth, pre-open the auth page so they can try again.
  const wasAuthCancelled = new URLSearchParams(window.location.search).get('auth_cancelled') === '1';
  const [gamesPageMode, setGamesPageMode] = useState<'library' | 'auth'>(wasAuthCancelled ? 'auth' : 'library');
  const [systemCategory, setSystemCategory] = useState('CPU');
  const [showHUD, setShowHUD] = useState(false);
  const { state, connected, sendCommand } = useBridge() as { state: AppTelemetryState | null; connected: boolean; sendCommand: (type: string, payload?: any) => void };
  const { isSignedIn, userId } = useAuth();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();

  const [isUpdaterOpen, setIsUpdaterOpen] = useState(false);
  const [updaterTab, setUpdaterTab] = useState<'check' | 'changelogs'>('check');
  const [isAgentic, setIsAgentic] = useState(false);
  const [personality, setPersonality] = useState('Tactical');

  // Strip the ?auth_cancelled param from the URL immediately so it doesn't
  // persist across refreshes or confuse any other logic.
  useEffect(() => {
    if (wasAuthCancelled) {
      // Navigate to games page showing the auth panel
      setActivePage('games');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify Electron of online/offline status changes (Roadmap Item 11)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onNetworkStatusChanged) {
      // Report initial network state on launch
      api.onNetworkStatusChanged(navigator.onLine);

      const handleOnline = () => api.onNetworkStatusChanged(true);
      const handleOffline = () => api.onNetworkStatusChanged(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Listen for the native Windows toast click signal.
  // When the user clicks the "Mission Control Update Available" toast,
  // main.ts sends 'open-updater-modal' via IPC which preload forwards here.
  // We open the UpdaterModal non-disruptively instead of a blocking popup.
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onOpenUpdaterModal) return;
    const cleanup = api.onOpenUpdaterModal(() => {
      setUpdaterTab('check');
      setIsUpdaterOpen(true);
    });
    return cleanup;
  }, []);

  const handleNavigate = (page: string, extra?: any) => {
    setActivePage(page);
    if (extra?.showAuth) {
      setGamesPageMode('auth');
    } else {
      setGamesPageMode('library');
    }
    if (extra?.category) {
      setSystemCategory(extra.category);
    }
  };

  // Check if this is a standalone HUD window
  const isHUDWindow = window.location.hash === '#hud';

  // Synchronize configuration changes to Electron for global hotkeys and mouse actions
  useEffect(() => {
    if (state?.config) {
      (window as any).electronAPI?.updateHUDConfig?.(state.config);
    }
  }, [state?.config]);

  // Listen for hotkey trigger from backend (fallback when game blocks Electron shortcuts)
  const lastHudToggleTriggerRef = React.useRef<number>(0);
  useEffect(() => {
    if (isHUDWindow) return;
    const trigger = (state as any)?.hud_toggle_trigger;
    if (trigger && trigger > lastHudToggleTriggerRef.current) {
      lastHudToggleTriggerRef.current = trigger;
      (window as any).electronAPI?.toggleHUD?.();
    }
  }, [state, isHUDWindow]);

  // Keep agentic state in sync with backend state
  useEffect(() => {
    if (state?.agent_intent !== undefined) {
      const active = state.agent_intent === 'autonomous';
      setIsAgentic(active);
    }
  }, [state?.agent_intent, isHUDWindow]);

  // Synchronize active personality from backend config
  useEffect(() => {
    const backendPersonality = state?.config?.ai_agent?.personality;
    if (backendPersonality) {
      const formatted = backendPersonality.charAt(0).toUpperCase() + backendPersonality.slice(1).toLowerCase();
      setPersonality(formatted);
    }
  }, [state?.config?.ai_agent?.personality]);

  // Handle automatic OAuth trigger for Switching Accounts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const triggerOauth = params.get('trigger_oauth');
    
    if (triggerOauth && (triggerOauth === 'oauth_google' || triggerOauth === 'oauth_discord') && !isSignedIn) {
      if (isSignInLoaded && isSignUpLoaded && signIn && signUp) {
        // Clear the query parameters from the URL first to avoid infinite redirect loops
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);

        // Store selected provider in localStorage
        localStorage.setItem('mission_control_active_provider', triggerOauth);

        const origin = window.location.origin;
        const options: any = {
          strategy: triggerOauth,
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/`,
        };
        if (triggerOauth === 'oauth_google') {
          options.additionalData = { prompt: 'select_account' };
          options.customOAuthOptions = { prompt: 'select_account' };
        }
        
        console.log(`[Clerk] Auto-triggering OAuth switch to: ${triggerOauth}`);
        signIn.authenticateWithRedirect(options).catch(err => {
          console.error('[Clerk] Auto OAuth trigger failed:', err);
        });
      }
    }
  }, [isSignedIn, isSignInLoaded, isSignUpLoaded, signIn, signUp, window.location.search]);

  // Listen for launch status updates to automatically navigate to the Library page (Games)
  useEffect(() => {
    if (state?.launch_status?.success) {
      const now = Date.now();
      if (now - lastLaunchTimeRef.current > 5000) { // 5s debounce
        lastLaunchTimeRef.current = now;
        setActivePage('games');
      }
    }
  }, [state?.launch_status]);

  // Auto-trigger library scan and auto-enable E2E encryption for authenticated users on first login
  useEffect(() => {
    if (!isHUDWindow && isSignedIn && userId && connected && state?.config) {
      const initKey = `has_initialized_v2_${userId}`;
      if (!localStorage.getItem(initKey)) {
        sendCommand('scan_games', { userId });

        // Auto-enable E2E encryption
        const updatedPrivacy = { ...state.config.privacy, enabled: true };
        sendCommand('update_config', { privacy: updatedPrivacy });

        localStorage.setItem(initKey, 'true');
      }
    }
  }, [isSignedIn, userId, connected, sendCommand, state?.config]);

  // Reset scan overlay dismissal when scanning finishes
  useEffect(() => {
    // Check game compatibility scanner execution status
    if (!state?.scan_state?.is_running) {
      setIsScanOverlayDismissed(false);
    }
  }, [state?.scan_state?.is_running]);

  // Synchronize game library cached games with the backend.
  // Fires when: (1) connected first time, (2) userId changes (login/logout), (3) isSignedIn resolves after async auth.
  // We include isSignedIn in the dep array specifically to handle the case where the component mounts
  // before Clerk has resolved auth — this ensures we re-request once auth state settles.
  const lastLibraryRequestRef = React.useRef<string>('');
  useEffect(() => {
    if (!connected || isHUDWindow) return;
    // Build a stable key so we don't spam the same request
    const reqKey = `${isSignedIn ? '1' : '0'}_${userId || 'guest'}`;
    if (lastLibraryRequestRef.current === reqKey) return;
    lastLibraryRequestRef.current = reqKey;
    sendCommand('get_cached_games', { userId: userId || undefined, forceRefresh: false });
  }, [userId, isSignedIn, connected, sendCommand, isHUDWindow]);

  // Synchronize game active focus shifts to Electron for automatic z-order assertion & HUD auto-spawn
  useEffect(() => {
    if (!isHUDWindow && state) {
      const isActive = state.is_game_active === true;
      const isFocused = state.is_game_focused === true;
      const gameTitle = state.current_game || 'Scanned Game';
      const gamePid = (state as any)?.game_info?.pid || undefined;
      (window as any).electronAPI?.onGameFocusChanged?.(isActive, isFocused, gameTitle, gamePid);
    }
  }, [state?.is_game_active, state?.is_game_focused, state?.current_game, (state as any)?.game_info?.pid, isHUDWindow]);

  // Listen for standalone HUD window visibility updates to sync Titlebar HUD status
  const [isHUDVisibleState, setIsHUDVisibleState] = useState(true);
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onHUDStatus) {
      return api.onHUDStatus((isVisible: boolean) => {
        setIsHUDVisibleState(isVisible);
        setShowHUD(isVisible);
      });
    }
  }, []);

  // Listen for standalone HUD window movement to save custom coordinates dynamically
  useEffect(() => {
    const handleHUDMoved = (coords: { x: number; y: number }) => {
      if (state?.config) {
        const updatedOverlay = {
          ...state.config.overlay,
          x: coords.x,
          y: coords.y
        };
        sendCommand('update_config', { overlay: updatedOverlay });
      }
    };

    const api = (window as any).electronAPI;
    if (api?.onHUDMoved) {
      return api.onHUDMoved(handleHUDMoved);
    }
  }, [state?.config, sendCommand]);

  if (isHUDWindow) {
    if (!isHUDVisibleState) {
      return <div className="w-screen h-screen bg-transparent" />;
    }
    const layout = state?.config?.overlay?.layout || 'top-left';
    const alignClass = layout.includes('right') ? 'justify-end' : 'justify-start';
    const valignClass = layout.includes('bottom') ? 'items-end' : 'items-start';
    return (
      <div className={`w-screen h-screen bg-transparent overflow-hidden select-none font-['Inter',system-ui,sans-serif] flex ${alignClass} ${valignClass}`}>
        <HUD state={state} sendCommand={sendCommand} />
      </div>
    );
  }



  const toggleAgentic = () => {
    const next = !isAgentic;
    setIsAgentic(next);
    sendCommand('toggle_agent_mode', { active: next });
  };


  const handlePersonalityChange = (val: string) => {
    setPersonality(val);
    sendCommand('set_personality', { personality: val.toLowerCase() });
  };



  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-500/30 selection:text-zinc-200 overflow-hidden font-['Inter',system-ui,sans-serif] relative">
        {/* Native App Titlebar (Electron) */}
        <Titlebar showHUD={showHUD} onToggleHUD={() => (window as any).electronAPI?.toggleHUD?.()} />

        {/* Main App Container (adjusted for Titlebar height pt-10) */}
        <div className="flex w-full h-[calc(100vh-2.5rem)] mt-10">

          {/* COLUMN 1: Sidebar Left */}
          <SidebarLeft
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            activePage={activePage}
            onNavigate={handleNavigate}
            state={state}
            onTriggerUpdateCheck={() => {
              setUpdaterTab('check');
              setIsUpdaterOpen(true);
            }}
            onTriggerChangelogs={() => {
              setUpdaterTab('changelogs');
              setIsUpdaterOpen(true);
            }}
          />

          {/* HUD is now loaded in a dedicated transparent overlay window */}

          {/* COLUMN 2 & 3 CONTAINER */}
          <main className="flex-1 flex flex-col lg:flex-row relative overflow-hidden bg-zinc-950 lg:border-l border-white/5">

            {/* CENTER CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col relative overflow-hidden min-w-0">
              {/* Header / Top Bar */}
              <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-[#0a0a0f] z-55">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Toggle */}
                  <button aria-label="button" type="button" onClick={() => setIsSidebarOpen(true)} className="p-1.5 hover:bg-white/5 rounded-lg lg:hidden text-zinc-400">
                    <Menu className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/5 rounded flex items-center justify-center border border-white/10 overflow-hidden p-0.5">
                      <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
                    </div>
                    <h1 className="text-xs font-black tracking-tighter text-white uppercase">Mission Control</h1>
                  </div>
                </div>

                {/* Agent Controls & Sync */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden md:flex items-center gap-2 pr-3 border-r border-white/5">
                    {/* Personality Dropdown */}
                    <div className="relative group">
                      <button aria-label="button" type="button" className="h-7 px-2.5 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1.5 hover:bg-white/8 hover:border-white/20 transition-all shadow-sm">
                        <Sparkles className="w-3 h-3 text-neon-green" />
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{personality}</span>
                        <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:rotate-180 transition-transform duration-200" />
                      </button>
                      <div className="absolute top-full right-0 mt-1.5 w-36 bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-100 p-1 flex flex-col gap-0.5">
                        {['Tactical', 'Friendly', 'Immersive', 'Sarcastic', 'Aggressive'].map((p) => (
                          <button aria-label="button" type="button"
                            key={p}
                            onClick={() => handlePersonalityChange(p)}
                            className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${personality === p
                              ? 'text-neon-green bg-neon-green/10 shadow-[inset_0_0_8px_rgba(118, 185, 0,0.05)] border border-neon-green/15'
                              : 'text-zinc-400 hover:text-neon-green hover:bg-white/5 border border-transparent'
                              }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Agent Toggle */}
                    <button aria-label="button" type="button"
                      onClick={toggleAgentic}
                      className={`h-7 px-2 border rounded flex items-center gap-1.5 transition-all ${isAgentic
                        ? 'bg-neon-green/10 border-neon-green/25 text-neon-green glow-green'
                        : 'bg-white/4 border-white/6 text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      <span className="text-[8px] font-bold uppercase tracking-wider">Agent</span>
                      {isAgentic ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    </button>
                  </div>



                  {/* Connection Status */}
                  <div className={`px-2 py-1 rounded border ${connected ? 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow' : 'bg-red-500/10 border-red-500/20 text-red-500'} text-[7px] font-black uppercase tracking-[0.2em]`}>
                    {connected ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-neon-green shadow-[0_0_5px_#76b900] animate-pulse" />
                        <span>Sync</span>
                      </span>
                    ) : 'Off'}
                  </div>
                </div>
              </header>

              {/* Dynamic Page Rendering (Lazy-loaded / Keep-alive toggling) */}
              <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
                {visitedPages['dashboard'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'dashboard' ? '' : 'hidden'}`}>
                    <DashboardPage state={activePage === 'dashboard' ? state : null} onCommand={sendCommand} onNavigate={handleNavigate} />
                  </div>
                )}
                {visitedPages['vision'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'vision' ? '' : 'hidden'}`}>
                    <VisionPage state={activePage === 'vision' ? state : null} sendCommand={sendCommand} />
                  </div>
                )}
                {visitedPages['system'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'system' ? '' : 'hidden'}`}>
                    <SystemPage
                      state={activePage === 'system' ? state : null}
                      selectedCategory={systemCategory}
                      setSelectedCategory={setSystemCategory}
                      sendCommand={sendCommand}
                    />
                  </div>
                )}
                {visitedPages['games'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'games' ? '' : 'hidden'}`}>
                    <GamesPage
                      state={activePage === 'games' ? state : null}
                      sendCommand={sendCommand}
                      mode={gamesPageMode}
                      setMode={setGamesPageMode}
                    />
                  </div>
                )}
                {visitedPages['settings'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'settings' ? '' : 'hidden'}`}>
                    <SettingsPage state={activePage === 'settings' ? state : null} sendCommand={sendCommand} />
                  </div>
                )}
                {visitedPages['lab'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'lab' ? '' : 'hidden'}`}>
                    <LabPage state={activePage === 'lab' ? state : null} sendCommand={sendCommand} />
                  </div>
                )}
                {visitedPages['readiness'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'readiness' ? '' : 'hidden'}`}>
                    <ReadinessPage state={activePage === 'readiness' ? state : null} connected={connected} sendCommand={sendCommand} />
                  </div>
                )}
                {visitedPages['agent'] && (
                  <div className={`flex-1 flex flex-col relative ${activePage === 'agent' ? '' : 'hidden'}`}>
                    {!isSignedIn && gamesPageMode === 'auth' ? (
                      <AuthPage onBackToLibrary={() => setGamesPageMode('library')} />
                    ) : (
                      <AgentPage
                        state={activePage === 'agent' ? state : null}
                        onCommand={sendCommand}
                        isAgentic={isAgentic}
                        connected={connected}
                        isIntelOpen={isIntelOpen}
                        setIsIntelOpen={setIsIntelOpen}
                      />
                    )}
                  </div>
                )}
              </div>

            </div>

          </main>
        </div>


        {/* Platform Updater Modal Dialog */}
        <UpdaterModal
          isOpen={isUpdaterOpen}
          onClose={() => setIsUpdaterOpen(false)}
          state={state}
          onSendCommand={sendCommand}
          defaultTab={updaterTab}
        />

        {/* Global Scanning Overlay */}
        <AnimatePresence>
          {state?.scan_state?.is_running && !isScanOverlayDismissed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: 9999 }}
              className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-2xl select-none"
            >
              {/* Radar scanner graphics */}
              <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                {/* Outer spinning glow ring */}
                <div className="absolute inset-0 rounded-full border border-neon-green/10 animate-pulse" />
                <div className="absolute inset-4 rounded-full border border-dashed border-neon-green/20 animate-spin [animation-duration:15s]" />

                {/* Rotating scanner sweep line */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-neon-green/20 via-transparent to-transparent animate-spin [animation-duration:3s]" />

                {/* Central glowing icon */}
                <div className="relative w-24 h-24 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center shadow-[0_0_30px_rgba(118, 185, 0,0.2)]">
                  <Gamepad2 className="w-10 h-10 text-neon-green animate-pulse" />
                </div>
              </div>

              {/* Title & Info */}
              <div className="text-center space-y-3 max-w-md px-6">
                <h3 className="text-sm font-black tracking-[0.3em] text-white uppercase">
                  System Scan In Progress
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                  Analyzing local drives and game registries for compatibility
                </p>

                {/* Progress bar */}
                <div className="space-y-2 py-4">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-neon-green">
                    <span>{state?.scan_state?.status || 'Scanning...'}</span>
                    <span>{state?.scan_state?.progress || 0}%</span>
                  </div>
                  <div className="w-80 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                    <motion.div
                      className="h-full bg-gradient-to-r from-neon-green via-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(118, 185, 0,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${state?.scan_state?.progress || 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Console Log Simulation */}
                <div className="h-16 w-80 bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-[8px] text-zinc-500 text-left overflow-hidden flex flex-col justify-end gap-1.5 shadow-inner">
                  <div className="opacity-40">Connecting to mission control database...</div>
                  <div className="opacity-70">Detecting NVIDIA RTX processing pipelines...</div>
                  <div className="text-neon-green animate-pulse font-bold">
                    &gt; {state?.scan_state?.status || 'Analyzing manifest files...'}
                  </div>
                </div>

                {/* Run in background button */}
                <button
                  aria-label="button"
                  type="button"
                  onClick={() => setIsScanOverlayDismissed(true)}
                  className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                >
                  Run in Background
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};

export default App;
