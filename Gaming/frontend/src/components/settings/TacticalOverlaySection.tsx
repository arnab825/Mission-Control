import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Lock, Unlock } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { CustomSelect } from './common/CustomSelect';
import { HUD_LAYOUT_OPTIONS, HUD_LAYOUT_STYLE_OPTIONS } from '../../data/settingsConstants';

interface TacticalOverlaySectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  sendCommand: (type: string, payload?: any) => void;
  searchQuery?: string;
}

export const TacticalOverlaySection: React.FC<TacticalOverlaySectionProps> = ({
  localConfig,
  setLocalConfig,
  sendCommand,
  searchQuery
}) => {
  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Tactical Overlay"
      icon={Target}
      searchTerms="tactical overlay hud lock position scaling omen layout style auto spawn search intelligence"
    >
      {/* Lock HUD Position */}
      <SettingsField
        label="Lock HUD Position"
        description="Prevent accidental movement of the overlay. Unlock to drag to a new position."
      >
        <div className="flex items-center gap-3 select-none">
          <AnimatePresence mode="wait">
            <motion.span
              key={localConfig.overlay?.lock_position === true ? 'locked' : 'unlocked'}
              initial={{ opacity: 0, scale: 0.8, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 2 }}
              transition={{ duration: 0.15 }}
              className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                localConfig.overlay?.lock_position === true ? 'text-neon-green' : 'text-orange-400'
              }`}
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
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const isCurrentlyLocked = localConfig.overlay?.lock_position === true;
              const updatedOverlay = { ...localConfig.overlay, lock_position: !isCurrentlyLocked };
              setLocalConfig({ ...localConfig, overlay: updatedOverlay });
              sendCommand('update_config', { overlay: updatedOverlay });
            }}
            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center relative ${
              localConfig.overlay?.lock_position === true
                ? 'bg-neon-green/20 border border-neon-green/40 shadow-[0_0_10px_rgba(118,185,0,0.15)]'
                : 'bg-orange-500/20 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.15)]'
            }`}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`w-4 h-4 rounded-full flex items-center justify-center shadow-md ${
                localConfig.overlay?.lock_position === true ? 'bg-neon-green ml-auto' : 'bg-orange-400'
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

      {/* Lock Agent Position */}
      <SettingsField
        label="Lock Agent Position"
        description="Prevent accidental movement of the agent popup. Unlock to drag to a new position."
      >
        <div className="flex items-center gap-3 select-none">
          <AnimatePresence mode="wait">
            <motion.span
              key={localConfig.overlay?.lock_agent === true ? 'locked' : 'unlocked'}
              initial={{ opacity: 0, scale: 0.8, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 2 }}
              transition={{ duration: 0.15 }}
              className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                localConfig.overlay?.lock_agent === true ? 'text-neon-green' : 'text-orange-400'
              }`}
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
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const isCurrentlyLocked = localConfig.overlay?.lock_agent === true;
              const updatedOverlay = { ...localConfig.overlay, lock_agent: !isCurrentlyLocked };
              setLocalConfig({ ...localConfig, overlay: updatedOverlay });
              sendCommand('update_config', { overlay: updatedOverlay });
            }}
            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center relative ${
              localConfig.overlay?.lock_agent === true
                ? 'bg-neon-green/20 border border-neon-green/40 shadow-[0_0_10px_rgba(118,185,0,0.15)]'
                : 'bg-orange-500/20 border border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.15)]'
            }`}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`w-4 h-4 rounded-full flex items-center justify-center shadow-md ${
                localConfig.overlay?.lock_agent === true ? 'bg-neon-green ml-auto' : 'bg-orange-400'
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

      {/* HUD Layout Preset */}
      <SettingsField
        label="HUD Layout Preset"
        description="Select a preset layout position to automatically snap the overlay to a screen corner."
      >
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

      {/* HUD Layout Design */}
      <SettingsField
        label="HUD Layout Design"
        description="Select the visual layout of your HUD overlay (similar to Omen Gaming Hub styles)."
      >
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

      {/* HUD Scaling */}
      <SettingsField
        label="HUD Scaling"
        description="Fine-tune the font size and overall scale of the tactical overlay."
      >
        <div className="flex items-center gap-4 select-none">
          <button
            aria-label="button"
            type="button"
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
          <button
            aria-label="button"
            type="button"
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

      {/* Search Intelligence HUD */}
      <SettingsField
        label="Search Intelligence HUD"
        description="Show real-time web search status and AI reasoning queries on the overlay."
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-[9px] font-black uppercase ${
              localConfig.overlay?.show_search_hud !== false ? 'text-neon-green' : 'text-zinc-500'
            }`}
          >
            {localConfig.overlay?.show_search_hud !== false ? 'Enabled' : 'Disabled'}
          </span>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const newVal = localConfig.overlay?.show_search_hud === false;
              const updatedOverlay = { ...localConfig.overlay, show_search_hud: newVal };
              setLocalConfig({ ...localConfig, overlay: updatedOverlay });
              sendCommand('update_config', { overlay: updatedOverlay });
            }}
            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
              localConfig.overlay?.show_search_hud !== false ? 'bg-neon-green' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute transition-all ${
                localConfig.overlay?.show_search_hud !== false ? 'bg-black right-1' : 'bg-black left-1'
              }`}
            />
          </div>
        </div>
      </SettingsField>

      {/* Auto-Spawn HUD */}
      <SettingsField
        label="Auto-Spawn HUD"
        description="Automatically spawn the tactical overlay HUD when a game becomes active."
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-[9px] font-black uppercase ${
              localConfig.overlay?.auto_spawn !== false ? 'text-neon-green' : 'text-zinc-500'
            }`}
          >
            {localConfig.overlay?.auto_spawn !== false ? 'Enabled' : 'Disabled'}
          </span>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const newVal = localConfig.overlay?.auto_spawn === false;
              const updatedOverlay = { ...localConfig.overlay, auto_spawn: newVal };
              setLocalConfig({ ...localConfig, overlay: updatedOverlay });
              sendCommand('update_config', { overlay: updatedOverlay });
            }}
            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
              localConfig.overlay?.auto_spawn !== false ? 'bg-neon-green' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute transition-all ${
                localConfig.overlay?.auto_spawn !== false ? 'bg-black right-1' : 'bg-black left-1'
              }`}
            />
          </div>
        </div>
      </SettingsField>
    </SettingsSection>
  );
};
