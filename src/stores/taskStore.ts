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
  /* Private properties for RxDB integration */
  
  // BehaviorSubjects for caching and reactive state
  private tasksSubject = new BehaviorSubject<TaskDocument[]>([]);
  private tasksLoadedSubject = new BehaviorSubject<boolean>(false);
  private tasksNeedingRepaintSubject = new BehaviorSubject<Set<string>>(new Set());
  private errorSubject = new BehaviorSubject<string | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // Synchronous getters (cached from BehaviorSubjects)
  get tasks(): TaskDocument[] {
    return this.tasksSubject.value;
  }

  get tasksLoaded(): boolean {
    return this.tasksLoadedSubject.value;
  }

  get tasksNeedingRepaint(): Set<string> {
    return this.tasksNeedingRepaintSubject.value;
  }

  get error(): string | null {
    return this.errorSubject.value;
  }

  get isLoading(): boolean {
    return this.isLoadingSubject.value;
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
    // Update BehaviorSubjects directly instead of Zustand

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
    console.log('!!! taskStore.loadAllTasks > starting reactive setup for user:', userSession?.userId);
    if (!userSession) return;

    // Set up reactive query instead of one-time load
    this.setupReactiveTasksQuery(userSession);
  }

  private setupReactiveTasksQuery(userSession: UserSession): void {
    console.log('!!! setupReactiveTasksQuery > establishing RxDB reactive subscription');
    
    // Create reactive query that automatically updates
    const query = userSession.database.tasks.find();
    
    // Subscribe to reactive query results
    query.$.subscribe((tasksCollection: RxDocument<TaskDocument>[]) => {
      console.log('!!! RxDB reactive update > received', tasksCollection.length, 'tasks');
      
      const tasksArray = tasksCollection.map(doc => doc.toJSON() as TaskDocument);
      console.log('!!! RxDB reactive update > task userIds:', tasksArray.map(t => t.userId));

      // Update BehaviorSubjects directly
      this.tasksSubject.next(tasksArray);
      this.tasksLoadedSubject.next(true);
      
      console.log('!!! RxDB reactive update > BehaviorSubjects updated, tasks.length:', tasksArray.length);
    });
  }

  async createTask(
    taskData: { title: string; coordinates: { x: number; y: number } },
    userSession: UserSession
  ): Promise<void> {
    console.log('!!! taskStore.createTask > creating task for user:', userSession?.userId);
    if (!userSession) return;

    const taskWithTemplate = createTaskWithTemplate(taskData);
    console.log('!!! taskStore.createTask > new task userId:', taskWithTemplate.userId);
    console.log('!!! taskStore.createTask > current user:', userSession.userId);
    
    // Insert into RxDB - reactive query will automatically update state
    await userSession.database.tasks.insert(taskWithTemplate);

    // Only update repaint set manually (this is UI state, not data state)
    const newRepaintSet = new Set([...this.tasksNeedingRepaint, taskWithTemplate.id]);
    this.tasksNeedingRepaintSubject.next(newRepaintSet);

    console.log('!!! taskStore.createTask > RxDB insert complete, reactive query will update tasks');
  }

  async updateTask(
    id: string,
    updates: Partial<TaskDocument>,
    userSession: UserSession
  ): Promise<void> {
    if (!userSession) {
      // Update error state directly via BehaviorSubject
      this.errorSubject.next('No active user session');
      return;
    }

    // Update loading state directly via BehaviorSubject
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const task = await userSession.database.tasks.findOne(id).exec();
      if (!task) {
        this.errorSubject.next('Task not found');
        this.isLoadingSubject.next(false);
        return;
      }

      // Update in RxDB - reactive query will automatically update state
      await task.update({
        $set: { ...updates, updatedAt: new Date().toISOString() }
      });

      // Only update repaint set manually (UI state)
      const newRepaintSet = new Set([...this.tasksNeedingRepaint, id]);
      this.tasksNeedingRepaintSubject.next(newRepaintSet);
      this.isLoadingSubject.next(false);
      
      console.log('!!! taskStore.updateTask > RxDB update complete, reactive query will update tasks');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
      console.error('taskStore.updateTask failed:', error);

      this.errorSubject.next(errorMessage);
      this.isLoadingSubject.next(false);
    }
  }

  async deleteTask(id: string, userSession: UserSession): Promise<void> {
    if (!userSession) {
      this.errorSubject.next('No active user session');
      return;
    }

    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const task = await userSession.database.tasks.findOne(id).exec();
      if (!task) {
        this.errorSubject.next('Task not found');
        this.isLoadingSubject.next(false);
        return;
      }

      // Remove from RxDB - reactive query will automatically update state
      await task.remove();

      // Only update repaint set manually (UI state)
      const newRepaintSet = new Set([...this.tasksNeedingRepaint, id]);
      this.tasksNeedingRepaintSubject.next(newRepaintSet);
      this.isLoadingSubject.next(false);
      
      console.log('!!! taskStore.deleteTask > RxDB remove complete, reactive query will update tasks');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      console.error('taskStore.deleteTask failed:', error);

      this.errorSubject.next(errorMessage);
      this.isLoadingSubject.next(false);
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

      await task.update({
        $set: { checklist: updatedChecklist, updatedAt: new Date().toISOString() }
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
        $set: {
          checklist: [...task.checklist, newItem],
          updatedAt: new Date().toISOString(),
        }
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
        $set: {
          checklist: updatedChecklist,
          updatedAt: new Date().toISOString(),
        }
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
        $set: {
          checklist: updatedChecklist,
          updatedAt: new Date().toISOString(),
        }
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
    console.log('!!! taskStore.reset > clearing all tasks and state');
    console.log('!!! taskStore.reset > current tasks count:', this.tasks.length);
    this.setState({
      tasks: [],
      tasksLoaded: false,
      tasksNeedingRepaint: new Set(),
    });
    console.log('!!! taskStore.reset > reset complete, tasks.length now:', this.tasks.length);
  }
}

const unifiedTaskStoreInstance = new UnifiedTaskStore();

export const taskStore: UnifiedTaskStoreInterface = unifiedTaskStoreInstance;
