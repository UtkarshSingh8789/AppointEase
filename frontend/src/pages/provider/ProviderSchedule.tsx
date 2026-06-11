import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Eye } from 'lucide-react';
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
  isToday,
} from 'date-fns';
import { appointmentService } from '@/services/appointmentService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatTime } from '@/utils';
import { cn } from '@/utils/cn';
import type { Appointment } from '@/types';

export const ProviderSchedule: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        // Fetch appointments with max allowed page size (all statuses)
        const data = await appointmentService.getAppointments({
          status: 'pending,confirmed,completed,cancelled,rejected',
          size: 100,
        });
        setAppointments(data.appointments);
      } catch {
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  // Generate calendar days for the full month view (including padding days from prev/next month)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter((a) => {
      const matchesDay = a.appointment_date === dateStr;
      if (!matchesDay) return false;
      if (viewFilter === 'cancelled') return a.status === 'cancelled' || a.status === 'rejected';
      if (viewFilter === 'past') return a.status === 'completed' || isBefore(new Date(`${a.appointment_date}T00:00:00`), new Date()) && a.status !== 'cancelled' && a.status !== 'rejected';
      if (viewFilter === 'upcoming') return a.status === 'pending' || a.status === 'confirmed';
      return true;
    });
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const selectedDayAppointments = selectedDate ? getAppointmentsForDay(selectedDate) : [];
  const isPastDate = selectedDate ? isBefore(selectedDate, new Date()) && !isToday(selectedDate) : false;
  const statusChips: { key: 'all' | 'upcoming' | 'past' | 'cancelled'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading schedule..." />;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Schedule</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Full month view of your appointments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setViewFilter(chip.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                viewFilter === chip.key
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {chip.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Upcoming</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Completed</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Cancelled</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar - takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="dark:bg-gray-800 dark:border-gray-700 p-0 overflow-hidden">
              {/* Month navigation */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[160px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="secondary" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                  <div
                    key={dayName}
                    className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((calDay, index) => {
                  const dayAppts = getAppointmentsForDay(calDay);
                  const isCurrentMonth = isSameMonth(calDay, currentMonth);
                  const isTodayDate = isToday(calDay);
                  const isSelected = selectedDate ? isSameDay(calDay, selectedDate) : false;
                  const isPast = isBefore(calDay, new Date()) && !isTodayDate;

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(calDay)}
                      className={cn(
                        'relative min-h-[80px] p-1.5 border-b border-r border-gray-100 dark:border-gray-700/50 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30',
                        !isCurrentMonth && 'bg-gray-50/50 dark:bg-gray-800/50',
                        isSelected && 'ring-2 ring-blue-500 ring-inset bg-blue-50/50 dark:bg-blue-900/20',
                        isTodayDate && !isSelected && 'bg-blue-50 dark:bg-blue-900/10',
                      )}
                    >
                      {/* Date number */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full',
                            isTodayDate
                              ? 'bg-blue-600 text-white font-bold'
                              : isCurrentMonth
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-600',
                            isPast && isCurrentMonth && !isTodayDate && 'text-gray-500 dark:text-gray-500',
                          )}
                        >
                          {format(calDay, 'd')}
                        </span>
                        {dayAppts.length > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {dayAppts.length}
                          </span>
                        )}
                      </div>

                      {/* Appointment indicators */}
                      <div className="space-y-0.5">
                        {dayAppts.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            className={cn(
                              'px-1 py-0.5 rounded text-[10px] truncate',
                              apt.status === 'confirmed'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : apt.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : apt.status === 'pending'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            )}
                          >
                            {formatTime(apt.start_time)} {apt.customer?.full_name?.split(' ')[0] || ''}
                          </div>
                        ))}
                        {dayAppts.length > 2 && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-1">
                            +{dayAppts.length - 2} more
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Selected day detail panel */}
          <div className="lg:col-span-1">
            <Card className="dark:bg-gray-800 dark:border-gray-700 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a date'}
                </h3>
                {isPastDate && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    <Eye className="w-3 h-3" />
                    View only
                  </span>
                )}
                {selectedDate && isToday(selectedDate) && (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </div>

              {selectedDayAppointments.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-8 h-8 text-gray-400" />}
                  title="No appointments"
                  description={
                    selectedDate
                      ? `No appointments on ${format(selectedDate, 'MMM d, yyyy')}`
                      : 'Select a date to view appointments'
                  }
                />
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {selectedDayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={cn(
                        'p-3 rounded-lg border transition-all',
                        isPastDate
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-80'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {apt.customer?.full_name || 'Customer'}
                        </p>
                        <Badge status={apt.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                        </span>
                      </div>
                      {apt.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {apt.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
