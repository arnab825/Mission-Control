"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Mail,
  User,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Terminal,
  Radio,
  ShieldCheck,
  Zap,
  Activity,
  Server,
  Sparkles,
} from "lucide-react";

const QUICK_TOPICS = [
  "Bug Report",
  "GPU Telemetry",
  "Feature Hook",
  "Partnership",
];

export default function ContactPage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });

  const contactMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; subject?: string; message: string }) => {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Transmission rejected by dispatch gateway. Try again.");
      }
      return data;
    },
    onSuccess: () => {
      setFormData({ firstName: "", middleName: "", lastName: "", email: "", subject: "", message: "" });
      setSelectedTopic(null);
    },
  });

  const status = contactMutation.isPending
    ? { type: "loading" as const, message: "Encrypting & Transmitting Payload..." }
    : contactMutation.isSuccess
      ? { type: "success" as const, message: "Transmission received and logged in core developer dispatch queue." }
      : contactMutation.isError
        ? { type: "error" as const, message: contactMutation.error.message }
        : { type: "idle" as const, message: "" };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTopicClick = (topic: string) => {
    setSelectedTopic((prev) => (prev === topic ? null : topic));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = [formData.firstName.trim(), formData.middleName.trim(), formData.lastName.trim()]
      .filter(Boolean)
      .join(" ");

    if (!fullName || !formData.email || !formData.message) {
      return;
    }

    const finalSubject = selectedTopic
      ? (formData.subject.trim() ? `${selectedTopic} - ${formData.subject.trim()}` : selectedTopic)
      : (formData.subject.trim() || "General Support Inquiry");

    contactMutation.mutate({
      name: fullName,
      email: formData.email,
      subject: finalSubject,
      message: formData.message,
    });
  };

  return (
    <div className="min-h-screen pt-24 sm:pt-28 pb-12 sm:pb-16 px-3 min-[400px]:px-4 sm:px-6 max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center">
      
      {/* Background Graphic Illustration */}
      <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 w-full max-w-5xl h-44 sm:h-64 lg:h-80 rounded-3xl overflow-hidden pointer-events-none -z-10 border border-neon-green/15 opacity-25 shadow-[0_0_60px_rgba(118,185,0,0.12)]">
        <img
          src="/contact_hero.png"
          alt="Support Dispatch Terminal"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709]/20 via-[#070709]/80 to-[#0a0a0c]" />
      </div>

      {/* Cyber Grid & Ambient Radial Glow */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[650px] h-[300px] bg-neon-green/10 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 max-w-2xl relative z-10 w-full px-2">
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-3.5 py-1 bg-neon-green/10 mb-2.5 backdrop-blur-xl shadow-[0_0_15px_rgba(118,185,0,0.2)]">
          <Radio className="w-3 h-3 text-neon-green animate-pulse shrink-0" />
          <span className="text-neon-green text-[10px] sm:text-xs font-bold font-mono tracking-widest uppercase">
            DIRECT DISPATCH GATEWAY
          </span>
        </div>

        <h1 className="text-2xl min-[375px]:text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight mb-2 uppercase text-white leading-tight">
          CONTACT <span className="text-neon-green glow-text-teal">SUPPORT</span>
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-mono px-1 max-w-xl mx-auto">
          Standby engineers available 24/7 for telemetry logs, bug dispatches, and custom hooks.
        </p>
      </div>

      {/* Main Grid: Telemetry Info + Form Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 w-full max-w-5xl items-start">
        
        {/* Left Side: Telemetry Station Info Card */}
        <div className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-3.5 w-full">
          
          {/* Status HUD Card */}
          <div className="glass-premium p-4 sm:p-5 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-green"></span>
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">GATEWAY STATUS</span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-neon-green/20 text-neon-green border border-neon-green/30 px-2 py-0.5 rounded-full">
                ONLINE
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-[11px] text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-zinc-500" /> Dispatch Cluster
                </span>
                <span className="text-white font-semibold">EDGE-GLOBAL-01</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-zinc-500" /> Avg Response SLA
                </span>
                <span className="text-neon-green font-semibold">&lt; 12 Hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-zinc-500" /> Encryption
                </span>
                <span className="text-white font-semibold">256-BIT TLS / AES</span>
              </div>
            </div>
          </div>

          {/* Direct Channels Card */}
          <div className="glass-card p-4 rounded-2xl border border-white/8 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-mono font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 text-neon-yellow" /> Priority Channels
            </div>
            <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
              Connect directly with maintainers on Discord for live discussion or urgent triage.
            </p>
            <div className="pt-1">
              <a
                href="https://discord.gg"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-zinc-200 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Join Discord Community</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Side: Form Terminal */}
        <div className="order-1 lg:order-2 lg:col-span-8 glass-premium p-4 min-[400px]:p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-full">
          {/* Top Edge Specular Neon Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-80" />

          {status.type === "success" ? (
            <div className="flex flex-col items-center text-center py-6 sm:py-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neon-green/10 border border-neon-green/40 flex items-center justify-center text-neon-green mb-4 shadow-[0_0_35px_rgba(118,185,0,0.3)]">
                <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-white mb-1.5 uppercase tracking-tight">
                TRANSMISSION RECEIVED
              </h2>
              <p className="text-zinc-300 font-mono text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
                {status.message}
              </p>
              <button
                type="button"
                onClick={() => contactMutation.reset()}
                className="btn-cyber-primary px-6 py-2.5 rounded-xl font-black font-mono uppercase tracking-wider text-xs cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" /> Dispatch New Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {status.type === "error" && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{status.message}</span>
                </div>
              )}

              {/* Quick Topic Chips */}
              <div className="space-y-1.5">
                <div className="text-[10px] sm:text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-neon-green" /> Quick Classification
                  </span>
                  {selectedTopic && (
                    <span className="text-[10px] font-mono text-neon-green">
                      Selected: <span className="font-bold">{selectedTopic}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS.map((topic) => {
                    const isSelected = selectedTopic === topic;
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleTopicClick(topic)}
                        className={`text-[10px] min-[360px]:text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-neon-green/20 border-neon-green text-neon-green font-bold shadow-[0_0_12px_rgba(118,185,0,0.3)]"
                            : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:border-white/25 hover:bg-white/[0.08]"
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Operator Identity */}
              <div className="space-y-1">
                <label className="text-[10px] sm:text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-neon-green shrink-0" /> Operator Name <span className="text-neon-green">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First Name *"
                    required
                    disabled={status.type === "loading"}
                    className="w-full cyber-input rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white placeholder-zinc-500 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    placeholder="Middle (Opt)"
                    disabled={status.type === "loading"}
                    className="w-full cyber-input rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white placeholder-zinc-500 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last Name *"
                    required
                    disabled={status.type === "loading"}
                    className="w-full cyber-input rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white placeholder-zinc-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-neon-green shrink-0" /> Dispatch Email <span className="text-neon-green">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="operator@missioncontrol.io"
                    required
                    disabled={status.type === "loading"}
                    className="w-full cyber-input rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white placeholder-zinc-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] sm:text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-neon-green shrink-0" /> Transmission Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder={selectedTopic ? `Details for ${selectedTopic}...` : "e.g. Frame latency spike analysis"}
                    disabled={status.type === "loading"}
                    className="w-full cyber-input rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white placeholder-zinc-500 disabled:opacity-50 truncate"
                  />
                </div>
              </div>

              {/* Message Payload */}
              <div className="space-y-1">
                <label className="text-[10px] sm:text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-neon-green shrink-0" /> Payload Details <span className="text-neon-green">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Provide system hardware specs, logs, or detailed inquiry description..."
                  required
                  rows={3}
                  disabled={status.type === "loading"}
                  className="w-full cyber-input rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white placeholder-zinc-500 resize-none disabled:opacity-50"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status.type === "loading"}
                className="w-full btn-cyber-primary py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(118,185,0,0.35)]"
              >
                {status.type === "loading" ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-obsidian border-t-transparent rounded-full animate-spin shrink-0"></div>
                    <span className="truncate">{status.message}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Transmit Telemetry Payload</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
