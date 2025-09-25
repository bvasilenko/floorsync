import { create } from 'zustand';
import { BehaviorSubject, Observable } from 'rxjs';
import { createUserDatabase } from '../database';
import { storeAuthState, getStoredAuthState, clearAuthState } from '../utils/session';
import type { UserSession } from '../types';
// import { sleep } from '../utils/async';

interface UnifiedAuthStoreInterface {
  userSession: UserSession | null;
  isLoading: boolean;
  error: string | null;

  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeUser: (userId: string) => Promise<void>;
  clearError: () => void;
  restoreSession: () => Promise<void>;

  userSession$: Observable<UserSession | null>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;
}

interface InternalAuthStore {
  userSession: UserSession | null;
  isLoading: boolean;
  error: string | null;
}

class UnifiedAuthStore implements UnifiedAuthStoreInterface {
  private zustandStore = create<InternalAuthStore>(() => ({
    userSession: null,
    isLoading: false,
    error: null,
  }));

  private userSessionSubject = new BehaviorSubject<UserSession | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  get userSession(): UserSession | null {
    return this.zustandStore.getState().userSession;
  }

  get isLoading(): boolean {
    return this.zustandStore.getState().isLoading;
  }

  get error(): string | null {
    return this.zustandStore.getState().error;
  }

  get userSession$(): Observable<UserSession | null> {
    return this.userSessionSubject.asObservable();
  }

  get isLoading$(): Observable<boolean> {
    return this.isLoadingSubject.asObservable();
  }

  get error$(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  private setState(partial: Partial<InternalAuthStore>): void {
    this.zustandStore.setState(partial);

    if (typeof partial.userSession !== 'undefined') {
      this.userSessionSubject.next(partial.userSession);
    }
    if (typeof partial.isLoading !== 'undefined') {
      this.isLoadingSubject.next(partial.isLoading);
    }
    if (typeof partial.error !== 'undefined') {
      this.errorSubject.next(partial.error);
    }
  }

  async login(userName: string): Promise<void> {
    if (!userName.trim()) {
      this.setState({ error: 'User name cannot be empty' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      await this.initializeUser(userName.trim());

      if (import.meta.env.DEV) {
        // await sleep(1000); // Simulate network delay
      }

      storeAuthState({
        userId: userName.trim(),
        isAuthenticated: true,
        timestamp: Date.now(),
      });

      this.setState({ isLoading: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      this.setState({
        error: errorMsg,
        isLoading: false,
      });
    }
  }

  async logout(): Promise<void> {
    const session = this.userSession;

    if (session?.database) {
      await session.database.close();
    }

    clearAuthState();

    this.setState({
      userSession: null,
      error: null,
    });
  }

  async initializeUser(userName: string): Promise<void> {
    try {
      const database = await createUserDatabase(userName);

      const userSession = {
        userId: userName,
        database,
        isActive: true,
      };

      this.setState({ userSession });
    } catch (error) {
      throw new Error(
        `Failed to initialize user database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  clearError(): void {
    this.setState({ error: null });
  }

  async restoreSession(): Promise<void> {
    const storedAuthState = getStoredAuthState();

    if (storedAuthState && storedAuthState.isAuthenticated) {
      this.setState({ isLoading: true });

      try {
        await this.initializeUser(storedAuthState.userId);
        this.setState({ isLoading: false });
      } catch (error) {
        console.error('Session restoration failed - database initialization error:', error);
        const errorMsg = 'Failed to restore session - database issue';
        this.setState({
          error: errorMsg,
          isLoading: false,
        });
      }
    }
  }
}

const unifiedAuthStoreInstance = new UnifiedAuthStore();

export const authStore: UnifiedAuthStoreInterface = unifiedAuthStoreInstance;
