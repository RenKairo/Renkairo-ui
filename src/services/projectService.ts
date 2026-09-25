import { Project, CreateProjectPayload } from '../types/project';
import { getProjectApiUrl, authFetch } from './apiConfig';

export const projectService = {
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    const res = await authFetch(`${getProjectApiUrl()}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async getUserProjects(userId: string): Promise<Project[]> {
    const res = await authFetch(`${getProjectApiUrl()}/projects/user/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch user projects');
    return res.json();
  },

  async getProject(projectId: string): Promise<Project> {
    const res = await authFetch(`${getProjectApiUrl()}/projects/${projectId}`);
    if (!res.ok) throw new Error('Failed to fetch project');
    return res.json();
  },

  async deleteProject(projectId: string): Promise<void> {
    const res = await authFetch(`${getProjectApiUrl()}/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },
};
