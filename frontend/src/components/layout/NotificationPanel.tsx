import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationIllustration } from '@/components/illustrations';
import { formatDate } from '@/utils';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Slide-out notification panel from the header bell icon */
export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, isLoading, fetchNotifications, markRead, markAllRead } =
    useNotificationStore();
  const hasUnread = notifications.some((n) => !n.is_read);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications({ page: 1, size: 20 });
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = async (notification: { id: string; is_read: boolean; link: string | null }) => {
    if (!notification.is_read) {
      await markRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    onClose();
  };

  const getTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Notifications
          </h3>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                onClick={() => markAllRead()}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium flex items-center gap-1"
                aria-label="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-24 h-24 text-primary-400 dark:text-primary-600 mb-3">
                <NotificationIllustration />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notification.is_read ? 'border-l-2 border-l-primary-500' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      !notification.is_read ? 'bg-primary-500' : 'bg-transparent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        !notification.is_read
                          ? 'font-medium text-gray-900 dark:text-gray-100'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {getTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
