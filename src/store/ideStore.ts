import { create } from 'zustand';
import { ActivityView, FileNode, ProblemItem, RightSidebarTab, SystemMetrics, TabItem, TerminalTab, ThemeMode, WorkloadItem } from '../types/ide';
import { 
  createFile, 
  createFolder, 
  deleteItem, 
  fetchDirectoryChildren,
  moveItem, 
  openLocalFolderPicker, 
  readFile, 
  readFileDetails,
  refreshDirectoryTree, 
  renameItem, 
  writeFile 
} from '../services/fileSystem';
import { fetchMetrics } from '../services/api';

const applyThemeClass = (theme: ThemeMode) => {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  } catch (e) {}
};

const getInitialTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem('renkairo_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {}
  return 'dark';
};

const initialTheme = getInitialTheme();
applyThemeClass(initialTheme);

const triggerGitRefresh = () => {
  try {
    import('./gitStore').then((m) => m.useGitStore.getState().refreshGitStatus()).catch(() => {});
  } catch (e) {}
};

interface IDEState {
  // Navigation & Layout State
  activeActivity: ActivityView | null;
  setActiveActivity: (view: ActivityView | null) => void;
  leftSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;
  rightSidebarWidth: number;
  setRightSidebarWidth: (width: number) => void;

  // Real Workspace & Local Folder State (Starts with NO folder)
  workspacePath: string | null;
  rootName: string;
  fileTree: FileNode[];
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;

  // Folder Opening & Loading Animation State
  isFolderOpening: boolean;
  fileLoadingProgress: { path: string; percent: number; bytesLoaded: number; totalBytes: number } | null;

  // Folder Opening & Scope Switching
  openFolder: () => Promise<void>;
  changeScopeFolder: () => Promise<void>;
  refreshTree: () => Promise<void>;
  expandFolder: (dirRelPath: string) => Promise<void>;

  // Direct File & Folder Modification
  createNewFile: (parentRelPath: string, fileName: string) => Promise<void>;
  createNewFolder: (parentRelPath: string, folderName: string) => Promise<void>;
  renameNode: (oldRelPath: string, newName: string, isDir: boolean) => Promise<void>;
  deleteNode: (relPath: string) => Promise<void>;
  moveNode: (srcRelPath: string, targetDirRelPath: string, isDir: boolean) => Promise<void>;

  // Open Tabs & Editor State
  tabs: TabItem[];
  activeTabId: string | null;
  targetLine: { tabId: string; line: number; timestamp: number } | null;
  cursorPos: { line: number; col: number };
  setCursorPos: (line: number, col: number) => void;
  openFile: (path: string, name: string, line?: number) => Promise<void>;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  setActiveTabId: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabContentSilently: (id: string, content: string) => void;
  saveCurrentFile: () => Promise<void>;

