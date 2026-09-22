import React from 'react';
import {
  Brain,
  Sparkles,
  Zap,
  Cpu,
  Target,
  Shield,
  Sliders
} from 'lucide-react';

export interface OptionItem {
  value: string;
  label: string;
  group?: string;
  isMono?: boolean;
}

export const FOCUS_MODE_OPTIONS: OptionItem[] = [
  { value: 'Primary Only', label: 'Primary Only' },
  { value: 'Auto-Follow', label: 'Auto-Follow' },
  { value: 'Specific Display', label: 'Specific Display' }
];

export const CAPTURE_BACKEND_OPTIONS: OptionItem[] = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'dxgi', label: 'DXGI Desktop Duplication' },
  { value: 'bitblt', label: 'BitBlt (Legacy)' }
];

export const DETECTOR_BACKEND_OPTIONS: OptionItem[] = [
  { value: 'simple', label: 'Simple (CPU/Auto)' },
  { value: 'trt', label: 'NVIDIA TensorRT (Ultra-Fast)' },
  { value: 'cuda', label: 'PyTorch CUDA (GPU)' }
];

export const OCR_ENGINE_OPTIONS: OptionItem[] = [
  { value: 'auto', label: 'Auto-Detect' },
  { value: 'rapidocr', label: 'RapidOCR (Fast / ONNX)' },
  { value: 'tesseract', label: 'Tesseract (Legacy)' }
];

export const AI_PROVIDER_OPTIONS: OptionItem[] = [
  { value: 'auto', label: '⚡ Auto (Smart Failover & Balancing)' },
  { value: 'groq', label: '⚡ Groq (100% Free · Ultra Fast)' },
  { value: 'nvidia', label: 'NVIDIA NIM (Free Credits)' },
  { value: 'gemini', label: 'Google Gemini (100% Free)' },
  { value: 'openrouter', label: 'OpenRouter (Free Tier)' }
];

export const AI_NEURAL_BACKBONE_OPTIONS: OptionItem[] = [
  { value: 'meta/llama-3.2-11b-vision-instruct', label: 'Llama 3.2 11B Vision · High Speed', group: 'NVIDIA NIM (Free Tier)', isMono: true },
  { value: 'nvidia/nemotron-3-super-120b-a12b', label: 'Nemotron 3 Super 120B · Frontier Reasoning', group: 'NVIDIA NIM (Free Tier)', isMono: true },
  { value: 'nvidia/nemotron-3.5-lightning-30b-a3b', label: 'Nemotron 3.5 Lightning 30B · Ultra Low Latency', group: 'NVIDIA NIM (Free Tier)', isMono: true },
  { value: 'meta/llama-3.2-90b-vision-instruct', label: 'Llama 3.2 90B Vision · Flagship Vision', group: 'NVIDIA NIM (Free Tier)', isMono: true },
  { value: 'mistralai/mistral-large-2-instruct', label: 'Mistral Large 2 · High Reasoning', group: 'NVIDIA NIM (Free Tier)', isMono: true },
  { value: 'deepseek-ai/deepseek-r1', label: 'DeepSeek R1 · Reasoning Engine', group: 'NVIDIA NIM (Free Tier)', isMono: true }
];

export const MEMORY_MODE_OPTIONS: OptionItem[] = [
  { value: 'read_write', label: 'Full Sync (Read/Write)' },
  { value: 'read_only', label: 'Observer (Read Only)' }
];

export const HUD_LAYOUT_OPTIONS: OptionItem[] = [
  { value: 'top-left', label: 'Top-Left (Standard)' },
  { value: 'top-right', label: 'Top-Right' },
  { value: 'bottom-right', label: 'Bottom-Right' },
  { value: 'bottom-left', label: 'Bottom-Left' }
];

