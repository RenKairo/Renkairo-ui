import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json());

const IGNORED = new Set(['node_modules', '.git', '__pycache__', '.venv', 'dist', '.vite']);

function buildTree(currentPath, basePath) {
  const tree = [];
  try {
    const entries = fs.readdirSync(currentPath).sort();
    for (const entry of entries) {
      if (IGNORED.has(entry)) continue;
      const full = path.join(currentPath, entry);
      const rel = path.relative(basePath, full).replace(/\\/g, '/');
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        tree.push({
          name: entry,
          path: rel,
          is_dir: true,
          children: buildTree(full, basePath)
        });
      } else {
        tree.push({
          name: entry,
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
  res.json({ status: 'ok', version: '1.0.0' });
});

// File System APIs - Real OS File System Reading & Writing
app.get('/api/fs/tree', (req, res) => {
  const reqPath = req.query.path || '.';
  const target = path.resolve(ROOT_DIR, reqPath);
  res.json({
    root: path.basename(target) || 'renkairo-platform',
    path: '.',
    tree: buildTree(target, target)
  });
});

app.get('/api/fs/file', (req, res) => {
  const reqPath = req.query.path;
  if (!reqPath) return res.status(400).json({ error: 'path parameter required' });
  const target = path.resolve(ROOT_DIR, reqPath);
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const content = fs.readFileSync(target, 'utf-8');
    res.json({ path: reqPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fs/file', (req, res) => {
  const { path: reqPath, content } = req.body;
  if (!reqPath) return res.status(400).json({ error: 'path parameter required' });
  const target = path.resolve(ROOT_DIR, reqPath);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content || '', 'utf-8');
    res.json({ status: 'ok', path: reqPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fs/nodes', (req, res) => {
  const { action, path: reqPath, target_path } = req.body;
  const target = path.resolve(ROOT_DIR, reqPath);
  try {
    if (action === 'create_file') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, '', 'utf-8');
    } else if (action === 'create_dir') {
      fs.mkdirSync(target, { recursive: true });
    } else if (action === 'delete') {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    } else if (action === 'rename' && target_path) {
      const dest = path.resolve(ROOT_DIR, target_path);
      fs.renameSync(target, dest);
    }
    res.json({ status: 'ok', action });
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
      const proc = spawn('cmd.exe', ['/c', 'start', 'wt.exe', '-d', ROOT_DIR], { detached: true, stdio: 'ignore' });
      proc.on('error', () => {
        spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${ROOT_DIR}"`], { detached: true, stdio: 'ignore' });
      });
    } else if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Terminal', ROOT_DIR], { detached: true });
    } else {
      spawn('x-terminal-emulator', ['--working-directory', ROOT_DIR], { detached: true });
    }
    res.json({ status: 'ok', message: 'External terminal launched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws/terminal' });

// REAL Interactive Shell Terminal Process per WebSocket Session
wss.on('connection', (ws, req) => {
  const isWin = process.platform === 'win32';
  const urlParams = new URLSearchParams((req.url || '').split('?')[1] || '');
  const shellType = urlParams.get('shell') || 'powershell';

  let shell = isWin ? 'powershell.exe' : (process.env.SHELL || 'bash');
  let args = isWin ? ['-NoExit', '-NoLogo', '-ExecutionPolicy', 'Bypass'] : ['-i'];

  if (isWin) {
    if (shellType === 'cmd') {
      shell = 'cmd.exe';
      args = ['/k'];
    } else if (shellType === 'python') {
      shell = 'python';
      args = ['-i'];
    } else if (shellType === 'node') {
      shell = 'node';
      args = [];
    } else if (shellType === 'bash') {
      shell = 'bash.exe';
      args = ['-i'];
    }
  }

  const shellProc = spawn(shell, args, {
    cwd: ROOT_DIR,
    env: { ...process.env, TERM: 'xterm-256color' },
    shell: true
  });

  // Direct Stream Output from real Shell Process to Xterm UI
  shellProc.stdout?.on('data', (chunk) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(chunk.toString());
    }
  });

  shellProc.stderr?.on('data', (chunk) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(chunk.toString());
    }
  });

  // Pass raw keystrokes and commands directly to real Shell stdin
  ws.on('message', (message) => {
    try {
      const data = message.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'resize') return;
      } catch (e) {}

      if (shellProc.stdin && !shellProc.stdin.destroyed) {
        shellProc.stdin.write(data);
      }
    } catch (err) {}
  });

  shellProc.on('exit', () => {
    if (ws.readyState === ws.OPEN) {
      ws.send('\r\n\x1b[31mShell session closed.\x1b[0m\r\n');
    }
  });

  ws.on('close', () => {
    try {
      shellProc.kill();
    } catch (e) {}
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`[RenKairo Backend] Real Shell Server running on http://localhost:${PORT}`);
});
