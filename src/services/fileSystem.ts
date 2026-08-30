import { FileNode } from '../types/ide';
import { probeFileHeader, readTextStreamWithProgress, StreamProgress, getTierFromSize } from './largeFileService';

// Active Absolute Workspace Directory Path (Native Node.js / Electron)
let activeWorkspacePath: string | null = null;

// In-Memory Virtual Store (fallback)
const inMemoryFileStore = new Map<string, string>();
let currentVirtualTree: FileNode[] = [];

export interface FileReadDetails {
  content: string;
  size: number;
  isBinary: boolean;
  tier: 'small' | 'medium' | 'large' | 'huge';
  truncated: boolean;
  totalSize: number;
  mimeType?: string;
}

export function getActiveWorkspacePath(): string | null {
  return activeWorkspacePath;
}

export function setActiveWorkspacePath(p: string | null) {
  activeWorkspacePath = p;
}

export function getCurrentTree(): FileNode[] {
  return currentVirtualTree;
}

export function setCurrentTree(tree: FileNode[]) {
  currentVirtualTree = tree;
}

// Path resolver for native filesystem
function resolveFullPath(relPath: string): string {
  if (!relPath) return activeWorkspacePath || '';
  // If already absolute path (Windows 'C:\...' or POSIX '/...')
  if (/^([a-zA-Z]:[/\\]|\/)/.test(relPath)) {
    return relPath;
  }
  if (!activeWorkspacePath) return relPath;

  const isWin = activeWorkspacePath.includes('\\');
  const separator = isWin ? '\\' : '/';
  const cleanRel = relPath.replace(/[/\\]+/g, separator);
  
  return `${activeWorkspacePath}${activeWorkspacePath.endsWith(separator) ? '' : separator}${cleanRel}`;
}

export function insertFileIntoTree(tree: FileNode[], relPath: string, isDir = false): void {
  const parts = relPath.split(/[/\\]/).filter(Boolean);
  let currentLevel = tree;
  let currentPath = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLeaf = i === parts.length - 1;
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    let existing = currentLevel.find((n) => n.name === part);
    if (!existing) {
      const nodeIsDir = isLeaf ? isDir : true;
      existing = {
        name: part,
        path: currentPath,
        is_dir: nodeIsDir,
        children: nodeIsDir ? [] : null
      };
      currentLevel.push(existing);
      currentLevel.sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    }

    if (!isLeaf && existing.is_dir) {
      if (!existing.children) existing.children = [];
      currentLevel = existing.children;
    }
  }
}

export function removeFileFromVirtualTree(targetRelPath: string): void {
  function removeRecursive(nodes: FileNode[]): boolean {
    const idx = nodes.findIndex((n) => n.path === targetRelPath || targetRelPath.startsWith(n.path + '/'));
    if (idx !== -1) {
      if (nodes[idx].path === targetRelPath) {
        nodes.splice(idx, 1);
        return true;
      }
      if (nodes[idx].children) {
        return removeRecursive(nodes[idx].children!);
      }
    }
    return false;
  }
  removeRecursive(currentVirtualTree);
}

// ----------------------------------------------------
// 1. Open Local Folder Picker (Native Node.js Electron)
// ----------------------------------------------------
export async function openLocalFolderPicker(): Promise<{
  name: string;
  path: string;
  tree: FileNode[];
} | null> {
  // 1. Native Electron Node.js File System Provider (Primary & Default)
  if (typeof window !== 'undefined' && window.electronAPI?.fs?.selectFolder) {
    try {
      const result = await window.electronAPI.fs.selectFolder();
      if (result) {
        activeWorkspacePath = result.path;
        currentVirtualTree = result.tree;
        inMemoryFileStore.clear();

        return {
          name: result.name,
          path: result.path,
          tree: result.tree
        };
      }
      return null;
    } catch (err) {
      console.error('[Native FS] Failed selecting folder via Electron IPC:', err);
    }
  }

  // 2. Native Electron Dialog fallback
  if (typeof window !== 'undefined' && window.electronAPI?.openDirectoryDialog) {
    try {
      const selectedPath = await window.electronAPI.openDirectoryDialog();
      if (selectedPath) {
        activeWorkspacePath = selectedPath;
        const rootName = selectedPath.split(/[/\\]/).pop() || selectedPath;
        const tree = await refreshDirectoryTree();
        return {
          name: rootName,
          path: selectedPath,
          tree
        };
      }
    } catch (e) {}
  }

  return null;
}

