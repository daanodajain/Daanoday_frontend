import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Settings, Trash2, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface StoreFormData {
  id?: number;
  name: string;
  address: string;
  city: string;
  state: string;
  contact: string;
  email: string;
  receiptLayout?: string;
  paymentOptions?: string;
  onlinePaymentEnabled: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
}

interface StoreWithAdminFormData extends StoreFormData {
  adminName: string;
  adminMobile: string;
  adminEmail: string;
  adminPassword: string;
}

export const StoresPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreFormData | null>(null);
  const [formData, setFormData] = useState<StoreWithAdminFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    contact: '',
    email: '',
    onlinePaymentEnabled: false,
    subscriptionStatus: 'ACTIVE',
    adminName: '',
    adminMobile: '',
    adminEmail: '',
    adminPassword: '',
  });

  const { data: storesData, isLoading } = useQuery({
    queryKey: ['super-admin-stores'],
    queryFn: () => apiService.get('/super-admin/stores'),
  });

  // Support both { stores: [...] } and flat array response
  const stores = storesData?.DDMS_data?.stores || storesData?.DDMS_data || [];

  const createMutation = useMutation({
    mutationFn: (data: StoreWithAdminFormData) => apiService.post('/super-admin/stores', {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      contact: data.contact,
      email: data.email,
      onlinePaymentEnabled: data.onlinePaymentEnabled,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionExpiresAt: data.subscriptionExpiresAt,
      adminName: data.adminName,
      adminMobile: data.adminMobile,
      adminEmail: data.adminEmail,
      adminPassword: data.adminPassword,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-stores'] });
      toast.success('Store created successfully');
      handleCloseModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e?.message || 'Failed to create store'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: StoreFormData) => apiService.put(`/super-admin/stores/${data.id}`, {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      contact: data.contact,
      email: data.email,
      onlinePaymentEnabled: data.onlinePaymentEnabled,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionExpiresAt: data.subscriptionExpiresAt,
      adminName: (data as any).adminName,
      adminMobile: (data as any).adminMobile,
      adminEmail: (data as any).adminEmail,
      adminPassword: (data as any).adminPassword,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-stores'] });
      toast.success('Store updated successfully');
      handleCloseModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e?.message || 'Failed to update store'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.delete(`/super-admin/stores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-stores'] });
      toast.success('Store deleted successfully');
    },
    onError: () => toast.error('Failed to delete store'),
  });

  const handleCreate = () => {
    setEditingStore(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      contact: '',
      email: '',
      onlinePaymentEnabled: false,
      subscriptionStatus: 'ACTIVE',
      adminName: '',
      adminMobile: '',
      adminEmail: '',
      adminPassword: '',
    });
    setShowModal(true);
  };

  const handleEdit = (store: any) => {
    setEditingStore(store);
    setFormData({
      id: store.id,
      name: store.name,
      address: store.address,
      city: store.city,
      state: store.state,
      contact: store.contact,
      email: store.email,
      receiptLayout: store.receiptLayout,
      paymentOptions: store.paymentOptions,
      onlinePaymentEnabled: store.onlinePaymentEnabled,
      subscriptionStatus: store.subscriptionStatus,
      subscriptionExpiresAt: store.subscriptionExpiresAt,
      // Populate admin details from API response
      adminName: store.admin_name || '',
      adminMobile: store.admin_mobile || '',
      adminEmail: store.admin_email || '',
      adminPassword: '', // Don't pre-fill password for security
    });
    setShowModal(true);
  };

  const handleSettings = (store: any) => {
    setEditingStore(store);
    setFormData({
      id: store.id,
      name: store.name,
      address: store.address,
      city: store.city,
      state: store.state,
      contact: store.contact,
      email: store.email,
      receiptLayout: store.receiptLayout,
      paymentOptions: store.paymentOptions,
      onlinePaymentEnabled: store.onlinePaymentEnabled,
      subscriptionStatus: store.subscriptionStatus,
      subscriptionExpiresAt: store.subscriptionExpiresAt,
      adminName: '',
      adminMobile: '',
      adminEmail: '',
      adminPassword: '',
    });
    setShowSettingsModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowSettingsModal(false);
    setEditingStore(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStore) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('navigation.stores')}</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t('store.createStore')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : stores.length === 0 ? (
        <div className="text-center py-16 text-secondary-500">
          <p className="text-lg font-medium mb-2">No stores yet</p>
          <p className="text-sm">Click "Add Store" to create your first store.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(stores) && stores.map((store: any) => (
            <Card key={store.id}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{store.name}</h3>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(store)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleSettings(store)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(store.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-secondary-600">
                  <p>{store.address}</p>
                  <p>{store.city}, {store.state}</p>
                  <p>📞 {store.contact}</p>
                  <p>✉️ {store.email}</p>
                  {store.subscriptionExpiresAt && (
                    <p className="text-xs">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Expires: {new Date(store.subscriptionExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      store.subscriptionStatus === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : store.subscriptionStatus === 'EXPIRED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {store.subscriptionStatus}
                    </span>
                    <span className="text-xs text-secondary-500">
                      {store.onlinePaymentEnabled ? '💳 Online' : '💵 Cash'}
                    </span>
                  </div>
                  {store.subscriptionStatus !== 'ACTIVE' && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      ⚠️ Store is {store.subscriptionStatus.toLowerCase()}. Functions are restricted.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Store Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingStore ? 'Edit Store' : 'Create Store'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Store Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Contact *"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Address *"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City *"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="State *"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Subscription Status *"
              value={formData.subscriptionStatus}
              onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
              required
            >
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
            <Input
              label="Subscription Expires At"
              type="datetime-local"
              value={formData.subscriptionExpiresAt?.slice(0, 16) || ''}
              onChange={(e) => setFormData({ ...formData, subscriptionExpiresAt: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="onlinePayment"
              checked={formData.onlinePaymentEnabled}
              onChange={(e) => setFormData({ ...formData, onlinePaymentEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="onlinePayment" className="text-sm">Enable Online Payment</label>
          </div>
          <div className="pt-4 border-t mt-4">
            <h3 className="font-semibold mb-2">Store Admin Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Admin Name *"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                required
              />
              <Input
                label="Admin Mobile *"
                value={formData.adminMobile}
                onChange={(e) => setFormData({ ...formData, adminMobile: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Admin Email *"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                required
              />
              <Input
                label={editingStore ? "Admin Password (leave blank to keep current)" : "Admin Password *"}
                type="password"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                required={!editingStore}
                placeholder={editingStore ? "Enter new password to change" : ""}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={handleCloseModal}
        title="Store Settings"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Payment Options</h3>
            <Input
              label="Payment Options (JSON)"
              value={formData.paymentOptions || ''}
              onChange={(e) => setFormData({ ...formData, paymentOptions: e.target.value })}
              placeholder='{"cash": true, "cheque": true, "online": true}'
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="onlinePaymentSettings"
                checked={formData.onlinePaymentEnabled}
                onChange={(e) => setFormData({ ...formData, onlinePaymentEnabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="onlinePaymentSettings" className="text-sm">Enable Online Payment</label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Receipt Layout</h3>
            <textarea
              className="w-full border rounded-lg p-2 min-h-[100px]"
              value={formData.receiptLayout || ''}
              onChange={(e) => setFormData({ ...formData, receiptLayout: e.target.value })}
              placeholder="Receipt layout configuration..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Subscription</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                value={formData.subscriptionStatus}
                onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
              <Input
                label="Expires At"
                type="datetime-local"
                value={formData.subscriptionExpiresAt?.slice(0, 16) || ''}
                onChange={(e) => setFormData({ ...formData, subscriptionExpiresAt: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};