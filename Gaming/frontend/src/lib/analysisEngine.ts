/**
 * analysisEngine.ts
 *
 * Pure, framework-agnostic analysis layer.  No React, no side effects.
 * Call analyzeAll(state) with a TelemetryState snapshot to receive a fully
 * typed AnalysisResult containing status flags, load states, bottleneck
 * detection, and an overall health score.
 *
 * Design goals:
 *  - All status values are enums (no magic strings in the UI).
 *  - Missing / zero sensors return Unknown/Unavailable rather than throwing.
 *  - Extensible: add new sub-analyzers without touching existing ones.
 */

import type { TelemetryState } from '../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const ThermalState = {
  Normal:   'Normal',
  Warning:  'Warning',
  Critical: 'Critical',
  Unknown:  'Unknown',
} as const;
export type ThermalState = typeof ThermalState[keyof typeof ThermalState];

export const LoadState = {
  Idle:     'Idle',
  Light:    'Light',
  Moderate: 'Moderate',
  Heavy:    'Heavy',
  Max:      'Max',
  Unknown:  'Unknown',
} as const;
export type LoadState = typeof LoadState[keyof typeof LoadState];

export const VramState = {
  Normal:   'Normal',
  High:     'High',
  Critical: 'Critical',
  Unknown:  'Unknown',
} as const;
export type VramState = typeof VramState[keyof typeof VramState];

export const MemoryState = {
  Normal:   'Normal',
  Warning:  'Warning',
  Critical: 'Critical',
  Unknown:  'Unknown',
} as const;
export type MemoryState = typeof MemoryState[keyof typeof MemoryState];

export const PerformanceMode = {
  Balanced:      'Balanced',
  CpuBottleneck: 'CPU Bottleneck',
  GpuBottleneck: 'GPU Bottleneck',
  Idle:          'Idle',
  Unknown:       'Unknown',
} as const;
export type PerformanceMode = typeof PerformanceMode[keyof typeof PerformanceMode];

export const HealthGrade = {
  Excellent: 'Excellent',
  Good:      'Good',
  Fair:      'Fair',
  Poor:      'Poor',
  Critical:  'Critical',
} as const;
export type HealthGrade = typeof HealthGrade[keyof typeof HealthGrade];


// ─────────────────────────────────────────────────────────────────────────────
// Result interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface CpuStatus {
  temperatureState:    ThermalState;
  loadState:           LoadState;
  /** Inferred from usage + clock drop + temperature heuristic */
  isThermalThrottling: boolean;
  /** Inferred: package power near TDP while utilisation is sustained high */
  isPowerLimited:      boolean;
  temperatureC:        number | null;
  usagePct:            number | null;
  powerW:              number | null;
  freqMhz:             number | null;
}

export interface GpuStatus {
  temperatureState: ThermalState;
  loadState:        LoadState;
  vramState:        VramState;
  temperatureC:     number | null;
  usagePct:         number | null;
  powerW:           number | null;
  vramUsedMb:       number | null;
  vramTotalMb:      number | null;
  vramPct:          number | null;
}

export interface MemoryStatus {
  state:   MemoryState;
  usedGb:  number | null;
  totalGb: number | null;
  usedPct: number | null;
}

export interface PerformanceStatus {
  mode:        PerformanceMode;
  healthScore: number;       // 0–100
  healthGrade: HealthGrade;
}

