"use client";

import { useEffect, useState } from "react";
import { 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  AlertTriangle, 
  Cpu, 
  Tv, 
  Maximize2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Info,
  Radio,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReportModal from "@/components/ReportModal";

interface Issue {
  id: string;
  title: string;
  description: string;
  category: "hardware" | "glitch" | "performance" | "other";
  game?: string;
  votes: number;
  createdAt: string;
  specs: {
    os: string;
    osVersion: string;
    cpu: string;
    gpu: string;
    gpuDriver?: string;
    ramGB: number;
    appVersion: string;
  };
}

export default function CommunityPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtering & Sorting
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"votes" | "latest">("votes");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    glitches: 0,
    hardware: 0,
    performance: 0
  });

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/issues");
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
        
        // Calculate category stats
        const counts = data.reduce((acc: any, curr: Issue) => {
          acc.total++;
          if (curr.category === "glitch") acc.glitches++;
          else if (curr.category === "hardware") acc.hardware++;
          else if (curr.category === "performance") acc.performance++;
          return acc;
        }, { total: 0, glitches: 0, hardware: 0, performance: 0 });
        
        setStats(counts);
      }
    } catch (e) {
      console.error("Failed to load community issues:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    
    const storedVotes = localStorage.getItem("aero_voted_issues");
    if (storedVotes) {
      setVotedIds(JSON.parse(storedVotes));
    }

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("report") === "true") {
        setIsModalOpen(true);
      }
    }
  }, []);

  const handleVote = async (issueId: string) => {
    if (votedIds.includes(issueId)) return;

    try {
      const res = await fetch("/api/issues/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId }),
      });

      if (res.ok) {
        setIssues(prev => 
          prev.map(issue => 
            issue.id === issueId ? { ...issue, votes: issue.votes + 1 } : issue
          )
        );
        
        const newVoted = [...votedIds, issueId];
        setVotedIds(newVoted);
        localStorage.setItem("aero_voted_issues", JSON.stringify(newVoted));
      }
    } catch (e) {
      console.error("Failed to submit vote:", e);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  const processedIssues = [...issues]
    .filter(issue => {
      if (categoryFilter === "all") return true;
      return issue.category === categoryFilter;
    })
    .sort((a, b) => {
      if (sortBy === "votes") {
        return b.votes - a.votes;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "hardware": return "text-[#76b900] bg-[#76b900]/10 border-[#76b900]/30";
      case "glitch": return "text-neon-green bg-neon-green/10 border-neon-green/30 shadow-[0_0_10px_rgba(118, 185, 0,0.15)]";
      case "performance": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      default: return "text-gray-300 bg-white/5 border-white/10";
    }
  };

  return (
    <main className="flex-1 min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0c] relative z-10 overflow-x-hidden">
      
      {/* Cyber Grid & Ambient Background */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-green/10 blur-[150px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Title & Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-bold font-mono tracking-widest uppercase backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 text-neon-green animate-pulse" /> TELEMETRY & HOTFIX PIPELINE
          </div>
          <h1 className="text-2xl min-[375px]:text-3xl sm:text-6xl font-black font-display uppercase tracking-tight text-white">
            COMMUNITY <br className="sm:hidden" /> <span className="text-neon-green glow-text-teal">GLITCH TRACKER</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-base text-gray-400 leading-relaxed font-sans">
            Submit overlay glitches, hardware sensor mismatches, or system driver conflicts. Upvoted logs trigger automated telemetry hotfixes in active build pipelines.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Telemetry Reports", count: stats.total, color: "border-white/10" },
            { label: "Rendering & Glitches", count: stats.glitches, color: "border-neon-green/40 text-neon-green glow-text-teal" },
            { label: "Hardware & Sensors", count: stats.hardware, color: "border-[#76b900]/40 text-[#76b900]" },
            { label: "Performance Drops", count: stats.performance, color: "border-amber-500/40 text-amber-400" }
          ].map((item, idx) => (
            <div key={idx} className="glass-card p-5 flex flex-col items-center justify-center text-center space-y-1 border">
              <span className="text-[9px] min-[375px]:text-[11px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                {item.label}
              </span>
              <span className={`text-3xl font-black font-mono ${item.color}`}>
                {loading ? "..." : item.count}
              </span>
            </div>
          ))}
        </div>

        {/* Filters and Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl glass-card border border-white/10">
          {/* Categories Tab */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Telemetry Logs" },
              { id: "glitch", label: "Glitches" },
              { id: "hardware", label: "Hardware" },
              { id: "performance", label: "Performance" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer ${
                  categoryFilter === tab.id
                    ? "bg-neon-green text-obsidian border-neon-green shadow-[0_0_15px_rgba(118, 185, 0,0.4)]"
                    : "bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sorting and Submit button */}
          <div className="flex flex-col min-[440px]:flex-row items-stretch min-[440px]:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-obsidian/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-300 justify-center w-full min-[440px]:w-auto">
              <Filter className="w-3.5 h-3.5 text-neon-green" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-white font-mono flex-1 min-[440px]:flex-none text-center"
              >
                <option className="bg-obsidian text-white" value="votes">Most Voted Logs</option>
                <option className="bg-obsidian text-white" value="latest">Latest Logged</option>
              </select>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-neon-green text-obsidian hover:bg-white hover:shadow-[0_0_20px_rgba(118, 185, 0, 0.4)] transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-1.5 w-full min-[440px]:w-auto"
            >
              <Plus className="w-4 h-4" /> Log Telemetry Glitch
            </button>
          </div>
        </div>

        {/* Glitches List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-neon-green font-mono tracking-wider uppercase">Loading kernel telemetry feed...</p>
          </div>
        ) : processedIssues.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl border border-white/10 space-y-3">
            <AlertTriangle className="w-10 h-10 text-gray-500 mx-auto" />
            <h3 className="text-sm min-[375px]:text-base sm:text-lg font-bold text-white font-display uppercase leading-tight px-4">No telemetry reports match filters</h3>
            <p className="text-[11px] min-[375px]:text-xs sm:text-sm text-gray-400 font-mono px-4">Be the first operator to dispatch a hardware or rendering fault.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {processedIssues.map((issue) => {
              const hasVoted = votedIds.includes(issue.id);
              const isExpanded = expandedIssueId === issue.id;

              return (
                <div 
                  key={issue.id} 
                  className={`glass-card glass-card-hover rounded-2xl border transition-all duration-300 ${
                    isExpanded ? "border-neon-green/50 bg-neon-green/[0.02] shadow-[0_0_30px_rgba(118, 185, 0,0.1)]" : "border-white/10"
                  }`}
                >
                  <div className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                    {/* Content Section */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider border ${getCategoryColor(issue.category)}`}>
                          {issue.category}
                        </span>
                        {issue.game && (
                          <span className="text-xs font-mono text-gray-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/5">
                            Context: <strong className="text-white">{issue.game}</strong>
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 font-mono">
                          LOGGED: {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white tracking-wide font-display">
                        {issue.title}
                      </h3>

                      <p className="text-sm text-gray-300 leading-relaxed max-w-4xl font-sans">
                        {issue.description}
                      </p>

                      {/* Primary specs tags */}
                      <div className="flex flex-wrap gap-2 text-xs font-mono text-gray-300 pt-2">
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-obsidian border border-white/10">
                          <Cpu className="w-3.5 h-3.5 text-neon-green" /> {issue.specs.cpu}
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-obsidian border border-white/10">
                          <Tv className="w-3.5 h-3.5 text-neon-green" /> {issue.specs.gpu}
                        </span>
                      </div>
                    </div>

                    {/* Voting Action Section */}
                    <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-4 sm:w-32 self-stretch sm:self-auto sm:border-l sm:border-white/10 sm:pl-6">
                      <div className="text-center sm:w-full">
                        <div className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                          Affected Rigs
                        </div>
                        <div className="text-3xl font-black font-mono text-white tracking-tight">
                          {issue.votes}
                        </div>
                      </div>

                      <button
                        onClick={() => handleVote(issue.id)}
                        disabled={hasVoted}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-1.5 ${
                          hasVoted
                            ? "bg-neon-green/20 text-neon-green border-neon-green/40 cursor-default"
                            : "bg-neon-green text-obsidian border-neon-green hover:bg-white hover:shadow-[0_0_20px_rgba(118, 185, 0,0.4)] cursor-pointer"
                        }`}
                      >
                        {hasVoted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" /> Verified
                          </>
                        ) : (
                          "Confirm Fault"
                        )}
                      </button>

                      <button
                        onClick={() => toggleExpand(issue.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition sm:hidden"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expand Specs button for desktop */}
                  <div className="hidden sm:block border-t border-white/5 px-6 py-3 bg-white/[0.01]">
                    <button
                      onClick={() => toggleExpand(issue.id)}
                      className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-neon-green hover:text-white transition cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Collapse Hardware Telemetry Stack
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Inspect Rig Context ({issue.specs.os} / {issue.specs.ramGB}GB RAM)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Collapsible Details */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-3 border-t border-white/5 bg-obsidian/90 font-mono text-xs text-gray-300">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Operating System
                          </span>
                          <span className="text-white font-bold">{issue.specs.os} ({issue.specs.osVersion})</span>
                        </div>
                        <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            System Memory
                          </span>
                          <span className="text-white font-bold">{issue.specs.ramGB} GB RAM</span>
                        </div>
                        <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            GPU Driver Package
                          </span>
                          <span className="text-neon-green font-bold">{issue.specs.gpuDriver || "GeForce Game Ready"}</span>
                        </div>
                        <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Build Executable
                          </span>
                          <span className="text-white font-bold">v{issue.specs.appVersion} Stealth</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Report Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchIssues}
      />
    </main>
  );
}
