import { FileNode, FolderBrowseResult, SystemMetrics } from '../types/ide';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:'
  ? 'http://localhost:8000/api'
  : '/api';

// Web File System Access API state
let activeDirectoryHandle: any = null;
const fileHandlesMap = new Map<string, any>();
const dirHandlesMap = new Map<string, any>();

// In-Memory Virtual Workspace fallback (when backend is offline)
const virtualWorkspaceTrees = new Map<string, FileNode[]>();
const virtualFileContents = new Map<string, string>();

const IGNORED = new Set([
  'node_modules',
  '.git',
  '__pycache__',
  '.venv',
  'dist',
  'dist_electron',
  '.vite',
  '.DS_Store'
]);

async function buildTreeFromHandle(
  dirHandle: any,
  relPath: string,
  maxDepth = 6,
  depth = 0
): Promise<FileNode[]> {
  if (depth > maxDepth) return [];
  const entries: { name: string; is_dir: boolean; handle: any }[] = [];

  try {
    for await (const [name, handle] of (dirHandle as any).entries()) {
      if (IGNORED.has(name) || name.startsWith('.')) continue;
      entries.push({
        name,
        is_dir: handle.kind === 'directory',
        handle
      });
    }
  } catch (e) {
    console.warn('Error reading directory handle entries', e);
  }

  // Sort: directories first, then alphabetical
  entries.sort((a, b) => {
    if (a.is_dir && !b.is_dir) return -1;
    if (!a.is_dir && b.is_dir) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const tree: FileNode[] = [];
  for (const entry of entries) {
    const itemRel = relPath ? `${relPath}/${entry.name}` : entry.name;
    if (entry.is_dir) {
      dirHandlesMap.set(itemRel, entry.handle);
      const children = await buildTreeFromHandle(entry.handle, itemRel, maxDepth, depth + 1);
      tree.push({
        name: entry.name,
        path: itemRel,
        is_dir: true,
        children
      });
    } else {
      fileHandlesMap.set(itemRel, entry.handle);
      tree.push({
        name: entry.name,
        path: itemRel,
        is_dir: false,
        children: null
      });
    }
  }
  return tree;
}

export const openNativeDirectoryPicker = async (): Promise<{
  root: string;
  path: string;
  tree: FileNode[];
} | null> => {
  // 1. Try Native Web File System Access API
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      if (!dirHandle) return null;

      activeDirectoryHandle = dirHandle;
      fileHandlesMap.clear();
      dirHandlesMap.clear();
      dirHandlesMap.set('', dirHandle);

      const tree = await buildTreeFromHandle(dirHandle, '');
      const rootName = dirHandle.name || 'WORKSPACE';

      // Cache into virtual tree
      virtualWorkspaceTrees.set(rootName, tree);

      return {
        root: rootName,
        path: dirHandle.name,
        tree
      };
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('showDirectoryPicker error:', e);
      }
      return null;
    }
  }

  // 2. Try Electron
  if (typeof window !== 'undefined' && window.electronAPI?.openDirectoryDialog) {
    try {
      const selected = await window.electronAPI.openDirectoryDialog();
      if (selected) {
        return await changeWorkspace(selected);
      }
    } catch (e) {}
  }

  return null;
};

