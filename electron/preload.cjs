const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openDirectoryDialog: (defaultPath) => ipcRenderer.invoke('dialog:openDirectory', defaultPath),
  openFileDialog: (defaultPath) => ipcRenderer.invoke('dialog:openFile', defaultPath),
  showItemInFolder: (fullPath) => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
  openPath: (fullPath) => ipcRenderer.invoke('shell:openPath', fullPath),
  getDesktopSources: () => ipcRenderer.invoke('desktopCapturer:getSources'),
  fs: {
    selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
    readDirectoryChildren: (dirRelOrFullPath) => ipcRenderer.invoke('fs:readDirectoryChildren', dirRelOrFullPath),
    readDirectoryTree: (dirPath) => ipcRenderer.invoke('fs:readDirectoryTree', dirPath),
    readFileDetails: (filePath, options) => ipcRenderer.invoke('fs:readFileDetails', filePath, options),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath, content) => ipcRenderer.invoke('fs:createFile', filePath, content),
    createDirectory: (dirPath) => ipcRenderer.invoke('fs:createDirectory', dirPath),
    deleteItem: (targetPath) => ipcRenderer.invoke('fs:deleteItem', targetPath),
    renameItem: (oldPath, newPath) => ipcRenderer.invoke('fs:renameItem', oldPath, newPath),
    moveItem: (srcPath, destPath) => ipcRenderer.invoke('fs:moveItem', srcPath, destPath),
    searchCodebase: (options) => ipcRenderer.invoke('fs:searchCodebase', options),
  }
});
