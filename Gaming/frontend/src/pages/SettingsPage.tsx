import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Cpu,
  Save,
  Camera,
  Keyboard,
  Sparkles,
  Zap,
  Target,
  Flame,
  Shield,
  ChevronDown,
  Folder,
  Trash2,
  AlertTriangle,
  Link,
  Fingerprint,
  KeyRound,
  Copy,
  Check,
  Calendar,
  Lock,
  Unlock,
  Sliders,
  Search,
  ArrowRight,
  BookOpen,
  Info
} from 'lucide-react';
import type { TelemetryState } from '../types/telemetry';

const HotkeyRecorder: React.FC<{
  value: string;
  onChange: (newValue: string) => void;
}> = ({ value, onChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);

  const formatDisplay = (val: string) => {
    return val.replace(/</g, '').replace(/>/g, '').toUpperCase();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (!isRecording) return;

    const key = e.key.toLowerCase();
    if (key === 'escape') {
      setIsRecording(false);
      setCurrentKeys([]);
      return;
    }

    if (key === 'backspace') {
      setCurrentKeys([]);
      return;
    }

    // Capture modifiers and the main key
    const keys = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.altKey) keys.push('alt');
    if (e.shiftKey) keys.push('shift');
    if (e.metaKey) keys.push('win');

    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      keys.push(key);
    }

    const uniqueKeys = Array.from(new Set(keys));
    setCurrentKeys(uniqueKeys);

    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      // It's a full combo
      const formatted = uniqueKeys.map(k => (['ctrl', 'alt', 'shift', 'win'].includes(k) ? `<${k}>` : k)).join('+');
      onChange(formatted);
      setIsRecording(false);
    }
  };

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => setIsRecording(true)}
      onBlur={() => setIsRecording(false)}
      className={`w-full bg-black/40 border rounded-xl py-2.5 px-4 text-xs font-black text-center uppercase cursor-pointer transition-all outline-none ${isRecording ? 'border-neon-green bg-neon-green/5 shadow-[0_0_15px_rgba(118, 185, 0,0.2)]' : 'border-white/10 hover:border-white/20'}`}
    >
      <span className={isRecording ? 'text-neon-green' : 'text-zinc-400'}>
        {isRecording
          ? (currentKeys.length > 0 ? currentKeys.join(' + ').toUpperCase() : 'Press keys...')
          : (value ? formatDisplay(value) : 'None')}
      </span>
    </div>
  );
};

const AssistantModeCard: React.FC<{
  mode: string;
  title: string;
  description: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({ title, description, icon: Icon, active, onClick, onMouseEnter, onMouseLeave }) => (
  <button aria-label="button" type="button"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`flex-1 min-w-[180px] p-6 rounded-3xl border transition-all flex flex-col items-center justify-center text-center gap-4 ${active
      ? 'bg-neon-green/10 border-neon-green/40 text-neon-green glow-green shadow-[0_0_20px_rgba(118, 185, 0,0.1)]'
      : 'bg-white/2 border-white/5 text-zinc-500 hover:bg-white/4 hover:border-white/10'}`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-neon-green/20' : 'bg-white/5'}`}>
      <Icon className={`w-6 h-6 ${active ? 'text-neon-green' : 'text-zinc-500'}`} />
    </div>
    <div>
      <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${active ? 'text-white' : 'text-zinc-400'}`}>{title}</h4>
      <p className="text-[10px] font-medium leading-tight opacity-70">{description}</p>
    </div>
  </button>
);

const getStringsFromChildren = (node: React.ReactNode): string => {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getStringsFromChildren).join(' ');
  }
  if (React.isValidElement(node)) {
    const props = node.props as any;
    let text = '';
    if (props) {
      if (props.children) {
        text += getStringsFromChildren(props.children) + ' ';
      }
      if (props.label) {
        text += getStringsFromChildren(props.label) + ' ';
      }
      if (props.description) {
        text += getStringsFromChildren(props.description) + ' ';
      }
      if (props.title) {
        text += getStringsFromChildren(props.title) + ' ';
      }
      if (props.options && Array.isArray(props.options)) {
        props.options.forEach((opt: any) => {
          if (opt.label) text += String(opt.label) + ' ';
          if (opt.value) text += String(opt.value) + ' ';
          if (opt.group) text += String(opt.group) + ' ';
        });
      }
      if (props.placeholder) {
        text += String(props.placeholder) + ' ';
      }
    }
    return text;
  }
  return '';
};

const SettingsSection: React.FC<{
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  searchQuery?: string;
  searchTerms?: string;
}> = ({ title, icon: Icon, children, searchQuery = '', searchTerms = '' }) => {
  let hasVisibleChildren = false;
  
  const filteredChildren = React.Children.map(children, child => {
    if (child === null || child === undefined || child === false || child === true) {
      return null;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (React.isValidElement(child)) {
        const childText = getStringsFromChildren(child);
        if (childText.toLowerCase().includes(q)) {
          hasVisibleChildren = true;
          return child;
        }
      } else if (typeof child === 'string' || typeof child === 'number') {
        if (String(child).toLowerCase().includes(q)) {
          hasVisibleChildren = true;
          return child;
        }
      }
      return null;
    }
    hasVisibleChildren = true;
    return child;
  });

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const matchesTitle = title.toLowerCase().includes(q);
    const matchesTerms = searchTerms.toLowerCase().includes(q);
    
    if (!matchesTitle && !matchesTerms && !hasVisibleChildren) {
      return null;
    }
    
    // If the section title/terms match, show all children. Otherwise, show only matching children.
    children = (matchesTitle || matchesTerms) ? children : filteredChildren;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
        )}
        <h3 className="text-[11px] font-black text-neon-green uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="bg-[#0c0c10]/60 border border-white/15 rounded-3xl p-8 space-y-8 backdrop-blur-md shadow-[0_0_20px_rgba(118, 185, 0,0.05)]">
        {children}
      </div>
    </div>
  );
};

const SettingsField: React.FC<{
  label: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  childWidth?: string;
}> = ({ label, description, children, childWidth }) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
    <div className="flex-1">
      {typeof label === 'string' ? (
        <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">{label}</p>
      ) : (
        <div className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">{label}</div>
      )}
      {description && <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">{description}</p>}
    </div>
    <div className={`${childWidth || "w-full lg:w-[22rem] xl:w-96"} shrink-0`}>
      {children}
    </div>
  </div>
);

interface OptionItem {
  value: string;
  label: string;
  group?: string;
  isMono?: boolean;
}

const CustomSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: OptionItem[];
  className?: string;
  isMono?: boolean;
  size?: 'sm' | 'md';
}> = ({ value, onChange, options, className = '', isMono = false, size = 'md' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.label === value);
  const displayLabel = selectedOption ? selectedOption.label : value;

  const renderedItems: React.ReactNode[] = [];
  let currentGroup = '';

  options.forEach((opt, idx) => {
    if (opt.group && opt.group !== currentGroup) {
      currentGroup = opt.group;
      renderedItems.push(
        <div key={`group-${currentGroup}`} className="px-3 py-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 border-b border-white/10 mt-2 first:mt-0 font-sans">
          {currentGroup}
        </div>
      );
    }

    const isSelected = opt.value === value || opt.label === value;

    renderedItems.push(
      <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
        key={`opt-${idx}-${opt.value}`}
        onClick={() => {
          onChange(opt.value);
          setIsOpen(false);
        }}
        className={`px-4 py-2.5 text-xs cursor-pointer transition-all flex items-center justify-between ${isSelected
          ? 'bg-neon-green/10 text-neon-green font-bold font-sans'
          : 'text-zinc-300 hover:bg-white/4 hover:text-white font-sans'
          } ${opt.isMono || isMono ? 'font-mono' : ''}`}
      >
        <span>{opt.label}</span>
        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(118, 185, 0,0.8)]" />}
      </div>
    );
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0c0c12]/80 border rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between select-none ${size === 'sm' ? 'py-1.5 px-3 text-[10px]' : 'py-2.5 px-4 text-xs font-bold'
          } ${isOpen
            ? 'border-neon-green/50 bg-[#0c0c12] shadow-[0_0_15px_rgba(118, 185, 0,0.15)]'
            : 'border-white/10 hover:border-white/20'
          } ${isMono || selectedOption?.isMono ? 'font-mono text-neon-green' : 'text-zinc-300'} ${className}`}
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <ChevronDown className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-zinc-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-neon-green' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-[#0d0d14]/95 border border-white/10 rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl z-50 custom-scrollbar py-1">
          {renderedItems}
        </div>
      )}
    </div>
  );
};

const FOCUS_MODE_OPTIONS = [
  { value: 'Primary Only', label: 'Primary Only' },
  { value: 'Auto-Follow', label: 'Auto-Follow' },
  { value: 'Specific Display', label: 'Specific Display' }
];

const CAPTURE_BACKEND_OPTIONS = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'dxgi', label: 'DXGI Desktop Duplication' },
  { value: 'bitblt', label: 'BitBlt (Legacy)' }
];

const DETECTOR_BACKEND_OPTIONS = [
  { value: 'simple', label: 'Simple (CPU/Auto)' },
  { value: 'trt', label: 'NVIDIA TensorRT (Ultra-Fast)' },
  { value: 'cuda', label: 'PyTorch CUDA (GPU)' }
];

const OCR_ENGINE_OPTIONS = [
  { value: 'auto', label: 'Auto-Detect' },
  { value: 'rapidocr', label: 'RapidOCR (Fast / ONNX)' },
  { value: 'tesseract', label: 'Tesseract (Legacy)' }
];

