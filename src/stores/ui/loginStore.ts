import { create } from 'zustand';

export interface LoginState {
  name: string;
}

export interface LoginActions {
  setName: (name: string) => void;
}

export type LoginStore = LoginState & LoginActions;

const initialState: LoginState = {
  name: '',
};

export const useLoginStore = create<LoginStore>((set) => ({
  ...initialState,
  
  setName: (name) =>
    set({ name }),
}));