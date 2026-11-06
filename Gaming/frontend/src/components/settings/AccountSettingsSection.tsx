import React, { useState, useEffect, useRef } from 'react';
import { useUser, useAuth, useReverification } from '@clerk/clerk-react';
import { KeyRound, Fingerprint, Calendar, Shield, Copy, Check, Link, Trash2, AlertTriangle, X, LogOut } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { OAUTH_PROVIDERS } from '../../data/settingsConstants';
import { AccountSwitcherModal } from '../AccountSwitcherModal';

interface AccountSettingsSectionProps {
  searchQuery?: string;
  localConfig?: any;
  sendCommand: (command: string, data?: any) => void;
  accountDeleted?: boolean;
  accountDeleteError?: string | null;
  state?: any;
}

export const AccountSettingsSection: React.FC<AccountSettingsSectionProps> = ({
  searchQuery = '',
  localConfig,
  sendCommand,
  accountDeleted,
  accountDeleteError,
  state,
}) => {
  const { user } = useUser();
  const { userId, signOut, isSignedIn, getToken } = useAuth();

  const readCachedUser = React.useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem('mc_authenticated_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const [cachedUser, setCachedUser] = useState<any>(readCachedUser);

  useEffect(() => {
    const handleUpdate = () => setCachedUser(readCachedUser());
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('mc-auth-state-changed', handleUpdate);
    const unsub = (window as any).electronAPI?.onAuthCompleted?.((payload?: any) => {
      if (payload?.userEmail || payload?.userId || payload?.sessionId) {
        setCachedUser((prev: any) => {
          const isPrevReal = prev?.email && !prev.email.includes('missioncontrol.app');
          const isIncomingReal = payload.userEmail && !payload.userEmail.includes('missioncontrol.app');
          if (isPrevReal && !isIncomingReal) {
            return { ...prev, sessionId: payload.sessionId || prev.sessionId };
          }
          return {
            id: payload.userId || '',
            email: payload.userEmail || '',
            username: payload.username || (payload.userEmail ? payload.userEmail.split('@')[0] : 'Operative'),
            firstName: payload.firstName || 'Operative',
            lastName: payload.lastName || '',
            imageUrl: payload.imageUrl || '',
            sessionId: payload.sessionId || '',
            externalAccounts: payload.externalAccounts || [],
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
    username: cachedUser.username || (cachedUser.email ? cachedUser.email.split('@')[0] : 'Operative'),
    firstName: cachedUser.firstName || (cachedUser.email ? cachedUser.email.split('@')[0] : 'Operative'),
    fullName: `${cachedUser.firstName || ''} ${cachedUser.lastName || ''}`.trim() || cachedUser.username || 'Operative',
    lastName: cachedUser.lastName || '',
    imageUrl: cachedUser.imageUrl || '',
    createdAt: cachedUser.createdAt || cachedUser.lastActive,
    primaryEmailAddress: cachedUser.email ? { emailAddress: cachedUser.email } : undefined,
    emailAddresses: cachedUser.email ? [{ emailAddress: cachedUser.email }] : [],
    externalAccounts: cachedUser.externalAccounts || (cachedUser.email?.includes('@gmail.') ? [{ provider: 'google', emailAddress: cachedUser.email }] : []),
    provider: cachedUser.provider || (cachedUser.email?.includes('@gmail.') ? 'google' : undefined),
  } as any : null);

  const [activeProviderState, setActiveProviderState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('mission_control_active_provider');
      if (stored) return stored.replace('oauth_', '');
    }
    return (cachedUser?.email?.toLowerCase().includes('@gmail.') ? 'google' : 'google');
  });

  const rawActiveProvider = typeof window !== 'undefined' ? window.localStorage?.getItem('mission_control_active_provider') : null;

  // Resolve the single true active provider cleanly with local state taking immediate precedence
  const resolvedActiveProvider = React.useMemo(() => {
    if (activeProviderState) return activeProviderState.replace('oauth_', '');
    if (rawActiveProvider) return rawActiveProvider.replace('oauth_', '');
    if (cachedUser?.provider) return cachedUser.provider.replace('oauth_', '');
    if (effectiveUser?.provider) return effectiveUser.provider.replace('oauth_', '');
    return 'google';
  }, [activeProviderState, rawActiveProvider, cachedUser?.provider, effectiveUser?.provider]);

  // Sync active external account for identical avatar rendering with Sidebar
  const normalizedActiveProvider = resolvedActiveProvider;
  const allExtAccounts = [
    ...(user?.externalAccounts || []),
    ...(cachedUser?.externalAccounts || []),
    ...(effectiveUser?.externalAccounts || [])
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

  const avatarUrl = (() => {
    const isDisc = normalizedActiveProvider.includes('discord');

    if (isDisc) {
      // For Discord: call Discord avatar from external account, NEVER Google's effectiveUser.imageUrl
      return discordExt?.imageUrl || (discordExt as any)?.avatarUrl || (cachedUser?.provider?.includes('discord') ? cachedUser?.imageUrl : '') || '';
    } else {
      // For Google: call Google avatar from external account or primary image
      return googleExt?.imageUrl || (googleExt as any)?.avatarUrl || effectiveUser?.imageUrl || cachedUser?.imageUrl || '';
    }
  })();

  const handleSwitchToProvider = async (strategy: string) => {
    const providerKey = strategy.replace('oauth_', '');
    const strategyFull = `oauth_${providerKey}`;

    // Update local state immediately for instant responsive UI feedback
    setActiveProviderState(providerKey);

    // 1. Check if we have a saved account in mc_saved_accounts specifically for this provider
    let matchingSavedAccount: any = null;
    try {
      const raw = localStorage.getItem('mc_saved_accounts');
      const list = raw ? JSON.parse(raw) : [];
      matchingSavedAccount = list.find(
        (a: any) => (a.provider || '').toLowerCase().replace('oauth_', '') === providerKey
      );
    } catch (_) {}

    // 2. Check if current user has an external account for this provider
    const targetExtAcc = effectiveUser?.externalAccounts?.find(
      (a: any) =>
        (a.provider || '').toLowerCase().includes(providerKey) ||
        (a.verification?.strategy || '').toLowerCase().includes(providerKey) ||
        (a.verificationStrategy || '').toLowerCase().includes(providerKey)
    );

    if (matchingSavedAccount) {
      try {
        const target = {
          ...matchingSavedAccount,
          provider: providerKey,
        };
        localStorage.setItem('mc_authenticated_user', JSON.stringify(target));
        localStorage.setItem('mission_control_active_provider', strategyFull);
        if (target.token) {
          document.cookie = `__session=${target.token}; path=/; max-age=31536000`;
        }
        setCachedUser(target);
        window.dispatchEvent(new Event('mc-auth-state-changed'));

        if (sendCommand && target.id) {
          sendCommand('set_active_user', {
            userId: target.id,
            email: target.email,
            provider: providerKey,
            username: target.username || target.firstName,
          });
          sendCommand('get_cached_games', { userId: target.id });
        }
        return;
      } catch (err) {
        console.error('Failed to switch to saved account:', err);
      }
    }

    if (targetExtAcc || effectiveUser?.id) {
      try {
        const providerAvatar =
          targetExtAcc?.imageUrl ||
          targetExtAcc?.avatarUrl ||
          (providerKey === 'google' && !effectiveUser?.imageUrl?.includes('discordapp.com') ? effectiveUser?.imageUrl : '') ||
          (providerKey === 'discord' && effectiveUser?.imageUrl?.includes('discordapp.com') ? effectiveUser?.imageUrl : '') ||
          '';

        const updatedUser = {
          ...(cachedUser || {}),
          id: effectiveUser.id,
          email: targetExtAcc?.emailAddress || effectiveUser.primaryEmailAddress?.emailAddress || effectiveUser.email,
          username: targetExtAcc?.username || effectiveUser.username,
          firstName: targetExtAcc?.firstName || effectiveUser.firstName,
          lastName: targetExtAcc?.lastName || effectiveUser.lastName,
          imageUrl: providerAvatar,
          provider: providerKey,
        };
        localStorage.setItem('mc_authenticated_user', JSON.stringify(updatedUser));
        localStorage.setItem('mission_control_active_provider', strategyFull);
        setCachedUser(updatedUser);
        window.dispatchEvent(new Event('mc-auth-state-changed'));

        if (sendCommand && effectiveUser.id) {
          sendCommand('set_active_user', {
            userId: effectiveUser.id,
            email: updatedUser.email,
            provider: providerKey,
            username: updatedUser.username,
          });
        }
        return;
      } catch (err) {
        console.error('Failed to switch provider on active user:', err);
      }
    }

    // 3. Otherwise, trigger browser auth to link or authenticate this provider
    await handleLinkProvider(strategyFull);
  };

  // Proactively synchronize active user to Python backend pipeline if not synced
  useEffect(() => {
    if (effectiveUser?.id && sendCommand && (!state?.active_user_id || state?.active_user_id !== effectiveUser.id)) {
      sendCommand('set_active_user', {
        userId: effectiveUser.id,
        email: effectiveUser.primaryEmailAddress?.emailAddress || effectiveUser.email || '',
        provider: resolvedActiveProvider,
        username: effectiveUser.username || effectiveUser.firstName || '',
      });
    }
  }, [effectiveUser?.id, state?.active_user_id, sendCommand, resolvedActiveProvider]);

  const [copiedId, setCopiedId] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const accountErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss account error after 8 seconds
  useEffect(() => {
    if (accountError) {
      if (accountErrorTimerRef.current) clearTimeout(accountErrorTimerRef.current);
      accountErrorTimerRef.current = setTimeout(() => setAccountError(null), 8000);
    }
    return () => {
      if (accountErrorTimerRef.current) clearTimeout(accountErrorTimerRef.current);
    };
  }, [accountError]);

  useEffect(() => {
    if (accountDeleted === true) {
      setIsDeleting(false);
      signOut();
    } else if (accountDeleted === false && accountDeleteError) {
      setIsDeleting(false);
      setDeleteError(accountDeleteError);
    }
  }, [accountDeleted, accountDeleteError, signOut]);

  if (!effectiveIsSignedIn || !effectiveUser) {
    return (
      <>
        <SettingsSection
          searchQuery={searchQuery}
          title="Linked Account"
          icon={KeyRound}
          searchTerms="account profile login auth clerk user google discord"
        >
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
            <p className="text-xs text-zinc-400 font-medium">
              You are currently browsing in guest mode. Sign in to link accounts and sync your game telemetry.
            </p>
            <button
              type="button"
              onClick={() => setIsAccountSwitcherOpen(true)}
              className="mt-3 px-4 py-2 bg-neon-green/20 border border-neon-green/40 text-neon-green font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-neon-green/30 transition-all cursor-pointer"
            >
              Sign In / Connect
            </button>
          </div>
        </SettingsSection>
        <AccountSwitcherModal
          isOpen={isAccountSwitcherOpen}
          onClose={() => setIsAccountSwitcherOpen(false)}
          sendCommand={sendCommand}
        />
      </>
    );
  }

  const reverifiedDestroy = useReverification(async (account: any) => {
    return await account.destroy();
  });
  const reverifiedCreateExternalAccount = useReverification(async (options: any) => {
    return await user?.createExternalAccount(options);
  });

  const handleSwitchAccount = () => {
    setIsAccountSwitcherOpen(true);
  };

  const handleReauthenticate = async () => {
    setAccountError(null);
    setNeedsReauth(false);
    const primaryProvider = user?.externalAccounts?.[0]?.provider?.replace('oauth_', '') || 'google';
    const strategy = primaryProvider === 'discord' ? 'oauth_discord' : 'oauth_google';
    if ((window as any).electronAPI?.openAuthPopup) {
      await (window as any).electronAPI.openAuthPopup({ strategy, mode: 'login' });
    } else {
      await signOut();
    }
  };

  const handleLinkProvider = async (strategy: string) => {
    setLinkingProvider(strategy);
    setAccountError(null);
    setNeedsReauth(false);

    try {
      if ((window as any).electronAPI?.openBrowserAuth) {
        try {
          localStorage.setItem('mission_control_active_provider', strategy);
        } catch (_) {}
        const res = await (window as any).electronAPI.openBrowserAuth({
          strategy,
          mode: 'link',
          reason: 'settings_connect_provider',
        });
        setLinkingProvider(null);
        if (!res?.success && res?.error) {
          setAccountError(res.error);
        }
        return;
      }

      if (!user) {
        setLinkingProvider(null);
        return;
      }

      const options: any = {
        strategy: strategy as any,
        redirectUrl: `${window.location.origin}/sso-callback?popup=1`,
      };

      // Attempt creation wrapped with Clerk step-up reverification
      let extAccount: any;
      try {
        extAccount = await reverifiedCreateExternalAccount(options);
      } catch (firstErr: any) {
        const firstMsg = firstErr.errors?.[0]?.longMessage || firstErr.message || '';
        if (firstMsg.toLowerCase().includes('additional verification') || firstMsg.toLowerCase().includes('reverification')) {
          try {
            await user.reload();
            await getToken({ skipCache: true });
            extAccount = await user.createExternalAccount(options);
          } catch (retryErr: any) {
            console.error('Failed to link provider (retry):', retryErr);
            throw retryErr;
          }
        } else {
          throw firstErr;
        }
      }

      const verification = (extAccount as any)?.verification;
      const redirectUrl =
        verification?.externalVerificationRedirectURL?.toString() ||
        verification?.externalVerificationRedirectUrl?.toString();

      if (redirectUrl) {
        if ((window as any).electronAPI?.openAuthPopupUrl) {
          // Listen for completion or popup closing without prematurely reloading the main window
          let unsubSuccess: (() => void) | undefined;
          let unsubClosed: (() => void) | undefined;

          const cleanupListeners = () => {
            unsubSuccess?.();
            unsubClosed?.();
          };

          unsubSuccess = (window as any).electronAPI?.onAuthCompleted?.(async () => {
            cleanupListeners();
            try {
              await user.reload();
            } catch (_) {}
            setLinkingProvider(null);
          });

          unsubClosed = (window as any).electronAPI?.onAuthPopupClosed?.(async () => {
            cleanupListeners();
            try {
              await user.reload();
            } catch (_) {}
            setLinkingProvider(null);
          });

          const res = await (window as any).electronAPI.openAuthPopupUrl(redirectUrl.toString());
          if (!res?.success && res?.error && res.error !== 'cancelled') {
            setAccountError(res.error);
            setLinkingProvider(null);
          }
        } else {
          window.location.href = redirectUrl.toString();
        }
      } else {
        setAccountError('OAuth flow initialization succeeded, but the redirect URL was missing from Clerk.');
        setLinkingProvider(null);
      }
    } catch (err: any) {
      console.error('Failed to link provider:', err);
      const msg = err.errors?.[0]?.longMessage || err.message || 'OAuth connection initiation failed.';
      if (msg.toLowerCase().includes('additional verification') || msg.toLowerCase().includes('reverification')) {
        setAccountError(
          'Security verification required: To connect a new authentication provider, Clerk requires a fresh session.'
        );
        setNeedsReauth(true);
      } else {
        setAccountError(msg);
      }
      setLinkingProvider(null);
    }
  };

  const handleUnlinkProvider = async (strategy: string) => {
    if (!user) return;
    const providerKey = strategy.replace('oauth_', '');
    const extAcc = user.externalAccounts.find((acc: any) => acc.provider === providerKey);
    if (!extAcc) return;

    const hasPassword = (user as any).passwordEnabled;
    if (user.externalAccounts.length <= 1 && !hasPassword) {
      setAccountError(
        'Security constraint: You cannot disconnect your only login method. Please register a password or add another provider first.'
      );
      setNeedsReauth(false);
      return;
    }

    setUnlinkingProvider(strategy);
    setAccountError(null);
    setNeedsReauth(false);

    try {
      try {
        await reverifiedDestroy(extAcc);
      } catch (err: any) {
        const msg = err.errors?.[0]?.longMessage || err.message || '';
        if (msg.toLowerCase().includes('additional verification') || msg.toLowerCase().includes('reverification')) {
          await user.reload();
          await getToken({ skipCache: true });
          const freshExtAcc = user.externalAccounts.find((acc: any) => acc.provider === providerKey);
          if (freshExtAcc) {
            await freshExtAcc.destroy();
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      await user.reload();
    } catch (err: any) {
      console.error('Failed to unlink provider:', err);
      const msg = err.errors?.[0]?.longMessage || err.message || 'Failed to disconnect account.';

      if (msg.toLowerCase().includes('additional verification') || msg.toLowerCase().includes('reverification')) {
        setAccountError(
          'Session verification required: Your current session needs to be refreshed before disconnecting a provider.'
        );
        setNeedsReauth(true);
      } else {
        setAccountError(msg);
      }
    } finally {
      setUnlinkingProvider(null);
    }
  };

  return (
    <>
      <SettingsSection
      searchQuery={searchQuery}
      title="Linked Account"
      icon={KeyRound}
      searchTerms="account clerk user id profile oauth google discord signout delete danger registry gateway"
    >
      {/* Identity block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white/5 border border-white/15 rounded-2xl p-3.5 sm:p-4 shadow-[0_0_15px_rgba(118,185,0,0.03)] overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div
            className="shrink-0 cursor-pointer group/avatar relative"
            onClick={() => setIsAccountSwitcherOpen(true)}
            title="Switch or Manage Account"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                className="w-10 h-10 rounded-xl border border-neon-green/30 object-cover shadow-[0_0_12px_rgba(118,185,0,0.15)] group-hover/avatar:border-neon-green/60 transition-all"
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
              className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center font-black text-xs text-neon-green shadow-[0_0_12px_rgba(118,185,0,0.15)]"
              style={{ display: avatarUrl ? 'none' : 'flex' }}
            >
              {(effectiveUser?.firstName?.[0] || effectiveUser?.username?.[0] || 'U').toUpperCase()}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs font-black text-white uppercase tracking-wider truncate">
                {effectiveUser?.fullName || effectiveUser?.firstName || effectiveUser?.username || 'Anonymous'}
              </p>
              <span className="h-1.5 w-1.5 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" />
            </div>
            <p className="text-[10px] font-mono text-zinc-500 truncate" title={effectiveUser?.primaryEmailAddress?.emailAddress || effectiveUser?.emailAddresses?.[0]?.emailAddress || effectiveUser?.id}>
              {effectiveUser?.primaryEmailAddress?.emailAddress || effectiveUser?.emailAddresses?.[0]?.emailAddress || effectiveUser?.id}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t border-white/5 sm:border-0 w-full sm:w-auto shrink-0 flex-wrap">
          <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            <span className="text-[8px] font-black uppercase text-zinc-300 tracking-wider">
              {resolvedActiveProvider.toUpperCase()} GATEWAY
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 shadow-[0_0_15px_rgba(191,255,0,0.1)]">
            <span className="text-[8px] font-black uppercase text-neon-yellow tracking-widest whitespace-nowrap">
              Active Node
            </span>
          </div>
          <button
            aria-label="Sign Out"
            type="button"
            onClick={async () => {
              if (effectiveUser?.id && sendCommand) {
                sendCommand('logout_user', { userId: effectiveUser.id });
              }
              setCachedUser(null);
              try {
                localStorage.removeItem('mc_authenticated_user');
                localStorage.removeItem('mission_control_active_provider');
                document.cookie = '__session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = '__client_uat=0; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                window.dispatchEvent(new Event('mc-auth-state-changed'));
              } catch (_) {}
              if ((window as any).electronAPI?.clearAuth) {
                try {
                  await (window as any).electronAPI.clearAuth();
                } catch (_) {}
              }
              try {
                await signOut();
              } catch (_) {}
            }}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-4">
        {/* Node Registration ID */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between h-full relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Node Registry ID
            </span>
            <Fingerprint className="w-3.5 h-3.5 text-neon-green/70 shrink-0" />
          </div>
          <div className="flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 mt-2 min-w-0">
            <span className="text-[10px] font-mono text-neon-green truncate flex-1 min-w-0" title={effectiveUser.id}>
              {effectiveUser.id}
            </span>
            <button
              aria-label="Copy ID"
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(effectiveUser.id);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
              }}
              className="p-1 hover:bg-white/5 rounded-lg transition-all text-zinc-400 hover:text-white shrink-0"
              title="Copy ID"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-neon-yellow animate-bounce" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Registration Timestamp */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between h-full hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Activation Date
            </span>
            <Calendar className="w-3.5 h-3.5 text-neon-yellow/70" />
          </div>
          <div className="mt-2">
            <span className="text-[11px] font-mono font-bold text-white">
              {effectiveUser.createdAt
                ? new Date(effectiveUser.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Active Telemetry'}
            </span>
            <p className="text-[9px] text-zinc-500 font-medium mt-1">Telemetry initialized</p>
          </div>
        </div>

        {/* Security Shield */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Gateway Integrity
            </span>
            <Shield
              className={`w-3.5 h-3.5 ${
                localConfig?.privacy?.enabled ? 'text-neon-yellow/70' : 'text-zinc-500/70'
              }`}
            />
          </div>
          <div className="mt-2">
            <span
              className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                localConfig?.privacy?.enabled ? 'text-neon-yellow' : 'text-zinc-500'
              }`}
            >
              {localConfig?.privacy?.enabled ? 'AES-256 E2EE' : 'STANDARD SECURE'}
            </span>
            <p className="text-[9px] text-zinc-500 font-medium mt-1">
              {localConfig?.privacy?.enabled ? 'Neural gateway encrypted' : 'Encryption bypassed'}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Identity Gateways */}
      <div className="border-t border-white/4 pt-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-neon-green uppercase tracking-widest mb-1">
              Identity & Authentication Gateways
            </p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Link secondary multi-factor authentication providers to authenticate on other systems or sign in securely.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              aria-label="Switch Account"
              type="button"
              onClick={handleSwitchAccount}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all whitespace-nowrap shrink-0"
            >
              Switch Account
            </button>
          </div>
        </div>

        {/* Inline account error banner */}
        {accountError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.1)] animate-[fadeIn_0.2s_ease-out]">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 pt-0.5 space-y-2.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-0.5">
                  Security Gateway Notice
                </p>
                <p className="text-[11px] font-medium text-red-200/90 leading-relaxed">
                  {accountError}
                </p>
              </div>
              {needsReauth && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleReauthenticate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    <KeyRound className="w-3 h-3" />
                    Re-verify Session
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountError(null);
                      setNeedsReauth(false);
                      handleSwitchAccount();
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                  >
                    Switch Account
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setAccountError(null);
                      setNeedsReauth(false);
                      await signOut();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => { setAccountError(null); setNeedsReauth(false); }}
              className="p-1 rounded-lg hover:bg-red-500/15 text-red-400/60 hover:text-red-300 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {OAUTH_PROVIDERS.map((provider) => {
            const providerKey = provider.id.replace('oauth_', '');
            const isGoogle = providerKey === 'google';
            const isDiscord = providerKey === 'discord';

            const hasSavedAccount = (typeof window !== 'undefined')
              ? (() => {
                  try {
                    const raw = localStorage.getItem('mc_saved_accounts');
                    const list = raw ? JSON.parse(raw) : [];
                    return list.some((a: any) => (a.provider || '').toLowerCase().replace('oauth_', '') === providerKey);
                  } catch (_) { return false; }
                })()
              : false;

            const extAcc = effectiveUser?.externalAccounts?.find(
              (acc: any) =>
                (acc.provider || '').toLowerCase().includes(providerKey) ||
                (acc.verification?.strategy || '').toLowerCase().includes(providerKey) ||
                (acc.verificationStrategy || '').toLowerCase().includes(providerKey)
            );

            const isCurrentlyActive = (providerKey === resolvedActiveProvider);
            const isConnected = Boolean(
              extAcc ||
              hasSavedAccount ||
              isCurrentlyActive ||
              (isGoogle && (effectiveUser?.provider === 'google' || effectiveUser?.provider === 'oauth_google')) ||
              (isDiscord && (effectiveUser?.provider === 'discord' || effectiveUser?.provider === 'oauth_discord'))
            );
            const isUnlinking = unlinkingProvider === provider.id;
            const isLinking = linkingProvider === provider.id;
            const canUnlink = Boolean(
              extAcc &&
                user &&
                ((user.externalAccounts?.length || 0) > 1 || (user as any).passwordEnabled)
            );

            return (
              <div
                key={provider.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border transition-all ${
                  isCurrentlyActive
                    ? 'border-neon-yellow/30 shadow-[0_0_15px_rgba(191,255,0,0.05)]'
                    : isConnected
                    ? 'border-white/10 hover:border-white/20'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 bg-white/5 ${
                      isCurrentlyActive
                        ? 'text-neon-yellow border-neon-yellow/40'
                        : isConnected
                        ? 'text-white border-white/20'
                        : 'text-zinc-400 border-white/10'
                    }`}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{provider.name}</span>
                      {isConnected && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase border ${
                          isCurrentlyActive
                            ? 'bg-neon-yellow/10 border-neon-yellow/30 text-neon-yellow'
                            : 'bg-white/5 border-white/10 text-zinc-400'
                        }`}>
                          {isCurrentlyActive ? 'Active' : 'Connected'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      {isCurrentlyActive
                        ? extAcc?.emailAddress ||
                          extAcc?.username ||
                          effectiveUser?.primaryEmailAddress?.emailAddress ||
                          effectiveUser?.email ||
                          'Active Primary Gateway'
                        : isConnected
                        ? `Connected profile — click to switch`
                        : `Connect your secure ${provider.name} profile`}
                    </p>
                  </div>
                </div>

                <div>
                  {isCurrentlyActive ? (
                    canUnlink ? (
                      <button
                        aria-label="Unlink Account"
                        type="button"
                        onClick={() => handleUnlinkProvider(provider.id)}
                        disabled={isUnlinking || isLinking}
                        className="w-full sm:w-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isUnlinking ? (
                          <span className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            Unlinking...
                          </span>
                        ) : (
                          'Unlink Account'
                        )}
                      </button>
                    ) : (
                      <div className="w-full sm:w-auto px-4 py-2 bg-neon-yellow/10 border border-neon-yellow/30 text-neon-yellow font-black text-[9px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(191,255,0,0.1)]">
                        <Check className="w-3.5 h-3.5 text-neon-yellow" />
                        <span>Active Gateway</span>
                      </div>
                    )
                  ) : isConnected ? (
                    <button
                      aria-label="Switch to Provider"
                      type="button"
                      onClick={() => handleSwitchToProvider(provider.id)}
                      className="w-full sm:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Use as Active
                    </button>
                  ) : (
                    <button
                      aria-label="Connect Provider"
                      type="button"
                      onClick={() => handleLinkProvider(provider.id)}
                      disabled={isUnlinking || isLinking}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r ${provider.color} font-black text-[9px] uppercase tracking-widest rounded-xl transition-all border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                    >
                      {isLinking ? (
                        <span className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 border border-current/30 border-t-current rounded-full animate-spin" />
                          Connecting...
                        </span>
                      ) : (
                        <>
                          <Link className="w-3 h-3" />
                          Connect
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div className="border-t border-white/4 pt-6 space-y-4">
        <div>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Danger Zone</p>
          <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
            Permanently delete your account and all associated game library data from our servers. This action cannot be undone.
          </p>
        </div>

        {!showDeleteConfirm ? (
          <button
            aria-label="Delete My Account"
            type="button"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteInput('');
              setDeleteError(null);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete My Account
          </button>
        ) : (
          <div className="bg-red-950/30 border border-red-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-1">
                  Confirm Deletion
                </p>
                <p className="text-[10px] font-medium text-zinc-400 leading-relaxed">
                  This will permanently erase your game library from Supabase and delete your Clerk account. Type{' '}
                  <span className="font-mono font-black text-red-400">DELETE</span> to confirm.
                </p>
              </div>
            </div>

            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full bg-black/50 border border-red-500/30 focus:border-red-500/60 rounded-xl py-2.5 px-4 text-xs font-mono text-red-300 placeholder-red-900 focus:outline-none transition-colors"
              autoFocus
            />

            {deleteError && (
              <p className="text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                aria-label="Cancel"
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-2 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                aria-label="Confirm Delete"
                type="button"
                onClick={() => {
                  const targetUserId = userId || effectiveUser?.id;
                  if (deleteInput !== 'DELETE' || !targetUserId) return;
                  setIsDeleting(true);
                  setDeleteError(null);
                  sendCommand('delete_account', { userId: targetUserId });
                }}
                disabled={deleteInput !== 'DELETE' || isDeleting}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>

    <AccountSwitcherModal
      isOpen={isAccountSwitcherOpen}
      onClose={() => setIsAccountSwitcherOpen(false)}
      sendCommand={sendCommand}
    />
    </>
  );
};
