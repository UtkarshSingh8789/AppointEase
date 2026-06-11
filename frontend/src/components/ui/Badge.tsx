import React from 'react';
import type { AppointmentStatus } from '@/types';

interface BadgeProps {
  status: AppointmentStatus;
  className?: string;
}

const statusConfig: Record<AppointmentStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
  confirmed: { label: 'Confirmed', classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  completed: { label: 'Completed', classes: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  rejected: { label: 'Rejected', classes: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
};

/** Status badge component for appointments */
export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
};
