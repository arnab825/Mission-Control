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
            username: payload.username || (payload.userEmail ? payload.userEmail.split('@')[0] : 'Operative'),
            firstName: payload.firstName || 'Operative',
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
    id: cachedUser.id || 'node-user',
    username: cachedUser.username || (cachedUser.email ? cachedUser.email.split('@')[0] : 'operative'),
    firstName: cachedUser.firstName || (cachedUser.email ? cachedUser.email.split('@')[0] : 'Operative'),
    lastName: cachedUser.lastName || '',
    fullName: `${cachedUser.firstName || ''} ${cachedUser.lastName || ''}`.trim() || cachedUser.username || 'Operative',
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

  const activeExternalAccount = effectiveUser?.externalAccounts?.find(
    (a: any) =>
      (a.provider || '').toLowerCase().includes(normalizedActiveProvider) ||
      (a.verification?.strategy || '').toLowerCase().includes(normalizedActiveProvider) ||
      (a.verificationStrategy || '').toLowerCase().includes(normalizedActiveProvider)
  );

  const sidebarAvatarUrl = (() => {
    if (activeExternalAccount?.imageUrl) return activeExternalAccount.imageUrl;
    if (cachedUser?.imageUrl && !cachedUser.imageUrl.includes('placeholder')) {
      if (normalizedActiveProvider === 'google' && cachedUser.imageUrl.includes('discordapp.com')) {
        // Skip discord avatar for google
      } else if (normalizedActiveProvider === 'discord' && !cachedUser.imageUrl.includes('discordapp.com')) {
        // Skip non-discord avatar for discord
      } else {
        return cachedUser.imageUrl;
      }
    }
    if (effectiveUser?.imageUrl) {
      if (normalizedActiveProvider === 'google' && effectiveUser.imageUrl.includes('discordapp.com')) {
        return '';
      }
      return effectiveUser.imageUrl;
    }
    return '';
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
                  className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center font-black text-xs text-neon-green uppercase"
                  style={{ display: sidebarAvatarUrl ? 'none' : 'flex' }}
                >
                  {effectiveUser.firstName?.[0] || effectiveUser.username?.[0] || effectiveUser.email?.[0] || 'U'}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] font-black text-white truncate uppercase tracking-tight" title={effectiveUser?.fullName || effectiveUser?.firstName || effectiveUser?.username || 'Node Connected'}>
                    {(() => {
                      const fullName = effectiveUser?.fullName || (effectiveUser?.firstName ? `${effectiveUser.firstName} ${effectiveUser.lastName || ''}`.trim() : '');
                      if (fullName) return fullName;
                      if (activeExternalAccount?.firstName) return `${activeExternalAccount.firstName} ${activeExternalAccount.lastName || ''}`.trim();
                      if (effectiveUser?.firstName) return effectiveUser.firstName;
                      if (activeExternalAccount?.username) return activeExternalAccount.username;
                      if (effectiveUser?.username) return effectiveUser.username;
                      return 'Node Connected';
                    })()}
                  </span>
                  <span className="text-[8px] text-zinc-500 truncate lowercase font-medium mt-0.5">
                    {(() => {
                      if (activeExternalAccount && !effectiveUser.primaryEmailAddress) {
                        return `via ${activeExternalAccount.provider?.replace('oauth_', '') || 'sso'}`;
                      }
                      return activeExternalAccount?.emailAddress || effectiveUser.primaryEmailAddress?.emailAddress || 'clerk.user';
                    })()}
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
        />
      )}
    </>
  );
};

export default Sidebar;
