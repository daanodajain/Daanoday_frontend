import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, Store } from '@/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  currentStore: Store | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Session Management
  isSessionWarningVisible: boolean;
  remainingTime: number;
  lastActivityTime: number;
  isSessionActive: boolean;
}

interface AuthActions {
  setAuth: (user: AuthUser, token: string, refreshToken: string) => void;
  setCurrentStore: (store: Store) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  // Session Management
  setSessionWarningVisible: (visible: boolean) => void;
  setRemainingTime: (time: number) => void;
  setLastActivityTime: (time: number) => void;
  setSessionActive: (active: boolean) => void;
  resetSession: () => void;
  extendSession: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      currentStore: null,
      isAuthenticated: false,
      isLoading: false,
      // Session Management
      isSessionWarningVisible: false,
      remainingTime: 0,
      lastActivityTime: Date.now(),
      isSessionActive: false,

      setAuth: (user, token, refreshToken) => {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          currentStore: user.stores?.[0] || null,
          // Reset session state on login
          isSessionWarningVisible: false,
          remainingTime: 0,
          lastActivityTime: Date.now(),
          isSessionActive: true,
        });
      },

      setCurrentStore: async (store) => {
        set({ currentStore: store });
      },

      logout: async () => {
        const { token } = get();
        try {
          if (token) {
            const { apiService } = await import('@/services/api');
            await apiService.logout();
          }
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          // Clear all state
          set({
            user: null,
            token: null,
            refreshToken: null,
            currentStore: null,
            isAuthenticated: false,
            // Reset session state on logout
            isSessionWarningVisible: false,
            remainingTime: 0,
            lastActivityTime: Date.now(),
            isSessionActive: false,
          });
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },

      // Session Management Actions
      setSessionWarningVisible: (visible) => {
        set({ isSessionWarningVisible: visible });
      },

      setRemainingTime: (time) => {
        set({ remainingTime: time });
      },

      setLastActivityTime: (time) => {
        set({ lastActivityTime: time });
      },

      setSessionActive: (active) => {
        set({ isSessionActive: active });
      },

      resetSession: () => {
        set({
          isSessionWarningVisible: false,
          remainingTime: 15 * 60 * 1000, // 15 minutes
          lastActivityTime: Date.now(),
          isSessionActive: true,
        });
      },

      extendSession: () => {
        set({
          isSessionWarningVisible: false,
          lastActivityTime: Date.now(),
          isSessionActive: true,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        currentStore: state.currentStore,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
