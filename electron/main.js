import { app, BrowserWindow, ipcMain, dialog, shell, desktopCapturer, session } from 'electron';
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
        let serverPath = path.join(ROOT_DIR, 'backend/server.js');
        if (!fs.existsSync(serverPath) && app.isPackaged) {
          const altPath = path.join(app.getAppPath(), 'backend/server.js');
          if (fs.existsSync(altPath)) {
            serverPath = altPath;
          }
        }

        if (fs.existsSync(serverPath)) {
          const nodeBinary = app.isPackaged ? process.execPath : 'node';
          const env = app.isPackaged
            ? { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: '8000' }
            : { ...process.env, PORT: '8000' };

          backendProcess = spawn(nodeBinary, [serverPath], {
            cwd: app.isPackaged ? path.dirname(serverPath) : ROOT_DIR,
            env: env,
            stdio: ['ignore', 'inherit', 'inherit']
          });
          console.log('[Electron] Started backend server on port 8000');
        } else {
          console.warn('[Electron] Backend server script not found at:', serverPath);
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

// 11. Full-Stack Codebase Search Engine IPC
ipcMain.handle('fs:searchCodebase', async (event, options = {}) => {
  return searchCodebase(options);
});

function searchCodebase({ query, includes, isCaseSensitive, isWholeWord, isRegex, rootPath }) {
  if (!query || !query.trim()) {
    return { results: [], totalMatches: 0, totalFiles: 0, capped: false };
  }

  const targetRoot = rootPath || activeRootWorkspacePath;
  if (!targetRoot || !fs.existsSync(targetRoot)) {
    return { results: [], totalMatches: 0, totalFiles: 0, capped: false };
  }

  let includePatterns = [];
  if (includes && includes.trim()) {
    includePatterns = includes.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }

  let regex = null;
  try {
    let pattern = query;
    if (!isRegex) {
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (isWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const flags = isCaseSensitive ? 'g' : 'gi';
    regex = new RegExp(pattern, flags);
  } catch (err) {
    return { results: [], totalMatches: 0, totalFiles: 0, capped: false, error: 'Invalid Regular Expression' };
  }

  const gitignorePatterns = new Set();
  const gitignorePath = path.join(targetRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      gitignoreContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          gitignorePatterns.add(trimmed.replace(/^\//, '').replace(/\/$/, ''));
        }
      });
    } catch (e) {}
  }

  const results = [];
  let totalMatches = 0;
  let totalFiles = 0;
  let capped = false;

  const MAX_MATCHES = 500;
  const MAX_FILES = 50;

  function matchesInclude(filename, relPath) {
    if (includePatterns.length === 0) return true;
    const lowerName = filename.toLowerCase();
    const lowerRel = relPath.toLowerCase();

    return includePatterns.some(pattern => {
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1);
        return lowerName.endsWith(ext);
      }
      if (pattern.includes('*')) {
        const globRegex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return globRegex.test(lowerName) || globRegex.test(lowerRel);
      }
      return lowerName.includes(pattern) || lowerRel.includes(pattern);
    });
  }

  function walkDir(currentDir) {
    if (capped) return;

    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      if (capped) break;

      const name = entry.name;
      if (IGNORED_NAMES.has(name) || gitignorePatterns.has(name) || name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(currentDir, name);
      let relPath = path.relative(targetRoot, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(name).replace('.', '').toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;

        if (!matchesInclude(name, relPath)) continue;

        try {
          const stat = fs.statSync(fullPath);
          if (stat.size > 5 * 1024 * 1024) continue;

          const sampleSize = Math.min(stat.size, 1024);
          if (sampleSize > 0) {
            const fd = fs.openSync(fullPath, 'r');
            const buffer = Buffer.alloc(sampleSize);
            fs.readSync(fd, buffer, 0, sampleSize, 0);
            fs.closeSync(fd);
            let isBinary = false;
            for (let i = 0; i < sampleSize; i++) {
              if (buffer[i] === 0x00) { isBinary = true; break; }
            }
            if (isBinary) continue;
          }

          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split(/\r?\n/);
          const fileMatches = [];

          for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            if (totalMatches >= MAX_MATCHES) {
              capped = true;
              break;
            }

            const lineText = lines[lineIdx];
            regex.lastIndex = 0;
            
            const matchIndices = [];
            let match;
            while ((match = regex.exec(lineText)) !== null) {
              matchIndices.push([match.index, match.index + match[0].length]);
              if (match[0].length === 0) break;
              if (!regex.global) break;
            }

            if (matchIndices.length > 0) {
              fileMatches.push({
                line: lineIdx + 1,
                text: lineText.length > 300 ? lineText.slice(0, 300) + '...' : lineText,
                matchIndices
              });
              totalMatches += matchIndices.length;
            }
          }

          if (fileMatches.length > 0) {
            results.push({
              path: relPath,
              fullPath: fullPath,
              matches: fileMatches
            });
            totalFiles++;
            if (totalFiles >= MAX_FILES) {
              capped = true;
            }
          }
        } catch (e) {}
      }
    }
  }

  walkDir(targetRoot);

  return {
    results,
    totalMatches,
    totalFiles,
    capped
  };
}

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

ipcMain.handle('desktopCapturer:getSources', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    return sources.map(s => ({ id: s.id, name: s.name }));
  } catch (err) {
    console.error('[Desktop Capturer Error]:', err);
    return [];
  }
});

// App Lifecycle
app.whenReady().then(() => {
  if (session.defaultSession && typeof session.defaultSession.setDisplayMediaHandler === 'function') {
    try {
      session.defaultSession.setDisplayMediaHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
          if (sources.length > 0) {
            callback({ video: sources[0], audio: 'loopback' });
          } else {
            callback({});
          }
        }).catch((err) => {
          console.error('[Electron DisplayMediaHandler Error]:', err);
          callback({});
        });
      });
    } catch (e) {
      console.warn('[Electron setDisplayMediaHandler Warning]:', e);
    }
  }

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
