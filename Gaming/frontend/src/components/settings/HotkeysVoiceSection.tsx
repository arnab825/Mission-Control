import React from 'react';
import { Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { HotkeyRecorder } from './common/HotkeyRecorder';
import { CustomSelect } from './common/CustomSelect';
import { SPEECH_PROVIDER_OPTIONS } from '../../data/settingsConstants';

interface HotkeysVoiceSectionProps {
  searchQuery?: string;
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  sendCommand: (command: string, data?: any) => void;
}

export const HotkeysVoiceSection: React.FC<HotkeysVoiceSectionProps> = ({
  searchQuery = '',
  localConfig,
  setLocalConfig,
  sendCommand,
}) => {
  if (!localConfig) return null;

  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Hotkeys & Interface"
      icon={Keyboard}
      searchTerms="hotkeys shortcut interface voice tts speech toggle hud agentic"
    >
      <SettingsField label="Toggle HUD" description="Shortcut to show/hide the tactical overlay.">
        <HotkeyRecorder
          value={localConfig.hotkeys?.toggle_hud || '<ctrl>+<alt>+o'}
          onChange={(val) =>
            setLocalConfig((prev: any) => ({
              ...prev,
              hotkeys: { ...prev.hotkeys, toggle_hud: val },
            }))
          }
        />
      </SettingsField>

      <SettingsField label="Agentic Toggle" description="Activate/Deactivate the autonomous agent.">
        <HotkeyRecorder
          value={localConfig.hotkeys?.toggle_agentic || '<ctrl>+<alt>+a'}
          onChange={(val) =>
            setLocalConfig((prev: any) => ({
              ...prev,
              hotkeys: { ...prev.hotkeys, toggle_agentic: val },
            }))
          }
        />
      </SettingsField>

      <SettingsField
        label="Voice Profile"
        description="Select the vocal characteristics and engine for the AI assistant."
      >
        <CustomSelect
          value={localConfig.ai_agent?.speech_provider || 'google'}
          onChange={(val) =>
            setLocalConfig((prev: any) => ({
              ...prev,
              ai_agent: { ...prev.ai_agent, speech_provider: val },
            }))
          }
          options={SPEECH_PROVIDER_OPTIONS}
        />
      </SettingsField>

      <SettingsField
        label="Voice Synthesis (TTS)"
        description="Allow the AI Co-pilot to speak tactical advice and story translations. Toggle off to mute completely."
      >
        <div className="flex items-center gap-3 select-none">
          <AnimatePresence mode="wait">
            <motion.span
              key={localConfig.voice?.enabled !== false ? 'enabled' : 'disabled'}
              initial={{ opacity: 0, scale: 0.8, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 2 }}
              transition={{ duration: 0.15 }}
              className={`text-[9px] font-black uppercase tracking-wider ${
                localConfig.voice?.enabled !== false ? 'text-neon-green' : 'text-zinc-500'
              }`}
            >
              {localConfig.voice?.enabled !== false ? 'Enabled' : 'Disabled'}
            </motion.span>
          </AnimatePresence>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const newVal = localConfig.voice?.enabled === false;
              const updatedVoice = { ...localConfig.voice, enabled: newVal };
              setLocalConfig((prev: any) => ({ ...prev, voice: updatedVoice }));
              sendCommand('update_config', { voice: updatedVoice });
            }}
            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center relative ${
              localConfig.voice?.enabled !== false
                ? 'bg-neon-green/20 border border-neon-green/40 shadow-[0_0_10px_rgba(118,185,0,0.15)]'
                : 'bg-zinc-800 border border-zinc-700'
            }`}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`w-4 h-4 rounded-full shadow-md ${
                localConfig.voice?.enabled !== false ? 'bg-neon-green ml-auto' : 'bg-zinc-500'
              }`}
            />
          </div>
        </div>
      </SettingsField>
    </SettingsSection>
  );
};
