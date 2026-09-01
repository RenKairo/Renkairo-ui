import { create } from 'zustand';
import { 
  GitBranchItem, 
  GitCommitItem, 
  GitStatusResult, 
  TabItem 
} from '../types/ide';
import { gitService } from '../services/gitService';
import { useIDEStore } from './ideStore';

interface GitState {
  gitStatus: GitStatusResult | null;
  isLoading: boolean;
  isSyncing: boolean;
  isCommitting: boolean;
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  isAmend: boolean;
  setIsAmend: (val: boolean) => void;
  branches: GitBranchItem[];
  commitLog: GitCommitItem[];
  isLogOpen: boolean;
  setIsLogOpen: (open: boolean) => void;
  error: string | null;
  successMessage: string | null;
  clearMessages: () => void;

  // Primary Actions
  refreshGitStatus: () => Promise<void>;
  stageFile: (filePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  unstageAll: () => Promise<void>;
  discardFile: (filePath: string, isUntracked?: boolean) => Promise<void>;
  discardAll: () => Promise<void>;
  commit: () => Promise<boolean>;
  push: (setUpstream?: boolean) => Promise<boolean>;
  pull: () => Promise<boolean>;
  sync: () => Promise<boolean>;
  fetch: () => Promise<void>;
  initRepo: (initialBranch?: string) => Promise<void>;
  switchBranch: (branch: string) => Promise<void>;
  createBranch: (branch: string, startPoint?: string) => Promise<void>;
  loadBranches: () => Promise<void>;
  loadCommitLog: () => Promise<void>;
  openDiffTab: (filePath: string, staged?: boolean, status?: string) => Promise<void>;
  addRemote: (name: string, url: string) => Promise<void>;
  cloneRepo: (url: string, targetPath?: string, directoryName?: string) => Promise<void>;
  updateActiveDiffTabs: (filePath: string) => Promise<void>;
}

function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.cjs') || lower.endsWith('.mjs')) return 'javascript';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'yaml';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'css';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.ps1')) return 'shell';
  if (lower.endsWith('.sql')) return 'sql';
  if (lower.endsWith('.rs')) return 'rust';
  if (lower.endsWith('.go')) return 'go';
  if (lower.endsWith('.java')) return 'java';
  if (lower.endsWith('.c') || lower.endsWith('.cpp') || lower.endsWith('.h')) return 'cpp';
  return 'plaintext';
}

