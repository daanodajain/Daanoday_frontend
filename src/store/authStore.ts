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
  isSuperAdmin: boolean;
  // Session Management
  isSessionWarningVisible: boolean;
  remainingTime: number;
  lastActivityTime: number;
  isSessionActive: boolean;
  // Inactivity lock (separate from full logout) — screen locks, user re-enters
  // password to resume without losing their place. Store-admin configured.
  isLocked: boolean;
  sessionTimeoutMinutes: number | null;
  inactivityLockMinutes: number | null;
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
  lockSession: () => void;
  unlockSession: () => void;
  setSessionTimeoutConfig: (sessionTimeoutMinutes: number | null, inactivityLockMinutes: number | null) => void;
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
      isSuperAdmin: false,
      // Session Management
      isSessionWarningVisible: false,
      remainingTime: 0,
      lastActivityTime: Date.now(),
      isSessionActive: false,
      isLocked: false,
      sessionTimeoutMinutes: null,
      inactivityLockMinutes: null,

      setAuth: (user, token, refreshToken) => {
        const isSuperAdmin = user.roles?.some((r: any) => r.name === 'SUPER_ADMIN') ?? false;
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isSuperAdmin,
          // SUPER_ADMIN has no store — set null, dashboard handles it
          currentStore: user.stores?.[0] || null,
          isSessionWarningVisible: false,
          remainingTime: 0,
          lastActivityTime: Date.now(),
          isSessionActive: true,
          isLocked: false,
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
          set({
            user: null,
            token: null,
            refreshToken: null,
            currentStore: null,
            isAuthenticated: false,
            isSuperAdmin: false,
            isSessionWarningVisible: false,
            remainingTime: 0,
            lastActivityTime: Date.now(),
            isSessionActive: false,
            isLocked: false,
            sessionTimeoutMinutes: null,
            inactivityLockMinutes: null,
          });
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      updateUser: (userData) => {
        const { user } = get();
        if (user) set({ user: { ...user, ...userData } });
      },

      setSessionWarningVisible: (visible) => set({ isSessionWarningVisible: visible }),
      setRemainingTime: (time) => set({ remainingTime: time }),
      setLastActivityTime: (time) => set({ lastActivityTime: time }),
      setSessionActive: (active) => set({ isSessionActive: active }),

      resetSession: () => {
        set({
          isSessionWarningVisible: false,
          remainingTime: 15 * 60 * 1000,
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

      lockSession: () => set({ isLocked: true }),
      unlockSession: () => set({ isLocked: false, lastActivityTime: Date.now() }),
      setSessionTimeoutConfig: (sessionTimeoutMinutes, inactivityLockMinutes) =>
        set({ sessionTimeoutMinutes, inactivityLockMinutes }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        currentStore: state.currentStore,
        isAuthenticated: state.isAuthenticated,
        isSuperAdmin: state.isSuperAdmin,
      }),
    }
  )
);
