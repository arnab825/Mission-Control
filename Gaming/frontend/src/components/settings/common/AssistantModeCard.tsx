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
    aria-label="button"
    type="button"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`flex-1 min-w-[180px] p-6 rounded-3xl border transition-all flex flex-col items-center justify-center text-center gap-4 ${
      active
        ? 'bg-neon-green/10 border-neon-green/40 text-neon-green glow-green shadow-[0_0_20px_rgba(118,185,0,0.1)]'
        : 'bg-white/2 border-white/5 text-zinc-500 hover:bg-white/4 hover:border-white/10'
    }`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-neon-green/20' : 'bg-white/5'}`}>
      <Icon className={`w-6 h-6 ${active ? 'text-neon-green' : 'text-zinc-500'}`} />
    </div>
    <div>
      <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${active ? 'text-white' : 'text-zinc-400'}`}>{title}</h4>
      <p className="text-[10px] font-medium leading-tight opacity-70">{description}</p>
    </div>
  </button>
);
