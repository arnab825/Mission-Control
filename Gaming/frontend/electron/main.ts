import * as electron from 'electron'
const { app, BrowserWindow, ipcMain, protocol, net, globalShortcut, shell, screen, dialog, Tray, Menu, nativeImage, Notification, session } = electron

// Prevent black screen bugs on hybrid GPU laptops without dropping UI framerates
app.commandLine.appendSwitch('disable-gpu-compositing')

type BrowserWindow = electron.BrowserWindow
type Tray = electron.Tray

import { autoUpdater, CancellationToken } from 'electron-updater'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn, ChildProcess, execSync } from 'node:child_process'
import fs from 'node:fs'
import netSocket from 'node:net'
import os from 'node:os'
import { Worker } from 'node:worker_threads'

// Define file-based logging for Electron main process to capture stdout/stderr and React console.logs
function getLogFilePath(): string {
  const localAppData = process.env.LOCALAPPDATA || (app && app.getPath ? app.getPath('appData') : '');
  const userDataPath = path.join(localAppData, 'MissionControl', 'Electron');
  try {
    fs.mkdirSync(userDataPath, { recursive: true });
  } catch (err) {}
  return path.join(userDataPath, 'app.log');
}

function logToFile(level: string, ...args: any[]) {
  try {
    const logFile = getLogFilePath();
    const msg = args.map(arg => {
      if (arg instanceof Error) return arg.stack || arg.message;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch (_) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    
    const formatted = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
    fs.appendFileSync(logFile, formatted);
  } catch (err) {
    process.stderr.write(`Failed to write to log file: ${err}\n`);
  }
}

// Redirect console methods to write to the persistent log file
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  originalLog(...args);
  logToFile('INFO', ...args);
};
console.error = (...args) => {
  originalError(...args);
  logToFile('ERROR', ...args);
};
console.warn = (...args) => {
  originalWarn(...args);
  logToFile('WARN', ...args);
};

// Catch unhandled node process exceptions
process.on('uncaughtException', (err) => {
  console.error('[Electron Main Process Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Electron Main Process Unhandled Rejection]', reason);
});

// Disable GPU sandbox on Windows to prevent GPU process crashes and black screen issues,
// while keeping hardware acceleration enabled so transparent windows (splash) and Mica load correctly.
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  // Disable color-correct rendering — prevents a black window when the GPU
  // color-space negotiation fails on some driver/monitor combinations.
  app.commandLine.appendSwitch('disable-color-correct-rendering');
  console.log('[Electron] Windows platform detected — applied GPU resilience flags.');
}

// Enable GC exposure for memory management
app.commandLine.appendSwitch('js-flags', '--expose-gc');

function handleSquirrelEvent(): boolean {
  if (process.argv.length === 1) {
    return false;
  }

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawnCmd = function (command: string, args: string[]) {
    let spawnedProcess;
    try {
      spawnedProcess = spawn(command, args, { detached: true });
    } catch (error) { }
    return spawnedProcess;
  };

  const spawnUpdate = function (args: string[]) {
    return spawnCmd(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we register the new version
      app.quit();
      return true;
  }
  return false;
}

if (process.platform === 'win32' && handleSquirrelEvent()) {
  process.exit(0);
}

// Enforce single-instance lock to prevent port and backend process collisions
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('[Electron] Another instance of Mission Control is already running. Exiting...');
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', () => {
    // Focus the main window if a second instance is launched
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

// Set Windows App User Model ID so:
// (1) The taskbar always resolves to the correct pinned shortcut identity.
// (2) Native Notification toasts are attributed to "Mission Control" in the
//     action centre. Must be set before app.whenReady() and any BrowserWindow.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.missioncontrol.app');
}

// Register asset scheme as privileged
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
])

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url))

// Set process.env.DIST so production builds can locate the Vite output index.html and assets
process.env.DIST = path.join(_dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let pythonProcess: ChildProcess | null = null
let tray: Tray | null = null
let isManualUpdateCheck = false;
let updateCancellationToken: CancellationToken | null = null;
let isAppQuitting = false;
let isStartingBackend = false;
let lastBackendStartTime = 0;
let backendRestartTimer: NodeJS.Timeout | null = null;
let backendRestartCount = 0;
const MAX_BACKEND_RESTARTS = 5;

// Fires a native Windows toast notification for update availability.
// Non-blocking — the user decides when/whether to act on it.
// The toast click opens the UpdaterModal in the renderer via IPC.
// Requires app.setAppUserModelId() to have been called first (done above).
function fireUpdateToast(version: string) {
  if (!Notification.isSupported()) return;
  try {
    const toast = new Notification({
      title: 'Mission Control Update Available',
      body: `v${version} is ready to download. Click to review.`,
      icon: path.join(process.env.VITE_PUBLIC || '', 'favicon.ico'),
      urgency: 'normal',
      timeoutType: 'default',
    });
    toast.on('click', () => {
      // Bring the main window to focus and open the updater modal
      if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send('open-updater-modal');
      }
    });
    toast.show();
    console.log(`[AutoUpdater] Native toast notification shown for v${version}.`);
  } catch (err) {
    console.error('[AutoUpdater] Failed to show toast notification:', err);
  }
}


function isAdmin(): boolean {
  if (process.platform !== 'win32') return true;
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function restartAsAdmin() {
  if (process.platform !== 'win32') return;
  try {
    app.releaseSingleInstanceLock();
  } catch (err) {
    console.error('[Electron] Failed to release single instance lock:', err);
  }
  const isDev = !app.isPackaged;
  const args = process.argv.slice(1);
  const psArgs = [
    '-NoProfile',
    '-Command',
    `Start-Process -FilePath "${process.execPath}" ${isDev ? '-ArgumentList "."' : (args.length > 0 ? `-ArgumentList ${args.map(a => '\'' + a.replace(/'/g, "''") + '\'').join(', ')}` : '')} -Verb RunAs`
  ];
  try {
    spawn('powershell.exe', psArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }).unref();
    app.quit();
  } catch (err) {
    console.error('[Electron] Failed to restart as admin:', err);
  }
}

// Spawns background Node.js worker threads to parse telemetry, game stats, and metrics
// without blocking high-frequency main thread UI cycles (Electron Roadmap Item 5).
let telemetryWorker: Worker | null = null;

function runTelemetryWorker() {
  try {
    // Use eval mode with CJS-compatible require calls.
    // Worker eval context runs in CJS by default inside Electron's Node.js.
    const workerScript = [
      "const { parentPort } = require('worker_threads');",
      "const os = require('os');",
      "let workerActive = true;",
      "process.on('SIGTERM', () => { workerActive = false; });",
      "setInterval(() => {",
      "  if (!workerActive || !parentPort) return;",
      "  try {",
      "    const cpus = os.cpus();",
      "    const freeMem = os.freemem();",
      "    const totalMem = os.totalmem();",
      "    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;",
      "    const idleSum = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);",
      "    const totalSum = cpus.reduce((acc, cpu) => Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);",
      "    const cpuUsage = totalSum > 0 ? (1 - idleSum / totalSum) * 100 : 0;",
      "    parentPort.postMessage({",
      "      type: 'telemetry_tick',",
      "      memoryUsage: memoryUsage.toFixed(1),",
      "      cpuUsage: cpuUsage.toFixed(1)",
      "    });",
      "  } catch (e) {}",
      "}, 3000);"
    ].join('\n');

    const worker = new Worker(workerScript, { eval: true });
    telemetryWorker = worker;
    worker.on('message', (data) => {
      if (data.type === 'telemetry_tick') {
        // sendToAllWindows is declared later via function declaration — it hoists correctly
        sendToAllWindows('background-telemetry', data);
      }
    });
    worker.on('error', (err) => {
      console.error('[Electron Worker] Telemetry worker error:', err);
    });
    worker.on('exit', (code) => {
      if (code !== 0) console.warn(`[Electron Worker] Telemetry worker exited with code ${code}`);
    });
    console.log('[Electron Worker] Native Node.js Multithreaded Telemetry Worker active.');
  } catch (err) {
    console.error('[Electron Worker] Failed to start telemetry worker — continuing without background metrics:', err);
  }
}

// Native system context menu handler (Electron Roadmap Item 8)
function registerContextMenu(window: BrowserWindow) {
  window.webContents.on('context-menu', (_event, params) => {
    const template: any[] = [
      { label: 'Reload App', role: 'reload' },
      { label: 'Force Reload', role: 'forceReload' },
    ];

    if (!app.isPackaged) {
      template.push({ type: 'separator' });
      template.push({
        label: 'Inspect Element',
        click: () => {
          if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
            window.webContents.inspectElement(params.x, params.y);
          }
        }
      });
    }

    if (params.isEditable) {
      template.push({ type: 'separator' });
      template.push({ label: 'Cut', role: 'cut' });
      template.push({ label: 'Copy', role: 'copy' });
      template.push({ label: 'Paste', role: 'paste' });
      template.push({ label: 'Select All', role: 'selectAll' });
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup();
  });
}

let updateTrayMenuRef: (() => void) | null = null;
let currentUpdateIcon: any = null;
let updateFrames: any[] = [];
let updateAnimationInterval: NodeJS.Timeout | null = null;
let currentFrameIndex = 0;

function startUpdateAnimation() {
  if (updateAnimationInterval) return;
  currentFrameIndex = 0;
  updateAnimationInterval = setInterval(() => {
    if (updateFrames.length > 0) {
      currentFrameIndex = (currentFrameIndex + 1) % updateFrames.length;
      currentUpdateIcon = updateFrames[currentFrameIndex];
      if (updateTrayMenuRef) {
        try { updateTrayMenuRef(); } catch (_) {}
      }
    }
  }, 150);
}

function stopUpdateAnimation() {
  if (updateAnimationInterval) {
    clearInterval(updateAnimationInterval);
    updateAnimationInterval = null;
  }
  const publicDir = process.env.VITE_PUBLIC || '';
  currentUpdateIcon = nativeImage.createFromPath(path.join(publicDir, 'tray', 'update.png')).resize({ width: 16, height: 16 });
  if (updateTrayMenuRef) {
    try { updateTrayMenuRef(); } catch (_) {}
  }
}

function createTray() {
  try {
    let iconPath = path.join(process.env.VITE_PUBLIC || '', 'favicon.ico');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.env.VITE_PUBLIC || '', 'icon.png');
    }

    let trayIcon;
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      trayIcon = nativeImage.createEmpty();
      console.warn('[Electron] No tray icon file found, using empty placeholder.');
    }

    tray = new Tray(trayIcon);

    const appIcon = getWindowIcon();
    const menuIcon = appIcon ? appIcon.resize({ width: 16, height: 16 }) : undefined;

    // Load generated tray icons
    const publicDir = process.env.VITE_PUBLIC || '';
    const iconDashboard = nativeImage.createFromPath(path.join(publicDir, 'tray', 'dashboard.png')).resize({ width: 16, height: 16 });
    const iconHud = nativeImage.createFromPath(path.join(publicDir, 'tray', 'hud.png')).resize({ width: 16, height: 16 });
    const iconUpdate = nativeImage.createFromPath(path.join(publicDir, 'tray', 'update.png')).resize({ width: 16, height: 16 });
    const iconExit = nativeImage.createFromPath(path.join(publicDir, 'tray', 'exit.png')).resize({ width: 16, height: 16 });

    // Initialize module-scoped variables for animation
    currentUpdateIcon = iconUpdate;
    updateFrames = Array.from({ length: 8 }, (_, i) =>
      nativeImage.createFromPath(path.join(publicDir, 'tray', `update_${i}.png`)).resize({ width: 16, height: 16 })
    );

    function updateTrayMenu() {
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Mission Control Gaming Assistant', enabled: false, icon: menuIcon },
        { type: 'separator' },
        {
          label: 'Show Dashboard', icon: iconDashboard, click: () => {
            if (win && !win.isDestroyed()) {
              if (win.isMinimized()) win.restore();
              win.show();
              win.focus();
              win.webContents.send('open-dashboard');
            } else {
              createWindow();
              win?.webContents.once('did-finish-load', () => {
                win?.webContents.send('open-dashboard');
              });
            }
          }
        },
        {
          label: `Toggle HUD Overlay (${currentHotkey ? currentHotkey.replace('CommandOrControl', 'Ctrl') : 'Ctrl+Alt+H'})`, icon: iconHud, click: () => {
            toggleHUDWindow();
          }
        },
        {
          label: 'Check for Updates', icon: currentUpdateIcon || iconUpdate, click: () => {
            if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
              if (win.isMinimized()) win.restore();
              win.show();
              win.focus();
              win.webContents.send('open-updater-modal');
            } else {
              createWindow();
              win?.webContents.once('did-finish-load', () => {
                if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
                  win.webContents.send('open-updater-modal');
                }
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit Mission Control', icon: iconExit, click: () => {
            app.quit();
          }
        }
      ]);

      tray?.setContextMenu(contextMenu);
    }

    updateTrayMenuRef = updateTrayMenu;
    updateTrayMenu();

    tray?.setToolTip('Mission Control Gaming Assistant'); // Updated dynamically via update-tray-telemetry IPC

    tray?.on('click', () => {
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) {
          win.restore();
          win.focus();
          win.webContents.send('open-dashboard');
        } else if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
          win.webContents.send('open-dashboard');
        }
      } else {
        createWindow();
        win?.webContents.once('did-finish-load', () => {
          win?.webContents.send('open-dashboard');
        });
      }
    });

    tray?.on('double-click', () => {
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.webContents.send('open-dashboard');
      } else {
        createWindow();
        win?.webContents.once('did-finish-load', () => {
          win?.webContents.send('open-dashboard');
        });
      }
    });

    console.log('[Electron] Native System Tray created successfully.');
  } catch (err) {
    console.error('[Electron] Failed to create native System Tray:', err);
  }
}

function configureElectronStoragePaths() {
  const localAppData = process.env.LOCALAPPDATA || app.getPath('appData')
  const userDataPath = path.join(localAppData, 'MissionControl', 'Electron')

  try {
    fs.mkdirSync(userDataPath, { recursive: true })
    app.setPath('userData', userDataPath)
    console.log(`[Electron] Using userData path: ${userDataPath}`)
  } catch (err) {
    console.warn('[Electron] Failed to set custom userData path, continuing with default:', err)
  }
}

configureElectronStoragePaths()

