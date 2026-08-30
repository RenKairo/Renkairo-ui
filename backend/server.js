import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import pty from 'node-pty';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default workspace root is the parent directory (RenKairo)
let currentWorkspace = path.resolve(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const IGNORED = new Set([
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

function normalizePath(p) {
  if (!p) return '';
  let resolved = p.replace(/^~(?=$|\/|\\)/, os.homedir());
  return path.normalize(resolved);
}

function resolveWorkspacePath(reqPath, baseDir = currentWorkspace) {
  if (!reqPath || reqPath === '.' || reqPath === '') return baseDir;
  const normalized = normalizePath(reqPath);
  if (path.isAbsolute(normalized)) return normalized;
  return path.resolve(baseDir, normalized);
}

function getSystemDrives() {
  if (process.platform === 'win32') {
    const drives = [];
    for (let i = 65; i <= 90; i++) {
      const driveLetter = String.fromCharCode(i);
      const drivePath = `${driveLetter}:\\`;
      try {
        if (fs.existsSync(drivePath)) {
          drives.push({ name: `${driveLetter}:`, path: drivePath });
        }
      } catch (e) {}
    }
    return drives.length > 0 ? drives : [{ name: 'C:', path: 'C:\\' }];
  } else {
    return [{ name: 'Root (/)', path: '/' }];
  }
}

function getQuickPlaces() {
  const home = os.homedir();
  const places = [
    { name: 'Home', path: home, icon: 'home' },
    { name: 'Documents', path: path.join(home, 'Documents'), icon: 'folder' },
    { name: 'Desktop', path: path.join(home, 'Desktop'), icon: 'monitor' },
    { name: 'Downloads', path: path.join(home, 'Downloads'), icon: 'download' },
  ];

  const projectsPath = path.join(home, 'Documents', 'Projects');
  if (fs.existsSync(projectsPath)) {
    places.push({ name: 'Projects', path: projectsPath, icon: 'folder-git' });
  }

  if (fs.existsSync(currentWorkspace)) {
    places.push({ name: 'Current Workspace', path: currentWorkspace, icon: 'code' });
  }

  return places.filter((p) => {
    try {
      return fs.existsSync(p.path);
    } catch (e) {
      return false;
    }
  });
}

function buildTree(currentPath, basePath, maxDepth = 6, currentDepth = 0) {
  const tree = [];
  if (currentDepth > maxDepth) return tree;

  try {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    // Sort: directories first (alphabetically), then files (alphabetically)
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    for (const entry of entries) {
      if (IGNORED.has(entry.name) || entry.name.startsWith('$')) continue;

      const full = path.join(currentPath, entry.name);
      const rel = path.relative(basePath, full).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        tree.push({
          name: entry.name,
          path: rel,
          is_dir: true,
          children: buildTree(full, basePath, maxDepth, currentDepth + 1)
        });
      } else {
        tree.push({
          name: entry.name,
          path: rel,
          is_dir: false,
          children: null
        });
      }
    }
  } catch (err) {}
  return tree;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', workspace: currentWorkspace });
});

// Workspace APIs
app.get('/api/fs/workspace', (req, res) => {
  const rootName = path.basename(currentWorkspace) || currentWorkspace;
  res.json({
    path: currentWorkspace,
    root: rootName,
    exists: fs.existsSync(currentWorkspace)
  });
});

app.post('/api/fs/workspace', (req, res) => {
  const { path: reqPath } = req.body;
  if (!reqPath) {
    return res.status(400).json({ error: 'path parameter required' });
  }

  const target = resolveWorkspacePath(reqPath);
  try {
    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: `Directory "${target}" does not exist` });
    }
    const stat = fs.statSync(target);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: `Path "${target}" is a file, not a directory` });
    }

    currentWorkspace = target;
    startWorkspaceWatcher(currentWorkspace);
    const rootName = path.basename(currentWorkspace) || currentWorkspace;

    res.json({
      status: 'ok',
      path: currentWorkspace,
      root: rootName,
      tree: buildTree(currentWorkspace, currentWorkspace)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File System APIs - Real OS File System Reading & Writing
app.get('/api/fs/tree', (req, res) => {
  const rootParam = req.query.root;
  const basePath = rootParam ? resolveWorkspacePath(rootParam) : currentWorkspace;
  const reqPath = req.query.path || '.';
  const target = resolveWorkspacePath(reqPath, basePath);

  const rootName = path.basename(basePath) || basePath || 'renkairo-platform';

  res.json({
    root: rootName,
    path: basePath,
    tree: buildTree(target, basePath)
  });
});

app.get('/api/fs/file', (req, res) => {
  const reqPath = req.query.path;
  const rootParam = req.query.root;
  if (!reqPath) return res.status(400).json({ error: 'path parameter required' });

  const basePath = rootParam ? resolveWorkspacePath(rootParam) : currentWorkspace;
  const target = resolveWorkspacePath(reqPath, basePath);

  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const content = fs.readFileSync(target, 'utf-8');
    const rel = path.relative(basePath, target).replace(/\\/g, '/');
    res.json({ path: rel, fullPath: target, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fs/file', (req, res) => {
  const { path: reqPath, content, root: rootParam } = req.body;
  if (!reqPath) return res.status(400).json({ error: 'path parameter required' });

  const basePath = rootParam ? resolveWorkspacePath(rootParam) : currentWorkspace;
  const target = resolveWorkspacePath(reqPath, basePath);

  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content ?? '', 'utf-8');
    const rel = path.relative(basePath, target).replace(/\\/g, '/');
    res.json({ status: 'ok', path: rel, fullPath: target });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fs/nodes', (req, res) => {
  const { action, path: reqPath, target_path: destPath, root: rootParam, content } = req.body;
  const basePath = rootParam ? resolveWorkspacePath(rootParam) : currentWorkspace;
  const target = resolveWorkspacePath(reqPath, basePath);

  try {
    if (action === 'create_file') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (!fs.existsSync(target)) {
        fs.writeFileSync(target, content ?? '', 'utf-8');
      }
    } else if (action === 'create_dir') {
      fs.mkdirSync(target, { recursive: true });
    } else if (action === 'delete') {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    } else if (action === 'rename' && destPath) {
      const dest = resolveWorkspacePath(destPath, basePath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(target, dest);
    } else if (action === 'duplicate') {
      let dest;
      if (destPath) {
        dest = resolveWorkspacePath(destPath, basePath);
      } else {
        const ext = path.extname(target);
        const dir = path.dirname(target);
        const base = path.basename(target, ext);
        let candidate = path.join(dir, `${base} (copy)${ext}`);
        let counter = 2;
        while (fs.existsSync(candidate)) {
          candidate = path.join(dir, `${base} (copy ${counter})${ext}`);
          counter++;
        }
        dest = candidate;
      }
      fs.cpSync(target, dest, { recursive: true });
    }
    res.json({ status: 'ok', action });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System Folder Browser API (for In-App Folder Picker Modal)
app.get('/api/fs/browse-folders', (req, res) => {
  const queryPath = req.query.path;
  const target = queryPath ? resolveWorkspacePath(queryPath) : currentWorkspace;

  try {
    const validTarget = fs.existsSync(target) ? target : os.homedir();
    const isDir = fs.statSync(validTarget).isDirectory();
    const dirPath = isDir ? validTarget : path.dirname(validTarget);

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const folders = [];

    for (const entry of entries) {
      if (entry.name.startsWith('$') || IGNORED.has(entry.name)) continue;
      if (entry.isDirectory()) {
        folders.push({
          name: entry.name,
          path: path.join(dirPath, entry.name),
          is_dir: true
        });
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const parsed = path.parse(dirPath);
    const isRoot = dirPath === parsed.root;
    const parentPath = isRoot ? null : path.dirname(dirPath);

    res.json({
      currentPath: dirPath,
      parentPath: parentPath,
      folders,
      drives: getSystemDrives(),
      quickPlaces: getQuickPlaces()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reveal in System Explorer (Windows Explorer / macOS Finder)
app.post('/api/fs/reveal', (req, res) => {
  const { path: reqPath } = req.body;
  const target = resolveWorkspacePath(reqPath || '.');

  try {
    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    if (process.platform === 'win32') {
      const isDir = fs.statSync(target).isDirectory();
      if (isDir) {
        spawn('explorer.exe', [target], { detached: true });
      } else {
        spawn('explorer.exe', [`/select,${target}`], { detached: true });
      }
    } else if (process.platform === 'darwin') {
      spawn('open', ['-R', target], { detached: true });
    } else {
      const isDir = fs.statSync(target).isDirectory();
      spawn('xdg-open', [isDir ? target : path.dirname(target)], { detached: true });
    }

    res.json({ status: 'ok', path: target });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System Metrics API
app.get('/api/system/metrics', (req, res) => {
  const cpu = Math.round(20 + Math.random() * 15);
  const ram = Math.round(40 + Math.random() * 8);
  const gpu = Math.round(55 + Math.random() * 12);
  const vram = Number((32.1 + (Math.random() * 2 - 1)).toFixed(1));
  const network = Math.round(115 + Math.random() * 25);

  res.json({
    timestamp: Date.now(),
    cpu: { usage: cpu, cores: 16, model: 'AMD Ryzen 9 / Apple M-Series' },
    ram: { usage: ram, used_gb: Number((32 * (ram / 100)).toFixed(1)), total_gb: 32.0 },
    gpu: {
      model: 'NVIDIA A100 SXM4',
      usage: gpu,
      vram_used_gb: vram,
      vram_total_gb: 48.0,
      vram_percent: Number(((vram / 48.0) * 100).toFixed(1))
    },
    storage: { percent: 25, used_gb: 256.0, total_gb: 1000.0 },
    network: { mbps: network, percent: Math.round((network / 1000) * 100) }
  });
});

// Endpoint to launch native Windows Terminal (wt.exe or cmd.exe) on Desktop
app.post('/api/open-external-terminal', (req, res) => {
  try {
    if (process.platform === 'win32') {
      // Try launching Windows Terminal (wt.exe) or fallback to cmd.exe
      const proc = spawn('cmd.exe', ['/c', 'start', 'wt.exe', '-d', currentWorkspace], { detached: true, stdio: 'ignore' });
      proc.on('error', () => {
        spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${currentWorkspace}"`], { detached: true, stdio: 'ignore' });
      });
    } else if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Terminal', currentWorkspace], { detached: true });
    } else {
      spawn('x-terminal-emulator', ['--working-directory', currentWorkspace], { detached: true });
    }
    res.json({ status: 'ok', message: 'External terminal launched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSockets (Terminal & Real-Time File System Watcher)
const server = http.createServer(app);
const wssTerminal = new WebSocketServer({ noServer: true });
const wssFs = new WebSocketServer({ noServer: true });

// Live File Watcher (VS Code style debounced notification)
let fsWatcher = null;
const pendingFsChanges = new Set();
let fsDebounceTimer = null;

function broadcastFsChanges() {
  if (pendingFsChanges.size === 0) return;
  const changes = Array.from(pendingFsChanges);
  pendingFsChanges.clear();

  const payload = JSON.stringify({ type: 'fs_change', paths: changes });
  wssFs.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  });
}

function startWorkspaceWatcher(workspaceDir) {
  if (fsWatcher) {
    try { fsWatcher.close(); } catch (e) {}
    fsWatcher = null;
  }

  if (!fs.existsSync(workspaceDir)) return;

  try {
    fsWatcher = fs.watch(workspaceDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const normalized = filename.replace(/\\/g, '/');
      const parts = normalized.split('/');
      if (parts.some((p) => IGNORED.has(p) || p.startsWith('.'))) return;

      pendingFsChanges.add(normalized);
      clearTimeout(fsDebounceTimer);
      fsDebounceTimer = setTimeout(broadcastFsChanges, 75);
    });
    console.log(`[Watcher] Started recursive OS file watcher on: ${workspaceDir}`);
  } catch (err) {
    console.warn('[Watcher] Native recursive watch not available:', err.message);
  }
}

// Start initial watcher
startWorkspaceWatcher(currentWorkspace);

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/api/ws/terminal') {
    wssTerminal.handleUpgrade(request, socket, head, (ws) => {
      wssTerminal.emit('connection', ws, request);
    });
  } else if (pathname === '/api/ws/fs') {
    wssFs.handleUpgrade(request, socket, head, (ws) => {
      wssFs.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wssFs.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', workspace: currentWorkspace }));
});

// REAL Interactive Shell Terminal Process per WebSocket Session (using node-pty)
wssTerminal.on('connection', (ws, req) => {
  const isWin = process.platform === 'win32';
  const urlParams = new URLSearchParams((req.url || '').split('?')[1] || '');
  const shellType = urlParams.get('shell') || 'powershell';
  const reqCwd = urlParams.get('cwd');

  let shell = isWin ? 'powershell.exe' : (process.env.SHELL || 'bash');
  let args = isWin ? ['-NoExit', '-NoLogo', '-ExecutionPolicy', 'Bypass', '-Command', 'Remove-Item alias:where -Force -ErrorAction SilentlyContinue'] : ['-i'];

  if (isWin) {
    if (shellType === 'cmd') {
      shell = 'cmd.exe';
      args = ['/k'];
    } else if (shellType === 'python') {
      shell = 'python.exe';
      args = ['-i'];
    } else if (shellType === 'node') {
      shell = 'node.exe';
      args = [];
    } else if (shellType === 'bash') {
      shell = 'bash.exe';
      args = ['-i'];
    } else if (shellType === 'powershell') {
      shell = 'powershell.exe';
      args = ['-NoExit', '-NoLogo', '-ExecutionPolicy', 'Bypass', '-Command', 'Remove-Item alias:where -Force -ErrorAction SilentlyContinue'];
    }
  }

  let targetCwd = currentWorkspace;
  if (reqCwd) {
    try {
      const resolved = resolveWorkspacePath(reqCwd);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        targetCwd = resolved;
      }
    } catch (e) {}
  }

  let ptyProcess = null;
  try {
    ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: targetCwd,
      env: { ...process.env, TERM: 'xterm-256color' }
    });
  } catch (err) {
    console.error('[Terminal PTY Spawn Error]:', err);
  }

  if (ptyProcess) {
    ptyProcess.onData((data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    ws.on('message', (message) => {
      try {
        const data = message.toString();
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.type === 'resize') {
            const cols = parseInt(parsed.cols) || 80;
            const rows = parseInt(parsed.rows) || 24;
            ptyProcess.resize(cols, rows);
            return;
          }
        } catch (e) {}

        ptyProcess.write(data);
      } catch (err) {
        console.error('[Terminal Write Error]:', err);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(`\r\n\x1b[31mShell session closed (exit code ${exitCode}).\x1b[0m\r\n`);
      }
    });

    ws.on('close', () => {
      try {
        ptyProcess.kill();
      } catch (e) {}
    });
  } else {
    // Subprocess Fallback
    const proc = spawn(shell, args, { cwd: currentWorkspace });
    proc.stdout?.on('data', (d) => ws.readyState === ws.OPEN && ws.send(d.toString()));
    proc.stderr?.on('data', (d) => ws.readyState === ws.OPEN && ws.send(d.toString()));
    ws.on('message', (msg) => proc.stdin && proc.stdin.write(msg.toString()));
    ws.on('close', () => {
      try { proc.kill(); } catch (e) {}
    });
  }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`[RenKairo Backend] Real Shell Server running on http://localhost:${PORT}`);
});
