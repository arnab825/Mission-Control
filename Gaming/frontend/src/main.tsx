import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useClerk } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'
import { missionControlClerkTheme } from './styles/clerkTheme'

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

    const processHandshake = async () => {
      try {
        console.log('[SSOCallback] Finalizing OAuth redirect handshake...');
        await (clerk as any).handleRedirectCallback({
          fallbackRedirectUrl: isPopup ? '/?auth_completed=1' : '/',
          signInFallbackRedirectUrl: isPopup ? '/?auth_completed=1' : '/',
          signUpFallbackRedirectUrl: isPopup ? '/?auth_completed=1' : '/',
        });

        if (isCancelled) return;
        console.log('[SSOCallback] OAuth handshake succeeded!');
        setAuthStatus('success');

        if (isPopup) {
          if (window.electronAPI?.notifyAuthSuccess) {
            window.electronAPI.notifyAuthSuccess();
          }
          if (window.electronAPI?.closeAuthPopup) {
            window.electronAPI.closeAuthPopup();
          }
          try {
            window.close();
          } catch (_) { }
        } else {
          window.location.replace('/?auth_completed=1');
        }
      } catch (err: any) {
        console.warn('[SSOCallback] handleRedirectCallback returned exception:', err);
        if (isCancelled) return;

        // If a session is already present or was created despite warning, treat as successful
        if (clerk.session || clerk.client?.lastActiveSessionId) {
          console.log('[SSOCallback] Active session confirmed, proceeding as success.');
          setAuthStatus('success');
          if (isPopup) {
            if (window.electronAPI?.notifyAuthSuccess) {
              window.electronAPI.notifyAuthSuccess();
            }
            if (window.electronAPI?.closeAuthPopup) {
              window.electronAPI.closeAuthPopup();
            }
            try {
              window.close();
            } catch (_) { }
          } else {
            window.location.replace('/');
          }
          return;
        }

        setAuthStatus('error');
        setErrorMessage(
          err?.errors?.[0]?.longMessage ||
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
        <MainRouter />
      </ClerkProvider>
    </React.StrictMode>,
  )
}
