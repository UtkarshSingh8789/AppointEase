import React, { useEffect, useState } from 'react';
import { Activity, Brain, Database, Layers3, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/utils/cn';
import { mcpService, type McpInsights } from '@/services/mcpService';

export const McpInsightsPanel: React.FC = () => {
  const [insights, setInsights] = useState<McpInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    mcpService.getInsights()
      .then((data) => {
        if (!cancelled) setInsights(data);
      })
      .catch(() => {
        if (!cancelled) setInsights(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="py-6"><LoadingSpinner size="sm" text="Loading MCP insights..." /></div>;
  }

  if (!insights) {
    return (
      <Card className="border-dashed">
        <p className="text-sm text-gray-500 dark:text-gray-400">MCP insights are unavailable right now.</p>
      </Card>
    );
  }

  const tools = insights.manifest.tools.slice(0, 4);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">MCP Copilot</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Live bridge state and role-aware capabilities</p>
        </div>
        <span className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
          insights.connected
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        )}>
          {insights.connected ? 'Connected' : 'Offline'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Database className="w-4 h-4" /> Database</div>
          <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{insights.health.database || 'unknown'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Layers3 className="w-4 h-4" /> Tools</div>
          <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{insights.manifest.tool_count}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Activity className="w-4 h-4" /> Users</div>
          <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{insights.health.user_count ?? 'unknown'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <ShieldCheck className="w-4 h-4" /> What you can do now
        </div>
        <ul className="space-y-2">
          {insights.highlights.map((item) => (
            <li key={item} className="text-sm text-gray-600 dark:text-gray-400">{item}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Brain className="w-4 h-4" /> Tool surface
        </div>
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <span
              key={tool.name}
              className={cn('rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-600 dark:text-gray-300')}
            >
              {tool.name}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
};
