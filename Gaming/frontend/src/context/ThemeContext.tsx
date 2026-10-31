import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ThemeId,
  BackgroundMode,
  GlowIntensity,
  CanvasTexture,
  ThemePreferences,
  ThemeContextType,
  AppTheme,
  GamerProfile,
  AdaptivePreferences,
  CustomThemePreset,
} from '../types/theme';
import {
  THEME_CATALOG,
  FACTION_CONFIGS,
  DEFAULT_THEME_PREFERENCES,
  loadSavedThemePreferences,
  saveStoredThemePreferences,
  applyThemeToDom,
  detectThemeForGame,
  detectThemeForGpu,
  themeForPersonality,
  exportThemeCode,
  importThemeCode,
} from '../data/themes';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialPreferences?: Partial<ThemePreferences>;
  onPreferencesChange?: (prefs: ThemePreferences) => void;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialPreferences,
  onPreferencesChange,
}) => {
  const [preferences, setPreferences] = useState<ThemePreferences>(() => {
    const saved = loadSavedThemePreferences();
    return {
      ...saved,
      ...(initialPreferences || {}),
    };
  });

  const [activeGameTheme, setActiveGameTheme] = useState<ThemeId | null>(null);

  // Effective theme ID taking into account live game adaptive override
  const effectiveThemeId = useMemo(() => {
    if (preferences.adaptive.gameAdaptiveSync && activeGameTheme) {
      return activeGameTheme;
    }
    return preferences.themeId;
  }, [preferences.adaptive.gameAdaptiveSync, activeGameTheme, preferences.themeId]);

  // Apply CSS variables and dataset attributes to DOM whenever preferences or effective theme update
  useEffect(() => {
    const effectivePrefs: ThemePreferences = {
      ...preferences,
      themeId: effectiveThemeId,
    };
    applyThemeToDom(effectivePrefs);
    saveStoredThemePreferences(preferences);
    onPreferencesChange?.(preferences);
  }, [preferences, effectiveThemeId, onPreferencesChange]);

  const currentTheme: AppTheme = useMemo(() => {
    const found = THEME_CATALOG.find((t) => t.id === effectiveThemeId);
    if (!found) return THEME_CATALOG[0];

    if (found.id === 'custom') {
      return {
        ...found,
        colors: {
          ...found.colors,
          primary: preferences.customPrimary || found.colors.primary,
          secondary: preferences.customSecondary || found.colors.secondary,
        },
      };
    }

    return found;
  }, [effectiveThemeId, preferences.customPrimary, preferences.customSecondary]);

  const setThemeId = useCallback((id: ThemeId) => {
    setPreferences((prev) => ({ ...prev, themeId: id }));
  }, []);

  const setBackgroundMode = useCallback((mode: BackgroundMode) => {
    setPreferences((prev) => ({ ...prev, backgroundMode: mode }));
  }, []);

  const setCanvasTexture = useCallback((texture: CanvasTexture) => {
    setPreferences((prev) => ({ ...prev, canvasTexture: texture }));
  }, []);

  const setGlowIntensity = useCallback((intensity: GlowIntensity) => {
    setPreferences((prev) => ({ ...prev, glowIntensity: intensity }));
  }, []);

  const setCustomColors = useCallback((colors: { primary?: string; secondary?: string }) => {
    setPreferences((prev) => ({
      ...prev,
      themeId: 'custom',
      customPrimary: colors.primary ?? prev.customPrimary,
      customSecondary: colors.secondary ?? prev.customSecondary,
    }));
  }, []);

  const updateGamerProfile = useCallback((profile: Partial<GamerProfile>) => {
    setPreferences((prev) => ({
      ...prev,
      gamerProfile: {
        ...prev.gamerProfile,
        ...profile,
      },
    }));
  }, []);

  const updateAdaptiveSettings = useCallback((adaptive: Partial<AdaptivePreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      adaptive: {
        ...prev.adaptive,
        ...adaptive,
      },
    }));
  }, []);

  const saveCurrentAsPreset = useCallback((name: string): CustomThemePreset => {
    const newPreset: CustomThemePreset = {
      id: `preset_${Date.now()}`,
      name: name.trim() || 'Custom Preset',
      primary: currentTheme.colors.primary,
      secondary: currentTheme.colors.secondary,
      backgroundMode: preferences.backgroundMode,
      canvasTexture: preferences.canvasTexture,
      glowIntensity: preferences.glowIntensity,
      createdAt: Date.now(),
    };

    setPreferences((prev) => ({
      ...prev,
      savedPresets: [newPreset, ...prev.savedPresets],
    }));

    return newPreset;
  }, [currentTheme.colors, preferences.backgroundMode, preferences.canvasTexture, preferences.glowIntensity]);

  const loadPreset = useCallback((presetId: string): boolean => {
    const target = preferences.savedPresets.find((p) => p.id === presetId);
    if (!target) return false;

    setPreferences((prev) => ({
      ...prev,
      themeId: 'custom',
      customPrimary: target.primary,
      customSecondary: target.secondary,
      backgroundMode: target.backgroundMode,
      canvasTexture: target.canvasTexture,
      glowIntensity: target.glowIntensity,
    }));
    return true;
  }, [preferences.savedPresets]);

  const deletePreset = useCallback((presetId: string) => {
    setPreferences((prev) => ({
      ...prev,
      savedPresets: prev.savedPresets.filter((p) => p.id !== presetId),
    }));
  }, []);

  const handleExportThemeCode = useCallback((): string => {
    return exportThemeCode(preferences);
  }, [preferences]);

  const handleImportThemeCode = useCallback((code: string): boolean => {
    const imported = importThemeCode(code);
    if (!imported) return false;

    setPreferences((prev) => ({
      ...prev,
      ...(imported.themeId ? { themeId: imported.themeId } : {}),
      ...(imported.backgroundMode ? { backgroundMode: imported.backgroundMode } : {}),
      ...(imported.canvasTexture ? { canvasTexture: imported.canvasTexture } : {}),
      ...(imported.glowIntensity ? { glowIntensity: imported.glowIntensity } : {}),
      ...(imported.customPrimary ? { customPrimary: imported.customPrimary } : {}),
      ...(imported.customSecondary ? { customSecondary: imported.customSecondary } : {}),
      ...(imported.gamerProfile ? { gamerProfile: { ...prev.gamerProfile, ...imported.gamerProfile } } : {}),
    }));
    return true;
  }, []);

  // Adaptive triggers
  const triggerGameAdaptiveCheck = useCallback((gameTitle?: string | null): ThemeId | null => {
    if (!preferences.adaptive.gameAdaptiveSync || !gameTitle) {
      setActiveGameTheme(null);
      return null;
    }

    // Check specific user overrides first
    const overrides = preferences.adaptive.gameOverrides || {};
    if (overrides[gameTitle]) {
      const match = overrides[gameTitle];
      setActiveGameTheme(match);
      return match;
    }

    const detected = detectThemeForGame(gameTitle);
    setActiveGameTheme(detected);
    return detected;
  }, [preferences.adaptive.gameAdaptiveSync, preferences.adaptive.gameOverrides]);

  const triggerGpuBrandMatch = useCallback((gpuName?: string | null): ThemeId | null => {
    const detected = detectThemeForGpu(gpuName);
    if (detected) {
      setThemeId(detected);
    }
    return detected;
  }, [setThemeId]);

  const triggerPersonalitySync = useCallback((personality: string): ThemeId => {
    const targetTheme = themeForPersonality(personality);
    if (preferences.adaptive.personalitySync) {
      setThemeId(targetTheme);
    }
    return targetTheme;
  }, [preferences.adaptive.personalitySync, setThemeId]);

  const resetToDefault = useCallback(() => {
    setPreferences(DEFAULT_THEME_PREFERENCES);
    setActiveGameTheme(null);
  }, []);

  const contextValue: ThemeContextType = useMemo(
    () => ({
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
      exportThemeCode: handleExportThemeCode,
      importThemeCode: handleImportThemeCode,
      triggerGameAdaptiveCheck,
      triggerGpuBrandMatch,
      triggerPersonalitySync,
      resetToDefault,
      availableThemes: THEME_CATALOG,
      factions: FACTION_CONFIGS,
    }),
    [
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
      handleExportThemeCode,
      handleImportThemeCode,
      triggerGameAdaptiveCheck,
      triggerGpuBrandMatch,
      triggerPersonalitySync,
      resetToDefault,
    ]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
