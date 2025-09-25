import { create } from 'zustand';
import type { UserSession } from '../../types';

export interface AppState {
  userSession: UserSession | null;
  isLoading: boolean;
}

export interface AppActions {
  setUserSession: (session: UserSession | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export type AppStore = AppState & AppActions;

const initialState: AppState = {
  userSession: null,
  isLoading: false,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,
  
  setUserSession: (session) =>
    set({ userSession: session }),
    
  setIsLoading: (loading) =>
    set({ isLoading: loading }),
}));