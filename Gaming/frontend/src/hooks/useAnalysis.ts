/**
 * useAnalysis.ts
 *
 * React hook that wraps the pure analyzeAll() function, memoising the result
 * so it only recomputes when relevant telemetry fields actually change.
 * Components should call this once at the top level and pass the result down.
 */

import { useMemo } from 'react';
import type { TelemetryState } from '../types/telemetry';
import { analyzeAll, makeEmptyAnalysis } from '../lib/analysisEngine';
import type { AnalysisResult } from '../lib/analysisEngine';

export function useAnalysis(state: TelemetryState | null): AnalysisResult {
  return useMemo(() => {
    if (!state) return makeEmptyAnalysis();
    return analyzeAll(state);
  }, [
    // CPU
    state?.cpu_pct,
    state?.cpu_temp,
    state?.cpu_power_w,
    state?.cpu_freq,
    // GPU
    state?.gpu_metrics?.utilization,
    state?.gpu_metrics?.gpu_util,
    state?.gpu_metrics?.temp,
    state?.gpu_metrics?.temperature,
    state?.gpu_metrics?.power_draw,
    state?.gpu_metrics?.power_draw_w,
    state?.gpu_metrics?.vram_used,
    state?.gpu_metrics?.vram_used_mb,
    state?.gpu_metrics?.vram_total,
    state?.gpu_metrics?.vram_total_mb,
    state?.gpu_metrics?.vram_percent,
    // Memory
    state?.mem_pct,
    state?.mem_used_gb,
    state?.mem_total_gb,
  ]);
}

export type { AnalysisResult };
