import React, { useState, useEffect, Suspense } from 'react';
import SidebarLeft from './components/SidebarLeft';
import Titlebar from './components/Titlebar';
import DashboardPage from './pages/DashboardPage';

// Route-level Code Splitting: Lazy-load non-initial pages to minimize initial bundle size and speed up cold boot
const SystemPage = React.lazy(() => import('./pages/SystemPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const LabPage = React.lazy(() => import('./pages/LabPage'));
const VisionPage = React.lazy(() => import('./pages/VisionPage'));
const AgentPage = React.lazy(() => import('./pages/AgentPage'));
const ReadinessPage = React.lazy(() => import('./pages/ReadinessPage'));
const GamesPage = React.lazy(() => import('./pages/GamesPage'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const UpdatesPage = React.lazy(() => import('./pages/UpdatesPage').then(m => ({ default: m.UpdatesPage })));

// Sleek, zero-layout-shift loading skeleton for asynchronous page transitions
const PageSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col p-6 gap-6 animate-pulse">
    <div className="h-10 w-56 bg-white/5 rounded-2xl border border-white/5" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="h-28 bg-white/3 rounded-2xl border border-white/5" />
      <div className="h-28 bg-white/3 rounded-2xl border border-white/5" />
      <div className="h-28 bg-white/3 rounded-2xl border border-white/5" />
      <div className="h-28 bg-white/3 rounded-2xl border border-white/5" />
    </div>
    <div className="flex-1 bg-white/2 rounded-2xl border border-white/5 min-h-[300px]" />
  </div>
);
import HUD from './components/HUD';
import { useBridge } from './hooks/useBridge';
import type { TelemetryState } from './types/telemetry';
import { ThemeQuickMenu } from './components/ThemeQuickMenu';
import { useTheme } from './context/ThemeContext';
import type { CategoryId } from './pages/SettingsPage';
import { Sparkles, ChevronDown, ToggleRight, ToggleLeft, Menu, AlertTriangle, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth, useSignIn, useSignUp, useClerk, useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

interface AppTelemetryState extends TelemetryState {
  scan_state?: {
    progress: number;
    status: string;
    is_running: boolean;
  };
  navigate_to?: string;
  trigger_action?: string;
}

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isIntelOpen, setIsIntelOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1280 : true);
  const [activePage, setActivePage] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('mc_restore_page');
        if (saved) {
          sessionStorage.removeItem('mc_restore_page');
          return saved;
        }
      } catch (_) {}
    }
    return 'dashboard';
  });
  const [isScanOverlayDismissed, setIsScanOverlayDismissed] = useState(false);
  const [visitedPages, setVisitedPages] = useState<Record<string, boolean>>({ dashboard: true });

  // Update visited pages tracking when active page changes
  useEffect(() => {
    setVisitedPages(prev => prev[activePage] ? prev : { ...prev, [activePage]: true });
  }, [activePage]);

  const lastLaunchTimeRef = React.useRef<number>(0);
  // If the user cancelled OAuth or explicitly requested account switching/auth, open auth page.
  const wasAuthCancelled = new URLSearchParams(window.location.search).get('auth_cancelled') === '1';
  const showAuthParam = new URLSearchParams(window.location.search).get('show_auth') === '1';
  const [gamesPageMode, setGamesPageMode] = useState<'library' | 'auth'>(
    (wasAuthCancelled || showAuthParam) ? 'auth' : 'library'
  );
  const [systemCategory, setSystemCategory] = useState('CPU');
  const [settingsCategory, setSettingsCategory] = useState<CategoryId | undefined>(undefined);
  const [showHUD, setShowHUD] = useState(false);
  const { state, connected, sendCommand } = useBridge() as { state: AppTelemetryState | null; connected: boolean; sendCommand: (type: string, payload?: any) => void };
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();

  const [updaterTab, setUpdaterTab] = useState<'check' | 'rollback' | 'changelogs'>('check');
  const [isAgentic, setIsAgentic] = useState(false);
  const [personality, setPersonality] = useState('Tactical');
  const [globalToast, setGlobalToast] = useState<{message: string; type?: 'info'|'warning'} | null>(null);
  const { preferences, activeGameTheme, triggerGameAdaptiveCheck, triggerPersonalitySync } = useTheme();

  useEffect(() => {
    triggerGameAdaptiveCheck(state?.current_game);
  }, [state?.current_game, triggerGameAdaptiveCheck]);

  const isAuthPopup =
    Boolean((window as any).electronAPI?.isAuthPopup) ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth_popup') === '1');
  const isBrowserAuth =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('browser_auth') === '1' ||
      new URLSearchParams(window.location.search).get('auth_mode') === 'browser' ||
      new URLSearchParams(window.location.search).get('auth_completed') === '1' ||
      !(window as any).electronAPI);
  const isAuthCompleted = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth_completed') === '1';
  const [authPopupError, setAuthPopupError] = useState<string | null>(null);
  const [authPopupRetryCount, setAuthPopupRetryCount] = useState<number>(0);
  const [failsafeCountdown, setFailsafeCountdown] = useState<number | null>(null);
  const [browserAuthLoading, setBrowserAuthLoading] = useState<'oauth_google' | 'oauth_discord' | null>(null);
  const [browserAuthError, setBrowserAuthError] = useState<string | null>(null);

  // Strip ?auth_cancelled and ?show_auth params from the URL immediately so they don't
  // persist across refreshes or confuse any other logic.
  useEffect(() => {
    // Purge any rogue exit bar elements that might have leaked into the DOM
    try {
      const rogue = document.getElementById('mc-auth-exit-bar');
      if (rogue) rogue.remove();
    } catch (_) {}

    if (wasAuthCancelled || showAuthParam) {
      // Navigate to games page showing the auth panel
      setActivePage('games');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle auth popup completion inside popup window:
  // Extract and transfer full authentication state (session, token, storage, cookies)
  // to the main window via notifyAuthSuccess so the desktop app can immediately log in.
  useEffect(() => {
    if (isAuthCompleted || (isAuthPopup && isSignedIn && user)) {
      const finishAuthPopup = async () => {
        try {
          const activeSession = clerk.session || clerk.client?.sessions?.[0] || (clerk.client as any)?.signedInSessions?.[0];
          const sessId = activeSession?.id || clerk.client?.lastActiveSessionId || '';
          if (activeSession && !clerk.session && clerk.setActive) {
            try {
              await clerk.setActive({ session: activeSession.id });
            } catch (_) {}
          }
          const token = await (activeSession?.getToken?.() || clerk.session?.getToken?.());
          const currentUser = user || activeSession?.user || clerk.user;
          const payload = {
            sessionId: sessId,
            token,
            userId: currentUser?.id,
            userEmail: currentUser?.primaryEmailAddress?.emailAddress || (currentUser as any)?.emailAddresses?.[0]?.emailAddress,
            username: currentUser?.username || (currentUser as any)?.firstName || '',
            firstName: (currentUser as any)?.firstName || '',
            lastName: (currentUser as any)?.lastName || '',
            fullName: (currentUser as any)?.fullName || (`${(currentUser as any)?.firstName || ''} ${(currentUser as any)?.lastName || ''}`.trim()) || '',
            imageUrl: (currentUser as any)?.imageUrl || '',
            externalAccounts: (currentUser as any)?.externalAccounts || [],
            storage: { ...window.localStorage },
            cookies: document.cookie,
          };
          if (window.electronAPI?.notifyAuthSuccess) {
            window.electronAPI.notifyAuthSuccess(payload);
          }
        } catch (_) {
          window.electronAPI?.notifyAuthSuccess?.();
        }
        if (window.electronAPI?.closeAuthPopup) {
          window.electronAPI.closeAuthPopup();
        }
        try {
          window.close();
        } catch (_) {}
      };
      finishAuthPopup();
      return;
    }

    if (!isAuthPopup) return;

    // WAIT until Clerk authentication hooks have completely loaded before determining auth state
    if (!clerk.loaded || !isAuthLoaded || !isUserLoaded || !isSignInLoaded || !isSignUpLoaded) {
      return;
    }

    let isMounted = true;
    const params = new URLSearchParams(window.location.search);
    const strategy = (params.get('strategy') || 'oauth_google') as 'oauth_google' | 'oauth_discord';
    const mode = params.get('mode') || 'login';
    const origin = window.location.origin;

    // Safety timeout: if after 8 seconds redirect hasn't happened, trigger browser failsafe
    const timeoutTimer = setTimeout(() => {
      if (isMounted) {
        setAuthPopupError('In-app authentication is taking longer than expected or was blocked.');
        setFailsafeCountdown(4);
      }
    }, 8000);

    const initiateAuth = async () => {
      try {
        setAuthPopupError(null);

        // Case 1: Only if explicitly in 'link' mode, attempt to link provider to current user
        if (mode === 'link' && isSignedIn && user) {
          console.log(`[AuthPopup] Linking ${strategy} to current user ${user.id}...`);
          const options: any = {
            strategy,
            redirectUrl: `${origin}/sso-callback?popup=1`,
          };
          if (strategy === 'oauth_google') {
            options.additionalData = { prompt: 'select_account' };
          } else if (strategy === 'oauth_discord') {
            options.additionalData = { prompt: 'consent' };
          }
          const ext = await user.createExternalAccount(options);
          const verification = (ext as any)?.verification;
          const redirectUrl =
            verification?.externalVerificationRedirectURL?.toString() ||
            verification?.externalVerificationRedirectUrl?.toString();
          if (redirectUrl) {
            window.location.href = redirectUrl;
            return;
          } else {
            throw new Error('OAuth verification URL was not returned by provider.');
          }
        }

        // Case 2: Standard Login, Switch, or Sign-up OAuth redirect
        const options: any = {
          strategy,
          redirectUrl: `${origin}/sso-callback?popup=1`,
          redirectUrlComplete: `${origin}/?auth_completed=1`,
        };

        console.log(`[AuthPopup] Triggering ${mode} OAuth redirect for ${strategy}...`);
        try {
          if (mode === 'signup' && signUp) {
            await signUp.authenticateWithRedirect(options);
          } else if (signIn) {
            await signIn.authenticateWithRedirect(options);
          } else if (clerk.client?.signIn) {
            await clerk.client.signIn.authenticateWithRedirect(options);
          } else {
            throw new Error('Authentication client unavailable. Please retry.');
          }
        } catch (authErr: any) {
          console.warn('[AuthPopup] Initial auth redirect failed, retrying after signOut:', authErr);
          try {
            await clerk.signOut();
          } catch (_) {}
          if (signIn) {
            await signIn.authenticateWithRedirect(options);
          } else if (clerk.client?.signIn) {
            await clerk.client.signIn.authenticateWithRedirect(options);
          } else {
            throw authErr;
          }
        }
      } catch (err: any) {
        console.error('[AuthPopup] Handshake error:', err);
        if (isMounted) {
          setAuthPopupError(err?.errors?.[0]?.longMessage || err?.message || 'Authentication handshake encountered an issue.');
          setFailsafeCountdown(3);
        }
      }
    };

    initiateAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
    };
  }, [
    isAuthPopup,
    isAuthCompleted,
    isAuthLoaded,
    isUserLoaded,
    isSignInLoaded,
    isSignUpLoaded,
    signIn,
    signUp,
    isSignedIn,
    user,
    clerk.loaded,
    authPopupRetryCount
  ]);

  // Auto-redirect to browser-based auth failsafe when countdown expires
  useEffect(() => {
    if (failsafeCountdown === null) return;
    if (failsafeCountdown <= 0) {
      if (isAuthPopup && window.electronAPI?.openBrowserAuth) {
        const params = new URLSearchParams(window.location.search);
        const strategy = (params.get('strategy') || 'oauth_google') as any;
        const mode = (params.get('mode') || 'login') as any;
        window.electronAPI.openBrowserAuth({
          strategy,
          mode,
          reason: 'popup_stalled_auto_redirect',
        });
      }
      return;
    }
    const t = setTimeout(() => setFailsafeCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [failsafeCountdown, isAuthPopup]);

  const handleBrowserOAuth = async (strategy: 'oauth_google' | 'oauth_discord') => {
    setBrowserAuthLoading(strategy);
    setBrowserAuthError(null);
    try {
      const origin = window.location.origin;
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode') || 'login';

      // If linking secondary provider to existing signed-in user
      if (mode === 'link' && user) {
        try {
          const ext = await user.createExternalAccount({
            strategy,
            redirectUrl: `${origin}/sso-callback`,
          });
          const verification = (ext as any)?.verification;
          const redirectUrl =
            verification?.externalVerificationRedirectURL?.toString() ||
            verification?.externalVerificationRedirectUrl?.toString();
          if (redirectUrl) {
            window.location.href = redirectUrl;
            return;
          }
        } catch (linkErr: any) {
          console.error('[BrowserAuth] External account link failed:', linkErr);
          throw linkErr;
        }
      }

      // CRITICAL: redirectUrl must be clean (${origin}/sso-callback) with NO dynamic query parameters.
      // Dynamic query parameters in redirectUrl cause OAuth provider redirect_uri_mismatch errors.
      // Dynamic parameters belong in redirectUrlComplete, where Clerk navigates after success.
      const options = {
        strategy,
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}/?browser_auth=1&auth_completed=1`,
      };

      if (mode === 'signup' && signUp) {
        await signUp.authenticateWithRedirect(options);
      } else if (signIn) {
        try {
          await signIn.authenticateWithRedirect(options);
        } catch (signInErr: any) {
          console.warn('[BrowserAuth] signIn redirect failed, trying signOut retry or signUp:', signInErr);
          try {
            await clerk.signOut();
          } catch (_) {}
          if (signUp) {
            await signUp.authenticateWithRedirect(options);
          } else if (signIn) {
            await signIn.authenticateWithRedirect(options);
          } else {
            throw signInErr;
          }
        }
      } else if (signUp) {
        await signUp.authenticateWithRedirect(options);
      } else if (clerk.client?.signIn) {
        await clerk.client.signIn.authenticateWithRedirect(options);
      } else {
        throw new Error('Authentication client initializing. Please try again.');
      }
    } catch (err: any) {
      console.error('[BrowserAuth] OAuth initiation error:', err);
      setBrowserAuthLoading(null);
      setBrowserAuthError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Failed to connect to authentication provider. Please try again.'
      );
    }
  };

  // Auto-initiate OAuth redirect when landing on browser auth portal with specified strategy.
  useEffect(() => {
    if (!isBrowserAuth || !clerk.loaded) return;
    const params = new URLSearchParams(window.location.search);
    const strategy = params.get('strategy') as 'oauth_google' | 'oauth_discord' | null;
    const mode = params.get('mode') || 'login';
    const isAuthCompleted = params.get('auth_completed') === '1';
    if (!strategy || isAuthCompleted) return;

    // Check if the currently signed in user matches the requested strategy
    if (isSignedIn && user) {
      if (mode === 'link') {
        const initiateLink = async () => {
          try {
            setBrowserAuthLoading(strategy);
            const ext = await user.createExternalAccount({
              strategy,
              redirectUrl: `${window.location.origin}/sso-callback`,
            });
            const verification = (ext as any)?.verification;
            const redirectUrl =
              verification?.externalVerificationRedirectURL?.toString() ||
              verification?.externalVerificationRedirectUrl?.toString();
            if (redirectUrl) {
              window.location.href = redirectUrl;
            }
          } catch (err: any) {
            console.error('[BrowserAuth] Failed to link external account:', err);
            setBrowserAuthError(err?.errors?.[0]?.longMessage || err?.message || 'Failed to link account.');
            setBrowserAuthLoading(null);
          }
        };
        const t = setTimeout(initiateLink, 350);
        return () => clearTimeout(t);
      }

      const activeProvider = localStorage.getItem('mission_control_active_provider') || '';
      const providerKey = strategy.replace('oauth_', '');
      const hasGoogleExt = user.externalAccounts?.some((a) => (a.provider || '').replace('oauth_', '') === 'google');
      const hasDiscordExt = user.externalAccounts?.some((a) => (a.provider || '').replace('oauth_', '') === 'discord');

      const isAlreadyOnThisStrategy =
        (providerKey === 'google' && activeProvider.includes('google') && hasGoogleExt) ||
        (providerKey === 'discord' && activeProvider.includes('discord') && hasDiscordExt);

      if (isAlreadyOnThisStrategy && mode !== 'switch') {
        // Already on this provider, let syncToDesktop handle it
        return;
      }

      // If user requested a DIFFERENT provider (e.g. was on Google, clicked Discord) or mode === 'switch':
      // We must sign out first so the new provider OAuth flow can start cleanly
      const initiateSwitch = async () => {
        try {
          await clerk.signOut();
        } catch (_) {}
        handleBrowserOAuth(strategy);
      };
      const t = setTimeout(initiateSwitch, 350);
      return () => clearTimeout(t);
    }

    if (!isSignInLoaded && !isSignUpLoaded) return;
    const t = setTimeout(() => {
      handleBrowserOAuth(strategy);
    }, 350);
    return () => clearTimeout(t);
  }, [isBrowserAuth, isSignedIn, user, clerk.loaded, isSignInLoaded, isSignUpLoaded]);

  // Synchronize browser authentication session to desktop application.
  //
  // CRITICAL: The POST to the local Electron server MUST complete before the deep-link
  // navigation fires. Previously the POSTs were fire-and-forget and the deep link fired
  // immediately — Electron received the deep link before it had any session data, so
  // clerk.client.reload() saw an empty session → app stayed Offline.
  //
  // Fix: await the POST inside syncToDesktop(), then fire the deep link from within that
  // same async function so the order is guaranteed:
  //   1. getToken()
  //   2. POST with full payload (cookies + localStorage + sessionId + JWT)
  //   3. navigate mission-control:// deep link (Electron now has the data)
  useEffect(() => {
    if (!isBrowserAuth || !isSignedIn || !user) return;

    const syncToDesktop = async () => {
      try {
        let client = clerk.client;
        try {
          if (clerk.client?.reload) {
            client = await clerk.client.reload();
          }
        } catch (_) {}

        const activeSession =
          clerk.session ||
          client?.sessions?.[0] ||
          (client as any)?.signedInSessions?.[0];

        const sessId = activeSession?.id || client?.lastActiveSessionId || '';
        if (activeSession && !clerk.session && clerk.setActive) {
          try {
            await clerk.setActive({ session: activeSession.id });
          } catch (_) {}
        }
        const token = await (activeSession?.getToken?.() || clerk.session?.getToken?.());
        const currentUser: any = user || clerk.user || activeSession?.user || (client as any)?.users?.[0] || client?.sessions?.[0]?.user;

        const email =
          currentUser?.primaryEmailAddress?.emailAddress ||
          currentUser?.emailAddresses?.[0]?.emailAddress ||
          currentUser?.email_addresses?.[0]?.email_address ||
          currentUser?.primary_email_address?.email_address ||
          currentUser?.email ||
          currentUser?.emailAddress ||
          '';

        const username =
          currentUser?.username ||
          currentUser?.user_name ||
          currentUser?.name ||
          (email ? email.split('@')[0] : 'Guest');

        const firstName =
          currentUser?.firstName ||
          currentUser?.first_name ||
          (username ? username.split(' ')[0] : 'Guest');

        const lastName =
          currentUser?.lastName ||
          currentUser?.last_name ||
          '';

        const imageUrl =
          currentUser?.imageUrl ||
          currentUser?.image_url ||
          currentUser?.profileImageUrl ||
          currentUser?.profile_image_url ||
          currentUser?.avatarUrl ||
          '';

        const userId =
          currentUser?.id ||
          currentUser?.userId ||
          currentUser?.user_id ||
          '';

        const externalAccounts =
          currentUser?.externalAccounts ||
          currentUser?.external_accounts ||
          [];

        const urlStrategy = new URLSearchParams(window.location.search).get('strategy');
        const storedProvider = localStorage.getItem('mission_control_active_provider');
        const candidateProvider = (urlStrategy || storedProvider || '').toLowerCase();
        const activeProvider = candidateProvider.includes('google')
          ? 'oauth_google'
          : (candidateProvider.includes('discord')
              ? 'oauth_discord'
              : (externalAccounts?.some((a: any) => (a.provider || '').includes('google')) ? 'oauth_google' : 'oauth_discord'));

        const payload = {
          sessionId: sessId,
          token,
          userId,
          userEmail: email,
          username,
          firstName,
          lastName,
          imageUrl,
          provider: activeProvider,
          externalAccounts,
          storage: { ...window.localStorage },
          cookies: document.cookie,
        };

        // Try multiple local endpoints so the POST reaches Electron's server on port 43221
        const endpoints = [
          'http://127.0.0.1:43221/api/browser-auth/complete',
          'http://localhost:43221/api/browser-auth/complete',
          '/api/browser-auth/complete',
        ];

        for (const ep of endpoints) {
          try {
            await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            break;
          } catch (_) {}
        }

        // Now navigate via the deep link with full profile payload
        try {
          const fullName = `${firstName} ${lastName}`.trim() || username;
          const deepLinkUrl = `mission-control://auth-completed?session_id=${encodeURIComponent(sessId)}&user_id=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&name=${encodeURIComponent(fullName)}&image_url=${encodeURIComponent(imageUrl)}&provider=${encodeURIComponent(activeProvider)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
          window.location.href = deepLinkUrl;
        } catch (_) {}
      } catch (_) {}
    };

    syncToDesktop();
  }, [isBrowserAuth, isSignedIn, user, clerk]);

  // Listen for browser auth started signal to update UI toast
  useEffect(() => {
    if (window.electronAPI?.onBrowserAuthStarted) {
      return window.electronAPI.onBrowserAuthStarted(() => {
        setGlobalToast({
          message: 'Browser authentication failsafe active. Complete login in your browser...',
        });
      });
    }
  }, []);

  // Listen for auth cleared event from Electron main process
  useEffect(() => {
    if (window.electronAPI?.onAuthCleared) {
      return window.electronAPI.onAuthCleared(() => {
        try {
          localStorage.removeItem('mc_authenticated_user');
          localStorage.removeItem('mission_control_active_provider');
          document.cookie = '__session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = '__client_uat=0; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          window.dispatchEvent(new Event('mc-auth-state-changed'));
        } catch (_) {}
      });
    }
  }, []);

  // Listen for auth completion from popup or browser in the main window
  useEffect(() => {
    if (window.electronAPI?.onAuthCompleted) {
      const unsub = window.electronAPI.onAuthCompleted(async (payload?: any) => {
        setGamesPageMode('library');
        setGlobalToast({ message: 'Authentication successful! Synchronizing session...' });

        // Immediately persist cached user information for instant offline/online UI responsiveness
        try {
          if (payload?.userEmail || payload?.userId || payload?.sessionId) {
            const rawPayloadProvider = (payload.provider || localStorage.getItem('mission_control_active_provider') || '').toLowerCase();
            const provider = rawPayloadProvider.includes('google')
              ? 'oauth_google'
              : (rawPayloadProvider.includes('discord')
                  ? 'oauth_discord'
                  : (payload.externalAccounts?.some((a: any) => (a.provider || '').includes('google')) ? 'oauth_google' : 'oauth_discord'));
            const isDisc = provider.includes('discord');
            let cleanAvatar = payload.imageUrl || '';
            if (isDisc && (cleanAvatar.includes('googleusercontent.com') || cleanAvatar.includes('accounts.google.com'))) {
              cleanAvatar = '';
            } else if (!isDisc && (cleanAvatar.includes('discordapp.com') || cleanAvatar.includes('discord.com'))) {
              cleanAvatar = '';
            }
            if (payload.externalAccounts?.length) {
              const ext = payload.externalAccounts.find((a: any) =>
                (a.provider || '').toLowerCase().includes(isDisc ? 'discord' : 'google')
              );
              if (isDisc) {
                const discUrl = ext?.avatarUrl || (ext?.imageUrl && !ext.imageUrl.includes('googleusercontent.com') ? ext.imageUrl : '');
                if (discUrl && !discUrl.includes('googleusercontent.com')) {
                  cleanAvatar = discUrl;
                }
              } else {
                const googUrl = ext?.imageUrl || ext?.avatarUrl || '';
                if (googUrl && !googUrl.includes('discord')) {
                  cleanAvatar = googUrl;
                }
              }
            }
            if (isDisc && !cleanAvatar) {
              const cachedDisc = typeof window !== 'undefined' ? localStorage.getItem('mc_discord_avatar') : null;
              if (cachedDisc && !cachedDisc.includes('googleusercontent.com')) cleanAvatar = cachedDisc;
            } else if (!isDisc && !cleanAvatar) {
              const cachedGoog = typeof window !== 'undefined' ? localStorage.getItem('mc_google_avatar') : null;
              if (cachedGoog && !cachedGoog.includes('discord')) cleanAvatar = cachedGoog;
            }
            if (isDisc && cleanAvatar && !cleanAvatar.includes('googleusercontent.com')) {
              try { localStorage.setItem('mc_discord_avatar', cleanAvatar); } catch (_) {}
            } else if (!isDisc && cleanAvatar && !cleanAvatar.includes('discord')) {
              try { localStorage.setItem('mc_google_avatar', cleanAvatar); } catch (_) {}
            }

            const cached = {
              id: payload.userId || '',
              email: payload.userEmail || '',
              sessionId: payload.sessionId || '',
              username: payload.username || (payload.userEmail ? payload.userEmail.split('@')[0] : 'Guest'),
              firstName: payload.firstName || '',
              lastName: payload.lastName || '',
              fullName: payload.fullName || (payload.firstName ? `${payload.firstName} ${payload.lastName || ''}`.trim() : '') || payload.username || 'Guest',
              imageUrl: cleanAvatar,
              provider,
              externalAccounts: payload.externalAccounts || (isDisc ? [{ provider: 'discord', emailAddress: payload.userEmail }] : [{ provider: 'google', emailAddress: payload.userEmail }]),
            };
            localStorage.setItem('mc_authenticated_user', JSON.stringify(cached));
            localStorage.setItem('mission_control_active_provider', provider);

            // Maintain saved accounts list for multi-account switching
            // Key by ${provider}:${email || id} so Google and Discord accounts with the same email don't overwrite each other
            try {
              const rawList = localStorage.getItem('mc_saved_accounts');
              let list = rawList ? JSON.parse(rawList) : [];
              const cachedProv = isDisc ? 'discord' : 'google';
              const cachedKey = `${cachedProv}:${(cached.email || cached.id).toLowerCase()}`;
              list = list.filter((a: any) => {
                const aProv = (a.provider || (a.email?.includes('@gmail.') ? 'google' : 'discord')).toLowerCase().includes('discord') ? 'discord' : 'google';
                const aKey = `${aProv}:${(a.email || a.id).toLowerCase()}`;
                return aKey !== cachedKey;
              });
              list.unshift({ ...cached, token: payload.token, lastActive: Date.now() });
              localStorage.setItem('mc_saved_accounts', JSON.stringify(list.slice(0, 5)));
              try {
                sendCommand?.('save_user_account', { account: { ...cached, token: payload.token }, isActive: true });
              } catch (_) {}
            } catch (_) {}

            window.dispatchEvent(new Event('mc-auth-state-changed'));
          }
          if (payload?.token) {
            const uat = Math.floor(Date.now() / 1000).toString();
            document.cookie = `__session=${payload.token}; path=/; max-age=31536000`;
            document.cookie = `__client_uat=${uat}; path=/; max-age=31536000`;
          }
        } catch (_) {}

        let attempts = 0;
        const trySync = async (): Promise<void> => {
          try {
            if (clerk?.client) {
              const updatedClient = await clerk.client.reload();
              const targetSessionId =
                payload?.sessionId ||
                updatedClient?.lastActiveSessionId ||
                (updatedClient as any)?.signedInSessions?.[0]?.id ||
                (updatedClient as any)?.sessions?.[0]?.id;

              if (targetSessionId && clerk.setActive) {
                await clerk.setActive({ session: targetSessionId });
                setGlobalToast({ message: 'Welcome to Mission Control!' });
                return;
              }
            }
          } catch (err) {
            console.warn(`[Auth] Session sync attempt ${attempts + 1} failed:`, err);
          }

          attempts++;
          if (attempts < 3) {
            await new Promise<void>((r) => setTimeout(r, 350 * attempts));
            return trySync();
          }

          // Force soft reload: Clerk will mount and detect the freshly injected session & cookies
          console.log('[Auth] Reloading window to settle active session...');
          try {
            sessionStorage.setItem('mc_restore_page', activePage);
          } catch (_) {}
          setTimeout(() => {
            window.location.reload();
          }, 150);
        };

        await trySync();
      });
      return unsub;
    }
  }, [clerk, activePage]);

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
  // We open the UpdatesPage non-disruptively instead of a blocking popup.
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onOpenUpdaterModal) return;
    const cleanup1 = api.onOpenUpdaterModal(() => {
      setUpdaterTab('check');
      setActivePage('updates');
    });
    const cleanup2 = api.onOpenChangelogsModal?.(() => {
      setUpdaterTab('changelogs');
      setActivePage('updates');
    });
    const cleanup3 = api.onOpenDashboard?.(() => {
      setActivePage('dashboard');
    });
    return () => {
      cleanup1();
      cleanup2?.();
      cleanup3?.();
    };
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
    if (extra?.settingsCategory) {
      setSettingsCategory(extra.settingsCategory);
    } else if (page !== 'settings') {
      setSettingsCategory(undefined);
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
        } else if (triggerOauth === 'oauth_discord') {
          options.additionalData = { prompt: 'consent' };
          options.customOAuthOptions = { prompt: 'consent' };
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

  const cachedUser = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('mc_authenticated_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, [userId]);

  // Resolve effective active user ID immediately from either Clerk or cached session
  const effectiveActiveUserId = React.useMemo(() => {
    if (userId) return userId;
    return cachedUser?.id || undefined;
  }, [userId, cachedUser]);

  // Sync active user to Python backend pipeline on connection or account switch
  useEffect(() => {
    if (connected && effectiveActiveUserId) {
      const email = (cachedUser?.email || user?.primaryEmailAddress?.emailAddress || '').toLowerCase();
      const rawStored = typeof window !== 'undefined' ? localStorage.getItem('mission_control_active_provider') : null;
      const activeProvider = cachedUser?.provider || (email.includes('@gmail.') ? 'google' : (rawStored || 'guest'));
      sendCommand('set_active_user', {
        userId: effectiveActiveUserId,
        email,
        provider: activeProvider,
        username: cachedUser?.username || user?.username || '',
      });
    }
  }, [connected, effectiveActiveUserId, sendCommand, cachedUser, user]);

  // Auto-trigger library scan and auto-enable E2E encryption for authenticated users on first login
  useEffect(() => {
    if (!isHUDWindow && (isSignedIn || effectiveActiveUserId) && effectiveActiveUserId && connected && state?.config) {
      const initKey = `has_initialized_v2_${effectiveActiveUserId}`;
      if (!localStorage.getItem(initKey)) {
        sendCommand('scan_games', { userId: effectiveActiveUserId });

        // Auto-enable E2E encryption
        const updatedPrivacy = { ...state.config.privacy, enabled: true };
        sendCommand('update_config', { privacy: updatedPrivacy });

        localStorage.setItem(initKey, 'true');
      }
    }
  }, [isSignedIn, effectiveActiveUserId, connected, sendCommand, state?.config, isHUDWindow]);

  // Reset scan overlay dismissal when scanning finishes
  useEffect(() => {
    // Check game compatibility scanner execution status
    if (!state?.scan_state?.is_running) {
      setIsScanOverlayDismissed(false);
    }
  }, [state?.scan_state?.is_running]);

  // Synchronize game library cached games with the backend.
  // Fires when: (1) connected first time, (2) userId changes (login/logout/switch), (3) isSignedIn resolves after async auth.
  const lastLibraryRequestRef = React.useRef<string>('');
  useEffect(() => {
    if (!connected || isHUDWindow) return;
    const reqKey = `${effectiveActiveUserId || 'guest'}`;
    if (lastLibraryRequestRef.current === reqKey) return;
    lastLibraryRequestRef.current = reqKey;
    sendCommand('get_cached_games', { userId: effectiveActiveUserId, forceRefresh: false });
  }, [effectiveActiveUserId, connected, sendCommand, isHUDWindow]);

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

  // Forward live FPS/GPU telemetry to the system tray tooltip (readable by hovering without alt-tabbing)
  useEffect(() => {
    if (isHUDWindow || !state) return;
    const isActive = state.is_game_active === true;
    const gpuMetrics = state.gpu_metrics as any;
    const effectiveFps = state.fps ?? (state as any).game_fps ?? 0;
    (window as any).electronAPI?.updateTrayTelemetry?.({
      fps: effectiveFps,
      gpuLoad: gpuMetrics?.utilization ?? gpuMetrics?.gpu_util ?? 0,
      gpuTemp: gpuMetrics?.temp ?? gpuMetrics?.temperature ?? 0,
      isActive,
    });
  }, [state?.fps, (state as any)?.game_fps, state?.gpu_metrics, state?.is_game_active, isHUDWindow]);

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

  // Listen for agentic toggle hotkey from main process
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onToggleAgenticHotkey) {
      return api.onToggleAgenticHotkey(() => {
        setIsAgentic((prev) => {
          const next = !prev;
          sendCommand('toggle_agent_mode', { active: next });
          return next;
        });
      });
    }
  }, [sendCommand]);

  // Synchronize agent command triggers and navigation
  useEffect(() => {
    if (state?.navigate_to) {
      handleNavigate(state.navigate_to);
      setGlobalToast({ message: `Agent Navigation: Redirecting to ${state.navigate_to}` });
    }
    if (state?.trigger_action) {
      if (state.trigger_action === 'check_updates') {
         setUpdaterTab('check');
         setActivePage('updates');
         window.electronAPI?.checkElectronUpdates?.();
         setGlobalToast({ message: 'Agent Action: Checking for updates...' });
      } else if (state.trigger_action === 'rollback_release') {
         setUpdaterTab('rollback');
         setActivePage('updates');
         setGlobalToast({ message: 'Agent Action: Preparing emergency rollback...', type: 'warning' });
      } else if (state.trigger_action === 'scan_library') {
         setActivePage('games');
         if (userId) sendCommand('scan_games', { userId });
         setGlobalToast({ message: 'Agent Action: Scanning game library...' });
      }
    }
  }, [state?.navigate_to, state?.trigger_action, userId]);

  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => setGlobalToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

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

  // DEDICATED BROWSER AUTHENTICATION VIEWS (External System Browser)
  // When running in an external browser for authentication, NEVER render the desktop dashboard.
  if (isBrowserAuth) {
    if (!clerk.loaded) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-['Inter',system-ui,sans-serif] p-6 select-none relative overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-20 bg-neon-green" />
          <div className="relative z-10 flex flex-col items-center max-w-md text-center bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-neon-green mb-3" />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-200 mb-1">
              Mission Control Gateway
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              Connecting to authentication services…
            </p>
          </div>
        </div>
      );
    }

    if (isAuthCompleted || (isSignedIn && user)) {
      const displayName =
        user?.fullName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        user?.primaryEmailAddress?.emailAddress ||
        user?.username ||
        'Authenticated User';
      const displayEmail =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        '';

      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-['Inter',system-ui,sans-serif] p-6 select-none relative overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-20 bg-neon-green" />
          <div className="relative z-10 flex flex-col items-center max-w-md text-center bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_30px_rgba(118,185,0,0.3)] mb-5">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/20 text-neon-green text-[10px] font-black uppercase tracking-widest mb-3">
              <span>Authentication Gateway</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
              Authentication Successful
            </h2>
            <p className="text-xs text-zinc-400 font-medium mb-6 leading-relaxed">
              Connected to Mission Control as{' '}
              <span className="text-zinc-200 font-bold">{displayName}</span>
              {displayEmail && displayEmail !== displayName ? ` (${displayEmail})` : ''}.
              Your session has been synchronized to the desktop application.
            </p>

            {(() => {
              const client = clerk.client;
              const activeSession = clerk.session || client?.sessions?.[0] || (client as any)?.signedInSessions?.[0];
              const sessId = activeSession?.id || client?.lastActiveSessionId || '';
              const u: any = user || clerk.user || activeSession?.user || (client as any)?.users?.[0] || client?.sessions?.[0]?.user;
              const email =
                u?.primaryEmailAddress?.emailAddress ||
                u?.emailAddresses?.[0]?.emailAddress ||
                u?.email_addresses?.[0]?.email_address ||
                u?.primary_email_address?.email_address ||
                u?.email ||
                u?.emailAddress ||
                '';
              const username =
                u?.username ||
                u?.user_name ||
                u?.name ||
                (email ? email.split('@')[0] : 'Guest');
              const firstName =
                u?.firstName ||
                u?.first_name ||
                (username ? username.split(' ')[0] : 'Guest');
              const lastName = u?.lastName || u?.last_name || '';
              const fullName = `${firstName} ${lastName}`.trim() || username;
              const avatar =
                u?.imageUrl ||
                u?.image_url ||
                u?.profileImageUrl ||
                u?.profile_image_url ||
                u?.avatarUrl ||
                '';
              const deepLinkUrl = `mission-control://auth-completed?session_id=${encodeURIComponent(sessId)}&user_id=${encodeURIComponent(u?.id || '')}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&name=${encodeURIComponent(fullName)}&image_url=${encodeURIComponent(avatar)}`;
              return (
                <a
                  href={deepLinkUrl}
                  onClick={async () => {
                    try {
                      const token = await (activeSession?.getToken?.() || clerk.session?.getToken?.());
                      if (token) {
                        window.location.href = `${deepLinkUrl}&token=${encodeURIComponent(token)}`;
                      }
                    } catch (_) {}
                  }}
                  className="w-full py-3.5 px-6 rounded-xl bg-neon-green text-black font-black uppercase tracking-widest text-xs hover:bg-neon-green/90 transition-all shadow-[0_0_25px_rgba(118,185,0,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer mb-3"
                >
                  <Sparkles className="w-4 h-4 fill-black text-black" />
                  <span>Return to Mission Control</span>
                </a>
              );
            })()}

            <p className="text-[11px] text-zinc-500">
              You can safely close this browser window or tab.
            </p>
          </div>
        </div>
      );
    }

    // Dedicated Browser Authentication Portal View (External Browser Landing)
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-['Inter',system-ui,sans-serif] p-6 select-none relative overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-20 bg-neon-green" />
        <div className="relative z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-neon-green/10 rounded-2xl flex items-center justify-center border border-neon-green/30 mb-4 shadow-[0_0_20px_rgba(118,185,0,0.25)]">
              <Sparkles className="w-7 h-7 text-neon-green" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/20 text-neon-green text-[10px] font-black uppercase tracking-widest mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>Browser Auth Gateway</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              Mission Control
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Complete authentication securely in your system browser
            </p>
          </div>

          {browserAuthError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-left leading-relaxed">{browserAuthError}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={Boolean(browserAuthLoading)}
              onClick={() => handleBrowserOAuth('oauth_google')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {browserAuthLoading === 'oauth_google' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-neon-green" />
                  <span>Connecting to Google…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={Boolean(browserAuthLoading)}
              onClick={() => handleBrowserOAuth('oauth_discord')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 hover:bg-[#5865F2]/20 border border-white/10 hover:border-[#5865F2]/50 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {browserAuthLoading === 'oauth_discord' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#5865F2]" />
                  <span>Connecting to Discord…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-[#5865F2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.93.71-4.27 1.33a.08.08 0 0 0-.05.05C2.79 11.53 1.74 17.58 2.3 23.53a.08.08 0 0 0 .04.06c1.8 1.33 3.53 2.13 5.23 2.68a.09.09 0 0 0 .09-.03c.4-.55.77-1.13 1.11-1.74a.09.09 0 0 0-.05-.12c-.59-.22-1.16-.48-1.71-.78a.09.09 0 0 1-.01-.15c.12-.09.24-.18.35-.28a.09.09 0 0 1 .09-.01c3.48 1.59 7.23 1.59 10.67 0a.09.09 0 0 1 .09.01c.11.09.23.19.36.28a.09.09 0 0 1-.01.15c-.56.3-1.13.56-1.73.78a.09.09 0 0 0-.04.12c.34.61.71 1.19 1.11 1.74a.09.09 0 0 0 .09.03c1.7-.55 3.44-1.35 5.24-2.68a.08.08 0 0 0 .03-.06c.64-6.8-.93-12.75-2.47-18.15a.08.08 0 0 0-.05-.05ZM8.5 17.47c-1.05 0-1.92-.96-1.92-2.13 0-1.18.85-2.14 1.92-2.14s1.94.97 1.92 2.14c0 1.17-.86 2.13-1.92 2.13Zm7 0c-1.05 0-1.92-.96-1.92-2.13 0-1.18.85-2.14 1.92-2.14s1.94.97 1.92 2.14c0 1.17-.86 2.13-1.92 2.13Z" />
                  </svg>
                  <span>Continue with Discord</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[11px] text-zinc-500">
              After signing in, your session will automatically sync to Mission Control.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthCompleted) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-['Inter',system-ui,sans-serif] p-6 select-none">
        <div className="relative w-16 h-16 flex items-center justify-center mb-4 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green shadow-[0_0_30px_rgba(118,185,0,0.2)]">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-200 mb-1">
          Authentication Successful
        </h2>
        <p className="text-xs text-zinc-400 font-medium">
          Returning to Mission Control…
        </p>
      </div>
    );
  }

  if (isAuthPopup) {
    const params = new URLSearchParams(window.location.search);
    const strategy = (params.get('strategy') || 'oauth_google') as 'oauth_google' | 'oauth_discord';
    const mode = (params.get('mode') || 'login') as 'login' | 'signup' | 'switch' | 'link';
    const strategyName = strategy === 'oauth_discord' ? 'Discord' : 'Google';
    const isDiscord = strategy === 'oauth_discord';
    const brandColor = isDiscord ? '#5865F2' : '#76B900';
    const brandGlow = isDiscord ? 'rgba(88, 101, 242, 0.25)' : 'rgba(118, 185, 0, 0.25)';

    const handleClosePopup = () => {
      if (window.electronAPI?.closeAuthPopup) {
        window.electronAPI.closeAuthPopup();
      }
      try {
        window.close();
      } catch (_) {}
    };

    const handleRetryPopup = () => {
      setAuthPopupError(null);
      setAuthPopupRetryCount((prev) => prev + 1);
    };

    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-['Inter',system-ui,sans-serif] p-6 select-none relative overflow-hidden">
        {/* Glow ambient background */}
        <div
          className="absolute w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-20"
          style={{ backgroundColor: brandColor }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
          {/* Animated Spinner or Error Icon */}
          <div className="relative w-16 h-16 flex items-center justify-center mb-5">
            {authPopupError ? (
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-7 h-7" />
              </div>
            ) : (
              <>
                <div
                  className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: `${brandColor}33`,
                    borderTopColor: brandColor,
                    boxShadow: `0 0 20px ${brandGlow}`
                  }}
                />
                <img src="/logo.png" className="w-8 h-8 object-contain" alt="Mission Control Logo" />
              </>
            )}
          </div>

          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100 mb-1">
            {authPopupError ? 'Authentication Stalled' : `Connecting to ${strategyName}…`}
          </h2>
          <p className="text-xs text-zinc-400 font-medium mb-4 leading-relaxed">
            {authPopupError || 'Completing secure authentication handshake with Mission Control'}
          </p>

          {/* Browser Authentication Failsafe Action in Popup */}
          {authPopupError && (
            <div className="w-full mb-4 p-3 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>Browser Failsafe Redirection</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-normal leading-relaxed text-left">
                In-app authentication is taking too long or was blocked. Continue in your system browser to complete sign-in.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.electronAPI?.openBrowserAuth?.({
                    strategy,
                    mode: mode as any,
                    reason: 'user_clicked_popup_failsafe_button',
                  });
                }}
                className="w-full py-2 px-3 rounded-lg bg-neon-green text-black font-black uppercase text-[10px] tracking-wider hover:bg-neon-green/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(118,185,0,0.3)]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>
                  {failsafeCountdown !== null && failsafeCountdown > 0
                    ? `Redirecting to Browser (${failsafeCountdown}s)...`
                    : 'Open in System Browser'}
                </span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {authPopupError && (
              <button
                type="button"
                onClick={handleRetryPopup}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/15 text-zinc-100 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={handleClosePopup}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                authPopupError
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30'
                  : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60'
              }`}
            >
              Cancel & Close
            </button>
          </div>
        </div>
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
    triggerPersonalitySync(val);
    sendCommand('set_personality', { personality: val.toLowerCase() });
  };



  return (
    <MotionConfig reducedMotion="user">
      <div className={`flex flex-col h-screen bg-[var(--theme-bg-app,#09090b)] text-zinc-100 selection:bg-zinc-500/30 selection:text-zinc-200 overflow-hidden font-['Inter',system-ui,sans-serif] relative ${preferences.canvasTexture ? `canvas-texture-${preferences.canvasTexture}` : ''}`}>
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
            sendCommand={sendCommand}
            onTriggerUpdateCheck={() => {
              setUpdaterTab('check');
              setActivePage('updates');
            }}
            onTriggerChangelogs={() => {
              setUpdaterTab('changelogs');
              setActivePage('updates');
            }}
          />

          {/* HUD is now loaded in a dedicated transparent overlay window */}

          {/* COLUMN 2 & 3 CONTAINER */}
          <main className="flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row relative overflow-hidden bg-[var(--theme-bg-app,#09090b)] lg:border-l border-white/5">

            {/* CENTER CONTENT CONTAINER */}
            <div className="flex-1 min-h-0 min-w-0 flex flex-col relative overflow-hidden">
              {/* Header / Top Bar */}
              <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-[var(--theme-bg-surface,#0a0a0f)] z-55">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Toggle */}
                  <button aria-label="button" type="button" onClick={() => setIsSidebarOpen(true)} className="p-1.5 hover:bg-white/5 rounded-lg lg:hidden text-zinc-400">
                    <Menu className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center border border-white/10 overflow-hidden p-0.5 ${preferences.gamerProfile?.avatarAura ? 'gamer-aura-glow bg-neon-green/20' : 'bg-white/5'}`}>
                      <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-xs font-black tracking-tighter text-white uppercase">Mission Control</h1>
                      {preferences.gamerProfile?.callsign && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[8px] font-mono font-black uppercase text-neon-green bg-neon-green/10 border border-neon-green/25 px-1.5 py-0.5 rounded-md">
                          <span className="w-1 h-1 rounded-full bg-neon-green animate-pulse" />
                          {preferences.gamerProfile.callsign}
                        </span>
                      )}
                    </div>
                    {activeGameTheme && (
                      <span className="hidden xl:inline-flex items-center gap-1 text-[8px] font-black uppercase text-neon-yellow bg-neon-yellow/15 border border-neon-yellow/30 px-2 py-0.5 rounded-full animate-pulse ml-1">
                        🎮 {state?.current_game || 'Game'} Sync
                      </span>
                    )}
                  </div>
                </div>

                {/* Agent Controls & Sync */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden md:flex items-center gap-2 pr-3 border-r border-white/5">
                    {/* Theme Quick Switcher */}
                    <ThemeQuickMenu
                      currentGame={state?.current_game}
                      gpuName={(state as any)?.gpu_metrics?.gpu_name}
                      onOpenAppearanceSettings={() =>
                        handleNavigate('settings', { settingsCategory: 'appearance' })
                      }
                    />

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
              <div className="flex-1 min-h-0 min-w-0 flex flex-col relative overflow-hidden">
                <Suspense fallback={<PageSkeleton />}>
                  {visitedPages['dashboard'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'dashboard' ? '' : 'hidden'}`}>
                      <DashboardPage state={activePage === 'dashboard' ? state : null} onCommand={sendCommand} onNavigate={handleNavigate} />
                    </div>
                  )}
                  {visitedPages['vision'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'vision' ? '' : 'hidden'}`}>
                      <VisionPage state={activePage === 'vision' ? state : null} sendCommand={sendCommand} />
                    </div>
                  )}
                  {visitedPages['system'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'system' ? '' : 'hidden'}`}>
                      <SystemPage
                        state={activePage === 'system' ? state : null}
                        selectedCategory={systemCategory}
                        setSelectedCategory={setSystemCategory}
                        sendCommand={sendCommand}
                      />
                    </div>
                  )}
                  {visitedPages['games'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'games' ? '' : 'hidden'}`}>
                      <GamesPage
                        state={activePage === 'games' ? state : null}
                        sendCommand={sendCommand}
                        mode={gamesPageMode}
                        setMode={setGamesPageMode}
                      />
                    </div>
                  )}
                  {visitedPages['settings'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'settings' ? '' : 'hidden'}`}>
                      <SettingsPage
                        state={activePage === 'settings' ? state : null}
                        sendCommand={sendCommand}
                        defaultCategory={settingsCategory}
                      />
                    </div>
                  )}
                  {visitedPages['lab'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'lab' ? '' : 'hidden'}`}>
                      <LabPage state={activePage === 'lab' ? state : null} sendCommand={sendCommand} />
                    </div>
                  )}
                  {visitedPages['readiness'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'readiness' ? '' : 'hidden'}`}>
                      <ReadinessPage state={activePage === 'readiness' ? state : null} connected={connected} sendCommand={sendCommand} />
                    </div>
                  )}
                  {visitedPages['agent'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'agent' ? '' : 'hidden'}`}>
                      {!isSignedIn && gamesPageMode === 'auth' ? (
                        <AuthPage onBackToLibrary={() => setGamesPageMode('library')} />
                      ) : (
                        <AgentPage
                          state={state}
                          activePage={activePage}
                          onCommand={sendCommand}
                          isAgentic={isAgentic}
                          connected={connected}
                          isIntelOpen={isIntelOpen}
                          setIsIntelOpen={setIsIntelOpen}
                          userId={effectiveActiveUserId}
                        />
                      )}
                    </div>
                  )}
                  {visitedPages['updates'] && (
                    <div className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${activePage === 'updates' ? '' : 'hidden'}`}>
                      <UpdatesPage
                        state={activePage === 'updates' ? state : null}
                        sendCommand={sendCommand}
                        defaultTab={updaterTab}
                      />
                    </div>
                  )}
                </Suspense>
              </div>

            </div>

          </main>
        </div>




        {/* Global Scanning Overlay */}
        <AnimatePresence>
          {state?.scan_state?.is_running && !(state?.scan_state as any)?.is_background && !isScanOverlayDismissed && (
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
                <div className="absolute inset-0 rounded-full bg-linear-to-tr from-neon-green/20 via-transparent to-transparent animate-spin [animation-duration:3s]" />

                {/* Central glowing icon */}
                <div className="relative w-24 h-24 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center shadow-[0_0_30px_rgba(118,185,0,0.2)] overflow-hidden p-2">
                  <img src="/logo.png" className="w-12 h-12 object-contain animate-pulse" alt="Mission Control Logo" />
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
                      className="h-full bg-linear-to-r from-neon-green via-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(118, 185, 0,0.5)]"
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

        {/* Global Toast Notification */}
        <AnimatePresence>
          {globalToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl border ${
                globalToast.type === 'warning' 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                  : 'bg-neon-green/10 border-neon-green/30 text-neon-green'
              }`}
            >
              {globalToast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span className="text-[10px] font-black uppercase tracking-widest">{globalToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};

export default App;
