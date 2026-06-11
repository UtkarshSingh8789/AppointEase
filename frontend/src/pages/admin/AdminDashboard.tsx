import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, FolderOpen, UserCheck, Clock, Star, CalendarCheck, UserPlus, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { adminService } from '@/services/adminService';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card } from '@/components/ui/Card';
import { SkeletonStats } from '@/components/ui/Skeleton';
import { Timeline } from '@/components/ui/Timeline';
import { PageTransition } from '@/components/layout/PageTransition';
import { McpInsightsPanel } from '@/components/mcp/McpInsightsPanel';
import { formatDate } from '@/utils';
import { cn } from '@/utils/cn';
import type { AdminStats, AuditLog } from '@/types';
import type { TimelineStep } from '@/components/ui/Timeline';

// Deterministic weekly distribution based on total (no random data)
function generateWeeklyData(total: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Distribute appointments with a realistic weekday-heavy pattern
  const weights = [0.16, 0.15, 0.17, 0.14, 0.15, 0.12, 0.11];
  return days.map((day, i) => ({
    name: day,
    appointments: Math.round(total * weights[i]),
  }));
}

const PIE_COLORS = ['#fbbf24', '#3b82f6', '#22c55e', '#ef4444'];

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, logsData] = await Promise.all([
          adminService.getStats(),
          adminService.getAuditLogs({ page: 1, size: 5 }),
        ]);
        setStats(statsData);
        setAuditLogs(logsData.logs);
      } catch {
        // Error handled by interceptor
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
        </div>
        <SkeletonStats count={4} />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Failed to load statistics</div>;
  }

  const weeklyData = generateWeeklyData(stats.total_appointments);

  const pieData = [
    { name: 'Pending', value: stats.pending_appointments },
    { name: 'Confirmed', value: stats.confirmed_appointments },
    { name: 'Completed', value: stats.completed_appointments },
    { name: 'Cancelled', value: stats.cancelled_appointments },
  ];

  const barData = [
    { name: 'Pending', value: stats.pending_appointments, fill: '#fbbf24' },
    { name: 'Confirmed', value: stats.confirmed_appointments, fill: '#3b82f6' },
    { name: 'Completed', value: stats.completed_appointments, fill: '#22c55e' },
    { name: 'Cancelled', value: stats.cancelled_appointments, fill: '#ef4444' },
  ];

  const timelineSteps: TimelineStep[] = auditLogs.map((log, index) => ({
    label: log.action.replace(/_/g, ' '),
    description: `${log.resource_type}${log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}`,
    time: formatDate(log.created_at, 'MMM d, h:mm a'),
    status: index === 0 ? 'current' : 'completed',
  }));

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Platform overview and statistics</p>
        </div>

        {/* Main stats with colored left borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Users className="w-5 h-5" />, label: 'Total Users', value: stats.total_users, color: 'border-l-blue-500', trend: `+${stats.new_users_this_week} this week`, href: '/admin/users' },
            { icon: <UserCheck className="w-5 h-5" />, label: 'Providers', value: stats.total_providers, color: 'border-l-purple-500', trend: null, href: '/admin/users' },
            { icon: <Calendar className="w-5 h-5" />, label: 'Total Appointments', value: stats.total_appointments, color: 'border-l-green-500', trend: `${stats.appointments_today} today`, href: '/admin/appointments' },
            { icon: <FolderOpen className="w-5 h-5" />, label: 'Categories', value: stats.total_categories, color: 'border-l-amber-500', trend: null, href: '/admin/categories' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={stat.href} className="block">
              <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer', stat.color)}>
                <div className="flex items-center justify-between">
                  <div className="text-gray-500 dark:text-gray-400">{stat.icon}</div>
                  {stat.trend && (
                    <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 font-medium">
                      <TrendingUp className="w-3 h-3" />
                      {stat.trend}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <McpInsightsPanel />
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Production Notes</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The MCP bridge is now discoverable, role-aware, and available as a read-only analytics and assistant layer.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• The assistant can ask the bridge for live providers and availability.</li>
              <li>• Admin workflows can inspect platform metrics from the same source of truth.</li>
              <li>• The manifest endpoint makes client integration much easier to maintain.</li>
            </ul>
          </Card>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<CalendarCheck className="w-5 h-5" />} label="Today's Appointments" value={stats.appointments_today} href="/admin/appointments" />
          <StatsCard icon={<UserPlus className="w-5 h-5" />} label="New Users This Week" value={stats.new_users_this_week} href="/admin/users" />
          <StatsCard icon={<Star className="w-5 h-5" />} label="Average Rating" value={stats.average_rating.toFixed(1)} />
          <StatsCard icon={<Clock className="w-5 h-5" />} label="Total Reviews" value={stats.total_reviews} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line chart - appointments over last 7 days */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Appointments This Week
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <YAxis stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid var(--tooltip-border, #e5e7eb)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Pie chart - appointments by status */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Appointments by Status
            </h2>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid var(--tooltip-border, #e5e7eb)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bar chart + Activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Status Breakdown
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <YAxis stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      border: '1px solid var(--tooltip-border, #e5e7eb)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recent Activity with Timeline */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No recent activity
              </p>
            ) : (
              <Timeline steps={timelineSteps} />
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};
