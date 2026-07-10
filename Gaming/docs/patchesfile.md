# Implementation Plan: Electron Native autoUpdater & Squirrel Integration

Implement auto-update capabilities for Windows and macOS clients using Electron's native `autoUpdater` module powered by Squirrel. This includes proper Squirrel Windows startup event handling (to avoid installation hanging), environment/feature support checks, IPC bridging, and a premium React UI integration.

## User Review Required

> [!IMPORTANT]
> **Environment Context**:
> Native Electron `autoUpdater` runs **only in packaged production apps** on macOS and Windows, signed appropriately. 
> In development mode, the update checking features are safely bypassed via our "Feature Check", and detailed diagnostic logs are output instead of crashing or throwing errors.

> [!TIP]
> **Feed URL Service**:
> We are using Electron's official, free update routing service: `https://update.electronjs.org/arnab825/Mission-Control`. This handles Squirrel.Windows and Squirrel.Mac release feeds seamlessly.

## Open Questions

None. The proposed structure handles production environment updating natively while allowing zero-impact development.

---

## Proposed Changes

We will modify files across both the Electron main process, preload script, TypeScript declarations, and the React UI modal.

### Electron Main & Preload Process

#### [MODIFY] [main.ts](file:///c:/GitHub/Mission-Control/Gaming/frontend/electron/main.ts)
- Add Squirrel startup event handling at the very top of the script. This processes flags like `--squirrel-install`, `--squirrel-updated`, `--squirrel-uninstall`, and `--squirrel-obsolete` to create/remove shortcuts and gracefully exit.
- Integrate `autoUpdater` from `electron`.
- Add a robust `setupAutoUpdater()` function that performs feature/environment checks:
  - Only runs on `win32` or `darwin` and when `app.isPackaged` is true.
  - In development, gracefully registers stubs to return mock status updates without failing.
- Configure Electron official feed URL: `https://update.electronjs.org/arnab825/Mission-Control/${process.platform}-${process.arch}/${app.getVersion()}`
- Wire up `autoUpdater` lifecycle events (`checking-for-update`, `update-available`, `update-not-available`, `error`, `update-downloaded`).
- Expose IPC channels for triggering update checks (`check-electron-updates`) and triggering the installation/restart (`quit-and-install-update`).
- Initialize autoUpdater inside `app.whenReady()`.

#### [MODIFY] [preload.ts](file:///c:/GitHub/Mission-Control/Gaming/frontend/electron/preload.ts)
- Add `checkElectronUpdates`, `quitAndInstallElectronUpdate`, and `onElectronUpdateStatus` to the `electronAPI` context bridge.
- Map global signatures for typed access.

---

### TypeScript Global Definitions

#### [MODIFY] [vite-env.d.ts](file:///c:/Users/DELL/Desktop/GameMode/Gaming/frontend/src/vite-env.d.ts)
- Extend `Window['electronAPI']` to declare all active methods, preventing compilation/Vite build errors.

#### [MODIFY] [global.d.ts](file:///c:/Users/DELL/Desktop/GameMode/Gaming/frontend/src/types/global.d.ts)
- Align global declaration of `electronAPI` with `vite-env.d.ts`.

---

### React Frontend UI

#### [MODIFY] [UpdaterModal.tsx](file:///c:/Users/DELL/Desktop/GameMode/Gaming/frontend/src/components/UpdaterModal.tsx)
- Listen for native Electron update events via `window.electronAPI.onElectronUpdateStatus` inside a `useEffect` hook.
- Maintain reactive state for Electron updates: `electronUpdateState` (status: `checking` | `available` | `up-to-date` | `downloaded` | `error` | `not-supported`).
- Add a beautiful, high-fidelity premium notification banner inside the "Check Updates" tab whenever an Electron app update is downloaded or available.
- Provide a glow-teal "Install & Restart App" action button for applying native wrapper updates.

---

## Verification Plan

### Automated Tests
- Build and compile check: Run TypeScript checker to ensure no compiler/typing complaints:
  ```powershell
  npm run build
  ```

### Manual Verification
- **Development Telemetry Log**: Open the console in development mode to verify that the Feature Check successfully captures the development environment and handles it without crashing:
  ```
  [AutoUpdater] Native autoUpdater is not supported on this platform/environment (requires packaged Windows or macOS).
  ```
- **IPC Hook Integrity**: Click "Check Updates" inside the UI and ensure the mock status or dev status is returned from Electron to the React app via the IPC channel.
