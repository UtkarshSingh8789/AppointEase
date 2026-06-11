import React from 'react';
import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

export type TimelineStepStatus = 'completed' | 'current' | 'pending';

export interface TimelineStep {
  label: string;
  time?: string;
  description?: string;
  status: TimelineStepStatus;
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

const statusConfig: Record<TimelineStepStatus, { icon: React.ReactNode; dotClass: string; lineClass: string }> = {
  completed: {
    icon: <Check className="w-3 h-3 text-white" />,
    dotClass: 'bg-green-500',
    lineClass: 'bg-green-500',
  },
  current: {
    icon: <Clock className="w-3 h-3 text-white" />,
    dotClass: 'bg-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/30',
    lineClass: 'bg-gray-200 dark:bg-gray-700',
  },
  pending: {
    icon: <Circle className="w-3 h-3 text-gray-400" />,
    dotClass: 'bg-gray-200 dark:bg-gray-700',
    lineClass: 'bg-gray-200 dark:bg-gray-700',
  },
};

/** Vertical timeline for displaying appointment status history */
export const Timeline: React.FC<TimelineProps> = ({ steps, className }) => {
  return (
    <div className={cn('relative', className)} role="list" aria-label="Timeline">
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="relative flex gap-4 pb-6 last:pb-0" role="listitem">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[13px] top-7 w-0.5 h-[calc(100%-20px)]',
                  config.lineClass
                )}
                aria-hidden="true"
              />
            )}

            {/* Dot/Icon */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0',
                config.dotClass
              )}
              aria-hidden="true"
            >
              {config.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p
                className={cn(
                  'text-sm font-medium',
                  step.status === 'pending'
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-900 dark:text-gray-100'
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {step.description}
                </p>
              )}
              {step.time && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {step.time}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
