/**
 * Dashboard Store using Zustand
 * Handles Dashboard page-specific state: user session, tasks, UI states, modal states
 * ENHANCED: Absorbed async task operations from taskStore.ts
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { getCurrentUserId } from '../../utils/session';
import { DEFAULT_CHECKLIST } from '../../constants';
import type {
  UserSession,
  TaskDocument,
  TaskCoordinates,
  ChecklistItem,
  Subscription,
} from '../../types';
import type { RxDocument } from 'rxdb';

const createTaskWithTemplate = (taskData: {
  title: string;
  coordinates: { x: number; y: number };
}): TaskDocument => {
  const now = new Date().toISOString();
  const checklistSnapshot: ChecklistItem[] = DEFAULT_CHECKLIST.defaultItems.map(item => ({
    id: crypto.randomUUID(),
    text: item.text,
    status: 'not_started' as const,
    order: item.order,
    createdAt: now,
  }));

  return {
    ...taskData,
    id: crypto.randomUUID(),
    userId: getCurrentUserId() || '',
    checklistName: DEFAULT_CHECKLIST.name,
    checklist: checklistSnapshot,
    coordinates: taskData.coordinates,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
};

export interface DashboardState {
  userSession: UserSession | null;

  tasks: TaskDocument[];
  tasksLoaded: boolean;
  tasksNeedingRepaint: Set<string>;

  taskProgress: Record<string, { completed: number; total: number }>;

  isLoading: boolean;
  error: string | null;

  userMenuOpen: boolean;
  taskModalOpen: boolean;
  pendingCoordinates: TaskCoordinates | null;
  expandedTaskId: string | null;

  taskSubscription: Subscription | null;
}

export interface DashboardActions {
  setUserSession: (session: UserSession | null) => void;

  setTasks: (tasks: TaskDocument[] | ((prev: TaskDocument[]) => TaskDocument[])) => void;
  setTasksLoaded: (loaded: boolean) => void;
  setTasksNeedingRepaint: (repaintSet: Set<string>) => void;

  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  setUserMenuOpen: (open: boolean) => void;
  setTaskModalOpen: (open: boolean) => void;
  setPendingCoordinates: (coordinates: TaskCoordinates | null) => void;
  setExpandedTaskId: (taskId: string | null) => void;

  updateTaskProgress: (taskId: string, progress: { completed: number; total: number }) => void;

  setTaskSubscription: (subscription: Subscription | null) => void;

  loadAllTasks: (userSession: UserSession) => Promise<void>;
  createTask: (
    taskData: { title: string; coordinates: { x: number; y: number } },
    userSession: UserSession
  ) => Promise<void>;
  updateTask: (
    id: string,
    updates: Partial<TaskDocument>,
    userSession: UserSession
  ) => Promise<void>;
  deleteTask: (id: string, userSession: UserSession) => Promise<void>;
  markTaskForRepaint: (taskId: string) => void;
  clearRepaintMarkers: () => void;
  resetTasks: () => void;
  cleanup: () => void;
}

export type DashboardStore = DashboardState & DashboardActions;

const initialState: DashboardState = {
  userSession: null,
  tasks: [],
  tasksLoaded: false,
  tasksNeedingRepaint: new Set(),
  taskProgress: {},
  isLoading: false,
  error: null,
  userMenuOpen: false,
  taskModalOpen: false,
  pendingCoordinates: null,
  expandedTaskId: null,
  taskSubscription: null,
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  ...initialState,

  setUserSession: session => set({ userSession: session }),

  setTasks: tasks =>
    set(state => ({
      tasks: typeof tasks === 'function' ? tasks(state.tasks) : tasks,
    })),

  setTasksLoaded: loaded => set({ tasksLoaded: loaded }),

  setTasksNeedingRepaint: repaintSet => set({ tasksNeedingRepaint: repaintSet }),

  setIsLoading: loading => set({ isLoading: loading }),

  setError: error => set({ error }),

  clearError: () => set({ error: null }),

  setUserMenuOpen: open => set({ userMenuOpen: open }),

  setTaskModalOpen: open => set({ taskModalOpen: open }),

  setPendingCoordinates: coordinates => set({ pendingCoordinates: coordinates }),

  setExpandedTaskId: taskId => set({ expandedTaskId: taskId }),

  updateTaskProgress: (taskId, progress) =>
    set(state => ({
      taskProgress: {
        ...state.taskProgress,
        [taskId]: progress,
      },
    })),

  setTaskSubscription: subscription => set({ taskSubscription: subscription }),

  loadAllTasks: async (userSession: UserSession) => {
    if (!userSession) return;

    const existingSubscription = get().taskSubscription;
    if (existingSubscription) {
      existingSubscription.unsubscribe();
    }

    const query = userSession.database.tasks.find();
    const subscription = query.$.subscribe((tasksCollection: RxDocument<TaskDocument>[]) => {
      const tasksArray = tasksCollection.map(doc => doc.toJSON() as TaskDocument);

      set({
        tasks: tasksArray,
        tasksLoaded: true,
      });
    });

    set({ taskSubscription: subscription });
  },

  createTask: async (
    taskData: { title: string; coordinates: { x: number; y: number } },
    userSession: UserSession
  ) => {
    if (!userSession) return;

    const taskWithTemplate = createTaskWithTemplate(taskData);

    await userSession.database.tasks.insert(taskWithTemplate);

    const currentRepaintSet = get().tasksNeedingRepaint;
    const newRepaintSet = new Set([...currentRepaintSet, taskWithTemplate.id]);
    set({ tasksNeedingRepaint: newRepaintSet });
  },

  updateTask: async (id: string, updates: Partial<TaskDocument>, userSession: UserSession) => {
    if (!userSession) {
      set({ error: 'No active user session' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(id).exec();
      if (!task) {
        set({ error: 'Task not found', isLoading: false });
        return;
      }

      await task.update({
        $set: { ...updates, updatedAt: new Date().toISOString() },
      });

      const currentRepaintSet = get().tasksNeedingRepaint;
      const newRepaintSet = new Set([...currentRepaintSet, id]);
      set({
        tasksNeedingRepaint: newRepaintSet,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
      console.error('dashboardStore.updateTask failed:', error);
      set({ error: errorMessage, isLoading: false });
    }
  },

  deleteTask: async (id: string, userSession: UserSession) => {
    if (!userSession) {
      set({ error: 'No active user session' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(id).exec();
      if (!task) {
        set({ error: 'Task not found', isLoading: false });
        return;
      }

      await task.remove();

      const currentRepaintSet = get().tasksNeedingRepaint;
      const newRepaintSet = new Set([...currentRepaintSet, id]);
      set({
        tasksNeedingRepaint: newRepaintSet,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      console.error('dashboardStore.deleteTask failed:', error);
      set({ error: errorMessage, isLoading: false });
    }
  },

  markTaskForRepaint: (taskId: string) => {
    const currentRepaintSet = get().tasksNeedingRepaint;
    const newRepaintSet = new Set([...currentRepaintSet, taskId]);
    set({ tasksNeedingRepaint: newRepaintSet });
  },

  clearRepaintMarkers: () => {
    set({ tasksNeedingRepaint: new Set<string>() });
  },

  resetTasks: () => {
    const subscription = get().taskSubscription;
    if (subscription) {
      subscription.unsubscribe();
    }

    set({
      tasks: [],
      tasksLoaded: false,
      tasksNeedingRepaint: new Set(),
      taskSubscription: null,
      error: null,
      isLoading: false,
    });
  },

  cleanup: () => {
    const subscription = get().taskSubscription;
    if (subscription) {
      subscription.unsubscribe();
      set({ taskSubscription: null });
    }
  },
}));

export const useTasks = () => useDashboardStore(state => state.tasks);

export const useTaskById = (taskId: string) =>
  useDashboardStore(useShallow(state => state.tasks.find(task => task.id === taskId)));

export const useTaskProgress = (taskId: string) =>
  useDashboardStore(useShallow(state => state.taskProgress[taskId] || { completed: 0, total: 0 }));

export const useIsTaskExpanded = (taskId: string) =>
  useDashboardStore(state => state.expandedTaskId === taskId);

export const useExpandedTaskId = () => useDashboardStore(state => state.expandedTaskId);

export const useSetExpandedTaskId = () => useDashboardStore(state => state.setExpandedTaskId);
