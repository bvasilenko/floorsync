import { create } from 'zustand';
import type { TaskDocument, UserSession } from '../../types';

export interface FloorPlanViewState {
  tasks: TaskDocument[];
  tasksNeedingRepaint: Set<string>;
  userSession: UserSession | null;
  engineReady: boolean;
}

export interface FloorPlanViewActions {
  setTasks: (tasks: TaskDocument[]) => void;
  setTasksNeedingRepaint: (repaintSet: Set<string>) => void;
  setUserSession: (session: UserSession | null) => void;
  setEngineReady: (ready: boolean) => void;
}

export type FloorPlanViewStore = FloorPlanViewState & FloorPlanViewActions;

const initialState: FloorPlanViewState = {
  tasks: [],
  tasksNeedingRepaint: new Set<string>(),
  userSession: null,
  engineReady: false,
};

export const useFloorPlanViewStore = create<FloorPlanViewStore>((set) => ({
  ...initialState,
  
  setTasks: (tasks) =>
    set({ tasks }),
    
  setTasksNeedingRepaint: (repaintSet) =>
    set({ tasksNeedingRepaint: repaintSet }),
    
  setUserSession: (session) =>
    set({ userSession: session }),
    
  setEngineReady: (ready) =>
    set({ engineReady: ready }),
}));