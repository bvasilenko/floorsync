/**
 * Dashboard Store using Zustand
 * Handles Dashboard page-specific state: user session, tasks, UI states, modal states
 * Drop-in replacement for Dashboard local useState hooks
 */

import { create } from 'zustand';
import type { UserSession, TaskDocument, TaskCoordinates } from '../../types';

export interface DashboardState {
  // User session state  
  userSession: UserSession | null;
  
  // Tasks state
  tasks: TaskDocument[];
  
  // UI states
  userMenuOpen: boolean;
  taskModalOpen: boolean;
  pendingCoordinates: TaskCoordinates | null;
  expandedTaskId: string | null;
}

export interface DashboardActions {
  // User session actions
  setUserSession: (session: UserSession | null) => void;
  
  // Tasks actions
  setTasks: (tasks: TaskDocument[] | ((prev: TaskDocument[]) => TaskDocument[])) => void;
  
  // UI actions
  setUserMenuOpen: (open: boolean) => void;
  setTaskModalOpen: (open: boolean) => void;
  setPendingCoordinates: (coordinates: TaskCoordinates | null) => void;
  setExpandedTaskId: (taskId: string | null) => void;
}

export type DashboardStore = DashboardState & DashboardActions;

const initialState: DashboardState = {
  userSession: null,
  tasks: [],
  userMenuOpen: false,
  taskModalOpen: false,
  pendingCoordinates: null,
  expandedTaskId: null,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  ...initialState,
  
  // User session actions
  setUserSession: (session) =>
    set({ userSession: session }),
  
  // Tasks actions  
  setTasks: (tasks) =>
    set((state) => ({
      tasks: typeof tasks === 'function' ? tasks(state.tasks) : tasks,
    })),
  
  // UI actions
  setUserMenuOpen: (open) =>
    set({ userMenuOpen: open }),
    
  setTaskModalOpen: (open) =>
    set({ taskModalOpen: open }),
    
  setPendingCoordinates: (coordinates) =>
    set({ pendingCoordinates: coordinates }),
    
  setExpandedTaskId: (taskId) =>
    set({ expandedTaskId: taskId }),
}));

console.log('!!! DashboardStore initialized for Dashboard page state');