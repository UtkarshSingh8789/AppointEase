import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProviderApprovalGate } from '@/components/auth/ProviderApprovalGate';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Lazy-loaded pages for code splitting
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));

// Customer pages
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const ProviderListings = lazy(() => import('@/pages/customer/ProviderListings').then(m => ({ default: m.ProviderListings })));
const ProviderDetail = lazy(() => import('@/pages/customer/ProviderDetail').then(m => ({ default: m.ProviderDetail })));
const BookAppointment = lazy(() => import('@/pages/customer/BookAppointment').then(m => ({ default: m.BookAppointment })));
const MyAppointments = lazy(() => import('@/pages/customer/MyAppointments').then(m => ({ default: m.MyAppointments })));
const AppointmentDetail = lazy(() => import('@/pages/customer/AppointmentDetail').then(m => ({ default: m.AppointmentDetail })));
const RescheduleAppointment = lazy(() => import('@/pages/customer/RescheduleAppointment').then(m => ({ default: m.RescheduleAppointment })));
const Favorites = lazy(() => import('@/pages/customer/Favorites').then(m => ({ default: m.Favorites })));
const Rewards = lazy(() => import('@/pages/customer/Rewards').then(m => ({ default: m.Rewards })));
const ApplyCoupon = lazy(() => import('@/pages/customer/ApplyCoupon').then(m => ({ default: m.ApplyCoupon })));
const Wallet = lazy(() => import('@/pages/customer/Wallet').then(m => ({ default: m.Wallet })));
const Invoices = lazy(() => import('@/pages/customer/Invoices').then(m => ({ default: m.Invoices })));
const Settings = lazy(() => import('@/pages/customer/Settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('@/pages/customer/Profile').then(m => ({ default: m.Profile })));

// Provider pages
const ProviderDashboard = lazy(() => import('@/pages/provider/ProviderDashboard').then(m => ({ default: m.ProviderDashboard })));
const ManageAvailability = lazy(() => import('@/pages/provider/ManageAvailability').then(m => ({ default: m.ManageAvailability })));
const AppointmentRequests = lazy(() => import('@/pages/provider/AppointmentRequests').then(m => ({ default: m.AppointmentRequests })));
const ProviderSchedule = lazy(() => import('@/pages/provider/ProviderSchedule').then(m => ({ default: m.ProviderSchedule })));
const ProviderProfile = lazy(() => import('@/pages/provider/ProviderProfile').then(m => ({ default: m.ProviderProfile })));
const ProviderPublicProfile = lazy(() => import('@/pages/provider/ProviderPublicProfile').then(m => ({ default: m.ProviderPublicProfile })));
const ProviderOnboardingPage = lazy(() => import('@/pages/provider/ProviderOnboardingPage').then(m => ({ default: m.ProviderOnboardingPage })));
const ProviderPendingApprovalPage = lazy(() => import('@/pages/provider/ProviderPendingApprovalPage').then(m => ({ default: m.ProviderPendingApprovalPage })));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const UserDetail = lazy(() => import('@/pages/admin/UserDetail').then(m => ({ default: m.UserDetail })));
const CategoryManagement = lazy(() => import('@/pages/admin/CategoryManagement').then(m => ({ default: m.CategoryManagement })));
const AllAppointments = lazy(() => import('@/pages/admin/AllAppointments').then(m => ({ default: m.AllAppointments })));
const ProviderApprovals = lazy(() => import('@/pages/admin/ProviderApprovals').then(m => ({ default: m.ProviderApprovals })));
const Reports = lazy(() => import('@/pages/admin/Reports').then(m => ({ default: m.Reports })));

/** Suspense fallback for lazy-loaded pages */
const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();
  const hasOAuthTokens = new URLSearchParams(window.location.search).has('access_token');
  const [isProcessingOAuth, setIsProcessingOAuth] = React.useState(hasOAuthTokens);

  useEffect(() => {
    // Keep Render backend warm — ping every 10 min to prevent cold starts
    const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
    if (backendUrl) {
      const ping = () => fetch(`${backendUrl}/ping`).catch(() => {});
      ping();
      const interval = setInterval(ping, 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Handle OAuth callback — extract tokens from URL params
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    let cancelled = false;

    const processOAuth = async () => {
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);

        if (!window.sessionStorage.getItem('oauth_reload_complete')) {
          window.sessionStorage.setItem('oauth_reload_complete', '1');
          window.location.replace(window.location.pathname);
          return;
        }

        window.sessionStorage.removeItem('oauth_reload_complete');
      }

      // Initialize auth state on app load (fetch user if token exists)
      await initialize();
      if (!cancelled) {
        setIsProcessingOAuth(false);
      }
    };

    void processOAuth();

    return () => {
      cancelled = true;
    };
  }, [initialize]);

  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Signing you in..." />
      </div>
    );
  }

  // Show full-page loader until auth state is initialized
  if (!isInitialized && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Loading your account..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/p/:id" element={<ProviderPublicProfile />} />
          <Route
            path="/provider/onboarding"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderOnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/pending"
            element={
              <ProtectedRoute allowedRoles={['provider']}>
                <ProviderPendingApprovalPage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes with dashboard layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Customer routes */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/providers" element={<ProtectedRoute allowedRoles={['customer']}><ProviderListings /></ProtectedRoute>} />
            <Route path="/providers/:id" element={<ProtectedRoute allowedRoles={['customer']}><ProviderDetail /></ProtectedRoute>} />
            <Route path="/book/:providerId" element={<ProtectedRoute allowedRoles={['customer']}><BookAppointment /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute allowedRoles={['customer']}><MyAppointments /></ProtectedRoute>} />
            <Route path="/appointments/:id" element={<ProtectedRoute allowedRoles={['customer']}><AppointmentDetail /></ProtectedRoute>} />
            <Route path="/appointments/:id/reschedule" element={<ProtectedRoute allowedRoles={['customer']}><RescheduleAppointment /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute allowedRoles={['customer']}><Favorites /></ProtectedRoute>} />
            <Route path="/rewards" element={<ProtectedRoute allowedRoles={['customer']}><Rewards /></ProtectedRoute>} />
            <Route path="/coupons" element={<ProtectedRoute allowedRoles={['customer']}><ApplyCoupon /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute allowedRoles={['customer']}><Wallet /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute allowedRoles={['customer', 'provider']}><Invoices /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}><Profile /></ProtectedRoute>} />

            {/* Provider routes */}
            <Route element={<ProtectedRoute allowedRoles={['provider']}><ProviderApprovalGate /></ProtectedRoute>}>
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/provider/availability" element={<ManageAvailability />} />
              <Route path="/provider/appointments" element={<AppointmentRequests />} />
              <Route path="/provider/schedule" element={<ProviderSchedule />} />
              <Route path="/provider/profile" element={<ProviderProfile />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/users/:id" element={<ProtectedRoute allowedRoles={['admin']}><UserDetail /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={['admin']}><CategoryManagement /></ProtectedRoute>} />
            <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={['admin']}><AllAppointments /></ProtectedRoute>} />
            <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin']}><ProviderApprovals /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
