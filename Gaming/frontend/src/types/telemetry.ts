import type { AppConfig } from './config';

export interface TelemetryState {
  // Game & Scene Info
  health: number;
  is_low_health: boolean;
  detections_count: number;
  detections: any[];
  scene_type: string;
  scene_confidence: number;
  dialogue_text: string;
  quest_texts: string[];
  
  // Hardware Metrics (Real-time)
  fps: number;
  capture_fps: number;
  vision_fps: number;
  /** Min average FPS recorded over the session (C++ QPC layer) */
  min_avg_fps?: number;
  /** Max average FPS recorded over the session (C++ QPC layer) */
  max_avg_fps?: number;
  /** Absolute min FPS recorded over the session (C++ QPC layer) */
  min_fps?: number;
  /** Absolute max FPS recorded over the session (C++ QPC layer) */
  max_fps?: number;
  /** 1% lows: average FPS of the slowest 1% of frames (C++ QPC layer) */
  one_percent_low?: number;
  /** Array of recent frametimes in ms */
  frametimes?: number[];
  vision_profiling?: {
    pre: number;
    inference: number;
    post: number;
  };
  cpu_pct: number;
  cpu_temp: number;
  cpu_freq: number;
  cpu_max_freq?: number;
  cpu_power_w?: number;
  mem_pct: number;
  mem_used_gb?: number;
  mem_total_gb?: number;
  ram_speed?: string;
  gpu_metrics: {
    /** GPU utilization percentage (0-100) */
    utilization?: number;
    /** @deprecated Use `utilization` */
    gpu_util?: number;
    /** GPU temperature in °C */
    temp?: number;
    /** @deprecated Use `temp` */
    temperature?: number;
    /** VRAM used in MB */
    vram_used?: number;
    /** @deprecated Use `vram_used` (MB) */
    vram_used_mb?: number;
    /** Total VRAM in MB */
    vram_total?: number;
    /** @deprecated Use `vram_total` (MB) */
    vram_total_mb?: number;
    fan_speed?: number;
    vram_percent?: number;
    /** GPU core clock in MHz */
    clock_core?: number;
    /** @deprecated Use `clock_core` */
    clock_gpu_mhz?: number;
    /** Memory clock in MHz */
    clock_mem?: number;
    /** @deprecated Use `clock_mem` */
    clock_mem_mhz?: number;
    /** Power draw in watts */
    power_draw?: number;
    /** @deprecated Use `power_draw` */
    power_draw_w?: number;
    /** Power limit in watts */
    power_limit?: number;
    /** @deprecated Use `power_limit` */
    power_limit_w?: number;
    /** Hardware TGP ceiling / chassis max power limit in watts */
    power_limit_max?: number;
    /** @deprecated Use `power_limit_max` */
    power_limit_max_w?: number;
    driver_version?: string;
    gpu_name?: string;
  };
  disk_util?: number; // Added for UI parity
  net_util?: number;  // Network scaling equivalent
  net_speed?: string; // Network throughput String e.g., '14.5 MB/s'

  // Agent State
  agent_status: "standby" | "active" | "analyzing" | "executing";
  agent_intent?: string;
  agent_action?: string;
  agent_response?: string;
  voice_prompt?: string;   // last STT transcript — populated by _handle_voice_command
  mic_active?: boolean;    // true when the push-to-toggle STT mic is actively listening
  
  // System State
  is_game_active: boolean;
  is_game_focused: boolean;
  current_game: string | null;
  game_fps?: number;
  game_loading?: boolean;
  system_specs?: SystemSpecs;
  game_minimized: boolean;
  config?: AppConfig;
  ai_analytic?: {
    reasoning_tokens: number;
    context_depth: string;
    search_active: boolean;
    mode: string;
  };
  nvidia_tip?: string;
  perf_score?: number;
  cooling_mode?: "silent" | "balanced" | "max";
  cooling_applied?: boolean;
  neural_status?: {
    tactical_latency: string;
    strategic_latency: string;
    vlm_status: string;
    model_active: string;
  };
  version?: string;
  is_frozen?: boolean;
  update_state?: any;
  update_install_state?: any;
  changelogs?: any;
  patches_sync?: any;
  annotated_frame?: string;
  suggested_session_title?: {
    id: string;
    title: string;
  };
  launch_status?: any;
  scan_state?: {
    progress: number;
    status: string;
    is_running: boolean;
  };
  chat_sessions?: {
    id: string;
    title: string;
    time: string;
    preview: string;
  }[];
  chat_history?: {
    sessionId: string;
    messages: any[];
  };
  active_chat_session_id?: string;
  session_history?: any[];

  // Preset Optimizer
  preset_optimizer?: PresetOptimizerState;

  // AI Performance Advisor
  advisor_recommendations?: AdvisorRecommendation[];
  yolo_supported?: boolean;
}


export interface AdvisorRecommendation {
  id: string;
  title: string;
  description: string;
  reason: string;
  action: string;
  severity: "Informational" | "Recommendation" | "Warning" | "Critical";
  confidence: number;
  category?: string;
}

export type PresetOptimizerStatus =
  | 'ok'
  | 'no_config_found'
  | 'no_game'
  | 'error';

export type PresetOptimizerItemStatus =
  | 'match'
  | 'mismatch'
  | 'optional_mismatch'
  | 'unknown'
  | 'not_supported';

export interface PresetOptimizerItem {
  feature: string;
  label: string;
  status: PresetOptimizerItemStatus;
  required: boolean;
  current_value: string | null;
  required_value: string;
  note: string;
  instruction: string;
  game_supports: boolean;
}

export interface PresetOptimizerState {
  game_title: string;
  preset: string;
  scan_time: number;
  status: PresetOptimizerStatus;
  match_count?: number;
  mismatch_count?: number;
  total_required?: number;
  items: PresetOptimizerItem[];
  error?: string;
}

export interface LogItem {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

export interface SystemSpecs {
  hardware: {
    cpu: string;
    cores?: number;
    threads?: number;
    gpu: string;
    gpu_capabilities?: {
      brand: 'NVIDIA' | 'AMD' | 'Intel' | 'Other';
      architecture: string;
      max_dlss_quality: 'DLSS 4.5' | 'DLSS 3.5' | 'DLSS 2' | 'None';
      max_dlss_perf: 'DLSS 4' | 'DLSS 3' | 'DLSS 2' | 'None';
      max_fg: '4x' | '2x' | 'None';
      ray_tracing: boolean;
      path_tracing: boolean;
      reflex: boolean;
      tier: 'high' | 'mid' | 'low';
      is_rtx: boolean;
    };
    ram: string;
    storage: string;
    ram_details?: {
      slot: string;
      size: string;
      type: string;
      speed: string;
      manufacturer: string;
      partNumber: string;
      voltage: string;
    }[];
    storage_details?: {
      name: string;
      type: string;
      interface: string;
      size: string;
      serialNumber: string;
      generation: string;
      formFactor: string;
      readSpeed: string;
      writeSpeed: string;
      partitions?: string;
      systemDisk?: string;
      pageFile?: string;
    }[];
  };

  network: {
    name: string;
    speed: string;
  } | null;
  wifi?: {
    ssid: string;
    signal: string;
    channel: string;
    protocol: string;
    auth: string;
    adapter: string;
  } | null;
  os_details?: {
    edition: string;
    version: string;
    architecture: string;
  };
  displays: {
    resolution: string;
    refresh: string;
    dpi?: number;
  }[];
  peripherals: {
    name: string;
    type: string;
    status: string;
  }[];
  vram_gb?: number;
}
