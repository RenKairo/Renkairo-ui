export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[] | null;
  gitStatus?: 'M' | 'U' | 'A' | 'D' | 'unmodified';
}

export interface TabItem {
  id: string;
  title: string;
  path: string;
  content: string;
  isDirty: boolean;
  language: string;
  size?: number;
  isBinary?: boolean;
  tier?: 'small' | 'medium' | 'large' | 'huge';
  truncated?: boolean;
  totalSize?: number;
  mimeType?: string;
  isDiff?: boolean;
  diffOriginal?: string;
  diffModified?: string;
  diffStaged?: boolean;
  diffStatus?: string;
}

export interface GitFileStatus {
  path: string;
  status: string; // 'M' | 'A' | 'D' | 'R' | 'U' | 'C' | '??'
  oldPath?: string;
}

export interface GitStatusResult {
  isRepo: boolean;
  rootPath: string;
  branch: string;
  upstream: string;
  ahead: number;
  behind: number;
  remoteUrl: string;
  githubUrl: string | null;
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: GitFileStatus[];
  conflicts: GitFileStatus[];
  totalChanges: number;
}

export interface GitDiffResult {
  filePath: string;
  staged: boolean;
  original: string;
  modified: string;
  diffText: string;
}

export interface GitBranchItem {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  upstream?: string;
}

export interface GitBranchResult {
  current: string;
  branches: GitBranchItem[];
}

export interface GitRemoteItem {
  name: string;
  fetchUrl: string;
  pushUrl: string;
  githubUrl?: string | null;
}

export interface GitCommitItem {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

export type ThemeMode = 'dark' | 'light';

export type ActivityView = 
  | 'explorer' 
  | 'search' 
  | 'git' 
  | 'remote' 
  | 'docker' 
  | 'resources' 
  | 'logs' 
  | 'team' 
  | 'settings';

export type TerminalTab = 'TERMINAL' | 'PROBLEMS' | 'OUTPUT' | 'DEBUG CONSOLE' | 'PORTS';

export type RightSidebarTab = 'OVERVIEW' | 'SERVERS' | 'DOCKER' | 'COMPUTE';

export interface SystemMetrics {
  timestamp: number;
  hostname?: string;
  osName?: string;
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  ram: {
    usage: number;
    used_gb: number;
    total_gb: number;
  };
  gpu: {
    model: string;
    usage: number;
    vram_used_gb: number;
    vram_total_gb: number;
    vram_percent: number;
  };
  storage: {
    percent: number;
    used_gb: number;
    total_gb: number;
  };
  network: {
    mbps: number;
    percent: number;
  };
}

export interface ProblemItem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  col: number;
  message: string;
  code: string;
}

export interface WorkloadItem {
  id: string;
  name: string;
  status: 'In Progress' | 'Queued' | 'Completed' | 'Failed';
  framework: string;
  target: string;
  progress: number;
}

export interface RecentWorkspace {
  name: string;
  path: string;
  lastOpened: number;
}

export interface QuickPlace {
  name: string;
  path: string;
  icon: string;
}

export interface SystemDrive {
  name: string;
  path: string;
}

export interface FolderBrowseResult {
  currentPath: string;
  parentPath: string | null;
  folders: { name: string; path: string; is_dir: boolean }[];
  drives: SystemDrive[];
  quickPlaces: QuickPlace[];
}

export interface ClipboardItem {
  path: string;
  isDir: boolean;
  action: 'copy' | 'cut';
}

export interface ServerEndpoint {
  id: string;
  name: string;
  port: number;
  url: string;
  status: 'online' | 'offline';
  latencyMs?: number;
  type: string;
}

export interface DockerContainerInfo {
  id: string;
  name: string;
  image: string;
  ports: string;
  status: string;
  created: string;
  state: string;
}

export interface ComputeMetrics {
  cores: { id: number; model: string; speed: number; usage: number }[];
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number };
  loadAvg: number[];
  platform: string;
  arch: string;
  uptime: number;
  osRelease: string;
}

export interface GitBranchInfo {
  name: string;
  current?: boolean;
  isCurrent?: boolean;
  isRemote?: boolean;
}

export interface GitCommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}



