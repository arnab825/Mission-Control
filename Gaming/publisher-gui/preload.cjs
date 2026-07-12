const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  publishRelease: (data) => ipcRenderer.invoke('publish-release', data)
})
