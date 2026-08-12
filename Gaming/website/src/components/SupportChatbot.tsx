"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Trash2,
  ArrowRight,
  Plus,
  Clock,
  ChevronLeft
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

interface SavedSession {
  sessionId: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface UserProfile {
  name: string;
  email: string;
  gender: "male" | "female";
  subscribeWeekly: boolean;
}

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [inputName, setInputName] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [selectedGender, setSelectedGender] = useState<"male" | "female">("male");
  const [subscribeWeekly, setSubscribeWeekly] = useState(true);
  const [formError, setFormError] = useState("");

  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showHistoryView, setShowHistoryView] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNameChange = (val: string) => {
    setInputName(val);
    if (val.trim()) {
      const lower = val.trim().toLowerCase();
      const femaleSuffixes = ["a", "i", "e", "y", "ie", "is", "na", "ne", "ia", "en", "ly", "lin"];
      const isFemaleName = femaleSuffixes.some((s) => lower.endsWith(s)) && !lower.endsWith("ma");
      if (isFemaleName) setSelectedGender("female");
    }
  };

  // Fetch all chat sessions for user from MongoDB backend
  const fetchBackendSessions = async (email: string, userName?: string) => {
    try {
      const res = await fetch(`/api/support/chat?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
        setSavedSessions(data.sessions);
        const latestSess = data.sessions[0];
        if (latestSess && latestSess.messages && latestSess.messages.length > 0) {
          setCurrentSessionId(latestSess.sessionId);
          setMessages(latestSess.messages);
        }
      }
    } catch (err) {
      console.warn("Error fetching backend chat history:", err);
    }
  };

  // Restore user profile & latest session from MongoDB / localStorage
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("mc_support_user_profile");
      if (savedProfile) {
        const parsed: UserProfile = JSON.parse(savedProfile);
        setUserProfile(parsed);
        setInputName(parsed.name);
        setInputEmail(parsed.email);
        setSelectedGender(parsed.gender);

        // Instantly display warm welcome message so window is never blank on refresh
        const welcomeText = `Welcome back **${parsed.name}**! How can I assist you with our **Documentation**, **Community Glitch Tracker**, **System Architecture**, or **App Download** today?`;
        setMessages([
          {
            id: `welcome-init-${Date.now()}`,
            sender: "assistant",
            text: welcomeText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);

        fetchBackendSessions(parsed.email, parsed.name);
      }
    } catch (e) {
      console.warn("Storage restore:", e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Start new onboarding session
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!inputName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }
    if (!inputEmail.trim() || !inputEmail.includes("@") || !inputEmail.includes(".")) {
      setFormError("Please enter a valid email.");
      return;
    }

    const newSessId = `session_${Date.now()}`;
    const profile: UserProfile = {
      name: inputName.trim(),
      email: inputEmail.trim().toLowerCase(),
      gender: selectedGender,
      subscribeWeekly
    };

    const initialWelcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      sender: "assistant",
      text: `Welcome **${profile.name}**! I'm your 24/7 Mission Control Support Assistant. How can I assist you with our **Documentation**, **Community Glitch Tracker**, **System Architecture**, or **App Download** today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setUserProfile(profile);
    setCurrentSessionId(newSessId);
    setMessages([initialWelcome]);
    localStorage.setItem("mc_support_user_profile", JSON.stringify(profile));
    setIsLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          gender: profile.gender,
          subscribeWeekly: profile.subscribeWeekly,
          sessionId: newSessId,
          message: ""
        })
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
      fetchBackendSessions(profile.email);
    } catch (err) {
      console.warn("API notice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a fresh + New Chat session
  const handleNewChat = () => {
    if (!userProfile) return;
    const freshSessionId = `session_${Date.now()}`;
    setCurrentSessionId(freshSessionId);
    setShowHistoryView(false);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: `Welcome **${userProfile.name}**! I'm your 24/7 Mission Control Support Assistant. How can I assist you with our **Documentation**, **Community Glitch Tracker**, **System Architecture**, or **App Download** today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  // Select a past session from history
  const handleSelectSession = (sess: SavedSession) => {
    setCurrentSessionId(sess.sessionId);
    setMessages(sess.messages || []);
    setShowHistoryView(false);
  };

  // Delete a session from MongoDB backend
  const handleDeleteSession = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/support/chat?sessionId=${encodeURIComponent(sessId)}`, { method: "DELETE" });
      setSavedSessions((prev) => prev.filter((s) => s.sessionId !== sessId));
      if (currentSessionId === sessId) {
        handleNewChat();
      }
    } catch (err) {
      console.warn("Error deleting session:", err);
    }
  };

  // Delete current active chat session from MongoDB backend
  const handleDeleteCurrentChat = async () => {
    if (!userProfile) return;
    if (currentSessionId) {
      try {
        await fetch(`/api/support/chat?sessionId=${encodeURIComponent(currentSessionId)}`, { method: "DELETE" });
        setSavedSessions((prev) => prev.filter((s) => s.sessionId !== currentSessionId));
      } catch (err) {
        console.warn("Error deleting current session:", err);
      }
    }
    handleNewChat();
  };

  // Clear all sessions for user
  const handleClearAllHistory = async () => {
    if (!userProfile) return;
    try {
      await fetch(`/api/support/chat?email=${encodeURIComponent(userProfile.email)}`, { method: "DELETE" });
      setSavedSessions([]);
      handleNewChat();
    } catch (err) {
      console.warn("Error clearing history:", err);
    }
  };

  // Send message & store in MongoDB
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || !userProfile || isLoading) return;

    const sessId = currentSessionId || `session_${Date.now()}`;
    if (!currentSessionId) setCurrentSessionId(sessId);

    const timestampStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: query.trim(),
      timestamp: timestampStr
    };

    const updatedList = [...messages, userMsg];
    setMessages(updatedList);
    if (!textToSend) setInputMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userProfile.name,
          email: userProfile.email,
          gender: userProfile.gender,
          subscribeWeekly: userProfile.subscribeWeekly,
          sessionId: sessId,
          message: query.trim(),
          fullHistory: updatedList
        })
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "assistant",
            text: data.reply || "Processing your query...",
            timestamp: timestampStr
          }
        ]);
      }
      fetchBackendSessions(userProfile.email);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "Brief hiccup connecting to backend. Please check your network connection.",
          timestamp: timestampStr
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserAvatar = () => {
    const seed = encodeURIComponent(
      `${userProfile?.name || "user"}-${userProfile?.email || "default"}`
    );
    const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    return (
      <img
        src={avatarUrl}
        alt={userProfile?.name || "User"}
        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-neon-green/40 shrink-0 object-cover bg-[#0e1422]"
      />
    );
  };

  const renderFormattedText = (rawText: string) => {
    if (!rawText) return null;
    const lines = rawText.split("\n");
    let itemIndex = 0;

    return lines.map((line, lIdx) => {
      const trimmed = line.trim();

      if (!trimmed) {
        itemIndex = 0;
        return <span key={lIdx} className="block h-1" />;
      }

      // Headers (### or ##)
      if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
        itemIndex = 0;
        const headerText = trimmed.replace(/^#+\s*/, "");
        return (
          <span key={lIdx} className="block font-mono font-bold text-neon-green uppercase text-[11px] mt-2 mb-1">
            {headerText}
          </span>
        );
      }

      // Handle bullet lists starting with "- ", "* ", or numbered "1. "
      let isListItem = false;
      let displayContent = line;

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        isListItem = true;
        itemIndex += 1;
        displayContent = trimmed.substring(2);
      } else if (/^\d+\.\s/.test(trimmed)) {
        isListItem = true;
        const match = trimmed.match(/^(\d+)\.\s(.*)/);
        if (match) {
          itemIndex = parseInt(match[1], 10);
          displayContent = match[2];
        }
      }

      // Parse bold **text** syntax
      const parts = displayContent.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-white font-mono">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <span key={lIdx} className="block min-h-[1.2em] my-0.5">
          {isListItem ? (
            <span className="inline-flex items-start gap-1.5">
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-neon-green/20 border border-neon-green/40 text-neon-green font-mono text-[8px] font-black shrink-0 mt-0.5 select-none">
                {itemIndex}
              </span>
              <span className="flex-1">{formattedLine}</span>
            </span>
          ) : (
            formattedLine
          )}
        </span>
      );
    });
  };

  if (!mounted) return null;

  return createPortal(
    /* Single top-level overlay with maximum z-index via inline style */
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483647, pointerEvents: "none" }}>
      {/* ── Trigger Button ── Locked to Bottom-Right */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ position: "fixed", bottom: 16, right: 16, zIndex: 2147483647, pointerEvents: "auto" }}
        className="bg-[#080c14] border-2 border-neon-green/80 text-neon-green p-3 sm:p-3.5 rounded-full shadow-[0_0_35px_rgba(118,185,0,0.5)] hover:shadow-[0_0_50px_rgba(118,185,0,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center select-none"
        aria-label="24/7 AI Support Assistant"
      >
        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        ) : (
          <span className="relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7">
            <img src="/logo.png" alt="Mission Control Chatbot" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(118,185,0,0.8)]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neon-green rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neon-green rounded-full border-2 border-[#080c14]" />
          </span>
        )}
      </button>

      {/* ── Chat Modal ── Locked to Bottom-Right with Heavy Backdrop Blur */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 72,
            right: 16,
            width: "min(340px, calc(100vw - 32px))",
            height: 460,
            maxHeight: "calc(100vh - 90px)",
            zIndex: 2147483647,
            pointerEvents: "auto",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)"
          }}
          className="bg-[#070a12]/95 border-2 border-neon-green/60 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-foreground select-none"
        >
          {/* Header */}
          <div className="bg-[#0b101d]/95 backdrop-blur-2xl p-2.5 sm:p-3 border-b border-neon-green/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {showHistoryView ? (
                <button
                  onClick={() => setShowHistoryView(false)}
                  className="text-neon-green p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-mono text-[10px]"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="relative">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-neon-green/15 border border-neon-green/50 flex items-center justify-center overflow-hidden p-0.5 shadow-[0_0_10px_rgba(118,185,0,0.35)]">
                      <img src="/logo.png" alt="Mission Control" className="w-full h-full object-contain" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-neon-green rounded-full border border-[#080c14]" />
                  </div>
                  <div>
                    <h3 className="font-mono text-[10px] sm:text-[11px] font-black tracking-wider text-white uppercase flex items-center gap-1">
                      MISSION CONTROL AI <Sparkles className="w-3 h-3 text-neon-green animate-pulse" />
                    </h3>
                    <p className="font-mono text-[8px] text-neon-green/90 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
                      24/7 SUPPORT ASSISTANT
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {userProfile && (
                <>
                  {/* + New Chat Button */}
                  <button
                    onClick={handleNewChat}
                    title="Start New Chat"
                    className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-neon-green/20 border border-neon-green/50 text-neon-green text-[8px] sm:text-[9px] font-mono font-bold rounded-lg hover:bg-neon-green hover:text-obsidian transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>

                  {/* History Sessions Drawer Toggler */}
                  <button
                    onClick={() => setShowHistoryView((prev) => !prev)}
                    title="Chat History"
                    className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer ${
                      showHistoryView
                        ? "bg-neon-green text-obsidian border-neon-green"
                        : "text-gray-400 border-white/15 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Current Chat Button */}
                  <button
                    onClick={handleDeleteCurrentChat}
                    title="Delete Current Chat"
                    className="p-1 sm:p-1.5 rounded-lg border border-white/15 text-gray-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="text-gray-400 hover:text-white p-1 sm:p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!userProfile ? (
            <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto font-mono text-xs bg-[#070a12]/95 backdrop-blur-2xl">
              <div>
                <div className="text-center mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-2 rounded-xl bg-neon-green/15 border border-neon-green/40 flex items-center justify-center p-1 shadow-[0_0_15px_rgba(118,185,0,0.25)] overflow-hidden">
                    <img src="/logo.png" alt="Mission Control" className="w-full h-full object-contain" />
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">24/7 SUPPORT SESSION</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Enter details to unlock assistant chat.</p>
                </div>
                {formError && (
                  <div className="mb-2 p-2 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] rounded-lg text-center font-bold">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleStartChat} className="space-y-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-neon-green uppercase mb-1">Your Name</label>
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      className="w-full bg-[#0e1422]/90 border border-white/15 focus:border-neon-green rounded-lg py-1.5 px-2.5 text-xs text-white outline-none transition-all placeholder:text-gray-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neon-green uppercase mb-1">Your Email</label>
                    <input
                      type="email"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      placeholder="alex@gaming.com"
                      className="w-full bg-[#0e1422]/90 border border-white/15 focus:border-neon-green rounded-lg py-1.5 px-2.5 text-xs text-white outline-none transition-all placeholder:text-gray-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neon-green uppercase mb-1">Gamer Profile</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedGender("male")}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          selectedGender === "male"
                            ? "bg-cyan-500/25 border-cyan-400 text-cyan-300"
                            : "bg-[#0e1422]/90 border-white/15 text-gray-400 hover:text-white"
                        }`}
                      >
                        👨 Male Gamer
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGender("female")}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          selectedGender === "female"
                            ? "bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-300"
                            : "bg-[#0e1422]/90 border-white/15 text-gray-400 hover:text-white"
                        }`}
                      >
                        👩 Female Gamer
                      </button>
                    </div>
                  </div>
                  <div className="pt-1">
                    <label className="flex items-start gap-2 text-[10px] text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={subscribeWeekly}
                        onChange={(e) => setSubscribeWeekly(e.target.checked)}
                        className="mt-0.5 accent-neon-green w-3.5 h-3.5 rounded"
                      />
                      <span>
                        Receive <strong>weekly gaming intel updates</strong> via email
                      </span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-1 py-2 bg-neon-green text-obsidian font-mono text-[11px] font-black uppercase tracking-wider rounded-lg hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        START 24/7 SUPPORT CHAT <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
              <p className="text-[9px] text-gray-500 text-center mt-3 font-mono">🔒 Encrypted Session • Zero Spam</p>
            </div>
          ) : showHistoryView ? (
            /* Backend Saved Chat History Drawer */
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs bg-[#070a12]/95 backdrop-blur-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <h4 className="text-[11px] font-black text-white uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neon-green" /> CHAT HISTORY ({savedSessions.length})
                  </h4>
                  {savedSessions.length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear All
                    </button>
                  )}
                </div>

                {savedSessions.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-8">No saved chat sessions in database.</p>
                ) : (
                  <div className="space-y-2">
                    {savedSessions.map((sess) => (
                      <div
                        key={sess.sessionId}
                        onClick={() => handleSelectSession(sess)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          sess.sessionId === currentSessionId
                            ? "bg-neon-green/15 border-neon-green text-white"
                            : "bg-[#0e1422]/90 border-white/15 text-gray-300 hover:border-neon-green/50 hover:text-white"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-[10px] truncate">{sess.title || "Support Chat"}</p>
                          <p className="text-[8px] text-gray-500 mt-0.5">
                            {sess.updatedAt ? new Date(sess.updatedAt).toLocaleDateString() : "Recent"} •{" "}
                            {sess.messages?.length || 0} messages
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(sess.sessionId, e)}
                          className="opacity-70 hover:opacity-100 text-gray-400 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleNewChat}
                className="w-full mt-3 py-2 bg-neon-green text-obsidian font-mono text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> CREATE NEW CHAT
              </button>
            </div>
          ) : (
            /* Active Chat View */
            <div className="flex-1 flex flex-col overflow-hidden bg-[#070a12]/95 backdrop-blur-2xl">
              <div className="flex-1 p-2.5 sm:p-3 overflow-y-auto space-y-2.5 sm:space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "assistant" && (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-neon-green/15 border border-neon-green/40 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden p-0.5 shadow-[0_0_8px_rgba(118,185,0,0.25)]">
                        <img src="/logo.png" alt="Mission Control" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[82%] p-2 sm:p-2.5 rounded-xl text-[10px] sm:text-[11px] leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-neon-green/20 border border-neon-green/50 text-white rounded-tr-none"
                          : "bg-[#0e1422]/90 border border-white/15 text-gray-200 rounded-tl-none"
                      }`}
                    >
                      <div>{renderFormattedText(msg.text)}</div>
                      <div className="text-[8px] text-gray-500 mt-1 text-right font-mono">{msg.timestamp}</div>
                    </div>
                    {msg.sender === "user" && renderUserAvatar()}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 items-center">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-neon-green/15 border border-neon-green/40 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-[0_0_8px_rgba(118,185,0,0.25)]">
                      <img src="/logo.png" alt="Mission Control" className="w-full h-full object-contain animate-spin" />
                    </div>
                    <span className="text-neon-green/80 font-mono text-[9px] sm:text-[10px] animate-pulse">
                      Analyzing website docs...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messages.length <= 2 && (
                <div className="p-2 border-t border-white/10 bg-[#0b101d]/90">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      "📚 Explore Docs & APIs",
                      "💬 Community Tracker",
                      "⚡ System Architecture",
                      "📬 Contact Support"
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleSendMessage(chip)}
                        className="text-[8px] sm:text-[9px] font-mono bg-[#0e1422]/90 border border-white/15 hover:border-neon-green/50 text-gray-300 hover:text-neon-green px-1.5 py-1 rounded-lg transition-all cursor-pointer truncate text-left"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-2 sm:p-3 border-t border-white/10 shrink-0 bg-[#0b101d]/95">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-1.5 sm:gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask 24/7 support..."
                    className="flex-1 bg-[#0e1422]/90 border border-white/15 focus:border-neon-green rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs text-white outline-none transition-all placeholder:text-gray-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-neon-green text-obsidian p-1.5 sm:p-2 rounded-xl hover:bg-white transition-all disabled:opacity-40 cursor-pointer font-bold shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
