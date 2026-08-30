import { useIDEStore } from '../store/ideStore';
import { readFile, refreshDirectoryTree } from './fileSystem';

class FileWatcherService {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Connect WebSocket to Backend FS Watcher
    this.connectWebSocket();

    // 2. Window Focus & Visibility Sync (VS Code behavior: sync when switching to app)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.syncAllOpenTabsAndTree();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncAllOpenTabsAndTree();
        }
      });
    }
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (window.location.protocol === 'file:' || !window.location.host) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws/fs`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'fs_change' && Array.isArray(data.paths)) {
            await this.handleFsChanges(data.paths);
          }
        } catch (e) {}
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          try { this.ws.close(); } catch (e) {}
        }
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, 4000);
  }

  // Handle live changes streamed from OS watcher
  private async handleFsChanges(changedPaths: string[]) {
    const store = useIDEStore.getState();
    if (!store.workspacePath) return;

    // 1. Refresh explorer tree
    await store.refreshTree();

    // 2. Update open editor tabs if modified externally
    const tabs = store.tabs;
    for (const tab of tabs) {
      const isTarget = changedPaths.some((p) => 
        p === tab.path || p.endsWith(tab.path) || tab.path.endsWith(p)
      );

      if (isTarget && !tab.isDirty) {
        const latestDiskContent = await readFile(tab.path);
        if (latestDiskContent !== tab.content) {
          store.updateTabContentSilently(tab.id, latestDiskContent);
        }
      }
    }
  }

  // Sync on window focus / tab activation (VS Code model)
  public async syncAllOpenTabsAndTree() {
    const store = useIDEStore.getState();
    if (!store.workspacePath) return;

    // 1. Refresh explorer tree
    const tree = await refreshDirectoryTree();
    useIDEStore.setState({ fileTree: tree });

    // 2. Refresh open clean tabs
    const tabs = store.tabs;
    for (const tab of tabs) {
      if (!tab.isDirty) {
        const latestDiskContent = await readFile(tab.path);
        if (latestDiskContent && latestDiskContent !== tab.content) {
          store.updateTabContentSilently(tab.id, latestDiskContent);
        }
      }
    }
  }
}

export const fileWatcher = new FileWatcherService();
