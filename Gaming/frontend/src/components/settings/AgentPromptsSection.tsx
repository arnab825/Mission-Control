import React from 'react';
import { Brain } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { DEFAULT_PROMPTS, DEFAULT_PERSONALITIES } from '../../data/defaultPrompts';

interface AgentPromptsSectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  searchQuery?: string;
}

export const AgentPromptsSection: React.FC<AgentPromptsSectionProps> = ({
  localConfig,
  setLocalConfig,
  searchQuery
}) => {
  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Agent Training & Prompts"
      icon={Brain}
      searchTerms="prompts training system access greeting personalities welcome session title brevity"
    >
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
          Customize how your AI agent speaks, greets, and behaves. All fields support template variables shown in{' '}
          <span className="font-mono text-neon-green/80">{'{braces}'}</span>. Leave a field blank to use the built-in defaults.
        </p>
      </div>

      {/* Welcome Greeting */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Welcome Greeting Prompt</p>
        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
          Instruction sent to the AI when a new chat session is created. Controls the tone of the opening message.
        </p>
        <textarea
          id="prompt-welcome"
          rows={4}
          value={localConfig.ai_agent?.prompts?.welcome_prompt ?? DEFAULT_PROMPTS.welcome_prompt}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  welcome_prompt: e.target.value
                }
              }
            })
          }
          placeholder="Greet the user as their AI Gaming Assistant. Give a very brief, friendly welcome message..."
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
        />
      </div>

      {/* Welcome Fallback */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Welcome Fallback Message</p>
        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
          Static message shown if the AI model fails to generate a welcome reply.
        </p>
        <textarea
          id="prompt-welcome-fallback"
          rows={3}
          value={localConfig.ai_agent?.prompts?.welcome_fallback ?? DEFAULT_PROMPTS.welcome_fallback}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  welcome_fallback: e.target.value
                }
              }
            })
          }
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
          value={localConfig.ai_agent?.prompts?.session_title_prompt ?? DEFAULT_PROMPTS.session_title_prompt}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  session_title_prompt: e.target.value
                }
              }
            })
          }
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
          value={localConfig.ai_agent?.prompts?.system_access_instruction ?? DEFAULT_PROMPTS.system_access_instruction}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  system_access_instruction: e.target.value
                }
              }
            })
          }
          placeholder="AGENTIC PERMISSION: The user has enabled 'Agentic AI Mode'..."
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
        />
      </div>

      {/* Inactive Greeting (Desktop) */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Inactive Greeting (Desktop)</p>
        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
          Response when user says hi and no game is active (and games are scanned). Variables:{' '}
          <span className="font-mono text-neon-green/80">{'{count_games}'}</span>
        </p>
        <textarea
          id="prompt-inactive-greeting-desktop"
          rows={3}
          value={localConfig.ai_agent?.prompts?.inactive_greeting_desktop ?? DEFAULT_PROMPTS.inactive_greeting_desktop}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  inactive_greeting_desktop: e.target.value
                }
              }
            })
          }
          placeholder="Hello! I am your AI Gaming Assistant. I see you have {count_games} games installed..."
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-neon-green/40 resize-y placeholder-zinc-600 transition-colors"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Inactive Greeting Fallback</p>
        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
          Shown when user says hi with no game active and no library scanned.
        </p>
        <textarea
          id="prompt-inactive-greeting-fallback"
          rows={2}
          value={localConfig.ai_agent?.prompts?.inactive_greeting_desktop_fallback ?? DEFAULT_PROMPTS.inactive_greeting_desktop_fallback}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  inactive_greeting_desktop_fallback: e.target.value
                }
              }
            })
          }
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
          value={localConfig.ai_agent?.prompts?.active_greeting_game ?? DEFAULT_PROMPTS.active_greeting_game}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  active_greeting_game: e.target.value
                }
              }
            })
          }
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
          value={localConfig.ai_agent?.prompts?.brevity_concise ?? DEFAULT_PROMPTS.brevity_concise}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  brevity_concise: e.target.value
                }
              }
            })
          }
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
          value={localConfig.ai_agent?.prompts?.brevity_detailed ?? DEFAULT_PROMPTS.brevity_detailed}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {
                  ...DEFAULT_PROMPTS,
                  ...localConfig.ai_agent?.prompts,
                  brevity_detailed: e.target.value
                }
              }
            })
          }
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
              <span
                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                  localConfig.ai_agent?.personality === key
                    ? 'bg-neon-green/15 border-neon-green/40 text-neon-green'
                    : 'bg-white/3 border-white/10 text-zinc-500'
                }`}
              >
                {key}
              </span>
              {localConfig.ai_agent?.personality === key && (
                <span className="text-[8px] font-bold text-neon-green/70 uppercase tracking-wider">● Active</span>
              )}
            </div>
            <textarea
              id={`prompt-personality-${key}`}
              rows={2}
              value={localConfig.ai_agent?.prompts?.personalities?.[key] ?? DEFAULT_PERSONALITIES[key] ?? ''}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  ai_agent: {
                    ...localConfig.ai_agent,
                    prompts: {
                      ...DEFAULT_PROMPTS,
                      ...localConfig.ai_agent?.prompts,
                      personalities: {
                        ...DEFAULT_PERSONALITIES,
                        ...localConfig.ai_agent?.prompts?.personalities,
                        [key]: e.target.value
                      }
                    }
                  }
                })
              }
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
          onClick={() =>
            setLocalConfig({
              ...localConfig,
              ai_agent: {
                ...localConfig.ai_agent,
                prompts: {}
              }
            })
          }
          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
        >
          Reset All Prompts to Defaults
        </button>
      </div>
    </SettingsSection>
  );
};