  // Customization & Aesthetics
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  wallpaperOpacity: number;
  setWallpaperOpacity: (opacity: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  tabSize: number;
  setTabSize: (size: number) => void;
  minimapEnabled: boolean;
  setMinimapEnabled: (enabled: boolean) => void;
  formatOnSave: boolean;
  setFormatOnSave: (format: boolean) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Terminal Customization & Diagnostics State
  terminalHeight: number;
  setTerminalHeight: (height: number) => void;
  terminalCopyOnSelect: boolean;
  setTerminalCopyOnSelect: (enabled: boolean) => void;
  terminalCompactPath: boolean;
  setTerminalCompactPath: (enabled: boolean) => void;
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
  leftSidebarWidth: (() => {
    const saved = localStorage.getItem('renkairo_left_sidebar_width');
    return saved ? Math.max(160, Math.min(Number(saved), 700)) : 260;
  })(),
  setLeftSidebarWidth: (width) => {
    try {
      localStorage.setItem('renkairo_left_sidebar_width', String(width));
    } catch (e) {}
    set({ leftSidebarWidth: width });
  },
  rightSidebarWidth: (() => {
    const saved = localStorage.getItem('renkairo_right_sidebar_width');
    return saved ? Math.max(180, Math.min(Number(saved), 750)) : 300;
  })(),
  setRightSidebarWidth: (width) => {
    try {
      localStorage.setItem('renkairo_right_sidebar_width', String(width));
    } catch (e) {}
    set({ rightSidebarWidth: width });
  },

  // App starts with NO folder open
  workspacePath: null,
  rootName: '',
  fileTree: [],
  selectedPath: null,
  setSelectedPath: (path) => set({ selectedPath: path }),

  isFolderOpening: false,
  fileLoadingProgress: null,

  openFolder: async () => {
    set({ isFolderOpening: true });
    try {
      const result = await openLocalFolderPicker();
      if (result) {
        set({
          workspacePath: result.path,
          rootName: result.name,
          fileTree: result.tree,
          selectedPath: null,
          tabs: [],
          activeTabId: null
        });
        triggerGitRefresh();
      }
    } finally {
      set({ isFolderOpening: false });
    }
  },

  changeScopeFolder: async () => {
    set({ isFolderOpening: true });
    try {
      const result = await openLocalFolderPicker();
      if (result) {
        set({
          workspacePath: result.path,
          rootName: result.name,
          fileTree: result.tree,
          selectedPath: null,
          tabs: [],
          activeTabId: null
        });
        triggerGitRefresh();
      }
    } finally {
      set({ isFolderOpening: false });
    }
  },

  refreshTree: async () => {
    const tree = await refreshDirectoryTree();
    const { tabs } = get();

    // Freshly reload all open tabs from disk with streaming
    const updatedTabs = await Promise.all(
      tabs.map(async (tab) => {
        try {
          const freshDetails = await readFileDetails(tab.path, true);
          return {
            ...tab,
            content: freshDetails.content,
            size: freshDetails.size,
            isBinary: freshDetails.isBinary,
            tier: freshDetails.tier,
            truncated: freshDetails.truncated,
            totalSize: freshDetails.totalSize,
            mimeType: freshDetails.mimeType,
            isDirty: false
          };
        } catch (e) {
          return tab;
        }
      })
    );

    set({ fileTree: tree, tabs: updatedTabs });
    triggerGitRefresh();
  },

  expandFolder: async (dirRelPath: string) => {
    const children = await fetchDirectoryChildren(dirRelPath);
    const { fileTree } = get();

    function updateChildrenRecursive(nodes: FileNode[]): boolean {
      for (const node of nodes) {
        if (node.path === dirRelPath && node.is_dir) {
          node.children = children;
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateChildrenRecursive(node.children)) return true;
        }
      }
      return false;
    }

    const nextTree = [...fileTree];
    updateChildrenRecursive(nextTree);
    set({ fileTree: nextTree });
  },

  createNewFile: async (parentRelPath: string, fileName: string) => {
    const success = await createFile(parentRelPath, fileName);
    if (success) {
      await get().refreshTree();
      const targetPath = parentRelPath ? `${parentRelPath}/${fileName}` : fileName;
      get().openFile(targetPath, fileName);
    }
  },

  createNewFolder: async (parentRelPath: string, folderName: string) => {
    const success = await createFolder(parentRelPath, folderName);
    if (success) {
      await get().refreshTree();
    }
  },

  renameNode: async (oldRelPath: string, newName: string, isDir: boolean) => {
    const success = await renameItem(oldRelPath, newName, isDir);
    if (success) {
      const { tabs } = get();
      const parent = oldRelPath.includes('/') ? oldRelPath.substring(0, oldRelPath.lastIndexOf('/')) : '';
      const newRelPath = parent ? `${parent}/${newName}` : newName;

      // Update open tabs if renamed file is open
      set({
        tabs: tabs.map((t) =>
          t.path === oldRelPath
            ? { ...t, path: newRelPath, title: newName }
            : t.path.startsWith(oldRelPath + '/')
            ? { ...t, path: t.path.replace(oldRelPath, newRelPath) }
            : t
        )
      });
      await get().refreshTree();
    }
  },

  deleteNode: async (relPath: string) => {
    const success = await deleteItem(relPath);
    if (success) {
      const { tabs, selectedPath } = get();
      // Close tabs for deleted files
      const remainingTabs = tabs.filter((t) => t.path !== relPath && !t.path.startsWith(relPath + '/'));
      set({
        tabs: remainingTabs,
        activeTabId: remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null,
        selectedPath: selectedPath === relPath ? null : selectedPath
      });
      await get().refreshTree();
    }
  },

