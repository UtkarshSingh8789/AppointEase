import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isBefore,
  isAfter,
  isToday,
  parseISO,
} from 'date-fns';
import { cn } from '@/utils/cn';

interface DatePickerProps {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Beautiful calendar-based date picker with month navigation */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, min, max, label, error, placeholder = 'Select a date', disabled, className = '', id }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
      if (value) return startOfMonth(parseISO(value));
      return startOfMonth(new Date());
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const minDate = min ? parseISO(min) : undefined;
    const maxDate = max ? parseISO(max) : undefined;
    const selectedDate = value ? parseISO(value) : undefined;

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate calendar days
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    const isDateDisabled = (date: Date) => {
      if (minDate && isBefore(date, minDate)) return true;
      if (maxDate && isAfter(date, maxDate)) return true;
      return false;
    };

    const handleDateSelect = (date: Date) => {
      if (isDateDisabled(date)) return;
      const formatted = format(date, 'yyyy-MM-dd');
      onChange?.({ target: { value: formatted } });
      setIsOpen(false);
    };

    const goToPrevMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentMonth(subMonths(currentMonth, 1));
    };

    const goToNextMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentMonth(addMonths(currentMonth, 1));
    };

    return (
      <div className={cn('w-full relative', className)} ref={containerRef}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Hidden native input for form compatibility */}
        <input
          ref={ref}
          type="hidden"
          id={inputId}
          value={value || ''}
          aria-invalid={!!error}
        />

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 border rounded-lg text-sm text-left transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            error
              ? 'border-red-300 dark:border-red-600'
              : 'border-gray-300 dark:border-gray-600',
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer',
            isOpen && 'ring-2 ring-blue-500 border-blue-500',
          )}
        >
          <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className={cn(
            'flex-1',
            value
              ? 'text-gray-900 dark:text-gray-100 font-medium'
              : 'text-gray-500 dark:text-gray-400'
          )}>
            {value ? format(parseISO(value), 'EEE, MMM d, yyyy') : placeholder}
          </span>
          <ChevronRight className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-90'
          )} />
        </button>

        {/* Calendar dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full min-w-[300px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => {
                const isCurrentMonth = isSameMonth(d, currentMonth);
                const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
                const isTodayDate = isToday(d);
                const isDisabled = isDateDisabled(d) || !isCurrentMonth;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(d)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full aspect-square flex items-center justify-center text-sm rounded-lg transition-all',
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : isTodayDate && isCurrentMonth
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-300 dark:ring-blue-700'
                        : isCurrentMonth && !isDisabled
                        ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                      !isDisabled && !isSelected && 'hover:scale-110',
                    )}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  if (!isDateDisabled(today)) handleDateSelect(today);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = addDays(new Date(), 1);
                  if (!isDateDisabled(tomorrow)) handleDateSelect(tomorrow);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextWeek = addDays(new Date(), 7);
                  if (!isDateDisabled(nextWeek)) handleDateSelect(nextWeek);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Next week
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
