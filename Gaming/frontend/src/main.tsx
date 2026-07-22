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

// Custom navigation shim for Clerk in Electron SPA (no React Router).
// Clerk calls this function internally after SSO completes to redirect the user.
const clerkNavigate = (to: string) => {
  if (to === '/' || to === '') {
    // After OAuth completes, force a hard navigation to root to re-mount the app
    window.location.replace('/')
  } else {
    window.location.href = to
  }
  return Promise.resolve()
}

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
      {/* Animated spinner */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '2px solid rgba(118, 185, 0,0.15)',
          borderTopColor: '#76b900',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
        Verifying Identity…
      </p>

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
        navigate={clerkNavigate}
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
