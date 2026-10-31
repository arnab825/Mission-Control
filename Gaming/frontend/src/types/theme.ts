export type ThemeId =
  | 'emerald'
  | 'cyberpunk'
  | 'crimson'
  | 'cobalt'
  | 'amethyst'
  | 'solar'
  | 'stealth'
  | 'toxic'
  | 'custom';

export type BackgroundMode = 'obsidian' | 'carbon' | 'void';

export type GlowIntensity = 'high' | 'balanced' | 'subtle' | 'off';

export type CanvasTexture = 'none' | 'mesh-grid' | 'circuits' | 'scanlines' | 'stardust';

export type FactionId = 'vanguard' | 'syndicate' | 'bloodhound' | 'quantum' | 'solaris';

export interface FactionConfig {
  id: FactionId;
  name: string;
  motto: string;
  themeId: ThemeId;
  badge: string;
  symbol: string;
}

export interface GamerProfile {
  callsign: string;
  title: string;
  faction: FactionId;
  avatarAura: boolean;
}

export interface AdaptivePreferences {
  gameAdaptiveSync: boolean;
  personalitySync: boolean;
  gpuBrandMatch: boolean;
  thermalReactiveGlow: boolean;
  gameOverrides?: Record<string, ThemeId>;
}

export interface CustomThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  backgroundMode: BackgroundMode;
  canvasTexture: CanvasTexture;
  glowIntensity: GlowIntensity;
  createdAt: number;
}

export interface ThemeColors {
  primary: string; // Hex code for primary accent (e.g. #76b900)
  secondary: string; // Hex code for secondary accent (e.g. #bfff00)
  primaryRgb: string; // "r, g, b" format for rgba() calculations
  secondaryRgb: string; // "r, g, b" format
  bgApp?: string; // Background canvas override
  bgSurface?: string; // Surface/card background override
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  tagline: string;
  badge: string;
  colors: ThemeColors;
  category: 'signature' | 'cyberpunk' | 'racing' | 'minimal';
}

export interface ThemePreferences {
  themeId: ThemeId;
  backgroundMode: BackgroundMode;
  canvasTexture: CanvasTexture;
  glowIntensity: GlowIntensity;
  customPrimary?: string;
  customSecondary?: string;
  gamerProfile: GamerProfile;
  adaptive: AdaptivePreferences;
  savedPresets: CustomThemePreset[];
}

export interface ThemeContextType {
  preferences: ThemePreferences;
  currentTheme: AppTheme;
  activeGameTheme: ThemeId | null;
  setThemeId: (id: ThemeId) => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  setCanvasTexture: (texture: CanvasTexture) => void;
  setGlowIntensity: (intensity: GlowIntensity) => void;
  setCustomColors: (colors: { primary?: string; secondary?: string }) => void;
  updateGamerProfile: (profile: Partial<GamerProfile>) => void;
  updateAdaptiveSettings: (adaptive: Partial<AdaptivePreferences>) => void;
  saveCurrentAsPreset: (name: string) => CustomThemePreset;
  loadPreset: (presetId: string) => boolean;
  deletePreset: (presetId: string) => void;
  exportThemeCode: () => string;
  importThemeCode: (code: string) => boolean;
  triggerGameAdaptiveCheck: (gameTitle?: string | null) => ThemeId | null;
  triggerGpuBrandMatch: (gpuName?: string | null) => ThemeId | null;
  triggerPersonalitySync: (personality: string) => ThemeId;
  resetToDefault: () => void;
  availableThemes: AppTheme[];
  factions: FactionConfig[];
}
