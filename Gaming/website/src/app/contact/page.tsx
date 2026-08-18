"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, User, MessageSquare, Send, CheckCircle, AlertCircle, Terminal, Radio } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactPage() {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = [formData.firstName.trim(), formData.middleName.trim(), formData.lastName.trim()]
      .filter(Boolean)
      .join(" ");

    if (!fullName || !formData.email || !formData.message) {
      return;
    }
    contactMutation.mutate({
      name: fullName,
      email: formData.email,
      subject: formData.subject,
      message: formData.message,
    });
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-28 pb-16 sm:pb-24 px-3 min-[375px]:px-4 sm:px-6 max-w-5xl mx-auto w-full relative z-10 flex flex-col items-center">

      {/* Background Graphic Illustration */}
      <div className="absolute top-8 sm:top-12 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 sm:h-72 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none -z-10 border border-neon-green/20 opacity-30 shadow-[0_0_50px_rgba(118,185,0,0.15)]">
        <img
          src="/contact_hero.png"
          alt="Support Dispatch Terminal"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709]/40 via-[#070709]/80 to-[#070709]" />
      </div>

      {/* Cyber Grid & Glowing Ambient Blur */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] bg-neon-green/10 blur-[100px] sm:blur-[140px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 sm:mb-12 max-w-2xl relative z-10"
      >
        <div className="inline-flex items-center gap-1.5 sm:gap-2 border border-neon-green/30 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 bg-neon-green/10 mb-3 sm:mb-4 backdrop-blur-md shadow-[0_0_15px_rgba(118,185,0,0.2)]">
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neon-green animate-pulse shrink-0" />
          <span className="text-neon-green text-[10px] sm:text-xs font-bold font-mono tracking-widest uppercase">DIRECT DISPATCH GATEWAY</span>
        </div>
        <h1 className="text-3xl min-[375px]:text-4xl sm:text-6xl font-black font-display tracking-tight mb-3 sm:mb-4 uppercase text-white leading-tight">
          CONTACT <span className="text-neon-green glow-text-teal">SUPPORT</span>
        </h1>
        <p className="text-gray-300 text-xs sm:text-base leading-relaxed font-mono px-2">
          Engineers stand by 24/7 for bug dispatches, custom enterprise hooks, and hardware telemetry feedback.
        </p>
      </motion.div>

      {/* Glassmorphism Form Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-2xl glass-card p-5 min-[400px]:p-6 sm:p-10 md:p-12 border border-white/10 hover:border-neon-green/60 transition-all duration-500 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-2xl sm:rounded-3xl backdrop-blur-2xl"
      >
        {/* Animated Cyber Laser Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-neon-green via-neon-yellow to-emerald-400 shadow-[0_0_15px_rgba(118,185,0,0.8)]" />

        {status.type === "success" ? (
          <div className="flex flex-col items-center text-center py-6 sm:py-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neon-green/15 border border-neon-green/50 flex items-center justify-center text-neon-green mb-4 sm:mb-6 shadow-[0_0_35px_rgba(118,185,0,0.4)]">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-xl sm:text-3xl font-black font-display text-white mb-2 sm:mb-3 uppercase tracking-tight">TRANSMISSION RECEIVED</h2>
            <p className="text-gray-300 font-mono text-xs sm:text-sm max-w-md mb-6 sm:mb-8 leading-relaxed">{status.message}</p>
            <button
              onClick={() => contactMutation.reset()}
              className="bg-neon-green text-obsidian hover:bg-white px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl font-black transition-all duration-300 font-mono uppercase tracking-wider text-xs shadow-[0_0_25px_rgba(118,185,0,0.4)] cursor-pointer"
            >
              Dispatch New Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

            {status.type === "error" && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-red-400 text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{status.message}</span>
              </div>
            )}

            {/* Operator Identity: First, Middle, Last Name */}
            <div className="space-y-2">
              <label className="text-[11px] sm:text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-neon-green shrink-0" /> Operator Name <span className="text-neon-green">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {/* First Name */}
                <div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First Name *"
                    required
                    disabled={status.type === "loading"}
                    className="w-full bg-[#07080c]/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green shadow-inner transition-all duration-300 disabled:opacity-50"
                  />
                </div>

                {/* Middle Name */}
                <div>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    placeholder="Middle Name (Opt)"
                    disabled={status.type === "loading"}
                    className="w-full bg-[#07080c]/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green shadow-inner transition-all duration-300 disabled:opacity-50"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last Name *"
                    required
                    disabled={status.type === "loading"}
                    className="w-full bg-[#07080c]/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green shadow-inner transition-all duration-300 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* System Email */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[11px] sm:text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-neon-green shrink-0" /> Dispatch Email <span className="text-neon-green">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="chief@system.io"
                  required
                  disabled={status.type === "loading"}
                  className="w-full bg-[#07080c]/90 border border-white/10 rounded-xl sm:rounded-2xl px-3.5 sm:px-4.5 py-3 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green shadow-inner transition-all duration-300 disabled:opacity-50"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[11px] sm:text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-neon-green shrink-0" /> Transmission Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="[CRITICAL] GPU Thermal Spike / Spec"
                  disabled={status.type === "loading"}
                  className="w-full bg-[#07080c]/90 border border-white/10 rounded-xl sm:rounded-2xl px-3.5 sm:px-4.5 py-3 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green shadow-inner transition-all duration-300 disabled:opacity-50 truncate"
                />
              </div>
            </div>

            {/* Message Payload */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] sm:text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-neon-green shrink-0" /> Payload Details <span className="text-neon-green">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Describe your system requirements or hardware telemetry log details..."
                required
                rows={4}
                disabled={status.type === "loading"}
                className="w-full bg-[#07080c]/90 border border-white/10 rounded-xl sm:rounded-2xl px-3.5 sm:px-4.5 py-3 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green shadow-inner transition-all duration-300 resize-none disabled:opacity-50"
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status.type === "loading"}
              className="w-full bg-neon-green text-obsidian px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-white hover:shadow-[0_0_35px_rgba(118,185,0,0.6)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer font-mono shadow-[0_0_25px_rgba(118,185,0,0.3)] leading-normal text-center whitespace-normal min-h-[48px]"
            >
              {status.type === "loading" ? (
                <>
                  <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span className="truncate">{status.message}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 shrink-0" />
                  <span>Transmit Telemetry Payload</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
