import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Inbox,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { useNotificationStore } from '@/store/notificationStore';
import { notificationService } from '@/services/notificationService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/utils/cn';
import type { Notification } from '@/types';

type FilterCategory = 'all' | 'bookings' | 'system';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Maps notification type to an appropriate icon */
function getNotificationIcon(type: string) {
  switch (type) {
    case 'appointment_confirmed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'appointment_cancelled':
    case 'appointment_rejected':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'appointment_booked':
    case 'appointment_reminder':
    case 'appointment_completed':
      return <Calendar className="w-5 h-5 text-primary-500" />;
    case 'system':
      return <Bell className="w-5 h-5 text-amber-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
  }
}

/** Determines if a notification type belongs to the bookings category */
function isBookingType(type: string): boolean {
  return [
    'appointment_booked',
    'appointment_confirmed',
    'appointment_cancelled',
    'appointment_rejected',
    'appointment_completed',
    'appointment_reminder',
  ].includes(type);
}

/** Groups notifications by date: Today, Yesterday, Earlier */
function groupByDate(notifications: Notification[]) {
  const groups: { label: string; notifications: Notification[] }[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const notification of notifications) {
    const date = new Date(notification.created_at);
    if (isToday(date)) {
      today.push(notification);
    } else if (isYesterday(date)) {
      yesterday.push(notification);
    } else {
      earlier.push(notification);
    }
  }

  if (today.length > 0) groups.push({ label: 'Today', notifications: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', notifications: yesterday });
  if (earlier.length > 0) groups.push({ label: 'Earlier', notifications: earlier });

  return groups;
}

const filterTabs: { key: FilterCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'system', label: 'System' },
];

/** Slide-out notification center panel */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications({ page: 1, size: 50 });
    }
  }, [isOpen, fetchNotifications]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'bookings') return notifications.filter((n) => isBookingType(n.type));
    return notifications.filter((n) => n.type === 'system');
  }, [notifications, activeFilter]);

  const groupedNotifications = useMemo(
    () => groupByDate(filteredNotifications),
    [filteredNotifications]
  );

  const handleMarkRead = (notification: Notification) => {
    if (!notification.is_read) {
      markRead(notification.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await notificationService.deleteNotification(id);
      await fetchNotifications({ page: 1, size: 50 });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-out panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 flex flex-col h-full w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Notification center"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h2>
              <div className="flex items-center gap-2">
                {notifications.some((n) => !n.is_read) && (
                  <button
                    onClick={markAllRead}
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Mark all notifications as read"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close notification center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100 dark:border-gray-800">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    activeFilter === tab.key
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  aria-pressed={activeFilter === tab.key}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : groupedNotifications.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">
                    No notifications
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You&apos;re all caught up! We&apos;ll notify you when something new arrives.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {groupedNotifications.map((group) => (
                    <div key={group.label}>
                      {/* Date group label */}
                      <div className="px-6 py-2 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {group.label}
                        </span>
                      </div>

                      {/* Notification items */}
                      <AnimatePresence mode="popLayout">
                        {group.notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.2 }}
                          >
                            <NotificationItem
                              notification={notification}
                              onMarkRead={handleMarkRead}
                              onDelete={handleDelete}
                              isDeleting={deletingIds.has(notification.id)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>

          {/* Delete confirmation dialog */}
          <ConfirmDialog
            isOpen={!!deleteConfirmId}
            onClose={() => setDeleteConfirmId(null)}
            onConfirm={confirmDelete}
            title="Delete Notification"
            message="Are you sure you want to delete this notification? This action cannot be undone."
            confirmLabel="Delete"
            variant="danger"
          />
        </>
      )}
    </AnimatePresence>
  );
};

/** Individual notification item */
interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (notification: Notification) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  isDeleting: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDelete,
  isDeleting,
}) => {
  const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <button
      onClick={() => !notification.is_read && onMarkRead(notification)}
      className={cn(
        'group w-full flex items-start gap-3 px-6 py-4 text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
        !notification.is_read && 'bg-primary-50/40 dark:bg-primary-900/10 hover:bg-primary-50/60 dark:hover:bg-primary-900/20 cursor-pointer',
        notification.is_read && 'hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-default'
      )}
      aria-label={`${notification.is_read ? 'Read' : 'Unread — click to mark as read'}: ${notification.title}. ${notification.message}. ${relativeTime}`}
      disabled={isDeleting}
      aria-disabled={notification.is_read}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {notification.title}
          </p>
          {/* Unread indicator */}
          {!notification.is_read && (
            <span
              className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary-500"
              aria-hidden="true"
            />
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {notification.message}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{relativeTime}</span>
        </div>
      </div>

      {/* Delete button (visible on hover) */}
      <button
        onClick={(e) => onDelete(e, notification.id)}
        className={cn(
          'flex-shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-gray-500',
          'hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
          'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500'
        )}
        aria-label={`Delete notification: ${notification.title}`}
        tabIndex={0}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </button>
  );
};
