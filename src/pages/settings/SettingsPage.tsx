import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface StoreSettings {
  receiptPrefix: string;
  challanPrefix: string;
  autoApproveCash: boolean;
  cashApprovalLimit: number;
  smsEnabled: boolean;
  emailEnabled: boolean;
  receiptTemplate: string;
  paymentMethods: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  smsApiKey: string;
  emailSmtpHost: string;
  emailSmtpPort: number;
  emailUsername: string;
  emailPassword: string;
  // Store-admin configured session behavior. Null = not configured = OFF.
  sessionTimeoutMinutes: number | null;
  inactivityLockMinutes: number | null;
}

interface StoreInfo {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  contact: string;
  email: string;
}

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, currentStore } = useAuthStore();
  const [settings, setSettings] = useState<StoreSettings>({
    receiptPrefix: 'REC',
    challanPrefix: 'CHL',
    autoApproveCash: false,
    cashApprovalLimit: 0,
    smsEnabled: true,
    emailEnabled: true,
    receiptTemplate: '',
    paymentMethods: '["CASH","CHEQUE","ONLINE"]',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    smsApiKey: '',
    emailSmtpHost: '',
    emailSmtpPort: 587,
    emailUsername: '',
    emailPassword: '',
    sessionTimeoutMinutes: null,
    inactivityLockMinutes: null,
  });
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    id: 0,
    name: '',
    address: '',
    city: '',
    state: '',
    contact: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  
  const isSuperAdmin = user?.roles?.some(role => role.name === 'SUPER_ADMIN');
  const hasStoreEditPermission = user?.roles?.some(role => 
    role.permissions?.some(perm => perm.resource === 'store_settings' && perm.action === 'manage')
  ) || isSuperAdmin;

  useEffect(() => {
    fetchSettings();
    fetchStoreInfo();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiService.get('/store-settings');
      const d = response.DDMS_data;
      if (d) {
        // Backend returns raw DB columns (snake_case); state uses camelCase.
        // Map explicitly instead of assigning directly, or every field here
        // silently comes back undefined after load.
        setSettings((prev) => ({
          ...prev,
          receiptPrefix: d.receipt_prefix ?? prev.receiptPrefix,
          challanPrefix: d.challan_prefix ?? prev.challanPrefix,
          autoApproveCash: d.auto_approve_cash ?? prev.autoApproveCash,
          cashApprovalLimit: d.cash_approval_limit ?? prev.cashApprovalLimit,
          smsEnabled: d.sms_enabled ?? prev.smsEnabled,
          emailEnabled: d.email_enabled ?? prev.emailEnabled,
          razorpayKeyId: d.razorpay_key_id ?? prev.razorpayKeyId,
          razorpayKeySecret: d.razorpay_key_secret ?? prev.razorpayKeySecret,
          sessionTimeoutMinutes: d.session_timeout_minutes ?? null,
          inactivityLockMinutes: d.inactivity_lock_minutes ?? null,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchStoreInfo = async () => {
    try {
      if (currentStore) {
        const response = await apiService.get(`/stores/${currentStore.id}`);
        // Backend returns the store row directly as DDMS_data (not nested
        // under a "store" key) — that mismatch meant this never populated
        // storeInfo, so the form always looked blank/unsaveable.
        if (response.DDMS_data) {
          setStoreInfo(response.DDMS_data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch store info:', error);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    try {
      await apiService.put('/store-settings', settings);
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const updateStoreInfo = async () => {
    setStoreLoading(true);
    try {
      await apiService.put(`/stores/${storeInfo.id}`, storeInfo);
      alert('Store information updated successfully!');
    } catch (error) {
      console.error('Failed to update store info:', error);
      alert('Failed to update store information');
    } finally {
      setStoreLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      {/* Store Information - Only if user has store edit permission */}
      {hasStoreEditPermission && (
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Store Name</label>
                <Input
                  value={storeInfo.name}
                  onChange={(e) => setStoreInfo({...storeInfo, name: e.target.value})}
                  placeholder="Store Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Number</label>
                <Input
                  value={storeInfo.contact}
                  onChange={(e) => setStoreInfo({...storeInfo, contact: e.target.value})}
                  placeholder="Contact Number"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                value={storeInfo.email}
                onChange={(e) => setStoreInfo({...storeInfo, email: e.target.value})}
                placeholder="Store Email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input
                value={storeInfo.address}
                onChange={(e) => setStoreInfo({...storeInfo, address: e.target.value})}
                placeholder="Store Address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <Input
                  value={storeInfo.city}
                  onChange={(e) => setStoreInfo({...storeInfo, city: e.target.value})}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <Input
                  value={storeInfo.state}
                  onChange={(e) => setStoreInfo({...storeInfo, state: e.target.value})}
                  placeholder="State"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={updateStoreInfo} disabled={storeLoading}>
                {storeLoading ? 'Updating...' : 'Update Store Info'}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Receipt Prefix</label>
              <Input
                value={settings.receiptPrefix}
                onChange={(e) => setSettings({...settings, receiptPrefix: e.target.value})}
                placeholder="REC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Challan Prefix</label>
              <Input
                value={settings.challanPrefix}
                onChange={(e) => setSettings({...settings, challanPrefix: e.target.value})}
                placeholder="CHL"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.autoApproveCash}
              onChange={(e) => setSettings({...settings, autoApproveCash: e.target.checked})}
            />
            <label>Auto Approve Cash Payments</label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Cash Approval Limit</label>
            <Input
              type="number"
              value={settings.cashApprovalLimit === 0 ? '' : settings.cashApprovalLimit}
              onChange={(e) => {
                const raw = e.target.value;
                setSettings({ ...settings, cashApprovalLimit: raw === '' ? 0 : Number(raw) });
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Security</CardTitle>
        </CardHeader>
        <div className="p-4 space-y-4">
          <p className="text-sm text-secondary-600">
            Leave a field blank to keep that behavior turned off. Nothing is enabled by default —
            set these to control how long staff can stay idle before they're locked out.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Lock screen after inactivity (minutes)
              </label>
              <Input
                type="number"
                min={1}
                value={settings.inactivityLockMinutes ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  setSettings({
                    ...settings,
                    inactivityLockMinutes: raw === '' ? null : Number(raw),
                  });
                }}
                placeholder="Off"
              />
              <p className="mt-1 text-xs text-secondary-500">
                User must re-enter their password to resume. Doesn't lose their place.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Auto logout after inactivity (minutes)
              </label>
              <Input
                type="number"
                min={1}
                value={settings.sessionTimeoutMinutes ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  setSettings({
                    ...settings,
                    sessionTimeoutMinutes: raw === '' ? null : Number(raw),
                  });
                }}
                placeholder="Off"
              />
              <p className="mt-1 text-xs text-secondary-500">
                Full sign-out and local data clear. Must be longer than the lock time above.
              </p>
            </div>
          </div>
          {settings.inactivityLockMinutes && settings.sessionTimeoutMinutes &&
            settings.inactivityLockMinutes >= settings.sessionTimeoutMinutes && (
            <p className="text-sm text-red-600">
              Auto-logout time must be greater than the lock time, or the lock will never trigger.
            </p>
          )}
        </div>
      </Card>

      {/* Communication Settings - Only Super Admin */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Communication Settings</CardTitle>
          </CardHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.smsEnabled}
                onChange={(e) => setSettings({...settings, smsEnabled: e.target.checked})}
              />
              <label>Enable SMS Notifications</label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">SMS API Key</label>
              <Input
                value={settings.smsApiKey}
                onChange={(e) => setSettings({...settings, smsApiKey: e.target.value})}
                placeholder="Enter SMS API Key"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => setSettings({...settings, emailEnabled: e.target.checked})}
              />
              <label>Enable Email Notifications</label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Host</label>
                <Input
                  value={settings.emailSmtpHost}
                  onChange={(e) => setSettings({...settings, emailSmtpHost: e.target.value})}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Port</label>
                <Input
                  type="number"
                  value={settings.emailSmtpPort}
                  onChange={(e) => setSettings({...settings, emailSmtpPort: Number(e.target.value)})}
                  placeholder="587"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Username</label>
                <Input
                  value={settings.emailUsername}
                  onChange={(e) => setSettings({...settings, emailUsername: e.target.value})}
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Password</label>
                <Input
                  type="password"
                  value={settings.emailPassword}
                  onChange={(e) => setSettings({...settings, emailPassword: e.target.value})}
                  placeholder="App Password"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Payment Gateway Settings - Only Super Admin */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Gateway Settings</CardTitle>
          </CardHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Razorpay Key ID</label>
                <Input
                  value={settings.razorpayKeyId}
                  onChange={(e) => setSettings({...settings, razorpayKeyId: e.target.value})}
                  placeholder="rzp_test_xxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Razorpay Key Secret</label>
                <Input
                  type="password"
                  value={settings.razorpayKeySecret}
                  onChange={(e) => setSettings({...settings, razorpayKeySecret: e.target.value})}
                  placeholder="Secret Key"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Receipt Template */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Template</CardTitle>
        </CardHeader>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template Style</label>
            <select
              value={settings.receiptTemplate || 'DEFAULT'}
              onChange={(e) => setSettings({...settings, receiptTemplate: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="DEFAULT">Default Template</option>
              <option value="MODERN">Modern Template</option>
              <option value="TRADITIONAL">Traditional Template</option>
              <option value="MINIMAL">Minimal Template</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Template Preview</h4>
              <div className="text-sm text-gray-600">
                {settings.receiptTemplate === 'MODERN' && (
                  <div className="bg-gray-800 text-white p-3 rounded">
                    <div className="text-center">
                      <div className="font-bold text-lg">{storeInfo.name || 'Store Name'}</div>
                      <div className="text-sm">DONATION RECEIPT</div>
                    </div>
                  </div>
                )}
                {settings.receiptTemplate === 'TRADITIONAL' && (
                  <div className="border-2 border-gray-400 p-3">
                    <div className="text-center">
                      <div className="text-red-600 text-sm">॥ श्री गणेशाय नमः ॥</div>
                      <div className="font-bold">{storeInfo.name || 'Store Name'}</div>
                      <div className="italic">दान रसीद / DONATION RECEIPT</div>
                    </div>
                  </div>
                )}
                {settings.receiptTemplate === 'MINIMAL' && (
                  <div className="border-b-2 border-gray-300 pb-2">
                    <div className="font-bold">{storeInfo.name || 'Store Name'}</div>
                    <div className="text-sm">Receipt</div>
                  </div>
                )}
                {(!settings.receiptTemplate || settings.receiptTemplate === 'DEFAULT') && (
                  <div className="text-center border p-3">
                    <div className="font-bold text-lg">DONATION RECEIPT</div>
                    <div className="mt-2">{storeInfo.name || 'Store Name'}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Template Features</h4>
              <div className="text-sm space-y-1">
                {settings.receiptTemplate === 'MODERN' && (
                  <ul className="list-disc list-inside text-gray-600">
                    <li>Dark header with gradient effect</li>
                    <li>Modern card-like layout</li>
                    <li>Clean typography</li>
                    <li>Professional appearance</li>
                  </ul>
                )}
                {settings.receiptTemplate === 'TRADITIONAL' && (
                  <ul className="list-disc list-inside text-gray-600">
                    <li>Sanskrit blessing at top</li>
                    <li>Ornate decorative border</li>
                    <li>Traditional fonts</li>
                    <li>Cultural elements</li>
                  </ul>
                )}
                {settings.receiptTemplate === 'MINIMAL' && (
                  <ul className="list-disc list-inside text-gray-600">
                    <li>Clean, simple design</li>
                    <li>Minimal visual elements</li>
                    <li>Focus on content</li>
                    <li>Easy to read</li>
                  </ul>
                )}
                {(!settings.receiptTemplate || settings.receiptTemplate === 'DEFAULT') && (
                  <ul className="list-disc list-inside text-gray-600">
                    <li>Standard layout</li>
                    <li>Basic formatting</li>
                    <li>Universal design</li>
                    <li>Compatible with all printers</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={updateSettings} disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};