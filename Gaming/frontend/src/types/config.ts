/**
 * Strongly-typed application configuration.
 * Replaces the `config?: any` field in TelemetryState.
 */
export interface AppConfig {
  game_mode?: string;

  privacy?: {
    enabled?: boolean;
    uuid_lock?: boolean;
    secure_sandbox?: boolean;
    key_rotation?: boolean;
  };

  overlay?: {
    x?: number;
    y?: number;
    agent_x?: number;
    agent_y?: number;
    lock_position?: boolean;
    lock_agent?: boolean;
    agent_compact?: boolean;
    font_size?: number;
    /** HUD position preset e.g. 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' */
    layout?: string;
    /** Visual style preset e.g. 'standard' | 'compact' | 'minimal' */
    layout_style?: string;
    show_search_hud?: boolean;
    show_preview?: boolean;
    show_fps?: boolean;
    show_scene_type?: boolean;
    show_gpu_stats?: boolean;
    show_input_device?: boolean;
    show_nvidia_tips?: boolean;
    text_color?: [number, number, number];
    alert_color?: [number, number, number];
    auto_spawn?: boolean;
    skip_admin_prompt?: boolean;
  };

  capture?: {
    region?: null | [number, number, number, number];
    backend?: string;
    fps_cap_limit?: number;
    cap_fps?: boolean;
    device_index?: number;
    output_index?: number;
  };

  vision?: {
    detector?: string;
    yolo_model?: string;
    scene_detection?: Record<string, unknown>;
    ocr?: {
      enabled?: boolean;
      run_every_n_frames?: number;
    };
  };

  memory?: {
    enabled?: boolean;
    save_path?: string;
  };

  agentic?: {
    confirmation_delay?: number;
  };

  pipeline?: {
    vision_hz?: number;
    brain_hz?: number;
    vlm_hz?: number;
    enable_threading?: boolean;
  };

  hotkeys?: {
    toggle_hud?: string;
    toggle_agentic?: string;
    toggle_mic?: string;
    inc_font?: string;
    dec_font?: string;
  };

  debug?: {
    log_child_processes?: boolean;
  };

  nvidia?: {
    gpu_monitoring?: {
      enabled?: boolean;
      device_index?: number;
      poll_interval?: number;
    };
    performance_advisor?: {
      enabled?: boolean;
    };
  };

  voice?: Record<string, unknown>;
  input?: Record<string, unknown>;
  auto_optimize_on_detect?: boolean;
  instance_lock_path?: string;
  headless?: boolean;
  ai_agent?: any;
}
