"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Send, CheckCircle2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import LegalModal, { LegalModalTab } from './LegalModal';

export default function Footer() {
  const [activeModal, setActiveModal] = useState<LegalModalTab | null>(null);
  const [email, setEmail] = useState("");
  const [subscribedEmail, setSubscribedEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mc_telemetry_feed_email");
      if (saved) {
        setSubscribedEmail(saved);
        setSubStatus("success");
      }
    } catch (e) {
      console.warn("Storage notice:", e);
    }
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setSubStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Subscription request rejected.");
      }
      setSubStatus("success");
      setSubscribedEmail(email.trim().toLowerCase());
      try {
        localStorage.setItem("mc_telemetry_feed_email", email.trim().toLowerCase());
      } catch {}
      setEmail("");
    } catch (err: any) {
      setSubStatus("error");
      setErrorMessage(err.message || "Failed to subscribe. Please try again.");
    }
  };

  const handleUnsubscribe = async () => {
    const targetEmail = subscribedEmail || email;
    if (!targetEmail) return;

    setIsUnsubscribing(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/subscribe?email=${encodeURIComponent(targetEmail)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unsubscribe.");
      }
      setSubscribedEmail("");
      setSubStatus("idle");
      try {
        localStorage.removeItem("mc_telemetry_feed_email");
      } catch {}
    } catch (err: any) {
      setSubStatus("error");
      setErrorMessage(err.message || "Error unsubscribing. Please try again.");
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <>
      <motion.footer 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full bg-[#0a0a0d] py-16 mt-12 relative overflow-hidden border-t border-white/[0.05]"
      >
        {/* Animated Gradient Top Border */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-green/60 to-transparent shadow-[0_0_15px_rgba(118,185,0,0.4)]"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand & Creators */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-black font-display tracking-tight text-white mb-4">
              MISSION <span className="text-neon-green drop-shadow-[0_0_10px_rgba(118,185,0,0.5)]">CONTROL</span>
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm text-sm sm:text-base leading-relaxed">
              The ultimate AI-powered tactical gaming overlay and rig dashboard. Designed for zero-latency execution.
            </p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Link href="https://twitter.com" className="text-gray-400 hover:text-neon-green hover:translate-x-0.5 hover:drop-shadow-[0_0_8px_rgba(118,185,0,0.5)] transition-all duration-300 flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> Twitter
              </Link>
              <Link href="https://discord.com" className="text-gray-400 hover:text-neon-green hover:translate-x-0.5 hover:drop-shadow-[0_0_8px_rgba(118,185,0,0.5)] transition-all duration-300 flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                <svg viewBox="0 0 127.14 96.36" className="w-3.5 h-3.5 fill-current"><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.82-.6,1.61-1.24,2.37-1.91a75.48,75.48,0,0,0,76.12,0c.76.67,1.55,1.31,2.37,1.91a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.12,123.63,25.32,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/></svg> Discord
              </Link>
              <Link href="https://github.com/arnab825/Mission-Control" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-neon-green hover:translate-x-0.5 hover:drop-shadow-[0_0_8px_rgba(118,185,0,0.5)] transition-all duration-300 flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.337-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg> GitHub
              </Link>
            </div>
          </div>

          {/* Legal Links (Modals) */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider font-display">Explore & Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all duration-300"></span> Gaming Intel Blogs
                </Link>
              </li>
              <li>
                <Link href="/games-tested" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all duration-300"></span> Games Tested
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all duration-300"></span> Contact Support
                </Link>
              </li>
              <li>
                <button onClick={() => setActiveModal('terms')} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all duration-300"></span> Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('privacy')} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all duration-300"></span> Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('cookies')} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-300 text-sm cursor-pointer text-left flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green/40 group-hover:bg-neon-green group-hover:shadow-[0_0_8px_rgba(118,185,0,0.8)] transition-all duration-300"></span> Cookie Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wider font-display flex items-center gap-2">
              <span>Telemetry Feed</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/30">1x / WEEK</span>
            </h4>
            <p className="text-gray-400 text-xs mb-3 leading-relaxed">
              Subscribe for weekly gaming intel blogs, firmware updates, and AI patch notes.
            </p>

            {subStatus === "success" && subscribedEmail ? (
              <div className="bg-neon-green/10 border border-neon-green/40 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-neon-green text-xs font-mono font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Weekly Dispatch Active</span>
                </div>
                <p className="text-gray-300 text-[11px] font-sans leading-relaxed">
                  Enrolled as <strong className="text-white font-mono">{subscribedEmail}</strong>. Dispatches arrive 1x every week.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neon-green/20">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-neon-green hover:underline hover:text-white transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>View Latest Blogs</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleUnsubscribe}
                    disabled={isUnsubscribing}
                    className="text-[10px] font-mono text-gray-400 hover:text-red-400 underline transition-colors cursor-pointer"
                  >
                    {isUnsubscribing ? "Unsubscribing..." : "Unsubscribe"}
                  </button>
                </div>
              </div>
            ) : (
              <form className="flex flex-col gap-2.5" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@system.io"
                  required
                  disabled={subStatus === "loading"}
                  className="bg-obsidian/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_20px_rgba(118,185,0,0.3)] transition-all duration-300 font-mono disabled:opacity-50"
                  suppressHydrationWarning={true}
                />
                {subStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-400 text-[11px] font-mono">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={subStatus === "loading"}
                  className="btn-cyber-primary rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {subStatus === "loading" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enrolling Operator...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Subscribe to Weekly Feed
                    </>
                  )}
                </button>
                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5 px-0.5 font-mono">
                  <span>Zero spam • 1 email/week</span>
                  <Link href="/blog" className="text-neon-green hover:underline">
                    Explore Blogs ➔
                  </Link>
                </div>
              </form>
            )}
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/[0.05] text-center text-gray-500 text-xs tracking-wide">
          &copy; {new Date().getFullYear()} MISSION CONTROL ARCHITECTURE. ALL RIGHTS RESERVED. ZERO CLOUD DEPENDENCY.
        </div>
      </motion.footer>

      {/* Premium Legal Modal */}
      <LegalModal
        isOpen={activeModal !== null}
        activeTab={activeModal || "terms"}
        onClose={() => setActiveModal(null)}
        onTabChange={(tab) => setActiveModal(tab)}
      />
    </>
  );
}
