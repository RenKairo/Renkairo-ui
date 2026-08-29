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
        tree.append ? null : null;
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

// File System APIs
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

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws/terminal' });

wss.on('connection', (ws) => {
  ws.send('\r\n\x1b[1;36mRenKairo Cloud Shell v1.0.0\x1b[0m [\x1b[32mActive Session\x1b[0m]\r\n');
  ws.send('Type commands below. Connected to backend server.\r\n\r\n');
  const prompt = '\r\n\x1b[1;31m(renkairo)\x1b[0m \x1b[1;34mdeveloper@Renkairo\x1b[0m \x1b[33mplatform %\x1b[0m ';
  ws.send(prompt);

  let inputBuffer = '';

  ws.on('message', (message) => {
    const data = message.toString();
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'resize') return;
    } catch (e) {}

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      if (char === '\r' || char === '\n') {
        ws.send('\r\n');
        const cmd = inputBuffer.trim();
        inputBuffer = '';
        if (cmd) {
          if (cmd === 'clear' || cmd === 'cls') {
            ws.send('\x1b[2J\x1b[3J\x1b[H');
          } else if (cmd === 'help') {
            ws.send('RenKairo Shell Commands:\r\n  python -m uvicorn server:app --reload\r\n  npm run dev\r\n  ls -la\r\n  git status\r\n  clear\r\n');
          } else {
            const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
            const proc = spawn(shell, [process.platform === 'win32' ? '-Command' : '-c', cmd], { cwd: ROOT_DIR });

            proc.stdout.on('data', (d) => {
              ws.send(d.toString().replace(/\n/g, '\r\n'));
            });
            proc.stderr.on('data', (d) => {
              ws.send(`\x1b[31m${d.toString().replace(/\n/g, '\r\n')}\x1b[0m`);
            });
            proc.on('close', () => {
              ws.send(prompt);
            });
            return;
          }
        }
        ws.send(prompt);
      } else if (char === '\x7f' || char === '\x08') {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          ws.send('\b \b');
        }
      } else {
        inputBuffer += char;
        ws.send(char);
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`[RenKairo Backend] Server running on http://localhost:${PORT}`);
});