export const useGitStore = create<GitState>((set, get) => ({
  gitStatus: null,
  isLoading: false,
  isSyncing: false,
  isCommitting: false,
  commitMessage: '',
  setCommitMessage: (msg) => set({ commitMessage: msg }),
  isAmend: false,
  setIsAmend: (val) => set({ isAmend: val }),
  branches: [],
  commitLog: [],
  isLogOpen: false,
  setIsLogOpen: (open) => set({ isLogOpen: open }),
  error: null,
  successMessage: null,
  clearMessages: () => set({ error: null, successMessage: null }),

  refreshGitStatus: async () => {
    const ideState = useIDEStore.getState();
    const wsPath = ideState.workspacePath;
    if (!wsPath) {
      set({ gitStatus: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const status = await gitService.getStatus(wsPath);
      set({ gitStatus: status, isLoading: false });
    } catch (err: any) {
      console.warn('[Git Store] Failed to fetch git status:', err.message);
      set({
        gitStatus: {
          isRepo: false,
          rootPath: wsPath,
          branch: '',
          upstream: '',
          ahead: 0,
          behind: 0,
          remoteUrl: '',
          githubUrl: null,
          staged: [],
          unstaged: [],
          untracked: [],
          conflicts: [],
          totalChanges: 0
        },
        isLoading: false
      });
    }
  },

  stageFile: async (filePath: string) => {
    try {
      set({ error: null });
      const status = await gitService.stage([filePath]);
      set({ gitStatus: status });
      // Update any open diff tab if present
      get().updateActiveDiffTabs(filePath);
    } catch (err: any) {
      set({ error: err.message || 'Failed to stage file' });
    }
  },

  stageAll: async () => {
    try {
      set({ error: null });
      const status = await gitService.stage(['*']);
      set({ gitStatus: status });
    } catch (err: any) {
      set({ error: err.message || 'Failed to stage all files' });
    }
  },

  unstageFile: async (filePath: string) => {
    try {
      set({ error: null });
      const status = await gitService.unstage([filePath]);
      set({ gitStatus: status });
      get().updateActiveDiffTabs(filePath);
    } catch (err: any) {
      set({ error: err.message || 'Failed to unstage file' });
    }
  },

  unstageAll: async () => {
    try {
      set({ error: null });
      const status = await gitService.unstage(['*']);
      set({ gitStatus: status });
    } catch (err: any) {
      set({ error: err.message || 'Failed to unstage all files' });
    }
  },

  discardFile: async (filePath: string, isUntracked: boolean = false) => {
    try {
      set({ error: null });
      const status = await gitService.discard([filePath], isUntracked);
      set({ gitStatus: status });
      
      // Refresh IDE file tree and tabs
      await useIDEStore.getState().refreshTree();
    } catch (err: any) {
      set({ error: err.message || 'Failed to discard changes' });
    }
  },

  discardAll: async () => {
    try {
      set({ error: null });
      const status = await gitService.discard(['*'], false);
      set({ gitStatus: status });
      await useIDEStore.getState().refreshTree();
    } catch (err: any) {
      set({ error: err.message || 'Failed to discard all changes' });
    }
  },

  commit: async () => {
    const { commitMessage, isAmend, gitStatus } = get();
    if (!commitMessage.trim()) {
      set({ error: 'Please provide a commit message' });
      return false;
    }

    const hasStaged = Boolean(gitStatus && gitStatus.staged.length > 0);
    const hasUnstaged = Boolean(gitStatus && (gitStatus.unstaged.length > 0 || gitStatus.untracked.length > 0));

    if (!hasStaged && !hasUnstaged && !isAmend) {
      set({ error: 'No changes to commit' });
      return false;
    }

    const stageAll = !hasStaged && hasUnstaged;

    set({ isCommitting: true, error: null });
    try {
      const status = await gitService.commit(commitMessage, isAmend, stageAll);
      set({
        gitStatus: status,
        commitMessage: '',
        isAmend: false,
        isCommitting: false,
        successMessage: `Committed successfully: "${commitMessage.slice(0, 40)}${commitMessage.length > 40 ? '...' : ''}"`
      });
      // Refresh log
      get().loadCommitLog();
      return true;
    } catch (err: any) {
      set({ isCommitting: false, error: err.message || 'Commit failed' });
      return false;
    }
  },

  push: async (setUpstream: boolean = false) => {
    set({ isSyncing: true, error: null });
    try {
      const status = await gitService.push({ setUpstream });
      set({ 
        gitStatus: status, 
        isSyncing: false, 
        successMessage: 'Pushed changes to remote successfully' 
      });
      return true;
    } catch (err: any) {
      set({ isSyncing: false, error: err.message || 'Push failed. Check remote and permissions.' });
      return false;
    }
  },

  pull: async () => {
    set({ isSyncing: true, error: null });
    try {
      const status = await gitService.pull();
      set({ 
        gitStatus: status, 
        isSyncing: false, 
        successMessage: 'Pulled latest changes from remote' 
      });
      await useIDEStore.getState().refreshTree();
      return true;
    } catch (err: any) {
      set({ isSyncing: false, error: err.message || 'Pull failed. Check network or merge conflicts.' });
      return false;
    }
  },

  sync: async () => {
    set({ isSyncing: true, error: null });
    try {
      // 1. Pull first
      await gitService.pull();
      // 2. Then push
      const status = await gitService.push();
      set({ 
        gitStatus: status, 
        isSyncing: false, 
        successMessage: 'Synchronized with remote branch' 
      });
      await useIDEStore.getState().refreshTree();
      return true;
    } catch (err: any) {
      // If regular push failed, try with fetch
      try {
        const status = await gitService.fetch();
        set({ gitStatus: status, isSyncing: false, error: err.message || 'Sync failed' });
      } catch (e) {
        set({ isSyncing: false, error: err.message || 'Sync failed' });
      }
      return false;
    }
  },

  fetch: async () => {
    set({ isSyncing: true, error: null });
    try {
      const status = await gitService.fetch();
      set({ gitStatus: status, isSyncing: false, successMessage: 'Fetched remote updates' });
    } catch (err: any) {
      set({ isSyncing: false, error: err.message || 'Fetch failed' });
    }
  },

  initRepo: async (initialBranch: string = 'main') => {
    set({ isLoading: true, error: null });
    try {
      const status = await gitService.init(initialBranch);
      set({ 
        gitStatus: status, 
        isLoading: false, 
        successMessage: `Initialized Git repository (${initialBranch})` 
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to initialize Git repository' });
    }
  },

  switchBranch: async (branch: string) => {
    set({ isLoading: true, error: null });
    try {
      const status = await gitService.checkout({ branch, createNew: false });
      set({ 
        gitStatus: status, 
        isLoading: false, 
        successMessage: `Switched to branch "${branch}"` 
      });
      await useIDEStore.getState().refreshTree();
      get().loadBranches();
    } catch (err: any) {
      set({ isLoading: false, error: err.message || `Failed to switch to branch ${branch}` });
    }
  },

  createBranch: async (branch: string, startPoint?: string) => {
    set({ isLoading: true, error: null });
    try {
      const status = await gitService.checkout({ branch, createNew: true, startPoint });
      set({ 
        gitStatus: status, 
        isLoading: false, 
        successMessage: `Created and checked out branch "${branch}"` 
      });
      await useIDEStore.getState().refreshTree();
      get().loadBranches();
    } catch (err: any) {
      set({ isLoading: false, error: err.message || `Failed to create branch ${branch}` });
    }
  },

  loadBranches: async () => {
    try {
      const result = await gitService.getBranches();
      set({ branches: result.branches });
    } catch (err) {}
  },

  loadCommitLog: async () => {
    try {
      const log = await gitService.getCommitLog(40);
      set({ commitLog: log });
    } catch (err) {}
  },

  openDiffTab: async (filePath: string, staged: boolean = false, status?: string) => {
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    const diffId = `diff_${staged ? 'staged' : 'working'}_${filePath}`;
    const ideStore = useIDEStore.getState();

    const existing = ideStore.tabs.find((t) => t.id === diffId);
    if (existing) {
      ideStore.setActiveTabId(existing.id);
      return;
    }

    try {
      const diffData = await gitService.getDiff(filePath, staged);
      const language = detectLanguage(fileName);

      const diffTab: TabItem = {
        id: diffId,
        title: `${fileName} (${staged ? 'Index ↔ HEAD' : 'Working Tree'})`,
        path: filePath,
        content: diffData.modified,
        isDirty: false,
        language,
        isDiff: true,
        diffOriginal: diffData.original,
        diffModified: diffData.modified,
        diffStaged: staged,
        diffStatus: status || 'M',
        size: diffData.modified.length,
        isBinary: false,
        tier: 'small'
      };

      useIDEStore.setState({
        tabs: [...ideStore.tabs, diffTab],
        activeTabId: diffTab.id
      });
    } catch (err: any) {
      console.error('[Git Store] Failed opening diff tab:', err);
    }
  },

  addRemote: async (name: string, url: string) => {
    set({ isLoading: true, error: null });
    try {
      await gitService.addRemote(name, url);
      await get().refreshGitStatus();
      set({ isLoading: false, successMessage: `Added remote "${name}" (${url})` });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to add remote' });
    }
  },

  cloneRepo: async (url: string, targetPath?: string, directoryName?: string) => {
    set({ isLoading: true, error: null });
    try {
      await gitService.clone(url, targetPath, directoryName);
      set({ isLoading: false, successMessage: `Cloned repository successfully` });
      await useIDEStore.getState().openFolder();
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to clone repository' });
    }
  },

  // Helper to refresh diff tab contents if active
  updateActiveDiffTabs: async (filePath: string) => {
    const ideStore = useIDEStore.getState();
    const diffTabs = ideStore.tabs.filter((t) => t.isDiff && t.path === filePath);
    for (const tab of diffTabs) {
      try {
        const diffData = await gitService.getDiff(filePath, !!tab.diffStaged);
        useIDEStore.setState({
          tabs: ideStore.tabs.map((t) =>
            t.id === tab.id
              ? { ...t, diffOriginal: diffData.original, diffModified: diffData.modified, content: diffData.modified }
              : t
          )
        });
      } catch (e) {}
    }
  }
}));
