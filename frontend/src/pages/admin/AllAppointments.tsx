import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, Search } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Pagination } from '@/components/ui/Pagination';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { useCategories } from '@/hooks/useCategories';
import { formatDate, formatTime } from '@/utils';
import type { Appointment, AppointmentStatus } from '@/types';

export const AllAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const { categories } = useCategories();

  const fetchAppointments = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const data = await adminService.getAppointments({
        status: statusFilter || undefined,
        category_id: categoryFilter || undefined,
        date_from: selectedDate || undefined,
        date_to: selectedDate || undefined,
        search: nameSearch.trim() || undefined,
        page: pageNum,
        size: 10,
      });
      setAppointments(data.appointments);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch {
      // Error handled by interceptor
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, selectedDate, nameSearch]);

  useEffect(() => {
    fetchAppointments(1);
  }, [fetchAppointments]);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Appointments</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{total} appointments on the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Name search — full width */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Search by customer or provider name..."
            className="w-full pl-12 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-black dark:focus:border-white transition-colors"
            aria-label="Search appointments by name"
          />
        </div>
        {/* Status + date filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            options={statusOptions}
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:w-40"
          />
          <Select
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:w-56"
          />
          <DatePicker
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            placeholder="Filter by date"
          />
        </div>
      </div>

      {/* Appointments table */}
      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (() => {
        return appointments.length === 0 ? (
        <EmptyState
          title="No appointments found"
          description={nameSearch ? `No results for "${nameSearch}"` : "Try adjusting your filters"}
        />
      ) : (
        <>
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-6 py-3">
                      Customer
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-6 py-3">
                      Provider
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-6 py-3">
                      Date & Time
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-6 py-3">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {appointment.customer?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {appointment.customer?.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {appointment.provider?.user?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {appointment.provider?.specialization}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(appointment.appointment_date)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={appointment.status as AppointmentStatus} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(appointment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={fetchAppointments}
            />
          )}
        </>
      );
      })()}
    </div>
    </PageTransition>
  );
};
