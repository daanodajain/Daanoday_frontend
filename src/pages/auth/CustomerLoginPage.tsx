import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { LoginFormData } from '@/types';

type LoginStep = 'identifier' | 'otp' | 'password' | 'setup-password';

// Mobile: 10 digits starting 6-9. Email: standard shape. Either is accepted
// everywhere a customer identifies themselves (send-otp, login).
const IDENTIFIER_PATTERN = /^([6-9]\d{9}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export const CustomerLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<LoginStep>('identifier');
  // Prefilled when unified /login redirects a not-yet-set-up customer here.
  const prefillIdentifier = (location.state as { identifier?: string } | null)?.identifier || '';
  const [identifier, setIdentifier] = useState(prefillIdentifier);

  // Fetch login config (OTP enabled/disabled)
  const { data: configData } = useQuery({
    queryKey: ['customer-login-config'],
    queryFn: () => apiService.get('/customer-auth/config'),
    staleTime: 5 * 60 * 1000,
  });
  const otpEnabled: boolean = configData?.DDMS_data?.otpEnabled ?? false;

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
      identifier: prefillIdentifier,
      otp: '',
      password: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    clearErrors();
  }, [step, clearErrors]);

  const sendOtpMutation = useMutation({
    mutationFn: async (identifier: string) => {
      try {
        const payload = await apiService.post('/customer-auth/send-otp', { identifier });
        return payload;
      } catch (err: any) {
        if (err?.response?.data) {
          return err.response.data;
        }
        throw err;
      }
    },
    onSuccess: (payload) => {
      if (!payload) {
        toast.error('Empty response from server');
        return;
      }
      if (payload.status === 'SUCCESS') {
        const data = payload?.DDMS_data;
        if (!data?.firstLogin) {
          // Returning customer — password step
          toast.success('Please enter your password');
          setStep('password');
          return;
        }
        // First login
        if (data?.otpEnabled === false) {
          // OTP OFF — directly set password
          toast.success('Please set your password');
          setStep('setup-password');
        } else {
          // OTP ON — verify OTP first
          toast.success(data?.message || 'OTP sent successfully');
          setStep('otp');
        }
        return;
      }
      toast.error(payload?.DDMS_error_code || 'Failed to send OTP');
    },
    onError: (error: any) => {
      const serverMsg = error?.response?.data?.DDMS_data?.message || error?.message;
      toast.error(serverMsg || 'Failed to send OTP. Please try again.');
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => {
      return apiService.post('/customer-auth/login', {
        identifier: data.identifier,
        password: data.password,
        otp: data.otp,
        newPassword: data.newPassword,
      });
    },
    onSuccess: (data) => {
      if (data.status === 'SUCCESS') {
        const { customer, token, refreshToken } = data.DDMS_data;
        const authUser = { 
          ...customer,
          roles: [], 
          stores: [],
          userType: 'CUSTOMER' as const,
        };
        setAuth(authUser, token, refreshToken);
        toast.success('Welcome! Redirecting...');
        navigate('/customer/dashboard');
      } else {
        toast.error(data.DDMS_error_code || 'Login failed');
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.DDMS_data?.message || error?.message || 'Login failed';
      toast.error(errorMessage);
    },
  });

  const handleIdentifierSubmit = async (data: LoginFormData) => {
    setIdentifier(data.identifier);
    if (sendOtpMutation.isPending) return;

    try {
      await sendOtpMutation.mutateAsync(data.identifier);
    } catch (err) {
      console.error('handleIdentifierSubmit caught error ->', err);
    }
  };

  const handleOtpSubmit = (data: LoginFormData) => {
    setStep('setup-password');
    setValue('otp', data.otp);
  };

  const handlePasswordSubmit = (data: LoginFormData) => {
    loginMutation.mutate({
      identifier,
      password: data.password,
    });
  };

  const handlePasswordSetup = (data: LoginFormData) => {
    loginMutation.mutate({
      identifier,
      otp: data.otp,
      newPassword: data.newPassword,
    });
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('identifier');
      reset({ identifier: getValues('identifier') });
    } else if (step === 'password') {
      setStep('identifier');
      reset({ identifier: getValues('identifier') });
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
            Customer Login
          </h2>
          <p className="mt-2 text-sm text-secondary-600">
            Access your donation history and receipts
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6" noValidate>
            {step === 'identifier' && (
              <>
                <Input
                  label="Mobile Number or Email"
                  type="text"
                  {...register('identifier', {
                    required: 'Mobile number or email is required',
                    pattern: {
                      value: IDENTIFIER_PATTERN,
                      message: 'Enter a valid 10-digit mobile number or email',
                    }
                  })}
                  error={errors.identifier?.message}
                  placeholder="Enter your registered mobile number or email"
                  autoComplete="username"
                />
                <Button
                  type="button"
                  className="w-full"
                  loading={sendOtpMutation.isPending}
                  onClick={handleSubmit(handleIdentifierSubmit)}
                >
                  Send OTP
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    Staff Login
                  </button>
                </div>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="text-center">
                  <p className="text-sm text-secondary-600">
                    OTP sent to {identifier}
                  </p>
                </div>
                <Input
                  label="OTP"
                  type="text"
                  maxLength={6}
                  {...register('otp', {
                    required: 'OTP is required',
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
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    loading={loginMutation.isPending}
                    onClick={handleSubmit(handleOtpSubmit)}
                  >
                    Verify OTP
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
                  label="Password"
                  type="password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
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
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    loading={loginMutation.isPending}
                    onClick={handleSubmit(handlePasswordSubmit)}
                  >
                    Login
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
                    Back
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
                onClick={() => sendOtpMutation.mutate(identifier)}
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
