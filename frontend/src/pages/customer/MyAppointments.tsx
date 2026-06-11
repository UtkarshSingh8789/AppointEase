import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, X } from 'lucide-react';
import { useAppointmentStore } from '@/store/appointmentStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { PageTransition } from '@/components/layout/PageTransition';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { MultiViewCalendar } from '@/components/calendar/MultiViewCalendar';
import { formatDate, formatTime } from '@/utils';
import { cn } from '@/utils/cn';
import type { AppointmentStatus } from '@/types';

type TabType = 'upcoming' | 'past' | 'cancelled';

export const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const { appointments, total, page, totalPages, isLoading, fetchAppointments } =
    useAppointmentStore();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [dateFilter, setDateFilter] = useState('');

  const statusByTab: Record<TabType, string> = {
    upcoming: 'pending,confirmed',
    past: 'completed',
    cancelled: 'cancelled,rejected',
  };

  useEffect(() => {
    fetchAppointments({ status: statusByTab[activeTab], page: 1, size: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handlePageChange = (newPage: number) => {
    fetchAppointments({ status: statusByTab[activeTab], page: newPage, size: 10 });
  };

  const handleDateFilter = (date: string) => {
    setDateFilter(date);
  };

  const clearDateFilter = () => {
    setDateFilter('');
  };

  // Filter appointments by selected date (client-side)
  const filteredAppointments = dateFilter
    ? appointments.filter((a) => a.appointment_date === dateFilter)
    : appointments;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Appointments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{total} appointment{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/providers">
          <Button>Book New</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs using Radix UI */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabType); setDateFilter(''); }}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Date filter */}
        <div className="flex items-center justify-end gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateFilter(e.target.value)}
              className="pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              aria-label="Filter by date"
            />
          </div>
          {dateFilter && (
            <button
              onClick={clearDateFilter}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filter
            </button>
          )}
        </div>
      </div>
      {dateFilter && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Showing {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} on {formatDate(dateFilter)}
        </span>
      )}

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <MultiViewCalendar
          appointments={filteredAppointments}
          onAppointmentClick={(appointment) => navigate(`/appointments/${appointment.id}`)}
        />
      </Card>

      {/* Appointments list */}
      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          title={dateFilter ? `No appointments on ${formatDate(dateFilter)}` : `No ${activeTab} appointments`}
          description={
            dateFilter
              ? 'Try selecting a different date or clear the filter'
              : activeTab === 'upcoming'
              ? 'Book an appointment with a provider to get started'
              : undefined
          }
          action={
            dateFilter ? (
              <Button size="sm" variant="secondary" onClick={clearDateFilter}>Clear Date Filter</Button>
            ) : activeTab === 'upcoming' ? (
              <Link to="/providers">
                <Button size="sm">Find Providers</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => (
            <Link key={appointment.id} to={`/appointments/${appointment.id}`}>
              <Card className={cn(
                'hover:shadow-md transition-shadow duration-200 mb-3 dark:bg-gray-800 dark:border-gray-700 border-l-4',
                appointment.status === 'confirmed' && 'border-l-blue-500',
                appointment.status === 'pending' && 'border-l-yellow-500',
                appointment.status === 'completed' && 'border-l-green-500',
                (appointment.status === 'cancelled' || appointment.status === 'rejected') && 'border-l-gray-400'
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {appointment.provider?.user?.full_name || 'Provider'}
                      </h3>
                      <Badge status={appointment.status as AppointmentStatus} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {appointment.provider?.specialization}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(appointment.appointment_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
    </PageTransition>
  );
};
