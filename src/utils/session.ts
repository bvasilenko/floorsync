const AUTH_STATE_KEY = 'floorsync_authState';

export interface StoredAuthState {
  userId: string;
  isAuthenticated: boolean;
  timestamp: number;
}

export const getCurrentUserId = (): string | null => {
  const authState = getStoredAuthState();
  return authState?.userId || null;
};

export const storeAuthState = (authState: StoredAuthState): void => {
  try {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
  } catch {
    console.error('Failed to store auth state');
  }
};

export const getStoredAuthState = (): StoredAuthState | null => {
  try {
    const stored = localStorage.getItem(AUTH_STATE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as StoredAuthState;
  } catch {
    return null;
  }
};

export const clearAuthState = (): void => {
  localStorage.removeItem(AUTH_STATE_KEY);
};

export const isUserLoggedIn = (): boolean => {
  const authState = getStoredAuthState();
  return authState !== null && authState.isAuthenticated;
};
