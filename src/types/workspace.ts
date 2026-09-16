export type WorkspaceStatus = 'PENDING' | 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'FAILED';

export interface Workspace {
  workspaceId: string;
  projectId: string;
  userId: string;
  storageId: string;
  runtime: string;
  cpuCores: number;
  memoryGb: number;
  gpuCount: number;
  status: WorkspaceStatus;
  assignedNode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaunchWorkspacePayload {
  projectId: string;
  userId: string;
  runtime: string;
  cpuCores: number;
  memoryGb: number;
  gpuCount: number;
}

export type GatewayEventType =
  | 'file_change'
  | 'file_event'
  | 'terminal_input'
  | 'terminal_output'
  | 'run_command'
  | 'workspace_status';

export interface WorkspaceGatewayEvent {
  type: GatewayEventType;
  workspaceId: string;
  data?: any;
  path?: string;
  content?: string;
  status?: WorkspaceStatus;
}