export interface AnalysisResult {
  cpu:         CpuStatus;
  gpu:         GpuStatus;
  memory:      MemoryStatus;
  performance: PerformanceStatus;
  timestamp:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns null when a value is absent, zero, or non-finite. */
function safe(v: number | undefined | null): number | null {
  if (v == null || !isFinite(v) || v === 0) return null;
  return v;
}

/** Converts a value to a percentage (0–100) given a total, or null. */
function pct(used: number | null, total: number | null): number | null {
  if (used == null || total == null || total === 0) return null;
  return Math.min(100, (used / total) * 100);
}

function classifyThermalCPU(tempC: number | null): ThermalState {
  if (tempC == null) return ThermalState.Unknown;
  if (tempC >= 85)   return ThermalState.Critical;
  if (tempC >= 75)   return ThermalState.Warning;
  return ThermalState.Normal;
}

function classifyThermalGPU(tempC: number | null): ThermalState {
  if (tempC == null) return ThermalState.Unknown;
  if (tempC >= 88)   return ThermalState.Critical;
  if (tempC >= 80)   return ThermalState.Warning;
  return ThermalState.Normal;
}

function classifyLoad(usagePct: number | null): LoadState {
  if (usagePct == null) return LoadState.Unknown;
  if (usagePct >= 85)  return LoadState.Max;
  if (usagePct >= 65)  return LoadState.Heavy;
  if (usagePct >= 40)  return LoadState.Moderate;
  if (usagePct >= 20)  return LoadState.Light;
  return LoadState.Idle;
}

function classifyVram(usedPct: number | null): VramState {
  if (usedPct == null) return VramState.Unknown;
  if (usedPct >= 95)   return VramState.Critical;
  if (usedPct >= 85)   return VramState.High;
  return VramState.Normal;
}

function classifyMemory(usedPct: number | null): MemoryState {
  if (usedPct == null) return MemoryState.Unknown;
  if (usedPct >= 95)   return MemoryState.Critical;
  if (usedPct >= 85)   return MemoryState.Warning;
  return MemoryState.Normal;
}

/** Session-max tracker used for boost-clock inference. */
const sessionMaxCpuFreq = { value: 0 };

// ─────────────────────────────────────────────────────────────────────────────
// Sub-analyzers
// ─────────────────────────────────────────────────────────────────────────────

function analyzeCPU(state: TelemetryState): CpuStatus {
  const tempC  = safe(state.cpu_temp);
  const usageP = state.cpu_pct != null ? state.cpu_pct : null;
  const powerW = safe(state.cpu_power_w);
  const freqMhz = safe(state.cpu_freq);

  // Track session max freq so we can infer clock depression
  if (freqMhz != null && freqMhz > sessionMaxCpuFreq.value) {
    sessionMaxCpuFreq.value = freqMhz;
  }

  const temperatureState = classifyThermalCPU(tempC);
  const loadState        = classifyLoad(usageP);

  // ── Throttle inference (no hardware flag available) ──────────────────────
  // Fire when: usage is very high, AND clock has dropped significantly below
  // the session-best frequency, AND temperature is in the critical zone.
  let isThermalThrottling = false;
  if (
    usageP != null && usageP > 90 &&
    tempC  != null && tempC  > 90 &&
    freqMhz != null && sessionMaxCpuFreq.value > 0 &&
    freqMhz < sessionMaxCpuFreq.value * 0.80
  ) {
    isThermalThrottling = true;
  }

  // ── Power-limit inference ─────────────────────────────────────────────────
  // Simple heuristic: power at or above 90% of the highest wattage seen this
  // session while load is already Heavy/Max.  We track session-peak power the
  // same way we track peak frequency.
  let isPowerLimited = false;
  if (powerW != null && usageP != null && usageP >= 85) {
    // If power has plateaued (i.e., we're drawing ≥ 90% of session peak)
    // while load is max, flag it as power-limited.
    if (powerW >= sessionPeakCpuPower.value * 0.90 && sessionPeakCpuPower.value > 10) {
      isPowerLimited = true;
    }
  }
  if (powerW != null && powerW > sessionPeakCpuPower.value) {
    sessionPeakCpuPower.value = powerW;
  }

  return {
    temperatureState,
    loadState,
    isThermalThrottling,
    isPowerLimited,
    temperatureC: tempC,
    usagePct:     usageP,
    powerW,
    freqMhz,
  };
}

const sessionPeakCpuPower = { value: 0 };

function analyzeGPU(state: TelemetryState): GpuStatus {
  const gm      = state.gpu_metrics ?? {};
  const tempC   = safe(gm.temp ?? gm.temperature);
  const usageP  = safe(gm.utilization ?? gm.gpu_util);
  const powerW  = safe(gm.power_draw ?? gm.power_draw_w);
  const vramU   = safe(gm.vram_used ?? gm.vram_used_mb);
  const vramT   = safe(gm.vram_total ?? gm.vram_total_mb);
  const vramP   = safe(gm.vram_percent) ?? pct(vramU, vramT);

  return {
    temperatureState: classifyThermalGPU(tempC),
    loadState:        classifyLoad(usageP),
    vramState:        classifyVram(vramP),
    temperatureC:     tempC,
    usagePct:         usageP,
    powerW,
    vramUsedMb:       vramU,
    vramTotalMb:      vramT,
    vramPct:          vramP != null ? parseFloat(vramP.toFixed(1)) : null,
  };
}

function analyzeMemory(state: TelemetryState): MemoryStatus {
  const usedGb  = state.mem_used_gb  != null ? state.mem_used_gb  : null;
  const totalGb = state.mem_total_gb != null ? state.mem_total_gb : null;
  const usedPct = state.mem_pct      != null ? state.mem_pct      : pct(usedGb, totalGb);

  return {
    state:   classifyMemory(usedPct),
    usedGb,
    totalGb,
    usedPct,
  };
}

function analyzePerformance(
  cpu: CpuStatus,
  gpu: GpuStatus,
  memory: MemoryStatus,
): PerformanceStatus {
  // ── Bottleneck detection ─────────────────────────────────────────────────
  const cpuU = cpu.usagePct ?? 0;
  const gpuU = gpu.usagePct ?? 0;

  let mode: PerformanceMode = PerformanceMode.Unknown;

  if (cpu.usagePct == null && gpu.usagePct == null) {
    mode = PerformanceMode.Unknown;
  } else if (gpuU >= 95 && cpuU < 70) {
    mode = PerformanceMode.GpuBottleneck;
  } else if (cpuU >= 90 && gpuU < 75) {
    mode = PerformanceMode.CpuBottleneck;
  } else if (cpuU < 30 && gpuU < 30) {
    mode = PerformanceMode.Idle;
  } else {
    mode = PerformanceMode.Balanced;
  }

  // ── Health score ─────────────────────────────────────────────────────────
  let score = 100;

  // CPU temperature penalty
  switch (cpu.temperatureState) {
    case ThermalState.Warning:  score -= 10; break;
    case ThermalState.Critical: score -= 25; break;
    default: break;
  }

  // GPU temperature penalty
  switch (gpu.temperatureState) {
    case ThermalState.Warning:  score -= 10; break;
    case ThermalState.Critical: score -= 25; break;
    default: break;
  }

  // RAM usage penalty
  switch (memory.state) {
    case MemoryState.Warning:  score -= 8;  break;
    case MemoryState.Critical: score -= 20; break;
    default: break;
  }

  // VRAM usage penalty
  switch (gpu.vramState) {
    case VramState.High:     score -= 7;  break;
    case VramState.Critical: score -= 18; break;
    default: break;
  }

  // Behavioural penalties
  if (cpu.isThermalThrottling) score -= 15;
  if (cpu.isPowerLimited)      score -= 10;

  score = Math.max(0, Math.min(100, score));

  // ── Health grade ─────────────────────────────────────────────────────────
  let healthGrade: HealthGrade;
  if      (score >= 90) healthGrade = HealthGrade.Excellent;
  else if (score >= 75) healthGrade = HealthGrade.Good;
  else if (score >= 55) healthGrade = HealthGrade.Fair;
  else if (score >= 30) healthGrade = HealthGrade.Poor;
  else                  healthGrade = HealthGrade.Critical;

  return { mode, healthScore: score, healthGrade };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Fallback returned when state is null or when a sub-analyzer cannot run. */
export function makeEmptyAnalysis(): AnalysisResult {
  const emptyCpu: CpuStatus = {
    temperatureState:    ThermalState.Unknown,
    loadState:           LoadState.Unknown,
    isThermalThrottling: false,
    isPowerLimited:      false,
    temperatureC:        null,
    usagePct:            null,
    powerW:              null,
    freqMhz:             null,
  };
  const emptyGpu: GpuStatus = {
    temperatureState: ThermalState.Unknown,
    loadState:        LoadState.Unknown,
    vramState:        VramState.Unknown,
    temperatureC:     null,
    usagePct:         null,
    powerW:           null,
    vramUsedMb:       null,
    vramTotalMb:      null,
    vramPct:          null,
  };
  const emptyMemory: MemoryStatus = {
    state:   MemoryState.Unknown,
    usedGb:  null,
    totalGb: null,
    usedPct: null,
  };
  return {
    cpu:         emptyCpu,
    gpu:         emptyGpu,
    memory:      emptyMemory,
    performance: {
      mode:        PerformanceMode.Unknown,
      healthScore: 100,
      healthGrade: HealthGrade.Excellent,
    },
    timestamp: Date.now(),
  };
}

/**
 * Run the full analysis pipeline on a TelemetryState snapshot.
 * Safe to call on every telemetry tick (~1 s).
 */
export function analyzeAll(state: TelemetryState | null): AnalysisResult {
  if (!state) return makeEmptyAnalysis();

  const cpu     = analyzeCPU(state);
  const gpu     = analyzeGPU(state);
  const memory  = analyzeMemory(state);
  const performance = analyzePerformance(cpu, gpu, memory);

  return { cpu, gpu, memory, performance, timestamp: Date.now() };
}
