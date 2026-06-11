import { create } from 'zustand';
import type { Notification } from '@/types';
import { notificationService } from '@/services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  fetchNotifications: (params?: { page?: number; size?: number }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,

  fetchNotifications: async (params) => {
    set({ isLoading: true });
    try {
      const response = await notificationService.getNotifications(params);
      set({
        notifications: response.notifications,
        total: response.total,
        page: response.page,
        totalPages: response.total_pages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await notificationService.getUnreadCount();
      set({ unreadCount: data.count });
    } catch {
      // Silently fail — non-critical
    }
  },

  markRead: async (id: string) => {
    try {
      await notificationService.markRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // Silently fail
    }
  },

  markAllRead: async () => {
    try {
      await notificationService.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // Silently fail
    }
  },
}));
