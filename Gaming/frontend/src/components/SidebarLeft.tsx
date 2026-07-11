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
  ShieldCheck
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  activePage: string;
  onNavigate: (page: string, options?: any) => void;
  state: any;
  onTriggerUpdateCheck: () => void;
  onTriggerChangelogs: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen = true, 
  onClose, 
  activePage, 
  onNavigate,
  state,
  onTriggerUpdateCheck,
  onTriggerChangelogs
}) => {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  
  // Find the exact external account the user just logged in with (saved in localStorage during sign in)
  const activeProvider = localStorage.getItem('mission_control_active_provider');
  let activeExternalAccount = user?.externalAccounts?.find(a => a.provider === activeProvider);
  
  // Fallback to the most recently updated if not found
  if (!activeExternalAccount && user?.externalAccounts) {
    activeExternalAccount = [...user.externalAccounts].sort((a, b) => {
      const bTime = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0;
      const aTime = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0;
      return bTime - aTime;
    })[0];
  }
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, color: 'text-neon-green' },
    { id: 'vision', label: 'Vision', icon: Monitor, color: 'text-neon-yellow' },
    { id: 'lab', label: 'Stability Lab', icon: Beaker, color: 'text-orange-400' },
    { id: 'agent', label: 'Agent', icon: Activity, color: 'text-neon-green' },
    { id: 'games', label: 'Library', icon: Gamepad2, color: 'text-purple-400' },
    { id: 'system', label: 'System', icon: Monitor, color: 'text-neon-yellow' },
    { id: 'readiness', label: 'Readiness', icon: ShieldCheck, color: 'text-orange-400' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-zinc-400' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-70 w-72 bg-zinc-950/70 backdrop-blur-md border-r border-white/5 flex flex-col p-4 pb-6 overflow-y-auto no-scrollbar
        transition-transform duration-500 ease-in-out lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Brand Logo Header */}
        <div className="flex items-center gap-2.5 px-2 mb-4 border-b border-white/5 pb-4">
          <div className="w-7 h-7 rounded-lg border border-neon-green/45 flex items-center justify-center bg-neon-green/5 overflow-hidden p-0.5 shadow-[0_0_12px_rgba(118, 185, 0,0.15)]">
            <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
          </div>
          <span className="text-[13px] font-black tracking-widest text-white uppercase font-display">
            Mission <span className="text-neon-green">Control</span>
          </span>
        </div>

        {/* ── TOP SECTION: Navigation ────────────────────────────── */}
        <div className="mb-4 space-y-0.5">
          <div className="flex items-center justify-between px-2 mb-3">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Navigation</span>
            <button aria-label="button" type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-600 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
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
            {isSignedIn ? (
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

          {isSignedIn && user ? (
            <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()} 
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button')) return;
                onNavigate('games');
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/2 hover:bg-white/5 border border-white/4 hover:border-white/10 backdrop-blur-sm cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {(() => {
                  const avatarUrl = activeExternalAccount?.imageUrl || user.imageUrl;
                  return avatarUrl ? (
                    <img
                      src={avatarUrl}
                      className="w-8 h-8 rounded-lg border border-white/10 object-cover"
                      alt="Avatar"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null;
                })()}
                <div
                  className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center font-black text-xs text-neon-green"
                  style={{ display: (user.imageUrl || user.externalAccounts?.[0]?.imageUrl) ? 'none' : 'flex' }}
                >
                  {user.firstName?.[0] || user.username?.[0] || user.externalAccounts?.[0]?.username?.[0] || 'U'}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] font-black text-white truncate uppercase tracking-tight">
                    {(() => {
                      if (activeExternalAccount?.username) return activeExternalAccount.username;
                      if (user.username) return user.username;
                      if (user.firstName) return user.firstName;
                      return 'Node Connected';
                    })()}
                  </span>
                  <span className="text-[8px] text-zinc-500 truncate lowercase font-medium mt-0.5">
                    {(() => {
                      if (activeExternalAccount && !user.primaryEmailAddress) {
                        return `via ${activeExternalAccount.provider?.replace('oauth_', '') || 'sso'}`;
                      }
                      return user.primaryEmailAddress?.emailAddress || activeExternalAccount?.emailAddress || 'clerk.user';
                    })()}
                  </span>
                </div>

              </div>
              <button aria-label="button" type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await signOut();
                  // Hard-reload to root so Clerk clears all session state and
                  // the next sign-in gets a fresh avatar/profile load
                  window.location.replace('/');
                }}
                className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-all"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button aria-label="button" type="button"
              onClick={() => {
                onNavigate('games', { showAuth: true });
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neon-green/5 hover:bg-neon-green/10 border border-neon-green/10 hover:border-neon-green/20 transition-all text-left group"
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
            <span className="text-[10px] font-black text-neon-green font-mono">v{state?.version || '---'}</span>
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
    </>
  );
};

export default Sidebar;
