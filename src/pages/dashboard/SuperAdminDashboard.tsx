import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, Users, Receipt, FileBarChart, AlertTriangle, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { apiService } from '@/services/api';

export const SuperAdminDashboard: React.FC = () => {
  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['super-admin-stores'],
    queryFn: () => apiService.getAllStoresForSuperAdmin(),
  });

  const { data: subsData } = useQuery({
    queryKey: ['super-admin-subscriptions'],
    queryFn: () => apiService.getSuperAdminSubscriptions(),
  });

  const stores: any[] = storesData?.DDMS_data || [];
  const subs: any[] = subsData?.DDMS_data || [];

  const activeStores = stores.filter(s => s.subscription_status === 'ACTIVE').length;
  const expiredStores = stores.filter(s => s.subscription_status === 'EXPIRED').length;
  const suspendedStores = stores.filter(s => s.subscription_status === 'SUSPENDED').length;

  // Find expiring soon (within 7 days)
  const now = new Date();
  const expiringSoon = subs.filter(s => {
    if (!s.end_date) return false;
    const diff = (new Date(s.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  });

  const statCards = [
    { title: 'Total Stores', value: stores.length, icon: Store, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Active Stores', value: activeStores, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Expired', value: expiredStores, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { title: 'Suspended', value: suspendedStores, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  if (storesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6"><div className="h-16 bg-secondary-200 rounded" /></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">🛡️ Super Admin Dashboard</h1>
        <p className="text-purple-100 text-sm">Manage all temples and system settings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-secondary-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Expiring Soon ({expiringSoon.length})
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0 space-y-3">
            {expiringSoon.length > 0 ? expiringSoon.map((sub: any) => (
              <div key={sub.store_id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                <div>
                  <p className="font-medium text-secondary-900">{sub.store_name || `Store #${sub.store_id}`}</p>
                  <p className="text-xs text-secondary-500">Plan: {sub.plan_type}</p>
                </div>
                <span className="text-sm font-medium text-orange-600">
                  {new Date(sub.end_date).toLocaleDateString('en-IN')}
                </span>
              </div>
            )) : (
              <p className="text-sm text-secondary-500 text-center py-4">✅ No subscriptions expiring soon</p>
            )}
          </div>
        </Card>

        {/* All Stores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-500" />
              All Stores
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0 space-y-2 max-h-64 overflow-y-auto">
            {stores.length > 0 ? stores.map((store: any) => (
              <div key={store.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                <p className="font-medium text-secondary-900 text-sm">{store.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  store.subscription_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                  store.subscription_status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {store.subscription_status}
                </span>
              </div>
            )) : (
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-secondary-300 mx-auto mb-3" />
                <p className="text-secondary-500 font-medium">No stores yet</p>
                <p className="text-secondary-400 text-sm">Go to Stores → Create your first temple</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