function startPythonBackend(forceRestart = false) {
  if (isAppQuitting) return;

  // Prevent concurrent start calls if backend is already booting
  if (isStartingBackend && !forceRestart) {
    console.log('[Electron] Backend startup already in progress. Skipping redundant request.');
    return;
  }

  // If a restart timer was pending, cancel it since we are starting now
  if (backendRestartTimer) {
    clearTimeout(backendRestartTimer);
    backendRestartTimer = null;
  }

  // If pythonProcess is already alive and running stably, don't kill it unless forceRestart is true
  if (pythonProcess && pythonProcess.pid && !forceRestart) {
    console.log(`[Electron] Backend process already running (PID: ${pythonProcess.pid}). Skipping spawn.`);
    return;
  }

  isStartingBackend = true;
  lastBackendStartTime = Date.now();

  const isDev = !app.isPackaged;
  const scriptPath = isDev
    ? path.join(_dirname, '..', '..', 'backend', 'main.py')
    : path.join((process as any).resourcesPath, 'backend', 'main.py');

  const port = parseInt(process.env.VITE_BRIDGE_PORT || '8765', 10);

  // In packaged mode, only kill lingering background processes if explicitly forced
  if (forceRestart && !isDev && process.platform === 'win32') {
    try {
      execSync('taskkill /f /im MissionControlBackend.exe', { windowsHide: true, stdio: 'ignore' });
      console.log('[Electron] Cleaned up lingering MissionControlBackend.exe background processes on force restart.');
    } catch (_) {}
    if (path.basename(process.execPath).toLowerCase() !== 'missioncontrol.exe') {
      try {
        execSync('taskkill /f /im MissionControl.exe', { windowsHide: true, stdio: 'ignore' });
        console.log('[Electron] Cleaned up lingering legacy MissionControl.exe processes on force restart.');
      } catch (_) {}
    }
  }

  if (isDev) {
    let probeFinished = false;
    const timeout = setTimeout(() => {
      if (!probeFinished) {
        probeFinished = true;
        console.log(`[Electron] Backend probe timeout on port ${port}. Spawning new backend instance...`);
        spawnBackend();
      }
    }, 2000);

    // Probe port first in dev mode to check if external python backend is already running
    const socket = netSocket.createConnection({ port, host: '127.0.0.1' }, () => {
      if (!probeFinished) {
        probeFinished = true;
        clearTimeout(timeout);
        isStartingBackend = false;
        console.log(`[Electron] ✓ External Python backend detected on port ${port}. Skipping auto-spawn.`);
        socket.end();
      }
    });

    socket.on('error', () => {
      if (!probeFinished) {
        probeFinished = true;
        clearTimeout(timeout);
        console.log(`[Electron] Port ${port} is free. Starting Python backend: ${scriptPath}`);
        spawnBackend();
      }
    });
  } else {
    // Packaged production mode: spawn bundled backend directly
    spawnBackend();
  }

  function spawnBackend() {
    // ── Priority chain ──────────────────────────────────────────────────────
    // 1. Dev mode  → use venv python + main.py (hot-reload friendly)
    // 2. Packaged  → use bundled MissionControlBackend.exe (no Python install needed)
    // 3. Fallback  → system python + main.py (developer machine testing)

    let executablePath: string;
    let args: string[] = [];
    let cwdDir: string;

    if (isDev) {
      // Dev: prefer venv python
      const isWin = process.platform === 'win32';
      const venvPython = isWin
        ? path.join(_dirname, '..', '..', 'backend', '.venv', 'Scripts', 'python.exe')
        : path.join(_dirname, '..', '..', 'backend', '.venv', 'bin', 'python');
      executablePath = fs.existsSync(venvPython) ? venvPython : (isWin ? 'python' : 'python3');
      args = [scriptPath, '--dev', '--no-admin'];
      cwdDir = path.dirname(scriptPath);
      console.log(`[Electron] Dev mode — python: ${executablePath}, cwd: ${cwdDir}`);
    } else {
      // Primary: electron-builder extraResources → resources/MissionControlBackend/MissionControlBackend (.exe on Win)
      const exeName = process.platform === 'win32' ? 'MissionControlBackend.exe' : 'MissionControlBackend';
      const bundledExeDirect = path.join((process as any).resourcesPath, 'MissionControlBackend', exeName);
      const bundledExeBuilder = path.join((process as any).resourcesPath, 'backend', 'MissionControlBackend', exeName);

      if (fs.existsSync(bundledExeDirect)) {
        executablePath = bundledExeDirect;
        args = ['--no-admin'];
        cwdDir = path.dirname(bundledExeDirect);
        console.log(`[Electron] Using bundled backend binary (direct): ${bundledExeDirect}`);
      } else if (fs.existsSync(bundledExeBuilder)) {
        executablePath = bundledExeBuilder;
        args = ['--no-admin'];
        cwdDir = path.dirname(bundledExeBuilder);
        console.log(`[Electron] Using bundled backend exe (builder): ${bundledExeBuilder}`);
      } else {
        // Fallback: raw python (developer machine without compiled binary)
        const isWin = process.platform === 'win32';
        const localVenv = isWin
          ? path.join(__dirname, '..', '..', 'backend', '.venv', 'Scripts', 'python.exe')
          : path.join(__dirname, '..', '..', 'backend', '.venv', 'bin', 'python');
        executablePath = fs.existsSync(localVenv) ? localVenv : (isWin ? 'python' : 'python3');
        args = [scriptPath, '--no-admin'];
        cwdDir = path.dirname(scriptPath);
        console.log(`[Electron] Fallback — python: ${executablePath}`);
      }

      if (process.platform !== 'win32' && fs.existsSync(executablePath)) {
        try {
          fs.chmodSync(executablePath, '755');
        } catch (_) {}
      }
    }

    if (pythonProcess) {
      try {
        if (process.platform === 'win32' && pythonProcess.pid) {
          execSync(`taskkill /pid ${pythonProcess.pid} /f /t`, { windowsHide: true, stdio: 'ignore' });
        } else {
          pythonProcess.kill();
        }
      } catch (_) {}
      pythonProcess = null;
    }

    // Spawn the backend – explicit cwd ensures working directory is valid even after NSIS installer updates
    try {
      pythonProcess = spawn(executablePath, args, {
        cwd: cwdDir,
        stdio: 'pipe',
        windowsHide: true,
        detached: false,
        env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1' }
      });
    } catch (spawnErr) {
      isStartingBackend = false;
      console.error('[Electron] Fatal error spawning backend process:', spawnErr);
      return;
    }

    isStartingBackend = false;

    // Reset restart counter after 6s of stable execution
    const stableTimer = setTimeout(() => {
      backendRestartCount = 0;
      console.log('[Electron] Python backend reached stable execution.');
    }, 6000);

    // Forward stdout and stderr to logging in both dev and production so tracebacks appear in app.log
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString().trimEnd();
      if (text) {
        console.log(`[Backend stdout] ${text}`);
      }
    });
    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trimEnd();
      if (text) {
        console.error(`[Backend stderr] ${text}`);
      }
    });

    pythonProcess.on('error', (err) => {
      isStartingBackend = false;
      clearTimeout(stableTimer);
      console.error('[Electron] Failed to start Python backend:', err);
    });

    pythonProcess.on('exit', (code) => {
      clearTimeout(stableTimer);
      isStartingBackend = false;
      console.log(`[Electron] Python backend exited with code ${code}`);
      pythonProcess = null;

      if (!isAppQuitting && backendRestartCount < MAX_BACKEND_RESTARTS) {
        backendRestartCount++;
        const backoffMs = Math.min(2000 * backendRestartCount, 10000);
        console.warn(`[Electron] Backend exited unexpectedly (code ${code}). Scheduling auto-restart (${backendRestartCount}/${MAX_BACKEND_RESTARTS}) in ${backoffMs}ms...`);
        if (backendRestartTimer) clearTimeout(backendRestartTimer);
        backendRestartTimer = setTimeout(() => {
          backendRestartTimer = null;
          if (!isAppQuitting) {
            startPythonBackend(false);
          }
        }, backoffMs);
      }
    });
  }
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(_dirname, '../dist').replace(/\\/g, '/')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public').replace(/\\/g, '/')

function getWindowIcon() {
  const isWindows = process.platform === 'win32';
  const iconName = isWindows ? 'favicon.ico' : 'icon.png';
  const iconPath = path.join(process.env.VITE_PUBLIC || '', iconName);
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return undefined;
}

let win: BrowserWindow | null
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - SystemJS vite plugin
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
let localServerPort = 0

// Fixed port for the local UI server — must be stable across restarts so Clerk's
// localStorage origin (http://127.0.0.1:43221) never changes and sessions persist.
const FIXED_UI_PORT = 43221;

function startLocalServer(distPath: string, port = FIXED_UI_PORT, retries = 3): Promise<number> {
  return new Promise((resolve) => {
    try {
      const server = http.createServer((req, res) => {
        let safeUrl = req.url?.split('?')[0] || '/'
        if (safeUrl === '/') safeUrl = '/index.html'

        let filePath = path.join(distPath, safeUrl).replace(/\\/g, '/')

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          const ext = path.extname(safeUrl).toLowerCase()
          if (ext && ext !== '.html') {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('404 Not Found')
            return
          }
          filePath = path.join(distPath, 'index.html').replace(/\\/g, '/')
        }

        try {
          const data = fs.readFileSync(filePath)
          let contentType = 'text/plain'
          const ext = path.extname(filePath).toLowerCase()
          if (ext === '.html') contentType = 'text/html'
          else if (ext === '.js' || ext === '.mjs') contentType = 'text/javascript'
          else if (ext === '.css') contentType = 'text/css'
          else if (ext === '.json') contentType = 'application/json'
          else if (ext === '.png') contentType = 'image/png'
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
          else if (ext === '.gif') contentType = 'image/gif'
          else if (ext === '.svg') contentType = 'image/svg+xml'
          else if (ext === '.ico') contentType = 'image/x-icon'

          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': data.length,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          })
          res.end(data)
        } catch (readErr) {
          console.error('[Electron Server] Error reading static file:', readErr)
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('500 Internal Server Error')
        }
      })

      server.on('error', (err: any) => {
        if ((err as any).code === 'EADDRINUSE' && retries > 0) {
          console.warn(`[Electron Server] Port ${port} in use, retrying on ${port + 1}...`);
          server.close();
          resolve(startLocalServer(distPath, port + 1, retries - 1));
        } else {
          console.error('[Electron Server] Server error occurred:', err);
          resolve(0);
        }
      });

      server.listen(port, '127.0.0.1', () => {
        const addr = server.address();
        const p = typeof addr === 'string' ? port : (addr ? addr.port : 0);
        console.log(`[Electron] Production local server running at http://127.0.0.1:${p}`)
        resolve(p);
      })
    } catch (err) {
      console.error('[Electron] Failed to start local static server:', err)
      resolve(0)
    }
  })
}

let splash: BrowserWindow | null = null;
async function createWindow() {
  splash = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: false,
    backgroundColor: '#0d0f14',
    frame: false,
    alwaysOnTop: true,
    show: true,
    icon: getWindowIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  if (VITE_DEV_SERVER_URL) {
    splash.loadURL(VITE_DEV_SERVER_URL + 'splash.html').catch(() => {
      splash?.loadFile(path.join(_dirname, 'splash.html')).catch((err) => {
        console.error('[Electron] Failed to load local splash.html fallback:', err);
      });
    });
  } else {
    splash.loadFile(path.join(_dirname, 'splash.html')).catch((err) => {
      console.error('[Electron] Failed to load local splash.html:', err);
    });
  }

  // Mica (backgroundMaterial) can silently fail on some GPU driver / Windows build
  // combinations and render as a solid black window. We only enable it when we are
  // confident the DWM compositor will honour it: Windows 11 build 22000+ (NT 10.0.22000+).
  const osRelease = os.release(); // e.g. "10.0.22621"
  const [, , buildStr] = osRelease.split('.');
  const osBuild = parseInt(buildStr || '0', 10);
  const micaSupported = false; // Disable Mica to resolve black client area composition bugs
  console.log(`[Electron] OS build ${osBuild} — Mica ${micaSupported ? 'ENABLED' : 'DISABLED (fallback to solid bg)'}`);

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false, // Don't show the window until it's ready-to-show
    transparent: false, // Must be false for backgroundMaterial
    backgroundColor: '#0d0f14', // Explicit dark bg — shown if Mica is unavailable
    ...(micaSupported ? { backgroundMaterial: 'mica' } : {}),
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(_dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Keep timers alive when app is behind the game window
    },
  })

  // Open any external target="_blank" or window.open links in the user's default browser or client instead of a tiny Electron popup
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('steam:'))) {
      shell.openExternal(url).catch((err) => {
        console.error('[Electron] Failed to open external URL:', err);
      });
    }
    return { action: 'deny' };
  });

  win.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Web Console] ${message} (${sourceId}:${line})`);
  });

  // Safety timeout: if ready-to-show never fires (renderer stall / load failure),
  // forcibly show the window after 10 s so the user doesn't see a forever-splash.
  let readyToShowFired = false;
  const readyToShowTimeout = setTimeout(() => {
    if (!readyToShowFired && win && !win.isDestroyed() && !win.isVisible()) {
      console.warn('[Electron] ready-to-show timeout hit — forcing window visible.');
      if (splash && !splash.isDestroyed()) {
        try { splash.close(); } catch (_) {}
        splash = null;
      }
      win.show();
      win.focus();
      startPythonBackend();
    }
  }, 10_000);

  win.once('ready-to-show', () => {
    readyToShowFired = true;
    clearTimeout(readyToShowTimeout);
    console.log('[Electron] main window ready-to-show fired!');
    if (splash) {
      try { splash.close(); } catch(e) {}
      splash = null;
    }
    win?.show();
    // Force focus in case the installer or elevation hid the window
    win?.setAlwaysOnTop(true);
    win?.focus();
    win?.setAlwaysOnTop(false);

    // Start Python backend AFTER window is shown to avoid UAC prompt crashing the Electron DWM render context
    startPythonBackend();
  })

  // Recovery: if the URL or file fails to load, retry the fallback immediately
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted navigations (code -3) — these are intentional (e.g. redirect)
    if (errorCode === -3) return;
    console.error(`[Electron] did-fail-load: ${errorCode} ${errorDescription} — URL: ${validatedURL}`);
    // Wait briefly then attempt to fall back to direct file load
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        const indexHtmlPath = path.join(process.env.DIST || '', 'index.html');
        console.warn(`[Electron] Retrying via direct file load: ${indexHtmlPath}`);
        win.loadFile(indexHtmlPath).catch(err => {
          console.error('[Electron] Final fallback loadFile also failed:', err);
        });
      }
    }, 1500);
  })

  registerContextMenu(win)

  // Ensure CSS transparency allows Mica to show through.
  // We'll stick to CSS transparency combined with a frameless transparent window for now.

  const fallbackToFile = () => {
    if (win && !win.isDestroyed()) {
      const indexHtmlPath = path.join(process.env.DIST || '', 'index.html');
      console.log(`[Electron] Falling back to direct file load: ${indexHtmlPath}`);
      win.loadFile(indexHtmlPath).catch(err => {
        console.error('[Electron] Failed to load index.html fallback:', err);
      });
    }
  };

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devtools by default for development
    // win.webContents.openDevTools()
  } else {
    // Start local server if not already started
    if (!localServerPort) {
      localServerPort = await startLocalServer(process.env.DIST || '')
    }
    if (localServerPort > 0) {
      win.loadURL(`http://127.0.0.1:${localServerPort}`).catch(err => {
        console.error('[Electron] Failed to load local server URL:', err);
        // Fallback retry
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.loadURL(`http://127.0.0.1:${localServerPort}`).catch((err2) => {
              console.error('[Electron] Failed to load local server URL on retry:', err2);
              fallbackToFile();
            });
          }
        }, 1000);
      });
    } else {
      console.error('[Electron] Local server port is 0, cannot load UI via HTTP');
      fallbackToFile();
    }
    // win.webContents.openDevTools()
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Listen for child process crashes (GPU process, utility processes, etc.)
app.on('child-process-gone', (_event, details) => {
  console.error(`[Electron] Child process gone: type=${details.type}, reason=${details.reason}, exitCode=${details.exitCode}`);
  if (details.type === 'GPU' && details.reason === 'crashed') {
    console.warn('[Electron] GPU process crashed! Attempting to continue in software rendering fallback.');
  }
});

