/**
 * Minimal type declarations for electron-updater.
 *
 * electron-updater v6 ships types via "types":"out/index.d.ts" in its
 * package.json, but tsconfig.node.json uses moduleResolution:"bundler"
 * which requires a proper "exports" field that electron-updater lacks.
 * This shim satisfies the TypeScript compiler while keeping full type
 * safety for the subset of the API we actually use.
 */
declare module 'electron-updater' {
  export interface UpdateInfo {
    version: string;
    releaseDate: string;
    releaseNotes?: string | string[] | null;
    releaseName?: string | null;
    downloadedFile?: string;
  }

  export interface ProgressInfo {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  }

  export interface AppUpdater {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    on(event: 'checking-for-update', handler: () => void): this;
    on(event: 'update-available', handler: (info: UpdateInfo) => void): this;
    on(event: 'update-not-available', handler: (info: UpdateInfo) => void): this;
    on(event: 'error', handler: (err: Error) => void): this;
    on(event: 'download-progress', handler: (progress: ProgressInfo) => void): this;
    on(event: 'update-downloaded', handler: (info: UpdateInfo) => void): this;
    checkForUpdates(): Promise<unknown>;
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  }

  export const autoUpdater: AppUpdater;
}
