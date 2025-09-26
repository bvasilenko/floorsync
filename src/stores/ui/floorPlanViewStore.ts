import { create } from 'zustand';
import type { TaskDocument, UserSession, Subscription } from '../../types';
import type { RxDocument } from 'rxdb';

export interface FloorPlanViewState {
  tasks: TaskDocument[];
  tasksNeedingRepaint: Set<string>;
  userSession: UserSession | null;
  engineReady: boolean;

  isLoading: boolean;
  error: string | null;

  taskSubscription: Subscription | null;
}

export interface FloorPlanViewActions {
  setTasks: (tasks: TaskDocument[]) => void;
  setTasksNeedingRepaint: (repaintSet: Set<string>) => void;
  setUserSession: (session: UserSession | null) => void;
  setEngineReady: (ready: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTaskSubscription: (subscription: Subscription | null) => void;

  loadTasksForFloorPlan: (userSession: UserSession) => Promise<void>;
  markTaskForRepaint: (taskId: string) => void;
  clearRepaintMarkers: () => void;
  resetTasks: () => void;
  cleanup: () => void;
}

export type FloorPlanViewStore = FloorPlanViewState & FloorPlanViewActions;

const initialState: FloorPlanViewState = {
  tasks: [],
  tasksNeedingRepaint: new Set<string>(),
  userSession: null,
  engineReady: false,
  isLoading: false,
  error: null,
  taskSubscription: null,
};

export const useFloorPlanViewStore = create<FloorPlanViewStore>((set, get) => ({
  ...initialState,

  setTasks: tasks => set({ tasks }),

  setTasksNeedingRepaint: repaintSet => set({ tasksNeedingRepaint: repaintSet }),

  setUserSession: session => set({ userSession: session }),

  setEngineReady: ready => set({ engineReady: ready }),

  setIsLoading: loading => set({ isLoading: loading }),

  setError: error => set({ error }),

  setTaskSubscription: subscription => set({ taskSubscription: subscription }),

  loadTasksForFloorPlan: async (userSession: UserSession) => {
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
        isLoading: false,
      });
    });

    set({ taskSubscription: subscription, isLoading: true });
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
