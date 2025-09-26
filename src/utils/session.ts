/* localStorage keys */
const AUTH_STATE_KEY = 'floorsync_authState';

/* Auth state interface for localStorage persistence */
export interface StoredAuthState {
  userId: string;
  isAuthenticated: boolean;
  timestamp: number;
}

/* Get current user ID from localStorage */
export const getCurrentUserId = (): string | null => {
  const authState = getStoredAuthState();
  return authState?.userId || null;
};

/* Store complete auth state to localStorage */
export const storeAuthState = (authState: StoredAuthState): void => {
  try {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
  } catch {
    console.error('Failed to store auth state');
  }
};

/* Get complete auth state from localStorage */
export const getStoredAuthState = (): StoredAuthState | null => {
  try {
    const stored = localStorage.getItem(AUTH_STATE_KEY);
    if (!stored) return null;
    
    return JSON.parse(stored) as StoredAuthState;
  } catch {
    return null;
  }
};

/* Clear complete auth state from localStorage */
export const clearAuthState = (): void => {
  localStorage.removeItem(AUTH_STATE_KEY);
};

/* Check if user is logged in */
export const isUserLoggedIn = (): boolean => {
  const authState = getStoredAuthState();
  return authState !== null && authState.isAuthenticated;
};;
