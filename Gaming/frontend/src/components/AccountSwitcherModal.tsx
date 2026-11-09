import React, { useState } from 'react';
import { useUser, useClerk, useSignIn } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  LogOut,
  Check,
  Loader2,
  Mail,
  Lock,
  LogIn,
  KeyRound,
  ArrowLeftRight,
  Trash2,
} from 'lucide-react';

import type { TelemetryState } from '../types/telemetry';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  sendCommand?: (type: string, payload?: any) => void;
  onNavigate?: (page: string, options?: any) => void;
  state?: TelemetryState;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  sendCommand,
  onNavigate,
  state
}) => {
  const { user, isSignedIn } = useUser();
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();

  const readCachedUser = React.useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem('mc_authenticated_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const readSavedAccounts = React.useCallback((): any[] => {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem('mc_saved_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }, []);

  const [cachedUser, setCachedUser] = useState<any>(readCachedUser);
  const [savedAccounts, setSavedAccounts] = useState<any[]>(readSavedAccounts);

  React.useEffect(() => {
    const handleUpdate = () => {
      setCachedUser(readCachedUser());
      setSavedAccounts(readSavedAccounts());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('mc-auth-state-changed', handleUpdate);
    const unsub = (window as any).electronAPI?.onAuthCompleted?.((payload?: any) => {
      if (payload?.userEmail || payload?.userId || payload?.sessionId) {
        setCachedUser({
          id: payload.userId || '',
          email: payload.userEmail || '',
          username: payload.username || (payload.userEmail ? payload.userEmail.split('@')[0] : 'Guest'),
          firstName: payload.firstName || 'Guest',
          lastName: payload.lastName || '',
          imageUrl: payload.imageUrl || '',
          sessionId: payload.sessionId || '',
          externalAccounts: payload.externalAccounts || (payload.userEmail?.includes('@gmail.') ? [{ provider: 'google', emailAddress: payload.userEmail }] : []),
        });
        setSavedAccounts(readSavedAccounts());
      } else {
        handleUpdate();
      }
    });
    const unsubCleared = (window as any).electronAPI?.onAuthCleared?.(() => {
      setCachedUser(null);
      setSavedAccounts(readSavedAccounts());
    });
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('mc-auth-state-changed', handleUpdate);
      unsub?.();
      unsubCleared?.();
    };
  }, [readCachedUser, readSavedAccounts]);

  // Request fresh SQLite accounts from backend on open
  React.useEffect(() => {
    if (isOpen && sendCommand) {
      sendCommand('get_user_accounts');
    }
  }, [isOpen, sendCommand]);

  // Synchronize backend SQLite accounts seamlessly into savedAccounts
  React.useEffect(() => {
    if (Array.isArray(state?.user_accounts) && state.user_accounts.length > 0) {
      setSavedAccounts((prev) => {
        const merged = [...state.user_accounts!];
        const seen = new Set(
          merged.map((a: any) =>
            `${(a.provider || '').toLowerCase().includes('discord') ? 'discord' : 'google'}:${(a.email || a.id || '').toLowerCase()}`
          )
        );
        for (const localAcc of prev) {
          const lKey = `${(localAcc.provider || '').toLowerCase().includes('discord') ? 'discord' : 'google'}:${(localAcc.email || localAcc.id || '').toLowerCase()}`;
          if (!seen.has(lKey)) {
            seen.add(lKey);
            merged.push(localAcc);
          }
        }
        try {
          localStorage.setItem('mc_saved_accounts', JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });
    }
  }, [state?.user_accounts]);

  const effectiveIsSignedIn = Boolean(isSignedIn || cachedUser);
  const effectiveUser = user || (cachedUser ? {
    id: cachedUser.id || 'guest-node',
    username: cachedUser.username || (cachedUser.email ? cachedUser.email.split('@')[0] : 'Guest'),
    firstName: cachedUser.firstName || (cachedUser.email ? cachedUser.email.split('@')[0] : 'Guest'),
    lastName: cachedUser.lastName || '',
    fullName: `${cachedUser.firstName || ''} ${cachedUser.lastName || ''}`.trim() || cachedUser.username || 'Guest',
    imageUrl: cachedUser.imageUrl || '',
    primaryEmailAddress: cachedUser.email ? { emailAddress: cachedUser.email } : undefined,
    emailAddresses: cachedUser.email ? [{ emailAddress: cachedUser.email }] : [],
    externalAccounts: cachedUser.externalAccounts || (cachedUser.email?.includes('@gmail.') ? [{ provider: 'google', emailAddress: cachedUser.email }] : []),
  } as any : null);

  const [switchingSessionId, setSwitchingSessionId] = useState<string | null>(null);
  const [isAddingEmailAccount, setIsAddingEmailAccount] = useState(false);
  const [emailIdentifier, setEmailIdentifier] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);

  // Isolate Google vs Discord avatar URLs to prevent cross-pollination
  const getCleanAvatarUrl = React.useCallback((acc: any, provider: string): string => {
    if (!acc) return '';
    const isDisc = (provider || '').toLowerCase().includes('discord');
    const extAccounts = [
      ...(acc.externalAccounts || []),
      ...(effectiveUser?.externalAccounts || []),
      ...(user?.externalAccounts || [])
    ];
    const googleExt = extAccounts.find((a: any) =>
      (a.provider || '').toLowerCase().includes('google') ||
      (a.verification?.strategy || '').toLowerCase().includes('google') ||
      (a.verificationStrategy || '').toLowerCase().includes('google')
    );
    const discordExt = extAccounts.find((a: any) =>
      (a.provider || '').toLowerCase().includes('discord') ||
      (a.verification?.strategy || '').toLowerCase().includes('discord') ||
      (a.verificationStrategy || '').toLowerCase().includes('discord')
    );

    if (isDisc) {
      // For Discord: prioritize Discord avatar from external account or cached Discord avatar, NEVER Google's imageUrl
      const candidate =
        (discordExt as any)?.avatarUrl ||
        (discordExt as any)?.avatar_url ||
        (discordExt?.imageUrl && !discordExt.imageUrl.includes('googleusercontent.com') ? discordExt.imageUrl : '') ||
        (acc?.avatarUrl && !acc.avatarUrl.includes('googleusercontent.com') ? acc.avatarUrl : '') ||
        (acc?.imageUrl && !acc.imageUrl.includes('googleusercontent.com') && ((acc?.provider || '').includes('discord') || acc.imageUrl.includes('discord')) ? acc.imageUrl : '') ||
        (typeof window !== 'undefined' ? localStorage.getItem('mc_discord_avatar') || '' : '');

      if (candidate && !candidate.includes('googleusercontent.com')) {
        try { localStorage.setItem('mc_discord_avatar', candidate); } catch (_) {}
        return candidate;
      }
      return '';
    } else {
      // For Google: call Google avatar from external account or primary image, NEVER Discord
      const candidate =
        googleExt?.imageUrl ||
        googleExt?.image_url ||
        (googleExt as any)?.avatarUrl ||
        (acc?.imageUrl && !acc.imageUrl.includes('discord') ? acc.imageUrl : '') ||
        (effectiveUser?.imageUrl && !effectiveUser.imageUrl.includes('discord') ? effectiveUser.imageUrl : '') ||
        (cachedUser?.imageUrl && !cachedUser.imageUrl.includes('discord') ? cachedUser.imageUrl : '') ||
        (typeof window !== 'undefined' ? localStorage.getItem('mc_google_avatar') || '' : '') ||
        '';
      if (candidate && !candidate.includes('discord')) {
        try { localStorage.setItem('mc_google_avatar', candidate); } catch (_) {}
        return candidate;
      }
      return '';
    }
  }, [effectiveUser, user, cachedUser]);

  // Retrieve signed-in sessions from Clerk client
  const sessions = clerk.client?.signedInSessions || [];
  const currentSessionId = clerk.session?.id;
  const otherSessions = sessions.filter((s) => s.id !== currentSessionId);

  // Extract active provider for display
  const rawStoredProvider =
    typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
      ? window.localStorage.getItem('mission_control_active_provider')
      : null;
  const normalizedActiveProvider = (() => {
    if (rawStoredProvider) return rawStoredProvider.replace('oauth_', '');
    if (cachedUser?.provider) return cachedUser.provider.replace('oauth_', '');
    if (effectiveUser?.provider) return effectiveUser.provider.replace('oauth_', '');
    return 'google';
  })();
  const activeExternalAccount =
    effectiveUser?.externalAccounts?.find(
      (a: any) => a.provider?.replace('oauth_', '') === normalizedActiveProvider
    ) || effectiveUser?.externalAccounts?.[0];

  // Unified available accounts combining Clerk multi-sessions and saved accounts in localStorage
  const availableAccounts = React.useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    const activeProvider = normalizedActiveProvider;
    const activeEmail = (effectiveUser?.primaryEmailAddress?.emailAddress || effectiveUser?.email || '').toLowerCase();
    const activeId = effectiveUser?.id;

    // Mark current active identity as seen so it's not duplicated in "Available Accounts"
    if (effectiveIsSignedIn) {
      if (activeEmail) seen.add(`${activeProvider}:${activeEmail}`);
      if (activeId) seen.add(`${activeProvider}:${activeId}`);
    }

    // 1. Clerk multi-sessions
    for (const s of otherSessions) {
      const u = s.user;
      if (!u) continue;
      const uProvider = u.externalAccounts?.some((a: any) => (a.provider || '').includes('discord'))
        ? 'discord'
        : 'google';
      const uemail = u.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
      const uid = u.id || s.id;
      const key = `${uProvider}:${uemail || uid}`;
      if (seen.has(key)) continue;
      seen.add(key);

      list.push({
        id: uid,
        sessionId: s.id,
        email: u.primaryEmailAddress?.emailAddress || '',
        username: u.username || u.firstName || 'Guest',
        fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Guest',
        imageUrl: getCleanAvatarUrl(u, uProvider),
        provider: uProvider === 'discord' ? 'oauth_discord' : 'oauth_google',
        externalAccounts: u.externalAccounts || [],
        isClerkSession: true,
      });
    }

    // 2. Saved accounts from localStorage
    for (const acc of savedAccounts) {
      if (!acc) continue;
      const accProvider = (acc.provider || '').toLowerCase().includes('discord') ? 'discord' : 'google';
      const uemail = acc.email ? acc.email.toLowerCase() : '';
      const uid = acc.id || '';
      const key = `${accProvider}:${uemail || uid}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const cleanImage = getCleanAvatarUrl(acc, accProvider);
      list.push({
        ...acc,
        provider: accProvider === 'discord' ? 'oauth_discord' : 'oauth_google',
        imageUrl: cleanImage,
        isClerkSession: Boolean(acc.sessionId && clerk.client?.signedInSessions?.some((s) => s.id === acc.sessionId)),
      });
    }

    return list;
  }, [otherSessions, savedAccounts, effectiveUser, effectiveIsSignedIn, normalizedActiveProvider, clerk.client?.signedInSessions, getCleanAvatarUrl]);

  // 1-Click Switch to an existing session or saved account
  const handleSwitchAccount = async (target: any) => {
    const targetSessionId = target.sessionId || target.id;
    if (switchingSessionId) return;
    setSwitchingSessionId(targetSessionId);
    setActionError(null);
    try {
      if (user?.id && sendCommand) {
        sendCommand('logout_user', { userId: user.id });
      }

      // If target has a matching Clerk session, set it as active
      const matchingSession = clerk.client?.signedInSessions?.find(
        (s: any) => s.id === target.sessionId || s.user?.id === target.id || s.user?.primaryEmailAddress?.emailAddress === target.email
      );
      if (matchingSession && clerk.setActive) {
        try {
          await clerk.setActive({ session: matchingSession.id });
        } catch (_) {}
      }

      // Activate target in localStorage
      localStorage.setItem('mc_authenticated_user', JSON.stringify(target));
      if (target.provider) {
        localStorage.setItem('mission_control_active_provider', target.provider);
      }
      if (target.token) {
        document.cookie = `__session=${target.token}; path=/; max-age=31536000`;
      }
      setCachedUser(target);
      window.dispatchEvent(new Event('mc-auth-state-changed'));

      if (sendCommand && target.id) {
        sendCommand('save_user_account', { account: target, isActive: true });
        sendCommand('set_active_user', {
          userId: target.id,
          email: target.email,
          provider: target.provider || (target.email?.includes('@gmail.') ? 'google' : 'discord'),
          username: target.username || target.firstName,
        });
        sendCommand('get_cached_games', { userId: target.id });
      }
      onClose();
    } catch (err: any) {
      console.error('[AccountSwitcher] Failed to switch account:', err);
      setActionError('Failed to switch to selected account.');
    } finally {
      setSwitchingSessionId(null);
    }
  };

  const handleRemoveSavedAccount = (targetId: string, targetEmail: string, targetProvider?: string) => {
    try {
      const targetProv = (targetProvider || '').toLowerCase().includes('discord') ? 'discord' : 'google';
      const targetKey = `${targetProv}:${(targetEmail || targetId).toLowerCase()}`;
      const updated = savedAccounts.filter((a) => {
        const aProv = (a.provider || (a.email?.includes('@gmail.') ? 'google' : 'discord')).toLowerCase().includes('discord') ? 'discord' : 'google';
        const aKey = `${aProv}:${(a.email || a.id).toLowerCase()}`;
        return aKey !== targetKey;
      });
      localStorage.setItem('mc_saved_accounts', JSON.stringify(updated));
      setSavedAccounts(updated);
      if (sendCommand) {
        sendCommand('remove_user_account', { key: targetKey, userId: targetId, email: targetEmail });
      }
    } catch (_) {}
  };

  // Sign in with OAuth (Google or Discord) to add / switch account using system browser
  const handleOAuthSwitch = async (strategy: 'oauth_google' | 'oauth_discord') => {
    setLoadingStrategy(strategy);
    setActionError(null);
    try {
      try {
        if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
          window.localStorage.setItem('mission_control_active_provider', strategy);
        }
      } catch (_) {}

      // Always launch system browser directly as requested
      if (window.electronAPI?.openBrowserAuth) {
        const res = await window.electronAPI.openBrowserAuth({
          strategy,
          mode: 'switch',
          reason: `account_switcher_${strategy}`,
        });
        setLoadingStrategy(null);
        if (!res?.success && res?.error) {
          setActionError(res.error);
        }
        return;
      }

      // Web browser fallback
      if (clerk.client?.signIn) {
        const origin = window.location.origin;
        const options: any = {
          strategy,
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/?browser_auth=1&auth_completed=1`,
        };
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('mc_restore_page', 'settings');
        }
        await clerk.client.signIn.authenticateWithRedirect(options);
      }
    } catch (err: any) {
      console.error('[AccountSwitcher] OAuth switch failed:', err);
      setActionError(err.errors?.[0]?.longMessage || 'OAuth authentication failed.');
      setLoadingStrategy(null);
    }
  };

  // Traditional Email/Password Sign-In to add / switch account
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn || isSubmittingEmail) return;
    setIsSubmittingEmail(true);
    setActionError(null);

    try {
      const result = await signIn.create({
        identifier: emailIdentifier,
        password: emailPassword
      });

      if (result.status === 'complete') {
        if (user?.id && sendCommand) {
          sendCommand('logout_user', { userId: user.id });
        }
        await clerk.setActive({ session: result.createdSessionId });
        setEmailIdentifier('');
        setEmailPassword('');
        setIsAddingEmailAccount(false);
        onClose();
      } else {
        setActionError('Additional verification required for this account.');
      }
    } catch (err: any) {
      console.error('[AccountSwitcher] Email login failed:', err);
      setActionError(err.errors?.[0]?.longMessage || 'Invalid credentials.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Clean, non-destructive Sign-Out
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setActionError(null);
    try {
      if ((effectiveUser?.id || user?.id) && sendCommand) {
        sendCommand('logout_user', { userId: effectiveUser?.id || user?.id });
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
        await clerk.signOut();
      } catch (_) {}
      onClose();
    } catch (err: any) {
      console.error('[AccountSwitcher] Sign-out failed:', err);
      setActionError('Sign out failed. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-lg bg-[#0b0d13] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-1/4 w-48 h-48 bg-neon-green/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-neon-yellow/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Account Gateway
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-normal">
                      Identity Selector
                    </span>
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                    Switch between profiles, link a new gateway, or manage sessions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 relative z-10 custom-scrollbar pr-1">
              {/* Action Error Banner */}
              {actionError && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-2">
                  <span>{actionError}</span>
                  <button
                    type="button"
                    onClick={() => setActionError(null)}
                    className="text-red-400/80 hover:text-red-400 text-xs font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* SECTION 1: Active Identity */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Active Identity
                </span>
                {effectiveIsSignedIn && effectiveUser ? (
                  <div className="p-4 rounded-2xl bg-black/40 border border-neon-green/30 shadow-[0_0_20px_rgba(118,185,0,0.06)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const activeCleanAvatar = getCleanAvatarUrl(
                          { ...effectiveUser, externalAccounts: effectiveUser.externalAccounts || (activeExternalAccount ? [activeExternalAccount] : []) },
                          normalizedActiveProvider
                        );
                        if (activeCleanAvatar) {
                          return (
                            <img
                              src={activeCleanAvatar}
                              alt="Active Avatar"
                              className="w-10 h-10 rounded-xl border border-neon-green/40 object-cover shrink-0"
                            />
                          );
                        }
                        if (normalizedActiveProvider === 'discord') {
                          return (
                            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shrink-0">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                              </svg>
                            </div>
                          );
                        }
                        return (
                          <div className="w-10 h-10 rounded-xl bg-neon-green/20 border border-neon-green/40 flex items-center justify-center font-black text-neon-green text-sm shrink-0">
                            {effectiveUser.firstName?.[0] || effectiveUser.username?.[0] || 'U'}
                          </div>
                        );
                      })()}
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white truncate">
                            {effectiveUser.fullName ||
                              activeExternalAccount?.username ||
                              effectiveUser.username ||
                              (effectiveUser.firstName ? `${effectiveUser.firstName} ${effectiveUser.lastName || ''}`.trim() : 'Guest User')}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/15 border border-neon-green/30 text-[8px] font-black uppercase text-neon-green tracking-widest shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                            Active
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {effectiveUser.primaryEmailAddress?.emailAddress ||
                            effectiveUser.email ||
                            activeExternalAccount?.emailAddress ||
                            `via ${normalizedActiveProvider}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[8px] font-mono uppercase px-2 py-1 rounded-lg border block ${
                        normalizedActiveProvider === 'discord'
                          ? 'bg-[#5865F2]/15 border-[#5865F2]/30 text-[#5865F2]'
                          : 'bg-white/5 border-white/10 text-zinc-400'
                      }`}>
                        {normalizedActiveProvider.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Guest Mode</span>
                        <span className="text-[10px] text-zinc-500">
                          Browsing anonymously. Sign in to link telemetry.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Other Signed-in Profiles & Saved Accounts (Multi-Account) */}
              {availableAccounts.length > 0 && (
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                    Available Accounts ({availableAccounts.length})
                  </span>
                  <div className="space-y-2">
                    {availableAccounts.map((acc) => {
                      const isSwitching = switchingSessionId === (acc.sessionId || acc.id);
                      const isDiscord = (acc.provider || '').toLowerCase().includes('discord');
                      const providerLabel = isDiscord ? 'DISCORD' : 'GOOGLE';
                      const accAvatarUrl = getCleanAvatarUrl(acc, acc.provider || (isDiscord ? 'discord' : 'google'));

                      // Match name across saved profiles or effective user
                      const matchedName = savedAccounts.find(
                        (s) => (s.fullName && s.fullName !== 'Guest') && ((s.email && s.email === acc.email) || (s.id && s.id === acc.id))
                      )?.fullName || (effectiveUser?.fullName !== 'Guest' ? effectiveUser?.fullName : null);

                      const displayName = (acc.fullName && acc.fullName !== 'Guest')
                        ? acc.fullName
                        : (acc.firstName && acc.firstName !== 'Guest'
                            ? `${acc.firstName} ${acc.lastName || ''}`.trim()
                            : (matchedName || acc.username || 'Guest'));

                      const displaySub = isDiscord && acc.username && acc.email && acc.username !== acc.email
                        ? `@${acc.username} · ${acc.email}`
                        : (acc.email || (isDiscord ? 'Discord Account' : 'Authenticated User'));

                      return (
                        <div
                          key={`${acc.provider || 'acc'}:${acc.id || acc.sessionId || acc.email}`}
                          className="p-3.5 rounded-2xl bg-black/30 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {accAvatarUrl ? (
                              <img
                                src={accAvatarUrl}
                                alt="Account Avatar"
                                className="w-8 h-8 rounded-lg border border-white/10 object-cover shrink-0"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                                isDiscord
                                  ? 'bg-[#5865F2]/20 border-[#5865F2]/40 text-[#5865F2]'
                                  : 'bg-white/5 border-white/10 text-zinc-400 font-bold text-xs'
                              }`}
                              style={{ display: accAvatarUrl ? 'none' : 'flex' }}
                            >
                              {isDiscord ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                              ) : (
                                acc.firstName?.[0] || acc.username?.[0] || 'U'
                              )}
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black text-white truncate">
                                  {displayName}
                                </span>
                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                                  isDiscord ? 'bg-[#5865F2]/15 border-[#5865F2]/30 text-[#5865F2]' : 'bg-white/5 border-white/10 text-zinc-400'
                                }`}>
                                  {providerLabel}
                                </span>
                              </div>
                              <span className="text-[9px] text-zinc-500 truncate">
                                {displaySub}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={isSwitching}
                              onClick={() => handleSwitchAccount(acc)}
                              className="px-3 py-1.5 rounded-xl bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 text-neon-green font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isSwitching ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Switching...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Switch</span>
                                </>
                              )}
                            </button>

                            {!acc.isClerkSession && (
                              <button
                                type="button"
                                title="Remove saved account"
                                onClick={() => handleRemoveSavedAccount(acc.id, acc.email, acc.provider)}
                                className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: Connect Another Account / Switch Account */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  {isSignedIn ? 'Switch to Another Account' : 'Sign In with Provider'}
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Google OAuth */}
                  <button
                    type="button"
                    disabled={loadingStrategy !== null}
                    onClick={() => handleOAuthSwitch('oauth_google')}
                    className="p-3 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 text-white font-black text-[10px] uppercase tracking-wider cursor-pointer group disabled:opacity-50"
                  >
                    {loadingStrategy === 'oauth_google' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-neon-green" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                        />
                      </svg>
                    )}
                    <span>Google</span>
                  </button>

                  {/* Discord OAuth */}
                  <button
                    type="button"
                    disabled={loadingStrategy !== null}
                    onClick={() => handleOAuthSwitch('oauth_discord')}
                    className="p-3 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5 text-white font-black text-[10px] uppercase tracking-wider cursor-pointer group disabled:opacity-50"
                  >
                    {loadingStrategy === 'oauth_discord' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#5865F2]" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                    )}
                    <span>Discord</span>
                  </button>
                </div>

                {/* Inline Email credentials toggle */}
                <div className="mt-2.5">
                  {!isAddingEmailAccount ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingEmailAccount(true)}
                      className="w-full py-2.5 px-3 rounded-2xl bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white font-medium text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Use Email & Password</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleEmailSignIn}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-neon-green flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          Email Sign In
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingEmailAccount(false)}
                          className="text-zinc-500 hover:text-zinc-300 text-[9px] font-bold uppercase"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type="email"
                          required
                          value={emailIdentifier}
                          onChange={(e) => setEmailIdentifier(e.target.value)}
                          placeholder="gamer@domain.com"
                          className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-neon-green/50 font-mono"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type="password"
                          required
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-neon-green/50 font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingEmail}
                        className="w-full py-2 rounded-xl bg-neon-green/20 hover:bg-neon-green/30 border border-neon-green/40 text-neon-green font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingEmail ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-3 h-3" />
                            <span>Sign In & Switch</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Footer / Clean Sign Out Option */}
            {effectiveIsSignedIn && (
              <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between gap-3 relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate?.('settings', { category: 'account' });
                  }}
                  className="text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Manage Gateways</span>
                </button>

                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <LogOut className="w-3 h-3" />
                  )}
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
