import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, LogOut } from 'lucide-react';
import { ProviderOnboarding } from '@/components/onboarding/ProviderOnboarding';
import { useAuthStore } from '@/store/authStore';

export const ProviderOnboardingPage: React.FC = () => {
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">AppointEase</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Provider onboarding</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
              {user?.full_name}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ProviderOnboarding />
      </main>
    </div>
  );
};
