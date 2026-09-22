import React, { useState } from 'react';
import { Folder, Trash2 } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';

interface LibraryGameDiscoverySectionProps {
  searchQuery?: string;
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  sendCommand: (command: string, data?: any) => void;
  desktopPath?: string;
}

export const LibraryGameDiscoverySection: React.FC<LibraryGameDiscoverySectionProps> = ({
  searchQuery = '',
  localConfig,
  setLocalConfig,
  sendCommand,
  desktopPath = 'C:/Users/Default/Desktop',
}) => {
  const [newDirInput, setNewDirInput] = useState('');

  if (!localConfig) return null;

  const handleBrowseDir = async () => {
    if ((window as any).electronAPI?.selectDirectory) {
      try {
        const result = await (window as any).electronAPI.selectDirectory();
        let selected = '';
        if (typeof result === 'string') {
          selected = result;
        } else if (result && !result.canceled && result.filePaths?.length > 0) {
          selected = result.filePaths[0];
        }
        if (selected) {
          const normalized = selected.replace(/\\/g, '/');
          setNewDirInput(normalized);
          const currentDirs = localConfig.scanner?.custom_scan_dirs || [];
          if (!currentDirs.includes(normalized)) {
            const updatedScanner = {
              ...localConfig.scanner,
              custom_scan_dirs: [...currentDirs, normalized],
            };
            setLocalConfig((prev: any) => ({
              ...prev,
              scanner: updatedScanner,
            }));
            sendCommand('update_config', { scanner: updatedScanner });
          }
        }
      } catch (err) {
        console.error('Error selecting directory:', err);
      }
    }
  };

  const handleRemoveDir = (dirToRemove: string) => {
    const currentDirs = localConfig.scanner?.custom_scan_dirs || [];
    const updatedScanner = {
      ...localConfig.scanner,
      custom_scan_dirs: currentDirs.filter((d: string) => d !== dirToRemove),
    };
    setLocalConfig((prev: any) => ({
      ...prev,
      scanner: updatedScanner,
    }));
    sendCommand('update_config', { scanner: updatedScanner });
  };

  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Library & Game Discovery"
      icon={Folder}
      searchTerms="library game discovery custom scan locations folders directory app storage location startup auto download updates shortcut"
    >
      <SettingsField
        label="Custom Scan Locations"
        description="Specify custom directory paths where the launcher scanner will discover your installed games and applications (e.g. D:/Games)."
      >
        <div className="space-y-4 w-full">
          {/* Existing scan folders list */}
          <div className="space-y-2">
            {(localConfig.scanner?.custom_scan_dirs || []).length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic py-1">
                No custom locations added. Using default Program Files and launcher registries.
              </p>
            ) : (
              (localConfig.scanner?.custom_scan_dirs || []).map((dir: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 bg-black/30 border border-white/5 rounded-xl px-3 py-2"
                >
                  <span
                    className="text-[10px] font-mono text-neon-green truncate max-w-50"
                    title={dir}
                  >
                    {dir}
                  </span>
                  <button
                    aria-label="Remove Location"
                    type="button"
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

            {(window as any).electronAPI?.selectDirectory && (
              <button
                aria-label="Browse"
                type="button"
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
            <button
              aria-label="Change Storage Location"
              type="button"
              onClick={async () => {
                try {
                  const result = await (window as any).electronAPI.selectDirectory();
                  let newPath = '';
                  if (typeof result === 'string') {
                    newPath = result;
                  } else if (result && !result.canceled && result.filePaths?.length > 0) {
                    newPath = result.filePaths[0];
                  }
                  if (newPath) {
                    const normalized = newPath.replace(/\\/g, '/');
                    const updatedSystem = { ...localConfig.system, app_data_path: normalized };
                    setLocalConfig((prev: any) => ({ ...prev, system: updatedSystem }));
                    sendCommand('update_config', { system: updatedSystem });
                  }
                } catch (err) {
                  console.error('Failed to change app storage location:', err);
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
          <span
            className={`text-[9px] font-black uppercase ${
              localConfig.system?.open_at_login === true ? 'text-neon-green' : 'text-zinc-500'
            }`}
          >
            {localConfig.system?.open_at_login === true ? 'Enabled' : 'Disabled'}
          </span>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const newVal = localConfig.system?.open_at_login !== true;
              const updatedSystem = { ...localConfig.system, open_at_login: newVal };
              setLocalConfig((prev: any) => ({ ...prev, system: updatedSystem }));
              if ((window as any).electronAPI?.saveSettings) {
                (window as any).electronAPI.saveSettings({ ...localConfig, system: updatedSystem });
              }
              sendCommand('update_config', { system: updatedSystem });
            }}
            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
              localConfig.system?.open_at_login === true ? 'bg-neon-green' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute transition-all ${
                localConfig.system?.open_at_login === true ? 'bg-black right-1' : 'bg-black left-1'
              }`}
            />
          </div>
        </div>
      </SettingsField>

      <SettingsField
        label="Auto-Download System Updates"
        description="Automatically download and cache wrapper upgrades in the background. If disabled, you will be notified of new versions and can download them manually."
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-[9px] font-black uppercase ${
              localConfig.system?.auto_download_updates !== false ? 'text-neon-green' : 'text-zinc-500'
            }`}
          >
            {localConfig.system?.auto_download_updates !== false ? 'Enabled' : 'Disabled'}
          </span>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            onClick={() => {
              const newVal = localConfig.system?.auto_download_updates === false;
              const updatedSystem = { ...localConfig.system, auto_download_updates: newVal };
              setLocalConfig((prev: any) => ({ ...prev, system: updatedSystem }));
              if ((window as any).electronAPI?.saveSettings) {
                (window as any).electronAPI.saveSettings({ ...localConfig, system: updatedSystem });
              }
              sendCommand('update_config', { system: updatedSystem });
            }}
            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${
              localConfig.system?.auto_download_updates !== false ? 'bg-neon-green' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute transition-all ${
                localConfig.system?.auto_download_updates !== false ? 'bg-black right-1' : 'bg-black left-1'
              }`}
            />
          </div>
        </div>
      </SettingsField>

      <SettingsField
        label="Desktop Shortcut"
        description="Re-create or update the Mission Control shortcut on your Desktop."
      >
        <button
          aria-label="Create Shortcut"
          type="button"
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
  );
};
