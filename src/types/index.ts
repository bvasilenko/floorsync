import type { RxDatabase } from 'rxdb';

/* Component interfaces */
export * from './components';

/* User session interface */
export interface UserSession {
  userId: string;
  database: RxDatabase;
  isActive: boolean;
}

/* Checklist item status types */
export type ChecklistItemStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'blocked' 
  | 'final_check_awaiting' 
  | 'done';

/* Checklist item interface */
export interface ChecklistItem {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  order: number;
  createdAt: string; // ISO string for RxDB compatibility
}

/* Task coordinates interface */
export interface TaskCoordinates {
  x: number;
  y: number;
}

/* Task document interface - flat KISS design */
export interface TaskDocument {
  id: string;
  userId: string;
  title: string;
  coordinates: TaskCoordinates;
  checklistName: string;
  checklist: ChecklistItem[];
  version: number;
  createdAt: string; // ISO string for RxDB compatibility
  updatedAt: string; // ISO string for RxDB compatibility
}

/* Default checklist template structure */
export interface ChecklistTemplate {
  name: string;
  defaultItems: Array<{
    text: string;
    order: number;
  }>;
}
