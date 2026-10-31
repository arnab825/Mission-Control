import { describe, it, expect, beforeEach } from 'vitest';
import {
  THEME_CATALOG,
  FACTION_CONFIGS,
  CANVAS_TEXTURES,
  hexToRgb,
  applyThemeToDom,
  loadSavedThemePreferences,
  saveStoredThemePreferences,
  DEFAULT_THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  detectThemeForGame,
  detectThemeForGpu,
  themeForPersonality,
  exportThemeCode,
  importThemeCode,
} from '../themes';

describe('Theme Data & Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-bg-mode');
    document.documentElement.removeAttribute('data-texture');
    document.documentElement.removeAttribute('data-glow');
    document.documentElement.removeAttribute('data-faction');
  });

  it('contains valid curated themes with required color values', () => {
    expect(THEME_CATALOG.length).toBeGreaterThanOrEqual(8);

    THEME_CATALOG.forEach((theme) => {
      expect(theme.id).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.badge).toBeDefined();
      expect(theme.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.colors.primaryRgb).toMatch(/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/);
    });
  });

  it('defines 5 unique gamer factions with insignias and mottoes', () => {
    expect(FACTION_CONFIGS).toHaveLength(5);
    FACTION_CONFIGS.forEach((faction) => {
      expect(faction.id).toBeDefined();
      expect(faction.name).toBeDefined();
      expect(faction.motto).toBeDefined();
      expect(faction.symbol).toBeDefined();
    });
  });

  it('correctly converts 3-digit and 6-digit hex codes to rgb format', () => {
    expect(hexToRgb('#76b900')).toBe('118, 185, 0');
    expect(hexToRgb('#00f0ff')).toBe('0, 240, 255');
    expect(hexToRgb('#f00')).toBe('255, 0, 0');
    expect(hexToRgb('#0f0')).toBe('0, 255, 0');
  });

  it('applies theme preferences to document.documentElement CSS variables', () => {
    applyThemeToDom({
      ...DEFAULT_THEME_PREFERENCES,
      themeId: 'cyberpunk',
      backgroundMode: 'carbon',
      canvasTexture: 'circuits',
      glowIntensity: 'high',
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--theme-neon-green')).toBe('#00f0ff');
    expect(root.style.getPropertyValue('--theme-neon-yellow')).toBe('#fee715');
    expect(root.style.getPropertyValue('--theme-neon-rgb')).toBe('0, 240, 255');
    expect(root.style.getPropertyValue('--theme-glow-opacity')).toBe('0.35');
    expect(root.getAttribute('data-theme')).toBe('cyberpunk');
    expect(root.getAttribute('data-bg-mode')).toBe('carbon');
    expect(root.getAttribute('data-texture')).toBe('circuits');
  });

  it('correctly detects theme from running game title', () => {
    expect(detectThemeForGame('Cyberpunk 2077')).toBe('cyberpunk');
    expect(detectThemeForGame('DOOM Eternal')).toBe('crimson');
    expect(detectThemeForGame('Starfield Digital Premium')).toBe('cobalt');
    expect(detectThemeForGame('Elden Ring: Shadow of the Erdtree')).toBe('amethyst');
    expect(detectThemeForGame('Forza Horizon 5')).toBe('solar');
    expect(detectThemeForGame('Counter-Strike 2')).toBe('toxic');
    expect(detectThemeForGame('Ghost of Tsushima DIRECTOR\'S CUT')).toBe('stealth');
    expect(detectThemeForGame(null)).toBeNull();
  });

  it('correctly detects manufacturer brand from GPU device name', () => {
    expect(detectThemeForGpu('NVIDIA GeForce RTX 4090')).toBe('emerald');
    expect(detectThemeForGpu('AMD Radeon RX 7900 XTX')).toBe('crimson');
    expect(detectThemeForGpu('Intel Arc A770 Graphics')).toBe('cobalt');
    expect(detectThemeForGpu('Generic Display Adapter')).toBeNull();
  });

  it('maps AI companion personalities to thematic color identities', () => {
    expect(themeForPersonality('Tactical')).toBe('emerald');
    expect(themeForPersonality('Sarcastic')).toBe('cyberpunk');
    expect(themeForPersonality('Aggressive')).toBe('crimson');
    expect(themeForPersonality('Immersive')).toBe('cobalt');
    expect(themeForPersonality('Friendly')).toBe('solar');
  });

  it('correctly exports and imports shareable theme codes', () => {
    const prefs = {
      ...DEFAULT_THEME_PREFERENCES,
      themeId: 'amethyst' as const,
      backgroundMode: 'void' as const,
      canvasTexture: 'stardust' as const,
      glowIntensity: 'high' as const,
      gamerProfile: {
        callsign: 'GHOST-99',
        title: 'Cybernet Ronin',
        faction: 'syndicate' as const,
        avatarAura: true,
      },
    };

    const code = exportThemeCode(prefs);
    expect(code.startsWith('MC-THEME:')).toBe(true);

    const imported = importThemeCode(code);
    expect(imported).not.toBeNull();
    expect(imported?.themeId).toBe('amethyst');
    expect(imported?.backgroundMode).toBe('void');
    expect(imported?.canvasTexture).toBe('stardust');
    expect(imported?.gamerProfile?.callsign).toBe('GHOST-99');
  });

  it('correctly saves and loads theme preferences to and from localStorage', () => {
    const prefs = {
      ...DEFAULT_THEME_PREFERENCES,
      themeId: 'crimson' as const,
      backgroundMode: 'void' as const,
      glowIntensity: 'subtle' as const,
      customPrimary: '#ff0033',
      customSecondary: '#ff9900',
    };

    saveStoredThemePreferences(prefs);
    const loaded = loadSavedThemePreferences();

    expect(loaded.themeId).toBe('crimson');
    expect(loaded.backgroundMode).toBe('void');
    expect(loaded.glowIntensity).toBe('subtle');
  });

  it('falls back to default preferences when localStorage is empty or corrupted', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid-json-{}');
    const loaded = loadSavedThemePreferences();
    expect(loaded.themeId).toBe(DEFAULT_THEME_PREFERENCES.themeId);
  });
});
