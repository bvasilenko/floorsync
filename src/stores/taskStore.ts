import { create } from 'zustand';
import { BehaviorSubject, Observable } from 'rxjs';
import { getCurrentUserId } from '../utils/session';
import { DEFAULT_CHECKLIST } from '../constants';
import type { TaskDocument, ChecklistItem, ChecklistItemStatus, UserSession } from '../types';
import type { RxDocument } from 'rxdb';

interface UnifiedTaskStoreInterface {
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

  tasks$: Observable<TaskDocument[]>;
  tasksLoaded$: Observable<boolean>;
  tasksNeedingRepaint$: Observable<Set<string>>;
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

interface InternalTaskStore {
  tasks: TaskDocument[];
  tasksLoaded: boolean;
  tasksNeedingRepaint: Set<string>;
  error: string | null;
  isLoading: boolean;
}

class UnifiedTaskStore implements UnifiedTaskStoreInterface {
  private zustandStore = create<InternalTaskStore>(() => ({
    tasks: [],
    tasksLoaded: false,
    tasksNeedingRepaint: new Set(),
    error: null,
    isLoading: false,
  }));

  private tasksSubject = new BehaviorSubject<TaskDocument[]>([]);
  private tasksLoadedSubject = new BehaviorSubject<boolean>(false);
  private tasksNeedingRepaintSubject = new BehaviorSubject<Set<string>>(new Set());

  get tasks(): TaskDocument[] {
    return this.zustandStore.getState().tasks;
  }

  get tasksLoaded(): boolean {
    return this.zustandStore.getState().tasksLoaded;
  }

  get tasksNeedingRepaint(): Set<string> {
    return this.zustandStore.getState().tasksNeedingRepaint;
  }

  get tasks$(): Observable<TaskDocument[]> {
    return this.tasksSubject.asObservable();
  }

  get tasksLoaded$(): Observable<boolean> {
    return this.tasksLoadedSubject.asObservable();
  }

  get tasksNeedingRepaint$(): Observable<Set<string>> {
    return this.tasksNeedingRepaintSubject.asObservable();
  }

  private setState(partial: Partial<InternalTaskStore>): void {
    this.zustandStore.setState(partial);

    if (typeof partial.tasks !== 'undefined') {
      this.tasksSubject.next(partial.tasks);
    }
    if (typeof partial.tasksLoaded !== 'undefined') {
      this.tasksLoadedSubject.next(partial.tasksLoaded);
    }
    if (typeof partial.tasksNeedingRepaint !== 'undefined') {
      this.tasksNeedingRepaintSubject.next(partial.tasksNeedingRepaint);
    }
  }

  async loadAllTasks(userSession: UserSession): Promise<void> {
    if (!userSession) return;

    const allTasks = await userSession.database.tasks.find().exec();
    const tasksArray = allTasks.map(
      (doc: RxDocument<TaskDocument>) => doc.toJSON() as TaskDocument
    );

    this.setState({
      tasks: tasksArray,
      tasksLoaded: true,
    });
  }

  async createTask(
    taskData: { title: string; coordinates: { x: number; y: number } },
    userSession: UserSession
  ): Promise<void> {
    if (!userSession) return;

    const taskWithTemplate = createTaskWithTemplate(taskData);
    await userSession.database.tasks.insert(taskWithTemplate);

    const newTasks = [...this.tasks, taskWithTemplate];
    const newRepaintSet = new Set([...this.tasksNeedingRepaint, taskWithTemplate.id]);

    this.setState({
      tasks: newTasks,
      tasksNeedingRepaint: newRepaintSet,
    });
  }

