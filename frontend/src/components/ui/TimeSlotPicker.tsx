import React from 'react';
import { formatTime } from '@/utils';
import type { TimeSlot } from '@/types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelect: (startTime: string) => void;
  isLoading?: boolean;
}

/** Grid of available time slots for selection */
export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelect,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No available slots for this date
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Available time slots">
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot.start_time;
        const isDisabled = !slot.is_available;

        return (
          <button
            key={slot.start_time}
            type="button"
            onClick={() => !isDisabled && onSelect(slot.start_time)}
            disabled={isDisabled}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${isSelected
                ? 'bg-primary-600 text-white ring-2 ring-primary-600 ring-offset-2'
                : isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-700 border border-gray-200'
              }
            `}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isDisabled}
          >
            {formatTime(slot.start_time)}
          </button>
        );
      })}
    </div>
  );
};
