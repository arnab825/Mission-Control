import React from 'react';
import { AlertTriangle, Globe, ExternalLink } from 'lucide-react';

interface AuthPopupHandlerViewProps {
  authPopupError: string | null;
  onRetry: () => void;
  failsafeCountdown: number | null;
  strategy: 'oauth_google' | 'oauth_discord';
  mode: string;
}

export const AuthPopupHandlerView: React.FC<AuthPopupHandlerViewProps> = ({
  authPopupError,
  onRetry,
  failsafeCountdown,
  strategy,
  mode,
}) => {
  const strategyName = strategy === 'oauth_discord' ? 'Discord' : 'Google';
  const isDiscord = strategy === 'oauth_discord';
  const brandColor = isDiscord ? '#5865F2' : '#76B900';
  const brandGlow = isDiscord ? 'rgba(88, 101, 242, 0.25)' : 'rgba(118, 185, 0, 0.25)';

  const handleClosePopup = () => {
    if ((window as any).electronAPI?.closeAuthPopup) {
      (window as any).electronAPI.closeAuthPopup();
    }
    try {
      window.close();
    } catch (_) {}
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
                (window as any).electronAPI?.openBrowserAuth?.({
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
              onClick={onRetry}
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
};
