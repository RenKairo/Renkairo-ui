import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let backendProcess = null;

function startBackendServer() {
  try {
    const serverPath = path.join(ROOT_DIR, 'backend/server.js');
    backendProcess = spawn('node', [serverPath], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });
    console.log('[Electron] Started backend server process on port 8000');
  } catch (err) {
    console.error('[Electron] Backend server auto-start error:', err);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0B0D11',
    title: 'RenKairo IDE - Next-Gen Cloud & AI Engineering Canvas',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  
  // Try connecting to Vite dev server for instant HMR auto-updates; fallback to dist/index.html
  fetch('http://localhost:5173')
    .then(() => {
      win.loadURL('http://localhost:5173');
      console.log('[Electron] Connected to Vite Dev Server (Live HMR auto-update enabled)');
    })
    .catch(() => {
      win.loadFile(distPath);
    });
}

// IPC Handlers for native OS folder and file operations
ipcMain.handle('dialog:openDirectory', async (event, defaultPath) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(focusedWindow || undefined, {
    title: 'Open Folder in RenKairo',
    defaultPath: defaultPath || undefined,
    properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('dialog:openFile', async (event, defaultPath) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(focusedWindow || undefined, {
    title: 'Open File in RenKairo',
    defaultPath: defaultPath || undefined,
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('shell:showItemInFolder', async (event, fullPath) => {
  if (fullPath) {
    shell.showItemInFolder(fullPath);
    return true;
  }
  return false;
});

ipcMain.handle('shell:openPath', async (event, fullPath) => {
  if (fullPath) {
    return await shell.openPath(fullPath);
  }
  return false;
});

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    try { backendProcess.kill(); } catch (e) {}
  }
  if (process.platform !== 'darwin') app.quit();
});

