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
} from 'lucide-react';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  sendCommand?: (type: string, payload?: any) => void;
  onNavigate?: (page: string, options?: any) => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  sendCommand,
  onNavigate
}) => {
  const { user, isSignedIn } = useUser();
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();

  const [switchingSessionId, setSwitchingSessionId] = useState<string | null>(null);
  const [isAddingEmailAccount, setIsAddingEmailAccount] = useState(false);
  const [emailIdentifier, setEmailIdentifier] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);

  // Retrieve signed-in sessions from Clerk client
  const sessions = clerk.client?.signedInSessions || [];
  const currentSessionId = clerk.session?.id;
  const otherSessions = sessions.filter((s) => s.id !== currentSessionId);

  // Listen for auth events from Electron popup so modal closes seamlessly
  React.useEffect(() => {
    if (!isOpen) return;

    const unsubCompleted = window.electronAPI?.onAuthCompleted?.(() => {
      setLoadingStrategy(null);
      onClose();
    });

    const unsubClosed = window.electronAPI?.onAuthPopupClosed?.(() => {
      setLoadingStrategy(null);
    });

    return () => {
      unsubCompleted?.();
      unsubClosed?.();
    };
  }, [isOpen, onClose]);

  // Extract active provider for display
  const activeProvider =
    typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
      ? window.localStorage.getItem('mission_control_active_provider')
      : null;
  const normalizedActiveProvider = activeProvider?.replace('oauth_', '') || null;
  const activeExternalAccount =
    user?.externalAccounts?.find(
      (a) => a.provider?.replace('oauth_', '') === normalizedActiveProvider
    ) || user?.externalAccounts?.[0];

  // 1-Click Switch to an existing session
  const handleSwitchSession = async (sessionId: string, targetUserId: string) => {
    if (switchingSessionId || !clerk.setActive) return;
    setSwitchingSessionId(sessionId);
    setActionError(null);
    try {
      if (user?.id && sendCommand) {
        sendCommand('logout_user', { userId: user.id });
      }
      await clerk.setActive({ session: sessionId });
      if (sendCommand && targetUserId) {
        sendCommand('get_cached_games', { userId: targetUserId });
      }
      onClose();
    } catch (err: any) {
      console.error('[AccountSwitcher] Failed to switch session:', err);
      setActionError(err.errors?.[0]?.longMessage || 'Failed to switch to selected session.');
    } finally {
      setSwitchingSessionId(null);
    }
  };

  // Sign in with OAuth (Google or Discord) to add / switch account
  const handleOAuthSwitch = async (strategy: 'oauth_google' | 'oauth_discord') => {
    setLoadingStrategy(strategy);
    setActionError(null);
    try {
      try {
        if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
          window.localStorage.setItem('mission_control_active_provider', strategy);
        }
      } catch (_) {}

      // Fast-path: Check if current account already has this provider linked
      const isAlreadyLinked = user?.externalAccounts?.some(
        (acc: any) =>
          acc.provider === strategy ||
          acc.verification?.strategy === strategy ||
          acc.provider?.replace('oauth_', '') === strategy.replace('oauth_', '')
      );

      if (isAlreadyLinked) {
        console.log(`[AccountSwitcher] Strategy ${strategy} is already linked. Fast-switching active profile.`);
        setLoadingStrategy(null);
        onClose();
        return;
      }

      // If signed in, link account directly via user.createExternalAccount without intermediate local screen
      if (isSignedIn && user) {
        try {
          const options: any = {
            strategy,
            redirectUrl: `${window.location.origin}/sso-callback?popup=1`,
          };
          if (strategy === 'oauth_google') {
            options.additionalData = { prompt: 'select_account' };
          } else if (strategy === 'oauth_discord') {
            options.additionalData = { prompt: 'consent' };
          }

          console.log(`[AccountSwitcher] Requesting external account creation URL for ${strategy}...`);
          const extAccount = await user.createExternalAccount(options);
          const verification = (extAccount as any)?.verification;
          const redirectUrl =
            verification?.externalVerificationRedirectURL?.toString() ||
            verification?.externalVerificationRedirectUrl?.toString();

          if (redirectUrl) {
            console.log(`[AccountSwitcher] Direct redirectUrl obtained. Opening popup window directly to provider.`);
            if (window.electronAPI?.openAuthPopupUrl) {
              const res = await window.electronAPI.openAuthPopupUrl(redirectUrl);
              setLoadingStrategy(null);
              if (!res?.success && res?.error && res.error !== 'cancelled') {
                setActionError(res.error);
              }
              return;
            } else {
              window.location.href = redirectUrl;
              return;
            }
          }
        } catch (linkErr: any) {
          console.warn('[AccountSwitcher] Direct linking returned error, checking if switch is required:', linkErr);
          const msg = linkErr.errors?.[0]?.longMessage || linkErr.message || '';
          if (
            msg.toLowerCase().includes('already exists') ||
            msg.toLowerCase().includes('belong') ||
            msg.toLowerCase().includes('conflict') ||
            msg.toLowerCase().includes('taken')
          ) {
            // Provider is tied to another user -> sign out and open auth popup to login with that user
            await clerk.signOut();
            if (window.electronAPI?.openAuthPopup) {
              const res = await window.electronAPI.openAuthPopup({ strategy, mode: 'login' });
              setLoadingStrategy(null);
              if (!res?.success && res?.error && res.error !== 'cancelled') {
                setActionError(res.error);
              }
              return;
            }
          } else if (msg.toLowerCase().includes('additional verification')) {
            setActionError('Security Lock Active: To connect this provider, please log out, log back in, and try again.');
            setLoadingStrategy(null);
            return;
          } else {
            setActionError(msg || 'Failed to initiate account linking.');
            setLoadingStrategy(null);
            return;
          }
        }
      }

      // Default Electron popup flow (e.g. not signed in or fallback)
      if (window.electronAPI?.openAuthPopup) {
        const res = await window.electronAPI.openAuthPopup({
          strategy,
          mode: 'login',
        });
        if (!res?.success) {
          setLoadingStrategy(null);
          if (res?.error && res.error !== 'cancelled') {
            setActionError(res.error);
          }
        }
        return;
      }

      // Web browser fallback
      if (clerk.client?.signIn) {
        const origin = window.location.origin;
        const options: any = {
          strategy,
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/`,
        };
        if (strategy === 'oauth_google') {
          options.additionalData = { prompt: 'select_account' };
          options.customOAuthOptions = { prompt: 'select_account' };
        } else if (strategy === 'oauth_discord') {
          options.additionalData = { prompt: 'consent' };
          options.customOAuthOptions = { prompt: 'consent' };
        }
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
      if (user?.id && sendCommand) {
        sendCommand('logout_user', { userId: user.id });
      }
      try {
        if (typeof window !== 'undefined' && typeof window.localStorage?.removeItem === 'function') {
          window.localStorage.removeItem('mission_control_active_provider');
        }
      } catch (_) {}
      await clerk.signOut();
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
                {isSignedIn && user ? (
                  <div className="p-4 rounded-2xl bg-black/40 border border-neon-green/30 shadow-[0_0_20px_rgba(118,185,0,0.06)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {activeExternalAccount?.imageUrl || user.imageUrl ? (
                        <img
                          src={activeExternalAccount?.imageUrl || user.imageUrl}
                          alt="Active Avatar"
                          className="w-10 h-10 rounded-xl border border-neon-green/40 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neon-green/20 border border-neon-green/40 flex items-center justify-center font-black text-neon-green text-sm shrink-0">
                          {user.firstName?.[0] || user.username?.[0] || 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white truncate">
                            {activeExternalAccount?.username ||
                              user.username ||
                              (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Node Connected')}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/15 border border-neon-green/30 text-[8px] font-black uppercase text-neon-green tracking-widest shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                            Active
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {activeExternalAccount?.emailAddress ||
                            user.primaryEmailAddress?.emailAddress ||
                            `via ${activeExternalAccount?.provider?.replace('oauth_', '') || 'sso'}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[8px] font-mono uppercase px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 block">
                        {activeExternalAccount?.provider?.replace('oauth_', '').toUpperCase() || 'PRIMARY'}
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

              {/* SECTION 2: Other Signed-in Profiles (Multi-Session) */}
              {otherSessions.length > 0 && (
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                    Available Sessions ({otherSessions.length})
                  </span>
                  <div className="space-y-2">
                    {otherSessions.map((s) => {
                      const sessionUser = s.user;
                      const isSwitching = switchingSessionId === s.id;
                      return (
                        <div
                          key={s.id}
                          className="p-3.5 rounded-2xl bg-black/30 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {sessionUser?.imageUrl ? (
                              <img
                                src={sessionUser.imageUrl}
                                alt="Session Avatar"
                                className="w-8 h-8 rounded-lg border border-white/10 object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 font-bold text-xs shrink-0">
                                {sessionUser?.firstName?.[0] || sessionUser?.username?.[0] || 'U'}
                              </div>
                            )}
                            <div className="min-w-0 flex flex-col">
                              <span className="text-[11px] font-black text-white truncate">
                                {sessionUser?.username ||
                                  (sessionUser?.firstName
                                    ? `${sessionUser.firstName} ${sessionUser.lastName || ''}`.trim()
                                    : 'Saved Account')}
                              </span>
                              <span className="text-[9px] text-zinc-500 truncate">
                                {sessionUser?.primaryEmailAddress?.emailAddress || 'Authenticated'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isSwitching}
                            onClick={() => handleSwitchSession(s.id, sessionUser?.id || '')}
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: Connect Another Account / Switch Account */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Switch to Another Account
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
            {isSignedIn && (
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
