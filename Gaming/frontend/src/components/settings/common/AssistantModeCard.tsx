import React from 'react';

export const AssistantModeCard: React.FC<{
  mode: string;
  title: string;
  description: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({ title, description, icon: Icon, active, onClick, onMouseEnter, onMouseLeave }) => (
  <button
    aria-label={title}
    type="button"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`w-full p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border transition-all flex flex-col items-center justify-center text-center gap-2 sm:gap-3.5 cursor-pointer select-none ${
      active
        ? 'bg-neon-green/10 border-neon-green/40 text-neon-green glow-green shadow-[0_0_20px_rgba(118,185,0,0.1)]'
        : 'bg-white/2 border-white/5 text-zinc-500 hover:bg-white/4 hover:border-white/10 hover:text-zinc-300'
    }`}
  >
    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${active ? 'bg-neon-green/20' : 'bg-white/5'}`}>
      <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${active ? 'text-neon-green' : 'text-zinc-500'}`} />
    </div>
    <div className="w-full min-w-0">
      <h4 className={`text-[10px] sm:text-xs font-black uppercase tracking-widest mb-0.5 sm:mb-1 truncate ${active ? 'text-white' : 'text-zinc-400'}`}>{title}</h4>
      <p className="text-[9px] sm:text-[10px] font-medium leading-tight opacity-70 line-clamp-2">{description}</p>
    </div>
  </button>
);
