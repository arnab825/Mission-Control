import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Send,
  BrainCircuit,
  Mic,
  Zap,
  Activity,
  ShieldCheck,
  Cpu,
  Layers,
  Info as InfoIcon,
  ChevronRight,
  X,
  Edit2,
  RefreshCw,
  VolumeX,
  Volume2,
  Menu,
  ThumbsUp,
  ThumbsDown,
  ChevronDown
} from 'lucide-react';
import type { TelemetryState } from '../types/telemetry';
import NeuralHistory from '../components/NeuralHistory';
import { useUser } from '@clerk/clerk-react';

/* ─── Sub-components ─────────────────────────────────────────────── */

const StatusItem: React.FC<{ label: string; active: boolean; icon: any }> = ({ label, active, icon: Icon }) => (
  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-br from-white/[0.05] to-transparent border border-white/4 hover:bg-white/4 transition-all">
    <div className="flex items-center gap-2.5">
      <div className={`p-1.5 rounded-md ${active ? 'bg-neon-green/10 text-neon-green' : 'bg-zinc-800/60 text-zinc-600'}`}>
        <Icon className="w-3 h-3" />
      </div>
      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
    </div>
    {active ? (
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-bold text-neon-green/70 uppercase">Live</span>
        <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_6px_#76b900] animate-pulse" />
      </div>
    ) : (
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700/50" />
    )}
  </div>
);

const CapabilityCard: React.FC<{ title: string; description: string; icon: any }> = ({ title, description, icon: Icon }) => (
  <div className="p-3 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/4 hover:border-neon-green/15 transition-all group relative overflow-hidden">
    <div className="absolute top-2 right-2 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
      <Icon className="w-6 h-6 text-neon-green" />
    </div>
    <h5 className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-0.5">{title}</h5>
    <p className="text-[9px] font-medium text-zinc-600 leading-relaxed pr-4">{description}</p>
  </div>
);

