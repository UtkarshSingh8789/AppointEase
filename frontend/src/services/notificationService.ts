import api from './api';
import type { Notification } from '@/types';

interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Notification service for managing user notifications */
export const notificationService = {
  /** Get paginated list of notifications */
  async getNotifications(params?: {
    page?: number;
    size?: number;
    unread_only?: boolean;
  }): Promise<NotificationListResponse> {
    const response = await api.get<NotificationListResponse>('/notifications', { params });
    return response.data;
  },

  /** Get count of unread notifications */
  async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data;
  },

  /** Mark a single notification as read */
  async markRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  /** Mark all notifications as read */
  async markAllRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },

  /** Delete a notification */
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
