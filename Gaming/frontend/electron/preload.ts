import { ipcRenderer, contextBridge } from 'electron'

// Expose window controls and safe, restricted IPC APIs
contextBridge.exposeInMainWorld('electronAPI', {
  windowControls: (command: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('window-controls', command),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  saveSystemStats: (stats: any) => ipcRenderer.invoke('save-system-stats', stats),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (config: any) => ipcRenderer.invoke('save-settings', config),
  scanGames: () => ipcRenderer.invoke('scan-games'),
  launchGame: (exePath: string) => ipcRenderer.invoke('launch-game', exePath),
  updateHUDConfig: (config: any) => ipcRenderer.send('update-hud-config', config),
  toggleHUD: () => ipcRenderer.send('toggle-hud'),
  onGameFocusChanged: (isActive: boolean, isFocused: boolean, gameTitle?: string, gamePid?: number) => ipcRenderer.send('game-focus-changed', isActive, isFocused, gameTitle, gamePid),
  moveHUDWindow: (deltaX: number, deltaY: number) => ipcRenderer.send('move-hud-window', deltaX, deltaY),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),
  createDesktopShortcut: () => ipcRenderer.invoke('create-desktop-shortcut'),
  checkElectronUpdates: () => ipcRenderer.send('check-electron-updates'),
  downloadElectronUpdate: () => ipcRenderer.send('download-electron-update'),
  quitAndInstallElectronUpdate: () => ipcRenderer.send('quit-and-install-update'),
  setProgressBar: (value: number) => ipcRenderer.send('set-progress-bar', value),
  onNetworkStatusChanged: (isOnline: boolean) => ipcRenderer.send('network-status-changed', isOnline),
  toggleOffscreenRendering: (enable: boolean) => ipcRenderer.send('toggle-offscreen-rendering', enable),
  onHUDStatus: (callback: (isVisible: boolean) => void) => {
    const subscription = (_event: any, isVisible: boolean) => callback(isVisible)
    ipcRenderer.on('hud-status', subscription)
    return () => {
      ipcRenderer.off('hud-status', subscription)
    }
  },
  onElectronUpdateStatus: (callback: (event: any, status: any) => void) => {
    const subscription = (event: any, status: any) => callback(event, status)
    ipcRenderer.on('electron-update-status', subscription)
    return () => {
      ipcRenderer.off('electron-update-status', subscription)
    }
  },
  onHUDMoved: (callback: (coords: { x: number; y: number }) => void) => {
    const subscription = (_event: any, coords: any) => callback(coords)
    ipcRenderer.on('hud-moved', subscription)
    return () => {
      ipcRenderer.off('hud-moved', subscription)
    }
  },
  // Called when the native Windows toast notification is clicked (update available).
  // Triggers the React UpdaterModal to open non-disruptively.
  onOpenUpdaterModal: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('open-updater-modal', subscription)
    return () => {
      ipcRenderer.off('open-updater-modal', subscription)
    }
  },
  // Opens the Changelogs tab in the Updates page (e.g. triggered from version badge click).
  onOpenChangelogsModal: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('open-changelogs-modal', subscription)
    return () => {
      ipcRenderer.off('open-changelogs-modal', subscription)
    }
  },
  pauseElectronUpdate: () => ipcRenderer.send('pause-electron-update'),
  cancelElectronUpdate: () => ipcRenderer.send('cancel-electron-update'),
  rollbackElectronUpdate: () => ipcRenderer.send('rollback-electron-update'),
  getElectronUpdateState: () => ipcRenderer.invoke('get-electron-update-state'),
  checkRollbackBackup: () => ipcRenderer.invoke('check-rollback-backup'),
  onOpenDashboard: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('open-dashboard', subscription)
    return () => {
      ipcRenderer.off('open-dashboard', subscription)
    }
  }
})
