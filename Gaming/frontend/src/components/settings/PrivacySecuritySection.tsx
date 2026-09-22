import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Sparkles, Zap, Brain, Cpu } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { AssistantModeCard } from './common/AssistantModeCard';
import {
  MODE_INTELLIGENCE,
  CAPTURE_BACKEND_OPTIONS,
  AI_NEURAL_BACKBONE_OPTIONS,
  OCR_ENGINE_OPTIONS
} from '../../data/settingsConstants';

interface PrivacySecuritySectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  dynamicTargetGames: Record<string, string[]>;
  searchQuery?: string;
}

export const PrivacySecuritySection: React.FC<PrivacySecuritySectionProps> = ({
  localConfig,
  setLocalConfig,
  dynamicTargetGames,
  searchQuery
}) => {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const activeModeKey = hoveredMode || localConfig.game_mode || 'hybrid';
  const intel = MODE_INTELLIGENCE[activeModeKey] || MODE_INTELLIGENCE.hybrid;
  const targetGames = dynamicTargetGames[activeModeKey] || [];

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
      const modelLabel = AI_NEURAL_BACKBONE_OPTIONS.find(o => o.value === model)?.label || 'Nemotron 3 Ultra';
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

  return (
    <div className="space-y-8">
      {/* Assistant Mode Cards */}
      <div className="bg-[#0c0c10]/60 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-[11px] font-black text-neon-green uppercase tracking-[0.2em] mb-1">
              Active Intelligence Profile
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium">
              Select a specialized operational profile optimized for your game genre and latency budget.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              aria-label="button"
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
                showDiagnostics
                  ? 'bg-neon-green/10 text-neon-green border-neon-green/20 shadow-[0_0_15px_rgba(118,185,0,0.15)]'
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

        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
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

        {/* Diagnostics Drawer */}
        <AnimatePresence>
          {showDiagnostics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-2"
            >
              <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-6">
                <div className="flex flex-col lg:flex-row justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="space-y-1">
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
                    <div className="h-8 w-px bg-white/5" />
                    <div className="text-right">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Status</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          localConfig.game_mode === activeModeKey ? 'text-neon-yellow' : 'text-zinc-500'
                        }`}
                      >
                        {localConfig.game_mode === activeModeKey ? '● DEPLOYED' : '○ PREVIEW'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Active Neural Pipelines</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {intel.pipelines.map((pipe, idx) => {
                        const label = getDynamicPipelineLabel(pipe.label);
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all min-w-0 ${
                              pipe.active
                                ? 'bg-neon-yellow/5 border-neon-yellow/15 text-neon-yellow'
                                : 'bg-black/20 border-white/5 text-zinc-600'
                            }`}
                          >
                            <span className="truncate mr-2" title={label}>
                              {label}
                            </span>
                            <span className="font-mono text-[8px] whitespace-nowrap shrink-0">
                              {pipe.active ? '● RUNNING' : '○ STANDBY'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Functional Parameters</span>
                      <ul className="space-y-1.5 text-[10px] font-medium text-zinc-400 leading-relaxed list-disc list-inside">
                        {intel.details.map((detail, idx) => (
                          <li key={idx} className="marker:text-neon-green/70">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Target Game Profiles:</span>
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

                {intel.warning && (
                  <div className="p-3.5 bg-red-950/20 border border-red-500/15 rounded-xl">
                    <p className="text-[9px] font-black text-red-400 tracking-wider leading-relaxed">
                      {intel.warning}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Privacy & Neural Security Toggles */}
      <SettingsSection
        searchQuery={searchQuery}
        title="Privacy & Neural Security"
        icon={Shield}
        searchTerms="privacy shield anonymized reasoning telemetry diagnostics sandbox uuid lock key rotation security"
      >
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
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    privacy: { ...localConfig.privacy, enabled: !localConfig.privacy?.enabled }
                  })
                }
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${
                  localConfig.privacy?.enabled ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.3)]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                    localConfig.privacy?.enabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
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
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    privacy: { ...localConfig.privacy, anonymize: !localConfig.privacy?.anonymize }
                  })
                }
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${
                  localConfig.privacy?.anonymize ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.3)]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                    localConfig.privacy?.anonymize ? 'right-0.5' : 'left-0.5'
                  }`}
                />
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
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    privacy: {
                      ...localConfig.privacy,
                      share_telemetry: localConfig.privacy?.share_telemetry !== false ? false : true
                    }
                  })
                }
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${
                  localConfig.privacy?.share_telemetry !== false ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.3)]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                    localConfig.privacy?.share_telemetry !== false ? 'right-0.5' : 'left-0.5'
                  }`}
                />
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
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    privacy: { ...localConfig.privacy, secure_sandbox: !localConfig.privacy?.secure_sandbox }
                  })
                }
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${
                  localConfig.privacy?.secure_sandbox ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.3)]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                    localConfig.privacy?.secure_sandbox ? 'right-0.5' : 'left-0.5'
                  }`}
                />
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
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    privacy: { ...localConfig.privacy, uuid_lock: !localConfig.privacy?.uuid_lock }
                  })
                }
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${
                  localConfig.privacy?.uuid_lock ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.3)]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                    localConfig.privacy?.uuid_lock ? 'right-0.5' : 'left-0.5'
                  }`}
                />
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
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    privacy: { ...localConfig.privacy, key_rotation: !localConfig.privacy?.key_rotation }
                  })
                }
                className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors shrink-0 ${
                  localConfig.privacy?.key_rotation ? 'bg-neon-yellow shadow-[0_0_10px_rgba(191,255,0,0.3)]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                    localConfig.privacy?.key_rotation ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};
