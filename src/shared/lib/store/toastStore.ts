import { create } from 'zustand';

interface ToastState {
  message: string | null;
  id: number;
  showToast: (message: string) => void;
  closeToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  id: 0,
  showToast: (message) => set((state) => ({ message, id: state.id + 1 })),
  closeToast: () => set({ message: null }),
}));
