export interface Project {
  projectId: string;
  userId: string;
  name: string;
  language: string;
  framework: string;
  runtime: string;
  createdAt: string;
}

export interface CreateProjectPayload {
  userId: string;
  name: string;
  language: string;
  framework: string;
  runtime: string;
}
