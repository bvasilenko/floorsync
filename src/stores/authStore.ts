import { BehaviorSubject, Observable } from 'rxjs';
import { createUserDatabase } from '../database';
import { storeAuthState, getStoredAuthState, clearAuthState } from '../utils/session';
import { taskStore } from './taskStore';
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
  /* Private properties for RxDB integration */
  
  // BehaviorSubjects for caching and reactive state  
  private userSessionSubject = new BehaviorSubject<UserSession | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Synchronous getters (cached from BehaviorSubjects)
  get userSession(): UserSession | null {
    return this.userSessionSubject.value;
  }

  get isLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  get error(): string | null {
    return this.errorSubject.value;
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
    // Update BehaviorSubjects directly instead of Zustand
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
    console.log('!!! authStore.login > starting login for user:', userName);
    if (!userName.trim()) {
      this.setState({ error: 'User name cannot be empty' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      console.log('!!! authStore.login > initializeUser(', userName.trim(), ')');
      await this.initializeUser(userName.trim());

      if (import.meta.env.DEV) {
        // await sleep(1000); // Simulate network delay
      }

      console.log('!!! authStore.login > storeAuthState for user:', userName.trim());
      storeAuthState({
        userId: userName.trim(),
        isAuthenticated: true,
        timestamp: Date.now(),
      });

      console.log('!!! authStore.login > login complete for user:', userName.trim());
      this.setState({ isLoading: false });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      console.log('!!! authStore.login > login failed:', errorMsg);
      this.setState({
        error: errorMsg,
        isLoading: false,
      });
    }
  }

  async logout(): Promise<void> {
    console.log('!!! authStore.logout > starting logout');
    const session = this.userSession;
    console.log('!!! authStore.logout > current session userId:', session?.userId);

    if (session?.database) {
      console.log('!!! authStore.logout > closing database for user:', session.userId);
      await session.database.close();
    }

    console.log('!!! authStore.logout > calling taskStore.reset()');
    taskStore.reset();

    console.log('!!! authStore.logout > clearAuthState()');
    clearAuthState();

    console.log('!!! authStore.logout > setState({ userSession: null })');
    this.setState({
      userSession: null,
      error: null,
    });
    console.log('!!! authStore.logout > logout complete');
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
