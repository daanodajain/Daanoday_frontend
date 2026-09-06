import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface LoginForm { identifier: string; password: string; }
interface OtpForm { otp: string; }
interface ChangePasswordForm { newPassword: string; confirmPassword: string; }

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // modal steps: null → 'otp' → 'password'
  const [modalStep, setModalStep] = useState<null | 'otp' | 'password'>(null);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const { register: regOtp, handleSubmit: handleOtp, formState: { errors: errorsOtp } } = useForm<OtpForm>();
  const {
    register: regCP, handleSubmit: handleCP,
    formState: { errors: errorsCP }, watch,
  } = useForm<ChangePasswordForm>();

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => apiService.login(data.identifier, data.password),
    onSuccess: (data) => {
      if (data?.status === 'SUCCESS') {
        const { user, token, refreshToken, roles, stores, requirePasswordChange: rpc, otpEnabled: otp } = data.DDMS_data;
        const authUser = { ...user, roles: roles || [], stores: stores || [] };
        setAuth(authUser, token, refreshToken);
        if (rpc) {
          setOtpEnabled(!!otp);
          setModalStep(otp ? 'otp' : 'password');
          return;
        }
        toast.success('Login successful!');
        // Same form for everyone — backend tells us who just logged in.
        navigate(user?.userType === 'CUSTOMER' ? '/customer/dashboard' : '/dashboard');
      } else {
        toast.error('Login failed');
      }
    },
    onError: (error: any, variables) => {
      const code = error?.response?.data?.DDMS_error_code || error?.message;
      if (code === 'CUSTOMER_FIRST_LOGIN_SETUP_REQUIRED') {
        toast('First time logging in? Set up your account with OTP.', { icon: 'ℹ️' });
        navigate('/customer/login', { state: { identifier: variables?.identifier } });
        return;
      }
      toast.error(typeof code === 'string' ? code : 'Invalid credentials');
    },
  });

  // Staff OTP verify — call backend to verify OTP before allowing password set
  const otpMutation = useMutation({
    mutationFn: async ({ otp }: OtpForm) => apiService.post('/auth/verify-first-login-otp', { otp }),
    onSuccess: (data) => {
      if (data?.status === 'SUCCESS') {
        setModalStep('password');
      } else {
        toast.error(data?.DDMS_error_code || 'Invalid OTP');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.DDMS_error_code || 'Invalid OTP');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => apiService.changePassword(data.newPassword),
    onSuccess: (data) => {
      if (data?.status === 'SUCCESS') {
        const { user, token, refreshToken, roles, stores } = data.DDMS_data;
        const authUser = { ...user, roles: roles || [], stores: stores || [] };
        setAuth(authUser, token, refreshToken);
        setModalStep(null);
        toast.success('Password set successfully! Welcome.');
        navigate('/dashboard');
      } else {
        toast.error('Failed to set password');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.DDMS_error_code || error?.message || 'Failed to set password');
    },
  });

  const onLogin = (data: LoginForm) => loginMutation.mutate(data);
  const onOtpSubmit = (data: OtpForm) => otpMutation.mutate(data);
  const onChangePassword = (data: ChangePasswordForm) => changePasswordMutation.mutate(data);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">Daanoday</h1>
          <h2 className="text-xl font-semibold text-secondary-900">Login</h2>
          <p className="mt-2 text-sm text-secondary-600">Temple Donation Management System</p>
        </div>

        <Card className="p-8">
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
              {...register('password', { required: 'Password is required' })}
              error={errors.password?.message}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" loading={loginMutation.isPending}>
              Login
            </Button>
          </form>
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/customer/login')}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              First-time customer? Set up your account with OTP
            </button>
          </div>
        </Card>
      </div>

      {/* Step 1: OTP Modal (only when otpEnabled=true) */}
      <Modal
        isOpen={modalStep === 'otp'}
        onClose={() => {}}
        title=""
        size="sm"
        showCloseButton={false}
        closeOnBackdrop={false}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-secondary-900">OTP Verification</h2>
          <p className="text-sm text-secondary-500 mt-2">
            Your registered mobile/email par OTP bheja gaya hai. Verify karein.
          </p>
        </div>
        <form onSubmit={handleOtp(onOtpSubmit)} className="space-y-4">
          <Input
            label="OTP"
            type="text"
            maxLength={6}
            {...regOtp('otp', {
              required: 'OTP required',
              pattern: { value: /^\d{6}$/, message: '6-digit OTP enter karein' },
            })}
            error={errorsOtp.otp?.message}
            placeholder="6-digit OTP"
            autoComplete="one-time-code"
          />
          <Button type="submit" className="w-full" loading={otpMutation.isPending}>
            Verify OTP
          </Button>
        </form>
      </Modal>

      {/* Step 2: Set Password Modal */}
      <Modal
        isOpen={modalStep === 'password'}
        onClose={() => {}}
        title=""
        size="sm"
        showCloseButton={false}
        closeOnBackdrop={false}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-secondary-900">Set Your Password</h2>
          <p className="text-sm text-secondary-500 mt-2">
            This is your first login. Please set a new password to continue.
          </p>
        </div>

        <form onSubmit={handleCP(onChangePassword)} className="space-y-4">
          <div className="relative">
            <Input
              label="New Password"
              type={showNewPass ? 'text' : 'password'}
              {...regCP('newPassword', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
              error={errorsCP.newPassword?.message}
              placeholder="Enter new password"
              autoComplete="new-password"
            />
            <button type="button" className="absolute right-3 top-8 text-secondary-400"
              onClick={() => setShowNewPass(!showNewPass)}>
              {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirmPass ? 'text' : 'password'}
              {...regCP('confirmPassword', {
                required: 'Please confirm your password',
                validate: (val) => val === watch('newPassword') || 'Passwords do not match',
              })}
              error={errorsCP.confirmPassword?.message}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <button type="button" className="absolute right-3 top-8 text-secondary-400"
              onClick={() => setShowConfirmPass(!showConfirmPass)}>
              {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button type="submit" className="w-full mt-2" loading={changePasswordMutation.isPending}>
            Set Password & Enter
          </Button>
        </form>
      </Modal>
    </div>
  );
};
