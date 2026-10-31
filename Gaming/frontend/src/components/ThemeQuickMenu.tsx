import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Settings2, Gamepad2, Cpu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { ThemeId } from '../types/theme';

interface ThemeQuickMenuProps {
  onOpenAppearanceSettings?: () => void;
  currentGame?: string | null;
  gpuName?: string | null;
}

export const ThemeQuickMenu: React.FC<ThemeQuickMenuProps> = ({
  onOpenAppearanceSettings,
  gpuName,
}) => {
  const {
    preferences,
    currentTheme,
    activeGameTheme,
    setThemeId,
    availableThemes,
    factions,
    updateAdaptiveSettings,
    triggerGpuBrandMatch,
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeFaction = factions.find((f) => f.id === preferences.gamerProfile.faction) || factions[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleGameAdaptive = () => {
    updateAdaptiveSettings({
      gameAdaptiveSync: !preferences.adaptive.gameAdaptiveSync,
    });
  };

  const handleGpuMatch = () => {
    triggerGpuBrandMatch(gpuName);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        aria-label="App Themes"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-7 px-2.5 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1.5 hover:bg-white/8 hover:border-white/20 transition-all shadow-sm cursor-pointer group"
        title="Change App Theme & Personalization"
      >
        <Palette className="w-3 h-3 text-neon-green transition-transform group-hover:rotate-12 duration-200" />
        <span
          className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
          style={{
            backgroundColor: currentTheme.colors.primary,
            color: currentTheme.colors.primary,
          }}
        />
        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest hidden sm:inline max-w-24 truncate">
          {activeGameTheme ? `🎮 ${currentTheme.name}` : currentTheme.name}
        </span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-100 p-2.5 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Gamer Call-Sign Card */}
          <div className="px-2.5 py-2 rounded-xl bg-white/3 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-xs shrink-0">
                {activeFaction.symbol}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-white truncate">
                  {preferences.gamerProfile.callsign || 'OPERATIVE-01'}
                </div>
                <div className="text-[8px] text-zinc-400 font-bold uppercase truncate">
                  {activeFaction.name}
                </div>
              </div>
            </div>
            <span className="text-[8px] font-mono text-neon-green uppercase bg-neon-green/10 px-1.5 py-0.5 rounded border border-neon-green/20 shrink-0">
              {activeFaction.badge}
            </span>
          </div>

          {/* Quick Adaptive Intelligence Controls */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleGameAdaptive}
              className={`px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                preferences.adaptive.gameAdaptiveSync
                  ? 'bg-neon-green/15 border-neon-green/40 text-neon-green'
                  : 'bg-white/2 border-white/5 text-zinc-400 hover:text-white'
              }`}
              title="Automatically adapt theme colors to the currently running game"
            >
              <Gamepad2 className="w-3 h-3 shrink-0" />
              <span className="truncate">Game Sync: {preferences.adaptive.gameAdaptiveSync ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={handleGpuMatch}
              className="px-2 py-1.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 text-zinc-400 hover:text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              title="Match color theme with your GPU hardware brand"
            >
              <Cpu className="w-3 h-3 text-neon-yellow shrink-0" />
              <span className="truncate">Match GPU</span>
            </button>
          </div>

          <div className="h-px bg-white/5 my-0.5" />

          {/* Curated Color Schemes List */}
          <div className="px-2 pt-0.5 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Themes</span>
            <span className="text-[8px] font-mono text-zinc-500 uppercase">{availableThemes.length} Schemes</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 no-scrollbar py-0.5">
            {availableThemes.map((theme) => {
              const isActive = (activeGameTheme || preferences.themeId) === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setThemeId(theme.id as ThemeId);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-neon-green/10 border-neon-green/20 text-white'
                      : 'border-transparent hover:bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-md shrink-0 flex items-center justify-center border border-white/15 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold truncate leading-tight">{theme.name}</div>
                      <div className="text-[7px] text-zinc-500 uppercase tracking-wider truncate">
                        {theme.badge}
                      </div>
                    </div>
                  </div>
                  {isActive && <Check className="w-3 h-3 text-neon-green shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {onOpenAppearanceSettings && (
            <div className="pt-1.5 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAppearanceSettings();
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/4 hover:bg-white/8 text-zinc-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-sm"
              >
                <Settings2 className="w-3.5 h-3.5 text-neon-green" />
                <span>Open Personalization Studio...</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeQuickMenu;