// ----------------------------------------------------
// 2. Refresh Directory Tree & Lazy Child Fetcher (Demand-Driven)
// ----------------------------------------------------
export async function fetchDirectoryChildren(dirRelPath: string): Promise<FileNode[]> {
  if (typeof window !== 'undefined' && window.electronAPI?.fs?.readDirectoryChildren) {
    try {
      return await window.electronAPI.fs.readDirectoryChildren(dirRelPath);
    } catch (err) {
      console.error(`[Native FS] Failed reading children of ${dirRelPath}:`, err);
    }
  }
  return [];
}

export async function refreshDirectoryTree(): Promise<FileNode[]> {
  inMemoryFileStore.clear();

  if (activeWorkspacePath && typeof window !== 'undefined' && window.electronAPI?.fs?.readDirectoryTree) {
    try {
      const tree = await window.electronAPI.fs.readDirectoryTree(activeWorkspacePath);
      currentVirtualTree = tree;
      return tree;
    } catch (err) {
      console.error('[Native FS] Failed reading directory tree:', err);
    }
  }

  return [...currentVirtualTree];
}

// ----------------------------------------------------
// 3. Read File Content with Native Node.js & Streaming
// ----------------------------------------------------
export async function readFileDetails(
  relPath: string, 
  forceFresh = false,
  onProgress?: (progress: StreamProgress) => void
): Promise<FileReadDetails> {
  const fullPath = resolveFullPath(relPath);

  // 1. Native Electron Node.js IPC File Reader
  if (typeof window !== 'undefined' && window.electronAPI?.fs?.readFileDetails) {
    try {
      const details = await window.electronAPI.fs.readFileDetails(fullPath);
      if (details) {
        if (!forceFresh && details.size < 5 * 1024 * 1024) {
          inMemoryFileStore.set(relPath, details.content);
        }
        return {
          content: details.content,
          size: details.size,
          isBinary: details.isBinary,
          tier: details.tier,
          truncated: details.truncated,
          totalSize: details.totalSize
        };
      }
    } catch (err) {
      console.error(`[Native FS] Error reading ${fullPath}:`, err);
    }
  }

  // Fallback cache
  if (!forceFresh && inMemoryFileStore.has(relPath)) {
    const cached = inMemoryFileStore.get(relPath)!;
    return {
      content: cached,
      size: cached.length,
      isBinary: false,
      tier: getTierFromSize(cached.length),
      truncated: false,
      totalSize: cached.length
    };
  }

  const fallback = inMemoryFileStore.get(relPath) || '';
  return {
    content: fallback,
    size: fallback.length,
    isBinary: false,
    tier: 'small',
    truncated: false,
    totalSize: fallback.length
  };
}

export async function readFile(relPath: string, forceFresh = false): Promise<string> {
  const details = await readFileDetails(relPath, forceFresh);
  return details.content;
}

// ----------------------------------------------------
// 4. Write / Save File (Native Node.js fs.writeFile)
// ----------------------------------------------------
export async function writeFile(relPath: string, content: string): Promise<boolean> {
  inMemoryFileStore.set(relPath, content);
  const fullPath = resolveFullPath(relPath);

  if (typeof window !== 'undefined' && window.electronAPI?.fs?.writeFile) {
    try {
      return await window.electronAPI.fs.writeFile(fullPath, content);
    } catch (err) {
      console.error(`[Native FS] Error writing ${fullPath}:`, err);
    }
  }

  return true;
}