  moveNode: async (srcRelPath: string, targetDirRelPath: string, isDir: boolean) => {
    const success = await moveItem(srcRelPath, targetDirRelPath, isDir);
    if (success) {
      const itemName = srcRelPath.split(/[/\\]/).pop()!;
      const newPath = targetDirRelPath ? `${targetDirRelPath}/${itemName}` : itemName;
      const { tabs } = get();
      set({
        tabs: tabs.map((t) =>
          t.path === srcRelPath
            ? { ...t, path: newPath }
            : t.path.startsWith(srcRelPath + '/')
            ? { ...t, path: t.path.replace(srcRelPath, newPath) }
            : t
        )
      });
      await get().refreshTree();
    }
  },

  // Editor Tabs
  tabs: [],
  activeTabId: null,
  targetLine: null,
  cursorPos: { line: 1, col: 1 },
  setCursorPos: (line, col) => set({ cursorPos: { line, col } }),

  openFile: async (path: string, name: string, line?: number) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.path === path);
    let targetTabId = existing?.id;

    if (existing) {
      set({ activeTabId: existing.id });
    } else {
      set({ fileLoadingProgress: { path, percent: 0, bytesLoaded: 0, totalBytes: 0 } });

      let details;
      try {
        details = await readFileDetails(path, false, (progress) => {
          set({ fileLoadingProgress: { path, ...progress } });
        });
      } finally {
        set({ fileLoadingProgress: null });
      }

      let language = 'plaintext';
      // For small and medium files, enable full language tokenization
      if (details.tier === 'small' || details.tier === 'medium') {
        const lower = name.toLowerCase();
        if (lower.endsWith('.py')) language = 'python';
        else if (lower.endsWith('.ts') || lower.endsWith('.tsx')) language = 'typescript';
        else if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.cjs') || lower.endsWith('.mjs')) language = 'javascript';
        else if (lower.endsWith('.json')) language = 'json';
        else if (lower.endsWith('.yml') || lower.endsWith('.yaml')) language = 'yaml';
        else if (lower.endsWith('.md')) language = 'markdown';
        else if (lower.endsWith('.css') || lower.endsWith('.scss')) language = 'css';
        else if (lower.endsWith('.html')) language = 'html';
        else if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.ps1')) language = 'shell';
        else if (lower.endsWith('.sql')) language = 'sql';
        else if (lower.endsWith('.rs')) language = 'rust';
        else if (lower.endsWith('.go')) language = 'go';
        else if (lower.endsWith('.java')) language = 'java';
        else if (lower.endsWith('.c') || lower.endsWith('.cpp') || lower.endsWith('.h')) language = 'cpp';
      }

      const newTab: TabItem = {
        id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: name,
        path: path,
        content: details.content,
        isDirty: false,
        language,
        size: details.size,
        isBinary: details.isBinary,
        tier: details.tier,
        truncated: details.truncated,
        totalSize: details.totalSize,
        mimeType: details.mimeType
      };

      targetTabId = newTab.id;
      set({
        tabs: [...tabs, newTab],
        activeTabId: newTab.id
      });
    }

    if (line && targetTabId) {
      set({ targetLine: { tabId: targetTabId, line, timestamp: Date.now() } });
    }
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

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null });
  },

  setActiveTabId: (id) => {
    set({ activeTabId: id });
  },

  updateTabContent: (id, content) => {
    const { tabs } = get();
    set({
      tabs: tabs.map((t) => (t.id === id ? { ...t, content, isDirty: true } : t))
    });
  },

  updateTabContentSilently: (id, content) => {
    const { tabs } = get();
    set({
      tabs: tabs.map((t) => (t.id === id ? { ...t, content, isDirty: false } : t))
    });
  },

  saveCurrentFile: async () => {
    const { tabs, activeTabId } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const success = await writeFile(activeTab.path, activeTab.content);
    if (success) {
      set({
        tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t))
      });
      triggerGitRefresh();
    }
  },

  theme: initialTheme,
  setTheme: (theme) => {
    try {
      localStorage.setItem('renkairo_theme', theme);
    } catch (e) {}
    applyThemeClass(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('renkairo_theme', nextTheme);
    } catch (e) {}
    applyThemeClass(nextTheme);
    set({ theme: nextTheme });
  },

  wallpaperOpacity: 50,
  setWallpaperOpacity: (opacity) => set({ wallpaperOpacity: opacity }),

  fontSize: 13,
  setFontSize: (size) => set({ fontSize: size }),
  tabSize: 4,
  setTabSize: (size) => set({ tabSize: size }),
  minimapEnabled: true,
  setMinimapEnabled: (enabled) => set({ minimapEnabled: enabled }),
  formatOnSave: true,
  setFormatOnSave: (format) => set({ formatOnSave: format }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  terminalHeight: (() => {
    const saved = localStorage.getItem('renkairo_term_height');
    return saved ? Math.max(36, Math.min(Number(saved), 800)) : 220;
  })(),
  setTerminalHeight: (height) => {
    try {
      localStorage.setItem('renkairo_term_height', String(height));
    } catch (e) {}
    set({ terminalHeight: height });
  },

  terminalCopyOnSelect: localStorage.getItem('renkairo_term_copy_on_select') !== 'false',
  setTerminalCopyOnSelect: (enabled) => {
    try {
      localStorage.setItem('renkairo_term_copy_on_select', String(enabled));
    } catch (e) {}
    set({ terminalCopyOnSelect: enabled });
  },

  terminalCompactPath: localStorage.getItem('renkairo_term_compact_path') === 'true',
  setTerminalCompactPath: (enabled) => {
    try {
      localStorage.setItem('renkairo_term_compact_path', String(enabled));
    } catch (e) {}
    set({ terminalCompactPath: enabled });
  },

  activeTerminalTab: 'TERMINAL',
  setActiveTerminalTab: (tab) => set({ activeTerminalTab: tab }),

  problems: [],

  activeRightTab: 'OVERVIEW',
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),

  metrics: {
    timestamp: Date.now(),
    cpu: { usage: 18, cores: 16, model: 'Local Machine' },
    ram: { usage: 36, used_gb: 11.5, total_gb: 32.0 },
    gpu: {
      model: 'GPU Device',
      usage: 42,
      vram_used_gb: 16.0,
      vram_total_gb: 24.0,
      vram_percent: 66
    },
    storage: { percent: 28, used_gb: 280.0, total_gb: 1000.0 },
    network: { mbps: 95, percent: 10 }
  },

  metricsHistory: {
    cpu: [12, 14, 18, 16, 20, 18, 22, 19, 17, 18],
    ram: [34, 35, 35, 36, 36, 35, 37, 36, 36, 36]
  },

  workloads: [],

  loadMetrics: async () => {
    const data = await fetchMetrics();
    const { metricsHistory } = get();
    const newCpuHist = [...metricsHistory.cpu.slice(1), data.cpu ? data.cpu.usage : 15];
    const newRamHist = [...metricsHistory.ram.slice(1), data.ram ? data.ram.usage : 35];
    
    // Also fetch workloads from backend if available
    let workloads = get().workloads;
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';
      const res = await fetch(`${API_BASE}/system/workloads`);
      if (res.ok) {
        const wData = await res.json();
        if (wData.workloads) workloads = wData.workloads;
      }
    } catch (e) {}

    set({
      metrics: data,
      metricsHistory: { cpu: newCpuHist, ram: newRamHist },
      workloads: workloads.length > 0 ? workloads : [
        { id: 'wl_backend', name: 'RenKairo Node Backend Engine', status: 'In Progress', framework: 'Node.js Express', target: 'localhost:8000', progress: 100 },
        { id: 'wl_vite', name: 'React Frontend HMR Bundler', status: 'In Progress', framework: 'Vite 6', target: 'localhost:5173', progress: 100 },
        { id: 'wl_watcher', name: 'Native Workspace File Watcher', status: 'In Progress', framework: 'OS fs.watch', target: 'Current Workspace', progress: 100 }
      ]
    });
  }
}));
