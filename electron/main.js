import { app, BrowserWindow } from 'electron';
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
      stdio: 'ignore'
    });
    console.log('[Electron] Started backend server on port 8000');
  } catch (err) {
    console.error('[Electron] Backend server auto-start warning:', err);
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
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  const distPath = path.join(__dirname, '../dist/index.html');

  const loadDevServer = (attempts = 0) => {
    fetch('http://localhost:5173')
      .then(() => {
        win.loadURL('http://localhost:5173');
      })
      .catch(() => {
        if (attempts < 2) {
          setTimeout(() => loadDevServer(attempts + 1), 400);
        } else {
          win.loadFile(distPath);
        }
      });
  };

  loadDevServer();
}

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