  async updateTask(
    id: string,
    updates: Partial<TaskDocument>,
    userSession: UserSession
  ): Promise<void> {
    if (!userSession) {
      this.setState({ error: 'No active user session' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(id).exec();
      if (!task) {
        this.setState({
          error: 'Task not found',
          isLoading: false,
        });
        return;
      }

      await task.update({ ...updates, updatedAt: new Date().toISOString() });

      const newTasks = this.tasks.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      const newRepaintSet = new Set([...this.tasksNeedingRepaint, id]);

      this.setState({
        tasks: newTasks,
        tasksNeedingRepaint: newRepaintSet,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
      console.error('taskStore.updateTask failed:', error);

      this.setState({
        error: errorMessage,
        isLoading: false,
      });
    }
  }

  async deleteTask(id: string, userSession: UserSession): Promise<void> {
    if (!userSession) {
      this.setState({ error: 'No active user session' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(id).exec();
      if (!task) {
        this.setState({
          error: 'Task not found',
          isLoading: false,
        });
        return;
      }

      await task.remove();

      const newTasks = this.tasks.filter(t => t.id !== id);
      const newRepaintSet = new Set([...this.tasksNeedingRepaint, id]);

      this.setState({
        tasks: newTasks,
        tasksNeedingRepaint: newRepaintSet,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      console.error('taskStore.deleteTask failed:', error);

      this.setState({
        error: errorMessage,
        isLoading: false,
      });
    }
  }

  async updateChecklistItemStatus(
    taskId: string,
    itemId: string,
    newStatus: ChecklistItemStatus,
    userSession: UserSession
  ): Promise<void> {
    if (!userSession) {
      this.setState({ error: 'No active user session' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        this.setState({
          error: 'Task not found',
          isLoading: false,
        });
        return;
      }

      const updatedChecklist = task.checklist.map((item: ChecklistItem) =>
        item.id === itemId ? { ...item, status: newStatus } : item
      );

      await task.update({ checklist: updatedChecklist, updatedAt: new Date().toISOString() });

      const newTasks = this.tasks.map(t =>
        t.id === taskId
          ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
          : t
      );
      const newRepaintSet = new Set([...this.tasksNeedingRepaint, taskId]);

      this.setState({
        tasks: newTasks,
        tasksNeedingRepaint: newRepaintSet,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update checklist item status';
      console.error('taskStore.updateChecklistItemStatus failed:', error);

      this.setState({
        error: errorMessage,
        isLoading: false,
      });
    }
  }

  async addChecklistItem(
    taskId: string,
    itemText: string,
    userSession: UserSession
  ): Promise<void> {
    if (!userSession) {
      this.setState({ error: 'No active user session' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        this.setState({
          error: 'Task not found',
          isLoading: false,
        });
        return;
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
        checklist: [...task.checklist, newItem],
        updatedAt: new Date().toISOString(),
      });

      const updatedChecklist = [...task.checklist, newItem];
      const newTasks = this.tasks.map(t =>
        t.id === taskId
          ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
          : t
      );
      const newRepaintSet = new Set([...this.tasksNeedingRepaint, taskId]);

      this.setState({
        tasks: newTasks,
        tasksNeedingRepaint: newRepaintSet,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add checklist item';
      console.error('taskStore.addChecklistItem failed:', error);

      this.setState({
        error: errorMessage,
        isLoading: false,
      });
    }
  }

  async deleteChecklistItem(
    taskId: string,
    checklistItemId: string,
    userSession: UserSession
  ): Promise<void> {
    if (!userSession) {
      this.setState({ error: 'No active user session' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        this.setState({
          error: 'Task not found',
          isLoading: false,
        });
        return;
      }

      const updatedChecklist = task.checklist.filter(
        (item: ChecklistItem) => item.id !== checklistItemId
      );

      await task.update({
        checklist: updatedChecklist,
        updatedAt: new Date().toISOString(),
      });

      const newTasks = this.tasks.map(t =>
        t.id === taskId
          ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
          : t
      );
      const newRepaintSet = new Set([...this.tasksNeedingRepaint, taskId]);

      this.setState({
        tasks: newTasks,
        tasksNeedingRepaint: newRepaintSet,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete checklist item';
      console.error('taskStore.deleteChecklistItem failed:', error);

      this.setState({
        error: errorMessage,
        isLoading: false,
      });
    }
  }

  async updateChecklistItemText(
    taskId: string,
    checklistItemId: string,
    newText: string,
    userSession: UserSession
  ): Promise<void> {
    if (!userSession) {
      this.setState({ error: 'No active user session' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const task = await userSession.database.tasks.findOne(taskId).exec();
      if (!task) {
        this.setState({
          error: 'Task not found',
          isLoading: false,
        });
        return;
      }

      const updatedChecklist = task.checklist.map((item: ChecklistItem) =>
        item.id === checklistItemId ? { ...item, text: newText } : item
      );

      await task.update({
        checklist: updatedChecklist,
        updatedAt: new Date().toISOString(),
      });

      const newTasks = this.tasks.map(t =>
        t.id === taskId
          ? { ...t, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
          : t
      );

      this.setState({
        tasks: newTasks,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update checklist item text';
      console.error('taskStore.updateChecklistItemText failed:', error);

      this.setState({
        error: errorMessage,
        isLoading: false,
      });
    }
  }

  markTaskForRepaint(taskId: string): void {
    const newRepaintSet = new Set([...this.tasksNeedingRepaint, taskId]);
    this.setState({ tasksNeedingRepaint: newRepaintSet });
  }

  clearRepaintMarkers(): void {
    const newRepaintSet = new Set<string>();
    this.setState({ tasksNeedingRepaint: newRepaintSet });
  }

  reset(): void {
    this.setState({
      tasks: [],
      tasksLoaded: false,
      tasksNeedingRepaint: new Set(),
    });
  }
}

const unifiedTaskStoreInstance = new UnifiedTaskStore();

export const taskStore: UnifiedTaskStoreInterface = unifiedTaskStoreInstance;
