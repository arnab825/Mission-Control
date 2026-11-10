import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Check,
  RotateCcw,
  SunMedium,
  Monitor,
  Eye,
  Activity,
  User,
  Shield,
  Gamepad2,
  Cpu,
  Sparkles,
  Share2,
  Download,
  Copy,
  Trash2,
  Flame,
  Grid,
} from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { useTheme } from '../../context/ThemeContext';
import {
  BACKGROUND_MODES,
  GLOW_INTENSITIES,
  CANVAS_TEXTURES,
  PLAYER_TITLES,
} from '../../data/themes';
import type {
  ThemeId,
  BackgroundMode,
  GlowIntensity,
  CanvasTexture,
  FactionId,
} from '../../types/theme';

export interface AppearanceSectionProps {
  searchQuery?: string;
  localConfig?: any;
  setLocalConfig?: React.Dispatch<React.SetStateAction<any>>;
}

type SubTabId = 'palettes' | 'identity' | 'adaptive' | 'canvas' | 'presets';

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  searchQuery = '',
  setLocalConfig,
}) => {
  const {
    preferences,
    currentTheme,
    activeGameTheme,
    setThemeId,
    setBackgroundMode,
    setCanvasTexture,
    setGlowIntensity,
    setCustomColors,
    updateGamerProfile,
    updateAdaptiveSettings,
    saveCurrentAsPreset,
    loadPreset,
    deletePreset,
    exportThemeCode,
    importThemeCode,
    triggerGpuBrandMatch,
    resetToDefault,
    availableThemes,
    factions,
  } = useTheme();

  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('palettes');
  const [customPrimaryInput, setCustomPrimaryInput] = useState(
    preferences.customPrimary || '#76b900'
  );
  const [customSecondaryInput, setCustomSecondaryInput] = useState(
    preferences.customSecondary || '#bfff00'
  );
  const [newPresetName, setNewPresetName] = useState('');
  const [importCodeInput, setImportCodeInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Sync preference change into localConfig if present
  const syncToLocalConfig = (themeId: ThemeId, bg: BackgroundMode, glow: GlowIntensity) => {
    if (setLocalConfig) {
      setLocalConfig((prev: any) => ({
        ...prev,
        theme: {
          id: themeId,
          background_mode: bg,
          glow_intensity: glow,
          custom_primary: customPrimaryInput,
          custom_secondary: customSecondaryInput,
          gamer_profile: preferences.gamerProfile,
        },
      }));
    }
  };

  const handleSelectTheme = (id: ThemeId) => {
    setThemeId(id);
    syncToLocalConfig(id, preferences.backgroundMode, preferences.glowIntensity);
  };

  const handleSelectBackground = (mode: BackgroundMode) => {
    setBackgroundMode(mode);
    syncToLocalConfig(preferences.themeId, mode, preferences.glowIntensity);
  };

  const handleSelectGlow = (intensity: GlowIntensity) => {
    setGlowIntensity(intensity);
    syncToLocalConfig(preferences.themeId, preferences.backgroundMode, intensity);
  };

  const handleApplyCustomColors = () => {
    setCustomColors({
      primary: customPrimaryInput,
      secondary: customSecondaryInput,
    });
    syncToLocalConfig('custom', preferences.backgroundMode, preferences.glowIntensity);
  };

  const handleReset = () => {
    resetToDefault();
    setCustomPrimaryInput('#76b900');
    setCustomSecondaryInput('#bfff00');
    syncToLocalConfig('emerald', 'obsidian', 'balanced');
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    saveCurrentAsPreset(newPresetName.trim());
    setNewPresetName('');
  };

  const handleCopyCode = () => {
    const code = exportThemeCode();
    if (code) {
      navigator.clipboard.writeText(code);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleImportCode = () => {
    if (!importCodeInput.trim()) return;
    const success = importThemeCode(importCodeInput.trim());
    if (success) {
      setImportFeedback('Theme imported successfully!');
      setImportCodeInput('');
    } else {
      setImportFeedback('Invalid theme code format.');
    }
    setTimeout(() => setImportFeedback(null), 3000);
  };

  const activeFaction = factions.find((f) => f.id === preferences.gamerProfile.faction) || factions[0];

  return (
    <div className="space-y-8">
      {/* Top Banner: Gamer Identity Header & Sub-Navigation */}
      <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-neon-green/10 via-neon-green/5 to-transparent border border-neon-green/30 shadow-[0_0_30px_rgba(var(--theme-neon-rgb),0.1)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-white/20 transition-all ${
                preferences.gamerProfile.avatarAura ? 'gamer-aura-glow bg-neon-green/20 text-neon-green' : 'bg-white/5 text-white'
              }`}
            >
              {activeFaction.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  {preferences.gamerProfile.callsign || 'OPERATIVE-01'}
                </h3>
                <span className="text-[9px] font-mono font-black uppercase text-neon-green bg-neon-green/15 border border-neon-green/30 px-2 py-0.5 rounded-md">
                  {activeFaction.badge}
                </span>
                {activeGameTheme && (
                  <span className="text-[8px] font-black uppercase text-neon-yellow bg-neon-yellow/15 border border-neon-yellow/30 px-2 py-0.5 rounded-full animate-pulse">
                    🎮 Game Sync Active
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                {preferences.gamerProfile.title} &mdash; <span className="italic">{activeFaction.motto}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-neon-green" />
              <span>Reset Factory Defaults</span>
            </button>
          </div>
        </div>

        {/* 5-Segmented Sub-Tab Switcher */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5">
          {[
            { id: 'palettes' as SubTabId, label: 'Theme Palettes', icon: Palette },
            { id: 'identity' as SubTabId, label: 'Gamer Identity', icon: User },
            { id: 'adaptive' as SubTabId, label: 'Adaptive Intelligence', icon: Gamepad2 },
            { id: 'canvas' as SubTabId, label: 'Canvas Atmosphere', icon: Grid },
            { id: 'presets' as SubTabId, label: 'Custom Presets', icon: Share2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: PALETTES & CUSTOM STUDIO */}
      {activeSubTab === 'palettes' && (
        <div className="space-y-6">
          <SettingsSection
            title="Curated Engineering Palettes"
            icon={Palette}
            searchQuery={searchQuery}
            searchTerms="theme palette color curated emerald cyberpunk crimson cobalt amethyst solar stealth toxic"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {availableThemes.map((theme) => {
                const isSelected = preferences.themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id as ThemeId)}
                    className={`group relative text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
                      isSelected
                        ? 'bg-neon-green/10 border-neon-green/50 shadow-[0_0_25px_rgba(var(--theme-neon-rgb),0.2)]'
                        : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400">
                          {theme.badge}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[8px] font-black uppercase text-neon-green tracking-wider bg-neon-green/20 px-2 py-0.5 rounded-full border border-neon-green/40">
                            <Check className="w-2.5 h-2.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider group-hover:text-neon-green transition-colors">
                          {theme.name}
                        </h4>
                        <p className="text-[9px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {theme.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-lg border border-white/20 shadow-sm transition-transform duration-200 group-hover:scale-110"
                          style={{
                            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-mono text-zinc-400">{theme.colors.primary}</span>
                          <span className="text-[7px] font-mono text-zinc-600">{theme.colors.secondary}</span>
                        </div>
                      </div>

                      <div
                        className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                        style={{
                          backgroundColor: theme.colors.primary,
                          color: theme.colors.primary,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* Custom Hex Color Studio */}
          <SettingsSection
            title="Custom Palette Studio"
            icon={Sliders}
            searchQuery={searchQuery}
            searchTerms="custom theme palette color hex picker accent secondary primary"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-200">
                      Primary Accent (Main Neon)
                    </label>
                    <div
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: customPrimaryInput }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPrimaryInput}
                      onChange={(e) => setCustomPrimaryInput(e.target.value)}
                      className="w-10 h-9 rounded-xl bg-transparent border border-white/10 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={customPrimaryInput}
                      onChange={(e) => setCustomPrimaryInput(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neon-green uppercase"
                      placeholder="#76B900"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-200">
                      Secondary Accent (Highlight)
                    </label>
                    <div
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: customSecondaryInput }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customSecondaryInput}
                      onChange={(e) => setCustomSecondaryInput(e.target.value)}
                      className="w-10 h-9 rounded-xl bg-transparent border border-white/10 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={customSecondaryInput}
                      onChange={(e) => setCustomSecondaryInput(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neon-green uppercase"
                      placeholder="#BFFF00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                    Quick Swatches:
                  </span>
                  {[
                    { p: '#00ffcc', s: '#0077ff', name: 'Turquoise' },
                    { p: '#ff0055', s: '#ffaa00', name: 'Sunset' },
                    { p: '#8b5cf6', s: '#ec4899', name: 'Synthwave' },
                    { p: '#22c55e', s: '#eab308', name: 'Matrix' },
                    { p: '#f43f5e', s: '#fb923c', name: 'Inferno' },
                  ].map((sw) => (
                    <button
                      key={sw.name}
                      type="button"
                      title={sw.name}
                      onClick={() => {
                        setCustomPrimaryInput(sw.p);
                        setCustomSecondaryInput(sw.s);
                      }}
                      className="w-5 h-5 rounded-md border border-white/20 transition-transform hover:scale-125 cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, ${sw.p} 0%, ${sw.s} 100%)`,
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleApplyCustomColors}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-neon-green text-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.3)] cursor-pointer"
                >
                  Apply Custom Palette
                </button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* SUB-TAB 2: GAMER IDENTITY & CALL-SIGN */}
      {activeSubTab === 'identity' && (
        <div className="space-y-6">
          <SettingsSection
            title="Gamer Call-Sign & Allegiance"
            icon={User}
            searchQuery={searchQuery}
            searchTerms="gamer tag callsign alias faction title player identity profile"
          >
            <div className="space-y-6">
              {/* Call-Sign Input & Player Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-200">
                    Gamer Call-Sign / Tactical Handle
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={preferences.gamerProfile.callsign}
                    onChange={(e) => updateGamerProfile({ callsign: e.target.value.toUpperCase() })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neon-green uppercase focus:outline-none focus:border-neon-green"
                    placeholder="E.G. VIPER-01"
                  />
                  <p className="text-[9px] text-zinc-500">
                    Displayed across header status bar, neural history logs, and tactical in-game HUD.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-200">
                    Specialization Title
                  </label>
                  <select
                    value={preferences.gamerProfile.title}
                    onChange={(e) => updateGamerProfile({ title: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-green cursor-pointer"
                  >
                    {PLAYER_TITLES.map((t) => (
                      <option key={t} value={t} className="bg-zinc-900 text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-zinc-500">
                    Your tactical role displayed on your pilot license and performance reports.
                  </p>
                </div>
              </div>

              {/* Faction Allegiance Matrix */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-neon-green" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-white">
                    Faction Allegiance & Insignia
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {factions.map((f) => {
                    const isSelected = preferences.gamerProfile.faction === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          updateGamerProfile({ faction: f.id as FactionId });
                          setThemeId(f.themeId);
                        }}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-neon-green/15 border-neon-green/50 shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.15)]'
                            : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-sm shrink-0">
                          {f.symbol}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                            {f.name}
                          </div>
                          <div className="text-[9px] text-zinc-400 italic truncate">{f.motto}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Holographic Avatar Aura Toggle */}
              <div className="p-4 rounded-2xl bg-white/2 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white">
                    Holographic Avatar Aura
                  </p>
                  <p className="text-[9px] text-zinc-400 mt-0.5">
                    Surround your pilot avatar with a glowing theme-reactive neon aura.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateGamerProfile({ avatarAura: !preferences.gamerProfile.avatarAura })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer border ${
                    preferences.gamerProfile.avatarAura
                      ? 'bg-neon-green border-neon-green/50'
                      : 'bg-white/10 border-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 ${
                      preferences.gamerProfile.avatarAura ? 'left-6.5' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* SUB-TAB 3: ADAPTIVE INTELLIGENCE */}
      {activeSubTab === 'adaptive' && (
        <div className="space-y-6">
          <SettingsSection
            title="Real-Time Adaptive Intelligence"
            icon={Gamepad2}
            searchQuery={searchQuery}
            searchTerms="adaptive intelligence game sync auto switch gpu match personality thermal alert"
          >
            <div className="space-y-4">
              {/* Feature 1: Game-Adaptive Theming */}
              <div className="p-4 rounded-2xl bg-white/2 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-neon-green" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      Game-Adaptive Theme Sync
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-400 max-w-xl leading-relaxed">
                    Automatically transforms the entire app aesthetic to match the game currently playing. E.g., Cyberpunk 2077 shifts to Night City Neon, Doom shifts to Crimson Fury, and Starfield shifts to Quantum Cobalt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateAdaptiveSettings({ gameAdaptiveSync: !preferences.adaptive.gameAdaptiveSync })}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                    preferences.adaptive.gameAdaptiveSync
                      ? 'bg-neon-green text-black border-neon-green font-black shadow-[0_0_15px_rgba(var(--theme-neon-rgb),0.3)]'
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  {preferences.adaptive.gameAdaptiveSync ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Feature 2: GPU Brand Alignment */}
              <div className="p-4 rounded-2xl bg-white/2 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-neon-yellow" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      GPU Hardware Brand Alignment
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-400 max-w-xl leading-relaxed">
                    Detect your physical GPU (NVIDIA RTX, AMD Radeon, Intel Arc) and align telemetry accents with official manufacturer brand colors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerGpuBrandMatch()}
                  className="px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all cursor-pointer shrink-0"
                >
                  Detect &amp; Match GPU
                </button>
              </div>

              {/* Feature 3: AI Companion Personality Sync */}
              <div className="p-4 rounded-2xl bg-white/2 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-neon-green" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      AI Companion Persona Sync
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-400 max-w-xl leading-relaxed">
                    Dynamically sync color moods whenever switching the AI Personality (Tactical = Emerald, Sarcastic = Cyberpunk, Aggressive = Crimson, Friendly = Solar).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateAdaptiveSettings({ personalitySync: !preferences.adaptive.personalitySync })}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                    preferences.adaptive.personalitySync
                      ? 'bg-neon-green text-black border-neon-green font-black shadow-[0_0_15px_rgba(var(--theme-neon-rgb),0.3)]'
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  {preferences.adaptive.personalitySync ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Feature 4: Thermal Reactive Alert Glow */}
              <div className="p-4 rounded-2xl bg-white/2 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      Thermal Reactive Telemetry Pulse
                    </span>
                  </div>
                  <p className="text-[9px] text-zinc-400 max-w-xl leading-relaxed">
                    Subtly pulses ambient thermal alerts if GPU temperature exceeds critical hardware thresholds (&gt; 83 °C).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateAdaptiveSettings({ thermalReactiveGlow: !preferences.adaptive.thermalReactiveGlow })}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                    preferences.adaptive.thermalReactiveGlow
                      ? 'bg-neon-green text-black border-neon-green font-black shadow-[0_0_15px_rgba(var(--theme-neon-rgb),0.3)]'
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  {preferences.adaptive.thermalReactiveGlow ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* SUB-TAB 4: CANVAS ATMOSPHERE & TEXTURES */}
      {activeSubTab === 'canvas' && (
        <div className="space-y-6">
          <SettingsSection
            title="Canvas Background Tone"
            icon={Monitor}
            searchQuery={searchQuery}
            searchTerms="background obsidian graphite carbon void canvas dark oled contrast mode"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BACKGROUND_MODES.map((mode) => {
                const isSelected = preferences.backgroundMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectBackground(mode.id)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-neon-green/10 border-neon-green/50 shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.15)]'
                        : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white">
                          {mode.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-neon-green" />}
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-relaxed">{mode.description}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-md border border-white/20 shadow-inner"
                        style={{ backgroundColor: mode.appBg }}
                      />
                      <span className="text-[8px] font-mono text-zinc-500 uppercase">
                        {mode.appBg}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* Canvas Mesh Textures */}
          <SettingsSection
            title="Ambient Canvas Texture"
            icon={Grid}
            searchQuery={searchQuery}
            searchTerms="texture mesh circuits scanlines stardust pattern grid"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CANVAS_TEXTURES.map((tex) => {
                const isSelected = preferences.canvasTexture === tex.id;
                return (
                  <button
                    key={tex.id}
                    type="button"
                    onClick={() => setCanvasTexture(tex.id as CanvasTexture)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-neon-green/10 border-neon-green/50 shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.15)]'
                        : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white">
                          {tex.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-neon-green" />}
                      </div>
                      <p className="text-[9px] text-zinc-400 leading-relaxed">{tex.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* Neon Bloom Glow Intensity */}
          <SettingsSection
            title="Neon Bloom & Glow Intensity"
            icon={SunMedium}
            searchQuery={searchQuery}
            searchTerms="glow bloom intensity neon light brightness blur shine off"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GLOW_INTENSITIES.map((glow) => {
                const isSelected = preferences.glowIntensity === glow.id;
                return (
                  <button
                    key={glow.id}
                    type="button"
                    onClick={() => handleSelectGlow(glow.id)}
                    className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-neon-green/10 border-neon-green/50 shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.15)]'
                        : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white">
                          {glow.name}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-neon-green" />}
                      </div>
                      <p className="text-[8px] text-zinc-400 leading-relaxed">{glow.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SettingsSection>
        </div>
      )}

      {/* SUB-TAB 5: CUSTOM PRESETS & SHARING */}
      {activeSubTab === 'presets' && (
        <div className="space-y-6">
          <SettingsSection
            title="Custom Theme Presets"
            icon={Share2}
            searchQuery={searchQuery}
            searchTerms="preset save load export import share code community"
          >
            <div className="space-y-6">
              {/* Save New Preset Form */}
              <form onSubmit={handleSavePreset} className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-white">
                  Save Current Appearance as Named Preset
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="e.g. My Midnight Esports Setup"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-green"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-neon-green text-black hover:brightness-110 cursor-pointer transition-all shrink-0"
                  >
                    Save Preset
                  </button>
                </div>
              </form>

              {/* Saved Presets List */}
              {preferences.savedPresets.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Saved Presets ({preferences.savedPresets.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {preferences.savedPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-3.5 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-md shrink-0 border border-white/20"
                            style={{
                              background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 100%)`,
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-white truncate">{preset.name}</div>
                            <div className="text-[8px] text-zinc-500 font-mono">
                              {preset.backgroundMode.toUpperCase()} · {preset.canvasTexture}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => loadPreset(preset.id)}
                            className="px-2.5 py-1 rounded-lg bg-neon-green/15 hover:bg-neon-green/25 text-neon-green text-[9px] font-bold uppercase transition-all cursor-pointer"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePreset(preset.id)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 italic">
                  No custom presets saved yet. Configure your dream palette and save it above!
                </p>
              )}

              {/* Shareable Import / Export Code */}
              <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">
                    Shareable Theme Code
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-neon-green border border-neon-green/30 cursor-pointer transition-all"
                  >
                    {copyFeedback ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copyFeedback ? 'Copied to Clipboard!' : 'Copy Current Theme Code'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Import Friend or Community Theme Code:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={importCodeInput}
                      onChange={(e) => setImportCodeInput(e.target.value)}
                      placeholder="Paste MC-THEME:... code here"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neon-green"
                    />
                    <button
                      type="button"
                      onClick={handleImportCode}
                      className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/15 text-white border border-white/20 cursor-pointer transition-all shrink-0"
                    >
                      <Download className="w-3 h-3 inline mr-1" />
                      Import
                    </button>
                  </div>
                  {importFeedback && (
                    <p className={`text-[9px] font-bold ${importFeedback.includes('success') ? 'text-neon-green' : 'text-red-400'}`}>
                      {importFeedback}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* Bottom: Live Interactive Sandbox Preview */}
      <SettingsSection
        title="Live Pilot Interface Simulation"
        icon={Eye}
        searchQuery={searchQuery}
        searchTerms="preview sandbox live demo test hud telemetry appearance"
      >
        <div className="p-5 rounded-2xl bg-white/2 border border-white/10 space-y-4">
          {/* Subtitle / Explanatory Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-neon-green animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                  Active Tactical Layout: {preferences.gamerProfile.callsign} &mdash; {activeFaction.name}
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 font-medium mt-0.5">
                Real-time interactive sandbox previewing your selected theme colors, tactical faction accents, and telemetry HUD styling before launching games.
              </p>
            </div>
            <span className="text-[8px] font-mono text-neon-yellow uppercase bg-neon-yellow/10 border border-neon-yellow/20 px-2.5 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
              {currentTheme.name} · {preferences.backgroundMode.toUpperCase()} · {preferences.canvasTexture}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Mock Telemetry Card */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase">
                <span>FPS Frame Rate</span>
                <span className="text-neon-green font-mono">144.0 FPS</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-neon-green rounded-full w-[85%]" />
              </div>
              <span className="text-[8px] text-zinc-500 font-mono">0.1% Low: 138 FPS</span>
            </div>

            {/* Mock GPU Status Card */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase">
                <span>GPU Temperature</span>
                <span className="text-neon-yellow font-mono">62 °C</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-neon-yellow rounded-full w-[60%]" />
              </div>
              <span className="text-[8px] text-zinc-500 font-mono">Target: 83 °C Max</span>
            </div>

            {/* Mock Action Widget */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-white">DLSS 5.0 Neural Engine</span>
                <span className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_rgba(var(--theme-neon-rgb),0.8)] animate-pulse" />
              </div>
              <button
                type="button"
                className="w-full mt-2 py-1.5 rounded-lg bg-neon-green/15 border border-neon-green/30 text-neon-green text-[9px] font-black uppercase tracking-wider hover:bg-neon-green/25 transition-all cursor-pointer"
              >
                Super Resolution Active
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default AppearanceSection;
