import { Workspace, LaunchWorkspacePayload } from '../types/workspace';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export const workspaceService = {
  async launchWorkspace(payload: LaunchWorkspacePayload): Promise<Workspace> {
    const res = await fetch(`${API_BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to launch workspace');
    return res.json();
  },

  async getProjectWorkspaces(projectId: string): Promise<Workspace[]> {
    const res = await fetch(`${API_BASE_URL}/workspaces/project/${projectId}`);
    if (!res.ok) throw new Error('Failed to fetch project workspaces');
    return res.json();
  },

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`);
    if (!res.ok) throw new Error('Failed to fetch workspace');
    return res.json();
  },

  async stopWorkspace(workspaceId: string): Promise<Workspace> {
    const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/stop`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to stop workspace');
    return res.json();
  },
};
