import { create } from 'zustand';

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  role: string;
  createdAt?: string;
}

export const DEFAULT_DEV_USER: UserProfile = {
  userId: 'usr_dev_azhar',
  username: 'Azhar',
  email: 'azhar@renkairo.io',
  role: 'ADMIN',
  createdAt: new Date().toISOString()
};

export const DEFAULT_DEV_TOKEN = 'renkairo-shiro-secret-token';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  isLoading: boolean;
  authError: string | null;

  // Actions
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => void;
  setAuthModalOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  initAuth: () => void;
  ensureDevAuth: () => { user: UserProfile; token: string };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: DEFAULT_DEV_USER,
  token: DEFAULT_DEV_TOKEN,
  isAuthenticated: true,
  isAuthModalOpen: false,
  isLoading: false,
  authError: null,

  setAuth: (user, token) => {
    localStorage.setItem('renkairo_jwt_token', token);
    localStorage.setItem('renkairo_user', JSON.stringify(user));
    set({
      user,
      token,
      isAuthenticated: true,
      authError: null,
      isLoading: false
    });
  },

  logout: () => {
    // In developer mode, instead of leaving token empty, reset to default dev token
    localStorage.setItem('renkairo_jwt_token', DEFAULT_DEV_TOKEN);
    localStorage.setItem('renkairo_user', JSON.stringify(DEFAULT_DEV_USER));
    set({
      user: DEFAULT_DEV_USER,
      token: DEFAULT_DEV_TOKEN,
      isAuthenticated: true,
      authError: null,
      isLoading: false
    });
  },

  setAuthModalOpen: (open) => set({ isAuthModalOpen: open, authError: null }),

  setLoading: (loading) => set({ isLoading: loading }),

  setAuthError: (error) => set({ authError: error, isLoading: false }),

  initAuth: () => {
    try {
      const storedToken = localStorage.getItem('renkairo_jwt_token');
      const storedUser = localStorage.getItem('renkairo_user');
      if (storedToken && storedUser) {
        set({
          token: storedToken,
          user: JSON.parse(storedUser),
          isAuthenticated: true
        });
      } else {
        localStorage.setItem('renkairo_jwt_token', DEFAULT_DEV_TOKEN);
        localStorage.setItem('renkairo_user', JSON.stringify(DEFAULT_DEV_USER));
        set({
          token: DEFAULT_DEV_TOKEN,
          user: DEFAULT_DEV_USER,
          isAuthenticated: true
        });
      }
    } catch (e) {
      console.warn('Failed to restore auth session from localStorage', e);
      set({
        token: DEFAULT_DEV_TOKEN,
        user: DEFAULT_DEV_USER,
        isAuthenticated: true
      });
    }
  },

  ensureDevAuth: () => {
    const state = get();
    if (!state.token || !state.user || !state.isAuthenticated) {
      localStorage.setItem('renkairo_jwt_token', DEFAULT_DEV_TOKEN);
      localStorage.setItem('renkairo_user', JSON.stringify(DEFAULT_DEV_USER));
      set({
        token: DEFAULT_DEV_TOKEN,
        user: DEFAULT_DEV_USER,
        isAuthenticated: true
      });
      return { token: DEFAULT_DEV_TOKEN, user: DEFAULT_DEV_USER };
    }
    return { token: state.token, user: state.user };
  }
}));

