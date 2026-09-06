import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Settings, CreditCard, MessageSquare, Mail, Shield, Plus, Edit, Users } from 'lucide-react';

interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: string;
  description: string;
  category: string;
  isEncrypted: boolean;
  isPublic: boolean;
}

export const SuperAdminSystemSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [activeCategory, setActiveCategory] = useState('CUSTOMER');

  const isSuperAdmin = user?.roles?.some(role => role.name === 'SUPER_ADMIN');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => apiService.get('/super-admin/system-settings'),
    enabled: isSuperAdmin
  });

  const createSettingMutation = useMutation({
    mutationFn: (data: any) => apiService.post('/super-admin/system-settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Setting created successfully');
      setShowModal(false);
    },
    onError: () => toast.error('Failed to create setting')
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiService.put(`/super-admin/system-settings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Setting updated successfully');
      setShowModal(false);
    },
    onError: () => toast.error('Failed to update setting')
  });

  const updatePaymentGatewayMutation = useMutation({
    mutationFn: (data: any) => apiService.post('/super-admin/payment-gateway/global-settings', data),
    onSuccess: () => {
      toast.success('Payment gateway settings updated');
    },
    onError: () => toast.error('Failed to update payment gateway settings')
  });

  const categories = [
    { key: 'CUSTOMER', label: 'Customer Login', icon: Users },
    { key: 'PAYMENT', label: 'Payment Gateway', icon: CreditCard },
    { key: 'SMS', label: 'SMS Settings', icon: MessageSquare },
    { key: 'EMAIL', label: 'Email Settings', icon: Mail },
    { key: 'SYSTEM', label: 'System Settings', icon: Settings },
    { key: 'SECURITY', label: 'Security', icon: Shield }
  ];

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.key === category);
    const Icon = categoryData?.icon || Settings;
    return <Icon className="w-5 h-5" />;
  };

  const filteredSettings = settings?.DDMS_data?.filter((setting: SystemSetting) => 
    setting.category === activeCategory
  ) || [];

  const handleCreateSetting = () => {
    setSelectedSetting(null);
    setShowModal(true);
  };

  const handleEditSetting = (setting: SystemSetting) => {
    setSelectedSetting(setting);
    setShowModal(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Access denied. Super Admin privileges required.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <Button onClick={handleCreateSetting}>
          <Plus className="w-4 h-4 mr-2" />
          Add Setting
        </Button>
      </div>

      {/* Payment Gateway Quick Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Global Payment Gateway Configuration
          </CardTitle>
        </CardHeader>
        <div className="p-6">
          <PaymentGatewayForm onSubmit={(data) => updatePaymentGatewayMutation.mutate(data)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setActiveCategory(category.key)}
                    className={`w-full flex items-center space-x-2 p-3 rounded-lg text-left transition-colors ${
                      activeCategory === category.key
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <category.icon className="w-4 h-4" />
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Settings List */}
        <div className="lg:col-span-3">
          {activeCategory === 'CUSTOMER' && (
            <CustomerLoginSettings
              settings={settings?.DDMS_data || []}
              onToggle={(key, value) =>
                createSettingMutation.mutate({ key, value: String(value), category: 'CUSTOMER' })
              }
            />
          )}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  {getCategoryIcon(activeCategory)}
                  <span className="ml-2">
                    {categories.find(c => c.key === activeCategory)?.label} Settings
                  </span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleCreateSetting}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <div className="p-6">
              {filteredSettings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No settings found for this category.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSettings.map((setting: SystemSetting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{setting.settingKey}</h3>
                          {setting.isEncrypted && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              Encrypted
                            </span>
                          )}
                          {setting.isPublic && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Public
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                        <div className="mt-2">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {setting.isEncrypted ? '••••••••' : setting.settingValue}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSetting(setting)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Setting Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedSetting ? 'Edit Setting' : 'Create Setting'}
        size="lg"
      >
        <SettingForm
          setting={selectedSetting}
          category={activeCategory}
          onSubmit={(data) => {
            if (selectedSetting) {
              updateSettingMutation.mutate({ id: selectedSetting.id, data });
            } else {
              createSettingMutation.mutate({ ...data, category: activeCategory });
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

const CustomerLoginSettings: React.FC<{
  settings: SystemSetting[];
  onToggle: (key: string, value: boolean) => void;
}> = ({ settings, onToggle }) => {
  const otpSetting = settings.find(s => s.settingKey === 'CUSTOMER_OTP_LOGIN_ENABLED');
  const otpEnabled = otpSetting ? otpSetting.settingValue === 'true' : true; // default ON

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Customer Login Settings
        </CardTitle>
      </CardHeader>
      <div className="p-6 space-y-5">
        {/* OTP Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
          <div>
            <p className="font-medium text-gray-900">OTP Verification on First Login</p>
            <p className="text-sm text-gray-500 mt-1">
              {otpEnabled
                ? 'ON — Customer ko pehli baar login pe OTP verify karna hoga, phir password set kar sakta hai.'
                : 'OFF — Customer directly password set kar sakta hai bina OTP ke.'}
            </p>
          </div>
          <button
            onClick={() => onToggle('CUSTOMER_OTP_LOGIN_ENABLED', !otpEnabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              otpEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                otpEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="text-xs text-gray-400 border-l-2 border-blue-200 pl-3">
          <strong>OTP ON:</strong> Mobile → OTP verify → Password set → Login<br />
          <strong>OTP OFF:</strong> Mobile → Password set directly → Login
        </div>
      </div>
    </Card>
  );
};

const PaymentGatewayForm: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    masterKeyId: '',
    masterKeySecret: '',
    enabled: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Master Key ID</label>
          <Input
            value={formData.masterKeyId}
            onChange={(e) => setFormData({ ...formData, masterKeyId: e.target.value })}
            placeholder="rzp_live_xxxxxxxxxx"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Master Key Secret</label>
          <Input
            type="password"
            value={formData.masterKeySecret}
            onChange={(e) => setFormData({ ...formData, masterKeySecret: e.target.value })}
            placeholder="Secret Key"
          />
        </div>
      </div>
      
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formData.enabled}
          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
        />
        <span>Enable Payment Gateway Globally</span>
      </label>

      <Button type="submit">Update Global Payment Settings</Button>
    </form>
  );
};

const SettingForm: React.FC<{
  setting: SystemSetting | null;
  category: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ setting, category, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    settingKey: setting?.settingKey || '',
    settingValue: setting?.settingValue || '',
    settingType: setting?.settingType || 'STRING',
    description: setting?.description || '',
    isEncrypted: setting?.isEncrypted || false,
    isPublic: setting?.isPublic || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Setting Key</label>
        <Input
          value={formData.settingKey}
          onChange={(e) => setFormData({ ...formData, settingKey: e.target.value })}
          placeholder="SETTING_NAME"
          disabled={!!setting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Setting Value</label>
        <Input
          value={formData.settingValue}
          onChange={(e) => setFormData({ ...formData, settingValue: e.target.value })}
          placeholder="Setting value"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Type</label>
        <select
          value={formData.settingType}
          onChange={(e) => setFormData({ ...formData, settingType: e.target.value })}
          className="w-full p-2 border rounded-md"
        >
          <option value="STRING">String</option>
          <option value="BOOLEAN">Boolean</option>
          <option value="NUMBER">Number</option>
          <option value="JSON">JSON</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-2 border rounded-md"
          rows={3}
          placeholder="Describe what this setting does..."
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isEncrypted}
            onChange={(e) => setFormData({ ...formData, isEncrypted: e.target.checked })}
          />
          <span>Encrypt this setting (for sensitive data)</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isPublic}
            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
          />
          <span>Public setting (accessible by non-super admins)</span>
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {setting ? 'Update' : 'Create'} Setting
        </Button>
      </div>
    </form>
  );
};