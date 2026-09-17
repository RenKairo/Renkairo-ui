import { UserProfile, useAuthStore } from '../store/authStore';

const AUTH_API_BASE = 'http://localhost:8080/api/v1/auth';

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
      const response = await fetch(`${AUTH_API_BASE}/login`, {
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
      // Offline fallback / demo mode if Spring Boot backend is not running
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        console.warn('Shiro Auth Backend offline, attempting local login mode...');
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
      throw err;
    }
  },

  async register(username: string, email: string, password: string, role = 'DEVELOPER'): Promise<AuthResponsePayload> {
    try {
      const response = await fetch(`${AUTH_API_BASE}/register`, {
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
        console.warn('Shiro Auth Backend offline, attempting local register mode...');
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
      throw err;
    }
  },

  async getMe(): Promise<UserProfile | null> {
    const token = useAuthStore.getState().token;
    if (!token) return null;

    try {
      const response = await fetch(`${AUTH_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return useAuthStore.getState().user;
    }
  }
};
