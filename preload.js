const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // ... existing exposed functions ...
  getCredentials: () => ipcRenderer.invoke('get-credentials'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});