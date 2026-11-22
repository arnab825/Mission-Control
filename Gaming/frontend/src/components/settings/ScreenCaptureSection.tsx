import React from 'react';
import { Camera, AlertTriangle, Video, FolderOpen } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { CustomSelect } from './common/CustomSelect';
import { FOCUS_MODE_OPTIONS, CAPTURE_BACKEND_OPTIONS } from '../../data/settingsConstants';

interface ScreenCaptureSectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  searchQuery?: string;
  sendCommand?: (type: string, payload?: any) => void;
}

export const ScreenCaptureSection: React.FC<ScreenCaptureSectionProps> = ({
  localConfig,
  setLocalConfig,
  searchQuery,
  sendCommand
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

      <div className="pt-4 border-t border-white/5 space-y-4">
        <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Video className="w-3.5 h-3.5 text-neon-green" />
          Gameplay Video Recording & Replays
        </h4>

        <SettingsField label="Recording Frame Rate" description="Target FPS for recorded gameplay MP4 videos.">
          <CustomSelect
            value={String(localConfig.recording?.fps || 30)}
            onChange={(val) =>
              setLocalConfig({
                ...localConfig,
                recording: { ...localConfig.recording, fps: parseInt(val) }
              })
            }
            options={[
              { value: '30', label: '30 FPS (Efficient, Low Overhead)' },
              { value: '60', label: '60 FPS (Ultra Smooth Gameplay)' },
            ]}
          />
        </SettingsField>

        <SettingsField label="Rolling Highlight Buffer" description="Duration of continuous gameplay kept in RAM for instant highlight clipping.">
          <CustomSelect
            value={String(localConfig.recording?.rolling_buffer_seconds || 30)}
            onChange={(val) =>
              setLocalConfig({
                ...localConfig,
                recording: { ...localConfig.recording, rolling_buffer_seconds: parseInt(val) }
              })
            }
            options={[
              { value: '15', label: '15 Seconds' },
              { value: '30', label: '30 Seconds (Recommended)' },
              { value: '60', label: '60 Seconds' },
              { value: '90', label: '90 Seconds' },
            ]}
          />
        </SettingsField>

        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[10px] text-zinc-300 font-bold uppercase block">Recordings Folder</span>
            <span className="text-[9px] text-zinc-500">Access saved gameplay videos and instant replay clips on disk.</span>
          </div>
          <button
            type="button"
            onClick={() => sendCommand?.('open_recordings_folder')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-neon-green" />
            Open Folder
          </button>
        </div>
      </div>
    </SettingsSection>
  );
};
