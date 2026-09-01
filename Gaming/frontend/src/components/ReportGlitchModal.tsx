import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, AlertTriangle, Cpu, CheckCircle2, Send,
  ExternalLink, Loader2, HardDrive, Monitor, Layers,
  User, Sparkles, Bot, Wand2, Lightbulb, PenTool,
  ChevronDown, Check, Zap, Activity
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

import type { TelemetryState } from '../types/telemetry';

interface LocalSpecs {
  gpu?: string;
  os?: string;
  os_version?: string;
  cpu?: string;
  ram?: string | number;
  driver?: string;
  app_version?: string;
}

interface ReportGlitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  localSpecs?: LocalSpecs;
  telemetry?: TelemetryState | null;
  appVersion?: string;
  onSuccess?: () => void;
}

const PRIMARY_SITE = (import.meta as any).env?.VITE_TELEMETRY_API_URL || 'https://mission-control-roan-seven.vercel.app';
const BACKUP_SITE = (import.meta as any).env?.VITE_BACKUP_TELEMETRY_API_URL || 'https://ai-assistant-five-mu.vercel.app';
const CANDIDATE_SITES = [PRIMARY_SITE, BACKUP_SITE].filter(Boolean);

const QUICK_DIAGNOSTIC_TAGS = [
  'DirectX 12 Device Removed Crash',
  'Shader Compilation Micro-Stutter',
  'VRAM Allocation Out of Memory',
  'NVIDIA Driver TDR Timeout',
  'DLSS 3.5 Frame Gen Artifacts',
];

const CATEGORY_OPTIONS = [
  {
    value: 'glitch' as const,
    label: 'Driver / Glitch',
    desc: 'Display artifacts, TDR crashes, driver timeouts',
    icon: Zap,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
  },
  {
    value: 'hardware' as const,
    label: 'Hardware Conflict',
    desc: 'VRAM exhaustion, PCIe errors, thermal throttling',
    icon: Cpu,
    color: 'text-neon-yellow',
    badgeBg: 'bg-neon-yellow/15',
    badgeBorder: 'border-neon-yellow/30',
  },
  {
    value: 'performance' as const,
    label: 'Performance Stutter / Drop',
    desc: '1% low frame dips, shader stutter, latency spikes',
    icon: Activity,
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
  },
  {
    value: 'other' as const,
    label: 'General / Other',
    desc: 'UI/UX anomaly, telemetry sync or config issues',
    icon: Layers,
    color: 'text-neon-green',
    badgeBg: 'bg-neon-green/15',
    badgeBorder: 'border-neon-green/30',
  },
];

