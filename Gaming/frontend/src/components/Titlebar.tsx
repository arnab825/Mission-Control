import React from 'react';
import { Minus, Square, X, Layout } from 'lucide-react';

interface TitlebarProps {
  showHUD?: boolean;
  onToggleHUD?: () => void;
}

const Titlebar: React.FC<TitlebarProps> = ({ showHUD, onToggleHUD }) => {
  const handleControl = (command: 'minimize' | 'maximize' | 'close') => {
    if (window.electronAPI) {
      window.electronAPI.windowControls(command);
    }
  };

  return (
    <div
      className="h-10 flex justify-between items-center bg-zinc-950 border-b border-white/5 select-none z-100 fixed top-0 left-0 right-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2 px-3">
        <img src="/logo.png" className="w-3.5 h-3.5 object-contain" alt="Logo" />
        <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Mission Control</span>
      </div>

      <div className="flex h-full items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button aria-label="HUD" type="button"
          onClick={onToggleHUD}
          className={`h-6 px-3 mr-4 rounded flex items-center gap-1.5 border transition-all ${showHUD
              ? 'bg-neon-green/10 border-neon-green/30 text-neon-green glow-green shadow-[0_0_15px_rgba(118, 185, 0,0.15)]'
              : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <Layout className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-widest">HUD</span>
        </button>

        <div className="flex h-full">
          <button aria-label="button" type="button"
            onClick={() => handleControl('minimize')}
            className="px-4 h-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors flex items-center justify-center"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button aria-label="button" type="button"
            onClick={() => handleControl('maximize')}
            className="px-4 h-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors flex items-center justify-center"
          >
            <Square className="w-3 h-3" />
          </button>
          <button aria-label="button" type="button"
            onClick={() => handleControl('close')}
            className="px-4 h-full hover:bg-red-500 hover:text-white text-zinc-500 transition-colors flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Titlebar;
