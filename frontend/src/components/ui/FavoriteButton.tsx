import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { favoriteService } from '@/services/favoriteService';
import toast from 'react-hot-toast';

interface FavoriteButtonProps {
  providerId: string;
  isFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
  className?: string;
}

/** Heart icon button that toggles favorite state for a provider */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  providerId,
  isFavorited = false,
  onToggle,
  className = '',
}) => {
  const [favorited, setFavorited] = useState(isFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (favorited) {
        await favoriteService.removeFavorite(providerId);
        setFavorited(false);
        onToggle?.(false);
        toast.success('Removed from favorites');
      } else {
        await favoriteService.addFavorite(providerId);
        setFavorited(true);
        onToggle?.(true);
        toast.success('Added to favorites');
      }
    } catch {
      toast.error('Failed to update favorites');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
        favorited
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500'
      } disabled:opacity-50 ${className}`}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`w-5 h-5 ${favorited ? 'fill-red-500' : ''}`}
      />
    </button>
  );
};
