import { PRESET_DETAILS } from '../data/settingsConstants';
import type { PresetDetail } from '../data/settingsConstants';

export const getRecommendedPreset = (
  features: string[] = [],
  genre: string = '',
  gpuInfo: string | Record<string, any> = '',
  _gameName: string = ''
): PresetDetail => {
  const g = genre.toLowerCase();
  const upperFeatures = (features || []).map(f => String(f).toUpperCase());

  // 1. Detect GPU Architecture (GTX vs RTX, Generation & Tier)
  let isAdvancedGpu = false;
  let isHighEndRtx = false;
  let is40SeriesOrNewer = false;

  if (typeof gpuInfo === 'object' && gpuInfo !== null) {
    isAdvancedGpu = gpuInfo.is_rtx ?? false;
    isHighEndRtx = isAdvancedGpu && (gpuInfo.tier === 'high');
    is40SeriesOrNewer = isAdvancedGpu && (gpuInfo.generation_number >= 40 || gpuInfo.architecture === 'Ada Lovelace' || gpuInfo.architecture === 'Blackwell' || (gpuInfo.architecture && !['Turing', 'Ampere'].includes(gpuInfo.architecture)));
  } else {
    const name = String(gpuInfo).toLowerCase();
    isAdvancedGpu = name.includes('rtx') || name.includes('quadro rtx') || name.includes('tesla') || name.includes('titan rtx');

    const rtxMatch = name.match(/rtx\s+(\d{4})/);
    if (rtxMatch) {
      const modelNum = parseInt(rtxMatch[1], 10);
      const series = Math.floor(modelNum / 100);
      const tier = modelNum % 100;
      if (tier >= 70) isHighEndRtx = true;
      if (series >= 40) is40SeriesOrNewer = true;
    } else {
      isHighEndRtx = name.includes('5090') || name.includes('5080') || name.includes('5070') || name.includes('4090') || name.includes('4080') || name.includes('4070') || name.includes('3090') || name.includes('3080') || name.includes('4070 ti') || name.includes('3080 ti') || name.includes('super');
      is40SeriesOrNewer = (name.includes('40') || name.includes('50') || name.includes('60') || name.includes('70')) && isAdvancedGpu;
    }
  }

  // 2. Evaluate Scanned Library Features
  const hasDLSS = upperFeatures.some(f => f.includes('DLSS'));
  const hasFG = upperFeatures.some(f => f.includes('FRAME_GEN') || f.includes('FRAME GEN') || f.includes('FG'));
  const hasRT = upperFeatures.some(f => f.includes('RAY_TRACING') || f.includes('RAY TRACING') || f.includes('PATH_TRACING') || f.includes('PATH TRACING') || f.includes('RTX'));
  const hasReflex = upperFeatures.some(f => f.includes('REFLEX'));
  const hasRtxTech = hasDLSS || hasFG || hasRT;

  // 3. Non-RTX Games OR GTX Hardware Architecture Logic
  if (!isAdvancedGpu || !hasRtxTech) {
    // For competitive FPS / Esports / Reflex games -> Esports Latency
    if (g.includes('shooter') || g.includes('esport') || g.includes('fight') || g.includes('multiplayer') || g.includes('competitive') || g.includes('fps') || hasReflex) {
      return PRESET_DETAILS.find(p => p.key === 'latency') || PRESET_DETAILS[4];
    }
    // For non-RTX RPG, Racing, Action, and Standard games -> Standard Direct Rendering
    return PRESET_DETAILS.find(p => p.key === 'off') || PRESET_DETAILS[5];
  }

  // 4. RTX Hardware & Scanned Feature Matrix Decision Engine (Games WITH DLSS / FG / Ray Tracing)
  if (g.includes('shooter') || g.includes('esport') || g.includes('fight') || g.includes('multiplayer') || g.includes('competitive') || g.includes('fps')) {
    return PRESET_DETAILS.find(p => p.key === 'latency') || PRESET_DETAILS[4];
  }

  if (hasRT && isHighEndRtx) {
    return PRESET_DETAILS.find(p => p.key === 'quality') || PRESET_DETAILS[1];
  }

  if (hasFG && is40SeriesOrNewer) {
    return PRESET_DETAILS.find(p => p.key === 'performance') || PRESET_DETAILS[2];
  }

  if (hasDLSS) {
    return PRESET_DETAILS.find(p => p.key === 'balanced') || PRESET_DETAILS[3];
  }

  if (g.includes('rpg') || g.includes('adventure') || g.includes('story') || g.includes('open world')) {
    return PRESET_DETAILS.find(p => p.key === 'quality') || PRESET_DETAILS[1];
  }

  return PRESET_DETAILS.find(p => p.key === 'balanced') || PRESET_DETAILS[3];
};
