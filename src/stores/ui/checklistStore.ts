/**
 * Checklist Items Store using Zustand
 * Handles checklist items separately from tasks for performance optimization
 * Only synchronizes with task store when status changes affect aggregated data
 */

import { create } from 'zustand';
import type { UserSession, ChecklistItem, ChecklistItemStatus } from '../../types';

export interface ChecklistState {
  checklistItems: Record<string, ChecklistItem[]>;

  loadingItems: Set<string>; // item ids that are being updated

  editingItemId: string | null;
  editingText: string;

  deleteConfirm: {
    isOpen: boolean;
    taskId: string | null;
    itemId: string | null;
    itemText: string | null;
  };
}

export interface ChecklistActions {
  setChecklistItems: (taskId: string, items: ChecklistItem[]) => void;
  addChecklistItem: (
    taskId: string,
    itemText: string,
    userSession: UserSession,
    onProgressUpdate?: (taskId: string, progress: { completed: number; total: number }) => void
  ) => Promise<void>;
  updateChecklistItem: (taskId: string, itemId: string, updates: Partial<ChecklistItem>) => void;
  removeChecklistItem: (taskId: string, itemId: string) => void;

  updateChecklistItemStatus: (
    taskId: string,
    itemId: string,
    newStatus: ChecklistItemStatus,
    userSession: UserSession,
    onProgressUpdate?: (taskId: string, progress: { completed: number; total: number }) => void
  ) => Promise<void>;

  setEditingItem: (itemId: string | null, text?: string) => void;
  updateChecklistItemText: (
    taskId: string,
    itemId: string,
    newText: string,
    userSession: UserSession
  ) => Promise<void>;

  setDeleteConfirm: (confirm: {
    isOpen: boolean;
    taskId: string | null;
    itemId: string | null;
    itemText: string | null;
  }) => void;
  deleteChecklistItem: (
    taskId: string,
    itemId: string,
    userSession: UserSession,
    onProgressUpdate?: (taskId: string, progress: { completed: number; total: number }) => void
  ) => Promise<void>;

  setItemLoading: (itemId: string, loading: boolean) => void;

  loadTaskChecklistItems: (taskId: string, userSession: UserSession) => Promise<void>;
  clearTaskChecklistItems: (taskId: string) => void;

  getTaskProgress: (taskId: string) => { completed: number; total: number };
  getChecklistItems: (taskId: string) => ChecklistItem[];
}

export type ChecklistStore = ChecklistState & ChecklistActions;

const initialState: ChecklistState = {
  checklistItems: {},
  loadingItems: new Set(),
  editingItemId: null,
  editingText: '',
  deleteConfirm: {
    isOpen: false,
    taskId: null,
    itemId: null,
    itemText: null,
  },
};

