import { create } from 'zustand';
import { BehaviorSubject } from 'rxjs';
import { getCurrentUserId } from '../utils/session';
import { DEFAULT_CHECKLIST } from '../constants';
import type { TaskDocument, ChecklistItem, ChecklistItemStatus, UserSession } from '../types';
import type { RxDocument } from 'rxdb';

interface TaskStore {
  tasks: TaskDocument[];
  tasksLoaded: boolean;
  tasksNeedingRepaint: Set<string>;

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

  updateChecklistItemStatus: (
    taskId: string,
    itemId: string,
    newStatus: ChecklistItemStatus,
    userSession: UserSession
  ) => Promise<void>;
  addChecklistItem: (taskId: string, itemText: string, userSession: UserSession) => Promise<void>;
  deleteChecklistItem: (
    taskId: string,
    checklistItemId: string,
    userSession: UserSession
  ) => Promise<void>;
  updateChecklistItemText: (
    taskId: string,
    checklistItemId: string,
    newText: string,
    userSession: UserSession
  ) => Promise<void>;

  markTaskForRepaint: (taskId: string) => void;
  clearRepaintMarkers: () => void;
  reset: () => void;
}

/* Enhanced store with RxJS capabilities */
interface TaskStoreWithRx extends TaskStore {
  /* RxJS observables for controlled reactivity */
  tasks$: BehaviorSubject<TaskDocument[]>;
  tasksLoaded$: BehaviorSubject<boolean>;
  tasksNeedingRepaint$: BehaviorSubject<Set<string>>;

  /* Static snapshot access (non-reactive) */
  snapshot: {
    tasks: TaskDocument[];
    tasksLoaded: boolean;
    tasksNeedingRepaint: Set<string>;
  };

