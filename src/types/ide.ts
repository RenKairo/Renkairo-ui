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
  | 'team' 
  | 'settings'
  | 'rdtp';

export type TerminalTab = 'TERMINAL' | 'PROBLEMS' | 'OUTPUT' | 'DEBUG CONSOLE' | 'PORTS';

export interface ForwardedPortInfo {
  remotePort: number;
  localPort: number;
  reallocated?: boolean;
  hasCollision?: boolean;
  url: string;
  status: 'forwarded' | 'listening' | 'error';
  serviceName?: string;
  createdAt?: string;
}

export type RightSidebarTab = 'OVERVIEW' | 'SERVERS' | 'DOCKER' | 'COMPUTE' | 'RDTP_TELEMETRY';

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
export interface SSHConnectionConfig {
  host: string;
  user: string;
  port?: number;
  workspaceId?: string;
  workspaceName?: string;
  password?: string;
  token?: string;
  userId?: string;
  accountUsername?: string;
  userRole?: string;
  authHeader?: string;
}

export type TerminalExecutionMode = 'local' | 'remote';

export interface TerminalSessionRequest {
  id: string;
  shellType: 'powershell' | 'cmd' | 'python' | 'node' | 'bash' | 'ssh' | string;
  name?: string;
  sshConfig?: SSHConnectionConfig;
  executionMode?: TerminalExecutionMode;
}

// ----------------------------------------------------
// RDTP (Real-Time Distributed Training Protocol) Types
// ----------------------------------------------------
export interface RDTPTiming {
  tPrepMs: number;
  tNetMs: number;
  tDmaMs: number;
  tGpuMs: number;
}

export interface Theorem1AuditResult {
  workload: string;
  batchSize: number;
  uplinkMbps: number;
  rawTensorBytes: number;
  wirePayloadBytes: number;
  bloatRatio: number;
  timings: RDTPTiming;
  isComputeBound: boolean;
  bottleneckStage: 'CPU_PREPROCESS' | 'WAN_NETWORK' | 'PCIE_DMA' | 'GPU_COMPUTE' | string;
  sustainableThroughputBatchesPerSec: number;
  predictedGpuDutyCyclePct: number;
  recommendation: string;
}

export interface RDTPSessionConfig {
  isActive: boolean;
  workload: string;
  targetEndpoint: string;
  batchSize: number;
  bufferDepth: number;
  codec: 'jpeg' | 'webp' | 'uint16' | 'raw_fp32' | string;
  uplinkMbps: number;
  dataSource: string;
  startedAt?: number | null;
}

export interface RDTPTelemetryData {
  totalBatchesSent: number;
  totalBytesSent: number;
  currentCredits: number;
  maxBufferDepth: number;
  currentBufferOccupancy: number;
  measuredUplinkMbps: number;
  measuredGpuDutyCyclePct: number;
  measuredThroughputFps: number;
  accumulatedIdleDollarsSaved: number;
  currentEpoch: number;
  currentLoss: number;
  pipelineState: 'IDLE' | 'COMPUTE_BOUND' | 'IO_BOUND';
  limitingStage: string;
  timings: RDTPTiming;
}

export interface RDTPSessionStatus {
  session: RDTPSessionConfig;
  telemetry: RDTPTelemetryData;
  theorem1: Theorem1AuditResult;
}

export interface RDTPStageLogEntry {
  id: string;
  timestamp: string;
  stage: 'EDGE_PREPROCESS' | 'WAN_TRANSPORT' | 'RING_BUFFER_STAGING' | 'ACCELERATOR_KERNEL' | 'CREDIT_ACK';
  where: string;
  what: string;
  durationMs: number;
  details?: Record<string, any>;
}

export interface RDTPBenchmarkBaseline {
  name: string;
  totalWallClockSec: number;
  uploadWaitSec?: number;
  computeSec: number;
  gpuDutyCyclePct: number;
  timeToFirstStepSec: number;
  totalCostDollars: number;
  idleCostWasted?: number;
}

export interface RDTPBenchmarkResult {
  workload: string;
  batchCount: number;
  uplinkMbps: number;
  codec: string;
  bufferDepth: number;
  baselines: {
    rawUploadFirst?: RDTPBenchmarkBaseline;
    s3UploadFirst: RDTPBenchmarkBaseline;
    syncStreaming: RDTPBenchmarkBaseline;
    rdtp: RDTPBenchmarkBaseline;
  };
  improvements: {
    speedupVsRaw?: string;
    speedupVsS3: string;
    speedupVsSync: string;
    wallClockReductionPct: number;
    ttfsImprovement: string;
    dollarsSaved: number;
    percentCostSaved: number;
  };
  cpuSimulationProof: {
    cpuGemmFeasible: boolean;
    methodology: string;
    dutyCycleFormula: string;
    overlapEquation: string;
  };
}
