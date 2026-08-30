export interface ElectronAPI {
  isElectron: boolean;
  openDirectoryDialog: (defaultPath?: string) => Promise<string | null>;
  openFileDialog: (defaultPath?: string) => Promise<string | null>;
  showItemInFolder: (fullPath: string) => Promise<boolean>;
  openPath: (fullPath: string) => Promise<string | boolean>;
  getDesktopSources?: () => Promise<{ id: string; name: string }[]>;
  fs?: {
    selectFolder: () => Promise<{ name: string; path: string; tree: any[] } | null>;
    readDirectoryChildren: (dirRelOrFullPath: string) => Promise<any[]>;
    readDirectoryTree: (dirPath: string) => Promise<any[]>;
    readFileDetails: (filePath: string, options?: any) => Promise<any>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    createFile: (filePath: string, content: string) => Promise<boolean>;
    createDirectory: (dirPath: string) => Promise<boolean>;
    deleteItem: (targetPath: string) => Promise<boolean>;
    renameItem: (oldPath: string, newPath: string) => Promise<boolean>;
    moveItem: (srcPath: string, destPath: string) => Promise<boolean>;
    searchCodebase: (options: {
      query: string;
      includes?: string;
      isCaseSensitive?: boolean;
      isWholeWord?: boolean;
      isRegex?: boolean;
      rootPath?: string;
    }) => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