export const fetchWorkspaceInfo = async (): Promise<{ path: string; root: string; exists: boolean }> => {
  if (activeDirectoryHandle) {
    return {
      path: activeDirectoryHandle.name,
      root: activeDirectoryHandle.name,
      exists: true
    };
  }

  try {
    const res = await fetch(`${API_BASE}/fs/workspace`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  return { path: '.', root: 'RENKAIRO-PLATFORM', exists: true };
};

export const changeWorkspace = async (
  workspacePath: string
): Promise<{ status: string; path: string; root: string; tree: FileNode[] } | null> => {
  // If activeDirectoryHandle is active and matches, refresh it
  if (activeDirectoryHandle && activeDirectoryHandle.name === workspacePath) {
    const tree = await buildTreeFromHandle(activeDirectoryHandle, '');
    return {
      status: 'ok',
      path: activeDirectoryHandle.name,
      root: activeDirectoryHandle.name,
      tree
    };
  }

  // Try Backend
  try {
    const res = await fetch(`${API_BASE}/fs/workspace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: workspacePath })
    });
    if (res.ok) {
      const data = await res.json();
      activeDirectoryHandle = null;
      return data;
    }
  } catch (err) {
    console.warn('Backend not reachable, activating virtual workspace for path:', workspacePath);
  }

  // Fallback: Create / load virtual workspace
  const cleanPath = workspacePath.replace(/[/\\]+$/, '');
  const folderName = cleanPath.split(/[/\\]/).pop() || cleanPath || 'PROJECT';

  let tree = virtualWorkspaceTrees.get(workspacePath);
  if (!tree) {
    tree = [
      {
        name: 'src',
        path: 'src',
        is_dir: true,
        children: [
          { name: 'index.ts', path: 'src/index.ts', is_dir: false },
          { name: 'App.tsx', path: 'src/App.tsx', is_dir: false }
        ]
      },
      { name: 'package.json', path: 'package.json', is_dir: false },
      { name: 'README.md', path: 'README.md', is_dir: false }
    ];
    virtualWorkspaceTrees.set(workspacePath, tree);
    virtualFileContents.set(
      `${workspacePath}/package.json`,
      `{\n  "name": "${folderName.toLowerCase()}",\n  "version": "1.0.0",\n  "private": true\n}\n`
    );
    virtualFileContents.set(
      `${workspacePath}/README.md`,
      `# ${folderName}\n\nWorkspace opened in RenKairo IDE.\n`
    );
    virtualFileContents.set(
      `${workspacePath}/src/index.ts`,
      `console.log('Hello from ${folderName}!');\n`
    );
    virtualFileContents.set(
      `${workspacePath}/src/App.tsx`,
      `import React from 'react';\n\nexport function App() {\n  return <div>Welcome to ${folderName}</div>;\n}\n`
    );
  }

  return {
    status: 'ok',
    path: workspacePath,
    root: folderName,
    tree
  };
};

export const fetchFileTree = async (
  path: string = '.',
  root?: string
): Promise<{ root: string; path?: string; tree: FileNode[] }> => {
  if (activeDirectoryHandle) {
    const tree = await buildTreeFromHandle(activeDirectoryHandle, '');
    return {
      root: activeDirectoryHandle.name,
      path: activeDirectoryHandle.name,
      tree
    };
  }

  try {
    let url = `${API_BASE}/fs/tree?path=${encodeURIComponent(path)}`;
    if (root) {
      url += `&root=${encodeURIComponent(root)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return { root: data.root, path: data.path, tree: data.tree };
    }
  } catch (err) {}

  if (root && virtualWorkspaceTrees.has(root)) {
    const tree = virtualWorkspaceTrees.get(root)!;
    const rootName = root.split(/[/\\]/).pop() || root;
    return { root: rootName, path: root, tree };
  }

  return {
    root: 'RENKAIRO-PLATFORM',
    tree: [
      {
        name: 'src',
        path: 'src',
        is_dir: true,
        children: [
          { name: 'App.tsx', path: 'src/App.tsx', is_dir: false },
          { name: 'main.tsx', path: 'src/main.tsx', is_dir: false },
          { name: 'index.css', path: 'src/index.css', is_dir: false }
        ]
      },
      { name: 'package.json', path: 'package.json', is_dir: false },
      { name: 'README.md', path: 'README.md', is_dir: false, gitStatus: 'M' }
    ]
  };
};

export const fetchFileContent = async (path: string, root?: string): Promise<string> => {
  // Try handle
  if (activeDirectoryHandle) {
    const handle = fileHandlesMap.get(path);
    if (handle) {
      try {
        const file = await handle.getFile();
        return await file.text();
      } catch (e) {}
    }
    try {
      const parts = path.split(/[/\\]/);
      let currDir = activeDirectoryHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        currDir = await currDir.getDirectoryHandle(parts[i]);
      }
      const fileHandle = await currDir.getFileHandle(parts[parts.length - 1]);
      fileHandlesMap.set(path, fileHandle);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e) {}
  }

  // Try backend
  try {
    let url = `${API_BASE}/fs/file?path=${encodeURIComponent(path)}`;
    if (root) {
      url += `&root=${encodeURIComponent(root)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.content;
    }
  } catch (err) {}

  // Try virtual
  const virtualKey = root ? `${root}/${path}` : path;
  if (virtualFileContents.has(virtualKey)) {
    return virtualFileContents.get(virtualKey)!;
  }
  if (virtualFileContents.has(path)) {
    return virtualFileContents.get(path)!;
  }

  return `// RenKairo IDE: ${path}\n// Ready for code editing\n`;
};

export const saveFileContent = async (
  path: string,
  content: string,
  root?: string
): Promise<boolean> => {
  // Try handle
  if (activeDirectoryHandle) {
    try {
      let handle = fileHandlesMap.get(path);
      if (!handle) {
        const parts = path.split(/[/\\]/);
        let currDir = activeDirectoryHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          currDir = await currDir.getDirectoryHandle(parts[i], { create: true });
        }
        handle = await currDir.getFileHandle(parts[parts.length - 1], { create: true });
        fileHandlesMap.set(path, handle);
      }
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      console.warn('Failed writing to file handle, falling back', e);
    }
  }

  // Try backend
  try {
    const res = await fetch(`${API_BASE}/fs/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, root })
    });
    if (res.ok) return true;
  } catch (err) {}

  // Virtual save
  const virtualKey = root ? `${root}/${path}` : path;
  virtualFileContents.set(virtualKey, content);
  virtualFileContents.set(path, content);
  return true;
};

function insertNodeIntoTree(tree: FileNode[], pathParts: string[], isDir: boolean): void {
  if (pathParts.length === 0) return;
  const currentName = pathParts[0];
  const isLeaf = pathParts.length === 1;

  let existing = tree.find((n) => n.name === currentName);
  if (!existing) {
    existing = {
      name: currentName,
      path: currentName, // will be resolved
      is_dir: isLeaf ? isDir : true,
      children: isLeaf ? (isDir ? [] : null) : []
    };
    tree.push(existing);
    tree.sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  if (!isLeaf && existing.is_dir) {
    if (!existing.children) existing.children = [];
    insertNodeIntoTree(existing.children, pathParts.slice(1), isDir);
  }
}

function removeNodeFromTree(tree: FileNode[], targetPath: string): boolean {
  const idx = tree.findIndex((n) => n.path === targetPath || targetPath.startsWith(n.path + '/'));
  if (idx !== -1) {
    if (tree[idx].path === targetPath) {
      tree.splice(idx, 1);
      return true;
    }
    if (tree[idx].children) {
      return removeNodeFromTree(tree[idx].children!, targetPath);
    }
  }
  return false;
}

export const performNodeAction = async (
  action: 'create_file' | 'create_dir' | 'rename' | 'delete' | 'duplicate',
  path: string,
  targetPath?: string,
  root?: string,
  content?: string
): Promise<boolean> => {
  // Try handle
  if (activeDirectoryHandle) {
    try {
      const parts = path.split(/[/\\]/);
      const parentParts = parts.slice(0, -1);
      const name = parts[parts.length - 1];

      let parentDir = activeDirectoryHandle;
      for (const part of parentParts) {
        parentDir = await parentDir.getDirectoryHandle(part, { create: true });
      }

      if (action === 'create_file') {
        const newFileHandle = await parentDir.getFileHandle(name, { create: true });
        if (content !== undefined) {
          const writable = await newFileHandle.createWritable();
          await writable.write(content);
          await writable.close();
        }
        fileHandlesMap.set(path, newFileHandle);
        return true;
      } else if (action === 'create_dir') {
        const newDirHandle = await parentDir.getDirectoryHandle(name, { create: true });
        dirHandlesMap.set(path, newDirHandle);
        return true;
      } else if (action === 'delete') {
        await parentDir.removeEntry(name, { recursive: true });
        fileHandlesMap.delete(path);
        dirHandlesMap.delete(path);
        return true;
      } else if (action === 'rename' && targetPath) {
        const oldContent = await fetchFileContent(path);
        await saveFileContent(targetPath, oldContent);
        await parentDir.removeEntry(name);
        fileHandlesMap.delete(path);
        return true;
      } else if (action === 'duplicate') {
        const oldContent = await fetchFileContent(path);
        const dest = targetPath || `${path}.copy`;
        await saveFileContent(dest, oldContent);
        return true;
      }
    } catch (e) {
      console.warn('File handle node action error, falling back', e);
    }
  }

  // Try backend
  try {
    const res = await fetch(`${API_BASE}/fs/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, path, target_path: targetPath, root, content })
    });
    if (res.ok) return true;
  } catch (err) {}

  // Virtual tree update
  const currentRootKey = root || '.';
  const tree = virtualWorkspaceTrees.get(currentRootKey) || [];

  if (action === 'create_file' || action === 'create_dir') {
    insertNodeIntoTree(tree, path.split(/[/\\]/), action === 'create_dir');
    if (content !== undefined) {
      virtualFileContents.set(path, content);
    }
  } else if (action === 'delete') {
    removeNodeFromTree(tree, path);
    virtualFileContents.delete(path);
  } else if (action === 'rename' && targetPath) {
    removeNodeFromTree(tree, path);
    insertNodeIntoTree(tree, targetPath.split(/[/\\]/), false);
    const prevContent = virtualFileContents.get(path) || '';
    virtualFileContents.set(targetPath, prevContent);
    virtualFileContents.delete(path);
  }

  virtualWorkspaceTrees.set(currentRootKey, [...tree]);
  return true;
};

