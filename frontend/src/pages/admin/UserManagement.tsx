import React, { useEffect, useState, useCallback } from 'react';
import { UserCheck, UserX, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Pagination } from '@/components/ui/Pagination';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatDate, capitalize } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { User } from '@/types';
import toast from 'react-hot-toast';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [targetAction, setTargetAction] = useState<'activate' | 'deactivate' | 'approve' | 'reject' | null>(null);

  const getUserStatus = (user: User) => user.provider_status ?? (user.is_active ? 'active' : 'deactive');

  const getStatusLabel = (user: User) => {
    const status = getUserStatus(user);
    if (status === 'pending') return 'Pending';
    if (status === 'deactive') return 'Deactive';
    return 'Active';
  };

  const getStatusClasses = (user: User) => {
    const status = getUserStatus(user);
    if (status === 'pending') return 'bg-amber-100 text-amber-700';
    if (status === 'deactive') return 'bg-red-100 text-red-700';
    return 'bg-green-100 text-green-700';
  };

  const getActionForUser = (user: User) => {
    const status = getUserStatus(user);
    if (status === 'pending') return 'approve' as const;
    return user.is_active ? 'deactivate' as const : 'activate' as const;
  };

  const fetchUsers = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const data = await adminService.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        page: pageNum,
        size: 10,
      });
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch {
      // Error handled by interceptor
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleStatusAction = async (user: User, action: 'activate' | 'deactivate' | 'approve' | 'reject') => {
    try {
      if (action === 'approve' || action === 'reject') {
        if (!user.provider_id) {
          toast.error('Provider profile is missing');
          return;
        }
        await adminService.updateProviderApproval(user.provider_id, { action });
        toast.success(action === 'approve' ? 'Provider approved' : 'Provider rejected');
      } else {
        await adminService.updateUserStatus(user.id, action === 'activate');
        toast.success(`User ${action === 'activate' ? 'activated' : 'deactivated'}`);
      }
      await fetchUsers(page);
      setStatusTarget(null);
      setTargetAction(null);
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const roleOptions = [
    { value: 'customer', label: 'Customer' },
    { value: 'provider', label: 'Provider' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{total} users registered on the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <SearchBar
          placeholder="Search users by name or email..."
          onSearch={setSearch}
          className="w-full"
        />
        <div className="flex gap-3">
          <Select
            options={roleOptions}
            placeholder="All Roles"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="sm:w-40"
          />
        </div>
      </div>

      {/* Users table */}
      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting your search or filters" />
      ) : (
        <>
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                      User
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                      Role
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                      Joined
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                            <Avatar name={user.full_name} src={getProviderImage(user.id)} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:underline">{user.full_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          <Shield className="w-3 h-3" />
                          {capitalize(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          getStatusClasses(user)
                        }`}
                      >
                          {getStatusLabel(user)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {getUserStatus(user) === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                              onClick={() => { setStatusTarget(user); setTargetAction('approve'); }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              leftIcon={<ShieldOff className="w-3.5 h-3.5" />}
                              onClick={() => { setStatusTarget(user); setTargetAction('reject'); }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant={getActionForUser(user) === 'deactivate' ? 'danger' : 'secondary'}
                            leftIcon={
                              getActionForUser(user) === 'deactivate' ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )
                            }
                            onClick={() => {
                              setStatusTarget(user);
                              setTargetAction(getActionForUser(user));
                            }}
                          >
                            {getActionForUser(user) === 'deactivate' ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={fetchUsers}
          />
        </>
      )}
      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && targetAction && handleStatusAction(statusTarget, targetAction)}
        title={
          targetAction === 'approve'
            ? 'Approve provider?'
            : targetAction === 'reject'
              ? 'Reject provider?'
              : targetAction === 'deactivate'
                ? 'Deactivate user?'
                : 'Activate user?'
        }
        message={
          targetAction === 'approve'
            ? `${statusTarget?.full_name || 'This provider'} will be approved and can access the provider panel.`
            : targetAction === 'reject'
              ? `${statusTarget?.full_name || 'This provider'} will be rejected and will not gain provider access.`
              : targetAction === 'deactivate'
                ? `${statusTarget?.full_name || 'This user'} will no longer be able to access the platform until reactivated.`
                : `${statusTarget?.full_name || 'This user'} will regain access to the platform.`
        }
        confirmLabel={
          targetAction === 'approve'
            ? 'Approve'
            : targetAction === 'reject'
              ? 'Reject'
              : targetAction === 'deactivate'
                ? 'Deactivate'
                : 'Activate'
        }
        variant={targetAction === 'deactivate' || targetAction === 'reject' ? 'danger' : 'warning'}
      />
    </div>
    </PageTransition>
  );
};
