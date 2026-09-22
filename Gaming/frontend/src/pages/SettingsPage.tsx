import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cpu,
  Brain,
  Target,
  Folder,
  KeyRound,
  Gamepad2,
  Search,
  Check,
  Save,
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { GpuPipelineSection } from '../components/settings/GpuPipelineSection';
import { PrivacySecuritySection } from '../components/settings/PrivacySecuritySection';
import { AiBrainSection } from '../components/settings/AiBrainSection';
import { AgentPromptsSection } from '../components/settings/AgentPromptsSection';
import { TacticalOverlaySection } from '../components/settings/TacticalOverlaySection';
import { HotkeysVoiceSection } from '../components/settings/HotkeysVoiceSection';
import { LibraryGameDiscoverySection } from '../components/settings/LibraryGameDiscoverySection';
import { ScreenCaptureSection } from '../components/settings/ScreenCaptureSection';
import { VisionIntelligenceSection } from '../components/settings/VisionIntelligenceSection';
import { AccountSettingsSection } from '../components/settings/AccountSettingsSection';
import { ControllerMapping } from '../components/ControllerMapping';
import { DlssGuideModal } from '../components/settings/DlssGuideModal';
import { SettingsSection } from '../components/settings/common/SettingsSection';
import { AI_NEURAL_BACKBONE_OPTIONS } from '../data/settingsConstants';
import { getRecommendedPreset } from '../utils/gpuPresetEngine';

export interface SettingsPageProps {
  state: any;
  sendCommand: (type: string, payload?: any) => void;
}

type CategoryId = 'gpu' | 'ai' | 'overlay' | 'library' | 'account' | 'controller';

