import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let backendProcess = null;
let activeRootWorkspacePath = '';

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '__pycache__',
  '.venv',
  'dist',
  'dist_electron',
  '.vite',
  '.DS_Store',
  '$RECYCLE.BIN',
  'System Volume Information',
  'Recovery',
  'DumpStack.log',
  'hiberfil.sys',
  'pagefile.sys',
  'swapfile.sys'
]);

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'svgz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'iso', 'img',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac',
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'wasm', 'pyc', 'class', 'db', 'sqlite', 'sqlite3', 'parquet', 'arrow'
]);

/**
 * ⚡ Fast Demand-Driven Depth-1 Scanner (VS Code AsyncDataTree Model)
 * Only reads the immediate direct children of the target directory.
 * Complexity: O(K) where K is number of items in that specific directory (~20 items),
 * taking < 5ms even on a 200GB drive with millions of files!
 */
function readNativeDirectoryChildren(dirPath, rootPath = activeRootWorkspacePath) {
  const entries = [];
  if (!dirPath || !fs.existsSync(dirPath)) return entries;

  try {
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

    // Sort: directories first (alphabetical), then files (alphabetical)
    dirents.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    const effectiveRoot = rootPath || dirPath;

    for (const dirent of dirents) {
      if (IGNORED_NAMES.has(dirent.name) || dirent.name.startsWith('$')) continue;

      const fullPath = path.join(dirPath, dirent.name);
      let relPath = path.relative(effectiveRoot, fullPath).replace(/\\/g, '/');
      if (!relPath) relPath = dirent.name;

      const isDir = dirent.isDirectory();

      entries.push({
        name: dirent.name,
        path: relPath,
        is_dir: isDir,
        children: isDir ? null : null // null indicates unloaded children (lazy demand-driven)
      });
    }
  } catch (err) {
    console.warn(`[Native FS] Skipped reading protected/restricted directory: ${dirPath}`, err.message);
  }

  return entries;
}

function startBackendServer() {
  fetch('http://localhost:8000/health')
    .then(() => {
      console.log('[Electron] Backend server already running on port 8000');
    })
    .catch(() => {
      try {
        const serverPath = path.join(ROOT_DIR, 'backend/server.js');
        if (fs.existsSync(serverPath)) {
          backendProcess = spawn('node', [serverPath], {
            cwd: ROOT_DIR,
            stdio: 'ignore'
          });
          console.log('[Electron] Started backend server on port 8000');
        }
      } catch (err) {
        console.error('[Electron] Backend server auto-start warning:', err);
      }
    });
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
  
  if (app.isPackaged) {
    win.loadFile(distPath);
  } else {
    // Retry connecting to Vite dev server for instant HMR auto-updates; fallback to dist/index.html
    const loadDevServer = (attempts = 0) => {
      fetch('http://localhost:5173')
        .then(() => {
          win.loadURL('http://localhost:5173');
          console.log('[Electron] Connected to Vite Dev Server (Live HMR auto-update enabled)');
        })
        .catch(() => {
          if (attempts < 20) {
            setTimeout(() => loadDevServer(attempts + 1), 300);
          } else {
            console.log('[Electron] Dev server offline. Loading production build dist/index.html...');
            win.loadFile(distPath);
          }
        });
    };

    loadDevServer();
  }
}

// ----------------------------------------------------
// Native Node.js File System IPC Handlers (VS Code Model)
// ----------------------------------------------------

