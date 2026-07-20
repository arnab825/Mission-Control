export {};

declare global {
  interface Window {
    electronAPI?: {
      windowControls: (command: 'minimize' | 'maximize' | 'close') => void;
      getSystemStats: () => Promise<any>;
      saveSystemStats?: (stats: any) => Promise<boolean>;
      loadSettings: () => Promise<any>;
      saveSettings: (config: any) => Promise<boolean>;
      scanGames: () => Promise<any[]>;
      launchGame: (exePath: string) => Promise<{ success: boolean; error: string | null }>;
      updateHUDConfig: (config: any) => void;
      toggleHUD: () => void;
      selectDirectory: () => Promise<string | null>;
      getDesktopPath: () => Promise<string | null>;
      onGameFocusChanged?: (isActive: boolean, isFocused: boolean, gameTitle?: string, gamePid?: number) => void;
      moveHUDWindow?: (deltaX: number, deltaY: number) => void;
      onHUDMoved?: (callback: (coords: { x: number; y: number }) => void) => () => void;
      checkElectronUpdates?: () => void;
      downloadElectronUpdate?: () => void;
      quitAndInstallElectronUpdate?: () => void;
      onElectronUpdateStatus?: (callback: (event: any, status: any) => void) => () => void;
      setProgressBar?: (value: number) => void;
      onNetworkStatusChanged?: (isOnline: boolean) => void;
      toggleOffscreenRendering?: (enable: boolean) => void;
      onHUDStatus?: (callback: (isVisible: boolean) => void) => () => void;
      cancelElectronUpdate?: () => void;
      rollbackElectronUpdate?: () => void;
      onOpenDashboard?: (callback: () => void) => () => void;
    };
  }
}
