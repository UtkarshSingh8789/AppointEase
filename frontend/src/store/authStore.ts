import { create } from 'zustand';
import type { User, LoginCredentials, RegisterData } from '@/types';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

let initializePromise: Promise<void> | null = null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
        return;
      }

      if (get().user && get().isInitialized) {
        set({ isInitialized: true, isAuthenticated: true });
        return;
      }

      set({ isLoading: true });
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
          return;
        } catch (error: unknown) {
          const err = error as { response?: { status?: number } };
          const status = err.response?.status;

          if (status === 401 || status === 403) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
            return;
          }

          if (attempt < maxAttempts) {
            await wait(250 * Math.pow(2, attempt - 1));
            continue;
          }

          // Network or server error after retries: clear stale tokens to prevent blank screens / reload loops.
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
          return;
        }
      }
    })().finally(() => {
      initializePromise = null;
    });

    return initializePromise;
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      const user = response.user!;
      // Set state synchronously so navigation can happen immediately after
      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
      toast.success(`Welcome back, ${user.full_name}!`);
      return user;
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Invalid credentials');
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      const response = await authService.register(data);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      const user = response.user!;
      // Set state synchronously so navigation can happen immediately after
      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
      toast.success('Account created successfully!');
      return user;
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Registration failed');
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
    }
  },

  updateUser: async (data: Partial<User>) => {
    try {
      const user = await authService.updateProfile(data);
      set({ user });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    }
  },
}));