export const HUD_LAYOUT_STYLE_OPTIONS: OptionItem[] = [
  { value: 'standard', label: 'Standard (Detailed Panel)' },
  { value: 'compact', label: 'Compact (Mini Widget)' },
  { value: 'horizontal', label: 'Horizontal Banner' }
];

export const SPEECH_PROVIDER_OPTIONS: OptionItem[] = [
  { value: 'google', label: 'Aero (Cloud - Google)' },
  { value: 'elevenlabs', label: 'ElevenLabs (High-Fidelity)' },
  { value: 'edge', label: 'Microsoft Edge (Cloud - Free)' }
];

export interface DlssGuideItem {
  version: string;
  name: string;
  tech: string;
  impact: string;
}

export const DLSS_GUIDE: DlssGuideItem[] = [
  { version: "1", name: "AI Super Sampling", tech: "NVIDIA Tensor Cores + DLSS", impact: "The first step toward using AI to increase rendering performance." },
  { version: "2", name: "AI Super Resolution", tech: "Temporal feedback + deep-learning reconstruction.", impact: "Better image quality and broad game support without per-game AI models." },
  { version: "3", name: "AI Frame Generation", tech: "Optical Flow Accelerator + Tensor Cores + NVIDIA Reflex.", impact: "Higher displayed frame rates with improved latency management." },
  { version: "3.5", name: "Ray Reconstruction", tech: "Deep-learning model trained to reconstruct ray-traced images.", impact: "More detailed lighting, reflections and global illumination with temporal stability." },
  { version: "4", name: "Multi Frame Generation", tech: "Transformer models + 5th-gen Tensor Cores + Multi Frame Generation.", impact: "Up to 3 AI-generated frames per traditionally rendered frame on RTX 50 Series." },
  { version: "4.5", name: "Dynamic Multi Frame Gen", tech: "2nd-gen Transformer Super Resolution + Dynamic MFG.", impact: "Up to 5 AI-generated frames per rendered frame, enabling up to 6X frame generation." },
  { version: "5", name: "Neural Rendering", tech: "Neural rendering model integrated into the real-time graphics pipeline.", impact: "Aims to push real-time graphics closer to cinematic-level visual fidelity. Coming Fall 2026." },
];

export interface PresetDetail {
  key: string;
  title: string;
  desc: string;
  powerLimit: string;
  powerPlan: string;
  features: string[];
  icon: React.ElementType;
}

export const PRESET_DETAILS: PresetDetail[] = [
  {
    key: 'auto',
    title: 'Auto-Configure',
    desc: 'Analyzes your game library and hardware to select the optimal baseline preset.',
    powerLimit: 'Dynamic',
    powerPlan: 'Adaptive',
    features: ['Library Analytics Profiling', 'Hardware Capabilities Match', 'Auto Scaling'],
    icon: Brain
  },
  {
    key: 'quality',
    title: 'RTX Ultra Quality',
    desc: 'Full ray and path tracing visual showcase.',
    powerLimit: '100% GPU Power',
    powerPlan: 'Max Performance',
    features: ['DLSS 4.5 / 3.5 (Ray Recon)', 'Ray Tracing / Path Tracing', 'Reflex Low Latency', 'HDR Color'],
    icon: Sparkles
  },
  {
    key: 'performance',
    title: 'RTX High FPS',
    desc: 'Target maximum fluid motion via DLSS + Frame Gen.',
    powerLimit: '100% GPU Power',
    powerPlan: 'Max Performance',
    features: ['DLSS 4 / 3 (Multi Frame Gen)', 'Frame Generation (Up to 4x)', 'Reflex Low Latency', 'HDR Color'],
    icon: Zap
  },
  {
    key: 'balanced',
    title: 'RTX Balanced',
    desc: 'Optimal visual fluidity without heavy ray tracing or frame gen overhead.',
    powerLimit: '95% GPU Power',
    powerPlan: 'Balanced Mode',
    features: ['DLSS (Super Resolution)', 'Standard Ray Tracing (Off)', 'Reflex Low Latency', 'HDR Color'],
    icon: Cpu
  },
  {
    key: 'latency',
    title: 'Esports Latency',
    desc: 'Competitively optimized input response & thermals.',
    powerLimit: '95% GPU Power',
    powerPlan: 'Max Performance',
    features: ['NVIDIA Reflex Boost', 'Reduced Thermal Jitter', 'No Upscaling Overhead', 'HDR Disabled'],
    icon: Target
  },
  {
    key: 'off',
    title: 'Standard',
    desc: 'Standard game operation for non-RTX titles.',
    powerLimit: 'Dynamic',
    powerPlan: 'Balanced Mode',
    features: ['Direct Rendering', 'Balanced Thermals', 'Standard Preset'],
    icon: Shield
  },
  {
    key: 'custom',
    title: 'Custom Profile',
    desc: 'Granular manual configuration of each option below.',
    powerLimit: 'Configurable',
    powerPlan: 'Configurable',
    features: ['Manual Feature Control', 'Custom DLSS/FG/RT Scales'],
    icon: Sliders
  }
];