interface CategoryTab {
  id: CategoryId;
  label: string;
  icon: React.ElementType;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'gpu', label: 'GPU & Hardware', icon: Cpu },
  { id: 'ai', label: 'AI Brain & Prompts', icon: Brain },
  { id: 'overlay', label: 'Tactical Overlay', icon: Target },
  { id: 'library', label: 'Library & Vision', icon: Folder },
  { id: 'account', label: 'Account', icon: KeyRound },
  { id: 'controller', label: 'Controller', icon: Gamepad2 },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ state, sendCommand }) => {
  const { userId } = useAuth();

  const [activeCategory, setActiveCategory] = useState<CategoryId>('gpu');
  const [searchQuery, setSearchQuery] = useState('');
  const [localConfig, setLocalConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [desktopPath, setDesktopPath] = useState('C:/Users/Default/Desktop');
  const [showDlssGuide, setShowDlssGuide] = useState(false);

  const [isAutoSave, setIsAutoSave] = useState(() => {
    return localStorage.getItem('aero_auto_save') !== 'false';
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSettingsRequestRef = useRef<number>(0);
  const settingsRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRequestRef = useRef<number>(0);
  const lastStateOverlayRef = useRef<string>('');
  const prevConfigRef = useRef<string>('');

  // Shortcut for Ctrl+F search focusing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch desktop path via Electron if available
  useEffect(() => {
    if ((window as any).electronAPI?.getDesktopPath) {
      (window as any).electronAPI.getDesktopPath().then((path: string | null) => {
        if (path) setDesktopPath(path);
      });
    }
  }, []);

  // Multi-tier persistent cache loader for scanned library games
  const getPersistedLibrary = React.useCallback((): any[] => {
    try {
      const keys = [
        `mc_cached_library_${userId || 'guest'}`,
        'mc_cached_library_guest',
      ];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('mc_cached_library_') && !keys.includes(k)) {
          keys.push(k);
        }
      }
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (_) {}
    return [];
  }, [userId]);

  // Combined library: live WebSocket bridge state preferred, falling back to persistent localStorage
  const effectiveLibrary = useMemo((): any[] => {
    const live = (state as any)?.game_library;
    if (Array.isArray(live) && live.length > 0) {
      return live;
    }
    return getPersistedLibrary();
  }, [state, getPersistedLibrary]);

  // Keep localStorage cache updated whenever live library arrives from bridge
  useEffect(() => {
    const live = (state as any)?.game_library;
    if (Array.isArray(live) && live.length > 0) {
      try {
        localStorage.setItem(`mc_cached_library_${userId || 'guest'}`, JSON.stringify(live));
        localStorage.setItem('mc_cached_library_guest', JSON.stringify(live));
      } catch (_) {}
    }
  }, [state, userId]);

  // On mount, if live game_library is missing, request get_cached_games from backend
  useEffect(() => {
    const live = (state as any)?.game_library;
    if (!live || !Array.isArray(live) || live.length === 0) {
      sendCommand('get_cached_games', { userId: userId || undefined, forceRefresh: false });
    }
  }, [sendCommand, userId]);

  // Library statistics computation
  const libraryStats = useMemo(() => {
    const library = effectiveLibrary;
    const stats = {
      hasDlss: false,
      hasFg: false,
      hasRt: false,
      hasPt: false,
      hasReflex: false,
      hasHdr: false,
      supportedDlssVersions: new Set<string>(),
      supportedFgMultipliers: new Set<string>(),
      dlssGamesCount: 0,
      fgGamesCount: 0,
      rtGamesCount: 0,
      ptGamesCount: 0,
      reflexGamesCount: 0,
      hdrGamesCount: 0,
    };

    library.forEach((g: any) => {
      if (g.type?.toUpperCase() === 'LAUNCHER' || g.genre?.toUpperCase() === 'PLATFORM') return;

      const features = (g.features || []).map((f: string) => f.toUpperCase());
      let gameHasDlss = false;
      let gameHasFg = false;
      let gameHasRt = false;
      let gameHasPt = false;
      let gameHasReflex = false;
      let gameHasHdr = false;

      if (features.some((f: string) => f.includes('DLSS'))) {
        stats.hasDlss = true;
        gameHasDlss = true;
      }
      if (features.some((f: string) => f.includes('FRAME_GEN') || f.includes('FRAME GEN') || f.includes('FG'))) {
        stats.hasFg = true;
        gameHasFg = true;
      }
      if (features.some((f: string) => f.includes('RAY_TRACING') || f.includes('RAY TRACING') || f.includes('RT') || f.includes('RTX'))) {
        stats.hasRt = true;
        gameHasRt = true;
      }
      if (features.some((f: string) => f.includes('PATH_TRACING') || f.includes('PATH TRACING') || f.includes('PT'))) {
        stats.hasPt = true;
        gameHasPt = true;
      }
      if (features.some((f: string) => f.includes('REFLEX'))) {
        stats.hasReflex = true;
        gameHasReflex = true;
      }
      if (features.some((f: string) => f.includes('HDR'))) {
        stats.hasHdr = true;
        gameHasHdr = true;
      }

      if (gameHasDlss) stats.dlssGamesCount++;
      if (gameHasFg) stats.fgGamesCount++;
      if (gameHasRt) stats.rtGamesCount++;
      if (gameHasPt) stats.ptGamesCount++;
      if (gameHasReflex) stats.reflexGamesCount++;
      if (gameHasHdr) stats.hdrGamesCount++;

      features.forEach((f: string) => {
        if (f.includes('DLSS 4.5')) stats.supportedDlssVersions.add('DLSS 4.5');
        else if (f.includes('DLSS 4')) stats.supportedDlssVersions.add('DLSS 4');
        else if (f.includes('DLSS 3.5')) stats.supportedDlssVersions.add('DLSS 3.5');
        else if (f.includes('DLSS 3')) stats.supportedDlssVersions.add('DLSS 3');
        else if (f.includes('DLSS 2')) stats.supportedDlssVersions.add('DLSS 2');
        else if (f.includes('DLSS 1')) stats.supportedDlssVersions.add('DLSS 1');

        if (f.includes('4X')) stats.supportedFgMultipliers.add('4x');
        else if (f.includes('3X')) stats.supportedFgMultipliers.add('3x');
        else if (f.includes('2X')) stats.supportedFgMultipliers.add('2x');
      });
    });

    return stats;
  }, [effectiveLibrary]);

  // Neural backbone dynamic options
  const dynamicNeuralOptions = useMemo(() => {
    const provider = localConfig?.ai_agent?.provider || 'nvidia';
    let options = AI_NEURAL_BACKBONE_OPTIONS;

    if (provider === 'auto') {
      options = [
        { value: 'auto', label: '⚡ Auto Selected · Dynamic Failover & Balancing', group: 'Auto Routing', isMono: true },
      ];
    } else if (provider === 'gemini') {
      options = [
        { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash · Frontier Multimodal', group: 'Google GenAI', isMono: true },
        { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash · Hybrid Reasoning', group: 'Google GenAI', isMono: true },
        { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash · Fast Dialogue', group: 'Google GenAI', isMono: true },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', group: 'Google GenAI', isMono: true },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', group: 'Google GenAI', isMono: true },
        { value: 'gemini-flash-latest', label: 'Gemini Flash (Latest Stable)', group: 'Google GenAI', isMono: true },
      ];
    } else if (provider === 'groq') {
      options = [
        { value: 'gpt-oss-120b', label: 'GPT OSS 120B · Groq (Free)', group: 'Groq Cloud', isMono: true },
        { value: 'qwen-3.6-27b', label: 'Qwen 3.6 27B · Groq (Free)', group: 'Groq Cloud', isMono: true },
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B · Groq (Free)', group: 'Groq Cloud', isMono: true },
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B · Groq (Free)', group: 'Groq Cloud', isMono: true },
        { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B · Groq (Free)', group: 'Groq Cloud', isMono: true },
      ];
    } else if (provider === 'openrouter') {
      options = [
        { value: 'openrouter/free', label: 'OpenRouter Free Auto · OpenRouter (Free)', group: 'OpenRouter Free', isMono: true },
        { value: 'nvidia/nemotron-3-ultra:free', label: 'Nemotron 3 Ultra · OpenRouter (Free)', group: 'OpenRouter Free', isMono: true },
        { value: 'deepseek/deepseek-chat:free', label: 'DeepSeek V3 · OpenRouter (Free)', group: 'OpenRouter Free', isMono: true },
        { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B · OpenRouter (Free)', group: 'OpenRouter Free', isMono: true },
        { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash · OpenRouter (Free)', group: 'OpenRouter Free', isMono: true },
      ];
    }

    return options;
  }, [localConfig?.ai_agent?.provider]);

  // Keep model_id synchronized with available options
  useEffect(() => {
    if (!localConfig?.ai_agent) return;
    const currentModel = localConfig.ai_agent?.model_id;
    if (currentModel && !dynamicNeuralOptions.some((opt) => opt.value === currentModel)) {
      setLocalConfig((prev: any) => {
        if (!prev || !prev.ai_agent) return prev;
        return {
          ...prev,
          ai_agent: {
            ...prev.ai_agent,
            model_id: dynamicNeuralOptions[0]?.value || 'meta/llama-3.2-11b-vision-instruct',
          },
        };
      });
    }
  }, [dynamicNeuralOptions, localConfig?.ai_agent?.model_id]);

  // Dynamically compile recommended target games purely from the user's active library
  const dynamicTargetGames = useMemo(() => {
    const library = effectiveLibrary;
    const mapping = {
      competitive: [] as string[],
      story: [] as string[],
      hybrid: [] as string[],
      agent: [] as string[],
    };

    const getModeFromGenre = (genreStr: string): string => {
      const g = genreStr.toUpperCase();
      if (
        g.includes('FPS') ||
        g.includes('ACTION') ||
        g.includes('MOBA') ||
        g.includes('SPORTS') ||
        g.includes('RACING') ||
        g.includes('SHOOTER') ||
        g.includes('FIGHTING')
      ) {
        return 'competitive';
      }
      if (
        g.includes('RPG') ||
        g.includes('ADVENTURE') ||
        g.includes('OPEN WORLD') ||
        g.includes('STORY') ||
        g.includes('NARRATIVE') ||
        g.includes('SOULS')
      ) {
        return 'story';
      }
      if (
        g.includes('STRATEGY') ||
        g.includes('SIMULATION') ||
        g.includes('PLATFORM') ||
        g.includes('CASUAL') ||
        g.includes('PUZZLE') ||
        g.includes('CO-OP')
      ) {
        return 'hybrid';
      }
      return 'hybrid';
    };

    library.forEach((game: any) => {
      const isLauncher = game.type?.toUpperCase() === 'LAUNCHER' || game.genre?.toUpperCase() === 'PLATFORM';
      if (isLauncher) return;

      const genre = game.genre || '';
      const mode = getModeFromGenre(genre);
      const tags = (game.tags || []).map((t: string) => t.toUpperCase());
      let finalMode = mode;

      if (tags.includes('ESPORTS') || tags.includes('MULTIPLAYER')) finalMode = 'competitive';
      if (tags.includes('SINGLEPLAYER') || tags.includes('STORY RICH')) finalMode = 'story';

      if (finalMode === 'competitive' && !mapping.competitive.includes(game.name)) {
        mapping.competitive.push(game.name);
      } else if (finalMode === 'story' && !mapping.story.includes(game.name)) {
        mapping.story.push(game.name);
      } else if (finalMode === 'hybrid' && !mapping.hybrid.includes(game.name)) {
        mapping.hybrid.push(game.name);
      }

      if (game.features?.length > 0 || tags.includes('SYSTEM') || tags.includes('AI SUPPORT')) {
        if (!mapping.agent.includes(game.name)) {
          mapping.agent.push(game.name);
        }
      }
    });

    if (mapping.competitive.length === 0) mapping.competitive = ['Hint: Auto-detects FPS, Esports, MOBA'];
    if (mapping.story.length === 0) mapping.story = ['Hint: Auto-detects RPG, Story-Rich, Open World'];
    if (mapping.hybrid.length === 0) mapping.hybrid = ['Hint: Auto-detects Strategy, Sim, Co-op'];
    if (mapping.agent.length === 0) mapping.agent = ['Hint: Auto-detects AI Support, System Scripts'];

    return mapping;
  }, [effectiveLibrary]);

  const isCapableGpu = useMemo(() => {
    const gpuName = (state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '').toLowerCase();
    const driverVersion = state?.gpu_metrics?.driver_version;
    const hasDriver = driverVersion && driverVersion !== 'Unknown' && driverVersion !== '---';
    const hasKnownGpuName =
      gpuName &&
      (gpuName.includes('nvidia') ||
        gpuName.includes('geforce') ||
        gpuName.includes('rtx') ||
        gpuName.includes('gtx') ||
        gpuName.includes('amd') ||
        gpuName.includes('radeon') ||
        gpuName.includes('rx ') ||
        gpuName.includes('intel') ||
        gpuName.includes('arc'));

    if (
      !state?.system_specs?.hardware?.gpu &&
      !state?.gpu_metrics?.gpu_name &&
      (!driverVersion || driverVersion === 'Unknown' || driverVersion === '---')
    ) {
      return true;
    }

    return hasKnownGpuName || hasDriver;
  }, [state]);

  const isAdvancedGpu = useMemo(() => {
    if (!isCapableGpu) return false;
    const gpuName = (state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '').toLowerCase();
    if (!state?.system_specs?.hardware?.gpu && !state?.gpu_metrics?.gpu_name) return true;

    return (
      gpuName.includes('rtx') ||
      gpuName.includes('quadro rtx') ||
      gpuName.includes('tesla') ||
      gpuName.includes('titan rtx') ||
      gpuName.includes('rx ') ||
      gpuName.includes('arc') ||
      gpuName.includes('radeon')
    );
  }, [state, isCapableGpu]);

  // Load config with debouncing to prevent request spam
  useEffect(() => {
    const hasConfig = state?.config !== undefined;
    if (hasConfig) {
      setConfigLoaded(true);
      if (settingsRequestTimeoutRef.current) {
        clearTimeout(settingsRequestTimeoutRef.current);
        settingsRequestTimeoutRef.current = null;
      }
    } else if (!configLoaded) {
      const now = Date.now();
      if (now - lastSettingsRequestRef.current > 500) {
        lastSettingsRequestRef.current = now;
        sendCommand('get_settings', { userId });
      }

      if (!settingsRequestTimeoutRef.current) {
        settingsRequestTimeoutRef.current = setTimeout(() => {
          settingsRequestTimeoutRef.current = null;
          if (!state?.config && Date.now() - lastSettingsRequestRef.current > 500) {
            lastSettingsRequestRef.current = Date.now();
            sendCommand('get_settings', { userId });
          }
        }, 1000);
      }
    }

    return () => {
      if (settingsRequestTimeoutRef.current) {
        clearTimeout(settingsRequestTimeoutRef.current);
        settingsRequestTimeoutRef.current = null;
      }
    };
  }, [state?.config, configLoaded, sendCommand, userId]);

  // Populate localConfig when bridge config arrives
  useEffect(() => {
    if (state?.config && !localConfig) {
      const tuning = state.config.gpu_tuning || state.config.nvidia || {};
      setLocalConfig({
        ...state.config,
        gpu_tuning: tuning,
        nvidia: tuning,
      });
    }
  }, [state?.config, localConfig]);

  // Re-sync configuration whenever the authenticated user changes
  useEffect(() => {
    if (state?.config && userId) {
      const tuning = state.config.gpu_tuning || state.config.nvidia || {};
      setLocalConfig({
        ...state.config,
        gpu_tuning: tuning,
        nvidia: tuning,
      });
    }
  }, [userId]);

  // Sync overlay configuration from state
  useEffect(() => {
    const stateOverlay = state?.config?.overlay;
    if (stateOverlay) {
      const stringified = JSON.stringify(stateOverlay);
      if (stringified !== lastStateOverlayRef.current) {
        lastStateOverlayRef.current = stringified;
        setLocalConfig((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            overlay: stateOverlay,
          };
        });
      }
    }
  }, [state?.config?.overlay]);

  // Save handler
  const handleSave = () => {
    const now = Date.now();
    if (now - lastSaveRequestRef.current < 500) {
      return;
    }
    lastSaveRequestRef.current = now;

    setIsSaving(true);
    sendCommand('save_settings', { config: localConfig, userId });
    if ((window as any).electronAPI?.saveSettings) {
      (window as any).electronAPI.saveSettings(localConfig);
    }
    setTimeout(() => setIsSaving(false), 1000);
  };

  // Auto-save toggle
  const handleAutoSaveToggle = () => {
    const newValue = !isAutoSave;
    setIsAutoSave(newValue);
    localStorage.setItem('aero_auto_save', newValue.toString());
  };

  // Auto-save effect
  useEffect(() => {
    if (!localConfig) return;
    const currentConfigStr = JSON.stringify(localConfig);

    if (prevConfigRef.current === '') {
      prevConfigRef.current = currentConfigStr;
      return;
    }

    if (currentConfigStr !== prevConfigRef.current) {
      prevConfigRef.current = currentConfigStr;

      if (isAutoSave) {
        const timer = setTimeout(() => {
          handleSave();
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [localConfig, isAutoSave]);

  // Active GPU preset logic
  const activePreset = useMemo(() => {
    const tuning = localConfig?.gpu_tuning || localConfig?.nvidia;
    if (tuning?.preset) return tuning.preset;
    const f = tuning?.gaming_features;
    if (!f) return 'custom';
    if (f.dlss && f.ray_tracing && f.path_tracing && f.reflex && f.hdr) return 'quality';
    if (f.dlss && f.frame_gen && !f.ray_tracing && f.reflex && f.hdr) return 'performance';
    if (f.dlss && !f.frame_gen && !f.ray_tracing && f.reflex && f.hdr) return 'balanced';
    if (!f.dlss && !f.frame_gen && !f.ray_tracing && f.reflex && !f.hdr) return 'latency';
    if (!f.dlss && !f.frame_gen && !f.ray_tracing && !f.path_tracing && !f.reflex && !f.hdr) return 'off';
    return 'custom';
  }, [localConfig?.gpu_tuning, localConfig?.nvidia]);

  const updateGpuTuning = (tuningUpdates: any) => {
    setLocalConfig((prev: any) => {
      if (!prev) return prev;
      const currentTuning = prev.gpu_tuning || prev.nvidia || {};
      const updatedTuning =
        typeof tuningUpdates === 'function' ? tuningUpdates(currentTuning) : { ...currentTuning, ...tuningUpdates };
      return {
        ...prev,
        gpu_tuning: updatedTuning,
        nvidia: updatedTuning,
      };
    });
  };

  const handlePresetChange = (preset: string) => {
    const currentTuning = localConfig?.gpu_tuning || localConfig?.nvidia || {};
    let updatedFeatures = { ...(currentTuning.gaming_features || {}) };
    const gpuCaps = state?.system_specs?.hardware?.gpu_capabilities;
    const gpuNameStr = state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '';

    const maxQualityDlss = gpuCaps?.max_dlss_quality || (gpuNameStr.toLowerCase().includes('50') ? 'DLSS 4.5' : 'DLSS 3.5');
    const maxPerfDlss = gpuCaps?.max_dlss_perf || (gpuNameStr.toLowerCase().includes('50') ? 'DLSS 4' : 'DLSS 3');
    const fgMultiplier = gpuCaps?.max_fg || (gpuNameStr.toLowerCase().includes('50') ? '4x' : '2x');

    if (preset === 'auto') {
      const library = effectiveLibrary;
      let bestKey = 'balanced';
      if (library.length > 0) {
        const counts: Record<string, number> = {};
        library.forEach((g: any) => {
          const rec = getRecommendedPreset(g.features || [], g.genre, gpuCaps || gpuNameStr, g.name || '');
          counts[rec.key] = (counts[rec.key] || 0) + 1;
        });

        let maxCount = -1;
        for (const [key, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count;
            bestKey = key;
          }
        }
      }

      if (bestKey === 'quality') {
        updatedFeatures = { ...updatedFeatures, dlss: true, dlss_version: maxQualityDlss, frame_gen: false, ray_tracing: true, path_tracing: true, reflex: true, hdr: true };
      } else if (bestKey === 'performance') {
        updatedFeatures = { ...updatedFeatures, dlss: true, dlss_version: maxPerfDlss, frame_gen: true, frame_gen_multiplier: fgMultiplier, ray_tracing: false, path_tracing: false, reflex: true, hdr: true };
      } else if (bestKey === 'latency') {
        updatedFeatures = { ...updatedFeatures, dlss: false, frame_gen: false, ray_tracing: false, path_tracing: false, reflex: true, hdr: false };
      } else if (bestKey === 'off') {
        updatedFeatures = { ...updatedFeatures, dlss: false, frame_gen: false, ray_tracing: false, path_tracing: false, reflex: false, hdr: false };
      } else {
        updatedFeatures = { ...updatedFeatures, dlss: true, dlss_version: maxPerfDlss, frame_gen: false, ray_tracing: false, path_tracing: false, reflex: true, hdr: true };
      }
    } else if (preset === 'quality') {
      updatedFeatures = {
        ...updatedFeatures,
        dlss: true,
        dlss_version: maxQualityDlss,
        frame_gen: false,
        ray_tracing: true,
        path_tracing: true,
        reflex: true,
        hdr: true,
      };
    } else if (preset === 'performance') {
      updatedFeatures = {
        ...updatedFeatures,
        dlss: true,
        dlss_version: maxPerfDlss,
        frame_gen: true,
        frame_gen_multiplier: fgMultiplier,
        ray_tracing: false,
        path_tracing: false,
        reflex: true,
        hdr: true,
      };
    } else if (preset === 'balanced') {
      updatedFeatures = {
        ...updatedFeatures,
        dlss: true,
        dlss_version: maxPerfDlss,
        frame_gen: false,
        ray_tracing: false,
        path_tracing: false,
        reflex: true,
        hdr: true,
      };
    } else if (preset === 'latency') {
      updatedFeatures = {
        ...updatedFeatures,
        dlss: false,
        frame_gen: false,
        ray_tracing: false,
        path_tracing: false,
        reflex: true,
        hdr: false,
      };
    } else if (preset === 'off') {
      updatedFeatures = {
        ...updatedFeatures,
        dlss: false,
        frame_gen: false,
        ray_tracing: false,
        path_tracing: false,
        reflex: false,
        hdr: false,
      };
    }

    let updatedPowerLimit = currentTuning.power_limit_percent ?? 100;
    let updatedPowerMode = currentTuning.power_management_mode ?? 'adaptive';

    const bestKey = preset === 'auto' ? (() => {
      const library = effectiveLibrary;
      let bk = 'balanced';
      if (library.length > 0) {
        const counts: Record<string, number> = {};
        library.forEach((g: any) => {
          const rec = getRecommendedPreset(g.features || [], g.genre, gpuCaps || gpuNameStr, g.name || '');
          counts[rec.key] = (counts[rec.key] || 0) + 1;
        });
        let maxCount = -1;
        for (const [key, count] of Object.entries(counts)) {
          if (count > maxCount) { maxCount = count; bk = key; }
        }
      }
      return bk;
    })() : preset;

    const targetKey = preset === 'auto' ? bestKey : preset;
    if (targetKey === 'quality' || targetKey === 'performance') {
      updatedPowerLimit = 100;
      updatedPowerMode = 'max_performance';
    } else if (targetKey === 'latency') {
      updatedPowerLimit = 95;
      updatedPowerMode = 'max_performance';
    } else if (targetKey === 'balanced') {
      updatedPowerLimit = 95;
      updatedPowerMode = 'adaptive';
    } else if (targetKey === 'off') {
      updatedPowerLimit = 80;
      updatedPowerMode = 'adaptive';
    }

    const nextTuning = {
      ...currentTuning,
      preset,
      gaming_features: updatedFeatures,
      ...(preset !== 'custom'
        ? {
            power_limit_percent: updatedPowerLimit,
            power_management_mode: updatedPowerMode,
          }
        : {}),
    };

    setLocalConfig((prev: any) => ({
      ...prev,
      gpu_tuning: nextTuning,
      nvidia: nextTuning,
    }));
  };

  // Sync auto preset when effective library changes
  useEffect(() => {
    const currentTuning = localConfig?.gpu_tuning || localConfig?.nvidia;
    if (currentTuning?.preset === 'auto' && effectiveLibrary.length > 0) {
      const library = effectiveLibrary;
      const gpuCaps = state?.system_specs?.hardware?.gpu_capabilities;
      const gpuNameStr = state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '';

      let bestKey = 'balanced';
      const counts: Record<string, number> = {};
      library.forEach((g: any) => {
        const rec = getRecommendedPreset(g.features || [], g.genre, gpuCaps || gpuNameStr, g.name || '');
        counts[rec.key] = (counts[rec.key] || 0) + 1;
      });

      let maxCount = -1;
      for (const [key, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          bestKey = key;
        }
      }

      const maxQualityDlss = gpuCaps?.max_dlss_quality || (gpuNameStr.toLowerCase().includes('50') ? 'DLSS 4.5' : 'DLSS 3.5');
      const maxPerfDlss = gpuCaps?.max_dlss_perf || (gpuNameStr.toLowerCase().includes('50') ? 'DLSS 4' : 'DLSS 3');
      const fgMultiplier = gpuCaps?.max_fg || (gpuNameStr.toLowerCase().includes('50') ? '4x' : '2x');

      let updatedFeatures = { ...(currentTuning?.gaming_features || {}) };
      if (bestKey === 'quality') {
        updatedFeatures = { ...updatedFeatures, dlss: true, dlss_version: maxQualityDlss, frame_gen: false, ray_tracing: true, path_tracing: true, reflex: true, hdr: true };
      } else if (bestKey === 'performance') {
        updatedFeatures = { ...updatedFeatures, dlss: true, dlss_version: maxPerfDlss, frame_gen: true, frame_gen_multiplier: fgMultiplier, ray_tracing: false, path_tracing: false, reflex: true, hdr: true };
      } else if (bestKey === 'latency') {
        updatedFeatures = { ...updatedFeatures, dlss: false, frame_gen: false, ray_tracing: false, path_tracing: false, reflex: true, hdr: false };
      } else if (bestKey === 'off') {
        updatedFeatures = { ...updatedFeatures, dlss: false, frame_gen: false, ray_tracing: false, path_tracing: false, reflex: false, hdr: false };
      } else {
        updatedFeatures = { ...updatedFeatures, dlss: true, dlss_version: maxPerfDlss, frame_gen: false, ray_tracing: false, path_tracing: false, reflex: true, hdr: true };
      }

      const currentFeaturesStr = JSON.stringify(currentTuning?.gaming_features || {});
      const newFeaturesStr = JSON.stringify(updatedFeatures);

      let updatedPowerLimit = currentTuning?.power_limit_percent ?? 100;
      let updatedPowerMode = currentTuning?.power_management_mode ?? 'adaptive';

      if (bestKey === 'quality' || bestKey === 'performance') {
        updatedPowerLimit = 100;
        updatedPowerMode = 'max_performance';
      } else if (bestKey === 'latency') {
        updatedPowerLimit = 95;
        updatedPowerMode = 'max_performance';
      } else if (bestKey === 'balanced') {
        updatedPowerLimit = 95;
        updatedPowerMode = 'adaptive';
      } else if (bestKey === 'off') {
        updatedPowerLimit = 80;
        updatedPowerMode = 'adaptive';
      }

      if (
        currentFeaturesStr !== newFeaturesStr ||
        currentTuning?.power_limit_percent !== updatedPowerLimit ||
        currentTuning?.power_management_mode !== updatedPowerMode
      ) {
        const nextTuning = {
          ...currentTuning,
          gaming_features: updatedFeatures,
          power_limit_percent: updatedPowerLimit,
          power_management_mode: updatedPowerMode,
        };
        const newConfig = {
          ...localConfig,
          gpu_tuning: nextTuning,
          nvidia: nextTuning,
        };
        setLocalConfig(newConfig);
        sendCommand('update_config', { nvidia: nextTuning, gpu_tuning: nextTuning });
      }
    }
  }, [effectiveLibrary, localConfig?.gpu_tuning?.preset, localConfig?.nvidia?.preset]);

  if (!localConfig) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Accessing Neural Parameters...
          </span>
        </div>
      </div>
    );
  }

  const activeGame = (state as any)?.game_info?.name || (state as any)?.pipeline?.current_game?.name;
  const activeGameInfo = activeGame ? effectiveLibrary.find((g: any) => g.name === activeGame) : null;
  const activeFeatures = activeGameInfo ? activeGameInfo.features || [] : null;

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar gap-y-12 bg-[#050505]/40">
      {/* Redesigned Premium Tech Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl border border-white/4 bg-[#0c0c12]/40 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-neon-green/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none translate-y-1/2" />

        <div className="flex items-start gap-4 sm:gap-5 relative z-10">
          <div className="relative group shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-blue-500 rounded-2xl opacity-40 blur group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/85 border border-white/10 flex items-center justify-center text-neon-green">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white drop-shadow-[0_0_12px_rgba(118,185,0,0.8)] uppercase font-sans">
                App Settings
              </h2>
            </div>
            <p className="text-[10px] sm:text-xs font-medium text-zinc-400 max-w-xl leading-relaxed">
              Configure your low-latency game optimizations, AI neural pipeline parameters, RTX/DLSS filters, overlay layouts, and security preferences.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center relative z-10 shrink-0 self-end md:self-center w-full md:w-auto">
          <div className="flex flex-col sm:flex-row items-stretch bg-[#0c0c12]/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-lg w-full sm:w-auto transition-all">
            {/* Auto-Save Toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-3 px-5 py-3 sm:py-0 border-b sm:border-b-0 sm:border-r border-white/10 bg-white/[0.02]">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
                Auto-Save
              </span>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleAutoSaveToggle()}
                onClick={handleAutoSaveToggle}
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${
                  isAutoSave
                    ? 'bg-neon-green shadow-[0_0_10px_rgba(118,185,0,0.3)]'
                    : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute transition-all bg-black top-0.5 ${
                    isAutoSave ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Save Status Indicator / Button */}
            {isAutoSave ? (
              <div className="flex-1 flex items-center justify-center gap-2.5 px-7 py-3 text-zinc-400 font-black text-[10px] uppercase tracking-widest min-w-[160px] bg-white/[0.01]">
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
                    <span className="text-neon-green">Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-neon-yellow" />
                    <span>Auto-Saved</span>
                  </>
                )}
              </div>
            ) : (
              <button
                aria-label="Save Settings"
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2.5 px-7 py-3 bg-gradient-to-r from-neon-green to-blue-600 hover:from-neon-green hover:to-blue-500 text-black font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 min-w-[160px]"
              >
                <Save className="w-3.5 h-3.5 text-black" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full z-20 mt-8 mb-4 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-neon-green transition-colors" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all settings (e.g. DLSS, Frame Gen, Voice, Hotkeys)... (Ctrl+F)"
          className="w-full bg-white/[0.04] border border-white/15 hover:border-neon-green/35 focus:border-neon-green rounded-2xl py-3.5 pl-12 pr-12 text-[11px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-neon-green/30 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.02),0_4px_20px_rgba(0,0,0,0.4)] focus:shadow-[0_0_20px_rgba(118,185,0,0.1)] backdrop-blur-md placeholder-zinc-400"
        />
        {searchQuery && (
          <button
            aria-label="Clear Search"
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-white transition-colors"
          >
            <div className="w-5 h-5 bg-white/10 hover:bg-white/15 rounded-full flex items-center justify-center text-[10px] font-bold">
              ✕
            </div>
          </button>
        )}
      </div>

      {/* Category Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5 mb-6">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id && !isSearching;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCategory(tab.id);
                if (isSearching) setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-neon-green/15 text-neon-green border-neon-green/30 shadow-[0_0_15px_rgba(118,185,0,0.15)]'
                  : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neon-green' : 'text-zinc-400'}`} />
              {tab.label}
            </button>
          );
        })}

        {isSearching && (
          <div className="ml-auto px-3 py-1 bg-neon-yellow/10 border border-neon-yellow/20 rounded-xl text-neon-yellow text-[9px] font-bold uppercase tracking-wider">
            Searching Everywhere
          </div>
        )}
      </div>

      {/* Main Settings Body */}
      <div className="space-y-16 pb-20">
        {/* 1. GPU & Hardware Pipeline */}
        {(isSearching || activeCategory === 'gpu') && (
          <GpuPipelineSection
            searchQuery={searchQuery}
            localConfig={localConfig}
            setLocalConfig={setLocalConfig}
            updateGpuTuning={updateGpuTuning}
            activePreset={activePreset}
            handlePresetChange={handlePresetChange}
            state={state}
            sendCommand={sendCommand}
            isCapableGpu={isCapableGpu}
            isAdvancedGpu={isAdvancedGpu}
            libraryStats={libraryStats}
            activeFeatures={activeFeatures}
            effectiveLibrary={effectiveLibrary}
            userId={userId}
            onShowDlssGuide={() => setShowDlssGuide(true)}
          />
        )}

        {/* 2. AI Brain & Prompts */}
        {(isSearching || activeCategory === 'ai') && (
          <>
            <PrivacySecuritySection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
              dynamicTargetGames={dynamicTargetGames}
            />
            <AiBrainSection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
              dynamicNeuralOptions={dynamicNeuralOptions}
              desktopPath={desktopPath}
            />
            <AgentPromptsSection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
            />
          </>
        )}

        {/* 3. Tactical Overlay & Hotkeys */}
        {(isSearching || activeCategory === 'overlay') && (
          <>
            <TacticalOverlaySection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
              sendCommand={sendCommand}
            />
            <HotkeysVoiceSection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
              sendCommand={sendCommand}
            />
          </>
        )}

        {/* 4. Library & Vision */}
        {(isSearching || activeCategory === 'library') && (
          <>
            <LibraryGameDiscoverySection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
              sendCommand={sendCommand}
              desktopPath={desktopPath}
            />
            <ScreenCaptureSection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
            />
            <VisionIntelligenceSection
              searchQuery={searchQuery}
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
            />
          </>
        )}

        {/* 5. Linked Account */}
        {(isSearching || activeCategory === 'account') && (
          <AccountSettingsSection
            searchQuery={searchQuery}
            localConfig={localConfig}
            sendCommand={sendCommand}
            accountDeleted={(state as any)?.account_deleted}
            accountDeleteError={(state as any)?.account_delete_error}
          />
        )}

        {/* 6. Controller & Input Mapping */}
        {(isSearching || activeCategory === 'controller') && (
          <SettingsSection
            searchQuery={searchQuery}
            title="Controller & Input Mapping"
            icon={Gamepad2}
            searchTerms="controller input mapping gamepad joystick xbox playstation button binding deadzone rumble vibration xinput directinput"
          >
            <ControllerMapping state={state} sendCommand={sendCommand} />
          </SettingsSection>
        )}
      </div>

      {/* DLSS Guide Modal */}
      <DlssGuideModal isOpen={showDlssGuide} onClose={() => setShowDlssGuide(false)} />
    </div>
  );
};

export default SettingsPage;
