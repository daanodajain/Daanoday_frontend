import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { LoginFormData } from '@/types';

type LoginStep = 'mobile' | 'otp' | 'password' | 'setup-password';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<LoginStep>('mobile');
  const [mobile, setMobile] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
    setValue,
    getValues,
  } = useForm<LoginFormData>({
    mode: 'onSubmit',
    defaultValues: {
      mobile: '',
      otp: '',
      password: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Clear errors when step changes
  useEffect(() => {
    clearErrors();
  }, [step, clearErrors]);

  // replace your sendOtpMutation.mutationFn with this tolerant version
const sendOtpMutation = useMutation({
  mutationFn: async (mobile: string) => {
    console.log('[sendOtp] mutationFn start ->', mobile);
    try {
      const payload = await apiService.sendOTP(mobile); // normal path
      console.log('[sendOtp] payload from API ->', payload);
      return payload;
    } catch (err: any) {
      console.warn('[sendOtp] mutationFn caught error ->', err);
      // If axios-like error and server returned a payload (HTTP 200 but interceptor threw)
      if (err?.response?.data) {
        console.log('[sendOtp] using error.response.data as payload ->', err.response.data);
        return err.response.data; // send to onSuccess for handling
      }
      // no server payload — rethrow to invoke onError
      throw err;
    }
  },

  onSuccess: (payload) => {
    console.log('[sendOtp] onSuccess payload ->', payload);
    if (!payload) {
      toast.error('Empty response from server');
      return;
    }
    if (payload?.status === 'SUCCESS') {
      const msg = payload?.DDMS_data?.message;
      if (payload.DDMS_data?.requiresPassword) {
        toast.success(msg || 'Please enter your password');
        setStep('password');
        return;
      }
      toast.success(msg || 'OTP sent successfully');
      setStep('otp');
      return;
    }
    toast.error(payload?.DDMS_data?.message || 'Failed to send OTP');
  },

  onError: (error: any) => {
    console.error('[sendOtp] onError ->', error);
    const serverMsg =
      error?.response?.data?.DDMS_data?.message ||
      error?.response?.data?.message ||
      error?.message;
    toast.error(serverMsg || 'Failed to send OTP. Please try again.');
  },
});


  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => {
      return apiService.login(data.mobile, data.password, data.otp, data.newPassword);
    },
    onSuccess: (data) => {
      if (data?.status === 'SUCCESS') {
        const { user, token, refreshToken } = data.DDMS_data;
        setAuth(user, token, refreshToken);
        toast.success(t('auth.loginSuccess'));
        navigate('/dashboard');
      } else {
        toast.error('Login failed');
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.DDMS_data || error?.message || 'Login failed';
      toast.error(errorMessage);
    },
  });

  // Use mutateAsync so we can await the request and catch sync errors
const handleMobileSubmit = async (data: LoginFormData) => {
  console.log('handleMobileSubmit called ->', data);
  setMobile(data.mobile);

  if ( sendOtpMutation.isPending) {
    console.log('sendOtp in progress, ignoring click');
    return;
  }

  try {
    const payload = await sendOtpMutation.mutateAsync(data.mobile);
    console.log('sendOtp mutateAsync resolved ->', payload);
    // (no extra logic needed — onSuccess already set step according to payload)
  } catch (err) {
    // onError already displays toast; log for debugging
    console.error('handleMobileSubmit caught error ->', err);
  }
};


  const handleOtpSubmit = (data: LoginFormData) => {
    console.log('🔐 Verifying OTP for mobile', mobile, 'otp', data.otp);
    // For first-time users, we need to check if they need to set password
    // This will be handled by checking the API response
    setStep('setup-password');
    setValue('otp', data.otp); // Store OTP for password setup
  };

  const handlePasswordSubmit = (data: LoginFormData) => {
    console.log('🔑 Submitting password for mobile', mobile);
    loginMutation.mutate({
      mobile,
      password: data.password,
    });
  };

  const handlePasswordSetup = (data: LoginFormData) => {
    console.log('🆕 Setting up new password for mobile', mobile);
    loginMutation.mutate({
      mobile,
      otp: data.otp,
      newPassword: data.newPassword,
    });
  };

  // Keep this to prevent unexpected native submit fallback
  const onSubmit = (_data: LoginFormData) => {
    // We handle submissions explicitly from buttons using handleSubmit(...)
    console.log('onSubmit (fallback) called — prevented default behavior');
  };

  const goBack = () => {
    console.log('⬅️ Going back from step:', step);
    if (step === 'otp') {
      setStep('mobile');
      reset({ mobile: getValues('mobile') });
    } else if (step === 'password') {
      setStep('mobile');
      reset({ mobile: getValues('mobile') });
    } else if (step === 'setup-password') {
      setStep('otp');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">Daanoday</h1>
          <h2 className="text-xl font-semibold text-secondary-900">
            {t('auth.login')}
          </h2>
          <p className="mt-2 text-sm text-secondary-600">
            Temple Donation Management System
          </p>
        </div>

        <Card className="p-8">
          {/* prevent native submit (we bind buttons explicitly) */}
          <form onSubmit={(e) => { e.preventDefault(); onSubmit; }} className="space-y-6" noValidate>
            {step === 'mobile' && (
              <>
                <Input
                  label={t('auth.mobile')}
                  type="tel"
                  {...register('mobile', {
                    required: t('validation.required'),
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: t('validation.invalidMobile'),
                    }
                  })}
                  error={errors.mobile?.message}
                  placeholder="Enter 10-digit mobile number"
                  autoComplete="tel"
                  maxLength={10}
                  defaultValue=""
                />
                <Button
                  type="button"                      // <- changed to button to prevent native form submit
                  className="w-full"
                  loading={sendOtpMutation.isPending}
                  onClick={handleSubmit(handleMobileSubmit)}
                >
                  {t('auth.sendOtp')}
                </Button>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="text-center">
                  <p className="text-sm text-secondary-600">
                    OTP sent to {mobile}
                  </p>
                </div>
                <Input
                  label={t('auth.otp')}
                  type="text"
                  maxLength={6}
                  {...register('otp', {
                    required: t('validation.required'),
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'Please enter valid 6-digit OTP',
                    }
                  })}
                  error={errors.otp?.message}
                  placeholder="Enter 6-digit OTP"
                  autoComplete="one-time-code"
                />
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="flex-1"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"                       // <- changed to button
                    className="flex-1"
                    loading={loginMutation.isPending}
                    onClick={handleSubmit(handleOtpSubmit)}
                  >
                    {t('auth.verifyOtp')}
                  </Button>
                </div>
              </>
            )}

            {step === 'password' && (
              <>
                <div className="text-center">
                  <p className="text-sm text-secondary-600">
                    Welcome back! Please enter your password.
                  </p>
                </div>
                <Input
                  label={t('auth.password')}
                  type="password"
                  {...register('password', {
                    required: t('validation.required'),
                    minLength: {
                      value: 6,
                      message: t('validation.minLength', { count: 6 }),
                    },
                  })}
                  error={errors.password?.message}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="flex-1"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"                      // <- changed to button
                    className="flex-1"
                    loading={loginMutation.isPending}
                    onClick={handleSubmit(handlePasswordSubmit)}
                  >
                    {t('auth.login')}
                  </Button>
                </div>
              </>
            )}

            {step === 'setup-password' && (
              <>
                <div className="text-center">
                  <p className="text-sm text-secondary-600">
                    Welcome! Please set your password for future logins.
                  </p>
                </div>
                <Input
                  label="New Password"
                  type="password"
                  {...register('newPassword', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  error={errors.newPassword?.message}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => {
                      const newPassword = getValues('newPassword');
                      return value === newPassword || 'Passwords do not match';
                    },
                  })}
                  error={errors.confirmPassword?.message}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="flex-1"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    loading={loginMutation.isPending}
                    onClick={handleSubmit(handlePasswordSetup)}
                  >
                    Set Password & Login
                  </Button>
                </div>
              </>
            )}
          </form>

          {step === 'otp' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => sendOtpMutation.mutate(mobile)}
                disabled={sendOtpMutation.isPending}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Resend OTP
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
