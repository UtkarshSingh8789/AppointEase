import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, Users, TrendingUp, Plus, Star, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { appointmentService } from '@/services/appointmentService';
import { providerService } from '@/services/providerService';
import { aiService } from '@/services/aiService';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonStats } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { PageTransition } from '@/components/layout/PageTransition';
import { EmptyCalendarIllustration } from '@/components/illustrations';
import { formatDate, formatTime, getRelativeDateLabel, formatCurrency } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import { cn } from '@/utils/cn';
import type { Appointment, CustomerStats, Provider } from '@/types';

/** Get time-of-day greeting */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Get countdown text for next appointment */
function getCountdown(dateStr: string, timeStr: string): string {
  try {
    const appointmentDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    const diff = appointmentDate.getTime() - now.getTime();
    if (diff <= 0) return 'Starting now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  } catch {
    return '';
  }
}

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [recommendedProviders, setRecommendedProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [nextBooking, setNextBooking] = useState<{ prediction: { category: string; reason: string; suggested_providers: Provider[] } | null } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [upcomingData, statsData, providersData] = await Promise.all([
          appointmentService.getUpcoming(),
          appointmentService.getStats(),
          providerService.getProviders({ page: 1, size: 3 }),
        ]);
        setUpcoming(upcomingData.slice(0, 5));
        setStats(statsData);
        setRecommendedProviders(providersData.providers.slice(0, 3));
      } catch {
        // Error handled by interceptor
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // AI #12: Booking intent predictor (lazy)
    aiService.getNextBookingPrediction().then((data) => setNextBooking(data)).catch(() => {});

    // AI #21: Personalised recommendations — replace generic providers
    aiService.getPersonalisedRecommendations().then((data) => {
      if (data?.recommendations?.length) setRecommendedProviders(data.recommendations.slice(0, 3));
    }).catch(() => {});
  }, []);

  const nextAppointment = upcoming[0];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
        </div>
        <SkeletonStats count={3} />
        <Skeleton variant="table-row" count={3} />
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <PageTransition>
      <div className="space-y-8 pb-20 lg:pb-0">
        {/* Welcome section with time-of-day greeting */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here&apos;s what&apos;s happening with your appointments
          </p>
        </div>

        {/* Stats with trend indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatsCard
              icon={<Calendar className="w-5 h-5" />}
              label="Total Appointments"
              value={stats?.total ?? 0}
              href="/appointments"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <StatsCard
                icon={<Clock className="w-5 h-5" />}
                label="Upcoming"
                value={stats?.upcoming ?? 0}
                href="/appointments"
              />
              {(stats?.upcoming ?? 0) > 0 && (
                <div className="absolute top-3 right-3 flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  Active
                </div>
              )}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <StatsCard
              icon={<CheckCircle className="w-5 h-5" />}
              label="Completed"
              value={stats?.completed ?? 0}
              href="/appointments"
            />
          </motion.div>
        </div>

        {/* Next appointment highlight card */}
        {nextAppointment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link to={`/appointments/${nextAppointment.id}`}>
              <div className="relative overflow-hidden rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow bg-black dark:bg-white text-white dark:text-black">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 opacity-70" />
                    <span className="text-sm font-medium opacity-70">Next Appointment</span>
                    <span className="ml-auto text-sm font-bold bg-white/20 dark:bg-black/10 px-2 py-0.5 rounded-full">
                      {getCountdown(nextAppointment.appointment_date, nextAppointment.start_time)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">
                    {nextAppointment.provider?.user?.full_name || 'Provider'}
                  </h3>
                  <p className="opacity-70 text-sm mt-1">
                    {nextAppointment.provider?.specialization}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm opacity-80">
                    <span>{getRelativeDateLabel(nextAppointment.appointment_date)}</span>
                    <span>•</span>
                    <span>{formatTime(nextAppointment.start_time)}</span>
                  </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 dark:bg-black/5 rounded-full" aria-hidden="true" />
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/5 dark:bg-black/5 rounded-full" aria-hidden="true" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* Quick actions */}
        <div className="flex gap-3">
          <Link to="/providers">
            <Button leftIcon={<Users className="w-4 h-4" />}>
              Find a Provider
            </Button>
          </Link>
          <Link to="/appointments">
            <Button variant="secondary" leftIcon={<Calendar className="w-4 h-4" />}>
              View All Appointments
            </Button>
          </Link>
        </div>

        {/* Upcoming appointments */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
              View all
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              icon={<div className="w-32 h-32 text-primary-400 dark:text-primary-600 mx-auto"><EmptyCalendarIllustration /></div>}
              title="No upcoming appointments"
              description="Book your first appointment with a service provider"
              action={
                <Link to="/providers">
                  <Button size="sm">Find Providers</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Link
                    to={`/appointments/${appointment.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {appointment.provider?.user?.full_name || 'Provider'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {appointment.provider?.specialization}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {getRelativeDateLabel(appointment.appointment_date)} at{' '}
                        {formatTime(appointment.start_time)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={appointment.status} />
                      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                        {formatDate(appointment.appointment_date)}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* AI #12: Booking Intent Prediction */}
        {nextBooking?.prediction && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <h2 className="text-sm font-semibold text-primary-700 dark:text-primary-400">You might want to book...</h2>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 uppercase tracking-wide">AI</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Based on your history, you're likely to need <strong>{nextBooking.prediction.category}</strong> next.
                {' '}<span className="text-xs text-gray-500">{nextBooking.prediction.reason}</span>
              </p>
              {nextBooking.prediction.suggested_providers?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {nextBooking.prediction.suggested_providers.slice(0, 2).map((p: Provider & { name?: string }) => (
                    <Link key={p.id} to={`/providers/${p.id}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-primary-400 transition-colors">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {p.name ?? p.user?.full_name}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Recommended Providers */}
        {recommendedProviders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recommended for You</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase tracking-wide">AI</span>
              </div>
              <Link to="/providers" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommendedProviders.map((provider, index) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Link to={`/providers/${provider.id}`}>
                    <Card className={cn(
                      'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
                      'dark:bg-gray-800 dark:border-gray-700'
                    )}>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={provider.user?.full_name || 'Provider'}
                          src={getProviderImage(provider.id)}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {provider.user?.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {provider.specialization}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {provider.rating.toFixed(1)}
                          </span>
                        </div>
                        {provider.hourly_rate && (
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {formatCurrency(provider.hourly_rate)}/hr
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Book FAB - mobile only */}
        <Link
          to="/providers"
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 lg:hidden"
          aria-label="Quick book appointment"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200" style={{ backgroundColor: '#000', color: '#fff' }}>
            <Plus className="w-6 h-6" />
          </div>
        </Link>
      </div>
    </PageTransition>
  );
};
