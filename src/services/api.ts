import { FileNode, SystemMetrics } from '../types/ide';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:'
  ? 'http://localhost:8000/api'
  : '/api';

export const fetchFileTree = async (path: string = '.'): Promise<{ root: string; tree: FileNode[] }> => {
  try {
    const res = await fetch(`${API_BASE}/fs/tree?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return { root: data.root, tree: data.tree };
  } catch (err) {
    console.warn('Backend not responding, using mock fallback tree', err);
    return {
      root: 'RENKAIRO-PLATFORM',
      tree: [
        {
          name: 'backend',
          path: 'backend',
          is_dir: true,
          children: [
            {
              name: 'api',
              path: 'backend/api',
              is_dir: true,
              children: [
                { name: 'fs.py', path: 'backend/api/fs.py', is_dir: false },
                { name: 'metrics.py', path: 'backend/api/metrics.py', is_dir: false },
                { name: 'terminal.py', path: 'backend/api/terminal.py', is_dir: false }
              ]
            },
            {
              name: 'core',
              path: 'backend/core',
              is_dir: true,
              children: [
                { name: 'config.py', path: 'backend/core/config.py', is_dir: false },
                { name: 'database.py', path: 'backend/core/database.py', is_dir: false }
              ]
            },
            {
              name: 'services',
              path: 'backend/services',
              is_dir: true,
              children: [
                { name: 'auth.py', path: 'backend/services/auth.py', is_dir: false },
                { name: 'projects.py', path: 'backend/services/projects.py', is_dir: false },
                { name: 'compute.py', path: 'backend/services/compute.py', is_dir: false },
                { name: 'utils.py', path: 'backend/services/utils.py', is_dir: false }
              ]
            },
            { name: '.env.example', path: 'backend/.env.example', is_dir: false },
            { name: 'Dockerfile', path: 'backend/Dockerfile', is_dir: false },
            { name: 'requirements.txt', path: 'backend/requirements.txt', is_dir: false, gitStatus: 'U' },
            { name: 'server.py', path: 'backend/server.py', is_dir: false }
          ]
        },
        {
          name: 'frontend',
          path: 'frontend',
          is_dir: true,
          children: [
            { name: 'public', path: 'frontend/public', is_dir: true },
            { name: 'src', path: 'frontend/src', is_dir: true },
            { name: 'tests', path: 'frontend/tests', is_dir: true },
            { name: '.env.example', path: 'frontend/.env.example', is_dir: false },
            { name: '.gitignore', path: 'frontend/.gitignore', is_dir: false },
            { name: 'package.json', path: 'frontend/package.json', is_dir: false },
            { name: 'README.md', path: 'frontend/README.md', is_dir: false, gitStatus: 'M' },
            { name: 'tsconfig.json', path: 'frontend/tsconfig.json', is_dir: false },
            { name: 'vite.config.ts', path: 'frontend/vite.config.ts', is_dir: false }
          ]
        },
        { name: 'docker', path: 'docker', is_dir: true },
        { name: 'docs', path: 'docs', is_dir: true },
        { name: 'scripts', path: 'scripts', is_dir: true },
        { name: '.gitignore', path: '.gitignore', is_dir: false },
        { name: 'LICENSE', path: 'LICENSE', is_dir: false },
        { name: 'README.md', path: 'README.md', is_dir: false, gitStatus: 'M' }
      ]
    };
  }
};

export const fetchFileContent = async (path: string): Promise<string> => {
  try {
    const res = await fetch(`${API_BASE}/fs/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.content;
  } catch (err) {
    if (path.endsWith('server.py')) {
      return `from fastapi import FastAPI, Depends, HTTPException
from core.config import settings
from core.database import get_db
from services.auth import auth_router
from services.projects import project_router
from services.compute import compute_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RenKairo Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(project_router, prefix="/projects", tags=["Projects"])
app.include_router(compute_router, prefix="/compute", tags=["Compute"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}`;
    }
    return `# RenKairo IDE File: ${path}\n# Opened in editor canvas`;
  }
};

export const saveFileContent = async (path: string, content: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/fs/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to save file content', err);
    return false;
  }
};

export const performNodeAction = async (
  action: 'create_file' | 'create_dir' | 'rename' | 'delete',
  path: string,
  targetPath?: string
): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/fs/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, path, target_path: targetPath })
    });
    return res.ok;
  } catch (err) {
    console.error('Node action failed', err);
    return false;
  }
};

export const openExternalTerminal = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/open-external-terminal`, { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.error('Failed to open external terminal', err);
    return false;
  }
};

export const fetchMetrics = async (): Promise<SystemMetrics> => {
  try {
    const res = await fetch(`${API_BASE}/system/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return await res.json();
  } catch (err) {
    const cpu = Math.round(20 + Math.random() * 10);
    const ram = Math.round(40 + Math.random() * 5);
    const gpu = Math.round(55 + Math.random() * 8);
    const vram = Number((32.1 + (Math.random() * 0.4 - 0.2)).toFixed(1));
    const network = Math.round(120 + Math.random() * 20);

    return {
      timestamp: Date.now(),
      cpu: { usage: cpu, cores: 16, model: 'AMD Ryzen 9' },
      ram: { usage: ram, used_gb: Number((32 * (ram / 100)).toFixed(1)), total_gb: 32.0 },
      gpu: {
        model: 'NVIDIA A100',
        usage: gpu,
        vram_used_gb: vram,
        vram_total_gb: 48.0,
        vram_percent: Number(((vram / 48.0) * 100).toFixed(1))
      },
      storage: { percent: 25, used_gb: 256.0, total_gb: 1000.0 },
      network: { mbps: network, percent: Math.round((network / 1000) * 100) }
    };
  }
};
