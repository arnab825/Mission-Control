import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useClerk } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'

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
  const isPopup = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('popup') === '1';
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
        await clerk.handleRedirectCallback({
          afterSignInUrl: isPopup ? '/?auth_completed=1' : '/',
          afterSignUpUrl: isPopup ? '/?auth_completed=1' : '/',
        });

        if (isCancelled) return;
        console.log('[SSOCallback] OAuth handshake succeeded!');
        setAuthStatus('success');

        if (isPopup && window.electronAPI?.notifyAuthSuccess) {
          window.electronAPI.notifyAuthSuccess();
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
          if (isPopup && window.electronAPI?.notifyAuthSuccess) {
            window.electronAPI.notifyAuthSuccess();
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
    <div style={{ color: '#ef4444', backgroundColor: '#0f0f11', padding: '32px', fontFamily: 'sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.05em' }}>CONFIGURATION ERROR</h1>
      <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa' }}>Missing VITE_CLERK_PUBLISHABLE_KEY in frontend/.env file.</p>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        signInUrl="/"
        signUpUrl="/"
        afterSignInUrl="/"
        afterSignUpUrl="/"
      >
        <MainRouter />
      </ClerkProvider>
    </React.StrictMode>,
  )
}
