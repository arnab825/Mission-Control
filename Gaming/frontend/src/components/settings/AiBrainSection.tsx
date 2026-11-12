import React from 'react';
import { Brain, Zap, Sparkles } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { CustomSelect } from './common/CustomSelect';
import {
  MEMORY_MODE_OPTIONS,
} from '../../data/settingsConstants';
import type { OptionItem } from '../../data/settingsConstants';

const PROVIDER_PILLS = [
  { id: 'auto', name: 'Auto', badge: 'Smart', isAuto: true },
  { id: 'groq', name: 'Groq', badge: 'Ultra Fast' },
  { id: 'nvidia', name: 'NVIDIA', badge: 'NIM' },
  { id: 'gemini', name: 'Gemini', badge: 'Free' },
  { id: 'openrouter', name: 'Router', badge: 'Multi' },
];

interface AiBrainSectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  dynamicNeuralOptions: OptionItem[];
  desktopPath: string;
  searchQuery?: string;
}

export const AiBrainSection: React.FC<AiBrainSectionProps> = ({
  localConfig,
  setLocalConfig,
  dynamicNeuralOptions,
  desktopPath,
  searchQuery
}) => {
  const activeProvider = localConfig.ai_agent?.provider || 'nvidia';

  const handleProviderChange = (val: string) => {
    let defaultModel = 'meta/llama-3.2-11b-vision-instruct';
    if (val === 'gemini') defaultModel = 'gemini-3.8-flash';
    else if (val === 'groq') defaultModel = 'gpt-oss-120b';
    else if (val === 'openrouter') defaultModel = 'openrouter/free';
    else if (val === 'auto') defaultModel = 'auto';
    setLocalConfig((prev: any) => ({
      ...prev,
      ai_agent: { ...(prev?.ai_agent || {}), provider: val, model_id: defaultModel }
    }));
  };

  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Neural Brain & Memory"
      icon={Brain}
      searchTerms="ai neural backbone model provider groq nvidia gemini openrouter memory reasoning intensity agentic execution delay"
    >
      {/* AI Neural Backbone */}
      <SettingsField
        label="AI Neural Backbone"
        description="Select the AI provider and model for tactical intelligence. Cloud API keys are managed in the backend .env."
        stacked={true}
      >
        <div className="flex flex-col gap-3.5 w-full">
          {/* Provider Pill Switcher */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-neon-green" />
                AI Gateway Provider
              </span>
              <span className="text-[8px] font-mono text-neon-green font-bold uppercase tracking-wider">
                {activeProvider === 'auto' ? '⚡ Dynamic Smart Load Balance' : 'Dedicated Gateway'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-1.5 bg-black/40 border border-white/10 rounded-xl">
              {PROVIDER_PILLS.map((p) => {
                const isActive = activeProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className={`py-2 px-2.5 rounded-lg text-center transition-all flex flex-col items-center justify-center cursor-pointer select-none ${
                      isActive
                        ? 'bg-neon-green/20 border border-neon-green/50 text-neon-green shadow-[0_0_12px_rgba(118,185,0,0.25)] font-black'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent font-medium'
                    }`}
                  >
                    <span className="text-[10px] leading-tight flex items-center gap-1">
                      {p.isAuto && <Zap className="w-2.5 h-2.5 text-neon-green shrink-0" />}
                      {p.name}
                    </span>
                    <span
                      className={`text-[7px] uppercase tracking-wider leading-none mt-1 ${
                        isActive ? 'text-neon-green/90 font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Selector or Dynamic Routing Banner */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Brain className="w-3 h-3 text-neon-green" />
                {activeProvider === 'auto' ? 'Routing Strategy' : 'Active Model'}
              </span>
              {activeProvider !== 'auto' && (
                <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                  {dynamicNeuralOptions.length} available
                </span>
              )}
            </div>

            {activeProvider === 'auto' ? (
              <div className="p-3.5 rounded-xl bg-neon-green/5 border border-neon-green/20 flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-zinc-200 tracking-wide uppercase">
                    ⚡ Smart Multi-Cloud Failover
                  </p>
                  <p className="text-[9px] text-zinc-400 font-medium leading-relaxed mt-0.5">
                    Auto-balances across NVIDIA NIM, Groq, and Google Gemini. If any provider experiences rate limits or high latency, requests instantly switch.
                  </p>
                </div>
              </div>
            ) : (
              <CustomSelect
                value={
                  dynamicNeuralOptions.some((opt) => opt.value === localConfig.ai_agent?.model_id)
                    ? localConfig.ai_agent?.model_id
                    : dynamicNeuralOptions[0]?.value || 'meta/llama-3.2-11b-vision-instruct'
                }
                onChange={(val) =>
                  setLocalConfig((prev: any) => ({
                    ...prev,
                    ai_agent: { ...(prev?.ai_agent || {}), model_id: val }
                  }))
                }
                options={dynamicNeuralOptions}
                isMono={true}
                className="w-full"
              />
            )}
          </div>
        </div>
      </SettingsField>

      {/* Reasoning Intensity */}
      <SettingsField label="Reasoning Intensity" description="Balance between strategic depth and processing speed.">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={localConfig.ai_agent?.reasoning_intensity || 0.8}
            onChange={(e) =>
              setLocalConfig({
                ...localConfig,
                ai_agent: { ...localConfig.ai_agent, reasoning_intensity: parseFloat(e.target.value) }
              })
            }
            className="flex-1 accent-neon-green"
          />
          <span className="text-[10px] font-mono text-neon-green font-bold">
            {(localConfig.ai_agent?.reasoning_intensity || 0.8).toFixed(2)}
          </span>
        </div>
      </SettingsField>

      {/* Agentic Execution Delay */}
      <SettingsField
        label="Agentic Execution Delay"
        description="The time (in seconds) the AI waits before autonomously executing a system action, giving you time to cancel it."
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={localConfig.agentic?.confirmation_delay ?? 2}
            onChange={(e) =>
              setLocalConfig({
                ...localConfig,
                agentic: { ...localConfig.agentic, confirmation_delay: parseInt(e.target.value) }
              })
            }
            className="flex-1 accent-neon-green"
          />
          <span className="text-[10px] font-mono text-neon-green font-bold">
            {localConfig.agentic?.confirmation_delay ?? 2}s
          </span>
        </div>
      </SettingsField>

      {/* Memory Persistence */}
      <SettingsField
        label="Memory Persistence"
        description="Allows the AI to remember your preferences and quest progress across sessions."
      >
        <div className="flex gap-4 items-center">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() =>
              setLocalConfig({
                ...localConfig,
                memory: { ...localConfig.memory, enabled: !localConfig.memory?.enabled }
              })
            }
            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
              localConfig.memory?.enabled ? 'bg-neon-green' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute transition-all ${
                localConfig.memory?.enabled ? 'bg-black right-1' : 'bg-zinc-600 left-1'
              }`}
            />
          </div>

          <CustomSelect
            value={localConfig.memory?.mode || 'read_write'}
            onChange={(val) =>
              setLocalConfig({
                ...localConfig,
                memory: { ...localConfig.memory, mode: val }
              })
            }
            options={MEMORY_MODE_OPTIONS}
            size="sm"
            className="w-44"
          />
        </div>
      </SettingsField>

      {/* Memory Save Path */}
      <SettingsField
        label="Memory Save Path"
        description="Location where the AI stores mission logs and learned experiences."
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={localConfig.memory?.save_path || ''}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] font-mono text-neon-green focus:outline-none cursor-default"
              placeholder="e.g. C:/MissionControl/memory.json"
            />
            <button
              aria-label="button"
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    setLocalConfig({
                      ...localConfig,
                      memory: { ...localConfig.memory, save_path: `${desktopPath}/${file.name}` }
                    });
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
            <button
              aria-label="button"
              type="button"
              onClick={() =>
                setLocalConfig({
                  ...localConfig,
                  memory: { ...localConfig.memory, save_path: `${desktopPath}/Aero_Memory.json` }
                })
              }
              className="text-[8px] font-bold text-neon-green/60 hover:text-neon-green transition-colors"
            >
              Quick Set: Desktop
            </button>
            <button
              aria-label="button"
              type="button"
              onClick={() =>
                setLocalConfig({
                  ...localConfig,
                  memory: { ...localConfig.memory, save_path: 'D:/MissionControl/Data/memory.json' }
                })
              }
              className="text-[8px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Quick Set: Drive D:
            </button>
          </div>
        </div>
      </SettingsField>
    </SettingsSection>
  );
};