  /* Silent update methods (no reactive emission) */
  silentUpdate: (
    partial: Partial<Pick<TaskStore, 'tasks' | 'tasksLoaded' | 'tasksNeedingRepaint'>>
  ) => void;
}

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

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  tasksLoaded: false,
  tasksNeedingRepaint: new Set(),

  loadAllTasks: async (userSession: UserSession) => {
    if (get().tasksLoaded) return;
    if (!userSession) return;

    const allTasks = await userSession.database.tasks.find().exec();
    const tasksArray = allTasks.map(
      (doc: RxDocument<TaskDocument>) => doc.toJSON() as TaskDocument
    );

    set({
      tasks: tasksArray,
      tasksLoaded: true,
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(tasksArray);
    taskStoreRx.tasksLoaded$.next(true);

    /* Load-once strategy - no reactive subscription needed for single-user offline app */
  },

  createTask: async (
    taskData: { title: string; coordinates: { x: number; y: number } },
    userSession: UserSession
  ) => {
    if (!userSession) return;

    const taskWithTemplate = createTaskWithTemplate(taskData);

    await userSession.database.tasks.insert(taskWithTemplate);

    /* Explicit state update - manual sync with database per load-once architecture */
    const newTasks = [...get().tasks, taskWithTemplate];
    const newRepaintSet = new Set([...get().tasksNeedingRepaint, taskWithTemplate.id]);

    set({
      tasks: newTasks,
      tasksNeedingRepaint: newRepaintSet,
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(newTasks);
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  updateTask: async (id: string, updates: Partial<TaskDocument>, userSession: UserSession) => {
    if (!userSession) return;

    const task = await userSession.database.tasks.findOne(id).exec();
    if (!task) return;

    await task.update({ ...updates, updatedAt: new Date().toISOString() });

    /* Explicit state update - immutable update pattern */
    const newTasks = get().tasks.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    const newRepaintSet = new Set([...get().tasksNeedingRepaint, id]);

    set({
      tasks: newTasks,
      tasksNeedingRepaint: newRepaintSet,
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(newTasks);
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  deleteTask: async (id: string, userSession: UserSession) => {
    if (!userSession) return;

    const task = await userSession.database.tasks.findOne(id).exec();
    if (!task) return;

    await task.remove();

    const newTasks = get().tasks.filter(t => t.id !== id);
    const newRepaintSet = new Set([...get().tasksNeedingRepaint, id]);

    set({
      tasks: newTasks,
      tasksNeedingRepaint: newRepaintSet,
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(newTasks);
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  updateChecklistItemStatus: async (
    taskId: string,
    itemId: string,
    newStatus: ChecklistItemStatus,
    userSession: UserSession
  ) => {
    if (!userSession) return;

    const task = await userSession.database.tasks.findOne(taskId).exec();
    if (!task) return;

    const updatedChecklist = task.checklist.map((item: ChecklistItem) =>
      item.id === itemId ? { ...item, status: newStatus } : item
    );

    await task.update({ checklist: updatedChecklist, updatedAt: new Date().toISOString() });

    /* Explicit state update - immutable checklist update */
    const newTasks = get().tasks.map(t =>
      t.id === taskId
        ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
        : t
    );
    const newRepaintSet = new Set([...get().tasksNeedingRepaint, taskId]);

    set({
      tasks: newTasks,
      tasksNeedingRepaint: newRepaintSet,
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(newTasks);
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  addChecklistItem: async (taskId: string, itemText: string, userSession: UserSession) => {
    if (!userSession) return;

    const task = await userSession.database.tasks.findOne(taskId).exec();
    if (!task) return;

    const maxOrder = Math.max(...task.checklist.map((item: ChecklistItem) => item.order), 0);
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: itemText,
      status: 'not_started',
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };

    await task.update({
      checklist: [...task.checklist, newItem],
      updatedAt: new Date().toISOString(),
    });

    /* Explicit state update - immutable checklist addition */
    const updatedChecklist = [...task.checklist, newItem];
    const newTasks = get().tasks.map(t =>
      t.id === taskId
        ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
        : t
    );
    const newRepaintSet = new Set([...get().tasksNeedingRepaint, taskId]);

    set({
      tasks: newTasks,
      tasksNeedingRepaint: newRepaintSet,
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(newTasks);
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  deleteChecklistItem: async (
    taskId: string,
    checklistItemId: string,
    userSession: UserSession
  ) => {
    if (!userSession) return;

    const task = await userSession.database.tasks.findOne(taskId).exec();
    if (!task) return;

    const updatedChecklist = task.checklist.filter(
      (item: ChecklistItem) => item.id !== checklistItemId
    );

    await task.update({
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    });

    /* Explicit state update - immutable checklist item removal */
    const newTasks = get().tasks.map(t =>
      t.id === taskId
        ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
        : t
    );
    const newRepaintSet = new Set([...get().tasksNeedingRepaint, taskId]);

    set({
      tasks: newTasks,
      tasksNeedingRepaint: newRepaintSet,
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(newTasks);
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  updateChecklistItemText: async (
    taskId: string,
    checklistItemId: string,
    newText: string,
    userSession: UserSession
  ) => {
    if (!userSession) return;

    const task = await userSession.database.tasks.findOne(taskId).exec();
    if (!task) return;

    const updatedChecklist = task.checklist.map((item: ChecklistItem) =>
      item.id === checklistItemId ? { ...item, text: newText } : item
    );

    await task.update({
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    });

    /* Explicit state update - immutable checklist text update */
    const newTasks = get().tasks.map(t =>
      t.id === taskId
        ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
        : t
    );

    set({ tasks: newTasks });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next(newTasks);
  },

  markTaskForRepaint: taskId => {
    const newRepaintSet = new Set([...get().tasksNeedingRepaint, taskId]);
    set({
      tasksNeedingRepaint: newRepaintSet,
    });
    /* Update RxJS observables */
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  clearRepaintMarkers: () => {
    const newRepaintSet = new Set<string>();
    set({ tasksNeedingRepaint: newRepaintSet });
    /* Update RxJS observables */
    taskStoreRx.tasksNeedingRepaint$.next(newRepaintSet);
  },

  reset: () => {
    set({
      tasks: [],
      tasksLoaded: false,
      tasksNeedingRepaint: new Set(),
    });
    /* Update RxJS observables */
    taskStoreRx.tasks$.next([]);
    taskStoreRx.tasksLoaded$.next(false);
    taskStoreRx.tasksNeedingRepaint$.next(new Set());
  },
}));

/* RxJS Enhancement Layer - implements the Angular pattern */
class TaskStoreRx {
  /* RxJS Observables for controlled reactivity */
  tasks$: BehaviorSubject<TaskDocument[]>;
  tasksLoaded$: BehaviorSubject<boolean>;
  tasksNeedingRepaint$: BehaviorSubject<Set<string>>;

  constructor() {
    /* Initialize with default values - will be synced after store creation */
    this.tasks$ = new BehaviorSubject<TaskDocument[]>([]);
    this.tasksLoaded$ = new BehaviorSubject<boolean>(false);
    this.tasksNeedingRepaint$ = new BehaviorSubject<Set<string>>(new Set());
  }

  /* Initialize BehaviorSubjects with actual Zustand state */
  syncWithStore(store: typeof useTaskStore) {
    const state = store.getState();
    this.tasks$.next(state.tasks);
    this.tasksLoaded$.next(state.tasksLoaded);
    this.tasksNeedingRepaint$.next(state.tasksNeedingRepaint);
  }

  /* Static snapshot access - non-reactive like Angular's snapshot */
  get snapshot() {
    return {
      tasks: this.tasks$.getValue(),
      tasksLoaded: this.tasksLoaded$.getValue(),
      tasksNeedingRepaint: this.tasksNeedingRepaint$.getValue(),
    };
  }

  /* Silent update - hotpatch without triggering reactive watchers */
  silentUpdate(partial: Partial<Pick<TaskStore, 'tasks' | 'tasksLoaded' | 'tasksNeedingRepaint'>>) {
    const zustandState = useTaskStore.getState();

    /* Update Zustand silently by directly calling setState without triggering subscriptions */
    useTaskStore.setState(
      { ...zustandState, ...partial },
      true // replace flag - prevents Zustand subscribers from firing
    );

    /* Update RxJS subjects internally without emitting to subscribers */
    if ('tasks' in partial) {
      (this.tasks$ as any)._value = partial.tasks;
    }
    if ('tasksLoaded' in partial) {
      (this.tasksLoaded$ as any)._value = partial.tasksLoaded;
    }
    if ('tasksNeedingRepaint' in partial) {
      (this.tasksNeedingRepaint$ as any)._value = partial.tasksNeedingRepaint;
    }
  }

  /* Cleanup method */
  destroy() {
    this.tasks$.complete();
    this.tasksLoaded$.complete();
    this.tasksNeedingRepaint$.complete();
  }
}

/* Export instances */
export const taskStore = useTaskStore;
export const taskStoreRx = new TaskStoreRx();

/* Sync initial state between Zustand and RxJS */
taskStoreRx.syncWithStore(useTaskStore);
