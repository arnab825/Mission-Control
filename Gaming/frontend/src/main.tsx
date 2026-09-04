import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
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

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_ZXZpZGVudC1taWRnZS02Ni5jbGVyay5hY2NvdW50cy5kZXYk'
const isSSOCallback = window.location.pathname === '/sso-callback'

/**
 * Handles the OAuth callback route (/sso-callback).
 *
 * When the user CANCELS the OAuth flow (e.g. closes the Google sign-in popup
 * or hits "Cancel"), the provider redirects back here with an error. Without
 * a proper error handler the screen stays blank and the user is stuck.
 *
 * On error we redirect back to the root with ?auth_cancelled=1 so the App
 * can detect the cancellation and show the AuthPage again automatically.
 */
const SSOCallback: React.FC = () => {
  React.useEffect(() => {
    // Check if there is an error in the query parameters or hash fragment (e.g. from a cancelled OAuth flow)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // strip leading '#'
    
    const hasError = 
      urlParams.has('error') || 
      urlParams.has('error_code') ||
      hashParams.has('error') ||
      hashParams.has('error_code');

    if (hasError) {
      console.warn('[SSOCallback] OAuth error or cancellation detected:', {
        queryError: urlParams.get('error') || urlParams.get('error_description'),
        hashError: hashParams.get('error') || hashParams.get('error_description')
      });
      // Redirect back to root, signalling that auth was cancelled/failed.
      window.location.replace('/?auth_cancelled=1');
    }
  }, []);

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
      }}
    >
      {/* Animated spinner with App Logo */}
      <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(118, 185, 0,0.15)',
            borderTopColor: '#76b900',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <img src="/logo.png" style={{ width: 32, height: 32, objectFit: 'contain' }} alt="Mission Control Logo" />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
        Verifying Identity…
      </p>

      <button
        onClick={() => { window.location.replace('/?auth_cancelled=1'); }}
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
        Cancel & Return to App
      </button>

      <AuthenticateWithRedirectCallback
        afterSignInUrl="/"
        afterSignUpUrl="/"
      />
    </div>
  )
}

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
        {isSSOCallback ? <SSOCallback /> : <App />}
      </ClerkProvider>
    </React.StrictMode>,
  )
}
