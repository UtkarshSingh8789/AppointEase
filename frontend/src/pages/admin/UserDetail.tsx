import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, Phone, Shield, UserCheck, Calendar, MapPin, Briefcase, Star } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatDate, capitalize } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [userDetail, setUserDetail] = useState<{
    user: Awaited<ReturnType<typeof adminService.getUser>>['user'];
    provider?: Awaited<ReturnType<typeof adminService.getUser>>['provider'];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await adminService.getUser(id);
        setUserDetail(data);
      } catch {
        // Handled by interceptor
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading user details..." />;
  }

  if (!userDetail) {
    return (
      <PageTransition>
        <div className="text-center text-gray-500 dark:text-gray-400">User not found</div>
      </PageTransition>
    );
  }

  const { user, provider } = userDetail;
  const status = provider
    ? (!user.is_active
        ? 'deactive'
        : provider.is_verified
          ? 'active'
          : 'pending')
    : (user.is_active ? 'active' : 'deactive');

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link to="/admin/users" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Back to users
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">User Details</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Full profile and role-specific information</p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center gap-2 font-medium border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            Open users list
          </Link>
        </div>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex items-center gap-4">
              <Avatar name={user.full_name} src={getProviderImage(user.id)} size="2xl" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.full_name}</h2>
                <p className="text-primary-600 dark:text-primary-400 font-medium">{capitalize(user.role)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                      status === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {status === 'pending' ? 'Pending' : status === 'active' ? 'Active' : 'Deactive'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    <Shield className="w-3.5 h-3.5" />
                    User profile
                  </span>
                </div>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {user.phone_number || 'No phone number provided'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Joined</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(user.created_at)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Role</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {capitalize(user.role)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {provider && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Provider Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Specialization</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{provider.specialization}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Category</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{provider.category?.name || 'N/A'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Experience</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{provider.experience_years} years</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Location</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {provider.location}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Hourly Rate</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {provider.hourly_rate ? `₹${provider.hourly_rate}` : 'N/A'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Rating</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {provider.rating.toFixed(1)} ({provider.total_reviews} reviews)
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};
