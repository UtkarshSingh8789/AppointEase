import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';

export const ProviderPendingApprovalPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">AppointEase</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Provider verification</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full space-y-4 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-amber-700 dark:text-amber-400" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Application under review</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Your provider onboarding has been submitted and is waiting for admin approval.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between gap-3">
              <span>Name</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{user?.full_name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Email</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Status</span>
              <span className="font-medium text-amber-700 dark:text-amber-400">Pending approval</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can keep your browser open. Once the admin approves your application, you will be able to access the provider dashboard.
          </p>

          <div className="flex justify-end">
            <Link to="/login">
              <Button variant="secondary">Back to login</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
};
