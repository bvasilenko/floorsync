import { create } from 'zustand';
import { getCurrentUserId } from '../utils/session';
import type { TaskDocument, ChecklistItem, ChecklistItemStatus, UserSession } from '../types';
import type { RxDocument } from 'rxdb';

const DEFAULT_CHECKLIST = {
  name: "Standard Construction Task",
  defaultItems: [
    { text: "Review specifications", order: 1 },
    { text: "Prepare materials", order: 2 },
    { text: "Set up work area", order: 3 },
    { text: "Execute task", order: 4 },
    { text: "Quality check", order: 5 },
    { text: "Clean up", order: 6 }
  ]
} as const;

interface TaskStore {
  tasks: TaskDocument[];
  tasksLoaded: boolean;
  tasksNeedingRepaint: Set<string>;
  
  loadAllTasks: (userSession: UserSession) => Promise<void>;
  
  createTask: (taskData: { title: string; coordinates: { x: number; y: number } }, userSession: UserSession) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskDocument>, userSession: UserSession) => Promise<void>;
  deleteTask: (id: string, userSession: UserSession) => Promise<void>;
  
  updateChecklistItemStatus: (taskId: string, itemId: string, newStatus: ChecklistItemStatus, userSession: UserSession) => Promise<void>;
  addChecklistItem: (taskId: string, itemText: string, userSession: UserSession) => Promise<void>;
  deleteChecklistItem: (taskId: string, checklistItemId: string, userSession: UserSession) => Promise<void>;
  updateChecklistItemText: (taskId: string, checklistItemId: string, newText: string, userSession: UserSession) => Promise<void>;
  
  markTaskForRepaint: (taskId: string) => void;
  clearRepaintMarkers: () => void;
  reset: () => void;
}

const createTaskWithTemplate = (taskData: { title: string; coordinates: { x: number; y: number } }): TaskDocument => {
  const checklistSnapshot: ChecklistItem[] = DEFAULT_CHECKLIST.defaultItems.map(item => ({
    id: crypto.randomUUID(),
    text: item.text,
    status: 'not_started' as const,
    order: item.order,
    createdAt: new Date()
  }));

  return {
    ...taskData,
    id: crypto.randomUUID(),
    userId: getCurrentUserId() || '',
    checklistName: DEFAULT_CHECKLIST.name,
    checklist: checklistSnapshot,
    coordinates: taskData.coordinates,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
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
    set({ 
      tasks: allTasks.map((doc: RxDocument<TaskDocument>) => doc.toJSON() as TaskDocument), 
      tasksLoaded: true 
    });
    
    userSession.database.tasks.find().$.subscribe((tasks: RxDocument<TaskDocument>[]) => {
      set({ tasks: tasks.map((doc: RxDocument<TaskDocument>) => doc.toJSON() as TaskDocument) });
    });
  },
  
  createTask: async (taskData: { title: string; coordinates: { x: number; y: number } }, userSession: UserSession) => {
    if (!userSession) return;
    
    const taskWithTemplate = createTaskWithTemplate(taskData);
    
    await userSession.database.tasks.insert(taskWithTemplate);
    
    set(state => ({
      tasks: [...state.tasks, taskWithTemplate]
    }));
    get().markTaskForRepaint(taskWithTemplate.id);
  },
  
  updateTask: async (id: string, updates: Partial<TaskDocument>, userSession: UserSession) => {
    if (!userSession) return;
    
    const task = await userSession.database.tasks.findOne(id).exec();
    if (!task) return;
    
    await task.update({ ...updates, updatedAt: new Date() });
    get().markTaskForRepaint(id);
  },
  
  deleteTask: async (id: string, userSession: UserSession) => {
    if (!userSession) return;
    
    const task = await userSession.database.tasks.findOne(id).exec();
    if (!task) return;
    
    await task.remove();
    
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id)
    }));
    get().markTaskForRepaint(id);
  },
  
  updateChecklistItemStatus: async (taskId: string, itemId: string, newStatus: ChecklistItemStatus, userSession: UserSession) => {
    if (!userSession) return;
    
    const task = await userSession.database.tasks.findOne(taskId).exec();
    if (!task) return;
    
    const updatedChecklist = task.checklist.map((item: ChecklistItem) => 
      item.id === itemId ? { ...item, status: newStatus } : item
    );
    
    await task.update({ checklist: updatedChecklist, updatedAt: new Date() });
    get().markTaskForRepaint(taskId);
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
      createdAt: new Date()
    };
    
    await task.update({ 
      checklist: [...task.checklist, newItem],
      updatedAt: new Date()
    });
    get().markTaskForRepaint(taskId);
  },
  
  deleteChecklistItem: async (taskId: string, checklistItemId: string, userSession: UserSession) => {
    if (!userSession) return;
    
    const task = await userSession.database.tasks.findOne(taskId).exec();
    if (!task) return;
    
    const updatedChecklist = task.checklist.filter((item: ChecklistItem) => item.id !== checklistItemId);
    
    await task.update({ 
      checklist: updatedChecklist,
      updatedAt: new Date()
    });
    get().markTaskForRepaint(taskId);
  },
  
  updateChecklistItemText: async (taskId: string, checklistItemId: string, newText: string, userSession: UserSession) => {
    if (!userSession) return;
    
    const task = await userSession.database.tasks.findOne(taskId).exec();
    if (!task) return;
    
    const updatedChecklist = task.checklist.map((item: ChecklistItem) => 
      item.id === checklistItemId ? { ...item, text: newText } : item
    );
    
    await task.update({ 
      checklist: updatedChecklist,
      updatedAt: new Date()
    });
  },

  markTaskForRepaint: (taskId) => {
    set(state => ({
      tasksNeedingRepaint: new Set([...state.tasksNeedingRepaint, taskId])
    }));
  },
  
  clearRepaintMarkers: () => {
    set({ tasksNeedingRepaint: new Set() });
  },
  
  reset: () => {
    set({
      tasks: [],
      tasksLoaded: false,
      tasksNeedingRepaint: new Set()
    });
  }
}));
