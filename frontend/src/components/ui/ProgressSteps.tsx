import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

/** Horizontal step indicator for multi-step flows */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({ steps, currentStep, className }) => {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <li
              key={step}
              className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}
            >
              <div className="flex items-center gap-2">
                {/* Step circle */}
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300 flex-shrink-0',
                    isCompleted && 'bg-primary-600 text-white',
                    isCurrent && 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900/30',
                    isUpcoming && 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:block whitespace-nowrap',
                    isCompleted && 'text-primary-600 dark:text-primary-400',
                    isCurrent && 'text-gray-900 dark:text-gray-100',
                    isUpcoming && 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {step}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-3 transition-colors duration-300',
                    isCompleted ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
