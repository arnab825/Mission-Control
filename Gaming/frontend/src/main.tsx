import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useClerk } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'
import { missionControlClerkTheme } from './styles/clerkTheme'
import { ThemeProvider } from './context/ThemeContext'

// Catch global window errors and unhandled promise rejections so they are printed to the console.
// Electron captures web console messages and writes them to the main app log.
window.addEventListener('error', (event) => {
  console.error('[Web Global Error]', event.error?.stack || event.error?.message || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Web Unhandled Rejection]', event.reason?.stack || event.reason?.message || event.reason);
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Robustly extracts user profile data across all camelCase (Clerk SDK) and snake_case (raw JSON) properties.
 */
function extractClerkUserData(clerkInstance: any, directUser?: any) {
  const client = clerkInstance?.client;
  const activeSession =
    clerkInstance?.session ||
    client?.sessions?.[0] ||
    (client as any)?.signedInSessions?.[0];

  const sessId = activeSession?.id || client?.lastActiveSessionId || '';
  const rawUser =
    directUser ||
    clerkInstance?.user ||
    activeSession?.user ||
    (client as any)?.users?.[0] ||
    client?.sessions?.[0]?.user;

  const email =
    rawUser?.primaryEmailAddress?.emailAddress ||
    rawUser?.emailAddresses?.[0]?.emailAddress ||
    rawUser?.email_addresses?.[0]?.email_address ||
    rawUser?.primary_email_address?.email_address ||
    rawUser?.email ||
    rawUser?.emailAddress ||
    '';

  const username =
    rawUser?.username ||
    rawUser?.user_name ||
    rawUser?.name ||
    (email ? email.split('@')[0] : 'Operative');

  const firstName =
    rawUser?.firstName ||
    rawUser?.first_name ||
    (username ? username.split(' ')[0] : 'Operative');

  const lastName =
    rawUser?.lastName ||
    rawUser?.last_name ||
    '';

  const externalAccounts =
    rawUser?.externalAccounts ||
    rawUser?.external_accounts ||
    [];

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const hashParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)) : null;
  const storedProvider = typeof window !== 'undefined' ? window.localStorage?.getItem('mission_control_active_provider') : null;
  const strategyParam = urlParams?.get('strategy') || hashParams?.get('strategy') || storedProvider || '';
  const isDisc = strategyParam.toLowerCase().includes('discord');

  const discordExt = externalAccounts.find((a: any) =>
    (a.provider || '').toLowerCase().includes('discord') ||
    (a.verification?.strategy || '').toLowerCase().includes('discord')
  );
  const googleExt = externalAccounts.find((a: any) =>
    (a.provider || '').toLowerCase().includes('google') ||
    (a.verification?.strategy || '').toLowerCase().includes('google')
  );

  let avatarUrl = '';
  if (isDisc) {
    avatarUrl =
      (discordExt as any)?.avatarUrl ||
      (discordExt as any)?.avatar_url ||
      (discordExt?.imageUrl && !discordExt.imageUrl.includes('googleusercontent.com') ? discordExt.imageUrl : '') ||
      '';
    if (avatarUrl && typeof window !== 'undefined') {
      try { localStorage.setItem('mc_discord_avatar', avatarUrl); } catch (_) {}
    }
  } else {
    avatarUrl =
      googleExt?.imageUrl ||
      googleExt?.image_url ||
      (googleExt as any)?.avatarUrl ||
      (rawUser?.imageUrl && !rawUser.imageUrl.includes('discord') ? rawUser.imageUrl : '') ||
      '';
    if (avatarUrl && typeof window !== 'undefined') {
      try { localStorage.setItem('mc_google_avatar', avatarUrl); } catch (_) {}
    }
  }

  const userId =
    rawUser?.id ||
    rawUser?.userId ||
    rawUser?.user_id ||
    '';

  return {
    sessionId: sessId,
    userId,
    userEmail: email,
    username,
    firstName,
    lastName,
    imageUrl: avatarUrl || (isDisc ? '' : (rawUser?.imageUrl || '')),
    avatarUrl,
    provider: isDisc ? 'oauth_discord' : 'oauth_google',
    externalAccounts,
  };
}

/**
 * Handles the OAuth callback route (/sso-callback).
 * Explicitly resolves the Clerk handshake promise, provides instant visual feedback,
 * and notifies Electron to close the popup seamlessly.
 */
