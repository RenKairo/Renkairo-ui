export interface ElectronAPI {
  isElectron: boolean;
  openDirectoryDialog: (defaultPath?: string) => Promise<string | null>;
  openFileDialog: (defaultPath?: string) => Promise<string | null>;
  showItemInFolder: (fullPath: string) => Promise<boolean>;
  openPath: (fullPath: string) => Promise<string | boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
