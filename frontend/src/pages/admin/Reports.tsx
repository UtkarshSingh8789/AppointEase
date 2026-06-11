import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  BarChart3,
  Download,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageTransition } from '@/components/layout/PageTransition';
import { cn } from '@/utils/cn';
import api from '@/services/api';

interface ReportsData {
  total_revenue: number;
  completion_rate: number;
  cancellation_rate: number;
  monthly_appointments: { month: string; appointments: number }[];
  top_providers: { name: string; service: string; appointments: number }[];
  category_distribution: { category: string; providers: number }[];
  user_growth: { week: string; new_users: number }[];
  stats: {
    total_users: number;
    total_providers: number;
    total_appointments: number;
    total_categories: number;
    pending_appointments: number;
    confirmed_appointments: number;
    completed_appointments: number;
    cancelled_appointments: number;
    appointments_today: number;
    new_users_this_week: number;
    average_rating: number;
    total_reviews: number;
  };
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const Reports: React.FC = () => {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get('/admin/reports');
        setData(response.data);
      } catch (err) {
        setError('Failed to load reports data');
        console.error('Reports fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading reports..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const statusData = [
    { name: 'Pending', value: data.stats.pending_appointments, color: '#f59e0b' },
    { name: 'Confirmed', value: data.stats.confirmed_appointments, color: '#3b82f6' },
    { name: 'Completed', value: data.stats.completed_appointments, color: '#10b981' },
    { name: 'Cancelled', value: data.stats.cancelled_appointments, color: '#ef4444' },
  ];

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Business Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Revenue analytics, growth metrics, and operational insights
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Export as CSV
                const csvRows = [
                  ['Metric', 'Value'],
                  ['Total Revenue', `₹${data.total_revenue}`],
                  ['Completion Rate', `${data.completion_rate}%`],
                  ['Cancellation Rate', `${data.cancellation_rate}%`],
                  ['Total Users', data.stats.total_users],
                  ['Total Providers', data.stats.total_providers],
                  ['Total Appointments', data.stats.total_appointments],
                  ['Average Rating', data.stats.average_rating],
                  ['', ''],
                  ['Top Providers', ''],
                  ['Name', 'Appointments'],
                  ...data.top_providers.map(p => [p.name, p.appointments]),
                ];
                const csv = csvRows.map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `appointease-report-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <DollarSign className="w-5 h-5" />,
              label: 'Total Revenue',
              value: `₹${data.total_revenue.toLocaleString()}`,
              color: 'text-green-600 dark:text-green-400',
              bgColor: 'bg-green-50 dark:bg-green-900/20',
            },
            {
              icon: <CheckCircle className="w-5 h-5" />,
              label: 'Completion Rate',
              value: `${data.completion_rate}%`,
              color: 'text-blue-600 dark:text-blue-400',
              bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            },
            {
              icon: <XCircle className="w-5 h-5" />,
              label: 'Cancellation Rate',
              value: `${data.cancellation_rate}%`,
              color: 'text-red-600 dark:text-red-400',
              bgColor: 'bg-red-50 dark:bg-red-900/20',
            },
            {
              icon: <Users className="w-5 h-5" />,
              label: 'New Users This Week',
              value: data.stats.new_users_this_week.toString(),
              color: 'text-purple-600 dark:text-purple-400',
              bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            },
          ].map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', kpi.bgColor, kpi.color)}>
                    {kpi.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Appointments Trend */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Monthly Appointment Trends
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthly_appointments}>
                  <defs>
                    <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" fontSize={12} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg, #fff)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="appointments"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAppointments)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Appointment Status Distribution */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Appointment Status Distribution
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg, #fff)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {statusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              User Growth (Last 8 Weeks)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.user_growth}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" fontSize={12} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg, #fff)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="new_users"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category Distribution */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              Providers by Category
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.category_distribution.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" fontSize={12} tick={{ fill: '#6b7280' }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    fontSize={11}
                    tick={{ fill: '#6b7280' }}
                    width={100}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg, #fff)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="providers" radius={[0, 4, 4, 0]}>
                    {data.category_distribution.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Top Providers Table */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Providers by Appointments
          </h2>
          {data.top_providers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No provider data available yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Rank</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Provider</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Service</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Appointments</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_providers.map((provider, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className={cn(
                          'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                          index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                          index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                        {provider.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {provider.service}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                        {provider.appointments}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: data.stats.total_users },
            { label: 'Active Providers', value: data.stats.total_providers },
            { label: 'Total Appointments', value: data.stats.total_appointments },
            { label: 'Avg Rating', value: `${data.stats.average_rating.toFixed(1)} ★` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700"
            >
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Business Insights */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Business Insights & Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue per appointment */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Avg Revenue per Appointment</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                {data.stats.total_appointments > 0
                  ? `₹${Math.round(data.total_revenue / data.stats.completed_appointments)}`
                  : '₹0'}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Based on completed appointments</p>
            </div>

            {/* Provider utilization */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Avg Appointments per Provider</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {data.stats.total_providers > 0
                  ? Math.round(data.stats.total_appointments / data.stats.total_providers)
                  : 0}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Higher = better provider engagement</p>
            </div>

            {/* Conversion insight */}
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Booking Success Rate</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {data.stats.total_appointments > 0
                  ? `${Math.round(((data.stats.completed_appointments + data.stats.confirmed_appointments) / data.stats.total_appointments) * 100)}%`
                  : '0%'}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Confirmed + Completed vs Total</p>
            </div>

            {/* Customer-to-provider ratio */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Customer : Provider Ratio</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                {data.stats.total_providers > 0
                  ? `${Math.round((data.stats.total_users - data.stats.total_providers) / data.stats.total_providers * 10) / 10} : 1`
                  : 'N/A'}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Ideal range: 3:1 to 10:1</p>
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
};
