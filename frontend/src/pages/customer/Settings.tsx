import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Download,
  Lock,
  Moon,
  Palette,
  Shield,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageTransition } from '@/components/layout/PageTransition';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

type SettingsTab = 'notifications' | 'appearance' | 'security' | 'data';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { key: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { key: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { key: 'data', label: 'Data & Privacy', icon: <Download className="w-4 h-4" /> },
];

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notification preferences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [reminderTiming, setReminderTiming] = useState('24h');

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your account preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar tabs */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-48 flex-shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.key
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'notifications' && (
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Notification Preferences
                  </h2>
                  <div className="space-y-6">
                    <ToggleItem
                      label="Email Notifications"
                      description="Receive booking confirmations and updates via email"
                      checked={emailNotifs}
                      onChange={setEmailNotifs}
                    />
                    <ToggleItem
                      label="Booking Reminders"
                      description="Get reminded before your upcoming appointments"
                      checked={bookingReminders}
                      onChange={setBookingReminders}
                    />
                    <ToggleItem
                      label="Marketing & Offers"
                      description="Receive promotional offers and new feature announcements"
                      checked={marketingEmails}
                      onChange={setMarketingEmails}
                    />

                    {bookingReminders && (
                      <div className="pl-0 pt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Reminder Timing
                        </label>
                        <div className="flex gap-2">
                          {['1h', '3h', '12h', '24h', '48h'].map((timing) => (
                            <button
                              key={timing}
                              onClick={() => setReminderTiming(timing)}
                              className={cn(
                                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                                reminderTiming === timing
                                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                              )}
                            >
                              {timing} before
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button onClick={handleSaveNotifications}>Save Preferences</Button>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'appearance' && (
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Appearance
                  </h2>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose your preferred theme
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <ThemeOption
                        label="Light"
                        icon={<Sun className="w-5 h-5" />}
                        isActive={theme === 'light'}
                        onClick={() => { if (theme !== 'light') toggleTheme(); }}
                      />
                      <ThemeOption
                        label="Dark"
                        icon={<Moon className="w-5 h-5" />}
                        isActive={theme === 'dark'}
                        onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Security
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Change Password
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Update your password to keep your account secure
                      </p>
                      <div className="space-y-3">
                        <Input
                          label="Current Password"
                          type="password"
                          placeholder="Enter current password"
                          leftIcon={<Lock className="w-4 h-4" />}
                        />
                        <Input
                          label="New Password"
                          type="password"
                          placeholder="Enter new password"
                          leftIcon={<Lock className="w-4 h-4" />}
                        />
                        <Input
                          label="Confirm New Password"
                          type="password"
                          placeholder="Confirm new password"
                          leftIcon={<Lock className="w-4 h-4" />}
                        />
                      </div>
                      <div className="pt-4">
                        <Button onClick={() => toast.success('Password updated')}>
                          Update Password
                        </Button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                        Danger Zone
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Permanently delete your account and all associated data
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'data' && (
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Data & Privacy
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Export Your Data
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Download all your data including appointments, reviews, and profile information
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download className="w-4 h-4" />}
                          onClick={() => toast.success('Export started. You will receive an email with the download link.')}
                        >
                          Export as JSON
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download className="w-4 h-4" />}
                          onClick={() => toast.success('Export started. You will receive an email with the download link.')}
                        >
                          Export as CSV
                        </Button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Privacy Preferences
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Control how your data is used on the platform
                      </p>
                      <div className="space-y-4">
                        <ToggleItem
                          label="Profile visible to providers"
                          description="Allow providers to see your booking history and preferences"
                          checked={true}
                          onChange={() => toast.success('Preference updated')}
                        />
                        <ToggleItem
                          label="Analytics & usage data"
                          description="Help us improve by sharing anonymous usage data"
                          checked={true}
                          onChange={() => toast.success('Preference updated')}
                        />
                        <ToggleItem
                          label="Personalized recommendations"
                          description="Get provider suggestions based on your booking history"
                          checked={true}
                          onChange={() => toast.success('Preference updated')}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            toast.error('Account deletion requires confirmation via email');
          }}
          title="Delete account?"
          message="This request starts a permanent account deletion flow. You will need to confirm by email before anything is removed."
          confirmLabel="Start deletion"
          variant="danger"
        />
      </div>
    </PageTransition>
  );
};

/** Toggle switch item */
const ToggleItem: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  </div>
);

/** Theme option card */
const ThemeOption: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
      isActive
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
    )}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);
