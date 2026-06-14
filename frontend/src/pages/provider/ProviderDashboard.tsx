import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, XCircle, Star, TrendingUp } from 'lucide-react';
import { providerService } from '@/services/providerService';
import { appointmentService } from '@/services/appointmentService';
import { useAuthStore } from '@/store/authStore';
import { aiService } from '@/services/aiService';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { McpInsightsPanel } from '@/components/mcp/McpInsightsPanel';
import { formatDate, formatTime, getRelativeDateLabel } from '@/utils';
import api from '@/services/api';
import type { ProviderStats, Appointment } from '@/types';

interface PricingInsights {
  current_rate: number;
  category_avg: number;
  category_min: number;
  category_max: number;
  category_provider_count: number;
  booking_rate_percent: number;
  avg_rating: number;
  category_avg_rating: number;
  peak_days: string[];
  suggestion: string;
}

export const ProviderDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pricingInsights, setPricingInsights] = useState<PricingInsights | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [earningsInsights, setEarningsInsights] = useState<{ insights: string[]; best_day?: string; best_hour?: string; total_completed?: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, appointmentsData] = await Promise.all([
          providerService.getStats(),
          appointmentService.getUpcoming(),
        ]);
        setStats(statsData);
        setTodayAppointments(appointmentsData.slice(0, 5));
      } catch {
        // Error handled by interceptor
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // AI #7: pricing insights
    const loadPricing = async () => {
      setPricingLoading(true);
      try {
        const res = await api.get('/providers/me/pricing-insights');
        setPricingInsights(res.data);
      } catch { /* silent */ } finally {
        setPricingLoading(false);
      }
    };
    void loadPricing();

    // AI #49: earnings insights
    aiService.getEarningsInsights().then((d: { insights: string[]; best_day?: string; best_hour?: string }) => {
      if (d?.insights?.length) setEarningsInsights(d);
    }).catch(() => {});
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  }

  return (
    <PageTransition>
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here&apos;s your practice overview</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<Calendar className="w-5 h-5" />}
            label="Total Appointments"
            value={stats.total_appointments}
            href="/provider/appointments"
          />
          <StatsCard
            icon={<Clock className="w-5 h-5" />}
            label="Pending"
            value={stats.pending_appointments}
            href="/provider/appointments"
          />
          <StatsCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Completed"
            value={stats.completed_appointments}
            href="/provider/appointments"
          />
          <StatsCard
            icon={<Star className="w-5 h-5" />}
            label="Rating"
            value={`${stats.rating.toFixed(1)} ★`}
          />
        </div>
      )}

      <McpInsightsPanel />

      {/* Today's appointments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <button
            type="button"
            onClick={() => navigate('/provider/appointments')}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
          >
            View all
          </button>
        </div>

        {todayAppointments.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8 text-gray-400" />}
            title="No upcoming appointments"
            description="Your upcoming appointments will appear here"
          />
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => setSelectedAppointment(appointment)}
                className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-gray-900">
                      {appointment.customer?.full_name || 'Customer'}
                    </p>
                    <Badge status={appointment.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {getRelativeDateLabel(appointment.appointment_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 hidden sm:block">
                  {formatDate(appointment.appointment_date)}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Quick stats summary */}
      {stats && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{stats.completed_appointments}</p>
              <p className="text-sm text-green-600">Completed</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-700">{stats.cancelled_appointments}</p>
              <p className="text-sm text-red-600">Cancelled</p>
            </div>
          </div>
        </Card>
      )}

      {/* AI #49: Earnings Insights */}
      {earningsInsights && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Earnings Insights</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase tracking-wide">AI</span>
          </div>
          <div className="space-y-2">
            {earningsInsights.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-green-500 font-bold mt-0.5">→</span>{insight}
              </div>
            ))}
          </div>
          {earningsInsights.best_day && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Best Day</p>
                <p className="font-bold text-green-700 dark:text-green-300">{earningsInsights.best_day}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Peak Hour</p>
                <p className="font-bold text-green-700 dark:text-green-300">{earningsInsights.best_hour}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* AI Feature #7: Pricing Insights */}
      {(pricingLoading || pricingInsights) && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Pricing Insights</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase tracking-wide">
              AI
            </span>
          </div>
          {pricingLoading ? (
            <LoadingSpinner size="sm" />
          ) : pricingInsights && (
            <div className="space-y-4">
              {/* Rate comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Rate</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">₹{pricingInsights.current_rate.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Category Avg</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">₹{pricingInsights.category_avg.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completion Rate</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{pricingInsights.booking_rate_percent}%</p>
                </div>
              </div>
              {/* Range bar */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Category range: ₹{pricingInsights.category_min.toLocaleString('en-IN')} – ₹{pricingInsights.category_max.toLocaleString('en-IN')} ({pricingInsights.category_provider_count} providers)
                </p>
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  {(() => {
                    const range = pricingInsights.category_max - pricingInsights.category_min;
                    const pct = range > 0 ? ((pricingInsights.current_rate - pricingInsights.category_min) / range) * 100 : 50;
                    return (
                      <div
                        className="absolute top-0 w-3 h-3 -mt-0.5 rounded-full bg-primary-600 dark:bg-primary-400 border-2 border-white dark:border-gray-800 shadow"
                        style={{ left: `${Math.min(Math.max(pct, 2), 98)}%`, transform: 'translateX(-50%)' }}
                        title={`Your rate: ₹${pricingInsights.current_rate}`}
                      />
                    );
                  })()}
                </div>
              </div>
              {/* AI recommendation */}
              <div className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-4 py-3">
                <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-1">AI Recommendation</p>
                <p className="text-sm text-primary-800 dark:text-primary-300 leading-relaxed">{pricingInsights.suggestion}</p>
              </div>
              {pricingInsights.peak_days.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  📅 Peak days: {pricingInsights.peak_days.join(', ')}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      <Modal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedAppointment.customer?.full_name || 'Customer'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedAppointment.customer?.email}
                </p>
              </div>
              <Badge status={selectedAppointment.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(selectedAppointment.appointment_date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Time</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:col-span-2">
                <p className="text-gray-500 dark:text-gray-400">Notes</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedAppointment.notes || 'No notes provided'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:col-span-2">
                <p className="text-gray-500 dark:text-gray-400">Google Calendar</p>
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    `Appointment with ${selectedAppointment.customer?.full_name || 'Customer'}`
                  )}&details=${encodeURIComponent(
                    selectedAppointment.notes || 'Appointment details'
                  )}&dates=${selectedAppointment.appointment_date.replace(/-/g, '')}T${selectedAppointment.start_time.replace(/:/g, '').padEnd(6, '0')}/${selectedAppointment.appointment_date.replace(/-/g, '')}T${selectedAppointment.end_time.replace(/:/g, '').padEnd(6, '0')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                >
                  Add this slot to Google Calendar
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
    </PageTransition>
  );
};
