import { create } from 'zustand';
import { createUserDatabase } from '../database';
import { storeAuthState, getStoredAuthState, clearAuthState } from '../utils/session';
import type { UserSession } from '../types';
import { useTaskStore } from './taskStore';

interface AuthStore {
  userSession: UserSession | null;
  isLoading: boolean;
  error: string | null;
  
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeUser: (userId: string) => Promise<void>;
  clearError: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  userSession: null,
  isLoading: false,
  error: null,
  
  login: async (userName: string) => {
    if (!userName.trim()) {
      set({ error: 'User name cannot be empty' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      await get().initializeUser(userName.trim());
      
      /* Store complete auth state to localStorage */
      const authState = {
        userId: userName.trim(),
        isAuthenticated: true,
        timestamp: Date.now()
      };
      storeAuthState(authState);
      
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false 
      });
    }
  },
  
  logout: async () => {
    const session = get().userSession;
    
    if (session?.database) {
      await session.database.close();
    }
    
    /* Clear complete auth state from localStorage */
    clearAuthState();
    
    /* Reset task store */
    useTaskStore.getState().reset();
    
    set({
      userSession: null,
      error: null
    });
  },
  
  initializeUser: async (userName: string) => {
    try {
      const database = await createUserDatabase(userName);
      
      set({
        userSession: {
          userId: userName,
          database,
          isActive: true
        }
      });
    } catch (error) {
      throw new Error(`Failed to initialize user database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  
  clearError: () => {
    set({ error: null });
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
        set({ 
          error: 'Failed to restore session - database issue',
          isLoading: false 
        });
        /* DO NOT clear localStorage - user is still authenticated, just database issue */
      }
    }
  }
}));
