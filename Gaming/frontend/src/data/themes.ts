import type {
  AppTheme,
  ThemePreferences,
  BackgroundMode,
  GlowIntensity,
  CanvasTexture,
  FactionConfig,
  ThemeId,
} from '../types/theme';

export const THEME_STORAGE_KEY = 'mc_theme_preferences';

export const THEME_CATALOG: AppTheme[] = [
  {
    id: 'emerald',
    name: 'Emerald Protocol',
    tagline: 'Tactical NVIDIA signature emerald with stealth optics',
    badge: 'NVIDIA Signature',
    category: 'signature',
    colors: {
      primary: '#76b900',
      secondary: '#bfff00',
      primaryRgb: '118, 185, 0',
      secondaryRgb: '191, 255, 0',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    tagline: 'High-voltage Night City cyan with blazing cyber yellow',
    badge: 'Night City',
    category: 'cyberpunk',
    colors: {
      primary: '#00f0ff',
      secondary: '#fee715',
      primaryRgb: '0, 240, 255',
      secondaryRgb: '254, 231, 21',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson Fury',
    tagline: 'Aggressive Radeon crimson and hot coral racing flare',
    badge: 'Radeon Red',
    category: 'racing',
    colors: {
      primary: '#ff2a4b',
      secondary: '#ff758c',
      primaryRgb: '255, 42, 75',
      secondaryRgb: '255, 117, 140',
    },
  },
  {
    id: 'cobalt',
    name: 'Quantum Cobalt',
    tagline: 'Deep space Arc sapphire with electric sky cyan',
    badge: 'Arc Azure',
    category: 'signature',
    colors: {
      primary: '#00a8ff',
      secondary: '#38bdf8',
      primaryRgb: '0, 168, 255',
      secondaryRgb: '56, 189, 248',
    },
  },
  {
    id: 'amethyst',
    name: 'Void Amethyst',
    tagline: 'Neon violet with synthwave magenta for deep sessions',
    badge: 'Deep Void',
    category: 'cyberpunk',
    colors: {
      primary: '#a855f7',
      secondary: '#f472b6',
      primaryRgb: '168, 85, 247',
      secondaryRgb: '244, 114, 182',
    },
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    tagline: 'Warm telemetry amber with molten gold highlights',
    badge: 'Solar Gold',
    category: 'racing',
    colors: {
      primary: '#f59e0b',
      secondary: '#fde047',
      primaryRgb: '245, 158, 11',
      secondaryRgb: '253, 224, 71',
    },
  },
  {
    id: 'toxic',
    name: 'Toxic Hazard',
    tagline: 'Radioactive biohazard green with crisp phosphor mint',
    badge: 'Biohazard',
    category: 'cyberpunk',
    colors: {
      primary: '#10b981',
      secondary: '#6ee7b7',
      primaryRgb: '16, 185, 129',
      secondaryRgb: '110, 231, 183',
    },
  },
  {
    id: 'stealth',
    name: 'Stealth Carbon',
    tagline: 'Pure monochrome platinum and titanium spec-ops slate',
    badge: 'Spec Ops',
    category: 'minimal',
    colors: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
      primaryRgb: '226, 232, 240',
      secondaryRgb: '148, 163, 184',
    },
  },
  {
    id: 'custom',
    name: 'Custom Palette',
    tagline: 'Personalized user accent and highlight configuration',
    badge: 'Custom Studio',
    category: 'minimal',
    colors: {
      primary: '#76b900',
      secondary: '#bfff00',
      primaryRgb: '118, 185, 0',
      secondaryRgb: '191, 255, 0',
    },
  },
];

export const FACTION_CONFIGS: FactionConfig[] = [
  {
    id: 'vanguard',
    name: 'RTX Cyber Vanguard',
    motto: 'Precision & Frame Superiority',
    themeId: 'emerald',
    badge: 'VANGUARD',
    symbol: '⚡',
  },
  {
    id: 'syndicate',
    name: 'Night City Syndicate',
    motto: 'High Tech, Low Life',
    themeId: 'cyberpunk',
    badge: 'SYNDICATE',
    symbol: '☣',
  },
  {
    id: 'bloodhound',
    name: 'Radeon Bloodhound',
    motto: 'Full Throttle Adrenaline',
    themeId: 'crimson',
    badge: 'BLOODHOUND',
    symbol: '▲',
  },
  {
    id: 'quantum',
    name: 'Arc Quantum Core',
    motto: 'Algorithmic Precision',
    themeId: 'cobalt',
    badge: 'QUANTUM',
    symbol: '◈',
  },
  {
    id: 'solaris',
    name: 'Solaris Orbital Fleet',
    motto: 'Frontier Space Telemetry',
    themeId: 'solar',
    badge: 'SOLARIS',
    symbol: '☼',
  },
];

export const CANVAS_TEXTURES: Array<{
  id: CanvasTexture;
  name: string;
  description: string;
}> = [
  { id: 'none', name: 'Clean Minimal Glass', description: 'Flat dark canvas with zero background pattern' },
  { id: 'mesh-grid', name: 'Cyber Matrix Dots', description: 'Futuristic coordinate dot mesh with theme glow' },
  { id: 'circuits', name: 'Silicon Circuitry', description: 'Subtle microchip circuit traces and computational bus' },
  { id: 'scanlines', name: 'CRT Phosphor Scanlines', description: 'Tactical retro-futuristic arcade scanline filter' },
  { id: 'stardust', name: 'Celestial Nebula', description: 'Atmospheric deep space ambient cosmic haze' },
];

export const PLAYER_TITLES = [
  'Neural Tactician',
  'Overclock Specialist',
  'Esports Vanguard',
  'Frame Chaser',
  'Ray-Tracing Specialist',
  'Cybernet Ronin',
  'Stealth Operative',
  'High-Refresh Hunter',
  'Apex Competitor',
  'Hardware Architect',
];

export const BACKGROUND_MODES: Array<{
  id: BackgroundMode;
  name: string;
  description: string;
  appBg: string;
  surfaceBg: string;
}> = [
  {
    id: 'obsidian',
    name: 'Obsidian Pitch',
    description: 'True pitch black canvas calibrated for OLED screens',
    appBg: '#040406',
    surfaceBg: '#060609',
  },
  {
    id: 'carbon',
    name: 'Graphite Carbon',
    description: 'Industrial charcoal with subtle slate undertones',
    appBg: '#111216',
    surfaceBg: '#15171d',
  },
  {
    id: 'void',
    name: 'Midnight Void',
    description: 'Deep celestial navy with subtle cosmic tint',
    appBg: '#090812',
    surfaceBg: '#0d0c1b',
  },
];

export const GLOW_INTENSITIES: Array<{
  id: GlowIntensity;
  name: string;
  description: string;
  opacity: string;
}> = [
  { id: 'high', name: 'High Bloom', description: 'Vibrant cyberpunk neon bloom and glowing borders', opacity: '0.35' },
  { id: 'balanced', name: 'Balanced', description: 'Optimal tactical glow for clarity and visual depth', opacity: '0.15' },
  { id: 'subtle', name: 'Subtle', description: 'Minimalist glow with reduced visual distraction', opacity: '0.06' },
  { id: 'off', name: 'Disabled', description: 'Zero glow effects for flat competitive clarity', opacity: '0' },
];

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  themeId: 'emerald',
  backgroundMode: 'obsidian',
  canvasTexture: 'mesh-grid',
  glowIntensity: 'balanced',
  customPrimary: '#76b900',
  customSecondary: '#bfff00',
  gamerProfile: {
    callsign: 'OPERATIVE-01',
    title: 'Neural Tactician',
    faction: 'vanguard',
    avatarAura: true,
  },
  adaptive: {
    gameAdaptiveSync: true,
    personalitySync: false,
    gpuBrandMatch: false,
    thermalReactiveGlow: true,
    gameOverrides: {},
  },
  savedPresets: [],
};

