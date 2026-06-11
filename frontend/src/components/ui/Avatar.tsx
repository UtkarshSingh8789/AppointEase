import React, { useState } from 'react';
import { getInitials } from '@/utils';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg',
  '2xl': 'w-28 h-28 text-2xl',
};

/** Avatar component with colorful image or fallback initials. */
export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${sizeClasses[size]} ${className}`}
        onError={() => setImgError(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 flex items-center justify-center font-medium flex-shrink-0 ${sizeClasses[size]} ${className}`}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};