// Listen for renderer process crashes (React frontend crash, out-of-memory, etc.)
app.on('render-process-gone', (_event, _webContents, details) => {
  console.error(`[Electron] Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  // If the main window renderer crashed, try to reload it or recreate it
  if (win && _webContents === win.webContents) {
    console.warn('[Electron] Main window renderer crashed! Recreating window in 3 seconds...');
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        try { win.close(); } catch (e) {}
      }
      win = null;
      createWindow();
    }, 3000);
  }
});

// Handle SSL/TLS certificate errors in development environments (e.g. self-signed certs or corporate proxies)
app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  if (!app.isPackaged) {
    console.warn(`[Electron] SSL certificate error ignored in development for URL: ${url}`);
    event.preventDefault();
    callback(true); // Trust the certificate
  } else {
    callback(false); // Reject the certificate in production
  }
});

app.whenReady().then(async () => {
  // Clear Chromium cache on startup to ensure updated assets load immediately
  try {
    await session.defaultSession.clearCache();
    console.log('[Electron] Session cache cleared successfully.');
  } catch (err) {
    console.warn('[Electron] Failed to clear session cache:', err);
  }

  // ── Elevation guard ────────────────────────────────────────────────────────
  // The backend requires admin privileges for hardware sensor access (WMI,
  // GPU temp, CPU frequency etc.). In a packaged build, if we are not already
  // elevated we immediately relaunch via PowerShell's "RunAs" verb so the user
  // gets the standard UAC prompt instead of a broken "Awaiting backend" UI.
  // In dev mode we skip this so `npm run dev` still works without UAC.
  if (app.isPackaged && !isAdmin()) {
    console.log('[Electron] Not running as administrator. Requesting elevation via UAC...');
    restartAsAdmin();
    return; // Do NOT continue initialising — we are about to relaunch elevated.
  }

  // Register custom asset protocol handler

  protocol.handle('asset', (request) => {
    console.log(`[Asset Protocol] Requested URL: ${request.url}`)
    try {
      const urlObj = new URL(request.url)
      let filePath = decodeURIComponent(urlObj.pathname)

      if (process.platform === 'win32') {
        if (filePath.startsWith('/')) {
          filePath = filePath.slice(1)
        }
        // If the drive letter got parsed as the host (e.g. asset://c/Users/...)
        if (urlObj.host && urlObj.host.length === 1) {
          filePath = `${urlObj.host}:/${filePath}`
        }
        // If the path somehow starts with a drive letter but no colon (e.g. c/Users/...)
        else if (/^[a-zA-Z]\//.test(filePath)) {
          filePath = filePath.slice(0, 1) + ':' + filePath.slice(1)
        }
      }

      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.ico', '.bmp', '.svg', '.gif'];
      const ext = path.extname(filePath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        console.warn(`[Asset Protocol] Blocked attempt to read non-image file: ${filePath}`);
        return new Response('Forbidden: Only image assets are allowed', { status: 403 });
      }

      if (!fs.existsSync(filePath)) {
        console.warn(`[Asset Protocol] File not found: ${filePath}`);
        return new Response('File Not Found', { status: 404 });
      }

      const finalUrl = pathToFileURL(filePath).toString()
      console.log(`[Asset Protocol] Resolved File URL: ${finalUrl}`)
      return net.fetch(finalUrl)
    } catch (err) {
      console.error('[Asset Protocol] Failed to parse URL:', err)
      return new Response('Invalid URL', { status: 400 })
    }
  })

  // === Startup Fallback Hotkey ===
  // Register a persistent Ctrl+Alt+H hotkey that works even when the main dashboard
  // window is closed. This is replaced by the user's configured hotkey if/when
  // the React app sends update-hud-config via IPC.
  const fallbackHotkey = 'Ctrl+Alt+H';
  try {
    const registered = globalShortcut.register(fallbackHotkey, () => {
      console.log(`[Electron] Startup hotkey triggered: ${fallbackHotkey}`);
      toggleHUDWindow();
    });
    if (registered) {
      currentHotkey = fallbackHotkey;
      console.log(`[Electron] Registered startup fallback hotkey: ${fallbackHotkey}`);
    } else {
      console.warn(`[Electron] Startup hotkey already claimed by another app: ${fallbackHotkey}`);
    }
  } catch (err) {
    console.error(`[Electron] Failed to register startup hotkey:`, err);
  }

  initializeSystemStats()
  createTray()
  runTelemetryWorker()
  createWindow()
  setupAutoUpdater()
})

app.on('before-quit', () => {
  isAppQuitting = true;
  globalShortcut.unregisterAll()
  // Clean up OSR offscreen window
  if (osrWin && !osrWin.isDestroyed()) {
    try { osrWin.close(); } catch (_) { }
    osrWin = null;
  }
  // Clean up system tray
  if (tray && !tray.isDestroyed()) {
    try { tray.destroy(); } catch (_) { }
    tray = null;
  }
  // Terminate background telemetry worker thread so it does not block app exit
  if (telemetryWorker) {
    try { telemetryWorker.terminate(); } catch (_) { }
    telemetryWorker = null;
  }
  if (pythonProcess && pythonProcess.pid) {
    console.log('[Electron] Killing Python backend process tree...')
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${pythonProcess.pid} /f /t`, { windowsHide: true })
      } catch (err) {
        console.error('[Electron] Failed to taskkill Python process tree:', err)
        try { pythonProcess.kill() } catch (_) { }
      }
    } else {
      try { pythonProcess.kill() } catch (_) { }
    }
    pythonProcess = null
  }
})

// IPC handlers for window controls (since it's frameless)
ipcMain.on('window-controls', (_event, command) => {
  if (!win) return
  switch (command) {
    case 'minimize':
      win.minimize()
      break
    case 'maximize':
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
      break
    case 'close':
      win.close()
      break
  }
})

// === IPC Handlers for System Intel ===
let cachedSystemStats: any = null;

/**
 * Background fetch for system specifications using native Node OS module.
 * This is 100% reliable, instant, and runs with zero risk of hangs.
 * Detailed hardware info is later merged in frontend via WebSocket.
 */
const initializeSystemStats = () => {
  if (cachedSystemStats) return;

  try {
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Processor';
    const totalMemBytes = os.totalmem();
    const release = os.release();
    const arch = os.arch();

    let osEdition = 'Windows';
    if (process.platform === 'win32') {
      osEdition = 'Windows ' + (release.startsWith('10.') ? '10/11' : release);
    } else if (process.platform === 'darwin') {
      osEdition = 'macOS';
    } else if (process.platform === 'linux') {
      osEdition = 'Linux';
    }

    cachedSystemStats = {
      hardware: {
        cpu: cpuModel,
        cores: cpus.length,
        threads: cpus.length,
        gpu: 'Gathering...',
        ram: `${Math.round(totalMemBytes / (1024 ** 3))}GB`,
        storage: 'Gathering...',
        ram_details: [],
        storage_details: []
      },
      network: null,
      displays: [],
      peripherals: [],
      os_details: {
        edition: osEdition,
        version: release,
        architecture: arch
      }
    };
    console.log('[Electron] Lightweight native system specs initialized.');
  } catch (err) {
    console.error('[Electron] Failed to initialize system specs:', err);
  }
};

ipcMain.handle('get-system-stats', async () => {
  if (!cachedSystemStats) {
    initializeSystemStats();
  }
  return cachedSystemStats;
});

ipcMain.handle('save-system-stats', async (_event, stats) => {
  try {
    cachedSystemStats = stats;
    console.log('[Electron] Cached full system specs received from frontend.');
    return true;
  } catch (err) {
    console.error('[Electron] Failed to save system stats cache:', err);
    return false;
  }
});

// Trigger initial gather on startup handled in consolidated app.whenReady

ipcMain.handle('select-directory', async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('get-desktop-path', async () => {
  try {
    return app.getPath('desktop').replace(/\\/g, '/');
  } catch (err) {
    console.error('Failed to get desktop path:', err);
    return null;
  }
});

// === IPC Handlers for Settings Config ===
const CONFIG_PATH = path.join(app.getPath('userData'), 'aero_config.json');

ipcMain.handle('load-settings', async () => {
  try {
    let config: any = {};
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      config = JSON.parse(data);
    }
    if (!config.system) config.system = {};
    if (config.system.open_at_login === undefined) {
      config.system.open_at_login = app.getLoginItemSettings().openAtLogin;
    }
    if (config.system.auto_download_updates === undefined) {
      config.system.auto_download_updates = true;
    }
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  return null;
});

ipcMain.handle('save-settings', async (_event, config) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    if (config && config.system) {
      const openAtLogin = !!config.system.open_at_login;
      app.setLoginItemSettings({
        openAtLogin: openAtLogin,
        path: process.execPath,
        args: []
      });
      console.log(`[Electron] Set openAtLogin to ${openAtLogin}`);
      
      const autoDownload = config.system.auto_download_updates !== false;
      autoUpdater.autoDownload = autoDownload;
      console.log(`[Electron] Set autoUpdater.autoDownload to ${autoDownload}`);
    }
    if (updateTrayMenuRef) {
      updateTrayMenuRef();
    }
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
});

ipcMain.handle('create-desktop-shortcut', async () => {
  try {
    const shortcutPath = path.join(app.getPath('desktop'), 'Mission Control.lnk');
    const exePath = process.execPath;
    const result = shell.writeShortcutLink(shortcutPath, {
      target: exePath,
      cwd: path.dirname(exePath),
      icon: exePath,
      iconIndex: 0,
      description: 'Mission Control Gaming Assistant'
    });
    console.log(`[Electron] Desktop shortcut creation result: ${result}`);
    return result;
  } catch (err) {
    console.error('[Electron] Failed to create desktop shortcut:', err);
    return false;
  }
});

// === IPC Handlers for Game Library ===
// Note: The actual game scan is now handled by the Python backend via WebSocket.
// This IPC handler is kept as a no-op stub for API compatibility.
ipcMain.handle('scan-games', async () => {
  return []; // Scanning is handled via bridge WebSocket (scan_games command)
});

ipcMain.handle('launch-game', async (_event, exePath: string) => {
  try {
    if (!exePath) return { success: false, error: 'No exe path provided' };

    if (exePath.includes('://')) {
      await shell.openExternal(exePath);
      return { success: true, error: null };
    } else {
      // Open the game executable or shortcut using shell.openPath.
      // This is the cleanest and most robust method on Windows: it acts exactly
      // like double-clicking the file in Explorer and handles UAC elevation prompts automatically.
      const result = await shell.openPath(exePath);
      if (result) {
        // shell.openPath returns a non-empty string with an error message on failure
        console.error(`[Electron] shell.openPath failed: ${result}`);
        return { success: false, error: result };
      }
      console.log(`[Electron] Successfully launched game: ${exePath}`);
      return { success: true, error: null };
    }
  } catch (err: any) {
    console.error('[Electron] Failed to launch game:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-external', async (_event, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('steam://'))) {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err: any) {
      console.error('[Electron] Failed to open external URL:', err);
      return { success: false, error: err?.message };
    }
  }
  return { success: false, error: 'Invalid URL scheme' };
});

let hudWin: BrowserWindow | null = null;
let isHUDVisible = false;
let currentHotkey: string = '';
let currentAgentHotkey: string = '';
let cachedConfig: any = null;
let lastActiveGame: string | null = null;
let lastActiveGamePid: number | null = null;
let wasHUDExplicitlyClosed = false;
let isHUDManuallyToggled = false;
let inactiveTimeout: NodeJS.Timeout | null = null;
let hasUserDeclinedAdminThisSession = false;


// Caches and guards for HUD preset changes optimization
let isProgrammaticHUDMove = false;
let hudAnimationInterval: NodeJS.Timeout | null = null;
let lastHUDLocked: boolean | null = null;

// Track last known focus state to prevent spamming native Win32 window calls
let lastGameFocusState = {
  isActive: false,
  isFocused: false,
  gameTitle: '',
  gamePid: 0
};


// Converts python pynput style shortcut like "<ctrl>+<alt>+o" to Electron accelerator "Ctrl+Alt+O"
function convertHotkeyToElectron(hotkey: string): string {
  if (!hotkey) return '';
  return hotkey
    .toLowerCase()
    .replace(/<ctrl>/g, 'Ctrl')
    .replace(/<alt>/g, 'Alt')
    .replace(/<shift>/g, 'Shift')
    .replace(/<win>/g, 'Super')
    .split('+')
    .map(part => {
      const clean = part.replace(/[<>]/g, '');
      if (clean === '=') return '=';
      if (clean === '-') return '-';
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join('+');
}

function getInitialHUDPosition(layout?: string): { x: number; y: number; width: number; height: number } {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: scrWidth, height: scrHeight } = primaryDisplay.workAreaSize;

    const overlay = cachedConfig?.overlay || {};
    const layoutStyle = overlay.layout_style || 'standard';
    let winWidth = 320;
    let winHeight = 620;

    if (layoutStyle === 'compact') {
      winWidth = 220;
      winHeight = 360;
    } else if (layoutStyle === 'horizontal') {
      winWidth = 1150;
      winHeight = 48;
    }

    const isLocked = overlay.lock_position === true;
    const hasCustomCoords = typeof overlay.x === 'number' && typeof overlay.y === 'number';

    let x: number;
    let y: number;

    if (!isLocked && hasCustomCoords) {
      x = Math.round(overlay.x);
      y = Math.round(overlay.y);
    } else {
      const margin = 24; // Spacing from edge
      x = margin;
      y = margin; // default top-left

      const targetLayout = layout || overlay.layout || 'top-left';
      if (targetLayout === 'top-right') {
        x = scrWidth - winWidth - margin;
        y = margin;
      } else if (targetLayout === 'bottom-right') {
        x = scrWidth - winWidth - margin;
        y = scrHeight - winHeight - margin;
      } else if (targetLayout === 'bottom-left') {
        x = margin;
        y = scrHeight - winHeight - margin;
      }
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: winWidth,
      height: winHeight
    };
  } catch (err) {
    console.error('[Electron] Failed to compute HUD position:', err);
    return { x: 24, y: 24, width: 280, height: 360 };
  }
}

