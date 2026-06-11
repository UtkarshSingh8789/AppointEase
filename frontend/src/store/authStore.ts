import { create } from 'zustand';
import type { User, LoginCredentials, RegisterData } from '@/types';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

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
    const token = localStorage.getItem('access_token');
    if (token && !get().user) {
      set({ isLoading: true });
      try {
        const user = await authService.getMe();
        set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
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
