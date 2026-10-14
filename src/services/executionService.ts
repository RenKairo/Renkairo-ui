import { getExecutionApiUrl, authFetch } from './apiConfig';

export interface ExecutionRequestPayload {
  code: string;
  language?: string;
  filePath?: string;
  workspaceId?: string;
  provider?: string;
  useGpu?: boolean;
  timeoutSeconds?: number;
}

export interface ExecutionResponseResult {
  executionId: string;
  language: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  timestamp: string;
  providerUsed: string;
  gpuUsed: boolean;
}

export const executionService = {
  async runCode(payload: ExecutionRequestPayload): Promise<ExecutionResponseResult> {
    const res = await authFetch(`${getExecutionApiUrl()}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ...payload,
        timeoutSeconds: payload.timeoutSeconds || 30
      })
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch (e) {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  async getSupportedLanguages(): Promise<string[]> {
    const res = await authFetch(`${getExecutionApiUrl()}/languages`);
    if (!res.ok) {
      throw new Error(`Failed to fetch supported languages (HTTP ${res.status})`);
    }
    return await res.json();
  }
};
