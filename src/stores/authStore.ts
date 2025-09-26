import { create } from 'zustand';
import { createUserDatabase } from '../database';
import { storeAuthState, getStoredAuthState, clearAuthState } from '../utils/session';
import { useDashboardStore } from './ui/dashboardStore';
import { useFloorPlanViewStore } from './ui/floorPlanViewStore';
import type { UserSession } from '../types';

export interface AuthState {
  userSession: UserSession | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  setUserSession: (session: UserSession | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeUser: (userId: string) => Promise<void>;
  restoreSession: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  userSession: null,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  setUserSession: session => set({ userSession: session }),

  setIsLoading: loading => set({ isLoading: loading }),

  setError: error => set({ error }),

  clearError: () => set({ error: null }),

  login: async (userName: string) => {
    if (!userName.trim()) {
      set({ error: 'User name cannot be empty' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      await get().initializeUser(userName.trim());

      storeAuthState({
        userId: userName.trim(),
        isAuthenticated: true,
        timestamp: Date.now(),
      });

      set({ isLoading: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      set({
        error: errorMsg,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    const session = get().userSession;

    if (session?.database) {
      await session.database.close();
    }

    useDashboardStore.getState().resetTasks();
    useFloorPlanViewStore.getState().resetTasks();

    clearAuthState();

    set({
      userSession: null,
      error: null,
    });
  },

  initializeUser: async (userName: string) => {
    try {
      const database = await createUserDatabase(userName);

      const userSession = {
        userId: userName,
        database,
        isActive: true,
      };

      set({ userSession });
    } catch (error) {
      throw new Error(
        `Failed to initialize user database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  restoreSession: async () => {
    const storedAuthState = getStoredAuthState();

    if (storedAuthState && storedAuthState.isAuthenticated) {
      set({ isLoading: true });

      try {
        await get().initializeUser(storedAuthState.userId);
        set({ isLoading: false });
      } catch (error) {
        console.error('Session restoration failed - database initialization error:', error);
        const errorMsg = 'Failed to restore session - database issue';
        set({
          error: errorMsg,
          isLoading: false,
        });
      }
    }
  },
}));

export const authStore = useAuthStore;
