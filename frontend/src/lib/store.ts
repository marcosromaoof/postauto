import { create } from 'zustand';
import { Admin } from '@/types';

interface AuthState {
  user: Admin | null;
  isAuthenticated: boolean;
  setUser: (user: Admin | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
