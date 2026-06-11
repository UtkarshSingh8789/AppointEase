import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/** Centered loading spinner with optional text */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  text,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`} role="status">
      <Loader2 className={`animate-spin text-primary-600 dark:text-primary-400 ${sizeClasses[size]}`} />
      {text && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{text}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  );
};
