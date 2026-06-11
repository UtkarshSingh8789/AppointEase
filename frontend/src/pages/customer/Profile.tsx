import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvatarSelector } from '@/components/ui/AvatarSelector';
import { PageTransition } from '@/components/layout/PageTransition';
import { getProviderImage } from '@/utils/providerImages';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [avatarUrl, setAvatarUrl] = useState(getProviderImage(user?.id || 'customer'));

  const handleSave = async () => {
    await updateUser({
      full_name: fullName,
      phone_number: phone || undefined,
      avatar_url: avatarUrl || undefined,
    } as Partial<typeof user & object>);
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your personal information and avatar
          </p>
        </div>

        {/* Avatar Selection */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Profile Picture
          </h2>
          <AvatarSelector
            currentAvatar={avatarUrl}
            onSelect={setAvatarUrl}
            userName={user?.full_name}
          />
        </Card>

        {/* Personal Info */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Personal Information
          </h2>
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email"
              value={user?.email || ''}
              disabled
              helperText="Email cannot be changed"
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhone(val);
              }}
              placeholder="9876543210"
              maxLength={10}
              helperText="10-digit mobile number"
            />
            <div className="flex items-center gap-4 pt-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Role:</span>{' '}
                <span className="capitalize">{user?.role}</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>{' '}
                {user?.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            Save Profile
          </Button>
        </div>
      </div>
    </PageTransition>
  );
};
