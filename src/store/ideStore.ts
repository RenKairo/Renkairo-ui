import { create } from 'zustand';
import { ActivityView, FileNode, ProblemItem, RightSidebarTab, SystemMetrics, TabItem, TerminalTab, WorkloadItem } from '../types/ide';
import { fetchFileContent, fetchFileTree, fetchMetrics, saveFileContent } from '../services/api';

interface IDEState {
  // Navigation & Layout State
  activeActivity: ActivityView;
  setActiveActivity: (view: ActivityView) => void;
  
  // File Explorer Tree State
  rootName: string;
  fileTree: FileNode[];
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  loadTree: () => Promise<void>;

  // Open Tabs & Editor State
  tabs: TabItem[];
  activeTabId: string | null;
  cursorPos: { line: number; col: number };
  setCursorPos: (line: number, col: number) => void;
  openFile: (path: string, name: string) => Promise<void>;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  saveCurrentFile: () => Promise<void>;
  
  // Customization & Aesthetics
  wallpaperOpacity: number;
  setWallpaperOpacity: (opacity: number) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Bottom Dock Terminal & Diagnostics State
  activeTerminalTab: TerminalTab;
  setActiveTerminalTab: (tab: TerminalTab) => void;
  problems: ProblemItem[];
  
  // Right Observability Sidebar State
  activeRightTab: RightSidebarTab;
  setActiveRightTab: (tab: RightSidebarTab) => void;
  metrics: SystemMetrics | null;
  metricsHistory: { cpu: number[]; ram: number[] };
  workloads: WorkloadItem[];
  loadMetrics: () => Promise<void>;
}

export const useIDEStore = create<IDEState>((set, get) => ({
  activeActivity: 'explorer',
  setActiveActivity: (view) => set({ activeActivity: view }),

  rootName: 'RENKAIRO-PLATFORM',
  fileTree: [],
  selectedPath: null,
  setSelectedPath: (path) => set({ selectedPath: path }),
  
  loadTree: async () => {
    const { root, tree } = await fetchFileTree('.');
    set({ rootName: root, fileTree: tree });
  },

  tabs: [
    {
      id: 'tab_server_py',
      title: 'server.py',
      path: 'backend/api/server.py',
      language: 'python',
      isDirty: false,
      content: `from fastapi import FastAPI, Depends, HTTPException
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
    return {"status": "ok", "version": settings.APP_VERSION}`
    },
    {
      id: 'tab_docker_compose',
      title: 'docker-compose.yml',
      path: 'docker-compose.yml',
      language: 'yaml',
      isDirty: false,
      content: `version: '3.8'\nservices:\n  backend:\n    build: ./backend\n    ports:\n      - "8000:8000"\n    environment:\n      - ENV=production`
    },
    {
      id: 'tab_routes_ts',
      title: 'routes.ts',
      path: 'frontend/src/routes.ts',
      language: 'typescript',
      isDirty: false,
      content: `export const ROUTES = {\n  HOME: '/',\n  EXPLORER: '/explorer',\n  SETTINGS: '/settings'\n};`
    }
  ],
  activeTabId: 'tab_server_py',
  cursorPos: { line: 22, col: 45 },
  setCursorPos: (line, col) => set({ cursorPos: { line, col } }),

  openFile: async (path, name) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    const content = await fetchFileContent(path);
    let language = 'plaintext';
    if (name.endsWith('.py')) language = 'python';
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) language = 'typescript';
    else if (name.endsWith('.js') || name.endsWith('.jsx')) language = 'javascript';
    else if (name.endsWith('.json')) language = 'json';
    else if (name.endsWith('.yml') || name.endsWith('.yaml')) language = 'yaml';
    else if (name.endsWith('.md')) language = 'markdown';
    else if (name.endsWith('.css')) language = 'css';
    else if (name.endsWith('.html')) language = 'html';

    const newTab: TabItem = {
      id: `tab_${Date.now()}`,
      title: name,
      path: path,
      content: content,
      isDirty: false,
      language
    };

    set({
      tabs: [...tabs, newTab],
      activeTabId: newTab.id
    });
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const remaining = tabs.filter((t) => t.id !== id);
    let nextActiveId = activeTabId;
    if (activeTabId === id) {
      nextActiveId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    }
    set({ tabs: remaining, activeTabId: nextActiveId });
  },

  setActiveTabId: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) => {
    const { tabs } = get();
    set({
      tabs: tabs.map((t) => (t.id === id ? { ...t, content, isDirty: true } : t))
    });
  },

  saveCurrentFile: async () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab || !activeTab.isDirty) return;

    const success = await saveFileContent(activeTab.path, activeTab.content);
    if (success) {
      set({
        tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t))
      });
    }
  },

  wallpaperOpacity: 18,
  setWallpaperOpacity: (opacity) => set({ wallpaperOpacity: opacity }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  activeTerminalTab: 'TERMINAL',
  setActiveTerminalTab: (tab) => set({ activeTerminalTab: tab }),

  problems: [
    {
      id: 'p1',
      severity: 'error',
      file: 'backend/server.py',
      line: 14,
      col: 1,
      message: 'Unused import statement "HTTPException"',
      code: 'PY-W0611'
    },
    {
      id: 'p2',
      severity: 'warning',
      file: 'backend/api/fs.py',
      line: 42,
      col: 12,
      message: 'Type hint for target_path should use Optional[str]',
      code: 'PY-T001'
    },
    {
      id: 'p3',
      severity: 'warning',
      file: 'frontend/src/App.tsx',
      line: 88,
      col: 5,
      message: 'Missing key prop in list element mapping',
      code: 'REACT-KEY'
    }
  ],

  activeRightTab: 'OVERVIEW',
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),

  metrics: {
    timestamp: Date.now(),
    cpu: { usage: 23, cores: 16, model: 'AMD Ryzen 9' },
    ram: { usage: 42, used_gb: 13.4, total_gb: 32.0 },
    gpu: {
      model: 'NVIDIA A100',
      usage: 58,
      vram_used_gb: 32.1,
      vram_total_gb: 48.0,
      vram_percent: 67
    },
    storage: { percent: 25, used_gb: 256.0, total_gb: 1000.0 },
    network: { mbps: 128, percent: 12 }
  },

  metricsHistory: {
    cpu: [15, 18, 22, 20, 25, 23, 28, 24, 21, 23],
    ram: [38, 40, 39, 41, 42, 40, 43, 42, 41, 42]
  },

  workloads: [
    {
      id: 'w1',
      name: 'Model Training',
      status: 'In Progress',
      framework: 'PyTorch',
      target: 'GPU 2',
      progress: 68
    },
    {
      id: 'w2',
      name: 'Data Processing',
      status: 'Queued',
      framework: 'Python',
      target: 'CPU',
      progress: 0
    }
  ],

  loadMetrics: async () => {
    const data = await fetchMetrics();
    const { metricsHistory } = get();
    const newCpuHist = [...metricsHistory.cpu.slice(1), data.cpu.usage];
    const newRamHist = [...metricsHistory.ram.slice(1), data.ram.usage];
    set({
      metrics: data,
      metricsHistory: { cpu: newCpuHist, ram: newRamHist }
    });
  }
}));
