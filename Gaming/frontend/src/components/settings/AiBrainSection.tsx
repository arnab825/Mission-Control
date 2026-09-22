import React from 'react';
import { Brain } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { CustomSelect } from './common/CustomSelect';
import {
  AI_PROVIDER_OPTIONS,
  MEMORY_MODE_OPTIONS,
} from '../../data/settingsConstants';
import type { OptionItem } from '../../data/settingsConstants';

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
        description="Select the AI provider and model for conversational AI. All models run on cloud APIs. Set your API keys securely in the backend .env file. Note: Performance depends on the provider's network traffic. You may experience slow responses or hangs during provider outages or if you hit API rate limits."
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="w-full sm:w-1/3 shrink-0">
              <CustomSelect
                value={localConfig.ai_agent?.provider || 'nvidia'}
                onChange={(val) => {
                  let defaultModel = 'meta/llama-3.2-11b-vision-instruct';
                  if (val === 'gemini') defaultModel = 'gemini-3.8-flash';
                  else if (val === 'groq') defaultModel = 'gpt-oss-120b';
                  else if (val === 'openrouter') defaultModel = 'openrouter/free';
                  else if (val === 'auto') defaultModel = 'auto';
                  setLocalConfig({
                    ...localConfig,
                    ai_agent: { ...localConfig.ai_agent, provider: val, model_id: defaultModel }
                  });
                }}
                options={AI_PROVIDER_OPTIONS}
                isMono={false}
              />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <CustomSelect
                value={
                  dynamicNeuralOptions.some((opt) => opt.value === localConfig.ai_agent?.model_id)
                    ? localConfig.ai_agent?.model_id
                    : dynamicNeuralOptions[0]?.value || 'meta/llama-3.2-11b-vision-instruct'
                }
                onChange={(val) =>
                  setLocalConfig({
                    ...localConfig,
                    ai_agent: { ...localConfig.ai_agent, model_id: val }
                  })
                }
                options={dynamicNeuralOptions}
                isMono={true}
              />
            </div>
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
