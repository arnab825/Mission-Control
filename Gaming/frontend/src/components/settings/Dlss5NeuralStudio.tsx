import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Layers,
  Zap,
  Target,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
  Activity,
  Maximize2
} from 'lucide-react';
import {
  DLSS5_AESTHETIC_STYLES,
  DYNAMIC_MFG_MODES,
  TARGET_RESOLUTIONS,
  NR_INPUT_SCALE_OPTIONS
} from '../../data/settingsConstants';

interface Dlss5NeuralStudioProps {
  currentTuning: any;
  updateGpuTuning: (updates: any) => void;
  isAdvancedGpu: boolean;
  onShowDlssGuide: () => void;
}

export const Dlss5NeuralStudio: React.FC<Dlss5NeuralStudioProps> = ({
  currentTuning,
  updateGpuTuning,
  isAdvancedGpu,
  onShowDlssGuide
}) => {
  const gamingFeatures = currentTuning.gaming_features || {};
  const isDlss5Active = gamingFeatures.dlss && gamingFeatures.dlss_version === 'DLSS 5';

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'style' | 'mfg' | 'resolution'>('style');

  // Values from config with resilient defaults
  const activeStyleId = gamingFeatures.dlss5_aesthetic_style || 'cinematic';
  const styleIntensity = typeof gamingFeatures.dlss5_style_intensity === 'number' ? gamingFeatures.dlss5_style_intensity : 75;
  const detailRecon = typeof gamingFeatures.dlss5_detail_reconstruction === 'number' ? gamingFeatures.dlss5_detail_reconstruction : 85;
  const temporalDenoise = typeof gamingFeatures.dlss5_temporal_denoising === 'number' ? gamingFeatures.dlss5_temporal_denoising : 90;
  const neuralPolish = typeof gamingFeatures.dlss5_neural_polish === 'number' ? gamingFeatures.dlss5_neural_polish : 70;

  const dynamicMfgMode = gamingFeatures.dynamic_mfg_mode || 'dynamic_adaptive';
  const targetResId = gamingFeatures.dlss5_target_resolution || 'native';
  const nrInputScaleId = gamingFeatures.dlss5_nr_input_scale || 'performance';
  const prepareNrInput = gamingFeatures.dlss5_prepare_nr_input ?? true;
  const motionVectorsConditioning = gamingFeatures.dlss5_motion_vectors_conditioning ?? true;
  const geometryNormalBuffer = gamingFeatures.dlss5_geometry_normal_buffer ?? true;
  const specularAlbedoSeparation = gamingFeatures.dlss5_specular_albedo_separation ?? true;

  // Helper to update specific gaming feature field
  const updateFeature = (key: string, value: any) => {
    updateGpuTuning((t: any) => ({
      gaming_features: {
        ...(t.gaming_features || {}),
        [key]: value
      }
    }));
  };

  // Reset to DLSS 5 defaults
  const handleResetDefaults = () => {
    updateGpuTuning((t: any) => ({
      gaming_features: {
        ...(t.gaming_features || {}),
        dlss5_aesthetic_style: 'cinematic',
        dlss5_style_intensity: 75,
        dlss5_detail_reconstruction: 85,
        dlss5_temporal_denoising: 90,
        dlss5_neural_polish: 70,
        dynamic_mfg_mode: 'dynamic_adaptive',
        dlss5_target_resolution: 'native',
        dlss5_nr_input_scale: 'performance',
        dlss5_prepare_nr_input: true,
        dlss5_motion_vectors_conditioning: true,
        dlss5_geometry_normal_buffer: true,
        dlss5_specular_albedo_separation: true
      }
    }));
  };

  // Resolution math calculation for Prepare NR Input
  const targetResObj = TARGET_RESOLUTIONS.find((r) => r.id === targetResId) || TARGET_RESOLUTIONS[0];
  const nrScaleObj = NR_INPUT_SCALE_OPTIONS.find((s) => s.id === nrInputScaleId) || NR_INPUT_SCALE_OPTIONS[1];

  const baseWidth = targetResObj.width > 0 ? targetResObj.width : 3840;
  const baseHeight = targetResObj.height > 0 ? targetResObj.height : 2160;

  const inputWidth = Math.round((baseWidth * nrScaleObj.scalePercent) / 100);
  const inputHeight = Math.round((baseHeight * nrScaleObj.scalePercent) / 100);
  const inputMegaPixels = ((inputWidth * inputHeight) / 1_000_000).toFixed(2);
  const targetMegaPixels = ((baseWidth * baseHeight) / 1_000_000).toFixed(2);
  const synthesisMultiplier = ((baseWidth * baseHeight) / (inputWidth * inputHeight)).toFixed(1);

  const activeStyleObj = DLSS5_AESTHETIC_STYLES.find((s) => s.id === activeStyleId) || DLSS5_AESTHETIC_STYLES[0];
  const activeMfgObj = DYNAMIC_MFG_MODES.find((m) => m.id === dynamicMfgMode) || DYNAMIC_MFG_MODES[0];

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isDlss5Active
          ? 'bg-linear-to-b from-purple-950/25 via-[#0b0914] to-black/60 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.12)] ring-1 ring-purple-500/20'
          : 'bg-[#08080c]/80 border-white/10 hover:border-white/15'
      }`}
    >
      {/* Studio Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>NVIDIA DLSS 5 Neural Rendering Studio</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[8px] font-mono font-black uppercase tracking-widest">
                World Synthesis Engine
              </span>
              {isDlss5Active && (
                <span className="px-2 py-0.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[8px] font-mono font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  Active Selection
                </span>
              )}
              {!isAdvancedGpu && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-mono font-bold uppercase tracking-wider">
                  Advisory Mode (Non-RTX GPU)
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-0.5">
              Continuous neural representation replacing traditional rasterization with real-time diffusion transformers, aesthetic transfer, and dynamic multi frame generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={onShowDlssGuide}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            title="Read complete DLSS 5 architecture documentation"
          >
            <BookOpen className="w-3 h-3 text-purple-400" />
            <span>Architecture Guide</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse DLSS 5 Studio' : 'Expand DLSS 5 Studio'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Navigation Tabs for Studio Sub-Sections */}
          <div className="flex items-center gap-2 p-1 bg-black/40 border border-white/5 rounded-xl overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('style')}
              className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'style'
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Aesthetics & Sliders</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mfg')}
              className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'mfg'
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Dynamic Multi Frame Gen</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resolution')}
              className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'resolution'
                  ? 'bg-neon-green/20 border border-neon-green/40 text-neon-green shadow-[0_0_12px_rgba(118,185,0,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-neon-green" />
              <span>Target Res & Prepare NR</span>
            </button>
          </div>

          {/* TAB 1: Aesthetic Styles & Fine-Tuning Intensity Sliders */}
          {activeTab === 'style' && (
            <div className="space-y-6">
              {/* Section 1: Aesthetic Styles Grid */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Neural Rendering Aesthetic Styles</span>
                    </h5>
                    <p className="text-[9px] text-zinc-500">
                      Select how the real-time diffusion model conditions tone curves, specular highlights, and chromatic balance.
                    </p>
                  </div>
                  <span className="text-[8.5px] font-mono text-purple-300 font-bold bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20 self-start sm:self-auto">
                    Active: {activeStyleObj.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DLSS5_AESTHETIC_STYLES.map((style) => {
                    const isSelected = activeStyleId === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => updateFeature('dlss5_aesthetic_style', style.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30'
                            : 'bg-white/2 border-white/5 text-zinc-400 hover:bg-white/4 hover:border-white/10 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-white">
                              {style.name}
                            </span>
                            <span
                              className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${style.accentColor}`}
                            >
                              {style.badge}
                            </span>
                          </div>
                          <p className="text-[8.5px] font-medium text-zinc-400 leading-relaxed mb-2">
                            {style.subtitle}
                          </p>
                          <p className="text-[8px] text-zinc-500 leading-normal line-clamp-2">
                            {style.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-zinc-400">
                          <span>Style Influence: {styleIntensity}%</span>
                          {isSelected && <Check className="w-3 h-3 text-purple-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Fine-Tuning Intensity Sliders */}
              <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-white/5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Fine-Tuning Intensity Sliders</span>
                    </h5>
                    <p className="text-[9px] text-zinc-500">
                      Calibrate neural model reconstruction weights, geometry sharpness, and temporal filters.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-[8.5px] font-mono font-bold text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
                    title="Reset all fine-tuning sliders to factory calibrated defaults"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Slider 1: Aesthetic Style Intensity */}
                  <div className="space-y-2 p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-200">
                        Neural Aesthetic Style Intensity
                      </label>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-mono font-black">
                        {styleIntensity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={styleIntensity}
                      onChange={(e) => updateFeature('dlss5_style_intensity', parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest">
                      <span>0% (Raw Engine Shading)</span>
                      <span>50% (Balanced Blend)</span>
                      <span>100% (Pure Neural Style)</span>
                    </div>
                    <p className="text-[8px] text-zinc-400 leading-normal pt-1">
                      Blends between standard rasterized pipeline output and the selected neural aesthetic color matrix.
                    </p>
                  </div>

                  {/* Slider 2: Micro-Detail Reconstruction */}
                  <div className="space-y-2 p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-200">
                        Detail & Geometry Reconstruction
                      </label>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[9px] font-mono font-black">
                        {detailRecon}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={detailRecon}
                      onChange={(e) => updateFeature('dlss5_detail_reconstruction', parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest">
                      <span>0% (Soft Edges)</span>
                      <span>85% (Calibrated)</span>
                      <span>100% (Extreme Micro-Detail)</span>
                    </div>
                    <p className="text-[8px] text-zinc-400 leading-normal pt-1">
                      Controls Tensor-Core micro-geometry synthesis, surface porosity, and high-frequency texture hallucination.
                    </p>
                  </div>

                  {/* Slider 3: Temporal Denoising & Anti-Ghosting */}
                  <div className="space-y-2 p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-200">
                        Temporal Denoising & Anti-Ghosting
                      </label>
                      <span className="px-2 py-0.5 rounded bg-neon-green/20 border border-neon-green/30 text-neon-green text-[9px] font-mono font-black">
                        {temporalDenoise}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={temporalDenoise}
                      onChange={(e) => updateFeature('dlss5_temporal_denoising', parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-neon-green"
                    />
                    <div className="flex justify-between text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest">
                      <span>0% (Raw Grain)</span>
                      <span>90% (Zero Ghosting)</span>
                      <span>100% (Max Temporal Smooth)</span>
                    </div>
                    <p className="text-[8px] text-zinc-400 leading-normal pt-1">
                      Normalizes sub-pixel optical flow vectors to eliminate thin-line shimmer and trailing artifacts behind fast actors.
                    </p>
                  </div>

                  {/* Slider 4: Neural Polish & Specular Refinement */}
                  <div className="space-y-2 p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-200">
                        Neural Polish & Specular Refinement
                      </label>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-mono font-black">
                        {neuralPolish}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={neuralPolish}
                      onChange={(e) => updateFeature('dlss5_neural_polish', parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest">
                      <span>0% (Subdued Sheen)</span>
                      <span>70% (Filmic Gloss)</span>
                      <span>100% (High Specular Lustre)</span>
                    </div>
                    <p className="text-[8px] text-zinc-400 leading-normal pt-1">
                      Refines path-traced glossy reflections, subsurface skin scattering, and chromatic reflection dispersion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Dynamic Multi Frame Generation Modes */}
          {activeTab === 'mfg' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    <span>Dynamic Multi Frame Generation (DMFG) Modes</span>
                  </h5>
                  <p className="text-[9px] text-zinc-500">
                    Control how many AI frames are generated per conventionally rendered frame and pacing strategies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8.5px] font-mono text-blue-300 font-bold bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    Mode: {activeMfgObj.multiplier}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DYNAMIC_MFG_MODES.map((mode) => {
                  const isSelected = dynamicMfgMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        updateFeature('dynamic_mfg_mode', mode.id);
                        // Also sync to parent frame_gen_multiplier if applicable
                        if (mode.id === 'fixed_2x') updateFeature('frame_gen_multiplier', '2x');
                        else if (mode.id === 'fixed_3x') updateFeature('frame_gen_multiplier', '3x');
                        else if (mode.id === 'fixed_4x') updateFeature('frame_gen_multiplier', '4x');
                        else if (mode.id === 'fixed_6x') updateFeature('frame_gen_multiplier', '6x');
                        else updateFeature('frame_gen_multiplier', 'Dynamic');
                      }}
                      className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                        isSelected
                          ? 'bg-blue-950/30 border-blue-500/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/30'
                          : 'bg-white/2 border-white/5 text-zinc-400 hover:bg-white/4 hover:border-white/10 hover:text-zinc-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-white">
                            {mode.name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[8px] font-mono font-black uppercase">
                            {mode.multiplier}
                          </span>
                        </div>
                        <p className="text-[8.5px] text-zinc-400 leading-relaxed mb-3">
                          {mode.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[8px] font-mono">
                        <span className="text-zinc-500">{mode.latencyNote}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Telemetry Footprint */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[9px]">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="font-black text-white uppercase tracking-wider block">
                      Reflex Latency Auto-Synchronization
                    </span>
                    <span className="text-zinc-500 text-[8.5px]">
                      Pacing queues are continually balanced against display V-Sync interrupts to eliminate judder.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase">Input Latency Delta</span>
                    <span className="text-[9px] font-mono font-bold text-neon-green">-42% vs Unsynchronized FG</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Target Resolution & Prepare NR Input */}
          {activeTab === 'resolution' && (
            <div className="space-y-5">
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-neon-green" />
                  <span>Target Resolution & Prepare NR Input Pipeline</span>
                </h5>
                <p className="text-[9px] text-zinc-500">
                  Configure internal rasterized render buffers and the neural super-resolution reconstruction target.
                </p>
              </div>

              {/* Live Synthesizer Math Visualizer */}
              <div className="p-4 sm:p-5 rounded-xl bg-linear-to-r from-neon-green/10 via-black/40 to-purple-950/20 border border-neon-green/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-neon-green flex items-center gap-1.5">
                    <Maximize2 className="w-3 h-3" />
                    Real-Time Buffer Synthesis Math
                  </span>
                  <span className="text-[8.5px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded border border-white/5">
                    Scale Factor: {nrScaleObj.scaleFraction}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
                  {/* Input Side */}
                  <div className="p-3 rounded-lg bg-black/60 border border-white/5 text-center w-full md:w-auto flex-1">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                      Prepare NR Input Buffer
                    </span>
                    <div className="text-sm font-black font-mono text-cyan-300">
                      {inputWidth} × {inputHeight}
                    </div>
                    <span className="text-[8px] font-mono text-zinc-400">
                      {inputMegaPixels} Megapixels / frame
                    </span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-[8.5px] font-mono font-black text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                      {synthesisMultiplier}X Neural Synthesis Boost
                    </span>
                    <span className="text-[7.5px] font-mono text-zinc-500 mt-1">
                      Tensor Core Diffusion
                    </span>
                  </div>

                  {/* Target Output Side */}
                  <div className="p-3 rounded-lg bg-black/60 border border-neon-green/30 text-center w-full md:w-auto flex-1">
                    <span className="text-[8px] font-mono text-neon-green uppercase tracking-widest block mb-1">
                      Target Display Output
                    </span>
                    <div className="text-sm font-black font-mono text-white">
                      {baseWidth} × {baseHeight}
                    </div>
                    <span className="text-[8px] font-mono text-zinc-400">
                      {targetMegaPixels} Megapixels ({targetResObj.aspect})
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Resolution Selector */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                  <span>Target Display Output Resolution</span>
                  <span className="font-mono text-[8px] text-zinc-500">Selected: {targetResObj.name}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {TARGET_RESOLUTIONS.map((res) => {
                    const isSelected = targetResId === res.id;
                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => updateFeature('dlss5_target_resolution', res.id)}
                        className={`p-2.5 rounded-xl border text-left text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-neon-green/20 border-neon-green/50 text-neon-green shadow-[0_0_10px_rgba(118,185,0,0.15)]'
                            : 'bg-white/2 border-white/5 text-zinc-400 hover:bg-white/4 hover:text-zinc-200'
                        }`}
                      >
                        <span className="truncate">{res.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-neon-green shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prepare NR Input Scaling Selector */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                  <span>Prepare NR Input Resolution Scale (Internal Buffer)</span>
                  <span className="font-mono text-[8px] text-zinc-500">
                    Active: {nrScaleObj.name} ({nrScaleObj.scaleFraction})
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {NR_INPUT_SCALE_OPTIONS.map((scale) => {
                    const isSelected = nrInputScaleId === scale.id;
                    return (
                      <button
                        key={scale.id}
                        type="button"
                        onClick={() => updateFeature('dlss5_nr_input_scale', scale.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/50 text-white shadow-[0_0_12px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20'
                            : 'bg-white/2 border-white/5 text-zinc-400 hover:bg-white/4 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-white">
                              {scale.name}
                            </span>
                            <span className="text-[8px] font-mono text-purple-300 font-bold">
                              {scale.scaleFraction}
                            </span>
                          </div>
                          <p className="text-[8px] text-zinc-400 leading-normal">
                            {scale.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prepare NR Input Prepass Conditioning Toggles */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-200">
                      Prepare NR Input Prepass Buffers & Conditioning
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateFeature('dlss5_prepare_nr_input', !prepareNrInput)}
                      className={`px-2 py-0.5 rounded-md border text-[8px] font-mono font-black uppercase transition-all cursor-pointer ${
                        prepareNrInput
                          ? 'bg-neon-green/20 border-neon-green/40 text-neon-green'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {prepareNrInput ? 'Prepass Pipeline Active' : 'Prepass Bypassed'}
                    </button>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase">
                      Hardware Sub-Pixel Hooks
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Toggle 1: Motion Vectors Conditioning */}
                  <div
                    onClick={() => updateFeature('dlss5_motion_vectors_conditioning', !motionVectorsConditioning)}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 flex items-start justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-[8.5px] font-black uppercase tracking-wide text-zinc-200 block mb-0.5">
                        Motion Vector Conditioning
                      </span>
                      <p className="text-[7.5px] text-zinc-400 leading-normal">
                        Normalizes optical flow vectors to sub-pixel accuracy before neural inference.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        motionVectorsConditioning
                          ? 'bg-neon-green/20 border-neon-green/40 text-neon-green'
                          : 'bg-white/5 border-white/10 text-transparent'
                      }`}
                    >
                      {motionVectorsConditioning && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>

                  {/* Toggle 2: Normal & Depth Geometry Buffering */}
                  <div
                    onClick={() => updateFeature('dlss5_geometry_normal_buffer', !geometryNormalBuffer)}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 flex items-start justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-[8.5px] font-black uppercase tracking-wide text-zinc-200 block mb-0.5">
                        Depth & Normal Prepass
                      </span>
                      <p className="text-[7.5px] text-zinc-400 leading-normal">
                        Feeds uncompressed G-buffer geometric primitives to guide neural surface generation.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        geometryNormalBuffer
                          ? 'bg-neon-green/20 border-neon-green/40 text-neon-green'
                          : 'bg-white/5 border-white/10 text-transparent'
                      }`}
                    >
                      {geometryNormalBuffer && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>

                  {/* Toggle 3: Specular / Albedo Decoupling */}
                  <div
                    onClick={() => updateFeature('dlss5_specular_albedo_separation', !specularAlbedoSeparation)}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 flex items-start justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-[8.5px] font-black uppercase tracking-wide text-zinc-200 block mb-0.5">
                        Specular / Albedo Decoupling
                      </span>
                      <p className="text-[7.5px] text-zinc-400 leading-normal">
                        Separates specular reflection layers from diffuse textures to eliminate shimmer.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        specularAlbedoSeparation
                          ? 'bg-neon-green/20 border-neon-green/40 text-neon-green'
                          : 'bg-white/5 border-white/10 text-transparent'
                      }`}
                    >
                      {specularAlbedoSeparation && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Footer Quick Status */}
          <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[8.5px] font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span>
                Engine Configuration: {activeStyleObj.name} · {activeMfgObj.multiplier} · Target {baseWidth}×{baseHeight}
              </span>
            </div>
            <span className="text-zinc-600">
              Settings automatically saved to hardware preset profile
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
