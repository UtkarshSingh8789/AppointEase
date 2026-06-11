import React from 'react';

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'table-row';

interface SkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  lines?: number;
  className?: string;
}

/** Animated skeleton loader with multiple variants */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  count = 1,
  lines = 3,
  className = '',
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  if (variant === 'text') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={`flex gap-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${baseClasses} w-10 h-10 rounded-full`} />
        ))}
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`${baseClasses} w-10 h-10 rounded-full flex-shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`${baseClasses} h-4 w-3/4`} />
              <div className={`${baseClasses} h-3 w-1/2`} />
            </div>
            <div className={`${baseClasses} h-6 w-16 rounded-full`} />
          </div>
        ))}
      </div>
    );
  }

  // Card variant
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6"
        >
          <div className="flex items-start gap-4">
            <div className={`${baseClasses} w-12 h-12 rounded-full flex-shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`${baseClasses} h-4 w-3/4`} />
              <div className={`${baseClasses} h-3 w-1/2`} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className={`${baseClasses} h-3 w-full`} />
            <div className={`${baseClasses} h-3 w-2/3`} />
            <div className={`${baseClasses} h-3 w-1/2`} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className={`${baseClasses} h-5 w-20`} />
          </div>
        </div>
      ))}
    </div>
  );
};

/** Skeleton for stat cards */
export const SkeletonStats: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6"
        >
          <div className="flex items-center justify-between">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg w-10 h-10" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-7 w-16" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};
