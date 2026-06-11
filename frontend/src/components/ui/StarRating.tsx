import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/** Interactive star rating component (1-5 stars) */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayValue;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform focus:outline-none focus:ring-1 focus:ring-primary-500 rounded`}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                isFilled
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300 dark:text-gray-600'
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
};
