import { 
  GitBranchResult, 
  GitCommitItem, 
  GitDiffResult, 
  GitRemoteItem, 
  GitStatusResult 
} from '../types/ide';
import { getActiveWorkspacePath } from './fileSystem';

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const API_BASE = isFileProtocol ? 'http://localhost:8000/api' : '/api';

async function fetchGitApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let url = `${API_BASE}/git${endpoint}`;
  try {
    let res = await fetch(url, options);
    if (!res.ok && !isFileProtocol) {
      // Retry via direct backend port if relative path failed
      res = await fetch(`http://localhost:8000/api/git${endpoint}`, options);
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Git request failed: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error(`[Git API Error] ${endpoint}:`, err);
    throw err;
  }
}

export const gitService = {
  async getStatus(targetRoot?: string): Promise<GitStatusResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.getStatus) {
      try {
        return await window.electronAPI.git.getStatus(root);
      } catch (e) {
        console.error('[Git IPC] getStatus error:', e);
      }
    }

    // 2. HTTP Backend
    const query = root ? `?root=${encodeURIComponent(root)}` : '';
    return await fetchGitApi<GitStatusResult>(`/status${query}`);
  },

  async getDiff(filePath: string, staged: boolean = false, targetRoot?: string): Promise<GitDiffResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.getDiff) {
      try {
        return await window.electronAPI.git.getDiff({ filePath, staged, root });
      } catch (e) {
        console.error('[Git IPC] getDiff error:', e);
      }
    }

    // 2. HTTP Backend
    return await fetchGitApi<GitDiffResult>('/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, staged, root })
    });
  },

  async stage(paths?: string[], targetRoot?: string): Promise<GitStatusResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.stage) {
      return await window.electronAPI.git.stage({ paths, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, root })
    });
    return res.gitStatus;
  },

  async unstage(paths?: string[], targetRoot?: string): Promise<GitStatusResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.unstage) {
      return await window.electronAPI.git.unstage({ paths, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/unstage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, root })
    });
    return res.gitStatus;
  },

  async discard(paths?: string[], isUntracked: boolean = false, targetRoot?: string): Promise<GitStatusResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.discard) {
      return await window.electronAPI.git.discard({ paths, isUntracked, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, isUntracked, root })
    });
    return res.gitStatus;
  },

  async commit(
    message: string, 
    amend: boolean = false, 
    stageAll: boolean = false, 
    targetRoot?: string
  ): Promise<GitStatusResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.commit) {
      return await window.electronAPI.git.commit({ message, amend, stageAll, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, amend, stageAll, root })
    });
    return res.gitStatus;
  },

  async push(options: { 
    remote?: string; 
    branch?: string; 
    setUpstream?: boolean; 
    force?: boolean; 
    targetRoot?: string 
  } = {}): Promise<GitStatusResult> {
    const root = options.targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.push) {
      return await window.electronAPI.git.push({ ...options, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...options, root })
    });
    return res.gitStatus;
  },

  async pull(options: { 
    remote?: string; 
    branch?: string; 
    rebase?: boolean; 
    targetRoot?: string 
  } = {}): Promise<GitStatusResult> {
    const root = options.targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.pull) {
      return await window.electronAPI.git.pull({ ...options, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...options, root })
    });
    return res.gitStatus;
  },

  async fetch(targetRoot?: string): Promise<GitStatusResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.fetch) {
      return await window.electronAPI.git.fetch(root);
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root })
    });
    return res.gitStatus;
  },

  async init(initialBranch: string = 'main', targetRoot?: string): Promise<GitStatusResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.init) {
      return await window.electronAPI.git.init({ initialBranch, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBranch, root })
    });
    return res.gitStatus;
  },

  async getBranches(targetRoot?: string): Promise<GitBranchResult> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.getBranches) {
      return await window.electronAPI.git.getBranches(root);
    }

    // 2. HTTP Backend
    const query = root ? `?root=${encodeURIComponent(root)}` : '';
    return await fetchGitApi<GitBranchResult>(`/branches${query}`);
  },

  async checkout(options: { 
    branch: string; 
    createNew?: boolean; 
    startPoint?: string; 
    targetRoot?: string 
  }): Promise<GitStatusResult> {
    const root = options.targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.checkout) {
      return await window.electronAPI.git.checkout({ ...options, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; gitStatus: GitStatusResult }>('/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...options, root })
    });
    return res.gitStatus;
  },

  async getRemotes(targetRoot?: string): Promise<GitRemoteItem[]> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.getRemotes) {
      return await window.electronAPI.git.getRemotes(root);
    }

    // 2. HTTP Backend
    const query = root ? `?root=${encodeURIComponent(root)}` : '';
    return await fetchGitApi<GitRemoteItem[]>(`/remotes${query}`);
  },

  async addRemote(name: string, url: string, targetRoot?: string): Promise<GitRemoteItem[]> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.addRemote) {
      return await window.electronAPI.git.addRemote({ name, url, root });
    }

    // 2. HTTP Backend
    const res = await fetchGitApi<{ status: string; remotes: GitRemoteItem[] }>('/remotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, root })
    });
    return res.remotes;
  },

  async getCommitLog(maxCount: number = 30, targetRoot?: string): Promise<GitCommitItem[]> {
    const root = targetRoot || getActiveWorkspacePath() || undefined;

    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.getLog) {
      return await window.electronAPI.git.getLog({ maxCount, root });
    }

    // 2. HTTP Backend
    const query = `?maxCount=${maxCount}${root ? `&root=${encodeURIComponent(root)}` : ''}`;
    return await fetchGitApi<GitCommitItem[]>(`/log${query}`);
  },

  async clone(url: string, targetPath?: string, directoryName?: string): Promise<void> {
    // 1. Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI?.git?.clone) {
      await window.electronAPI.git.clone({ url, targetPath, directoryName });
      return;
    }

    // 2. HTTP Backend
    await fetchGitApi<{ status: string }>('/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, targetPath, directoryName })
    });
  }
};
