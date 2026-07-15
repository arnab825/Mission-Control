const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  publishRelease: (data) => ipcRenderer.invoke('publish-release', data),
  getGitReleaseData: () => ipcRenderer.invoke('get-git-release-data'),
  getReleaseInfo: () => ipcRenderer.invoke('get-release-info')
})
