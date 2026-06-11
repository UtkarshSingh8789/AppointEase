import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { getProviderImage } from '@/utils/providerImages';

/**
 * Cartoon avatar options rendered as colorful SVGs.
 * This keeps the UI consistent without exposing real face photos.
 */
const AVATAR_OPTIONS = [
  ...Array.from({ length: 16 }, (_, index) => {
    const value = `avatar-${index + 1}`;
    return {
      id: value,
      url: getProviderImage(value),
      label: `Cartoon avatar ${index + 1}`,
    };
  }),
];

interface AvatarSelectorProps {
  currentAvatar?: string | null;
  onSelect: (url: string) => void;
  userName?: string;
}

/**
 * Avatar selector grid - allows users to pick from colorful cartoon avatars.
 * Shows a checkmark on the currently selected avatar.
 */
export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  currentAvatar,
  onSelect,
  userName,
}) => {
  const [selected, setSelected] = useState<string | null>(currentAvatar || null);

  const handleSelect = (url: string) => {
    setSelected(url);
    onSelect(url);
  };

  return (
    <div className="space-y-4">
      {/* Current avatar preview */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {selected ? (
            <img
              src={selected}
              alt="Selected avatar"
              className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-500 dark:text-gray-400">
              {userName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {selected ? 'Avatar selected' : 'Choose an avatar'}
          </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
            Select from colorful avatar illustrations below
            </p>
          </div>
        </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {AVATAR_OPTIONS.map((avatar, index) => (
          <motion.button
            key={avatar.id}
            type="button"
            onClick={() => handleSelect(avatar.url)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
            className={cn(
              'relative rounded-full overflow-hidden aspect-square border-2 transition-all hover:scale-110',
              selected === avatar.url
                ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <img
              src={avatar.url}
              alt={avatar.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {selected === avatar.url && (
              <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Remove avatar option */}
      {selected && (
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            onSelect('');
          }}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Remove avatar (use initials instead)
        </button>
      )}
    </div>
  );
};
