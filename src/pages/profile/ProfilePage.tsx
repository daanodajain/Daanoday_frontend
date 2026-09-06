import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => apiService.get('/user-profile'),
  });

  const profile = data?.DDMS_data || currentUser;

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors },
  } = useForm({
    values: {
      name: profile?.name || '',
      email: profile?.email || '',
      mobile: profile?.mobile || '',
    },
  });

  const {
    register: regPass,
    handleSubmit: handlePass,
    formState: { errors: passErrors },
    watch,
    reset: resetPass,
  } = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiService.put('/user-profile', data),
    onSuccess: (res) => {
      if (res?.status === 'SUCCESS') {
        queryClient.invalidateQueries({ queryKey: ['my-profile'] });
        toast.success('Profile updated');
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || 'Failed to update'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => apiService.post('/user-profile/change-password', data),
    onSuccess: (res) => {
      if (res?.status === 'SUCCESS') {
        resetPass();
        toast.success('Password changed successfully');
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || 'Failed to change password'),
  });

  const onProfileSubmit = (data: any) => {
    // Validate mobile
    if (data.mobile && !/^\d{10}$/.test(data.mobile)) {
      toast.error('Mobile number must be 10 digits');
      return;
    }
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: any) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  if (isLoading) return <div className="animate-pulse p-6">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">My Profile</h1>

      {/* Avatar + basic info */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
            {(profile?.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.name}</h2>
            <p className="text-sm text-secondary-500">{profile?.email || profile?.mobile}</p>
            <p className="text-xs text-secondary-400 mt-1">{profile?.role_name || 'User'}</p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-secondary-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'profile' ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-500'}`}
          onClick={() => setActiveTab('profile')}
        >
          <User className="w-4 h-4 inline mr-2" />
          Personal Info
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'password' ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-500'}`}
          onClick={() => setActiveTab('password')}
        >
          <Lock className="w-4 h-4 inline mr-2" />
          Change Password
        </button>
      </div>

      {activeTab === 'profile' && (
        <Card className="p-6">
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4 mt-4">
            <Input
              label="Full Name *"
              {...regProfile('name', { required: 'Name is required' })}
              error={profileErrors.name?.message as string}
              placeholder="Your full name"
            />
            <Input
              label="Email"
              type="email"
              {...regProfile('email')}
              error={profileErrors.email?.message as string}
              placeholder="your@email.com"
            />
            <Input
              label="Mobile Number"
              type="tel"
              {...regProfile('mobile', {
                pattern: { value: /^\d{10}$/, message: 'Must be 10 digits' }
              })}
              error={profileErrors.mobile?.message as string}
              placeholder="10-digit mobile number"
              maxLength={10}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                e.target.value = val;
              }}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={updateProfileMutation.isPending}>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card className="p-6">
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <form onSubmit={handlePass(onPasswordSubmit)} className="space-y-4 mt-4">
            <Input
              label="Current Password *"
              type="password"
              {...regPass('currentPassword', { required: 'Current password is required' })}
              error={passErrors.currentPassword?.message as string | undefined}
              placeholder="Enter current password"
            />
            <Input
              label="New Password *"
              type="password"
              {...regPass('newPassword', {
                required: 'New password is required',
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
              error={passErrors.newPassword?.message as string | undefined}
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password *"
              type="password"
              {...regPass('confirmPassword', {
                required: 'Please confirm password',
                validate: (val) => val === watch('newPassword') || 'Passwords do not match',
              })}
              error={passErrors.confirmPassword?.message as string | undefined}
              placeholder="Confirm new password"
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={changePasswordMutation.isPending}>
                <Lock className="w-4 h-4 mr-2" /> Change Password
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