/**
 * Converts a 3 or 6 digit hex string to "r, g, b" format for CSS rgba().
 */
export function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '118, 185, 0';
}

/**
 * Intelligent game title to theme detection.
 * Maps known game titles, genres, and aesthetics to curated themes.
 */
export function detectThemeForGame(gameTitle?: string | null): ThemeId | null {
  if (!gameTitle) return null;
  const lower = gameTitle.toLowerCase();

  // Cyberpunk & Futuristic Dystopia
  if (lower.includes('cyberpunk') || lower.includes('night city') || lower.includes('deus ex') || lower.includes('watch dogs') || lower.includes('ghostrunner')) {
    return 'cyberpunk';
  }

  // Intense Racing Crimson & Dark Fantasy Blood
  if (
    lower.includes('doom') ||
    lower.includes('red dead') ||
    lower.includes('diablo') ||
    lower.includes('warhammer') ||
    lower.includes('helldivers') ||
    lower.includes('resident evil') ||
    lower.includes('mortal kombat') ||
    lower.includes('dead space')
  ) {
    return 'crimson';
  }

  // Deep Space, Sci-Fi & High Technology Azure
  if (
    lower.includes('starfield') ||
    lower.includes('no man') ||
    lower.includes('halo') ||
    lower.includes('portal') ||
    lower.includes('subnautica') ||
    lower.includes('mass effect') ||
    lower.includes('elite dangerous') ||
    lower.includes('destiny')
  ) {
    return 'cobalt';
  }

  // Dark Souls, Mystical RPG & Void Amethyst
  if (
    lower.includes('elden ring') ||
    lower.includes('dark souls') ||
    lower.includes('witcher') ||
    lower.includes('baldur') ||
    lower.includes('bloodborne') ||
    lower.includes('sekiro') ||
    lower.includes('lies of p')
  ) {
    return 'amethyst';
  }

  // High-Speed Racing & Solar Amber
  if (
    lower.includes('forza') ||
    lower.includes('need for speed') ||
    lower.includes('f1 ') ||
    lower.includes('formula') ||
    lower.includes('asphalt') ||
    lower.includes('gran turismo') ||
    lower.includes('crew')
  ) {
    return 'solar';
  }

  // Competitive Esports & Tactical Mint/Hazard
  if (
    lower.includes('counter-strike') ||
    lower.includes('cs2') ||
    lower.includes('cs:go') ||
    lower.includes('valorant') ||
    lower.includes('apex') ||
    lower.includes('overwatch') ||
    lower.includes('rainbow six') ||
    lower.includes('pubg')
  ) {
    return 'toxic';
  }

  // Stealth & Spec-Ops
  if (
    lower.includes('ghost of tsushima') ||
    lower.includes('dishonored') ||
    lower.includes('hitman') ||
    lower.includes('assassin') ||
    lower.includes('splinter cell') ||
    lower.includes('metal gear')
  ) {
    return 'stealth';
  }

  return null;
}