// ----------------------------------------------------
// 5. Create File (Native Node.js fs.writeFile)
// ----------------------------------------------------
export async function createFile(parentRelPath: string, fileName: string): Promise<boolean> {
  const targetRel = parentRelPath ? `${parentRelPath}/${fileName}` : fileName;
  inMemoryFileStore.set(targetRel, '');
  const fullPath = resolveFullPath(targetRel);

  if (typeof window !== 'undefined' && window.electronAPI?.fs?.createFile) {
    try {
      await window.electronAPI.fs.createFile(fullPath, '');
    } catch (err) {
      console.error(`[Native FS] Error creating file ${fullPath}:`, err);
    }
  }

  insertFileIntoTree(currentVirtualTree, targetRel, false);
  return true;
}

// ----------------------------------------------------
// 6. Create Folder (Native Node.js fs.mkdir)
// ----------------------------------------------------
export async function createFolder(parentRelPath: string, folderName: string): Promise<boolean> {
  const targetRel = parentRelPath ? `${parentRelPath}/${folderName}` : folderName;
  const fullPath = resolveFullPath(targetRel);

  if (typeof window !== 'undefined' && window.electronAPI?.fs?.createDirectory) {
    try {
      await window.electronAPI.fs.createDirectory(fullPath);
    } catch (err) {
      console.error(`[Native FS] Error creating directory ${fullPath}:`, err);
    }
  }

  insertFileIntoTree(currentVirtualTree, targetRel, true);
  return true;
}

// ----------------------------------------------------
// 7. Delete Item (Native Node.js fs.rm)
// ----------------------------------------------------
export async function deleteItem(relPath: string): Promise<boolean> {
  inMemoryFileStore.delete(relPath);
  const fullPath = resolveFullPath(relPath);

  if (typeof window !== 'undefined' && window.electronAPI?.fs?.deleteItem) {
    try {
      await window.electronAPI.fs.deleteItem(fullPath);
    } catch (err) {
      console.error(`[Native FS] Error deleting ${fullPath}:`, err);
    }
  }

  removeFileFromVirtualTree(relPath);
  return true;
}

// ----------------------------------------------------
// 8. Rename Item (Native Node.js fs.rename)
// ----------------------------------------------------
export async function renameItem(oldRelPath: string, newName: string, isDir: boolean): Promise<boolean> {
  const parent = oldRelPath.includes('/') ? oldRelPath.substring(0, oldRelPath.lastIndexOf('/')) : '';
  const newRelPath = parent ? `${parent}/${newName}` : newName;

  const oldFullPath = resolveFullPath(oldRelPath);
  const newFullPath = resolveFullPath(newRelPath);

  if (typeof window !== 'undefined' && window.electronAPI?.fs?.renameItem) {
    try {
      await window.electronAPI.fs.renameItem(oldFullPath, newFullPath);
    } catch (err) {
      console.error(`[Native FS] Error renaming ${oldFullPath} to ${newFullPath}:`, err);
    }
  }

  const content = inMemoryFileStore.get(oldRelPath) || '';
  inMemoryFileStore.set(newRelPath, content);
  inMemoryFileStore.delete(oldRelPath);

  removeFileFromVirtualTree(oldRelPath);
  insertFileIntoTree(currentVirtualTree, newRelPath, isDir);
  return true;
}

// ----------------------------------------------------
// 9. Move Item (Native Node.js fs.rename / move)
// ----------------------------------------------------
export async function moveItem(sourceRelPath: string, targetDirRelPath: string, isDir: boolean): Promise<boolean> {
  const itemName = sourceRelPath.split(/[/\\]/).pop()!;
  const newRelPath = targetDirRelPath ? `${targetDirRelPath}/${itemName}` : itemName;

  const srcFullPath = resolveFullPath(sourceRelPath);
  const destFullPath = resolveFullPath(newRelPath);

  if (typeof window !== 'undefined' && window.electronAPI?.fs?.moveItem) {
    try {
      await window.electronAPI.fs.moveItem(srcFullPath, destFullPath);
    } catch (err) {
      console.error(`[Native FS] Error moving ${srcFullPath} to ${destFullPath}:`, err);
    }
  }

  const content = inMemoryFileStore.get(sourceRelPath) || '';
  inMemoryFileStore.set(newRelPath, content);
  inMemoryFileStore.delete(sourceRelPath);

  removeFileFromVirtualTree(sourceRelPath);
  insertFileIntoTree(currentVirtualTree, newRelPath, isDir);
  return true;
}
