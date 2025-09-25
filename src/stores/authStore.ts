import { create } from 'zustand';
import { BehaviorSubject } from 'rxjs';
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

/* Enhanced store with RxJS capabilities */
interface AuthStoreWithRx extends AuthStore {
  /* RxJS observables for controlled reactivity */
  userSession$: BehaviorSubject<UserSession | null>;
  isLoading$: BehaviorSubject<boolean>;
  error$: BehaviorSubject<string | null>;

  /* Static snapshot access (non-reactive) */
  snapshot: {
    userSession: UserSession | null;
    isLoading: boolean;
    error: string | null;
  };

  /* Silent update methods (no reactive emission) */
  silentUpdate: (partial: Partial<Pick<AuthStore, 'userSession' | 'isLoading' | 'error'>>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  userSession: null,
  isLoading: false,
  error: null,

  login: async (userName: string) => {
    if (!userName.trim()) {
      set({ error: 'User name cannot be empty' });
      /* Update RxJS observables */
      authStoreRx.error$.next('User name cannot be empty');
      return;
    }

    set({ isLoading: true, error: null });
    /* Update RxJS observables */
    authStoreRx.isLoading$.next(true);
    authStoreRx.error$.next(null);

    try {
      await get().initializeUser(userName.trim());

      /* Store complete auth state to localStorage */
      const authState = {
        userId: userName.trim(),
        isAuthenticated: true,
        timestamp: Date.now(),
      };
      storeAuthState(authState);

      set({ isLoading: false });
      authStoreRx.isLoading$.next(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      set({
        error: errorMsg,
        isLoading: false,
      });
      authStoreRx.error$.next(errorMsg);
      authStoreRx.isLoading$.next(false);
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
      error: null,
    });

    /* Update RxJS observables */
    authStoreRx.userSession$.next(null);
    authStoreRx.error$.next(null);
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
      /* Update RxJS observables */
      authStoreRx.userSession$.next(userSession);
    } catch (error) {
      throw new Error(
        `Failed to initialize user database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  clearError: () => {
    set({ error: null });
    authStoreRx.error$.next(null);
  },

  restoreSession: async () => {
    const storedAuthState = getStoredAuthState();

    if (storedAuthState && storedAuthState.isAuthenticated) {
      set({ isLoading: true });
      authStoreRx.isLoading$.next(true);

      try {
        await get().initializeUser(storedAuthState.userId);
        set({ isLoading: false });
        authStoreRx.isLoading$.next(false);
      } catch (error) {
        console.error('Session restoration failed - database initialization error:', error);
        const errorMsg = 'Failed to restore session - database issue';
        set({
          error: errorMsg,
          isLoading: false,
        });
        authStoreRx.error$.next(errorMsg);
        authStoreRx.isLoading$.next(false);
        /* DO NOT clear localStorage - user is still authenticated, just database issue */
      }
    }
  },
}));

/* RxJS Enhancement Layer - implements the Angular pattern */
class AuthStoreRx {
  /* RxJS Observables for controlled reactivity */
  userSession$: BehaviorSubject<UserSession | null>;
  isLoading$: BehaviorSubject<boolean>;
  error$: BehaviorSubject<string | null>;

  constructor() {
    /* Initialize with default values - will be synced after store creation */
    this.userSession$ = new BehaviorSubject<UserSession | null>(null);
    this.isLoading$ = new BehaviorSubject<boolean>(false);
    this.error$ = new BehaviorSubject<string | null>(null);
  }

  /* Initialize BehaviorSubjects with actual Zustand state */
  syncWithStore(store: typeof useAuthStore) {
    const state = store.getState();
    this.userSession$.next(state.userSession);
    this.isLoading$.next(state.isLoading);
    this.error$.next(state.error);
  }

  /* Static snapshot access - non-reactive like Angular's snapshot */
  get snapshot() {
    return {
      userSession: this.userSession$.getValue(),
      isLoading: this.isLoading$.getValue(),
      error: this.error$.getValue(),
    };
  }

  /* Silent update - hotpatch without triggering reactive watchers */
  silentUpdate(partial: Partial<Pick<AuthStore, 'userSession' | 'isLoading' | 'error'>>) {
    const zustandState = useAuthStore.getState();

    /* Update Zustand silently by directly calling setState without triggering subscriptions */
    useAuthStore.setState(
      { ...zustandState, ...partial },
      true // replace flag - prevents Zustand subscribers from firing
    );

    /* Update RxJS subjects internally without emitting to subscribers */
    if ('userSession' in partial) {
      (this.userSession$ as any)._value = partial.userSession;
    }
    if ('isLoading' in partial) {
      (this.isLoading$ as any)._value = partial.isLoading;
    }
    if ('error' in partial) {
      (this.error$ as any)._value = partial.error;
    }
  }

  /* Cleanup method */
  destroy() {
    this.userSession$.complete();
    this.isLoading$.complete();
    this.error$.complete();
  }
}

/* Export instances */
export const authStore = useAuthStore;
export const authStoreRx = new AuthStoreRx();

/* Sync initial state between Zustand and RxJS */
authStoreRx.syncWithStore(useAuthStore);
authStoreRx.syncWithStore(useAuthStore);
