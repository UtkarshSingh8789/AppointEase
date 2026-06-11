import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  linkTo?: string;
}

/**
 * Premium AppointEase logo — a monochrome calendar-check mark
 * rendered as an inline SVG. Straight edges, no rounded corners.
 * Uses currentColor so it inherits from the parent's text color.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className,
  linkTo = '/',
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-base' },
    md: { icon: 'w-9 h-9', text: 'text-lg' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' },
  };

  const s = sizeMap[size];

  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {/* Icon mark: calendar with checkmark, straight edges */}
      <span
        className={cn(
          s.icon,
          'flex-shrink-0 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center'
        )}
        aria-hidden="true"
      >
        <svg
          data-logo="true"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[60%] h-[60%]"
          style={{ filter: 'none' }}
        >
          {/* Calendar body */}
          <rect x="2" y="6" width="28" height="24" stroke="currentColor" strokeWidth="2.5" />
          {/* Calendar header bar */}
          <rect x="2" y="6" width="28" height="7" fill="currentColor" />
          {/* Calendar hangers */}
          <rect x="9" y="2" width="2.5" height="7" fill="currentColor" />
          <rect x="20.5" y="2" width="2.5" height="7" fill="currentColor" />
          {/* Checkmark */}
          <path
            d="M10 19.5 L14.5 24 L23 15.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </span>

      {/* Wordmark */}
      {showText && (
        <span
          className={cn(
            s.text,
            'font-bold tracking-tight text-gray-900 dark:text-gray-100'
          )}
        >
          Appoint<span className="font-extrabold">Ease</span>
        </span>
      )}
    </span>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} aria-label="AppointEase — Go to home">
        {content}
      </Link>
    );
  }

  return content;
};
