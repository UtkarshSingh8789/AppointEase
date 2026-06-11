import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
  className?: string;
}

/** Statistics card with icon, value, label, optional trend, and optional link */
export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  trend,
  href,
  className = '',
}) => {
  const content = (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6',
        href && 'hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          {icon}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
};
