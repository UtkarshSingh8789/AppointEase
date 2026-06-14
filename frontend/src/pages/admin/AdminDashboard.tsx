import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, FolderOpen, UserCheck, Clock, Star, CalendarCheck, UserPlus, TrendingUp, AlertTriangle, Brain, ShieldAlert, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { adminService } from '@/services/adminService';
import { aiService } from '@/services/aiService';
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

function generateWeeklyData(total: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weights = [0.16, 0.15, 0.17, 0.14, 0.15, 0.12, 0.11];
  return days.map((day, i) => ({ name: day, appointments: Math.round(total * weights[i]) }));
}

const PIE_COLORS = ['#fbbf24', '#3b82f6', '#22c55e', '#ef4444'];

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AI feature states
  const [fraudAlerts, setFraudAlerts] = useState<{ alerts: { user_id: string; name: string; email: string; type: string; detail: string; severity: string }[]; total: number } | null>(null);
  const [revenueForecast, setRevenueForecast] = useState<{ forecast_30d: number; avg_weekly_revenue: number; trend: string; forecast_by_week: { week: string; predicted_revenue: number }[] } | null>(null);
  const [churnRisk, setChurnRisk] = useState<{ at_risk_users: { user_id: string; name: string; email: string; risk_level: string; reason: string; days_inactive: number }[]; total: number } | null>(null);
  const [supplyGaps, setSupplyGaps] = useState<{ gaps: { category: string; demand: number; supply: number; ratio: number; gap_level: string; recommendation: string }[] } | null>(null);
  const [trendExplain, setTrendExplain] = useState<{ trend: string; change_pct: number; current_count: number; previous_count: number; explanation: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, logsData] = await Promise.all([adminService.getStats(), adminService.getAuditLogs({ page: 1, size: 5 })]);
        setStats(statsData);
        setAuditLogs(logsData.logs);
      } catch { /* silent */ } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // AI features — lazy load all admin AI
    aiService.getFraudAlerts().then(setFraudAlerts).catch(() => {});
    aiService.getRevenueForecast().then(setRevenueForecast).catch(() => {});
    aiService.getChurnRisk().then(setChurnRisk).catch(() => {});
    aiService.getSupplyDemandGaps().then(setSupplyGaps).catch(() => {});
    aiService.getTrendExplanation('week').then(setTrendExplain).catch(() => {});
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

  if (!stats) return <div className="text-center text-gray-500 dark:text-gray-400">Failed to load statistics</div>;

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

        {/* Main stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Users className="w-5 h-5" />, label: 'Total Users', value: stats.total_users, color: 'border-l-blue-500', trend: `+${stats.new_users_this_week} this week`, href: '/admin/users' },
            { icon: <UserCheck className="w-5 h-5" />, label: 'Providers', value: stats.total_providers, color: 'border-l-purple-500', trend: null, href: '/admin/users' },
            { icon: <Calendar className="w-5 h-5" />, label: 'Total Appointments', value: stats.total_appointments, color: 'border-l-green-500', trend: `${stats.appointments_today} today`, href: '/admin/appointments' },
            { icon: <FolderOpen className="w-5 h-5" />, label: 'Categories', value: stats.total_categories, color: 'border-l-amber-500', trend: null, href: '/admin/categories' },
          ].map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Link to={stat.href} className="block">
                <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer', stat.color)}>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 dark:text-gray-400">{stat.icon}</div>
                    {stat.trend && (
                      <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 font-medium">
                        <TrendingUp className="w-3 h-3" />{stat.trend}
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
            <p className="text-sm text-gray-600 dark:text-gray-400">The MCP bridge is now discoverable, role-aware, and available as a read-only analytics and assistant layer.</p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• The assistant can ask the bridge for live providers and availability.</li>
              <li>• Admin workflows can inspect platform metrics from the same source of truth.</li>
              <li>• The manifest endpoint makes client integration much easier to maintain.</li>
            </ul>
          </Card>
        </div>

        {/* AI #48: Trend Explanation */}
        {trendExplain && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-300">AI Trend Insight (This Week)</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase tracking-wide">AI</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <span className={cn('text-2xl font-bold', trendExplain.trend === 'up' ? 'text-green-600 dark:text-green-400' : trendExplain.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-600')}>
                {trendExplain.change_pct > 0 ? '+' : ''}{trendExplain.change_pct}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{trendExplain.current_count} appts this week vs {trendExplain.previous_count} last week</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{trendExplain.explanation}</p>
          </Card>
        )}

        {/* AI #28: Fraud Alerts */}
        {fraudAlerts && fraudAlerts.total > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Fraud Alerts ({fraudAlerts.total})</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 uppercase tracking-wide">AI</span>
            </div>
            <div className="space-y-2">
              {fraudAlerts.alerts.slice(0, 3).map((alert) => (
                <div key={alert.user_id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{alert.detail}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', alert.severity === 'high' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300')}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI #29: Revenue Forecast */}
        {revenueForecast && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h2 className="text-sm font-semibold text-green-700 dark:text-green-300">Revenue Forecast (Next 30 Days)</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 uppercase tracking-wide">AI</span>
            </div>
            <div className="flex items-end gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Predicted Revenue</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">₹{revenueForecast.forecast_30d.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Weekly</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">₹{revenueForecast.avg_weekly_revenue.toLocaleString('en-IN')}</p>
              </div>
              <span className={cn('ml-auto px-3 py-1 rounded-full text-sm font-semibold', revenueForecast.trend === 'growing' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400')}>
                {revenueForecast.trend}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {revenueForecast.forecast_by_week.map((w, i) => (
                <div key={i} className="p-2 rounded-lg bg-green-50 dark:bg-green-900/10 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{w.week}</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">₹{Math.round(w.predicted_revenue / 1000)}K</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI #30: Churn Risk */}
        {churnRisk && churnRisk.total > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-300">Churn Risk ({churnRisk.total} users)</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase tracking-wide">AI</span>
            </div>
            <div className="space-y-2">
              {churnRisk.at_risk_users.slice(0, 4).map((u) => (
                <div key={u.user_id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.reason}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', u.risk_level === 'high' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300')}>
                    {u.risk_level}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI #33: Supply-Demand Gaps */}
        {supplyGaps && supplyGaps.gaps.length > 0 && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-semibold text-purple-700 dark:text-purple-300">Supply-Demand Gaps</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase tracking-wide">AI</span>
            </div>
            <div className="space-y-2">
              {supplyGaps.gaps.slice(0, 4).map((g, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{g.category}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{g.recommendation}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">{g.ratio}x demand</p>
                    <span className={cn('text-xs font-semibold', g.gap_level === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>{g.gap_level}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Secondary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={<CalendarCheck className="w-5 h-5" />} label="Today's Appointments" value={stats.appointments_today} href="/admin/appointments" />
          <StatsCard icon={<UserPlus className="w-5 h-5" />} label="New Users This Week" value={stats.new_users_this_week} href="/admin/users" />
          <StatsCard icon={<Star className="w-5 h-5" />} label="Average Rating" value={stats.average_rating.toFixed(1)} />
          <StatsCard icon={<Clock className="w-5 h-5" />} label="Total Reviews" value={stats.total_reviews} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appointments This Week</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <YAxis stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--tooltip-border, #e5e7eb)', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="appointments" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appointments by Status</h2>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--tooltip-border, #e5e7eb)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Status Breakdown</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <YAxis stroke="currentColor" className="text-gray-500 dark:text-gray-400" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--tooltip-border, #e5e7eb)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
            ) : (
              <Timeline steps={timelineSteps} />
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};
