import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let backendProcess = null;

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
  'System Volume Information'
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

function buildNativeTree(dirPath, rootPath, maxDepth = 8, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const entries = [];

  try {
    const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

    // Sort: directories first (alphabetical), then files (alphabetical)
    dirents.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    for (const dirent of dirents) {
      if (IGNORED_NAMES.has(dirent.name) || dirent.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, dirent.name);
      const relPath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

      if (dirent.isDirectory()) {
        const children = buildNativeTree(fullPath, rootPath, maxDepth, currentDepth + 1);
        entries.push({
          name: dirent.name,
          path: relPath,
          is_dir: true,
          children
        });
      } else {
        entries.push({
          name: dirent.name,
          path: relPath,
          is_dir: false,
          children: null
        });
      }
    }
  } catch (err) {
    console.warn(`[Native FS] Error reading directory: ${dirPath}`, err.message);
  }

  return entries;
}

function startBackendServer() {
  try {
    const serverPath = path.join(ROOT_DIR, 'backend/server.js');
    if (fs.existsSync(serverPath)) {
      backendProcess = spawn('node', [serverPath], {
        cwd: ROOT_DIR,
        stdio: 'inherit'
      });
      console.log('[Electron] Started backend server process on port 8000');
    }
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

// ----------------------------------------------------
// Native Node.js File System IPC Handlers (VS Code Model)
// ----------------------------------------------------

// 1. Select Folder via Native OS Dialog
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
  const rootName = path.basename(selectedPath) || selectedPath;
  const tree = buildNativeTree(selectedPath, selectedPath);

  return {
    path: selectedPath,
    name: rootName,
    tree
  };
});

// 2. Read Directory Tree
ipcMain.handle('fs:readDirectoryTree', async (event, dirPath) => {
  if (!dirPath || !fs.existsSync(dirPath)) return [];
  return buildNativeTree(dirPath, dirPath);
});

// 3. Read File Content with O(1) Binary Sniffing & Stream Safeguards
ipcMain.handle('fs:readFileDetails', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { content: '', size: 0, isBinary: false, tier: 'small', truncated: false, totalSize: 0 };
    }

    const stat = fs.statSync(filePath);
    const size = stat.size;
    const ext = path.extname(filePath).replace('.', '').toLowerCase();

    // Check extension
    if (BINARY_EXTENSIONS.has(ext)) {
      return { content: '', size, isBinary: true, tier: getTier(size), truncated: false, totalSize: size };
    }

    // Header probe for null bytes
    const sampleSize = Math.min(size, 4096);
    if (sampleSize > 0) {
      const fd = fs.openSync(filePath, 'r');
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
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(maxReadBytes);
      fs.readSync(fd, buffer, 0, maxReadBytes, 0);
      fs.closeSync(fd);
      content = buffer.toString('utf-8');
      truncated = true;
    } else {
      content = fs.readFileSync(filePath, 'utf-8');
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
    console.error(`[Native FS] Failed reading file: ${filePath}`, err);
    return { content: '', size: 0, isBinary: false, tier: 'small', truncated: false, totalSize: 0 };
  }
});

function getTier(size) {
  if (size >= 100 * 1024 * 1024) return 'huge';
  if (size >= 20 * 1024 * 1024) return 'large';
  if (size >= 2 * 1024 * 1024) return 'medium';
  return 'small';
}

// 4. Write File Content
ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content ?? '', 'utf-8');
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed writing file: ${filePath}`, err);
    return false;
  }
});

// 5. Create File
ipcMain.handle('fs:createFile', async (event, filePath, content) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content ?? '', 'utf-8');
    }
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed creating file: ${filePath}`, err);
    return false;
  }
});

// 6. Create Directory
ipcMain.handle('fs:createDirectory', async (event, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed creating directory: ${dirPath}`, err);
    return false;
  }
});

// 7. Delete Item (File or Directory)
ipcMain.handle('fs:deleteItem', async (event, targetPath) => {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed deleting: ${targetPath}`, err);
    return false;
  }
});

// 8. Rename Item
ipcMain.handle('fs:renameItem', async (event, oldPath, newPath) => {
  try {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed renaming: ${oldPath} -> ${newPath}`, err);
    return false;
  }
});

// 9. Move Item
ipcMain.handle('fs:moveItem', async (event, srcPath, destPath) => {
  try {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    try {
      fs.renameSync(srcPath, destPath);
    } catch (e) {
      // Fallback for cross-device moves
      fs.cpSync(srcPath, destPath, { recursive: true });
      fs.rmSync(srcPath, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    console.error(`[Native FS] Failed moving: ${srcPath} -> ${destPath}`, err);
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
