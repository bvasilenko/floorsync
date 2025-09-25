import { create } from 'zustand';

export interface TaskCreationModalState {
  title: string;
  isSubmitting: boolean;
}

export interface TaskCreationModalActions {
  setTitle: (title: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
}

export type TaskCreationModalStore = TaskCreationModalState & TaskCreationModalActions;

const initialState: TaskCreationModalState = {
  title: '',
  isSubmitting: false,
};

export const useTaskCreationModalStore = create<TaskCreationModalStore>((set) => ({
  ...initialState,
  
  setTitle: (title) =>
    set({ title }),
    
  setIsSubmitting: (submitting) =>
    set({ isSubmitting: submitting }),
}));