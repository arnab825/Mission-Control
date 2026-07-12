const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { exec } = require('child_process')

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#ffffff',
      height: 30
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // In development, we use Vite's dev server running on port 5173.
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, 'dist', 'index.html')}`);
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('publish-release', async (event, data) => {
  return new Promise((resolve, reject) => {
    // Construct the PowerShell command
    const publishScript = path.join(__dirname, '..', 'scripts', 'publish.ps1')
    let args = `-Title "${data.title}" -Type ${data.type}`
    
    if (data.image) {
      args += ` -Image "${data.image}"`
    }
    
    if (data.changes && data.changes.length > 0) {
      const changesArgs = data.changes.map(c => `"${c}"`).join(' ')
      args += ` -Changes ${changesArgs}`
    }

    const command = `powershell -ExecutionPolicy Bypass -Command "& '${publishScript}' ${args}"`
    
    exec(command, { cwd: path.join(__dirname, '..', '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        resolve({ success: false, error: error.message, output: stderr || stdout });
        return;
      }
      resolve({ success: true, output: stdout });
    });
  });
})
