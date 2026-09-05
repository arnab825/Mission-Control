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
      updateTrayTelemetry?: (data: { fps?: number; gpuLoad?: number; gpuTemp?: number; isActive?: boolean }) => void;
      moveHUDWindow?: (deltaX: number, deltaY: number) => void;
      onHUDMoved?: (callback: (coords: { x: number; y: number }) => void) => () => void;
      getAppVersion?: () => Promise<string>;
      checkElectronUpdates?: () => void;
      downloadElectronUpdate?: () => void;
      quitAndInstallElectronUpdate?: () => void;
      fetchGamingNews?: () => Promise<{ success: boolean; items: any[]; totalItems: number }>;
      fetchSteamTrending?: () => Promise<{ success: boolean; games: any[] }>;
      fetchLauncherTrending?: () => Promise<{ success: boolean; games: any[] }>;
      fetchLocalNode?: () => Promise<{ success: boolean; node?: any; error?: string }>;
      searchGamesLive?: (query: string) => Promise<{ success: boolean; games: any[] }>;
      openExternal?: (url: string) => Promise<{ success: boolean; error?: string }>;
      onElectronUpdateStatus?: (callback: (event: any, status: any) => void) => () => void;
      setProgressBar?: (value: number) => void;
      onNetworkStatusChanged?: (isOnline: boolean) => void;
      toggleOffscreenRendering?: (enable: boolean) => void;
      onHUDStatus?: (callback: (isVisible: boolean) => void) => () => void;
      cancelElectronUpdate?: () => void;
      rollbackElectronUpdate?: () => void;
      getElectronUpdateState?: () => Promise<any>;
      onOpenDashboard?: (callback: () => void) => () => void;
      openAuthPopup?: (params: { strategy: string; mode?: 'login' | 'signup' }) => Promise<{ success: boolean; error?: string }>;
      openAuthPopupUrl?: (url: string) => Promise<{ success: boolean; error?: string }>;
      notifyAuthSuccess?: () => void;
      closeAuthPopup?: () => void;
      onAuthCompleted?: (callback: () => void) => () => void;
      onAuthPopupClosed?: (callback: () => void) => () => void;
    };
  }
}
