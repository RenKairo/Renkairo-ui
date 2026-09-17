import { create } from 'zustand';

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  role: string;
  createdAt?: string;
}

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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
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
    localStorage.removeItem('renkairo_jwt_token');
    localStorage.removeItem('renkairo_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
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
      }
    } catch (e) {
      console.warn('Failed to restore auth session from localStorage', e);
    }
  }
}));
