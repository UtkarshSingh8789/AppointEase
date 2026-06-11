import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/** Route guard that checks authentication and role-based access */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isLoading, isInitialized } = useAuthStore();
  const location = useLocation();

  // Still initializing (fetching user from token on page load)
  if (!isInitialized && isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Show loading while any auth operation is in progress
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated but data not loaded yet (shouldn't happen with new flow, but safety check)
  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your account..." />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardPaths: Record<UserRole, string> = {
      customer: '/dashboard',
      provider: '/provider/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={dashboardPaths[user.role]} replace />;
  }

  return <>{children}</>;
};
