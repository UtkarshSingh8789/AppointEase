import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Video,
  MessageSquare,
  MessageCircle,
  Zap,
  Globe,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Phone,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  provider_name: string;
  is_active: boolean;
  metadata_json: any;
}

const INTEGRATION_CATALOG = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync your appointments with Google Calendar.',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'outlook_calendar',
    name: 'Outlook Calendar',
    description: 'Two-way sync with your Outlook Calendar.',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Automatically generate Zoom links for appointments.',
    icon: Video,
    color: 'text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'google_meet',
    name: 'Google Meet',
    description: 'Add Google Meet links to your online sessions.',
    icon: Video,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications in Slack when an appointment is booked.',
    icon: MessageSquare,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'ms_teams',
    name: 'Microsoft Teams',
    description: 'Teams video conferencing and notifications.',
    icon: MessageSquare,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send booking confirmations to clients via WhatsApp.',
    icon: MessageCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect AppointEase to 5,000+ apps.',
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Send appointment data to any URL.',
    icon: Globe,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Send custom SMS reminders to clients.',
    icon: Phone,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
];

export const IntegrationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchIntegrations();
  }, [user?.id]);

  const fetchIntegrations = async () => {
    try {
      if (!user) return;
      const response = await api.get('/integrations/');
      setIntegrations(response.data);
    } catch (error) {
      console.error('Failed to fetch integrations', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleIntegration = async (providerName: string, currentlyActive: boolean) => {
    try {
      await api.post('/integrations/toggle', {
        provider_name: providerName,
        enable: !currentlyActive,
      });
      toast.success(`Integration ${!currentlyActive ? 'enabled' : 'disabled'}`);
      fetchIntegrations();
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const getIntegrationState = (providerName: string) => {
    const integration = integrations.find((i) => i.provider_name === providerName);
    return integration?.is_active || false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Connect AppointEase with your favorite tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATION_CATALOG.map((app, index) => {
          const isActive = getIntegrationState(app.id);
          const Icon = app.icon;

          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white dark:bg-gray-800 rounded-xl border ${
                isActive ? 'border-primary-500 shadow-md' : 'border-gray-200 dark:border-gray-700'
              } p-6 flex flex-col`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${app.bgColor}`}>
                  <Icon className={`w-6 h-6 ${app.color}`} />
                </div>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    <XCircle className="w-3 h-3" />
                    Disconnected
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {app.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                {app.description}
              </p>

              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => toggleIntegration(app.id, isActive)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  {isActive ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
