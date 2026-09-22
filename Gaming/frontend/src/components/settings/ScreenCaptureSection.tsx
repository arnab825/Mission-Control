import React from 'react';
import { Camera, AlertTriangle } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { CustomSelect } from './common/CustomSelect';
import { FOCUS_MODE_OPTIONS, CAPTURE_BACKEND_OPTIONS } from '../../data/settingsConstants';

interface ScreenCaptureSectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  searchQuery?: string;
}

export const ScreenCaptureSection: React.FC<ScreenCaptureSectionProps> = ({
  localConfig,
  setLocalConfig,
  searchQuery
}) => {
  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Screen Capture"
      icon={Camera}
      searchTerms="screen capture backend dxgi bitblt focus mode display borderless windowed cap fps"
    >
      <div className="p-3 bg-neon-yellow/5 border border-neon-yellow/20 rounded-xl flex items-start gap-3 mb-2">
        <AlertTriangle className="w-5 h-5 text-neon-yellow shrink-0 mt-0.5" />
        <div className="text-[10px] text-neon-yellow/90 leading-relaxed font-medium">
          <span className="font-bold uppercase tracking-widest text-neon-yellow mb-1 block">Display Requirement</span>
          To ensure the vision and capture engine works correctly, you must set your game to run in{' '}
          <strong className="text-neon-yellow">Borderless Windowed</strong> or{' '}
          <strong className="text-neon-yellow">Windowed</strong> mode before playing. Exclusive Fullscreen may block screen capture.
        </div>
      </div>

      <SettingsField label="Focus Mode" description="Use 'Auto-Follow' if you play games on different monitors.">
        <CustomSelect
          value={localConfig.capture?.focus_mode || 'Primary Only'}
          onChange={(val) =>
            setLocalConfig({
              ...localConfig,
              capture: { ...localConfig.capture, focus_mode: val }
            })
          }
          options={FOCUS_MODE_OPTIONS}
        />
      </SettingsField>

      <SettingsField label="Capture Backend" description="The low-level API used for screen grabbing.">
        <CustomSelect
          value={localConfig.capture?.backend || 'auto'}
          onChange={(val) =>
            setLocalConfig({
              ...localConfig,
              capture: { ...localConfig.capture, backend: val }
            })
          }
          options={CAPTURE_BACKEND_OPTIONS}
        />
      </SettingsField>

      <SettingsField
        label="Cap Vision Pipeline FPS"
        description="Limit the screen capture and AI processing rate to save CPU/GPU overhead. Note: This does NOT limit your actual game FPS, only the assistant's capture loop."
      >
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Enable FPS Cap</span>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
              onClick={() =>
                setLocalConfig({
                  ...localConfig,
                  capture: {
                    ...localConfig.capture,
                    cap_fps: !localConfig.capture?.cap_fps
                  }
                })
              }
              className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
                localConfig.capture?.cap_fps === true ? 'bg-neon-green' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full absolute transition-all bg-black ${
                  localConfig.capture?.cap_fps === true ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </div>
          </div>

          {localConfig.capture?.cap_fps === true && (
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="30"
                max="700"
                step="1"
                value={localConfig.capture?.fps_cap_limit || 60}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    capture: { ...localConfig.capture, fps_cap_limit: parseInt(e.target.value) }
                  })
                }
                className="flex-1 accent-neon-green"
              />
              <span className="text-xs font-black text-neon-green w-16">
                {localConfig.capture?.fps_cap_limit || 60} FPS
              </span>
            </div>
          )}
        </div>
      </SettingsField>
    </SettingsSection>
  );
};
