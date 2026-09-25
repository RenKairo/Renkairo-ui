export const BACKEND_URL_STORAGE_KEY = 'renkairo_backend_url';
export const DEFAULT_BACKEND_URL = 'http://localhost:8080';

// Global listeners for dynamic backend URL changes across the React tree
type BackendUrlChangeListener = (url: string) => void;
const listeners = new Set<BackendUrlChangeListener>();

export function getBackendBaseUrl(): string {
  try {
    const saved = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch (e) {}
  return DEFAULT_BACKEND_URL;
}

export function setBackendBaseUrl(rawUrl: string): string {
  let normalized = (rawUrl || '').trim();
  if (!normalized) {
    normalized = DEFAULT_BACKEND_URL;
  }
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  normalized = normalized.replace(/\/+$/, '');

  try {
    localStorage.setItem(BACKEND_URL_STORAGE_KEY, normalized);
  } catch (e) {}

  listeners.forEach((listener) => {
    try {
      listener(normalized);
    } catch (err) {}
  });

  return normalized;
}

export function subscribeBackendUrlChange(listener: BackendUrlChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthApiUrl(): string {
  return `${getBackendBaseUrl()}/api/v1/auth`;
}

export function getProjectApiUrl(): string {
  return `${getBackendBaseUrl()}/api/v1`;
}

export function getWorkspaceApiUrl(): string {
  return `${getBackendBaseUrl()}/api/v1`;
}

export function getWorkspaceWsUrl(workspaceId: string): string {
  const httpUrl = getBackendBaseUrl();
  const wsProtocol = httpUrl.startsWith('https://') ? 'wss://' : 'ws://';
  const host = httpUrl.replace(/^https?:\/\//i, '');
  return `${wsProtocol}${host}/ws/workspace/${encodeURIComponent(workspaceId)}`;
}

export function getAuthHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem('renkairo_jwt_token');
    if (token && token.trim()) {
      return { Authorization: `Bearer ${token.trim()}` };
    }
  } catch (e) {}
  return {};
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  try {
    const token = localStorage.getItem('renkairo_jwt_token');
    if (token && token.trim() && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token.trim()}`);
    }
  } catch (e) {}

  const res = await fetch(input, {
    ...init,
    headers
  });

  if (res.status === 401) {
    console.warn(`[RenKairo Auth] 401 Unauthorized from ${input.toString()}`);
  }

  return res;
}

export interface BackendConnectionTestResult {
  ok: boolean;
  serverReachable: boolean;
  tokenValid: boolean;
  status?: number;
  latencyMs: number;
  serverUrl: string;
  user?: any;
  message?: string;
  error?: string;
}

export async function testBackendHttpConnection(
  targetUrl: string,
  token?: string | null
): Promise<BackendConnectionTestResult> {
  let url = (targetUrl || '').trim();
  if (!url) url = DEFAULT_BACKEND_URL;
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, '');

  const startTime = Date.now();
  const isMockToken = token === 'renkairo-mock-jwt-token-local-dev-mode';

  // Step 1: Reachability check via public endpoint /api/cloud/resources
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const pingRes = await fetch(`${url}/api/cloud/resources`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    // Server responded! It is online and running
    if (token && !isMockToken) {
      // Step 2: Validate the token via /api/v1/auth/me
      try {
        const authController = new AbortController();
        const authTimeoutId = setTimeout(() => authController.abort(), 6000);

        const authRes = await fetch(`${url}/api/v1/auth/me`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          signal: authController.signal
        });
        clearTimeout(authTimeoutId);

        if (authRes.ok) {
          let user: any = null;
          try {
            user = await authRes.json();
          } catch (e) {}

          return {
            ok: true,
            serverReachable: true,
            tokenValid: true,
            status: authRes.status,
            latencyMs,
            serverUrl: url,
            user,
            message: `Connected & Authenticated as ${user?.username || 'user'} (${latencyMs}ms)`
          };
        } else {
          return {
            ok: true,
            serverReachable: true,
            tokenValid: false,
            status: authRes.status,
            latencyMs,
            serverUrl: url,
            message: `Server online (${latencyMs}ms)! Current session is not authorized on this instance. Please sign in.`
          };
        }
      } catch (authErr) {
        return {
          ok: true,
          serverReachable: true,
          tokenValid: false,
          latencyMs,
          serverUrl: url,
          message: `Server online (${latencyMs}ms)! Authentication check failed. Please sign in.`
        };
      }
    }

    // Server is reachable, but user is unauthenticated or has mock token
    return {
      ok: true,
      serverReachable: true,
      tokenValid: false,
      status: pingRes.status,
      latencyMs,
      serverUrl: url,
      message: isMockToken
        ? `Server online (${latencyMs}ms)! Local mock account detected — sign in to authenticate on this server.`
        : `Server online (${latencyMs}ms)! Please sign in or register to authenticate.`
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let message = err.message || 'Connection refused';
    if (err.name === 'AbortError') {
      message = 'Connection timed out after 6 seconds';
    }
    return {
      ok: false,
      serverReachable: false,
      tokenValid: false,
      latencyMs,
      serverUrl: url,
      error: `Could not connect to ${url}. ${message}. Check that shiro-backend is running on port 8080 and accessible over your network.`
    };
  }
}
