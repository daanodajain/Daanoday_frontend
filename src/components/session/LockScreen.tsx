import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const { user, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await apiService.unlockSession(password);
      if (res?.status === 'SUCCESS') {
        setPassword('');
        onUnlock();
      } else {
        setError('Incorrect password');
      }
    } catch (err: any) {
      const code = err?.response?.data?.DDMS_error_code;
      setError(code === 'INVALID_PASSWORD' ? 'Incorrect password' : (code || 'Failed to unlock'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoutInstead = async () => {
    toast('Logging out...');
    await logout();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary-900/95 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
            <Lock className="h-7 w-7 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-secondary-900 mb-1">Session Locked</h2>
          <p className="text-sm text-secondary-600 mb-6">
            {user?.name ? `Welcome back, ${user.name}. ` : ''}
            Enter your password to continue where you left off.
          </p>
          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              error={error}
              placeholder="Enter your password"
              autoFocus
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" loading={submitting}>
              Unlock
            </Button>
          </form>
          <button
            type="button"
            onClick={handleLogoutInstead}
            className="mt-4 text-sm text-secondary-500 hover:text-secondary-700 underline"
          >
            Not you? Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
