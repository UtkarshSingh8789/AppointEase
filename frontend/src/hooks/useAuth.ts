import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/** Hook to initialize auth state on app load */
export function useAuth() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser]);

  return { user, isAuthenticated, isLoading };
}