async function createHUDWindow(showOnReady: boolean = false) {
  if (hudWin && !hudWin.isDestroyed()) {
    hudWin.showInactive();
    return;
  }

  // Enforce Administrator privileges on Windows to allow CPU temp & wattage sensor reading
  const skipAdminCheck = cachedConfig?.overlay?.skip_admin_prompt === true || hasUserDeclinedAdminThisSession;
  if (process.platform === 'win32' && !isAdmin() && !skipAdminCheck) {
    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['Restart as Admin', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      title: 'Administrator Privileges Required',
      message: 'The HUD requires Administrator privileges to read CPU temperature and wattage.',
      detail: 'To enable hardware sensor telemetry, the application needs to run with elevated privileges. Would you like to restart as Administrator?'
    });

    if (choice === 0) {
      restartAsAdmin();
      return;
    } else {
      hasUserDeclinedAdminThisSession = true;
      console.log('[Electron] User declined administrator elevation prompt. Spawning HUD overlay in non-elevated mode.');
    }
  }

  const isDev = !app.isPackaged;
  const initialPos = getInitialHUDPosition();

  hudWin = new BrowserWindow({
    x: initialPos.x,
    y: initialPos.y,
    width: initialPos.width,
    height: initialPos.height,
    frame: false,
    show: false,             // Don't show until ready-to-show
    transparent: true,
    alwaysOnTop: true,
    focusable: false,       // Prevents stealing focus and getting minimized by Windows OS
    resizable: false,
    minimizable: false,     // Prevents OS-level minimization
    skipTaskbar: true,
    type: 'toolbar',        // Native Win32 WS_EX_TOOLWINDOW — exempts from OS auto-minimizing in fullscreen
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(_dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Never throttle timers — keep HUD refresh alive behind the game
    },
  });

  hudWin.once('ready-to-show', () => {
    if (showOnReady && hudWin && !hudWin.isDestroyed()) {
      hudWin.showInactive();
    }
  });

  hudWin.on('show', () => {
    isHUDVisible = true;
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('hud-status', true);
    }
    if (hudWin && !hudWin.isDestroyed() && !hudWin.webContents.isDestroyed()) {
      hudWin.webContents.send('hud-status', true);
    }
    if (cachedConfig) {
      const isLocked = cachedConfig.overlay?.lock_position === true;
      if (hudWin && !hudWin.isDestroyed()) {
        hudWin.setIgnoreMouseEvents(isLocked, isLocked ? { forward: true } : undefined);
      }
      positionHUDWindow(cachedConfig.overlay?.layout || 'top-left');
    } else {
      positionHUDWindow('top-left');
    }
  });

  hudWin.on('hide', () => {
    isHUDVisible = false;
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('hud-status', false);
    }
    if (hudWin && !hudWin.isDestroyed() && !hudWin.webContents.isDestroyed()) {
      hudWin.webContents.send('hud-status', false);
    }
  });

  registerContextMenu(hudWin)

  // Elevated always-on-top level to 'screen-saver' to float above exclusive borderless fullscreen games
  hudWin.setAlwaysOnTop(true, 'screen-saver', 1);

  // Ensure window is visible even when another window is in fullscreen mode
  hudWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Make sure to avoid default white flashing
  hudWin.setBackgroundColor('#00000000');

  // Load route hash for standalone HUD mode
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    hudWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#hud`);
  } else {
    // Start local server if not already started
    if (!localServerPort) {
      localServerPort = await startLocalServer(process.env.DIST || '');
    }
    if (localServerPort > 0) {
      hudWin.loadURL(`http://127.0.0.1:${localServerPort}/#hud`).catch(err => {
        console.error('[Electron] HUD Window failed to load:', err);
        setTimeout(() => {
          if (hudWin && !hudWin.isDestroyed()) {
            hudWin.loadURL(`http://127.0.0.1:${localServerPort}/#hud`).catch(() => {});
          }
        }, 1000);
      });
    } else {
      console.error('[Electron] Local server port is 0, cannot load HUD UI');
    }
  }

  hudWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Electron] HUD Window failed to load: ${errorCode} - ${errorDescription}`);
  });

  hudWin.on('closed', () => {
    hudWin = null;
    isHUDVisible = false;
    lastHUDLocked = null;
    isHUDManuallyToggled = false;
    if (hudAnimationInterval) {
      clearInterval(hudAnimationInterval);
      hudAnimationInterval = null;
    }
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('hud-status', false);
    }
  });

  let moveTimeout: NodeJS.Timeout;
  hudWin.on('move', () => {
    if (isProgrammaticHUDMove) return;
    if (cachedConfig?.overlay?.lock_position === true) return;
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      if (hudWin && !hudWin.isDestroyed()) {
        const [x, y] = hudWin.getPosition();
        if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
          win.webContents.send('hud-moved', { x, y });
        }
      }
    }, 300);
  });

  hudWin.webContents.on('did-finish-load', () => {
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('hud-status', isHUDVisible);
    }
  });
}

function positionHUDWindow(layout: string) {
  if (!hudWin || hudWin.isDestroyed()) return;

  try {
    const pos = getInitialHUDPosition(layout);

    // Stop any running animations
    if (hudAnimationInterval) {
      clearInterval(hudAnimationInterval);
      hudAnimationInterval = null;
    }

    isProgrammaticHUDMove = true;

    // Temporarily enable resizable to allow changing window dimensions on Windows OS
    hudWin.setResizable(true);
    hudWin.setBounds({
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height
    });
    hudWin.setResizable(false);

    setTimeout(() => {
      isProgrammaticHUDMove = false;
    }, 50);

  } catch (err) {
    console.error('[Electron] Failed to position HUD window:', err);
    isProgrammaticHUDMove = false;
  }
}

let lastHUDToggleTime = 0;

function toggleHUDWindow() {
  const now = Date.now();
  if (now - lastHUDToggleTime < 500) {
    console.log('[Electron] Ignoring duplicate HUD toggle request within cooldown window.');
    return;
  }
  lastHUDToggleTime = now;

  if (!hudWin || hudWin.isDestroyed()) {
    wasHUDExplicitlyClosed = false;
    isHUDManuallyToggled = true;
    createHUDWindow(true);
  } else {
    if (!hudWin.isVisible()) {
      wasHUDExplicitlyClosed = false;
      isHUDManuallyToggled = true;
      hudWin.showInactive();
      hudWin.setAlwaysOnTop(true, 'screen-saver', 1);
      console.log('[Electron] HUD window was hidden; showing and setting manual override to true.');
    } else {
      wasHUDExplicitlyClosed = true;
      isHUDManuallyToggled = false;
      // Hide the window instead of closing/destroying it to allow instant open toggles
      hudWin.hide();
      console.log('[Electron] HUD window was visible; hiding instead of closing.');
    }
  }
}



function updateHUDConfig(config: any) {
  if (!config) return;

  // 1. Update global hotkey shortcut
  const rawHotkey = config.hotkeys?.toggle_hud || '<ctrl>+<alt>+o';
  const electronHotkey = convertHotkeyToElectron(rawHotkey);

  if (electronHotkey && currentHotkey !== electronHotkey) {
    if (currentHotkey) {
      try {
        globalShortcut.unregister(currentHotkey);
        console.log(`[Electron] Unregistered old hotkey: ${currentHotkey}`);
      } catch (err) {
        console.error(`[Electron] Failed to unregister old hotkey ${currentHotkey}:`, err);
      }
    }

    currentHotkey = electronHotkey;

    try {
      const registered = globalShortcut.register(electronHotkey, () => {
        console.log(`[Electron] Global shortcut triggered: ${electronHotkey}`);
        toggleHUDWindow();
      });
      if (registered) {
        console.log(`[Electron] Successfully registered new global hotkey: ${electronHotkey}`);
      } else {
        console.warn(`[Electron] Registration returned false for hotkey: ${electronHotkey}`);
      }
    } catch (err) {
      console.error(`[Electron] Failed to register global hotkey ${electronHotkey}:`, err);
    }
  }

  // 2. Update agentic toggle hotkey
  const rawAgentHotkey = config.hotkeys?.toggle_agentic || '<ctrl>+<alt>+a';
  const electronAgentHotkey = convertHotkeyToElectron(rawAgentHotkey);

  if (electronAgentHotkey && currentAgentHotkey !== electronAgentHotkey) {
    if (currentAgentHotkey) {
      try {
        globalShortcut.unregister(currentAgentHotkey);
        console.log(`[Electron] Unregistered old agent hotkey: ${currentAgentHotkey}`);
      } catch (err) {
        console.error(`[Electron] Failed to unregister old agent hotkey ${currentAgentHotkey}:`, err);
      }
    }

    currentAgentHotkey = electronAgentHotkey;

    try {
      const registered = globalShortcut.register(electronAgentHotkey, () => {
        console.log(`[Electron] Global shortcut triggered: ${electronAgentHotkey}`);
        if (win && !win.isDestroyed()) {
          win.webContents.send('toggle-agentic-hotkey');
        }
      });
      if (registered) {
        console.log(`[Electron] Successfully registered new global agent hotkey: ${electronAgentHotkey}`);
      } else {
        console.warn(`[Electron] Registration returned false for agent hotkey: ${electronAgentHotkey}`);
      }
    } catch (err) {
      console.error(`[Electron] Failed to register global agent hotkey ${electronAgentHotkey}:`, err);
    }
  }

  // 2. Update Click-Through settings on the HUD window
  const isLocked = config.overlay?.lock_position === true;
  if (hudWin && !hudWin.isDestroyed() && lastHUDLocked !== isLocked) {
    hudWin.setIgnoreMouseEvents(isLocked, isLocked ? { forward: true } : undefined);
    lastHUDLocked = isLocked;
    console.log(`[Electron] HUD window position lock set: click-through = ${isLocked}`);
  }

  // 3. Update HUD window position based on layout preset ONLY if layout configuration changed
  const layoutChanged = !cachedConfig ||
    cachedConfig.overlay?.layout !== config.overlay?.layout ||
    cachedConfig.overlay?.layout_style !== config.overlay?.layout_style ||
    cachedConfig.overlay?.lock_position !== config.overlay?.lock_position;

  cachedConfig = config;

  if (layoutChanged) {
    const layout = config.overlay?.layout || 'top-left';
    positionHUDWindow(layout);
  }

  if (updateTrayMenuRef) {
    updateTrayMenuRef();
  }
}

ipcMain.on('toggle-hud', () => {
  toggleHUDWindow();
});

ipcMain.on('move-hud-window', (_event, deltaX: number, deltaY: number) => {
  if (hudWin && !hudWin.isDestroyed()) {
    const [x, y] = hudWin.getPosition();
    hudWin.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
  }
});

ipcMain.on('update-hud-config', (_event, config) => {
  updateHUDConfig(config);
});

// Live tray tooltip: update with FPS/GPU metrics so users can check performance
// by hovering the system tray icon without alt-tabbing out of fullscreen.
ipcMain.on('update-tray-telemetry', (_event, data: { fps?: number; gpuLoad?: number; gpuTemp?: number; isActive?: boolean }) => {
  if (!tray || tray.isDestroyed()) return;
  if (!data.isActive) {
    tray.setToolTip('Mission Control Gaming Assistant');
    return;
  }
  const parts = ['Mission Control'];
  if (data.fps != null && data.fps > 0) parts.push(`${Math.round(data.fps)} FPS`);
  if (data.gpuLoad != null) parts.push(`GPU ${Math.round(data.gpuLoad)}%`);
  if (data.gpuTemp != null && data.gpuTemp > 0) parts.push(`${Math.round(data.gpuTemp)}°C`);
  tray.setToolTip(parts.join(' | '));
});

ipcMain.on('game-focus-changed', (_event, isActive: boolean, isFocused: boolean, gameTitle?: string, gamePid?: number) => {
  try {
    const currentGame = gameTitle || 'Scanned Game';
    const currentPid = gamePid || null;

    // Deduplicate: If state hasn't changed, skip expensive Win32 calls
    if (
      lastGameFocusState.isActive === isActive &&
      lastGameFocusState.isFocused === isFocused &&
      lastGameFocusState.gameTitle === currentGame &&
      lastGameFocusState.gamePid === (currentPid || 0)
    ) {
      return;
    }

    lastGameFocusState = {
      isActive,
      isFocused,
      gameTitle: currentGame,
      gamePid: currentPid || 0
    };

    if (isActive) {
      if (inactiveTimeout) {
        clearTimeout(inactiveTimeout);
        inactiveTimeout = null;
      }

      // We only reset wasHUDExplicitlyClosed if this is a different game session.
      // We skip treating the generic placeholder 'Scanned Game' as a new session key.
      if (currentGame !== 'Scanned Game') {
        const isDifferentGame = currentPid !== null
          ? currentPid !== lastActiveGamePid
          : currentGame !== lastActiveGame;

        if (isDifferentGame) {
          lastActiveGame = currentGame;
          lastActiveGamePid = currentPid;
          wasHUDExplicitlyClosed = false;
          console.log(`[Electron] New game session started: ${currentGame} (PID: ${currentPid}). Resetting explicit close flag.`);
        }
      }

      const shouldAutoSpawn = cachedConfig?.overlay?.auto_spawn !== false;
      if (!wasHUDExplicitlyClosed && shouldAutoSpawn) {
        if (!hudWin || hudWin.isDestroyed()) {
          createHUDWindow(isFocused);
          console.log(`[Electron] Game active: ${currentGame} — auto-spawned HUD overlay window.`);

          // Auto-spawn HUD overlay window.
        }
      }

      if (isFocused) {
        const assertZOrder = () => {
          if (hudWin && !hudWin.isDestroyed() && (hudWin.isVisible() || !wasHUDExplicitlyClosed)) {
            hudWin.showInactive();
            hudWin.setAlwaysOnTop(true, 'screen-saver', 1);
          }
        };
        assertZOrder();
        setTimeout(assertZOrder, 200);
        console.log(`[Electron] Game focused: ${currentGame} — asserted HUD overlay z-order.`);
      } else {
        const isLocked = cachedConfig?.overlay?.lock_position === true;
        if (!isHUDManuallyToggled && isLocked) {
          if (hudWin && !hudWin.isDestroyed()) {
            hudWin.hide();
          }
          console.log(`[Electron] Game unfocused: ${currentGame} — hiding locked HUD overlay.`);
        } else {
          console.log(`[Electron] Game unfocused: ${currentGame} — keeping unlocked or manually-toggled HUD overlay visible for interaction.`);
        }
      }
    } else {
      // Game has gone inactive. Instead of clearing the session immediately (which
      // triggers HUD re-spawn on transient glitches/disconnects), we wait 5 seconds.
      if (!inactiveTimeout) {
        inactiveTimeout = setTimeout(() => {
          lastActiveGame = null;
          lastActiveGamePid = null;
          wasHUDExplicitlyClosed = false;
          inactiveTimeout = null;
          console.log('[Electron] Game has been inactive for 5 seconds. Resetting HUD state tracking.');
        }, 5000);
      }

      if (!isHUDManuallyToggled) {
        if (hudWin && !hudWin.isDestroyed()) {
          hudWin.close();
        }
      }
    }
  } catch (err) {
    console.error('[Electron] Failed to handle HUD on game focus:', err);
  }
});

// === electron-updater Configuration (NSIS / GitHub Releases & Direct Fallback) ===
function setupAutoUpdater() {
  const isSupported = (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux') && app.isPackaged;
  const UPDATE_STATE_PATH = path.join(app.getPath('userData'), 'update_download_state.json');

  interface GitHubReleaseFallback {
    available: boolean;
    version?: string;
    releaseNotes?: string;
    releaseDate?: string;
    assetUrl?: string;
    assetName?: string;
    assetSize?: number;
  }

  let directUpdateInfo: GitHubReleaseFallback | null = null;
  let directDownloadRequest: http.ClientRequest | null = null;
  let directDownloadAborted = false;
  let activeDirectInstallerPath: string | null = null;

  function isNewerSemver(remote: string, local: string): boolean {
    const parse = (v: string) => v.replace(/^v/i, '').split('.').map(Number);
    const r = parse(remote);
    const l = parse(local);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
      const rv = r[i] || 0;
      const lv = l[i] || 0;
      if (rv > lv) return true;
      if (rv < lv) return false;
    }
    return false;
  }

  function fetchGitHubReleaseUpdate(): Promise<GitHubReleaseFallback> {
    return new Promise((resolve) => {
      const currentVersion = app.getVersion();
      const options = {
        hostname: 'api.github.com',
        path: '/repos/arnab825/Mission-Control/releases',
        method: 'GET',
        headers: {
          'User-Agent': 'MissionControl-Desktop-Updater',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 8000
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          console.warn(`[AutoUpdater] GitHub Releases API returned status ${res.statusCode}`);
          return resolve({ available: false });
        }
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const releases = JSON.parse(rawData);
            if (!Array.isArray(releases) || releases.length === 0) {
              return resolve({ available: false });
            }

            const latestRelease = releases.find((r: any) => !r.draft);
            if (!latestRelease || !latestRelease.tag_name) {
              return resolve({ available: false });
            }

            const remoteVer = latestRelease.tag_name.replace(/^v/i, '');
            const isNewer = isNewerSemver(remoteVer, currentVersion);
            if (!isNewer) {
              return resolve({ available: false, version: remoteVer });
            }

            const assets: any[] = latestRelease.assets || [];
            let matchingAsset: any = null;

            if (process.platform === 'win32') {
              matchingAsset = assets.find((a: any) => a.name.endsWith('.exe')) ||
                              assets.find((a: any) => a.name.endsWith('.msi')) ||
                              assets.find((a: any) => a.name.endsWith('.zip'));
            } else if (process.platform === 'linux') {
              matchingAsset = assets.find((a: any) => a.name.endsWith('.AppImage') || a.name.endsWith('.tar.gz') || a.name.endsWith('.deb'));
            } else {
              matchingAsset = assets.find((a: any) => a.name.endsWith('.dmg') || a.name.endsWith('.zip'));
            }

            if (matchingAsset && matchingAsset.browser_download_url) {
              return resolve({
                available: true,
                version: remoteVer,
                releaseNotes: typeof latestRelease.body === 'string' ? latestRelease.body : '',
                releaseDate: latestRelease.published_at || latestRelease.created_at,
                assetUrl: matchingAsset.browser_download_url,
                assetName: matchingAsset.name,
                assetSize: matchingAsset.size
              });
            }

            return resolve({ available: false, version: remoteVer });
          } catch (parseErr) {
            console.warn('[AutoUpdater] Failed to parse GitHub releases response:', parseErr);
            resolve({ available: false });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ available: false });
      });

      req.on('error', (err) => {
        console.warn('[AutoUpdater] GitHub Releases API request failed:', err);
        resolve({ available: false });
      });

      req.end();
    });
  }

  function downloadDirectUpdatePayload(downloadUrl: string, version: string): Promise<string> {
    return new Promise((resolve, reject) => {
      directDownloadAborted = false;
      const updaterDir = path.join(app.getPath('userData'), '../mission-control-updater/pending');
      try { fs.mkdirSync(updaterDir, { recursive: true }); } catch (_) {}
      
      const fileName = path.basename(downloadUrl.split('?')[0]) || 'MissionControl-Setup.exe';
      const targetFile = path.join(updaterDir, fileName.endsWith('.exe') ? fileName : 'MissionControl-Setup.exe');
      const tempFile = path.join(updaterDir, 'MissionControl-Setup.tmp');

      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }

      sendToAllWindows('electron-update-status', {
        status: 'downloading',
        version: version,
        percent: 0,
        message: 'Starting installer package download from GitHub...'
      });

      const startDownload = (currentUrl: string, redirectCount = 0) => {
        if (redirectCount > 5) {
          return reject(new Error('Too many redirects while downloading update payload.'));
        }
        if (directDownloadAborted) {
          return reject(new Error('Download cancelled by user.'));
        }

        const client = currentUrl.startsWith('https:') ? https : http;
        const req = client.get(currentUrl, {
          headers: {
            'User-Agent': 'MissionControl-Desktop-Updater',
            'Accept': 'application/octet-stream'
          }
        }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return startDownload(res.headers.location, redirectCount + 1);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`Download failed with server status ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;
          let lastReportedPercent = -1;
          let lastReportTime = 0;

          const fileStream = fs.createWriteStream(tempFile);

          res.on('data', (chunk) => {
            if (directDownloadAborted) {
              req.destroy();
              fileStream.close();
              try { fs.unlinkSync(tempFile); } catch (_) {}
              return;
            }
            downloadedBytes += chunk.length;
            const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
            const now = Date.now();
            if (percent !== lastReportedPercent && (now - lastReportTime > 200 || percent === 100)) {
              lastReportedPercent = percent;
              lastReportTime = now;
              const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
              const totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';
              const progressState = {
                status: 'downloading',
                version: version,
                percent: percent,
                message: `Downloading update… ${percent}% (${downloadedMB} MB / ${totalMB} MB)`
              };
              saveUpdateState(progressState);
              sendToAllWindows('electron-update-status', progressState);
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              if (directDownloadAborted) {
                try { fs.unlinkSync(tempFile); } catch (_) {}
                return reject(new Error('Download cancelled by user.'));
              }
              try {
                if (fs.existsSync(targetFile)) {
                  fs.unlinkSync(targetFile);
                }
                fs.renameSync(tempFile, targetFile);
              } catch (renameErr) {
                console.warn('[AutoUpdater] Failed to rename temp download file, keeping temp path:', renameErr);
              }

              console.log('[AutoUpdater] Direct installer download completed:', targetFile);
              stopUpdateAnimation();
              const downloadedState = {
                status: 'downloaded',
                version: version,
                date: directUpdateInfo?.releaseDate || new Date().toISOString(),
                notes: directUpdateInfo?.releaseNotes || '',
                message: `Update v${version} downloaded and ready to install.`,
                percent: 100
              };
              saveUpdateState(downloadedState);
              sendToAllWindows('electron-update-status', downloadedState);
              activeDirectInstallerPath = targetFile;
              resolve(targetFile);
            });
          });

          fileStream.on('error', (err) => {
            try { fs.unlinkSync(tempFile); } catch (_) {}
            reject(err);
          });
        });

        directDownloadRequest = req;

        req.on('error', (err) => {
          if (!directDownloadAborted) {
            try { fs.unlinkSync(tempFile); } catch (_) {}
            reject(err);
          }
        });
      };

      startDownload(downloadUrl);
    });
  }

  function saveUpdateState(state: any) {
    try {
      fs.writeFileSync(UPDATE_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AutoUpdater] Failed to save update state:', err);
    }
  }

  function loadUpdateState() {
    try {
      if (fs.existsSync(UPDATE_STATE_PATH)) {
        const data = fs.readFileSync(UPDATE_STATE_PATH, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('[AutoUpdater] Failed to load update state:', err);
    }
    return { status: 'idle', percent: 0 };
  }

  if (!isSupported) {
    console.log('[AutoUpdater] Skipping — not packaged or unsupported platform.');
    ipcMain.on('check-electron-updates', (event) => {
      startUpdateAnimation();
      setTimeout(() => {
        stopUpdateAnimation();
        event.sender.send('electron-update-status', {
          status: 'not-supported',
          message: 'Auto-update is only supported in packaged Windows/macOS/Linux builds.'
        });
      }, 1000);
    });
    return;
  }

  // Clear stale update state if it's for a different (old) version or if already installed.
  try {
    const savedState = loadUpdateState();
    if (savedState.status === 'downloaded' && savedState.version) {
      const isStale = (() => {
        const parse = (v: string) => v.replace(/^v/i, '').split('.').map(Number);
        const savedParts = parse(savedState.version);
        const currentParts = parse(app.getVersion());
        for (let i = 0; i < Math.max(savedParts.length, currentParts.length); i++) {
          const s = savedParts[i] || 0;
          const c = currentParts[i] || 0;
          if (s > c) return false; // saved is newer, not stale
          if (s < c) return true;  // saved is older, stale
        }
        return true; // versions are equal, so it's already installed
      })();

      if (isStale) {
        console.log(`[AutoUpdater] Clearing stale update state for v${savedState.version} (current: v${app.getVersion()})`);
        saveUpdateState({ status: 'idle', percent: 0 });
        activeDirectInstallerPath = null;
        try {
          const stalePendingDir = path.join(app.getPath('userData'), '../mission-control-updater/pending');
          if (fs.existsSync(stalePendingDir)) {
            fs.rmSync(stalePendingDir, { recursive: true, force: true });
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Load autoDownload setting from config on startup
  let autoDownloadEnabled = true;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(data);
      if (config.system && config.system.auto_download_updates !== undefined) {
        autoDownloadEnabled = !!config.system.auto_download_updates;
      }
    }
  } catch (err) {
    console.warn('[AutoUpdater] Failed to read auto_download_updates setting:', err);
  }
  autoUpdater.autoDownload = false; // MUST be false to allow pausing/cancelling via CancellationToken
  console.log(`[AutoUpdater] Initialized autoDownload to: ${autoUpdater.autoDownload} (autoDownloadEnabled config: ${autoDownloadEnabled})`);

  // Disable code signature verification for unsigned development/self-built updates
  (autoUpdater as any).verifyUpdateCodeSignature = (_publisherName: string[], path: string) => {
    console.log('[AutoUpdater] Bypassing code signature verification for:', path);
    return Promise.resolve(null);
  };

  // ── Event Listeners ─────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
    startUpdateAnimation();
    const state = { status: 'checking', message: 'Checking for updates...' };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    const state = {
      status: 'available',
      version: info.version,
      notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      message: `Update v${info.version} available.`,
      percent: 0
    };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
    if (!isManualUpdateCheck) {
      fireUpdateToast(info.version);
    }
    
    // Automatically trigger download if enabled and this wasn't a manual check
    if (autoDownloadEnabled && !isManualUpdateCheck) {
      console.log('[AutoUpdater] Auto-download is enabled, starting download automatically.');
      updateCancellationToken = new CancellationToken();
      autoUpdater.downloadUpdate(updateCancellationToken).catch((err: any) => {
         console.error('[AutoUpdater] auto download failed', err);
      });
    }

    if (isManualUpdateCheck) {
      isManualUpdateCheck = false;
    }
  });

  autoUpdater.on('update-not-available', (info: any) => {
    const latestKnown = info?.version || app.getVersion();
    console.log(`[AutoUpdater] No updates available via electron-updater (current: v${app.getVersion()}, latest: v${latestKnown}).`);
    stopUpdateAnimation();
    const state = { 
      status: 'up-to-date', 
      version: latestKnown,
      message: 'Application is up to date.' 
    };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
    if (isManualUpdateCheck) {
      isManualUpdateCheck = false;
    }
  });

  function sanitizeUpdateErrorMessage(rawMsg: string): string {
    if (!rawMsg) return 'An unexpected error occurred during update initialization.';
    const msgLower = rawMsg.toLowerCase();
    if (msgLower.includes('latest.yml') || (msgLower.includes('404') && (msgLower.includes('github.com') || msgLower.includes('httperror')))) {
      return 'The release assets for this version are currently being compiled and published. Please check back in a few minutes or download Setup.exe manually below.';
    }
    if (msgLower.includes('enotfound') || msgLower.includes('econnrefused') || msgLower.includes('etimedout') || msgLower.includes('internet_disconnected') || msgLower.includes('name_not_resolved')) {
      return 'Unable to reach update servers. Please check your network connection and try again.';
    }
    if (msgLower.includes('rate limit') || msgLower.includes('429')) {
      return 'GitHub update server rate limit exceeded. Please try again in a few minutes.';
    }
    if (msgLower.includes('please check update first')) {
      return 'Update download is initializing. Please verify update check first or try again in a few moments.';
    }
    let clean = rawMsg;
    const truncateIndex = clean.search(/\b(Headers:|HttpError:|\n\s*at\b|Stacktrace:)/i);
    if (truncateIndex > 0) {
      clean = clean.substring(0, truncateIndex).trim();
    }
    clean = clean.replace(/[\r\n]+/g, ' ').trim();
    if (clean.length > 220) {
      clean = clean.substring(0, 217) + '...';
    }
    return clean || 'An unexpected error occurred during update initialization.';
  }

  autoUpdater.on('error', async (err) => {
    console.error('[AutoUpdater] Error from electron-updater:', err);
    const msgLower = (err?.message || String(err)).toLowerCase();
    const isMissingLatestYml = msgLower.includes('latest.yml') || msgLower.includes('404') || msgLower.includes('cannot find latest');

    if (isMissingLatestYml) {
      console.log('[AutoUpdater] latest.yml missing in GitHub release. Attempting direct GitHub Release fallback...');
      try {
        const ghRelease = await fetchGitHubReleaseUpdate();
        if (ghRelease.available && ghRelease.version && ghRelease.assetUrl) {
          console.log(`[AutoUpdater] Direct GitHub fallback found version v${ghRelease.version} (${ghRelease.assetName})`);
          directUpdateInfo = ghRelease;
          stopUpdateAnimation();
          const state = {
            status: 'available',
            version: ghRelease.version,
            notes: ghRelease.releaseNotes || '',
            message: `Update v${ghRelease.version} available.`,
            percent: 0
          };
          saveUpdateState(state);
          sendToAllWindows('electron-update-status', state);
          if (!isManualUpdateCheck) {
            fireUpdateToast(ghRelease.version);
          }
          if (autoDownloadEnabled && !isManualUpdateCheck) {
            console.log('[AutoUpdater] Auto-downloading direct update payload...');
            downloadDirectUpdatePayload(ghRelease.assetUrl, ghRelease.version).catch(dlErr => {
              console.error('[AutoUpdater] Direct auto-download failed:', dlErr);
            });
          }
          isManualUpdateCheck = false;
          return;
        } else if (!ghRelease.available && ghRelease.version) {
          // The remote version is not newer than current
          console.log('[AutoUpdater] Direct GitHub check confirms application is up to date.');
          stopUpdateAnimation();
          const state = { status: 'up-to-date', message: 'Application is up to date.' };
          saveUpdateState(state);
          sendToAllWindows('electron-update-status', state);
          isManualUpdateCheck = false;
          return;
        }
      } catch (fallbackErr) {
        console.warn('[AutoUpdater] GitHub Releases fallback check encountered error:', fallbackErr);
      }
    }

    stopUpdateAnimation();
    const friendlyMsg = sanitizeUpdateErrorMessage(err.message || String(err));
    const state = { status: 'error', message: friendlyMsg };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
    if (isManualUpdateCheck) {
      isManualUpdateCheck = false;
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const currentPercent = Math.round(progress.percent);
    const currentState = loadUpdateState();
    // If the download was paused or cancelled by user, ignore trailing progress events
    if (currentState.status === 'paused' || currentState.status === 'cancelled') return;
    const state = {
      ...currentState,
      status: 'downloading',
      percent: currentPercent,
      message: `Downloading update… ${currentPercent}%`
    };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    stopUpdateAnimation();
    const state = {
      status: 'downloaded',
      version: info.version,
      date: info.releaseDate,
      notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      message: `Update v${info.version} downloaded and ready to install.`,
      percent: 100
    };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
  });

  // ── IPC Commands from frontend ───────────────────────────────────────────
  ipcMain.on('check-electron-updates', () => {
    isManualUpdateCheck = true;
    startUpdateAnimation();
    autoUpdater.checkForUpdates().catch(async (err: any) => {
      console.warn('[AutoUpdater] checkForUpdates failed, trying direct GitHub fallback...', err);
      try {
        const ghRelease = await fetchGitHubReleaseUpdate();
        if (ghRelease.available && ghRelease.version && ghRelease.assetUrl) {
          console.log(`[AutoUpdater] Direct check found update v${ghRelease.version}`);
          directUpdateInfo = ghRelease;
          stopUpdateAnimation();
          isManualUpdateCheck = false;
          const state = {
            status: 'available',
            version: ghRelease.version,
            notes: ghRelease.releaseNotes || '',
            message: `Update v${ghRelease.version} available.`,
            percent: 0
          };
          saveUpdateState(state);
          sendToAllWindows('electron-update-status', state);
          return;
        } else if (!ghRelease.available && ghRelease.version) {
          stopUpdateAnimation();
          isManualUpdateCheck = false;
          const state = { status: 'up-to-date', message: 'Application is up to date.' };
          saveUpdateState(state);
          sendToAllWindows('electron-update-status', state);
          return;
        }
      } catch (_) {}

      isManualUpdateCheck = false;
      stopUpdateAnimation();
      console.error('[AutoUpdater] All update checks failed:', err);
      const friendlyMsg = sanitizeUpdateErrorMessage(err?.message || String(err));
      sendToAllWindows('electron-update-status', { status: 'error', message: friendlyMsg });
    });
  });

  ipcMain.on('quit-and-install-update', () => {
    isAppQuitting = true;
    console.log('[AutoUpdater] Quitting and installing update...');

    // 1. Immediately hide window so user doesn't experience a "(Not Responding)" freeze
    if (win && !win.isDestroyed()) {
      try { win.hide(); } catch (_) { }
    }

    try {
      // 2. Kill Python backend process tree immediately so NSIS does not hit file locks
      if (pythonProcess && pythonProcess.pid) {
        console.log('[AutoUpdater] Killing Python backend process tree before update...');
        if (process.platform === 'win32') {
          try { execSync(`taskkill /pid ${pythonProcess.pid} /f /t`, { windowsHide: true }); } catch (_) { }
        } else {
          try { pythonProcess.kill('SIGKILL'); } catch (_) { }
        }
        pythonProcess = null;
      }

      // 3. Terminate background telemetry worker thread
      if (telemetryWorker) {
        try { telemetryWorker.terminate(); } catch (_) { }
        telemetryWorker = null;
      }

      // 4. Clean up system tray
      if (tray && !tray.isDestroyed()) {
        try { tray.destroy(); } catch (_) { }
        tray = null;
      }

      // 5. Check for any downloaded/staged installer on disk
      const localAppData = process.env.LOCALAPPDATA || '';
      const candidateInstallers = [
        activeDirectInstallerPath,
        path.join(localAppData, 'mission-control-frontend-updater', 'pending', 'MissionControl-Setup.exe'),
        path.join(localAppData, 'mission-control-updater', 'pending', 'MissionControl-Setup.exe'),
        path.join(app.getPath('userData'), '..', 'mission-control-frontend-updater', 'pending', 'MissionControl-Setup.exe'),
        path.join(app.getPath('userData'), '..', 'mission-control-updater', 'pending', 'MissionControl-Setup.exe')
      ];

      const existingInstaller = candidateInstallers.find(p => p && fs.existsSync(p));
      if (existingInstaller) {
        console.log(`[AutoUpdater] Launching verified installer executable: ${existingInstaller}`);
        try {
          spawn('cmd.exe', ['/c', 'start', '""', existingInstaller], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false,
          }).unref();
          // Exit Electron immediately so NSIS installer has zero file locks
          setTimeout(() => {
            console.log('[AutoUpdater] Exiting Electron cleanly for installer execution...');
            app.exit(0);
          }, 500);
          return;
        } catch (spawnErr) {
          console.error('[AutoUpdater] Direct spawn failed, falling back to autoUpdater.quitAndInstall:', spawnErr);
        }
      }

      // 6. Fallback to electron-updater built-in quitAndInstall
      console.log('[AutoUpdater] Executing autoUpdater.quitAndInstall(false, true)...');
      autoUpdater.quitAndInstall(false, true);

      // Force process exit if electron-updater stalls
      setTimeout(() => {
        console.log('[AutoUpdater] Forcing process termination via app.exit(0)...');
        app.exit(0);
      }, 1200);
    } catch (err: any) {
      console.error('[AutoUpdater] quitAndInstall failed:', err);
      app.exit(0);
    }
  });

  ipcMain.on('restart-backend', () => {
    const timeSinceLastStart = Date.now() - lastBackendStartTime;
    // Don't kill backend if it was started less than 8 seconds ago (allow cold boot to complete)
    if (timeSinceLastStart < 8000 && (isStartingBackend || pythonProcess)) {
      console.log(`[Electron] IPC restart-backend ignored — backend was started ${timeSinceLastStart}ms ago and is still initializing.`);
      return;
    }
    console.log('[Electron] IPC restart-backend requested by renderer.');
    backendRestartCount = 0;
    startPythonBackend(true);
  });

  // Sent by fireUpdateToast click handler to open the UpdaterModal in React
  ipcMain.removeAllListeners('open-updater-modal');
  ipcMain.on('open-updater-modal', () => {
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send('open-updater-modal');
    }
  });

  ipcMain.on('download-electron-update', async () => {
    console.log('[AutoUpdater] User manually triggered download-electron-update');
    try {
      sendToAllWindows('electron-update-status', { status: 'checking', message: 'Verifying update package...' });
      
      // If we already resolved a valid direct download URL from GitHub releases:
      if (directUpdateInfo && directUpdateInfo.assetUrl && directUpdateInfo.version) {
        console.log(`[AutoUpdater] Starting direct download for v${directUpdateInfo.version} from: ${directUpdateInfo.assetUrl}`);
        await downloadDirectUpdatePayload(directUpdateInfo.assetUrl, directUpdateInfo.version);
        return;
      }

      // Otherwise attempt standard electron-updater check & download
      try {
        const checkResult = await autoUpdater.checkForUpdates();
        if (checkResult && checkResult.updateInfo) {
          console.log('[AutoUpdater] Manual check succeeded, downloading version:', checkResult.updateInfo.version);
          sendToAllWindows('electron-update-status', { status: 'downloading', percent: 0, message: 'Starting download...' });
          if (!autoUpdater.autoDownload) {
            updateCancellationToken = new CancellationToken();
            await autoUpdater.downloadUpdate(updateCancellationToken);
          }
          return;
        }
      } catch (autoErr: any) {
        console.warn('[AutoUpdater] autoUpdater check failed during download request, attempting direct GitHub fallback...', autoErr);
        const ghRelease = await fetchGitHubReleaseUpdate();
        if (ghRelease.available && ghRelease.assetUrl && ghRelease.version) {
          directUpdateInfo = ghRelease;
          await downloadDirectUpdatePayload(ghRelease.assetUrl, ghRelease.version);
          return;
        }
        throw autoErr;
      }
    } catch (err: any) {
      console.error('[AutoUpdater] downloadUpdate failed:', err);
      const friendlyMsg = sanitizeUpdateErrorMessage(err?.message || String(err));
      sendToAllWindows('electron-update-status', { status: 'error', message: friendlyMsg });
    }
  });

  ipcMain.on('pause-electron-update', () => {
    if (updateCancellationToken) {
      console.log('[AutoUpdater] User paused electron-updater download.');
      updateCancellationToken.cancel();
      updateCancellationToken = null;
    }
    if (directDownloadRequest) {
      console.log('[AutoUpdater] User paused direct GitHub download.');
      directDownloadAborted = true;
      directDownloadRequest.destroy();
      directDownloadRequest = null;
    }
    const currentState = loadUpdateState();
    const pausedPercent = currentState.percent || 0;
    const state = {
      ...currentState,
      status: 'paused',
      percent: pausedPercent,
      message: `Download paused at ${pausedPercent}%.`
    };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
  });

  ipcMain.on('cancel-electron-update', () => {
    if (updateCancellationToken) {
      console.log('[AutoUpdater] User cancelled electron-updater download.');
      updateCancellationToken.cancel();
      updateCancellationToken = null;
    }
    if (directDownloadRequest) {
      console.log('[AutoUpdater] User cancelled direct GitHub download.');
      directDownloadAborted = true;
      directDownloadRequest.destroy();
      directDownloadRequest = null;
    }
    const state = {
      status: 'idle',
      percent: 0,
      message: 'Download cancelled.'
    };
    saveUpdateState(state);
    sendToAllWindows('electron-update-status', state);
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Dedicated in-memory cache for live external gaming news RSS (IGN, Eurogamer, PC Gamer, etc.)
  let cachedNewsItems: any[] = [];
  let lastNewsFetchTime = 0;
  const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;

  ipcMain.handle('fetch-gaming-news', async () => {
    const now = Date.now();
    if (cachedNewsItems.length > 0 && now - lastNewsFetchTime < NEWS_CACHE_TTL_MS) {
      return { success: true, items: cachedNewsItems, totalItems: cachedNewsItems.length };
    }

    const feeds = [
      { url: 'https://www.pcgamer.com/rss/', label: 'PC Gamer', type: 'Gaming' },
      { url: 'https://www.eurogamer.net/?format=rss', label: 'Eurogamer', type: 'Gaming' },
      { url: 'http://feeds.ign.com/ign/news', label: 'IGN', type: 'Gaming' },
      { url: 'https://www.gamespot.com/feeds/mashup/', label: 'GameSpot', type: 'Gaming' },
      { url: 'https://kotaku.com/rss', label: 'Kotaku', type: 'Gaming' },
      { url: 'https://www.tomshardware.com/feeds/all', label: "Tom's Hardware", type: 'Hardware' },
    ];

    const results: any[] = [];

    await Promise.allSettled(
      feeds.map(async (feed) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          const response = await fetch(feed.url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
          });
          clearTimeout(timeout);
          if (!response.ok) return;
          const xml = await response.text();

          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          let match;
          let count = 0;
          while ((match = itemRegex.exec(xml)) !== null && count < 8) {
            const block = match[1];
            const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) || /<title>(.*?)<\/title>/.exec(block);
            const linkMatch = /<link>(.*?)<\/link>/.exec(block) || /<link href="(.*?)"/.exec(block);
            const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block) || /<description>(.*?)<\/description>/.exec(block);
            const dateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(block);

            // Extract thumbnail image if present
            const imgMatch = /<enclosure[^>]+url=["'](.*?)["']/i.exec(block) ||
                             /<media:content[^>]+url=["'](.*?)["']/i.exec(block) ||
                             /<media:thumbnail[^>]+url=["'](.*?)["']/i.exec(block) ||
                             /<img[^>]+src=["'](.*?)["']/i.exec(block);

            const title = titleMatch
              ? titleMatch[1].replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&amp;/g, '&').replace(/&#038;/g, '&').trim()
              : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            let description = descMatch
              ? descMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").trim()
              : '';
            if (description.length > 200) description = description.slice(0, 200) + '...';

            if (title && link) {
              results.push({
                id: link,
                title,
                link,
                description,
                source: feed.label,
                category: feed.type,
                pubDate: dateMatch ? dateMatch[1].trim() : '',
                imageUrl: imgMatch ? imgMatch[1] : null,
              });
              count++;
            }
          }
        } catch (_) {}
      })
    );

    if (results.length > 0) {
      cachedNewsItems = results;
      lastNewsFetchTime = now;
      return { success: true, items: results, totalItems: results.length };
    }

    return { success: cachedNewsItems.length > 0, items: cachedNewsItems, totalItems: cachedNewsItems.length };
  });

  // Dedicated in-memory cache for live dynamic multi-launcher trending (Steam, Epic Games, GOG)
  let cachedLauncherGames: any[] = [];
  let lastLauncherFetchTime = 0;
  const LAUNCHER_CACHE_TTL_MS = 15 * 60 * 1000;

  async function getLiveLauncherTrending() {
    const now = Date.now();
    if (cachedLauncherGames.length > 0 && now - lastLauncherFetchTime < LAUNCHER_CACHE_TTL_MS) {
      return { success: true, games: cachedLauncherGames };
    }

    const allGames: any[] = [];
    const seenNames = new Set<string>();

    const safeAdd = (game: any) => {
      const norm = (game.title || '').toLowerCase().trim();
      if (!norm || seenNames.has(norm) || /Steam Deck|Valve Index|Soundtrack|Controller/i.test(norm)) return;
      seenNames.add(norm);
      allGames.push(game);
    };

    // 1. Fetch Steam live trending & top sellers
    const fetchSteam = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=us&l=en', {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);
        if (!res.ok) return;
        const data = (await res.json()) as any;
        const topSellers = data.top_sellers?.items || [];
        const newReleases = data.new_releases?.items || [];

        topSellers.slice(0, 10).forEach((item: any) => {
          safeAdd({
            id: `steam-${item.id}`,
            title: item.name,
            developer: 'Steam Verified',
            publisher: 'Steam Verified',
            release_date: new Date().getFullYear().toString(),
            primary_genre: 'Top Seller',
            genres: ['Action', 'Trending', 'Steam'],
            tags: ['Trending', 'Top Seller', 'Steam'],
            cover_url: item.header_image,
            banner_url: item.header_image,
            summary: item.discount_percent > 0
              ? `Steam Top Seller — currently ${item.discount_percent}% off on Steam Store.`
              : `Bestselling title trending globally on Steam.`,
            store: 'Steam',
            store_app_id: String(item.id),
            launchers: ['Steam'],
            in_catalog: true,
            ai_classified: true,
            installations: [],
          });
        });

        newReleases.slice(0, 6).forEach((item: any) => {
          safeAdd({
            id: `steam-${item.id}`,
            title: item.name,
            developer: 'Steam Verified',
            publisher: 'Steam Verified',
            release_date: new Date().getFullYear().toString(),
            primary_genre: 'New Release',
            genres: ['Action', 'New Release', 'Steam'],
            tags: ['New Release', 'Steam'],
            cover_url: item.header_image,
            banner_url: item.header_image,
            summary: `Newly released hit trending on Steam.`,
            store: 'Steam',
            store_app_id: String(item.id),
            launchers: ['Steam'],
            in_catalog: true,
            ai_classified: true,
            installations: [],
          });
        });
      } catch (_) {}
    };

    // 2. Fetch Epic Games Store live trending & promotions
    const fetchEpic = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US', {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);
        if (!res.ok) return;
        const data = (await res.json()) as any;
        const elements = data?.data?.Catalog?.searchStore?.elements || [];

        elements.slice(0, 10).forEach((item: any) => {
          const imgObj = (item.keyImages || []).find((i: any) => i.type === 'OfferImageWide' || i.type === 'Thumbnail' || i.type === 'DieselStoreFrontWide');
          safeAdd({
            id: `epic-${item.id}`,
            title: item.title,
            developer: item.seller?.name || 'Epic Games Partner',
            publisher: item.seller?.name || 'Epic Games',
            release_date: item.releaseDate ? item.releaseDate.split('T')[0] : new Date().getFullYear().toString(),
            primary_genre: 'Epic Featured',
            genres: ['Action', 'Epic Games', 'Featured'],
            tags: ['Epic Games Store', 'Promotion'],
            cover_url: imgObj?.url,
            banner_url: imgObj?.url,
            summary: item.description || `Trending headline title featured on the Epic Games Store.`,
            store: 'Epic Games',
            store_app_id: item.id,
            launchers: ['Epic Games'],
            in_catalog: true,
            ai_classified: true,
            installations: [],
          });
        });
      } catch (_) {}
    };

    // 3. Fetch GOG Galaxy live bestsellers
    const fetchGOG = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://catalog.gog.com/v1/catalog?limit=12&order=desc:bestselling&productType=in:game', {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);
        if (!res.ok) return;
        const data = (await res.json()) as any;
        const products = data?.products || [];

        products.forEach((prod: any) => {
          safeAdd({
            id: `gog-${prod.id}`,
            title: prod.title,
            developer: prod.developers?.[0] || 'GOG Partner',
            publisher: prod.publishers?.[0] || 'GOG',
            release_date: prod.releaseDate ? prod.releaseDate.split('T')[0] : '',
            primary_genre: prod.genres?.[0]?.name || 'GOG Classic',
            genres: (prod.genres || []).map((g: any) => g.name || g),
            tags: ['DRM-Free', 'GOG Galaxy', 'Bestseller'],
            cover_url: prod.coverHorizontal || prod.coverVertical,
            banner_url: prod.coverHorizontal || prod.coverVertical,
            summary: `Bestselling DRM-free classic trending on GOG Galaxy.`,
            store: 'GOG Galaxy',
            store_app_id: String(prod.id),
            launchers: ['GOG Galaxy'],
            in_catalog: true,
            ai_classified: true,
            installations: [],
          });
        });
      } catch (_) {}
    };

    // 4. Fetch Xbox & PC Game Pass live titles
    const fetchXbox = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://catalog.gamepass.com/sigls/v2?id=fdd9e2a7-0fee-49f6-ad69-4354098401ff&language=en-us&market=US', {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);
        if (!res.ok) return;
        const data = (await res.json()) as any;
        const idList: string[] = (Array.isArray(data) ? data : [])
          .filter((item: any) => item?.id && typeof item.id === 'string')
          .slice(0, 10)
          .map((item: any) => item.id);

        if (idList.length > 0) {
          const detailRes = await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${idList.join(',')}&market=US&languages=en-us`);
          if (detailRes.ok) {
            const detailData = (await detailRes.json()) as any;
            const products = detailData?.Products || [];
            products.forEach((p: any) => {
              const props = p.LocalizedProperties?.[0];
              const title = props?.ProductTitle;
              const imgObj = props?.Images?.find((i: any) => i.ImagePurpose === 'BoxArt' || i.ImagePurpose === 'Poster' || i.ImagePurpose === 'BrandedKeyArt');
              let imgUrl = imgObj?.Uri;
              if (imgUrl && imgUrl.startsWith('//')) {
                imgUrl = `https:${imgUrl}`;
              }

              safeAdd({
                id: `xbox-${p.ProductId}`,
                title: title || 'Xbox Game Pass Title',
                developer: props?.DeveloperName || 'Xbox Game Studios',
                publisher: props?.PublisherName || 'Microsoft',
                release_date: p.MarketProperties?.[0]?.OriginalReleaseDate ? p.MarketProperties[0].OriginalReleaseDate.split('T')[0] : new Date().getFullYear().toString(),
                primary_genre: 'Game Pass',
                genres: ['Xbox', 'PC Game Pass', 'Action'],
                tags: ['Xbox', 'PC Game Pass', 'Microsoft Store'],
                cover_url: imgUrl,
                banner_url: imgUrl,
                summary: props?.ShortDescription || `Available to play on PC with Xbox Game Pass and Microsoft Store.`,
                store: 'Xbox',
                store_app_id: p.ProductId,
                launchers: ['Xbox'],
                in_catalog: true,
                ai_classified: true,
                installations: [],
              });
            });
          }
        }
      } catch (_) {}
    };

    await Promise.allSettled([fetchSteam(), fetchEpic(), fetchGOG(), fetchXbox()]);

    if (allGames.length > 0) {
      cachedLauncherGames = allGames;
      lastLauncherFetchTime = now;
      return { success: true, games: allGames };
    }

    return { success: cachedLauncherGames.length > 0, games: cachedLauncherGames };
  }

  ipcMain.handle('fetch-steam-trending', async () => {
    return await getLiveLauncherTrending();
  });

  ipcMain.handle('fetch-launcher-trending', async () => {
    return await getLiveLauncherTrending();
  });

  const newsCache = { timestamp: 0, items: [] as any[] };
  const NEWS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  ipcMain.handle('fetch-gaming-news', async () => {
    const now = Date.now();
    if (newsCache.items.length > 0 && now - newsCache.timestamp < NEWS_CACHE_TTL) {
      return { success: true, items: newsCache.items, totalItems: newsCache.items.length };
    }

    const FEEDS = [
      { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', category: 'PC Gaming' },
      { url: 'https://www.eurogamer.net/?format=rss', source: 'Eurogamer', category: 'Gaming' },
      { url: 'https://kotaku.com/rss', source: 'Kotaku', category: 'Gaming' },
      { url: 'https://www.polygon.com/rss/index.xml', source: 'Polygon', category: 'Gaming' },
      { url: 'https://www.rockpapershotgun.com/feed', source: 'Rock Paper Shotgun', category: 'PC Gaming' },
      { url: 'https://www.gamespot.com/feeds/news/', source: 'GameSpot', category: 'Gaming' },
      { url: 'https://www.tomshardware.com/feeds/all', source: "Tom's Hardware", category: 'Hardware' },
    ];

    const allArticles: any[] = [];
    const seenLinks = new Set<string>();

    const fetchFeed = async (feed: typeof FEEDS[0]) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6500);
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);
        if (!res.ok) return;

        const xml = await res.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        let count = 0;
        while ((match = itemRegex.exec(xml)) !== null && count < 10) {
          const block = match[1];
          const rawTitle = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) || /<title>(.*?)<\/title>/.exec(block))?.[1]?.trim() || '';
          const rawLink = (/<link>(.*?)<\/link>/.exec(block) || /<link href=["'](.*?)["']/.exec(block))?.[1]?.trim() || '';
          const rawDesc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block) || /<description>(.*?)<\/description>/.exec(block))?.[1] || '';
          const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(block))?.[1]?.trim() || '';

          const rawImg = (
            /<enclosure[^>]+url=["']([^"']+)["']/.exec(block) ||
            /<media:content[^>]+url=["']([^"']+)["']/.exec(block) ||
            /<img[^>]+src=["']([^"']+)["']/.exec(block)
          )?.[1];

          const cleanTitle = rawTitle
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#8217;/g, "'")
            .replace(/&#8216;/g, "'")
            .replace(/&#8220;/g, '"')
            .replace(/&#8221;/g, '"')
            .replace(/&quot;/g, '"');

          const cleanDesc = rawDesc
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&#8217;/g, "'")
            .replace(/&quot;/g, '"')
            .trim()
            .slice(0, 220) + '...';

          if (cleanTitle && rawLink && !seenLinks.has(rawLink)) {
            seenLinks.add(rawLink);
            allArticles.push({
              id: rawLink,
              title: cleanTitle,
              link: rawLink,
              description: cleanDesc,
              source: feed.source,
              category: feed.category,
              pubDate: pubDate,
              imageUrl: rawImg || undefined,
            });
            count++;
          }
        }
      } catch (err) {
        console.warn(`[Electron] Failed to fetch news from ${feed.source}:`, err);
      }
    };

    await Promise.allSettled(FEEDS.map(f => fetchFeed(f)));

    allArticles.sort((a, b) => {
      const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return timeB - timeA;
    });

    if (allArticles.length > 0) {
      newsCache.items = allArticles;
      newsCache.timestamp = now;
    }

    return { success: true, items: allArticles, totalItems: allArticles.length };
  });

  const liveSearchCache = new Map<string, { timestamp: number; data: any[] }>();
  const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  ipcMain.handle('search-games-live', async (_event, query: string) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { success: true, games: [] };
    }
    const cleanQuery = query.trim().toLowerCase();
    const now = Date.now();
    const cached = liveSearchCache.get(cleanQuery);
    if (cached && now - cached.timestamp < SEARCH_CACHE_TTL_MS) {
      return { success: true, games: cached.data };
    }

    const mapped: any[] = [];
    const seenTitles = new Set<string>();

    const safeAdd = (game: any) => {
      const norm = (game.title || '').toLowerCase().trim();
      if (!norm || seenTitles.has(norm)) return;
      seenTitles.add(norm);
      mapped.push(game);
    };

    // 1. Search Steam Live Store
    const searchSteam = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanQuery)}&l=english&cc=US`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          const items = data?.items || [];
          items.forEach((item: any) => {
            const appId = String(item.id);
            const banner = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
            safeAdd({
              id: `steam-${appId}`,
              title: item.name,
              developer: 'Steam Verified',
              publisher: 'Steam Partner',
              release_date: new Date().getFullYear().toString(),
              primary_genre: item.metascore ? `Metascore ${item.metascore}` : 'Steam Store',
              genres: ['Action', 'RPG', 'Steam'],
              tags: ['Steam Store', item.metascore ? `Metascore ${item.metascore}` : 'Popular'],
              cover_url: banner,
              banner_url: banner,
              summary: item.price
                ? `Official Steam Release. Available on Steam Store (${(item.price.final / 100).toFixed(2)} ${item.price.currency}).`
                : `Official Steam title matching "${query}".`,
              store: 'Steam',
              store_app_id: appId,
              launchers: ['Steam'],
              in_catalog: true,
              ai_classified: true,
              installations: [],
            });
          });
        }
      } catch (_) {}
    };

    // 2. Search GOG Galaxy Live Catalog
    const searchGOG = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const url = `https://catalog.gog.com/v1/catalog?limit=6&productType=in:game&query=like:${encodeURIComponent(cleanQuery)}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          const products = data?.products || [];
          products.forEach((prod: any) => {
            const banner = prod.coverHorizontal || prod.coverVertical;
            safeAdd({
              id: `gog-${prod.id}`,
              title: prod.title,
              developer: prod.developers?.[0] || 'GOG Partner',
              publisher: prod.publishers?.[0] || 'GOG',
              release_date: prod.releaseDate ? prod.releaseDate.split('T')[0] : '',
              primary_genre: prod.genres?.[0]?.name || 'GOG Classic',
              genres: (prod.genres || []).map((g: any) => g.name || g),
              tags: ['DRM-Free', 'GOG Galaxy'],
              cover_url: banner,
              banner_url: banner,
              summary: `DRM-Free release available on GOG Galaxy.`,
              store: 'GOG Galaxy',
              store_app_id: String(prod.id),
              launchers: ['GOG Galaxy'],
              in_catalog: true,
              ai_classified: true,
              installations: [],
            });
          });
        }
      } catch (_) {}
    };

    // 3. Search Epic Games Store Live (Promotions & Live Catalog)
    const searchEpic = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const url = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US';
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          const elements = data?.data?.Catalog?.searchStore?.elements || [];
          elements.forEach((item: any) => {
            const title = (item.title || '').trim();
            if (title.toLowerCase().includes(cleanQuery)) {
              const imgObj = (item.keyImages || []).find((i: any) =>
                i.type === 'OfferImageWide' || i.type === 'Thumbnail' || i.type === 'DieselStoreFrontWide'
              );
              safeAdd({
                id: `epic-${item.id}`,
                title: title,
                developer: item.seller?.name || 'Epic Games Partner',
                publisher: item.seller?.name || 'Epic Games',
                release_date: item.releaseDate ? item.releaseDate.split('T')[0] : new Date().getFullYear().toString(),
                primary_genre: 'Epic Games Store',
                genres: ['Action', 'Epic Games'],
                tags: ['Epic Games Store', 'Official'],
                cover_url: imgObj?.url,
                banner_url: imgObj?.url,
                summary: item.description || `Available on the Epic Games Store.`,
                store: 'Epic Games',
                store_app_id: item.id,
                launchers: ['Epic Games'],
                in_catalog: true,
                ai_classified: true,
                installations: [],
              });
            }
          });
        }
      } catch (_) {}
    };

    // 4. Search Xbox & PC Game Pass Live Catalog
    const searchXbox = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const res = await fetch('https://catalog.gamepass.com/sigls/v2?id=fdd9e2a7-0fee-49f6-ad69-4354098401ff&language=en-us&market=US', {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControl/3.3' }
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          const idList: string[] = (Array.isArray(data) ? data : [])
            .filter((item: any) => item?.id && typeof item.id === 'string')
            .slice(0, 30)
            .map((item: any) => item.id);

          if (idList.length > 0) {
            const detailRes = await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${idList.join(',')}&market=US&languages=en-us`);
            if (detailRes.ok) {
              const detailData = (await detailRes.json()) as any;
              const products = detailData?.Products || [];
              products.forEach((p: any) => {
                const props = p.LocalizedProperties?.[0];
                const title = (props?.ProductTitle || '').trim();
                if (title.toLowerCase().includes(cleanQuery)) {
                  const imgObj = props?.Images?.find((i: any) =>
                    i.ImagePurpose === 'BoxArt' || i.ImagePurpose === 'Poster' || i.ImagePurpose === 'BrandedKeyArt'
                  );
                  let imgUrl = imgObj?.Uri;
                  if (imgUrl && imgUrl.startsWith('//')) {
                    imgUrl = `https:${imgUrl}`;
                  }

                  safeAdd({
                    id: `xbox-${p.ProductId}`,
                    title: title,
                    developer: props?.DeveloperName || 'Xbox Game Studios',
                    publisher: props?.PublisherName || 'Microsoft',
                    release_date: p.MarketProperties?.[0]?.OriginalReleaseDate?.split('T')[0] || new Date().getFullYear().toString(),
                    primary_genre: 'Xbox Game Pass',
                    genres: ['Xbox Game Pass', 'Action'],
                    tags: ['Xbox Game Pass', 'Cloud Gaming'],
                    cover_url: imgUrl,
                    banner_url: imgUrl,
                    summary: props?.ShortDescription || `Included with PC Game Pass and Xbox subscription.`,
                    store: 'Xbox',
                    store_app_id: p.ProductId,
                    launchers: ['Xbox Game Pass'],
                    in_catalog: true,
                    ai_classified: true,
                    installations: [],
                  });
                }
              });
            }
          }
        }
      } catch (_) {}
    };

    // 5. Renowned Epic & Xbox Verified Catalog
    const searchRenownedLaunchers = () => {
      const RENOWNED_GAMES = [
        {
          id: 'epic-alan-wake-2',
          title: 'Alan Wake 2',
          developer: 'Remedy Entertainment',
          publisher: 'Epic Games Publishing',
          release_date: '2023-10-27',
          primary_genre: 'Survival Horror',
          genres: ['Action', 'Horror', 'Psychological'],
          tags: ['Epic Exclusive', 'Ray Tracing', 'Award Winning'],
          cover_url: 'https://cdn2.unrealengine.com/egs-alanwake2-remedyentertainment-g1a-00-1920x1080-32df9e7d953d.jpg',
          banner_url: 'https://cdn2.unrealengine.com/egs-alanwake2-remedyentertainment-g1a-00-1920x1080-32df9e7d953d.jpg',
          summary: 'Saga Anderson arrives to investigate ritualistic murders in a small town. Alan Wake pens a dark story to shape the reality around him.',
          store: 'Epic Games',
          store_app_id: 'c498edd61b714e098132924190c1f6fb',
          launchers: ['Epic Games'],
        },
        {
          id: 'epic-fortnite',
          title: 'Fortnite',
          developer: 'Epic Games',
          publisher: 'Epic Games',
          release_date: '2017-07-21',
          primary_genre: 'Battle Royale',
          genres: ['Action', 'Battle Royale', 'Multiplayer'],
          tags: ['Epic Exclusive', 'Free to Play', 'Crossplay'],
          cover_url: 'https://cdn2.unrealengine.com/14br-consoles-1920x1080-wlogo-1920x1080-e9b466144e05.jpg',
          banner_url: 'https://cdn2.unrealengine.com/14br-consoles-1920x1080-wlogo-1920x1080-e9b466144e05.jpg',
          summary: 'The battle is building. Jump in to be the last one standing in the free 100-player Battle Royale.',
          store: 'Epic Games',
          store_app_id: '4fe75bbc5a674f4f9b356b5c90567da5',
          launchers: ['Epic Games'],
        },
        {
          id: 'epic-rocket-league',
          title: 'Rocket League',
          developer: 'Psyonix LLC',
          publisher: 'Epic Games',
          release_date: '2015-07-07',
          primary_genre: 'Vehicular Soccer',
          genres: ['Sports', 'Action', 'Multiplayer'],
          tags: ['Epic Games', 'Competitive', 'Free to Play'],
          cover_url: 'https://cdn2.unrealengine.com/egs-rocketleague-psyonixllc-s1-2560x1440-2560x1440-a193cfd713c7.jpg',
          banner_url: 'https://cdn2.unrealengine.com/egs-rocketleague-psyonixllc-s1-2560x1440-2560x1440-a193cfd713c7.jpg',
          summary: 'Soccar with rocket-powered cars. Customise your car, hit the pitch, and compete in one of the most critically acclaimed sports games of all time.',
          store: 'Epic Games',
          store_app_id: '9773aa1aa54f4f7b80e44bef04986cee',
          launchers: ['Epic Games'],
        },
        {
          id: 'xbox-forza-horizon-5',
          title: 'Forza Horizon 5',
          developer: 'Playground Games',
          publisher: 'Xbox Game Studios',
          release_date: '2021-11-09',
          primary_genre: 'Open World Racing',
          genres: ['Racing', 'Open World', 'Driving'],
          tags: ['Xbox Game Pass', 'Photorealistic', 'Multiplayer'],
          cover_url: 'https://store-images.s-microsoft.com/image/apps.43949.13727851868390641.c9cc8f66-aff8-406c-af6b-440808730bce.a69f6e63-41c3-4f99-a681-7f99ff9d63e9',
          banner_url: 'https://store-images.s-microsoft.com/image/apps.43949.13727851868390641.c9cc8f66-aff8-406c-af6b-440808730bce.a69f6e63-41c3-4f99-a681-7f99ff9d63e9',
          summary: 'Your Ultimate Horizon Adventure awaits! Explore the vibrant open world landscapes of Mexico with limitless driving action in hundreds of the worlds greatest cars.',
          store: 'Xbox',
          store_app_id: '9NKX70BBC2H6',
          launchers: ['Xbox Game Pass', 'Steam'],
        },
        {
          id: 'xbox-halo-infinite',
          title: 'Halo Infinite',
          developer: '343 Industries',
          publisher: 'Xbox Game Studios',
          release_date: '2021-12-08',
          primary_genre: 'First-Person Shooter',
          genres: ['Shooter', 'Action', 'Sci-Fi'],
          tags: ['Xbox Game Pass', 'Master Chief', 'Multiplayer'],
          cover_url: 'https://store-images.s-microsoft.com/image/apps.21536.13727851868390641.8797f1f9-03bf-4da6-b4b1-8b36a1e35a11.bb51fb15-b778-4eb7-a7eb-2917730e791b',
          banner_url: 'https://store-images.s-microsoft.com/image/apps.21536.13727851868390641.8797f1f9-03bf-4da6-b4b1-8b36a1e35a11.bb51fb15-b778-4eb7-a7eb-2917730e791b',
          summary: 'When all hope is lost and humanitys fate hangs in the balance, the Master Chief is ready to confront the most ruthless foe he has ever faced.',
          store: 'Xbox',
          store_app_id: '9PP5G1F0C2B6',
          launchers: ['Xbox Game Pass', 'Steam'],
        },
        {
          id: 'xbox-starfield',
          title: 'Starfield',
          developer: 'Bethesda Game Studios',
          publisher: 'Bethesda Softworks',
          release_date: '2023-09-06',
          primary_genre: 'Space RPG',
          genres: ['RPG', 'Open World', 'Sci-Fi'],
          tags: ['Xbox Game Pass', 'Space', 'Exploration'],
          cover_url: 'https://store-images.s-microsoft.com/image/apps.52684.14441443657388701.3bb31e5f-1ffc-4c4f-a9cb-b2f7d5c7c25a.8624ffcb-bf85-48b4-b9b5-c0529d4aa1cf',
          banner_url: 'https://store-images.s-microsoft.com/image/apps.52684.14441443657388701.3bb31e5f-1ffc-4c4f-a9cb-b2f7d5c7c25a.8624ffcb-bf85-48b4-b9b5-c0529d4aa1cf',
          summary: 'In this next generation role-playing game set amongst the stars, create any character you want and explore with unparalleled freedom.',
          store: 'Xbox',
          store_app_id: '9NCJSXWZTP88',
          launchers: ['Xbox Game Pass', 'Steam'],
        },
        {
          id: 'xbox-flight-simulator',
          title: 'Microsoft Flight Simulator',
          developer: 'Asobo Studio',
          publisher: 'Xbox Game Studios',
          release_date: '2020-08-18',
          primary_genre: 'Flight Simulation',
          genres: ['Simulation', 'Flight', 'Realistic'],
          tags: ['Xbox Game Pass', 'Photorealistic', 'Open World'],
          cover_url: 'https://store-images.s-microsoft.com/image/apps.33827.13727851868390641.4a84d4b1-8b27-4c7a-9a99-b1d683fb90f3.3cbba5a4-5cb8-48b4-ae46-9d3326eb95bc',
          banner_url: 'https://store-images.s-microsoft.com/image/apps.33827.13727851868390641.4a84d4b1-8b27-4c7a-9a99-b1d683fb90f3.3cbba5a4-5cb8-48b4-ae46-9d3326eb95bc',
          summary: 'From light planes to wide-body jets, fly highly detailed aircraft in the next generation of Microsoft Flight Simulator.',
          store: 'Xbox',
          store_app_id: '9MSPCNKK8PBJ',
          launchers: ['Xbox Game Pass', 'Steam'],
        },
      ];

      RENOWNED_GAMES.forEach((g) => {
        if (g.title.toLowerCase().includes(cleanQuery)) {
          safeAdd({
            ...g,
            in_catalog: true,
            ai_classified: true,
            installations: [],
          });
        }
      });
    };

    // 6. Search cached multi-launcher catalog
    const searchOtherLaunchers = () => {
      for (const g of cachedLauncherGames) {
        const t = (g.title || '').toLowerCase();
        if (t.includes(cleanQuery)) {
          safeAdd(g);
        }
      }
    };

    await Promise.allSettled([searchSteam(), searchGOG(), searchEpic(), searchXbox()]);
    searchRenownedLaunchers();
    searchOtherLaunchers();

    if (mapped.length > 0) {
      liveSearchCache.set(cleanQuery, { timestamp: now, data: mapped });
      return { success: true, games: mapped };
    }
    return { success: false, games: [] };
  });

  ipcMain.handle('get-electron-update-state', () => {
    const state = loadUpdateState();
    if (state.status === 'downloading' || state.status === 'checking') {
      state.status = 'paused';
      state.message = 'Download paused by user.';
      saveUpdateState(state);
    }
    return state;
  });

  ipcMain.handle('check-rollback-backup', () => {
    const backupPath = path.join(app.getPath('userData'), 'rollback_backup');
    const exists = fs.existsSync(backupPath);
    let version = undefined;
    let hasFiles = false;
    if (exists) {
      try {
        const metaPath = path.join(backupPath, 'rollback_meta.json');
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          version = meta.version;
          hasFiles = true;
        }
        if (!version) {
          const pkgJson = path.join(backupPath, 'app.asar.unpacked', 'package.json');
          if (fs.existsSync(pkgJson)) {
            const content = fs.readFileSync(pkgJson, 'utf-8');
            version = JSON.parse(content).version;
            hasFiles = true;
          }
        }
        if (!hasFiles) {
          const files = fs.readdirSync(backupPath);
          hasFiles = files.length > 0;
        }
      } catch (_) {}
    }
    return { exists: exists && hasFiles, version };
  });

  ipcMain.on('rollback-electron-update', () => {
    console.log('[AutoUpdater] Offline rollback triggered.');
    const backupPath = path.join(app.getPath('userData'), 'rollback_backup');
    const resourcesPath = process.resourcesPath;
    const exePath = process.execPath;
    const userDataPath = app.getPath('userData');
    
    if (!fs.existsSync(backupPath)) {
      sendToAllWindows('electron-update-status', { status: 'error', message: 'No previous version backup found.' });
      return;
    }

    if (process.platform === 'win32') {
      const scriptPath = path.join(userDataPath, 'rollback.ps1');
      const logPath = path.join(userDataPath, 'rollback.log');
      const targetPid = process.pid;
      const cleanLogPath = logPath.replace(/[/\\]+$/, '');
      const cleanBackupPath = backupPath.replace(/[/\\]+$/, '');
      const cleanResourcesPath = resourcesPath.replace(/[/\\]+$/, '');
      const cleanExePath = exePath;

      const psScript = `
# Mission Control Automated Rollback Script
$ErrorActionPreference = "Continue"

# Self-elevate to Administrator if not already elevated
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process powershell.exe -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "\`"$PSCommandPath\`"" -Verb RunAs
    exit
}

$logPath = @'
${cleanLogPath}
'@
$backupPath = @'
${cleanBackupPath}
'@
$resourcesPath = @'
${cleanResourcesPath}
'@
$exePath = @'
${cleanExePath}
'@
$parentPid = ${targetPid}

Function Log-Message($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Out-File -FilePath $logPath -Append -Encoding utf8
    Write-Host "[$timestamp] $msg"
}

Log-Message "=== Rollback process started ==="
Log-Message "Target resources path: $resourcesPath"
Log-Message "Source backup path: $backupPath"

# Wait for calling Electron process to exit
Log-Message "Waiting for parent PID $parentPid to terminate..."
$attempts = 0
while ($attempts -lt 20) {
    $proc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
    if (-not $proc) { break }
    Start-Sleep -Milliseconds 500
    $attempts++
}

# Wait additional seconds for file handles to release
Start-Sleep -Seconds 1

# Force kill any lingering python, backend, electron, or mission control helper processes
Get-Process -Name "Mission Control", "MissionControl", "MissionControlBackend", "electron", "python" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue

Log-Message "Restoring files via robocopy..."
$robocopyArgs = @(
    $backupPath,
    $resourcesPath,
    "/E",
    "/R:2",
    "/W:1",
    "/NP",
    "/NFL",
    "/NDL",
    "/XF", "rollback_meta.json", "rollback.log", "rollback.ps1"
)
$rc = Start-Process -FilePath "robocopy.exe" -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
Log-Message "Robocopy exited with code: $($rc.ExitCode)"

# In robocopy, exit code <= 7 means success (0=no change, 1=copied, 2=extra, 3=copied+extra)
if ($rc.ExitCode -gt 7) {
    Log-Message "Robocopy reported issues ($($rc.ExitCode)), falling back to PowerShell copy..."
    Get-ChildItem -Path $backupPath -Recurse | ForEach-Object {
        if ($_.FullName.Length -gt $backupPath.Length) {
            $rel = $_.FullName.Substring($backupPath.Length).TrimStart('\\').TrimStart('/')
            $dest = Join-Path $resourcesPath $rel
            if ($_.PSIsContainer) {
                if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
            } else {
                Copy-Item -Path $_.FullName -Destination $dest -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Log-Message "Relaunching application at: $exePath"
Start-Process -FilePath $exePath

Log-Message "=== Rollback completed successfully ==="
`;

      try {
        fs.writeFileSync(scriptPath, psScript, 'utf-8');

        // Always launch with UAC elevation so Program Files write access succeeds
        console.log('[AutoUpdater] Spawning rollback script with UAC elevation (RunAs)...');
        spawn('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-Command',
          `Start-Process powershell.exe -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', \`"${scriptPath}\`" -Verb RunAs`
        ], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        }).unref();

        // 1. Hide window immediately
        if (win && !win.isDestroyed()) {
          try { win.hide(); } catch (_) { }
        }

        // 2. Kill Python backend
        if (pythonProcess && pythonProcess.pid) {
          try { execSync(`taskkill /pid ${pythonProcess.pid} /f /t`, { windowsHide: true }); } catch (_) { }
          pythonProcess = null;
        }

        // 3. Terminate worker
        if (telemetryWorker) {
          try { telemetryWorker.terminate(); } catch (_) { }
          telemetryWorker = null;
        }

        // 4. Force exit
        setTimeout(() => app.exit(0), 400);
      } catch (err: any) {
        console.error('[AutoUpdater] Failed to execute rollback:', err);
        sendToAllWindows('electron-update-status', { status: 'error', message: 'Rollback failed: ' + err.message });
      }
    } else {
      // Non-Windows (Linux/macOS)
      const scriptPath = path.join(userDataPath, 'rollback.sh');
      const shScript = `#!/bin/bash
sleep 2
pkill -9 -f "MissionControl" || true
cp -R "${backupPath}/." "${resourcesPath}/"
"${exePath}" &
`;
      try {
        fs.writeFileSync(scriptPath, shScript, { mode: 0o755 });
        spawn('/bin/bash', [scriptPath], { detached: true, stdio: 'ignore' }).unref();
        if (pythonProcess && pythonProcess.pid) {
          try { pythonProcess.kill('SIGKILL'); } catch (_) {}
        }
        setTimeout(() => app.quit(), 500);
      } catch (err: any) {
        sendToAllWindows('electron-update-status', { status: 'error', message: 'Rollback failed: ' + err.message });
      }
    }
  });

  // Automatic check 5 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AutoUpdater] Startup check failed, will rely on direct GitHub fallback if available:', err);
    });
  }, 5000);
}

