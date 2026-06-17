import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';

export const NotFoundPage: React.FC = () => {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-9xl font-extrabold text-primary-600 dark:text-primary-500">404</h2>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Page not found</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sorry, we couldn't find the page you're looking for.
            </p>
          </div>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors duration-200"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