const AI_NEURAL_BACKBONE_OPTIONS = [
  { value: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct (Recommended)', group: 'Strategic Analysis (Balanced)', isMono: true },
  { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct', group: 'Strategic Analysis (Balanced)', isMono: true },
  { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct', group: 'Fast Reasoning (Low Latency)', isMono: true },
  { value: 'meta/llama-3.2-3b-instruct', label: 'Llama 3.2 3B Instruct', group: 'Fast Reasoning (Low Latency)', isMono: true },
  { value: 'nvidia/nemotron-4-340b-instruct', label: 'Nemotron-4 340B', group: 'Strategic Analysis (Balanced)', isMono: true },
  { value: 'meta/llama-3.2-11b-vision-instruct', label: 'Llama 3.2 11B Vision', group: 'Vision Specialized', isMono: true },
  { value: 'nvidia/vlm-vila-1.5-40b', label: 'VILA 1.5 40B', group: 'Vision Specialized', isMono: true },
  { value: 'custom', label: 'Custom ID...', isMono: true }
];

const MEMORY_MODE_OPTIONS = [
  { value: 'read_write', label: 'Full Sync (Read/Write)' },
  { value: 'read_only', label: 'Observer (Read Only)' }
];

const HUD_LAYOUT_OPTIONS = [
  { value: 'top-left', label: 'Top-Left (Standard)' },
  { value: 'top-right', label: 'Top-Right' },
  { value: 'bottom-right', label: 'Bottom-Right' },
  { value: 'bottom-left', label: 'Bottom-Left' }
];

const HUD_LAYOUT_STYLE_OPTIONS = [
  { value: 'standard', label: 'Standard (Detailed Panel)' },
  { value: 'compact', label: 'Compact (Mini Widget)' },
  { value: 'horizontal', label: 'Horizontal Banner' }
];

const SPEECH_PROVIDER_OPTIONS = [
  { value: 'google', label: 'Aero (Cloud - Google)' },
  { value: 'elevenlabs', label: 'ElevenLabs (High-Fidelity)' },
  { value: 'riva', label: 'NVIDIA Riva (FastPitch)' },
  { value: 'local', label: 'Command (Neural Lite)' }
];

const PRESET_DETAILS = [
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

const GPU_RTX_FEATURES = ['DLSS', 'FRAME_GEN', 'FRAME GEN', 'FG', 'PATH_TRACING', 'PATH TRACING', 'RAY_TRACING', 'RAY TRACING'];
const GPU_NVIDIA_FEATURES = ['REFLEX', 'PHYSX'];

const getRecommendedPreset = (features: string[] = [], genre: string = '', gpuInfo: string | Record<string, any> = '') => {
  const g = genre.toLowerCase();

  let isRtxGpu = false;
  let isHighEndRtx = false;
  let is40Series = false;
  let is50Series = false;

  if (typeof gpuInfo === 'object' && gpuInfo !== null) {
    isRtxGpu = gpuInfo.is_rtx ?? false;
    isHighEndRtx = isRtxGpu && (gpuInfo.tier === 'high');
    is40Series = isRtxGpu && (gpuInfo.architecture === 'Ada Lovelace');
    is50Series = isRtxGpu && (gpuInfo.architecture === 'Blackwell');
  } else {
    const name = String(gpuInfo).toLowerCase();
    isRtxGpu = name.includes('rtx') || name.includes('quadro rtx') || name.includes('tesla') || name.includes('titan rtx');
    isHighEndRtx = name.includes('5090') || name.includes('5080') || name.includes('5070') || name.includes('4090') || name.includes('4080') || name.includes('4070') || name.includes('3090') || name.includes('3080') || name.includes('4070 ti') || name.includes('3080 ti') || name.includes('super');
    is40Series = name.includes('40') && isRtxGpu;
    is50Series = name.includes('50') && isRtxGpu;
  }

  const upperFeatures = features.map(f => f.toUpperCase());
  const hasDLSS = upperFeatures.some(f => f.includes('DLSS'));
  const hasFG = upperFeatures.some(f => f.includes('FRAME_GEN') || f.includes('FRAME GEN') || f.includes('FG'));
  const hasRT = upperFeatures.some(f => f.includes('RAY_TRACING') || f.includes('RAY TRACING') || f.includes('PATH_TRACING') || f.includes('PATH TRACING') || f.includes('RTX'));

  // If not RTX, fallback to latency or off
  if (!isRtxGpu) {
    if (g.includes('shooter') || g.includes('esport') || g.includes('fight') || g.includes('multiplayer') || g.includes('competitive') || g.includes('action') || g.includes('racing')) {
      return PRESET_DETAILS.find(p => p.key === 'latency') || PRESET_DETAILS[2];
    }
    return PRESET_DETAILS.find(p => p.key === 'off') || PRESET_DETAILS[3];
  }

  // Esports / shooters always prefer Latency, even if DLSS/RT exist
  if (g.includes('shooter') || g.includes('esport') || g.includes('fight') || g.includes('multiplayer') || g.includes('competitive')) {
    return PRESET_DETAILS.find(p => p.key === 'latency') || PRESET_DETAILS[2];
  }

  // If the game doesn't even support DLSS or RT, we can't do Quality/Performance/Balanced properly
  if (!hasDLSS && !hasRT && !hasFG) {
    if (g.includes('rpg') || g.includes('adventure') || g.includes('action') || g.includes('racing')) {
      return PRESET_DETAILS.find(p => p.key === 'latency') || PRESET_DETAILS[2]; // Use latency for reflex
    }
    return PRESET_DETAILS.find(p => p.key === 'off') || PRESET_DETAILS[3];
  }

  // Story / RPG / Adventure -> prefers Quality if hardware can handle it and game supports RT
  if (g.includes('rpg') || g.includes('adventure') || g.includes('story') || g.includes('open world') || g.includes('simulation') || g.includes('narrative')) {
    if (hasRT && isHighEndRtx) {
      return PRESET_DETAILS.find(p => p.key === 'quality') || PRESET_DETAILS[0];
    } else if (hasDLSS) {
      return PRESET_DETAILS.find(p => p.key === 'balanced') || PRESET_DETAILS[1];
    } else {
      return PRESET_DETAILS.find(p => p.key === 'latency') || PRESET_DETAILS[2];
    }
  }

  // Action / Racing / Fast paced -> prefers Performance if game supports FG and hardware is 40-series or 50-series
  if (g.includes('action') || g.includes('racing') || g.includes('sport') || g.includes('survival') || g.includes('brawler')) {
    if (hasFG && (is40Series || is50Series)) {
      return PRESET_DETAILS.find(p => p.key === 'performance') || PRESET_DETAILS[1];
    } else if (hasDLSS) {
      return PRESET_DETAILS.find(p => p.key === 'balanced') || PRESET_DETAILS[1];
    } else {
      return PRESET_DETAILS.find(p => p.key === 'latency') || PRESET_DETAILS[2];
    }
  }

  // Other genres (indie, puzzle, etc.)
  if (hasDLSS) {
    return PRESET_DETAILS.find(p => p.key === 'balanced') || PRESET_DETAILS[1];
  }

  return PRESET_DETAILS.find(p => p.key === 'off') || PRESET_DETAILS[3];
};

const OAUTH_PROVIDERS = [
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

const MODE_INTELLIGENCE: Record<string, {
  tagline: string;
  latency: string;
  pipelines: { label: string; active: boolean }[];
  games: string[];
  details: string[];
  warning?: string;
}> = {
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

const SettingsPage: React.FC<{ state: TelemetryState | null, sendCommand: (type: string, payload?: any) => void }> = ({ state, sendCommand }) => {
  const { isSignedIn, userId, signOut } = useAuth();
  const { user } = useUser();

  const handleSwitchAccount = async () => {
    let targetProvider = 'oauth_google';
    const activeProvider = localStorage.getItem('mission_control_active_provider');
    if (activeProvider) {
      targetProvider = activeProvider === 'oauth_google' ? 'oauth_discord' : 'oauth_google';
    } else if (user) {
      const isGoogle = user.externalAccounts.some((acc: any) => acc.provider === 'google');
      targetProvider = isGoogle ? 'oauth_discord' : 'oauth_google';
    }
    
    localStorage.removeItem('mission_control_active_provider');
    
    // Sign out and redirect to initiate OAuth for the target provider
    signOut(() => {
      window.location.replace(window.location.origin + `/?trigger_oauth=${targetProvider}`);
    });
  };

  const libraryStats = useMemo(() => {
    const library = (state as any)?.game_library || [];
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
      // Filter out launchers and platforms to match the hardware feature matrix table
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
  }, [state]);

  const [localConfig, setLocalConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newDirInput, setNewDirInput] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [desktopPath, setDesktopPath] = useState('C:/Users/Default/Desktop');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSettingsRequestRef = useRef<number>(0);
  const settingsRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const lastSaveRequestRef = useRef<number>(0);
  const lastStateOverlayRef = useRef<string>('');

  const [isAutoSave, setIsAutoSave] = useState(() => {
    return localStorage.getItem('aero_auto_save') !== 'false';
  });

  const handleAutoSaveToggle = () => {
    const newValue = !isAutoSave;
    setIsAutoSave(newValue);
    localStorage.setItem('aero_auto_save', newValue.toString());
  };

  const activePreset = useMemo(() => {
    if (localConfig?.nvidia?.preset) return localConfig.nvidia.preset;
    const f = localConfig?.nvidia?.gaming_features;
    if (!f) return 'custom';
    if (f.dlss && f.ray_tracing && f.path_tracing && f.reflex && f.hdr) return 'quality';
    if (f.dlss && f.frame_gen && !f.ray_tracing && f.reflex && f.hdr) return 'performance';
    if (f.dlss && !f.frame_gen && !f.ray_tracing && f.reflex && f.hdr) return 'balanced';
    if (!f.dlss && !f.frame_gen && !f.ray_tracing && f.reflex && !f.hdr) return 'latency';
    if (!f.dlss && !f.frame_gen && !f.ray_tracing && !f.path_tracing && !f.reflex && !f.hdr) return 'off';
    return 'custom';
  }, [localConfig?.nvidia]);

  const handlePresetChange = (preset: string) => {
    let updatedFeatures = { ...localConfig?.nvidia?.gaming_features };
    const gpuCaps = state?.system_specs?.hardware?.gpu_capabilities;
    const gpuNameStr = state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '';

    const maxQualityDlss = gpuCaps?.max_dlss_quality || (gpuNameStr.toLowerCase().includes('50') ? 'DLSS 4.5' : 'DLSS 3.5');
    const maxPerfDlss = gpuCaps?.max_dlss_perf || (gpuNameStr.toLowerCase().includes('50') ? 'DLSS 4' : 'DLSS 3');
    const fgMultiplier = gpuCaps?.max_fg || (gpuNameStr.toLowerCase().includes('50') ? '4x' : '2x');

    if (preset === 'auto') {
      const library = (state as any)?.game_library || [];

      let bestKey = 'balanced';
      if (library.length > 0) {
        const counts: Record<string, number> = {};
        library.forEach((g: any) => {
          const rec = getRecommendedPreset(g.features || [], g.genre, gpuCaps || gpuNameStr);
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
        hdr: true
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
        hdr: true
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
        hdr: true
      };
    } else if (preset === 'latency') {
      updatedFeatures = {
        ...updatedFeatures,
        dlss: false,
        frame_gen: false,
        ray_tracing: false,
        path_tracing: false,
        reflex: true,
        hdr: false
      };
    } else if (preset === 'off') {
      updatedFeatures = {
        ...updatedFeatures,
        dlss: false,
        frame_gen: false,
        ray_tracing: false,
        path_tracing: false,
        reflex: false,
        hdr: false
      };
    }

    let updatedPowerLimit = localConfig?.nvidia?.power_limit_percent ?? 100;
    let updatedPowerMode = localConfig?.nvidia?.power_management_mode ?? 'adaptive';

    const bestKey = preset === 'auto' ? (function () {
      const library = (state as any)?.game_library || [];
      let bk = 'balanced';
      if (library.length > 0) {
        const counts: Record<string, number> = {};
        library.forEach((g: any) => {
          const rec = getRecommendedPreset(g.features || [], g.genre, gpuCaps || gpuNameStr);
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

    setLocalConfig({
      ...localConfig,
      nvidia: {
        ...localConfig.nvidia,
        preset: preset,
        gaming_features: updatedFeatures,
        ...(preset !== 'custom' ? {
          power_limit_percent: updatedPowerLimit,
          power_management_mode: updatedPowerMode
        } : {})
      }
    });
  };

  useEffect(() => {
    if (localConfig?.nvidia?.preset === 'auto' && (state as any)?.game_library?.length > 0) {
      const library = (state as any)?.game_library || [];
      const gpuCaps = state?.system_specs?.hardware?.gpu_capabilities;
      const gpuNameStr = state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '';

      let bestKey = 'balanced';
      const counts: Record<string, number> = {};
      library.forEach((g: any) => {
        const rec = getRecommendedPreset(g.features || [], g.genre, gpuCaps || gpuNameStr);
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

      let updatedFeatures = { ...(localConfig?.nvidia?.gaming_features || {}) };
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

      const currentFeaturesStr = JSON.stringify(localConfig?.nvidia?.gaming_features || {});
      const newFeaturesStr = JSON.stringify(updatedFeatures);

      let updatedPowerLimit = localConfig?.nvidia?.power_limit_percent ?? 100;
      let updatedPowerMode = localConfig?.nvidia?.power_management_mode ?? 'adaptive';

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

      if (currentFeaturesStr !== newFeaturesStr ||
        localConfig?.nvidia?.power_limit_percent !== updatedPowerLimit ||
        localConfig?.nvidia?.power_management_mode !== updatedPowerMode) {
        const newConfig = {
          ...localConfig,
          nvidia: {
            ...localConfig.nvidia,
            gaming_features: updatedFeatures,
            power_limit_percent: updatedPowerLimit,
            power_management_mode: updatedPowerMode
          }
        };
        setLocalConfig(newConfig);
        sendCommand('update_config', { nvidia: newConfig.nvidia });
      }
    }
  }, [(state as any)?.game_library, localConfig?.nvidia?.preset]);

  useEffect(() => {
    if ((window as any).electronAPI?.getDesktopPath) {
      (window as any).electronAPI.getDesktopPath().then((path: string | null) => {
        if (path) setDesktopPath(path);
      });
    }
  }, []);

  // ── Linked Account Expansion States ─────────────────────────────────────────
  const [copiedId, setCopiedId] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Dynamically update pipeline labels based on current configuration
  const getDynamicPipelineLabel = (label: string) => {
    if (!localConfig) return label;
    if (label === 'Hardware Capture Engine') {
      const backend = localConfig.capture?.backend;
      const backendLabel = CAPTURE_BACKEND_OPTIONS.find(o => o.value === backend)?.label || 'Auto';
      return `Capture Engine (${backendLabel.split(' ')[0]})`;
    }
    if (label === 'VLM Vision NIM Model') {
      const model = localConfig.ai_agent?.model_id;
      if (model === 'custom') {
        const customId = localConfig.ai_agent?.custom_model_id || 'Custom';
        return `Vision Model (${customId})`;
      }
      const modelLabel = AI_NEURAL_BACKBONE_OPTIONS.find(o => o.value === model)?.label || 'Llama 3.1 8B';
      return `Vision Model (${modelLabel})`;
    }
    if (label === 'AI OCR Dialogue Reader') {
      const engine = localConfig.vision?.ocr_engine;
      const engineLabel = OCR_ENGINE_OPTIONS.find(o => o.value === engine)?.label || 'Auto';
      return `OCR Reader (${engineLabel.split(' ')[0]})`;
    }
    if (label === 'Performance Optimizer') {
      const memMode = localConfig.capture?.memory_mode;
      return `Memory Hook (${memMode === 'read_only' ? 'Observer' : 'Full Sync'})`;
    }
    return label;
  };

  // Dynamically compile recommended target games purely from the user's active library
  const dynamicTargetGames = useMemo(() => {
    const library = (state as any)?.game_library || [];

    const mapping = {
      competitive: [] as string[],
      story: [] as string[],
      hybrid: [] as string[],
      agent: [] as string[]
    };

    // Advanced dynamic matching of genre to appropriate mode
    const getModeFromGenre = (genreStr: string): string => {
      const g = genreStr.toUpperCase();
      if (g.includes("FPS") || g.includes("ACTION") || g.includes("MOBA") || g.includes("SPORTS") || g.includes("RACING") || g.includes("SHOOTER") || g.includes("FIGHTING")) {
        return "competitive";
      }
      if (g.includes("RPG") || g.includes("ADVENTURE") || g.includes("OPEN WORLD") || g.includes("STORY") || g.includes("NARRATIVE") || g.includes("SOULS")) {
        return "story";
      }
      if (g.includes("STRATEGY") || g.includes("SIMULATION") || g.includes("PLATFORM") || g.includes("CASUAL") || g.includes("PUZZLE") || g.includes("CO-OP")) {
        return "hybrid";
      }
      return "hybrid"; // default fallback
    };

    library.forEach((game: any) => {
      // Skip launchers themselves
      const isLauncher = game.type?.toUpperCase() === 'LAUNCHER' || game.genre?.toUpperCase() === 'PLATFORM';
      if (isLauncher) return;

      const genre = game.genre || '';
      const mode = getModeFromGenre(genre);

      // Use tags if present as an additional reference
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

      // Agent mode uses tags/features
      if (game.features?.length > 0 || tags.includes("SYSTEM") || tags.includes("AI SUPPORT")) {
        if (!mapping.agent.includes(game.name)) {
          mapping.agent.push(game.name);
        }
      }
    });

    // If completely empty due to no games scanned yet, provide a fallback indicator
    if (mapping.competitive.length === 0) mapping.competitive = ['Hint: Auto-detects FPS, Esports, MOBA'];
    if (mapping.story.length === 0) mapping.story = ['Hint: Auto-detects RPG, Story-Rich, Open World'];
    if (mapping.hybrid.length === 0) mapping.hybrid = ['Hint: Auto-detects Strategy, Sim, Co-op'];
    if (mapping.agent.length === 0) mapping.agent = ['Hint: Auto-detects AI Support, System Scripts'];

    return mapping;
  }, [state]);

  const isNvidiaGpu = React.useMemo(() => {
    const gpuName = (state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '').toLowerCase();
    const driverVersion = state?.gpu_metrics?.driver_version;

    // If telemetry hasn't loaded system_specs yet, look at the driver version
    const hasNvidiaDriver = driverVersion && driverVersion !== 'Unknown' && driverVersion !== '---';
    const hasNvidiaName = gpuName && (gpuName.includes('nvidia') || gpuName.includes('geforce') || gpuName.includes('rtx') || gpuName.includes('gtx'));

    // Default to true on initial load so it doesn't flicker,
    // but once specs/metrics arrive we do a strict check
    if (!state?.system_specs?.hardware?.gpu && !state?.gpu_metrics?.gpu_name && (!driverVersion || driverVersion === 'Unknown' || driverVersion === '---')) {
      return true;
    }

    return hasNvidiaName || hasNvidiaDriver;
  }, [state]);

  const isRtxGpu = React.useMemo(() => {
    if (!isNvidiaGpu) return false;
    const gpuName = (state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '').toLowerCase();

    // Default to true on initial load so it doesn't flicker
    if (!state?.system_specs?.hardware?.gpu && !state?.gpu_metrics?.gpu_name) return true;

    // Check if it's an RTX GPU (has RT cores / DLSS support)
    return gpuName.includes('rtx') || gpuName.includes('quadro rtx') || gpuName.includes('tesla') || gpuName.includes('titan rtx');
  }, [state, isNvidiaGpu]);

  // ── Account Deletion State ──────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Clerk OAuth Linking Handlers ───────────────────────────────────────────
  const handleLinkProvider = async (strategy: string) => {
    if (!user) return;
    setLinkingProvider(strategy);
    try {
      const options: any = {
        strategy: strategy as any,
        redirectUrl: `${window.location.origin}/sso-callback`,
      };
      if (strategy === 'oauth_google') {
        options.additionalData = { prompt: 'select_account' };
      }
      const extAccount = await user.createExternalAccount(options);

      const verification = (extAccount as any).verification;
      const redirectUrl = verification?.externalVerificationRedirectUrl;

      if (redirectUrl) {
        window.location.href = redirectUrl.toString();
      } else {
        alert('OAuth flow initialization succeeded, but redirect URL was missing.');
      }
    } catch (err: any) {
      console.error('Failed to link provider:', err);
      const msg = err.errors?.[0]?.longMessage || 'OAuth connection initiation failed.';
      if (msg.toLowerCase().includes('additional verification')) {
        alert('Security Lock Active:\n\nTo link a new authentication gateway, Clerk requires a fresh session. Please log out, log back in, and try connecting this provider again.');
      } else {
        alert(msg);
      }
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleUnlinkProvider = async (strategy: string) => {
    if (!user) return;
    const providerKey = strategy.replace('oauth_', '');
    const extAcc = user.externalAccounts.find((acc: any) => acc.provider === providerKey);
    if (!extAcc) return;

    const hasPassword = (user as any).passwordEnabled;
    if (user.externalAccounts.length <= 1 && !hasPassword) {
      alert("Security constraint: You cannot disconnect your only login method. Please register a password or add another provider first.");
      return;
    }

    setUnlinkingProvider(strategy);
    try {
      await extAcc.destroy();
      await user.reload();
    } catch (err: any) {
      console.error('Failed to unlink provider:', err);
      alert(err.errors?.[0]?.longMessage || 'Failed to disconnect account.');
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const handleBrowseDir = async () => {
    if ((window as any).electronAPI?.selectDirectory) {
      const selected = await (window as any).electronAPI.selectDirectory();
      if (selected) {
        setNewDirInput(selected);
        const currentDirs = localConfig.scanner?.custom_scan_dirs || [];
        if (!currentDirs.includes(selected)) {
          const updatedScanner = {
            ...localConfig.scanner,
            custom_scan_dirs: [...currentDirs, selected]
          };
          setLocalConfig({
            ...localConfig,
            scanner: updatedScanner
          });
        }
      }
    }
  };

  const handleRemoveDir = (dirToRemove: string) => {
    const currentDirs = localConfig.scanner?.custom_scan_dirs || [];
    const updatedScanner = {
      ...localConfig.scanner,
      custom_scan_dirs: currentDirs.filter((d: string) => d !== dirToRemove)
    };

    setLocalConfig({
      ...localConfig,
      scanner: updatedScanner
    });
  };

  // Load config with debouncing to prevent request spam
  useEffect(() => {
    const hasConfig = state?.config !== undefined;
    if (hasConfig) {
      setConfigLoaded(true);
      // Clear any pending timeouts when config arrives
      if (settingsRequestTimeoutRef.current) {
        clearTimeout(settingsRequestTimeoutRef.current);
        settingsRequestTimeoutRef.current = null;
      }
    } else if (!configLoaded) {
      // Only request settings if not requested recently (debounce: 500ms)
      const now = Date.now();
      if (now - lastSettingsRequestRef.current > 500) {
        lastSettingsRequestRef.current = now;
        sendCommand('get_settings', { userId });
      }

      // Set timeout for retry only if not already set
      if (!settingsRequestTimeoutRef.current) {
        settingsRequestTimeoutRef.current = setTimeout(() => {
          settingsRequestTimeoutRef.current = null;
          // If config still not loaded, request again (single retry)
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
  }, [state?.config, configLoaded, sendCommand]);

  // Watch backend signal for account deletion completion
  useEffect(() => {
    const s = state as any;
    if (s?.account_deleted === true) {
      setIsDeleting(false);
      // Backend deleted the Clerk user, so we sign out frontend cleanly
      signOut();
    } else if (s?.account_deleted === false && s?.account_delete_error) {
      setIsDeleting(false);
      setDeleteError(s.account_delete_error);
    }
  }, [(state as any)?.account_deleted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state?.config && !localConfig) {
      setLocalConfig(state.config);
    }
  }, [state?.config, localConfig]);

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
            overlay: stateOverlay
          };
        });
      }
    }
  }, [state?.config?.overlay]);

  const prevConfigRef = useRef<string>('');

  const handleSave = () => {
    // Debounce saves: prevent sending same save request multiple times within 500ms
    const now = Date.now();
    if (now - lastSaveRequestRef.current < 500) {
      return; // Skip this save attempt
    }
    lastSaveRequestRef.current = now;

    setIsSaving(true);
    sendCommand('save_settings', { config: localConfig, userId });
    setTimeout(() => setIsSaving(false), 1000);
  };

  // Auto-save effect
  useEffect(() => {
    if (!localConfig) return;
    const currentConfigStr = JSON.stringify(localConfig);

    if (prevConfigRef.current === '') {
      // First time setting it (likely from state.config)
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

  if (!localConfig) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Accessing Neural Parameters...</span>
        </div>
      </div>
    );
  }

  const activeModeKey = hoveredMode || localConfig.game_mode || 'hybrid';
  const intel = MODE_INTELLIGENCE[activeModeKey] || MODE_INTELLIGENCE.hybrid;
  const targetGames = dynamicTargetGames[activeModeKey as keyof typeof dynamicTargetGames] || [];

  const activeGame = (state as any)?.game_info?.name || (state as any)?.pipeline?.current_game?.name;
  const activeGameInfo = activeGame ? ((state as any)?.game_library || []).find((g: any) => g.name === activeGame) : null;
  const activeFeatures = activeGameInfo ? (activeGameInfo.features || []) : null;

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar gap-y-12 bg-[#050505]/40">

      {/* Redesigned Premium Tech Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl border border-white/4 bg-[#0c0c12]/40 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden shadow-2xl">
        {/* Cyberpunk Decorative Background Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-neon-green/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-purple-500/4ded-full blur-[80px] pointer-events-none translate-y-1/2" />

        <div className="flex items-start gap-4 sm:gap-5 relative z-10">
          {/* Glowing Animated Icon Container */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-0.5 bg-linear-to-r from-neon-green to-blue-500 rounded-2xl opacity-40 blur group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/85 border border-white/10 flex items-center justify-center text-neon-green">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white drop-shadow-[0_0_12px_rgba(118, 185, 0,0.8)] uppercase font-sans">
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
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">Auto-Save</span>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleAutoSaveToggle()}
                onClick={handleAutoSaveToggle}
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${isAutoSave ? 'bg-neon-green shadow-[0_0_10px_rgba(118, 185, 0,0.3)]' : 'bg-zinc-800'}`}>
                <div className={`w-4 h-4 rounded-full absolute transition-all bg-black top-0.5 ${isAutoSave ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>

            {/* Save Status Indicator / Save Button */}
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
              <button aria-label="button" type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2.5 px-7 py-3 bg-linear-to-r from-neon-green to-blue-600 hover:from-neon-green hover:to-blue-500 text-black font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 min-w-[160px]"
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
          placeholder="Search settings... (Ctrl+F)"
          className="w-full bg-white/[0.04] border border-white/15 hover:border-neon-green/35 focus:border-neon-green rounded-2xl py-3.5 pl-12 pr-12 text-[11px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-neon-green/30 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.02),0_4px_20px_rgba(0,0,0,0.4)] focus:shadow-[0_0_20px_rgba(118, 185, 0,0.1)] backdrop-blur-md placeholder-zinc-400"
        />
        {searchQuery && (
          <button aria-label="Clear Search" type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-white transition-colors"
          >
            <div className="w-5 h-5 bg-white/10 hover:bg-white/15 rounded-full flex items-center justify-center text-[10px] font-bold">✕</div>
          </button>
        )}
      </div>
      <div className="space-y-16 pb-20">
        {/* Assistant Mode */}
        {(!searchQuery || 
          "assistant mode configure your default co-pilot neural enclaves. aero automatically switches modes depending on the game launched. competitive low-latency tactical alerts story dialogue & quest tracking hybrid balanced gameplay engine agent autonomous agentic ai inspect pipeline log aero auto-sense active".includes(searchQuery.toLowerCase())
        ) && (
          <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-[11px] font-black text-neon-green uppercase tracking-[0.2em] mb-1">Assistant Mode</h3>
              <p className="text-[10px] text-zinc-500 font-medium">
                Configure your default co-pilot neural enclaves. Aero automatically switches modes depending on the game launched.
              </p>
            </div>
            {/* Action buttons & Auto-Sense status */}
            <div className="flex items-center gap-3">
              <button aria-label="button" type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${showDiagnostics
                  ? 'bg-neon-green/10 text-neon-green border-neon-green/20 shadow-[0_0_15px_rgba(118, 185, 0,0.15)]'
                  : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white hover:border-white/10'
                  }`}
              >
                <Cpu className="w-3 h-3 text-neon-green" />
                {showDiagnostics ? 'Hide Log' : 'Inspect Pipeline Log'}
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-green/5 border border-neon-green/10 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-neon-green animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-neon-green">
                  Aero Auto-Sense: Active
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
            <AssistantModeCard
              mode="competitive"
              title="Competitive"
              description="Low-latency tactical alerts"
              icon={Target}
              active={localConfig.game_mode === 'competitive'}
              onClick={() => setLocalConfig({ ...localConfig, game_mode: 'competitive' })}
              onMouseEnter={() => setHoveredMode('competitive')}
              onMouseLeave={() => setHoveredMode(null)}
            />
            <AssistantModeCard
              mode="story"
              title="Story"
              description="Dialogue & Quest tracking"
              icon={Sparkles}
              active={localConfig.game_mode === 'story'}
              onClick={() => setLocalConfig({ ...localConfig, game_mode: 'story' })}
              onMouseEnter={() => setHoveredMode('story')}
              onMouseLeave={() => setHoveredMode(null)}
            />
            <AssistantModeCard
              mode="hybrid"
              title="Hybrid"
              description="Balanced Gameplay Engine"
              icon={Zap}
              active={localConfig.game_mode === 'hybrid'}
              onClick={() => setLocalConfig({ ...localConfig, game_mode: 'hybrid' })}
              onMouseEnter={() => setHoveredMode('hybrid')}
              onMouseLeave={() => setHoveredMode(null)}
            />
            <AssistantModeCard
              mode="agent"
              title="Agent"
              description="Autonomous Agentic AI"
              icon={Brain}
              active={localConfig.game_mode === 'agent'}
              onClick={() => setLocalConfig({ ...localConfig, game_mode: 'agent' })}
              onMouseEnter={() => setHoveredMode('agent')}
              onMouseLeave={() => setHoveredMode(null)}
            />
          </div>

          {/* Dynamic HUD Mode Intelligence panel (Collapsible) */}
          <AnimatePresence>
            {showDiagnostics && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pt-4"
              >
                <div className="bg-black/40 border border-white/15 rounded-3xl p-6 space-y-6 relative overflow-hidden backdrop-blur-md transition-all duration-300 shadow-[0_0_20px_rgba(118, 185, 0,0.05)]">
                  {/* Corner cyber tech decals */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/[0.02] rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col lg:flex-row justify-between gap-6 border-b border-white/5 pb-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-neon-green/10 border border-neon-green/20 text-neon-green uppercase tracking-widest animate-pulse">
                          Pipeline Log
                        </span>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          {activeModeKey} Mode Diagnostics
                        </h4>
                      </div>
                      <p className="text-[10px] text-zinc-400 max-w-2xl font-medium leading-relaxed">
                        {intel.tagline}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Latency Overhead</span>
                        <span className="text-xs font-mono font-black text-neon-green">{intel.latency}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-white/5" />
                      <div className="text-right">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Status</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${localConfig.game_mode === activeModeKey ? 'text-neon-yellow' : 'text-zinc-500'}`}>
                          {localConfig.game_mode === activeModeKey ? '● DEPLOYED' : '○ PREVIEW'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content body split */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Pipelines Active/Inactive status */}
                    <div className="space-y-3.5">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Active Neural Pipelines</span>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                        {intel.pipelines.map((pipe, idx) => {
                          const label = getDynamicPipelineLabel(pipe.label);
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all min-w-0 ${pipe.active
                                ? 'bg-neon-yellow/5 border-neon-yellow/15 text-neon-yellow'
                                : 'bg-black/20 border-white/5 text-zinc-600'
                                }`}
                            >
                              <span className="truncate mr-2" title={label}>{label}</span>
                              <span className="font-mono text-[8px] whitespace-nowrap shrink-0">
                                {pipe.active ? '● RUNNING' : '○ STANDBY'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Functional descriptions & recommended games */}
                    <div className="gap-y-4 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Functional Parameters</span>
                        <ul className="space-y-2 text-[10px] font-medium text-zinc-400 leading-relaxed list-disc list-inside">
                          {intel.details.map((detail, idx) => (
                            <li key={idx} className="marker:text-neon-green/70">{detail}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Target Game Profiles:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {targetGames.map((game, idx) => (
                              <span key={idx} className="text-[8px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-300">
                                {game}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Warning block if present */}
                  {intel.warning && (
                    <div className="p-3.5 bg-red-950/20 border border-red-500/15 rounded-2xl">
                      <p className="text-[9px] font-black text-red-400 tracking-wider leading-relaxed">
                        {intel.warning}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>)}
        {/* ── Linked Account ─────────────────────────────────────────── */}
        {isSignedIn && user && (
          <SettingsSection searchQuery={searchQuery} title="Linked Account" icon={KeyRound}>
            {/* Identity block */}
            <div className="flex items-center justify-between gap-4 bg-white/5 border border-white/15 rounded-2xl p-4 shadow-[0_0_15px_rgba(118, 185, 0,0.03)]">
              <div className="flex items-center gap-4">
                <UserButton appearance={{ elements: { userButtonAvatarBox: "w-12 h-12 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]", userButtonPopoverCard: "bg-black/90 border border-white/10 backdrop-blur-xl" } }} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-white uppercase tracking-wider">
                      {user.fullName || user.firstName || 'Anonymous'}
                    </p>
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500">
                    {user.primaryEmailAddress?.emailAddress || userId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="px-3 py-1.5 rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 shadow-[0_0_15px_rgba(191, 255, 0,0.1)]">
                  <span className="text-[8px] font-black uppercase text-neon-yellow tracking-widest">Active Node</span>
                </div>
                <button aria-label="button" type="button"
                  onClick={() => {
                    sendCommand('logout_user', { userId });
                    signOut();
                  }}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Interactive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* Node Registration ID */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full relative overflow-hidden group hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Node Registry ID</span>
                  <Fingerprint className="w-3.5 h-3.5 text-neon-green/70" />
                </div>
                <div className="flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 mt-2">
                  <span className="text-[10px] font-mono text-neon-green truncate max-w-30" title={user.id}>{user.id}</span>
                  <button aria-label="button" type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="p-1 hover:bg-white/5 rounded-lg transition-all text-zinc-400 hover:text-white shrink-0"
                    title="Copy ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-neon-yellow animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Registration Timestamp */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Activation Date</span>
                  <Calendar className="w-3.5 h-3.5 text-neon-yellow/70" />
                </div>
                <div className="mt-2">
                  <span className="text-[11px] font-mono font-bold text-white">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </span>
                  <p className="text-[9px] text-zinc-500 font-medium mt-1">Telemetry initialized</p>
                </div>
              </div>

              {/* Security Shield */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Gateway Integrity</span>
                  <Shield className={`w-3.5 h-3.5 ${localConfig?.privacy?.enabled ? 'text-neon-yellow/70' : 'text-zinc-500/70'}`} />
                </div>
                <div className="mt-2">
                  <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${localConfig?.privacy?.enabled ? 'text-neon-yellow' : 'text-zinc-500'}`}>
                    {localConfig?.privacy?.enabled ? 'AES-256 E2EE' : 'STANDARD SECURE'}
                  </span>
                  <p className="text-[9px] text-zinc-500 font-medium mt-1">
                    {localConfig?.privacy?.enabled ? 'Neural gateway encrypted' : 'Encryption bypassed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Linked Identity Gateways */}
            <div className="border-t border-white/4 pt-6 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-black text-neon-green uppercase tracking-widest mb-1">Identity & Authentication Gateways</p>
                  <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
                    Link secondary multi-factor authentication providers to authenticate on other systems or sign in securely.
                  </p>
                </div>
                <button aria-label="button" type="button" onClick={handleSwitchAccount} className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all whitespace-nowrap shrink-0">
                  Switch Account
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {OAUTH_PROVIDERS.map((provider) => {
                  const providerKey = provider.id.replace('oauth_', '');
                  const extAcc = user.externalAccounts.find((acc: any) => acc.provider === providerKey);
                  const isConnected = !!extAcc;
                  const isUnlinking = unlinkingProvider === provider.id;
                  const isLinking = linkingProvider === provider.id;

                  return (
                    <div
                      key={provider.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border transition-all ${isConnected
                        ? 'border-neon-yellow/20 hover:border-neon-yellow/30 shadow-[0_0_15px_rgba(191, 255, 0,0.02)]'
                        : 'border-white/5 hover:border-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 bg-white/5 ${isConnected ? 'text-neon-yellow border-neon-yellow/30' : 'text-zinc-400 border-white/10'
                          }`}>
                          {provider.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{provider.name}</span>
                            {isConnected && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow tracking-wider uppercase">
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            {isConnected
                              ? (extAcc.emailAddress || extAcc.username || 'Authorized Gateway')
                              : `Connect your secure ${provider.name} profile`}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isConnected ? (
                          <button aria-label="button" type="button"
                            onClick={() => handleUnlinkProvider(provider.id)}
                            disabled={isUnlinking || isLinking}
                            className="w-full sm:w-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isUnlinking ? (
                              <span className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                Unlinking...
                              </span>
                            ) : 'Unlink Account'}
                          </button>
                        ) : (
                          <button aria-label="button" type="button"
                            onClick={() => handleLinkProvider(provider.id)}
                            disabled={isUnlinking || isLinking}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r ${provider.color} font-black text-[9px] uppercase tracking-widest rounded-xl transition-all border disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {isLinking ? (
                              <span className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 border border-current/30 border-t-current rounded-full animate-spin" />
                                Connecting...
                              </span>
                            ) : (
                              <>
                                <Link className="w-3 h-3" />
                                Connect
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger zone */}
            <div className="border-t border-white/4 pt-6 space-y-4">
              <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Danger Zone</p>
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
                  Permanently delete your account and all associated game library data from our servers. This action cannot be undone.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button aria-label="button" type="button"
                  onClick={() => { setShowDeleteConfirm(true); setDeleteInput(''); setDeleteError(null); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete My Account
                </button>
              ) : (
                <div className="bg-red-950/30 border border-red-500/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-1">Confirm Deletion</p>
                      <p className="text-[10px] font-medium text-zinc-400 leading-relaxed">
                        This will permanently erase your game library from Supabase and delete your Clerk account. Type{' '}
                        <span className="font-mono font-black text-red-400">DELETE</span> to confirm.
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full bg-black/50 border border-red-500/30 focus:border-red-500/60 rounded-xl py-2.5 px-4 text-xs font-mono text-red-300 placeholder-red-900 focus:outline-none transition-colors"
                    autoFocus
                  />

                  {deleteError && (
                    <p className="text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {deleteError}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button aria-label="button" type="button"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteError(null); }}
                      disabled={isDeleting}
                      className="flex-1 py-2 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button aria-label="button" type="button"
                      onClick={() => {
                        if (deleteInput !== 'DELETE' || !userId) return;
                        setIsDeleting(true);
                        setDeleteError(null);
                        sendCommand('delete_account', { userId });
                      }}
                      disabled={deleteInput !== 'DELETE' || isDeleting}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Confirm Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        )}



        {/* Privacy & Stealth */}
        <SettingsSection searchQuery={searchQuery} title="Privacy & Neural Security" icon={Shield}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-2">

            {/* Privacy Shield */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Privacy Shield</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    Enable end-to-end encryption for neural queries and block external telemetry.
                  </p>
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({ ...localConfig, privacy: { ...localConfig.privacy, enabled: !localConfig.privacy?.enabled } })}
                  className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${localConfig.privacy?.enabled ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.3)]' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.privacy?.enabled ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>

            {/* Anonymized Reasoning */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Anonymized Reasoning</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    Strip system metadata (Username, OS details) before sending data to NVIDIA NIM.
                  </p>
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({ ...localConfig, privacy: { ...localConfig.privacy, anonymize: !localConfig.privacy?.anonymize } })}
                  className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${localConfig.privacy?.anonymize ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.3)]' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.privacy?.anonymize ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>

            {/* Share Telemetry & Diagnostics */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Share Telemetry & Diagnostics</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    Automatically include device specifications and performance metrics with bug reports. By default on.
                  </p>
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    privacy: {
                      ...localConfig.privacy,
                      share_telemetry: localConfig.privacy?.share_telemetry !== false ? false : true
                    }
                  })}
                  className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${localConfig.privacy?.share_telemetry !== false ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.3)]' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.privacy?.share_telemetry !== false ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>


            {/* Secure Sandbox */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Secure Sandbox</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    Isolate AI reasoning processes to an in-memory secure enclave on local RAM.
                  </p>
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({ ...localConfig, privacy: { ...localConfig.privacy, secure_sandbox: !localConfig.privacy?.secure_sandbox } })}
                  className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${localConfig.privacy?.secure_sandbox ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.3)]' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.privacy?.secure_sandbox ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>

            {/* UUID Hardware Lock */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Hardware UUID Binding</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    Verify cryptographic signature matches local motherboard UUID before initiating neural links.
                  </p>
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({ ...localConfig, privacy: { ...localConfig.privacy, uuid_lock: !localConfig.privacy?.uuid_lock } })}
                  className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${localConfig.privacy?.uuid_lock ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.3)]' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.privacy?.uuid_lock ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>

            {/* Key Rotation */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Key Rotation</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    Perform automated key rotation and verification with Clerk secure nodes every 5 minutes.
                  </p>
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({ ...localConfig, privacy: { ...localConfig.privacy, key_rotation: !localConfig.privacy?.key_rotation } })}
                  className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${localConfig.privacy?.key_rotation ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.3)]' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.privacy?.key_rotation ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>

          </div>
        </SettingsSection>
        {/* Screen Capture */}
        <SettingsSection searchQuery={searchQuery} title="Screen Capture" icon={Camera}>
          <SettingsField label="Focus Mode" description="Use 'Auto-Follow' if you play games on different monitors.">
            <CustomSelect
              value={localConfig.capture?.focus_mode || 'Primary Only'}
              onChange={(val) => setLocalConfig({ ...localConfig, capture: { ...localConfig.capture, focus_mode: val } })}
              options={FOCUS_MODE_OPTIONS}
            />
          </SettingsField>

          <SettingsField label="Capture Backend" description="The low-level API used for screen grabbing.">
            <CustomSelect
              value={localConfig.capture?.backend || 'auto'}
              onChange={(val) => setLocalConfig({ ...localConfig, capture: { ...localConfig.capture, backend: val } })}
              options={CAPTURE_BACKEND_OPTIONS}
            />
          </SettingsField>

          <SettingsField label="Cap Vision Pipeline FPS" description="Limit the screen capture and AI processing rate to save CPU/GPU overhead. Note: This does NOT limit your actual game FPS, only the assistant's capture loop.">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Enable FPS Cap</span>
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    capture: {
                      ...localConfig.capture,
                      cap_fps: !localConfig.capture?.cap_fps
                    }
                  })}
                  className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.capture?.cap_fps === true ? 'bg-neon-green' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.capture?.cap_fps === true ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>

              {localConfig.capture?.cap_fps === true && (
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="30" max="700" step="1"
                    value={localConfig.capture?.fps_cap_limit || 60}
                    onChange={(e) => setLocalConfig({ ...localConfig, capture: { ...localConfig.capture, fps_cap_limit: parseInt(e.target.value) } })}
                    className="flex-1 accent-neon-green"
                  />
                  <span className="text-xs font-black text-neon-green w-16">{localConfig.capture?.fps_cap_limit || 60} FPS</span>
                </div>
              )}
            </div>
          </SettingsField>
        </SettingsSection>

        {/* Vision & Intelligence Engine */}
        <SettingsSection searchQuery={searchQuery} title="Vision & Intelligence Engine" icon={Camera}>
          <SettingsField label="Vision Model Path" description="Select your optimized YOLOv8 .engine (TensorRT) or .pt (PyTorch) model file.">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={localConfig.vision?.yolo_model || ''}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] font-mono text-neon-green focus:outline-none cursor-default"
                placeholder="e.g. models/yolov8n.engine"
              />
              <button aria-label="button" type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      setLocalConfig({ ...localConfig, vision: { ...localConfig.vision, yolo_model: `models/${file.name}` } });
                    }
                  };
                  input.click();
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all"
              >
                Browse
              </button>
            </div>
          </SettingsField>

          <SettingsField label="Detector Backend" description="TRT is 10x faster but requires pre-compiled engines for your specific GPU.">
            <CustomSelect
              value={localConfig.vision?.detector || 'simple'}
              onChange={(val) => setLocalConfig({ ...localConfig, vision: { ...localConfig.vision, detector: val } })}
              options={DETECTOR_BACKEND_OPTIONS}
            />
          </SettingsField>

          <SettingsField label="OCR Engine" description="RapidOCR provides fast, lightweight recognition in complex story games.">
            <CustomSelect
              value={localConfig.vision?.ocr?.backend === 'easyocr' ? 'rapidocr' : localConfig.vision?.ocr?.backend || 'auto'}
              onChange={(val) => setLocalConfig({ ...localConfig, vision: { ...localConfig.vision, ocr: { ...localConfig.vision.ocr, backend: val } } })}
              options={OCR_ENGINE_OPTIONS}
            />
          </SettingsField>
        </SettingsSection>

        {/* NVIDIA Features */}
        <SettingsSection searchQuery={searchQuery} title="Processing Pipeline" icon={Cpu}>
          {!isNvidiaGpu ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 select-none">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-0.5">NVIDIA RTX GPU Required</span>
                <p className="text-[9px] font-bold text-zinc-500 leading-normal uppercase">
                  This system does not have an active NVIDIA GPU. Hardware-accelerated DLSS, Ray Tracing, Reflex, and Frame Generation are locked.
                </p>
              </div>
            </div>
          ) : (!isRtxGpu && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 select-none">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-0.5">NVIDIA GTX GPU Detected</span>
                <p className="text-[9px] font-bold text-zinc-500 leading-normal uppercase">
                  Legacy technologies (Reflex, PhysX, Ansel) are supported, but RTX hardware-specific features (Ray Tracing, DLSS, and Frame Gen) are locked.
                </p>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-200 mb-0.5 uppercase tracking-widest">Global NVIDIA Preset</p>
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
                  Choose a unified preset. This <span className="text-neon-green font-bold">immediately applies</span> to your Windows Power Plan and NVIDIA GPU Power Limit (via NVML). DLSS/RT/FG toggles below are <span className="text-amber-400 font-bold">advisory preferences</span> used by the AI assistant — they must be set inside each game's own settings menu.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full mt-2">
              {PRESET_DETAILS.map((preset) => {
                const isActive = activePreset === preset.key;
                const PresetIcon = preset.icon;
                return (
                  <button aria-label="button" type="button"
                    key={preset.key}
                    onClick={() => handlePresetChange(preset.key)}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between text-left select-none outline-hidden h-full cursor-pointer relative overflow-hidden group ${isActive
                      ? 'bg-neon-green/10 border-neon-green/40 text-neon-green shadow-[0_0_20px_rgba(118, 185, 0,0.15)] ring-1 ring-neon-green/20'
                      : 'bg-white/2 border-white/5 text-zinc-400 hover:bg-white/4 hover:border-white/10 hover:text-zinc-200'
                      }`}
                  >
                    {/* Active highlight top strip */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-neon-green to-blue-500" />
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {PresetIcon && (
                            <PresetIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-neon-green' : 'text-zinc-400'}`} />
                          )}
                          <h4 className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                            {preset.title}
                          </h4>
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(118, 185, 0,0.8)] mt-1.5 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] font-medium leading-relaxed opacity-80 min-h-[32px]">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="space-y-2.5 mt-4 pt-3 border-t border-white/5 w-full">
                      {/* Backend Power limits details */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                          <span className="text-zinc-500">GPU Power</span>
                          <span className={isActive ? 'text-neon-green' : 'text-zinc-400'}>{preset.powerLimit}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                          <span className="text-zinc-500">Power Plan</span>
                          <span className={isActive ? 'text-neon-green' : 'text-zinc-400'}>{preset.powerPlan}</span>
                        </div>
                      </div>

                      {/* Configured Features list */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Pipeline:</span>
                        {preset.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wide opacity-90">
                            <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-neon-green' : 'bg-zinc-600'}`} />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Live Hardware Status: Proof the preset worked ─────────────────── */}
          {(() => {
            const gpuM = state?.gpu_metrics as any;
            const rawPowerDraw = gpuM?.power_draw_w ?? gpuM?.power_draw ?? null;
            const rawPowerLimit = gpuM?.power_limit_w ?? gpuM?.power_limit ?? null;
            const rawPowerLimitMax = gpuM?.power_limit_max_w ?? gpuM?.power_limit_max ?? null;
            const powerDraw = rawPowerDraw !== null ? Math.round(rawPowerDraw) : null;
            const powerLimit = rawPowerLimit !== null ? Math.round(rawPowerLimit) : null;
            const powerLimitMax = rawPowerLimitMax !== null && rawPowerLimitMax > 0 ? Math.round(rawPowerLimitMax) : null;
            const limitPct = (rawPowerDraw && rawPowerLimit && rawPowerLimit > 0)
              ? Math.round((rawPowerDraw / rawPowerLimit) * 100) : null;

            const presetMap: Record<string, { color: string; label: string }> = {
              quality: { color: 'text-neon-green', label: 'RTX Ultra Quality' },
              performance: { color: 'text-blue-400', label: 'RTX High FPS' },
              balanced: { color: 'text-violet-400', label: 'RTX Balanced' },
              latency: { color: 'text-neon-yellow', label: 'eSports Latency' },
              off: { color: 'text-zinc-400', label: 'Stock / Power Save' },
              auto: { color: 'text-amber-400', label: 'Auto-Configure' },
              custom: { color: 'text-rose-400', label: 'Custom Profile' },
            };
            const active = presetMap[activePreset] ?? presetMap.custom;

            return (
              <div className="bg-black/30 border border-white/8 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Header */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(191, 255, 0,0.7)] animate-pulse" />
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Live Hardware Status</span>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-8 bg-white/8 shrink-0" />

                {/* Stats grid */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 flex-1">

                  {/* Active Preset */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Active Preset</span>
                    <span className={`text-[10px] font-black uppercase tracking-wide ${active.color}`}>{active.label}</span>
                  </div>

                  {/* GPU Power Draw */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">GPU Power Draw</span>
                    <span className="text-[10px] font-black text-white">
                      {powerDraw !== null ? `${powerDraw}W draw` : <span className="text-zinc-600">—</span>}
                      {powerLimit !== null && powerLimit > 0 && <span className="text-zinc-500 font-medium"> / {powerLimit}W configured</span>}
                      {powerLimitMax !== null && <span className="text-zinc-600 font-medium"> (chassis max: {powerLimitMax}W TGP)</span>}
                    </span>
                  </div>

                  {/* Power plan */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Power Plan</span>
                    <span className="text-[10px] font-black text-white">
                      {activePreset === 'off' || activePreset === 'balanced'
                        ? <span className="text-violet-400">Balanced Mode</span>
                        : activePreset === 'latency' || activePreset === 'performance' || activePreset === 'quality'
                          ? <span className="text-neon-yellow">High Performance</span>
                          : <span className="text-zinc-400">Adaptive</span>}
                    </span>
                  </div>

                  {/* GPU Load */}
                  {limitPct !== null && (
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Power Usage</span>
                        <span className="text-[8px] font-black text-zinc-400">{limitPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${limitPct > 85 ? 'bg-red-400' : limitPct > 60 ? 'bg-amber-400' : 'bg-neon-yellow'
                            }`}
                          style={{ width: `${limitPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Apply Now button */}
                <button
                  aria-label="Apply preset hardware settings now"
                  type="button"
                  onClick={() => {
                    setIsSaving(true);
                    sendCommand('save_settings', { config: localConfig });
                    setTimeout(() => setIsSaving(false), 1500);
                  }}
                  disabled={isSaving}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 bg-neon-yellow/10 border border-neon-yellow/30 hover:bg-neon-yellow/20 hover:border-neon-yellow/50 text-neon-yellow font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
                >
                  {isSaving ? (
                    <><div className="w-3 h-3 border border-neon-yellow/30 border-t-neon-yellow rounded-full animate-spin" />Applying...</>
                  ) : (
                    <><Zap className="w-3 h-3" />Apply Now</>
                  )}
                </button>
              </div>
            );
          })()}

          {/* ── Preset Optimizer Panel ────────────────────────────────────────────── */}
          {(!state?.preset_optimizer || state.preset_optimizer.status === 'no_game') ? (
            <div className="bg-[#08080c]/80 border border-white/5 rounded-2xl p-5 flex flex-col gap-5 overflow-hidden relative">
              {/* Header */}
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neon-green/5 border border-white/5 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                      Preset Optimizer
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      Status: Standby — Waiting for active game...
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Rescan"
                  type="button"
                  onClick={() => sendCommand('scan_preset_optimizer', { preset: localConfig.nvidia?.preset || 'quality', game_entry: (state as any)?.game_info || null })}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors text-zinc-300 shrink-0"
                >
                  Rescan Config
                </button>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse shrink-0" />
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-relaxed">
                  Launch a game to automatically analyze, semantically map, and align your selected RTX preset using the Zero-Config AI engine.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#08080c]/80 border border-white/10 rounded-2xl p-5 flex flex-col gap-5 overflow-hidden relative">
              {/* Header */}
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-neon-green" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                      Preset Optimizer
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Comparing <span className="text-neon-green">{state.preset_optimizer.preset}</span> preset against <span className="text-white">{state.preset_optimizer.game_title}</span> config
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neon-yellow/10 border border-neon-yellow/20">
                      <Check className="w-3 h-3 text-neon-yellow" />
                      <span className="text-[9px] font-black text-neon-yellow">{state.preset_optimizer.match_count || 0} Matches</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span className="text-[9px] font-black text-amber-400">{state.preset_optimizer.mismatch_count || 0} Mismatches</span>
                    </div>
                  </div>
                  <button aria-label="Rescan" type="button"
                    onClick={() => sendCommand('scan_preset_optimizer', { preset: localConfig.nvidia?.preset || 'quality', game_entry: (state as any)?.game_info || null })}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors text-zinc-300 shrink-0"
                  >
                    Rescan Config
                  </button>
                </div>
              </div>

              {state.preset_optimizer.status === 'error' ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-[10px] font-bold text-red-400">Scan Error: {state.preset_optimizer.error}</p>
                </div>
              ) : state.preset_optimizer.status === 'no_config_found' ? (
                <div className="p-4 bg-zinc-800/50 border border-white/5 rounded-xl">
                  <p className="text-[10px] font-medium text-zinc-400">
                    Could not locate config files for {state.preset_optimizer.game_title}. You will need to manually configure settings in-game.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {state.preset_optimizer.items.map((item: any) => {
                    const isMatch = item.status === 'match';
                    const isMismatch = item.status === 'mismatch';
                    const isOptMismatch = item.status === 'optional_mismatch';
                    const isUnsupported = item.status === 'not_supported';
                    const isUnknown = item.status === 'unknown';

                    const renderValuePill = (val: string | null) => {
                      if (!val) {
                        return (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800/40 border border-white/5 text-[9px] font-mono font-bold text-zinc-500 uppercase">
                            Unknown
                          </span>
                        );
                      }
                      const normalized = val.toUpperCase();
                      let colorClasses = 'bg-zinc-800/60 border border-white/10 text-zinc-400';
                      if (normalized === 'ON') {
                        colorClasses = 'bg-neon-yellow/10 border border-neon-yellow/20 text-neon-yellow font-bold';
                      } else if (normalized === 'OFF') {
                        colorClasses = 'bg-red-500/10 border border-red-500/20 text-red-400 font-bold';
                      } else if (['LOW', 'MEDIUM', 'HIGH', 'ULTRA', 'QUALITY', 'BALANCED', 'PERFORMANCE', 'NORMAL', 'EXTREME', 'VERY'].some(kw => normalized.includes(kw))) {
                        colorClasses = 'bg-neon-green/10 border border-neon-green/20 text-neon-green font-bold';
                      }
                      return (
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono tracking-wider uppercase ${colorClasses}`}>
                          {normalized}
                        </span>
                      );
                    };

                    let borderAccentClass = 'border-l-[3px] border-l-zinc-700/40 border-y border-r border-white/5';
                    let statusColor = 'text-zinc-500 bg-zinc-800 border-zinc-700';
                    let icon = <div className="w-3 h-3 rounded-full bg-zinc-600" />;

                    if (isUnsupported) {
                      borderAccentClass = 'border-l-[3px] border-l-red-500/40 border-y border-r border-white/5';
                      statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                      icon = <div className="w-3 h-3 rounded-full border-2 border-red-400 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-red-400" /></div>;
                    } else if (isMatch) {
                      borderAccentClass = 'border-l-[3px] border-l-neon-yellow/50 border-y border-r border-white/5';
                      statusColor = 'text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20 shadow-[0_0_10px_rgba(191, 255, 0,0.15)]';
                      icon = <Check className="w-3 h-3 text-neon-yellow" />;
                    } else if (isMismatch) {
                      borderAccentClass = 'border-l-[3px] border-l-amber-500/70 border-y border-r border-white/5';
                      statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
                      icon = <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />;
                    } else if (isOptMismatch) {
                      borderAccentClass = 'border-l-[3px] border-l-blue-500/60 border-y border-r border-white/5';
                      statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                      icon = <div className="w-3 h-3 rounded-full border-2 border-blue-400" />;
                    }

                    return (
                      <div key={item.feature} className={`group flex flex-col rounded-xl overflow-hidden bg-black/20 hover:bg-zinc-900/10 border transition-all duration-300 ${borderAccentClass}`}>
                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${statusColor}`}>
                              {icon}
                            </div>
                            <div>
                              <h5 className="text-[10px] font-black text-white uppercase tracking-wider">{item.label}</h5>
                              
                              {isUnknown ? (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Config State:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/40 border border-white/5 text-[9px] font-mono font-bold text-zinc-500 uppercase">Not Found</span>
                                </div>
                              ) : isUnsupported ? (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Hardware Support:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-red-950/20 border border-red-900/30 text-[9px] font-mono font-bold text-red-400 uppercase">Unsupported</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Current:</span>
                                    {renderValuePill(item.current_value)}
                                  </div>
                                  
                                  <ArrowRight className={`w-3.5 h-3.5 text-zinc-600 shrink-0 ${!isMatch ? 'text-neon-green/80 animate-pulse' : ''}`} />

                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Target:</span>
                                    {renderValuePill(item.required_value)}
                                  </div>

                                  {isMatch && (
                                    <span className="ml-1.5 px-2 py-0.5 rounded bg-neon-yellow/10 border border-neon-yellow/20 text-[8px] font-black uppercase text-neon-yellow tracking-widest">
                                      Aligned
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.required && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                              Required
                            </span>
                          )}
                        </div>
                        {(isMismatch || isOptMismatch || isUnknown) && !isUnsupported && item.instruction && (
                          <div className="px-3.5 pb-3.5 pt-1.5 border-t border-white/5 bg-[#0e1622]/10">
                            <div className="bg-cyan-950/20 border border-neon-green/10 rounded-xl p-3 flex flex-col gap-2">
                              <div className="flex items-center gap-1.5 text-neon-green">
                                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-wider">AI Integration Guide</span>
                              </div>
                              <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">
                                {item.instruction}
                              </p>
                              
                              {item.note && (
                                <div className="flex items-start gap-2 bg-[#08080c]/60 border border-neon-green/10 rounded-lg p-2.5 mt-1">
                                  <Info className="w-3.5 h-3.5 text-neon-green shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-neon-green">Important Note</span>
                                    <p className="text-[11.5px] font-semibold text-zinc-200 leading-relaxed">
                                      {item.note}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Disclaimer Banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Advisory Preferences vs. Real Hardware Control</p>
              <p className="text-[9px] font-medium text-zinc-400 leading-relaxed">
                <span className="text-neon-yellow font-bold">✓ Real effect:</span> GPU Power Limit (NVML), Windows Power Plan, Process Priority, GPU Registry Preference — applied the moment you click "Optimize" or save settings.<br />
                <span className="text-amber-400 font-bold">⚠ Advisory only:</span> DLSS, Frame Generation, Ray Tracing, Reflex, HDR — these are per-game settings inside each game's own options menu. No external app can override them. The AI uses your preferences here to give you guidance.
              </p>
            </div>
          </div>

          <SettingsField
            label="AI Neural Backbone"
            description="Select the NVIDIA NIM model for vision-language reasoning and tactical analysis.">
            <div className="space-y-3">
              <CustomSelect
                value={localConfig.ai_agent?.model_id || 'meta/llama-3.3-70b-instruct'}
                onChange={(val) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, model_id: val } })}
                options={AI_NEURAL_BACKBONE_OPTIONS}
                isMono={true}
              />

              {localConfig.ai_agent?.model_id === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom model ID..."
                  value={localConfig.ai_agent?.custom_model_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, custom_model_id: e.target.value } })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] font-mono font-bold text-neon-green"
                />
              )}
            </div>
          </SettingsField>

          <SettingsField
            label={
              <div className="flex items-center gap-2">
                <span>NVIDIA Deep Learning Super Sampling (DLSS)</span>
                {activeFeatures && !activeFeatures.includes('DLSS') && (
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">Unsupported by Active Game</span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${libraryStats.dlssGamesCount > 0 ? 'bg-neon-green/10 border-neon-green/20 text-neon-green' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                  {libraryStats.dlssGamesCount > 0 ? `Used by ${libraryStats.dlssGamesCount} game${libraryStats.dlssGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
                </span>
              </div>
            }
            description={activeFeatures && !activeFeatures.includes('DLSS') ? "Your active game does not support DLSS. This advisory preference is safely ignored." : "Advisory preference — enable this in your game's own graphics settings. The AI uses your selection to give in-game guidance."}>
            <div className={`flex flex-col gap-4 ${(!isRtxGpu || (activeFeatures && !activeFeatures.includes('DLSS'))) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const nextVal = !localConfig.nvidia?.gaming_features?.dlss;
                  setLocalConfig({
                    ...localConfig,
                    nvidia: {
                      ...localConfig.nvidia,
                      gaming_features: {
                        ...localConfig.nvidia.gaming_features,
                        dlss: nextVal,
                        dlss_version: nextVal ? (localConfig.nvidia?.gaming_features?.dlss_version || 'DLSS 1') : undefined
                      }
                    }
                  });
                }}
                className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.nvidia?.gaming_features?.dlss ? 'bg-neon-green' : 'bg-zinc-800'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute transition-all ${localConfig.nvidia?.gaming_features?.dlss ? 'bg-black right-1' : 'bg-zinc-600 left-1'}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                {['DLSS 1', 'DLSS 2', 'DLSS 3', 'DLSS 3.5', 'DLSS 4', 'DLSS 4.5'].map((v) => (
                  <button aria-label="button" type="button"
                    key={v}
                    onClick={() => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, gaming_features: { ...localConfig.nvidia.gaming_features, dlss_version: v } } })}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${localConfig.nvidia?.gaming_features?.dlss_version === v && localConfig.nvidia?.gaming_features?.dlss ? 'bg-neon-green text-black border-neon-green shadow-[0_0_10px_rgba(118, 185, 0,0.3)]' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </SettingsField>

          <SettingsField
            label={
              <div className="flex items-center gap-2">
                <span>Frame Generation (FG)</span>
                {activeFeatures && !activeFeatures.includes('FRAME_GEN') && (
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">Unsupported by Active Game</span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${libraryStats.fgGamesCount > 0 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                  {libraryStats.fgGamesCount > 0 ? `Used by ${libraryStats.fgGamesCount} game${libraryStats.fgGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
                </span>
              </div>
            }
            description={activeFeatures && !activeFeatures.includes('FRAME_GEN') ? "Your active game does not support Frame Generation. This advisory preference is safely ignored." : "Advisory preference — enable Frame Gen inside your game's graphics menu. The AI will advise based on this setting."}>
            <div className={`flex flex-col gap-4 ${(!isRtxGpu || (activeFeatures && !activeFeatures.includes('FRAME_GEN'))) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const nextVal = !localConfig.nvidia?.gaming_features?.frame_gen;
                  setLocalConfig({
                    ...localConfig,
                    nvidia: {
                      ...localConfig.nvidia,
                      gaming_features: {
                        ...localConfig.nvidia.gaming_features,
                        frame_gen: nextVal,
                        frame_gen_multiplier: nextVal ? (localConfig.nvidia?.gaming_features?.frame_gen_multiplier || '2x') : undefined
                      }
                    }
                  });
                }}
                className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.nvidia?.gaming_features?.frame_gen ? 'bg-blue-500' : 'bg-zinc-800'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute transition-all ${localConfig.nvidia?.gaming_features?.frame_gen ? 'bg-black right-1' : 'bg-zinc-600 left-1'}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                {['2x', '3x', '4x', '6x'].map((mult) => {
                  const isSelected = localConfig.nvidia?.gaming_features?.frame_gen_multiplier === mult || (!localConfig.nvidia?.gaming_features?.frame_gen_multiplier && mult === '2x');
                  return (
                    <button aria-label="button" type="button"
                      key={mult}
                      onClick={() => setLocalConfig({
                        ...localConfig,
                        nvidia: {
                          ...localConfig.nvidia,
                          gaming_features: {
                            ...localConfig.nvidia.gaming_features,
                            frame_gen_multiplier: mult
                          }
                        }
                      })}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${isSelected && localConfig.nvidia?.gaming_features?.frame_gen ? 'bg-blue-500 text-black border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'}`}
                    >
                      {mult}
                    </button>
                  );
                })}
              </div>
            </div>
          </SettingsField>

          <SettingsField
            label={
              <div className="flex items-center gap-2">
                <span>Ray Tracing & Path Tracing</span>
                {activeFeatures && !activeFeatures.includes('RTX') && !activeFeatures.includes('PATH_TRACING') && (
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">Unsupported by Active Game</span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${libraryStats.rtGamesCount > 0 || libraryStats.ptGamesCount > 0 ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                  {libraryStats.rtGamesCount > 0 || libraryStats.ptGamesCount > 0 ? `RT: ${libraryStats.rtGamesCount} · PT: ${libraryStats.ptGamesCount} in library` : '0 games in library support this'}
                </span>
              </div>
            }
            description={activeFeatures && !activeFeatures.includes('RTX') && !activeFeatures.includes('PATH_TRACING') ? "Your active game does not support Ray Tracing. This advisory preference is safely ignored." : "Advisory preference — enable RT/PT in-game. The AI uses this to tailor performance advice."}>
            <div className={`flex gap-4 ${(!isRtxGpu || (activeFeatures && !activeFeatures.includes('RTX') && !activeFeatures.includes('PATH_TRACING'))) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
              <button aria-label="button" type="button"
                onClick={() => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, gaming_features: { ...localConfig.nvidia.gaming_features, ray_tracing: !localConfig.nvidia.gaming_features.ray_tracing } } })}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${localConfig.nvidia?.gaming_features?.ray_tracing ? 'bg-neon-green/20 border-neon-green/40 text-neon-green' : 'bg-white/5 border-white/10 text-zinc-500'}`}
              >
                Ray Tracing
              </button>
              <button aria-label="button" type="button"
                onClick={() => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, gaming_features: { ...localConfig.nvidia.gaming_features, path_tracing: !localConfig.nvidia.gaming_features.path_tracing } } })}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${localConfig.nvidia?.gaming_features?.path_tracing ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-white/5 border-white/10 text-zinc-500'}`}
              >
                <Flame className="w-3 h-3 inline-block mr-1" />
                Path Tracing
              </button>
            </div>
          </SettingsField>

          <SettingsField
            label={
              <div className="flex items-center gap-2">
                <span>NVIDIA Reflex</span>
                {activeFeatures && !activeFeatures.includes('REFLEX') && (
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">Unsupported by Active Game</span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${libraryStats.reflexGamesCount > 0 ? 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                  {libraryStats.reflexGamesCount > 0 ? `Used by ${libraryStats.reflexGamesCount} game${libraryStats.reflexGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
                </span>
              </div>
            }
            description={activeFeatures && !activeFeatures.includes('REFLEX') ? "Your active game does not support NVIDIA Reflex. This advisory preference is safely ignored." : "Advisory preference — enable NVIDIA Reflex in-game. Tells the AI your latency priority."}>
            <div className={`flex gap-4 ${(!isNvidiaGpu || (activeFeatures && !activeFeatures.includes('REFLEX'))) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
              <button aria-label="button" type="button"
                onClick={() => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, gaming_features: { ...localConfig.nvidia.gaming_features, reflex: !localConfig.nvidia.gaming_features.reflex } } })}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${localConfig.nvidia?.gaming_features?.reflex ? 'bg-neon-yellow/20 border-neon-yellow/40 text-neon-yellow' : 'bg-white/5 border-white/10 text-zinc-500'} ${!isNvidiaGpu ? 'pointer-events-none opacity-40 select-none' : ''}`}
              >
                NVIDIA Reflex
              </button>
            </div>
          </SettingsField>

          <SettingsField
            label={
              <div className="flex items-center gap-2">
                <span>High Dynamic Range (HDR)</span>
                {activeFeatures && !activeFeatures.includes('HDR') && (
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border bg-red-500/10 border-red-500/20 text-red-400">Unsupported by Active Game</span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${libraryStats.hdrGamesCount > 0 ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                  {libraryStats.hdrGamesCount > 0 ? `Used by ${libraryStats.hdrGamesCount} game${libraryStats.hdrGamesCount === 1 ? '' : 's'} in library` : '0 games in library support this'}
                </span>
              </div>
            }
            description={activeFeatures && !activeFeatures.includes('HDR') ? "Your active game does not natively support HDR. This advisory preference is safely ignored." : "Advisory preference — enable HDR in Windows Display Settings and in-game. The AI uses this for visual quality guidance."}>
            <div className={`flex gap-4 ${(activeFeatures && !activeFeatures.includes('HDR')) ? 'pointer-events-none opacity-40 select-none' : ''}`}>
              <button aria-label="button" type="button"
                onClick={() => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, gaming_features: { ...localConfig.nvidia.gaming_features, hdr: !localConfig.nvidia.gaming_features?.hdr } } })}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${localConfig.nvidia?.gaming_features?.hdr ? 'bg-violet-500/20 border-violet-500/40 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-white/5 border-white/10 text-zinc-500'}`}
              >
                HDR Optimization
              </button>
            </div>
          </SettingsField>

          {/* Real Hardware Controls Sub-section */}
          <div className="border-t border-white/5 pt-6 mt-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neon-yellow/10 border border-neon-yellow/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-neon-yellow" />
              </div>
              <div>
                <p className="text-[10px] font-black text-neon-yellow uppercase tracking-[0.2em]">Real Hardware Controls</p>
                <p className="text-[9px] font-medium text-zinc-500">These settings are applied <span className="text-neon-yellow">immediately</span> to your actual GPU hardware via NVML / Windows APIs.</p>
              </div>
            </div>

            {/* GPU Power Limit */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">GPU Power Limit</p>
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Directly caps NVIDIA GPU wattage via NVML. Lower = cooler &amp; quieter. Max = full performance. Applied on next "Optimize" or save.</p>
              </div>
              <div className="w-full lg:w-96 shrink-0 space-y-2">
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="50" max="100" step="5"
                    value={localConfig.nvidia?.power_limit_percent ?? 100}
                    onChange={(e) => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, power_limit_percent: parseInt(e.target.value) } })}
                    className="flex-1 accent-neon-yellow"
                  />
                  <span className="text-xs font-black text-neon-yellow w-12 text-right">{localConfig.nvidia?.power_limit_percent ?? 100}%</span>
                </div>
                <div className="flex justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-wider px-0.5">
                  <span>50% — Eco</span>
                  <span>80% — Balanced</span>
                  <span>100% — Max</span>
                </div>
              </div>
            </div>

            {/* NVIDIA Power Management Mode */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">NVIDIA Power Management Mode</p>
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Sets "Prefer Maximum Performance" globally in NVIDIA driver via registry. Prevents GPU from downclocking when idle. Effective after driver restart or next game launch.</p>
              </div>
              <div className="w-full lg:w-96 shrink-0">
                <div className="flex gap-2">
                  {(['adaptive', 'max_performance', 'optimal'] as const).map((mode) => (
                    <button aria-label="button" type="button" key={mode}
                      onClick={() => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, power_management_mode: mode } })}
                      className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${(localConfig.nvidia?.power_management_mode ?? 'adaptive') === mode
                        ? 'bg-neon-yellow/20 border-neon-yellow/40 text-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.15)]'
                        : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'
                        }`}
                    >
                      {mode === 'adaptive' ? 'Adaptive' : mode === 'max_performance' ? 'Max Perf' : 'Optimal'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Low Latency Mode */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">Low Latency Mode (Ultra)</p>
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Enables "Ultra" low latency in NVIDIA Control Panel via registry — limits pre-rendered frames to 1. Reduces input lag globally for all DX9/DX11/DX12 games.</p>
              </div>
              <div className="w-full lg:w-96 shrink-0">
                <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  onClick={() => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, low_latency_mode: !localConfig.nvidia?.low_latency_mode } })}
                  className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.nvidia?.low_latency_mode ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191, 255, 0,0.3)]' : 'bg-zinc-800'
                    }`}>
                  <div className={`w-4 h-4 rounded-full absolute transition-all bg-black ${localConfig.nvidia?.low_latency_mode ? 'right-1' : 'left-1'
                    }`} />
                </div>
              </div>
            </div>

            {/* Shader Cache Size */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-12">
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-200 mb-1 uppercase tracking-widest">Shader Cache Size</p>
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Controls the NVIDIA driver shader cache size (NVCP registry). Larger cache = fewer stutters on first launch. Applied after driver restart.</p>
              </div>
              <div className="w-full lg:w-96 shrink-0 space-y-2">
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="1" max="100" step="1"
                    value={localConfig.nvidia?.shader_cache_gb ?? 10}
                    onChange={(e) => setLocalConfig({ ...localConfig, nvidia: { ...localConfig.nvidia, shader_cache_gb: parseInt(e.target.value) } })}
                    className="flex-1 accent-neon-green"
                  />
                  <span className="text-xs font-black text-neon-green w-16 text-right">{localConfig.nvidia?.shader_cache_gb ?? 10} GB</span>
                </div>
                <div className="flex justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-wider px-0.5">
                  <span>1 GB</span>
                  <span>10 GB (Default)</span>
                  <span>100 GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Compatibility & Feature Matrix */}
          <div className="border-t border-white/5 pt-6 mt-6 space-y-4">
            <div>
              <p className="text-[10px] font-black text-neon-green uppercase tracking-widest mb-1">Library Hardware Feature Matrix</p>
              <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
                AI analyzed features for scanned games in your library, indicating GTX (Legacy) and RTX (Deep Learning/Ray Tracing) compatibility.
              </p>
            </div>

            {(() => {
              const gameLibrary = (state as any)?.game_library || [];
              const playableGames = gameLibrary.filter((g: any) => g.type?.toUpperCase() !== 'LAUNCHER' && g.genre?.toUpperCase() !== 'PLATFORM');

              if (playableGames.length === 0) {
                return (
                  <div className="p-4 bg-white/2 border border-white/5 rounded-2xl text-center">
                    <p className="text-[10px] text-zinc-500 italic">No games scanned in library yet. Run a library scan to populate feature matrix.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/25">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-white/[0.01]">
                        <th className="p-3.5 pl-5">Game</th>
                        <th className="p-3.5">Genre</th>
                        <th className="p-3.5">Recommended Preset</th>
                        <th className="p-3.5">Key Tech</th>
                        <th className="p-3.5">Game HDR Support</th>
                        <th className="p-3.5 pr-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {playableGames.slice(0, 10).map((game: any, idx: number) => {
                        const features = game.features || [];
                        const gtxFeatures = features.filter((f: string) => GPU_NVIDIA_FEATURES.includes(f.toUpperCase()));
                        const rtxFeatures = features.filter((f: string) => GPU_RTX_FEATURES.includes(f.toUpperCase()));
                        const hasGtx = gtxFeatures.length > 0;
                        const hasRtx = rtxFeatures.length > 0;
                        const hasHdr = features.some((f: string) => f.toUpperCase() === 'HDR');

                        return (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-all text-[10px] font-medium text-zinc-300">
                            <td className="p-3 pl-5 font-black text-white">
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const iconUrl = game.icon && game.icon !== 'null'
                                    ? (game.icon.startsWith('http') ? game.icon : `asset:///${game.icon.replace(/\\/g, '/')}`)
                                    : game.local_banner && game.local_banner !== 'null'
                                      ? (game.local_banner.startsWith('http') ? game.local_banner : `asset:///${game.local_banner.replace(/\\/g, '/')}`)
                                      : game.platform === 'Steam' && game.id
                                        ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/header.jpg`
                                        : null;

                                  if (iconUrl) {
                                    return (
                                      <div className="relative w-7 h-7 shrink-0">
                                        <img
                                          src={iconUrl}
                                          alt=""
                                          className="w-7 h-7 rounded-lg object-cover bg-white/5 border border-white/10"
                                          onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            const steamUrl = game.platform === 'Steam' && game.id
                                              ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/header.jpg`
                                              : null;

                                            if (steamUrl && img.src !== steamUrl) {
                                              img.src = steamUrl;
                                            } else {
                                              img.style.display = 'none';
                                              const fallback = img.nextElementSibling as HTMLElement;
                                              if (fallback) fallback.style.display = 'flex';
                                            }
                                          }}
                                        />
                                        <div style={{ display: 'none' }} className="absolute inset-0 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green font-black text-[9px] uppercase tracking-wider shadow-[0_0_8px_rgba(118, 185, 0,0.1)]">
                                          {game.name.substring(0, 2)}
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="w-7 h-7 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green font-black text-[9px] uppercase tracking-wider shrink-0 shadow-[0_0_8px_rgba(118, 185, 0,0.1)]">
                                      {game.name.substring(0, 2)}
                                    </div>
                                  );
                                })()}
                                <span className="truncate max-w-[200px]" title={game.name}>{game.name}</span>
                              </div>
                            </td>
                            <td className="p-3 uppercase font-bold text-zinc-500 text-[8px]">{game.genre || 'N/A'}</td>
                            <td className="p-3">
                              {(() => {
                                const gpuCaps = state?.system_specs?.hardware?.gpu_capabilities;
                                const gpuNameStr = state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '';
                                const recPreset = getRecommendedPreset(features, game.genre, gpuCaps || gpuNameStr);
                                return (
                                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${recPreset.key === 'quality' ? 'bg-neon-green/10 border-neon-green/20 text-neon-green' :
                                    recPreset.key === 'performance' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                      recPreset.key === 'balanced' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                                        recPreset.key === 'latency' ? 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow' :
                                          'bg-zinc-800 border-zinc-700 text-zinc-400'
                                    }`}>
                                    {recPreset.title}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-3">
                              {(hasRtx || hasGtx) ? (
                                <div className="flex gap-1 flex-wrap max-w-[140px]">
                                  {[...rtxFeatures, ...gtxFeatures].slice(0, 3).map((f: string, i: number) => (
                                    <span key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${GPU_RTX_FEATURES.includes(f.toUpperCase())
                                      ? (isRtxGpu ? 'bg-neon-green/10 border-neon-green/20 text-neon-green' : 'bg-zinc-800 border-zinc-700 text-zinc-500')
                                      : 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow'
                                      }`}>
                                      {f}
                                    </span>
                                  ))}
                                  {([...rtxFeatures, ...gtxFeatures].length > 3) && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black border bg-zinc-800 border-zinc-700 text-zinc-500">
                                      +{([...rtxFeatures, ...gtxFeatures].length - 3)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-zinc-600 text-[9px]">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              {hasHdr ? (
                                <span className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-tighter">
                                  Supported
                                </span>
                              ) : (
                                <span className="text-zinc-600 text-[9px]">—</span>
                              )}
                            </td>
                            <td className="p-3 pr-5">
                              {hasRtx && isRtxGpu ? (
                                <span className="text-neon-yellow font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow animate-pulse" />
                                  RTX Active
                                </span>
                              ) : hasGtx && isNvidiaGpu ? (
                                <span className="text-neon-green font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                  GTX Active
                                </span>
                              ) : hasHdr ? (
                                <span className="text-violet-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                  HDR Optimised
                                </span>
                              ) : (
                                <span className="text-zinc-500 font-bold text-[9px] uppercase tracking-wider">
                                  Standard
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </SettingsSection>

        {/* Neural Brain & Memory */}
        <SettingsSection searchQuery={searchQuery} title="Neural Brain & Memory" icon={Brain}>
          <SettingsField label="Reasoning Intensity" description="Balance between strategic depth and processing speed.">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={localConfig.ai_agent?.reasoning_intensity || 0.8}
                onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, reasoning_intensity: parseFloat(e.target.value) } })}
                className="flex-1 accent-neon-green"
              />
              <span className="text-[10px] font-mono text-neon-green font-bold">
                {(localConfig.ai_agent?.reasoning_intensity || 0.8).toFixed(2)}
              </span>
            </div>
          </SettingsField>

          <SettingsField label="Memory Persistence" description="Allows the AI to remember your preferences and quest progress across sessions.">
            <div className="flex gap-4 items-center">
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => setLocalConfig({ ...localConfig, memory: { ...localConfig.memory, enabled: !localConfig.memory?.enabled } })}
                className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.memory?.enabled ? 'bg-neon-green' : 'bg-zinc-800'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute transition-all ${localConfig.memory?.enabled ? 'bg-black right-1' : 'bg-zinc-600 left-1'}`} />
              </div>

              <CustomSelect
                value={localConfig.memory?.mode || 'read_write'}
                onChange={(val) => setLocalConfig({ ...localConfig, memory: { ...localConfig.memory, mode: val } })}
                options={MEMORY_MODE_OPTIONS}
                size="sm"
                className="w-44"
              />
            </div>
          </SettingsField>

          <SettingsField label="Memory Save Path" description="Location where the AI stores mission logs and learned experiences.">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={localConfig.memory?.save_path || ''}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] font-mono text-neon-green focus:outline-none cursor-default"
                  placeholder="e.g. C:/MissionControl/memory.json"
                />
                <button aria-label="button" type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        setLocalConfig({ ...localConfig, memory: { ...localConfig.memory, save_path: `${desktopPath}/${file.name}` } });
                      }
                    };
                    input.click();
                  }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all"
                >
                  Browse
                </button>
              </div>
              <div className="flex gap-2">
                <button aria-label="button" type="button"
                  onClick={() => setLocalConfig({ ...localConfig, memory: { ...localConfig.memory, save_path: `${desktopPath}/Aero_Memory.json` } })}
                  className="text-[8px] font-bold text-neon-green/60 hover:text-neon-green transition-colors"
                >
                  Quick Set: Desktop
                </button>
                <button aria-label="button" type="button"
                  onClick={() => setLocalConfig({ ...localConfig, memory: { ...localConfig.memory, save_path: 'D:/MissionControl/Data/memory.json' } })}
                  className="text-[8px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Quick Set: Drive D:
                </button>
              </div>
            </div>
          </SettingsField>
        </SettingsSection>

        {/* Tactical Overlay */}
        <SettingsSection searchQuery={searchQuery} title="Tactical Overlay" icon={Target}>
          <SettingsField label="Lock HUD Position" description="Prevent accidental movement of the overlay. Unlock to drag to a new position.">
            <div className="flex items-center gap-3 select-none">
              <AnimatePresence mode="wait">
                <motion.span
                  key={localConfig.overlay?.lock_position === true ? 'locked' : 'unlocked'}
                  initial={{ opacity: 0, scale: 0.8, y: -2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 2 }}
                  transition={{ duration: 0.15 }}
                  className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${localConfig.overlay?.lock_position === true ? 'text-neon-green' : 'text-orange-400'}`}
                >
                  {localConfig.overlay?.lock_position === true ? (
                    <>
                      <Lock className="w-3 h-3 text-neon-green animate-pulse" />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-orange-400 animate-bounce" />
                      Unlocked
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const isCurrentlyLocked = localConfig.overlay?.lock_position === true;
                  const updatedOverlay = { ...localConfig.overlay, lock_position: !isCurrentlyLocked };
                  setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                  sendCommand('update_config', { overlay: updatedOverlay });
                }}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center relative ${localConfig.overlay?.lock_position === true
                  ? 'bg-neon-green/20 border border-neon-green/40 shadow-[0_0_10px_rgba(118, 185, 0,0.15)]'
                  : 'bg-orange-500/20 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.15)]'
                  }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`w-4 h-4 rounded-full flex items-center justify-center shadow-md ${localConfig.overlay?.lock_position === true ? 'bg-neon-green ml-auto' : 'bg-orange-400'
                    }`}
                >
                  {localConfig.overlay?.lock_position === true ? (
                    <Lock className="w-2.5 h-2.5 text-black" />
                  ) : (
                    <Unlock className="w-2.5 h-2.5 text-black" />
                  )}
                </motion.div>
              </div>
            </div>
          </SettingsField>

          <SettingsField label="Lock Agent Position" description="Prevent accidental movement of the agent popup. Unlock to drag to a new position.">
            <div className="flex items-center gap-3 select-none">
              <AnimatePresence mode="wait">
                <motion.span
                  key={localConfig.overlay?.lock_agent === true ? 'locked' : 'unlocked'}
                  initial={{ opacity: 0, scale: 0.8, y: -2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 2 }}
                  transition={{ duration: 0.15 }}
                  className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${localConfig.overlay?.lock_agent === true ? 'text-neon-green' : 'text-orange-400'}`}
                >
                  {localConfig.overlay?.lock_agent === true ? (
                    <>
                      <Lock className="w-3 h-3 text-neon-green animate-pulse" />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-orange-400 animate-bounce" />
                      Unlocked
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const isCurrentlyLocked = localConfig.overlay?.lock_agent === true;
                  const updatedOverlay = { ...localConfig.overlay, lock_agent: !isCurrentlyLocked };
                  setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                  sendCommand('update_config', { overlay: updatedOverlay });
                }}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center relative ${localConfig.overlay?.lock_agent === true
                  ? 'bg-neon-green/20 border border-neon-green/40 shadow-[0_0_10px_rgba(118, 185, 0,0.15)]'
                  : 'bg-orange-500/20 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.15)]'
                  }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`w-4 h-4 rounded-full flex items-center justify-center shadow-md ${localConfig.overlay?.lock_agent === true ? 'bg-neon-green ml-auto' : 'bg-orange-400'
                    }`}
                >
                  {localConfig.overlay?.lock_agent === true ? (
                    <Lock className="w-2.5 h-2.5 text-black" />
                  ) : (
                    <Unlock className="w-2.5 h-2.5 text-black" />
                  )}
                </motion.div>
              </div>
            </div>
          </SettingsField>

          <SettingsField label="HUD Layout Preset" description="Select a preset layout position to automatically snap the overlay to a screen corner.">
            <CustomSelect
              value={localConfig.overlay?.layout || 'top-left'}
              onChange={(val) => {
                const updatedOverlay = { ...localConfig.overlay, layout: val, x: null, y: null };
                setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                sendCommand('update_config', { overlay: updatedOverlay });
              }}
              options={HUD_LAYOUT_OPTIONS}
            />
          </SettingsField>

          <SettingsField label="HUD Layout Design" description="Select the visual layout of your HUD overlay (similar to Omen Gaming Hub styles).">
            <CustomSelect
              value={localConfig.overlay?.layout_style || 'standard'}
              onChange={(val) => {
                const updatedOverlay = { ...localConfig.overlay, layout_style: val, x: null, y: null };
                setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                sendCommand('update_config', { overlay: updatedOverlay });
              }}
              options={HUD_LAYOUT_STYLE_OPTIONS}
            />
          </SettingsField>

          <SettingsField label="HUD Scaling" description="Fine-tune the font size and overall scale of the tactical overlay.">
            <div className="flex items-center gap-4 select-none">
              <button aria-label="button" type="button"
                onClick={() => {
                  const newSize = Math.max(6, (localConfig.overlay?.font_size || 11) - 1);
                  const updatedOverlay = { ...localConfig.overlay, font_size: newSize };
                  setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                  sendCommand('update_config', { overlay: updatedOverlay });
                }}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-neon-green/30 text-white hover:text-neon-green font-bold transition-all cursor-pointer"
              >
                -
              </button>
              <div className="flex-1 text-center py-2 bg-black/20 border border-white/5 rounded-xl">
                <motion.span
                  key={localConfig.overlay?.font_size || 11}
                  initial={{ scale: 0.75, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 12 }}
                  className="text-[11px] font-mono font-black text-neon-green inline-block"
                >
                  {localConfig.overlay?.font_size || 11}pt
                </motion.span>
              </div>
              <button aria-label="button" type="button"
                onClick={() => {
                  const newSize = Math.min(32, (localConfig.overlay?.font_size || 11) + 1);
                  const updatedOverlay = { ...localConfig.overlay, font_size: newSize };
                  setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                  sendCommand('update_config', { overlay: updatedOverlay });
                }}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-neon-green/30 text-white hover:text-neon-green font-bold transition-all cursor-pointer"
              >
                +
              </button>
            </div>
          </SettingsField>

          <SettingsField label="Search Intelligence HUD" description="Show real-time web search status and AI reasoning queries on the overlay.">
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-black uppercase ${localConfig.overlay?.show_search_hud !== false ? 'text-neon-green' : 'text-zinc-500'}`}>
                {localConfig.overlay?.show_search_hud !== false ? 'Enabled' : 'Disabled'}
              </span>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const newVal = localConfig.overlay?.show_search_hud === false;
                  const updatedOverlay = { ...localConfig.overlay, show_search_hud: newVal };
                  setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                  sendCommand('update_config', { overlay: updatedOverlay });
                }}
                className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.overlay?.show_search_hud !== false ? 'bg-neon-green' : 'bg-zinc-800'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute transition-all ${localConfig.overlay?.show_search_hud !== false ? 'bg-black right-1' : 'bg-black left-1'}`} />
              </div>
            </div>
          </SettingsField>

          <SettingsField label="Auto-Spawn HUD" description="Automatically spawn the tactical overlay HUD when a game becomes active.">
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-black uppercase ${localConfig.overlay?.auto_spawn !== false ? 'text-neon-green' : 'text-zinc-500'}`}>
                {localConfig.overlay?.auto_spawn !== false ? 'Enabled' : 'Disabled'}
              </span>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const newVal = localConfig.overlay?.auto_spawn === false;
                  const updatedOverlay = { ...localConfig.overlay, auto_spawn: newVal };
                  setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                  sendCommand('update_config', { overlay: updatedOverlay });
                }}
                className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.overlay?.auto_spawn !== false ? 'bg-neon-green' : 'bg-zinc-800'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute transition-all ${localConfig.overlay?.auto_spawn !== false ? 'bg-black right-1' : 'bg-black left-1'}`} />
              </div>
            </div>
          </SettingsField>

          <SettingsField label="Skip Admin Privilege Check" description="Do not prompt for Administrator privileges on startup. Note: CPU temp/wattage sensors may be restricted.">
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-black uppercase ${localConfig.overlay?.skip_admin_prompt === true ? 'text-neon-green' : 'text-zinc-500'}`}>
                {localConfig.overlay?.skip_admin_prompt === true ? 'Enabled' : 'Disabled'}
              </span>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const newVal = localConfig.overlay?.skip_admin_prompt !== true;
                  const updatedOverlay = { ...localConfig.overlay, skip_admin_prompt: newVal };
                  setLocalConfig({ ...localConfig, overlay: updatedOverlay });
                  sendCommand('update_config', { overlay: updatedOverlay });
                }}
                className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.overlay?.skip_admin_prompt === true ? 'bg-neon-green' : 'bg-zinc-800'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute transition-all ${localConfig.overlay?.skip_admin_prompt === true ? 'bg-black right-1' : 'bg-black left-1'}`} />
              </div>
            </div>
          </SettingsField>
        </SettingsSection>

        {/* Hotkeys & Voice */}
        <SettingsSection searchQuery={searchQuery} title="Hotkeys & Interface" icon={Keyboard}>
          <SettingsField label="Toggle HUD" description="Shortcut to show/hide the tactical overlay.">
            <HotkeyRecorder
              value={localConfig.hotkeys?.toggle_hud || ''}
              onChange={(val) => setLocalConfig({ ...localConfig, hotkeys: { ...localConfig.hotkeys, toggle_hud: val } })}
            />
          </SettingsField>

          <SettingsField label="Agentic Toggle" description="Activate/Deactivate the autonomous agent.">
            <HotkeyRecorder
              value={localConfig.hotkeys?.toggle_agentic || ''}
              onChange={(val) => setLocalConfig({ ...localConfig, hotkeys: { ...localConfig.hotkeys, toggle_agentic: val } })}
            />
          </SettingsField>

          <SettingsField label="Toggle Mic" description="Shortcut to toggle voice recognition on/off.">
            <HotkeyRecorder
              value={localConfig.hotkeys?.toggle_mic || ''}
              onChange={(val) => setLocalConfig({ ...localConfig, hotkeys: { ...localConfig.hotkeys, toggle_mic: val } })}
            />
          </SettingsField>

          <SettingsField label="Voice Profile" description="Select the vocal characteristics and engine for the AI assistant.">
            <CustomSelect
              value={localConfig.ai_agent?.speech_provider || 'google'}
              onChange={(val) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, speech_provider: val } })}
              options={SPEECH_PROVIDER_OPTIONS}
            />
          </SettingsField>

          <SettingsField label="Voice Synthesis (TTS)" description="Allow the AI Co-pilot to speak tactical advice and story translations. Toggle off to mute completely.">
            <div className="flex items-center gap-3 select-none">
              <AnimatePresence mode="wait">
                <motion.span
                  key={localConfig.voice?.enabled !== false ? 'enabled' : 'disabled'}
                  initial={{ opacity: 0, scale: 0.8, y: -2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 2 }}
                  transition={{ duration: 0.15 }}
                  className={`text-[9px] font-black uppercase tracking-wider ${localConfig.voice?.enabled !== false ? 'text-neon-green' : 'text-zinc-500'}`}
                >
                  {localConfig.voice?.enabled !== false ? 'Enabled' : 'Disabled'}
                </motion.span>
              </AnimatePresence>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const newVal = localConfig.voice?.enabled === false;
                  const updatedVoice = { ...localConfig.voice, enabled: newVal };
                  setLocalConfig({ ...localConfig, voice: updatedVoice });
                  sendCommand('update_config', { voice: updatedVoice });
                }}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center relative ${localConfig.voice?.enabled !== false
                  ? 'bg-neon-green/20 border border-neon-green/40 shadow-[0_0_10px_rgba(118, 185, 0,0.15)]'
                  : 'bg-zinc-800 border border-zinc-700'
                  }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`w-4 h-4 rounded-full shadow-md ${localConfig.voice?.enabled !== false ? 'bg-neon-green ml-auto' : 'bg-zinc-500'
                    }`}
                />
              </div>
            </div>
          </SettingsField>
        </SettingsSection>

        {/* Agent Training & Prompts */}
        <SettingsSection searchQuery={searchQuery} title="Agent Training & Prompts" icon={Brain}>
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Customize how your AI agent speaks, greets, and behaves. All fields support template variables shown in
              {' '}<span className="font-mono text-neon-green/80">{'{braces}'}</span>.
              Leave a field blank to use the built-in defaults.
            </p>
          </div>

          {/* Welcome Greeting */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Welcome Greeting Prompt</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Instruction sent to the AI when a new chat session is created. Controls the tone of the opening message.</p>
            <textarea
              id="prompt-welcome"
              rows={4}
              value={localConfig.ai_agent?.prompts?.welcome_prompt || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, welcome_prompt: e.target.value } } })}
              placeholder="Greet the user as their AI Gaming Assistant. Give a very brief, friendly welcome message..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          {/* Welcome Fallback */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Welcome Fallback Message</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Static message shown if the AI model fails to generate a welcome reply.</p>
            <textarea
              id="prompt-welcome-fallback"
              rows={3}
              value={localConfig.ai_agent?.prompts?.welcome_fallback || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, welcome_fallback: e.target.value } } })}
              placeholder="Neural Link established. I am your Agentic AI Assistant..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          {/* Session Titling */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Session Titling Prompt</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Prompt used to auto-generate chat session titles. Use{' '}
              <span className="font-mono text-neon-green/80">{'{conversation}'}</span> to inject conversation text.
            </p>
            <textarea
              id="prompt-session-title"
              rows={4}
              value={localConfig.ai_agent?.prompts?.session_title_prompt || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, session_title_prompt: e.target.value } } })}
              placeholder="You are a session titling AI. Generate a concise, extremely short title (maximum 3 words)..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          {/* System Access */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">System Access Integration Prompt</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Appended to every LLM prompt when Agentic Mode is active. Defines available system commands and launcher behavior.
            </p>
            <textarea
              id="prompt-system-access"
              rows={8}
              value={localConfig.ai_agent?.prompts?.system_access_instruction || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, system_access_instruction: e.target.value } } })}
              placeholder="AGENTIC PERMISSION: The user has enabled 'Agentic AI Mode'..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          {/* Greetings */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Inactive Greeting (Desktop)</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Response when user says hi and no game is active (and games are scanned). Variables:{' '}
              <span className="font-mono text-neon-green/80">{'{count_games}'}</span>
            </p>
            <textarea
              id="prompt-inactive-greeting-desktop"
              rows={3}
              value={localConfig.ai_agent?.prompts?.inactive_greeting_desktop || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, inactive_greeting_desktop: e.target.value } } })}
              placeholder="Hello! I am your AI Gaming Assistant. I see you have {count_games} games installed..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Inactive Greeting Fallback</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Shown when user says hi with no game active and no library scanned.</p>
            <textarea
              id="prompt-inactive-greeting-fallback"
              rows={2}
              value={localConfig.ai_agent?.prompts?.inactive_greeting_desktop_fallback || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, inactive_greeting_desktop_fallback: e.target.value } } })}
              placeholder="Hello! How can I help you today? Is there any problem or anything you'd like to optimize?"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">In-Game Active Greeting</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
              Response when user says hi while a game is running. Variables:{' '}
              <span className="font-mono text-neon-green/80">{'{game_display}'}</span>,{' '}
              <span className="font-mono text-neon-green/80">{'{health_pct}'}</span>,{' '}
              <span className="font-mono text-neon-green/80">{'{ammo}'}</span>,{' '}
              <span className="font-mono text-neon-green/80">{'{position}'}</span>,{' '}
              <span className="font-mono text-neon-green/80">{'{enemies}'}</span>
            </p>
            <textarea
              id="prompt-active-greeting"
              rows={3}
              value={localConfig.ai_agent?.prompts?.active_greeting_game || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, active_greeting_game: e.target.value } } })}
              placeholder="Agent Panel: Active Welcome, Agent. I'm actively monitoring your gameplay in **{game_display}**!..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          {/* Brevity Rules */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Voice / Brevity Rules (Concise)</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Instructions appended to voice/chat prompts for short responses.</p>
            <textarea
              id="prompt-brevity-concise"
              rows={3}
              value={localConfig.ai_agent?.prompts?.brevity_concise || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, brevity_concise: e.target.value } } })}
              placeholder="You MUST be extremely concise, brief, and to the point..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Detailed Response Rules</p>
            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Instructions used when the user asks to elaborate (e.g. replies "yes").</p>
            <textarea
              id="prompt-brevity-detailed"
              rows={2}
              value={localConfig.ai_agent?.prompts?.brevity_detailed || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, ai_agent: { ...localConfig.ai_agent, prompts: { ...localConfig.ai_agent?.prompts, brevity_detailed: e.target.value } } })}
              placeholder="Provide a comprehensive, detailed, and clear explanation of the topic..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
            />
          </div>

          {/* Personality Profiles */}
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-neon-green uppercase tracking-widest mb-1">Personality Profiles</p>
              <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
                System instructions for each personality. The active personality is selected in the AI Engine section above.
              </p>
            </div>
            {(['tactical', 'friendly', 'immersive', 'sarcastic', 'aggressive'] as const).map((key) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${localConfig.ai_agent?.personality === key
                    ? 'bg-neon-green/15 border-neon-green/40 text-neon-green'
                    : 'bg-white/3 border-white/10 text-zinc-500'
                    }`}>
                    {key}
                  </span>
                  {localConfig.ai_agent?.personality === key && (
                    <span className="text-[8px] font-bold text-neon-green/70 uppercase tracking-wider">● Active</span>
                  )}
                </div>
                <textarea
                  id={`prompt-personality-${key}`}
                  rows={2}
                  value={localConfig.ai_agent?.prompts?.personalities?.[key] || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    ai_agent: {
                      ...localConfig.ai_agent,
                      prompts: {
                        ...localConfig.ai_agent?.prompts,
                        personalities: {
                          ...localConfig.ai_agent?.prompts?.personalities,
                          [key]: e.target.value
                        }
                      }
                    }
                  })}
                  placeholder={`System instruction for ${key} personality...`}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Reset to defaults */}
          <div className="pt-2 border-t border-white/5">
            <button
              id="btn-reset-prompts"
              type="button"
              aria-label="Reset all prompts to defaults"
              onClick={() => setLocalConfig({
                ...localConfig,
                ai_agent: {
                  ...localConfig.ai_agent,
                  prompts: {}
                }
              })}
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              Reset All Prompts to Defaults
            </button>
          </div>
        </SettingsSection>

        {/* Library & Game Discovery */}
        <SettingsSection searchQuery={searchQuery} title="Library & Game Discovery" icon={Folder}>
          <SettingsField
            label="Custom Scan Locations"
            description="Specify custom directory paths where the launcher scanner will discover your installed games and applications (e.g. D:/Games)."
          >
            <div className="space-y-4 w-full">
              {/* Existing scan folders list */}
              <div className="space-y-2">
                {(localConfig.scanner?.custom_scan_dirs || []).length === 0 ? (
                  <p className="text-[10px] text-zinc-500 italic py-1">No custom locations added. Using default Program Files and launcher registries.</p>
                ) : (
                  (localConfig.scanner?.custom_scan_dirs || []).map((dir: string, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-3 bg-black/30 border border-white/5 rounded-xl px-3 py-2">
                      <span className="text-[10px] font-mono text-neon-green truncate max-w-50" title={dir}>{dir}</span>
                      <button aria-label="button" type="button"
                        onClick={() => handleRemoveDir(dir)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                        title="Remove Location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add folder controls */}
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={newDirInput}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-[10px] font-mono text-neon-green focus:outline-none placeholder-zinc-600 cursor-default"
                  placeholder="e.g. D:/Games"
                />

                {/* Browse folder button */}
                {(window as any).electronAPI?.selectDirectory && (
                  <button aria-label="button" type="button"
                    onClick={handleBrowseDir}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-white/10 hover:text-white transition-all text-zinc-400"
                  >
                    Browse
                  </button>
                )}
              </div>
            </div>
          </SettingsField>

          <SettingsField
            label="App Storage Location"
            description="Specify the primary directory where Mission Control stores neural caches, game profiles, and user telemetry data. (Requires restart to fully apply)"
          >
            <div className="flex gap-2 w-full">
              <input
                type="text"
                readOnly
                value={localConfig.system?.app_data_path || `${desktopPath}/Mission-Control/Gaming`}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-[10px] font-mono text-neon-green focus:outline-none cursor-default truncate"
                title={localConfig.system?.app_data_path || `${desktopPath}/Mission-Control/Gaming`}
              />
              {(window as any).electronAPI?.selectDirectory && (
                <button aria-label="button" type="button"
                  onClick={async () => {
                    const result = await (window as any).electronAPI.selectDirectory();
                    if (result && !result.canceled && result.filePaths.length > 0) {
                      const newPath = result.filePaths[0].replace(/\\/g, '/');
                      const updatedSystem = { ...localConfig.system, app_data_path: newPath };
                      setLocalConfig({ ...localConfig, system: updatedSystem });
                      sendCommand('update_config', { system: updatedSystem });
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-white/10 hover:text-white transition-all text-zinc-400 shrink-0"
                >
                  Change
                </button>
              )}
            </div>
          </SettingsField>

          <SettingsField
            label="Launch on System Startup"
            description="Start Mission Control automatically when you log into Windows."
          >
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-black uppercase ${localConfig.system?.open_at_login === true ? 'text-neon-green' : 'text-zinc-500'}`}>
                {localConfig.system?.open_at_login === true ? 'Enabled' : 'Disabled'}
              </span>
              <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() => {
                  const newVal = localConfig.system?.open_at_login !== true;
                  const updatedSystem = { ...localConfig.system, open_at_login: newVal };
                  setLocalConfig({ ...localConfig, system: updatedSystem });
                  if ((window as any).electronAPI?.saveSettings) {
                    (window as any).electronAPI.saveSettings({ ...localConfig, system: updatedSystem });
                  }
                  sendCommand('update_config', { system: updatedSystem });
                }}
                className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${localConfig.system?.open_at_login === true ? 'bg-neon-green' : 'bg-zinc-800'}`}
              >
                <div className={`w-4 h-4 rounded-full absolute transition-all ${localConfig.system?.open_at_login === true ? 'bg-black right-1' : 'bg-black left-1'}`} />
              </div>
            </div>
          </SettingsField>

          <SettingsField
            label="Desktop Shortcut"
            description="Re-create or update the Mission Control shortcut on your Desktop."
          >
            <button aria-label="button" type="button"
              onClick={async () => {
                if ((window as any).electronAPI?.createDesktopShortcut) {
                  const res = await (window as any).electronAPI.createDesktopShortcut();
                  if (res) {
                    alert('Desktop shortcut created successfully.');
                  } else {
                    alert('Failed to create desktop shortcut.');
                  }
                } else {
                  alert('Shortcut creation only supported on Windows packaged builds.');
                }
              }}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-white/10 hover:text-white transition-all text-zinc-400"
            >
              Create Shortcut
            </button>
          </SettingsField>

        </SettingsSection>



      </div>
    </div>
  );
};

export default SettingsPage;
