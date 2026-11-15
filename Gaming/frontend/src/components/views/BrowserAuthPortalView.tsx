import React from 'react';
import { Loader2, Sparkles, Globe, AlertTriangle } from 'lucide-react';

interface BrowserAuthPortalViewProps {
  clerk: any;
  user: any;
  isSignedIn: boolean;
  isAuthCompleted: boolean;
  browserAuthError: string | null;
  browserAuthLoading: string | null;
  handleBrowserOAuth: (strategy: 'oauth_google' | 'oauth_discord') => void;
}

export const BrowserAuthPortalView: React.FC<BrowserAuthPortalViewProps> = ({
  clerk,
  user,
  isSignedIn,
  isAuthCompleted,
  browserAuthError,
  browserAuthLoading,
  handleBrowserOAuth,
}) => {
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
};
