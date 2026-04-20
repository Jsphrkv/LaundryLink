// ─── auth.store.ts ────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string, role: User['role']) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getCurrentUser();
      set({ user, isInitialized: true });
    } catch {
      set({ user: null, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await authService.signIn(email, password);
      const user = await authService.getCurrentUser();
      set({ user });
    } catch (err: any) {
      set({ error: err.message || 'Sign in failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, fullName, phone, role) => {
    set({ isLoading: true, error: null });
    try {
      await authService.signUp(email, password, fullName, phone, role);
      const user = await authService.getCurrentUser();
      set({ user });
    } catch (err: any) {
      set({ error: err.message || 'Sign up failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await authService.signOut();
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return;
    const updated = await authService.updateProfile(user.id, updates);
    set({ user: updated });
  },

  clearError: () => set({ error: null }),
}));
