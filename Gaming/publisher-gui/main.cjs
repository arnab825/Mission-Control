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
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
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

const fs = require('fs')
const os = require('os')

ipcMain.handle('publish-release', async (event, data) => {
  return new Promise((resolve, reject) => {
    try {
      const publishScript = path.join(__dirname, '..', 'scripts', 'publish.ps1')
      let args = `-Title "${data.title}" -Type ${data.type}`
      
      if (data.image) {
        // If it's a local file path, copy it to website/public/images/releases/
        if (fs.existsSync(data.image) && path.isAbsolute(data.image)) {
          const releasesDir = path.join(__dirname, '..', 'website', 'public', 'images', 'releases')
          if (!fs.existsSync(releasesDir)) {
            fs.mkdirSync(releasesDir, { recursive: true })
          }
          
          const fileName = path.basename(data.image)
          // Add timestamp to prevent overwriting
          const uniqueFileName = `${Date.now()}-${fileName}`
          const destPath = path.join(releasesDir, uniqueFileName)
          
          fs.copyFileSync(data.image, destPath)
          
          // Use relative URL for the markdown
          args += ` -Image "/images/releases/${uniqueFileName}"`
        } else {
          // Fallback to whatever URL was passed
          args += ` -Image "${data.image}"`
        }
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
    } catch (err) {
      resolve({ success: false, error: err.message, output: err.stack });
    }
  });
})

ipcMain.handle('get-git-release-data', async () => {
  return new Promise((resolve) => {
    // 1. Try to read from agent session documentation (walkthrough.md or implementation_plan.md)
    const brainDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain');
    let docTitle = '';
    let docChangelog = '';
    
    if (fs.existsSync(brainDir)) {
      try {
        const sessions = fs.readdirSync(brainDir);
        let latestSession = null;
        let latestMtime = 0;
        
        for (const session of sessions) {
          const sessionPath = path.join(brainDir, session);
          const stat = fs.statSync(sessionPath);
          if (stat.isDirectory()) {
            if (stat.mtimeMs > latestMtime) {
              latestMtime = stat.mtimeMs;
              latestSession = sessionPath;
            }
          }
        }
        
        if (latestSession) {
          let docPath = path.join(latestSession, 'walkthrough.md');
          if (!fs.existsSync(docPath)) {
            docPath = path.join(latestSession, 'implementation_plan.md');
          }
          
          if (fs.existsSync(docPath)) {
            const content = fs.readFileSync(docPath, 'utf8');
            const lines = content.split('\n');
            const bullets = [];
            let captureBullets = false;
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('# ') && !docTitle) {
                docTitle = trimmed.replace(/^#\s*(?:Walkthrough:\s*|Implementation Plan:\s*)?/i, '').trim();
              }
              if (trimmed.startsWith('## Changes') || trimmed.startsWith('## What Changed') || trimmed.startsWith('## Proposed Changes') || trimmed.startsWith('## Changes Made')) {
                captureBullets = true;
                continue;
              }
              if (captureBullets && trimmed.startsWith('## ')) {
                captureBullets = false;
              }
              
              if (captureBullets) {
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  bullets.push(trimmed);
                }
              }
            }
            
            if (bullets.length > 0) {
              docChangelog = bullets.join('\n');
            } else {
              const allBullets = [];
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  allBullets.push(trimmed);
                }
              }
              docChangelog = allBullets.join('\n');
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse walkthrough/plan", e);
      }
    }

    // 2. Get status for uncommitted changes
    exec('git status --porcelain', { cwd: path.join(__dirname, '..') }, (errStatus, stdoutStatus) => {
      let uncommittedChanges = [];
      let components = new Set();
      
      if (stdoutStatus && stdoutStatus.trim()) {
        const lines = stdoutStatus.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const status = line.substring(0, 2).trim();
          const filePath = line.substring(3).trim();
          
          let action = 'Modified';
          if (status === 'A' || status === '??') action = 'Added';
          else if (status === 'D') action = 'Deleted';
          
          let component = 'General';
          let cleanPath = filePath;
          if (filePath.startsWith('Gaming/')) {
            cleanPath = filePath.substring(7);
          }
          
          if (cleanPath.startsWith('backend/')) component = 'Backend';
          else if (cleanPath.startsWith('frontend/')) component = 'Frontend';
          else if (cleanPath.startsWith('website/')) component = 'Website';
          else if (cleanPath.startsWith('publisher-gui/')) component = 'Publisher GUI';
          else if (cleanPath.startsWith('scripts/')) component = 'Scripts';
          else if (cleanPath.startsWith('docs/')) component = 'Docs';
          
          components.add(component);
          const fileName = path.basename(cleanPath);
          uncommittedChanges.push(`- ${action} ${component}: ${fileName} (${cleanPath})`);
        }
      }
      
      // 3. Get last tag to check committed changes since last release
      exec('git describe --tags --abbrev=0', { cwd: path.join(__dirname, '..') }, (errTag, stdoutTag) => {
        const lastTag = stdoutTag ? stdoutTag.trim() : '';
        
        let logCommand = 'git log -n 10 --pretty=format:"%s"';
        if (lastTag) {
          logCommand = `git log ${lastTag}..HEAD --pretty=format:"%s"`;
        }
        
        exec(logCommand, { cwd: path.join(__dirname, '..') }, (errLog, stdoutLog) => {
          let commits = [];
          if (stdoutLog) {
            commits = stdoutLog.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          }
          
          let suggestedTitle = docTitle || '';
          let suggestedChangelog = docChangelog || '';
          
          if (!suggestedTitle || !suggestedChangelog) {
            if (uncommittedChanges.length > 0) {
              const compList = Array.from(components);
              suggestedTitle = suggestedTitle || `Updates to ${compList.join(', ')}`;
              
              let changelogParts = [];
              changelogParts.push('### Uncommitted Changes');
              changelogParts.push(...uncommittedChanges);
              
              if (commits.length > 0) {
                changelogParts.push('');
                changelogParts.push('### Committed Changes');
                changelogParts.push(...commits.map(c => `- ${c}`));
              }
              suggestedChangelog = suggestedChangelog || changelogParts.join('\n');
            } else {
              if (commits.length > 0) {
                suggestedTitle = suggestedTitle || commits[0];
                suggestedChangelog = suggestedChangelog || commits.map(c => `- ${c}`).join('\n');
              } else {
                suggestedTitle = suggestedTitle || 'New Release';
                suggestedChangelog = suggestedChangelog || '- General code updates';
              }
            }
          }
          
          resolve({
            title: suggestedTitle,
            changelog: suggestedChangelog
          });
        });
      });
    });
  });
})

ipcMain.handle('get-release-info', async () => {
  try {
    const versionPath = path.join(__dirname, '..', 'backend', 'version.json')
    if (fs.existsSync(versionPath)) {
      const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'))
      return {
        success: true,
        currentVersion: data.version,
        changelog: data.changelog || []
      }
    }
    return { success: false, error: 'version.json not found' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})
