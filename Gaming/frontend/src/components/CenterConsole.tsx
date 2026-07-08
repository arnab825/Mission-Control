import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, BrainCircuit, Mic } from 'lucide-react';

const ChatBubble: React.FC<{ role: 'agent' | 'user'; text: string; time: string }> = ({ role, text, time }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
  >
    <div className={`max-w-[90%] sm:max-w-[85%] gap-y-1.5`}>
      <div className={`flex items-center gap-2 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${role === 'agent' ? 'bg-neon-green/10 border border-neon-green/20' : 'bg-white/5 border border-white/10'}`}>
          {role === 'agent' ? <BrainCircuit className="w-3 h-3 text-neon-green" /> : <div className="w-1 h-1 rounded-full bg-zinc-400" />}
        </div>
        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{role === 'agent' ? 'Agent' : 'You'}</span>
        <span className="text-[8px] font-medium text-zinc-700">{time}</span>
      </div>
      <div className={`p-3 sm:p-4 rounded-2xl text-[12px] sm:text-[13px] leading-relaxed font-medium whitespace-pre-wrap ${role === 'agent'
        ? 'bg-white/3 border border-white/6 text-zinc-300 rounded-tl-sm glass-panel'
        : 'bg-neon-green/6 border border-neon-green/15 text-neon-green rounded-tr-sm glass-accent'
        }`}>
        {text}
      </div>
    </div>
  </motion.div>
);

export interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
  time: string;
}

interface CenterConsoleProps {
  chat: ChatMessage[];
  onSendMessage: (text: string) => void;
  isListening: boolean;
  toggleMic: () => void;
}

const CenterConsole: React.FC<CenterConsoleProps> = ({ chat, onSendMessage, isListening, toggleMic }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };


  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {chat.map((msg, i) => (
              <ChatBubble key={i} {...msg} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-white/4 bg-[#080808]/90 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 bg-white/3 border border-white/7 rounded-2xl p-1.5 pl-4 sm:pl-5 focus-within:border-neon-green/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <Terminal className="w-4 h-4 text-zinc-600 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a command..."
              className="flex-1 min-w-0 bg-transparent py-2.5 sm:py-3 text-[12px] sm:text-[13px] font-medium text-white placeholder:text-zinc-600 focus:outline-none"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button aria-label="button"
                type="button"
                onClick={toggleMic}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-neon-green/15 text-neon-green glow-green' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/4'}`}
              >
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button aria-label="button"
                type="submit"
                className="w-8 h-8 sm:w-9 sm:h-9 bg-neon-green hover:bg-neon-green text-black rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(118, 185, 0,0.3)] hover:shadow-[0_0_25px_rgba(118, 185, 0,0.5)]"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CenterConsole;