export const GPU_RTX_FEATURES = ['DLSS', 'FRAME_GEN', 'FRAME GEN', 'FG', 'PATH_TRACING', 'PATH TRACING', 'RAY_TRACING', 'RAY TRACING', 'RTX'];
export const GPU_NVIDIA_FEATURES = ['REFLEX', 'PHYSX'];

export interface OAuthProviderItem {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
}

export const OAUTH_PROVIDERS: OAuthProviderItem[] = [
  {
    id: 'oauth_google',
    name: 'Google',
    color: 'from-red-500/10 to-orange-500/10 border-red-500/30 hover:border-red-500/50 text-red-400 hover:bg-red-500/20',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    )
  },
  {
    id: 'oauth_discord',
    name: 'Discord',
    color: 'from-[#5865F2]/10 to-[#4752C4]/10 border-[#5865F2]/30 hover:border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/20',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.93.71-4.27 1.33a.08.08 0 0 0-.05.05C2.79 11.53 1.74 17.58 2.3 23.53a.08.08 0 0 0 .04.06c1.8 1.33 3.53 2.13 5.23 2.68a.09.09 0 0 0 .09-.03c.4-.55.77-1.13 1.11-1.74a.09.09 0 0 0-.05-.12c-.59-.22-1.16-.48-1.71-.78a.09.09 0 0 1-.01-.15c.12-.09.24-.18.35-.28a.09.09 0 0 1 .09-.01c3.48 1.59 7.23 1.59 10.67 0a.09.09 0 0 1 .09.01c.11.09.23.19.36.28a.09.09 0 0 1-.01.15c-.56.3-1.13.56-1.73.78a.09.09 0 0 0-.04.12c.34.61.71 1.19 1.11 1.74a.09.09 0 0 0 .09.03c1.7-.55 3.44-1.35 5.24-2.68a.08.08 0 0 0 .03-.06c.64-6.8-.93-12.75-2.47-18.15a.08.08 0 0 0-.05-.05ZM8.5 17.47c-1.05 0-1.92-.96-1.92-2.13 0-1.18.85-2.14 1.92-2.14s1.94.97 1.92 2.14c0 1.17-.86 2.13-1.92 2.13Zm7 0c-1.05 0-1.92-.96-1.92-2.13 0-1.18.85-2.14 1.92-2.14s1.94.97 1.92 2.14c0 1.17-.86 2.13-1.92 2.13Z" />
      </svg>
    )
  }
];

export interface ModePipelineItem {
  label: string;
  active: boolean;
}

export interface ModeIntelItem {
  tagline: string;
  latency: string;
  pipelines: ModePipelineItem[];
  games: string[];
  details: string[];
  warning?: string;
}

