import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils';
import type { Appointment } from '@/types';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

interface MultiViewCalendarProps {
  appointments: Appointment[];
  onDateSelect?: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-500';
    case 'pending':
      return 'bg-amber-500';
    case 'completed':
      return 'bg-blue-500';
    case 'cancelled':
    case 'rejected':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

/** Multi-view calendar with day, week, month, and agenda views */
export const MultiViewCalendar: React.FC<MultiViewCalendarProps> = ({
  appointments,
  onDateSelect,
  onAppointmentClick,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Navigation
  const navigateBack = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const navigateForward = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    return appointments.filter((apt) => {
      try {
        return isSameDay(new Date(apt.appointment_date), date);
      } catch {
        return false;
      }
    });
  };

  // Month view days
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  }, [currentDate, viewMode]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={navigateBack}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[200px] text-center">
            {headerTitle}
          </h3>
          <button
            onClick={navigateForward}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            Today
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {([
            { key: 'month', icon: LayoutGrid, label: 'Month' },
            { key: 'week', icon: CalendarIcon, label: 'Week' },
            { key: 'agenda', icon: List, label: 'Agenda' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                viewMode === key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
              aria-pressed={viewMode === key}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {viewMode === 'month' && (
            <MonthView
              days={monthDays}
              currentDate={currentDate}
              selectedDate={selectedDate}
              getAppointmentsForDate={getAppointmentsForDate}
              onDateClick={handleDateClick}
              onAppointmentClick={onAppointmentClick}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              days={weekDays}
              selectedDate={selectedDate}
              getAppointmentsForDate={getAppointmentsForDate}
              onDateClick={handleDateClick}
              onAppointmentClick={onAppointmentClick}
            />
          )}
          {viewMode === 'agenda' && (
            <AgendaView
              appointments={appointments}
              onAppointmentClick={onAppointmentClick}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/** Month grid view */
const MonthView: React.FC<{
  days: Date[];
  currentDate: Date;
  selectedDate: Date | null;
  getAppointmentsForDate: (date: Date) => Appointment[];
  onDateClick: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}> = ({ days, currentDate, selectedDate, getAppointmentsForDate, onDateClick, onAppointmentClick }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
    {/* Day headers */}
    <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
        <div key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {day}
        </div>
      ))}
    </div>

    {/* Day cells */}
    <div className="grid grid-cols-7">
      {days.map((day) => {
        const dayAppointments = getAppointmentsForDate(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isSelected = selectedDate && isSameDay(day, selectedDate);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDateClick(day)}
            className={cn(
              'relative min-h-[80px] p-1.5 border-b border-r border-gray-100 dark:border-gray-700/50 text-left transition-colors',
              'hover:bg-gray-50 dark:hover:bg-gray-800/30',
              !isCurrentMonth && 'opacity-40',
              isSelected && 'bg-primary-50 dark:bg-primary-900/10 ring-1 ring-inset ring-primary-200 dark:ring-primary-800'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full',
                isToday(day)
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {format(day, 'd')}
            </span>

            {/* Appointment dots */}
            {dayAppointments.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick?.(apt);
                    }}
                    className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getStatusDotColor(apt.status))} />
                    <span className="truncate text-gray-600 dark:text-gray-400">
                      {formatTime(apt.start_time)}
                    </span>
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                    +{dayAppointments.length - 3} more
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

/** Week view with time slots */
const WeekView: React.FC<{
  days: Date[];
  selectedDate: Date | null;
  getAppointmentsForDate: (date: Date) => Appointment[];
  onDateClick: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}> = ({ days, selectedDate, getAppointmentsForDate, onDateClick, onAppointmentClick }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
    {/* Day headers */}
    <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      {days.map((day) => (
        <button
          key={day.toISOString()}
          onClick={() => onDateClick(day)}
          className={cn(
            'px-2 py-3 text-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
            selectedDate && isSameDay(day, selectedDate) && 'bg-primary-50 dark:bg-primary-900/10'
          )}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">{format(day, 'EEE')}</p>
          <p
            className={cn(
              'text-lg font-semibold mt-0.5',
              isToday(day)
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-900 dark:text-gray-100'
            )}
          >
            {format(day, 'd')}
          </p>
        </button>
      ))}
    </div>

    {/* Appointments for each day */}
    <div className="grid grid-cols-7 min-h-[300px]">
      {days.map((day) => {
        const dayAppointments = getAppointmentsForDate(day);
        return (
          <div
            key={day.toISOString()}
            className="border-r border-gray-100 dark:border-gray-700/50 last:border-r-0 p-1.5 space-y-1"
          >
            {dayAppointments.map((apt) => (
              <button
                key={apt.id}
                onClick={() => onAppointmentClick?.(apt)}
                className={cn(
                  'w-full text-left p-1.5 rounded-md text-[11px] transition-colors',
                  'hover:ring-1 hover:ring-primary-300 dark:hover:ring-primary-700',
                  apt.status === 'confirmed' && 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300',
                  apt.status === 'pending' && 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
                  apt.status === 'completed' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
                  (apt.status === 'cancelled' || apt.status === 'rejected') && 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                )}
              >
                <p className="font-medium truncate">{formatTime(apt.start_time)}</p>
                <p className="truncate opacity-75">
                  {apt.provider?.user?.full_name || apt.customer?.full_name || 'Appointment'}
                </p>
              </button>
            ))}
            {dayAppointments.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/** Agenda list view */
const AgendaView: React.FC<{
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
}> = ({ appointments, onAppointmentClick }) => {
  // Sort by date and time
  const sorted = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [appointments]);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-xl">
        <CalendarIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No appointments scheduled</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700/50 overflow-hidden">
      {sorted.map((apt) => (
        <button
          key={apt.id}
          onClick={() => onAppointmentClick?.(apt)}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          {/* Date badge */}
          <div className="flex-shrink-0 w-12 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {format(new Date(apt.appointment_date), 'MMM')}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {format(new Date(apt.appointment_date), 'd')}
            </p>
          </div>

          {/* Status indicator */}
          <div className={cn('w-1 h-10 rounded-full flex-shrink-0', getStatusDotColor(apt.status))} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {apt.provider?.user?.full_name || apt.customer?.full_name || 'Appointment'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(apt.start_time)} – {apt.end_time ? formatTime(apt.end_time) : ''}
            </p>
          </div>

          {/* Status badge */}
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
              apt.status === 'confirmed' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
              apt.status === 'pending' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
              apt.status === 'completed' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
              (apt.status === 'cancelled' || apt.status === 'rejected') && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            )}
          >
            {apt.status}
          </span>
        </button>
      ))}
    </div>
  );
};
