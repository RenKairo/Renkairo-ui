import { FileNode } from '../types/ide';

// Active Web File System Access API Handle (if supported and permitted)
let rootDirectoryHandle: any = null;

// In-Memory File Store (persists file contents in real-time)
const inMemoryFileStore = new Map<string, string>();
let currentVirtualTree: FileNode[] = [];

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

export function getCurrentTree(): FileNode[] {
  return currentVirtualTree;
}

export function setCurrentTree(tree: FileNode[]) {
  currentVirtualTree = tree;
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

export function insertFileIntoVirtualTree(relPath: string, isDir = false): void {
  insertFileIntoTree(currentVirtualTree, relPath, isDir);
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

// Helper to navigate to a sub-directory handle from a relative path
async function resolveDirHandle(relPath: string, createIfMissing = false): Promise<any> {
  if (!rootDirectoryHandle) return null;
  if (!relPath || relPath === '.' || relPath === '') return rootDirectoryHandle;

  const parts = relPath.split(/[/\\]/).filter(Boolean);
  let current = rootDirectoryHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: createIfMissing });
  }
  return current;
}

// Build file tree from directory handle
export async function buildTreeFromHandle(
  dirHandle: any,
  relPath = '',
  maxDepth = 8,
  currentDepth = 0
): Promise<FileNode[]> {
  if (currentDepth > maxDepth) return [];
  const entries: { name: string; is_dir: boolean; handle: any }[] = [];

  try {
    if (typeof dirHandle.values === 'function') {
      for await (const handle of dirHandle.values()) {
        if (IGNORED.has(handle.name)) continue;
        entries.push({
          name: handle.name,
          is_dir: handle.kind === 'directory',
          handle
        });
      }
    } else if (typeof dirHandle.entries === 'function') {
      for await (const [name, handle] of dirHandle.entries()) {
        if (IGNORED.has(name)) continue;
        entries.push({
          name,
          is_dir: handle.kind === 'directory',
          handle
        });
      }
    }
  } catch (e) {
    console.error('Failed to read directory handle entries', e);
    return [];
  }

  // Sort: directories first (alphabetical), then files (alphabetical)
  entries.sort((a, b) => {
    if (a.is_dir && !b.is_dir) return -1;
    if (!a.is_dir && b.is_dir) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const tree: FileNode[] = [];
  for (const entry of entries) {
    const itemPath = relPath ? `${relPath}/${entry.name}` : entry.name;
    if (entry.is_dir) {
      const children = await buildTreeFromHandle(entry.handle, itemPath, maxDepth, currentDepth + 1);
      tree.push({
        name: entry.name,
        path: itemPath,
        is_dir: true,
        children
      });
    } else {
      tree.push({
        name: entry.name,
        path: itemPath,
        is_dir: false,
        children: null
      });
    }
  }
  return tree;
}

// Universal Directory Picker via HTML5 webkitdirectory input
function openDirectoryViaFileInput(): Promise<{ name: string; path: string; tree: FileNode[] } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.style.display = 'none';

    input.onchange = async (e: any) => {
      const files: FileList = e.target.files;
      if (!files || files.length === 0) {
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(null);
        return;
      }

      const firstPath = files[0].webkitRelativePath || files[0].name;
      const rootFolderName = firstPath.split('/')[0] || 'PROJECT';
      const tree: FileNode[] = [];

      inMemoryFileStore.clear();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fullRel = file.webkitRelativePath;
        if (!fullRel) continue;

        // Skip ignored directories
        if (
          fullRel.includes('node_modules/') ||
          fullRel.includes('.git/') ||
          fullRel.includes('.venv/') ||
          fullRel.includes('dist/') ||
          fullRel.includes('__pycache__/')
        ) {
          continue;
        }

        const relWithoutRoot = fullRel.startsWith(rootFolderName + '/')
          ? fullRel.substring(rootFolderName.length + 1)
          : fullRel;

        if (!relWithoutRoot) continue;

        try {
          const text = await file.text();
          inMemoryFileStore.set(relWithoutRoot, text);
        } catch (err) {
          inMemoryFileStore.set(relWithoutRoot, '');
        }

        insertFileIntoTree(tree, relWithoutRoot, false);
      }

      currentVirtualTree = tree;
      if (input.parentNode) input.parentNode.removeChild(input);

      resolve({
        name: rootFolderName,
        path: rootFolderName,
        tree
      });
    };

    input.oncancel = () => {
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(null);
    };

    document.body.appendChild(input);
    input.click();
  });
}