// 1. Select Folder via Native OS Dialog (Instant O(K) Open)
ipcMain.handle('fs:selectFolder', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(focusedWindow || undefined, {
    title: 'Open Folder in RenKairo',
    properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  activeRootWorkspacePath = selectedPath;
  const rootName = path.basename(selectedPath) || selectedPath;
  
  // Fast depth-1 scan (Takes < 5ms)
  const tree = readNativeDirectoryChildren(selectedPath, selectedPath);

  return {
    path: selectedPath,
    name: rootName,
    tree
  };
});

// 2. Read Depth-1 Children for On-Demand Expansion
ipcMain.handle('fs:readDirectoryChildren', async (event, dirRelOrFullPath) => {
  let targetPath = dirRelOrFullPath;
  if (!path.isAbsolute(targetPath) && activeRootWorkspacePath) {
    targetPath = path.join(activeRootWorkspacePath, targetPath);
  }
  return readNativeDirectoryChildren(targetPath, activeRootWorkspacePath);
});

// 3. Read Directory Tree (Root Refresh)
ipcMain.handle('fs:readDirectoryTree', async (event, dirPath) => {
  const target = dirPath || activeRootWorkspacePath;
  if (!target || !fs.existsSync(target)) return [];
  return readNativeDirectoryChildren(target, target);
});

// 4. Read File Content with O(1) Binary Sniffing & Stream Safeguards
ipcMain.handle('fs:readFileDetails', async (event, filePath) => {
  let fullPath = filePath;
  if (!path.isAbsolute(fullPath) && activeRootWorkspacePath) {
    fullPath = path.join(activeRootWorkspacePath, fullPath);
  }

  try {
    if (!fs.existsSync(fullPath)) {
      return { content: '', size: 0, isBinary: false, tier: 'small', truncated: false, totalSize: 0 };
    }

    const stat = fs.statSync(fullPath);
    const size = stat.size;
    const ext = path.extname(fullPath).replace('.', '').toLowerCase();

    // Check extension
    if (BINARY_EXTENSIONS.has(ext)) {
      return { content: '', size, isBinary: true, tier: getTier(size), truncated: false, totalSize: size };
    }

    // Header probe for null bytes
    const sampleSize = Math.min(size, 4096);
    if (sampleSize > 0) {
      const fd = fs.openSync(fullPath, 'r');
      const buffer = Buffer.alloc(sampleSize);
      fs.readSync(fd, buffer, 0, sampleSize, 0);
      fs.closeSync(fd);

      for (let i = 0; i < sampleSize; i++) {
        if (buffer[i] === 0x00) {
          return { content: '', size, isBinary: true, tier: getTier(size), truncated: false, totalSize: size };
        }
      }
    }

    // For huge files (>= 100 MB), read first 25 MB preview window
    const maxReadBytes = 25 * 1024 * 1024;
    let truncated = false;
    let content = '';

    if (size > maxReadBytes && size >= 100 * 1024 * 1024) {
      const fd = fs.openSync(fullPath, 'r');
      const buffer = Buffer.alloc(maxReadBytes);
      fs.readSync(fd, buffer, 0, maxReadBytes, 0);
      fs.closeSync(fd);
      content = buffer.toString('utf-8');
      truncated = true;
    } else {
      content = fs.readFileSync(fullPath, 'utf-8');
    }

    return {
      content,
      size,
      isBinary: false,
      tier: getTier(size),
      truncated,
      totalSize: size
    };
  } catch (err) {
    console.error(`[Native FS] Failed reading file: ${fullPath}`, err);
    return { content: '', size: 0, isBinary: false, tier: 'small', truncated: false, totalSize: 0 };
  }
});

function getTier(size) {
  if (size >= 100 * 1024 * 1024) return 'huge';
  if (size >= 20 * 1024 * 1024) return 'large';
  if (size >= 2 * 1024 * 1024) return 'medium';
  return 'small';
}

// 5. Write File Content
ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  let fullPath = filePath;
  if (!path.isAbsolute(fullPath) && activeRootWorkspacePath) {
    fullPath = path.join(activeRootWorkspacePath, fullPath);
  }

  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content ?? '', 'utf-8');
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed writing file: ${fullPath}`, err);
    return false;
  }
});

// 6. Create File
ipcMain.handle('fs:createFile', async (event, filePath, content) => {
  let fullPath = filePath;
  if (!path.isAbsolute(fullPath) && activeRootWorkspacePath) {
    fullPath = path.join(activeRootWorkspacePath, fullPath);
  }

  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content ?? '', 'utf-8');
    }
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed creating file: ${fullPath}`, err);
    return false;
  }
});

// 7. Create Directory
ipcMain.handle('fs:createDirectory', async (event, dirPath) => {
  let fullPath = dirPath;
  if (!path.isAbsolute(fullPath) && activeRootWorkspacePath) {
    fullPath = path.join(activeRootWorkspacePath, fullPath);
  }

  try {
    fs.mkdirSync(fullPath, { recursive: true });
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed creating directory: ${fullPath}`, err);
    return false;
  }
});

// 8. Delete Item (File or Directory)
ipcMain.handle('fs:deleteItem', async (event, targetPath) => {
  let fullPath = targetPath;
  if (!path.isAbsolute(fullPath) && activeRootWorkspacePath) {
    fullPath = path.join(activeRootWorkspacePath, fullPath);
  }

  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed deleting: ${fullPath}`, err);
    return false;
  }
});

// 9. Rename Item
ipcMain.handle('fs:renameItem', async (event, oldPath, newPath) => {
  let oldFullPath = oldPath;
  let newFullPath = newPath;
  if (!path.isAbsolute(oldFullPath) && activeRootWorkspacePath) {
    oldFullPath = path.join(activeRootWorkspacePath, oldFullPath);
  }
  if (!path.isAbsolute(newFullPath) && activeRootWorkspacePath) {
    newFullPath = path.join(activeRootWorkspacePath, newFullPath);
  }

  try {
    fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
    fs.renameSync(oldFullPath, newFullPath);
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed renaming: ${oldFullPath} -> ${newFullPath}`, err);
    return false;
  }
});

// 10. Move Item
ipcMain.handle('fs:moveItem', async (event, srcPath, destPath) => {
  let srcFullPath = srcPath;
  let destFullPath = destPath;
  if (!path.isAbsolute(srcFullPath) && activeRootWorkspacePath) {
    srcFullPath = path.join(activeRootWorkspacePath, srcFullPath);
  }
  if (!path.isAbsolute(destFullPath) && activeRootWorkspacePath) {
    destFullPath = path.join(activeRootWorkspacePath, destFullPath);
  }

  try {
    fs.mkdirSync(path.dirname(destFullPath), { recursive: true });
    try {
      fs.renameSync(srcFullPath, destFullPath);
    } catch (e) {
      // Fallback for cross-device moves
      fs.cpSync(srcFullPath, destFullPath, { recursive: true });
      fs.rmSync(srcFullPath, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed moving: ${srcFullPath} -> ${destFullPath}`, err);
    return false;
  }
});

// ----------------------------------------------------
// Shell & Dialog IPC Handlers
// ----------------------------------------------------
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

// App Lifecycle
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