/**
 * Detects appropriate theme matching the user's graphics hardware brand.
 */
export function detectThemeForGpu(gpuName?: string | null): ThemeId | null {
  if (!gpuName) return null;
  const lower = gpuName.toLowerCase();

  if (lower.includes('nvidia') || lower.includes('geforce') || lower.includes('rtx') || lower.includes('gtx')) {
    return 'emerald';
  }
  if (lower.includes('amd') || lower.includes('radeon') || lower.includes('rx ')) {
    return 'crimson';
  }
  if (lower.includes('intel') || lower.includes('arc') || lower.includes('iris') || lower.includes('xe')) {
    return 'cobalt';
  }

  return null;
}

/**
 * Returns theme mapped to AI Agent companion personality.
 */
export function themeForPersonality(personality?: string | null): ThemeId {
  if (!personality) return 'emerald';
  const lower = personality.toLowerCase();

  if (lower.includes('tactical')) return 'emerald';
  if (lower.includes('friendly')) return 'solar';
  if (lower.includes('immersive')) return 'cobalt';
  if (lower.includes('sarcastic')) return 'cyberpunk';
  if (lower.includes('aggressive')) return 'crimson';

  return 'emerald';
}

/**
 * Applies the given theme preferences directly to document.documentElement CSS variables.
 */
