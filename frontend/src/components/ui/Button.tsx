import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-black text-white hover:bg-neutral-800 hover:text-white focus:ring-black border-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:hover:text-black dark:border-white',
  secondary:
    'bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white focus:ring-black border-black dark:border-white',
  outline:
    'bg-transparent text-black dark:text-white hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white focus:ring-black border-black dark:border-white',
  danger:
    'bg-black text-white hover:bg-neutral-800 hover:text-white focus:ring-black border-black dark:bg-white dark:text-black dark:hover:bg-red-600 dark:hover:text-white dark:border-white',
  ghost:
    'bg-transparent text-black dark:text-white hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white focus:ring-black border-transparent',
  gradient:
    'bg-black text-white hover:bg-neutral-800 hover:text-white focus:ring-black border-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:hover:text-black dark:border-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/** Reusable button component with variants, sizes, loading state, and micro-interactions */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium border',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        'active:translate-y-0 active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
