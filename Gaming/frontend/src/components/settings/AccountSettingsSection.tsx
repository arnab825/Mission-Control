import React, { useState, useEffect, useRef } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
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
}

export const AccountSettingsSection: React.FC<AccountSettingsSectionProps> = ({
  searchQuery = '',
  localConfig,
  sendCommand,
  accountDeleted,
  accountDeleteError,
}) => {
  const { user } = useUser();
  const { userId, signOut, isSignedIn, getToken } = useAuth();

  const [copiedId, setCopiedId] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const unlinkErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss unlink error after 6 seconds
  useEffect(() => {
    if (unlinkError) {
      if (unlinkErrorTimerRef.current) clearTimeout(unlinkErrorTimerRef.current);
      unlinkErrorTimerRef.current = setTimeout(() => setUnlinkError(null), 6000);
    }
    return () => {
      if (unlinkErrorTimerRef.current) clearTimeout(unlinkErrorTimerRef.current);
    };
  }, [unlinkError]);

  useEffect(() => {
    if (accountDeleted === true) {
      setIsDeleting(false);
      signOut();
    } else if (accountDeleted === false && accountDeleteError) {
      setIsDeleting(false);
      setDeleteError(accountDeleteError);
    }
  }, [accountDeleted, accountDeleteError, signOut]);

  if (!isSignedIn || !user) {
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

  const handleSwitchAccount = () => {
    setIsAccountSwitcherOpen(true);
  };

  const handleLinkProvider = async (strategy: string) => {
    if (!user) return;
    setLinkingProvider(strategy);
    try {
      const options: any = {
        strategy: strategy as any,
        redirectUrl: `${window.location.origin}/sso-callback?popup=1`,
      };
      if (strategy === 'oauth_google') {
        options.additionalData = { prompt: 'select_account' };
      } else if (strategy === 'oauth_discord') {
        options.additionalData = { prompt: 'consent' };
      }
      const extAccount = await user.createExternalAccount(options);

      const verification = (extAccount as any)?.verification;
      const redirectUrl =
        verification?.externalVerificationRedirectURL?.toString() ||
        verification?.externalVerificationRedirectUrl?.toString();

      if (redirectUrl) {
        if ((window as any).electronAPI?.openAuthPopupUrl) {
          const res = await (window as any).electronAPI.openAuthPopupUrl(redirectUrl.toString());
          if (res?.success) {
            window.location.reload();
          }
        } else {
          window.location.href = redirectUrl.toString();
        }
      } else {
        alert('OAuth flow initialization succeeded, but redirect URL was missing.');
      }
    } catch (err: any) {
      console.error('Failed to link provider:', err);
      const msg = err.errors?.[0]?.longMessage || 'OAuth connection initiation failed.';
      if (msg.toLowerCase().includes('additional verification')) {
        alert(
          'Security Lock Active:\n\nTo link a new authentication gateway, Clerk requires a fresh session. Please log out, log back in, and try connecting this provider again.'
        );
      } else {
        alert(msg);
      }
    } finally {
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
      setUnlinkError(
        'Security constraint: You cannot disconnect your only login method. Please register a password or add another provider first.'
      );
      setNeedsReauth(false);
      return;
    }

    setUnlinkingProvider(strategy);
    setUnlinkError(null);
    setNeedsReauth(false);

    // Force a fresh session token before attempting the sensitive operation
    try {
      await getToken({ skipCache: true });
    } catch (_) {
      // Token refresh failed silently — proceed anyway and let destroy() report the real error
    }

    try {
      await extAcc.destroy();
      await user.reload();
    } catch (err: any) {
      console.error('Failed to unlink provider (attempt 1):', err);
      const msg = err.errors?.[0]?.longMessage || 'Failed to disconnect account.';

      if (msg.toLowerCase().includes('additional verification')) {
        // Auto-retry: reload user to get a fresh object, refresh token, then retry destroy()
        try {
          await user.reload();
          await getToken({ skipCache: true });
          const freshExtAcc = user.externalAccounts.find((acc: any) => acc.provider === providerKey);
          if (freshExtAcc) {
            await freshExtAcc.destroy();
            await user.reload();
            return; // Retry succeeded
          }
        } catch (retryErr: any) {
          console.error('Failed to unlink provider (retry):', retryErr);
        }
        // Both attempts failed — show error with re-auth action
        setUnlinkError(
          'Session verification required. Your current session needs to be refreshed before unlinking a provider.'
        );
        setNeedsReauth(true);
      } else {
        setUnlinkError(msg);
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
      <div className="flex items-center justify-between gap-4 bg-white/5 border border-white/15 rounded-2xl p-4 shadow-[0_0_15px_rgba(118,185,0,0.03)]">
        <div className="flex items-center gap-4">
          <UserButton
            userProfileMode="modal"
            appearance={{
              elements: {
                userButtonAvatarBox:
                  'w-12 h-12 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]',
                userButtonPopoverCard:
                  'bg-zinc-950/95 border border-white/10 backdrop-blur-xl shadow-2xl',
                userButtonPopoverActionButton:
                  'hover:bg-white/10 text-zinc-300 hover:text-white transition-colors',
                userButtonPopoverActionButtonText: 'text-xs font-semibold',
                userButtonPopoverFooter: 'border-t border-white/10',
                userPreviewMainIdentifier: 'text-white font-bold',
                userPreviewSecondaryIdentifier: 'text-zinc-400 font-mono text-xs',
              },
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-black text-white uppercase tracking-wider">
                {user.fullName || user.firstName || 'Anonymous'}
              </p>
              <span className="h-1.5 w-1.5 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
              {user.primaryEmailAddress?.emailAddress || userId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 shadow-[0_0_15px_rgba(191,255,0,0.1)]">
            <span className="text-[8px] font-black uppercase text-neon-yellow tracking-widest">
              Active Node
            </span>
          </div>
          <button
            aria-label="Sign Out"
            type="button"
            onClick={async () => {
              if (userId && sendCommand) {
                sendCommand('logout_user', { userId });
              }
              try {
                if (typeof window !== 'undefined' && typeof window.localStorage?.removeItem === 'function') {
                  window.localStorage.removeItem('mission_control_active_provider');
                }
              } catch (_) {}
              await signOut();
            }}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Node Registration ID */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Node Registry ID
            </span>
            <Fingerprint className="w-3.5 h-3.5 text-neon-green/70" />
          </div>
          <div className="flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 mt-2">
            <span className="text-[10px] font-mono text-neon-green truncate max-w-30" title={user.id}>
              {user.id}
            </span>
            <button
              aria-label="Copy ID"
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(user.id);
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
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Activation Date
            </span>
            <Calendar className="w-3.5 h-3.5 text-neon-yellow/70" />
          </div>
          <div className="mt-2">
            <span className="text-[11px] font-mono font-bold text-white">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
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
          <button
            aria-label="Switch Account"
            type="button"
            onClick={handleSwitchAccount}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all whitespace-nowrap shrink-0"
          >
            Switch Account
          </button>
        </div>

        {/* Inline unlink error banner */}
        {unlinkError && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-950/40 border border-red-500/25 animate-[fadeIn_0.2s_ease-out]">
            <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="flex-1 pt-0.5 space-y-2">
              <p className="text-[10px] font-medium text-red-300/90 leading-relaxed">
                {unlinkError}
              </p>
              {needsReauth && (
                <button
                  type="button"
                  onClick={async () => {
                    setUnlinkError(null);
                    setNeedsReauth(false);
                    await signOut();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Sign Out & Re-authenticate
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => { setUnlinkError(null); setNeedsReauth(false); }}
              className="p-1 rounded-lg hover:bg-red-500/15 text-red-400/60 hover:text-red-300 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {OAUTH_PROVIDERS.map((provider) => {
            const providerKey = provider.id.replace('oauth_', '');
            const extAcc = user.externalAccounts.find((acc: any) => acc.provider === providerKey);
            const isConnected = !!extAcc;
            const isUnlinking = unlinkingProvider === provider.id;
            const isLinking = linkingProvider === provider.id;

            return (
              <div
                key={provider.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border transition-all ${
                  isConnected
                    ? 'border-neon-yellow/20 hover:border-neon-yellow/30 shadow-[0_0_15px_rgba(191,255,0,0.02)]'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 bg-white/5 ${
                      isConnected
                        ? 'text-neon-yellow border-neon-yellow/30'
                        : 'text-zinc-400 border-white/10'
                    }`}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{provider.name}</span>
                      {isConnected && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow tracking-wider uppercase">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      {isConnected
                        ? extAcc.emailAddress || extAcc.username || 'Authorized Gateway'
                        : `Connect your secure ${provider.name} profile`}
                    </p>
                  </div>
                </div>

                <div>
                  {isConnected ? (
                    <button
                      aria-label="Unlink Account"
                      type="button"
                      onClick={() => handleUnlinkProvider(provider.id)}
                      disabled={isUnlinking || isLinking}
                      className="w-full sm:w-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <button
                      aria-label="Connect Provider"
                      type="button"
                      onClick={() => handleLinkProvider(provider.id)}
                      disabled={isUnlinking || isLinking}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r ${provider.color} font-black text-[9px] uppercase tracking-widest rounded-xl transition-all border disabled:opacity-40 disabled:cursor-not-allowed`}
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
                  if (deleteInput !== 'DELETE' || !userId) return;
                  setIsDeleting(true);
                  setDeleteError(null);
                  sendCommand('delete_account', { userId });
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