// 1. Open Folder from Local Machine (Tries showDirectoryPicker with readwrite, fallback to HTML5 file input)
export async function openLocalFolderPicker(): Promise<{
  name: string;
  path: string;
  tree: FileNode[];
} | null> {
  // 1. Try Native Web File System Access API
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      if (handle) {
        // Request readwrite permissions upfront
        if (typeof handle.requestPermission === 'function') {
          try {
            await handle.requestPermission({ mode: 'readwrite' });
          } catch (e) {}
        }

        rootDirectoryHandle = handle;
        inMemoryFileStore.clear();

        const tree = await buildTreeFromHandle(handle);
        currentVirtualTree = tree;

        return {
          name: handle.name,
          path: handle.name,
          tree
        };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return null;
      }
      console.warn('showDirectoryPicker unavailable or blocked, falling back to directory file input:', e);
    }
  }

  // 2. Fallback to HTML5 directory file input
  return await openDirectoryViaFileInput();
}

// 2. Refresh Tree (Clears cache and forces fresh disk scan)
export async function refreshDirectoryTree(): Promise<FileNode[]> {
  inMemoryFileStore.clear();

  if (rootDirectoryHandle) {
    try {
      const tree = await buildTreeFromHandle(rootDirectoryHandle);
      currentVirtualTree = tree;
      return tree;
    } catch (e) {
      console.warn('Failed to refresh from handle, using virtual tree', e);
    }
  }

  // Try backend tree
  try {
    const res = await fetch('/api/fs/tree');
    if (res.ok) {
      const data = await res.json();
      currentVirtualTree = data.tree || [];
      return currentVirtualTree;
    }
  } catch (e) {}

  return [...currentVirtualTree];
}

