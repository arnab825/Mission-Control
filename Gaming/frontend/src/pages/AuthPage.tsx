import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, ArrowRight, Zap, Loader2, ShieldAlert, X } from 'lucide-react';

interface AuthPageProps {
  onBackToLibrary?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onBackToLibrary }) => {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle OAuth Sign In/Up
  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_discord' | 'oauth_microsoft') => {
    if (!isSignInLoaded || !isSignUpLoaded) return;
    try {
      localStorage.setItem('mission_control_active_provider', strategy);
      // Use absolute URLs so Clerk can whitelist them in the dashboard.
      // In Electron dev: http://localhost:5173/sso-callback
      const origin = window.location.origin;
      if (isLogin) {
        const options: any = {
          strategy,
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/`,
        };
        if (strategy === 'oauth_google') {
          options.additionalData = { prompt: 'select_account' };
          options.customOAuthOptions = { prompt: 'select_account' };
        }
        await signIn.authenticateWithRedirect(options);
      } else {
        await signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/`,
        });
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'OAuth connection failed.');
    }
  };

  // Handle Traditional Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier,
        password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        // Needs further steps like 2FA, which we'll simplify here
        setError('Additional verification required.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Traditional Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.create({
        emailAddress: identifier.includes('@') ? identifier : undefined,
        username: !identifier.includes('@') ? identifier : undefined,
        password,
      });

      // Usually requires email verification. For this demo, if it succeeds or requires email verification:
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
      } else {
        setError('Please check your email to verify your account. After verifying, log in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full min-h-150 flex items-center justify-center bg-zinc-950 relative overflow-hidden font-['Inter',system-ui,sans-serif]">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-200 h-200 bg-neon-green/20 rounded-full blur-[120px] absolute -top-40 -left-40" />
        <div className="w-150 h-150 bg-neon-yellow/10 rounded-full blur-[100px] absolute -bottom-40 -right-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-xl"
      >
        {onBackToLibrary && (
          <button aria-label="button" type="button"
            onClick={onBackToLibrary}
            className="absolute top-6 right-6 p-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all z-20"
            title="Back to Library"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-neon-green/10 rounded-xl flex items-center justify-center border border-neon-green/20 mb-4 shadow-[0_0_15px_rgba(118, 185, 0,0.2)]">
            <Zap className="w-6 h-6 text-neon-green" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
            Neural Authentication
          </h1>
          <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase mt-1">
            Access Game Intelligence
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-4">
          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                {isLogin || identifier.includes('@') ? <Mail className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or Username"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-neon-green/50 focus:bg-neon-green/5 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure Password"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-neon-green/50 focus:bg-neon-green/5 transition-all"
                required
              />
            </div>
          </div>

          <button aria-label="button"
            type="submit"
            disabled={isLoading || (!isSignInLoaded && !isSignUpLoaded)}
            className="w-full flex items-center justify-center gap-2 py-3 mt-2 bg-neon-green hover:bg-neon-green text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(118, 185, 0,0.3)] hover:shadow-[0_0_30px_rgba(118, 185, 0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? 'Initiate Link' : 'Register Node')}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Or Link With</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* SSO Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button aria-label="button" type="button" onClick={() => handleOAuth('oauth_google')} className="flex items-center justify-center py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl transition-all group">
            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </button>

          <button aria-label="button" type="button" onClick={() => handleOAuth('oauth_discord')} className="flex items-center justify-center py-2.5 bg-white/5 border border-white/10 hover:bg-[#5865F2]/20 hover:border-[#5865F2]/50 rounded-xl transition-all group">
            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:fill-[#5865F2] transition-all" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.93.71-4.27 1.33a.08.08 0 0 0-.05.05C2.79 11.53 1.74 17.58 2.3 23.53a.08.08 0 0 0 .04.06c1.8 1.33 3.53 2.13 5.23 2.68a.09.09 0 0 0 .09-.03c.4-.55.77-1.13 1.11-1.74a.09.09 0 0 0-.05-.12c-.59-.22-1.16-.48-1.71-.78a.09.09 0 0 1-.01-.15c.12-.09.24-.18.35-.28a.09.09 0 0 1 .09-.01c3.48 1.59 7.23 1.59 10.67 0a.09.09 0 0 1 .09.01c.11.09.23.19.36.28a.09.09 0 0 1-.01.15c-.56.3-1.13.56-1.73.78a.09.09 0 0 0-.04.12c.34.61.71 1.19 1.11 1.74a.09.09 0 0 0 .09.03c1.7-.55 3.44-1.35 5.24-2.68a.08.08 0 0 0 .03-.06c.64-6.8-.93-12.75-2.47-18.15a.08.08 0 0 0-.05-.05ZM8.5 17.47c-1.05 0-1.92-.96-1.92-2.13 0-1.18.85-2.14 1.92-2.14s1.94.97 1.92 2.14c0 1.17-.86 2.13-1.92 2.13Zm7 0c-1.05 0-1.92-.96-1.92-2.13 0-1.18.85-2.14 1.92-2.14s1.94.97 1.92 2.14c0 1.17-.86 2.13-1.92 2.13Z" />
            </svg>
          </button>

          <button aria-label="button" type="button" onClick={() => handleOAuth('oauth_microsoft')} className="flex items-center justify-center py-2.5 bg-white/5 border border-white/10 hover:bg-[#00a4ef]/20 hover:border-[#00a4ef]/50 rounded-xl transition-all group">
            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.4 24H0V12.6h11.4V24ZM24 24H12.6V12.6H24V24ZM11.4 11.4H0V0h11.4v11.4ZM24 11.4H12.6V0H24v11.4Z" fill="#ffffff" className="group-hover:fill-[#00a4ef] transition-colors" />
            </svg>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-bold text-zinc-500">
            {isLogin ? "No access node yet?" : "Already registered?"}{' '}
            <button aria-label="button" type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-neon-green hover:text-neon-green transition-colors uppercase tracking-widest"
            >
              {isLogin ? 'Request Access' : 'Login'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
