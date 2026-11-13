import React from 'react';
import {
  X,
  Activity,
  Monitor,
  Gamepad2,
  Settings,
  Beaker,
  RefreshCw,
  History,
  LogOut,
  Link as LinkIcon,
  ShieldCheck,
  ArrowLeftRight
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { AccountSwitcherModal } from './AccountSwitcherModal';
import { isDiscordAvatarUrl, isGoogleAvatarUrl } from '../utils/avatarUtils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  activePage: string;
  onNavigate: (page: string, options?: any) => void;
  state: any;
  onTriggerUpdateCheck: () => void;
  onTriggerChangelogs: () => void;
  sendCommand?: (type: string, payload?: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen = true, 
  onClose, 
  activePage, 
  onNavigate,
  state,
  onTriggerUpdateCheck,
  onTriggerChangelogs,
  sendCommand
}) => {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = React.useState(false);

  const readCachedUser = React.useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem('mc_authenticated_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const [cachedUser, setCachedUser] = React.useState<any>(readCachedUser);

  React.useEffect(() => {
    const handleUpdate = () => {
      setCachedUser(readCachedUser());
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('mc-auth-state-changed', handleUpdate);

    const unsub = window.electronAPI?.onAuthCompleted?.((payload?: any) => {
      if (payload?.userEmail || payload?.userId || payload?.sessionId) {
        setCachedUser((prev: any) => {
          const isPrevReal = prev?.email && !prev.email.includes('missioncontrol.app');
          const isIncomingReal = payload.userEmail && !payload.userEmail.includes('missioncontrol.app');
          if (isPrevReal && !isIncomingReal) {
            return {
              ...prev,
              sessionId: payload.sessionId || prev.sessionId,
            };
          }
          return {
            id: payload.userId || (payload.sessionId ? `node_${payload.sessionId.slice(-8)}` : 'node_active'),
            email: payload.userEmail || (payload.sessionId ? 'node.active@missioncontrol.app' : 'node.active@missioncontrol.app'),
            username: payload.username || (payload.userEmail ? payload.userEmail.split('@')[0] : 'Guest'),
            firstName: payload.firstName || 'Guest',
            lastName: payload.lastName || '',
            imageUrl: payload.imageUrl || '',
            sessionId: payload.sessionId || '',
          };
        });
      } else {
        handleUpdate();
      }
    });

    const unsubCleared = (window as any).electronAPI?.onAuthCleared?.(() => {
      setCachedUser(null);
    });

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('mc-auth-state-changed', handleUpdate);
      unsub?.();
      unsubCleared?.();
    };
  }, [readCachedUser]);

  const effectiveIsSignedIn = Boolean(isSignedIn || cachedUser);
  const effectiveUser = user || (cachedUser ? {
    id: cachedUser.id || 'guest-node',
    username: cachedUser.username || (cachedUser.email ? cachedUser.email.split('@')[0] : 'guest'),
    firstName: cachedUser.firstName || (cachedUser.email ? cachedUser.email.split('@')[0] : 'Guest'),
    lastName: cachedUser.lastName || '',
    fullName: `${cachedUser.firstName || ''} ${cachedUser.lastName || ''}`.trim() || cachedUser.username || 'Guest',
    imageUrl: cachedUser.imageUrl || '',
    primaryEmailAddress: cachedUser.email ? { emailAddress: cachedUser.email } : undefined,
    externalAccounts: cachedUser.externalAccounts || [],
  } as any : null);

  // Find the exact external account the user just logged in with (saved in localStorage during sign in)
  const rawStoredProvider = typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function' ? window.localStorage.getItem('mission_control_active_provider') : null;
  const normalizedActiveProvider = (() => {
    if (rawStoredProvider) return rawStoredProvider.replace('oauth_', '');
    if (cachedUser?.provider) return cachedUser.provider.replace('oauth_', '');
    if (effectiveUser?.provider) return effectiveUser.provider.replace('oauth_', '');
    return 'google';
  })();

  const readSavedAccounts = React.useCallback((): any[] => {
    try {
      if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') return [];
      const raw = window.localStorage.getItem('mc_saved_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }, []);

  const allExtAccounts = [
    ...(user?.externalAccounts || []),
    ...(cachedUser?.externalAccounts || []),
    ...(effectiveUser?.externalAccounts || []),
    ...(readSavedAccounts().flatMap((a: any) => a.externalAccounts || [])),
  ];

  const googleExt = allExtAccounts.find((a: any) =>
    (a.provider || '').toLowerCase().includes('google') ||
    (a.verification?.strategy || '').toLowerCase().includes('google') ||
    (a.verificationStrategy || '').toLowerCase().includes('google')
  );

  const discordExt = allExtAccounts.find((a: any) =>
    (a.provider || '').toLowerCase().includes('discord') ||
    (a.verification?.strategy || '').toLowerCase().includes('discord') ||
    (a.verificationStrategy || '').toLowerCase().includes('discord')
  );

  const isDisc = normalizedActiveProvider.includes('discord');

  const activeProfile = React.useMemo(() => {
    const savedAccs = readSavedAccounts();
    if (isDisc) {
      const savedDiscord = savedAccs.find((a: any) =>
        (a.provider || '').toLowerCase().includes('discord')
      );
      const discUsername =
        discordExt?.username ||
        (discordExt as any)?.label ||
        (cachedUser?.provider?.includes('discord') ? cachedUser?.username : null) ||
        savedDiscord?.username ||
        (effectiveUser?.username && effectiveUser.username !== effectiveUser.fullName ? effectiveUser.username : null) ||
        'Discord User';
      const discEmail =
        discordExt?.emailAddress ||
        (discordExt as any)?.email_address ||
        (discordExt as any)?.email ||
        cachedUser?.email ||
        savedDiscord?.email ||
        effectiveUser?.primaryEmailAddress?.emailAddress ||
        effectiveUser?.email ||
        (discUsername && discUsername !== 'Discord User' ? `@${discUsername}` : 'Discord Linked');
      return {
        displayName: discUsername,
        displaySub: discEmail,
      };
    } else {
      const savedGoogle = savedAccs.find((a: any) =>
        (a.provider || '').toLowerCase().includes('google')
      );
      const googleName =
        (googleExt?.firstName ? `${googleExt.firstName} ${googleExt.lastName || ''}`.trim() : null) ||
        (effectiveUser?.fullName && !effectiveUser.fullName.toLowerCase().includes('discord') ? effectiveUser.fullName : null) ||
        (cachedUser?.provider?.includes('google') ? cachedUser?.fullName || cachedUser?.username : null) ||
        savedGoogle?.fullName ||
        effectiveUser?.firstName ||
        'Google User';
      const googleEmail =
        googleExt?.emailAddress ||
        (googleExt as any)?.email_address ||
        (googleExt as any)?.email ||
        effectiveUser?.primaryEmailAddress?.emailAddress ||
        effectiveUser?.email ||
        cachedUser?.email ||
        savedGoogle?.email ||
        'Google Account';
      return {
        displayName: googleName,
        displaySub: googleEmail,
      };
    }
  }, [isDisc, discordExt, googleExt, cachedUser, effectiveUser, readSavedAccounts]);

  const sidebarAvatarUrl = (() => {
    if (isDisc) {
      // Prioritize authentic Discord avatar, never Google image or Google Clerk proxy
      const candidates = [
        (discordExt as any)?.avatarUrl,
        (discordExt as any)?.avatar_url,
        discordExt?.imageUrl,
        cachedUser?.avatarUrl,
        cachedUser?.imageUrl,
        typeof window !== 'undefined' ? localStorage.getItem('mc_discord_avatar') : null,
      ];
      for (const cand of candidates) {
        if (cand && isDiscordAvatarUrl(cand)) {
          try { localStorage.setItem('mc_discord_avatar', cand); } catch (_) {}
          return cand;
        }
      }
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('mc_discord_avatar');
        if (stored && !isDiscordAvatarUrl(stored)) {
          try { localStorage.removeItem('mc_discord_avatar'); } catch (_) {}
        }
      }
      return '';
    } else {
      // For Google: call Google avatar from external account or primary image, NEVER Discord
      const candidates = [
        googleExt?.imageUrl,
        googleExt?.image_url,
        (googleExt as any)?.avatarUrl,
        effectiveUser?.imageUrl,
        cachedUser?.imageUrl,
        typeof window !== 'undefined' ? localStorage.getItem('mc_google_avatar') : null,
      ];
      for (const cand of candidates) {
        if (cand && isGoogleAvatarUrl(cand)) {
          try { localStorage.setItem('mc_google_avatar', cand); } catch (_) {}
          return cand;
        }
      }
      return '';
    }
  })();
  
  const [electronVer, setElectronVer] = React.useState<string>('');
  React.useEffect(() => {
    if ((window as any).electronAPI?.getAppVersion) {
      (window as any).electronAPI.getAppVersion().then((v: string) => {
        if (v) setElectronVer(v);
      }).catch(() => {});
    }
  }, []);
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, color: 'text-neon-green' },
    { id: 'vision', label: 'Vision', icon: Monitor, color: 'text-neon-yellow' },
    { id: 'lab', label: 'Stability Lab', icon: Beaker, color: 'text-orange-400' },
    { id: 'agent', label: 'Agent', icon: Activity, color: 'text-neon-green' },
    { id: 'games', label: 'Library', icon: Gamepad2, color: 'text-purple-400' },
    { id: 'system', label: 'System', icon: Monitor, color: 'text-neon-yellow' },
    { id: 'readiness', label: 'Readiness', icon: ShieldCheck, color: 'text-orange-400' },
    { id: 'updates', label: 'Updates', icon: RefreshCw, color: 'text-blue-400' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-zinc-400' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
          className="fixed top-10 inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm z-60 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed top-10 bottom-0 left-0 z-70 w-full max-w-75 sm:w-72 bg-zinc-950/95 backdrop-blur-xl border-r border-white/5 flex flex-col p-4 pb-6 overflow-y-auto no-scrollbar
        transition-transform duration-300 ease-in-out lg:relative lg:top-0 lg:h-full lg:max-w-none lg:w-72 lg:translate-x-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between px-2 mb-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg border border-neon-green/45 flex items-center justify-center bg-neon-green/5 overflow-hidden p-0.5 shadow-[0_0_12px_rgba(118, 185, 0,0.15)]">
              <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
            </div>
            <span className="text-[13px] font-black tracking-widest text-white uppercase font-display">
              Mission <span className="text-neon-green">Control</span>
            </span>
          </div>
          <button aria-label="button" type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white lg:hidden transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── TOP SECTION: Navigation ────────────────────────────── */}
        <div className="mb-4 space-y-0.5">
          <div className="px-2 mb-3">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Navigation</span>
          </div>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button aria-label="button" type="button"
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-white/10 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                    : 'hover:bg-white/4 border border-transparent'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-black/40' : 'bg-transparent'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-zinc-500'}`} />
                </div>
                <span className={`text-xs font-bold tracking-tight ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subtle Bottom Fade / Footer spacer */}
        <div className="flex-1" />

        {/* User Authentication Status Node */}
        <div className="mb-4 pt-3 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Authentication</span>
            {effectiveIsSignedIn ? (
              <span className="flex items-center gap-1 text-[8px] font-black text-neon-yellow uppercase bg-neon-yellow/10 border border-neon-yellow/20 px-2 py-0.5 rounded-full font-mono">
                <span className="w-1 h-1 rounded-full bg-neon-yellow animate-pulse" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[8px] font-black text-zinc-500 uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                Offline
              </span>
            )}
          </div>

          {effectiveIsSignedIn && effectiveUser ? (
            <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()} 
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button')) return;
                setIsAccountSwitcherOpen(true);
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/2 hover:bg-white/5 border border-white/4 hover:border-white/10 backdrop-blur-sm cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {sidebarAvatarUrl ? (
                  <img
                    src={sidebarAvatarUrl}
                    className="w-8 h-8 rounded-lg border border-white/10 object-cover"
                    alt="Avatar"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs shrink-0 ${
                    normalizedActiveProvider === 'discord'
                      ? 'bg-[#5865F2]/20 border-[#5865F2]/40 text-[#5865F2]'
                      : 'bg-neon-green/10 border-neon-green/20 text-neon-green uppercase'
                  }`}
                  style={{ display: sidebarAvatarUrl ? 'none' : 'flex' }}
                >
                  {isDisc ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                  ) : (
                    activeProfile.displayName?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] font-black text-white truncate uppercase tracking-tight" title={activeProfile.displayName}>
                    {activeProfile.displayName}
                  </span>
                  <span className="text-[8px] text-zinc-500 truncate lowercase font-medium mt-0.5" title={activeProfile.displaySub}>
                    {activeProfile.displaySub}
                  </span>
                </div>

              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  aria-label="Switch Account"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAccountSwitcherOpen(true);
                  }}
                  className="p-1.5 hover:bg-neon-green/10 border border-transparent hover:border-neon-green/30 text-zinc-400 hover:text-neon-green rounded-lg transition-all cursor-pointer"
                  title="Switch Account"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <button
                  aria-label="Sign Out"
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (effectiveUser?.id && sendCommand) {
                      sendCommand('logout_user', { userId: effectiveUser.id });
                    }
                    setCachedUser(null);
                    try {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('mission_control_active_provider');
                        window.localStorage.removeItem('mc_authenticated_user');
                        document.cookie = '__session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        document.cookie = '__client_uat=0; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        window.dispatchEvent(new Event('mc-auth-state-changed'));
                      }
                    } catch (_) {}
                    if ((window as any).electronAPI?.clearAuth) {
                      try {
                        await (window as any).electronAPI.clearAuth();
                      } catch (_) {}
                    }
                    try {
                      await signOut();
                    } catch (err) {
                      console.error('[SidebarLeft] Sign-out error:', err);
                    }
                  }}
                  className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              aria-label="button"
              type="button"
              onClick={() => {
                setIsAccountSwitcherOpen(true);
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neon-green/5 hover:bg-neon-green/10 border border-neon-green/10 hover:border-neon-green/20 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green group-hover:bg-neon-green/20 transition-all">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-neon-green uppercase tracking-wider group-hover:text-neon-green transition-colors">Link Neural Node</h4>
                  <p className="text-[8px] text-zinc-500 mt-0.5">Sign in to sync your library</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Footer section for updates and changelogs */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mission Control</span>
            <span className="text-[10px] font-black text-neon-green font-mono">v{(electronVer || state?.version || '---').replace(/^v/i, '')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button aria-label="button" type="button"
              onClick={onTriggerUpdateCheck}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/3 border border-white/6 hover:bg-neon-green/15 hover:border-neon-green/30 hover:text-neon-green transition-all text-[9px] font-black uppercase tracking-wider text-zinc-400"
            >
              <RefreshCw className="w-3 h-3 text-neon-green" />
              Check
            </button>
            <button aria-label="button" type="button"
              onClick={onTriggerChangelogs}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/10 hover:border-white/15 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider text-zinc-400"
            >
              <History className="w-3 h-3 text-purple-400" />
              Notes
            </button>
          </div>
        </div>
      </div>

      {isAccountSwitcherOpen && (
        <AccountSwitcherModal
          isOpen={isAccountSwitcherOpen}
          onClose={() => setIsAccountSwitcherOpen(false)}
          sendCommand={sendCommand}
          onNavigate={onNavigate}
          state={state}
        />
      )}
    </>
  );
};

export default Sidebar;
