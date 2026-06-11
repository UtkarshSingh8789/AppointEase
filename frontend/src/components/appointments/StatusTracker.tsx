import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  Send,
  Star,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import type { AppointmentStatus } from '@/types';

interface StatusStep {
  label: string;
  description: string;
  icon: React.ReactNode;
  timestamp?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isCancelled?: boolean;
}

interface StatusTrackerProps {
  status: AppointmentStatus;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  className?: string;
}

function getSteps(
  status: AppointmentStatus,
  createdAt: string,
  confirmedAt?: string,
  completedAt?: string,
  cancelledAt?: string
): StatusStep[] {
  const formatTs = (ts?: string) => {
    if (!ts) return undefined;
    try {
      return format(new Date(ts), 'MMM d, h:mm a');
    } catch {
      return ts;
    }
  };

  const isCancelled = status === 'cancelled' || status === 'rejected';

  const steps: StatusStep[] = [
    {
      label: 'Booked',
      description: 'Appointment request submitted',
      icon: <Send className="w-4 h-4" />,
      timestamp: formatTs(createdAt),
      isCompleted: true,
      isCurrent: status === 'pending',
    },
    {
      label: 'Confirmed',
      description: 'Provider accepted your booking',
      icon: <CheckCircle className="w-4 h-4" />,
      timestamp: formatTs(confirmedAt),
      isCompleted: ['confirmed', 'completed'].includes(status),
      isCurrent: status === 'confirmed',
    },
    {
      label: 'Reminder Sent',
      description: 'Reminder notification delivered',
      icon: <Clock className="w-4 h-4" />,
      isCompleted: ['confirmed', 'completed'].includes(status),
      isCurrent: false,
    },
    {
      label: 'Completed',
      description: 'Appointment finished successfully',
      icon: <Star className="w-4 h-4" />,
      timestamp: formatTs(completedAt),
      isCompleted: status === 'completed',
      isCurrent: status === 'completed',
    },
  ];

  // If cancelled/rejected, replace the last steps
  if (isCancelled) {
    const cancelStep: StatusStep = {
      label: status === 'cancelled' ? 'Cancelled' : 'Rejected',
      description:
        status === 'cancelled'
          ? 'Appointment was cancelled'
          : 'Provider declined the booking',
      icon: <XCircle className="w-4 h-4" />,
      timestamp: formatTs(cancelledAt),
      isCompleted: true,
      isCurrent: true,
      isCancelled: true,
    };

    // Keep only booked step + cancel step
    return [steps[0], cancelStep];
  }

  return steps;
}

/** Visual appointment status tracker (like package tracking) */
export const StatusTracker: React.FC<StatusTrackerProps> = ({
  status,
  createdAt,
  confirmedAt,
  completedAt,
  cancelledAt,
  className,
}) => {
  const steps = getSteps(status, createdAt, confirmedAt, completedAt, cancelledAt);

  return (
    <div className={cn('relative', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex gap-4"
          >
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors',
                  step.isCancelled && 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                  step.isCompleted && !step.isCancelled && 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                  step.isCurrent && !step.isCompleted && !step.isCancelled && 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-2 ring-primary-500/30',
                  !step.isCompleted && !step.isCurrent && !step.isCancelled && 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                )}
              >
                {step.icon}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[32px] my-1',
                    step.isCompleted && !step.isCancelled
                      ? 'bg-green-300 dark:bg-green-700'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  step.isCancelled && 'text-red-600 dark:text-red-400',
                  step.isCompleted && !step.isCancelled && 'text-gray-900 dark:text-gray-100',
                  step.isCurrent && !step.isCompleted && 'text-primary-600 dark:text-primary-400',
                  !step.isCompleted && !step.isCurrent && !step.isCancelled && 'text-gray-400 dark:text-gray-500'
                )}
              >
                {step.label}
                {step.isCurrent && !step.isCancelled && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    Current
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {step.description}
              </p>
              {step.timestamp && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {step.timestamp}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
