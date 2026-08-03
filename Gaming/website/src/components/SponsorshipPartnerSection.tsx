"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Zap, ShieldCheck, Cpu, Award, Mail, Sparkles, CheckCircle2, ArrowRight, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SponsorshipPartnerSection() {
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("Content & Video Partner");
  const [sponsorForm, setSponsorForm] = useState({
    companyName: "",
    contactEmail: "",
    websiteUrl: "",
    partnershipType: "Hardware Sponsor",
    message: ""
  });

  const sponsorMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
  });

  const submitStatus = sponsorMutation.isPending
    ? "loading"
    : sponsorMutation.isSuccess
    ? "success"
    : "idle";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sponsorMutation.mutate({
      name: sponsorForm.companyName,
      email: sponsorForm.contactEmail,
      subject: `[SPONSOR INQUIRY] ${sponsorForm.partnershipType} - ${sponsorForm.companyName}`,
      message: `Company Web: ${sponsorForm.websiteUrl}\nType: ${sponsorForm.partnershipType}\n\n${sponsorForm.message}`
    });
  };

  return (
    <section id="sponsor-section" className="w-full max-w-7xl px-4 sm:px-6 my-24 sm:my-36 relative z-10 mx-auto">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute inset-0 bg-neon-green/[0.02] border border-neon-green/20 rounded-[32px] sm:rounded-[48px] pointer-events-none -z-10 backdrop-blur-3xl" />

      <div className="p-6 sm:p-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 border border-neon-yellow/40 rounded-full px-4 py-1.5 bg-neon-yellow/10 mb-4 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,0,0.2)]">
            <Award className="w-3.5 h-3.5 text-neon-yellow animate-pulse" />
            <span className="text-neon-yellow text-xs font-bold font-mono tracking-widest uppercase">
              HARDWARE & CONTENT SPONSORSHIPS
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-white mb-4">
            PARTNER & <span className="text-neon-yellow glow-text-teal">SPONSOR MISSION CONTROL</span>
          </h2>
          <p className="text-gray-300 text-xs sm:text-base leading-relaxed font-mono">
            Elevate your hardware brand, gaming studio, or GPU architecture in front of thousands of high-intent PC gamers, developers, and hardware enthusiasts.
          </p>
        </div>

        {/* Sponsorship Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Tier 1: Video & Content Sponsor */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 hover:border-neon-green/50 hover:bg-neon-green/[0.02] transition-all duration-300 relative group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-widest">TIER 01</span>
              <h3 className="text-xl font-bold font-display uppercase text-white mb-3 group-hover:text-neon-green transition-colors">
                VIDEO & CONTENT REELS
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6 font-mono">
                Featured logo placement & custom verbal shoutouts in promotional video reels, gameplay benchmarks, and AI companion showcase videos.
              </p>
              <ul className="space-y-2.5 font-mono text-xs text-gray-300 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Logo overlay in 15s-60s video reels</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Social media video distribution tag</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Featured website media spot</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => {
                setSelectedTier("Content & Video Partner");
                setIsSponsorModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-neon-green/10 border border-neon-green/40 text-neon-green font-mono text-xs font-bold hover:bg-neon-green hover:text-obsidian transition-all uppercase cursor-pointer"
            >
              SPONSOR REELS ↗
            </button>
          </div>

          {/* Tier 2: Hardware OEM & Benchmark Partner (FEATURED) */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-neon-yellow/60 bg-neon-yellow/[0.04] shadow-[0_0_40px_rgba(255,255,0,0.15)] relative group flex flex-col justify-between">
            <div className="absolute -top-3 right-6 bg-neon-yellow text-obsidian text-[9px] font-mono font-bold uppercase px-3 py-1 rounded-full shadow-md">
              MOST POPULAR OEM
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-neon-yellow/20 border border-neon-yellow/40 flex items-center justify-center text-neon-yellow mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="text-neon-yellow font-mono text-[10px] uppercase font-bold tracking-widest">TIER 02</span>
              <h3 className="text-xl font-bold font-display uppercase text-white mb-3">
                HARDWARE & BENCHMARK OEM
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed mb-6 font-mono">
                Official hardware telemetry verification for graphics cards, CPUs, and motherboard ecosystems on our verified benchmark profile pages.
              </p>
              <ul className="space-y-2.5 font-mono text-xs text-gray-200 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-yellow shrink-0" />
                  <span>Verified Hardware Partner badge</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-yellow shrink-0" />
                  <span>Interactive partner ticker highlight</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-yellow shrink-0" />
                  <span>Custom hardware optimization profiling</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => {
                setSelectedTier("Hardware OEM Partner");
                setIsSponsorModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-neon-yellow text-obsidian font-mono text-xs font-bold hover:bg-white transition-all uppercase shadow-[0_0_20px_rgba(255,255,0,0.4)] cursor-pointer"
            >
              BECOME HARDWARE OEM ↗
            </button>
          </div>

          {/* Tier 3: Title & Ecosystem Sponsor */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 hover:border-neon-green/50 hover:bg-neon-green/[0.02] transition-all duration-300 relative group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-widest">TIER 03</span>
              <h3 className="text-xl font-bold font-display uppercase text-white mb-3 group-hover:text-neon-green transition-colors">
                TITLE & GAMING STUDIO
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6 font-mono">
                Full title partnership with custom in-game AI companion profiles, direct brand integration, and press release announcements.
              </p>
              <ul className="space-y-2.5 font-mono text-xs text-gray-300 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Main navigation & header banner logo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Custom agentic macro presets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Co-branded press kit & media releases</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => {
                setSelectedTier("Title & Ecosystem Sponsor");
                setIsSponsorModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs font-bold hover:bg-white hover:text-obsidian transition-all uppercase cursor-pointer"
            >
              TITLE SPONSORSHIP ↗
            </button>
          </div>
        </div>
      </div>

      {/* Sponsor Inquiry Modal */}
      <AnimatePresence>
        {isSponsorModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSponsorModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center cursor-pointer select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-xl w-full p-6 sm:p-8 rounded-3xl glass-card border border-neon-yellow/50 shadow-[0_0_50px_rgba(255,255,0,0.25)] bg-[#0d0f14]"
            >
              <button
                onClick={() => setIsSponsorModalOpen(false)}
                className="absolute top-5 right-5 z-10 bg-white/10 text-gray-300 p-2 rounded-full hover:bg-neon-yellow hover:text-obsidian transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-neon-yellow font-mono text-xs font-bold uppercase mb-2">
                <Sparkles className="w-4 h-4 text-neon-yellow" />
                <span>BUSINESS & SPONSOR INQUIRY</span>
              </div>

              <h3 className="text-2xl font-black font-display uppercase text-white mb-2">
                PARTNER WITH <span className="text-neon-yellow">MISSION CONTROL</span>
              </h3>
              <p className="text-gray-400 text-xs font-mono mb-6">
                Selected Tier: <span className="text-neon-yellow font-bold">{selectedTier}</span>
              </p>

              {submitStatus === "success" ? (
                <div className="py-8 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto animate-bounce" />
                  <h4 className="text-xl font-bold font-display uppercase text-white">PROPOSAL TRANSMITTED!</h4>
                  <p className="text-gray-300 text-xs font-mono max-w-sm mx-auto">
                    Our partnership team has received your inquiry. We will respond within 24 business hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsSponsorModalOpen(false);
                      sponsorMutation.reset();
                    }}
                    className="px-6 py-2.5 rounded-full bg-neon-yellow text-obsidian font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    CLOSE MODAL
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-gray-400 text-[10px] uppercase mb-1">Company / Channel Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NVIDIA, ASUS ROG, PC Gamer"
                      value={sponsorForm.companyName}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, companyName: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:border-neon-yellow focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] uppercase mb-1">Business Contact Email</label>
                    <input
                      type="email"
                      required
                      placeholder="partner@yourcompany.com"
                      value={sponsorForm.contactEmail}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, contactEmail: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:border-neon-yellow focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] uppercase mb-1">Website or Channel URL</label>
                    <input
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={sponsorForm.websiteUrl}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, websiteUrl: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:border-neon-yellow focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] uppercase mb-1">Sponsorship Goals & Message</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe your sponsorship requirements, product launch timeline, or media integration details..."
                      value={sponsorForm.message}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, message: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:border-neon-yellow focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitStatus === "loading"}
                    className="w-full py-3.5 rounded-xl bg-neon-yellow text-obsidian font-mono text-xs font-bold hover:bg-white transition-all uppercase shadow-[0_0_25px_rgba(255,255,0,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitStatus === "loading" ? "TRANSMITTING..." : "SUBMIT SPONSORSHIP INQUIRY ↗"}</span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