export const browseFolders = async (path?: string): Promise<FolderBrowseResult | null> => {
  try {
    let url = `${API_BASE}/fs/browse-folders`;
    if (path) {
      url += `?path=${encodeURIComponent(path)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  // Fallback browse data
  const homePath = 'C:/Users/Developer';
  const current = path || `${homePath}/Projects`;
  const parent = current.includes('/') ? current.substring(0, current.lastIndexOf('/')) : null;

  return {
    currentPath: current,
    parentPath: parent,
    folders: [
      { name: 'renkairo-project', path: `${current}/renkairo-project`, is_dir: true },
      { name: 'ai-vision-agent', path: `${current}/ai-vision-agent`, is_dir: true },
      { name: 'cloud-infra-service', path: `${current}/cloud-infra-service`, is_dir: true },
      { name: 'my-web-app', path: `${current}/my-web-app`, is_dir: true }
    ],
    drives: [
      { name: 'C:', path: 'C:/' },
      { name: 'D:', path: 'D:/' }
    ],
    quickPlaces: [
      { name: 'Home', path: homePath, icon: 'home' },
      { name: 'Projects', path: `${homePath}/Projects`, icon: 'code' },
      { name: 'Documents', path: `${homePath}/Documents`, icon: 'folder' },
      { name: 'Desktop', path: `${homePath}/Desktop`, icon: 'monitor' },
      { name: 'Downloads', path: `${homePath}/Downloads`, icon: 'download' }
    ]
  };
};

export const revealInExplorer = async (path: string): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.showItemInFolder) {
    try {
      await window.electronAPI.showItemInFolder(path);
      return true;
    } catch (e) {}
  }

  try {
    const res = await fetch(`${API_BASE}/fs/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    return res.ok;
  } catch (err) {
    return false;
  }
};

export const requestNativeFolderDialog = async (defaultPath?: string): Promise<string | null> => {
  // 1. Electron Native Dialog
  if (typeof window !== 'undefined' && window.electronAPI?.openDirectoryDialog) {
    try {
      const selected = await window.electronAPI.openDirectoryDialog(defaultPath);
      if (selected) return selected;
    } catch (e) {}
  }

  // 2. Tauri Dialog
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri.dialog?.open) {
        const selected = await tauri.dialog.open({ directory: true, multiple: false, defaultPath });
        if (typeof selected === 'string') return selected;
      }
    } catch (e) {}
  }

  return null;
};

export const fetchMetrics = async (): Promise<SystemMetrics> => {
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    try {
      const res = await fetch(`${API_BASE}/system/metrics`);
      if (res.ok) return await res.json();
    } catch (err) {}
  }

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
};