export const useChecklistStore = create<ChecklistStore>((set, get) => ({
  ...initialState,

  setChecklistItems: (taskId, items) =>
    set(state => ({
      checklistItems: {
        ...state.checklistItems,
        [taskId]: items,
      },
    })),

  addChecklistItem: async (taskId, itemText, userSession, onProgressUpdate) => {
    const { setItemLoading, getTaskProgress } = get();

    const tempItemId = crypto.randomUUID();
    setItemLoading(tempItemId, true);

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        throw new Error('Task not found');
      }

      const maxOrder = Math.max(...task.checklist.map((item: ChecklistItem) => item.order), 0);
      const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        text: itemText,
        status: 'not_started',
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      };

      await task.update({
        $set: {
          checklist: [...task.checklist, newItem],
          updatedAt: new Date().toISOString(),
        },
      });

      set(state => {
        const existing = state.checklistItems[taskId] || [];
        return {
          checklistItems: {
            ...state.checklistItems,
            [taskId]: [...existing, newItem],
          },
        };
      });

      if (onProgressUpdate) {
        const progress = getTaskProgress(taskId);
        onProgressUpdate(taskId, progress);
      }
    } catch (error) {
      console.error('Failed to add checklist item:', error);
      throw error;
    } finally {
      setItemLoading(tempItemId, false);
    }
  },

  updateChecklistItem: (taskId, itemId, updates) =>
    set(state => {
      const items = state.checklistItems[taskId] || [];
      const updatedItems = items.map(item => (item.id === itemId ? { ...item, ...updates } : item));

      return {
        checklistItems: {
          ...state.checklistItems,
          [taskId]: updatedItems,
        },
      };
    }),

  removeChecklistItem: (taskId, itemId) =>
    set(state => {
      const items = state.checklistItems[taskId] || [];
      const filteredItems = items.filter(item => item.id !== itemId);

      return {
        checklistItems: {
          ...state.checklistItems,
          [taskId]: filteredItems,
        },
      };
    }),

  updateChecklistItemStatus: async (taskId, itemId, newStatus, userSession, onProgressUpdate) => {
    const { updateChecklistItem, getTaskProgress, setItemLoading } = get();

    setItemLoading(itemId, true);

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        throw new Error('Task not found');
      }

      const updatedChecklist = task.checklist.map((item: ChecklistItem) =>
        item.id === itemId ? { ...item, status: newStatus } : item
      );

      await task.update({
        $set: { checklist: updatedChecklist, updatedAt: new Date().toISOString() },
      });

      updateChecklistItem(taskId, itemId, { status: newStatus });

      if (onProgressUpdate) {
        const progress = getTaskProgress(taskId);
        onProgressUpdate(taskId, progress);
      }
    } catch (error) {
      console.error('Failed to update checklist item status:', error);
      throw error;
    } finally {
      setItemLoading(itemId, false);
    }
  },

  setEditingItem: (itemId, text = '') => set({ editingItemId: itemId, editingText: text }),

  updateChecklistItemText: async (taskId, itemId, newText, userSession) => {
    const { updateChecklistItem, setItemLoading } = get();

    setItemLoading(itemId, true);

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        throw new Error('Task not found');
      }

      const updatedChecklist = task.checklist.map((item: ChecklistItem) =>
        item.id === itemId ? { ...item, text: newText } : item
      );

      await task.update({
        $set: { checklist: updatedChecklist, updatedAt: new Date().toISOString() },
      });

      updateChecklistItem(taskId, itemId, { text: newText });
    } catch (error) {
      console.error('Failed to update checklist item text:', error);
      throw error;
    } finally {
      setItemLoading(itemId, false);
    }
  },

  setDeleteConfirm: confirm => {
    set({ deleteConfirm: confirm });
  },

  deleteChecklistItem: async (taskId, itemId, userSession, onProgressUpdate) => {
    const { removeChecklistItem, getTaskProgress, setItemLoading, setDeleteConfirm } = get();

    setItemLoading(itemId, true);

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        throw new Error('Task not found');
      }

      const updatedChecklist = task.checklist.filter((item: ChecklistItem) => item.id !== itemId);

      await task.update({
        $set: { checklist: updatedChecklist, updatedAt: new Date().toISOString() },
      });

      removeChecklistItem(taskId, itemId);

      setDeleteConfirm({
        isOpen: false,
        taskId: null,
        itemId: null,
        itemText: null,
      });

      if (onProgressUpdate) {
        const progress = getTaskProgress(taskId);
        onProgressUpdate(taskId, progress);
      }
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
      throw error;
    } finally {
      setItemLoading(itemId, false);
    }
  },

  setItemLoading: (itemId, loading) =>
    set(state => {
      const newLoadingItems = new Set(state.loadingItems);
      if (loading) {
        newLoadingItems.add(itemId);
      } else {
        newLoadingItems.delete(itemId);
      }
      return { loadingItems: newLoadingItems };
    }),

  loadTaskChecklistItems: async (taskId, userSession) => {
    const { setChecklistItems } = get();

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (task) {
        setChecklistItems(taskId, task.checklist);
      }
    } catch (error) {
      console.error('Failed to load task checklist items:', error);
      throw error;
    }
  },

  clearTaskChecklistItems: taskId =>
    set(state => {
      const newChecklistItems = { ...state.checklistItems };
      delete newChecklistItems[taskId];
      return { checklistItems: newChecklistItems };
    }),

  getTaskProgress: taskId => {
    const items = get().checklistItems[taskId] || [];
    const completed = items.filter(item => item.status === 'done').length;
    return { completed, total: items.length };
  },

  getChecklistItems: taskId => {
    return get().checklistItems[taskId] || [];
  },
}));

export const useChecklistItems = (taskId: string) =>
  useChecklistStore(state => state.checklistItems[taskId] || []);

export const useChecklistProgress = (taskId: string) =>
  useChecklistStore(state => state.getTaskProgress(taskId));

export const useDeleteConfirm = () => useChecklistStore(state => state.deleteConfirm);

export const useSetDeleteConfirm = () => useChecklistStore(state => state.setDeleteConfirm);

export const useEditingItem = () =>
  useChecklistStore(state => ({
    editingItemId: state.editingItemId,
    editingText: state.editingText,
  }));
