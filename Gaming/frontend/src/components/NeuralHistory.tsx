import { useState, useRef, useEffect, memo, type FC } from 'react';
import { History, Trash2, Search, Sparkles, Plus, Edit2 } from 'lucide-react';

export interface HistoryItem {
  id: string;
  title: string;
  time: string;
  preview: string;
  timestamp?: number;
}

const getRelativeTimeString = (timestampOrStr: number | string | undefined): string => {
  if (!timestampOrStr) return 'Just now';
  if (timestampOrStr === 'Active') return 'Active';
  
  let ts: number;
  if (typeof timestampOrStr === 'string') {
    const parsed = Number(timestampOrStr);
    if (isNaN(parsed)) {
      return timestampOrStr; // legacy string fallback (e.g. "2h ago")
    }
    ts = parsed;
  } else {
    ts = timestampOrStr;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;

  if (diff < 10) return 'Just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  
  const mins = Math.floor(diff / 60);
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 4.35) {
    return `${weeks}w ago`;
  }
  const months = Math.floor(days / 30.44);
  if (months < 12) {
    return `${months}mo ago`;
  }
  const years = Math.floor(days / 365.25);
  return `${years}y ago`;
};

interface NeuralHistoryProps {
  historyItems: HistoryItem[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onClearHistory: () => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
}

const NeuralHistory: FC<NeuralHistoryProps> = ({
  historyItems,
  activeSessionId,
  onSelectSession,
  onClearHistory,
  onCreateSession,
  onDeleteSession,
  onRenameSession
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Setup interval to automatically tick and re-render relative times every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleSaveEdit = (id: string) => {
    if (editValue.trim() && editValue !== historyItems.find(i => i.id === id)?.title) {
      onRenameSession(id, editValue.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleSaveEdit(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  const filteredItems = historyItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 border-r border-white/5 bg-[#050505]/40 backdrop-blur-md flex flex-col p-5 shrink-0 h-full relative z-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
            <History className="w-3 h-3 text-neon-green" />
          </div>
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Neural History</span>
        </div>
        {historyItems.length > 0 && (
          <button aria-label="button" type="button"
            onClick={onClearHistory}
            className="p-1 hover:bg-white/5 rounded text-zinc-500 hover:text-red-400 transition-colors"
            title="Clear all sessions"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* New Session Button */}
      <button aria-label="New Session" type="button"
        onClick={onCreateSession}
        className="mb-4 w-full h-9 rounded-xl border border-neon-green/20 bg-neon-green/5 hover:bg-neon-green/10 hover:border-neon-green/40 text-neon-green hover:text-neon-green text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(118, 185, 0,0.02)] hover:shadow-[0_0_20px_rgba(118, 185, 0,0.08)] shrink-0 active:scale-[0.98]"
      >
        <Plus className="w-3.5 h-3.5" />
        New Session
      </button>

      {/* Search Bar */}
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search logs..."
          className="w-full bg-white/2 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-[11px] font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-neon-green/30 transition-all"
        />
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto gap-y-1.5 custom-scrollbar pr-1 -mr-2">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="p-2 rounded-full bg-white/2 border border-white/4 mb-3">
              <Sparkles className="w-4 h-4 text-zinc-700" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">No Sessions</p>
            <p className="text-[9px] font-medium text-zinc-700 leading-relaxed">No neural optimization logs found.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.id === activeSessionId;
            return (
              <div
                key={item.id}
                className="relative group w-full"
              >
                <button aria-label="button" type="button"
                  onClick={() => onSelectSession(item.id)}
                  className={`w-full text-left p-3.5 pr-8 rounded-2xl border transition-all duration-300 relative overflow-hidden ${isActive
                    ? 'bg-neon-green/4 border-neon-green/20 shadow-[0_0_15px_rgba(118, 185, 0,0.03)]'
                    : 'bg-white/1 border-transparent hover:bg-white/3 hover:border-white/4'
                    }`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-neon-green shadow-[0_0_8px_#76b900]" />
                  )}

                  <div className="flex justify-between items-center mb-1">
                    {editingId === item.id ? (
                      <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()} className="flex-1 mr-2" onClick={e => e.stopPropagation()}>
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => handleKeyDown(e, item.id)}
                          onBlur={() => handleSaveEdit(item.id)}
                          className="w-full bg-white/10 border border-neon-green/50 rounded px-1.5 py-0.5 text-[11px] font-black uppercase text-neon-green outline-none"
                        />
                      </div>
                    ) : (
                      <h4 className={`text-[11px] font-black uppercase tracking-tight truncate pr-2 transition-colors duration-300 ${isActive ? 'text-neon-green' : 'text-zinc-400 group-hover:text-neon-green'
                        }`}>
                        {item.title}
                      </h4>
                    )}
                    {editingId !== item.id && (
                      <span className="text-[8px] font-bold text-zinc-700 shrink-0 font-mono">
                        {getRelativeTimeString(item.timestamp || item.time)}
                      </span>
                    )}
                  </div>
                  <p className={`text-[9px] truncate font-medium leading-relaxed transition-colors duration-300 ${isActive ? 'text-zinc-400' : 'text-zinc-600 group-hover:text-zinc-500'
                    }`}>
                    {item.preview}
                  </p>
                </button>

                {/* Action Buttons */}
                {editingId !== item.id && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 z-30">
                    <button aria-label="button" type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(item.id);
                        setEditValue(item.title);
                      }}
                      className="p-1 rounded-md bg-[#050505] hover:bg-neon-green/10 text-zinc-600 hover:text-neon-green border border-transparent hover:border-neon-green/20 shadow-sm"
                      title="Rename session"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button aria-label="button" type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(item.id);
                      }}
                      className="p-1 rounded-md bg-[#050505] hover:bg-red-500/10 text-zinc-600 hover:text-red-400 border border-transparent hover:border-red-500/20 shadow-sm"
                      title="Delete session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Subtle Bottom Fade */}
      <div className="h-10 bg-linear-to-t from-[#050505]/40 to-transparent pointer-events-none absolute bottom-0 left-0 right-0" />
    </div>
  );
};

export default memo(NeuralHistory);