const ChatBubble: React.FC<{
  role: 'agent' | 'user';
  text: string;
  time: string;
  isTyping?: boolean;
  isThinking?: boolean;
  id?: string;
  isPopup?: boolean;
  isCompact?: boolean;
  onTypingComplete?: (id: string) => void;
  onRetry?: (id: string, newText: string) => void;
  onToggleTTS?: () => void;
  isTTSEnabled?: boolean;
  searchStatus?: string;
  onFeedback?: (isHelpful: boolean, reason: string) => void;
}> = React.memo(({ role, text, time, isTyping, isThinking, id, isPopup, isCompact, onTypingComplete, onRetry, onToggleTTS, isTTSEnabled, searchStatus, onFeedback }) => {
  const { user, isSignedIn } = useUser();
  const [displayedText, setDisplayedText] = useState(isTyping ? '' : text);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [feedbackState, setFeedbackState] = useState<'none' | 'positive' | 'negative' | 'submitted'>('none');
  const [feedbackReason, setFeedbackReason] = useState('');

  // If text changes and we shouldn't be typing, reset to full text immediately
  useEffect(() => {
    if (!isTyping && !isEditing) {
      setDisplayedText(text);
      setEditText(text);
    }
  }, [text, isTyping, isEditing]);

  // Store complete callback in ref to prevent restarting the effect if the reference changes
  const onTypingCompleteRef = useRef(onTypingComplete);
  useEffect(() => {
    onTypingCompleteRef.current = onTypingComplete;
  }, [onTypingComplete]);

  // Typing animation — chunk-aware streaming version.
  // When `text` grows (backend sends another batch), we continue from
  // `currentIndex` rather than restarting from 0, so animation always
  // makes forward progress during streaming.
  const currentIndexRef = useRef(isTyping ? 0 : text.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isTyping) {
      // Typing finished or bubble was already complete on mount
      if (intervalRef.current) clearInterval(intervalRef.current);
      currentIndexRef.current = text.length;
      return;
    }

    const cleanText = text.split('\u200b')[0];
    const fullLength = cleanText.length;

    // If our current cursor is already past the end (e.g. text shrank somehow), clamp
    if (currentIndexRef.current > fullLength) currentIndexRef.current = fullLength;

    // Already have an interval running — it will pick up the new fullLength automatically
    if (intervalRef.current !== null) return;

    // Use a fixed 30ms interval to prevent ReactMarkdown from destroying the main thread
    const speed = 30;

    intervalRef.current = setInterval(() => {
      const target = text.split('\u200b')[0].length;
      // Dynamically calculate how many characters to reveal per tick based on the current known length
      // so that longer chunks stream faster without dropping frames.
      const currentCharsPerTick = Math.max(2, Math.floor(target / 40));
      
      currentIndexRef.current = Math.min(currentIndexRef.current + currentCharsPerTick, target);
      setDisplayedText(text.slice(0, currentIndexRef.current));

      if (currentIndexRef.current >= target) {
        // Reached the end of the CURRENT text snapshot; pause the interval.
        // If more chunks arrive, the effect below will restart it.
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        // Fire complete callback only if text hasn't grown since we started
        if (onTypingCompleteRef.current && id) {
          onTypingCompleteRef.current(id);
        }
      }
    }, speed);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
    // Re-run when text grows (new chunk) OR isTyping changes
  }, [text, isTyping, id]);


  const handleSkip = () => {
    if (isTyping && displayedText !== text) {
      setDisplayedText(text);
      if (onTypingCompleteRef.current && id) onTypingCompleteRef.current(id);
    }
  };

  const renderFormattedText = (rawText: string) => {
    if (!rawText) return null;
    const cleanText = rawText.split('\u200b')[0];
    
    // Split text into lines
    const lines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];
    
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    
    // Helper to process inline formatting (bold, inline code) inside a string
    const renderInline = (textLine: string, keyPrefix: string) => {
      const tokens: { type: 'text' | 'bold' | 'code'; content: string }[] = [];
      let i = 0;
      let currentText = '';
      
      while (i < textLine.length) {
        // Check for inline code: `
        if (textLine[i] === '`' && !textLine.startsWith('```', i)) {
          if (currentText) {
            tokens.push({ type: 'text', content: currentText });
            currentText = '';
          }
          let endIdx = textLine.indexOf('`', i + 1);
          if (endIdx !== -1) {
            tokens.push({ type: 'code', content: textLine.substring(i + 1, endIdx) });
            i = endIdx + 1;
          } else {
            // Unclosed backtick: treat as text
            tokens.push({ type: 'text', content: textLine.substring(i) });
            break;
          }
        }
        // Check for bold: **
        else if (textLine.startsWith('**', i)) {
          if (currentText) {
            tokens.push({ type: 'text', content: currentText });
            currentText = '';
          }
          let endIdx = textLine.indexOf('**', i + 2);
          if (endIdx !== -1) {
            tokens.push({ type: 'bold', content: textLine.substring(i + 2, endIdx) });
            i = endIdx + 2;
          } else {
            // Unclosed bold: treat as text
            tokens.push({ type: 'text', content: textLine.substring(i) });
            break;
          }
        } else {
          currentText += textLine[i];
          i++;
        }
      }
      
      if (currentText) {
        tokens.push({ type: 'text', content: currentText });
      }
      
      return tokens.map((token, idx) => {
        const key = `${keyPrefix}-${idx}`;
        if (token.type === 'bold') {
          return <strong key={key} className="font-extrabold text-neon-green">{token.content}</strong>;
        } else if (token.type === 'code') {
          return <code key={key} className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-neon-green font-mono text-[11px]">{token.content}</code>;
        } else {
          return token.content;
        }
      });
    };

    let lineIndex = 0;
    while (lineIndex < lines.length) {
      const line = lines[lineIndex];
      
      // Fenced code block toggle
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Close the code block
          const codeContent = codeLines.join('\n');
          const currentLang = codeLanguage;
          elements.push(
            <div key={`codeblock-${lineIndex}`} className="my-3 overflow-hidden rounded-xl border border-white/10 bg-black/80 font-mono text-[11px] text-zinc-300">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02] text-[9px] font-black uppercase text-zinc-500 tracking-wider">
                <span>{currentLang || 'CODE'}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(codeContent)}
                  className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 active:scale-95 transition-all text-zinc-400 hover:text-white cursor-pointer"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto whitespace-pre">{codeContent}</pre>
            </div>
          );
          codeLines = [];
          codeLanguage = '';
          inCodeBlock = false;
        } else {
          // Open the code block
          inCodeBlock = true;
          codeLanguage = line.trim().substring(3).trim();
        }
        lineIndex++;
        continue;
      }
      
      if (inCodeBlock) {
        codeLines.push(line);
        lineIndex++;
        continue;
      }
      
      // Headers
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('### ')) {
        elements.push(
          <h5 key={`h3-${lineIndex}`} className="text-[11px] font-black text-neon-green uppercase tracking-wider mt-4 mb-2">
            {renderInline(line.substring(4), `h3-${lineIndex}`)}
          </h5>
        );
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(
          <h4 key={`h2-${lineIndex}`} className="text-[12px] font-extrabold text-white uppercase tracking-widest mt-5 mb-2.5">
            {renderInline(line.substring(3), `h2-${lineIndex}`)}
          </h4>
        );
      } else if (trimmedLine.startsWith('# ')) {
        elements.push(
          <h3 key={`h1-${lineIndex}`} className="text-[14px] font-black text-white uppercase tracking-widest mt-6 mb-3 border-b border-white/5 pb-1">
            {renderInline(line.substring(2), `h1-${lineIndex}`)}
          </h3>
        );
      }
      // Bullet lists
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
        const bulletText = trimmedLine.substring(2);
        elements.push(
          <div key={`li-${lineIndex}`} className="flex items-start gap-2 pl-2 my-1">
            <span className="text-neon-green mt-1 shrink-0 select-none">•</span>
            <span className="flex-1">{renderInline(bulletText, `li-${lineIndex}`)}</span>
          </div>
        );
      }
      // Normal paragraph
      else {
        // If line is empty, render a small vertical spacer
        if (line.trim() === '') {
          elements.push(<div key={`spacer-${lineIndex}`} className="h-2" />);
        } else {
          elements.push(
            <p key={`p-${lineIndex}`} className="my-1.5 leading-relaxed">
              {renderInline(line, `p-${lineIndex}`)}
            </p>
          );
        }
      }
      
      lineIndex++;
    }
    
    // If the message ends while still inside an unclosed code block (e.g. typing)
    if (inCodeBlock && codeLines.length > 0) {
      const codeContent = codeLines.join('\n');
      elements.push(
        <div key={`codeblock-unclosed`} className="my-3 overflow-hidden rounded-xl border border-white/10 bg-black/80 font-mono text-[11px] text-zinc-300">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02] text-[9px] font-black uppercase text-zinc-500 tracking-wider">
            <span>{codeLanguage || 'CODE'} (Writing...)</span>
          </div>
          <pre className="p-4 overflow-x-auto whitespace-pre">{codeContent}</pre>
        </div>
      );
    }
    
    return elements;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} ${isCompact ? 'mb-2' : 'mb-6'}`}
    >
      <div className="max-w-[90%] sm:max-w-[85%] space-y-1 min-w-0">
        {!isCompact && (
          <div className={`flex items-center gap-2 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center overflow-hidden ${role === 'agent'
                ? 'bg-neon-green/10 border border-neon-green/20'
                : 'bg-white/5 border border-white/10'
              }`}>
              {role === 'agent' ? (
                <BrainCircuit className={`w-3 h-3 text-neon-green ${isThinking ? 'animate-pulse' : ''}`} />
              ) : isSignedIn && user?.imageUrl ? (
                <img src={user.imageUrl} className="w-full h-full object-cover" alt="User" />
              ) : (
                <div className="w-1 h-1 rounded-full bg-zinc-400" />
              )}
            </div>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
              {role === 'agent'
                ? isThinking ? 'Agent is thinking' : 'Agent'
                : isSignedIn && user
                  ? (user.username || user.firstName || 'You')
                  : 'You'}
            </span>
            <span className="text-[8px] font-medium text-zinc-700">{time}</span>
          </div>
        )}
        <div className="relative group flex items-start justify-end">
          {role === 'user' && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="absolute -left-9 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 border border-white/10 hover:bg-white/10 hover:border-neon-green/30 text-zinc-400 hover:text-neon-green"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {role === 'agent' && onToggleTTS && (
            <button
              type="button"
              onClick={onToggleTTS}
              className={`absolute -right-9 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border cursor-pointer ${
                isTTSEnabled
                  ? 'bg-neon-green/10 border-neon-green/20 text-neon-green hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-neon-green/10 hover:border-neon-green/30 hover:text-neon-green'
              }`}
              title={isTTSEnabled ? 'Mute Text-to-Speech' : 'Enable Text-to-Speech'}
            >
              {isTTSEnabled
                ? <Volume2 className="w-3.5 h-3.5" />
                : <VolumeX className="w-3.5 h-3.5" />
              }
            </button>
          )}
          {isEditing ? (
            <div className={`p-3 sm:p-4 rounded-2xl w-full text-[12px] sm:text-[13px] bg-neon-green/10 border border-neon-green/30 text-cyan-50 rounded-tr-sm ${isPopup ? '' : 'backdrop-blur-xl'} flex flex-col gap-3`}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-black/40 border border-neon-green/20 rounded-xl p-3 text-cyan-50 min-h-[80px] focus:outline-none focus:border-neon-green/50 resize-y font-medium leading-relaxed custom-scrollbar"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setIsEditing(false);
                    if (onRetry && id && editText.trim() !== text) onRetry(id, editText);
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditText(text);
                  }
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditText(text); }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (onRetry && id && editText.trim() !== text) onRetry(id, editText);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-neon-green text-black hover:bg-neon-green transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Save & Retry
                </button>
              </div>
            </div>
          ) : (
            <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
              onClick={handleSkip}
              className={`${isCompact ? 'p-2 text-[11px]' : 'p-3 sm:p-4 text-[12px] sm:text-[13px]'} leading-relaxed font-medium whitespace-pre-wrap w-full max-w-full overflow-hidden ${isTyping ? 'cursor-pointer' : ''} ${role === 'agent'
                  ? `bg-white/[0.06] border border-white/15 text-zinc-200 rounded-tl-sm shadow-[0_0_15px_rgba(118, 185, 0,0.03)] ${isPopup ? '' : 'backdrop-blur-xl'}`
                  : `bg-neon-green/10 border border-neon-green/30 text-cyan-50 rounded-tr-sm shadow-[0_0_15px_rgba(118, 185, 0,0.15)] ${isPopup ? '' : 'backdrop-blur-xl'}`
                }`}>
              {isThinking ? (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <>
                  {renderFormattedText(displayedText)}
                  {isTyping && <span className="inline-block w-1.5 h-3.5 ml-1 bg-neon-green animate-pulse align-middle" />}
                  {role === 'agent' && searchStatus && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center">
                      {searchStatus === 'success' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neon-green/10 border border-neon-green/20 text-neon-green backdrop-blur-md shadow-[0_2px_8px_rgba(118, 185, 0,0.15)] select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                          <span>🌐 Web Search Active</span>
                        </div>
                      )}
                      {searchStatus === 'blocked' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 backdrop-blur-md shadow-[0_2px_8px_rgba(245,158,11,0.15)] select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>🔒 Privacy Shield: Search Blocked</span>
                        </div>
                      )}
                      {(searchStatus === 'failed' || searchStatus === 'empty') && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 backdrop-blur-md shadow-[0_2px_8px_rgba(239,68,68,0.15)] select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          <span>⚠️ Web Search Offline/Failed</span>
                        </div>
                      )}
                    </div>
                  )}
                  {role === 'agent' && onFeedback && !isTyping && feedbackState !== 'submitted' && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setFeedbackState('submitted');
                          onFeedback(true, '');
                        }}
                        className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-neon-yellow transition-colors"
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setFeedbackState(feedbackState === 'negative' ? 'none' : 'negative');
                        }}
                        className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Not Helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {feedbackState === 'negative' && (
                    <div className="mt-2.5 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="relative">
                        <select
                          className="appearance-none bg-black/60 border border-neon-green/20 rounded-lg pl-3 pr-8 py-1.5 text-[10px] sm:text-[11px] text-cyan-50 font-medium outline-none focus:border-neon-green/60 focus:bg-black/80 transition-all cursor-pointer shadow-[0_0_10px_rgba(118, 185, 0,0.05)]"
                          value={feedbackReason}
                          onChange={(e) => setFeedbackReason(e.target.value)}
                        >
                          <option value="">Select reason (optional)</option>
                          <option value="inaccurate">Inaccurate</option>
                          <option value="irrelevant">Irrelevant</option>
                          <option value="too verbose">Too Verbose</option>
                          <option value="incomplete">Incomplete</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neon-green/70">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFeedbackState('submitted');
                          onFeedback?.(false, feedbackReason);
                        }}
                        className="px-3 py-1.5 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/20 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide text-neon-green transition-all active:scale-95 shadow-[0_0_10px_rgba(118, 185, 0,0.05)]"
                      >
                        Submit
                      </button>
                    </div>
                  )}
                  {feedbackState === 'submitted' && (
                    <div className="mt-2 text-[9px] text-zinc-500 italic">
                      Feedback submitted.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// const DEFAULT_HISTORY_ITEMS = [
//   { id: 'default', title: 'Neural Link Stream', time: 'Active', preview: 'How can I assist you today?' },
//   { id: 'cyberpunk', title: 'Cyberpunk Optimization', time: '2h ago', preview: 'Frame Gen latency...' },
//   { id: 'diagnostics', title: 'System Diagnostics', time: '5h ago', preview: 'VRAM at 92% load' },
//   { id: 'recon', title: 'Tactical Recon', time: 'Yesterday', preview: 'Detection test' },
//   { id: 'calibration', title: 'Neural Link Calibration', time: 'Yesterday', preview: 'Syncing tactical nodes' },
// ];

// const DEFAULT_CONVERSATIONS: Record<string, { role: 'agent' | 'user'; text: string; time: string; isTyping?: boolean; isThinking?: boolean; id?: string }[]> = {
//   default: [
//     { role: 'agent', text: 'Neural Link established. I am your Agentic AI Assistant, powered by NVIDIA NIM. I can monitor your gameplay, provide tactical advice, and automate system tasks. How can I assist you today?', time: new Date().toLocaleTimeString([], { hour12: false }) }
//   ],
//   cyberpunk: [
//     { role: 'agent', text: 'Neural Link established.', time: '2h ago' },
//     { role: 'user', text: 'Can we optimize Cyberpunk 2077?', time: '2h ago' },
//     { role: 'agent', text: 'Analyzing Cyberpunk 2077 profile. Recommending DLSS Frame Generation and lowering screen space reflections to High. Applied kernel-level scheduling for smoother frame delivery.', time: '2h ago' }
//   ],
//   diagnostics: [
//     { role: 'agent', text: 'Neural Link established.', time: '5h ago' },
//     { role: 'user', text: 'Run diagnostics, system is sluggish.', time: '5h ago' },
//     { role: 'agent', text: 'Diagnostics complete. VRAM is at 92% load due to background texture caching. Cleaned standby list and optimized memory page allocation. Reclaimed 1.4 GB VRAM.', time: '5h ago' }
//   ],
//   recon: [
//     { role: 'agent', text: 'Neural Link established.', time: 'Yesterday' },
//     { role: 'user', text: 'Test the enemy detection pipeline.', time: 'Yesterday' },
//     { role: 'agent', text: 'Vision API tactical recon active. Object detection latency is 14ms. Nemotron model confirms high confidence in combat overlay tracking. Active scanning enabled.', time: 'Yesterday' }
//   ],
//   calibration: [
//     { role: 'agent', text: 'Neural Link established.', time: 'Yesterday' },
//     { role: 'user', text: 'Calibrate the neural engine.', time: 'Yesterday' },
//     { role: 'agent', text: 'Neural Link established. Synced with 12 tactical node sensors. Synaptic weights normalized. Latency stabilized at 42ms. System is fully responsive.', time: 'Yesterday' }
//   ]
// };

// Module-level cache to persist the last processed agent response across mounts/unmounts
let globalLastProcessedResponse: string | null = null;

// Module-level flag to prevent auto-creating multiple initial sessions during strict-mode remounts
let globalIsCreatingInitialSession = false;

/* ─── Main Page ──────────────────────────────────────────────────── */

const AgentPage: React.FC<{
  state: TelemetryState | null;
  onCommand: (type: string, payload: any) => void;
  isAgentic: boolean;
  connected?: boolean;
  isPopup?: boolean;
  isIntelOpen?: boolean;
  setIsIntelOpen?: (open: boolean) => void;
}> = ({
  state,
  onCommand,
  isAgentic,
  connected,
  isPopup,
  isIntelOpen: propIsIntelOpen,
  setIsIntelOpen: propSetIsIntelOpen
}) => {
  const { user, isSignedIn } = useUser();
  const userId = isSignedIn && user ? user.id : 'guest';
  const isCompact = isPopup && state?.config?.overlay?.agent_compact === true;

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(() => {
    try { return localStorage.getItem('aero_tts_enabled') !== 'false'; } catch { return true; }
  });

  // Sync stored mute preference to backend whenever connection is established
  useEffect(() => {
    if (connected) {
      onCommand('set_tts_muted', { muted: !isTTSEnabled });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);
  
  const [localIsIntelOpen, setLocalIsIntelOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1280 : true);
  const isIntelOpen = propIsIntelOpen !== undefined ? propIsIntelOpen : localIsIntelOpen;
  const setIsIntelOpen = propSetIsIntelOpen !== undefined ? propSetIsIntelOpen : setLocalIsIntelOpen;
  const [isHistoryOpen, setIsHistoryOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1280 : false);
  const [isThinking, setIsThinking] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [secKeys, setSecKeys] = useState<string[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);
  const configRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastConfigRequestRef = useRef<number>(0);

  // Request config on mount with debouncing to prevent request spam
  useEffect(() => {
    const hasConfig = state?.config?.privacy !== undefined;
    if (hasConfig) {
      setConfigLoaded(true);
      // Clear any pending timeouts when config arrives
      if (configRequestTimeoutRef.current) {
        clearTimeout(configRequestTimeoutRef.current);
        configRequestTimeoutRef.current = null;
      }
    } else if (!configLoaded) {
      // Only request config if not requested recently (debounce: 500ms)
      const now = Date.now();
      if (now - lastConfigRequestRef.current > 500) {
        lastConfigRequestRef.current = now;
        onCommand('request_state', { keys: ['config'] });
      }

      // Set timeout for retry only if not already set
      if (!configRequestTimeoutRef.current) {
        configRequestTimeoutRef.current = setTimeout(() => {
          configRequestTimeoutRef.current = null;
          // If config still not loaded, request again (single retry)
          if (!state?.config && Date.now() - lastConfigRequestRef.current > 500) {
            lastConfigRequestRef.current = Date.now();
            onCommand('request_state', { keys: ['config'] });
          }
        }, 1000);
      }
    }

    return () => {
      if (configRequestTimeoutRef.current) {
        clearTimeout(configRequestTimeoutRef.current);
        configRequestTimeoutRef.current = null;
      }
    };
  }, [state?.config, configLoaded, onCommand]);

  useEffect(() => {
    if (!isVerifyModalOpen) return;

    setIsGeneratingKeys(true);
    let intervalId: any;
    let ticks = 0;

    const generateRandomHexBlock = () => {
      const chars = '0123456789ABCDEF';
      let block = '';
      for (let i = 0; i < 5; i++) {
        block += chars[Math.floor(Math.random() * chars.length)];
      }
      return block;
    };

    intervalId = setInterval(() => {
      const newKeys = Array.from({ length: 8 }, () => generateRandomHexBlock());
      setSecKeys(newKeys);
      ticks++;

      if (ticks > 20) {
        clearInterval(intervalId);
        setIsGeneratingKeys(false);
        const seedStr = `${userId}_${activeSessionId}_sec_shield`;
        const finalKeys = Array.from({ length: 8 }, (_, idx) => {
          let hash = 5381;
          const combined = seedStr + idx;
          for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) + hash) + combined.charCodeAt(i);
            hash |= 0;
          }
          // Murmur-style bit mixer for high entropy scrambled keys
          let mix = Math.abs(hash);
          mix = ((mix >> 16) ^ mix) * 0x45d9f3b;
          mix = ((mix >> 16) ^ mix) * 0x45d9f3b;
          mix = (mix >> 16) ^ mix;
          const hex = mix.toString(16).toUpperCase().padStart(5, '0');
          return hex.slice(-5);
        });
        setSecKeys(finalKeys);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [isVerifyModalOpen, userId, activeSessionId]);

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [conversations, setConversations] = useState<Record<string, { role: 'agent' | 'user'; text: string; time: string; isTyping?: boolean; isThinking?: boolean; id?: string; dbId?: number; searchStatus?: string }[]>>({});
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const lastLoadedUserIdRef = useRef<string | null>(null);
  const lastProcessedResponseRef = useRef<string | null>(globalLastProcessedResponse || state?.agent_response || null);
  const isCreatingInitialSessionRef = useRef(false);
  const isCreatingNewSessionRef = useRef(false); // guard against double-click / race on new session
  // Track the last session ID for which we fetched history, to avoid duplicate requests
  const lastFetchedSessionRef = useRef<string | null>(null);
  // Track which sessions have been prefetched to avoid duplicate prefetch calls
  const prefetchedSessionsRef = useRef<Set<string>>(new Set());
  // Track newly-created session IDs that have no history yet (skip prefetch)
  const pendingNewSessionsRef = useRef<Set<string>>(new Set());

  // Synchronize loading whenever userId changes
  useEffect(() => {
    if (userId && lastLoadedUserIdRef.current !== userId) {
      onCommand('get_chat_sessions', { userId });
      isCreatingInitialSessionRef.current = false;
      globalIsCreatingInitialSession = false;

      if (lastLoadedUserIdRef.current !== null) {
        lastProcessedResponseRef.current = null;
        globalLastProcessedResponse = null;
      }

      // Try to migrate local storage history if present
      try {
        const migratedKey = `agent_history_migrated_${userId}`;
        const isAlreadyMigrated = localStorage.getItem(migratedKey);
        if (!isAlreadyMigrated) {
          const localSessionsRaw = localStorage.getItem(`agent_history_items_${userId}`);
          const localConversationsRaw = localStorage.getItem(`agent_conversations_${userId}`);
          if (localSessionsRaw && localConversationsRaw) {
            const sessions = JSON.parse(localSessionsRaw);
            const conversations = JSON.parse(localConversationsRaw);
            if (sessions && sessions.length > 0) {
              console.log(`Migrating local storage history for user ${userId} to database...`);
              onCommand('migrate_local_history', { userId, sessions, conversations });
            }
          }
          localStorage.setItem(migratedKey, 'true');
        }
      } catch (e) {
        console.error("Failed to migrate local history:", e);
      }

      lastLoadedUserIdRef.current = userId;
    }
  }, [userId, onCommand]);

  // Sync sessions from backend
  // NOTE: activeSessionId is intentionally NOT in the dep-array to prevent re-evaluation
  // every time the user clicks a session. We capture it via ref for the stale-closure check.
  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  });

  useEffect(() => {
    if (!state?.chat_sessions) return;

    const chatSessions = state.chat_sessions;

    // Clean up pendingNewSessionsRef for sessions that now exist in the backend list
    chatSessions.forEach((s: any) => {
      pendingNewSessionsRef.current.delete(s.id);
    });

    // Preserve existing titles from local optimistic renames before overwriting
    setHistoryItems(prev => {
      const localTitleMap = new Map(prev.map(i => [i.id, i.title]));
      return chatSessions.map((s: any) => ({
        ...s,
        // Keep the locally-set title if we renamed it and backend hasn't caught up yet
        title: localTitleMap.has(s.id) && localTitleMap.get(s.id) !== s.title
          ? localTitleMap.get(s.id)
          : s.title,
      }));
    });

    let timeoutIds: ReturnType<typeof setTimeout>[] = [];

    if (state.chat_sessions.length > 0) {
      isCreatingInitialSessionRef.current = false;
      const currentId = activeSessionIdRef.current;
      const exists = state.chat_sessions.some((s: any) => s.id === currentId) || pendingNewSessionsRef.current.has(currentId);
      if (!currentId || !exists) {
        if (!isPopup) {
          setActiveSessionId(state.chat_sessions[0].id);
        }
      }
 
      // Eager background prefetch: load history for up to 8 sessions so switching is instant.
      // Skip sessions we've already prefetched AND newly-created sessions (they have no history).
      if (!isPopup) {
        const toPrefetch = state.chat_sessions
          .filter((s: any) =>
            s.id !== currentId &&
            !prefetchedSessionsRef.current.has(s.id) &&
            !pendingNewSessionsRef.current.has(s.id)
          )
          .slice(0, 8);
        toPrefetch.forEach((s: any, i: number) => {
          prefetchedSessionsRef.current.add(s.id);
          const id = setTimeout(() => onCommand('get_chat_history', { sessionId: s.id, isBackground: true }), i * 20);
          timeoutIds.push(id);
        });
      }
    } else if (state.chat_sessions.length === 0 && !isCreatingInitialSessionRef.current && !globalIsCreatingInitialSession && !isPopup) {
      isCreatingInitialSessionRef.current = true;
      globalIsCreatingInitialSession = true;
      const newId = `session_${Date.now()}`;
      // Use a functional read of current historyItems length to avoid stale closure
      setHistoryItems(prev => {
        const title = `Optimization Session ${prev.length + 1}`;
        pendingNewSessionsRef.current.add(newId);
        onCommand('create_chat_session', { sessionId: newId, title, userId });
        return prev;
      });
      setActiveSessionId(newId);
    }
    
    return () => {
      for (const id of timeoutIds) {
        clearTimeout(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.chat_sessions, userId, onCommand, isPopup]);
 
  // Synchronize activeSessionId with backend state (especially useful for popup overlay sync)
  useEffect(() => {
    if (state?.active_chat_session_id && state.active_chat_session_id !== activeSessionId) {
      setActiveSessionId(state.active_chat_session_id);
    }
  }, [state?.active_chat_session_id, activeSessionId]);
 
  // Fetch history when active session changes or when connection is established
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (activeSessionId && connected) {
      if (lastFetchedSessionRef.current === activeSessionId) {
        return;
      }
      if (state?.chat_history?.sessionId === activeSessionId) {
        lastFetchedSessionRef.current = activeSessionId;
        setIsHistoryLoading(false);
        return;
      }
      lastFetchedSessionRef.current = activeSessionId;
      setIsHistoryLoading(true);
      onCommand('get_chat_history', { sessionId: activeSessionId, isBackground: isPopup });

      // Safety timeout: reset history loading after 1.2s to prevent stuck skeleton UI
      timer = setTimeout(() => {
        setIsHistoryLoading(false);
      }, 1200);
    } else if (!connected) {
      setIsHistoryLoading(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeSessionId, connected, onCommand, isPopup, state?.chat_history]);

  // Sync history from backend — only replace if there are no in-progress (thinking/typing) messages
  // to avoid clobbering real-time chat bubbles with stale backend data.
  useEffect(() => {
    if (!state?.chat_history) return;
    const { sessionId, messages } = state.chat_history;
    setConversations(prev => {
      const existing = prev[sessionId] || [];
      // If there are currently live thinking/typing bubbles for this session, do NOT overwrite —
      // the backend snapshot would strip them, making the UI look like the agent disappeared.
      const hasLiveBubbles = existing.some(m => m.isThinking || m.isTyping);
      if (hasLiveBubbles) return prev;

      // Deduplicate messages by content + role + timestamp to prevent duplicate agent messages
      const seen = new Set<string>();
      const deduplicated = messages.filter((m: any) => {
        // Create a hash from role, content, and timestamp to identify duplicates
        const key = `${m.role}|${m.content || m.text || ''}|${Math.floor((m.timestamp || 0) / 10)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const mapped = deduplicated.map((m: any, idx: number) => {
        let textVal = m.content || m.text || '';
        let searchStatus: string | undefined = undefined;
        if (textVal.includes('\u200bsearch_status:')) {
          const parts = textVal.split('\u200bsearch_status:');
          textVal = parts[0];
          searchStatus = parts[1];
        }
        return {
          ...m,
          text: textVal,
          dbId: m.id,
          searchStatus: searchStatus,
          id: m.id ? String(m.id) : `msg_${sessionId}_${idx}_${Math.floor((m.timestamp || 0) * 1000)}`,
          time: m.timestamp ? new Date(m.timestamp * 1000).toLocaleTimeString([], { hour12: false }) : 'Just now'
        };
      });
      return { ...prev, [sessionId]: mapped };
    });
    // Clear loading state when history arrives for the active session
    setIsHistoryLoading(prev => {
      if (sessionId === activeSessionIdRef.current) return false;
      return prev;
    });
  }, [state?.chat_history]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = conversations[activeSessionId] || [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat]);

  const lastProcessedVoiceRef = useRef<string | null>(null);
  useEffect(() => {
    const vp = state?.voice_prompt;
    const ar = state?.agent_response;

    // Strip zero-width character timestamp markers from backend
    const cleanVp = vp ? vp.split('\u200b')[0] : null;
    const cleanAr = ar ? ar.split('\u200b')[0] : null;

    let searchStatus: string | undefined = undefined;
    if (ar && ar.includes('\u200bsearch_status:')) {
      searchStatus = ar.split('\u200bsearch_status:')[1]?.split('\u200b')[0];
    }

    // Determine if we have a new voice prompt
    const isNewVoice = vp && vp !== lastProcessedVoiceRef.current;

    // Determine if we have a new agent response
    const isNewAgent = ar && ar !== lastProcessedResponseRef.current;

    if (!isNewVoice && !isNewAgent) return;

    if (isNewVoice) {
      lastProcessedVoiceRef.current = vp;
      setIsThinking(false);
      setIsListening(false);

      // Only update the processed response ref if it's NOT a processing state
      if (isNewAgent && !cleanAr?.startsWith("Processing")) {
        lastProcessedResponseRef.current = ar;
        globalLastProcessedResponse = cleanAr;
      }

      const time = new Date().toLocaleTimeString([], { hour12: false });
      const userText = `🎙️ ${cleanVp}`;

      setConversations(prev => {
        const activeChat = prev[activeSessionId] || [];
        let newChat = [...activeChat];

        // 1. User bubble
        if (newChat.length === 0 || newChat[newChat.length - 1].text !== userText) {
          newChat.push({ role: 'user', text: userText, time, id: `msg_${Date.now()}_u` });
        }

        // 2. Agent bubble or thinking state
        if (cleanAr) {
          const isProcessing = cleanAr.startsWith("Processing");
          if (isProcessing) {
            setIsThinking(true);
            const lastMsg = newChat[newChat.length - 1];
            if (!lastMsg || lastMsg.role !== 'agent' || !lastMsg.isThinking) {
              newChat.push({ role: 'agent', text: '', time, isThinking: true, id: `msg_${Date.now()}_thinking` });
            }
          } else {
            setIsThinking(false);
            // Replace existing thinking bubble in-place if it exists
            const lastMsgIndex = newChat.length - 1;
            const lastMsg = newChat[lastMsgIndex];
            if (lastMsgIndex >= 0 && lastMsg.role === 'agent' && (lastMsg.isThinking || lastMsg.isTyping || cleanAr.startsWith(lastMsg.text) || lastMsg.text.startsWith(cleanAr))) {
              newChat[lastMsgIndex] = {
                ...lastMsg,
                role: 'agent',
                text: cleanAr,
                time,
                isTyping: true,
                isThinking: false,
                searchStatus
              };
            } else {
              if (!lastMsg || lastMsg.text !== cleanAr) {
                newChat.push({ role: 'agent', text: cleanAr, time, isTyping: true, id: `msg_${Date.now()}_a`, searchStatus });
              }
            }
          }
        }

        return {
          ...prev,
          [activeSessionId]: newChat
        };
      });

    } else if (isNewAgent && cleanAr) {
      const isProcessing = cleanAr.startsWith("Processing");
      if (isProcessing) {
        setIsThinking(true);
        // Ensure thinking bubble exists
        setConversations(prev => {
          const activeChat = prev[activeSessionId] || [];
          const lastMsg = activeChat[activeChat.length - 1];
          if (lastMsg && lastMsg.role === 'agent' && lastMsg.isThinking) return prev;

          return {
            ...prev,
            [activeSessionId]: [
              ...activeChat,
              { role: 'agent', text: '', time: new Date().toLocaleTimeString([], { hour12: false }), isThinking: true, id: `msg_${Date.now()}_thinking` }
            ]
          };
        });
        return;
      }

      setIsThinking(false);
      lastProcessedResponseRef.current = ar;
      globalLastProcessedResponse = cleanAr;

      const time = new Date().toLocaleTimeString([], { hour12: false });
      setConversations(prev => {
        const activeChat = prev[activeSessionId] || [];
        let newChat = [...activeChat];

        // Replace existing thinking bubble in-place if it exists
        const lastMsgIndex = newChat.length - 1;
        const lastMsg = newChat[lastMsgIndex];
        if (lastMsgIndex >= 0 && lastMsg.role === 'agent' && (lastMsg.isThinking || lastMsg.isTyping || cleanAr.startsWith(lastMsg.text) || lastMsg.text.startsWith(cleanAr))) {
          newChat[lastMsgIndex] = {
            ...lastMsg,
            role: 'agent',
            text: cleanAr,
            time,
            isTyping: true,
            isThinking: false,
            searchStatus
          };
        } else {
          if (newChat.length > 0 && newChat[newChat.length - 1].text === cleanAr) return prev;
          newChat.push({ role: 'agent', text: cleanAr, time, isTyping: true, id: `msg_${Date.now()}`, searchStatus });
        }

        return {
          ...prev,
          [activeSessionId]: newChat
        };
      });
    }
  }, [state?.voice_prompt, state?.agent_response, activeSessionId]);

  // Trigger session renaming based on conversation content using AI
  useEffect(() => {
    if (!activeSessionId || activeSessionId === 'default') return;

    // Check if this is a session we want to rename (e.g., currently starts with "Optimization Session")
    const sessionItem = historyItems.find(item => item.id === activeSessionId);
    if (!sessionItem) return;

    // Only rename if it still has a generic name
    const isGeneric = sessionItem.title.startsWith("Optimization Session") || sessionItem.title.startsWith("New Session") || sessionItem.title.startsWith("New Chat");

    const chatMessages = conversations[activeSessionId] || [];
    // We want to wait until we have a real user message and an agent response (meaning at least 2 or 3 messages)
    const userMsgs = chatMessages.filter(m => m.role === 'user');
    const agentMsgs = chatMessages.filter(m => m.role === 'agent');

    if (isGeneric && userMsgs.length >= 1 && agentMsgs.length >= 1) {
      // Build a short summary of the conversation
      const conversationSnippet = chatMessages
        .slice(0, 4) // First 4 messages are enough to determine the topic
        .map(m => `${m.role === 'user' ? 'User' : 'Agent'}: ${m.text}`)
        .join("\n");

      // To avoid multiple duplicate requests, we use a ref tracking already requested session IDs at their current chat length
      const requestKey = `${activeSessionId}_${chatMessages.length}`;
      if ((window as any)._lastRequestedRenameKey === requestKey) return;
      (window as any)._lastRequestedRenameKey = requestKey;

      console.log(`Requesting AI suggested title for session ${activeSessionId}...`);
      onCommand('suggest_session_title', {
        conversation: conversationSnippet,
        sessionId: activeSessionId
      });
    }
  }, [conversations, activeSessionId, historyItems, onCommand]);

  // Listen for AI-suggested session titles and update the sidebar
  const lastProcessedSuggestedTitleRef = useRef<string | null>(null);
  useEffect(() => {
    const suggestion = state?.suggested_session_title;
    if (!suggestion || !suggestion.id || !suggestion.title) return;

    const uniqueKey = `${suggestion.id}_${suggestion.title}`;
    if (lastProcessedSuggestedTitleRef.current === uniqueKey) return;
    lastProcessedSuggestedTitleRef.current = uniqueKey;

    // Update the history item's title in state
    setHistoryItems(prev => {
      return prev.map(item => {
        if (item.id === suggestion.id) {
          return {
            ...item,
            title: suggestion.title
          };
        }
        return item;
      });
    });
  }, [state?.suggested_session_title]);

  // Keep session preview and time in sync with the latest message in the active session
  useEffect(() => {
    if (!activeSessionId) return;

    const chatMessages = conversations[activeSessionId] || [];
    if (chatMessages.length === 0) return;

    const latestMsg = chatMessages[chatMessages.length - 1];
    const previewText = latestMsg.text.replace(/🎙️\s*/, '').replace(/\u200b.*/, ''); // strip voice icon and timestamp
    const cleanPreview = previewText.length > 25 ? `${previewText.slice(0, 25)}...` : previewText;

    setHistoryItems(prev => {
      // Find if we actually need to update to avoid infinite loops
      const item = prev.find(i => i.id === activeSessionId);

      // If the session isn't in history yet, add it only if there are user messages (length > 1)
      if (!item) {
        if (chatMessages.length > 1) {
          return [
            {
              id: activeSessionId,
              title: `Optimization Session ${prev.length + 1}`,
              time: 'Just now',
              preview: cleanPreview,
              timestamp: Math.floor(Date.now() / 1000)
            },
            ...prev
          ];
        }
        return prev;
      }

      if (item.preview === cleanPreview) return prev; // already up to date

      return prev.map(i => {
        if (i.id === activeSessionId) {
          return {
            ...i,
            preview: cleanPreview,
            time: activeSessionId === 'default' ? 'Active' : 'Just now',
            timestamp: Math.floor(Date.now() / 1000)
          };
        }
        return i;
      });
    });
  }, [conversations, activeSessionId]);

  const handleToggleTTS = useCallback(() => {
    const next = !isTTSEnabled;
    setIsTTSEnabled(next);
    try { localStorage.setItem('aero_tts_enabled', String(next)); } catch { /* noop */ }
    // Tell the backend to mute or unmute — this persists across all future messages
    onCommand('set_tts_muted', { muted: !next });
    if (next) {
      // Re-enabling: speak the last agent message so the user gets immediate audio feedback
      const chat = conversations[activeSessionId] || [];
      const lastAgentMsg = [...chat].reverse().find(m => m.role === 'agent' && m.text && !m.isThinking && !m.isTyping);
      if (lastAgentMsg?.text) {
        const cleanText = lastAgentMsg.text
          .replace(/\u200b[\d.]+$/, '')  // strip timestamp marker
          .trim();
        if (cleanText) onCommand('speak_text', { text: cleanText });
      }
    }
  }, [isTTSEnabled, conversations, activeSessionId, onCommand]);

  const handleRetry = useCallback((msgId: string, newText: string) => {
    if (!activeSessionId || !newText.trim()) return;
    
    // Reset processed ref to allow receiving consecutive identical response if it is fresh
    lastProcessedResponseRef.current = null;
    globalLastProcessedResponse = null;

    const time = new Date().toLocaleTimeString([], { hour12: false });
    setIsThinking(true);
    
    let oldText = '';
    let dbId: number | undefined = undefined;

    setConversations(prev => {
      const currentChat = prev[activeSessionId] || [];
      const msgIndex = currentChat.findIndex(m => m.id === msgId);
      if (msgIndex === -1) return prev;
      
      const targetMsg = currentChat[msgIndex];
      oldText = targetMsg.text;
      dbId = (targetMsg as any).dbId;

      const newChat = [
        ...currentChat.slice(0, msgIndex),
        { ...targetMsg, text: newText },
        { role: 'agent' as 'agent' | 'user', text: '', time, isThinking: true, id: `msg_${Date.now()}_thinking` }
      ];
      return { ...prev, [activeSessionId]: newChat };
    });
    
    onCommand('retry_message', {
      text: newText,
      oldText,
      messageId: dbId,
      sessionId: activeSessionId,
      userId
    });
  }, [activeSessionId, userId, onCommand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const sessionId = activeSessionId || `session_${Date.now()}`;

    if (!activeSessionId) {
      const newTitle = `Optimization Session ${historyItems.length + 1}`;
      setActiveSessionId(sessionId);
      onCommand('create_chat_session', { sessionId, title: newTitle, userId, skipWelcome: true });
    }

    // Reset processed ref to allow receiving consecutive identical response if it is fresh
    lastProcessedResponseRef.current = null;
    globalLastProcessedResponse = null;

    // Instantly append user query and a pulsing agent thinking bubble for real-time responsiveness
    setIsThinking(true);
    setConversations(prev => ({
      ...prev,
      [sessionId]: [
        ...(prev[sessionId] || []),
        { role: 'user', text: input, time, id: `msg_${Date.now()}_u` },
        { role: 'agent', text: '', time, isThinking: true, id: `msg_${Date.now()}_thinking` }
      ]
    }));
    onCommand('execute', { input, sessionId, userId });
    setInput('');
  };

  const handleCreateSession = useCallback(() => {
    // Prevent duplicate creation if user double-clicks or backend is slow
    if (isCreatingNewSessionRef.current) return;
    isCreatingNewSessionRef.current = true;
    setTimeout(() => { isCreatingNewSessionRef.current = false; }, 2000); // reset after 2s

    const newId = `session_${Date.now()}`;
    const newTitle = `Optimization Session ${historyItems.length + 1}`;

    // Mark as pending so the prefetch loop skips it (backend will push history via welcome msg)
    pendingNewSessionsRef.current.add(newId);
    prefetchedSessionsRef.current.add(newId);

    // Optimistically add to sidebar immediately so user sees it right away
    setHistoryItems(prev => [
      { id: newId, title: newTitle, time: 'Just now', preview: '', timestamp: Math.floor(Date.now() / 1000) },
      ...prev
    ]);

    // Optimistically set active session id and clear dedup-ref so history fetches for the new session
    lastFetchedSessionRef.current = null;
    setActiveSessionId(newId);

    onCommand('create_chat_session', { sessionId: newId, title: newTitle, userId });
  }, [historyItems.length, userId, onCommand]);

  const handleDeleteSession = useCallback((id: string) => {
    // Optimistically remove from sidebar immediately
    setHistoryItems(prev => {
      const remaining = prev.filter(i => i.id !== id);

      // If deleting the active session, auto-select the next available one
      if (activeSessionId === id) {
        lastFetchedSessionRef.current = null;
        const next = remaining[0];
        if (next) {
          setActiveSessionId(next.id);
        } else {
          setActiveSessionId('');
        }
      }

      return remaining;
    });

    // Clean up conversation cache for deleted session
    setConversations(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    onCommand('delete_chat_session', { sessionId: id, userId });
  }, [activeSessionId, userId, onCommand]);

  const handleClearHistory = useCallback(() => {
    onCommand('clear_chat_sessions', { userId });
    // Reset fetch-deduplication so a new auto-created session can load its history
    lastFetchedSessionRef.current = null;
    prefetchedSessionsRef.current.clear();
    pendingNewSessionsRef.current.clear();
    setConversations({});
    setActiveSessionId('');
  }, [userId, onCommand]);

  const handleRenameSession = useCallback((id: string, newTitle: string) => {
    // Optimistic update — show the new name immediately in the sidebar
    setHistoryItems(prev => prev.map(item =>
      item.id === id ? { ...item, title: newTitle } : item
    ));
    onCommand('rename_chat_session', { sessionId: id, title: newTitle, userId });
  }, [userId, onCommand]);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setIsHistoryOpen(false);
  }, []);

  const handleNewSessionClick = useCallback(() => {
    handleCreateSession();
    setIsHistoryOpen(false);
  }, [handleCreateSession]);

  const handleFeedback = useCallback((msgText: string, isHelpful: boolean, reason: string) => {
    onCommand('submit_feedback', {
      sessionId: activeSessionId,
      messageText: msgText,
      isHelpful,
      reason
    });
  }, [activeSessionId, onCommand]);


  const toggleMic = () => {
    const next = !isListening;
    setIsListening(next);
    onCommand('toggle_voice', { active: next });
  };

  const handleStopVoice = () => {
    // Send command to interrupt TTS immediately
    onCommand('stop_voice', {});
    // And also stop listening if it was active
    if (isListening) {
      setIsListening(false);
      onCommand('toggle_voice', { active: false });
    }
  };

  const handleToggleEncryption = () => {
    const currentState = state?.config?.privacy?.enabled ?? false;
    const newState = !currentState;
    onCommand('update_config', {
      privacy: {
        enabled: newState,
        uuid_lock: true,
        secure_sandbox: true,
        key_rotation: true
      }
    });
  };

  const handleTypingComplete = useCallback((msgId: string) => {
    setConversations(prev => {
      const updated = { ...prev };
      for (const sessionId in updated) {
        updated[sessionId] = updated[sessionId].map(msg =>
          msg.id === msgId ? { ...msg, isTyping: false } : msg
        );
      }
      return updated;
    });
  }, []);

  const renderedMessages = useMemo(() => {
    const chat = conversations[activeSessionId] || [];
    return (isCompact ? chat.slice(-1) : chat).map((msg, i) => (
      <ChatBubble
        key={msg.id || i}
        {...msg}
        isPopup={isPopup}
        isCompact={isCompact}
        onTypingComplete={handleTypingComplete}
        onRetry={handleRetry}
        onToggleTTS={handleToggleTTS}
        isTTSEnabled={isTTSEnabled}
        onFeedback={(isHelpful, reason) => handleFeedback(msg.text, isHelpful, reason)}
      />
    ));
  }, [conversations, activeSessionId, isCompact, isPopup, handleTypingComplete, handleRetry, handleToggleTTS, isTTSEnabled, handleFeedback]);


  // Roadmap Item 9: Native drag-and-drop for files onto the chat input
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    // Build a natural-language prompt from dropped file names
    const fileNames = files.map(f => `"${f.name}"`).join(', ');
    const prefix = files.length === 1
      ? `Analyze this file: ${fileNames}. `
      : `Analyze these files: ${fileNames}. `;
    setInput(prev => prefix + prev);
  }, []);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const labelMode = (() => {
    // Mobile / Small screens always show icons
    if (windowWidth < 768) return 'icon';
    
    // If both sidebars are open, always show icons to prevent squeeze
    if (isHistoryOpen && isIntelOpen) return 'icon';
    
    // If one sidebar is open:
    if (isHistoryOpen || isIntelOpen) {
      return windowWidth >= 1440 ? 'full' : 'short';
    }
    
    // If both sidebars are closed:
    return windowWidth >= 1150 ? 'full' : 'short';
  })();

  const activeSession = historyItems.find(s => s.id === activeSessionId);
  const headline = isPopup ? 'Aero Agent' : (activeSession ? activeSession.title : 'Agent Chat');

  return (
    <div className={`flex-1 flex h-full overflow-hidden relative ${isPopup ? 'bg-transparent p-2' : 'bg-[#060608]'}`}>

      {/* ── LEFT: Neural History ────────────────────────────────────── */}
      {!isPopup && (
        <>
          {/* Mobile Overlay */}
          <div 
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity ${isHistoryOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={() => setIsHistoryOpen(false)}
          />
          <div className={`
            fixed inset-y-0 left-0 z-50 h-full flex flex-col bg-[#050505]/95 backdrop-blur-2xl lg:bg-[#050505]/40 border-r border-white/5 overflow-hidden
            transition-all duration-300 ease-in-out
            ${isHistoryOpen 
              ? 'translate-x-0 w-64 lg:relative lg:opacity-100 lg:pointer-events-auto' 
              : '-translate-x-full w-64 lg:w-0 lg:opacity-0 lg:pointer-events-none lg:border-r-0'
            }
          `}>
            <NeuralHistory
              historyItems={historyItems}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onClearHistory={handleClearHistory}
              onCreateSession={handleNewSessionClick}
              onDeleteSession={handleDeleteSession}
              onRenameSession={handleRenameSession}
            />
          </div>
        </>
      )}

      {/* ── CENTER: Chat Area ─────────────────────────────────────── */}

      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative ${isPopup ? 'bg-[#0a0a10] border border-white/10 rounded-2xl shadow-2xl' : ''}`}>

        {/* Secure Session Info Header */}
        <div 
          className={`${isCompact ? 'h-8' : 'h-12'} border-b border-white/4 ${isPopup ? 'bg-[#060608]' : 'bg-[#060608]/80 backdrop-blur-xl'} flex items-center justify-between ${isCompact ? 'pl-3 pr-3' : 'pl-4 pr-4 sm:pl-6 sm:pr-6'} shrink-0 relative z-30 select-none ${isPopup ? 'cursor-move' : ''}`}
          style={isPopup ? { WebkitAppRegion: 'drag' } as any : undefined}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!isPopup && (
              <button aria-label="button" type="button" 
                onClick={() => window.location.reload()} 
                className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors cursor-pointer active:scale-95 outline-none"
                title="Refresh Agent Page"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {!isPopup && (
              <button aria-label="button" type="button" 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)} 
                className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 mr-1 transition-colors cursor-pointer active:scale-95 outline-none"
                title={isHistoryOpen ? "Hide History" : "Show History"}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green/80 shadow-[0_0_8px_rgba(118, 185, 0,0.8)] animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[100px] sm:max-w-[180px] md:max-w-xs block">
              {headline}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>

            {state?.config?.privacy?.enabled ? (
              <button aria-label="button" type="button"
                onClick={() => {
                  if (isPopup) {
                    onCommand('update_config', { privacy: { ...state?.config?.privacy, enabled: false } });
                  } else {
                    setIsVerifyModalOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-neon-yellow/5 border border-neon-yellow/15 text-neon-yellow hover:border-neon-yellow/30 hover:bg-neon-yellow/10 hover:shadow-[0_0_12px_rgba(191, 255, 0,0.15)] shadow-[inset_0_0_8px_rgba(191, 255, 0,0.02)] cursor-pointer active:scale-95 transition-all duration-300 outline-none whitespace-nowrap text-[10px] font-bold uppercase tracking-wider"
                title={isPopup ? "Disable E2E Encryption" : "Verify Encryption"}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neon-yellow" />
                {!isPopup && (
                  <>
                    {labelMode === 'full' && <span>E2E Encrypted</span>}
                    {labelMode === 'short' && <span>E2E</span>}
                  </>
                )}
              </button>
            ) : (
              <button aria-label="button" type="button"
                onClick={() => {
                  if (isPopup) {
                    onCommand('update_config', { privacy: { ...state?.config?.privacy, enabled: true } });
                  } else {
                    setIsVerifyModalOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-zinc-800/10 border border-zinc-800/30 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800/20 active:scale-95 transition-all duration-300 outline-none whitespace-nowrap text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                title={isPopup ? "Enable E2E Encryption" : "Verify Encryption"}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
                {!isPopup && (
                  <>
                    {labelMode === 'full' && <span>Local Session</span>}
                    {labelMode === 'short' && <span>Local</span>}
                  </>
                )}
              </button>
            )}
            {!isPopup && (
              <button aria-label="button" type="button"
                onClick={() => setIsIntelOpen(!isIntelOpen)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-neon-green/30 hover:bg-neon-green/5 text-neon-green hover:text-neon-green shadow-[inset_0_0_8px_rgba(255,255,255,0.01)] cursor-pointer active:scale-95 transition-all duration-300 text-[10px] font-bold uppercase tracking-wider"
                title={isIntelOpen ? "Hide Intel" : "Show Intel"}
              >
                {isIntelOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <InfoIcon className="w-3.5 h-3.5" />}
                {labelMode !== 'icon' && <span>Intel</span>}
              </button>
            )}

          </div>
        </div>

        {/* Chat Messages */}
        <div key={activeSessionId} ref={scrollRef} className={`flex-1 overflow-y-auto ${isCompact ? 'px-2 py-2' : 'px-4 sm:px-8 py-6'} custom-scrollbar`}>
          <div className="max-w-2xl mx-auto">

            {/* WhatsApp-style System Security E2EE Notice */}
            {!isCompact && (
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => setIsVerifyModalOpen(true)}
                className="flex justify-start mb-4 select-none cursor-pointer group"
              >
                {state?.config?.privacy?.enabled ? (
                  <div className="flex items-start gap-2.5 w-full max-w-[90%] sm:max-w-[85%] px-3.5 py-2.5 rounded-xl bg-neon-yellow/5 border border-neon-yellow/10 text-neon-yellow/80 shadow-[0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md group-hover:border-neon-yellow/20 group-hover:bg-neon-yellow/10 active:scale-[0.99] transition-all">
                    <ShieldCheck className="w-3.5 h-3.5 text-neon-yellow shrink-0 mt-0.5 animate-pulse" />
                    <div className="text-[10px] leading-relaxed font-semibold min-w-0">
                      <span className="font-extrabold text-neon-yellow uppercase tracking-widest mb-0.5 text-[8px] flex items-center gap-1.5 flex-wrap">
                        Privacy Shield Active
                        <span className="text-[7px] text-neon-yellow font-bold normal-case tracking-normal opacity-60">(Click to verify)</span>
                      </span>
                      Messages and telemetry in this stream are end-to-end encrypted. Click here to verify the active cryptographic handshake keys.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 w-full max-w-[90%] sm:max-w-[85%] px-3.5 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-500/80 shadow-[0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md group-hover:border-amber-500/20 group-hover:bg-amber-500/10 active:scale-[0.99] transition-all">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[10px] leading-relaxed font-semibold min-w-0">
                      <span className="font-extrabold text-amber-500 uppercase tracking-widest mb-0.5 text-[8px] flex items-center gap-1.5 flex-wrap">
                        Privacy Shield Disabled
                        <span className="text-[7px] text-amber-500 font-bold normal-case tracking-normal opacity-60">(Click to verify status)</span>
                      </span>
                      Session logging is currently unencrypted. Click to verify motherboard UUID status and security settings.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History loading skeleton */}
            {isHistoryLoading && chat.length === 0 ? (
              <div className="space-y-6 animate-pulse">
                {/* Agent bubble skeleton */}
                <div className="flex justify-start mb-6">
                  <div className="max-w-[85%] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10" />
                      <div className="h-2 w-10 rounded bg-white/10" />
                      <div className="h-2 w-6 rounded bg-white/5" />
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-white/3 border border-white/6 space-y-2">
                      <div className="h-2.5 w-56 rounded-full bg-white/10" />
                      <div className="h-2.5 w-44 rounded-full bg-white/8" />
                      <div className="h-2.5 w-36 rounded-full bg-white/6" />
                    </div>
                  </div>
                </div>
                {/* User bubble skeleton */}
                <div className="flex justify-end mb-6">
                  <div className="max-w-[75%] space-y-1.5">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10" />
                      <div className="h-2 w-8 rounded bg-white/10" />
                    </div>
                    <div className="p-4 rounded-2xl rounded-tr-sm bg-neon-green/6 border border-neon-green/15 space-y-2">
                      <div className="h-2.5 w-40 rounded-full bg-neon-green/20" />
                      <div className="h-2.5 w-28 rounded-full bg-neon-green/15" />
                    </div>
                  </div>
                </div>
                {/* Agent bubble skeleton 2 */}
                <div className="flex justify-start mb-6">
                  <div className="max-w-[85%] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10" />
                      <div className="h-2 w-10 rounded bg-white/10" />
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-white/3 border border-white/6 space-y-2">
                      <div className="h-2.5 w-64 rounded-full bg-white/10" />
                      <div className="h-2.5 w-48 rounded-full bg-white/8" />
                      <div className="h-2.5 w-20 rounded-full bg-white/6" />
                    </div>
                  </div>
                </div>
              </div>
            ) : chat.length === 0 ? (
              <div className="flex justify-start mb-6">
                <div className="max-w-[85%] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-neon-green/10 border border-neon-green/20">
                      <BrainCircuit className="w-3 h-3 text-neon-green" />
                    </div>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Agent</span>
                    <span className="text-[8px] font-medium text-zinc-700">Just now</span>
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/15 text-zinc-200 text-[12px] sm:text-[13px] leading-relaxed backdrop-blur-xl shadow-[0_0_15px_rgba(118,185,0,0.03)]">
                    Neural Link established. I am your Agentic AI Assistant. How can I assist you today?
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {renderedMessages}
              </AnimatePresence>
            )}


          </div>
        </div>

        {/* Voice Active Indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 px-4 sm:px-6 pb-1"
            >
              <div className="max-w-2xl mx-auto">
                <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-neon-green/5 border border-neon-green/20 rounded-xl">
                  <div className="flex gap-0.5 items-end h-4">
                    {[0, 1, 2, 3].map(i => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-neon-green rounded-full"
                        animate={{ height: ['4px', '12px', '4px'] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-neon-green uppercase tracking-widest">Listening — speak your command</span>
                  <button aria-label="button" type="button"
                    onClick={handleStopVoice}
                    className="ml-auto text-[9px] font-bold text-neon-green hover:text-neon-green uppercase tracking-widest transition-colors"
                  >
                    Stop
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div
          className={`shrink-0 ${isCompact ? 'px-2 py-1.5' : 'px-4 sm:px-6 py-4'} border-t border-white/4 ${isPopup ? 'bg-[#080808]' : 'bg-[#080808]/90 backdrop-blur-xl'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className={`flex items-center gap-2 sm:gap-3 bg-white/3 border rounded-2xl ${isCompact ? 'p-0.5 pl-2' : 'p-1 pl-3 sm:p-1.5 sm:pl-5'} transition-all ${
              isDragOver
                ? 'border-neon-green/60 shadow-[0_0_24px_rgba(118, 185, 0,0.15)] bg-cyan-950/10'
                : isListening
                  ? 'border-neon-green/30 shadow-[0_0_20px_rgba(118, 185, 0,0.06)]'
                  : 'border-white/7 focus-within:border-neon-green/30'
            }`}>
              <Terminal className={`${isCompact ? 'hidden' : 'hidden sm:block'} w-4 h-4 text-zinc-600 shrink-0`} />
              {isDragOver ? (
                <span className={`flex-1 ${isCompact ? 'py-1 text-[11px]' : 'py-2.5 sm:py-3 text-[12px] sm:text-[13px]'} font-medium text-neon-green/70 select-none`}>
                  Drop file to analyze &rarr;
                </span>
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isListening 
                      ? 'Listening...' 
                      : isThinking 
                        ? 'Thinking...' 
                        : windowWidth < 640 
                          ? 'Send command...' 
                          : 'Send a command or drop a file...'
                  }
                  disabled={isThinking}
                  className={`flex-1 min-w-0 bg-transparent ${isCompact ? 'py-1 text-[11px]' : 'py-2.5 sm:py-3 text-[12px] sm:text-[13px]'} font-medium text-white placeholder:text-zinc-600 focus:outline-none ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              )}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <div className="relative">
                  {isListening && (
                    <motion.div
                      className="absolute inset-0 rounded-lg sm:rounded-xl border border-neon-green/40"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <button aria-label="button"
                    type="button"
                    onClick={toggleMic}
                    className={`relative ${isCompact ? 'w-6 h-6' : 'w-8 h-8 sm:w-9 sm:h-9'} rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-neon-green/20 text-neon-green shadow-[0_0_12px_rgba(118, 185, 0,0.3)]' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/4'}`}
                  >
                    <Mic className={`${isCompact ? 'w-3 h-3' : 'w-3 h-3 sm:w-4 sm:h-4'}`} />
                  </button>
                </div>

                <button aria-label="button"
                  type="submit"
                  disabled={isThinking}
                  className={`${isCompact ? 'w-6 h-6' : 'w-8 h-8 sm:w-9 sm:h-9'} bg-neon-green hover:bg-neon-green text-black rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${isThinking ? 'opacity-40 cursor-not-allowed bg-zinc-700 hover:bg-zinc-700 text-zinc-500' : ''}`}
                >
                  <Send className={`${isCompact ? 'w-3 h-3' : 'w-3 h-3 sm:w-4 sm:h-4'}`} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>


      {/* ── RIGHT SIDEBAR: Intelligence ───────────────────────────── */}
      {!isPopup && (
        <>
          {/* Mobile Overlay */}
          <div 
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity ${isIntelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={() => setIsIntelOpen(false)}
          />
          <div className={`
            fixed inset-y-0 right-0 z-50 h-full flex flex-col bg-[#080808]/95 backdrop-blur-2xl lg:bg-[#080808] border-l border-white/4 overflow-hidden
            transition-all duration-300 ease-in-out
            ${isIntelOpen 
              ? 'translate-x-0 w-64 lg:relative lg:opacity-100 lg:pointer-events-auto' 
              : 'translate-x-full w-64 lg:w-0 lg:opacity-0 lg:pointer-events-none lg:border-l-0'
            }
          `}>
        <div className="p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">

          {/* Close button for mobile */}
          <button aria-label="button" type="button"
            onClick={() => setIsIntelOpen(false)}
            className="w-full flex lg:hidden items-center justify-center gap-2 py-2 border border-white/5 rounded-xl text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4"
          >
            <ChevronRight className="w-3 h-3" /> Hide Intel
          </button>

          {/* Neural Status */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-neon-green" />
              <h3 className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.15em]">Neural Status</h3>
            </div>
            <div className="space-y-1.5">
              <StatusItem label="Neural Agent" active={isAgentic} icon={BrainCircuit} />
              <StatusItem label="Vision" active={state?.is_game_active || false} icon={Layers} />
              <StatusItem label="Bridge" active={true} icon={Zap} />
              <StatusItem label="IO Hook" active={true} icon={Cpu} />
              <StatusItem label="Voice" active={isListening} icon={Mic} />
            </div>
          </div>

          {/* Agent Capabilities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-neon-yellow" />
              <h3 className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.15em]">Capabilities</h3>
            </div>
            <div className="space-y-2">
              <CapabilityCard title="Story Skip" description="Neural intent detection bypass." icon={Zap} />
              <CapabilityCard title="Tactical HUD" description="Llama-3.2 Vision analysis." icon={BrainCircuit} />
              <CapabilityCard title="Sys Tuning" description="Kernel-level optimization." icon={Cpu} />
            </div>
          </div>

          {/* Reasoning Engine */}
          <div className="pt-4 border-t border-white/4">
            <div className="p-3 rounded-xl bg-white/[0.06] border border-white/15 shadow-[0_0_15px_rgba(118, 185, 0,0.03)] relative">
              <div className="absolute top-2.5 right-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-yellow shadow-[0_0_6px_#10b981]" />
              </div>
              <p className="text-[8px] font-black text-neon-green/50 uppercase tracking-[0.15em] mb-2">Engine</p>
              <div className="space-y-1.5 font-mono text-[9px]">
                <div className="flex justify-between">
                  <span className="text-zinc-600">T/S</span>
                  <span className="text-zinc-400 font-bold">1,402</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">LAT</span>
                  <span className="text-zinc-400 font-bold">42ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">MDL</span>
                  <span className="text-zinc-400 font-bold">Nemotron</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
        </>
      )}

      {/* ── CRYPTOGRAPHIC VERIFICATION MODAL ───────────────────────── */}
      <AnimatePresence>
        {isVerifyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVerifyModalOpen(false)}
              className="absolute inset-0 bg-[#020203]/90 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-sm bg-[#0b0b0e] border border-white/6 rounded-2xl p-5 overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8),inset_0_0_12px_rgba(255,255,255,0.01)] z-50"
            >
              {/* Decorative Tech Grid Lines & Glow */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[14px_24px] pointer-events-none" />
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-3xl pointer-events-none rounded-full transition-colors duration-500 ${isGeneratingKeys ? 'bg-neon-green/10' : 'bg-neon-yellow/10'}`} />

              {/* Close Button */}
              <button aria-label="button"
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-white/3 hover:bg-white/8 border border-white/8 p-1.5 rounded-full transition-all active:scale-90 outline-none z-50 flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                title="Close Verification"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Title & Badge */}
              <div className="relative text-center mb-4">
                <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center border mb-2 transition-all duration-500 ${
                  isGeneratingKeys
                    ? 'bg-neon-green/5 border-neon-green/20 text-neon-green animate-pulse'
                    : state?.config?.privacy?.enabled
                      ? 'bg-neon-yellow/5 border-neon-yellow/20 text-neon-yellow shadow-[0_0_20px_rgba(191, 255, 0,0.15)] animate-bounce'
                      : 'bg-red-500/5 border-red-500/25 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.12)]'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Verify Encryption</h4>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">E2EE Handshake Signature</p>
              </div>

              {/* Holographic QR Code Area / Scanner */}
              <div className={`relative w-28 h-28 mx-auto mb-4 bg-black/40 border rounded-xl flex items-center justify-center overflow-hidden transition-all duration-500 ${
                state?.config?.privacy?.enabled ? 'border-neon-yellow/15' : 'border-red-500/20'
              }`}>
                {/* Dots Matrix */}
                <div className="grid grid-cols-12 gap-1 opacity-25">
                  {Array.from({ length: 144 }).map((_, i) => {
                    const isFilled = ((i * 7) % 3 === 0) || ((i * 13) % 5 === 0);
                    return (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-sm transition-all duration-300 ${
                          isGeneratingKeys
                            ? isFilled ? 'bg-neon-green' : 'bg-zinc-800'
                            : state?.config?.privacy?.enabled
                              ? isFilled ? 'bg-neon-yellow' : 'bg-zinc-800'
                              : isFilled ? 'bg-red-500/60' : 'bg-zinc-800'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Cyber Scanner Line — only shown while generating or when encrypted */}
                {(isGeneratingKeys || state?.config?.privacy?.enabled) && (
                  <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className={`absolute left-0 right-0 h-0.5 pointer-events-none opacity-60 shadow-[0_0_10px_currentColor] ${
                      isGeneratingKeys ? 'bg-neon-green text-neon-green' : 'bg-neon-yellow text-neon-yellow'
                    }`}
                  />
                )}

                {/* SUCCESS OVERLAY — shown when encryption is active and keys are settled */}
                {!isGeneratingKeys && state?.config?.privacy?.enabled && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center pb-7 bg-black/50 backdrop-blur-[1px]"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
                      className="w-8 h-8 rounded-full bg-neon-yellow/20 border border-neon-yellow/40 flex items-center justify-center mb-1 shadow-[0_0_20px_rgba(191, 255, 0,0.3)]"
                    >
                      <svg className="w-4 h-4 text-neon-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.div>
                    <span className="text-[8px] font-black text-neon-yellow uppercase tracking-widest">Successfully Encrypted</span>
                  </motion.div>
                )}

                {/* WARNING OVERLAY — shown when encryption is disabled */}
                {!isGeneratingKeys && !state?.config?.privacy?.enabled && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center pb-7 bg-black/55 backdrop-blur-[1px]"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
                      className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/35 flex items-center justify-center mb-1 shadow-[0_0_18px_rgba(239,68,68,0.25)]"
                    >
                      <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </motion.div>
                    <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Not Encrypted</span>
                    <span className="text-[7px] font-bold text-red-500/60 uppercase tracking-wider mt-0.5">Unprotected</span>
                  </motion.div>
                )}

                {/* Real-time Status overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-end p-2.5 select-none">
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-zinc-500">SYS UUID:</span>
                    <span className="text-zinc-300 font-semibold">{userId.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-zinc-500">STATE:</span>
                    <span className={isGeneratingKeys ? 'text-neon-green animate-pulse' : state?.config?.privacy?.enabled ? 'text-neon-yellow' : 'text-red-400 animate-pulse'}>
                      {isGeneratingKeys ? 'SYNCHRONIZING...' : state?.config?.privacy?.enabled ? 'SECURE LINK' : 'UNPROTECTED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Encryption Keys Display */}
              <div className="space-y-2 mb-4">
                <div className="text-center flex items-center justify-center gap-2">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Motherboard & Session Bindings</span>
                  {!isGeneratingKeys && (
                    <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                      state?.config?.privacy?.enabled
                        ? 'text-neon-yellow border-neon-yellow/20 bg-neon-yellow/5'
                        : 'text-red-400 border-red-500/20 bg-red-500/5'
                    }`}>
                      {state?.config?.privacy?.enabled ? '● Active' : '● Redacted'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {secKeys.map((key, i) => (
                    <div
                      key={i}
                      className={`py-1.5 px-0.5 text-center rounded-lg font-mono text-[9px] font-bold border transition-all duration-300 ${
                        isGeneratingKeys
                          ? 'bg-neon-green/2 border-neon-green/10 text-neon-green/70 scale-95 opacity-50'
                          : state?.config?.privacy?.enabled
                            ? 'bg-neon-yellow/2 border-neon-yellow/10 text-neon-yellow shadow-[inset_0_0_8px_rgba(191, 255, 0,0.02)] scale-100 opacity-100'
                            : 'bg-red-500/2 border-red-500/10 text-red-500/40 scale-100 opacity-70 tracking-[0.3em]'
                      }`}
                    >
                      {state?.config?.privacy?.enabled ? key : '--'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Context */}
              <div className="p-2.5 bg-white/2 border border-white/4 rounded-xl text-[9px] text-zinc-500 leading-relaxed text-center font-medium mb-3">
                To confirm that end-to-end encryption is operating securely, verify that these dynamically calculated keys match the local motherboard UUID signature `{userId.slice(0, 12)}`. All chat memory is secured by a hardware-bound private key stream.
              </div>

              {/* Encryption Toggle Button */}
              <button aria-label="button" type="button"
                onClick={handleToggleEncryption}
                className={`w-full py-2 px-3 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  state?.config?.privacy?.enabled
                    ? 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow hover:bg-neon-yellow/15 hover:border-neon-yellow/30 shadow-[0_0_12px_rgba(191, 255, 0,0.1)]'
                    : 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/15 hover:border-red-500/35 shadow-[0_0_14px_rgba(239,68,68,0.12)]'
                }`}
              >
                {state?.config?.privacy?.enabled ? (
                  <>
                    <span>🔒</span>
                    <span>Disable E2E Encryption</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Enable E2E Encryption</span>
                  </>
                )}
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentPage;