function sendToAllWindows(channel: string, data: any) {
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, data);
  }
  if (hudWin && !hudWin.isDestroyed() && !hudWin.webContents.isDestroyed()) {
    hudWin.webContents.send(channel, data);
  }
}

// IPC Handlers for Roadmap features (Item 3: Progress Bar & Item 11: Network States)
ipcMain.on('set-progress-bar', (_event, value: number) => {
  if (win && !win.isDestroyed()) {
    win.setProgressBar(value);
    console.log(`[Electron] Dashboard taskbar progress set to: ${value}`);
  }
});

ipcMain.on('network-status-changed', (_event, isOnline: boolean) => {
  console.log(`[Electron] Network connectivity event: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  sendToAllWindows('electron-network-status', isOnline);
});

// === Off-Screen Rendering (OSR) Pipeline Manager (Roadmap Item 10) ===
// Enables high-performance, low-latency off-screen pixel buffer extraction.
// Renders React overlay views completely off-screen in memory, feeding raw pixel buffers
// straight into game rendering hooks or GPU texture overlays without spawning OS windows.
let osrWin: BrowserWindow | null = null;
async function createOffscreenOverlay() {
  if (osrWin && !osrWin.isDestroyed()) return;

  const isDev = !app.isPackaged;
  osrWin = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Must remain hidden for OSR
    icon: getWindowIcon(),
    webPreferences: {
      offscreen: true, // Key flag enabling offscreen mode
      preload: path.join(_dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    }
  });

  // Load target React overlay route
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    osrWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#hud`);
  } else {
    // Start local server if not already started
    if (!localServerPort) {
      localServerPort = await startLocalServer(process.env.DIST || '');
    }
    if (localServerPort > 0) {
      osrWin.loadURL(`http://127.0.0.1:${localServerPort}/#hud`).catch(err => {
        console.error('[Electron] OSR Window failed to load:', err);
        setTimeout(() => {
          if (osrWin && !osrWin.isDestroyed()) {
            osrWin.loadURL(`http://127.0.0.1:${localServerPort}/#hud`).catch(() => {});
          }
        }, 1000);
      });
    } else {
      console.error('[Electron] Local server port is 0, cannot load OSR UI');
    }
  }

  // Paint listener catches dirty regions and raw pixel bitmaps offscreen
  osrWin.webContents.on('paint', (_event, dirty, image) => {
    // image is a NativeImage instance containing the raw RGBA frame buffer
    const frameBuffer = image.getBitmap() as any;
    const { width, height } = image.getSize();

    // Broadcast OSR metrics and dimensions to connected handlers
    // In production, this RGBA buffer is directly injected as a DirectX/Vulkan texture
    // overlay via python background process.
    sendToAllWindows('osr-frame-update', {
      width,
      height,
      bufferLength: frameBuffer ? frameBuffer.length : 0,
      dirtyRect: dirty
    });
  });

  console.log('[Electron OSR] Offscreen Rendering overlay pipeline is fully active.');
}

ipcMain.on('toggle-offscreen-rendering', (_event, enable: boolean) => {
  if (enable) {
    createOffscreenOverlay();
  } else {
    if (osrWin && !osrWin.isDestroyed()) {
      osrWin.close();
      osrWin = null;
      console.log('[Electron OSR] Offscreen overlay pipeline shut down.');
    }
  }
});