// 3. Read File Content (Reads directly from disk/backend if forceFresh is true)
export async function readFile(relPath: string, forceFresh = false): Promise<string> {
  if (!forceFresh && inMemoryFileStore.has(relPath)) {
    return inMemoryFileStore.get(relPath)!;
  }

  if (rootDirectoryHandle) {
    try {
      const parts = relPath.split(/[/\\]/).filter(Boolean);
      const fileName = parts.pop()!;
      const parentRel = parts.join('/');
      const parentDir = await resolveDirHandle(parentRel);
      const fileHandle = await parentDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      inMemoryFileStore.set(relPath, content);
      return content;
    } catch (e) {
      console.error(`Failed to read file ${relPath}:`, e);
    }
  }

  // Try backend if available
  try {
    const res = await fetch(`/api/fs/file?path=${encodeURIComponent(relPath)}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.content !== undefined) {
        inMemoryFileStore.set(relPath, data.content);
        return data.content;
      }
    }
  } catch (e) {}

  return inMemoryFileStore.get(relPath) || '';
}

// 4. Save File Content (Directly writes to local disk file)
export async function writeFile(relPath: string, content: string): Promise<boolean> {
  inMemoryFileStore.set(relPath, content);
  let savedToDisk = false;

  // 1. Direct Web File System Access API Handle Write
  if (rootDirectoryHandle) {
    try {
      if (typeof rootDirectoryHandle.queryPermission === 'function') {
        const status = await rootDirectoryHandle.queryPermission({ mode: 'readwrite' });
        if (status !== 'granted') {
          await rootDirectoryHandle.requestPermission({ mode: 'readwrite' });
        }
      }

      const parts = relPath.split(/[/\\]/).filter(Boolean);
      const fileName = parts.pop()!;
      const parentRel = parts.join('/');
      const parentDir = await resolveDirHandle(parentRel, true);
      const fileHandle = await parentDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      savedToDisk = true;
      console.log(`[FileSystem] Disk write complete for: ${relPath}`);
    } catch (e) {
      console.warn(`Direct handle write failed for ${relPath}, trying backend:`, e);
    }
  }

  // 2. Node Backend Write (if backend server is active)
  try {
    const res = await fetch('/api/fs/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: relPath, content })
    });
    if (res.ok) {
      savedToDisk = true;
    }
  } catch (e) {}

  return true;
}

// 5. Create File
export async function createFile(parentRelPath: string, fileName: string): Promise<boolean> {
  const targetRel = parentRelPath ? `${parentRelPath}/${fileName}` : fileName;
  inMemoryFileStore.set(targetRel, '');

  if (rootDirectoryHandle) {
    try {
      const parentDir = await resolveDirHandle(parentRelPath, true);
      const fileHandle = await parentDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('');
      await writable.close();
    } catch (e) {
      console.warn(`Failed creating file on disk handle for ${targetRel}:`, e);
    }
  }

  // Backend write
  try {
    await fetch('/api/fs/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_file', path: targetRel })
    });
  } catch (e) {}

  insertFileIntoVirtualTree(targetRel, false);
  return true;
}

// 6. Create Folder
export async function createFolder(parentRelPath: string, folderName: string): Promise<boolean> {
  const targetRel = parentRelPath ? `${parentRelPath}/${folderName}` : folderName;

  if (rootDirectoryHandle) {
    try {
      const parentDir = await resolveDirHandle(parentRelPath, true);
      await parentDir.getDirectoryHandle(folderName, { create: true });
    } catch (e) {
      console.warn(`Failed creating directory on disk handle for ${targetRel}:`, e);
    }
  }

  // Backend write
  try {
    await fetch('/api/fs/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_dir', path: targetRel })
    });
  } catch (e) {}

  insertFileIntoVirtualTree(targetRel, true);
  return true;
}

// 7. Delete Item (File or Folder)
export async function deleteItem(relPath: string): Promise<boolean> {
  inMemoryFileStore.delete(relPath);
  for (const key of Array.from(inMemoryFileStore.keys())) {
    if (key.startsWith(relPath + '/')) {
      inMemoryFileStore.delete(key);
    }
  }

  if (rootDirectoryHandle) {
    try {
      const parts = relPath.split(/[/\\]/).filter(Boolean);
      const itemName = parts.pop()!;
      const parentRel = parts.join('/');
      const parentDir = await resolveDirHandle(parentRel);
      await parentDir.removeEntry(itemName, { recursive: true });
    } catch (e) {
      console.warn(`Failed deleting on disk handle for ${relPath}:`, e);
    }
  }

  // Backend delete
  try {
    await fetch('/api/fs/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', path: relPath })
    });
  } catch (e) {}

  removeFileFromVirtualTree(relPath);
  return true;
}

// 8. Rename Item
export async function renameItem(oldRelPath: string, newName: string, isDir: boolean): Promise<boolean> {
  const parent = oldRelPath.includes('/') ? oldRelPath.substring(0, oldRelPath.lastIndexOf('/')) : '';
  const newRelPath = parent ? `${parent}/${newName}` : newName;

  const content = inMemoryFileStore.get(oldRelPath) || '';
  inMemoryFileStore.set(newRelPath, content);
  inMemoryFileStore.delete(oldRelPath);

  if (isDir) {
    for (const key of Array.from(inMemoryFileStore.keys())) {
      if (key.startsWith(oldRelPath + '/')) {
        const childContent = inMemoryFileStore.get(key)!;
        const newKey = key.replace(oldRelPath, newRelPath);
        inMemoryFileStore.set(newKey, childContent);
        inMemoryFileStore.delete(key);
      }
    }
  }

  if (rootDirectoryHandle) {
    try {
      const parts = oldRelPath.split(/[/\\]/).filter(Boolean);
      const oldName = parts.pop()!;
      const parentRel = parts.join('/');
      const parentDir = await resolveDirHandle(parentRel);

      if (!isDir) {
        const oldFileHandle = await parentDir.getFileHandle(oldName);
        if (typeof (oldFileHandle as any).move === 'function') {
          await (oldFileHandle as any).move(newName);
        } else {
          const file = await oldFileHandle.getFile();
          const fileText = await file.text();
          const newFileHandle = await parentDir.getFileHandle(newName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(fileText);
          await writable.close();
          await parentDir.removeEntry(oldName);
        }
      } else {
        const oldDirHandle = await parentDir.getDirectoryHandle(oldName);
        if (typeof (oldDirHandle as any).move === 'function') {
          await (oldDirHandle as any).move(newName);
        } else {
          const newDirHandle = await parentDir.getDirectoryHandle(newName, { create: true });
          await copyDirectoryRecursive(oldDirHandle, newDirHandle);
          await parentDir.removeEntry(oldName, { recursive: true });
        }
      }
    } catch (e) {
      console.warn(`Failed rename on disk handle for ${oldRelPath} -> ${newName}:`, e);
    }
  }

  // Backend rename
  try {
    await fetch('/api/fs/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', path: oldRelPath, target_path: newRelPath })
    });
  } catch (e) {}

  removeFileFromVirtualTree(oldRelPath);
  insertFileIntoVirtualTree(newRelPath, isDir);
  return true;
}

// 9. Move Item (File or Folder to another Folder)
export async function moveItem(sourceRelPath: string, targetDirRelPath: string, isDir: boolean): Promise<boolean> {
  const itemName = sourceRelPath.split(/[/\\]/).pop()!;
  const newRelPath = targetDirRelPath ? `${targetDirRelPath}/${itemName}` : itemName;

  const content = inMemoryFileStore.get(sourceRelPath) || '';
  inMemoryFileStore.set(newRelPath, content);
  inMemoryFileStore.delete(sourceRelPath);

  if (isDir) {
    for (const key of Array.from(inMemoryFileStore.keys())) {
      if (key.startsWith(sourceRelPath + '/')) {
        const childContent = inMemoryFileStore.get(key)!;
        const newKey = key.replace(sourceRelPath, newRelPath);
        inMemoryFileStore.set(newKey, childContent);
        inMemoryFileStore.delete(key);
      }
    }
  }

  if (rootDirectoryHandle) {
    try {
      const srcParts = sourceRelPath.split(/[/\\]/).filter(Boolean);
      const oldName = srcParts.pop()!;
      const srcParentRel = srcParts.join('/');
      const srcParentDir = await resolveDirHandle(srcParentRel);
      const destDir = await resolveDirHandle(targetDirRelPath, true);

      if (!isDir) {
        const srcFileHandle = await srcParentDir.getFileHandle(oldName);
        if (typeof (srcFileHandle as any).move === 'function') {
          await (srcFileHandle as any).move(destDir, oldName);
        } else {
          const file = await srcFileHandle.getFile();
          const fileText = await file.text();
          const newFileHandle = await destDir.getFileHandle(oldName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(fileText);
          await writable.close();
          await srcParentDir.removeEntry(oldName);
        }
      } else {
        const srcDirHandle = await srcParentDir.getDirectoryHandle(oldName);
        if (typeof (srcDirHandle as any).move === 'function') {
          await (srcDirHandle as any).move(destDir, oldName);
        } else {
          const newSubDir = await destDir.getDirectoryHandle(oldName, { create: true });
          await copyDirectoryRecursive(srcDirHandle, newSubDir);
          await srcParentDir.removeEntry(oldName, { recursive: true });
        }
      }
    } catch (e) {
      console.warn(`Failed move on disk handle for ${sourceRelPath} -> ${targetDirRelPath}:`, e);
    }
  }

  // Backend move
  try {
    await fetch('/api/fs/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', path: sourceRelPath, target_path: newRelPath })
    });
  } catch (e) {}

  removeFileFromVirtualTree(sourceRelPath);
  insertFileIntoVirtualTree(newRelPath, isDir);
  return true;
}

async function copyDirectoryRecursive(sourceDirHandle: any, targetDirHandle: any): Promise<void> {
  for await (const [name, handle] of sourceDirHandle.entries()) {
    if (handle.kind === 'directory') {
      const subTarget = await targetDirHandle.getDirectoryHandle(name, { create: true });
      await copyDirectoryRecursive(handle, subTarget);
    } else {
      const file = await handle.getFile();
      const content = await file.text();
      const targetFileHandle = await targetDirHandle.getFileHandle(name, { create: true });
      const writable = await targetFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    }
  }
}
