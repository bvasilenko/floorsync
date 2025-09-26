import type { RxDatabase } from 'rxdb';

export * from './components';

export interface Subscription {
  unsubscribe: () => void;
}

export interface UserSession {
  userId: string;
  database: RxDatabase;
  isActive: boolean;
}

export type ChecklistItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'final_check_awaiting'
  | 'done';

export interface ChecklistItem {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  order: number;
  createdAt: string; // ISO string for RxDB compatibility
}

export interface TaskCoordinates {
  x: number;
  y: number;
}

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

export interface ChecklistTemplate {
  name: string;
  defaultItems: Array<{
    text: string;
    order: number;
  }>;
}