export const ReportGlitchModal: React.FC<ReportGlitchModalProps> = ({
  isOpen,
  onClose,
  localSpecs,
  telemetry,
  appVersion,
  onSuccess,
}) => {
  const { user } = useUser();
  const detectedUser = user?.fullName 
    || user?.username 
    || (user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress.split('@')[0] : '') 
    || 'Operator';

  const [entryMode, setEntryMode] = useState<'ai' | 'manual'>('ai');
  const [author, setAuthor] = useState(detectedUser);
  const [rawSymptom, setRawSymptom] = useState('');
  const [diagnosing, setDiagnosing] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ insight?: string; fix?: string } | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'hardware' | 'glitch' | 'performance' | 'other'>('glitch');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState('General System');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeCommunityUrl, setActiveCommunityUrl] = useState(`${PRIMARY_SITE}/community`);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCategoryOpen) {
        setIsCategoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCategoryOpen]);

  const activeCategoryOpt = CATEGORY_OPTIONS.find((c) => c.value === category) || CATEGORY_OPTIONS[0];
  const ActiveCategoryIcon = activeCategoryOpt.icon;

  useEffect(() => {
    if (detectedUser && detectedUser !== 'Operator' && (!author || author === 'Operator')) {
      setAuthor(detectedUser);
    }
  }, [detectedUser]);

  if (!isOpen) return null;

  // Dynamically resolve real hardware telemetry from all live sources with zero hardcoding
  const gpuName = localSpecs?.gpu 
    || telemetry?.gpu_metrics?.gpu_name 
    || telemetry?.system_specs?.hardware?.gpu 
    || 'NVIDIA GPU';

  const driverVer = localSpecs?.driver 
    || telemetry?.gpu_metrics?.driver_version 
    || 'Latest Available';

  const cpuName = localSpecs?.cpu 
    || telemetry?.system_specs?.hardware?.cpu 
    || 'Processor';

  const rawRam = localSpecs?.ram 
    ?? telemetry?.mem_total_gb 
    ?? telemetry?.system_specs?.hardware?.ram 
    ?? 16;
  const ramGB = typeof rawRam === 'number' ? rawRam : parseInt(String(rawRam)) || 16;

  const osName = localSpecs?.os 
    || telemetry?.system_specs?.os_details?.edition 
    || (typeof navigator !== 'undefined' && navigator.platform?.includes('Win') ? 'Windows' : 'Linux');

  const osVersion = localSpecs?.os_version 
    || telemetry?.system_specs?.os_details?.version 
    || 'Modern Build';

  const resolvedAppVersion = localSpecs?.app_version 
    || appVersion 
    || telemetry?.version 
    || 'v3.3.6';

  // 2026 Autonomous AI Diagnostic Engine
  const handleAiDiagnose = async (symptomText?: string) => {
    const textToDiagnose = (symptomText || rawSymptom).trim();
    if (!textToDiagnose) {
      setError('Please type a brief symptom or select one of the quick diagnostic chips.');
      return;
    }

    setDiagnosing(true);
    setError(null);

    const payload = {
      rawError: textToDiagnose,
      game: game || 'General System',
      specs: {
        os: osName,
        osVersion: osVersion,
        cpu: cpuName,
        gpu: gpuName,
        gpuDriver: driverVer,
        ramGB: Number(ramGB) || 16,
        appVersion: resolvedAppVersion,
      },
      metrics: {
        fps: telemetry?.fps,
        vramUsed: telemetry?.gpu_metrics?.vram_used,
        cpuPct: telemetry?.cpu_pct,
        gpuTemp: telemetry?.gpu_metrics?.temp,
      },
    };

    let diagnosed = false;
    for (const site of CANDIDATE_SITES) {
      const cleanSite = site.replace(/\/+$/, '');
      const apiUrl = `${cleanSite}/api/issues/diagnose`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const diag = await res.json();
          if (diag.title) setTitle(diag.title);
          if (diag.category) setCategory(diag.category);
          if (diag.description) setDescription(diag.description);
          if (diag.game) setGame(diag.game);
          if (diag.technicalInsight || diag.suggestedFix) {
            setAiInsight({
              insight: diag.technicalInsight,
              fix: diag.suggestedFix,
            });
          }
          diagnosed = true;
          break;
        }
      } catch (err: any) {
        console.warn(`[ReportModal] AI diagnose on ${apiUrl} failed:`, err?.message || err);
      }
    }

    if (!diagnosed) {
      setError('AI diagnostic service temporarily busy. You can edit the form manually.');
    }
    setDiagnosing(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide both a title and detailed description.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      game: game.trim() || 'General System',
      author: author.trim() || 'Operator',
      specs: {
        os: osName,
        osVersion: osVersion,
        cpu: cpuName,
        gpu: gpuName,
        gpuDriver: driverVer,
        ramGB: Number(ramGB) || 16,
        appVersion: resolvedAppVersion.startsWith('v') ? resolvedAppVersion : `v${resolvedAppVersion}`,
      },
    };

    let successSite = PRIMARY_SITE;
    let lastError: any = null;
    let isSuccess = false;

    for (const site of CANDIDATE_SITES) {
      const cleanSite = site.replace(/\/+$/, '');
      const apiUrl = `${cleanSite}/api/issues`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MissionControl-Desktop/1.0',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          isSuccess = true;
          successSite = cleanSite;
          break;
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server responded with ${res.status}`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[ReportModal] Failed to submit to ${apiUrl}:`, err?.message || err, '. Failing over to backup site...');
      }
    }

    if (isSuccess) {
      setActiveCommunityUrl(`${successSite}/community`);
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } else {
      setError(lastError?.message || 'Failed to submit issue to all candidate servers.');
    }
    setSubmitting(false);
  };

  const openCommunity = () => {
    window.open(activeCommunityUrl, '_blank');
  };

  const handleResetAndClose = () => {
    setTitle('');
    setDescription('');
    setCategory('glitch');
    setGame('General System');
    setRawSymptom('');
    setAiInsight(null);
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative z-10 w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl shadow-[0_0_90px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header Bar */}
          <div className="px-6 py-4.5 border-b border-white/6 flex items-center justify-between bg-white/2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center shadow-[0_0_15px_rgba(118,185,0,0.2)]">
                <AlertTriangle className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <span>Report Telemetry Conflict</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neon-green/10 border border-neon-green/20 text-neon-green font-bold">
                    2026 AI Standard
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                  Publish to Community Hub & Developer Triage Board
                </p>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-6 pt-4 pb-1 border-b border-white/6 flex items-center justify-between gap-2 shrink-0 bg-black/20">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/3 border border-white/6">
              <button
                type="button"
                onClick={() => setEntryMode('ai')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  entryMode === 'ai'
                    ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(118,185,0,0.3)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>⚡ AI Auto-Diagnose</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('manual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  entryMode === 'manual'
                    ? 'bg-white/15 text-white border border-white/10 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3 h-3" />
                <span>✏️ Manual Entry</span>
              </button>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
              Node: {resolvedAppVersion}
            </span>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(118,185,0,0.2)]">
                  <CheckCircle2 className="w-8 h-8 text-neon-green" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-black text-white uppercase tracking-wide">
                    Issue Successfully Submitted!
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Your hardware telemetry and issue description have been published to the live community board by <strong className="text-neon-green">@{author}</strong>. Other affected gamers can upvote it, and developers will prioritize a patch.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={openCommunity}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neon-green text-black text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neon-green/90 shadow-[0_0_20px_rgba(118,185,0,0.3)] transition-all cursor-pointer"
                  >
                    <span>View in Community Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetAndClose}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Auto-Captured Telemetry Specs Banner */}
                <div className="p-3.5 rounded-2xl bg-white/2 border border-white/6 space-y-2.5">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    <span className="flex items-center gap-1.5 text-neon-green">
                      <Cpu className="w-3.5 h-3.5" />
                      Live Node Hardware Telemetry
                    </span>
                    <span className="text-zinc-500 font-mono">App {resolvedAppVersion}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-2 text-zinc-300 truncate bg-black/20 p-2 rounded-xl border border-white/4 sm:col-span-2" title={`Reported by ${author}`}>
                      <User className="w-3.5 h-3.5 text-neon-green shrink-0" />
                      <span className="truncate"><strong>Author / Pilot:</strong> @{author}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300 truncate bg-black/20 p-2 rounded-xl border border-white/4" title={`${gpuName} (Driver: ${driverVer})`}>
                      <Monitor className="w-3.5 h-3.5 text-neon-green shrink-0" />
                      <span className="truncate"><strong>GPU:</strong> {gpuName} <span className="text-zinc-500 text-[9px]">({driverVer})</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300 truncate bg-black/20 p-2 rounded-xl border border-white/4" title={cpuName}>
                      <Cpu className="w-3.5 h-3.5 text-neon-yellow shrink-0" />
                      <span className="truncate"><strong>CPU:</strong> {cpuName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300 truncate bg-black/20 p-2 rounded-xl border border-white/4">
                      <HardDrive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span><strong>RAM:</strong> {ramGB} GB Available</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300 truncate bg-black/20 p-2 rounded-xl border border-white/4" title={`${osName} (${osVersion})`}>
                      <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate"><strong>OS:</strong> {osName} <span className="text-zinc-500 text-[9px]">({osVersion})</span></span>
                    </div>
                  </div>
                </div>

                {/* AI Auto-Diagnose Interactive Box (When in AI Mode) */}
                {entryMode === 'ai' && (
                  <div className="p-4 rounded-2xl bg-neon-green/4 border border-neon-green/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neon-green flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-neon-green" />
                        AI Diagnostic Scanner
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        Powered by 3-Tier LLM Cascade
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={rawSymptom}
                          onChange={(e) => setRawSymptom(e.target.value)}
                          placeholder="e.g. Game crashes with black screen after enabling Path Tracing in Night City"
                          className="w-full pl-3.5 pr-28 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-neon-green/50 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          disabled={diagnosing}
                          onClick={() => handleAiDiagnose()}
                          className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-neon-green text-black text-[9px] font-black uppercase tracking-wider hover:bg-neon-green/90 shadow-[0_0_12px_rgba(118,185,0,0.3)] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {diagnosing ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Diagnosing...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3 h-3" />
                              <span>Auto-Draft</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Quick Diagnostic Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Quick Chips:</span>
                        {QUICK_DIAGNOSTIC_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setRawSymptom(tag);
                              handleAiDiagnose(tag);
                            }}
                            className="px-2 py-0.5 rounded-md bg-white/4 hover:bg-neon-green/10 border border-white/8 hover:border-neon-green/30 text-[8px] font-mono text-zinc-300 hover:text-neon-green transition cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Insights & Suggested Fix Callout */}
                    {aiInsight && (
                      <div className="p-3 rounded-xl bg-black/40 border border-neon-green/30 space-y-2 mt-2">
                        {aiInsight.insight && (
                          <div className="text-[10px] text-zinc-200 leading-relaxed font-sans">
                            <span className="text-neon-green font-bold uppercase tracking-wider mr-1.5">🔬 Root Cause:</span>
                            {aiInsight.insight}
                          </div>
                        )}
                        {aiInsight.fix && (
                          <div className="text-[10px] text-neon-yellow leading-relaxed font-sans flex items-start gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><strong>Recommended Immediate Fix:</strong> {aiInsight.fix}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Form Fields (Title, Category, Game, Description) */}
                <div className="space-y-3.5">
                  {/* Title */}
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                      Issue Summary {entryMode === 'ai' && <span className="text-neon-green">(AI Drafted — Editable)</span>} <span className="text-neon-green">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. DLSS Frame Generation crash on RTX 5050"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/8 focus:border-neon-green/40 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Author, Category & Game row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                        Author / Pilot Tag
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Operator"
                        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/8 focus:border-neon-green/40 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div ref={categoryRef} className="relative">
                      <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                        Category
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className={`w-full px-3 py-2 rounded-xl bg-black/40 border transition-all duration-200 cursor-pointer flex items-center justify-between text-xs text-zinc-200 ${
                          isCategoryOpen
                            ? 'border-neon-green/50 bg-[#0c0c14] shadow-[0_0_15px_rgba(118,185,0,0.15)] ring-1 ring-neon-green/30'
                            : 'border-white/8 hover:border-white/20 hover:bg-white/3'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1 rounded-lg ${activeCategoryOpt.badgeBg} ${activeCategoryOpt.badgeBorder} border shrink-0`}>
                            <ActiveCategoryIcon className={`w-3.5 h-3.5 ${activeCategoryOpt.color}`} />
                          </div>
                          <span className="font-bold text-white truncate text-[11px]">
                            {activeCategoryOpt.label}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ml-1.5 ${
                            isCategoryOpen ? 'rotate-180 text-neon-green' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isCategoryOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute top-full left-0 right-0 sm:w-72 mt-1.5 bg-[#0d0d14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(118,185,0,0.05)] z-50 p-1.5 flex flex-col gap-1 ring-1 ring-white/5"
                          >
                            <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 flex items-center justify-between">
                              <span>Select Issue Category</span>
                              <span className="text-[7px] text-neon-green font-mono">Telemetry Class</span>
                            </div>
                            {CATEGORY_OPTIONS.map((opt) => {
                              const isSelected = category === opt.value;
                              const OptIcon = opt.icon;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setCategory(opt.value);
                                    setIsCategoryOpen(false);
                                  }}
                                  className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                                    isSelected
                                      ? 'bg-neon-green/10 border border-neon-green/25 shadow-[inset_0_0_12px_rgba(118,185,0,0.08)]'
                                      : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg ${opt.badgeBg} ${opt.badgeBorder} border shrink-0 mt-0.5`}>
                                    <OptIcon className={`w-3.5 h-3.5 ${opt.color}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-[11px] font-bold ${isSelected ? 'text-neon-green' : 'text-white'}`}>
                                        {opt.label}
                                      </span>
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-neon-green shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-[9px] text-zinc-400 leading-tight mt-0.5">
                                      {opt.desc}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                        Target Context / Game
                      </label>
                      <input
                        type="text"
                        value={game}
                        onChange={(e) => setGame(e.target.value)}
                        placeholder="e.g. Cyberpunk 2077, General System"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/8 focus:border-neon-green/40 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                      Detailed Description <span className="text-neon-green">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened, any error messages on screen, or steps to reproduce..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/8 focus:border-neon-green/40 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-[10px] text-red-400 font-bold uppercase tracking-wider">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="px-4 py-2.5 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || diagnosing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neon-green hover:bg-neon-green/90 text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(118,185,0,0.25)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing to Community...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Community</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
