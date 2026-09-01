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
  searchCodebase?: (options: {
    query: string;
    includes?: string;
    isCaseSensitive?: boolean;
    isWholeWord?: boolean;
    isRegex?: boolean;
    rootPath?: string;
  }) => Promise<{
    results: any[];
    totalMatches: number;
    totalFiles: number;
    capped: boolean;
    error?: string;
  }>;
}

export interface ElectronAPI {
  isElectron: boolean;
  openDirectoryDialog: (defaultPath?: string) => Promise<string | null>;
  openFileDialog: (defaultPath?: string) => Promise<string | null>;
  showItemInFolder: (fullPath: string) => Promise<boolean>;
  openPath: (fullPath: string) => Promise<string>;
  getDesktopSources?: () => Promise<{ id: string; name: string }[]>;
  fs: ElectronFS;
  git?: {
    getStatus: (targetRoot?: string) => Promise<any>;
    getDiff: (options: { filePath: string; staged?: boolean; root?: string }) => Promise<any>;
    stage: (options: { paths?: string[]; root?: string }) => Promise<any>;
    unstage: (options: { paths?: string[]; root?: string }) => Promise<any>;
    discard: (options: { paths?: string[]; isUntracked?: boolean; root?: string }) => Promise<any>;
    commit: (options: { message: string; amend?: boolean; stageAll?: boolean; root?: string }) => Promise<any>;
    push: (options?: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean; root?: string }) => Promise<any>;
    pull: (options?: { remote?: string; branch?: string; rebase?: boolean; root?: string }) => Promise<any>;
    fetch: (targetRoot?: string) => Promise<any>;
    init: (options?: { initialBranch?: string; root?: string }) => Promise<any>;
    getBranches: (targetRoot?: string) => Promise<any>;
    checkout: (options: { branch: string; createNew?: boolean; startPoint?: string; root?: string }) => Promise<any>;
    getRemotes: (targetRoot?: string) => Promise<any>;
    addRemote: (options: { name?: string; url: string; root?: string }) => Promise<any>;
    getLog: (options?: { maxCount?: number; root?: string }) => Promise<any>;
    clone: (options: { url: string; targetPath?: string; directoryName?: string }) => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
