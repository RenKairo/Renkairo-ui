/// <reference types="vite/client" />

export interface ElectronFS {
  selectFolder: () => Promise<{ path: string; name: string; tree: any[] } | null>;
  readDirectoryChildren: (dirRelOrFullPath: string) => Promise<any[]>;
  readDirectoryTree: (dirPath: string) => Promise<any[]>;
  readFileDetails: (filePath: string, options?: any) => Promise<{
    content: string;
    size: number;
    isBinary: boolean;
    tier: 'small' | 'medium' | 'large' | 'huge';
    truncated: boolean;
    totalSize: number;
  }>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  createFile: (filePath: string, content?: string) => Promise<boolean>;
  createDirectory: (dirPath: string) => Promise<boolean>;
  deleteItem: (targetPath: string) => Promise<boolean>;
  renameItem: (oldPath: string, newPath: string) => Promise<boolean>;
  moveItem: (srcPath: string, destPath: string) => Promise<boolean>;
}

export interface ElectronAPI {
  isElectron: boolean;
  openDirectoryDialog: (defaultPath?: string) => Promise<string | null>;
  openFileDialog: (defaultPath?: string) => Promise<string | null>;
  showItemInFolder: (fullPath: string) => Promise<boolean>;
  openPath: (fullPath: string) => Promise<string>;
  fs: ElectronFS;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
