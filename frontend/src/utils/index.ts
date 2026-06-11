import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import type { AppointmentStatus } from '@/types';

/** Format a date string to a readable format */
export function formatDate(dateStr: string, formatStr: string = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), formatStr);
  } catch {
    return dateStr;
  }
}

/** Format a time string (HH:mm:ss) to readable format */
export function formatTime(timeStr: string): string {
  try {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/** Check if a date string is today */
export function isDateToday(dateStr: string): boolean {
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

/** Check if a date string is tomorrow */
export function isDateTomorrow(dateStr: string): boolean {
  try {
    return isTomorrow(parseISO(dateStr));
  } catch {
    return false;
  }
}

/** Check if a date is in the past */
export function isDatePast(dateStr: string): boolean {
  try {
    return isPast(parseISO(dateStr));
  } catch {
    return false;
  }
}

/** Check if a date is in the future */
export function isDateFuture(dateStr: string): boolean {
  try {
    return isFuture(parseISO(dateStr));
  } catch {
    return false;
  }
}

/** Get status badge color classes */
export function getStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/** Get user initials from full name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Day of week labels (0=Monday, 6=Sunday) */
export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Short day labels */
export const DAY_SHORT_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Capitalize first letter */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Truncate text with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/** Format currency in Indian Rupees */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Generate a Google Calendar link for an appointment */
export function getGoogleCalendarUrl(params: {
  title: string;
  description?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): string {
  const normalize = (date: string, time: string) =>
    `${date.replace(/-/g, '')}T${time.replace(/:/g, '').padEnd(6, '0')}`;
  const start = normalize(params.startDate, params.startTime);
  const end = normalize(params.endDate, params.endTime);
  const search = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    details: params.description || '',
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}

/** Debounce function */
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/** Generate a relative time label for an appointment date */
export function getRelativeDateLabel(dateStr: string): string {
  if (isDateToday(dateStr)) return 'Today';
  if (isDateTomorrow(dateStr)) return 'Tomorrow';
  return formatDate(dateStr);
}
