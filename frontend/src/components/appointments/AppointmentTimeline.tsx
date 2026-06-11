import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils';
import type { Appointment } from '@/types';

interface AppointmentTimelineProps {
  appointments: Appointment[];
  maxItems?: number;
  showViewAll?: boolean;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-blue-500" />;
    case 'cancelled':
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'pending':
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed':
      return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    case 'completed':
      return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    case 'cancelled':
    case 'rejected':
      return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    case 'pending':
      return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
    default:
      return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
  }
}

function getDateLabel(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/** Visual timeline of appointments with status indicators and date grouping */
export const AppointmentTimeline: React.FC<AppointmentTimelineProps> = ({
  appointments,
  maxItems = 10,
  showViewAll = true,
}) => {
  const displayedAppointments = appointments.slice(0, maxItems);

  if (displayedAppointments.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No appointments to show</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700"
          aria-hidden="true"
        />

        {displayedAppointments.map((appointment, index) => {
          const isUpcoming = !isPast(parseISO(`${appointment.appointment_date}T${appointment.start_time}`));

          return (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/appointments/${appointment.id}`}
                className="group relative flex items-start gap-4 py-3 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    'relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center',
                    getStatusColor(appointment.status)
                  )}
                >
                  {getStatusIcon(appointment.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {appointment.provider?.user?.full_name || 'Provider'}
                    </p>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                        appointment.status === 'confirmed' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                        appointment.status === 'pending' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                        appointment.status === 'completed' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                        (appointment.status === 'cancelled' || appointment.status === 'rejected') &&
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      )}
                    >
                      {appointment.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {appointment.provider?.specialization}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <span className={cn(isUpcoming && 'text-primary-600 dark:text-primary-400 font-medium')}>
                      {getDateLabel(appointment.appointment_date)}
                    </span>
                    <span>•</span>
                    <span>{formatTime(appointment.start_time)}</span>
                  </div>
                </div>

                {/* Arrow on hover */}
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* View all link */}
      {showViewAll && appointments.length > maxItems && (
        <div className="pt-2 text-center">
          <Link
            to="/appointments"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
          >
            View all {appointments.length} appointments →
          </Link>
        </div>
      )}
    </div>
  );
};
