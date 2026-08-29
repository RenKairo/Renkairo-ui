const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openDirectoryDialog: (defaultPath) => ipcRenderer.invoke('dialog:openDirectory', defaultPath),
  openFileDialog: (defaultPath) => ipcRenderer.invoke('dialog:openFile', defaultPath),
  showItemInFolder: (fullPath) => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
  openPath: (fullPath) => ipcRenderer.invoke('shell:openPath', fullPath),
});
