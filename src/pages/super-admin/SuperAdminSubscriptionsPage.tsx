import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Plus, Edit, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Subscription {
  id: number;
  storeName: string;
  storeCity: string;
  planType: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyFee: number;
  isActive: boolean;
  daysRemaining: number;
  paymentGatewayEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

export const SuperAdminSubscriptionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isSuperAdmin = user?.roles?.some(role => role.name === 'SUPER_ADMIN');

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['super-admin-subscriptions'],
    queryFn: () => apiService.get('/super-admin/subscriptions'),
    enabled: isSuperAdmin
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ storeId, data }: { storeId: number; data: any }) =>
      apiService.post(`/super-admin/subscriptions/${storeId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-subscriptions'] });
      toast.success('Subscription updated successfully');
      setShowModal(false);
    },
    onError: () => toast.error('Failed to update subscription')
  });

  const extendSubscriptionMutation = useMutation({
    mutationFn: ({ subscriptionId, months }: { subscriptionId: number; months: number }) =>
      apiService.post(`/super-admin/subscriptions/${subscriptionId}/extend`, { months }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-subscriptions'] });
      toast.success('Subscription extended successfully');
    },
    onError: () => toast.error('Failed to extend subscription')
  });

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (status === 'ACTIVE' && isActive) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'EXPIRED') return <XCircle className="w-5 h-5 text-red-500" />;
    if (status === 'SUSPENDED') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <Clock className="w-5 h-5 text-gray-500" />;
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (status === 'ACTIVE' && isActive) return 'text-green-600 bg-green-100';
    if (status === 'EXPIRED') return 'text-red-600 bg-red-100';
    if (status === 'SUSPENDED') return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'FREE': return 'text-gray-600 bg-gray-100';
      case 'BASIC': return 'text-blue-600 bg-blue-100';
      case 'STANDARD': return 'text-purple-600 bg-purple-100';
      case 'PREMIUM': return 'text-orange-600 bg-orange-100';
      case 'ENTERPRISE': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowModal(true);
  };

  const handleExtendSubscription = (subscriptionId: number) => {
    const months = prompt('Enter number of months to extend:');
    if (months && !isNaN(Number(months))) {
      extendSubscriptionMutation.mutate({ subscriptionId, months: Number(months) });
    }
  };

  const filteredSubscriptions = subscriptions?.DDMS_data?.filter((sub: Subscription) =>
    sub.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.storeCity.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Access denied. Super Admin privileges required.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading subscriptions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Subscription Management</h1>
        <Input
          placeholder="Search stores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stores</p>
                <p className="text-2xl font-bold">{filteredSubscriptions.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredSubscriptions.filter((s: Subscription) => s.isActive).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredSubscriptions.filter((s: Subscription) => s.status === 'EXPIRED').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredSubscriptions.filter((s: Subscription) => s.daysRemaining <= 7 && s.daysRemaining > 0).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Subscriptions</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Store</th>
                <th className="table-header-cell">Plan</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">End Date</th>
                <th className="table-header-cell">Days Left</th>
                <th className="table-header-cell">Monthly Fee</th>
                <th className="table-header-cell">Features</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((subscription: Subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div>
                      <div className="font-medium">{subscription.storeName}</div>
                      <div className="text-sm text-gray-500">{subscription.storeCity}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(subscription.planType)}`}>
                      {subscription.planType}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(subscription.status, subscription.isActive)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status, subscription.isActive)}`}>
                        {subscription.status}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    {new Date(subscription.endDate).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <span className={subscription.daysRemaining <= 7 ? 'text-red-600 font-medium' : ''}>
                      {subscription.daysRemaining > 0 ? `${subscription.daysRemaining} days` : 'Expired'}
                    </span>
                  </td>
                  <td className="table-cell">
                    ₹{subscription.monthlyFee?.toLocaleString() || 0}
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-1">
                      {subscription.paymentGatewayEnabled && (
                        <span className="px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">PG</span>
                      )}
                      {subscription.smsEnabled && (
                        <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">SMS</span>
                      )}
                      {subscription.emailEnabled && (
                        <span className="px-1 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">Email</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSubscription(subscription)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {subscription.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExtendSubscription(subscription.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Edit Subscription"
        size="lg"
      >
        {selectedSubscription && (
          <SubscriptionEditForm
            subscription={selectedSubscription}
            onSubmit={(data) => updateSubscriptionMutation.mutate({ 
              storeId: selectedSubscription.id, 
              data 
            })}
            onCancel={() => setShowModal(false)}
          />
        )}
      </Modal>
    </div>
  );
};

const SubscriptionEditForm: React.FC<{
  subscription: Subscription;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ subscription, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    planType: subscription.planType,
    status: subscription.status,
    monthlyFee: subscription.monthlyFee,
    paymentGatewayEnabled: subscription.paymentGatewayEnabled,
    smsEnabled: subscription.smsEnabled,
    emailEnabled: subscription.emailEnabled,
    maxUsers: 10,
    maxReceiptsPerMonth: 1000
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Plan Type</label>
          <select
            value={formData.planType}
            onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            <option value="FREE">Free</option>
            <option value="BASIC">Basic</option>
            <option value="STANDARD">Standard</option>
            <option value="PREMIUM">Premium</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
            <option value="TRIAL">Trial</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Monthly Fee (₹)</label>
        <Input
          type="number"
          value={formData.monthlyFee}
          onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.paymentGatewayEnabled}
            onChange={(e) => setFormData({ ...formData, paymentGatewayEnabled: e.target.checked })}
          />
          <span>Payment Gateway Enabled</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.smsEnabled}
            onChange={(e) => setFormData({ ...formData, smsEnabled: e.target.checked })}
          />
          <span>SMS Enabled</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.emailEnabled}
            onChange={(e) => setFormData({ ...formData, emailEnabled: e.target.checked })}
          />
          <span>Email Enabled</span>
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Subscription
        </Button>
      </div>
    </form>
  );
};