export function applyThemeToDom(prefs: ThemePreferences): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const theme = THEME_CATALOG.find((t) => t.id === prefs.themeId) || THEME_CATALOG[0];

  let primary = theme.colors.primary;
  let secondary = theme.colors.secondary;
  let primaryRgb = theme.colors.primaryRgb;
  let secondaryRgb = theme.colors.secondaryRgb;

  if (prefs.themeId === 'custom') {
    if (prefs.customPrimary) {
      primary = prefs.customPrimary;
      primaryRgb = hexToRgb(prefs.customPrimary);
    }
    if (prefs.customSecondary) {
      secondary = prefs.customSecondary;
      secondaryRgb = hexToRgb(prefs.customSecondary);
    }
  }

  // Glow Opacity
  const glowConfig = GLOW_INTENSITIES.find((g) => g.id === prefs.glowIntensity) || GLOW_INTENSITIES[1];
  const glowOpacity = glowConfig.opacity;

  // Background Mode
  const bgConfig = BACKGROUND_MODES.find((b) => b.id === prefs.backgroundMode) || BACKGROUND_MODES[0];

  root.style.setProperty('--theme-neon-green', primary);
  root.style.setProperty('--theme-neon-yellow', secondary);
  root.style.setProperty('--theme-neon-rgb', primaryRgb);
  root.style.setProperty('--theme-neon-yellow-rgb', secondaryRgb);
  root.style.setProperty('--theme-glow-opacity', glowOpacity);
  root.style.setProperty('--theme-bg-app', bgConfig.appBg);
  root.style.setProperty('--theme-bg-surface', bgConfig.surfaceBg);

  root.setAttribute('data-theme', prefs.themeId);
  root.setAttribute('data-bg-mode', prefs.backgroundMode);
  root.setAttribute('data-texture', prefs.canvasTexture || 'mesh-grid');
  root.setAttribute('data-glow', prefs.glowIntensity);
  if (prefs.gamerProfile?.faction) {
    root.setAttribute('data-faction', prefs.gamerProfile.faction);
  }
}

/**
 * Loads saved theme preferences from localStorage with safe fallbacks and schema migration.
 */
export function loadSavedThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') return DEFAULT_THEME_PREFERENCES;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_THEME_PREFERENCES,
      ...parsed,
      gamerProfile: {
        ...DEFAULT_THEME_PREFERENCES.gamerProfile,
        ...(parsed.gamerProfile || {}),
      },
      adaptive: {
        ...DEFAULT_THEME_PREFERENCES.adaptive,
        ...(parsed.adaptive || {}),
      },
      savedPresets: Array.isArray(parsed.savedPresets) ? parsed.savedPresets : [],
    };
  } catch (_) {
    return DEFAULT_THEME_PREFERENCES;
  }
}

/**
 * Saves theme preferences to localStorage.
 */
export function saveStoredThemePreferences(prefs: ThemePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
  } catch (_) {}
}

function toBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  return '';
}

function fromBase64(b64: string): string {
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(b64)));
  }
  return '';
}

/**
 * Exports theme preferences as a shareable string code.
 */
export function exportThemeCode(prefs: ThemePreferences): string {
  try {
    const payload = {
      t: prefs.themeId,
      b: prefs.backgroundMode,
      x: prefs.canvasTexture,
      g: prefs.glowIntensity,
      cp: prefs.customPrimary,
      cs: prefs.customSecondary,
      gp: prefs.gamerProfile,
    };
    const jsonStr = JSON.stringify(payload);
    const b64 = toBase64(jsonStr);
    return `MC-THEME:${b64}`;
  } catch (_) {
    return '';
  }
}

/**
 * Imports and parses a shareable theme code.
 */
export function importThemeCode(code: string): Partial<ThemePreferences> | null {
  try {
    const clean = code.trim();
    if (!clean.startsWith('MC-THEME:')) return null;
    const b64 = clean.replace('MC-THEME:', '');
    const jsonStr = fromBase64(b64);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);

    return {
      themeId: parsed.t,
      backgroundMode: parsed.b,
      canvasTexture: parsed.x,
      glowIntensity: parsed.g,
      customPrimary: parsed.cp,
      customSecondary: parsed.cs,
      gamerProfile: parsed.gp,
    };
  } catch (_) {
    return null;
  }
}
