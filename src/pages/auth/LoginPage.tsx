import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface LoginForm {
  identifier: string;
  password: string;
}

interface ChangePasswordForm {
  newPassword: string;
  confirmPassword: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const { register: regCP, handleSubmit: handleCP, formState: { errors: errorsCP }, watch } = useForm<ChangePasswordForm>();

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await apiService.login(data.identifier, data.password);
      return res;
    },
    onSuccess: (data) => {
      if (data?.status === 'SUCCESS') {
        const { user, token, refreshToken, roles, stores, requirePasswordChange: rpc } = data.DDMS_data;

        // Merge roles and stores into user object
        const authUser = { ...user, roles: roles || [], stores: stores || [] };

        if (rpc) {
          setAuth(authUser, token, refreshToken);
          setRequirePasswordChange(true);
          return;
        }

        setAuth(authUser, token, refreshToken);
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        toast.error('Login failed');
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.DDMS_error_code || error?.message || 'Login failed';
      toast.error(typeof msg === 'string' ? msg : 'Invalid credentials');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      const res = await apiService.changePassword(data.newPassword);
      return res;
    },
    onSuccess: (data) => {
      if (data?.status === 'SUCCESS') {
        const { user, token, refreshToken, roles, stores } = data.DDMS_data;
        const authUser = { ...user, roles: roles || [], stores: stores || [] };
        setAuth(authUser, token, refreshToken);
        toast.success('Password set! Welcome.');
        navigate('/dashboard');
      } else {
        toast.error('Failed to set password');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to set password');
    },
  });

  const onLogin = (data: LoginForm) => loginMutation.mutate(data);
  const onChangePassword = (data: ChangePasswordForm) => changePasswordMutation.mutate(data);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">Daanoday</h1>
          <h2 className="text-xl font-semibold text-secondary-900">
            {requirePasswordChange ? 'Set New Password' : 'Login'}
          </h2>
          <p className="mt-2 text-sm text-secondary-600">Temple Donation Management System</p>
        </div>

        <Card className="p-8">
          {!requirePasswordChange ? (
            <form onSubmit={handleSubmit(onLogin)} className="space-y-6">
              <Input
                label="Email or Mobile Number"
                type="text"
                {...register('identifier', { required: 'Email or mobile number is required' })}
                error={errors.identifier?.message}
                placeholder="Enter email or mobile number"
                autoComplete="username"
              />
              <Input
                label="Password"
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' },
                })}
                error={errors.password?.message}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full" loading={loginMutation.isPending}>
                Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCP(onChangePassword)} className="space-y-6">
              <p className="text-sm text-secondary-600 text-center">
                Welcome! Please set a new password to continue.
              </p>
              <Input
                label="New Password"
                type="password"
                {...regCP('newPassword', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
                error={errorsCP.newPassword?.message}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <Input
                label="Confirm Password"
                type="password"
                {...regCP('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (val) => val === watch('newPassword') || 'Passwords do not match',
                })}
                error={errorsCP.confirmPassword?.message}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full" loading={changePasswordMutation.isPending}>
                Set Password & Continue
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
