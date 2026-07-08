"use client";

import { useState } from "react";
import { Mail, User, MessageSquare, Send, CheckCircle, AlertCircle, Sparkles, Terminal, Radio } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setStatus({
        type: "error",
        message: "Please fill in all required telemetry fields.",
      });
      return;
    }

    setStatus({ type: "loading", message: "Encrypting & Transmitting Payload..." });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message: "Transmission received and logged in core developer dispatch queue.",
        });
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus({
          type: "error",
          message: data.error || "Transmission rejected by dispatch gateway. Try again.",
        });
      }
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Kernel network socket timeout. Verify connectivity.",
      });
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-24 px-4 sm:px-6 max-w-4xl mx-auto w-full relative z-10 flex flex-col items-center bg-[#0a0a0c]">
      
      {/* Cyber Grid & Glowing Ambient Blur */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-neon-green/10 blur-[140px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" />
          <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">DIRECT DISPATCH GATEWAY</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight mb-4 uppercase text-white">
          CONTACT <span className="text-neon-green glow-text-teal">SUPPORT</span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed font-mono">
          Engineers stand by 24/7 for bug dispatches, custom enterprise hooks, and hardware telemetry feedback.
        </p>
      </motion.div>

      {/* Glassmorphism Form Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-2xl glass-card p-8 sm:p-12 border-white/10 hover:border-neon-green/40 transition-all duration-500 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] scanline-effect"
      >
        {/* Animated Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-neon-green to-transparent shadow-[0_0_10px_rgba(118, 185, 0,0.8)]" />

        {status.type === "success" ? (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-20 h-20 rounded-full bg-neon-green/15 border border-neon-green/40 flex items-center justify-center text-neon-green mb-6 shadow-[0_0_30px_rgba(118, 185, 0,0.4)]">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black font-display text-white mb-3 uppercase tracking-tight">TRANSMISSION RECEIVED</h2>
            <p className="text-gray-300 font-mono text-sm max-w-md mb-8 leading-relaxed">{status.message}</p>
            <button
              onClick={() => setStatus({ type: "idle", message: "" })}
              className="bg-neon-green text-obsidian hover:bg-white px-8 py-3.5 rounded-xl font-black transition-all duration-300 font-mono uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(118, 185, 0,0.3)]"
            >
              Dispatch New Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {status.type === "error" && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm font-mono">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{status.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Operator Name */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-neon-green" /> Operator Name <span className="text-neon-green">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Operator Chief"
                  required
                  disabled={status.type === "loading"}
                  className="w-full bg-obsidian/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-mono text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_20px_rgba(118, 185, 0,0.25)] transition-all duration-300 disabled:opacity-50"
                />
              </div>

              {/* System Email */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-neon-green" /> Dispatch Email <span className="text-neon-green">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="chief@system.io"
                  required
                  disabled={status.type === "loading"}
                  className="w-full bg-obsidian/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-mono text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_20px_rgba(118, 185, 0,0.25)] transition-all duration-300 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-neon-green" /> Transmission Subject
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="[CRITICAL] GPU Thermal Spike / Custom Hook Spec"
                disabled={status.type === "loading"}
                className="w-full bg-obsidian/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-mono text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_20px_rgba(118, 185, 0,0.25)] transition-all duration-300 disabled:opacity-50"
              />
            </div>

            {/* Message Payload */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-mono font-bold tracking-wider text-gray-300 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-neon-green" /> Payload Details <span className="text-neon-green">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Describe your system requirements or hardware telemetry log details..."
                required
                rows={5}
                disabled={status.type === "loading"}
                className="w-full bg-obsidian/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-mono text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_20px_rgba(118, 185, 0,0.25)] transition-all duration-300 resize-none disabled:opacity-50"
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status.type === "loading"}
              className="w-full bg-neon-green text-obsidian px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-white hover:shadow-[0_0_30px_rgba(118, 185, 0,0.5)] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer font-mono shadow-[0_0_20px_rgba(118, 185, 0,0.25)]"
            >
              {status.type === "loading" ? (
                <>
                  <div className="w-4 h-4 border-2 border-obsidian border-t-transparent rounded-full animate-spin"></div>
                  <span>{status.message}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
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
