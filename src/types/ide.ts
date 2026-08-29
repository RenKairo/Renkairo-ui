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
}

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
