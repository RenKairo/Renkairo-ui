const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0B0D11',
    title: 'RenKairo IDE - Next-Gen Cloud & AI Engineering Canvas',
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
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
        if (attempts < 4) {
          console.log(`[Electron] Connecting to dev server (attempt ${attempts + 1})...`);
          setTimeout(() => loadDevServer(attempts + 1), 500);
        } else {
          console.log('[Electron] Dev server offline. Loading production build dist/index.html...');
          win.loadFile(distPath);
        }
      });
  };

  loadDevServer();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
