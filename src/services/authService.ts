import { UserProfile, useAuthStore } from '../store/authStore';
import { getAuthApiUrl, getBackendBaseUrl } from './apiConfig';

export interface AuthResponsePayload {
  token: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}

export const authService = {
  async login(usernameOrEmail: string, password: string): Promise<AuthResponsePayload> {
    try {
      const response = await fetch(`${getAuthApiUrl()}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernameOrEmail,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Invalid username or password.');
      }

      useAuthStore.getState().setAuth(data.user, data.token);
      return data;
    } catch (err: any) {
      // Offline fallback / demo mode ONLY if running locally
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        const currentUrl = getBackendBaseUrl();
        const isLocal = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1');

        if (isLocal) {
          console.warn('Shiro Auth Backend offline on localhost, attempting local login mode...');
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long.');
          }
          const mockUser: UserProfile = {
            userId: 'usr_demo_88',
            username: usernameOrEmail.includes('@') ? usernameOrEmail.split('@')[0] : usernameOrEmail,
            email: usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@renkairo.io`,
            role: 'PRINCIPAL_ENGINEER',
            createdAt: new Date().toISOString()
          };
          const mockToken = 'renkairo-mock-jwt-token-local-dev-mode';
          useAuthStore.getState().setAuth(mockUser, mockToken);
          return {
            token: mockToken,
            tokenType: 'Bearer',
            expiresIn: 86400,
            user: mockUser
          };
        }

        throw new Error(`Unable to reach remote Shiro backend at ${currentUrl}. Check server status, IP, and port 8080 firewall.`);
      }
      throw err;
    }
  },

  async register(username: string, email: string, password: string, role = 'DEVELOPER'): Promise<AuthResponsePayload> {
    try {
      const response = await fetch(`${getAuthApiUrl()}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          password,
          role
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      useAuthStore.getState().setAuth(data.user, data.token);
      return data;
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        const currentUrl = getBackendBaseUrl();
        const isLocal = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1');

        if (isLocal) {
          console.warn('Shiro Auth Backend offline on localhost, attempting local register mode...');
          const mockUser: UserProfile = {
            userId: 'usr_' + Math.random().toString(36).substring(2, 8),
            username,
            email,
            role,
            createdAt: new Date().toISOString()
          };
          const mockToken = 'renkairo-mock-jwt-token-local-dev-mode';
          useAuthStore.getState().setAuth(mockUser, mockToken);
          return {
            token: mockToken,
            tokenType: 'Bearer',
            expiresIn: 86400,
            user: mockUser
          };
        }

        throw new Error(`Unable to reach remote Shiro backend at ${currentUrl}. Check server status, IP, and port 8080 firewall.`);
      }
      throw err;
    }
  },

  async getMe(): Promise<UserProfile | null> {
    const { token, user, ensureDevAuth } = useAuthStore.getState();
    const currentToken = token || ensureDevAuth().token;

    try {
      const response = await fetch(`${getAuthApiUrl()}/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      if (response.status === 401) {
        console.warn('Current JWT token unauthorized on backend. Preserving active developer session.');
        return user || ensureDevAuth().user;
      }
      if (!response.ok) return user || ensureDevAuth().user;
      return await response.json();
    } catch {
      return user || ensureDevAuth().user;
    }
  }
};
