import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { providerService } from '@/services/providerService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type ProviderStatus = 'loading' | 'missing' | 'pending' | 'approved';

/** Gate that keeps providers in onboarding/pending states until admin approval. */
export const ProviderApprovalGate: React.FC = () => {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<ProviderStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const provider = await providerService.getMyProfile();
        if (cancelled) return;
        setStatus(provider.is_verified ? 'approved' : 'pending');
      } catch {
        if (cancelled) return;
        setStatus('missing');
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (status === 'loading') {
    return <LoadingSpinner size="lg" text="Checking provider status..." />;
  }

  if (status === 'missing') {
    return <Navigate to="/provider/onboarding" replace />;
  }

  if (status === 'pending') {
    return <Navigate to="/provider/pending" replace />;
  }

  return <Outlet />;
};