export const MODE_INTELLIGENCE: Record<string, ModeIntelItem> = {
  competitive: {
    tagline: "Unleash maximum frame capture rates and hyper-fast response tracking for multiplayer shooters.",
    latency: "⚡ Ultra-Low (4ms - 8ms)",
    pipelines: [
      { label: "Hardware Capture Engine", active: true },
      { label: "Performance Optimizer", active: true },
      { label: "AI OCR Dialogue Reader", active: false },
      { label: "AI Scene Classifier", active: false },
      { label: "Agentic Decision Enclave", active: false },
      { label: "VLM Vision NIM Model", active: false }
    ],
    games: ["CS2", "Valorant", "Apex Legends", "Overwatch 2", "Call of Duty"],
    details: [
      "Bypasses heavy deep-learning visual processors to maintain maximum frames-per-second.",
      "Engages system thermal warning triggers and NVIDIA latency metrics in real-time.",
      "Optimized for high-FPS, fast-movement, and competitive esport environments."
    ]
  },
  story: {
    tagline: "Immersive narrative guidance and dialogue context extraction to help you track complex quests.",
    latency: "⚖️ Balanced (25ms - 50ms)",
    pipelines: [
      { label: "Hardware Capture Engine", active: true },
      { label: "Performance Optimizer", active: true },
      { label: "AI OCR Dialogue Reader", active: true },
      { label: "AI Scene Classifier", active: true },
      { label: "Agentic Decision Enclave", active: false },
      { label: "VLM Vision NIM Model", active: false }
    ],
    games: ["Cyberpunk 2077", "Elden Ring", "The Witcher 3", "Baldur's Gate 3", "Hades II"],
    details: [
      "Actively reads dialogue subtitles and quest logs via low-latency OCR scanning.",
      "Constructs localized character context blocks automatically in the AI's short-term memory.",
      "Triggers proactive strategy advice and narrative narration clues via voice engine."
    ]
  },
  hybrid: {
    tagline: "The optimal default gameplay engine balancing tactical threat alerts with dialogue tracking.",
    latency: "⚖️ Balanced (30ms - 60ms)",
    pipelines: [
      { label: "Hardware Capture Engine", active: true },
      { label: "Performance Optimizer", active: true },
      { label: "AI OCR Dialogue Reader", active: true },
      { label: "AI Scene Classifier", active: true },
      { label: "Agentic Decision Enclave", active: true },
      { label: "VLM Vision NIM Model", active: false }
    ],
    games: ["GTA V", "Red Dead Redemption 2", "Destiny 2", "Diablo IV", "Genshin Impact"],
    details: [
      "Runs simultaneous OCR dialogue reading and tactical object tracking pipelines.",
      "Utilizes Llama 3.1 70B for balanced threat evaluation and quest tracking.",
      "Recommended for open-world RPGs, action-adventure titles, and casual co-op games."
    ]
  },
  agent: {
    tagline: "Autonomous Agentic AI that processes visual screen state and deploys user-approved key directives.",
    latency: "🧠 Heavy reasoning (150ms - 300ms)",
    pipelines: [
      { label: "Hardware Capture Engine", active: true },
      { label: "Performance Optimizer", active: true },
      { label: "AI OCR Dialogue Reader", active: true },
      { label: "AI Scene Classifier", active: true },
      { label: "Agentic Decision Enclave", active: true },
      { label: "VLM Vision NIM Model", active: true }
    ],
    games: ["Custom Strategy Scripts", "Autonomous Grinding", "Complex In-Game Tasks"],
    details: [
      "Periodically queries deep vision VILA / Llama 3.2 VLM models for full screen analysis.",
      "Translates neural thoughts directly into abstract input directives (e.g. key presses).",
      "Features a strict 'User-Override' failsafe that pauses auto-actions if mouse or keyboard activity is detected."
    ],
    warning: "⚠️ SECURITY WARNING: Agent Mode can capture game frames, query cloud-reasoning LLMs, and simulate keyboard inputs. Ensure all local keystroke confirmations are reviewed carefully."
  }
};
