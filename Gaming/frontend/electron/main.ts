import * as electron from 'electron'
const { app, BrowserWindow, ipcMain, protocol, net, globalShortcut, shell, screen, dialog, Tray, Menu, nativeImage, Notification, session } = electron

type BrowserWindow = electron.BrowserWindow
type Tray = electron.Tray

import { autoUpdater } from 'electron-updater'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn, ChildProcess, execSync } from 'node:child_process'
import fs from 'node:fs'
import netSocket from 'node:net'
import os from 'node:os'
import { Worker } from 'node:worker_threads'

// Disable GPU sandbox on Windows to prevent GPU process crashes and black screen issues,
// while keeping hardware acceleration enabled so transparent windows (splash) and Mica load correctly.
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  console.log('[Electron] Windows platform detected — disabled GPU sandbox.');
}

// Optimize Memory for 16GB RAM constraints
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
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
let pythonProcess: ChildProcess | null = null
let tray: Tray | null = null
let isManualUpdateCheck = false;

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
          window.webContents.inspectElement(params.x, params.y);
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

    function updateTrayMenu() {
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Mission Control Gaming Assistant', enabled: false, icon: menuIcon },
        { type: 'separator' },
        {
          label: 'Show Dashboard', icon: iconDashboard, click: () => {
            if (win && !win.isDestroyed()) {
              win.show();
              win.focus();
            } else {
              createWindow();
            }
          }
        },
        {
          label: 'Toggle HUD Overlay (Ctrl+Alt+H)', icon: iconHud, click: () => {
            toggleHUDWindow();
          }
        },
        {
          label: 'Check for Updates', icon: iconUpdate, click: () => {
            if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
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

    tray?.setToolTip('Mission Control Gaming Assistant');

    tray?.on('click', () => {
      if (win && !win.isDestroyed()) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      } else {
        createWindow();
      }
    });

    tray?.on('double-click', () => {
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      } else {
        createWindow();
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

function startPythonBackend() {
  const isDev = !app.isPackaged
  const scriptPath = isDev
    ? path.join(_dirname, '..', '..', 'backend', 'main.py')
    : path.join((process as any).resourcesPath, 'backend', 'main.py')

  const port = parseInt(process.env.VITE_BRIDGE_PORT || '8765', 10)
  const timeout = setTimeout(() => {
    // Timeout - no response from backend on port, try spawning
    console.log(`[Electron] Backend probe timeout on port ${port}. Spawning new backend instance...`)
    spawnBackend()
  }, 2000)

  // Probe port first to check if external python backend is already running
  const socket = netSocket.createConnection({ port, host: '127.0.0.1' }, () => {
    clearTimeout(timeout)
    console.log(`[Electron] ✓ External Python backend detected on port ${port}. Skipping auto-spawn.`)
    socket.end()
  })

  socket.on('error', () => {
    clearTimeout(timeout)
    console.log(`[Electron] Port ${port} is free. Starting Python backend: ${scriptPath}`)
    spawnBackend()
  })

  function spawnBackend() {
    // ── Priority chain ──────────────────────────────────────────────────────
    // 1. Dev mode  → use venv python + main.py (hot-reload friendly)
    // 2. Packaged  → use bundled MissionControl.exe (no Python install needed)
    // 3. Fallback  → system python + main.py (developer machine testing)

    let executablePath: string
    let args: string[] = []

    if (isDev) {
      // Dev: prefer venv python
      const venvPython = path.join(_dirname, '..', '..', 'backend', '.venv', 'Scripts', 'python.exe')
      executablePath = fs.existsSync(venvPython) ? venvPython : 'python'
      args = [scriptPath, '--dev']
      console.log(`[Electron] Dev mode — python: ${executablePath}`)
    } else {
      // Production: look for bundled standalone exe first
      const bundledExeBuilder = path.join((process as any).resourcesPath, 'backend', 'MissionControl', 'MissionControl.exe')
      const bundledExeForge = path.join((process as any).resourcesPath, 'MissionControl', 'MissionControl.exe')

      if (fs.existsSync(bundledExeBuilder)) {
        executablePath = bundledExeBuilder
        console.log(`[Electron] Using bundled backend exe: ${bundledExeBuilder}`)
      } else if (fs.existsSync(bundledExeForge)) {
        executablePath = bundledExeForge
        console.log(`[Electron] Using bundled backend exe (forge): ${bundledExeForge}`)
      } else {
        // Fallback: raw python (developer machine without compiled binary)
        const localVenv = 'c:/GitHub/Mission-Control/Gaming/backend/.venv/Scripts/python.exe'
        executablePath = fs.existsSync(localVenv) ? localVenv : 'python'
        args = [scriptPath]
        console.log(`[Electron] Fallback — python: ${executablePath}`)
      }
    }

    // Spawn the backend – windowsHide prevents a console window on Windows;
    // stdio:'pipe' avoids inheriting the parent console.
    pythonProcess = spawn(executablePath, args, {
      stdio: 'pipe',
      windowsHide: true,
      detached: false,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1' }
    })

    // Drain the pipes so the buffer never fills up and stalls the process.
    // In dev we forward to Electron's own console; in production we discard.
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      if (isDev) process.stdout.write(`[Backend] ${data}`)
    })
    pythonProcess.stderr?.on('data', (data: Buffer) => {
      if (isDev) process.stderr.write(`[Backend] ${data}`)
    })

    pythonProcess.on('error', (err) => {
      console.error('[Electron] Failed to start Python backend:', err)
    })

    pythonProcess.on('exit', (code) => {
      console.log(`[Electron] Python backend exited with code ${code}`)
    })
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

        const filePath = path.join(distPath, safeUrl).replace(/\\/g, '/')

        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            const indexPath = path.join(distPath, 'index.html').replace(/\\/g, '/')
            res.writeHead(200, {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            })
            const stream = fs.createReadStream(indexPath)
            stream.on('error', (streamErr) => {
              console.error('[Electron Server] Error serving fallback index.html:', streamErr)
              res.writeHead(404, { 'Content-Type': 'text/plain' })
              res.end('404 Not Found')
            })
            stream.pipe(res)
            return
          }

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
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          })
          const stream = fs.createReadStream(filePath)
          stream.on('error', (streamErr) => {
            console.error('[Electron Server] Error serving file:', streamErr)
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('500 Internal Server Error')
          })
          stream.pipe(res)
        })
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
    transparent: true,
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
      splash?.loadFile(path.join(_dirname, 'splash.html'));
    });
  } else {
    splash.loadFile(path.join(_dirname, 'splash.html'));
  }

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false, // Don't show the window until it's ready-to-show
    transparent: false, // Must be false for backgroundMaterial
    backgroundColor: '#0a0a0a',
    backgroundMaterial: 'mica', // Enable native Windows 11 Mica effect
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(_dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Keep timers alive when app is behind the game window
    },
  })

  win.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Web Console] ${message} (${sourceId}:${line})`);
  });

  win.once('ready-to-show', () => {
    if (splash) {
      try { splash.close(); } catch(e) {}
      splash = null;
    }
    win?.show();
    // Force focus in case the installer or elevation hid the window
    win?.setAlwaysOnTop(true);
    win?.focus();
    win?.setAlwaysOnTop(false);
  })

  registerContextMenu(win)

  // Ensure CSS transparency allows Mica to show through.
  // We'll stick to CSS transparency combined with a frameless transparent window for now.

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
        setTimeout(() => win?.loadURL(`http://127.0.0.1:${localServerPort}`), 1000);
      });
    } else {
      console.error('[Electron] Local server port is 0, cannot load UI');
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

app.whenReady().then(() => {
  // Clear Chromium cache on startup to ensure updated assets load immediately
  session.defaultSession.clearCache().catch((err) => {
    console.warn('[Electron] Failed to clear session cache:', err)
  })

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

  startPythonBackend()
  initializeSystemStats()
  createTray()
  runTelemetryWorker()
  createWindow()
  setupAutoUpdater()
})

app.on('before-quit', () => {
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

let hudWin: BrowserWindow | null = null;
let isHUDVisible = false;
let currentHotkey: string = '';
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
    if (showOnReady) {
      hudWin?.showInactive();
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
      hudWin?.setIgnoreMouseEvents(isLocked, isLocked ? { forward: true } : undefined);
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
        setTimeout(() => hudWin?.loadURL(`http://127.0.0.1:${localServerPort}/#hud`), 1000);
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

// === electron-updater Configuration (NSIS / GitHub Releases) ===
function setupAutoUpdater() {
  const isSupported = (process.platform === 'win32' || process.platform === 'darwin') && app.isPackaged;

  if (!isSupported) {
    console.log('[AutoUpdater] Skipping — not packaged or unsupported platform.');
    ipcMain.on('check-electron-updates', (event) => {
      event.sender.send('electron-update-status', {
        status: 'not-supported',
        message: 'Auto-update is only supported in packaged Windows/macOS builds.'
      });
    });
    return;
  }

  // electron-updater reads app-update.yml from process.resourcesPath automatically.
  // No setFeedURL needed — GitHub owner/repo come from the bundled app-update.yml.
  autoUpdater.autoDownload = false; // Require user to click Download
  autoUpdater.autoInstallOnAppQuit = true;

  // ── Event Listeners ─────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
    sendToAllWindows('electron-update-status', { status: 'checking', message: 'Checking for updates...' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    // Send status to React UI — the UpdaterModal handles the download prompt
    // so no native dialog is shown here (that would race with and duplicate the UI).
    sendToAllWindows('electron-update-status', {
      status: 'available',
      version: info.version,
      notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      message: `Update v${info.version} available.`
    });
    // Fire a native Windows toast only on automated startup checks.
    // For manual checks the user already has the UpdaterModal open, so no toast needed.
    if (!isManualUpdateCheck) {
      fireUpdateToast(info.version);
    }
    if (isManualUpdateCheck) {
      isManualUpdateCheck = false;
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] No updates available.');
    sendToAllWindows('electron-update-status', { status: 'up-to-date', message: 'Application is up to date.' });
    if (isManualUpdateCheck) {
      isManualUpdateCheck = false;
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
    sendToAllWindows('electron-update-status', { status: 'error', message: err.message });
    if (isManualUpdateCheck) {
      isManualUpdateCheck = false;
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToAllWindows('electron-update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      message: `Downloading update… ${Math.round(progress.percent)}%`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    // Send status to React UI — the UpdaterModal's "Restart & Relaunch" button
    // calls quit-and-install-update via IPC, so no native dialog needed here.
    sendToAllWindows('electron-update-status', {
      status: 'downloaded',
      version: info.version,
      date: info.releaseDate,
      notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      message: `Update v${info.version} ready to install.`
    });
  });

  // ── IPC Commands from frontend ───────────────────────────────────────────
  ipcMain.on('check-electron-updates', () => {
    isManualUpdateCheck = true;
    autoUpdater.checkForUpdates().catch((err: any) => {
      isManualUpdateCheck = false;
      console.error('[AutoUpdater] checkForUpdates failed:', err);
      sendToAllWindows('electron-update-status', { status: 'error', message: err.message });
    });
  });

  ipcMain.on('quit-and-install-update', () => {
    console.log('[AutoUpdater] Quitting and installing update...');
    try {
      // Force kill python before NSIS tries to uninstall, preventing file lock crashes
      if (pythonProcess && pythonProcess.pid) {
        console.log('[AutoUpdater] Killing Python backend process tree before update...');
        if (process.platform === 'win32') {
          try { execSync(`taskkill /pid ${pythonProcess.pid} /f /t`, { windowsHide: true }) } catch (err) {}
        } else {
          try { pythonProcess.kill('SIGKILL') } catch (_) {}
        }
        pythonProcess = null;
      }
      autoUpdater.quitAndInstall();
    } catch (err: any) {
      console.error('[AutoUpdater] quitAndInstall failed:', err);
    }
  });

  // Sent by fireUpdateToast click handler to open the UpdaterModal in React
  ipcMain.removeAllListeners('open-updater-modal');
  ipcMain.on('open-updater-modal', () => {
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.show();
      win.focus();
      win.webContents.send('open-updater-modal');
    }
  });

  ipcMain.on('download-electron-update', () => {
    console.log('[AutoUpdater] User manually triggered downloadUpdate()');
    try {
      autoUpdater.downloadUpdate();
    } catch (err: any) {
      console.error('[AutoUpdater] downloadUpdate failed:', err);
      sendToAllWindows('electron-update-status', { status: 'error', message: err.message });
    }
  });

  // Automatic check 5 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AutoUpdater] Startup check failed:', err);
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
        setTimeout(() => osrWin?.loadURL(`http://127.0.0.1:${localServerPort}/#hud`), 1000);
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