const SSOCallback: React.FC = () => {
  const isPopup =
    Boolean(window.electronAPI?.isAuthPopup) ||
    (typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('popup') === '1' ||
        new URLSearchParams(window.location.search).get('auth_popup') === '1'));
  const clerk = useClerk();
  const [authStatus, setAuthStatus] = React.useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isCancelled = false;

    // Check for error parameters in the query or hash (e.g. user cancelled on provider page)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlError =
      urlParams.get('error') ||
      urlParams.get('error_description') ||
      hashParams.get('error') ||
      hashParams.get('error_description');

    if (urlError) {
      console.warn('[SSOCallback] OAuth error or cancellation reported in URL:', urlError);
      setAuthStatus('error');
      setErrorMessage(urlError);
      if (isPopup && window.electronAPI?.closeAuthPopup) {
        setTimeout(() => window.electronAPI?.closeAuthPopup?.(), 1200);
      }
      return;
    }

    const syncToDesktop = async (payload: any) => {
      if (!payload) return;
      try {
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
      } catch (_) {}
    };

    const processHandshake = async () => {
      try {
        console.log('[SSOCallback] Finalizing OAuth redirect handshake...');
        await (clerk as any).handleRedirectCallback({
          customNavigate: () => {},
          fallbackRedirectUrl: '/?browser_auth=1&auth_completed=1',
          signInFallbackRedirectUrl: '/?browser_auth=1&auth_completed=1',
          signUpFallbackRedirectUrl: '/?browser_auth=1&auth_completed=1',
          afterSignInUrl: '/?browser_auth=1&auth_completed=1',
          afterSignUpUrl: '/?browser_auth=1&auth_completed=1',
        });

        if (isCancelled) return;
        console.log('[SSOCallback] OAuth handshake succeeded!');
        setAuthStatus('success');

        // Reload Clerk client to pull freshly created session and user records from Clerk API
        let client = clerk.client;
        try {
          if (clerk.client?.reload) {
            client = await clerk.client.reload();
          }
        } catch (e) {
          console.warn('[SSOCallback] client.reload warning:', e);
        }

        const activeSession =
          clerk.session ||
          client?.sessions?.[0] ||
          (client as any)?.signedInSessions?.[0];

        // Activate session in current browser context
        if (activeSession && clerk.setActive) {
          try {
            await clerk.setActive({ session: activeSession.id });
          } catch (_) {}
        }

        // Wait up to 3 seconds for user profile data (email, name, avatar) to hydrate
        let userFields = extractClerkUserData(clerk);
        for (let i = 0; i < 10; i++) {
          if (userFields.userEmail || userFields.userId) break;
          await new Promise((r) => setTimeout(r, 250));
          try {
            if (clerk.client?.reload) {
              client = await clerk.client.reload();
            }
          } catch (_) {}
          userFields = extractClerkUserData(clerk);
        }

        const token = await (activeSession?.getToken?.() || clerk.session?.getToken?.());

        const payload = {
          ...userFields,
          token,
          storage: { ...window.localStorage },
          cookies: document.cookie,
        };

        if (isPopup) {
          if (window.electronAPI?.notifyAuthSuccess) {
            window.electronAPI.notifyAuthSuccess(payload);
          }
          if (window.electronAPI?.closeAuthPopup) {
            window.electronAPI.closeAuthPopup();
          }
          try {
            window.close();
          } catch (_) { }
        } else {
          await syncToDesktop(payload);
          try {
            const fullName = `${userFields.firstName} ${userFields.lastName}`.trim() || userFields.username;
            const extAccountsParam = userFields.externalAccounts ? `&external_accounts=${encodeURIComponent(JSON.stringify(userFields.externalAccounts))}` : '';
            const deepLinkUrl = `mission-control://auth-completed?session_id=${encodeURIComponent(userFields.sessionId)}&user_id=${encodeURIComponent(userFields.userId)}&email=${encodeURIComponent(userFields.userEmail)}&username=${encodeURIComponent(userFields.username)}&name=${encodeURIComponent(fullName)}&image_url=${encodeURIComponent(userFields.imageUrl)}&provider=${encodeURIComponent(userFields.provider || 'oauth_google')}${extAccountsParam}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
            window.location.href = deepLinkUrl;
          } catch (_) {}
          window.location.replace('/?browser_auth=1&auth_completed=1');
        }
      } catch (err: any) {
        console.warn('[SSOCallback] handleRedirectCallback returned exception:', err);
        if (isCancelled) return;

        // If a session is already present or was created despite warning, treat as successful
        if (clerk.session || clerk.client?.lastActiveSessionId) {
          console.log('[SSOCallback] Active session confirmed, proceeding as success.');
          setAuthStatus('success');
          try {
            if (clerk.client?.reload) {
              await clerk.client.reload();
            }
          } catch (_) {}

          const userFields = extractClerkUserData(clerk);
          const activeSession =
            clerk.session ||
            clerk.client?.sessions?.[0] ||
            (clerk.client as any)?.signedInSessions?.[0];
          const token = await (activeSession?.getToken?.() || clerk.session?.getToken?.());

          const payload = {
            ...userFields,
            token,
            storage: { ...window.localStorage },
            cookies: document.cookie,
          };

          if (isPopup) {
            if (window.electronAPI?.notifyAuthSuccess) {
              window.electronAPI.notifyAuthSuccess(payload);
            }
            if (window.electronAPI?.closeAuthPopup) {
              window.electronAPI.closeAuthPopup();
            }
            try {
              window.close();
            } catch (_) { }
          } else {
            await syncToDesktop(payload);
            try {
              const fullName = `${userFields.firstName} ${userFields.lastName}`.trim() || userFields.username;
              const extAccountsParam = userFields.externalAccounts ? `&external_accounts=${encodeURIComponent(JSON.stringify(userFields.externalAccounts))}` : '';
              const deepLinkUrl = `mission-control://auth-completed?session_id=${encodeURIComponent(userFields.sessionId)}&user_id=${encodeURIComponent(userFields.userId)}&email=${encodeURIComponent(userFields.userEmail)}&username=${encodeURIComponent(userFields.username)}&name=${encodeURIComponent(fullName)}&image_url=${encodeURIComponent(userFields.imageUrl)}&provider=${encodeURIComponent(userFields.provider || 'oauth_google')}${extAccountsParam}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
              window.location.href = deepLinkUrl;
            } catch (_) {}
            window.location.replace('/?browser_auth=1&auth_completed=1');
          }
          return;
        }

        setAuthStatus('error');
        setErrorMessage(
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Authentication verification failed. Please try again.'
        );
      }
    };

    if (clerk.loaded) {
      processHandshake();
    }

    return () => {
      isCancelled = true;
    };
  }, [clerk, isPopup, clerk.loaded]);

  const handleCancel = () => {
    if (isPopup && window.electronAPI?.closeAuthPopup) {
      window.electronAPI.closeAuthPopup();
    } else {
      window.location.replace('/?auth_cancelled=1');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050505',
        color: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: '16px',
        padding: '24px',
        userSelect: 'none',
      }}
    >
      {authStatus === 'success' ? (
        <>
          <div
            style={{
              position: 'relative',
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                backgroundColor: 'rgba(118, 185, 0, 0.15)',
                border: '2px solid #76b900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(118, 185, 0, 0.3)',
              }}
            >
              <svg
                style={{ width: 32, height: 32, color: '#76b900' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              margin: 0,
            }}
          >
            Authentication Successful
          </p>
          <p style={{ fontSize: 11, color: '#71717a', margin: 0 }}>
            Closing window and returning to Mission Control…
          </p>
        </>
      ) : authStatus === 'error' ? (
        <>
          <div
            style={{
              position: 'relative',
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                style={{ width: 32, height: 32, color: '#ef4444' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            Handshake Incomplete
          </p>
          <p
            style={{
              fontSize: 11,
              color: '#a1a1aa',
              maxWidth: 360,
              textAlign: 'center',
              margin: '4px 0 0 0',
              lineHeight: 1.5,
            }}
          >
            {errorMessage || 'Authentication handshake could not be completed.'}
          </p>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              marginTop: '12px',
              padding: '8px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            Close Window
          </button>
        </>
      ) : (
        <>
          {/* Animated spinner with App Logo */}
          <div
            style={{
              position: 'relative',
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(118, 185, 0, 0.15)',
                borderTopColor: '#76b900',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <img src="/logo.png" style={{ width: 32, height: 32, objectFit: 'contain' }} alt="Mission Control Logo" />
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#52525b',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              margin: 0,
            }}
          >
            Verifying Identity…
          </p>

          <button
            type="button"
            onClick={handleCancel}
            style={{
              marginTop: '12px',
              padding: '8px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              color: '#a1a1aa',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            {isPopup ? 'Close Window' : 'Cancel & Return to App'}
          </button>
        </>
      )}
    </div>
  );
};

const MainRouter: React.FC = () => {
  const [pathname, setPathname] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handleUrlChange = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  return pathname === '/sso-callback' ? <SSOCallback /> : <App />;
};

if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <div style={{ color: '#f4f4f5', backgroundColor: '#090a0f', padding: '32px', fontFamily: 'monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '640px', padding: '32px', border: '1px solid rgba(118, 185, 0, 0.4)', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', boxShadow: '0 0 40px rgba(118, 185, 0, 0.15)' }}>
        <div style={{ display: 'inline-block', color: '#76b900', border: '1px solid rgba(118, 185, 0, 0.3)', borderRadius: '9999px', padding: '4px 14px', fontSize: '11px', fontWeight: 'bold', marginBottom: '16px', letterSpacing: '0.1em' }}>
          DEVELOPER ENVIRONMENT SETUP
        </div>
        <h1 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em' }}>
          VITE_CLERK_PUBLISHABLE_KEY Not Found
        </h1>
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.6' }}>
          To run the app locally, copy the template and configure your free test key:
        </p>
        <div style={{ backgroundColor: '#000000', padding: '14px 18px', borderRadius: '8px', border: '1px solid #27272a', textAlign: 'left', fontSize: '12px', color: '#76b900', marginBottom: '20px', overflowX: 'auto' }}>
          <code>cp Gaming/frontend/.env.example Gaming/frontend/.env</code>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#71717a' }}>
          Get a 100% free development key at <a href="https://clerk.com" target="_blank" rel="noreferrer" style={{ color: '#76b900', textDecoration: 'underline' }}>clerk.com</a>. Production secrets remain safe and are never shared.
        </p>
      </div>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        appearance={missionControlClerkTheme}
        signInUrl="/"
        signUpUrl="/"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        <ThemeProvider>
          <MainRouter />
        </ThemeProvider>
      </ClerkProvider>
    </React.StrictMode>,
  )
}
